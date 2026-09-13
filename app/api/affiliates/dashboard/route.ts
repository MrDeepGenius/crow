// GET /api/affiliates/dashboard — affiliate dashboard data (auth + affiliate role)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { getAffiliateDashboard } from "@/app/services/db/products";
import { getOrCreateReferralCode } from "@/app/services/affiliates/referrals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "affiliate")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const dashboard = getAffiliateDashboard(user.id);
    let referralCode: string | null = null;
    try {
      referralCode = getOrCreateReferralCode(user.id);
    } catch {
      // code may not exist yet
    }
    return NextResponse.json({ ok: true, ...dashboard, referralCode });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
