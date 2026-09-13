// ============================================
// LICENSE SERVICE - verificación server-side de licencias Creator
// ============================================
// ÚNICA fuente de verdad sobre si un Creator puede crear/publicar productos.
// Toda verificación es server-side (SQLite). El frontend nunca decide esto.
// La licencia se activa SOLO tras pago confirmado (order PAID + license).

import { randomBytes } from "node:crypto";
import { getDb } from "../db/database";
import { getLicenseTier, type LicenseTier } from "./catalog";
import { listProductsByCreator } from "../db/products";

export type LicenseStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING" | "REVOKED";

export interface CreatorLicense {
  id: string;
  userId: string;
  plan: string;
  status: LicenseStatus;
  orderId: string;
  maxProducts: number;
  maxPublished: number;
  durationDays: number;
  purchasedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseInfo extends CreatorLicense {
  tier: LicenseTier;
  productsCreated: number;
  productsPublished: number;
  remainingProducts: number;
  remainingPublished: number;
  isActive: boolean;
  isExpired: boolean;
}

export class LicenseError extends Error {
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

interface LicenseRow {
  id: string;
  userId: string;
  plan: string;
  status: string;
  orderId: string;
  maxProducts: number;
  maxPublished: number;
  durationDays: number;
  purchasedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

function toLicense(r: LicenseRow): CreatorLicense {
  return {
    ...r,
    status: r.status as LicenseStatus,
  };
}

/**
 * Devuelve la licencia ACTIVA de un usuario (status=ACTIVE y no vencida).
 * Si la licencia está vencida en DB pero no se marcó, la marca EXPIRED y
 * devuelve null. Solo puede haber una licencia ACTIVE por usuario.
 */
export function getActiveLicense(userId: string): CreatorLicense | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM creator_licenses WHERE userId = ? AND status = 'ACTIVE' ORDER BY expiresAt DESC LIMIT 1")
    .get(userId) as LicenseRow | undefined;
  if (!row) return null;

  // Auto-expiración: si ya pasó expiresAt, marcar EXPIRED en DB.
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    db.prepare("UPDATE creator_licenses SET status = 'EXPIRED', updatedAt = ? WHERE id = ?").run(
      nowIso(),
      row.id
    );
    return null;
  }
  return toLicense(row);
}

/**
 * Verifica si un Creator puede crear un producto nuevo.
 * Requiere licencia ACTIVA + no exceder maxProducts.
 * Devuelve { ok: true } o { ok: false, code, message }.
 */
export function checkLicenseForCreation(userId: string): { ok: true } | { ok: false; code: string; message: string } {
  const license = getActiveLicense(userId);
  if (!license) {
    return {
      ok: false,
      code: "CREATOR_LICENSE_REQUIRED",
      message: "Necesitas una licencia Creator activa para crear productos.",
    };
  }
  const products = listProductsByCreator(userId);
  if (products.length >= license.maxProducts) {
    return {
      ok: false,
      code: "LICENSE_PRODUCT_LIMIT_REACHED",
      message: `Alcanzaste el límite de ${license.maxProducts} productos de tu plan ${license.plan}.`,
    };
  }
  return { ok: true };
}

/**
 * Verifica si un Creator puede publicar un producto.
 * Requiere licencia ACTIVA + no exceder maxPublished.
 */
export function checkLicenseForPublish(userId: string): { ok: true } | { ok: false; code: string; message: string } {
  const license = getActiveLicense(userId);
  if (!license) {
    return {
      ok: false,
      code: "CREATOR_LICENSE_REQUIRED",
      message: "Necesitas una licencia Creator activa para publicar productos.",
    };
  }
  const products = listProductsByCreator(userId);
  const published = products.filter((p) => p.status === "PUBLISHED").length;
  if (published >= license.maxPublished) {
    return {
      ok: false,
      code: "LICENSE_PUBLISH_LIMIT_REACHED",
      message: `Alcanzaste el límite de ${license.maxPublished} publicaciones de tu plan ${license.plan}.`,
    };
  }
  return { ok: true };
}

/**
 * Activa una licencia tras pago confirmado. Idempotente por orderId.
 * El plan y los límites se leen del catálogo (precio ya validado en la orden).
 * Solo se llama desde settlePaidOrder (post-confirmación de pago).
 */
export function activateLicense(userId: string, orderId: string, tierId: string): { created: boolean; license: CreatorLicense } {
  const tier = getLicenseTier(tierId);
  if (!tier) throw new LicenseError("INVALID_TIER", `Plan inválido: ${tierId}`);

  const db = getDb();
  // Idempotencia: si ya existe una licencia para esta orden, devolverla.
  const existing = db.prepare("SELECT * FROM creator_licenses WHERE orderId = ?").get(orderId) as LicenseRow | undefined;
  if (existing) return { created: false, license: toLicense(existing) };

  // Verificar que la orden esté PAID y sea del usuario.
  const order = db.prepare("SELECT id, userId, status, orderType FROM orders WHERE id = ?").get(orderId) as
    | { id: string; userId: string; status: string; orderType: string }
    | undefined;
  if (!order) throw new LicenseError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== userId) throw new LicenseError("OWNERSHIP", "La orden no es del usuario");
  if (order.status !== "PAID") throw new LicenseError("ORDER_NOT_PAID", "La orden no está pagada");
  if (order.orderType !== "license") throw new LicenseError("NOT_A_LICENSE", "La orden no es de licencia");

