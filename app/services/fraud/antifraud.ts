// ============================================
// ANTI-FRAUD ENGINE - señales, score, casos, auditoría
// ============================================
// Señales ≠ prueba: IP/device solo suman riesgo bajo/moderado y NUNCA
// bloquean solas (familias que comparten Wi-Fi/dispositivo son legítimas).
// BLOCKED solo por regla determinística (self-referral, ciclo, identidad
// duplicada inequívoca). Sin KYC.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";

export type SignalType =
  | "EMAIL_DUPLICATE"
  | "PHONE_DUPLICATE"
  | "SAME_WITHDRAWAL_WALLET"
  | "SHARED_WITHDRAWAL_WALLET"
  | "SAME_PAYMENT_PATTERN"
  | "SAME_DEVICE"
  | "SAME_IP"
  | "MULTIPLE_ACCOUNTS_CREATED_QUICKLY"
  | "ABNORMAL_REFERRAL_PATTERN"
  | "ABNORMAL_PURCHASE_PATTERN"
  | "SUSPICIOUS_ACTIVITY"
  | "SELF_REFERRAL_ATTEMPT"
  | "REFERRAL_CYCLE_ATTEMPT";

export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  EMAIL_DUPLICATE: 100,
  PHONE_DUPLICATE: 100,
  SAME_WITHDRAWAL_WALLET: 80,
  SHARED_WITHDRAWAL_WALLET: 80,
  SAME_PAYMENT_PATTERN: 40,
  SAME_DEVICE: 20,
  SAME_IP: 10,
  MULTIPLE_ACCOUNTS_CREATED_QUICKLY: 20,
  ABNORMAL_REFERRAL_PATTERN: 30,
  ABNORMAL_PURCHASE_PATTERN: 30,
  SUSPICIOUS_ACTIVITY: 30,
  SELF_REFERRAL_ATTEMPT: 100,
  REFERRAL_CYCLE_ATTEMPT: 100,
};

export type RiskStatus = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | "REVIEW_REQUIRED" | "BLOCKED";

export function statusForScore(score: number): RiskStatus {
  if (score >= 100) return "REVIEW_REQUIRED";
  if (score >= 80) return "REVIEW_REQUIRED";
  if (score >= 60) return "HIGH_RISK";
  if (score >= 30) return "MEDIUM_RISK";
  return "LOW_RISK";
}

export interface RiskProfile {
  userId: string;
  riskScore: number;
  riskStatus: RiskStatus;
  signals: SignalType[];
  updatedAt: string;
}

export type AuditEvent =
  | "AFFILIATE_CREATED"
  | "REFERRER_ASSIGNED"
  | "REFERRER_CHANGE_ATTEMPT"
  | "SELF_REFERRAL_ATTEMPT"
  | "REFERRAL_CYCLE_ATTEMPT"
  | "EMAIL_DUPLICATE"
  | "PHONE_DUPLICATE"
  | "DUPLICATE_CHAIN_DETECTED"
  | "RISK_SCORE_CHANGED"
  | "COMMISSION_HELD"
  | "COMMISSION_RELEASED"
  | "COMMISSION_BLOCKED"
  | "FRAUD_REVIEW_CREATED"
  | "CASE_RESOLVED_SAFE"
  | "CASE_KEPT_UNDER_REVIEW"
  | "LEVEL_1_UNLOCK_EMERGENCY_CREDIT"
  | "LICENSE_REWARDS_POOL_CREDIT"
  | "REWARDS_POOL_DEBIT"
  | "VOLUME_CREATED"
  | "VOLUME_REVERSED"
  | "REWARD_UNLOCKED"
  | "REWARD_CLAIMED"
  | "REWARD_PAID";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function userExists(userId: string): boolean {
  const row = getDb().prepare("SELECT id FROM users WHERE id = ?").get(userId) as { id: string } | undefined;
  return Boolean(row);
}

