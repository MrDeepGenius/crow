// GET /api/referrals/resolve?code= — ¿código válido? (público, sin exponer userId)
import { NextResponse } from "next/server";
import { resolveReferralCode } from "@/app/services/affiliates/referrals";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const code = new URL(req.url).searchParams.get("code") ?? "";
    const ownerId = resolveReferralCode(code);
    return NextResponse.json({ ok: true, valid: Boolean(ownerId) });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
