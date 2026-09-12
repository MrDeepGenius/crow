// ============================================
// LEDGER - entitlements, reviews, afiliados, wallet
// ============================================
// Toda modificación de dinero genera transacción. Sin balances negativos:
// los retiros validan fondos y las reversiones respetan lo disponible.

import type {
  AffiliateClick,
  AffiliateLink,
  AffiliateProfile,
  AffiliateSettings,
  Entitlement,
  Money,
  Order,
  ReferralClick,
  ReferralCode,
  ReferralKind,
  ReferralRegistration,
  Review,
  Wallet,
  WalletTransaction,
  WalletTxType,
  Withdrawal,
} from "./marketTypes";
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

const K = {
  entitlements: "crow_market_entitlements",
  reviews: "crow_market_reviews",
  affiliateProfiles: "crow_market_affiliate_profiles",
  affiliateLinks: "crow_market_affiliate_links",
  affiliateClicks: "crow_market_affiliate_clicks",
  wallets: "crow_market_wallets",
  transactions: "crow_market_transactions",
  withdrawals: "crow_market_withdrawals",
  referralCodes: "crow_market_referral_codes",
  referralClicks: "crow_market_referral_clicks",
  referralRegistrations: "crow_market_referral_registrations",
  affiliateSettings: "crow_market_affiliate_settings",
};

export function setLinkActive(linkId: string, active: boolean, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const all = read<AffiliateLink[]>(s, K.affiliateLinks, []);
  const link = all.find((l) => l.id === linkId);
  if (!link) return false;
  link.active = active;
  write(s, K.affiliateLinks, all);
  return true;
}

export function listAffiliateLinks(affiliateId: string, storage?: StorageLike): AffiliateLink[] {
  return read<AffiliateLink[]>(resolveStorage(storage), K.affiliateLinks, []).filter(
    (l) => l.affiliateId === affiliateId
  );
}

function resolveStorage(override?: StorageLike): StorageLike {
  return override ?? browserStorage() ?? memoryStorage;
}

function read<T>(s: StorageLike, key: string, fallback: T): T {
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(s: StorageLike, key: string, value: unknown): void {
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    // no bloquea
  }
}

function zero(currency: string): Money {
  return { amount: 0, currency };
}

// ---------- Entitlements ----------

export function listEntitlements(storage?: StorageLike): Entitlement[] {
  return read<Entitlement[]>(resolveStorage(storage), K.entitlements, []);
}

export function hasAccess(userId: string, productId: string, storage?: StorageLike): boolean {
  return listEntitlements(storage).some(
    (e) => e.userId === userId && e.productId === productId && !e.revokedAt
  );
}

export function grantEntitlement(order: Order, storage?: StorageLike): Entitlement {
  const s = resolveStorage(storage);
  const existing = listEntitlements(s).find(
    (e) => e.orderId === order.id && !e.revokedAt
  );
  if (existing) return existing;
  const entitlement: Entitlement = {
    id: uid("ent"),
    userId: order.buyerId,
    productId: order.productId,
    orderId: order.id,
    grantedAt: new Date().toISOString(),
    revokedAt: null,
  };
  write(s, K.entitlements, [...listEntitlements(s), entitlement]);
  return entitlement;
}

export function revokeEntitlement(orderId: string, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const all = listEntitlements(s);
  const ent = all.find((e) => e.orderId === orderId && !e.revokedAt);
  if (!ent) return false;
  ent.revokedAt = new Date().toISOString();
  write(s, K.entitlements, all);
  return true;
}

// ---------- Reviews (solo compra PAID, una por producto) ----------

export function listReviews(productId?: string, storage?: StorageLike): Review[] {
  const all = read<Review[]>(resolveStorage(storage), K.reviews, []);
  return productId ? all.filter((r) => r.productId === productId) : all;
}

export function canReview(userId: string, productId: string, orderId: string, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  if (listReviews(undefined, s).some((r) => r.userId === userId && r.productId === productId)) return false;
  return true;
}

