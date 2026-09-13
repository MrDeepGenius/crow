// ============================================
// DATABASE - SQLite real (node:sqlite, stdlib)
// ============================================
// Sin ORM externo: no existía infraestructura de DB que reutilizar y
// node:sqlite (Node 22.5+) da persistencia real en archivo, transacciones
// ACID y constraints UNIQUE sin dependencias nuevas. Archivo en ./data
// (gitignored, igual que los JSON actuales). PROD: cambiar DATABASE_PATH
// a volumen persistente o migrar a Postgres cuando el volumen lo pida.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const instances = new Map<string, DatabaseSync>();

export function dbPath(): string {
  return process.env.DATABASE_PATH ?? "./data/crow.db";
}

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  appliedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  isAdmin INTEGER NOT NULL DEFAULT 0,
  isDev INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  tokenHash TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  productId TEXT NOT NULL,
  baseAmount REAL NOT NULL,
  paymentAmount REAL NOT NULL,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  expectedRecipient TEXT NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  paidAt TEXT,
  updatedAt TEXT NOT NULL,
  isDev INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(userId);
CREATE INDEX IF NOT EXISTS idx_orders_user_product ON orders(userId, productId);
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL UNIQUE REFERENCES orders(id),
  network TEXT NOT NULL,
  tokenContract TEXT NOT NULL,
  recipient TEXT NOT NULL,
  sender TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  txHash TEXT UNIQUE,
  blockNumber INTEGER,
  confirmations INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  detectedAt TEXT,
  confirmedAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  isDev INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  productId TEXT NOT NULL,
  orderId TEXT NOT NULL UNIQUE REFERENCES orders(id),
  status TEXT NOT NULL,
  grantedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(userId, productId)
);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements(userId);
`;

function applyMigrations(db: DatabaseSync): void {
  db.exec(SCHEMA_V1);
  const row = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 1")
    .get() as { version: number } | undefined;
  if (!row) {
    db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (1, ?)").run(
      new Date().toISOString()
    );
  }
  applyV2(db);
  applyV3(db);
  applyV4(db);
  applyV5(db);
  applyV6(db);
  applyV7(db);
  applyV8(db);
  applyV9(db);
  applyV10(db);
  applyV11(db);
  applyV12(db);
}

// ---------- Migración v2: cuenta única multi-rol + onboarding ----------
// users: firstName/lastName (name se conserva como nombre completo por
// compat), roles (JSON ["buyer","affiliate","creator"]), onboardingCompleted.
// Perfiles 1:1 por userId (NO confundir con AffiliateProfile de referidos en
// marketTypes.ts, que sigue en localStorage y no se toca).

function columnExists(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

function applyV2(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 2")
    .get() as { version: number } | undefined;
  if (done) return;
  // ALTER TABLE falla si la columna ya existe: agregar solo las faltantes
  // (BDs creadas entre v1 y v2 de forma parcial siguen migrando bien).
  for (const col of ["firstName", "lastName", "roles", "onboardingCompleted"]) {
    if (!columnExists(db, "users", col)) {
      const def =
        col === "roles"
          ? "TEXT NOT NULL DEFAULT '[]'"
          : col === "onboardingCompleted"
            ? "INTEGER NOT NULL DEFAULT 0"
            : "TEXT NOT NULL DEFAULT ''";
      db.exec(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS buyer_profiles (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS creator_profiles (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  data TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (2, ?)").run(
    new Date().toISOString()
  );
}

// ---------- Migración v3: página pública del creador ----------
// 1:1 por userId, slug único para la URL pública. El avatar se guarda como
// archivo en public/uploads/avatars (aquí solo la ruta). Stats (productos,
// ventas, rating) siguen saliendo del catálogo; seguidores quedan para después.
function applyV3(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 3")
    .get() as { version: number } | undefined;
  if (done) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS creator_pages (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatarPath TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_creator_pages_slug ON creator_pages(slug);
`);
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (3, ?)").run(
    new Date().toISOString()
  );
}

// ---------- Migración v4: foto de perfil a nivel cuenta ----------
// Una sola foto por User (vale para comprador, afiliado y creador). La página
// pública del creador la usa como fallback si no tiene foto propia.
function applyV4(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 4")
    .get() as { version: number } | undefined;
  if (done) return;
  if (!columnExists(db, "users", "avatarPath")) {
    db.exec("ALTER TABLE users ADD COLUMN avatarPath TEXT");
  }
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (4, ?)").run(
    new Date().toISOString()
  );
}

