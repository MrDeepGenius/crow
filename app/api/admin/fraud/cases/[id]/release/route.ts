// POST /api/admin/fraud/cases/[id]/release — atajo UNBLOCK_COMMISSION
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { reviewCase } from "@/app/services/fraud/antifraud";

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
    const body = (await req.json().catch(() => ({}))) as { note?: unknown };
    const adminId = admin.user?.id ?? "admin-key";
    try {
      const updated = reviewCase(id, "UNBLOCK_COMMISSION", adminId, typeof body.note === "string" ? body.note.slice(0, 500) : "");
      return NextResponse.json({ ok: true, case: updated });
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
