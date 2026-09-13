// GET /api/creators/dashboard — creator dashboard data (auth + creator role)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { getCreatorDashboard } from "@/app/services/db/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const dashboard = getCreatorDashboard(user.id);
    return NextResponse.json({ ok: true, ...dashboard });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
