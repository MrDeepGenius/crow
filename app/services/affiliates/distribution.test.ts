// Tests del reparto definitivo v2 (DB temporal, sin red).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-distribution-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb, getDb } from "../db/database";
import { registerUser } from "../auth/auth";
import { addRoles } from "../db/profiles";
import { createOrder, confirmPaymentTx } from "../db/purchase";
import { assignReferrer, getOrCreateReferralCode } from "./referrals";
import {
  DistributionError,
  distributeSale,
  finalizeReleasedOrder,
  getLevels,
  getLevelStatus,
  getOrderLedger,
  ledgerBalance,
  reverseLedgerEntry,
  reverseUnlock,
  setLevelRequirement,
} from "./distribution";
import { evaluateUser, listHolds, reviewCase } from "../fraud/antifraud";

const DB = process.env.DATABASE_PATH as string;
const TX = (c: string): string => `0x${c.repeat(64).slice(0, 64)}`;
const CREATOR = "creator-ana";

function resetDb(): void {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
}

beforeEach(() => {
  resetDb();
});

let n = 0;
function aff(): { id: string } {
  n += 1;
  const reg = registerUser(`aff${n}-${Date.now()}@t.co`, "Aff", "password123", { lastName: "Test", termsAccepted: true });
  if (!reg.ok) throw new Error("setup falló");
  addRoles(reg.user.id, ["affiliate"]);
  return { id: reg.user.id };
}

function buyer(): { id: string } {
  n += 1;
  const reg = registerUser(`buy${n}-${Date.now()}@t.co`, "Buy", "password123", { lastName: "Er", termsAccepted: true });
  if (!reg.ok) throw new Error("setup falló");
  return { id: reg.user.id };
}

