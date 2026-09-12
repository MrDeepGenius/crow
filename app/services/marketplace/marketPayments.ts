// ============================================
// PAYMENTS STORE - registro local de pagos
// ============================================
// Guarda el registro del pago confirmado por el backend.
// La VERDAD del pago la determina el backend (verificación on-chain);
// aquí solo se persiste su confirmación firmada.

import type { Payment, PaymentStatus } from "./marketTypes";
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

const PAYMENTS_KEY = "crow_market_payments";

function resolveStorage(override?: StorageLike): StorageLike {
  return override ?? browserStorage() ?? memoryStorage;
}

function readPayments(s: StorageLike): Payment[] {
  try {
    const raw = s.getItem(PAYMENTS_KEY);
    return raw ? (JSON.parse(raw) as Payment[]) : [];
  } catch {
    return [];
  }
}

export function savePayment(payment: Payment, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  const all = readPayments(s);
  const idx = all.findIndex((p) => p.id === payment.id);
  const next = idx >= 0 ? all.map((p) => (p.id === payment.id ? payment : p)) : [...all, payment];
  try {
    s.setItem(PAYMENTS_KEY, JSON.stringify(next));
  } catch {
    // no bloquea
  }
}

export function getPaymentByOrder(orderId: string, storage?: StorageLike): Payment | null {
  return readPayments(resolveStorage(storage)).find((p) => p.orderId === orderId) ?? null;
}

export function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  patch: Partial<Payment> = {},
  storage?: StorageLike
): boolean {
  const s = resolveStorage(storage);
  const all = readPayments(s);
  const payment = all.find((p) => p.id === id);
  if (!payment) return false;
  Object.assign(payment, patch, { status, updatedAt: new Date().toISOString() });
  try {
    s.setItem(PAYMENTS_KEY, JSON.stringify(all));
  } catch {
    return false;
  }
  return true;
}
