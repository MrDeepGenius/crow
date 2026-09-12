// ============================================
// DISTRIBUTION ENGINE v2 - reparto definitivo
// ============================================
// Modelo: creador 45 + Crow 10 + directo 30 + residuales 5/3/2/2/1 (13 mÃ¡x)
// + Crow Reserve 2 = 100. Nivel 1 nace LOCKED; la primera venta propia
// vÃ¡lida lo desbloquea dividiendo su 5% (2.5 afiliado / 2.5 Incentive Pool).
// Todo en centavos enteros: la diferencia de redondeo va a Crow Reserve.
// Server-side puro: el frontend nunca decide porcentajes ni destinatarios.
// El engine v1 (commissionEngine.ts) queda intacto para compatibilidad.

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";
import { getAncestors, resolveReferralCode } from "./referrals";
import { requireRole } from "../db/profiles";
import {
  audit,
  evaluateUser,
  getRiskProfile,
  recordSignal,
  type RiskStatus,
} from "../fraud/antifraud";

export const SPLIT_V2 = {
  creator: 45,
  crow: 10,
  direct: 30,
  residuals: [5, 3, 2, 2, 1],
  reserve: 2,
} as const;

export const MAX_RESIDUAL_LEVEL = 5;

export type LevelStatus = "LOCKED" | "UNLOCKING" | "UNLOCKED";
export type LedgerStatus = "PENDING" | "PENDING_REVIEW" | "APPROVED" | "PAID" | "BLOCKED" | "REVERSED";

export interface Allocation {
  account: string;
  affiliateUserId: string | null;
  recipientRef: string | null;
  level: number | null;
  percentage: number;
  amount: number;
  currency: string;
  status: LedgerStatus;
  note: string;
}

export interface UnlockEvent {
  userId: string;
  level: number;
  status: LevelStatus;
  unlockSourceOrderId: string | null;
}

export interface DistributionResult {
  orderId: string;
  saleAmount: number;
  currency: string;
  chain: string[];
  allocations: Allocation[];
  unlocks: UnlockEvent[];
  unallocated: { level: number | null; amount: number; reason: string }[];
  chainRisk: RiskStatus;
  caseId: string | null;
}

