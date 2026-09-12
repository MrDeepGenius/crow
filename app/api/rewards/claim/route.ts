// POST /api/rewards/claim — reclamar recompensa propia (sesión + ownership)
// UNLOCKED/WAITING → CLAIMED (o WAITING si sin fondos). Nunca PAID aquí.
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { claimReward, RewardError } from "@/app/services/rewards/rewards";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { rewardId?: unknown };
    if (typeof body.rewardId !== "string" || !body.rewardId) {
      return NextResponse.json({ ok: false, reason: "INVALID_REWARD" }, { status: 400 });
    }
    try {
      const reward = claimReward(user.id, body.rewardId);
      return NextResponse.json({ ok: true, reward });
    } catch (err) {
      if (err instanceof RewardError) {
        const status = err.code === "OWNERSHIP" ? 403 : 409;
        return NextResponse.json({ ok: false, reason: err.code }, { status });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
