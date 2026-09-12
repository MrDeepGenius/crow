// ============================================
// MARKETPLACE STORE - repositorio desacoplado
// ============================================
// Persistencia local-first (localStorage en browser, memoria en Node/tests).
// Sin datos inventados: el catálogo solo contiene publicaciones reales.
// Preparado para backend: toda lectura/escritura pasa por este módulo.

import {
  Category,
  CreatorProfile,
  DEFAULT_CATEGORIES,
  DEFAULT_PLATFORM_CONFIG,
  PlatformConfig,
  ProductEvent,
  ProductPublication,
  PublicationStatus,
} from "./marketTypes";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

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
  publications: "crow_market_publications",
  categories: "crow_market_categories",
  creator: "crow_creator_profile",
  events: "crow_market_events",
  config: "crow_market_config",
};

function read<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(storage: StorageLike, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage lleno o no disponible: no bloquea lectura
  }
}

function resolveStorage(override?: StorageLike): StorageLike {
  return override ?? browserStorage() ?? memoryStorage;
}

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function slugifyTitle(title: string): string {
  const slug =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "producto";
  return slug;
}

// ---------- Publications ----------

export function listPublications(storage?: StorageLike): ProductPublication[] {
  return read<ProductPublication[]>(resolveStorage(storage), K.publications, []);
}

export function getPublication(id: string, storage?: StorageLike): ProductPublication | null {
  return listPublications(storage).find((p) => p.id === id) ?? null;
}

export function getPublicationBySlug(slug: string, storage?: StorageLike): ProductPublication | null {
  return listPublications(storage).find((p) => p.slug === slug) ?? null;
}

export function savePublication(pub: ProductPublication, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  const all = listPublications(s);
  const idx = all.findIndex((p) => p.id === pub.id);
  const next = idx >= 0 ? all.map((p) => (p.id === pub.id ? pub : p)) : [...all, pub];
  write(s, K.publications, next);
}

