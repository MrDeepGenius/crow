// POST /api/account/creator-page/avatar — foto/logo de la página (sesión + rol creator)
// Mismo validador que la foto de cuenta. Guarda en public/uploads/avatars
// (gitignored; en prod usar storage).
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { checkAvatarBytes, saveAvatarFile } from "@/app/services/auth/avatars";
import { requireRole } from "@/app/services/db/profiles";
import { getCreatorPageByUser, setCreatorAvatar } from "@/app/services/db/creatorPages";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const existing = getCreatorPageByUser(user.id);
    if (!existing) {
      return NextResponse.json({ ok: false, reason: "PAGE_NOT_FOUND", detail: "Creá tu página primero." }, { status: 400 });
    }
    let file: File | null = null;
    try {
      const form = await req.formData();
      const value = form.get("avatar");
      if (value instanceof File) file = value;
    } catch {
      return NextResponse.json({ ok: false, reason: "INVALID_FILE" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ ok: false, reason: "INVALID_FILE" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkAvatarBytes(bytes);
    if (!check.ok) {
      return NextResponse.json({ ok: false, reason: check.reason === "EMPTY" ? "INVALID_FILE" : check.reason }, { status: 400 });
    }
    const avatarUrl = saveAvatarFile(user.id, bytes, check.kind);
    setCreatorAvatar(user.id, avatarUrl);
    return NextResponse.json({ ok: true, avatarUrl });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
