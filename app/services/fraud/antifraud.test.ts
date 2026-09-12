// Tests Anti-Fraud Engine + Commission Engine (DB temporal, sin red).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-fraud-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb, getDb } from "../db/database";
import { loginUser, registerUser } from "../auth/auth";
import { addRoles } from "../db/profiles";
import { createOrder } from "../db/purchase";
import { confirmPaymentTx } from "../db/purchase";
import {
  assignReferrer,
  buildCommissionChain,
  getOrCreateReferralCode,
  ReferralError,
} from "../affiliates/referrals";
import {
  audit,
  evaluateUser,
  getAudit,
  getOpenCases,
  getRiskProfile,
  listHolds,
  recordDeterministicHit,
  reviewCase,
} from "./antifraud";
import { CommissionError, recordAffiliateCommission } from "../affiliates/commissionEngine";

const DB = process.env.DATABASE_PATH as string;
const TX = (c: string): string => `0x${c.repeat(64).slice(0, 64)}`;

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
  const email = `u${n}-${Date.now()}@t.co`;
  const reg = registerUser(email, "Test", "password123", { lastName: "User", termsAccepted: true });
  if (!reg.ok) throw new Error("setup falló");
  if (affiliate) addRoles(reg.user.id, ["affiliate"]);
  return { id: reg.user.id, email };
}

