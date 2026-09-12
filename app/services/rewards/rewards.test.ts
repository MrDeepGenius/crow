// Tests CROW REWARDS (DB temporal, sin red, sin pagos reales).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-rewards-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb, getDb } from "../db/database";
import { registerUser } from "../auth/auth";
import { addRoles } from "../db/profiles";
import { createOrder, confirmPaymentTx } from "../db/purchase";
import { recordDeterministicHit } from "../fraud/antifraud";
import { distributeSale } from "../affiliates/distribution";
import { assignReferrer, getOrCreateReferralCode } from "../affiliates/referrals";
import { REWARD_TIERS } from "./tiers";
import { addValidSaleVolume, getTotalCp, reverseVolume, VolumeError } from "./volume";
import { creditLicensePool, poolBalances, reverseLicenseCredit, registerRewardPayment, PoolError } from "./pool";
import { claimReward, listRewards } from "./rewards";
import { settlePaidOrder } from "./settle";

const DB = process.env.DATABASE_PATH as string;
const TX = (c: string): string => `0x${c.repeat(64).slice(0, 64)}`;
const TOKEN = "0x55d398326f99059fF775485246999027B3197955";
const TREASURY = "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f";

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
function makeUser(affiliate = false): { id: string; email: string } {
  n += 1;
  const email = `rw${n}-${Date.now()}@t.co`;
  const reg = registerUser(email, "Test", "password123", { lastName: "User", termsAccepted: true });
  if (!reg.ok) throw new Error("setup fallo");
  if (affiliate) addRoles(reg.user.id, ["affiliate"]);
  return { id: reg.user.id, email };
}

function paidOrder(
  buyerId: string,
  productId: string,
  tx: string,
  amount = 100,
  base?: number,
  orderType: "product" | "license" = "product"
) {
  const order = createOrder({
    userId: buyerId,
    productId,
    creatorId: null,
    orderType,
    baseAmount: base ?? amount,
    paymentAmount: amount,
    currency: "USDT",
    network: "BSC",
    expectedRecipient: TREASURY,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  confirmPaymentTx({
    orderId: order.id,
    txHash: tx,
    blockNumber: 100,
    confirmations: 12,
    sender: "0x1111111111111111111111111111111111111111",
    tokenContract: TOKEN,
    recipient: TREASURY,
    amount,
    currency: "USDT",
  });
  return order;
}

describe("volumen (CP)", () => {
  it("1. 100 USDT venta valida genera 100 CP", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("a"), 100);
    const r = addValidSaleVolume({ userId: u.id, orderId: o.id });
    expect(r.cp).toBe(100);
    expect(r.created).toBe(true);
    expect(getTotalCp(u.id)).toBe(100);
  });

  it("2. 5.000 USDT generan 5.000 CP", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("b"), 5000);
    expect(addValidSaleVolume({ userId: u.id, orderId: o.id }).cp).toBe(5000);
  });

  it("3. Descuento: CP sobre FINAL_PAID_AMOUNT (100→70 = 70 CP)", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("c"), 70, 100);
    expect(addValidSaleVolume({ userId: u.id, orderId: o.id }).cp).toBe(70);
  });

  it("4. Venta pendiente genera 0 CP", () => {
    const u = makeUser();
    const o = createOrder({
      userId: u.id,
      productId: "prod-1",
      creatorId: null,
      baseAmount: 100,
      paymentAmount: 100,
      currency: "USDT",
      network: "BSC",
      expectedRecipient: TREASURY,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(() => addValidSaleVolume({ userId: u.id, orderId: o.id })).toThrowError(VolumeError);
    expect(getTotalCp(u.id)).toBe(0);
  });

  it("5. Venta fraudulenta genera 0 CP definitivo", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("d"), 100);
    recordDeterministicHit(u.id, "SELF_REFERRAL_ATTEMPT", { reason: "test" });
    expect(() => addValidSaleVolume({ userId: u.id, orderId: o.id })).toThrowError(VolumeError);
    expect(getTotalCp(u.id)).toBe(0);
  });

  it("6. Self-purchase genera 0 CP", () => {
    const u = makeUser(true);
    const o = paidOrder(u.id, "prod-1", TX("e"), 100);
    getDb().prepare(
      "INSERT INTO commission_ledger (id, orderId, account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note, createdAt) VALUES (?, ?, 'AFFILIATE_DIRECT', ?, ?, 0, 30, 30, 'USDT', 'APPROVED', '', ?)"
    ).run("led-self", o.id, u.id, u.id, new Date().toISOString());
    expect(() => addValidSaleVolume({ userId: u.id, orderId: o.id })).toThrowError(VolumeError);
    expect(getTotalCp(u.id)).toBe(0);
  });

  it("7. Orden duplicada no duplica CP", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("f"), 100);
    const first = addValidSaleVolume({ userId: u.id, orderId: o.id });
    const second = addValidSaleVolume({ userId: u.id, orderId: o.id });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(getTotalCp(u.id)).toBe(100);
  });
});

