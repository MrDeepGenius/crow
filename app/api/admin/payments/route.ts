// GET /api/admin/payments — estado operativo público (sin secretos)
// Muestra red, contrato, treasury y últimos eventos del registry.
// La lista de órdenes vive en localStorage (local-first); el admin web la lee
// en el cliente. Aquí se expone la parte servidor: registry + config pública.
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { loadRegistry } from "@/app/services/payments/registry";
import { listMirroredOrders } from "@/app/services/payments/orderMirror";
import { readMonitorPublic } from "@/app/services/payments/monitor";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json(
        { ok: false, reason: admin.reason },
        { status: admin.reason === "FORBIDDEN" ? 403 : 401 }
      );
    }
    const config = getPaymentsConfig();
    const registry = loadRegistry(config.registryPath);
    const monitor = readMonitorPublic(
      config.monitorStatePath,
      config.usdtContract,
      config.treasury
    );
    const mirrors = listMirroredOrders(config.ordersPath);
    return NextResponse.json({
      ok: true,
      network: {
        provider: "usdt-bep20",
        chain: "BNB Smart Chain",
        network: config.network,
        chainId: config.chainId,
        token: "USDT",
        standard: "BEP-20",
        tokenContract: config.usdtContract,
        treasury: config.treasury,
        minConfirmations: config.minConfirmations,
        orderTtlMinutes: config.orderTtlMinutes,
      },
      registry: {
        usedTxCount: Object.keys(registry.usedTx).length,
        usedQuotesCount: Object.keys(registry.usedQuotes).length,
        events: registry.events.slice(-200).reverse(),
      },
      monitor: {
        status: monitor.stats.status,
        paused: monitor.paused,
        lastProcessedBlock: monitor.stats.lastProcessedBlock,
        currentBlock: monitor.stats.currentBlock,
        lastScanAt: monitor.stats.lastScanAt,
        lastError: monitor.stats.lastError,
        transfersDetected: monitor.stats.transfersDetected,
        matched: monitor.stats.matched,
        confirmed: monitor.stats.confirmed,
        unmatched: monitor.unmatched,
        unmatchedCount: monitor.unmatched.length,
        sightings: Object.values(monitor.sightings),
        errors: monitor.stats.errors,
        lastTxHash: monitor.stats.lastTxHash,
        lastPaymentAt: monitor.stats.lastPaymentAt,
      },
      mirrorOrders: mirrors.slice(-100).reverse(),
      manualReviewEnabled: config.adminKey !== null,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
