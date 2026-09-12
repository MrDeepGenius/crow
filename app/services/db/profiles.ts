// ============================================
// PROFILES - cuenta única multi-rol + onboarding
// ============================================
// UN userId, roles ["buyer","affiliate","creator"] y un perfil 1:1 por rol.
// Toda función recibe userId explícito del servidor (sesión); jamás del body.
// Listas cerradas validadas en servidor: el frontend no puede inventar valores.

import { getDb } from "./database";

export const ROLES = ["buyer", "affiliate", "creator"] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export interface OnboardingState {
  roles: Role[];
  onboardingCompleted: boolean;
  hasAffiliateProfile: boolean;
  hasBuyerProfile: boolean;
  hasCreatorProfile: boolean;
}

function parseRoles(raw: string): Role[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is Role => typeof r === "string" && isRole(r));
  } catch {
    return [];
  }
}

export function getRoles(userId: string): Role[] {
  const row = getDb().prepare("SELECT roles FROM users WHERE id = ?").get(userId) as
    | { roles: string }
    | undefined;
  return row ? parseRoles(row.roles) : [];
}

/**
 * Activa roles de forma ADITIVA (nunca quita): un comprador puede volverse
 * afiliado/creador después sin otra cuenta. Rechaza roles inválidos.
 */
export function addRoles(userId: string, roles: string[]): Role[] {
  const clean = [...new Set(roles.filter((r): r is Role => isRole(r)))];
  if (clean.length === 0) throw new Error("EMPTY_ROLES");
  const db = getDb();
  const row = db.prepare("SELECT roles FROM users WHERE id = ?").get(userId) as
    | { roles: string }
    | undefined;
  if (!row) throw new Error("USER_NOT_FOUND");
  const merged = [...new Set([...parseRoles(row.roles), ...clean])];
  db.prepare("UPDATE users SET roles = ?, updatedAt = ? WHERE id = ?").run(
    JSON.stringify(merged),
    new Date().toISOString(),
    userId
  );
  return merged;
}

/** Permiso server-side para superficies por rol. */
export function requireRole(userId: string, role: Role): boolean {
  return getRoles(userId).includes(role);
}

export function getOnboarding(userId: string): OnboardingState {
  const db = getDb();
  const row = db.prepare("SELECT roles, onboardingCompleted FROM users WHERE id = ?").get(userId) as
    | { roles: string; onboardingCompleted: number }
    | undefined;
  if (!row) throw new Error("USER_NOT_FOUND");
  const roles = parseRoles(row.roles);
  const has = (table: string): boolean =>
    Boolean(
      db.prepare(`SELECT userId FROM ${table} WHERE userId = ?`).get(userId) as
        | { userId: string }
        | undefined
    );
  return {
    roles,
    onboardingCompleted: row.onboardingCompleted === 1,
    hasAffiliateProfile: has("affiliate_profiles"),
    hasBuyerProfile: has("buyer_profiles"),
    hasCreatorProfile: has("creator_profiles"),
  };
}

export function completeOnboarding(userId: string): void {
  const state = getOnboarding(userId);
  if (state.roles.length === 0) throw new Error("NO_ROLES");
  const missing: string[] = [];
  if (state.roles.includes("affiliate") && !state.hasAffiliateProfile) missing.push("affiliate");
  if (state.roles.includes("buyer") && !state.hasBuyerProfile) missing.push("buyer");
  if (state.roles.includes("creator") && !state.hasCreatorProfile) missing.push("creator");
  if (missing.length > 0) throw new Error(`INCOMPLETE_PROFILES:${missing.join(",")}`);
  getDb().prepare("UPDATE users SET onboardingCompleted = 1, updatedAt = ? WHERE id = ?").run(
    new Date().toISOString(),
    userId
  );
}

// ---------- Listas cerradas (spec) ----------

export const AFFILIATE_CATEGORIES = [
  "Negocios",
  "Marketing",
  "Tecnología",
  "Inteligencia Artificial",
  "Educación",
  "Finanzas",
  "Desarrollo personal",
  "Salud y bienestar",
  "Diseño",
  "Otros",
] as const;

export const AFFILIATE_EXPERIENCE = ["Estoy empezando", "Tengo algo de experiencia", "Soy avanzado"] as const;

export const AFFILIATE_CHANNELS = [
  "TikTok",
  "Instagram",
  "YouTube",
  "Facebook",
  "WhatsApp",
  "Telegram",
  "Página web/blog",
  "Comunidad propia",
  "Otro",
] as const;

export const AFFILIATE_GOALS = [
  "Generar ingresos extra",
  "Crear un negocio de afiliados",
  "Escalar mis ventas",
  "Monetizar mi audiencia",
  "Otro",
] as const;

export const BUYER_CATEGORIES = AFFILIATE_CATEGORIES;

export const BUYER_FORMATS = [
  "Cursos",
  "Ebooks",
  "PDFs",
  "Webs interactivas",
  "Kits de recursos",
  "Herramientas",
] as const;

export const BUYER_GOALS = [
  "Aprender",
  "Mejorar profesionalmente",
  "Empezar un negocio",
  "Mejorar mis ingresos",
  "Adquirir herramientas",
  "Otro",
] as const;

