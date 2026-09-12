// ============================================
// PURCHASE - Order/Payment/Entitlement en DB
// ============================================
// Reemplaza localStorage/JSON para datos críticos de compra. Relaciones:
//   User → Order → Payment (1:1) ; User+Product → Entitlement (UNIQUE).
// La confirmación de pago es UNA transacción SQLite: o pasa todo
// (Payment+Order PAID, tx reclamada, Entitlement) o nada (ROLLBACK).

import { randomBytes } from "node:crypto";
import { getDb } from "./database";

export type DbOrderStatus = "PENDING" | "VERIFYING" | "PAID" | "EXPIRED" | "FAILED" | "CANCELLED" | "REVIEW_REQUIRED";
export type DbPaymentStatus = "PENDING" | "VERIFYING" | "CONFIRMED" | "FAILED" | "EXPIRED";
export type DbEntitlementStatus = "ACTIVE" | "REVOKED";

export interface DbOrder {
  id: string;
  userId: string;
  productId: string;
  /** Creador del producto (fijado al crear, inmutable). Null = desconocido (legado). */
  creatorId: string | null;
  /** 'product' | 'license'. Las licencias no pasan por comisiones de afiliados. */
  orderType: string;
  baseAmount: number;
  paymentAmount: number;
  currency: string;
  network: string;
  expectedRecipient: string;
  status: DbOrderStatus;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  updatedAt: string;
  isDev: boolean;
}

export interface DbPayment {
  id: string;
  orderId: string;
  network: string;
  tokenContract: string;
  recipient: string;
  sender: string | null;
  amount: number;
  currency: string;
  txHash: string | null;
  blockNumber: number | null;
  confirmations: number;
  status: DbPaymentStatus;
  detectedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDev: boolean;
}

export interface DbEntitlement {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  status: DbEntitlementStatus;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}

const ACTIVE_ORDER = "status IN ('PENDING','VERIFYING')";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

interface OrderRow extends Record<string, string | number | null> {
  id: string;
  userId: string;
  productId: string;
  creatorId: string | null;
  orderType: string;
  baseAmount: number;
  paymentAmount: number;
  currency: string;
  network: string;
  expectedRecipient: string;
  status: DbOrderStatus;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  updatedAt: string;
  isDev: number;
}

interface PaymentRow extends Record<string, string | number | null> {
  id: string;
  orderId: string;
  network: string;
  tokenContract: string;
  recipient: string;
  sender: string | null;
  amount: number;
  currency: string;
  txHash: string | null;
  blockNumber: number | null;
  confirmations: number;
  status: DbPaymentStatus;
  detectedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDev: number;
}

interface EntitlementRow {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  status: DbEntitlementStatus;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}

function toOrder(r: OrderRow): DbOrder {
  return { ...r, isDev: r.isDev === 1 };
}

function toPayment(r: PaymentRow): DbPayment {
  return { ...r, isDev: r.isDev === 1 };
}

export interface CreateOrderInput {
  userId: string;
  productId: string;
  creatorId?: string | null;
  orderType?: "product" | "license";
  baseAmount: number;
  paymentAmount: number;
  currency: string;
  network: string;
  expectedRecipient: string;
  expiresAt: string;
  isDev?: boolean;
}

/**
 * Crea una orden PENDING. userId/productId/montos los fija el SERVIDOR
 * (el cliente no puede modificarlos después). Idempotente por producto:
 * si ya hay una orden activa del usuario para el producto, la devuelve.
 */