describe("hitos (tabla exacta)", () => {
  const cases: [number, number, number][] = [
    [5000, 1, 50],
    [10000, 2, 100],
    [25000, 3, 250],
    [50000, 4, 500],
    [100000, 5, 1500],
    [250000, 6, 3500],
    [500000, 7, 15000],
    [1000000, 8, 30000],
  ];
  for (const [cps, level, amount] of cases) {
    it(`${cps} CP desbloquean nivel ${level} = ${amount} USDT`, () => {
      const u = makeUser();
      const o = paidOrder(u.id, "prod-1", TX("a"), cps);
      const r = addValidSaleVolume({ userId: u.id, orderId: o.id });
      expect(r.unlockedLevels).toContain(level);
      const rw = listRewards(u.id).find((x) => x.level === level);
      expect(rw?.amount).toBe(amount);
      expect(rw?.status).toBe("UNLOCKED");
      // CP acumulativos, no se consumen.
      expect(getTotalCp(u.id)).toBe(cps);
    });
  }

  it("tabla centralizada con 8 niveles exactos", () => {
    expect(REWARD_TIERS).toHaveLength(8);
    expect(REWARD_TIERS[7]).toMatchObject({ level: 8, cpRequired: 1000000, amount: 30000 });
  });
});

describe("rewards pool por licencias", () => {
  const tiers: [string, number, number][] = [
    ["START", 20, 0.4],
    ["BASIC", 50, 1],
    ["PRO", 100, 2],
    ["BUSINESS", 300, 6],
    ["ELITE", 500, 10],
  ];
  for (const [tier, price, expected] of tiers) {
    it(`${price} USDT licencia ${tier} aportan ${expected} USDT`, () => {
      const u = makeUser();
      const o = paidOrder(u.id, `license:${tier}`, TX("a"), price, price, "license");
      const r = creditLicensePool({ userId: u.id, licenseOrderId: o.id });
      expect(r.created).toBe(true);
      expect(r.credited).toBeCloseTo(expected, 6);
    });
  }

  it("21. Licencia con descuento: 2% sobre FINAL (100→80 = 1,60)", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "license:PRO", TX("b"), 80, 100, "license");
    expect(creditLicensePool({ userId: u.id, licenseOrderId: o.id }).credited).toBeCloseTo(1.6, 6);
  });

  it("22. Licencia duplicada no duplica el pool", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "license:PRO", TX("c"), 100, 100, "license");
    const first = creditLicensePool({ userId: u.id, licenseOrderId: o.id });
    const second = creditLicensePool({ userId: u.id, licenseOrderId: o.id });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(poolBalances().totalCredits).toBeCloseTo(2, 6);
  });

  it("23. Licencia revertida revierte exactamente el 2%", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "license:PRO", TX("d"), 100, 100, "license");
    creditLicensePool({ userId: u.id, licenseOrderId: o.id });
    const r = reverseLicenseCredit(o.id, "test");
    expect(r.debited).toBeCloseTo(2, 6);
    expect(poolBalances().balance).toBeCloseTo(0, 6);
  });

  it("23b. Volumen revertido: compensatorio sin borrar historial", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("de"), 500);
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    expect(getTotalCp(u.id)).toBe(500);
    const r = reverseVolume(o.id, "fraude confirmado");
    expect(r.reversedCp).toBe(500);
    expect(getTotalCp(u.id)).toBe(0);
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM volume_events WHERE userId = ?").get(u.id) as { n: number };
    expect(row.n).toBe(2);
    expect(reverseVolume(o.id, "otra vez").reversedCp).toBe(0);
  });

  it("24. El pool nunca queda negativo", () => {
    const u = makeUser();
    // Junto 50 de pool con 5 ELITE para poder pagar un reward de 50.
    // TX hex válidas: 0-9a-f.
    const hexes = ["aa", "bb", "cc", "dd", "ee"];
    for (const h of hexes) {
      const lic = paidOrder(u.id, "license:ELITE", TX(h), 500, 500, "license");
      creditLicensePool({ userId: u.id, licenseOrderId: lic.id });
    }
    expect(poolBalances().balance).toBeCloseTo(50, 6);
    const o2 = paidOrder(u.id, "prod-1", TX("ab"), 5000);
    addValidSaleVolume({ userId: u.id, orderId: o2.id });
    const rw = listRewards(u.id).find((x) => x.level === 1);
    if (!rw) throw new Error("setup fallo");
    const db = getDb();
    db.prepare("UPDATE rewards SET status = 'CLAIMED', claimedAt = ? WHERE id = ?").run(new Date().toISOString(), rw.id);
    registerRewardPayment(rw.id, "0xpay", u.id);
    expect(poolBalances().balance).toBeCloseTo(0, 6);
    // Revertir un crédito ya gastado es imposible: nunca negativo.
    const firstLic = db.prepare("SELECT id FROM orders WHERE userId = ? AND productId = 'license:ELITE' LIMIT 1").get(u.id) as { id: string };
    expect(() => reverseLicenseCredit(firstLic.id, "test")).toThrowError(PoolError);
    expect(poolBalances().balance).toBeGreaterThanOrEqual(0);
  });
});

