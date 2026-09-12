// POST /api/account/avatar — foto de perfil de LA CUENTA (cualquier rol)
// Usa el mismo validador que la foto de creador. La página pública del
// creador la usa como fallback si no tiene foto propia.
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest, setUserAvatar } from "@/app/services/auth/auth";
import { checkAvatarBytes, saveAvatarFile } from "@/app/services/auth/avatars";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
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
    const avatarUrl = saveAvatarFile(`u-${user.id}`, bytes, check.kind);
    try {
      setUserAvatar(user.id, avatarUrl);
    } catch {
      return NextResponse.json({ ok: false, reason: "USER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, avatarUrl });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
