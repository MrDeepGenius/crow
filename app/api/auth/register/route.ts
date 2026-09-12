// POST /api/auth/register — crea la CUENTA ÚNICA (nombre+apellido+email+password+términos)
// Luego el onboarding define capacidades (buyer/affiliate/creator) sobre el mismo userId.
import { NextResponse } from "next/server";
import { checkOrigin, loginUser, registerUser, sessionCookieHeader } from "@/app/services/auth/auth";
import { assignReferrer, resolveReferralCode } from "@/app/services/affiliates/referrals";
import { audit } from "@/app/services/fraud/antifraud";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as {
      email?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      password?: unknown;
      confirmPassword?: unknown;
      termsAccepted?: unknown;
      referralCode?: unknown;
      deviceId?: unknown;
    };
    const email = typeof body.email === "string" ? body.email : "";
    const firstName = typeof body.firstName === "string" ? body.firstName : "";
    const lastName = typeof body.lastName === "string" ? body.lastName : "";
    const password = typeof body.password === "string" ? body.password : "";
    const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    const termsAccepted = body.termsAccepted === true;
    const referralCode = typeof body.referralCode === "string" ? body.referralCode.trim().slice(0, 20) : "";
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim().slice(0, 80) : "";
    const createdIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    if (!password || password !== confirm) {
      return NextResponse.json({ ok: false, reason: "PASSWORD_MISMATCH" }, { status: 400 });
    }
    const reg = registerUser(email, firstName, password, { lastName, termsAccepted, createdIp, deviceId: deviceId || undefined });
    if (!reg.ok) {
      return NextResponse.json({ ok: false, reason: reg.error }, { status: 400 });
    }
    // Referido best-effort: si el código es inválido o la cadena es inválida,
    // la cuenta SIGUE siendo válida (se audita el intento, sin romper).
    let referrerWarning: string | null = null;
    if (referralCode) {
      try {
        const ownerId = resolveReferralCode(referralCode);
        if (!ownerId) {
          referrerWarning = "INVALID_CODE";
        } else {
          assignReferrer(reg.user.id, ownerId);
          audit("REFERRER_ASSIGNED", { userId: reg.user.id, relatedUserId: ownerId, reason: "signup" });
        }
      } catch {
        referrerWarning = "REFERRAL_REJECTED";
        audit("SELF_REFERRAL_ATTEMPT", { userId: reg.user.id, reason: "signup rechazado" });
      }
    }
    const login = loginUser(email, password);
    if (!login.ok) {
      return NextResponse.json({ ok: true, user: reg.user, referrerWarning });
    }
    const res = NextResponse.json({ ok: true, user: login.user, referrerWarning });
    res.headers.set("Set-Cookie", sessionCookieHeader(login.token));
    return res;
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
