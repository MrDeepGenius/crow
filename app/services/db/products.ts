// ============================================
// PRODUCTS - CRUD en SQLite (reemplaza marketStore)
// ============================================
// Toda operación recibe creatorId del servidor (sesión).
// El frontend nunca elige el creatorId ni puede editar productos ajenos.

import { randomBytes } from "node:crypto";
import { getDb } from "./database";

export type ProductFormat = "course" | "interactive_web" | "pdf" | "ebook" | "kit";
export type ProductStatus = "DRAFT" | "READY" | "PENDING_REVIEW" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";

export interface ProductStats {
  modules?: number;
  lessons?: number;
  activities?: number;
  quizzes?: number;
  hasExam?: boolean;
  hasCertificate?: boolean;
  chapters?: number;
  sections?: number;
  blocks?: number;
  words?: number;
  pages?: number;
  webSections?: number;
  webComponents?: number;
  resources?: number;
  folders?: number;
}

export interface ProductBonus {
  id: string;
  name: string;
  description: string;
  kind: string;
}

export interface Product {
  id: string;
  slug: string;
  format: ProductFormat;
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
  price: number;
  currency: string;
  previousPrice: number | null;
  coverSvg: string | null;
  previewKind: string;
  previewRef: string;
  freePreviewChapters: number;
  stats: ProductStats;
  includes: string[];
  bonuses: ProductBonus[];
  ratingSum: number;
  ratingCount: number;
  salesCount: number;
  viewCount: number;
  featured: boolean;
  affiliateEnabled: boolean;
  affiliatePercent: number;
  status: ProductStatus;
  crowQuality: { score: number; checks: { label: string; ok: boolean }[] };
  content: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "producto";
}

