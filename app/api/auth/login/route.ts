// POST /api/auth/login — inicia sesión (cookie httpOnly)
import { NextResponse } from "next/server";
import { checkOrigin, loginUser, sessionCookieHeader } from "@/app/services/auth/auth";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const login = loginUser(email, password);
    if (!login.ok) {
      return NextResponse.json({ ok: false, reason: login.error }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, user: login.user });
    res.headers.set("Set-Cookie", sessionCookieHeader(login.token));
    return res;
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
