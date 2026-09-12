// ============================================
// CROW REWARDS - tabla definitiva de hitos (NO modificar valores)
// ============================================
// Centralizada aquí. CP acumulativos, no se consumen.

export interface RewardTier {
  level: number;
  cpRequired: number;
  amount: number;
}

export const REWARD_TIERS: RewardTier[] = [
  { level: 1, cpRequired: 5000, amount: 50 },
  { level: 2, cpRequired: 10000, amount: 100 },
  { level: 3, cpRequired: 25000, amount: 250 },
  { level: 4, cpRequired: 50000, amount: 500 },
  { level: 5, cpRequired: 100000, amount: 1500 },
  { level: 6, cpRequired: 250000, amount: 3500 },
  { level: 7, cpRequired: 500000, amount: 15000 },
  { level: 8, cpRequired: 1000000, amount: 30000 },
];

export type RewardStatus =
  | "UNLOCKED"
  | "WAITING_FOR_REWARDS_POOL"
  | "CLAIMED"
  | "PAID"
  | "REVIEW_REQUIRED";

export function tierForLevel(level: number): RewardTier | null {
  return REWARD_TIERS.find((t) => t.level === level) ?? null;
}

/** Hitos alcanzados con este total (CP no se consumen). */
export function reachedTiers(totalCp: number): RewardTier[] {
  return REWARD_TIERS.filter((t) => totalCp >= t.cpRequired);
}

/** Próximo hito o null si ya alcanzó todos. */
export function nextTier(totalCp: number): RewardTier | null {
  return REWARD_TIERS.find((t) => totalCp < t.cpRequired) ?? null;
}
