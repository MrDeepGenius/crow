// GET /api/access?productId= — ¿puede ESTE usuario acceder? (server decide)
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { hasAccess } from "@/app/services/db/purchase";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: true, hasAccess: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const productId = new URL(req.url).searchParams.get("productId") ?? "";
    if (!productId || productId.length > 120) {
      return NextResponse.json({ ok: false, reason: "INVALID_PRODUCT" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, hasAccess: hasAccess(user.id, productId) });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
