// ============================================
// REWARDS POOL ENGINE - 2% de cada LICENCIA válida (server-side)
// ============================================
// Financiación EXCLUSIVA: licencias. Balance calculado (créditos - débitos -
// pagos), nunca almacenado mutable → imposible el negativo por construcción
// si cada salida valida fondos. Idempotente por (licenseOrderId, kind).

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class PoolError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PoolBalances {
  balance: number;
  totalCredits: number;
  totalDebits: number;
  totalPaid: number;
  totalReversed: number;
}

export function poolBalances(): PoolBalances {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN kind = 'CREDIT' THEN amount ELSE 0 END), 0) AS credits,
        COALESCE(SUM(CASE WHEN kind = 'DEBIT' THEN amount ELSE 0 END), 0) AS debits,
        COALESCE(SUM(CASE WHEN kind = 'REWARD_PAYMENT' THEN amount ELSE 0 END), 0) AS paid
       FROM rewards_pool_ledger`
    )
    .get() as { credits: number; debits: number; paid: number };
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  return {
    balance: round2(row.credits - row.debits - row.paid),
    totalCredits: round2(row.credits),
    totalDebits: round2(row.debits),
    totalPaid: round2(row.paid),
    totalReversed: round2(row.debits),
  };
}

/**
 * Acredita el 2% de FINAL_LICENSE_PAID_AMOUNT. Idempotente por licencia.
 * Valida que la orden sea licencia PAID del usuario (anti-IDOR por ownership).
 */
export function creditLicensePool(input: { userId: string; licenseOrderId: string }): { credited: number; created: boolean; balance: number } {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, paymentAmount, currency, status, orderType FROM orders WHERE id = ?").get(input.licenseOrderId) as
    | { id: string; userId: string; paymentAmount: number; currency: string; status: string; orderType: string }
    | undefined;
  if (!order) throw new PoolError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== input.userId) throw new PoolError("OWNERSHIP", "La orden no es del usuario");
  if (order.orderType !== "license") throw new PoolError("NOT_A_LICENSE", "Solo licencias aportan al pool");
  if (order.status !== "PAID") throw new PoolError("ORDER_NOT_PAID", "Solo licencias pagadas aportan");
  if (order.currency !== "USDT") throw new PoolError("BAD_CURRENCY", "Solo USDT");

  const existing = db.prepare("SELECT id, amount FROM rewards_pool_ledger WHERE licenseOrderId = ? AND kind = 'CREDIT'").get(order.id) as
    | { id: string; amount: number }
    | undefined;
  if (existing) return { credited: existing.amount, created: false, balance: poolBalances().balance };

  const amount = Math.round(order.paymentAmount * 0.02 * 100) / 100;
  if (amount <= 0) throw new PoolError("ZERO_AMOUNT", "Sin aporte computable");
  db.prepare("INSERT INTO rewards_pool_ledger (id, licenseOrderId, kind, amount, createdAt) VALUES (?, ?, 'CREDIT', ?, ?)").run(
    uid("pool"),
    order.id,
    amount,
    nowIso()
  );
  return { credited: amount, created: true, balance: poolBalances().balance };
}

/** Revierte exactamente lo acreditado (nunca deja el pool negativo). */
export function reverseLicenseCredit(licenseOrderId: string, reason: string): { debited: number; balance: number } {
  const db = getDb();
  const credit = db.prepare("SELECT amount FROM rewards_pool_ledger WHERE licenseOrderId = ? AND kind = 'CREDIT'").get(licenseOrderId) as
    | { amount: number }
    | undefined;
  if (!credit) throw new PoolError("NO_CREDIT", "Sin crédito para revertir");
  const existing = db.prepare("SELECT id FROM rewards_pool_ledger WHERE licenseOrderId = ? AND kind = 'DEBIT'").get(licenseOrderId) as
    | { id: string }
    | undefined;
  if (existing) return { debited: 0, balance: poolBalances().balance };
  if (poolBalances().balance - credit.amount < -0.0001) {
    throw new PoolError("INSUFFICIENT_POOL", "El pool no tiene fondos para la reversión");
  }
  db.prepare("INSERT INTO rewards_pool_ledger (id, licenseOrderId, kind, amount, createdAt) VALUES (?, ?, 'DEBIT', ?, ?)").run(
    uid("pool"),
    licenseOrderId,
    credit.amount,
    nowIso()
  );
  void reason;
  return { debited: credit.amount, balance: poolBalances().balance };
}

/** Registra un pago REAL de reward (referencia obligatoria, con fondos). */
export function registerRewardPayment(rewardId: string, paymentRef: string, userId: string): void {
  if (!paymentRef.trim()) throw new PoolError("REF_REQUIRED", "Se exige referencia de pago real");
  const db = getDb();
  const reward = db.prepare("SELECT id, userId, amount, status FROM rewards WHERE id = ?").get(rewardId) as
    | { id: string; userId: string; amount: number; status: string }
    | undefined;
  if (!reward) throw new PoolError("REWARD_NOT_FOUND", "Recompensa inexistente");
  if (reward.userId !== userId) throw new PoolError("OWNERSHIP", "Recompensa ajena");
  if (reward.status !== "CLAIMED") throw new PoolError("NOT_CLAIMED", "Solo se paga lo reclamado");
  if (poolBalances().balance < reward.amount - 0.0001) {
    throw new PoolError("INSUFFICIENT_POOL", "Sin fondos suficientes");
  }
  const now = nowIso();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE rewards SET status = 'PAID', paymentRef = ?, paidAt = ?, updatedAt = ? WHERE id = ? AND status = 'CLAIMED'").run(
      paymentRef.trim().slice(0, 200),
      now,
      now,
      rewardId
    );
    db.prepare("INSERT INTO rewards_pool_ledger (id, licenseOrderId, kind, amount, createdAt) VALUES (?, ?, 'REWARD_PAYMENT', ?, ?)").run(
      uid("pool"),
      `reward:${rewardId}`,
      reward.amount,
      now
    );
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // best-effort
    }
    throw err;
  }
}
