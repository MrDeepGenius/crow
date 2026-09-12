// POST /api/admin/fraud/unlocks/reverse — revierte un desbloqueo (admin)
// Arquitectura lista para reglas comerciales futuras. No borra registros:
// marca REVERSED + audita. El ledger existente no se toca.
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { DistributionError, reverseUnlock } from "@/app/services/affiliates/distribution";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const body = (await req.json()) as { userId?: unknown; level?: unknown; reason?: unknown };
    if (typeof body.userId !== "string" || !body.userId) {
      return NextResponse.json({ ok: false, reason: "INVALID_USER" }, { status: 400 });
    }
    if (typeof body.level !== "number" || ![1, 2, 3, 4, 5].includes(body.level)) {
      return NextResponse.json({ ok: false, reason: "INVALID_LEVEL" }, { status: 400 });
    }
    if (typeof body.reason !== "string" || body.reason.trim().length < 3) {
      return NextResponse.json({ ok: false, reason: "REASON_REQUIRED" }, { status: 400 });
    }
    const adminId = admin.user?.id ?? "admin-key";
    try {
      reverseUnlock(body.userId, body.level, body.reason, adminId);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof DistributionError) {
        return NextResponse.json({ ok: false, reason: err.code }, { status: 409 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
