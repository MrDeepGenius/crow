// GET /api/auth/google/callback — recibe el code de Google, intercambia por perfil, crea/loguea usuario
import { NextResponse } from "next/server";
import { loginWithGoogle, sessionCookieHeader } from "@/app/services/auth/auth";

export async function GET(req: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_cancelled", req.url));
  }
  // Reconstruir el redirect_uri exacto que se usó al iniciar el flujo
  const base = `${url.protocol}//${url.host}`;
  const redirectUri = `${base}/api/auth/google/callback`;
  try {
    // Intercambiar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/login?error=google_token_failed", req.url));
    }
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/login?error=google_no_token", req.url));
    }
    // Obtener perfil del usuario
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) {
      return NextResponse.redirect(new URL("/login?error=google_profile_failed", req.url));
    }
    const profile = (await profileRes.json()) as {
      id?: string;
      email?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      verified_email?: boolean;
    };
    if (!profile.email || !profile.verified_email) {
      return NextResponse.redirect(new URL("/login?error=google_email_not_verified", req.url));
    }
    const result = loginWithGoogle({
      googleId: profile.id ?? "",
      email: profile.email,
      firstName: profile.given_name ?? "",
      lastName: profile.family_name ?? "",
      avatarPath: profile.picture ?? null,
    });
    if (!result.ok) {
      return NextResponse.redirect(new URL("/login?error=google_login_failed", req.url));
    }
    const res = NextResponse.redirect(new URL(result.user.onboardingCompleted ? "/marketplace" : "/onboarding", req.url));
    res.headers.set("Set-Cookie", sessionCookieHeader(result.token));
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_server_error", req.url));
  }
}
