// GET /api/products/[slug]/reviews — list reviews for a product
// POST /api/products/[slug]/reviews — add review (auth + entitlement required)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getProductBySlug, listReviews, addReview } from "@/app/services/db/products";
import { hasAccess } from "@/app/services/db/purchase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    const reviews = listReviews(product.id);
    return NextResponse.json({ ok: true, reviews });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    // Check entitlement (server-side)
    if (!hasAccess(user.id, product.id)) {
      return NextResponse.json({ ok: false, reason: "NO_ENTITLEMENT" }, { status: 403 });
    }
    const body = (await req.json()) as { rating?: number; comment?: string };
    const rating = Number(body.rating);
    const comment = (body.comment ?? "").trim();
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ ok: false, reason: "INVALID_RATING" }, { status: 400 });
    }
    if (comment.length < 10) {
      return NextResponse.json({ ok: false, reason: "COMMENT_TOO_SHORT" }, { status: 400 });
    }
    if (/https?:\/\//i.test(comment)) {
      return NextResponse.json({ ok: false, reason: "NO_LINKS" }, { status: 400 });
    }
    // Find the user's paid order for this product
    const { getDb } = await import("@/app/services/db/database");
    const orderRow = getDb()
      .prepare("SELECT id FROM orders WHERE userId = ? AND productId = ? AND status = 'PAID' LIMIT 1")
      .get(user.id, product.id) as { id: string } | undefined;
    if (!orderRow) {
      return NextResponse.json({ ok: false, reason: "NO_PAID_ORDER" }, { status: 403 });
    }
    addReview(user.id, product.id, orderRow.id, rating, comment);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
