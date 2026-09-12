// POST /api/admin/payments/monitor — pausar/reanudar el monitor automático
// Requiere admin REAL (sesión isAdmin o CROW_ADMIN_KEY adicional).
import { NextResponse } from "next/server";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { logRegistryEvent } from "@/app/services/payments/registry";
import { setMonitorPaused } from "@/app/services/payments/monitor";

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
    const body = (await req.json()) as { action?: unknown };
    if (body.action !== "pause" && body.action !== "resume") {
      return NextResponse.json({ ok: false, reason: "INVALID_ACTION" }, { status: 400 });
    }
    setMonitorPaused(
      config.monitorStatePath,
      config.usdtContract,
      config.treasury,
      body.action === "pause"
    );
    logRegistryEvent(
      config.registryPath,
      body.action === "pause" ? "monitor_paused" : "monitor_resumed",
      "acción manual del admin"
    );
    return NextResponse.json({ ok: true, paused: body.action === "pause" });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
