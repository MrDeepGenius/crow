// GET /api/admin/fraud/levels — requisitos por nivel (admin)
// POST { level, requirementType, threshold } — configura desbloqueo (admin)
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { getDb } from "@/app/services/db/database";
import { DistributionError, setLevelRequirement } from "@/app/services/affiliates/distribution";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const rows = getDb().prepare("SELECT level, requirementType, threshold, updatedAt FROM level_unlock_requirements ORDER BY level").all();
    return NextResponse.json({ ok: true, requirements: rows });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const body = (await req.json()) as { level?: unknown; requirementType?: unknown; threshold?: unknown };
    if (typeof body.level !== "number" || ![1, 2, 3, 4, 5].includes(body.level)) {
      return NextResponse.json({ ok: false, reason: "INVALID_LEVEL" }, { status: 400 });
    }
    if (body.requirementType !== "VALID_SALES" && body.requirementType !== "MANUAL") {
      return NextResponse.json({ ok: false, reason: "INVALID_REQUIREMENT" }, { status: 400 });
    }
    const threshold = body.threshold === null || body.threshold === undefined ? null : Number(body.threshold);
    if (threshold !== null && (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000)) {
      return NextResponse.json({ ok: false, reason: "INVALID_THRESHOLD" }, { status: 400 });
    }
    const adminId = admin.user?.id ?? "admin-key";
    try {
      setLevelRequirement(body.level, body.requirementType, threshold, adminId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof DistributionError) {
        return NextResponse.json({ ok: false, reason: err.code }, { status: 400 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
