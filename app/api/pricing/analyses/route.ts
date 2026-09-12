// GET /api/pricing/analyses?productKey= — último análisis (sesión + ownership)
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getLatestAnalysis } from "@/app/services/db/pricing";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const key = new URL(req.url).searchParams.get("productKey") ?? "";
    if (!/^[A-Za-z0-9:_-]{4,120}$/.test(key)) {
      return NextResponse.json({ ok: false, reason: "INVALID_PRODUCT_KEY" }, { status: 400 });
    }
    const analysis = getLatestAnalysis(user.id, key);
    if (!analysis) return NextResponse.json({ ok: true, analysis: null });
    return NextResponse.json({ ok: true, analysis });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