function uniqueSlug(base: string): string {
  const db = getDb();
  let slug = base;
  let i = 2;
  while (db.prepare("SELECT 1 FROM products WHERE slug = ?").get(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

interface ProductRow extends Record<string, string | number | null> {
  id: string;
  slug: string;
  format: string;
  title: string;
  shortDescription: string;
  description: string;
  creatorId: string;
  creatorName: string;
  category: string;
  subcategory: string;
  tags: string;
  language: string;
  level: string;
  price: number;
  currency: string;
  previousPrice: number | null;
  coverSvg: string | null;
  previewKind: string;
  previewRef: string;
  freePreviewChapters: number;
  stats: string;
  includes: string;
  bonuses: string;
  ratingSum: number;
  ratingCount: number;
  salesCount: number;
  viewCount: number;
  featured: number;
  affiliateEnabled: number;
  affiliatePercent: number;
  status: string;
  crowQuality: string;
  content: string | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    format: r.format as ProductFormat,
    title: r.title,
    shortDescription: r.shortDescription,
    description: r.description,
    creatorId: r.creatorId,
    creatorName: r.creatorName,
    category: r.category,
    subcategory: r.subcategory,
    tags: JSON.parse(r.tags as string),
    language: r.language,
    level: r.level,
    price: r.price,
    currency: r.currency,
    previousPrice: r.previousPrice,
    coverSvg: r.coverSvg,
    previewKind: r.previewKind,
    previewRef: r.previewRef,
    freePreviewChapters: r.freePreviewChapters,
    stats: JSON.parse(r.stats as string),
    includes: JSON.parse(r.includes as string),
    bonuses: JSON.parse(r.bonuses as string),
    ratingSum: r.ratingSum,
    ratingCount: r.ratingCount,
    salesCount: r.salesCount,
    viewCount: r.viewCount,
    featured: r.featured === 1,
    affiliateEnabled: r.affiliateEnabled === 1,
    affiliatePercent: r.affiliatePercent,
    status: r.status as ProductStatus,
    crowQuality: JSON.parse(r.crowQuality as string),
    content: r.content,
    createdAt: r.createdAt,
    publishedAt: r.publishedAt,
    updatedAt: r.updatedAt,
  };
}

export interface CreateProductInput {
  creatorId: string;
  creatorName: string;
  format: ProductFormat;
  title: string;
  shortDescription?: string;
  description: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  language?: string;
  level?: string;
  price: number;
  currency?: string;
  previousPrice?: number | null;
  coverSvg?: string | null;
  previewKind?: string;
  previewRef?: string;
  freePreviewChapters?: number;
  stats?: ProductStats;
  includes?: string[];
  bonuses?: ProductBonus[];
  affiliateEnabled?: boolean;
  affiliatePercent?: number;
  content?: string | null;
  status?: ProductStatus;
}

export function createProduct(input: CreateProductInput): Product {
  const db = getDb();
  const now = nowIso();
  const id = uid("prod");
  const slug = uniqueSlug(slugify(input.title));
  const row = {
    id,
    slug,
    format: input.format,
    title: input.title.slice(0, 200),
    shortDescription: (input.shortDescription ?? "").slice(0, 300),
    description: input.description,
    creatorId: input.creatorId,
    creatorName: input.creatorName.slice(0, 100),
    category: input.category,
    subcategory: input.subcategory ?? "",
    tags: JSON.stringify(input.tags ?? []),
    language: input.language ?? "es",
    level: input.level ?? "todos",
    price: input.price,
    currency: input.currency ?? "USD",
    previousPrice: input.previousPrice ?? null,
    coverSvg: input.coverSvg ?? null,
    previewKind: input.previewKind ?? "pdf",
    previewRef: input.previewRef ?? "",
    freePreviewChapters: input.freePreviewChapters ?? 1,
    stats: JSON.stringify(input.stats ?? {}),
    includes: JSON.stringify(input.includes ?? []),
    bonuses: JSON.stringify(input.bonuses ?? []),
    ratingSum: 0,
    ratingCount: 0,
    salesCount: 0,
    viewCount: 0,
    featured: 0,
    affiliateEnabled: input.affiliateEnabled ? 1 : 0,
    affiliatePercent: input.affiliatePercent ?? 40,
    status: input.status ?? "DRAFT",
    crowQuality: JSON.stringify({ score: 0, checks: [] }),
    content: input.content ?? null,
    createdAt: now,
    publishedAt: null,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO products (id, slug, format, title, shortDescription, description, creatorId, creatorName,
     category, subcategory, tags, language, level, price, currency, previousPrice, coverSvg,
     previewKind, previewRef, freePreviewChapters, stats, includes, bonuses,
     ratingSum, ratingCount, salesCount, viewCount, featured, affiliateEnabled, affiliatePercent,
     status, crowQuality, content, createdAt, publishedAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    row.id, row.slug, row.format, row.title, row.shortDescription, row.description, row.creatorId, row.creatorName,
    row.category, row.subcategory, row.tags, row.language, row.level, row.price, row.currency, row.previousPrice,
    row.coverSvg, row.previewKind, row.previewRef, row.freePreviewChapters, row.stats, row.includes, row.bonuses,
    row.ratingSum, row.ratingCount, row.salesCount, row.viewCount, row.featured, row.affiliateEnabled, row.affiliatePercent,
    row.status, row.crowQuality, row.content, row.createdAt, row.publishedAt, row.updatedAt
  );
  return toProduct(row as unknown as ProductRow);
}

export function getProductById(id: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as ProductRow | undefined;
  return row ? toProduct(row) : null;
}

export function getProductBySlug(slug: string): Product | null {
  const row = getDb().prepare("SELECT * FROM products WHERE slug = ?").get(slug) as ProductRow | undefined;
  return row ? toProduct(row) : null;
}

export function listPublishedProducts(): Product[] {
  const rows = getDb()
    .prepare("SELECT * FROM products WHERE status = 'PUBLISHED' ORDER BY createdAt DESC")
    .all() as ProductRow[];
  return rows.map(toProduct);
}

export function listProductsByCreator(creatorId: string): Product[] {
  const rows = getDb()
    .prepare("SELECT * FROM products WHERE creatorId = ? ORDER BY createdAt DESC")
    .all(creatorId) as ProductRow[];
  return rows.map(toProduct);
}

export function listAllProducts(): Product[] {
  const rows = getDb().prepare("SELECT * FROM products ORDER BY createdAt DESC").all() as ProductRow[];
  return rows.map(toProduct);
}

export interface UpdateProductInput {
  title?: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  language?: string;
  level?: string;
  price?: number;
  currency?: string;
  previousPrice?: number | null;
  coverSvg?: string | null;
  freePreviewChapters?: number;
  stats?: ProductStats;
  includes?: string[];
  bonuses?: ProductBonus[];
  affiliateEnabled?: boolean;
  affiliatePercent?: number;
  content?: string | null;
  status?: ProductStatus;
}

/** Anti-IDOR: solo el creator puede actualizar. Devuelve false si no es el dueño. */
export function updateProduct(productId: string, creatorId: string, input: UpdateProductInput): Product | null {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM products WHERE id = ? AND creatorId = ?").get(productId, creatorId) as ProductRow | undefined;
  if (!existing) return null;
  const now = nowIso();
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  const add = (col: string, val: string | number | null) => { sets.push(`${col} = ?`); vals.push(val); };
  if (input.title !== undefined) add("title", input.title.slice(0, 200));
  if (input.shortDescription !== undefined) add("shortDescription", input.shortDescription.slice(0, 300));
  if (input.description !== undefined) add("description", input.description);
  if (input.category !== undefined) add("category", input.category);
  if (input.subcategory !== undefined) add("subcategory", input.subcategory);
  if (input.tags !== undefined) add("tags", JSON.stringify(input.tags));
  if (input.language !== undefined) add("language", input.language);
  if (input.level !== undefined) add("level", input.level);
  if (input.price !== undefined) add("price", input.price);
  if (input.currency !== undefined) add("currency", input.currency);
  if (input.previousPrice !== undefined) add("previousPrice", input.previousPrice);
  if (input.coverSvg !== undefined) add("coverSvg", input.coverSvg);
  if (input.freePreviewChapters !== undefined) add("freePreviewChapters", input.freePreviewChapters);
  if (input.stats !== undefined) add("stats", JSON.stringify(input.stats));
  if (input.includes !== undefined) add("includes", JSON.stringify(input.includes));
  if (input.bonuses !== undefined) add("bonuses", JSON.stringify(input.bonuses));
  if (input.affiliateEnabled !== undefined) add("affiliateEnabled", input.affiliateEnabled ? 1 : 0);
  if (input.affiliatePercent !== undefined) add("affiliatePercent", input.affiliatePercent);
  if (input.content !== undefined) add("content", input.content);
  if (input.status !== undefined) {
    add("status", input.status);
    if (input.status === "PUBLISHED") add("publishedAt", now);
  }
  if (sets.length === 0) return toProduct(existing);
  add("updatedAt", now);
  vals.push(productId, creatorId);
  db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ? AND creatorId = ?`).run(...vals);
  const updated = db.prepare("SELECT * FROM products WHERE id = ? AND creatorId = ?").get(productId, creatorId) as ProductRow | undefined;
  return updated ? toProduct(updated) : null;
}

export function publishProduct(productId: string, creatorId: string): Product | null {
  return updateProduct(productId, creatorId, { status: "PUBLISHED" });
}

export function incrementViewCount(productId: string): void {
  getDb().prepare("UPDATE products SET viewCount = viewCount + 1 WHERE id = ?").run(productId);
}

export function incrementSalesCount(productId: string): void {
  getDb().prepare("UPDATE products SET salesCount = salesCount + 1 WHERE id = ?").run(productId);
}

// ---------- Product events (analytics) ----------

export function logEvent(type: string, productId: string | null, userId: string | null, meta: Record<string, string> = {}): void {
  getDb().prepare(
    "INSERT INTO product_events (id, type, productId, userId, timestamp, meta) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(uid("evt"), type, productId, userId, nowIso(), JSON.stringify(meta));
}

export function countEvents(productId: string, type: string): number {
  const row = getDb().prepare(
    "SELECT COUNT(*) AS n FROM product_events WHERE productId = ? AND type = ?"
  ).get(productId, type) as { n: number };
  return row.n;
}

export function countEventsByCreator(creatorId: string, type: string): number {
  const row = getDb().prepare(
    `SELECT COUNT(*) AS n FROM product_events pe JOIN products p ON pe.productId = p.id
     WHERE p.creatorId = ? AND pe.type = ?`
  ).get(creatorId, type) as { n: number };
  return row.n;
}

// ---------- Reviews ----------

export function addReview(userId: string, productId: string, orderId: string, rating: number, comment: string): void {
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `INSERT INTO product_reviews (id, userId, productId, orderId, rating, comment, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId, productId) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, updatedAt = excluded.updatedAt`
  ).run(uid("rev"), userId, productId, orderId, rating, comment, now, now);
  // Recalculate rating sum
  const stats = db.prepare(
    "SELECT COALESCE(SUM(rating), 0) AS sum, COUNT(*) AS cnt FROM product_reviews WHERE productId = ?"
  ).get(productId) as { sum: number; cnt: number };
  db.prepare("UPDATE products SET ratingSum = ?, ratingCount = ?, updatedAt = ? WHERE id = ?").run(
    stats.sum, stats.cnt, now, productId
  );
}

export function listReviews(productId: string): { id: string; userId: string; rating: number; comment: string; createdAt: string }[] {
  return getDb().prepare("SELECT id, userId, rating, comment, createdAt FROM product_reviews WHERE productId = ? ORDER BY createdAt DESC").all(productId) as unknown as { id: string; userId: string; rating: number; comment: string; createdAt: string }[];
}

// ---------- Affiliate links & clicks ----------

export function createAffiliateLink(affiliateUserId: string, productId: string, code: string): void {
  getDb().prepare(
    "INSERT INTO affiliate_links (id, affiliateUserId, productId, code, active, createdAt) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(affiliateUserId, productId) DO NOTHING"
  ).run(uid("alink"), affiliateUserId, productId, code, nowIso());
}

export function listAffiliateLinks(affiliateUserId: string): { id: string; productId: string; code: string; active: boolean; createdAt: string }[] {
  return getDb().prepare("SELECT id, productId, code, active, createdAt FROM affiliate_links WHERE affiliateUserId = ? ORDER BY createdAt DESC").all(affiliateUserId) as unknown as { id: string; productId: string; code: string; active: boolean; createdAt: string }[];
}

export function logAffiliateClick(affiliateUserId: string, productId: string): void {
  getDb().prepare(
    "INSERT INTO affiliate_clicks (id, affiliateUserId, productId, createdAt) VALUES (?, ?, ?, ?)"
  ).run(uid("aclick"), affiliateUserId, productId, nowIso());
}

export function countAffiliateClicks(affiliateUserId: string): number {
  const row = getDb().prepare("SELECT COUNT(*) AS n FROM affiliate_clicks WHERE affiliateUserId = ?").get(affiliateUserId) as { n: number };
  return row.n;
}

// ---------- Affiliate dashboard data ----------

export interface AffiliateDashboardData {
  clicks: number;
  validSales: number;
  conversionRate: number;
  directCommissions: { amount: number; status: string };
  levelCommissions: { level: number; amount: number; status: string }[];
  walletBalance: { available: number; reserved: number; net: number };
  commissionsByStatus: { pending: number; approved: number; paid: number; reversed: number };
  totalCp: number;
  rewards: { level: number; status: string; amount: number }[];
}

export function getAffiliateDashboard(affiliateUserId: string): AffiliateDashboardData {
  const db = getDb();
  const clicks = countAffiliateClicks(affiliateUserId);

  // Valid sales: orders where this user is the direct affiliate
  const validSalesRow = db.prepare(
    `SELECT COUNT(*) AS n FROM commission_ledger WHERE affiliateUserId = ? AND account = 'AFFILIATE_DIRECT'`
  ).get(affiliateUserId) as { n: number };
  const validSales = validSalesRow.n;
  const conversionRate = clicks > 0 ? (validSales / clicks) * 100 : 0;

  // Direct commissions
  const directRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total, status FROM commission_ledger
     WHERE affiliateUserId = ? AND account = 'AFFILIATE_DIRECT' GROUP BY status`
  ).all(affiliateUserId) as { total: number; status: string }[];
  const directCommissions = directRow.reduce(
    (acc, r) => ({ amount: acc.amount + r.total, status: r.status }),
    { amount: 0, status: "PENDING" }
  );

  // Level commissions (L1-L5)
  const levelRows = db.prepare(
    `SELECT level, COALESCE(SUM(amount), 0) AS total, status FROM commission_ledger
     WHERE affiliateUserId = ? AND account LIKE 'LEVEL_%' GROUP BY level, status`
  ).all(affiliateUserId) as { level: number; total: number; status: string }[];
  const levelCommissions = [1, 2, 3, 4, 5].map((level) => {
    const rows = levelRows.filter((r) => r.level === level);
    return { level, amount: rows.reduce((s, r) => s + r.total, 0), status: rows[0]?.status ?? "PENDING" };
  });

  // Wallet balance from withdrawal service
  const approvedRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM commission_ledger
     WHERE (affiliateUserId = ? OR (recipientRef = ? AND account = 'CREATOR'))
       AND status = 'APPROVED'`
  ).get(affiliateUserId, affiliateUserId) as { total: number };
  const reservedRow = db.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals
     WHERE userId = ? AND status IN ('PENDING', 'PROCESSING')`
  ).get(affiliateUserId) as { total: number };
  const available = Math.round(approvedRow.total * 100) / 100;
  const reserved = Math.round(reservedRow.total * 100) / 100;

  // Commissions by status
  const statusRows = db.prepare(
    `SELECT status, COALESCE(SUM(amount), 0) AS total FROM commission_ledger
     WHERE affiliateUserId = ? OR recipientRef = ? GROUP BY status`
  ).all(affiliateUserId, affiliateUserId) as { status: string; total: number }[];
  const commissionsByStatus = {
    pending: statusRows.filter((r) => r.status === "PENDING" || r.status === "PENDING_REVIEW").reduce((s, r) => s + r.total, 0),
    approved: statusRows.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.total, 0),
    paid: statusRows.filter((r) => r.status === "PAID").reduce((s, r) => s + r.total, 0),
    reversed: statusRows.filter((r) => r.status === "REVERSED" || r.status === "BLOCKED").reduce((s, r) => s + r.total, 0),
  };

  // Crow Points
  const cpRow = db.prepare("SELECT totalCp FROM user_volume WHERE userId = ?").get(affiliateUserId) as { totalCp: number } | undefined;
  const totalCp = cpRow?.totalCp ?? 0;

  // Rewards
  const rewardRows = db.prepare("SELECT level, status, amount FROM rewards WHERE userId = ? ORDER BY level ASC").all(affiliateUserId) as { level: number; status: string; amount: number }[];
  const rewards = rewardRows.map((r) => ({ level: r.level, status: r.status, amount: r.amount }));

  return {
    clicks,
    validSales,
    conversionRate: Math.round(conversionRate * 100) / 100,
    directCommissions,
    levelCommissions,
    walletBalance: { available, reserved, net: Math.round((available - reserved) * 100) / 100 },
    commissionsByStatus,
    totalCp,
    rewards,
  };
}

