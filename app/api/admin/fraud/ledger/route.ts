// GET /api/admin/fraud/ledger?orderId= — allocations de una orden (admin)
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getOrderLedger, ledgerBalance } from "@/app/services/affiliates/distribution";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const orderId = new URL(req.url).searchParams.get("orderId") ?? "";
    if (!/^[A-Za-z0-9-]{4,64}$/.test(orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    const entries = getOrderLedger(orderId);
    const total = Math.round(entries.filter((e) => e.status !== "REVERSED").reduce((n, e) => n + e.amount, 0) * 100) / 100;
    return NextResponse.json({
      ok: true,
      entries,
      total,
      balances: {
        reserve: ledgerBalance("CROW_RESERVE"),
        emergencyReserve: ledgerBalance("CROW_EMERGENCY_RESERVE"),
        crowCommission: ledgerBalance("CROW_COMMISSION"),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
