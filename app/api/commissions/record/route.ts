// POST /api/commissions/record — distribuye una venta (sesión buyer)
// Modelo v2 (reparto definitivo 45/10/30/13/2). El backend reconstruye TODO
// desde la DB: orden, FINAL_PAID_AMOUNT, creador, cadena y splits.
// El body solo aporta orderId + hint opcional de código. Idempotente.
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { DistributionError, distributeSale } from "@/app/services/affiliates/distribution";

function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || undefined;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { orderId?: unknown; affiliateCode?: unknown; deviceId?: unknown };
    if (typeof body.orderId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(body.orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    const affiliateCode = typeof body.affiliateCode === "string" ? body.affiliateCode.trim().slice(0, 20) : undefined;
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim().slice(0, 80) : undefined;
    try {
      const result = distributeSale({
        orderId: body.orderId,
        buyerId: user.id,
        affiliateCode,
        context: { ip: clientIp(req), deviceId },
      });
      // Compat: splits de afiliados en el formato clásico + detalle nuevo.
      const splits = result.allocations
        .filter((a) => a.affiliateUserId && (a.account === "AFFILIATE_DIRECT" || a.account.startsWith("LEVEL_")))
        .map((a) => ({
          affiliateUserId: a.affiliateUserId as string,
          level: a.level ?? 0,
          amount: a.amount,
          currency: a.currency,
          status: a.status === "APPROVED" ? "PAYABLE" : "PENDING_REVIEW",
        }));
      return NextResponse.json({ ok: true, ...result, splits });
    } catch (err) {
      if (err instanceof DistributionError) {
        const status = err.code === "OWNERSHIP" ? 403 : err.code === "ORDER_NOT_FOUND" ? 404 : 409;
        return NextResponse.json({ ok: false, reason: err.code }, { status });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