// ---------- Convert to ProductPublication format (for UI compat) ----------

export function toPublicationFormat(p: Product): unknown {
  return {
    id: p.id,
    slug: p.slug,
    format: p.format,
    title: p.title,
    shortDescription: p.shortDescription,
    description: p.description,
    creatorId: p.creatorId,
    creatorName: p.creatorName,
    category: p.category,
    subcategory: p.subcategory,
    tags: p.tags,
    language: p.language,
    level: p.level,
    price: { amount: p.price, currency: p.currency },
    previousPrice: p.previousPrice !== null ? { amount: p.previousPrice, currency: p.currency } : null,
    coverSvg: p.coverSvg,
    previewKind: p.previewKind,
    previewRef: p.previewRef,
    freePreviewChapters: p.freePreviewChapters,
    stats: p.stats,
    includes: p.includes,
    bonuses: p.bonuses,
    ratingSum: p.ratingSum,
    ratingCount: p.ratingCount,
    salesCount: p.salesCount,
    viewCount: p.viewCount,
    featured: p.featured,
    affiliateEnabled: p.affiliateEnabled,
    affiliatePercent: p.affiliatePercent,
    status: p.status,
    crowQuality: p.crowQuality,
    content: p.content,
    createdAt: p.createdAt,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
  };
}

