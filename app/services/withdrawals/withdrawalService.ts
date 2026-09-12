// ============================================
// WITHDRAWAL SERVICE - retiros manuales USDT BEP20
// ============================================
// Toda la lógica económica es server-side. El frontend nunca calcula
// comisiones ni manipula saldos. Usa commission_ledger de SQLite como
// fuente de verdad para el balance disponible.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";
import { WithdrawalProvider, ManualWithdrawalProvider } from "./withdrawalProvider";

// ============================================
// CONSTANTES
// ============================================

export const MIN_WITHDRAWAL = 25; // USDT
export const FIRST_WITHDRAWAL_FEE = 2; // %
export const SUBSEQUENT_WITHDRAWAL_FEE = 3; // %
export const PERIOD_DAYS = 30;

// ============================================
// TIPOS
// ============================================

export type WithdrawalStatus = "PENDING" | "PROCESSING" | "CONFIRMED" | "REJECTED" | "FAILED";

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  walletAddress: string;
  txHash: string | null;
  status: WithdrawalStatus;
  idempotencyKey: string | null;
  periodFirst: number;
  feePercent: number;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  confirmedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
}

export interface WithdrawalBalance {
  available: number;
  reserved: number;
  netAvailable: number;
  currency: string;
}

export interface WithdrawalAuditEntry {
  id: string;
  withdrawalId: string;
  event: string;
  actor: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string;
  metadata: string;
  createdAt: string;
}

// ============================================
// HELPERS
// ============================================

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toWithdrawal(row: Record<string, unknown>): Withdrawal {
  return {
    id: row.id as string,
    userId: row.userId as string,
    amount: row.amount as number,
    fee: row.fee as number,
    net: row.net as number,
    currency: row.currency as string,
    walletAddress: row.walletAddress as string,
    txHash: (row.txHash as string) ?? null,
    status: row.status as WithdrawalStatus,
    idempotencyKey: (row.idempotencyKey as string) ?? null,
    periodFirst: row.periodFirst as number,
    feePercent: row.feePercent as number,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
    processedAt: (row.processedAt as string) ?? null,
    confirmedAt: (row.confirmedAt as string) ?? null,
    rejectedAt: (row.rejectedAt as string) ?? null,
    rejectedReason: (row.rejectedReason as string) ?? null,
  };
}

// ============================================
// AUDITORÍA
// ============================================