describe("estados y fondos", () => {
  it("25. Sin fondos suficientes queda WAITING_FOR_REWARDS_POOL (se conserva todo)", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("a"), 5000);
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    const rw = listRewards(u.id).find((x) => x.level === 1);
    if (!rw) throw new Error("setup fallo");
    
    const claimed = claimReward(u.id, rw.id);
    expect(claimed.status).toBe("WAITING_FOR_REWARDS_POOL");
    expect(getTotalCp(u.id)).toBe(5000);
  });

  it("26. Sin pago real nunca llega a PAID", () => {
    const u = makeUser();
    for (const h of ["ac", "ad", "ae", "af", "ba"]) {
      const lic = paidOrder(u.id, "license:ELITE", TX(h), 500, 500, "license");
      creditLicensePool({ userId: u.id, licenseOrderId: lic.id });
    }
    const o = paidOrder(u.id, "prod-1", TX("cd"), 5000);
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    const rw = listRewards(u.id).find((x) => x.level === 1);
    if (!rw) throw new Error("setup fallo");
    expect(claimReward(u.id, rw.id).status).toBe("CLAIMED");
    const after = listRewards(u.id).find((x) => x.level === 1);
    expect(after?.status).not.toBe("PAID");
    expect(after?.paidAt).toBeNull();
  });
});

