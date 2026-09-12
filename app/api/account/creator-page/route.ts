// GET/PUT /api/account/creator-page — mi página pública (sesión + rol creator)
// GET crea nada: 404 si aún no tiene página. PUT valida y guarda (slug único,
// se genera una sola vez y no cambia al editar el nombre).
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { getCreatorPageByUser, saveCreatorPage } from "@/app/services/db/creatorPages";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const page = getCreatorPageByUser(user.id);
    if (!page) return NextResponse.json({ ok: false, reason: "NO_PAGE" }, { status: 404 });
    return NextResponse.json({ ok: true, page });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function PUT(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const body = (await req.json()) as { displayName?: unknown; bio?: unknown };
    try {
      const page = saveCreatorPage(user.id, {
        displayName: typeof body.displayName === "string" ? body.displayName : "",
        bio: typeof body.bio === "string" ? body.bio : "",
      });
      return NextResponse.json({ ok: true, page });
    } catch (err) {
      const code = err instanceof Error ? err.message : "INVALID_INPUT";
      return NextResponse.json({ ok: false, reason: code }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
