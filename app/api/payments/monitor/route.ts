// GET /api/payments/monitor — un ciclo del worker + estado (para cron)
// Producción: cron externo cada ~15s contra este endpoint (server-side,
// no depende del navegador). Throttle interno: max 1 scan cada 10s.
// En dev/instancia única además corre ensureMonitorScheduler() en proceso.
// Si CROW_ADMIN_KEY está seteada, el endpoint exige header x-admin-key
// (igual que los endpoints de admin). Sin la key (dev) queda abierto.
import { NextResponse } from "next/server";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { createRpcFetch } from "@/app/services/payments/chain";
import {
  ensureMonitorScheduler,
  readMonitorPublic,
  scanOnce,
} from "@/app/services/payments/monitor";

let lastRunAt = 0;
const THROTTLE_MS = 10000;

export async function GET(req: Request): Promise<NextResponse> {
  // Protección con CROW_ADMIN_KEY cuando está configurada
  const adminKey = process.env.CROW_ADMIN_KEY?.trim() || "";
  if (adminKey && req.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ ok: false, reason: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const config = getPaymentsConfig();
    ensureMonitorScheduler();
    const now = Date.now();
    if (now - lastRunAt < THROTTLE_MS) {
      const state = readMonitorPublic(
        config.monitorStatePath,
        config.usdtContract,
        config.treasury
      );
      return NextResponse.json({ ok: true, throttled: true, stats: state.stats });
    }
    lastRunAt = now;
    const summary = await scanOnce({
      rpc: createRpcFetch(config.rpcUrl),
      usdtContract: config.usdtContract,
      treasury: config.treasury,
      decimals: config.usdtDecimals,
      minConfirmations: config.minConfirmations,
      maxBlockRange: config.monitorMaxBlockRange,
      registryPath: config.registryPath,
      ordersPath: config.ordersPath,
      statePath: config.monitorStatePath,
      now,
    });
    const state = readMonitorPublic(
      config.monitorStatePath,
      config.usdtContract,
      config.treasury
    );
    return NextResponse.json({ ok: true, throttled: false, summary, stats: state.stats });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
