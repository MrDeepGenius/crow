// POST /api/products/[slug]/publish — publish product (creator only)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getProductBySlug, publishProduct } from "@/app/services/db/products";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    if (product.creatorId !== user.id) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    const updated = publishProduct(product.id, user.id);
    return NextResponse.json({ ok: true, product: updated });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
