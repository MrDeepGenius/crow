// GET /api/admin/fraud/users/[id] — perfil de riesgo + señales + casos + holds
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getRiskProfile, getUserCases, listHolds } from "@/app/services/fraud/antifraud";
import { getAncestors } from "@/app/services/affiliates/referrals";
import { getLevels } from "@/app/services/affiliates/distribution";
import { getDb } from "@/app/services/db/database";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const { id } = await ctx.params;
    const db = getDb();
    const user = db.prepare("SELECT id, email, name, createdAt FROM users WHERE id = ?").get(id) as
      | { id: string; email: string; name: string; createdAt: string }
      | undefined;
    if (!user) return NextResponse.json({ ok: false, reason: "USER_NOT_FOUND" }, { status: 404 });
    const profile = getRiskProfile(id);
    const signals = db.prepare("SELECT type, detail, weight, createdAt FROM fraud_signals WHERE userId = ? ORDER BY createdAt DESC").all(id);
    const cases = getUserCases(id);
    const holds = listHolds(undefined, 200).filter((h) => h.affiliateUserId === id);
    const chain = getAncestors(id);
    const levels = getLevels(id);
    return NextResponse.json({ ok: true, user, profile, signals, cases, holds, chain, levels });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
