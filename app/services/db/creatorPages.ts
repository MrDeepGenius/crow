// ============================================
// CREATOR PAGES - página pública del creador
// ============================================
// 1:1 con User (mismo userId, rol creator requerido para escribir).
// displayName/bio/avatar los edita el dueño; la lectura pública por slug
// expone solo lo público (nunca email ni userId).

import { getDb } from "./database";

export interface CreatorPage {
  slug: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  updatedAt: string;
}

interface CreatorPageRow {
  slug: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
  updatedAt: string;
}

function toPublic(row: CreatorPageRow): CreatorPage {
  return {
    slug: row.slug,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: row.avatarPath,
    updatedAt: row.updatedAt,
  };
}

export function slugifyName(name: string): string {
  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "creador";
  return slug;
}

/** Slug único: base, base-2, base-3... (excluye al propio userId al editar). */
export function uniqueSlug(displayName: string, excludeUserId?: string): string {
  const db = getDb();
  const base = slugifyName(displayName);
  let slug = base;
  let n = 2;
  while (true) {
    const row = db.prepare("SELECT userId FROM creator_pages WHERE slug = ?").get(slug) as
      | { userId: string }
      | undefined;
    if (!row || row.userId === excludeUserId) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

export function getCreatorPageByUser(userId: string): CreatorPage | null {
  const row = getDb().prepare(
    `SELECT p.slug, p.displayName, p.bio, p.avatarPath,
            COALESCE(p.avatarPath, u.avatarPath) AS effectiveAvatar, p.updatedAt
     FROM creator_pages p JOIN users u ON u.id = p.userId WHERE p.userId = ?`
  ).get(userId) as
    | (CreatorPageRow & { effectiveAvatar: string | null })
    | undefined;
  return row ? { ...toPublic(row), avatarUrl: row.effectiveAvatar } : null;
}

export function getCreatorPageBySlug(slug: string): CreatorPage | null {
  if (!/^[a-z0-9-]{1,44}$/.test(slug)) return null;
  const row = getDb().prepare(
    `SELECT p.slug, p.displayName, p.bio, p.avatarPath,
            COALESCE(p.avatarPath, u.avatarPath) AS effectiveAvatar, p.updatedAt
     FROM creator_pages p JOIN users u ON u.id = p.userId WHERE p.slug = ?`
  ).get(slug.toLowerCase()) as
    | (CreatorPageRow & { effectiveAvatar: string | null })
    | undefined;
  return row ? { ...toPublic(row), avatarUrl: row.effectiveAvatar } : null;
}

export interface SaveCreatorPageInput {
  displayName: string;
  bio: string;
}

export function saveCreatorPage(userId: string, input: SaveCreatorPageInput): CreatorPage {
  const displayName = input.displayName.trim().slice(0, 60);
  if (displayName.length < 2) throw new Error("INVALID_NAME");
  const bio = input.bio.trim().slice(0, 500);
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as
    | { id: string }
    | undefined;
  if (!user) throw new Error("USER_NOT_FOUND");
  const existing = db.prepare("SELECT slug, avatarPath FROM creator_pages WHERE userId = ?").get(userId) as
    | { slug: string; avatarPath: string | null }
    | undefined;
  const slug = existing?.slug ?? uniqueSlug(displayName, userId);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO creator_pages (userId, slug, displayName, bio, avatarPath, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET displayName = excluded.displayName, bio = excluded.bio, updatedAt = excluded.updatedAt`
  ).run(userId, slug, displayName, bio, existing?.avatarPath ?? null, now);
  const row = db.prepare(
    `SELECT p.slug, p.displayName, p.bio, p.avatarPath,
            COALESCE(p.avatarPath, u.avatarPath) AS effectiveAvatar, p.updatedAt
     FROM creator_pages p JOIN users u ON u.id = p.userId WHERE p.userId = ?`
  ).get(userId) as unknown as CreatorPageRow & { effectiveAvatar: string | null };
  return { ...toPublic(row), avatarUrl: row.effectiveAvatar };
}

export function setCreatorAvatar(userId: string, avatarPath: string | null): void {
  const db = getDb();
  const existing = db.prepare("SELECT userId FROM creator_pages WHERE userId = ?").get(userId) as
    | { userId: string }
    | undefined;
  if (!existing) throw new Error("PAGE_NOT_FOUND");
  db.prepare("UPDATE creator_pages SET avatarPath = ?, updatedAt = ? WHERE userId = ?").run(
    avatarPath,
    new Date().toISOString(),
    userId
  );
}
