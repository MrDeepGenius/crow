// ============================================
// AFFILIATE COMMISSION ENGINE - cálculo server-side
// ============================================
// ÚNICO lugar donde se calculan comisiones. Montos, niveles y porcentajes
// salen de la DB + constantes (nunca del frontend): el endpoint solo recibe
// orderId + hint opcional de código. Reglas espejo de marketLedger
// (postSaleToLedger / RESIDUAL_PERCENTS) para no bifurcar el negocio.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";
import { DEFAULT_PLATFORM_CONFIG } from "../marketplace/marketTypes";
import { buildCommissionChain, getAncestors, resolveReferralCode } from "./referrals";
import { requireRole } from "../db/profiles";
import {
  audit,
  evaluateUser,
  getRiskProfile,
  recordDeterministicHit,
  recordSignal,
  type EvalContext,
  type RiskStatus,
} from "../fraud/antifraud";

// Espejo documentado de marketLedger.RESIDUAL_PERCENTS (5/3/2 del fee).
const RESIDUAL_PERCENTS = [5, 3, 2] as const;
const DIRECT_PERCENT = DEFAULT_PLATFORM_CONFIG.affiliateCommissionPercent;

export type SplitStatus = "PAYABLE" | "PENDING_REVIEW";

export interface CommissionSplit {
  affiliateUserId: string;
  level: number;
  amount: number;
  currency: string;
  status: SplitStatus;
}

export interface CommissionResult {
  orderId: string;
  saleAmount: number;
  currency: string;
  chain: string[];
  splits: CommissionSplit[];
  chainRisk: RiskStatus;
  caseId: string | null;
}

export class CommissionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface RecordCommissionInput {
  orderId: string;
  buyerId: string;
  affiliateCode?: string;
  context?: EvalContext;
}

function ensureCaseWithOrder(userId: string, orderId: string, riskScore: number, reason: string): string {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM fraud_cases WHERE userId = ? AND orderId = ? AND status = 'OPEN'").get(userId, orderId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = uid("case");
  const now = nowIso();
  db.prepare(
    "INSERT INTO fraud_cases (id, userId, relatedUserId, orderId, status, riskScore, reason, createdAt, updatedAt, resolvedAt) VALUES (?, ?, NULL, ?, 'OPEN', ?, ?, ?, ?, NULL)"
  ).run(id, userId, orderId, riskScore, reason, now, now);
  audit("FRAUD_REVIEW_CREATED", { userId, orderId, reason, riskScore, metadata: { caseId: id } });
  return id;
}

