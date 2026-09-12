// POST /api/payments/quote — cotización firmada (server, sin secretos al cliente)
// Requiere sesión: la orden debe pertenecer al usuario. El monto sale de la
// DB (nunca del body: el frontend no puede fijar el precio).
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { issueQuote } from "@/app/services/payments/quotes";
import { getOrderForUser } from "@/app/services/db/purchase";
import { randomUUID } from "node:crypto";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const body = (await req.json()) as { orderId?: unknown };
    if (typeof body.orderId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(body.orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    const order = getOrderForUser(body.orderId, user.id);
    if (!order) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    if (order.status !== "PENDING" && order.status !== "VERIFYING") {
      return NextResponse.json({ ok: false, reason: "ORDER_NOT_ACTIVE", status: order.status }, { status: 409 });
    }
    const config = getPaymentsConfig();
    if (config.usingDevSecret) {
      console.warn("[payments] PAYMENT_QUOTE_SECRET no configurada: usando secreto de desarrollo. NO usar en producción.");
    }
    const quote = issueQuote(
      {
        orderId: order.id,
        amount: order.paymentAmount,
        currency: order.currency,
        treasury: config.treasury,
        chainId: config.chainId,
        ttlMinutes: config.orderTtlMinutes,
      },
      config.quoteSecret,
      randomUUID()
    );
    return NextResponse.json({
      ok: true,
      quote,
      payment: {
        provider: "usdt-bep20",
        chain: "BNB Smart Chain",
        network: config.network,
        chainId: config.chainId,
        token: "USDT",
        standard: "BEP-20",
        tokenContract: config.usdtContract,
        treasury: config.treasury,
        expectedRecipient: config.treasury,
        minConfirmations: config.minConfirmations,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
