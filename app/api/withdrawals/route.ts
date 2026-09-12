import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getBalance, requestWithdrawal } from "@/app/services/withdrawals/withdrawalService";

export const dynamic = "force-dynamic";

// GET /api/withdrawals/balance — saldo disponible del usuario
export async function GET(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const balance = getBalance(user.id);
  return NextResponse.json({ ok: true, balance });
}

// POST /api/withdrawals/request — solicitar retiro
export async function POST(req: NextRequest) {
  const user = getAuthUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { amount, walletAddress, idempotencyKey } = body as {
    amount?: number;
    walletAddress?: string;
    idempotencyKey?: string;
  };

  if (!amount || !walletAddress) {
    return NextResponse.json({ ok: false, error: "MISSING_FIELDS", message: "Monto y wallet son requeridos." }, { status: 400 });
  }

  const result = requestWithdrawal({
    userId: user.id,
    amount,
    walletAddress,
    idempotencyKey,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, withdrawal: result.withdrawal });
}
