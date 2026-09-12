// Tests del Pricing Advisor (DB temporal; sin red, sin IA externa).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-pricing-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb } from "../db/database";
import { loginUser, registerUser } from "../db/../../services/auth/auth";
import { extractFeatures } from "./extractFeatures";
import { normalizeComparables, normalizeToUsd, selectCatalogComparables } from "./marketResearch";
import { PricingAdvisorService, internalEstimate } from "./pricingAdvisor";
import { getAnalysisById, getLatestAnalysis, listAnalyses, saveAnalysis } from "../db/pricing";
import type { LocalProductSummary } from "../marketplace/productAdapters";
import type { NormalizedComparable, ProductFeatures } from "./types";

const DB = process.env.DATABASE_PATH as string;

function resetDb(): void {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
}

beforeEach(() => {
  resetDb();
});

function makeUser(email: string): string {
  const reg = registerUser(email, "Ada", "password123", { lastName: "Lovelace", termsAccepted: true });
  if (!reg.ok) throw new Error("setup falló");
  return reg.user.id;
}

function courseFeatures(): ProductFeatures {
  return {
    format: "course",
    title: "Ciberseguridad total",
    category: "Tecnología",
    niche: "",
    audience: "",
    level: "beginner",
    language: "es",
    modules: 9,
    lessons: 40,
    durationMinutes: 600,
    chapters: 0,
    sections: 0,
    words: 0,
    pages: 0,
    webSections: 0,
    webComponents: 0,
    resources: 0,
    folders: 0,
    activities: 40,
    quizzes: 40,
    hasExam: true,
    hasCertificate: true,
    hasVideo: false,
    bonuses: 0,
    downloadableFiles: 0,
    depthScore: 5,
  };
}

function norm(prices: number[], currency = "USD"): NormalizedComparable[] {
  return normalizeComparables(
    prices.map((p, i) => ({ title: `Comp ${i}`, category: "Tecnología", type: "course", observedPrice: p, currency }))
  );
}

const service = new PricingAdvisorService();

describe("pricing: formatos", () => {
  it("producto básico: recomendación válida con confianza baja y aviso", () => {
    const r = service.analyze({
      features: { ...courseFeatures(), modules: 1, lessons: 2, durationMinutes: 30, activities: 0, quizzes: 0, hasExam: false, hasCertificate: false, depthScore: 1, level: "todos" },
      comparables: [],
      externalResearchAvailable: false,
    });
    expect(r.recommendation.recommendedPrice).toBeGreaterThanOrEqual(5);
    expect(r.recommendation.confidence).toBeLessThanOrEqual(45);
    expect(r.lowDataWarning).toContain("No encontramos suficientes");
    expect(r.marketAvailable).toBe(false);
  });

  it("curso completo: números consistentes y posicionamiento", () => {
    const r = service.analyze({ features: courseFeatures(), comparables: norm([40, 50, 60, 70]), externalResearchAvailable: true });
    expect(r.recommendation.recommendedPrice).toBe(87);
    expect(r.recommendation.recommendedRangeMin).toBeLessThan(93);
    expect(r.recommendation.recommendedRangeMax).toBeGreaterThan(93);
    expect(r.recommendation.budgetPrice).toBeLessThan(93);
    expect(r.recommendation.premiumPrice).toBeGreaterThan(93);
    expect(r.recommendation.marketPosition).toBe("premium");
    expect(r.recommendation.reasoning.length).toBeGreaterThanOrEqual(3);
    expect(r.recommendation.reasoning.join(" ")).toContain("9 módulos");
  });

  it("ebook, pdf, web y kit generan estimaciones distintas y acotadas", () => {
    const base: ProductFeatures = { ...courseFeatures(), level: "todos" };
    const ebook = internalEstimate({ ...base, format: "ebook", modules: 0, lessons: 0, durationMinutes: 0, activities: 0, quizzes: 0, hasExam: false, hasCertificate: false, chapters: 12, words: 30000, pages: 120, depthScore: 3 });
    const pdf = internalEstimate({ ...base, format: "pdf", modules: 0, lessons: 0, durationMinutes: 0, activities: 0, quizzes: 0, hasExam: false, hasCertificate: false, chapters: 6, words: 12000, pages: 60, depthScore: 2 });
    const web = internalEstimate({ ...base, format: "interactive_web", modules: 0, lessons: 0, durationMinutes: 0, activities: 5, quizzes: 0, hasExam: false, hasCertificate: false, webSections: 8, webComponents: 30, depthScore: 3 });
    const kit = internalEstimate({ ...base, format: "kit", modules: 0, lessons: 0, durationMinutes: 0, activities: 0, quizzes: 0, hasExam: false, hasCertificate: false, resources: 25, folders: 5, downloadableFiles: 10, depthScore: 3 });
    expect(new Set([ebook, pdf, web, kit]).size).toBe(4);
    for (const v of [ebook, pdf, web, kit]) expect(v).toBeGreaterThanOrEqual(5);
  });
});

