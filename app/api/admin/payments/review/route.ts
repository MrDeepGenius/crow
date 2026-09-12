// POST /api/admin/payments/review — auditoría server de revisiones manuales
// La revisión manual es EXCEPCIONAL y nunca reemplaza la verificación automática.
// Requiere admin REAL: sesión isAdmin o CROW_ADMIN_KEY como capa adicional.
// El cambio de estado real sigue el mismo camino local-first (el admin web lo
// aplica con actor "admin"); aquí queda el rastro auditable en el registry.
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { logRegistryEvent } from "@/app/services/payments/registry";

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json(
        { ok: false, reason: admin.reason },
        { status: admin.reason === "FORBIDDEN" ? 403 : 401 }
      );
    }
    const config = getPaymentsConfig();
    const body = (await req.json()) as {
      orderId?: unknown;
      action?: unknown;
      note?: unknown;
    };
    if (typeof body.orderId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(body.orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ ok: false, reason: "INVALID_ACTION" }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    if (note.length < 10) {
      return NextResponse.json(
        { ok: false, reason: "NOTE_REQUIRED", detail: "La revisión manual exige una nota de al menos 10 caracteres." },
        { status: 400 }
      );
    }
    logRegistryEvent(
      config.registryPath,
      body.action === "approve" ? "manual_approve" : "manual_reject",
      `order=${body.orderId} note=${note}`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
