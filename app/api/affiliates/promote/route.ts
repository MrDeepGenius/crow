// POST /api/affiliates/promote — asocia afiliado a producto y genera referral link
// Requiere sesión + rol affiliate. Crea la relación affiliate-product en DB
// y devuelve el referral link con el código del afiliado.
// La atribución REAL se resuelve server-side (resolveReferralCode).
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { getProductBySlug, createAffiliateLink, listAffiliateLinks } from "@/app/services/db/products";
import { getOrCreateReferralCode } from "@/app/services/affiliates/referrals";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "affiliate")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body.slug !== "string" || !body.slug.trim()) {
      return NextResponse.json({ ok: false, reason: "INVALID_SLUG" }, { status: 400 });
    }
    const product = getProductBySlug(decodeURIComponent(body.slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    if (!product.affiliateEnabled) {
      return NextResponse.json({ ok: false, reason: "AFFILIATE_NOT_ENABLED" }, { status: 400 });
    }
    // Generar/obtener código de afiliado del usuario.
    const code = getOrCreateReferralCode(user.id);
    // Crear la relación affiliate-product (idempotente por UNIQUE).
    createAffiliateLink(user.id, product.id, code);
    // Construir el referral link. La atribución real es server-side.
    const origin = new URL(req.url).origin;
    const referralLink = `${origin}/marketplace/product/${product.slug}?ref=${code}`;
    return NextResponse.json({ ok: true, code, referralLink, productSlug: product.slug });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}

// GET /api/affiliates/promote?slug=... — verifica si ya está promocionando
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "affiliate")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) return NextResponse.json({ ok: false, reason: "INVALID_SLUG" }, { status: 400 });
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    const links = listAffiliateLinks(user.id);
    const existing = links.find((l) => l.productId === product.id);
    if (existing) {
      const origin = new URL(req.url).origin;
      const referralLink = `${origin}/marketplace/product/${product.slug}?ref=${existing.code}`;
      return NextResponse.json({ ok: true, promoting: true, code: existing.code, referralLink });
    }
    return NextResponse.json({ ok: true, promoting: false });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
