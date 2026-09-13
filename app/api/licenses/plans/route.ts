// GET /api/licenses/plans — catálogo público de planes de licencia
import { NextResponse } from "next/server";
import { LICENSE_TIERS } from "@/app/services/licenses/catalog";

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json({ ok: true, tiers: LICENSE_TIERS });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
