// GET /api/admin/fraud/cases — lista casos (admin real, filtro ?status=)
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getDb } from "@/app/services/db/database";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const status = new URL(req.url).searchParams.get("status");
    const db = getDb();
    const rows =
      status === "OPEN" || status === "RESOLVED_SAFE" || status === "KEPT_UNDER_REVIEW"
        ? (db.prepare("SELECT c.*, u.email AS userEmail FROM fraud_cases c LEFT JOIN users u ON u.id = c.userId WHERE c.status = ? ORDER BY c.updatedAt DESC LIMIT 200").all(status) as Record<string, unknown>[])
        : (db.prepare("SELECT c.*, u.email AS userEmail FROM fraud_cases c LEFT JOIN users u ON u.id = c.userId ORDER BY c.updatedAt DESC LIMIT 200").all() as Record<string, unknown>[]);
    return NextResponse.json({ ok: true, cases: rows });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