function persistHold(orderId: string, affiliateUserId: string, level: number, amount: number, currency: string, reason: string): void {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO commission_holds (id, orderId, affiliateUserId, level, amount, currency, status, reason, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?, ?)
     ON CONFLICT(orderId, affiliateUserId, level) DO NOTHING`
  ).run(uid("hold"), orderId, affiliateUserId, level, amount, currency, reason.slice(0, 300), now, now);
}

/**
 * Registra comisiones de una venta. Idempotente: repetir con la misma orden
 * devuelve el mismo resultado sin duplicar holds (UNIQUE + chequeo).
 */
export function recordAffiliateCommission(input: RecordCommissionInput): CommissionResult {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, paymentAmount, currency, status FROM orders WHERE id = ?").get(input.orderId) as
    | { id: string; userId: string; paymentAmount: number; currency: string; status: string }
    | undefined;
  if (!order) throw new CommissionError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== input.buyerId) throw new CommissionError("OWNERSHIP", "La orden no pertenece al comprador");
  if (order.status !== "PAID") throw new CommissionError("ORDER_NOT_PAID", "La orden no está pagada");

  const saleAmount = order.paymentAmount;
  const currency = order.currency;

  // Idempotencia: holds ya creados para esta orden.
  const prior = db.prepare("SELECT affiliateUserId, level, amount, currency, status FROM commission_holds WHERE orderId = ? ORDER BY level").all(order.id) as {
    affiliateUserId: string; level: number; amount: number; currency: string; status: string;
  }[];
  if (prior.length > 0) {
    const chainRisk = worstStatus(prior.map((p) => (p.status === "PENDING_REVIEW" || p.status === "BLOCKED" ? "REVIEW_REQUIRED" : "LOW_RISK")));
    return {
      orderId: order.id,
      saleAmount,
      currency,
      chain: prior.map((p) => p.affiliateUserId),
      splits: prior.map((p) => ({
        affiliateUserId: p.affiliateUserId,
        level: p.level,
        amount: p.amount,
        currency: p.currency,
        status: p.status === "RELEASED" ? "PAYABLE" : "PENDING_REVIEW",
      })),
      chainRisk,
      caseId: null,
    };
  }

  if (!input.affiliateCode) {
    return { orderId: order.id, saleAmount, currency, chain: [], splits: [], chainRisk: "LOW_RISK", caseId: null };
  }

  const directId = resolveReferralCode(input.affiliateCode);
  if (!directId) {
    audit("COMMISSION_HELD", { userId: null, orderId: order.id, reason: "Código de afiliado inválido", metadata: { code: input.affiliateCode.slice(0, 20) } });
    return { orderId: order.id, saleAmount, currency, chain: [], splits: [], chainRisk: "LOW_RISK", caseId: null };
  }
  if (!requireRole(directId, "affiliate")) {
    audit("COMMISSION_HELD", { userId: directId, orderId: order.id, reason: "El dueño del código no tiene rol affiliate" });
    return { orderId: order.id, saleAmount, currency, chain: [], splits: [], chainRisk: "LOW_RISK", caseId: null };
  }

  // Auto-compra vía propio enlace: sin comisión directa, se audita.
  if (directId === input.buyerId) {
    recordSignal(directId, "SUSPICIOUS_ACTIVITY", `auto-compra orden ${order.id}`);
    audit("COMMISSION_HELD", { userId: directId, orderId: order.id, reason: "AUTO_PURCHASE_NO_DIRECT_SPLIT" });
    return { orderId: order.id, saleAmount, currency, chain: [directId], splits: [], chainRisk: getRiskProfile(directId).riskStatus, caseId: null };
  }

  const chain = buildCommissionChain(directId);
  const seen = new Set<string>();
  for (const id of chain) {
    if (seen.has(id)) {
      const profile = recordDeterministicHit(directId, "REFERRAL_CYCLE_ATTEMPT", { orderId: order.id, reason: "Cadena con duplicados al calcular comisiones" });
      const caseId = ensureCaseWithOrder(directId, order.id, profile.riskScore, "REFERRAL_CYCLE_ATTEMPT");
      return { orderId: order.id, saleAmount, currency, chain, splits: [], chainRisk: "BLOCKED", caseId };
    }
    seen.add(id);
  }

  // Fraud check de la cadena con el contexto del request.
  const buyerProfile = evaluateUser(input.buyerId, input.context ?? {});
  void buyerProfile;
  const memberStatuses: RiskStatus[] = [];
  for (const memberId of chain) {
    const p = memberId === input.buyerId ? getRiskProfile(memberId) : evaluateUser(memberId, {});
    memberStatuses.push(p.riskStatus);
  }
  const chainRisk = worstStatus(memberStatuses);

  const splits: CommissionSplit[] = chain.map((affiliateUserId, i) => {
    const pct = i === 0 ? DIRECT_PERCENT : (RESIDUAL_PERCENTS[i - 1] ?? 0);
    return {
      affiliateUserId,
      level: i,
      amount: round2((saleAmount * pct) / 100),
      currency,
      status: chainRisk === "REVIEW_REQUIRED" || chainRisk === "BLOCKED" ? "PENDING_REVIEW" : "PAYABLE",
    };
  });

  let caseId: string | null = null;
  if (chainRisk === "REVIEW_REQUIRED" || chainRisk === "BLOCKED") {
    const riskiest = chain[memberStatuses.findIndex((s) => s === chainRisk)] ?? directId;
    caseId = ensureCaseWithOrder(riskiest, order.id, 85, `CHAIN_${chainRisk}`);
    for (const s of splits) {
      persistHold(order.id, s.affiliateUserId, s.level, s.amount, s.currency, `CHAIN_${chainRisk}`);
      audit("COMMISSION_HELD", { userId: s.affiliateUserId, orderId: order.id, reason: `CHAIN_${chainRisk}`, riskScore: 85, metadata: { level: s.level, amount: s.amount } });
    }
  }
  return { orderId: order.id, saleAmount, currency, chain, splits, chainRisk, caseId };
}

function worstStatus(statuses: RiskStatus[]): RiskStatus {
  const rank: Record<RiskStatus, number> = { LOW_RISK: 0, MEDIUM_RISK: 1, HIGH_RISK: 2, REVIEW_REQUIRED: 3, BLOCKED: 4 };
  let worst: RiskStatus = "LOW_RISK";
  for (const s of statuses) {
    if (rank[s] > rank[worst]) worst = s;
  }
  return worst;
}

export { getAncestors };
