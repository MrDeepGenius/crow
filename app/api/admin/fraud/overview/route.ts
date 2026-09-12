// GET /api/admin/fraud/overview — contadores del dashboard (admin real)
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getDb } from "@/app/services/db/database";

function deny(admin: { ok: false; reason: string }) {
  return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
}

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) return deny(admin);
    const db = getDb();
    const count = (sql: string, ...params: (string | number)[]): number => {
      const row = db.prepare(sql).get(...params) as { n: number };
      return row.n;
    };
    const openCases = count("SELECT COUNT(*) AS n FROM fraud_cases WHERE status = 'OPEN'");
    const highRisk = count("SELECT COUNT(*) AS n FROM fraud_risk_profiles WHERE riskStatus = 'HIGH_RISK'");
    const reviewRequired = count("SELECT COUNT(*) AS n FROM fraud_risk_profiles WHERE riskStatus IN ('REVIEW_REQUIRED','BLOCKED')");
    const pendingHolds = count("SELECT COUNT(*) AS n FROM commission_holds WHERE status = 'PENDING_REVIEW'");
    const selfAttempts = count("SELECT COUNT(*) AS n FROM fraud_audit_logs WHERE event = 'SELF_REFERRAL_ATTEMPT'");
    const cycles = count("SELECT COUNT(*) AS n FROM fraud_audit_logs WHERE event IN ('REFERRAL_CYCLE_ATTEMPT','DUPLICATE_CHAIN_DETECTED')");
    const sharedWallets = db.prepare(
      "SELECT withdrawalWallet AS w, COUNT(*) AS n FROM users WHERE withdrawalWallet IS NOT NULL AND withdrawalWallet != '' GROUP BY w HAVING n > 1"
    ).all() as { w: string; n: number }[];
    const week = db.prepare(
      "SELECT substr(createdAt, 1, 10) AS day, COUNT(*) AS n FROM fraud_audit_logs WHERE createdAt >= date('now', '-7 days') GROUP BY day ORDER BY day"
    ).all() as { day: string; n: number }[];
    return NextResponse.json({
      ok: true,
      overview: {
        openCases,
        highRisk,
        reviewRequired,
        pendingHolds,
        selfAttempts,
        cycles,
        sharedWallets: sharedWallets.map((s) => ({ wallet: `${s.w.slice(0, 10)}…`, accounts: s.n })),
        activity7d: week,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