export class DistributionError extends Error {
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

export function getLevelStatus(userId: string, level: number): LevelStatus {
  const row = getDb().prepare("SELECT status FROM affiliate_levels WHERE userId = ? AND level = ?").get(userId, level) as
    | { status: LevelStatus }
    | undefined;
  return row?.status ?? "LOCKED";
}

export function getLevelRequirement(level: number): { requirementType: string; threshold: number | null } {
  const row = getDb().prepare("SELECT requirementType, threshold FROM level_unlock_requirements WHERE level = ?").get(level) as
    | { requirementType: string; threshold: number | null }
    | undefined;
  return { requirementType: row?.requirementType ?? "MANUAL", threshold: row?.threshold ?? null };
}

export function setLevelRequirement(level: number, requirementType: string, threshold: number | null, adminId: string): void {
  if (![1, 2, 3, 4, 5].includes(level)) throw new DistributionError("INVALID_LEVEL", "Nivel invÃ¡lido");
  if (!["VALID_SALES", "MANUAL"].includes(requirementType)) throw new DistributionError("INVALID_REQUIREMENT", "Tipo invÃ¡lido");
  getDb().prepare(
    "INSERT INTO level_unlock_requirements (level, requirementType, threshold, updatedAt) VALUES (?, ?, ?, ?) ON CONFLICT(level) DO UPDATE SET requirementType = excluded.requirementType, threshold = excluded.threshold, updatedAt = excluded.updatedAt"
  ).run(level, requirementType, threshold, nowIso());
  audit("RISK_SCORE_CHANGED", { userId: adminId, reason: `LEVEL_REQUIREMENT L${level}=${requirementType}:${threshold}` });
}

/** Ventas calificantes previas del usuario para un nivel (ledger APPROVED/PAID). */
function priorQualifyingSales(userId: string, level: number): number {
  const row = getDb().prepare(
    "SELECT COUNT(DISTINCT orderId) AS n FROM commission_ledger WHERE affiliateUserId = ? AND level = ? AND status IN ('APPROVED','PAID')"
  ).get(userId, level) as { n: number };
  return row.n;
}

function markUnlocked(userId: string, level: number, orderId: string): UnlockEvent {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO affiliate_levels (userId, level, status, unlockStatus, unlockSourceOrderId, unlockedAt, reversedAt, reversalReason, updatedAt)
     VALUES (?, ?, 'UNLOCKED', 'ACTIVE', ?, ?, NULL, NULL, ?)
     ON CONFLICT(userId, level) DO UPDATE SET status = 'UNLOCKED', unlockStatus = 'ACTIVE', unlockSourceOrderId = excluded.unlockSourceOrderId, unlockedAt = excluded.unlockedAt, reversedAt = NULL, reversalReason = NULL, updatedAt = excluded.updatedAt`
  ).run(userId, level, orderId, now, now);
  audit("REFERRER_ASSIGNED", { userId, orderId, reason: `LEVEL_${level}_UNLOCKED`, metadata: { sourceOrder: orderId } });
  if (level === 1) {
    audit("LEVEL_1_UNLOCK_EMERGENCY_CREDIT", { userId, orderId, reason: "2.5% del residual L1 al Emergency Reserve", metadata: { sourceOrder: orderId } });
  }
  return { userId, level, status: "UNLOCKED", unlockSourceOrderId: orderId };
}

/** Prepara reversiÃ³n de un desbloqueo (arquitectura lista; reglas futuras deciden cuÃ¡ndo). */
export function reverseUnlock(userId: string, level: number, reason: string, adminId: string): void {
  const db = getDb();
  const row = db.prepare("SELECT status FROM affiliate_levels WHERE userId = ? AND level = ?").get(userId, level) as
    | { status: LevelStatus }
    | undefined;
  if (!row || row.status !== "UNLOCKED") throw new DistributionError("NOT_UNLOCKED", "Nivel no desbloqueado");
  db.prepare("UPDATE affiliate_levels SET status = 'LOCKED', unlockStatus = 'REVERSED', reversedAt = ?, reversalReason = ?, updatedAt = ? WHERE userId = ? AND level = ?").run(
    nowIso(),
    reason.slice(0, 300),
    nowIso(),
    userId,
    level
  );
  audit("RISK_SCORE_CHANGED", { userId, relatedUserId: adminId, reason: `LEVEL_${level}_REVERSED: ${reason.slice(0, 200)}` });
}

export function getLevels(userId: string): { level: number; status: LevelStatus; unlockStatus: string; unlockSourceOrderId: string | null }[] {
  const rows = getDb().prepare("SELECT level, status, unlockStatus, unlockSourceOrderId FROM affiliate_levels WHERE userId = ? ORDER BY level").all(userId) as {
    level: number; status: LevelStatus; unlockStatus: string; unlockSourceOrderId: string | null;
  }[];
  const byLevel = new Map(rows.map((r) => [r.level, r]));
  return [1, 2, 3, 4, 5].map((level) => byLevel.get(level) ?? { level, status: "LOCKED" as LevelStatus, unlockStatus: "NONE", unlockSourceOrderId: null });
}

export interface DistributeInput {
  orderId: string;
  buyerId: string;
  affiliateCode?: string;
  context?: { ip?: string; deviceId?: string };
}

interface ChainMember {
  userId: string;
  level: number; // 0 = directo, 1..5 residual
}

function persistHold(orderId: string, affiliateUserId: string, level: number, amount: number, currency: string, reason: string): void {
  getDb().prepare(
    `INSERT INTO commission_holds (id, orderId, affiliateUserId, level, amount, currency, status, reason, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?, ?)
     ON CONFLICT(orderId, affiliateUserId, level) DO NOTHING`
  ).run(uid("hold"), orderId, affiliateUserId, level, amount, currency, reason.slice(0, 300), nowIso(), nowIso());
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

/**
 * Distribuye una venta PAID segÃºn el reparto definitivo. Idempotente por
 * orden (repetir devuelve lo mismo sin duplicar ledger ni holds).
 */
export function distributeSale(input: DistributeInput): DistributionResult {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, productId, creatorId, paymentAmount, currency, status FROM orders WHERE id = ?").get(input.orderId) as
    | { id: string; userId: string; productId: string; creatorId: string | null; paymentAmount: number; currency: string; status: string }
    | undefined;
  if (!order) throw new DistributionError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== input.buyerId) throw new DistributionError("OWNERSHIP", "La orden no pertenece al comprador");
  const orderTypeRow = db.prepare("SELECT orderType FROM orders WHERE id = ?").get(input.orderId) as { orderType: string } | undefined;
  if ((orderTypeRow?.orderType ?? "product") === "license" || order.productId.startsWith("license:")) {
    throw new DistributionError("LICENSE_ORDER", "Las licencias no pagan comisiones de afiliados (aportan 2% al Rewards Pool)");
  }
  if (order.status !== "PAID") throw new DistributionError("ORDER_NOT_PAID", "La orden no estÃ¡ pagada");

  const existing = db.prepare("SELECT account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note FROM commission_ledger WHERE orderId = ? ORDER BY rowid").all(order.id) as {
    account: string; affiliateUserId: string | null; recipientRef: string | null; level: number | null; percentage: number; amount: number; currency: string; status: LedgerStatus; note: string;
  }[];
  if (existing.length > 0) {
    return rebuildResult(order.id, order.paymentAmount, order.currency, existing);
  }

  const sale = order.paymentAmount;
  const currency = order.currency;
  const cents = (pct: number): number => Math.round(sale * pct);
  // Todo en centavos de USDT para que la suma sea exacta.
  const allocations: Allocation[] = [];
  const unallocated: { level: number | null; amount: number; reason: string }[] = [];
  const unlocks: UnlockEvent[] = [];
  let reserveCents = Math.round(sale * SPLIT_V2.reserve);

  const pushReserve = (centsAmount: number, note: string): void => {
    reserveCents += centsAmount;
    unallocated.push({ level: null, amount: centsAmount / 100, reason: note });
  };

  // --- Cadena de afiliados ---
  let directId: string | null = null;
  if (input.affiliateCode) {
    const resolved = resolveReferralCode(input.affiliateCode);
    if (resolved && requireRole(resolved, "affiliate")) directId = resolved;
  }
  const chain: string[] = directId ? [directId, ...getAncestors(directId)].slice(0, 6) : [];
  // Unicidad defensiva (los ciclos no pueden persistir, pero no se confÃ­a).
  const chainSet = new Set(chain);
  const chainValid = chainSet.size === chain.length;
  const buyerInChain = chain.includes(order.userId);
  const creatorInChain = order.creatorId ? chain.includes(order.creatorId) : false;

  // --- Fraude de la cadena ---
  const memberStatuses = new Map<string, RiskStatus>();
  for (const memberId of chain) {
    memberStatuses.set(memberId, memberId === order.userId ? getRiskProfile(memberId).riskStatus : evaluateUser(memberId, {}).riskStatus);
  }
  evaluateUser(order.userId, input.context ?? {});
  const rank: Record<RiskStatus, number> = { LOW_RISK: 0, MEDIUM_RISK: 1, HIGH_RISK: 2, REVIEW_REQUIRED: 3, BLOCKED: 4 };
  let chainRisk: RiskStatus = "LOW_RISK";
  for (const s of memberStatuses.values()) {
    if (rank[s] > rank[chainRisk]) chainRisk = s;
  }
  const held = chainRisk === "REVIEW_REQUIRED" || chainRisk === "BLOCKED" || !chainValid || buyerInChain || creatorInChain;
  if (held && chainRisk !== "REVIEW_REQUIRED" && chainRisk !== "BLOCKED") {
    // Retener implica revisiÃ³n aunque el score sea bajo (duplicados,
    // buyer/creador en cadena): el riesgo efectivo es REVIEW_REQUIRED.
    chainRisk = "REVIEW_REQUIRED";
  }
  let caseId: string | null = null;
  if (held) {
    const riskiest = chain.find((id) => (memberStatuses.get(id) ?? "LOW_RISK") === chainRisk) ?? directId ?? order.userId;
    caseId = ensureCaseWithOrder(riskiest, order.id, 85, buyerInChain ? "BUYER_IN_CHAIN" : creatorInChain ? "CREATOR_IN_CHAIN" : !chainValid ? "DUPLICATE_CHAIN" : `CHAIN_${chainRisk}`);
  }

  const allocStatus = (isAffiliateSplit: boolean): LedgerStatus => (isAffiliateSplit && held ? "PENDING_REVIEW" : "APPROVED");

  // --- Creador 45 + Crow 10 ---
  allocations.push({ account: "CREATOR", affiliateUserId: null, recipientRef: order.creatorId, level: null, percentage: SPLIT_V2.creator, amount: cents(SPLIT_V2.creator) / 100, currency, status: "APPROVED", note: "" });
  allocations.push({ account: "CROW_COMMISSION", affiliateUserId: null, recipientRef: "crow", level: null, percentage: SPLIT_V2.crow, amount: cents(SPLIT_V2.crow) / 100, currency, status: "APPROVED", note: "" });

  // --- Directo 30 ---
  const directInvalidReason =
    !directId ? "NO_DIRECT_AFFILIATE"
    : directId === order.userId ? "SELF_PURCHASE"
    : order.creatorId && directId === order.creatorId ? "CREATOR_AS_AFFILIATE"
    : !requireRole(directId, "affiliate") ? "NO_AFFILIATE_ROLE"
    : null;
  if (directInvalidReason) {
    pushReserve(cents(SPLIT_V2.direct), `UNALLOCATED_NETWORK_COMMISSION:${directInvalidReason}`);
    if (directId && directId !== order.userId) {
      recordSignal(directId, "SUSPICIOUS_ACTIVITY", `directo invÃ¡lido ${directInvalidReason} orden ${order.id}`);
    }
    audit("COMMISSION_HELD", { userId: directId, orderId: order.id, reason: directInvalidReason });
  } else if (directId) {
    allocations.push({ account: "AFFILIATE_DIRECT", affiliateUserId: directId, recipientRef: directId, level: 0, percentage: SPLIT_V2.direct, amount: cents(SPLIT_V2.direct) / 100, currency, status: allocStatus(true), note: "" });
    if (held) persistHold(order.id, directId, 0, cents(SPLIT_V2.direct) / 100, currency, `CHAIN_${chainRisk}`);
  }

  // --- Residuales 1..5 ---
  // DiseÃ±o: primero el destino ESTRUCTURAL (pago/activaciÃ³n/reserva segÃºn
  // validez del miembro y candados), despuÃ©s el HOLD (si held, la parte del
  // afiliado queda PENDING_REVIEW en vez de ir a reserva: al liberarse se
  // aprueba y se evalÃºa el unlock; la reserva solo recibe lo estructural).
  const members: ChainMember[] = chain.slice(1, 6).map((userId, i) => ({ userId, level: i + 1 }));
  for (const member of members) {
    const pct = SPLIT_V2.residuals[member.level - 1] as number;
    const names = ["", "LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5"] as const;
    // Miembro invÃ¡lido: buyer, creador o sin rol â†’ a reserva, nunca a otra persona.
    if (member.userId === order.userId) {
      pushReserve(cents(pct), `UNALLOCATED_NETWORK_COMMISSION:SELF_LEVEL_${member.level}`);
      continue;
    }
    if (order.creatorId && member.userId === order.creatorId) {
      pushReserve(cents(pct), `UNALLOCATED_NETWORK_COMMISSION:CREATOR_LEVEL_${member.level}`);
      continue;
    }
    if (!requireRole(member.userId, "affiliate")) {
      pushReserve(cents(pct), `UNALLOCATED_NETWORK_COMMISSION:NO_ROLE_L${member.level}`);
      continue;
    }
    const levelStatus = getLevelStatus(member.userId, member.level);
    const structural = isStructurallyQualifying(order, chain, directId, member.userId);
    const payFull = (note: string): void => {
      allocations.push({ account: names[member.level] as string, affiliateUserId: member.userId, recipientRef: member.userId, level: member.level, percentage: pct, amount: cents(pct) / 100, currency, status: allocStatus(true), note });
      if (held) persistHold(order.id, member.userId, member.level, cents(pct) / 100, currency, `CHAIN_${chainRisk}`);
    };
    if (levelStatus === "UNLOCKED") {
      payFull("");
      continue;
    }
    // Nivel LOCKED.
    if (member.level === 1 && structural) {
      // ActivaciÃ³n Ãºnica: 2.5 miembro / 2.5 Incentive Pool (+ unlock si no hay hold).
      const half = Math.round((sale * pct) / 2);
      allocations.push({ account: "LEVEL_1", affiliateUserId: member.userId, recipientRef: member.userId, level: 1, percentage: pct / 2, amount: half / 100, currency, status: allocStatus(true), note: "ACTIVATION_SPLIT" });
      allocations.push({ account: "CROW_EMERGENCY_RESERVE", affiliateUserId: null, recipientRef: "CROW_EMERGENCY_RESERVE", level: null, percentage: pct / 2, amount: (cents(pct) - half) / 100, currency, status: "APPROVED", note: "LEVEL_1_UNLOCK_EMERGENCY_CREDIT" });
      if (held) {
        persistHold(order.id, member.userId, 1, half / 100, currency, `CHAIN_${chainRisk}`);
      } else {
        unlocks.push(markUnlocked(member.userId, 1, order.id));
      }
      continue;
    }
    if (member.level > 1 && structural) {
      const req = getLevelRequirement(member.level);
      const prior = priorQualifyingSales(member.userId, member.level);
      if (req.requirementType === "VALID_SALES" && req.threshold !== null && prior + 1 >= req.threshold) {
        payFull("");
        if (!held) unlocks.push(markUnlocked(member.userId, member.level, order.id));
        continue;
      }
    }
    // Estructuralmente no calificante (auto-consumo, nivel bloqueado sin
    // requirement cumplido): a reserva con motivo.
    pushReserve(cents(pct), `UNALLOCATED_NETWORK_COMMISSION:${structural ? `LOCKED_L${member.level}` : `NON_QUALIFYING_L${member.level}`}`);
  }

  // --- Niveles sin miembro en la cadena: Â§14, a reserva (nunca a otra persona) ---
  const coveredLevels = new Set(members.map((m) => m.level));
  for (let level = 1; level <= 5; level++) {
    if (coveredLevels.has(level)) continue;
    const pct = SPLIT_V2.residuals[level - 1] as number;
    pushReserve(cents(pct), `UNALLOCATED_NETWORK_COMMISSION:NO_MEMBER_L${level}`);
  }

  // --- Ajuste de redondeo en Crow Reserve (integridad: suma == pago) ---
  // Lo no asignado a niveles vive SOLO en reserveCents (no como allocation),
  // asÃ­ que el reserve final es el reemplazo exacto, no una suma.
  const accounted = allocations.reduce((n, a) => n + Math.round(a.amount * 100), 0);
  const expected = Math.round(sale * 100);
  reserveCents = expected - accounted;
  allocations.push({ account: "CROW_RESERVE", affiliateUserId: null, recipientRef: "crow_reserve", level: null, percentage: SPLIT_V2.reserve, amount: reserveCents / 100, currency, status: "APPROVED", note: "INCL_ROUNDING_UNALLOCATED" });

  // --- Persistencia atÃ³mica ---
  persistLedger(order.id, allocations);
  return { orderId: order.id, saleAmount: sale, currency, chain, allocations, unlocks, unallocated, chainRisk, caseId };
}

interface OrderLike {
  id: string;
  userId: string;
  status: string;
}

/** Venta calificante ESTRUCTURAL para desbloqueo (sin mirar holds/fraude).
 * El fraude se evalÃºa aparte: con hold, la parte del afiliado queda
 * PENDING_REVIEW y el unlock se decide al liberar (finalizeReleasedOrder). */
function isStructurallyQualifying(
  order: OrderLike,
  chain: string[],
  directId: string | null,
  memberId: string
): boolean {
  if (order.status !== "PAID") return false;
  if (memberId === order.userId) return false;
  if (chain.includes(order.userId)) return false;
  if (directId === order.userId) return false;
  return true;
}

function persistLedger(orderId: string, allocations: Allocation[]): void {
  const db = getDb();
  const now = nowIso();
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const a of allocations) {
      db.prepare(
        `INSERT INTO commission_ledger (id, orderId, account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(uid("led"), orderId, a.account, a.affiliateUserId, a.recipientRef, a.level, a.percentage, a.amount, a.currency, a.status, a.note, now);
    }
    db.exec("COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // best-effort
    }
    throw err;
  }
}

