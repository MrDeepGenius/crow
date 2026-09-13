// GET /api/affiliates/commission-rates — tasas de comisión desde el backend
// El frontend NO hardcodea estos valores; los lee de aquí.
import { NextResponse } from "next/server";
import { DEFAULT_PLATFORM_CONFIG } from "@/app/services/marketplace/marketTypes";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({
      ok: true,
      rates: {
        direct: DEFAULT_PLATFORM_CONFIG.affiliateCommissionPercent,
        levels: [
          { level: 1, percent: 5 },
          { level: 2, percent: 3 },
          { level: 3, percent: 2 },
          { level: 4, percent: 2 },
          { level: 5, percent: 1 },
        ],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
