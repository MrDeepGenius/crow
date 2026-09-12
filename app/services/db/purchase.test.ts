// Tests de compras atómicas (DB temporal, sin tocar datos reales).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-purchase-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb } from "./database";
import { loginUser, registerUser } from "../auth/auth";
import {
  PaymentError,
  confirmPaymentTx,
  createOrder,
  getOrderForUser,
  getPaymentByTx,
  hasAccess,
  listEntitlementsByUser,
  setOrderStatus,
} from "./purchase";

const DB = process.env.DATABASE_PATH as string;
const TX_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TX_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function user(email: string): string {
  const reg = registerUser(email, "Test", "password123");
  if (!reg.ok) {
    const login = loginUser(email, "password123");
    if (!login.ok) throw new Error("setup de usuario falló");
    return login.user.id;
  }
  return reg.user.id;
}

function orderFor(userId: string, productId = "prod-1", amount = 25) {
  return createOrder({
    userId,
    productId,
    baseAmount: amount,
    paymentAmount: amount,
    currency: "USDT",
    network: "BSC",
    expectedRecipient: "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f",
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
  });
}

function confirmInput(orderId: string, tx: string) {
  return {
    orderId,
    txHash: tx,
    blockNumber: 100,
    confirmations: 12,
    sender: "0x1111111111111111111111111111111111111111",
    tokenContract: "0x55d398326f99059fF775485246999027B3197955",
    recipient: "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f",
    amount: 25,
    currency: "USDT",
  };
}

beforeEach(() => {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
});

describe("purchase", () => {
  it("usuario autenticado crea orden y otro usuario no la ve (anti-IDOR)", () => {
    const a = user("a@t.co");
    const b = user("b@t.co");
    const order = orderFor(a);
    expect(getOrderForUser(order.id, a)?.id).toBe(order.id);
    expect(getOrderForUser(order.id, b)).toBeNull();
    // userId fijado por servidor: el input no trae userId manipulable aparte.
    expect(order.userId).toBe(a);
  });

  it("no duplica orden activa del mismo producto", () => {
    const a = user("a@t.co");
    const first = orderFor(a);
    const second = orderFor(a);
    expect(second.id).toBe(first.id);
  });

  it("payment asociado a order y txHash único", () => {
    const a = user("a@t.co");
    const b = user("b@t.co");
    const orderA = orderFor(a);
    const orderB = orderFor(b, "prod-2");
    const r = confirmPaymentTx(confirmInput(orderA.id, TX_A));
    expect(r.created).toBe(true);
    expect(r.payment.orderId).toBe(orderA.id);
    expect(getPaymentByTx(TX_A)?.orderId).toBe(orderA.id);
    expect(() => confirmPaymentTx(confirmInput(orderB.id, TX_A))).toThrowError(PaymentError);
  });

  it("pago PAID crea entitlement y repetir no duplica nada", () => {
    const a = user("a@t.co");
    const order = orderFor(a);
    const first = confirmPaymentTx(confirmInput(order.id, TX_A));
    expect(first.created).toBe(true);
    const second = confirmPaymentTx(confirmInput(order.id, TX_A));
    expect(second.created).toBe(false);
    expect(listEntitlementsByUser(a)).toHaveLength(1);
    expect(hasAccess(a, "prod-1")).toBe(true);
    expect(hasAccess(a, "prod-2")).toBe(false);
  });

  it("fallo transaccional hace rollback completo", () => {
    const a = user("a@t.co");
    const order = orderFor(a);
    expect(() =>
      confirmPaymentTx({ ...confirmInput(order.id, TX_B), _failAfter: "payment" })
    ).toThrowError(PaymentError);
    // Nada a medias: orden sigue PENDING, sin pago, sin acceso.
    expect(getOrderForUser(order.id, a)?.status).toBe("PENDING");
    expect(getPaymentByTx(TX_B)).toBeNull();
    expect(hasAccess(a, "prod-1")).toBe(false);
    // Reintentar después del fallo funciona.
    const retry = confirmPaymentTx(confirmInput(order.id, TX_B));
    expect(retry.created).toBe(true);
  });

  it("my-products devuelve solamente productos autorizados", () => {
    const a = user("a@t.co");
    const b = user("b@t.co");
    const orderA = orderFor(a, "prod-1");
    const orderB = orderFor(b, "prod-2");
    confirmPaymentTx(confirmInput(orderA.id, TX_A));
    confirmPaymentTx(confirmInput(orderB.id, TX_B));
    expect(listEntitlementsByUser(a).map((e) => e.productId)).toEqual(["prod-1"]);
    expect(listEntitlementsByUser(b).map((e) => e.productId)).toEqual(["prod-2"]);
  });

  it("transiciones de estado inválidas se rechazan", () => {
    const a = user("a@t.co");
    const order = orderFor(a);
    expect(setOrderStatus(order.id, "PAID")).toBe(true);
    expect(setOrderStatus(order.id, "PENDING")).toBe(false);
    expect(getOrderForUser(order.id, a)?.status).toBe("PAID");
  });
});
