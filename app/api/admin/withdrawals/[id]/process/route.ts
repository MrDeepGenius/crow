import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { processWithdrawal, rejectWithdrawal, failWithdrawal } from "@/app/services/withdrawals/withdrawalService";

export const dynamic = "force-dynamic";

// POST /api/admin/withdrawals/[id]/process — marcar como procesando
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = isAdminRequest(req);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.reason }, { status: admin.reason === "UNAUTHENTICATED" ? 401 : 403 });
  }

  const { id } = await params;
  const actor = admin.user?.id ?? "admin";
  const result = processWithdrawal(id, actor);

  if (!result.ok) return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, message: result.message });
}
