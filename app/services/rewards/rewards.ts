// ============================================
// REWARDS - hitos, reclamo y estados (server-side)
// ============================================
// UNLOCKED al alcanzar el hito (CP no se consumen). CLAIMED al reclamar.
// PAID solo con pago REAL registrado (referencia obligatoria). Sin fondos
// suficientes → WAITING_FOR_REWARDS_POOL (se conserva todo).

import { getDb } from "../db/database";
import { getRiskProfile } from "../fraud/antifraud";
import { poolBalances } from "./pool";
import { nextTier, type RewardStatus } from "./tiers";

export class RewardError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RewardRow {
  id: string;
  userId: string;
  level: number;
  cpRequired: number;
  amount: number;
  status: RewardStatus;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  paidAt: string | null;
}

export function listRewards(userId: string): RewardRow[] {
  return getDb().prepare("SELECT * FROM rewards WHERE userId = ? ORDER BY level ASC").all(userId) as unknown as RewardRow[];
}

/** Resumen para dashboard: total, próximo hito, progreso, historial. */
export function rewardsSummary(userId: string): {
  totalCp: number;
  next: { level: number; cpRequired: number; amount: number; missing: number } | null;
  unlocked: RewardRow[];
  history: RewardRow[];
} {
  const db = getDb();
  const vol = db.prepare("SELECT totalCp FROM user_volume WHERE userId = ?").get(userId) as { totalCp: number } | undefined;
  const totalCp = vol?.totalCp ?? 0;
  const history = listRewards(userId);
  const unlocked = history.filter((r) => r.status !== "PAID");
  const tier = nextTier(totalCp);
  return {
    totalCp,
    next: tier ? { level: tier.level, cpRequired: tier.cpRequired, amount: tier.amount, missing: tier.cpRequired - totalCp } : null,
    unlocked,
    history,
  };
}

/**
 * Reclama una recompensa: UNLOCKED → CLAIMED (si hay fondos) o
 * WAITING_FOR_REWARDS_POOL (si no). REVIEW si antifraud lo exige.
 */
export function claimReward(userId: string, rewardId: string): RewardRow {
  const db = getDb();
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(rewardId) as unknown as RewardRow | undefined;
  if (!reward) throw new RewardError("REWARD_NOT_FOUND", "Recompensa inexistente");
  if (reward.userId !== userId) throw new RewardError("OWNERSHIP", "Recompensa ajena");
  if (reward.status !== "UNLOCKED" && reward.status !== "WAITING_FOR_REWARDS_POOL") {
    throw new RewardError("BAD_STATE", `Estado ${reward.status} no reclamable`);
  }
  const risk = getRiskProfile(userId);
  const now = new Date().toISOString();
  if (risk.riskStatus === "BLOCKED" || risk.riskStatus === "REVIEW_REQUIRED") {
    db.prepare("UPDATE rewards SET status = 'REVIEW_REQUIRED', updatedAt = ? WHERE id = ?").run(now, rewardId);
    return { ...reward, status: "REVIEW_REQUIRED", updatedAt: now };
  }
  if (poolBalances().balance < reward.amount - 0.0001) {
    db.prepare("UPDATE rewards SET status = 'WAITING_FOR_REWARDS_POOL', updatedAt = ? WHERE id = ?").run(now, rewardId);
    return { ...reward, status: "WAITING_FOR_REWARDS_POOL", updatedAt: now };
  }
  db.prepare("UPDATE rewards SET status = 'CLAIMED', claimedAt = ?, updatedAt = ? WHERE id = ? AND status IN ('UNLOCKED','WAITING_FOR_REWARDS_POOL')").run(
    now,
    now,
    rewardId
  );
  return { ...reward, status: "CLAIMED", claimedAt: now, updatedAt: now };
}

/** Promueve WAITING → UNLOCKED cuando el pool vuelve a tener fondos. */
export function promoteWaitingRewards(): number {
  const db = getDb();
  const balance = poolBalances().balance;
  const rows = db.prepare("SELECT id, amount FROM rewards WHERE status = 'WAITING_FOR_REWARDS_POOL' ORDER BY level ASC").all() as {
    id: string;
    amount: number;
  }[];
  let promoted = 0;
  const now = new Date().toISOString();
  for (const row of rows) {
    if (balance >= row.amount - 0.0001) {
      db.prepare("UPDATE rewards SET status = 'UNLOCKED', updatedAt = ? WHERE id = ? AND status = 'WAITING_FOR_REWARDS_POOL'").run(now, row.id);
      promoted += 1;
    }
  }
  return promoted;
}