/** Email canónico (gmail dots/plus) para detectar duplicados reales. */
export function canonicalEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at < 0) return clean;
  const local = clean.slice(0, at).split("+")[0]?.replace(/\./g, "") ?? "";
  const domain = clean.slice(at + 1);
  const base = domain === "googlemail.com" ? "gmail.com" : domain;
  return `${local}@${base}`;
}

export function audit(
  event: AuditEvent,
  opts: { userId?: string | null; relatedUserId?: string | null; orderId?: string | null; reason?: string; riskScore?: number | null; metadata?: Record<string, string | number | boolean | null> } = {}
): string {
  const db = getDb();
  const id = uid("evt");
  db.prepare(
    "INSERT INTO fraud_audit_logs (id, event, userId, relatedUserId, orderId, reason, riskScore, metadata, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    event,
    opts.userId ?? null,
    opts.relatedUserId ?? null,
    opts.orderId ?? null,
    (opts.reason ?? "").slice(0, 500),
    opts.riskScore ?? null,
    JSON.stringify(opts.metadata ?? {}),
    nowIso()
  );
  return id;
}

function activeSignals(userId: string): SignalType[] {
  const rows = getDb().prepare("SELECT DISTINCT type FROM fraud_signals WHERE userId = ?").all(userId) as { type: string }[];
  return rows.map((r) => r.type).filter((t): t is SignalType => t in SIGNAL_WEIGHTS);
}

function refreshProfile(userId: string, forceStatus?: RiskStatus): RiskProfile {
  const db = getDb();
  const signals = activeSignals(userId);
  const score = Math.min(100, signals.reduce((n, t) => n + SIGNAL_WEIGHTS[t], 0));
  const prev = db.prepare("SELECT riskScore, riskStatus FROM fraud_risk_profiles WHERE userId = ?").get(userId) as
    | { riskScore: number; riskStatus: RiskStatus }
    | undefined;
  const status = forceStatus ?? statusForScore(score);
  const now = nowIso();
  if (prev) {
    db.prepare("UPDATE fraud_risk_profiles SET riskScore = ?, riskStatus = ?, signals = ?, updatedAt = ? WHERE userId = ?").run(
      score,
      status,
      JSON.stringify(signals),
      now,
      userId
    );
    if (prev.riskScore !== score || prev.riskStatus !== status) {
      audit("RISK_SCORE_CHANGED", { userId, reason: `${prev.riskStatus}/${prev.riskScore} → ${status}/${score}`, riskScore: score });
    }
  } else {
    db.prepare("INSERT INTO fraud_risk_profiles (userId, riskScore, riskStatus, signals, updatedAt) VALUES (?, ?, ?, ?, ?)").run(
      userId,
      score,
      status,
      JSON.stringify(signals),
      now
    );
    if (score > 0) {
      audit("RISK_SCORE_CHANGED", { userId, reason: `NONE/0 → ${status}/${score}`, riskScore: score });
    }
  }
  maybeOpenCase(userId, status, score);
  return { userId, riskScore: score, riskStatus: status, signals, updatedAt: now };
}

function maybeOpenCase(userId: string, status: RiskStatus, score: number): void {
  if (status !== "HIGH_RISK" && status !== "REVIEW_REQUIRED" && status !== "BLOCKED") return;
  const db = getDb();
  const open = db.prepare("SELECT id FROM fraud_cases WHERE userId = ? AND status = 'OPEN'").get(userId) as { id: string } | undefined;
  if (open) {
    db.prepare("UPDATE fraud_cases SET riskScore = ?, updatedAt = ? WHERE id = ?").run(score, nowIso(), open.id);
    return;
  }
  const id = uid("case");
  db.prepare(
    "INSERT INTO fraud_cases (id, userId, relatedUserId, orderId, status, riskScore, reason, createdAt, updatedAt, resolvedAt) VALUES (?, ?, NULL, NULL, 'OPEN', ?, ?, ?, ?, NULL)"
  ).run(id, userId, score, `RISK_${status}`, nowIso(), nowIso());
  audit("FRAUD_REVIEW_CREATED", { userId, reason: `RISK_${status}`, riskScore: score, metadata: { caseId: id } });
}