export function createOrder(input: CreateOrderInput): DbOrder {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(input.userId)) throw new Error("INVALID_USER");
  if (!input.productId.trim() || input.productId.length > 120) throw new Error("INVALID_PRODUCT");
  if (!(input.baseAmount > 0) || !Number.isFinite(input.baseAmount)) throw new Error("INVALID_AMOUNT");
  if (!(input.paymentAmount > 0) || !Number.isFinite(input.paymentAmount)) throw new Error("INVALID_AMOUNT");
  if (!/^[A-Z]{3,8}$/.test(input.currency)) throw new Error("INVALID_CURRENCY");
  if (Number.isNaN(new Date(input.expiresAt).getTime())) throw new Error("INVALID_EXPIRY");
  const db = getDb();
  const existing = db
    .prepare(`SELECT * FROM orders WHERE userId = ? AND productId = ? AND ${ACTIVE_ORDER} ORDER BY createdAt DESC LIMIT 1`)
    .get(input.userId, input.productId.trim()) as OrderRow | undefined;
  if (existing) return toOrder(existing);
  const now = nowIso();
  const cleanCreator = typeof input.creatorId === "string" && input.creatorId.trim() ? input.creatorId.trim().slice(0, 64) : null;
  const orderType = input.orderType === "license" ? "license" : "product";
  const row: OrderRow = {
    id: uid("ord"),
    userId: input.userId,
    productId: input.productId.trim(),
    creatorId: cleanCreator,
    orderType,
    baseAmount: input.baseAmount,
    paymentAmount: input.paymentAmount,
    currency: input.currency,
    network: input.network,
    expectedRecipient: input.expectedRecipient.toLowerCase(),
    status: "PENDING",
    createdAt: now,
    expiresAt: input.expiresAt,
    paidAt: null,
    updatedAt: now,
    isDev: input.isDev ? 1 : 0,
  };
  db.prepare(
    `INSERT INTO orders (id, userId, productId, creatorId, orderType, baseAmount, paymentAmount, currency, network,
     expectedRecipient, status, createdAt, expiresAt, paidAt, updatedAt, isDev)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id, row.userId, row.productId, row.creatorId, row.orderType, row.baseAmount, row.paymentAmount, row.currency,
    row.network, row.expectedRecipient, row.status, row.createdAt, row.expiresAt,
    row.paidAt, row.updatedAt, row.isDev
  );
  return toOrder(row);
}

/** Anti-IDOR: null si la orden no existe o no pertenece al usuario. */
export function getOrderForUser(orderId: string, userId: string): DbOrder | null {
  const row = getDb().prepare("SELECT * FROM orders WHERE id = ? AND userId = ?").get(orderId, userId) as OrderRow | undefined;
  return row ? toOrder(row) : null;
}

export function getOrderById(orderId: string): DbOrder | null {
  const row = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as OrderRow | undefined;
  return row ? toOrder(row) : null;
}

export function listOrdersByUser(userId: string): DbOrder[] {
  const rows = getDb().prepare("SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC").all(userId) as OrderRow[];
  return rows.map(toOrder);
}

const ALLOWED_TRANSITIONS: Record<DbOrderStatus, DbOrderStatus[]> = {
  PENDING: ["VERIFYING", "PAID", "EXPIRED", "FAILED", "CANCELLED", "REVIEW_REQUIRED"],
  VERIFYING: ["PAID", "EXPIRED", "FAILED", "REVIEW_REQUIRED"],
  REVIEW_REQUIRED: ["PAID", "FAILED", "CANCELLED", "EXPIRED"],
  PAID: [],
  EXPIRED: [],
  FAILED: [],
  CANCELLED: [],
};

export function setOrderStatus(orderId: string, status: DbOrderStatus): boolean {
  const db = getDb();
  const current = db.prepare("SELECT status FROM orders WHERE id = ?").get(orderId) as { status: DbOrderStatus } | undefined;
  if (!current) return false;
  if (current.status === status) return true;
  if (!ALLOWED_TRANSITIONS[current.status].includes(status)) return false;
  const now = nowIso();
  const info = db.prepare("UPDATE orders SET status = ?, updatedAt = ?, paidAt = CASE WHEN ? = 'PAID' THEN ? ELSE paidAt END WHERE id = ?").run(status, now, status, now, orderId);
  return info.changes === 1;
}

export function markOrdersExpired(now: number = Date.now()): string[] {
  const db = getDb();
  const rows = db.prepare(`SELECT id FROM orders WHERE ${ACTIVE_ORDER} AND expiresAt <= ?`).all(new Date(now).toISOString()) as { id: string }[];
  for (const r of rows) setOrderStatus(r.id, "EXPIRED");
  return rows.map((r) => r.id);
}

export function getPaymentByOrder(orderId: string): DbPayment | null {
  const row = getDb().prepare("SELECT * FROM payments WHERE orderId = ?").get(orderId) as PaymentRow | undefined;
  return row ? toPayment(row) : null;
}

export function getPaymentByTx(txHash: string): DbPayment | null {
  const row = getDb().prepare("SELECT * FROM payments WHERE txHash = ?").get(txHash.toLowerCase()) as PaymentRow | undefined;
  return row ? toPayment(row) : null;
}

/** Fila de pago PENDING para la orden (se crea una sola vez por orden). */
export function ensurePaymentPending(order: DbOrder): DbPayment {
  const db = getDb();
  const existing = getPaymentByOrder(order.id);
  if (existing) return existing;
  const now = nowIso();
  const row: PaymentRow = {
    id: uid("pay"),
    orderId: order.id,
    network: order.network,
    tokenContract: "",
    recipient: order.expectedRecipient,
    sender: null,
    amount: order.paymentAmount,
    currency: order.currency,
    txHash: null,
    blockNumber: null,
    confirmations: 0,
    status: "PENDING",
    detectedAt: null,
    confirmedAt: null,
    createdAt: now,
    updatedAt: now,
    isDev: order.isDev ? 1 : 0,
  };
  db.prepare(
    `INSERT INTO payments (id, orderId, network, tokenContract, recipient, sender, amount, currency,
     txHash, blockNumber, confirmations, status, detectedAt, confirmedAt, createdAt, updatedAt, isDev)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id, row.orderId, row.network, row.tokenContract, row.recipient, row.sender, row.amount,
    row.currency, row.txHash, row.blockNumber, row.confirmations, row.status, row.detectedAt,
    row.confirmedAt, row.createdAt, row.updatedAt, row.isDev
  );
  return toPayment(row);
}

