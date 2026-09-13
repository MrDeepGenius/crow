// GET /api/products — list published products (public, with query params)
// POST /api/products — create product (auth + creator role)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { createProduct, queryProducts, type CreateProductInput, type ProductQuery } from "@/app/services/db/products";
import { checkLicenseForCreation } from "@/app/services/licenses/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const q: ProductQuery = {
      search: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      format: url.searchParams.get("format") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      creatorId: url.searchParams.get("creatorId") ?? undefined,
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
      pageSize: url.searchParams.get("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
      minPrice: url.searchParams.get("minPrice") ? Number(url.searchParams.get("minPrice")) : undefined,
      maxPrice: url.searchParams.get("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined,
      minRating: url.searchParams.get("minRating") ? Number(url.searchParams.get("minRating")) : undefined,
      affiliateOnly: url.searchParams.get("affiliateOnly") === "true",
      featuredOnly: url.searchParams.get("featuredOnly") === "true",
    };
    const result = queryProducts(q);
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    // Verificación de licencia Creator activa (server-side, sin bypass).
    const licenseCheck = checkLicenseForCreation(user.id);
    if (!licenseCheck.ok) {
      return NextResponse.json(
        { ok: false, error: licenseCheck.code, message: licenseCheck.message },
        { status: 403 }
      );
    }
    const body = (await req.json()) as Partial<CreateProductInput>;
    if (!body.title || !body.description || !body.category || !(body.price && body.price > 0)) {
      return NextResponse.json({ ok: false, reason: "MISSING_FIELDS" }, { status: 400 });
    }
    const product = createProduct({
      creatorId: user.id,
      creatorName: user.name,
      format: body.format ?? "pdf",
      title: body.title,
      shortDescription: body.shortDescription,
      description: body.description,
      category: body.category,
      subcategory: body.subcategory,
      tags: body.tags,
      language: body.language,
      level: body.level,
      price: body.price,
      currency: body.currency,
      previousPrice: body.previousPrice,
      coverSvg: body.coverSvg,
      previewKind: body.previewKind,
      previewRef: body.previewRef,
      freePreviewChapters: body.freePreviewChapters,
      stats: body.stats,
      includes: body.includes,
      bonuses: body.bonuses,
      affiliateEnabled: body.affiliateEnabled,
      affiliatePercent: body.affiliatePercent,
      content: body.content,
      status: body.status ?? "DRAFT",
    });
    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