function rebuildResult(
  orderId: string,
  saleAmount: number,
  currency: string,
  rows: { account: string; affiliateUserId: string | null; recipientRef: string | null; level: number | null; percentage: number; amount: number; currency: string; status: LedgerStatus; note: string }[]
): DistributionResult {
  const db = getDb();
  const chain = db.prepare("SELECT affiliateUserId FROM commission_ledger WHERE orderId = ? AND level = 0 LIMIT 1").get(orderId) as { affiliateUserId: string | null } | undefined;
  const chainIds: string[] = [];
  if (chain?.affiliateUserId) {
    chainIds.push(chain.affiliateUserId, ...getAncestors(chain.affiliateUserId).slice(0, 5));
  }
  return {
    orderId,
    saleAmount,
    currency,
    chain: chainIds,
    allocations: rows.map((r) => ({ ...r })),
    unlocks: [],
    unallocated: [],
    chainRisk: rows.some((r) => r.status === "PENDING_REVIEW" || r.status === "BLOCKED") ? "REVIEW_REQUIRED" : "LOW_RISK",
    caseId: null,
  };
}

/**
 * Tras liberar holds (admin), evalÃºa unlocks pendientes y aprueba el ledger.
 * Llamar despuÃ©s de reviewCase(MARK_SAFE/UNBLOCK_COMMISSION) con orderId.
 */
