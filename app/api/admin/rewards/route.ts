// GET /api/admin/rewards — auditoría pool + emergency (ADMIN ONLY)
// El usuario normal NUNCA ve el balance del fondo.
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getDb } from "@/app/services/db/database";
import { poolBalances } from "@/app/services/rewards/pool";
import { ledgerBalance } from "@/app/services/affiliates/distribution";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const db = getDb();
    const pool = poolBalances();
    const credits = db.prepare("SELECT licenseOrderId, amount, createdAt FROM rewards_pool_ledger WHERE kind = 'CREDIT' ORDER BY createdAt DESC LIMIT 200").all();
    const debits = db.prepare("SELECT licenseOrderId, amount, createdAt FROM rewards_pool_ledger WHERE kind IN ('DEBIT','REWARD_PAYMENT') ORDER BY createdAt DESC LIMIT 200").all();
    const byStatus = db.prepare("SELECT status, COUNT(*) AS n, COALESCE(SUM(amount),0) AS total FROM rewards GROUP BY status").all();
    const unlocked = db.prepare("SELECT COUNT(*) AS n FROM rewards WHERE status = 'UNLOCKED'").get() as { n: number };
    const pending = db.prepare("SELECT COUNT(*) AS n FROM rewards WHERE status IN ('CLAIMED','WAITING_FOR_REWARDS_POOL')").get() as { n: number };
    const pendingList = db.prepare(
      "SELECT r.id, r.userId, u.email, r.level, r.amount, r.status, r.createdAt FROM rewards r JOIN users u ON u.id = r.userId WHERE r.status = 'CLAIMED' ORDER BY r.createdAt DESC LIMIT 100"
    ).all();
    return NextResponse.json({
      ok: true,
      pool: { ...pool, unlockedCount: unlocked.n, pendingCount: pending.n },
      emergencyReserve: ledgerBalance("CROW_EMERGENCY_RESERVE"),
      credits,
      debits,
      byStatus,
      pending: pendingList,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
