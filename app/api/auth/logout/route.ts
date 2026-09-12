// POST /api/auth/logout — cierra la sesión actual
import { NextResponse } from "next/server";
import { clearSessionCookieHeader, getTokenFromCookieHeader, logoutToken } from "@/app/services/auth/auth";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const token = getTokenFromCookieHeader(req.headers.get("cookie"));
    if (token) logoutToken(token);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", clearSessionCookieHeader());
    return res;
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
