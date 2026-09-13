// POST /api/licenses/change-plan — cambiar de plan (crea orden de pago)
// Igual que renew: el precio lo fija el servidor. La licencia nueva se activa
// tras pago confirmado (settlePaidOrder → activateLicense con el nuevo tier).
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getLicenseTier, licenseProductId } from "@/app/services/licenses/catalog";
import { createOrder } from "@/app/services/db/purchase";
import { getPaymentsConfig } from "@/app/services/payments/config";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { tierId?: unknown };
    const tier = typeof body.tierId === "string" ? getLicenseTier(body.tierId) : null;
    if (!tier) return NextResponse.json({ ok: false, reason: "INVALID_TIER" }, { status: 400 });
    const config = getPaymentsConfig();
    const expiresAt = new Date(Date.now() + config.orderTtlMinutes * 60000).toISOString();
    const order = createOrder({
      userId: user.id,
      productId: licenseProductId(tier.id),
      creatorId: null,
      orderType: "license",
      baseAmount: tier.price,
      paymentAmount: tier.price,
      currency: "USDT",
      network: config.network,
      expectedRecipient: config.treasury,
      expiresAt,
    });
    return NextResponse.json({
      ok: true,
      orderId: order.id,
      tier: tier.id,
      amount: order.paymentAmount,
      currency: order.currency,
      expiresAt: order.expiresAt,
      status: order.status,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