export function finalizeReleasedOrder(orderId: string): { approved: number; unlocks: UnlockEvent[] } {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, creatorId, paymentAmount, currency, status FROM orders WHERE id = ?").get(orderId) as
    | { id: string; userId: string; creatorId: string | null; paymentAmount: number; currency: string; status: string }
    | undefined;
  if (!order || order.status !== "PAID") throw new DistributionError("ORDER_NOT_PAID", "Orden no pagada");
  const unlocks: UnlockEvent[] = [];
  let approved = 0;
  const pending = db.prepare("SELECT affiliateUserId, level FROM commission_ledger WHERE orderId = ? AND status = 'PENDING_REVIEW' AND affiliateUserId IS NOT NULL").all(orderId) as {
    affiliateUserId: string; level: number;
  }[];
  // Si algÃºn hold sigue retenido/bloqueado, no finalizar.
  const stillHeld = db.prepare("SELECT COUNT(*) AS n FROM commission_holds WHERE orderId = ? AND status IN ('PENDING_REVIEW','BLOCKED')").get(orderId) as { n: number };
  if (stillHeld.n > 0) return { approved: 0, unlocks };
  const chain = db.prepare("SELECT affiliateUserId FROM commission_ledger WHERE orderId = ? AND level = 0 LIMIT 1").get(orderId) as { affiliateUserId: string | null } | undefined;
  const chainIds: string[] = chain?.affiliateUserId ? [chain.affiliateUserId, ...getAncestors(chain.affiliateUserId).slice(0, 5)] : [];
  const directId = chainIds[0] ?? null;
  for (const p of pending) {
    if (p.level === 0) {
      db.prepare("UPDATE commission_ledger SET status = 'APPROVED' WHERE orderId = ? AND level = 0").run(orderId);
      approved += 1;
      continue;
    }
    if (p.level >= 1 && p.level <= 5 && getLevelStatus(p.affiliateUserId, p.level) === "LOCKED") {
      // El admin ya validÃ³ la venta al liberar: solo falta lo estructural.
      if (isStructurallyQualifying({ id: order.id, userId: order.userId, status: order.status }, chainIds, directId, p.affiliateUserId)) {
        if (p.level === 1) {
          // La activaciÃ³n ya dividiÃ³ el monto al distribuir; solo se desbloquea.
          unlocks.push(markUnlocked(p.affiliateUserId, 1, orderId));
        } else {
          const req = getLevelRequirement(p.level);
          if (req.requirementType === "VALID_SALES" && req.threshold !== null && priorQualifyingSales(p.affiliateUserId, p.level) + 1 >= req.threshold) {
            unlocks.push(markUnlocked(p.affiliateUserId, p.level, orderId));
          } else {
            continue;
          }
        }
      } else {
        continue;
      }
    }
    db.prepare("UPDATE commission_ledger SET status = 'APPROVED' WHERE orderId = ? AND affiliateUserId = ? AND level = ?").run(orderId, p.affiliateUserId, p.level);
    approved += 1;
  }
  return { approved, unlocks };
}