export function getRiskProfile(userId: string): RiskProfile {
  const row = getDb().prepare("SELECT riskScore, riskStatus, signals, updatedAt FROM fraud_risk_profiles WHERE userId = ?").get(userId) as
    | { riskScore: number; riskStatus: string; signals: string; updatedAt: string }
    | undefined;
  if (!row) return { userId, riskScore: 0, riskStatus: "LOW_RISK", signals: [], updatedAt: nowIso() };
  let signals: SignalType[] = [];
  try {
    const parsed: unknown = JSON.parse(row.signals);
    if (Array.isArray(parsed)) signals = parsed.filter((s): s is SignalType => typeof s === "string" && s in SIGNAL_WEIGHTS);
  } catch {
    signals = [];
  }
  return { userId, riskScore: row.riskScore, riskStatus: row.riskStatus as RiskStatus, signals, updatedAt: row.updatedAt };
}

/** Registra una señal (idempotente por tipo) y recalcula. Nunca bloquea por sí sola. */
export function recordSignal(userId: string, type: SignalType, detail = ""): RiskProfile {
  if (!userExists(userId)) throw new Error("USER_NOT_FOUND");
  const db = getDb();
  const existing = db.prepare("SELECT id FROM fraud_signals WHERE userId = ? AND type = ?").get(userId, type) as { id: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO fraud_signals (id, userId, type, detail, weight, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      uid("sig"),
      userId,
      type,
      detail.slice(0, 300),
      SIGNAL_WEIGHTS[type],
      nowIso()
    );
  }
  return refreshProfile(userId);
}

/**
 * Hit determinístico (self-referral, ciclo, identidad duplicada): BLOCKED + caso.
 * Solo se llama cuando la regla lo confirma, nunca por score.
 */
export function recordDeterministicHit(
  userId: string,
  type: "SELF_REFERRAL_ATTEMPT" | "REFERRAL_CYCLE_ATTEMPT" | "EMAIL_DUPLICATE" | "PHONE_DUPLICATE",
  opts: { relatedUserId?: string; orderId?: string; reason?: string } = {}
): RiskProfile {
  if (!userExists(userId)) throw new Error("USER_NOT_FOUND");
  const db = getDb();
  const existing = db.prepare("SELECT id FROM fraud_signals WHERE userId = ? AND type = ?").get(userId, type) as { id: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO fraud_signals (id, userId, type, detail, weight, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      uid("sig"),
      userId,
      type,
      (opts.reason ?? "").slice(0, 300),
      SIGNAL_WEIGHTS[type],
      nowIso()
    );
  }
  audit(type, {
    userId,
    relatedUserId: opts.relatedUserId ?? null,
    orderId: opts.orderId ?? null,
    reason: opts.reason ?? type,
    riskScore: 100,
  });
  return refreshProfile(userId, "BLOCKED");
}

export interface EvalContext {
  ip?: string;
  deviceId?: string;
  wallet?: string;
  phone?: string;
}

/**
 * Evalúa un usuario con contexto de entorno. IP/device/wallet generan
 * señales pero jamás bloquean (familiares con Wi-Fi compartido son legítimos).
 */
