import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { listWithdrawals } from "@/app/services/withdrawals/withdrawalService";

export const dynamic = "force-dynamic";

// GET /api/admin/withdrawals — lista todos los retiros (admin)
export async function GET(req: NextRequest) {
  const admin = isAdminRequest(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.reason }, { status: admin.reason === "UNAUTHENTICATED" ? 401 : 403 });
  }

  const withdrawals = listWithdrawals();
  return NextResponse.json({ ok: true, withdrawals });
}
