// ============================================
// MARKET RESEARCH - comparables OBSERVADOS
// ============================================
// Fuente real: catálogo Crow (precios que creadores ya publicaron).
// NO hay scraping ni API externa configurada: el proveedor web queda como
// extensión documentada y el sistema usa fallback honesto con confianza baja.
// Monedas: USD/USDT 1:1 (referencia, spec §4). Otras monedas usan tabla FX
// sobreescribible por env y se marcan estimated (bajan confianza).

import type { ComparableInput, NormalizedComparable, PricingFormat } from "./types";

export interface FxEntry {
  rateToUsd: number;
  estimated: boolean;
}

const FALLBACK_FX: Record<string, number> = {
  USD: 1,
  USDT: 1,
  EUR: 1.08,
  GBP: 1.27,
  BRL: 0.2,
  MXN: 0.06,
  ARS: 0.001,
};

export function loadFxTable(): { rates: Record<string, number>; fromEnv: boolean } {
  const raw = process.env.PRICING_FX_RATES_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const rates: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isFinite(v) && v > 0) {
          rates[k.toUpperCase()] = v;
        }
      }
      if (Object.keys(rates).length > 0) return { rates, fromEnv: true };
    } catch {
      // cae al fallback
    }
  }
  return { rates: { ...FALLBACK_FX }, fromEnv: false };
}

/** Normaliza a USD. Null = moneda no soportada (se excluye del rango). */
export function normalizeToUsd(
  price: number,
  currency: string,
  fx: Record<string, number> = loadFxTable().rates
): { usd: number | null; estimated: boolean } {
  const code = currency.trim().toUpperCase();
  const rate = fx[code];
  if (typeof rate !== "number" || !(rate > 0)) return { usd: null, estimated: false };
  return { usd: Math.round(price * rate * 100) / 100, estimated: code !== "USD" && code !== "USDT" };
}

export function normalizeComparables(inputs: ComparableInput[]): NormalizedComparable[] {
  const { rates } = loadFxTable();
  return inputs
    .filter(
      (c) =>
        typeof c.title === "string" &&
        typeof c.observedPrice === "number" &&
        Number.isFinite(c.observedPrice) &&
        c.observedPrice > 0
    )
    .slice(0, 40)
    .map((c) => {
      const { usd, estimated } = normalizeToUsd(c.observedPrice, c.currency, rates);
      return {
        title: c.title.slice(0, 120),
        category: (c.category ?? "").slice(0, 60),
        type: (c.type ?? "").slice(0, 40),
        observedPrice: c.observedPrice,
        currency: c.currency.trim().toUpperCase().slice(0, 8),
        sourceUrl: typeof c.sourceUrl === "string" ? c.sourceUrl.slice(0, 300) : undefined,
        normalizedPrice: usd,
        fxEstimated: estimated,
        excludedFromRange: usd === null,
        source: "catalog" as const,
      };
    });
}

export interface CatalogProduct {
  title: string;
  category: string;
  format: string;
  price: number;
  currency: string;
}

/**
 * Totales reales del catálogo para comparables. El cliente envía productos
 * PUBLISHED de su dispositivo (único catálogo disponible); el servidor valida
 * y filtra por categoría/formato. Nada se inventa.
 */
export function selectCatalogComparables(
  catalog: CatalogProduct[],
  category: string,
  format: PricingFormat,
  excludeTitle: string
): ComparableInput[] {
  const cat = category.trim().toLowerCase();
  const mine = excludeTitle.trim().toLowerCase();
  const scored = catalog
    .filter((p) => typeof p.price === "number" && p.price > 0 && p.title.trim().toLowerCase() !== mine)
    .map((p) => {
      let score = 0;
      if (p.category.trim().toLowerCase() === cat && cat) score += 2;
      if (p.format === format) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  return scored.map((x) => ({
    title: x.p.title,
    category: x.p.category,
    type: x.p.format,
    observedPrice: x.p.price,
    currency: x.p.currency,
  }));
}

export interface MarketResearchProvider {
  readonly name: string;
  research(): Promise<ComparableInput[]>;
}

/** Sin fuente externa configurada: retorna vacío y el pipeline usa fallback. */
export class NoExternalResearchProvider implements MarketResearchProvider {
  readonly name = "none";
  async research(): Promise<ComparableInput[]> {
    return [];
  }
}