export function getOrderLedger(orderId: string): Allocation[] {
  const rows = getDb().prepare("SELECT account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note FROM commission_ledger WHERE orderId = ? ORDER BY rowid").all(orderId) as {
    account: string; affiliateUserId: string | null; recipientRef: string | null; level: number | null; percentage: number; amount: number; currency: string; status: LedgerStatus; note: string;
  }[];
  return rows;
}

/** Balance contable de una cuenta (suma APPROVED/PAID menos REVERSED). */
export function ledgerBalance(account: string): number {
  const row = getDb().prepare(
    "SELECT COALESCE(SUM(CASE WHEN status = 'REVERSED' THEN -amount WHEN status IN ('APPROVED','PAID') THEN amount ELSE 0 END), 0) AS total FROM commission_ledger WHERE account = ?"
  ).get(account) as { total: number };
  return Math.round(row.total * 100) / 100;
}

/** ReversiÃ³n de una allocation (append-only: marca REVERSED, no borra). */
export function reverseLedgerEntry(ledgerId: string, reason: string, adminId: string): void {
  const db = getDb();
  const row = db.prepare("SELECT status FROM commission_ledger WHERE id = ?").get(ledgerId) as { status: LedgerStatus } | undefined;
  if (!row) throw new DistributionError("ENTRY_NOT_FOUND", "Movimiento inexistente");
  if (row.status === "REVERSED") return;
  db.prepare("UPDATE commission_ledger SET status = 'REVERSED', note = ? WHERE id = ?").run(reason.slice(0, 300), ledgerId);
  audit("COMMISSION_BLOCKED", { userId: adminId, reason: `REVERSE_LEDGER:${reason.slice(0, 200)}`, metadata: { ledgerId } });
}
