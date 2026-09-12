// ============================================
// PRODUCT ADAPTERS - del producto real a publicación
// ============================================
// Lee los productos REALES generados por los 5 motores y construye el
// borrador de publicación con stats e includes reales (nada inventado).

import type { GeneratedCourse } from "@/app/services/ai/types";
import type { InteractiveWebProduct } from "@/app/services/ai/interactiveWebTypes";
import type { PdfProduct } from "@/app/services/ai/pdfTypes";
import type { KitProduct } from "@/app/services/ai/kitTypes";
import type { MarketplaceFormat, ProductPublication } from "./marketTypes";

export type LocalFormat = "course" | "web" | "pdf" | "ebook" | "kit";

const LAST_KEYS: Record<LocalFormat, string> = {
  course: "crow_last_course",
  web: "crow_last_web",
  pdf: "crow_last_pdf",
  ebook: "crow_last_ebook",
  kit: "crow_last_kit",
};

export function toMarketplaceFormat(format: LocalFormat): MarketplaceFormat {
  return format === "web" ? "interactive_web" : format;
}

export interface LocalProductSummary {
  format: MarketplaceFormat;
  title: string;
  description: string;
  language: string;
  level: string;
  stats: ProductPublication["stats"];
  includes: string[];
  coverSvg: string | null;
  tags: string[];
}

function readJson(key: string): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function detectLocalProducts(): { format: LocalFormat; title: string }[] {
  const found: { format: LocalFormat; title: string }[] = [];
  const course = readJson(LAST_KEYS.course) as GeneratedCourse | null;
  if (course?.metadata?.title) found.push({ format: "course", title: course.metadata.title });
  const web = readJson(LAST_KEYS.web) as InteractiveWebProduct | null;
  if (web?.metadata?.title) found.push({ format: "web", title: web.metadata.title });
  const pdf = readJson(LAST_KEYS.pdf) as PdfProduct | null;
  if (pdf?.metadata?.title) found.push({ format: "pdf", title: pdf.metadata.title });
  const ebook = readJson(LAST_KEYS.ebook) as PdfProduct | null;
  if (ebook?.metadata?.title) found.push({ format: "ebook", title: ebook.metadata.title });
  const kit = readJson(LAST_KEYS.kit) as KitProduct | null;
  if (kit?.name) found.push({ format: "kit", title: kit.name });
  return found;
}

export function summarizeLocalProduct(format: LocalFormat): LocalProductSummary | null {
  switch (format) {
    case "course": {
      const c = readJson(LAST_KEYS.course) as GeneratedCourse | null;
      if (!c) return null;
      return {
        format: toMarketplaceFormat(format),
        title: c.metadata.title,
        description: c.metadata.description,
        language: c.metadata.language,
        level: c.metadata.level,
        stats: {
          modules: c.modules.length,
          lessons: c.stats.totalLessons,
          activities: c.stats.totalActivities,
          quizzes: c.stats.totalQuizzes,
          hasExam: c.finalExam.questions.length > 0,
          hasCertificate: true,
        },
        includes: [
          `${c.modules.length} módulos`,
          `${c.stats.totalLessons} lecciones`,
          `${c.stats.totalActivities} actividades`,
          `${c.stats.totalQuizzes} quizzes`,
          "Examen final",
          "Certificado",
        ],
        coverSvg: null,
        tags: c.metadata.tags,
      };
    }
    case "web": {
      const w = readJson(LAST_KEYS.web) as InteractiveWebProduct | null;
      if (!w) return null;
      return {
        format: toMarketplaceFormat(format),
        title: w.metadata.title,
        description: w.metadata.description,
        language: w.metadata.language,
        level: w.metadata.level,
        stats: { webSections: w.sections.length, webComponents: w.stats.totalComponents },
        includes: [
          `${w.sections.length} secciones interactivas`,
          `${w.stats.totalComponents} componentes funcionales`,
          "Acceso interactivo en Crow",
        ],
        coverSvg: null,
        tags: w.metadata.tags,
      };
    }
    case "pdf":
    case "ebook": {
      const p = readJson(LAST_KEYS[format]) as PdfProduct | null;
      if (!p) return null;
      return {
        format: format as MarketplaceFormat,
        title: p.metadata.title,
        description: p.cover.subtitle || p.metadata.subject,
        language: "es",
        level: "todos",
        stats: {
          chapters: p.stats.totalChapters,
          sections: p.stats.totalSections,
          blocks: p.stats.totalBlocks,
          words: p.stats.totalWords,
          pages: p.exportInfo?.pageCount ?? p.stats.estimatedPages,
        },
        includes: [
          `${p.stats.totalChapters} capítulos`,
          `${p.stats.totalSections} secciones`,
          "Portada profesional",
          "Índice navegable",
          "Archivo PDF descargable",
        ],
        coverSvg: null,
        tags: [p.metadata.title],
      };
    }
    case "kit": {
      const k = readJson(LAST_KEYS.kit) as KitProduct | null;
      if (!k) return null;
      let coverSvg: string | null = null;
      try {
        const raw = window.localStorage.getItem(`crow_kit_cover_${k.id}`);
        if (raw) coverSvg = (JSON.parse(raw) as { svg: string }).svg;
      } catch {
        coverSvg = null;
      }
      return {
        format: toMarketplaceFormat(format),
        title: k.name,
        description: k.description,
        language: "es",
        level: "todos",
        stats: { resources: k.stats.totalResources, folders: k.stats.totalFolders },
        includes: [
          `${k.stats.totalResources} recursos`,
          `${k.stats.totalFolders} carpetas organizadas`,
          "Guía de inicio",
          "Portada del kit",
          "Descarga ZIP",
        ],
        coverSvg,
        tags: [k.category],
      };
    }
  }
}

export interface PublishCheck {
  ok: boolean;
  blockers: string[];
  warnings: string[];
}

export function validateForPublish(draft: {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  format: LocalFormat;
  summary: LocalProductSummary | null;
}): PublishCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (draft.title.trim().length < 10) blockers.push("El título debe tener al menos 10 caracteres.");
  if (draft.description.trim().length < 50)
    blockers.push("La descripción debe tener al menos 50 caracteres.");
  if (!draft.category) blockers.push("Elegí una categoría.");
  if (!(draft.price > 0)) blockers.push("El precio debe ser mayor a 0.");
  if (!draft.currency) blockers.push("Elegí una moneda.");
  if (!draft.summary) {
    blockers.push("No se encontró el producto generado. Volvé a generarlo en su Studio.");
  } else {
    const s = draft.summary.stats;
    const empty =
      (s.lessons ?? 0) + (s.chapters ?? 0) + (s.resources ?? 0) + (s.webSections ?? 0) === 0;
    if (empty) blockers.push("El producto no tiene contenido (0 lecciones/capítulos/recursos/secciones).");
  }
  if ((draft.format === "pdf" || draft.format === "ebook" || draft.format === "kit") && !draft.summary?.coverSvg && draft.format === "kit") {
    warnings.push("El kit no tiene portada generada; se usará la portada tipográfica.");
  }
  if ((draft.format === "course" || draft.format === "web") && !draft.summary?.coverSvg) {
    warnings.push("Sin imagen de portada: la tarjeta usará el estilo del formato.");
  }
  return { ok: blockers.length === 0, blockers, warnings };
}
