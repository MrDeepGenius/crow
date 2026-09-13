// ============================================
// AUTH - único sistema de autenticación Crow
// ============================================
// No existía auth que reutilizar: este es EL sistema (no un segundo).
// Email+password (scrypt de node:crypto, sin dependencias) + sesión opaca
// en cookie httpOnly. El userId SIEMPRE sale de la sesión en el servidor;
// el frontend nunca puede elegirlo ni manipularlo.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "../db/database";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roles: string[];
  onboardingCompleted: boolean;
  avatarPath: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roles: string;
  onboardingCompleted: number;
  avatarPath: string | null;
  passwordHash: string;
  isAdmin: number;
  createdAt: string;
  googleId?: string | null;
}

const SESSION_COOKIE = "crow_session";
const SESSION_DAYS = 30;

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && email.trim().length <= 160;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$16384$8$1$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const salt = parts[4] ?? "";
  const expected = Buffer.from(parts[5] ?? "", "hex");
  const actual = scryptSync(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function adminEmails(): string[] {
  return (process.env.CROW_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter((e) => e.length > 0);
}

function toAuthUser(row: UserRow): AuthUser {
  let roles: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.roles ?? "[]");
    if (Array.isArray(parsed)) roles = parsed.filter((r): r is string => typeof r === "string");
  } catch {
    roles = [];
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.firstName ?? "",
    lastName: row.lastName ?? "",
    roles,
    onboardingCompleted: (row.onboardingCompleted ?? 0) === 1,
    avatarPath: row.avatarPath ?? null,
    isAdmin: row.isAdmin === 1,
    createdAt: row.createdAt,
  };
}

export type RegisterError =
  | "INVALID_EMAIL"
  | "INVALID_NAME"
  | "WEAK_PASSWORD"
  | "EMAIL_TAKEN"
  | "TERMS_REQUIRED";

export interface RegisterInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  termsAccepted: boolean;
}

export function registerUser(
  email: string,
  nameOrFirst: string,
  password: string,
  lastNameOrOpts?: string | { lastName?: string; termsAccepted?: boolean; createdIp?: string; deviceId?: string }
): { ok: true; user: AuthUser } | { ok: false; error: RegisterError } {
  // Sobrecarga compatible: (email, name, password) legacy + (email, first, password, {lastName, terms})
  let firstName: string;
  let lastName: string;
  let termsAccepted: boolean;
  if (typeof lastNameOrOpts === "string" || lastNameOrOpts === undefined) {
    // Legacy: name completo, términos no exigidos (flujo viejo; el endpoint nuevo sí los exige).
    const parts = nameOrFirst.trim().split(/\s+/);
    firstName = parts[0] ?? "";
    lastName = typeof lastNameOrOpts === "string" ? lastNameOrOpts : parts.slice(1).join(" ");
    termsAccepted = true;
  } else {
    firstName = nameOrFirst;
    lastName = lastNameOrOpts.lastName ?? "";
    termsAccepted = lastNameOrOpts.termsAccepted === true;
  }
  const createdIp = typeof lastNameOrOpts === "object" && lastNameOrOpts !== null && typeof lastNameOrOpts.createdIp === "string" ? lastNameOrOpts.createdIp.slice(0, 60) : null;
  const deviceId = typeof lastNameOrOpts === "object" && lastNameOrOpts !== null && typeof lastNameOrOpts.deviceId === "string" ? lastNameOrOpts.deviceId.slice(0, 80) : null;
  if (!validEmail(email)) return { ok: false, error: "INVALID_EMAIL" };
  const cleanFirst = firstName.trim().slice(0, 60);
  const cleanLast = lastName.trim().slice(0, 60);
  if (cleanFirst.length < 2) return { ok: false, error: "INVALID_NAME" };
  if (password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };
  if (!termsAccepted) return { ok: false, error: "TERMS_REQUIRED" };
  const cleanName = (cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst).slice(0, 80);
  const db = getDb();
  const cleanEmail = normalizeEmail(email);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(cleanEmail) as { id: string } | undefined;
  if (existing) return { ok: false, error: "EMAIL_TAKEN" };
  const now = nowIso();
  const user: UserRow = {
    id: uid("usr"),
    email: cleanEmail,
    name: cleanName,
    firstName: cleanFirst,
    lastName: cleanLast,
    roles: "[]",
    onboardingCompleted: 0,
    avatarPath: null,
    passwordHash: hashPassword(password),
    isAdmin: adminEmails().includes(cleanEmail) ? 1 : 0,
    createdAt: now,
  };
  db.prepare(
    "INSERT INTO users (id, email, name, firstName, lastName, roles, onboardingCompleted, passwordHash, isAdmin, isDev, createdIp, deviceId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)"
  ).run(user.id, user.email, user.name, user.firstName, user.lastName, user.roles, user.onboardingCompleted, user.passwordHash, user.isAdmin, createdIp, deviceId, now, now);
  return { ok: true, user: toAuthUser(user) };
}

export type LoginError = "INVALID_CREDENTIALS";