  // Cancelar licencia anterior activa (solo una ACTIVE a la vez).
  db.prepare("UPDATE creator_licenses SET status = 'CANCELLED', updatedAt = ? WHERE userId = ? AND status = 'ACTIVE'").run(
    nowIso(),
    userId
  );

  const now = nowIso();
  const expiresAt = new Date(Date.now() + tier.durationDays * 86400000).toISOString();
  const id = uid("lic");
  const row: LicenseRow = {
    id,
    userId,
    plan: tier.id,
    status: "ACTIVE",
    orderId,
    maxProducts: tier.maxProducts,
    maxPublished: tier.maxPublished,
    durationDays: tier.durationDays,
    purchasedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO creator_licenses (id, userId, plan, status, orderId, maxProducts, maxPublished, durationDays, purchasedAt, expiresAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id, row.userId, row.plan, row.status, row.orderId,
    row.maxProducts, row.maxPublished, row.durationDays,
    row.purchasedAt, row.expiresAt, row.createdAt, row.updatedAt
  );
  return { created: true, license: toLicense(row) };
}

/**
 * Renueva una licencia: extiende expiresAt según el plan.
 * Requiere pago confirmado (orderId PAID + license).
 */
export function renewLicense(userId: string, orderId: string, tierId: string): { created: boolean; license: CreatorLicense } {
  const tier = getLicenseTier(tierId);
  if (!tier) throw new LicenseError("INVALID_TIER", `Plan inválido: ${tierId}`);

  const db = getDb();
  // Verificar orden PAID
  const order = db.prepare("SELECT id, userId, status, orderType FROM orders WHERE id = ?").get(orderId) as
    | { id: string; userId: string; status: string; orderType: string }
    | undefined;
  if (!order) throw new LicenseError("ORDER_NOT_FOUND", "Orden inexistente");
  if (order.userId !== userId) throw new LicenseError("OWNERSHIP", "La orden no es del usuario");
  if (order.status !== "PAID") throw new LicenseError("ORDER_NOT_PAID", "La orden no está pagada");
  if (order.orderType !== "license") throw new LicenseError("NOT_A_LICENSE", "La orden no es de licencia");

  // Idempotencia
  const existing = db.prepare("SELECT * FROM creator_licenses WHERE orderId = ?").get(orderId) as LicenseRow | undefined;
  if (existing) return { created: false, license: toLicense(existing) };

  // Cancelar licencia anterior
  db.prepare("UPDATE creator_licenses SET status = 'CANCELLED', updatedAt = ? WHERE userId = ? AND status = 'ACTIVE'").run(
    nowIso(),
    userId
  );

  const now = nowIso();
  const expiresAt = new Date(Date.now() + tier.durationDays * 86400000).toISOString();
  const id = uid("lic");
  const row: LicenseRow = {
    id,
    userId,
    plan: tier.id,
    status: "ACTIVE",
    orderId,
    maxProducts: tier.maxProducts,
    maxPublished: tier.maxPublished,
    durationDays: tier.durationDays,
    purchasedAt: now,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  };
  db.prepare(
    `INSERT INTO creator_licenses (id, userId, plan, status, orderId, maxProducts, maxPublished, durationDays, purchasedAt, expiresAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id, row.userId, row.plan, row.status, row.orderId,
    row.maxProducts, row.maxPublished, row.durationDays,
    row.purchasedAt, row.expiresAt, row.createdAt, row.updatedAt
  );
  return { created: true, license: toLicense(row) };
}

/**
 * Cambia de plan: crea una nueva licencia con el nuevo tier.
 * Requiere pago confirmado de la nueva orden.
 */
export function changePlan(userId: string, orderId: string, newTierId: string): { created: boolean; license: CreatorLicense } {
  return renewLicense(userId, orderId, newTierId);
}

/**
 * Devuelve la info completa de la licencia del usuario (para el frontend).
 * Incluye productos creados, publicados, restantes, estado de vencimiento.
 */
export function getLicenseInfo(userId: string): LicenseInfo | null {
  const db = getDb();
  // Buscar la licencia más reciente (cualquier estado)
  const row = db
    .prepare("SELECT * FROM creator_licenses WHERE userId = ? ORDER BY createdAt DESC LIMIT 1")
    .get(userId) as LicenseRow | undefined;
  if (!row) return null;

  const tier = getLicenseTier(row.plan);
  if (!tier) return null;

  const license = toLicense(row);
  // Auto-expiración
  let isActive = license.status === "ACTIVE" && new Date(license.expiresAt).getTime() > Date.now();
  if (license.status === "ACTIVE" && !isActive) {
    db.prepare("UPDATE creator_licenses SET status = 'EXPIRED', updatedAt = ? WHERE id = ?").run(
      nowIso(),
      license.id
    );
    license.status = "EXPIRED";
  }

  const products = listProductsByCreator(userId);
  const productsCreated = products.length;
  const productsPublished = products.filter((p) => p.status === "PUBLISHED").length;

  return {
    ...license,
    tier,
    productsCreated,
    productsPublished,
    remainingProducts: Math.max(0, license.maxProducts - productsCreated),
    remainingPublished: Math.max(0, license.maxPublished - productsPublished),
    isActive,
    isExpired: license.status === "EXPIRED",
  };
}