export function evaluateUser(userId: string, ctx: EvalContext = {}): RiskProfile {
  const db = getDb();
  const me = db.prepare("SELECT id, email, createdIp, deviceId, phone, withdrawalWallet, createdAt FROM users WHERE id = ?").get(userId) as
    | { id: string; email: string; createdIp: string | null; deviceId: string | null; phone: string | null; withdrawalWallet: string | null; createdAt: string }
    | undefined;
  if (!me) throw new Error("USER_NOT_FOUND");

  if (ctx.ip) {
    const others = db.prepare("SELECT id FROM users WHERE id != ? AND createdIp = ? LIMIT 1").get(userId, ctx.ip) as { id: string } | undefined;
    if (others) recordSignal(userId, "SAME_IP", `comparte IP con ${others.id.slice(0, 12)}`);
    if (!me.createdIp) db.prepare("UPDATE users SET createdIp = ? WHERE id = ?").run(ctx.ip, userId);
  }
  if (ctx.deviceId) {
    const others = db.prepare("SELECT id FROM users WHERE id != ? AND deviceId = ? LIMIT 1").get(userId, ctx.deviceId) as { id: string } | undefined;
    if (others) recordSignal(userId, "SAME_DEVICE", `comparte dispositivo con ${others.id.slice(0, 12)}`);
    if (!me.deviceId) db.prepare("UPDATE users SET deviceId = ? WHERE id = ?").run(ctx.deviceId, userId);
  }
  if (ctx.wallet) {
    const w = ctx.wallet.trim().toLowerCase();
    if (w) {
      const others = db.prepare("SELECT id FROM users WHERE id != ? AND LOWER(withdrawalWallet) = ? LIMIT 1").get(userId, w) as { id: string } | undefined;
      if (others) {
        recordSignal(userId, "SHARED_WITHDRAWAL_WALLET", `wallet compartido con ${others.id.slice(0, 12)}`);
        recordSignal(others.id, "SHARED_WITHDRAWAL_WALLET", `wallet compartido con ${userId.slice(0, 12)}`);
      }
      if (!me.withdrawalWallet) db.prepare("UPDATE users SET withdrawalWallet = ? WHERE id = ?").run(ctx.wallet.trim(), userId);
    }
  }
  if (ctx.phone) {
    const p = ctx.phone.replace(/\D/g, "");
    if (p) {
      const dup = db.prepare("SELECT id FROM users WHERE id != ? AND phone = ? LIMIT 1").get(userId, ctx.phone.trim()) as { id: string } | undefined;
      if (dup) return recordDeterministicHit(userId, "PHONE_DUPLICATE", { relatedUserId: dup.id, reason: "Mismo teléfono en dos cuentas" });
      if (!me.phone) db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(ctx.phone.trim(), userId);
    }
  }

  // Email canónico duplicado ( inequívoco.
  const canon = canonicalEmail(me.email);
  const emailDup = db.prepare("SELECT id, email FROM users WHERE id != ?").all(userId) as { id: string; email: string }[];
  const dupUser = emailDup.find((u) => canonicalEmail(u.email) === canon);
  if (dupUser) {
    return recordDeterministicHit(userId, "EMAIL_DUPLICATE", { relatedUserId: dupUser.id, reason: "Email canónico duplicado" });
  }

  detectMassAccounts(userId, ctx);
  detectAbnormalReferrals(userId);
  detectSuspiciousPurchases(userId);
  return refreshProfile(userId);
}

function detectMassAccounts(userId: string, ctx: EvalContext): void {
  if (!ctx.ip && !ctx.deviceId) return;
  const db = getDb();
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  let count = 0;
  if (ctx.ip) {
    const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE createdIp = ? AND createdAt >= ?").get(ctx.ip, since) as { n: number };
    count = Math.max(count, row.n);
  }
  if (ctx.deviceId) {
    const row = db.prepare("SELECT COUNT(*) AS n FROM users WHERE deviceId = ? AND createdAt >= ?").get(ctx.deviceId, since) as { n: number };
    count = Math.max(count, row.n);
  }
  if (count >= 5) {
    recordSignal(userId, "MULTIPLE_ACCOUNTS_CREATED_QUICKLY", `${count} cuentas en 15 min mismo entorno`);
  }
}

function detectAbnormalReferrals(userId: string): void {
  const db = getDb();
  const since = new Date(Date.now() - 3600000).toISOString();
  const row = db.prepare("SELECT COUNT(*) AS n FROM referrals WHERE referrerId = ? AND createdAt >= ?").get(userId, since) as { n: number };
  if (row.n >= 5) {
    recordSignal(userId, "ABNORMAL_REFERRAL_PATTERN", `${row.n} referidos directos en 1h`);
  }
}

