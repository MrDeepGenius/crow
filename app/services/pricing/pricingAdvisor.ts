// ============================================
// PRICING ADVISOR SERVICE - recomendación determinística
// ============================================
// Pipeline: Product Analysis → Market Research → Pricing Calculation →
// AI Explanation (explicador por reglas con datos reales; la IA generativa
// se enchufa aquí cuando haya keys, sin cambiar el cálculo).
//
// Pesos documentados (heurística interna, NO datos de mercado):
// curso: base 29 + módulos/lecciones/duración/examen/certificado/acts/quizzes
// pdf/ebook: base 12 + capítulos/palabras/páginas
// web: base 24 + secciones/componentes | kit: base 19 + recursos/carpetas
// bonos +3 c/u (máx 5), multiplicador por nivel.

import type {
  MarketPosition,
  NormalizedComparable,
  PricingAnalysisResult,
  ProductFeatures,
} from "./types";

const LEVEL_MULT: Record<string, number> = {
  beginner: 0.9,
  principiante: 0.9,
  todos: 1.0,
  all: 1.0,
  intermediate: 1.1,
  intermedio: 1.1,
  advanced: 1.2,
  avanzado: 1.2,
};

function levelMult(level: string): number {
  return LEVEL_MULT[level.trim().toLowerCase()] ?? 1.0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Estimación interna en USD desde características reales. */
export function internalEstimate(f: ProductFeatures): number {
  let value: number;
  switch (f.format) {
    case "course":
      value =
        29 +
        Math.min(f.modules, 12) * 3 +
        Math.min(f.lessons, 45) * 1.1 +
        Math.min(f.durationMinutes / 60, 20) * 1.5 +
        (f.hasExam ? 4 : 0) +
        (f.hasCertificate ? 5 : 0) +
        (f.hasVideo ? 4 : 0) +
        Math.min(f.activities, 25) * 0.5 +
        Math.min(f.quizzes, 25) * 0.5;
      value = clamp(value, 19, 199);
      break;
    case "pdf":
    case "ebook":
      value =
        12 +
        Math.min(f.chapters, 25) * 1.4 +
        Math.min(f.words / 5000, 10) * 1 +
        Math.min(f.pages, 40) * 0.4;
      value = clamp(value, 9, 99);
      break;
    case "interactive_web":
      value =
        24 +
        Math.min(f.webSections, 14) * 4 +
        Math.min(f.webComponents, 50) * 0.7 +
        Math.min(f.activities, 20) * 0.5;
      value = clamp(value, 15, 149);
      break;
    case "kit":
      value =
        19 +
        Math.min(f.resources, 50) * 1.1 +
        Math.min(f.folders, 12) * 2 +
        Math.min(f.downloadableFiles, 30) * 0.4;
      value = clamp(value, 12, 129);
      break;
  }
  value += Math.min(f.bonuses, 5) * 3;
  return Math.round(value * levelMult(f.level));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] as number + sorted[mid] as number) / 2 : (sorted[mid] as number);
}

function positionFor(recommended: number, marketMedian: number | null): MarketPosition {
  if (marketMedian === null || marketMedian <= 0) return "intermedio";
  const ratio = recommended / marketMedian;
  if (ratio < 0.8) return "económico";
  if (ratio > 1.3) return "premium";
  if (ratio >= 1.1) return "intermedio / premium";
  return "intermedio";
}

function confidenceLabel(c: number): "Baja" | "Media" | "Alta" {
  if (c >= 70) return "Alta";
  if (c >= 45) return "Media";
  return "Baja";
}

export interface AnalyzeInput {
  features: ProductFeatures;
  comparables: NormalizedComparable[];
  /** false cuando la fuente externa no está disponible (siempre hoy). */
  externalResearchAvailable: boolean;
}