// ---------- Migración v5: análisis de Pricing Advisor ----------
// Historial por usuario+producto (cada "Actualizar recomendación" crea una
// fila nueva; la última es la vigente = caché sin re-analizar).
function applyV5(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 5")
    .get() as { version: number } | undefined;
  if (done) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS pricing_analyses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  productKey TEXT NOT NULL,
  format TEXT NOT NULL,
  recommendedPrice REAL NOT NULL,
  rangeMin REAL NOT NULL,
  rangeMax REAL NOT NULL,
  budgetPrice REAL NOT NULL,
  premiumPrice REAL NOT NULL,
  confidence REAL NOT NULL,
  marketPosition TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  internalEstimate REAL NOT NULL,
  marketMedian REAL,
  comparablesUsed INTEGER NOT NULL DEFAULT 0,
  lowDataWarning TEXT,
  analyzedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pricing_user_product ON pricing_analyses(userId, productKey);
CREATE TABLE IF NOT EXISTS pricing_comparables (
  id TEXT PRIMARY KEY,
  pricingAnalysisId TEXT NOT NULL REFERENCES pricing_analyses(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  observedPrice REAL NOT NULL,
  currency TEXT NOT NULL,
  normalizedPrice REAL,
  sourceUrl TEXT,
  source TEXT NOT NULL DEFAULT 'catalog'
);
CREATE INDEX IF NOT EXISTS idx_pricing_comp_analysis ON pricing_comparables(pricingAnalysisId);
`);
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (5, ?)").run(
    new Date().toISOString()
  );
}

// ---------- Migración v6: referidos server-side + anti-fraud ----------
// referrals: cadena de referidos (userId → referrerId, inmutable por API).
// referral_codes: códigos públicos por afiliado (un código por usuario).
// fraud_*: perfiles de riesgo, señales, casos y auditoría.
// commission_holds: comisiones retenidas/bloqueadas con su estado.
// users: referrerId inmutable + contexto de entorno (ip/device) y campos
// reservados (phone, withdrawalWallet) para cuando Wallet esté activo.
function applyV6(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 6")
    .get() as { version: number } | undefined;
  if (done) return;
  for (const col of ["referrerId", "createdIp", "deviceId", "phone", "withdrawalWallet"]) {
    const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
    if (!cols.some((c) => c.name === col)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
    }
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS referrals (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  referrerId TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'affiliate',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrerId);
CREATE TABLE IF NOT EXISTS referral_codes (
  code TEXT PRIMARY KEY,
  ownerUserId TEXT NOT NULL UNIQUE REFERENCES users(id),
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fraud_risk_profiles (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  riskScore INTEGER NOT NULL DEFAULT 0,
  riskStatus TEXT NOT NULL DEFAULT 'LOW_RISK',
  signals TEXT NOT NULL DEFAULT '[]',
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS fraud_signals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  weight INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON fraud_signals(userId);
CREATE TABLE IF NOT EXISTS fraud_cases (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  relatedUserId TEXT,
  orderId TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  riskScore INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  resolvedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_status ON fraud_cases(status);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_user ON fraud_cases(userId);
CREATE TABLE IF NOT EXISTS fraud_audit_logs (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  userId TEXT,
  relatedUserId TEXT,
  orderId TEXT,
  reason TEXT NOT NULL DEFAULT '',
  riskScore INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fraud_audit_event ON fraud_audit_logs(event);
CREATE TABLE IF NOT EXISTS commission_holds (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  affiliateUserId TEXT NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  reason TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(orderId, affiliateUserId, level)
);
CREATE INDEX IF NOT EXISTS idx_commission_holds_order ON commission_holds(orderId);
CREATE INDEX IF NOT EXISTS idx_commission_holds_affiliate ON commission_holds(affiliateUserId);
`);
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (6, ?)").run(
    new Date().toISOString()
  );
}

