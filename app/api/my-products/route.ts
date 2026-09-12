// GET /api/my-products — productos del USUARIO AUTENTICADO (server decide)
// El cliente nunca decide qué posee: solo renderiza esta lista.
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { listEntitlementsByUser } from "@/app/services/db/purchase";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const items = listEntitlementsByUser(user.id).map((e) => ({
      productId: e.productId,
      orderId: e.orderId,
      grantedAt: e.grantedAt,
    }));
    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
