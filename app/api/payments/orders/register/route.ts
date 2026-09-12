// POST /api/payments/orders/register — crea la orden del USUARIO AUTENTICADO
// userId sale de la sesión (nunca del body: buyerId se ignora para auth).
// Monto/moneda los envía el cliente (el catálogo aún es local; la integridad
// precio↔catálogo llega con la migración de productos), pero una vez creada
// la orden el cliente NO puede modificar userId, status, montos, recipient
// ni paidAt: todo cambio posterior exige sesión + ownership.
// Respuesta idempotente: orden activa existente para el mismo producto.
// También escribe el espejo del monitor (buyerId=userId) para no romper la
// detección automática.
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { createOrder } from "@/app/services/db/purchase";
import { registerMirroredOrder } from "@/app/services/payments/orderMirror";

const CURRENCIES = new Set(["USDT", "USD"]);

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const body = (await req.json()) as {
      productId?: unknown;
      creatorId?: unknown;
      amount?: unknown;
      currency?: unknown;
    };
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : NaN;
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
    // creatorId del catálogo local (inmutable tras crear; null = desconocido).
    const creatorId = typeof body.creatorId === "string" ? body.creatorId.trim().slice(0, 64) : null;
    if (!productId || productId.length > 120) {
      return NextResponse.json({ ok: false, reason: "INVALID_PRODUCT" }, { status: 400 });
    }
    if (!(amount > 0) || !Number.isFinite(amount)) {
      return NextResponse.json({ ok: false, reason: "INVALID_AMOUNT" }, { status: 400 });
    }
    if (!CURRENCIES.has(currency)) {
      return NextResponse.json({ ok: false, reason: "INVALID_CURRENCY" }, { status: 400 });
    }

    const config = getPaymentsConfig();
    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60000).toISOString();
    let order;
    try {
      order = createOrder({
        userId: user.id,
        productId,
        creatorId,
        baseAmount: amount,
        paymentAmount: amount,
        currency,
        network: config.network,
        expectedRecipient: config.treasury,
        expiresAt,
      });
    } catch {
      return NextResponse.json({ ok: false, reason: "INVALID_INPUT" }, { status: 400 });
    }
    // Espejo para el monitor (best-effort, no bloquea).
    try {
      registerMirroredOrder(config.ordersPath, {
        orderId: order.id,
        buyerId: user.id,
        productId: order.productId,
        amount: order.paymentAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        fromBlock: null,
      });
    } catch {
      // best-effort
    }
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      status: order.status,
      amount: order.paymentAmount,
      currency: order.currency,
      expiresAt: order.expiresAt,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
