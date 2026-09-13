// GET /api/products/[slug] — get product by slug (public for published, auth for draft)
// PUT /api/products/[slug] — edit product (creator + owner + active license)
import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { requireRole } from "@/app/services/db/profiles";
import {
  getProductBySlug,
  incrementViewCount,
  toPublicationFormat,
  updateProduct,
  type UpdateProductInput,
} from "@/app/services/db/products";
import { checkLicenseForCreation } from "@/app/services/licenses/service";

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

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    if (!requireRole(user.id, "creator")) {
      return NextResponse.json({ ok: false, reason: "ROLE_REQUIRED" }, { status: 403 });
    }
    const { slug } = await ctx.params;
    const product = getProductBySlug(decodeURIComponent(slug));
    if (!product) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    // Ownership: solo el creador del producto puede editarlo.
    if (product.creatorId !== user.id) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    // Licencia activa requerida para editar (igual que crear).
    const licenseCheck = checkLicenseForCreation(user.id);
    if (!licenseCheck.ok) {
      return NextResponse.json(
        { ok: false, error: licenseCheck.code, message: licenseCheck.message },
        { status: 403 }
      );
    }
    const body = (await req.json()) as Partial<UpdateProductInput>;
    const updated = updateProduct(product.id, user.id, body);
    if (!updated) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, product: toPublicationFormat(updated) });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