function paidOrder(buyerId: string, productId: string, tx: string, amount = 100) {
  const order = createOrder({
    userId: buyerId,
    productId,
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

describe("cadenas de referidos", () => {
  it("1. A→B válido", () => {
    const a = makeUser();
    const b = makeUser();
    assignReferrer(b.id, a.id);
    expect(buildCommissionChain(b.id)).toEqual([b.id, a.id]);
  });

  it("2. A→B→C→D válido (4 niveles de cadena)", () => {
    const a = makeUser();
    const b = makeUser();
    const c = makeUser();
    const d = makeUser();
    assignReferrer(b.id, a.id);
    assignReferrer(c.id, b.id);
    assignReferrer(d.id, c.id);
    expect(buildCommissionChain(d.id)).toEqual([d.id, c.id, b.id, a.id]);
  });

  it("3. A→A se rechaza", () => {
    const a = makeUser();
    expect(() => assignReferrer(a.id, a.id)).toThrowError(ReferralError);
    try {
      assignReferrer(a.id, a.id);
    } catch (err) {
      expect((err as ReferralError).code).toBe("SELF_REFERRAL");
    }
  });

  it("4. A→B→A se rechaza", () => {
    const a = makeUser();
    const b = makeUser();
    assignReferrer(b.id, a.id);
    try {
      assignReferrer(a.id, b.id);
      expect.unreachable();
    } catch (err) {
      expect((err as ReferralError).code).toBe("SELF_REFERRAL_CHAIN");
    }
  });

  it("5. A→B→C→A se rechaza", () => {
    const a = makeUser();
    const b = makeUser();
    const c = makeUser();
    assignReferrer(b.id, a.id);
    assignReferrer(c.id, b.id);
    expect(() => assignReferrer(a.id, c.id)).toThrowError(ReferralError);
  });

  it("6. A→B→B se rechaza", () => {
    const a = makeUser();
    const b = makeUser();
    assignReferrer(b.id, a.id);
    try {
      assignReferrer(b.id, b.id);
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ReferralError).toBe(true);
    }
  });
});

describe("señales débiles no bloquean", () => {
  it("7. Misma IP: LOW_RISK, sin caso, sin bloqueo", () => {
    const a = makeUser();
    const b = makeUser();
    evaluateUser(a.id, { ip: "10.0.0.1" });
    const p = evaluateUser(b.id, { ip: "10.0.0.1" });
    expect(p.riskScore).toBe(10);
    expect(p.riskStatus).toBe("LOW_RISK");
    expect(getOpenCases()).toHaveLength(0);
  });

  it("8. Mismo device: no hay bloqueo automático", () => {
    const a = makeUser();
    const b = makeUser();
    evaluateUser(a.id, { deviceId: "dev-casa" });
    const p = evaluateUser(b.id, { deviceId: "dev-casa" });
    expect(p.riskScore).toBe(20);
    expect(p.riskStatus).toBe("LOW_RISK");
    expect(getOpenCases()).toHaveLength(0);
  });

  it("18. Dos familiares con misma IP y cadena válida no se bloquean", () => {
    const a = makeUser(true);
    const b = makeUser();
    assignReferrer(b.id, a.id);
    evaluateUser(a.id, { ip: "192.168.1.5", deviceId: "pc-familiar" });
    evaluateUser(b.id, { ip: "192.168.1.5", deviceId: "pc-familiar" });
    const code = getOrCreateReferralCode(a.id);
    const order = paidOrder(b.id, "prod-fam", TX("a"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: b.id, affiliateCode: code, context: { ip: "192.168.1.5" } });
    expect(res.splits.every((s) => s.status === "PAYABLE")).toBe(true);
    expect(res.chainRisk).not.toBe("BLOCKED");
  });
});

describe("señales fuertes y patrones", () => {
  it("9. Mismo wallet: REVIEW, caso abierto, sin auto-bloqueo", () => {
    const a = makeUser(true);
    const b = makeUser(true);
    const pa = evaluateUser(a.id, { wallet: "0xWALLET123" });
    expect(pa.riskScore).toBe(0);
    const pb = evaluateUser(b.id, { wallet: "0xWALLET123" });
    expect(pb.riskScore).toBe(80);
    expect(pb.riskStatus).toBe("REVIEW_REQUIRED");
    expect(pb.riskStatus).not.toBe("BLOCKED");
    expect(getOpenCases().length).toBeGreaterThan(0);
  });

  it("10. 10 cuentas rápidas mismo entorno elevan el score", () => {
    const users = Array.from({ length: 10 }, () => makeUser());
    for (const u of users) evaluateUser(u.id, { ip: "10.9.9.9" });
    const last = getRiskProfile(users[9]?.id as string);
    expect(last.signals).toContain("MULTIPLE_ACCOUNTS_CREATED_QUICKLY");
    expect(last.riskScore).toBeGreaterThanOrEqual(20);
  });
});

describe("motor de comisiones", () => {
  it("11. Comisión normal: 40/5/3/2 PAYABLE", () => {
    const a = makeUser(true);
    const b = makeUser(true);
    const c = makeUser(true);
    const d = makeUser(true);
    const buyer = makeUser();
    assignReferrer(b.id, a.id);
    assignReferrer(c.id, b.id);
    assignReferrer(d.id, c.id);
    const code = getOrCreateReferralCode(d.id);
    const order = paidOrder(buyer.id, "prod-1", TX("b"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    expect(res.chain).toEqual([d.id, c.id, b.id, a.id]);
    expect(res.splits.map((s) => s.amount)).toEqual([40, 5, 3, 2]);
    expect(res.splits.every((s) => s.status === "PAYABLE")).toBe(true);
    expect(listHolds()).toHaveLength(0);
  });

  it("12. Cadena REVIEW_REQUIRED: splits PENDING_REVIEW + holds", () => {
    const a = makeUser(true);
    const buyer = makeUser();
    assignReferrer(buyer.id, a.id);
    // Fuerza score 80 en el directo (wallet compartido con otro afiliado).
    const other = makeUser(true);
    evaluateUser(a.id, { wallet: "0xSHARED1" });
    evaluateUser(other.id, { wallet: "0xSHARED1" });
    const code = getOrCreateReferralCode(a.id);
    const order = paidOrder(buyer.id, "prod-2", TX("c"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    expect(res.chainRisk).toBe("REVIEW_REQUIRED");
    expect(res.splits.every((s) => s.status === "PENDING_REVIEW")).toBe(true);
    expect(res.caseId).not.toBeNull();
    expect(listHolds("PENDING_REVIEW").length).toBeGreaterThan(0);
    // Idempotencia: repetir no duplica holds.
    const before = listHolds("PENDING_REVIEW").length;
    const again = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    expect(listHolds("PENDING_REVIEW").length).toBe(before);
    expect(again.splits).toHaveLength(res.splits.length);
  });

  it("13. Admin libera: holds RELEASED + audit", () => {
    const a = makeUser(true);
    const buyer = makeUser();
    assignReferrer(buyer.id, a.id);
    const other = makeUser(true);
    evaluateUser(a.id, { wallet: "0xSHARED2" });
    evaluateUser(other.id, { wallet: "0xSHARED2" });
    const code = getOrCreateReferralCode(a.id);
    const order = paidOrder(buyer.id, "prod-3", TX("d"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    if (!res.caseId) throw new Error("se esperaba caso");
    const updated = reviewCase(res.caseId, "MARK_SAFE", a.id, "verificado manual");
    expect(updated.status).toBe("RESOLVED_SAFE");
    expect(listHolds("RELEASED").length).toBeGreaterThan(0);
    const trail = getAudit({ orderId: order.id });
    expect(trail.map((t) => t.event)).toContain("COMMISSION_RELEASED");
  });

  it("14. Admin bloquea: holds BLOCKED + audit", () => {
    const a = makeUser(true);
    const buyer = makeUser();
    assignReferrer(buyer.id, a.id);
    const other = makeUser(true);
    evaluateUser(a.id, { wallet: "0xSHARED3" });
    evaluateUser(other.id, { wallet: "0xSHARED3" });
    const code = getOrCreateReferralCode(a.id);
    const order = paidOrder(buyer.id, "prod-4", TX("e"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    if (!res.caseId) throw new Error("se esperaba caso");
    reviewCase(res.caseId, "BLOCK_COMMISSION", a.id, "fraude confirmado");
    expect(listHolds("BLOCKED").length).toBeGreaterThan(0);
    expect(getAudit({ orderId: order.id }).map((t) => t.event)).toContain("COMMISSION_BLOCKED");
  });

  it("17. Cadena de más de 3 niveles: se ignoran niveles extra", () => {
    const ids = [makeUser(true), makeUser(true), makeUser(true), makeUser(true), makeUser(true)].map((u) => u.id);
    const eId = ids[4] as string;
    const dId = ids[3] as string;
    const cId = ids[2] as string;
    const bId = ids[1] as string;
    const aId = ids[0] as string;
    assignReferrer(bId, aId);
    assignReferrer(cId, bId);
    assignReferrer(dId, cId);
    assignReferrer(eId, dId);
    const buyer = makeUser();
    const code = getOrCreateReferralCode(eId);
    const order = paidOrder(buyer.id, "prod-5", TX("f"));
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    expect(res.chain).toEqual([eId, dId, cId, bId]);
    expect(res.splits.map((s) => s.level)).toEqual([0, 1, 2, 3]);
    expect(res.chain).not.toContain(aId);
  });
});

describe("manipulación desde frontend", () => {
  it("15. Monto/orden ajena: el motor usa la DB, ownership enforced", () => {
    const a = makeUser(true);
    const buyer = makeUser();
    const victim = makeUser();
    assignReferrer(buyer.id, a.id);
    const code = getOrCreateReferralCode(a.id);
    const order = paidOrder(buyer.id, "prod-6", TX("1"));
    // Atacante intenta cobrar la orden ajena como si fuera suya.
    try {
      recordAffiliateCommission({ orderId: order.id, buyerId: victim.id, affiliateCode: code });
      expect.unreachable();
    } catch (err) {
      expect((err as CommissionError).code).toBe("OWNERSHIP");
    }
    // El motor no acepta montos externos: el split sale de paymentAmount (100).
    const res = recordAffiliateCommission({ orderId: order.id, buyerId: buyer.id, affiliateCode: code });
    expect(res.saleAmount).toBe(100);
    expect(res.splits[0]?.amount).toBe(40);
  });

  it("16. referrerId inmutable: segundo intento se audita y rechaza", () => {
    const a = makeUser();
    const b = makeUser();
    const c = makeUser();
    assignReferrer(b.id, a.id);
    expect(() => assignReferrer(b.id, c.id)).toThrowError(ReferralError);
    const db = getDb();
    const row = db.prepare("SELECT referrerId FROM referrals WHERE userId = ?").get(b.id) as { referrerId: string };
    expect(row.referrerId).toBe(a.id);
    expect(getAudit({ userId: b.id }).map((t) => t.event)).not.toContain("REFERRER_ASSIGNED");
  });

  it("determinístico: self-referral confirmado deja BLOCKED + caso", () => {
    const a = makeUser();
    const b = makeUser();
    assignReferrer(b.id, a.id);
    const profile = recordDeterministicHit(a.id, "SELF_REFERRAL_ATTEMPT", { relatedUserId: b.id });
    expect(profile.riskStatus).toBe("BLOCKED");
    expect(getOpenCases().some((k) => k.userId === a.id)).toBe(true);
    expect(loginUser(a.email, "password123").ok).toBe(true);
  });

  it("auditoría nunca guarda secretos", () => {
    const a = makeUser();
    audit("RISK_SCORE_CHANGED", { userId: a.id, metadata: { note: "x" } });
    const trail = getAudit({ userId: a.id });
    const blob = JSON.stringify(trail);
    expect(blob).not.toContain("password");
    expect(blob).not.toContain("sk-");
  });
});