describe("pricing: mercado y monedas", () => {
  it("pocos comparables: aviso + confianza media", () => {
    const r = service.analyze({ features: { ...courseFeatures(), level: "todos" }, comparables: norm([50]), externalResearchAvailable: true });
    expect(r.lowDataWarning).not.toBeNull();
    expect(r.recommendation.confidence).toBeLessThan(70);
    expect(r.comparablesUsed).toBe(1);
  });

  it("búsqueda externa fallida: fallback honesto con tope de confianza", () => {
    const r = service.analyze({ features: courseFeatures(), comparables: norm([40, 50, 60, 70]), externalResearchAvailable: false });
    expect(r.marketUnavailableNote).toContain("no está disponible");
    expect(r.recommendation.confidence).toBeLessThanOrEqual(80);
    expect(r.recommendation.recommendedPrice).toBeGreaterThan(0);
  });

  it("moneda diferente: EUR se normaliza estimado, USDT 1:1, inválida se excluye", () => {
    expect(normalizeToUsd(10, "USDT")).toEqual({ usd: 10, estimated: false });
    const eur = normalizeToUsd(100, "EUR");
    expect(eur.usd).toBeCloseTo(108, 0);
    expect(eur.estimated).toBe(true);
    expect(normalizeToUsd(10, "XYZ").usd).toBeNull();
    const comps = normalizeComparables([
      { title: "A", category: "T", type: "course", observedPrice: 50, currency: "USD" },
      { title: "B", category: "T", type: "course", observedPrice: 10, currency: "XYZ" },
    ]);
    expect(comps[0]?.excludedFromRange).toBe(false);
    expect(comps[1]?.excludedFromRange).toBe(true);
    const r = service.analyze({ features: courseFeatures(), comparables: comps, externalResearchAvailable: true });
    expect(r.comparablesUsed).toBe(1);
  });

  it("selector de catálogo filtra por categoría/formato y excluye el propio", () => {
    const out = selectCatalogComparables(
      [
        { title: "Mío", category: "Tecnología", format: "course", price: 10, currency: "USD" },
        { title: "Otro tema", category: "Cocina", format: "pdf", price: 99, currency: "USD" },
        { title: " rival ", category: "Tecnología", format: "course", price: 60, currency: "USD" },
      ],
      "Tecnología",
      "course",
      "mío"
    );
    expect(out.map((c) => c.title)).toEqual([" rival "]);
  });
});

describe("pricing: reglas de negocio", () => {
  it("recomendación determinista y precio manual intacto (no muta el producto)", () => {
    const f = courseFeatures();
    const snapshot = JSON.stringify(f);
    const a = service.analyze({ features: f, comparables: norm([50]), externalResearchAvailable: true });
    const b = service.analyze({ features: f, comparables: norm([50]), externalResearchAvailable: true });
    expect(a).toEqual(b);
    expect(JSON.stringify(f)).toBe(snapshot);
  });

  it("sin IA externa igual hay explicación por reglas", () => {
    const r = service.analyze({ features: courseFeatures(), comparables: [], externalResearchAvailable: false });
    expect(r.recommendation.reasoning.join(" ")).toContain("Precio sugerido por Crow AI");
  });
});

describe("pricing: extracción sin inventar", () => {
  it("lo desconocido queda en 0/false", () => {
    const summary = {
      format: "course",
      title: "X",
      description: "",
      language: "es",
      level: "todos",
      stats: {},
      includes: [],
      coverSvg: null,
      tags: [],
    } as unknown as LocalProductSummary;
    const f = extractFeatures(summary, { title: "X", category: "T", level: "todos", language: "es", bonuses: 0 });
    expect(f.lessons).toBe(0);
    expect(f.hasExam).toBe(false);
    expect(f.hasVideo).toBe(false);
    expect(f.depthScore).toBe(1);
  });
});

describe("pricing: persistencia y ownership", () => {
  function analyzed(userId: string, key: string) {
    const result = service.analyze({ features: courseFeatures(), comparables: norm([50]), externalResearchAvailable: false });
    return saveAnalysis(userId, key, "course", result);
  }

  it("persiste y recupera el último análisis con comparables", () => {
    const u = makeUser("a@t.co");
    const saved = analyzed(u, "draft:course:seguridad");
    const latest = getLatestAnalysis(u, "draft:course:seguridad");
    expect(latest?.id).toBe(saved.id);
    expect(latest?.comparables).toHaveLength(1);
    expect(getAnalysisById(u, saved.id)?.recommendedPrice).toBe(saved.recommendedPrice);
  });

  it("creador sin acceso a análisis de otro producto/usuario", () => {
    const a = makeUser("a@t.co");
    const b = makeUser("b@t.co");
    const saved = analyzed(a, "draft:course:seguridad");
    expect(getLatestAnalysis(b, "draft:course:seguridad")).toBeNull();
    expect(getAnalysisById(b, saved.id)).toBeNull();
    expect(getLatestAnalysis(a, "draft:course:otra")).toBeNull();
  });

  it("actualización crea historial y el último manda", () => {
    const u = makeUser("a@t.co");
    const first = analyzed(u, "draft:course:seguridad");
    const second = analyzed(u, "draft:course:seguridad");
    expect(getLatestAnalysis(u, "draft:course:seguridad")?.id).toBe(second.id);
    expect(listAnalyses(u, "draft:course:seguridad")).toHaveLength(2);
    expect(first.id).not.toBe(second.id);
  });

  it("rechaza productKey inválida y usuario inexistente", () => {
    const u = makeUser("a@t.co");
    const result = service.analyze({ features: courseFeatures(), comparables: [], externalResearchAvailable: false });
    expect(() => saveAnalysis(u, "xx", "course", result)).toThrowError("INVALID_PRODUCT_KEY");
    expect(() => saveAnalysis("usr-nope", "draft:course:x", "course", result)).toThrowError("USER_NOT_FOUND");
  });

  it("registro+login funcionan para el flujo con sesión (sanity auth existente)", () => {
    makeUser("a@t.co");
    expect(loginUser("a@t.co", "password123").ok).toBe(true);
  });
});
