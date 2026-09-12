// GET /api/rewards/mine — resumen del usuario (sesión; solo lo propio)
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { rewardsSummary } from "@/app/services/rewards/rewards";
import { REWARD_TIERS } from "@/app/services/rewards/tiers";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    return NextResponse.json({ ok: true, tiers: REWARD_TIERS, ...rewardsSummary(user.id) });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