export interface ConfirmPaymentInput {
  orderId: string;
  txHash: string;
  blockNumber: number;
  confirmations: number;
  sender: string;
  tokenContract: string;
  recipient: string;
  amount: number;
  currency: string;
  /** Solo tests: lanza tras marcar el pago para verificar ROLLBACK. */
  _failAfter?: "payment";
}

export interface ConfirmPaymentResult {
  order: DbOrder;
  payment: DbPayment;
  entitlement: DbEntitlement;
  created: boolean;
}

export class PaymentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Confirmación ATÓMICA (BEGIN/COMMIT real de SQLite):
 * 1) orden existe y está confirmable 2) tx no usada por otra orden
 * 3) payment PAID 4) order PAID 5) entitlement idempotente.
 * Idempotente: repetir con la misma tx devuelve lo existente (created:false).
 * Cualquier fallo → ROLLBACK (sin pago a medias, sin acceso a medias).
 */
export function confirmPaymentTx(input: ConfirmPaymentInput): ConfirmPaymentResult {
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) throw new PaymentError("INVALID_TX_HASH", "Hash inválido");
  const db = getDb();
  // node:sqlite no expone helper transaction(): BEGIN/COMMIT explícitos.
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = confirmInner(db, input);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // rollback best-effort; se propaga el error original
    }
    throw err;
  }
}

