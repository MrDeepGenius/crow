import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { rejectWithdrawal } from "@/app/services/withdrawals/withdrawalService";

export const dynamic = "force-dynamic";

// POST /api/admin/withdrawals/[id]/reject — rechazar retiro
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = isAdminRequest(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.reason }, { status: admin.reason === "UNAUTHENTICATED" ? 401 : 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const actor = admin.user?.id ?? "admin";
  const result = rejectWithdrawal(id, reason || "Rechazado por admin", actor);

  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.message });
}
