// ============================================
// VOLUME ENGINE - CP por volumen de ventas VÁLIDAS (server-side)
// ============================================
// Flujo: orden PAID + antifraud limpio + sin duplicados + sin autoconsumo
// → CP = floor(FINAL_PAID_AMOUNT). 1 USDT = 1 CP. CP no es dinero.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";
import { getRiskProfile } from "../fraud/antifraud";
import { reachedTiers } from "./tiers";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class VolumeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface VolumeResult {
  orderId: string;
  userId: string;
  cp: number;
  totalCp: number;
  created: boolean;
  unlockedLevels: number[];
}

interface OrderRow {
  id: string;
  userId: string;
  paymentAmount: number;
  status: string;
}

/** ¿El comprador se pagó a sí mismo vía su propia cadena? (ledger de comisiones). */
function isSelfPurchase(orderId: string, buyerId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 AS hit FROM commission_ledger WHERE orderId = ? AND affiliateUserId = ? LIMIT 1"
    )
    .get(orderId, buyerId) as { hit: number } | undefined;
  return Boolean(row);
}

/**
 * Registra volumen válido. Idempotente por orderId (UNIQUE).
 * Lanza VolumeError si la venta no califica (0 CP definitivo, sin reintentos útiles).
 */
export function addValidSaleVolume(input: { userId: string; orderId: string }): VolumeResult {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, paymentAmount, status FROM orders WHERE id = ?").get(input.orderId) as
    | OrderRow
    | undefined;
  if (!order) throw new VolumeError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== input.userId) throw new VolumeError("OWNERSHIP", "La orden no es del usuario");
  if (order.status !== "PAID") throw new VolumeError("ORDER_NOT_PAID", "Solo ventas pagadas generan CP");

  const existing = db.prepare("SELECT orderId, cp FROM volume_events WHERE orderId = ? AND kind = 'C'").get(order.id) as
    | { orderId: string; cp: number }
    | undefined;
  if (existing) {
    return { orderId: order.id, userId: order.userId, cp: existing.cp, totalCp: getTotalCp(order.userId), created: false, unlockedLevels: [] };
  }

  const risk = getRiskProfile(order.userId);
  if (risk.riskStatus === "BLOCKED" || risk.riskStatus === "REVIEW_REQUIRED") {
    throw new VolumeError("FRAUD_BLOCKED", "Venta bloqueada por antifraude");
  }
  if (isSelfPurchase(order.id, order.userId)) {
    throw new VolumeError("SELF_PURCHASE", "Autoconsumo no genera CP");
  }

  const cp = Math.floor(order.paymentAmount);
  if (cp <= 0) throw new VolumeError("ZERO_VOLUME", "Sin volumen computable");
  const now = nowIso();

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO volume_events (orderId, userId, cp, kind, createdAt, reversedAt) VALUES (?, ?, ?, 'C', ?, NULL)").run(
      order.id,
      order.userId,
      cp,
      now
    );
    db.prepare(
      "INSERT INTO user_volume (userId, totalCp, updatedAt) VALUES (?, ?, ?) ON CONFLICT(userId) DO UPDATE SET totalCp = totalCp + excluded.totalCp, updatedAt = excluded.updatedAt"
    ).run(order.userId, cp, now);
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // best-effort
    }
    // Carrera: otro worker la registró primero → idempotente.
    const raced = db.prepare("SELECT orderId FROM volume_events WHERE orderId = ?").get(order.id) as { orderId: string } | undefined;
    if (raced) {
      return { orderId: order.id, userId: order.userId, cp, totalCp: getTotalCp(order.userId), created: false, unlockedLevels: [] };
    }
    throw err;
  }

  const totalCp = getTotalCp(order.userId);
  const unlockedLevels = unlockReachedTiers(order.userId, totalCp);
  return { orderId: order.id, userId: order.userId, cp, totalCp, created: true, unlockedLevels };
}

export function getTotalCp(userId: string): number {
  const row = getDb().prepare("SELECT totalCp FROM user_volume WHERE userId = ?").get(userId) as { totalCp: number } | undefined;
  return row?.totalCp ?? 0;
}

/** Crea rewards UNLOCKED para hitos alcanzados sin fila (UNIQUE userId+level). */
export function unlockReachedTiers(userId: string, totalCp: number): number[] {
  const db = getDb();
  const created: number[] = [];
  const now = nowIso();
  for (const tier of reachedTiers(totalCp)) {
    const res = db
      .prepare(
        "INSERT INTO rewards (id, userId, level, cpRequired, amount, status, paymentRef, createdAt, updatedAt, claimedAt, paidAt) VALUES (?, ?, ?, ?, ?, 'UNLOCKED', NULL, ?, ?, NULL, NULL) ON CONFLICT(userId, level) DO NOTHING"
      )
      .run(uid("rw"), userId, tier.level, tier.cpRequired, tier.amount, now, now);
    if (res.changes === 1) created.push(tier.level);
  }
  return created;
}

/**
 * Revierte volumen de una venta (evento compensatorio, sin borrar historial).
 * El total nunca queda negativo (CHECK + validación previa).
 */
export function reverseVolume(orderId: string, reason: string): { reversedCp: number; totalCp: number } {
  const db = getDb();
  const ev = db.prepare("SELECT orderId, userId, cp FROM volume_events WHERE orderId = ? AND kind = 'C'").get(orderId) as
    | { orderId: string; userId: string; cp: number }
    | undefined;
  if (!ev) throw new VolumeError("NO_VOLUME", "Sin volumen para revertir");
  const already = db.prepare("SELECT orderId FROM volume_events WHERE orderId = ? AND kind = 'V'").get(orderId) as
    | { orderId: string }
    | undefined;
  if (already) return { reversedCp: 0, totalCp: getTotalCp(ev.userId) };
  const total = getTotalCp(ev.userId);
  if (total - ev.cp < 0) throw new VolumeError("NEGATIVE_TOTAL", "La reversión dejaría el total negativo");
  const now = nowIso();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE volume_events SET reversedAt = ? WHERE orderId = ? AND kind = 'C'").run(now, orderId);
    db.prepare("INSERT INTO volume_events (orderId, userId, cp, kind, createdAt, reversedAt) VALUES (?, ?, ?, 'V', ?, ?)").run(
      orderId,
      ev.userId,
      -ev.cp,
      now,
      reason.slice(0, 200)
    );
    db.prepare("UPDATE user_volume SET totalCp = totalCp - ?, updatedAt = ? WHERE userId = ?").run(ev.cp, now, ev.userId);
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // best-effort
    }
    throw err;
  }
  return { reversedCp: ev.cp, totalCp: getTotalCp(ev.userId) };
}
