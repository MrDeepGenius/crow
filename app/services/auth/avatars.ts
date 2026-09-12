// Validación y guardado de avatares (server-only).
// Compartido por la foto de cuenta y la foto de página de creador:
// tipo real por magic bytes (no por extensión), máx 2MB.

import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export type AvatarKind = "jpg" | "png" | "webp";

export function detectImageKind(bytes: Uint8Array): AvatarKind | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (
    bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export type AvatarCheck = { ok: true; kind: AvatarKind } | { ok: false; reason: "EMPTY" | "FILE_TOO_LARGE" | "INVALID_IMAGE" };

export function checkAvatarBytes(bytes: Uint8Array): AvatarCheck {
  if (bytes.length === 0) return { ok: false, reason: "EMPTY" };
  if (bytes.length > AVATAR_MAX_BYTES) return { ok: false, reason: "FILE_TOO_LARGE" };
  const kind = detectImageKind(bytes);
  if (!kind) return { ok: false, reason: "INVALID_IMAGE" };
  return { ok: true, kind };
}

/** Guarda en public/uploads/avatars/<fileBase>.<ext> y limpia otras extensiones. */
export function saveAvatarFile(fileBase: string, bytes: Uint8Array, kind: AvatarKind): string {
  const dir = join(process.cwd(), "public", "uploads", "avatars");
  mkdirSync(dir, { recursive: true });
  const safe = fileBase.replace(/[^A-Za-z0-9_-]/g, "");
  const fileName = `${safe}.${kind}`;
  writeFileSync(join(dir, fileName), bytes);
  for (const ext of ["jpg", "png", "webp"] as const) {
    if (ext !== kind) {
      try {
        unlinkSync(join(dir, `${safe}.${ext}`));
      } catch {
        // no existía
      }
    }
  }
  return `/uploads/avatars/${fileName}?v=${Date.now()}`;
}
