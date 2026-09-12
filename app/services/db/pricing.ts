// ============================================
// PRICING STORE - persistencia de análisis
// ============================================
// Todo scoping por userId de sesión: un creador jamás lee análisis ajenos.

import { randomBytes } from "node:crypto";
import { getDb } from "./database";
import type { NormalizedComparable, PricingAnalysisResult, PricingFormat } from "../pricing/types";

export interface StoredAnalysis {
  id: string;
  productKey: string;
  format: string;
  recommendedPrice: number;
  rangeMin: number;
  rangeMax: number;
  budgetPrice: number;
  premiumPrice: number;
  confidence: number;
  marketPosition: string;
  reasoning: string[];
  internalEstimate: number;
  marketMedian: number | null;
  comparablesUsed: number;
  lowDataWarning: string | null;
  analyzedAt: string;
  comparables: NormalizedComparable[];
}

interface AnalysisRow {
  id: string;
  productKey: string;
  format: string;
  recommendedPrice: number;
  rangeMin: number;
  rangeMax: number;
  budgetPrice: number;
  premiumPrice: number;
  confidence: number;
  marketPosition: string;
  reasoning: string;
  internalEstimate: number;
  marketMedian: number | null;
  comparablesUsed: number;
  lowDataWarning: string | null;
  analyzedAt: string;
}

export function validProductKey(key: string): boolean {
  return /^[A-Za-z0-9:_-]{4,120}$/.test(key);
}

export function saveAnalysis(
  userId: string,
  productKey: string,
  format: PricingFormat,
  result: PricingAnalysisResult
): StoredAnalysis {
  if (!validProductKey(productKey)) throw new Error("INVALID_PRODUCT_KEY");
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId) as
    | { id: string }
    | undefined;
  if (!user) throw new Error("USER_NOT_FOUND");
  const id = `pa-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const r = result.recommendation;
  db.prepare(
    `INSERT INTO pricing_analyses (id, userId, productKey, format, recommendedPrice, rangeMin,
     rangeMax, budgetPrice, premiumPrice, confidence, marketPosition, reasoning,
     internalEstimate, marketMedian, comparablesUsed, lowDataWarning, analyzedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, userId, productKey, format, r.recommendedPrice, r.recommendedRangeMin, r.recommendedRangeMax,
    r.budgetPrice, r.premiumPrice, r.confidence, r.marketPosition, JSON.stringify(r.reasoning),
    result.internalEstimate, result.marketMedian, result.comparablesUsed, result.lowDataWarning,
    new Date().toISOString()
  );
  for (const [i, c] of result.comparables.slice(0, 40).entries()) {
    db.prepare(
      `INSERT INTO pricing_comparables (id, pricingAnalysisId, title, category, type,
       observedPrice, currency, normalizedPrice, sourceUrl, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `pc-${id.slice(3)}-${i}`, id, c.title, c.category, c.type, c.observedPrice, c.currency,
      c.normalizedPrice, c.sourceUrl ?? null, c.source
    );
  }
  const stored = getAnalysisById(userId, id);
  if (!stored) throw new Error("SAVE_FAILED");
  return stored;
}

function loadComparables(analysisId: string): NormalizedComparable[] {
  const rows = getDb()
    .prepare(
      `SELECT title, category, type, observedPrice, currency, normalizedPrice, sourceUrl, source
       FROM pricing_comparables WHERE pricingAnalysisId = ? ORDER BY rowid`
    )
    .all(analysisId) as {
    title: string;
    category: string;
    type: string;
    observedPrice: number;
    currency: string;
    normalizedPrice: number | null;
    sourceUrl: string | null;
    source: string;
  }[];
  return rows.map((c) => ({
    ...c,
    sourceUrl: c.sourceUrl ?? undefined,
    fxEstimated: false,
    excludedFromRange: c.normalizedPrice === null,
    source: "catalog" as const,
  }));
}

function toStored(row: AnalysisRow): StoredAnalysis {
  let reasoning: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.reasoning);
    if (Array.isArray(parsed)) reasoning = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    reasoning = [];
  }
  return {
    id: row.id,
    productKey: row.productKey,
    format: row.format,
    recommendedPrice: row.recommendedPrice,
    rangeMin: row.rangeMin,
    rangeMax: row.rangeMax,
    budgetPrice: row.budgetPrice,
    premiumPrice: row.premiumPrice,
    confidence: row.confidence,
    marketPosition: row.marketPosition,
    reasoning,
    internalEstimate: row.internalEstimate,
    marketMedian: row.marketMedian,
    comparablesUsed: row.comparablesUsed,
    lowDataWarning: row.lowDataWarning,
    analyzedAt: row.analyzedAt,
    comparables: loadComparables(row.id),
  };
}

export function getAnalysisById(userId: string, id: string): StoredAnalysis | null {
  const row = getDb()
    .prepare("SELECT * FROM pricing_analyses WHERE id = ? AND userId = ?")
    .get(id, userId) as unknown as AnalysisRow | undefined;
  return row ? toStored(row) : null;
}

/** Último análisis = caché vigente (no re-analiza al abrir la página). */
export function getLatestAnalysis(userId: string, productKey: string): StoredAnalysis | null {
  const row = getDb()
    .prepare(
      "SELECT * FROM pricing_analyses WHERE userId = ? AND productKey = ? ORDER BY analyzedAt DESC LIMIT 1"
    )
    .get(userId, productKey) as unknown as AnalysisRow | undefined;
  return row ? toStored(row) : null;
}

export function listAnalyses(userId: string, productKey: string): StoredAnalysis[] {
  const rows = getDb()
    .prepare("SELECT * FROM pricing_analyses WHERE userId = ? AND productKey = ? ORDER BY analyzedAt DESC LIMIT 20")
    .all(userId, productKey) as unknown as AnalysisRow[];
  return rows.map(toStored);
}