function paidOrder(buyerId: string, productId: string, tx: string, amount = 100, creatorId: string | null = CREATOR) {
  const order = createOrder({
    userId: buyerId,
    productId,
    creatorId,
    baseAmount: amount,
    paymentAmount: amount,
    currency: "USDT",
    network: "BSC",
    expectedRecipient: "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f",
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  confirmPaymentTx({
    orderId: order.id,
    txHash: tx,
    blockNumber: 100,
    confirmations: 12,
    sender: "0x1111111111111111111111111111111111111111",
    tokenContract: "0x55d398326f99059fF775485246999027B3197955",
    recipient: "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f",
    amount,
    currency: "USDT",
  });
  return order;
}

function byAccount(res: ReturnType<typeof distributeSale>, account: string) {
  return res.allocations.filter((a) => a.account === account);
}

describe("reparto definitivo", () => {
  it("1. Primera venta válida: unlock L1, split 2.5/2.5 e integridad 100", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    expect(getLevelStatus(a.id, 1)).toBe("LOCKED");
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const code = getOrCreateReferralCode(b.id);
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(byAccount(res, "LEVEL_1")[0]?.amount).toBe(2.5);
    expect(byAccount(res, "CROW_EMERGENCY_RESERVE")[0]?.amount).toBe(2.5);
    // Reserva = 2 base + L2..L5 sin miembro (3+2+2+1).
    expect(byAccount(res, "CROW_RESERVE")[0]?.amount).toBe(10);
    expect(getLevelStatus(a.id, 1)).toBe("UNLOCKED");
    expect(res.unlocks).toHaveLength(1);
    // Integridad: suma == pago.
    const total = Math.round(res.allocations.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    expect(total).toBe(100);
    expect(byAccount(res, "CREATOR")[0]?.amount).toBe(45);
    expect(byAccount(res, "CROW_COMMISSION")[0]?.amount).toBe(10);
    expect(byAccount(res, "AFFILIATE_DIRECT")[0]?.amount).toBe(30);
  });

  it("2. Segunda venta: L1 cobra 5% completo, sin más splits", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const code = getOrCreateReferralCode(b.id);
    const o1 = paidOrder(buy.id, "prod-1", TX("a"));
    distributeSale({ orderId: o1.id, buyerId: buy.id, affiliateCode: code });
    const o2 = paidOrder(buy.id, "prod-1", TX("b"));
    const res = distributeSale({ orderId: o2.id, buyerId: buy.id, affiliateCode: code });
    expect(byAccount(res, "LEVEL_1")[0]?.amount).toBe(5);
    expect(byAccount(res, "CROW_EMERGENCY_RESERVE")).toHaveLength(0);
    expect(res.unlocks).toHaveLength(0);
  });

  it("3. Venta inválida (orden no pagada) no desbloquea", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const order = createOrder({
      userId: buy.id,
      productId: "prod-1",
      creatorId: CREATOR,
      baseAmount: 100,
      paymentAmount: 100,
      currency: "USDT",
      network: "BSC",
      expectedRecipient: "0xabc",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    const code = getOrCreateReferralCode(b.id);
    expect(() => distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code })).toThrowError(DistributionError);
    expect(getLevelStatus(a.id, 1)).toBe("LOCKED");
  });

  it("4. Venta fraudulenta no desbloquea (queda en review)", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const other = aff();
    evaluateSharedWallet(a.id, other.id);
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(res.chainRisk).toBe("REVIEW_REQUIRED");
    expect(getLevelStatus(a.id, 1)).toBe("LOCKED");
    expect(listHolds("PENDING_REVIEW").length).toBeGreaterThan(0);
  });

  it("5. Creador compra su producto: sin comisión de afiliado", () => {
    const creatorUser = aff();
    const code = getOrCreateReferralCode(creatorUser.id);
    // creatorId == userId del creador (comparación exacta server-side).
    const order = paidOrder(creatorUser.id, "prod-own", TX("a"), 100, creatorUser.id);
    const res = distributeSale({ orderId: order.id, buyerId: creatorUser.id, affiliateCode: code });
    expect(byAccount(res, "AFFILIATE_DIRECT")).toHaveLength(0);
    expect(byAccount(res, "CREATOR")[0]?.amount).toBe(45);
    const total = Math.round(res.allocations.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    expect(total).toBe(100);
  });

  it("6. Creador en la cadena de su producto: REVIEW_REQUIRED", () => {
    const c = aff();
    const d = aff();
    const buy = buyer();
    // c es creador del producto y también upline del directo d.
    assignReferrer(d.id, c.id);
    const code = getOrCreateReferralCode(d.id);
    const order = paidOrder(buy.id, "prod-c", TX("a"), 100, c.id);
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(res.chainRisk).toBe("REVIEW_REQUIRED");
    expect(res.allocations.filter((x) => x.affiliateUserId && x.status === "PENDING_REVIEW").length).toBeGreaterThan(0);
  });

  it("7. Referral cycle se rechaza en asignación", () => {
    const a = aff();
    const b = aff();
    assignReferrer(b.id, a.id);
    expect(() => assignReferrer(a.id, b.id)).toThrowError();
  });

  it("8. Buyer en la cadena (usa su propio código) se retiene", () => {
    const a = aff();
    const buy = aff();
    assignReferrer(buy.id, a.id);
    // buy compra con SU propio código: buyer == direct → en cadena.
    const ownCode = getOrCreateReferralCode(buy.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: ownCode });
    expect(res.chainRisk).toBe("REVIEW_REQUIRED");
    expect(byAccount(res, "AFFILIATE_DIRECT")).toHaveLength(0);
    expect(getLevels(a.id).find((l) => l.level === 1)?.status).toBe("LOCKED");
  });

  it("9. Nivel 2 bloqueado no se paga (va a reserva)", () => {
    const a = aff();
    const b = aff();
    const c = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    assignReferrer(c.id, b.id);
    const code = getOrCreateReferralCode(c.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    // Directo=c (30). L1=b: activación 2.5/2.5 + unlock. L2=a bloqueado → reserva.
    expect(byAccount(res, "LEVEL_1")[0]?.amount).toBe(2.5);
    expect(byAccount(res, "LEVEL_2")).toHaveLength(0);
    expect(getLevelStatus(b.id, 1)).toBe("UNLOCKED");
    expect(getLevelStatus(a.id, 2)).toBe("LOCKED");
    const reserve = byAccount(res, "CROW_RESERVE")[0]?.amount ?? 0;
    expect(reserve).toBeGreaterThanOrEqual(2 + 3);
  });

  it("9b. Nivel 2 configurable: con requirement cumplido se desbloquea y paga", () => {
    const a = aff();
    const b = aff();
    const c = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    assignReferrer(c.id, b.id);
    setLevelRequirement(2, "VALID_SALES", 1, a.id);
    const code = getOrCreateReferralCode(c.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(byAccount(res, "LEVEL_2")[0]?.amount).toBe(3);
    expect(getLevelStatus(a.id, 2)).toBe("UNLOCKED");
  });

  it("10. Nivel 5 desbloqueado paga 1%", () => {
    const users = [aff(), aff(), aff(), aff(), aff(), aff()];
    const ids = users.map((u) => u.id);
    for (let i = 1; i < ids.length; i++) assignReferrer(ids[i] as string, ids[i - 1] as string);
    const buy = buyer();
    // Desbloqueo manual L1..L5 del ancestro más alto vía requirement + ventas simuladas queda
    // cubierto en test 2 para L1; aquí se desbloquea L5 por configuración directa de estado.
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO affiliate_levels (userId, level, status, unlockStatus, unlockSourceOrderId, unlockedAt, reversedAt, reversalReason, updatedAt) VALUES (?, 5, 'UNLOCKED', 'ACTIVE', 'seed', ?, NULL, NULL, ?)"
    ).run(ids[0] as string, now, now);
    const code = getOrCreateReferralCode(ids[5] as string);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    const l5 = byAccount(res, "LEVEL_5");
    expect(l5).toHaveLength(1);
    expect(l5[0]?.amount).toBe(1);
  });

  it("11. Nivel sin afiliado válido va a Crow Reserve", () => {
    const b = aff();
    const buy = buyer();
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    // Sin upline: L1..L5 íntegros a reserva (5+3+2+2+1=13) + base 2 = 15.
    expect(byAccount(res, "CROW_RESERVE")[0]?.amount).toBe(15);
    expect(res.unallocated.length).toBeGreaterThan(0);
  });

  it("12. Precio promocional: todo sobre FINAL_PAID_AMOUNT", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"), 70);
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(res.saleAmount).toBe(70);
    expect(byAccount(res, "CREATOR")[0]?.amount).toBe(31.5);
    expect(byAccount(res, "AFFILIATE_DIRECT")[0]?.amount).toBe(21);
    const total = Math.round(res.allocations.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    expect(total).toBe(70);
  });

  it("13 y 14. Crow Commission 10% y Crow Reserve 2% separados", () => {
    const b = aff();
    const buy = buyer();
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(byAccount(res, "CROW_COMMISSION")[0]?.amount).toBe(10);
    expect(byAccount(res, "CROW_EMERGENCY_RESERVE")).toHaveLength(0);
    // Sin afiliados en niveles y sin directo válido extra: reserva = 2 base + niveles no asignados.
    expect(ledgerBalance("CROW_COMMISSION")).toBe(10);
    expect(ledgerBalance("CROW_RESERVE")).toBe(byAccount(res, "CROW_RESERVE")[0]?.amount);
  });

  it("15. Ledger balanceado: suma == pago y sin negativos/duplicados", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    const total = Math.round(res.allocations.reduce((t, x) => t + x.amount, 0) * 100) / 100;
    expect(total).toBe(100);
    expect(res.allocations.every((x) => x.amount >= 0)).toBe(true);
    const keys = res.allocations.map((x) => `${x.account}:${x.affiliateUserId ?? "-"}:${x.level ?? "-"}`);
    expect(new Set(keys).size).toBe(keys.length);
    // Repetir no duplica.
    const again = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(again.allocations).toHaveLength(res.allocations.length);
  });

  it("16. Reversión: unlock REVERSIBLE queda auditado sin borrar", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(getLevels(a.id).find((l) => l.level === 1)?.status).toBe("UNLOCKED");
    reverseUnlock(a.id, 1, "venta invalidada", a.id);
    const lvl = getLevels(a.id).find((l) => l.level === 1);
    expect(lvl?.status).toBe("LOCKED");
    expect(lvl?.unlockSourceOrderId).toBe(order.id);
    // El ledger conserva las entries originales.
    expect(getOrderLedger(order.id).length).toBeGreaterThan(0);
    // Reversión de entry marca REVERSED sin borrar.
    const entry = getOrderLedger(order.id)[0];
    if (!entry) throw new Error("sin ledger");
    const row = getDb().prepare("SELECT id FROM commission_ledger WHERE orderId = ? LIMIT 1").get(order.id) as { id: string };
    reverseLedgerEntry(row.id, "test", a.id);
    expect(getDb().prepare("SELECT status FROM commission_ledger WHERE id = ?").get(row.id) as { status: string }).toMatchObject({ status: "REVERSED" });
  });

  it("unlock liberado tras review aprueba ledger pendiente", () => {
    const a = aff();
    const b = aff();
    const buy = buyer();
    assignReferrer(b.id, a.id);
    const other = aff();
    evaluateSharedWallet(a.id, other.id);
    const code = getOrCreateReferralCode(b.id);
    const order = paidOrder(buy.id, "prod-1", TX("a"));
    const res = distributeSale({ orderId: order.id, buyerId: buy.id, affiliateCode: code });
    expect(res.caseId).not.toBeNull();
    if (!res.caseId) throw new Error("sin caso");
    reviewCase(res.caseId, "MARK_SAFE", a.id, "verificado");
    const fin = finalizeReleasedOrder(order.id);
    console.log("DBG_FIN", JSON.stringify(fin), JSON.stringify(getOrderLedger(order.id).map((e) => [e.account, e.status])));
    expect(fin.approved).toBeGreaterThan(0);
    // L1 se desbloquea al liberarse (la venta calificaba).
    expect(getLevels(a.id).find((l) => l.level === 1)?.status).toBe("UNLOCKED");
  });

  it("ownership: otro usuario no distribuye orden ajena", () => {
    const b = aff();
    const victim = buyer();
    const order = paidOrder(victim.id, "prod-1", TX("a"));
    expect(() => distributeSale({ orderId: order.id, buyerId: b.id })).toThrowError(DistributionError);
  });
});

function evaluateSharedWallet(a: string, b: string): void {
  evaluateUser(a, { wallet: "0xSHAREDX" });
  evaluateUser(b, { wallet: "0xSHAREDX" });
}
