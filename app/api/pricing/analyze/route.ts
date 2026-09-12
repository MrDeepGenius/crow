// POST /api/pricing/analyze — análisis + persistencia (sesión requerida)
// features: características REALES del producto (validadas).
// comparables: observados del catálogo del creador (validados, máx 40).
// externalResearchAvailable: false (sin fuente externa configurada).
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { normalizeComparables } from "@/app/services/pricing/marketResearch";
import { PricingAdvisorService } from "@/app/services/pricing/pricingAdvisor";
import type { ComparableInput, PricingFormat, ProductFeatures } from "@/app/services/pricing/types";
import { getLatestAnalysis, saveAnalysis } from "@/app/services/db/pricing";

const FORMATS = ["course", "interactive_web", "pdf", "ebook", "kit"] as const;

function cleanFeatures(raw: unknown): ProductFeatures | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.format !== "string" || !(FORMATS as readonly string[]).includes(r.format)) return null;
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(v, 1000000) : 0);
  const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const bool = (v: unknown): boolean => v === true;
  return {
    format: r.format as PricingFormat,
    title: str(r.title, 120),
    category: str(r.category, 60),
    niche: str(r.niche, 120),
    audience: str(r.audience, 120),
    level: str(r.level, 30) || "todos",
    language: str(r.language, 10) || "es",
    modules: Math.floor(num(r.modules)),
    lessons: Math.floor(num(r.lessons)),
    durationMinutes: Math.floor(num(r.durationMinutes)),
    chapters: Math.floor(num(r.chapters)),
    sections: Math.floor(num(r.sections)),
    words: Math.floor(num(r.words)),
    pages: Math.floor(num(r.pages)),
    webSections: Math.floor(num(r.webSections)),
    webComponents: Math.floor(num(r.webComponents)),
    resources: Math.floor(num(r.resources)),
    folders: Math.floor(num(r.folders)),
    activities: Math.floor(num(r.activities)),
    quizzes: Math.floor(num(r.quizzes)),
    hasExam: bool(r.hasExam),
    hasCertificate: bool(r.hasCertificate),
    hasVideo: bool(r.hasVideo),
    bonuses: Math.floor(num(r.bonuses)),
    downloadableFiles: Math.floor(num(r.downloadableFiles)),
    depthScore: Math.min(5, Math.max(1, Math.floor(num(r.depthScore)) || 1)),
  };
}

function cleanComparables(raw: unknown): ComparableInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).flatMap((c): ComparableInput[] => {
    if (typeof c !== "object" || c === null) return [];
    const r = c as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.observedPrice !== "number") return [];
    return [
      {
        title: r.title,
        category: typeof r.category === "string" ? r.category : "",
        type: typeof r.type === "string" ? r.type : "",
        observedPrice: r.observedPrice,
        currency: typeof r.currency === "string" ? r.currency : "USD",
        sourceUrl: typeof r.sourceUrl === "string" ? r.sourceUrl : undefined,
      },
    ];
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { productKey?: unknown; features?: unknown; comparables?: unknown };
    if (typeof body.productKey !== "string" || !/^[A-Za-z0-9:_-]{4,120}$/.test(body.productKey)) {
      return NextResponse.json({ ok: false, reason: "INVALID_PRODUCT_KEY" }, { status: 400 });
    }
    const features = cleanFeatures(body.features);
    if (!features || !features.title) {
      return NextResponse.json({ ok: false, reason: "INVALID_FEATURES" }, { status: 400 });
    }
    // Caché: si ya hay análisis vigente y no piden refresh, devolverlo.
    const url = new URL(req.url);
    if (url.searchParams.get("refresh") !== "1") {
      const cached = getLatestAnalysis(user.id, body.productKey);
      if (cached) return NextResponse.json({ ok: true, cached: true, analysis: cached });
    }
    const comparables = normalizeComparables(cleanComparables(body.comparables));
    const service = new PricingAdvisorService();
    const result = service.analyze({ features, comparables, externalResearchAvailable: false });
    const stored = saveAnalysis(user.id, body.productKey, features.format, result);
    return NextResponse.json({ ok: true, cached: false, analysis: stored });
  } catch (err) {
    const code = err instanceof Error ? err.message : "SERVER_ERROR";
    if (code === "INVALID_PRODUCT_KEY" || code === "USER_NOT_FOUND") {
      return NextResponse.json({ ok: false, reason: code }, { status: 400 });
    }
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
