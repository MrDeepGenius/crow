// ============================================
// EXTRACT FEATURES - del producto REAL al análisis
// ============================================
// Lee LocalProductSummary (construido por productAdapters desde los motores
// reales) + campos del borrador. Nunca inventa: lo desconocido queda en
// false/0 y la explicación lo dice.

import type { LocalProductSummary } from "@/app/services/marketplace/productAdapters";
import type { PricingFormat, ProductFeatures } from "./types";

export interface DraftInfo {
  title: string;
  category: string;
  niche?: string;
  audience?: string;
  level: string;
  language: string;
  bonuses: number;
  hasVideo?: boolean;
  downloadableFiles?: number;
}

function num(v: number | undefined): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function toPricingFormat(format: LocalProductSummary["format"]): PricingFormat {
  return format;
}

/**
 * Profundidad 1-5: heurística DOCUMENTADA por volumen de contenido.
 * Se etiqueta como estimada en la explicación; no es dato de mercado.
 */
export function estimateDepth(summary: LocalProductSummary): number {
  const s = summary.stats;
  const units =
    num(s.lessons) + num(s.chapters) + num(s.resources) + num(s.webSections) + num(s.modules);
  if (units >= 30) return 5;
  if (units >= 18) return 4;
  if (units >= 10) return 3;
  if (units >= 4) return 2;
  return 1;
}

export function extractFeatures(summary: LocalProductSummary, draft: DraftInfo): ProductFeatures {
  const s = summary.stats;
  return {
    format: toPricingFormat(summary.format),
    title: draft.title.trim().slice(0, 120),
    category: draft.category.trim().slice(0, 60),
    niche: (draft.niche ?? "").trim().slice(0, 120),
    audience: (draft.audience ?? "").trim().slice(0, 120),
    level: draft.level.trim().slice(0, 30),
    language: draft.language.trim().slice(0, 10),
    modules: num(s.modules),
    lessons: num(s.lessons),
    durationMinutes: num(s.lessons) * 15,
    chapters: num(s.chapters),
    sections: num(s.sections),
    words: num(s.words),
    pages: num(s.pages),
    webSections: num(s.webSections),
    webComponents: num(s.webComponents),
    resources: num(s.resources),
    folders: num(s.folders),
    activities: num(s.activities),
    quizzes: num(s.quizzes),
    hasExam: s.hasExam === true,
    hasCertificate: s.hasCertificate === true,
    hasVideo: draft.hasVideo === true,
    bonuses: Math.max(0, Math.floor(draft.bonuses)),
    downloadableFiles: Math.max(0, Math.floor(draft.downloadableFiles ?? 0)),
    depthScore: estimateDepth(summary),
  };
}
