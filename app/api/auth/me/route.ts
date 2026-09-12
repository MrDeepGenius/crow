// GET /api/auth/me — usuario de la sesión (null si no autenticado)
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: true, user: null });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
