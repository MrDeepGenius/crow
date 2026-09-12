// ============================================
// REFERRALS - cadena de referidos server-side
// ============================================
// Fuente de verdad del referrerId (inmutable por API pública).
// Los códigos/referrals de localStorage (marketLedger) siguen existiendo en
// cliente; este módulo es la capa server que valida y persiste.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";

export const MAX_COMMISSION_LEVELS = 3;

export type ReferralErrorCode =
  | "USER_NOT_FOUND"
  | "REFERRER_NOT_FOUND"
  | "SELF_REFERRAL"
  | "SELF_REFERRAL_CHAIN"
  | "REFERRAL_CYCLE"
  | "ALREADY_REFERRED"
  | "INVALID_CODE";

export class ReferralError extends Error {
  code: ReferralErrorCode;
  constructor(code: ReferralErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Ancestros del usuario: [padre, abuelo, ...]. Incluye detección de ciclo existente. */
export function getAncestors(userId: string): string[] {
  const db = getDb();
  const chain: string[] = [];
  const seen = new Set<string>([userId]);
  let current: string | null = userId;
  for (let i = 0; i < 32; i++) {
    const row = db.prepare("SELECT referrerId FROM referrals WHERE userId = ?").get(current) as
      | { referrerId: string }
      | undefined;
    if (!row) break;
    if (seen.has(row.referrerId)) {
      // Ciclo preexistente en datos: se corta y se reporta.
      chain.push(row.referrerId);
      break;
    }
    seen.add(row.referrerId);
    chain.push(row.referrerId);
    current = row.referrerId;
  }
  return chain;
}

export function getReferrer(userId: string): string | null {
  const row = getDb().prepare("SELECT referrerId FROM referrals WHERE userId = ?").get(userId) as
    | { referrerId: string }
    | undefined;
  return row?.referrerId ?? null;
}

/**
 * Valida una arista nuevoUsuario -> referrer contra TODA la cadena.
 * A→B válido; A→A, A→B→A, A→B→B, A→B→C→A inválidos.
 */
export function validateReferralEdge(newUserId: string, referrerId: string): void {
  if (!newUserId || !referrerId) throw new ReferralError("USER_NOT_FOUND", "Usuario inválido");
  if (newUserId === referrerId) {
    throw new ReferralError("SELF_REFERRAL", "Un usuario no puede referirse a sí mismo");
  }
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(newUserId) as { id: string } | undefined;
  if (!user) throw new ReferralError("USER_NOT_FOUND", "Usuario inexistente");
  const ref = db.prepare("SELECT id FROM users WHERE id = ?").get(referrerId) as { id: string } | undefined;
  if (!ref) throw new ReferralError("REFERRER_NOT_FOUND", "Referente inexistente");
  const existing = db.prepare("SELECT userId FROM referrals WHERE userId = ?").get(newUserId) as
    | { userId: string }
    | undefined;
  if (existing) throw new ReferralError("ALREADY_REFERRED", "El referrer ya está establecido y es inmutable");
  const ancestors = getAncestors(referrerId);
  if (ancestors.includes(newUserId) || referrerId === newUserId) {
    throw new ReferralError("SELF_REFERRAL_CHAIN", "El usuario ya aparece en la cadena de referidos");
  }
  // Ciclo general: si algún ancestro del referente ya contiene al referente
  // dos veces o el nuevo enlace cierra un lazo existente.
  const seen = new Set<string>();
  for (const id of [referrerId, ...ancestors]) {
    if (seen.has(id)) {
      throw new ReferralError("REFERRAL_CYCLE", "Ciclo detectado en la cadena de referidos");
    }
    seen.add(id);
  }
}

/** Asigna referrer (una sola vez). Cualquier cambio posterior va por auditoría admin. */
export function assignReferrer(newUserId: string, referrerId: string, kind = "affiliate"): void {
  validateReferralEdge(newUserId, referrerId);
  const db = getDb();
  const now = nowIso();
  db.prepare("INSERT INTO referrals (userId, referrerId, kind, createdAt) VALUES (?, ?, ?, ?)").run(
    newUserId,
    referrerId,
    kind,
    now
  );
  db.prepare("UPDATE users SET referrerId = ?, updatedAt = ? WHERE id = ? AND referrerId IS NULL").run(
    referrerId,
    now,
    newUserId
  );
}

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "CROW-";
  for (const b of bytes) code += alphabet[(b as number) % alphabet.length];
  return code;
}

/** Código público del afiliado (uno por usuario, estable). */
export function getOrCreateReferralCode(ownerUserId: string): string {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(ownerUserId) as { id: string } | undefined;
  if (!user) throw new ReferralError("USER_NOT_FOUND", "Usuario inexistente");
  const existing = db.prepare("SELECT code FROM referral_codes WHERE ownerUserId = ?").get(ownerUserId) as
    | { code: string }
    | undefined;
  if (existing) return existing.code;
  for (let i = 0; i < 10; i++) {
    const code = makeCode();
    try {
      db.prepare("INSERT INTO referral_codes (code, ownerUserId, createdAt) VALUES (?, ?, ?)").run(
        code,
        ownerUserId,
        nowIso()
      );
      return code;
    } catch {
      // colisión: reintentar
    }
  }
  throw new ReferralError("INVALID_CODE", "No se pudo generar el código");
}

export function resolveReferralCode(code: string): string | null {
  const clean = code.trim().toUpperCase();
  if (!/^CROW-[A-Z2-9]{6}$/.test(clean)) return null;
  const row = getDb().prepare("SELECT ownerUserId FROM referral_codes WHERE code = ?").get(clean) as
    | { ownerUserId: string }
    | undefined;
  return row?.ownerUserId ?? null;
}

/** Cadena de comisiones: [directo, L1, L2, L3] como máximo (se ignora el resto). */
export function buildCommissionChain(directAffiliateId: string): string[] {
  return [directAffiliateId, ...getAncestors(directAffiliateId)].slice(0, 1 + MAX_COMMISSION_LEVELS);
}