export function loginUser(email: string, password: string): { ok: true; user: AuthUser; token: string } | { ok: false; error: LoginError } {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email)) as UserRow | undefined;
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }
  // Elevación admin por env (capa explícita y auditable, no manipulable por el cliente).
  if (!row.isAdmin && adminEmails().includes(row.email)) {
    db.prepare("UPDATE users SET isAdmin = 1, updatedAt = ? WHERE id = ?").run(nowIso(), row.id);
    row.isAdmin = 1;
  }
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  db.prepare("INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)").run(
    tokenHash,
    row.id,
    now,
    expiresAt
  );
  return { ok: true, user: toAuthUser(row), token };
}

export function logoutToken(token: string): void {
  const db = getDb();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM sessions WHERE tokenHash = ?").run(tokenHash);
}

/** Foto de perfil a nivel cuenta (vale para todos los roles del usuario). */
export function setUserAvatar(userId: string, avatarPath: string): void {
  const db = getDb();
  const info = db.prepare("UPDATE users SET avatarPath = ?, updatedAt = ? WHERE id = ?").run(
    avatarPath,
    nowIso(),
    userId
  );
  if (info.changes !== 1) throw new Error("USER_NOT_FOUND");
}

/** Usuario de sesión o null (expirada, inexistente o inválida). */
export function getUserFromToken(token: string): AuthUser | null {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const db = getDb();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.userId
       WHERE s.tokenHash = ? AND s.expiresAt > ?`
    )
    .get(tokenHash, nowIso()) as UserRow | undefined;
  return row ? toAuthUser(row) : null;
}

export function getTokenFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) {
      return part.slice(idx + 1).trim();
    }
  }
  return null;
}

/** Lee la sesión de un Request server-side. Null = no autenticado. */
export function getAuthUserFromRequest(req: Request): AuthUser | null {
  return getUserFromToken(getTokenFromCookieHeader(req.headers.get("cookie")) ?? "");
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

/**
 * Anti-CSRF barato y efectivo para mutaciones: si el navegador envía Origin,
 * debe coincidir con el Host destinatario. Peticiones sin Origin (navegación,
 * curl, server-to-server) pasan.
 */
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  // En desarrollo el preview corre detrás de un proxy con host distinto al origin;
  // relajamos el check para no bloquear peticiones legítimas del navegador.
  if (process.env.NODE_ENV !== "production") return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? new URL(req.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Autorización admin real: sesión de usuario isAdmin, o CROW_ADMIN_KEY como
 * capa adicional legacy (header x-admin-key). Nunca un valor del body.
 */
export function isAdminRequest(req: Request): { ok: true; user: AuthUser | null } | { ok: false; reason: string } {
  const user = getAuthUserFromRequest(req);
  if (user?.isAdmin) return { ok: true, user };
  const adminKey = process.env.CROW_ADMIN_KEY?.trim() || "";
  if (adminKey && req.headers.get("x-admin-key") === adminKey) {
    return { ok: true, user };
  }
  if (!user) return { ok: false, reason: "UNAUTHENTICATED" };
  return { ok: false, reason: "FORBIDDEN" };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

// ============================================
// GOOGLE OAuth — find-or-create + sesión
// ============================================

export function loginWithGoogle(info: {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarPath: string | null;
}): { ok: true; user: AuthUser; token: string } | { ok: false; error: string } {
  const db = getDb();
  const cleanEmail = normalizeEmail(info.email);
  // ¿Ya existe un usuario con googleId?
  const byGoogle = db
    .prepare("SELECT * FROM users WHERE googleId = ?")
    .get(info.googleId) as UserRow | undefined;
  if (byGoogle) {
    return createSession(byGoogle);
  }
  // ¿Existe por email? Vincularle el googleId
  const byEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail) as UserRow | undefined;
  if (byEmail) {
    db.prepare("UPDATE users SET googleId = ?, avatarPath = COALESCE(?, avatarPath), updatedAt = ? WHERE id = ?")
      .run(info.googleId, info.avatarPath, nowIso(), byEmail.id);
    byEmail.googleId = info.googleId;
    if (info.avatarPath && !byEmail.avatarPath) byEmail.avatarPath = info.avatarPath;
    return createSession(byEmail);
  }
  // Crear usuario nuevo
  const cleanFirst = info.firstName.trim().slice(0, 60) || "Google";
  const cleanLast = info.lastName.trim().slice(0, 60);
  const cleanName = (cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst).slice(0, 80);
  const now = nowIso();
  const user: UserRow = {
    id: uid("usr"),
    email: cleanEmail,
    name: cleanName,
    firstName: cleanFirst,
    lastName: cleanLast,
    roles: "[]",
    onboardingCompleted: 0,
    avatarPath: info.avatarPath,
    passwordHash: "", // sin password — solo Google
    isAdmin: adminEmails().includes(cleanEmail) ? 1 : 0,
    createdAt: now,
  };
  db.prepare(
    "INSERT INTO users (id, email, name, firstName, lastName, roles, onboardingCompleted, avatarPath, passwordHash, isAdmin, isDev, googleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)"
  ).run(user.id, user.email, user.name, user.firstName, user.lastName, user.roles, user.onboardingCompleted, user.avatarPath, user.passwordHash, user.isAdmin, info.googleId, now, now);
  return createSession(user);
}

function createSession(row: UserRow): { ok: true; user: AuthUser; token: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  const db = getDb();
  db.prepare("INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)").run(
    tokenHash,
    row.id,
    now,
    expiresAt
  );
  return { ok: true, user: toAuthUser(row), token };
}