export interface ProductQuery {
  search?: string;
  category?: string;
  format?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  minRating?: number;
  affiliateOnly?: boolean;
  featuredOnly?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
  creatorId?: string;
}

export function queryProducts(q: ProductQuery): { items: unknown[]; total: number; page: number; pageSize: number } {
  const db = getDb();
  let rows = db.prepare("SELECT * FROM products WHERE status = 'PUBLISHED' ORDER BY createdAt DESC").all() as ProductRow[];
  let items = rows.map(toProduct);

  const search = q.search?.trim().toLowerCase() ?? "";
  if (search) {
    items = items.filter((p) =>
      [p.title, p.shortDescription, p.description, p.category, p.creatorName, ...p.tags]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }
  if (q.category) items = items.filter((p) => p.category === q.category);
  if (q.format) items = items.filter((p) => p.format === q.format);
  if (q.creatorId) items = items.filter((p) => p.creatorId === q.creatorId);
  if (q.minPrice !== undefined) items = items.filter((p) => p.price >= q.minPrice!);
  if (q.maxPrice !== undefined) items = items.filter((p) => p.price <= q.maxPrice!);
  if (q.language) items = items.filter((p) => p.language === q.language);
  if (q.minRating !== undefined) items = items.filter((p) => p.ratingCount > 0 && p.ratingSum / p.ratingCount >= q.minRating!);
  if (q.affiliateOnly) items = items.filter((p) => p.affiliateEnabled);
  if (q.featuredOnly) items = items.filter((p) => p.featured);

  const sort = q.sort ?? "relevance";
  const avgRating = (p: Product) => (p.ratingCount > 0 ? p.ratingSum / p.ratingCount : 0);
  const by: Record<string, (a: Product, b: Product) => number> = {
    sales: (a, b) => b.salesCount - a.salesCount,
    newest: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
    rating: (a, b) => avgRating(b) - avgRating(a),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    trending: (a, b) => b.viewCount + b.salesCount * 10 - (a.viewCount + a.salesCount * 10),
    relevance: (a, b) =>
      Number(b.featured) - Number(a.featured) || b.salesCount - a.salesCount || avgRating(b) - avgRating(a),
  };
  items = [...items].sort(by[sort] ?? by.relevance);

  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, q.pageSize ?? 12));
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize).map(toPublicationFormat),
    total: items.length,
    page,
    pageSize,
  };
}

