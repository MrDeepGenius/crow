// ============================================
// MARKETPLACE DOMAIN TYPES - CROW MARKET
// ============================================
// Modelos separados: PRODUCT / PUBLICATION / ORDER / PAYMENT /
// ENTITLEMENT / AFFILIATE / COMMISSION / WALLET / REVIEW / ANALYTICS.
// Fases 1-4 implementan catálogo real; órdenes/pagos/entitlements quedan
// modelados y listos para Fase 5+ (requieren proveedor de pago real).

export type MarketplaceFormat = "course" | "interactive_web" | "pdf" | "ebook" | "kit";

export type PublicationStatus =
  | "DRAFT"
  | "READY"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

export interface Money {
  amount: number;
  currency: string;
}

export interface ProductStatsSnapshot {
  // Curso
  modules?: number;
  lessons?: number;
  activities?: number;
  quizzes?: number;
  hasExam?: boolean;
  hasCertificate?: boolean;
  // Ebook/PDF
  chapters?: number;
  sections?: number;
  blocks?: number;
  words?: number;
  pages?: number;
  // Web
  webSections?: number;
  webComponents?: number;
  // Kit
  resources?: number;
  folders?: number;
}

export interface ProductPublication {
  id: string;
  slug: string;
  format: MarketplaceFormat;
  title: string;
  shortDescription: string;
  description: string;
  creatorId: string;
  creatorName: string;
  category: string;
  subcategory: string;
  tags: string[];
  language: string;
  level: string;
  price: Money;
  previousPrice: Money | null;
  coverSvg: string | null;
  previewKind: "course" | "web" | "pdf" | "kit";
  previewRef: string;
  /** Capítulos gratuitos visibles (pdf/ebook). Definido por el creador. */
  freePreviewChapters: number;
  stats: ProductStatsSnapshot;
  includes: string[];
  bonuses: ProductBonus[];
  ratingSum: number;
  ratingCount: number;
  salesCount: number;
  viewCount: number;
  featured: boolean;
  affiliateEnabled: boolean;
  affiliatePercent: number;
  status: PublicationStatus;
  crowQuality: { score: number; checks: { label: string; ok: boolean }[] };
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}

export interface ProductBonus {
  id: string;
  name: string;
  description: string;
  kind: string;
}

export interface CreatorProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  referredByCode?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

// ---------- Fases 5+ (modelado, sin UI todavía) ----------

export type OrderStatus = "PENDING" | "VERIFYING" | "PAID" | "EXPIRED" | "FAILED" | "REFUNDED" | "CANCELLED" | "REVIEW_REQUIRED";

export interface Order {
  id: string;
  buyerId: string;
  productId: string;
  creatorId: string;
  affiliateId: string | null;
  amount: Money;
  platformFee: Money;
  affiliateCommission: Money;
  creatorShare: Money;
  status: OrderStatus;
  paymentProvider: string;
  paymentReference: string | null;
  /** Red de pago (BSC para USDT BEP-20). Opcional por compat con órdenes viejas. */
  network?: string;
  /** Destinatario esperado (wallet Crow en minúsculas). Solo informativo; la verdad la tiene el servidor. */
  expectedRecipient?: string | null;
  /** TX hash on-chain verificado (minúsculas). Duplica paymentReference para el admin. */
  txHash?: string | null;
  /** Bloque donde se minó la TX verificada. */
  blockNumber?: number | null;
  expiresAt?: string;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}

export type PaymentStatus = "CREATED" | "VERIFYING" | "CONFIRMED" | "FAILED" | "EXPIRED";

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  chain: string;
  txHash: string | null;
  amount: Money;
  status: PaymentStatus;
  attempts: number;
  lastError: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface BlockchainTransaction {
  hash: string;
  chainId: number;
  contract: string;
  from: string;
  to: string;
  amountWei: string;
  amount: number;
  blockNumber: number;
  confirmations: number;
  status: "success" | "failed";
  usedByOrderId: string | null;
  firstSeenAt: string;
}

export interface Entitlement {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateProfile {
  id: string;
  userId: string;
  code: string;
  referredByCode?: string;
  createdAt: string;
}

export interface AffiliateSettings {
  affiliateId: string;
  displayName: string;
  avatar: string;
  email: string;
  payoutWallet: string;
  notifySale: boolean;
  notifyCommission: boolean;
  notifyReferral: boolean;
  updatedAt: string;
}

export type ReferralKind = "affiliate" | "creator";

export interface ReferralCode {
  id: string;
  ownerAffiliateId: string;
  kind: ReferralKind;
  code: string;
  createdAt: string;
}

export interface ReferralClick {
  id: string;
  code: string;
  kind: ReferralKind;
  timestamp: string;
}

export interface ReferralRegistration {
  id: string;
  code: string;
  kind: ReferralKind;
  ownerAffiliateId: string;
  newUserId: string;
  timestamp: string;
}

export interface AffiliateLink {
  id: string;
  affiliateId: string;
  productId: string;
  code: string;
  active?: boolean;
  createdAt: string;
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  productId: string;
  timestamp: string;
}

export type WalletTxType =
  | "SALE"
  | "AFFILIATE_COMMISSION"
  | "RESIDUAL_COMMISSION"
  | "PLATFORM_FEE"
  | "WITHDRAWAL"
  | "WITHDRAWAL_FEE"
  | "REFUND"
  | "ADJUSTMENT";

export interface WalletTransaction {
  id: string;
  userId: string;
  type: WalletTxType;
  amount: Money;
  referenceType: string;
  referenceId: string;
  /** Solo en RESIDUAL_COMMISSION: nivel del upline (1, 2 o 3). */
  level?: 1 | 2 | 3;
  status: "PENDING" | "AVAILABLE" | "PAID" | "REVERSED";
  createdAt: string;
}

export interface Wallet {
  userId: string;
  available: Money;
  pending: Money;
  withdrawalPending: Money;
  paidOut: Money;
}

export type WithdrawalStatus = "REQUESTED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";

export interface Withdrawal {
  id: string;
  userId: string;
  amount: Money;
  fee: Money;
  net: Money;
  method: "USDT_BEP20" | "USDT_TRC20";
  address: string;
  status: WithdrawalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductEvent {
  id: string;
  type:
    | "product_view"
    | "preview_view"
    | "checkout_started"
    | "purchase_completed"
    | "affiliate_click"
    | "download"
    | "course_started"
    | "course_completed";
  productId: string | null;
  userId: string | null;
  timestamp: string;
  meta: Record<string, string>;
}

export interface PlatformConfig {
  platformFeePercent: number;
  affiliateCommissionPercent: number;
  creatorShareDirectPercent: number;
  creatorShareAffiliatedPercent: number;
  withdrawalMinUsdt: number;
  withdrawalFeePercent: number;
}

export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  platformFeePercent: 10,
  affiliateCommissionPercent: 40,
  creatorShareDirectPercent: 90,
  creatorShareAffiliatedPercent: 50,
  withdrawalMinUsdt: 25,
  withdrawalFeePercent: 2,
};

export const DEFAULT_CATEGORIES: string[] = [
  "Negocios",
  "Marketing",
  "Inteligencia Artificial",
  "Finanzas",
  "Productividad",
  "Desarrollo Personal",
  "Diseño",
  "Tecnología",
  "Educación",
  "Ventas",
  "Creación de Contenido",
  "Emprendimiento",
];
