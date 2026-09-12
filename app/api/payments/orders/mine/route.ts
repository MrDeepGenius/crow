// GET /api/payments/orders/mine?productId= — mi orden activa para un producto
// Permite retomar el checkout (sin crear duplicadas) aunque se cierre la pestaña.
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getDb } from "@/app/services/db/database";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const productId = new URL(req.url).searchParams.get("productId") ?? "";
    if (!productId || productId.length > 120) {
      return NextResponse.json({ ok: false, reason: "INVALID_PRODUCT" }, { status: 400 });
    }
    const row = getDb()
      .prepare(
        `SELECT id, paymentAmount, currency, status, expiresAt FROM orders
         WHERE userId = ? AND productId = ? AND status IN ('PENDING','VERIFYING')
         ORDER BY createdAt DESC LIMIT 1`
      )
      .get(user.id, productId) as
      | { id: string; paymentAmount: number; currency: string; status: string; expiresAt: string }
      | undefined;
    if (!row) return NextResponse.json({ ok: true, order: null });
    return NextResponse.json({
      ok: true,
      order: { id: row.id, amount: row.paymentAmount, currency: row.currency, status: row.status, expiresAt: row.expiresAt },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
