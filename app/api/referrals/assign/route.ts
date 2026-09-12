// POST /api/referrals/assign — aceptar un código de referido (sesión)
// Valida la cadena completa; el referrer queda inmutable. Un segundo intento
// se audita como REFERRER_CHANGE_ATTEMPT y se rechaza.
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { ReferralError, assignReferrer, getReferrer, resolveReferralCode } from "@/app/services/affiliates/referrals";
import { audit, evaluateUser, recordDeterministicHit } from "@/app/services/fraud/antifraud";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { code?: unknown };
    if (typeof body.code !== "string" || !body.code.trim()) {
      return NextResponse.json({ ok: false, reason: "INVALID_CODE" }, { status: 400 });
    }
    const ownerId = resolveReferralCode(body.code);
    if (!ownerId) return NextResponse.json({ ok: false, reason: "INVALID_CODE" }, { status: 400 });
    if (getReferrer(user.id)) {
      audit("REFERRER_CHANGE_ATTEMPT", { userId: user.id, relatedUserId: ownerId, reason: "Ya tiene referrer inmutable" });
      return NextResponse.json({ ok: false, reason: "ALREADY_REFERRED" }, { status: 409 });
    }
    try {
      assignReferrer(user.id, ownerId);
    } catch (err) {
      if (err instanceof ReferralError) {
        if (err.code === "SELF_REFERRAL" || err.code === "SELF_REFERRAL_CHAIN") {
          recordDeterministicHit(user.id, "SELF_REFERRAL_ATTEMPT", { relatedUserId: ownerId, reason: err.code });
          return NextResponse.json({ ok: false, reason: err.code }, { status: 409 });
        }
        if (err.code === "REFERRAL_CYCLE") {
          recordDeterministicHit(user.id, "REFERRAL_CYCLE_ATTEMPT", { relatedUserId: ownerId, reason: err.code });
          return NextResponse.json({ ok: false, reason: err.code }, { status: 409 });
        }
        return NextResponse.json({ ok: false, reason: err.code }, { status: 409 });
      }
      throw err;
    }
    audit("REFERRER_ASSIGNED", { userId: user.id, relatedUserId: ownerId });
    evaluateUser(user.id, {});
    return NextResponse.json({ ok: true, referrerId: ownerId });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