// ---------- Migración v7: reparto definitivo + niveles + ledger ----------
// orders.creatorId: creador del producto (fijado al crear, inmutable).
// affiliate_levels: estado LOCKED/UNLOCKING/UNLOCKED por (usuario, nivel) con
// trazabilidad de origen y reversión (unlockSourceOrderId, unlockStatus...).
// level_unlock_requirements: requisitos configurables por nivel (L1 = 1 venta
// propia válida; L2-L5 bloqueados hasta configuración explícita).
// commission_ledger: TODA allocation de cada venta (append-only, suma == pago).
function applyV7(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 7")
    .get() as { version: number } | undefined;
  if (done) return;
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.some((c) => c.name === "creatorId")) {
    db.exec("ALTER TABLE orders ADD COLUMN creatorId TEXT");
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_levels (
  userId TEXT NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'LOCKED',
  unlockStatus TEXT NOT NULL DEFAULT 'NONE',
  unlockSourceOrderId TEXT,
  unlockedAt TEXT,
  reversedAt TEXT,
  reversalReason TEXT,
  updatedAt TEXT NOT NULL,
  PRIMARY KEY (userId, level)
);
CREATE TABLE IF NOT EXISTS level_unlock_requirements (
  level INTEGER PRIMARY KEY,
  requirementType TEXT NOT NULL,
  threshold INTEGER,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS commission_ledger (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id),
  account TEXT NOT NULL,
  affiliateUserId TEXT REFERENCES users(id),
  recipientRef TEXT,
  level INTEGER,
  percentage REAL NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  note TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_order ON commission_ledger(orderId);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_account ON commission_ledger(account);
`);
  const now = new Date().toISOString();
  const seed: [number, string, number | null][] = [
    [1, "VALID_SALES", 1],
    [2, "MANUAL", null],
    [3, "MANUAL", null],
    [4, "MANUAL", null],
    [5, "MANUAL", null],
  ];
  for (const [level, requirementType, threshold] of seed) {
    db.prepare(
      "INSERT INTO level_unlock_requirements (level, requirementType, threshold, updatedAt) VALUES (?, ?, ?, ?) ON CONFLICT(level) DO NOTHING"
    ).run(level, requirementType, threshold, now);
  }
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (7, ?)").run(now);
}

// ---------- Migración v8: CROW REWARDS (misma DB, sin duplicar) ----------
// orders.orderType: 'product' | 'license' (default product, no rompe nada).
// volume_events: eventos de volumen por orden (UNIQUE orderId = idempotencia).
// user_volume: total CP por usuario (nunca negativo, solo compensaciones).
// rewards: hitos por usuario (UNIQUE userId+level, estados hasta PAID real).
// rewards_pool_ledger: créditos/débitos del Rewards Pool (UNIQUE por licencia).
function applyV8(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 8")
    .get() as { version: number } | undefined;
  if (done) return;
  const orderCols = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderCols.some((c) => c.name === "orderType")) {
    db.exec("ALTER TABLE orders ADD COLUMN orderType TEXT NOT NULL DEFAULT 'product'");
  }
  db.exec(`
CREATE TABLE IF NOT EXISTS volume_events (
  orderId TEXT NOT NULL REFERENCES orders(id),
  userId TEXT NOT NULL REFERENCES users(id),
  cp INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'C',
  createdAt TEXT NOT NULL,
  reversedAt TEXT,
  UNIQUE(orderId, kind)
);
CREATE INDEX IF NOT EXISTS idx_volume_events_user ON volume_events(userId);
CREATE TABLE IF NOT EXISTS user_volume (
  userId TEXT PRIMARY KEY REFERENCES users(id),
  totalCp INTEGER NOT NULL DEFAULT 0 CHECK (totalCp >= 0),
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL,
  cpRequired INTEGER NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNLOCKED',
  paymentRef TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  claimedAt TEXT,
  paidAt TEXT,
  UNIQUE(userId, level)
);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(userId);
CREATE TABLE IF NOT EXISTS rewards_pool_ledger (
  id TEXT PRIMARY KEY,
  licenseOrderId TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(licenseOrderId, kind)
);
CREATE INDEX IF NOT EXISTS idx_pool_license ON rewards_pool_ledger(licenseOrderId);
`);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (8, ?)").run(now);
}

function applyV10(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 10")
    .get() as { version: number } | undefined;
  if (done) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  amount REAL NOT NULL,
  fee REAL NOT NULL,
  net REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDT',
  walletAddress TEXT NOT NULL,
  txHash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotencyKey TEXT,
  periodFirst INTEGER NOT NULL DEFAULT 1,
  feePercent REAL NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  processedAt TEXT,
  confirmedAt TEXT,
  rejectedAt TEXT,
  rejectedReason TEXT,
  UNIQUE(idempotencyKey)
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(userId);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE TABLE IF NOT EXISTS withdrawal_audit (
  id TEXT PRIMARY KEY,
  withdrawalId TEXT NOT NULL REFERENCES withdrawals(id),
  event TEXT NOT NULL,
  actor TEXT NOT NULL,
  fromStatus TEXT,
  toStatus TEXT,
  reason TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_waudit_withdrawal ON withdrawal_audit(withdrawalId);
`);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (10, ?)").run(now);
}

