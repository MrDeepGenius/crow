// POST /api/products/[slug]/publish — publish product (creator only)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import { getProductBySlug, publishProduct } from "@/app/services/db/products";
import { checkLicenseForPublish } from "@/app/services/licenses/service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    if (product.creatorId !== user.id) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    // Verificación de licencia Creator activa + límite de publicaciones.
    const licenseCheck = checkLicenseForPublish(user.id);
    if (!licenseCheck.ok) {
      return NextResponse.json(
        { ok: false, error: licenseCheck.code, message: licenseCheck.message },
        { status: 403 }
      );
    }
    const updated = publishProduct(product.id, user.id);
    return NextResponse.json({ ok: true, product: updated });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