export function uniqueSlug(title: string, storage?: StorageLike): string {
  const base = slugifyTitle(title);
  const existing = new Set(listPublications(storage).map((p) => p.slug));
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export interface DiscoveryQuery {
  search?: string;
  category?: string;
  format?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  minRating?: number;
  affiliateOnly?: boolean;
  featuredOnly?: boolean;
  sort?: "relevance" | "sales" | "newest" | "rating" | "priceAsc" | "priceDesc" | "trending";
  page?: number;
  pageSize?: number;
}

export interface DiscoveryResult {
  items: ProductPublication[];
  total: number;
  page: number;
  pageSize: number;
}

function averageRating(p: ProductPublication): number {
  return p.ratingCount > 0 ? p.ratingSum / p.ratingCount : 0;
}

export function queryPublications(query: DiscoveryQuery, storage?: StorageLike): DiscoveryResult {
  const q = query.search?.trim().toLowerCase() ?? "";
  let items = listPublications(storage).filter((p) => p.status === "PUBLISHED");
  if (q) {
    items = items.filter((p) =>
      [p.title, p.shortDescription, p.description, p.category, p.creatorName, ...p.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  if (query.category) items = items.filter((p) => p.category === query.category);
  if (query.format) items = items.filter((p) => p.format === query.format);
  if (query.minPrice !== undefined) items = items.filter((p) => p.price.amount >= (query.minPrice as number));
  if (query.maxPrice !== undefined) items = items.filter((p) => p.price.amount <= (query.maxPrice as number));
  if (query.language) items = items.filter((p) => p.language === query.language);
  if (query.minRating !== undefined) items = items.filter((p) => averageRating(p) >= (query.minRating as number));
  if (query.affiliateOnly) items = items.filter((p) => p.affiliateEnabled);
  if (query.featuredOnly) items = items.filter((p) => p.featured);

  const sort = query.sort ?? "relevance";
  const by: Record<string, (a: ProductPublication, b: ProductPublication) => number> = {
    sales: (a, b) => b.salesCount - a.salesCount,
    newest: (a, b) => b.publishedAt!.localeCompare(a.publishedAt!),
    rating: (a, b) => averageRating(b) - averageRating(a),
    priceAsc: (a, b) => a.price.amount - b.price.amount,
    priceDesc: (a, b) => b.price.amount - a.price.amount,
    trending: (a, b) => b.viewCount + b.salesCount * 10 - (a.viewCount + a.salesCount * 10),
    relevance: (a, b) =>
      Number(b.featured) - Number(a.featured) || b.salesCount - a.salesCount || averageRating(b) - averageRating(a),
  };
  items = [...items].sort(by[sort]);

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, query.pageSize ?? 12));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

export function setPublicationStatus(id: string, status: PublicationStatus, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const all = listPublications(s);
  const pub = all.find((p) => p.id === id);
  if (!pub) return false;
  savePublication(
    {
      ...pub,
      status,
      publishedAt: status === "PUBLISHED" ? pub.publishedAt ?? new Date().toISOString() : pub.publishedAt,
      updatedAt: new Date().toISOString(),
    },
    s
  );
  return true;
}

// ---------- Favoritos (local, desacoplado para migrar a backend) ----------

const FAVORITES_KEY = "crow_market_favorites";

export function listFavorites(storage?: StorageLike): string[] {
  return read<string[]>(resolveStorage(storage), FAVORITES_KEY, []);
}

export function isFavorite(productId: string, storage?: StorageLike): boolean {
  return listFavorites(storage).includes(productId);
}

export function toggleFavorite(productId: string, storage?: StorageLike): boolean {
  const s = resolveStorage(storage);
  const favs = listFavorites(s);
  const next = favs.includes(productId) ? favs.filter((id) => id !== productId) : [...favs, productId];
  write(s, FAVORITES_KEY, next);
  return next.includes(productId);
}

export function incrementViews(id: string, storage?: StorageLike): void {
  const s = resolveStorage(storage);
  const pub = getPublication(id, s);
  if (pub) savePublication({ ...pub, viewCount: pub.viewCount + 1 }, s);
}

// ---------- Categories (gestionables) ----------

export function listCategories(storage?: StorageLike): Category[] {
  const s = resolveStorage(storage);
  const stored = read<Category[] | null>(s, K.categories, null);
  if (stored) return stored;
  const seeded = DEFAULT_CATEGORIES.map((name, i) => ({ id: `cat-${i + 1}`, name, order: i + 1 }));
  write(s, K.categories, seeded);
  return seeded;
}

export function saveCategories(categories: Category[], storage?: StorageLike): void {
  write(resolveStorage(storage), K.categories, categories);
}

// ---------- Creator profile (local, explícito) ----------

export function getCreatorProfile(storage?: StorageLike): CreatorProfile | null {
  return read<CreatorProfile | null>(resolveStorage(storage), K.creator, null);
}

export function saveCreatorProfile(profile: CreatorProfile, storage?: StorageLike): void {
  write(resolveStorage(storage), K.creator, profile);
}

// ---------- Config ----------

export function getPlatformConfig(storage?: StorageLike): PlatformConfig {
  return read<PlatformConfig>(resolveStorage(storage), K.config, DEFAULT_PLATFORM_CONFIG);
}

export function savePlatformConfig(config: PlatformConfig, storage?: StorageLike): void {
  write(resolveStorage(storage), K.config, config);
}

// ---------- Events (analytics real, sin inventar) ----------

export function logEvent(
  type: ProductEvent["type"],
  productId: string | null,
  userId: string | null,
  meta: Record<string, string> = {},
  storage?: StorageLike
): void {
  const s = resolveStorage(storage);
  const events = read<ProductEvent[]>(s, K.events, []);
  events.push({ id: uid("evt"), type, productId, userId, timestamp: new Date().toISOString(), meta });
  write(s, K.events, events.slice(-2000));
}

export function countEvents(
  type: ProductEvent["type"],
  productId?: string,
  storage?: StorageLike
): number {
  return read<ProductEvent[]>(resolveStorage(storage), K.events, []).filter(
    (e) => e.type === type && (!productId || e.productId === productId)
  ).length;
}

// ---------- Recomendaciones por reglas (sin IA externa) ----------

export function recommendFor(productId: string, limit: number, storage?: StorageLike): ProductPublication[] {
  const s = resolveStorage(storage);
  const current = getPublication(productId, s);
  if (!current) return [];
  const others = listPublications(s).filter((p) => p.id !== productId && p.status === "PUBLISHED");
  const scored = others.map((p) => {
    let score = 0;
    if (p.category === current.category) score += 3;
    if (p.format === current.format) score += 1;
    const tags = new Set(p.tags.map((t) => t.toLowerCase()));
    for (const t of current.tags) if (tags.has(t.toLowerCase())) score += 2;
    score += Math.min(2, p.salesCount / 10) + Math.min(2, averageRating(p) / 2.5);
    return { p, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}
