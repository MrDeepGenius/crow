// ============================================
// ORDERS STORE - Fase 3 (checkout honesto)
// ============================================
// Crea órdenes PENDING reales. NO existe proveedor de pago conectado:
// ninguna orden puede pasar a PAID desde el frontend (ver seguridad).
// Entitlements/cargos reales llegan en Fase 5+ con backend + pagos.

import type { Money, Order, OrderStatus } from "./marketTypes";
import { getPlatformConfig, uid } from "./marketStore";
import type { StorageLike } from "./marketStore";

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (k) => (memory.has(k) ? memory.get(k) as string : null),
  setItem: (k, v) => {
    memory.set(k, v);
  },
  removeItem: (k) => {
    memory.delete(k);
  },
};

const ORDERS_KEY = "crow_market_orders";

function resolveStorage(override?: StorageLike): StorageLike {
  return override ?? browserStorage() ?? memoryStorage;
}

function readOrders(s: StorageLike): Order[] {
  try {
    const raw = s.getItem(ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function listOrders(storage?: StorageLike): Order[] {
  return readOrders(resolveStorage(storage));
}

export function getOrder(id: string, storage?: StorageLike): Order | null {
  return listOrders(storage).find((o) => o.id === id) ?? null;
}

export const ORDER_TTL_MINUTES = 30;

export interface CreateOrderInput {
  buyerId: string;
  productId: string;
  creatorId: string;
  affiliateId?: string | null;
  amount: Money;
  affiliatePercent: number;
  ttlMinutes?: number;
}

/** Crea una orden PENDING con comisiones congeladas (nunca recalculadas). */
export function createOrder(input: CreateOrderInput, storage?: StorageLike): Order {
  const s = resolveStorage(storage);
  const config = getPlatformConfig(s);
  const platformFee: Money = {
    amount: round2((input.amount.amount * config.platformFeePercent) / 100),
    currency: input.amount.currency,
  };
  const hasAffiliate = !!input.affiliateId;
  const affiliateCommission: Money = {
    amount: hasAffiliate ? round2((input.amount.amount * config.affiliateCommissionPercent) / 100) : 0,
    currency: input.amount.currency,
  };
  const creatorPct = hasAffiliate ? config.creatorShareAffiliatedPercent : config.creatorShareDirectPercent;
  const now = Date.now();
  const order: Order = {
    id: uid("ord"),
    buyerId: input.buyerId,
    productId: input.productId,
    creatorId: input.creatorId,
    affiliateId: input.affiliateId ?? null,
    amount: input.amount,
    platformFee,
    affiliateCommission,
    creatorShare: { amount: round2((input.amount.amount * creatorPct) / 100), currency: input.amount.currency },
    status: "PENDING",
    paymentProvider: "not_connected",
    paymentReference: null,
    network: "BSC",
    expectedRecipient: null,
    txHash: null,
    blockNumber: null,
    expiresAt: new Date(now + (input.ttlMinutes ?? ORDER_TTL_MINUTES) * 60000).toISOString(),
    createdAt: new Date(now).toISOString(),
    paidAt: null,
    refundedAt: null,
  };
  const all = readOrders(s);
  try {
    s.setItem(ORDERS_KEY, JSON.stringify([...all, order]));
  } catch {
    // no bloquea
  }
  return order;
}

export function setOrderStatus(
  id: string,
  status: OrderStatus,
  actor: "system" | "admin",
  storage?: StorageLike
): boolean {
  // Solo sistema/admin (nunca frontend de comprador) pueden mover estados.
  if (actor !== "system" && actor !== "admin") return false;
  const s = resolveStorage(storage);
  const all = readOrders(s);
  const order = all.find((o) => o.id === id);
  if (!order) return false;
  const allowed =
    (order.status === "PENDING" && (status === "VERIFYING" || status === "FAILED" || status === "CANCELLED" || status === "EXPIRED" || status === "REVIEW_REQUIRED")) ||
    (order.status === "VERIFYING" && (status === "PAID" || status === "FAILED" || status === "EXPIRED" || status === "REVIEW_REQUIRED")) ||
    (order.status === "PENDING" && status === "PAID") ||
    (order.status === "REVIEW_REQUIRED" && (status === "PAID" || status === "FAILED" || status === "CANCELLED" || status === "EXPIRED")) ||
    (order.status === "PAID" && status === "REFUNDED");
  if (!allowed) return false;
  order.status = status;
  if (status === "PAID") order.paidAt = new Date().toISOString();
  if (status === "REFUNDED") order.refundedAt = new Date().toISOString();
  try {
    s.setItem(ORDERS_KEY, JSON.stringify(all));
  } catch {
    return false;
  }
  return true;
}

/**
 * Marca PAID con referencia de pago on-chain. Solo debe llamarse con una
 * confirmación válida del backend (nunca por decisión del frontend).
 * Idempotente: si ya está PAID con el mismo txHash, retorna true sin duplicar.
 */
export function markPaidWithTx(
  id: string,
  txHash: string,
  blockNumber?: number,
  storage?: StorageLike
): boolean {
  const s = resolveStorage(storage);
  const all = readOrders(s);
  const order = all.find((o) => o.id === id);
  if (!order) return false;
  const normalized = txHash.toLowerCase();
  if (order.status === "PAID") {
    return order.paymentReference === normalized || order.txHash === normalized;
  }
  if (
    order.status !== "VERIFYING" &&
    order.status !== "PENDING" &&
    order.status !== "REVIEW_REQUIRED"
  )
    return false;
  order.status = "PAID";
  order.paymentProvider = "usdt-bep20";
  order.paymentReference = normalized;
  order.txHash = normalized;
  if (typeof blockNumber === "number" && Number.isFinite(blockNumber)) {
    order.blockNumber = blockNumber;
  }
  order.network = order.network ?? "BSC";
  order.paidAt = new Date().toISOString();
  try {
    s.setItem(ORDERS_KEY, JSON.stringify(all));
  } catch {
    return false;
  }
  return true;
}

/**
 * Marca REVIEW_REQUIRED cuando la TX existe pero no coincide con la orden
 * (monto, recipient, token, etc). Requiere revisión manual excepcional.
 * Nunca marca PAID.
 */
export function markReviewRequired(
  id: string,
  txHash: string,
  storage?: StorageLike
): boolean {
  const s = resolveStorage(storage);
  const all = readOrders(s);
  const order = all.find((o) => o.id === id);
  if (!order) return false;
  if (order.status !== "PENDING" && order.status !== "VERIFYING") return false;
  order.status = "REVIEW_REQUIRED";
  order.txHash = txHash.toLowerCase();
  try {
    s.setItem(ORDERS_KEY, JSON.stringify(all));
  } catch {
    return false;
  }
  return true;
}

function isExpired(order: Order, now: number): boolean {
  return !!order.expiresAt && new Date(order.expiresAt).getTime() <= now;
}

/** Barrido de expiración (actor sistema). PENDING/VERIFYING vencidas → EXPIRED. */
export function markExpiredOrders(now: number = Date.now(), storage?: StorageLike): string[] {
  const s = resolveStorage(storage);
  const all = readOrders(s);
  const expired: string[] = [];
  for (const order of all) {
    if ((order.status === "PENDING" || order.status === "VERIFYING") && isExpired(order, now)) {
      order.status = "EXPIRED";
      expired.push(order.id);
    }
  }
  if (expired.length > 0) {
    try {
      s.setItem(ORDERS_KEY, JSON.stringify(all));
    } catch {
      // no bloquea
    }
  }
  return expired;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
