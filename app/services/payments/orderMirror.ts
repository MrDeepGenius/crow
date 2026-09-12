// ============================================
// ORDER MIRROR - espejo server de órdenes (dev, archivo)
// ============================================
// Las órdenes viven en localStorage (local-first). Para que el monitor
// server-side pueda asociar transferencias sin depender del navegador,
// el checkout registra aquí un espejo mínimo (best-effort, idempotente).
// La verdad del PAGO la decide el monitor + BSC_PAYMENT_SERVICE on-chain;
// este espejo solo aporta candidatos (orderId, buyerId, monto, expiración).
// PROD REQUIERE DB (igual que registry.ts).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type MirrorStatus =
  | "PENDING"
  | "VERIFYING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED"
  | "REVIEW_REQUIRED";

export interface MirroredOrder {
  orderId: string;
  buyerId: string;
  productId: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  /** Bloque BSC visto al registrar (hint para no perder pagos previos al checkpoint). */
  fromBlock: number | null;
  status: MirrorStatus;
  txHash: string | null;
  blockNumber: number | null;
  updatedAt: string;
}

export interface OrderMirrorData {
  orders: Record<string, MirroredOrder>;
}

const EMPTY: OrderMirrorData = { orders: {} };

export function loadOrderMirror(path: string): OrderMirrorData {
  try {
    if (!existsSync(path)) return structuredClone(EMPTY);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<OrderMirrorData>;
    return { orders: parsed.orders ?? {} };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveOrderMirror(path: string, data: OrderMirrorData): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export interface RegisterOrderInput {
  orderId: string;
  buyerId: string;
  productId: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  fromBlock: number | null;
}

function valid(input: RegisterOrderInput): boolean {
  if (!/^[A-Za-z0-9-]{4,64}$/.test(input.orderId)) return false;
  if (!input.buyerId.trim() || input.buyerId.trim().length > 120) return false;
  if (!input.productId.trim() || input.productId.trim().length > 120) return false;
  if (!(input.amount > 0) || !Number.isFinite(input.amount)) return false;
  if (!input.currency.trim()) return false;
  if (Number.isNaN(new Date(input.createdAt).getTime())) return false;
  if (Number.isNaN(new Date(input.expiresAt).getTime())) return false;
  return true;
}

/**
 * Registra/actualiza el espejo. Idempotente: el mismo orderId nunca se duplica;
 * un espejo PAID jamás retrocede (el pago ya ocurrió).
 */
export function registerMirroredOrder(path: string, input: RegisterOrderInput): MirroredOrder | null {
  if (!valid(input)) return null;
  const data = loadOrderMirror(path);
  const existing = data.orders[input.orderId];
  if (existing) {
    if (existing.status === "PAID") return existing;
    const next: MirroredOrder = {
      ...existing,
      buyerId: input.buyerId.trim(),
      productId: input.productId.trim(),
      amount: input.amount,
      currency: input.currency.trim().slice(0, 8).toUpperCase(),
      expiresAt: input.expiresAt,
      fromBlock: input.fromBlock ?? existing.fromBlock,
      status: existing.status === "EXPIRED" ? "PENDING" : existing.status,
      updatedAt: new Date().toISOString(),
    };
    data.orders[input.orderId] = next;
    saveOrderMirror(path, data);
    return next;
  }
  const created: MirroredOrder = {
    orderId: input.orderId,
    buyerId: input.buyerId.trim(),
    productId: input.productId.trim(),
    amount: input.amount,
    currency: input.currency.trim().slice(0, 8).toUpperCase(),
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    fromBlock: input.fromBlock,
    status: "PENDING",
    txHash: null,
    blockNumber: null,
    updatedAt: new Date().toISOString(),
  };
  data.orders[input.orderId] = created;
  saveOrderMirror(path, data);
  return created;
}

export function getMirroredOrder(path: string, orderId: string): MirroredOrder | null {
  return loadOrderMirror(path).orders[orderId] ?? null;
}

export function listMirroredOrders(path: string): MirroredOrder[] {
  return Object.values(loadOrderMirror(path).orders);
}

export function setMirrorStatus(
  path: string,
  orderId: string,
  status: MirrorStatus,
  patch: Partial<Pick<MirroredOrder, "txHash" | "blockNumber">> = {}
): boolean {
  const data = loadOrderMirror(path);
  const existing = data.orders[orderId];
  if (!existing) return false;
  if (existing.status === "PAID" && status !== "PAID") return false;
  data.orders[orderId] = {
    ...existing,
    status,
    txHash: patch.txHash !== undefined ? patch.txHash : existing.txHash,
    blockNumber: patch.blockNumber !== undefined ? patch.blockNumber : existing.blockNumber,
    updatedAt: new Date().toISOString(),
  };
  saveOrderMirror(path, data);
  return true;
}

/** Barrido de expiración del espejo (no toca órdenes con sighting pago). */
export function markMirrorExpired(path: string, now: number = Date.now()): string[] {
  const data = loadOrderMirror(path);
  const expired: string[] = [];
  for (const order of Object.values(data.orders)) {
    if (
      (order.status === "PENDING" || order.status === "VERIFYING") &&
      new Date(order.expiresAt).getTime() <= now
    ) {
      order.status = "EXPIRED";
      order.updatedAt = new Date().toISOString();
      expired.push(order.orderId);
    }
  }
  if (expired.length > 0) saveOrderMirror(path, data);
  return expired;
}