function getDescendants(userId: string, maxDepth = 6): Set<string> {
  const db = getDb();
  const found = new Set<string>();
  let frontier = [userId];
  for (let d = 0; d < maxDepth && frontier.length > 0; d++) {
    const placeholders = frontier.map(() => "?").join(",");
    const rows = db.prepare(`SELECT userId FROM referrals WHERE referrerId IN (${placeholders})`).all(...frontier) as { userId: string }[];
    frontier = [];
    for (const r of rows) {
      if (r.userId !== userId && !found.has(r.userId)) {
        found.add(r.userId);
        frontier.push(r.userId);
      }
    }
  }
  return found;
}

/**
 * Compras del usuario atribuidas a afiliados de su propio subárbol
 * (auto-tráfico en la propia cadena) ≥3 → SUSPICIOUS_ACTIVITY.
 */
function detectSuspiciousPurchases(userId: string): void {
  const db = getDb();
  const subtree = getDescendants(userId);
  if (subtree.size === 0) return;
  const placeholders = [...subtree].map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT COUNT(DISTINCT orderId) AS n FROM commission_holds WHERE affiliateUserId IN (${placeholders}) AND orderId IN (SELECT id FROM orders WHERE userId = ?)`
    )
    .all(...[...subtree], userId) as { n: number }[];
  const n = rows[0]?.n ?? 0;
  if (n >= 3) {
    recordSignal(userId, "SUSPICIOUS_ACTIVITY", `${n} compras propias vía su subárbol`);
  }
}

// ---------- Casos y holds ----------

export interface FraudCase {
  id: string;
  userId: string;
  relatedUserId: string | null;
  orderId: string | null;
  status: string;
  riskScore: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export function getOpenCases(limit = 100): FraudCase[] {
  return getDb().prepare("SELECT * FROM fraud_cases WHERE status = 'OPEN' ORDER BY updatedAt DESC LIMIT ?").all(limit) as unknown as FraudCase[];
}

export function getCase(caseId: string): FraudCase | null {
  const row = getDb().prepare("SELECT * FROM fraud_cases WHERE id = ?").get(caseId) as unknown as FraudCase | undefined;
  return row ?? null;
}

export function getUserCases(userId: string): FraudCase[] {
  return getDb().prepare("SELECT * FROM fraud_cases WHERE userId = ? ORDER BY updatedAt DESC LIMIT 50").all(userId) as unknown as FraudCase[];
}

export type CaseAction = "MARK_SAFE" | "KEEP_UNDER_REVIEW" | "BLOCK_COMMISSION" | "UNBLOCK_COMMISSION";

export function reviewCase(caseId: string, action: CaseAction, adminUserId: string, note = ""): FraudCase {
  const db = getDb();
  const c = getCase(caseId);
  if (!c) throw new Error("CASE_NOT_FOUND");
  const now = nowIso();
  if (action === "MARK_SAFE") {
    db.prepare("UPDATE fraud_cases SET status = 'RESOLVED_SAFE', updatedAt = ?, resolvedAt = ? WHERE id = ?").run(now, now, caseId);
    // La revisión aprueba la VENTA: libera todos los holds PENDING de la orden
    // (no solo los del usuario del caso, que puede ser uno de varios miembros).
    if (c.orderId) {
      db.prepare("UPDATE commission_holds SET status = 'RELEASED', updatedAt = ? WHERE orderId = ? AND status = 'PENDING_REVIEW'").run(now, c.orderId);
    } else {
      db.prepare("UPDATE commission_holds SET status = 'RELEASED', updatedAt = ? WHERE orderId = ? AND affiliateUserId = ? AND status = 'PENDING_REVIEW'").run(now, c.orderId ?? "", c.userId);
    }
    audit("CASE_RESOLVED_SAFE", { userId: c.userId, relatedUserId: adminUserId, orderId: c.orderId, reason: note || "MARK_SAFE" });
    audit("COMMISSION_RELEASED", { userId: c.userId, relatedUserId: adminUserId, orderId: c.orderId, reason: note || "MARK_SAFE" });
  } else if (action === "KEEP_UNDER_REVIEW") {
    db.prepare("UPDATE fraud_cases SET updatedAt = ? WHERE id = ?").run(now, caseId);
    audit("CASE_KEPT_UNDER_REVIEW", { userId: c.userId, relatedUserId: adminUserId, orderId: c.orderId, reason: note || "KEEP_UNDER_REVIEW" });
  } else if (action === "BLOCK_COMMISSION") {
    // Bloquea todo lo retenido/liberado de la orden si el caso la referencia.
    const orderFilter = c.orderId ? "orderId = ?" : "orderId = ? AND affiliateUserId = ?";
    const orderParams: string[] = c.orderId ? [c.orderId] : [c.orderId ?? "", c.userId];
    db.prepare(`UPDATE commission_holds SET status = 'BLOCKED', reason = ?, updatedAt = ? WHERE ${orderFilter} AND status IN ('PENDING_REVIEW','RELEASED')`).run(
      note.slice(0, 300) || "BLOCK_COMMISSION",
      now,
      ...orderParams
    );
    audit("COMMISSION_BLOCKED", { userId: c.userId, relatedUserId: adminUserId, orderId: c.orderId, reason: note || "BLOCK_COMMISSION" });
  } else {
    if (c.orderId) {
      db.prepare("UPDATE commission_holds SET status = 'RELEASED', updatedAt = ? WHERE orderId = ? AND status IN ('PENDING_REVIEW','BLOCKED')").run(
        now,
        c.orderId
      );
    } else {
      db.prepare("UPDATE commission_holds SET status = 'RELEASED', updatedAt = ? WHERE orderId = ? AND affiliateUserId = ? AND status IN ('PENDING_REVIEW','BLOCKED')").run(
        now,
        c.orderId ?? "",
        c.userId
      );
    }
    audit("COMMISSION_RELEASED", { userId: c.userId, relatedUserId: adminUserId, orderId: c.orderId, reason: note || "UNBLOCK_COMMISSION" });
  }
  const updated = getCase(caseId);
  if (!updated) throw new Error("CASE_NOT_FOUND");
  return updated;
}

export interface CommissionHold {
  id: string;
  orderId: string;
  affiliateUserId: string;
  level: number;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export function listHolds(status?: string, limit = 200): CommissionHold[] {
  const db = getDb();
  if (status) {
    return db.prepare("SELECT * FROM commission_holds WHERE status = ? ORDER BY updatedAt DESC LIMIT ?").all(status, limit) as unknown as CommissionHold[];
  }
  return db.prepare("SELECT * FROM commission_holds ORDER BY updatedAt DESC LIMIT ?").all(limit) as unknown as CommissionHold[];
}

export function getAudit(filters: { userId?: string; orderId?: string; event?: string; limit?: number } = {}): { id: string; event: string; userId: string | null; relatedUserId: string | null; orderId: string | null; reason: string; riskScore: number | null; metadata: string; createdAt: string }[] {
  const db = getDb();
  const conds: string[] = [];
  const params: (string | number)[] = [];
  if (filters.userId) {
    conds.push("(userId = ? OR relatedUserId = ?)");
    params.push(filters.userId, filters.userId);
  }
  if (filters.orderId) {
    conds.push("orderId = ?");
    params.push(filters.orderId);
  }
  if (filters.event) {
    conds.push("event = ?");
    params.push(filters.event);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(" AND ")}` : "";
  return db.prepare(`SELECT * FROM fraud_audit_logs ${where} ORDER BY createdAt DESC LIMIT ?`).all(...params, filters.limit ?? 200) as {
    id: string; event: string; userId: string | null; relatedUserId: string | null; orderId: string | null; reason: string; riskScore: number | null; metadata: string; createdAt: string;
  }[];
}
