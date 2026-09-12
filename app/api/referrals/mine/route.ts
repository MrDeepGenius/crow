// GET /api/referrals/mine — mi código de afiliado (sesión + rol affiliate)
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { ReferralError, getOrCreateReferralCode } from "@/app/services/affiliates/referrals";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "affiliate")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    try {
      const code = getOrCreateReferralCode(user.id);
      return NextResponse.json({ ok: true, code });
    } catch (err) {
      if (err instanceof ReferralError) {
        return NextResponse.json({ ok: false, reason: err.code }, { status: 400 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