describe("separación de fondos", () => {
  function chainSale(amount: number, tx: string): { buyer: string; aff: string; orderId: string } {
    const affUser = makeUser(true);
    const direct = makeUser(true);
    assignReferrer(direct.id, affUser.id);
    const buy = makeUser();
    const o = paidOrder(buy.id, "prod-1", tx, amount);
    const code = getOrCreateReferralCode(direct.id);
    distributeSale({ orderId: o.id, buyerId: buy.id, affiliateCode: code });
    return { buyer: buy.id, aff: affUser.id, orderId: o.id };
  }

  it("27. Primer desbloqueo L1: 2,5% afiliado + 2,5% Emergency Reserve", () => {
    const db = getDb();
    chainSale(100, TX("a"));
    const row = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM commission_ledger WHERE account = 'CROW_EMERGENCY_RESERVE'").get() as { t: number };
    expect(row.t).toBeCloseTo(2.5, 6);
  });

  it("28. Emergency Reserve NO recibe dinero de licencias", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "license:PRO", TX("b"), 100, 100, "license");
    creditLicensePool({ userId: u.id, licenseOrderId: o.id });
    const db = getDb();
    const row = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM commission_ledger WHERE account = 'CROW_EMERGENCY_RESERVE'").get() as { t: number };
    expect(row.t).toBe(0);
  });

  it("29. Rewards Pool NO recibe el 2,5% del desbloqueo", () => {
    chainSale(100, TX("c"));
    expect(poolBalances().totalCredits).toBe(0);
  });

  it("30. Ambos fondos permanecen separados", () => {
    const u = makeUser();
    const lic = paidOrder(u.id, "license:PRO", TX("d"), 100, 100, "license");
    creditLicensePool({ userId: u.id, licenseOrderId: lic.id });
    chainSale(100, TX("e"));
    expect(poolBalances().totalCredits).toBeCloseTo(2, 6);
    const db = getDb();
    const em = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM commission_ledger WHERE account = 'CROW_EMERGENCY_RESERVE'").get() as { t: number };
    expect(em.t).toBeCloseTo(2.5, 6);
  });

  it("31. Commission Engine intacto (45/10/30 + reserva 2)", () => {
    const { orderId } = (() => {
      const r = chainSale(100, TX("f"));
      return { orderId: r.orderId };
    })();
    const db = getDb();
    const sum = (account: string): number => {
      const row = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM commission_ledger WHERE orderId = ? AND account = ?").get(orderId, account) as { t: number };
      return row.t;
    };
    expect(sum("CREATOR")).toBeCloseTo(45, 6);
    expect(sum("CROW_COMMISSION")).toBeCloseTo(10, 6);
    expect(sum("AFFILIATE_DIRECT")).toBeCloseTo(30, 6);
  });

  it("32. Residuales intactos (máx 13% entre afiliados y reserva)", () => {
    // Dos ventas: la primera activa L1 (2.5), la segunda paga L1 completo (5).
    // Segunda venta: 5 + 8 (L2-L5) + 2 (base) = 15.
    const aff2 = makeUser(true);
    const direct2 = makeUser(true);
    assignReferrer(direct2.id, aff2.id);
    const buy2 = makeUser();
    const c2 = getOrCreateReferralCode(direct2.id);
    const o1 = paidOrder(buy2.id, "prod-1", TX("ab"), 100);
    distributeSale({ orderId: o1.id, buyerId: buy2.id, affiliateCode: c2 });
    const o2 = paidOrder(buy2.id, "prod-1", TX("bc"), 100);
    distributeSale({ orderId: o2.id, buyerId: buy2.id, affiliateCode: c2 });
    const db = getDb();
    const row = db.prepare("SELECT COALESCE(SUM(amount),0) AS t FROM commission_ledger WHERE orderId = ? AND (account LIKE 'LEVEL_%' OR account = 'CROW_RESERVE')").get(o2.id) as { t: number };
    expect(row.t).toBeCloseTo(15, 6);
  });
});

describe("idempotencia y settle", () => {
  it("33. No se duplica ningún reward", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("a"), 5000);
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    expect(listRewards(u.id).filter((x) => x.level === 1)).toHaveLength(1);
  });

  it("34. No se duplica ningún volumen", () => {
    const u = makeUser();
    const o = paidOrder(u.id, "prod-1", TX("b"), 100);
    addValidSaleVolume({ userId: u.id, orderId: o.id });
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM volume_events WHERE userId = ?").get(u.id) as { n: number };
    expect(row.n).toBe(1);
    expect(getTotalCp(u.id)).toBe(100);
  });

  it("35. No se duplica ningún aporte al pool + settle integra venta y licencia", () => {
    const u = makeUser();
    const lic = paidOrder(u.id, "license:BASIC", TX("c"), 50, 50, "license");
    const prod = paidOrder(u.id, "prod-1", TX("d"), 200);
    
    const r1 = settlePaidOrder(lic.id);
    const r2 = settlePaidOrder(prod.id);
    expect(r1.poolCredited).toBeCloseTo(1, 6);
    expect(r1.volumeCp).toBe(50);
    expect(r2.volumeCp).toBe(200);
    expect(r2.poolCredited).toBeNull();
    expect(getTotalCp(u.id)).toBe(250);
    // Re-settle idempotente.
    const r3 = settlePaidOrder(lic.id);
    expect(poolBalances().totalCredits).toBeCloseTo(1, 6);
    void r3;
  });
});