function audit(
  db: ReturnType<typeof getDb>,
  withdrawalId: string,
  event: string,
  actor: string,
  fromStatus: string | null,
  toStatus: string,
  reason = "",
  metadata = "{}"
): void {
  db.prepare(
    `INSERT INTO withdrawal_audit (id, withdrawalId, event, actor, fromStatus, toStatus, reason, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uid("waudit"), withdrawalId, event, actor, fromStatus, toStatus, reason.slice(0, 500), metadata, nowIso());
}

// ============================================
// BALANCE
// ============================================

/**
 * Balance disponible del usuario basado en commission_ledger.
 * available = SUM(APPROVED) para el usuario (como afiliado o creador).
 * reserved = SUM(gross amount) de retiros PENDING/PROCESSING.
 * netAvailable = available - reserved.
 */
export function getBalance(userId: string): WithdrawalBalance {
  const db = getDb();

  // Aprobados: afiliado directo + residuales + creador
  const approvedRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM commission_ledger
     WHERE (affiliateUserId = ? OR (recipientRef = ? AND account = 'CREATOR'))
       AND status = 'APPROVED'`
  ).get(userId, userId) as { total: number };

  // Reservado: retiros PENDING o PROCESSING
  const reservedRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals
     WHERE userId = ? AND status IN ('PENDING', 'PROCESSING')`
  ).get(userId) as { total: number };

  const available = round2(approvedRow.total);
  const reserved = round2(reservedRow.total);

  return {
    available,
    reserved,
    netAvailable: round2(available - reserved),
    currency: "USDT",
  };
}

// ============================================
// COMISIÓN
// ============================================

/**
 * Determina si este retiro es el primero en el período de 30 días.
 * Los retiros REJECTED/FAILED no consumen el beneficio de primera extracción.
 */
export function isFirstInPeriod(userId: string): boolean {
  const db = getDb();
  // Buscar retiros CONFIRMED en los últimos 30 días
  const cutoff = new Date(Date.now() - PERIOD_DAYS * 86400000).toISOString();
  const row = db.prepare(
    `SELECT COUNT(*) AS n FROM withdrawals
     WHERE userId = ? AND status = 'CONFIRMED' AND createdAt >= ?`
  ).get(userId, cutoff) as { n: number };

  return row.n === 0;
}

export function calculateFee(userId: string, amount: number): { fee: number; net: number; feePercent: number; isFirst: boolean } {
  const isFirst = isFirstInPeriod(userId);
  const feePercent = isFirst ? FIRST_WITHDRAWAL_FEE : SUBSEQUENT_WITHDRAWAL_FEE;
  const fee = round2((amount * feePercent) / 100);
  const net = round2(amount - fee);
  return { fee, net, feePercent, isFirst };
}

// ============================================
// SOLICITUD DE RETIRO
// ============================================

export interface RequestWithdrawalInput {
  userId: string;
  amount: number;
  walletAddress: string;
  idempotencyKey?: string;
}

export type RequestWithdrawalError =
  | "INVALID_AMOUNT"
  | "BELOW_MINIMUM"
  | "INVALID_WALLET"
  | "INSUFFICIENT_BALANCE"
  | "DUPLICATE_IDEMPOTENCY"
  | "UNAUTHENTICATED";

export function requestWithdrawal(input: RequestWithdrawalInput): {
  ok: true;
  withdrawal: Withdrawal;
} | {
  ok: false;
  error: RequestWithdrawalError;
  message: string;
} {
  const db = getDb();

  // Validar monto
  if (!input.amount || input.amount <= 0) {
    return { ok: false, error: "INVALID_AMOUNT", message: "Monto inválido." };
  }
  if (input.amount < MIN_WITHDRAWAL) {
    return { ok: false, error: "BELOW_MINIMUM", message: `El mínimo de retiro es ${MIN_WITHDRAWAL} USDT.` };
  }

  // Validar wallet BEP20
  if (!input.walletAddress || input.walletAddress.trim().length < 20) {
    return { ok: false, error: "INVALID_WALLET", message: "Wallet BEP20 inválida." };
  }

  // Idempotencia: si ya existe con esa key, devolver el existente
  if (input.idempotencyKey) {
    const existing = db.prepare("SELECT * FROM withdrawals WHERE idempotencyKey = ?").get(input.idempotencyKey) as Record<string, unknown> | undefined;
    if (existing) {
      return { ok: true, withdrawal: toWithdrawal(existing) };
    }
  }

  // Verificar saldo disponible
  const balance = getBalance(input.userId);
  if (input.amount > balance.netAvailable) {
    return { ok: false, error: "INSUFFICIENT_BALANCE", message: `Saldo insuficiente. Disponible: ${balance.netAvailable} USDT.` };
  }

  // Calcular comisión
  const { fee, net, feePercent, isFirst } = calculateFee(input.userId, input.amount);

  const id = uid("wd");
  const now = nowIso();

  db.prepare(
    `INSERT INTO withdrawals
     (id, userId, amount, fee, net, currency, walletAddress, txHash, status, idempotencyKey, periodFirst, feePercent, createdAt, updatedAt, processedAt, confirmedAt, rejectedAt, rejectedReason)
     VALUES (?, ?, ?, ?, ?, 'USDT', ?, NULL, 'PENDING', ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`
  ).run(id, input.userId, input.amount, fee, net, input.walletAddress.trim(), input.idempotencyKey ?? null, isFirst ? 1 : 0, feePercent, now, now);

  audit(db, id, "WITHDRAWAL_REQUESTED", input.userId, null, "PENDING", `Monto: ${input.amount} USDT, Fee: ${fee} USDT (${feePercent}%), Neto: ${net} USDT`);

  const withdrawal = toWithdrawal(db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as Record<string, unknown>);
  return { ok: true, withdrawal };
}

// ============================================
// ACCIONES DE ADMIN
// ============================================

export function processWithdrawal(withdrawalId: string, adminId: string): { ok: boolean; message: string } {
  const db = getDb();
  const wd = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(withdrawalId) as Record<string, unknown> | undefined;
  if (!wd) return { ok: false, message: "Retiro no encontrado." };
  if (wd.status !== "PENDING") return { ok: false, message: `El retiro no está PENDING (estado: ${wd.status}).` };

  db.prepare("UPDATE withdrawals SET status = 'PROCESSING', updatedAt = ?, processedAt = ? WHERE id = ?")
    .run(nowIso(), nowIso(), withdrawalId);
  audit(db, withdrawalId, "WITHDRAWAL_PROCESSING", adminId, "PENDING", "PROCESSING");

  return { ok: true, message: "Retiro marcado como procesando." };
}

export function confirmWithdrawal(withdrawalId: string, txHash: string, adminId: string): { ok: boolean; message: string } {
  const db = getDb();
  const wd = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(withdrawalId) as Record<string, unknown> | undefined;
  if (!wd) return { ok: false, message: "Retiro no encontrado." };
  if (wd.status !== "PROCESSING") return { ok: false, message: `El retiro no está PROCESSING (estado: ${wd.status}).` };
  if (!txHash || txHash.trim().length < 10) return { ok: false, message: "TX Hash requerido para confirmar." };

  const now = nowIso();
  db.exec("BEGIN IMMEDIATE");
  try {
    // Marcar retiro como CONFIRMED
    db.prepare("UPDATE withdrawals SET status = 'CONFIRMED', txHash = ?, updatedAt = ?, confirmedAt = ? WHERE id = ?")
      .run(txHash.trim(), now, now, withdrawalId);

    // Marcar ledger entries como PAID (hasta cubrir el monto bruto).
    // Si una entrada es mayor al remanente, se divide: la parte consumida
    // se marca PAID y el resto queda como APPROVED en una entrada nueva.
    const amount = wd.amount as number;
    const userId = wd.userId as string;
    const entries = db.prepare(
      `SELECT id, amount FROM commission_ledger
       WHERE (affiliateUserId = ? OR (recipientRef = ? AND account = 'CREATOR'))
         AND status = 'APPROVED'
       ORDER BY createdAt ASC`
    ).all(userId, userId) as { id: string; amount: number }[];

    let remaining = amount;
    for (const entry of entries) {
      if (remaining <= 0.001) break;
      if (entry.amount <= remaining + 0.001) {
        // Entrada completamente consumida
        db.prepare("UPDATE commission_ledger SET status = 'PAID' WHERE id = ?").run(entry.id);
        remaining = round2(remaining - entry.amount);
      } else {
        // Entrada parcial: dividir
        const consumed = remaining;
        const leftover = round2(entry.amount - remaining);
        db.prepare("UPDATE commission_ledger SET status = 'PAID', amount = ? WHERE id = ?").run(consumed, entry.id);
        db.prepare(
          `INSERT INTO commission_ledger (id, orderId, account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note, createdAt)
           SELECT ?, orderId, account, affiliateUserId, recipientRef, level, percentage, ?, currency, 'APPROVED', 'SPLIT_REMAINDER', createdAt
           FROM commission_ledger WHERE id = ?`
        ).run(uid("led"), leftover, entry.id);
        remaining = 0;
      }
    }

    db.exec("COMMIT");
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch { /* best-effort */ }
    throw err;
  }

  const fee = wd.fee as number;
  audit(db, withdrawalId, "WITHDRAWAL_CONFIRMED", adminId, "PROCESSING", "CONFIRMED", `TX Hash: ${txHash.trim()}`, JSON.stringify({ feeRevenue: fee }));

  return { ok: true, message: "Retiro confirmado." };
}

export function rejectWithdrawal(withdrawalId: string, reason: string, adminId: string): { ok: boolean; message: string } {
  const db = getDb();
  const wd = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(withdrawalId) as Record<string, unknown> | undefined;
  if (!wd) return { ok: false, message: "Retiro no encontrado." };
  const status = wd.status as string;
  if (status !== "PENDING" && status !== "PROCESSING") {
    return { ok: false, message: `El retiro no se puede rechazar (estado: ${status}).` };
  }

  // Rechazado: libera el saldo reservado (no consume el beneficio de primera extracción)
  db.prepare("UPDATE withdrawals SET status = 'REJECTED', rejectedReason = ?, updatedAt = ?, rejectedAt = ? WHERE id = ?")
    .run(reason.slice(0, 500), nowIso(), nowIso(), withdrawalId);
  audit(db, withdrawalId, "WITHDRAWAL_REJECTED", adminId, status, "REJECTED", reason);

  return { ok: true, message: "Retiro rechazado. Saldo liberado." };
}

export function failWithdrawal(withdrawalId: string, reason: string, adminId: string): { ok: boolean; message: string } {
  const db = getDb();
  const wd = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(withdrawalId) as Record<string, unknown> | undefined;
  if (!wd) return { ok: false, message: "Retiro no encontrado." };
  if (wd.status !== "PROCESSING") return { ok: false, message: `El retiro no está PROCESSING (estado: ${wd.status}).` };

  // Fallido: libera el saldo reservado (no consume el beneficio de primera extracción)
  db.prepare("UPDATE withdrawals SET status = 'FAILED', rejectedReason = ?, updatedAt = ? WHERE id = ?")
    .run(reason.slice(0, 500), nowIso(), withdrawalId);
  audit(db, withdrawalId, "WITHDRAWAL_FAILED", adminId, "PROCESSING", "FAILED", reason);

  return { ok: true, message: "Retiro marcado como fallido. Saldo liberado." };
}

// ============================================
// CONSULTAS
// ============================================

export function listWithdrawals(userId?: string): Withdrawal[] {
  const db = getDb();
  const rows = userId
    ? db.prepare("SELECT * FROM withdrawals WHERE userId = ? ORDER BY createdAt DESC").all(userId) as Record<string, unknown>[]
    : db.prepare("SELECT * FROM withdrawals ORDER BY createdAt DESC").all() as Record<string, unknown>[];
  return rows.map(toWithdrawal);
}

export function getWithdrawal(id: string): Withdrawal | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? toWithdrawal(row) : null;
}

export function getWithdrawalAudit(withdrawalId: string): WithdrawalAuditEntry[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM withdrawal_audit WHERE withdrawalId = ? ORDER BY createdAt ASC").all(withdrawalId) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as string,
    withdrawalId: r.withdrawalId as string,
    event: r.event as string,
    actor: r.actor as string,
    fromStatus: (r.fromStatus as string) ?? null,
    toStatus: r.toStatus as string,
    reason: (r.reason as string) ?? "",
    metadata: (r.metadata as string) ?? "{}",
    createdAt: r.createdAt as string,
  }));
}

// ============================================
// PROVIDER (para futuro automatizado)
// ============================================

let provider: WithdrawalProvider = new ManualWithdrawalProvider();

export function setWithdrawalProvider(p: WithdrawalProvider): void {
  provider = p;
}

export function getWithdrawalProvider(): WithdrawalProvider {
  return provider;
}