export const CREATOR_TYPES = ["Cursos", "Web interactiva", "PDF", "Ebook", "Kit de recursos"] as const;

export const CREATOR_HAS_PRODUCTS = ["Sí", "No", "Tengo ideas pero todavía no los terminé"] as const;

export const CREATOR_EXPERIENCE = ["Ninguna", "Básica", "Intermedia", "Avanzada"] as const;

export const CREATOR_HAS_BRAND = ["Sí", "No"] as const;

export interface AffiliateProfileData {
  categories: string[];
  experience: string;
  channels: string[];
  goal: string;
  otherText?: string;
}

export interface BuyerProfileData {
  categories: string[];
  formats: string[];
  goals: string[];
  otherText?: string;
}

export interface CreatorProfileData {
  productTypes: string[];
  niche: string;
  hasProducts: string;
  experience: string;
  hasBrand: string;
  brandName?: string;
  brandDescription?: string;
}

function checkList(values: string[], allowed: readonly string[], field: string, min = 1): string[] {
  if (!Array.isArray(values) || values.length < min) throw new Error(`INVALID_${field}`);
  const bad = values.filter((v) => typeof v !== "string" || !(allowed as readonly string[]).includes(v));
  if (bad.length > 0) throw new Error(`INVALID_${field}`);
  return [...new Set(values)];
}

function checkOne(value: string, allowed: readonly string[], field: string): string {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`INVALID_${field}`);
  }
  return value;
}

function checkText(value: string | undefined, field: string, max: number, required: boolean): string {
  const clean = (value ?? "").trim().slice(0, max);
  if (required && clean.length === 0) throw new Error(`INVALID_${field}`);
  return clean;
}

function saveProfile(table: string, userId: string, data: unknown): void {
  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as
    | { id: string }
    | undefined;
  if (!exists) throw new Error("USER_NOT_FOUND");
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO ${table} (userId, data, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET data = excluded.data, updatedAt = excluded.updatedAt`
  ).run(userId, JSON.stringify(data), now);
}

function readProfile<T>(table: string, userId: string): T | null {
  const row = getDb().prepare(`SELECT data FROM ${table} WHERE userId = ?`).get(userId) as
    | { data: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data) as T;
  } catch {
    return null;
  }
}

export function saveAffiliateProfile(userId: string, input: AffiliateProfileData): AffiliateProfileData {
  const data: AffiliateProfileData = {
    categories: checkList(input.categories, AFFILIATE_CATEGORIES, "CATEGORIES").slice(0, 10),
    experience: checkOne(input.experience, AFFILIATE_EXPERIENCE, "EXPERIENCE"),
    channels: checkList(input.channels, AFFILIATE_CHANNELS, "CHANNELS").slice(0, 9),
    goal: checkOne(input.goal, AFFILIATE_GOALS, "GOAL"),
    otherText: checkText(input.otherText, "OTHER", 200, false) || undefined,
  };
  saveProfile("affiliate_profiles", userId, data);
  return data;
}

export function saveBuyerProfile(userId: string, input: BuyerProfileData): BuyerProfileData {
  const data: BuyerProfileData = {
    categories: checkList(input.categories, BUYER_CATEGORIES, "CATEGORIES").slice(0, 10),
    formats: checkList(input.formats, BUYER_FORMATS, "FORMATS").slice(0, 6),
    goals: checkList(input.goals, BUYER_GOALS, "GOALS").slice(0, 6),
    otherText: checkText(input.otherText, "OTHER", 200, false) || undefined,
  };
  saveProfile("buyer_profiles", userId, data);
  return data;
}

export function saveCreatorProfile(userId: string, input: CreatorProfileData): CreatorProfileData {
  const hasBrand = checkOne(input.hasBrand, CREATOR_HAS_BRAND, "HAS_BRAND");
  const data: CreatorProfileData = {
    productTypes: checkList(input.productTypes, CREATOR_TYPES, "PRODUCT_TYPES").slice(0, 5),
    niche: checkText(input.niche, "NICHE", 200, true),
    hasProducts: checkOne(input.hasProducts, CREATOR_HAS_PRODUCTS, "HAS_PRODUCTS"),
    experience: checkOne(input.experience, CREATOR_EXPERIENCE, "EXPERIENCE"),
    hasBrand,
    brandName: hasBrand === "Sí" ? checkText(input.brandName, "BRAND_NAME", 120, true) : undefined,
    brandDescription:
      hasBrand === "Sí" ? checkText(input.brandDescription, "BRAND_DESC", 500, false) || undefined : undefined,
  };
  saveProfile("creator_profiles", userId, data);
  return data;
}

export function getAffiliateProfile(userId: string): AffiliateProfileData | null {
  return readProfile<AffiliateProfileData>("affiliate_profiles", userId);
}

export function getBuyerProfile(userId: string): BuyerProfileData | null {
  return readProfile<BuyerProfileData>("buyer_profiles", userId);
}

export function getCreatorProfile(userId: string): CreatorProfileData | null {
  return readProfile<CreatorProfileData>("creator_profiles", userId);
}