function confirmInner(
  db: ReturnType<typeof getDb>,
  input: ConfirmPaymentInput
): ConfirmPaymentResult {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(input.orderId) as OrderRow | undefined;
    if (!order) throw new PaymentError("ORDER_NOT_FOUND", "Orden inexistente");
    if (order.status === "PAID") {
      const payment = db.prepare("SELECT * FROM payments WHERE orderId = ?").get(order.id) as PaymentRow;
      const entitlement = db.prepare("SELECT * FROM entitlements WHERE orderId = ?").get(order.id) as unknown as EntitlementRow;
      return { order: toOrder(order), payment: toPayment(payment), entitlement, created: false };
    }
    if (order.status !== "PENDING" && order.status !== "VERIFYING" && order.status !== "REVIEW_REQUIRED") {
      throw new PaymentError("ORDER_NOT_CONFIRMABLE", `Orden en estado ${order.status}`);
    }
    const other = db.prepare("SELECT orderId FROM payments WHERE txHash = ?").get(input.txHash.toLowerCase()) as { orderId: string } | undefined;
    if (other && other.orderId !== order.id) {
      throw new PaymentError("TX_ALREADY_USED", "La transacción ya pagó otra orden");
    }
    const now = nowIso();
    let payment = db.prepare("SELECT * FROM payments WHERE orderId = ?").get(order.id) as PaymentRow | undefined;
    if (!payment) {
      const id = uid("pay");
      db.prepare(
        `INSERT INTO payments (id, orderId, network, tokenContract, recipient, sender, amount, currency,
         txHash, blockNumber, confirmations, status, detectedAt, confirmedAt, createdAt, updatedAt, isDev)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)`
      ).run(
        id, order.id, order.network, input.tokenContract.toLowerCase(), input.recipient.toLowerCase(),
        input.sender.toLowerCase(), input.amount, input.currency, input.txHash.toLowerCase(),
        input.blockNumber, input.confirmations, now, now, now, now, order.isDev
      );
      payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(id) as PaymentRow;
    } else if (payment.status === "CONFIRMED" && payment.txHash === input.txHash.toLowerCase()) {
      // Reintento del mismo evento: idempotente.
    } else if (payment.status === "CONFIRMED") {
      throw new PaymentError("PAYMENT_MISMATCH", "La orden ya tiene otro pago confirmado");
    } else {
      db.prepare(
        `UPDATE payments SET txHash = ?, blockNumber = ?, confirmations = ?, sender = ?,
         tokenContract = ?, recipient = ?, amount = ?, currency = ?, status = 'CONFIRMED',
         confirmedAt = ?, updatedAt = ? WHERE id = ?`
      ).run(
        input.txHash.toLowerCase(), input.blockNumber, input.confirmations, input.sender.toLowerCase(),
        input.tokenContract.toLowerCase(), input.recipient.toLowerCase(), input.amount, input.currency,
        now, now, payment.id
      );
      payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(payment.id) as PaymentRow;
    }

    if (input._failAfter === "payment") {
      throw new PaymentError("INJECTED_FAILURE", "Fallo inyectado para test de rollback");
    }

    db.prepare("UPDATE orders SET status = 'PAID', paidAt = ?, updatedAt = ? WHERE id = ?").run(now, now, order.id);

    const existingEnt = db.prepare("SELECT * FROM entitlements WHERE userId = ? AND productId = ?").get(order.userId, order.productId) as unknown as EntitlementRow | undefined;
    let entitlement: EntitlementRow;
    if (existingEnt) {
      entitlement = existingEnt;
    } else {
      const eid = uid("ent");
      db.prepare(
        `INSERT INTO entitlements (id, userId, productId, orderId, status, grantedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`
      ).run(eid, order.userId, order.productId, order.id, now, now, now);
      entitlement = db.prepare("SELECT * FROM entitlements WHERE id = ?").get(eid) as unknown as EntitlementRow;
    }
    const updatedOrder = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id) as OrderRow;
    return { order: toOrder(updatedOrder), payment: toPayment(payment), entitlement, created: true };
}

/** Solo productos del usuario autenticado (base de GET /api/my-products). */
export function listEntitlementsByUser(userId: string): DbEntitlement[] {
  const rows = getDb().prepare("SELECT * FROM entitlements WHERE userId = ? AND status = 'ACTIVE' ORDER BY grantedAt DESC").all(userId) as unknown as EntitlementRow[];
  return rows;
}

/** Decisión de acceso server-side. El cliente nunca decide. */
export function hasAccess(userId: string, productId: string): boolean {
  const row = getDb()
    .prepare("SELECT id FROM entitlements WHERE userId = ? AND productId = ? AND status = 'ACTIVE'")
    .get(userId, productId) as { id: string } | undefined;
  return Boolean(row);
}