// ---------- Creator dashboard data ----------

export interface CreatorDashboardData {
  totalProducts: number;
  publishedProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalViews: number;
  recentProducts: Product[];
  salesByProduct: { productId: string; title: string; sales: number; revenue: number }[];
}

export function getCreatorDashboard(creatorId: string): CreatorDashboardData {
  const db = getDb();
  const products = listProductsByCreator(creatorId);
  const publishedProducts = products.filter((p) => p.status === "PUBLISHED").length;
  const totalViews = products.reduce((s, p) => s + p.viewCount, 0);

  // Sales from orders where creatorId matches
  const salesRows = db.prepare(
    `SELECT o.productId, p.title, COUNT(*) AS sales, COALESCE(SUM(o.paymentAmount), 0) AS revenue
     FROM orders o LEFT JOIN products p ON o.productId = p.id
     WHERE o.creatorId = ? AND o.status = 'PAID'
     GROUP BY o.productId`
  ).all(creatorId) as { productId: string; title: string; sales: number; revenue: number }[];
  const totalSales = salesRows.reduce((s, r) => s + r.sales, 0);
  const totalRevenue = salesRows.reduce((s, r) => s + r.revenue, 0);

  return {
    totalProducts: products.length,
    publishedProducts,
    totalSales,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalViews,
    recentProducts: products.slice(0, 5),
    salesByProduct: salesRows.map((r) => ({ productId: r.productId, title: r.title ?? "N/A", sales: r.sales, revenue: r.revenue })),
  };
}