export class PricingAdvisorService {
  analyze(input: AnalyzeInput): PricingAnalysisResult {
    const { features, comparables } = input;
    const internal = internalEstimate(features);
    const usable = comparables.filter((c) => !c.excludedFromRange && c.normalizedPrice !== null);
    const prices = usable.map((c) => c.normalizedPrice as number);
    const n = prices.length;

    const marketAvailable = n > 0;
    const marketMedian = n > 0 ? Math.round(median(prices) * 100) / 100 : null;
    const marketMin = n > 0 ? Math.min(...prices) : null;
    const marketMax = n > 0 ? Math.max(...prices) : null;

    let blended: number;
    let weightNote: string;
    if (n >= 3 && marketMedian !== null) {
      blended = marketMedian * 0.6 + internal * 0.4;
      weightNote = `60% mediana de mercado (${n} comparables) + 40% estimación interna`;
    } else if (n >= 1 && marketMedian !== null) {
      blended = marketMedian * 0.3 + internal * 0.7;
      weightNote = `30% mercado (${n} comparable${n > 1 ? "s" : ""}) + 70% estimación interna`;
    } else {
      blended = internal;
      weightNote = "100% estimación interna (sin comparables normalizables)";
    }

    const recommended = Math.max(5, Math.round(blended));
    const rangeMin = Math.max(5, Math.round(recommended * 0.85));
    const rangeMax = Math.round(recommended * 1.15);
    const budget = Math.max(5, Math.round(recommended * 0.7));
    const premium = Math.round(recommended * 1.35);

    let confidence = 45;
    confidence += Math.min(n, 7) * 5;
    confidence -= usable.filter((c) => c.fxEstimated).length * 3;
    if (features.depthScore >= 4) confidence += 3;
    if (!input.externalResearchAvailable) confidence = Math.min(confidence, 80);
    if (n === 0) confidence = Math.min(confidence, 45);
    confidence = clamp(Math.round(confidence), 5, 95);

    const position = positionFor(recommended, marketMedian);
    const reasoning = this.explain(features, internal, usable, recommended, position);
    const lowDataWarning =
      n < 3
        ? "No encontramos suficientes productos comparables para una recomendación de alta confianza."
        : null;

    return {
      internalEstimate: internal,
      marketAvailable,
      marketMedian,
      marketMin,
      marketMax,
      comparablesUsed: n,
      comparables,
      recommendation: {
        recommendedPrice: recommended,
        recommendedRangeMin: rangeMin,
        recommendedRangeMax: rangeMax,
        budgetPrice: budget,
        premiumPrice: premium,
        confidence,
        confidenceLabel: confidenceLabel(confidence),
        marketPosition: position,
        reasoning,
        basisNote: `Cálculo: ${weightNote}. 1 USD = 1 USDT (referencia solo para recomendar; el creador fija el precio final).`,
      },
      lowDataWarning,
      marketUnavailableNote: input.externalResearchAvailable
        ? null
        : "El análisis de mercado externo no está disponible temporalmente.",
    };
  }

  /** Explicación por reglas: solo afirma datos realmente analizados. */
  private explain(
    f: ProductFeatures,
    internal: number,
    usable: NormalizedComparable[],
    recommended: number,
    position: MarketPosition
  ): string[] {
    const out: string[] = [];
    const bits: string[] = [];
    if (f.format === "course") {
      if (f.modules > 0) bits.push(`${f.modules} módulos`);
      if (f.lessons > 0) bits.push(`${f.lessons} lecciones`);
      if (f.durationMinutes > 0) bits.push(`~${Math.round(f.durationMinutes / 60)} h estimadas`);
      if (f.activities > 0) bits.push(`${f.activities} actividades`);
      if (f.quizzes > 0) bits.push(`${f.quizzes} quizzes`);
      if (f.hasExam) bits.push("examen final");
      if (f.hasCertificate) bits.push("certificado");
      if (f.hasVideo) bits.push("videos");
    } else if (f.format === "pdf" || f.format === "ebook") {
      if (f.chapters > 0) bits.push(`${f.chapters} capítulos`);
      if (f.words > 0) bits.push(`${f.words.toLocaleString("es")} palabras`);
      if (f.pages > 0) bits.push(`${f.pages} páginas`);
    } else if (f.format === "interactive_web") {
      if (f.webSections > 0) bits.push(`${f.webSections} secciones`);
      if (f.webComponents > 0) bits.push(`${f.webComponents} componentes`);
    } else {
      if (f.resources > 0) bits.push(`${f.resources} recursos`);
      if (f.folders > 0) bits.push(`${f.folders} carpetas`);
    }
    if (f.bonuses > 0) bits.push(`${f.bonuses} bono(s)`);
    out.push(
      bits.length > 0
        ? `Tu producto incluye ${bits.join(", ")}.`
        : "Tu producto aún no reporta contenido medible."
    );
    out.push(`Estimación por características internas: ${internal} USD (referencia).`);
    if (usable.length > 0) {
      const prices = usable.map((c) => c.normalizedPrice as number);
      out.push(
        `Comparado con ${usable.length} producto(s) similar(es) del catálogo (rango observado ${Math.min(...prices)}–${Math.max(...prices)} USD), Crow estima posicionamiento ${position}.`
      );
    } else {
      out.push("Sin comparables normalizables: la recomendación usa solo tus características.");
    }
    out.push(`Precio sugerido por Crow AI: ${recommended} USDT (el creador decide el precio final).`);
    return out;
  }
}
