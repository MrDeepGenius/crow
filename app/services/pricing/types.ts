// ============================================
// PRICING TYPES - CROW AI PRICING ADVISOR
// ============================================
// Todo número de la recomendación deriva de datos reales: características
// extraídas del producto + comparables observados. Nada inventado.

export type PricingFormat = "course" | "interactive_web" | "pdf" | "ebook" | "kit";

export interface ProductFeatures {
  format: PricingFormat;
  title: string;
  category: string;
  niche: string;
  audience: string;
  level: string;
  language: string;
  modules: number;
  lessons: number;
  durationMinutes: number;
  chapters: number;
  sections: number;
  words: number;
  pages: number;
  webSections: number;
  webComponents: number;
  resources: number;
  folders: number;
  activities: number;
  quizzes: number;
  hasExam: boolean;
  hasCertificate: boolean;
  hasVideo: boolean;
  bonuses: number;
  downloadableFiles: number;
  /** 1-5 heurística documentada por volumen (etiquetada como estimada). */
  depthScore: number;
}

export interface ComparableInput {
  title: string;
  category: string;
  type: string;
  observedPrice: number;
  currency: string;
  sourceUrl?: string;
}

export interface NormalizedComparable extends ComparableInput {
  /** Precio en USD o null si la moneda no es normalizable (se excluye del rango). */
  normalizedPrice: number | null;
  fxEstimated: boolean;
  excludedFromRange: boolean;
  source: "catalog";
}

export type MarketPosition = "económico" | "intermedio" | "premium" | "intermedio / premium";

export interface PricingRecommendation {
  recommendedPrice: number;
  recommendedRangeMin: number;
  recommendedRangeMax: number;
  budgetPrice: number;
  premiumPrice: number;
  /** 0-100. */
  confidence: number;
  confidenceLabel: "Baja" | "Media" | "Alta";
  marketPosition: MarketPosition;
  reasoning: string[];
  /** Texto de una línea: de dónde salió cada número. */
  basisNote: string;
}

export interface PricingAnalysisResult {
  internalEstimate: number;
  marketAvailable: boolean;
  marketMedian: number | null;
  marketMin: number | null;
  marketMax: number | null;
  comparablesUsed: number;
  comparables: NormalizedComparable[];
  recommendation: PricingRecommendation;
  lowDataWarning: string | null;
  marketUnavailableNote: string | null;
}