export function addReview(
  input: { userId: string; productId: string; orderId: string; rating: number; comment: string },
  storage?: StorageLike
): Review | null {
  const s = resolveStorage(storage);
  if (!canReview(input.userId, input.productId, input.orderId, s)) return null;
  if (input.rating < 1 || input.rating > 5 || !input.comment.trim()) return null;
  // Anti-spam: comentario mínimo y sin URLs.
  if (input.comment.trim().length < 10 || /https?:\/\//i.test(input.comment)) return null;
  const review: Review = {
    id: uid("rev"),
    userId: input.userId,
    productId: input.productId,
    orderId: input.orderId,
    rating: Math.round(input.rating),
    comment: input.comment.trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  write(s, K.reviews, [...listReviews(undefined, s), review]);
  return review;
}

// ---------- Afiliados ----------

export function listAffiliateProfiles(storage?: StorageLike): AffiliateProfile[] {
  return read<AffiliateProfile[]>(resolveStorage(storage), K.affiliateProfiles, []);
}

export function getAffiliateProfile(userId: string, storage?: StorageLike): AffiliateProfile | null {
  return listAffiliateProfiles(storage).find((p) => p.userId === userId) ?? null;
}

export function saveAffiliateProfile(profile: AffiliateProfile, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  const all = listAffiliateProfiles(s);
  const idx = all.findIndex((p) => p.id === profile.id);
  write(s, K.affiliateProfiles, idx >= 0 ? all.map((p) => (p.id === profile.id ? profile : p)) : [...all, profile]);
}

export function createAffiliateProfile(userId: string, storage?: StorageLike): AffiliateProfile {
  const s = resolveStorage(storage);
  const existing = getAffiliateProfile(userId, s);
  if (existing) return existing;
  const profile: AffiliateProfile = {
    id: uid("aff"),
    userId,
    code: `aff-${userId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "x"}-${Date.now().toString(36).slice(-4)}`,
    createdAt: new Date().toISOString(),
  };
  write(s, K.affiliateProfiles, [...read<AffiliateProfile[]>(s, K.affiliateProfiles, []), profile]);
  return profile;
}

export function getAffiliateLink(affiliateId: string, productId: string, storage?: StorageLike): AffiliateLink | null {
  return read<AffiliateLink[]>(resolveStorage(storage), K.affiliateLinks, []).find(
    (l) => l.affiliateId === affiliateId && l.productId === productId
  ) ?? null;
}

export function createAffiliateLink(affiliateId: string, productId: string, storage?: StorageLike): AffiliateLink {
  const s = resolveStorage(storage);
  const existing = getAffiliateLink(affiliateId, productId, s);
  if (existing) return existing;
  const link: AffiliateLink = {
    id: uid("link"),
    affiliateId,
    productId,
    code: `r-${Date.now().toString(36)}${affiliateId.slice(-4)}`,
    createdAt: new Date().toISOString(),
  };
  write(s, K.affiliateLinks, [...read<AffiliateLink[]>(s, K.affiliateLinks, []), link]);
  return link;
}

export function findLinkByCode(code: string, storage?: StorageLike): AffiliateLink | null {
  return read<AffiliateLink[]>(resolveStorage(storage), K.affiliateLinks, []).find((l) => l.code === code) ?? null;
}

export function recordClick(affiliateId: string, productId: string, storage?: StorageLike): AffiliateClick {
  const s = resolveStorage(storage);
  const click: AffiliateClick = {
    id: uid("clk"),
    affiliateId,
    productId,
    timestamp: new Date().toISOString(),
  };
  write(s, K.affiliateClicks, [...read<AffiliateClick[]>(s, K.affiliateClicks, []), click]);
  return click;
}

export function listClicks(affiliateId?: string, storage?: StorageLike): AffiliateClick[] {
  const all = read<AffiliateClick[]>(resolveStorage(storage), K.affiliateClicks, []);
  return affiliateId ? all.filter((c) => c.affiliateId === affiliateId) : all;
}

// ---------- Wallet + ledger ----------

function emptyWallet(userId: string, currency: string): Wallet {
  return { userId, available: zero(currency), pending: zero(currency), withdrawalPending: zero(currency), paidOut: zero(currency) };
}

export function getWallet(userId: string, currency = "USD", storage?: StorageLike): Wallet {
  const s = resolveStorage(storage);
  const wallets = read<Wallet[]>(s, K.wallets, []);
  const found = wallets.find((w) => w.userId === userId);
  if (found) return found;
  const created = emptyWallet(userId, currency);
  write(s, K.wallets, [...wallets, created]);
  return created;
}

function saveWallet(wallet: Wallet, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  const wallets = read<Wallet[]>(s, K.wallets, []);
  const idx = wallets.findIndex((w) => w.userId === wallet.userId);
  write(s, K.wallets, idx >= 0 ? wallets.map((w) => (w.userId === wallet.userId ? wallet : w)) : [...wallets, wallet]);
}

export function listTransactions(userId?: string, storage?: StorageLike): WalletTransaction[] {
  const all = read<WalletTransaction[]>(resolveStorage(storage), K.transactions, []);
  return userId ? all.filter((t) => t.userId === userId) : all;
}

function addTransaction(
  tx: Omit<WalletTransaction, "id" | "createdAt">,
  s: StorageLike
): WalletTransaction {
  const full: WalletTransaction = { ...tx, id: uid("tx"), createdAt: new Date().toISOString() };
  write(s, K.transactions, [...read<WalletTransaction[]>(s, K.transactions, []), full]);
  return full;
}

/** Tipos que representan ganancia por comisiones (directas o residuales). */
export function isCommissionTx(type: string): boolean {
  return type === "AFFILIATE_COMMISSION" || type === "RESIDUAL_COMMISSION";
}

export const RESIDUAL_PERCENTS = [5, 3, 2] as const;

/**
 * Cadena de upline hasta 3 niveles: quién invitó al vendedor, y así.
 * Solo primer nivel por registro; la cadena emerge transitivamente.
 * Los residuales salen del 10% de plataforma (5+3+2=10).
 */
export function computeResidualChain(
  sellerAffiliateId: string,
  storage?: StorageLike
): { affiliateId: string; level: 1 | 2 | 3 }[] {
  const s = resolveStorage(storage);
  const chain: { affiliateId: string; level: 1 | 2 | 3 }[] = [];
  const seen = new Set<string>([sellerAffiliateId]);
  const start = listAffiliateProfiles(s).find((p) => p.id === sellerAffiliateId);
  let currentUserId: string | null = start ? start.userId : null;
  for (let level = 1; level <= 3; level++) {
    if (!currentUserId) break;
    const regs = read<ReferralRegistration[]>(s, K.referralRegistrations, []);
    const reg = regs.find((r) => r.kind === "affiliate" && r.newUserId === currentUserId);
    if (!reg || seen.has(reg.ownerAffiliateId)) break;
    seen.add(reg.ownerAffiliateId);
    chain.push({ affiliateId: reg.ownerAffiliateId, level: level as 1 | 2 | 3 });
    const owner = listAffiliateProfiles(s).find((p) => p.id === reg.ownerAffiliateId);
    currentUserId = owner ? owner.userId : null;
  }
  return chain;
}

/** Registra una venta PAID en el ledger (creador + afiliado + plataforma).
 * Idempotente: si la orden ya fue posteada, no duplica (reintentos seguros). */
export function postSaleToLedger(order: Order, storage?: StorageLike): WalletTransaction[] {
  const s = resolveStorage(storage);
  const existing = read<WalletTransaction[]>(s, K.transactions, []).filter(
    (t) => t.referenceId === order.id && (t.type === "SALE" || isCommissionTx(t.type) || t.type === "PLATFORM_FEE")
  );
  if (existing.length > 0) return existing;
  const created: WalletTransaction[] = [];
  const creatorWallet = getWallet(order.creatorId, order.amount.currency, s);
  creatorWallet.pending = {
    amount: creatorWallet.pending.amount + order.creatorShare.amount,
    currency: order.amount.currency,
  };
  saveWallet(creatorWallet, s);
  created.push(
    addTransaction(
      { userId: order.creatorId, type: "SALE", amount: order.creatorShare, referenceType: "order", referenceId: order.id, status: "PENDING" },
      s
    )
  );
  if (order.affiliateId && order.affiliateCommission.amount > 0) {
    const affWallet = getWallet(order.affiliateId, order.amount.currency, s);
    affWallet.pending = {
      amount: affWallet.pending.amount + order.affiliateCommission.amount,
      currency: order.amount.currency,
    };
    saveWallet(affWallet, s);
    created.push(
      addTransaction(
        { userId: order.affiliateId, type: "AFFILIATE_COMMISSION", amount: order.affiliateCommission, referenceType: "order", referenceId: order.id, status: "PENDING" },
        s
      )
    );
  }
  // Residuales 3 niveles (5/3/2) con cargo al fee de plataforma.
  let residualsTotal = 0;
  if (order.affiliateId) {
    for (const { affiliateId, level } of computeResidualChain(order.affiliateId, s)) {
      const amount = Math.round(((order.amount.amount * RESIDUAL_PERCENTS[level - 1]) / 100) * 100) / 100;
      if (amount <= 0) continue;
      residualsTotal = Math.round((residualsTotal + amount) * 100) / 100;
      const wallet = getWallet(affiliateId, order.amount.currency, s);
      wallet.pending = { amount: wallet.pending.amount + amount, currency: order.amount.currency };
      saveWallet(wallet, s);
      created.push(
        addTransaction(
          { userId: affiliateId, type: "RESIDUAL_COMMISSION", amount: { amount, currency: order.amount.currency }, referenceType: "order", referenceId: order.id, level, status: "PENDING" },
          s
        )
      );
    }
  }
  const platformNet = Math.round((order.platformFee.amount - residualsTotal) * 100) / 100;
  created.push(
    addTransaction(
      { userId: "platform", type: "PLATFORM_FEE", amount: { amount: platformNet, currency: order.platformFee.currency }, referenceType: "order", referenceId: order.id, status: "AVAILABLE" },
      s
    )
  );
  return created;
}

/** Revierte una venta reembolsada: revierte pendientes sin generar negativos. */
export function reverseSale(order: Order, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const txs = read<WalletTransaction[]>(s, K.transactions, []);
  const created: WalletTransaction[] = [];
  let changed = false;
  for (const tx of txs) {
    if (tx.referenceId !== order.id || tx.status !== "PENDING") continue;
    if (tx.type !== "SALE" && !isCommissionTx(tx.type)) continue;
    const wallet = getWallet(tx.userId, tx.amount.currency, s);
    const deduction = Math.min(wallet.pending.amount, tx.amount.amount);
    wallet.pending = { amount: wallet.pending.amount - deduction, currency: wallet.pending.currency };
    saveWallet(wallet, s);
    tx.status = "REVERSED";
    changed = true;
    created.push({
      id: uid("tx"),
      userId: tx.userId,
      type: "REFUND",
      amount: { amount: -deduction, currency: tx.amount.currency },
      referenceType: "order",
      referenceId: order.id,
      status: "AVAILABLE",
      createdAt: new Date().toISOString(),
    });
  }
  if (changed) write(s, K.transactions, [...txs, ...created]);
  return changed;
}

/** Libera fondos pendientes a disponibles (clearing; solo sistema/admin). */
export function releasePending(userId: string, actor: "system" | "admin", storage?: StorageLike): boolean {
  if (actor !== "system" && actor !== "admin") return false;
  const s = resolveStorage(storage);
  const wallet = getWallet(userId, "USD", s);
  if (wallet.pending.amount <= 0) return false;
  const txs = read<WalletTransaction[]>(s, K.transactions, []);
  let released = 0;
  for (const tx of txs) {
    if (tx.userId !== userId || tx.status !== "PENDING") continue;
    if (tx.type !== "SALE" && !isCommissionTx(tx.type)) continue;
    released += tx.amount.amount;
    tx.status = "AVAILABLE";
  }
  if (released <= 0) return false;
  wallet.pending = { amount: Math.max(0, wallet.pending.amount - released), currency: wallet.pending.currency };
  wallet.available = { amount: wallet.available.amount + released, currency: wallet.available.currency };
  saveWallet(wallet, s);
  write(s, K.transactions, txs);
  return true;
}

// ---------- Retiros ----------

export function listWithdrawals(userId?: string, storage?: StorageLike): Withdrawal[] {
  const all = read<Withdrawal[]>(resolveStorage(storage), K.withdrawals, []);
  return userId ? all.filter((w) => w.userId === userId) : all;
}

export function requestWithdrawal(
  userId: string,
  amount: number,
  method: Withdrawal["method"],
  address: string,
  storage?: StorageLike
): { ok: boolean; error?: string; withdrawal?: Withdrawal } {
  const s = resolveStorage(storage);
  const config = getPlatformConfig(s);
  if (!address.trim() || address.trim().length < 20) {
    return { ok: false, error: "Dirección inválida." };
  }
  if (!(amount > 0)) return { ok: false, error: "Monto inválido." };
  if (amount < config.withdrawalMinUsdt) {
    return { ok: false, error: `Mínimo ${config.withdrawalMinUsdt} USDT.` };
  }
  const wallet = getWallet(userId, "USD", s);
  if (amount > wallet.available.amount) {
    return { ok: false, error: "Saldo insuficiente." };
  }
  const feeAmount = Math.round(((amount * config.withdrawalFeePercent) / 100) * 100) / 100;
  const withdrawal: Withdrawal = {
    id: uid("wd"),
    userId,
    amount: { amount, currency: "USD" },
    fee: { amount: feeAmount, currency: "USD" },
    net: { amount: Math.round((amount - feeAmount) * 100) / 100, currency: "USD" },
    method,
    address: address.trim(),
    status: "REQUESTED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  wallet.available = { amount: wallet.available.amount - amount, currency: wallet.available.currency };
  wallet.withdrawalPending = { amount: wallet.withdrawalPending.amount + amount, currency: wallet.withdrawalPending.currency };
  saveWallet(wallet, s);
  addTransaction(
    { userId, type: "WITHDRAWAL", amount: { amount: -amount, currency: "USD" }, referenceType: "withdrawal", referenceId: withdrawal.id, status: "PENDING" },
    s
  );
  write(s, K.withdrawals, [...read<Withdrawal[]>(s, K.withdrawals, []), withdrawal]);
  return { ok: true, withdrawal };
}

export function settleWithdrawal(id: string, status: "COMPLETED" | "REJECTED" | "CANCELLED", storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const all = read<Withdrawal[]>(s, K.withdrawals, []);
  const wd = all.find((w) => w.id === id);
  if (!wd || wd.status !== "REQUESTED") return false;
  wd.status = status;
  wd.updatedAt = new Date().toISOString();
  const wallet = getWallet(wd.userId, "USD", s);
  wallet.withdrawalPending = {
    amount: Math.max(0, wallet.withdrawalPending.amount - wd.amount.amount),
    currency: wallet.withdrawalPending.currency,
  };
  if (status === "COMPLETED") {
    wallet.paidOut = { amount: wallet.paidOut.amount + wd.net.amount, currency: wallet.paidOut.currency };
    addTransaction(
      { userId: wd.userId, type: "WITHDRAWAL_FEE", amount: { amount: -wd.fee.amount, currency: "USD" }, referenceType: "withdrawal", referenceId: wd.id, status: "AVAILABLE" },
      s
    );
    // Las comisiones disponibles más antiguas pasan a PAID hasta cubrir el retiro.
    const txs = read<WalletTransaction[]>(s, K.transactions, []);
    let remaining = wd.amount.amount;
    for (const tx of txs) {
      if (remaining <= 0) break;
      if (tx.userId !== wd.userId || tx.status !== "AVAILABLE") continue;
      if (tx.type !== "SALE" && !isCommissionTx(tx.type)) continue;
      if (tx.amount.amount <= remaining + 1e-9) {
        tx.status = "PAID";
        remaining = Math.round((remaining - tx.amount.amount) * 100) / 100;
      }
    }
    write(s, K.transactions, txs);
  } else {
    wallet.available = { amount: wallet.available.amount + wd.amount.amount, currency: wallet.available.currency };
  }
  saveWallet(wallet, s);
  write(s, K.withdrawals, all);
  return true;
}

// ---------- Referidos (códigos independientes) ----------

function referralCodeFor(ownerAffiliateId: string, kind: ReferralKind): string {
  const prefix = kind === "affiliate" ? "CROW-A" : "CROW-C";
  let hash = 0;
  const seed = `${ownerAffiliateId}:${kind}`;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 46656;
  return `${prefix}${hash.toString(36).toUpperCase().padStart(3, "0")}${ownerAffiliateId.slice(-3).toUpperCase()}`;
}

export function getOrCreateReferralCode(
  ownerAffiliateId: string,
  kind: ReferralKind,
  storage?: StorageLike
): ReferralCode {
  const s = resolveStorage(storage);
  const all = read<ReferralCode[]>(s, K.referralCodes, []);
  const existing = all.find((c) => c.ownerAffiliateId === ownerAffiliateId && c.kind === kind);
  if (existing) return existing;
  let code = referralCodeFor(ownerAffiliateId, kind);
  if (all.some((c) => c.code === code)) code = `${code}-${Date.now().toString(36).slice(-3).toUpperCase()}`;
  const created: ReferralCode = {
    id: uid("ref"),
    ownerAffiliateId,
    kind,
    code,
    createdAt: new Date().toISOString(),
  };
  write(s, K.referralCodes, [...all, created]);
  return created;
}

export function findReferralByCode(code: string, storage?: StorageLike): ReferralCode | null {
  return read<ReferralCode[]>(resolveStorage(storage), K.referralCodes, []).find((c) => c.code === code) ?? null;
}

export function recordReferralClick(code: string, storage?: StorageLike): ReferralClick | null {
  const s = resolveStorage(storage);
  const ref = findReferralByCode(code, s);
  if (!ref) return null;
  const click: ReferralClick = { id: uid("rclk"), code, kind: ref.kind, timestamp: new Date().toISOString() };
  write(s, K.referralClicks, [...read<ReferralClick[]>(s, K.referralClicks, []), click]);
  return click;
}

export function listReferralClicks(code: string, storage?: StorageLike): ReferralClick[] {
  return read<ReferralClick[]>(resolveStorage(storage), K.referralClicks, []).filter((c) => c.code === code);
}

export function registerReferral(
  code: string,
  newUserId: string,
  storage?: StorageLike
): ReferralRegistration | null {
  const s = resolveStorage(storage);
  const ref = findReferralByCode(code, s);
  const cleanId = newUserId.trim();
  if (!ref || !cleanId) return null;
  const all = read<ReferralRegistration[]>(s, K.referralRegistrations, []);
  const existing = all.find((r) => r.code === code && r.newUserId === cleanId);
  if (existing) return existing;
  const created: ReferralRegistration = {
    id: uid("rreg"),
    code,
    kind: ref.kind,
    ownerAffiliateId: ref.ownerAffiliateId,
    newUserId: cleanId,
    timestamp: new Date().toISOString(),
  };
  write(s, K.referralRegistrations, [...all, created]);
  return created;
}

export function listReferralRegistrations(
  ownerAffiliateId: string,
  kind?: ReferralKind,
  storage?: StorageLike
): ReferralRegistration[] {
  return read<ReferralRegistration[]>(resolveStorage(storage), K.referralRegistrations, []).filter(
    (r) => r.ownerAffiliateId === ownerAffiliateId && (!kind || r.kind === kind)
  );
}

// ---------- Configuración del afiliado (balances no editables) ----------

export function getAffiliateSettings(affiliateId: string, storage?: StorageLike): AffiliateSettings | null {
  return read<AffiliateSettings[]>(resolveStorage(storage), K.affiliateSettings, []).find(
    (x) => x.affiliateId === affiliateId
  ) ?? null;
}

export function saveAffiliateSettings(
  settings: Omit<AffiliateSettings, "updatedAt">,
  storage?: StorageLike
): AffiliateSettings {
  const s = resolveStorage(storage);
  const all = read<AffiliateSettings[]>(s, K.affiliateSettings, []);
  const full: AffiliateSettings = { ...settings, updatedAt: new Date().toISOString() };
  const idx = all.findIndex((x) => x.affiliateId === settings.affiliateId);
  write(s, K.affiliateSettings, idx >= 0 ? all.map((x) => (x.affiliateId === settings.affiliateId ? full : x)) : [...all, full]);
  return full;
}

// ---------- Notificaciones derivadas (sin inventar eventos) ----------

export interface AffiliateNotification {
  id: string;
  kind: "sale" | "commission_available" | "withdrawal" | "referral_affiliate" | "referral_creator";
  title: string;
  detail: string;
  timestamp: string;
}

export function buildAffiliateNotifications(
  affiliateId: string,
  orders: { id: string; productId: string; affiliateCommission: { amount: number }; status: string; paidAt: string | null; createdAt: string }[],
  productTitleOf: (productId: string) => string,
  storage?: StorageLike
): AffiliateNotification[] {
  const s = resolveStorage(storage);
  const notes: AffiliateNotification[] = [];
  for (const o of orders.filter((x) => x.status === "PAID")) {
    notes.push({
      id: `sale-${o.id}`,
      kind: "sale",
      title: "Nueva venta atribuida",
      detail: `${productTitleOf(o.productId)} · comisión USD ${o.affiliateCommission.amount}`,
      timestamp: o.paidAt ?? o.createdAt,
    });
  }
  for (const t of listTransactions(affiliateId, s).filter((x) => x.type === "AFFILIATE_COMMISSION" && x.status === "AVAILABLE")) {
    notes.push({
      id: `avail-${t.id}`,
      kind: "commission_available",
      title: "Comisión disponible",
      detail: `USD ${t.amount.amount} lista para retiro`,
      timestamp: t.createdAt,
    });
  }
  for (const w of listWithdrawals(affiliateId, s)) {
    notes.push({
      id: `wd-${w.id}`,
      kind: "withdrawal",
      title: `Retiro ${w.status === "COMPLETED" ? "procesado" : w.status === "REJECTED" ? "rechazado" : "recibido"}`,
      detail: `USD ${w.amount.amount} · ${w.method}`,
      timestamp: w.updatedAt,
    });
  }
  for (const r of listReferralRegistrations(affiliateId, "affiliate", s)) {
    notes.push({
      id: `ref-${r.id}`,
      kind: "referral_affiliate",
      title: "Nuevo afiliado registrado",
      detail: `${r.newUserId} se unió con tu invitación`,
      timestamp: r.timestamp,
    });
  }
  for (const r of listReferralRegistrations(affiliateId, "creator", s)) {
    notes.push({
      id: `ref-${r.id}`,
      kind: "referral_creator",
      title: "Nuevo creador registrado",
      detail: `${r.newUserId} se unió con tu invitación`,
      timestamp: r.timestamp,
    });
  }
  return notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getNotificationsReadAt(affiliateId: string, storage?: StorageLike): string | null {
  return read<string | null>(resolveStorage(storage), `crow_aff_notif_read_${affiliateId}`, null);
}

export function markNotificationsRead(affiliateId: string, storage?: StorageLike): void {
  write(resolveStorage(storage), `crow_aff_notif_read_${affiliateId}`, new Date().toISOString());
}

// ---------- Atribución (24h, mismo producto) ----------

export interface Attribution {
  affiliateId: string;
  productId: string;
  timestamp: string;
}

const ATTRIBUTION_TTL_MS = 24 * 3600 * 1000;

export function saveAttribution(attribution: Attribution, storage?: StorageLike): void {
  write(resolveStorage(storage), "crow_market_attribution", attribution);
}

export function readAttribution(productId: string, storage?: StorageLike): Attribution | null {
  const saved = read<Attribution | null>(resolveStorage(storage), "crow_market_attribution", null);
  if (!saved || saved.productId !== productId) return null;
  if (Date.now() - new Date(saved.timestamp).getTime() > ATTRIBUTION_TTL_MS) return null;
  return saved;
}
