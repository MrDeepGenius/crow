// POST /api/admin/rewards/pay — registrar PAGO REAL de reward (admin)
// Exige referencia de pago real (tx hash). Sin referencia no hay PAID.
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { PoolError, registerRewardPayment } from "@/app/services/rewards/pool";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const body = (await req.json()) as { rewardId?: unknown; paymentRef?: unknown; userId?: unknown };
    if (typeof body.rewardId !== "string" || !body.rewardId) {
      return NextResponse.json({ ok: false, reason: "INVALID_REWARD" }, { status: 400 });
    }
    if (typeof body.userId !== "string" || !body.userId) {
      return NextResponse.json({ ok: false, reason: "INVALID_USER" }, { status: 400 });
    }
    if (typeof body.paymentRef !== "string" || !body.paymentRef.trim()) {
      return NextResponse.json({ ok: false, reason: "REF_REQUIRED" }, { status: 400 });
    }
    try {
      registerRewardPayment(body.rewardId, body.paymentRef, body.userId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof PoolError) {
        return NextResponse.json({ ok: false, reason: err.code }, { status: 409 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
