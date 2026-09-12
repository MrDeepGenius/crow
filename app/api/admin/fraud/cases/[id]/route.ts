// GET /api/admin/fraud/cases/[id] — detalle: caso + usuario + señales + holds + audit
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getCase, getRiskProfile, listHolds, getAudit } from "@/app/services/fraud/antifraud";
import { getDb } from "@/app/services/db/database";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(_req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const { id } = await ctx.params;
    const c = getCase(id);
    if (!c) return NextResponse.json({ ok: false, reason: "CASE_NOT_FOUND" }, { status: 404 });
    const db = getDb();
    const user = db.prepare("SELECT id, email, name, createdAt FROM users WHERE id = ?").get(c.userId);
    const profile = getRiskProfile(c.userId);
    const signals = db.prepare("SELECT type, detail, weight, createdAt FROM fraud_signals WHERE userId = ? ORDER BY createdAt DESC").all(c.userId);
    const holds = c.orderId ? (listHolds(undefined, 200).filter((h) => h.orderId === c.orderId) as unknown[]) : [];
    const auditTrail = getAudit({ userId: c.userId, limit: 100 });
    return NextResponse.json({ ok: true, case: c, user, profile, signals, holds, audit: auditTrail });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