function applyV9(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 9")
    .get() as { version: number } | undefined;
  if (done) return;
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "googleId")) {
    db.exec("ALTER TABLE users ADD COLUMN googleId TEXT");
  }
  const now = new Date().toISOString();
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (9, ?)").run(now);
}

// ---------- Migración v11: productos en DB (reemplaza localStorage) ----------
// products: publicaciones reales del marketplace. creatorId sale de la sesión
// (inmutable post-creación). content JSON guarda el producto generado completo.
// product_events: analytics (views, clicks, etc.) reemplazan marketStore events.
function applyV11(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 11")
    .get() as { version: number } | undefined;
  if (done) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  title TEXT NOT NULL,
  shortDescription TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  creatorId TEXT NOT NULL REFERENCES users(id),
  creatorName TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  language TEXT NOT NULL DEFAULT 'es',
  level TEXT NOT NULL DEFAULT 'todos',
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  previousPrice REAL,
  coverSvg TEXT,
  previewKind TEXT NOT NULL DEFAULT 'pdf',
  previewRef TEXT NOT NULL DEFAULT '',
  freePreviewChapters INTEGER NOT NULL DEFAULT 1,
  stats TEXT NOT NULL DEFAULT '{}',
  includes TEXT NOT NULL DEFAULT '[]',
  bonuses TEXT NOT NULL DEFAULT '[]',
  ratingSum REAL NOT NULL DEFAULT 0,
  ratingCount INTEGER NOT NULL DEFAULT 0,
  salesCount INTEGER NOT NULL DEFAULT 0,
  viewCount INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  affiliateEnabled INTEGER NOT NULL DEFAULT 0,
  affiliatePercent REAL NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  crowQuality TEXT NOT NULL DEFAULT '{"score":0,"checks":[]}',
  content TEXT,
  createdAt TEXT NOT NULL,
  publishedAt TEXT,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_creator ON products(creatorId);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE TABLE IF NOT EXISTS product_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  productId TEXT,
  userId TEXT,
  timestamp TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_product_events_product ON product_events(productId);
CREATE INDEX IF NOT EXISTS idx_product_events_type ON product_events(type);
CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  productId TEXT NOT NULL,
  orderId TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(userId, productId)
);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(productId);
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id TEXT PRIMARY KEY,
  affiliateUserId TEXT NOT NULL REFERENCES users(id),
  productId TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliateUserId);
CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  affiliateUserId TEXT NOT NULL REFERENCES users(id),
  productId TEXT NOT NULL,
  code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  UNIQUE(affiliateUserId, productId)
);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate ON affiliate_links(affiliateUserId);
CREATE TABLE IF NOT EXISTS emergency_reserve_ledger (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE(orderId, kind)
);
CREATE INDEX IF NOT EXISTS idx_reserve_order ON emergency_reserve_ledger(orderId);
`);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (11, ?)").run(now);
}

// ---------- Migración v12: licencias Creator server-side ----------
// creator_licenses: 1 fila por (userId, orderId) — la licencia se activa
// SOLO tras pago confirmado (order PAID + orderType='license'). El plan y
// los límites (maxProducts, maxPublished, durationDays) se fijan desde el
// catálogo del servidor, nunca del cliente. status: ACTIVE | EXPIRED |
// CANCELLED | PENDING | REVOKED. expiresAt se calcula con durationDays.
function applyV12(db: DatabaseSync): void {
  const done = db
    .prepare("SELECT version FROM schema_migrations WHERE version = 12")
    .get() as { version: number } | undefined;
  if (done) return;
  db.exec(`
CREATE TABLE IF NOT EXISTS creator_licenses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  orderId TEXT NOT NULL UNIQUE REFERENCES orders(id),
  maxProducts INTEGER NOT NULL,
  maxPublished INTEGER NOT NULL,
  durationDays INTEGER NOT NULL,
  purchasedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_user ON creator_licenses(userId);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON creator_licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_user_status ON creator_licenses(userId, status);
`);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO schema_migrations (version, appliedAt) VALUES (12, ?)").run(now);
}

/** Singleton por ruta. En tests usar DATABASE_PATH temporal + closeDb(). */
export function getDb(path?: string): DatabaseSync {
  const resolved = path ?? dbPath();
  const existing = instances.get(resolved);
  if (existing) return existing;
  mkdirSync(dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(db);
  instances.set(resolved, db);
  return db;
}

export function closeDb(path?: string): void {
  const resolved = path ?? dbPath();
  const existing = instances.get(resolved);
  if (existing) {
    instances.delete(resolved);
    existing.close();
  }
}
