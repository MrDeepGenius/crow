// GET /api/payments/orders/status — estado de MI orden (sesión, anti-IDOR)
// El frontend nunca consulta la blockchain. Sin sesión → 401.
// Legado: espejo con buyerId=email del usuario también responde.
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { getOrderForUser, getPaymentByOrder, markOrdersExpired } from "@/app/services/db/purchase";
import { getMirroredOrder } from "@/app/services/payments/orderMirror";
import { isOrderOwner } from "@/app/services/payments/bscPaymentService";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId") ?? "";
    if (!/^[A-Za-z0-9-]{4,64}$/.test(orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    const config = getPaymentsConfig();
    markOrdersExpired(Date.now());
    const order = getOrderForUser(orderId, user.id);
    if (order) {
      const payment = getPaymentByOrder(order.id);
      return NextResponse.json({
        ok: true,
        status: order.status,
        orderId: order.id,
        amount: order.paymentAmount,
        currency: order.currency,
        txHash: payment?.txHash ?? null,
        blockNumber: payment?.blockNumber ?? null,
        expiresAt: order.expiresAt,
        network: order.network,
        chain: "BNB Smart Chain",
        token: "USDT",
        standard: "BEP-20",
      });
    }
    // Compatibilidad legada: espejo cuyo buyerId coincide con el usuario.
    const mirrored = getMirroredOrder(config.ordersPath, orderId);
    if (
      mirrored &&
      (isOrderOwner(mirrored.buyerId, user.id) || isOrderOwner(mirrored.buyerId, user.email))
    ) {
      return NextResponse.json({
        ok: true,
        status: mirrored.status,
        orderId: mirrored.orderId,
        amount: mirrored.amount,
        currency: mirrored.currency,
        txHash: mirrored.txHash,
        blockNumber: mirrored.blockNumber,
        expiresAt: mirrored.expiresAt,
        legacy: true,
      });
    }
    return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
