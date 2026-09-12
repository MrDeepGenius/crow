import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { listWithdrawals } from "@/app/services/withdrawals/withdrawalService";

export const dynamic = "force-dynamic";

// GET /api/withdrawals/mine — lista los retiros del usuario autenticado
export async function GET(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const withdrawals = listWithdrawals(user.id);
  return NextResponse.json({ ok: true, withdrawals });
}
