// GET /api/auth/google — inicia el flujo de OAuth con Google
import { NextResponse } from "next/server";

export async function GET(req: Request): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ ok: false, reason: "Google OAuth no configurado" }, { status: 503 });
  }
  const url = new URL(req.url);
  // El cliente nos dice desde qué origin viene para construir el redirect_uri
  const from = url.searchParams.get("from");
  const base = from || `${url.protocol}//${url.host}`;
  const redirectUri = `${base}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
