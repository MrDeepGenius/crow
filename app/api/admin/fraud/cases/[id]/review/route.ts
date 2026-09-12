// POST /api/admin/fraud/cases/[id]/review — MARK_SAFE | KEEP_UNDER_REVIEW | BLOCK_COMMISSION | UNBLOCK_COMMISSION
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { reviewCase, type CaseAction } from "@/app/services/fraud/antifraud";
import { finalizeReleasedOrder } from "@/app/services/affiliates/distribution";

const ACTIONS: CaseAction[] = ["MARK_SAFE", "KEEP_UNDER_REVIEW", "BLOCK_COMMISSION", "UNBLOCK_COMMISSION"];

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.reason === "FORBIDDEN" ? 403 : 401 });
    }
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { action?: unknown; note?: unknown };
    if (typeof body.action !== "string" || !(ACTIONS as string[]).includes(body.action)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ACTION" }, { status: 400 });
    }
    const adminId = admin.user?.id ?? "admin-key";
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";
    try {
      const updated = reviewCase(id, body.action as CaseAction, adminId, note);
      // Al liberar, se aprueba el ledger retenido y se evalúan desbloqueos
      // de nivel pendientes (sin esto, REVIEW nunca desbloquearía).
      let finalized: { approved: number; unlocks: unknown[] } | null = null;
      if ((body.action === "MARK_SAFE" || body.action === "UNBLOCK_COMMISSION") && updated.orderId) {
        try {
          finalized = finalizeReleasedOrder(updated.orderId);
        } catch {
          finalized = null;
        }
      }
      return NextResponse.json({ ok: true, case: updated, finalized });
    } catch (err) {
      if (err instanceof Error && err.message === "CASE_NOT_FOUND") {
        return NextResponse.json({ ok: false, reason: "CASE_NOT_FOUND" }, { status: 404 });
      }
      throw err;
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
