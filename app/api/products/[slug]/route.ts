// GET /api/products/[slug] — get product by slug (public for published, auth for draft)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getProductBySlug, incrementViewCount, toPublicationFormat } from "@/app/services/db/products";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    // Published products are public; drafts require the creator
    if (product.status !== "PUBLISHED") {
      const user = getAuthUserFromRequest(req);
      if (!user || user.id !== product.creatorId) {
        return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
      }
    } else {
      incrementViewCount(product.id);
    }
    return NextResponse.json({ ok: true, product: toPublicationFormat(product) });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
