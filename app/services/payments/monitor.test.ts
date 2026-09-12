// ============================================
// MONITOR TESTS - detección automática (RPC mockeado)
// ============================================
// Modo dev/test SEPARADO del flujo real: ningún test toca BSC.
// Reutiliza el mismo código de producción (scanOnce, matchTransfer,
// verifyBscPayment) con RpcFetch inyectado.

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import type { RpcFetch } from "./chain";
import { parseUnits } from "./chain";
import {
  TRANSFER_EVENT_TOPIC,
  matchTransfer,
  padTopicAddress,
  parseTransferLog,
  scanOnce,
} from "./monitor";
import { registerMirroredOrder, getMirroredOrder } from "./orderMirror";
import { loadRegistry } from "./registry";
import { grantEntitlement, hasAccess } from "../marketplace/marketLedger";
import { createOrder, getOrder, markPaidWithTx } from "../marketplace/marketOrders";
import type { StorageLike } from "../marketplace/marketStore";

// Valores OFICIALES (los mismos de producción). Los senders son arbitrarios
// por naturaleza (cualquier wallet puede pagar).
const USDT = "0x55d398326f99059ff775485246999027b3197955";
const TREASURY = "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f";
process.env.CROW_PAYMENT_WALLET = TREASURY;
process.env.CROW_TREASURY_BEP20 = TREASURY;
process.env.USDT_BSC_CONTRACT = USDT;
process.env.MIN_CONFIRMATIONS = "12";

const NOW = Date.now();
const MIN_CONF = 12;

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

function transferInput(recipient: string, valueWei: bigint): string {
  const addr = recipient.toLowerCase().replace("0x", "").padStart(64, "0");
  const val = valueWei.toString(16).padStart(64, "0");
  return `0xa9059cbb${addr}${val}`;
}

function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

interface MockTransfer {
  tx: string;
  block: number;
  from: string;
  valueWei: bigint;
  token?: string;
  to?: string;
  receiptStatus?: string;
}

interface RpcDeps {
  tip: number;
  transfers: MockTransfer[];
  blockTimeSec: number;
}

function mockRpc(deps: RpcDeps): RpcFetch {
  const byTx = new Map(deps.transfers.map((t) => [t.tx.toLowerCase(), t]));
  return async (method: string, params: unknown[]): Promise<unknown> => {
    if (method === "eth_blockNumber") return hex(deps.tip);
    if (method === "eth_getLogs") {
      const filter = params[0] as { fromBlock: string; toBlock: string };
      const from = Number(BigInt(filter.fromBlock));
      const to = Number(BigInt(filter.toBlock));
      return deps.transfers
        .filter((t) => t.block >= from && t.block <= to)
        .map((t) => ({
          address: (t.token ?? USDT).toLowerCase(),
          topics: [
            TRANSFER_EVENT_TOPIC,
            padTopicAddress(t.from),
            padTopicAddress(t.to ?? TREASURY),
          ],
          data: `0x${t.valueWei.toString(16).padStart(64, "0")}`,
          transactionHash: t.tx.toLowerCase(),
          blockNumber: hex(t.block),
        }));
    }
    if (method === "eth_getTransactionByHash") {
      const hash = String(params[0]).toLowerCase();
      const t = byTx.get(hash);
      if (!t) return null;
      return {
        hash,
        chainId: "0x38",
        to: (t.token ?? USDT).toLowerCase(),
        input: transferInput(t.to ?? TREASURY, t.valueWei),
        from: t.from.toLowerCase(),
        blockNumber: hex(t.block),
      };
    }
    if (method === "eth_getTransactionReceipt") {
      const hash = String(params[0]).toLowerCase();
      const t = byTx.get(hash);
      if (!t) return null;
      return { status: t.receiptStatus ?? "0x1", blockNumber: hex(t.block) };
    }
    if (method === "eth_getBlockByNumber") {
      return { timestamp: hex(deps.blockTimeSec) };
    }
    throw new Error(`Método no mockeado: ${method}`);
  };
}

const FROM_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const FROM_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TX1 = "0x1111111111111111111111111111111111111111111111111111111111111111";
const TX2 = "0x2222222222222222222222222222222222222222222222222222222222222222";

function paths(tag: string): { state: string; registry: string; orders: string } {
  const base = `C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\mon-${tag}`;
  return { state: `${base}.state.json`, registry: `${base}.reg.json`, orders: `${base}.ord.json` };
}

function clean(p: { state: string; registry: string; orders: string }): void {
  for (const f of [p.state, p.registry, p.orders]) {
    try {
      if (existsSync(f)) unlinkSync(f);
    } catch {
      // sigue
    }
  }
}

function mirrorDefaults(orderId: string, buyer: string, amount: number) {
  return {
    orderId,
    buyerId: buyer,
    productId: "prod-1",
    amount,
    currency: "USDT",
    createdAt: new Date(NOW - 600000).toISOString(),
    expiresAt: new Date(NOW + 1800000).toISOString(),
    fromBlock: 90 as number | null,
  };
}

function scanDeps(
  p: { state: string; registry: string; orders: string },
  rpc: RpcFetch
) {
  return {
    rpc,
    usdtContract: USDT,
    treasury: TREASURY,
    decimals: 18,
    minConfirmations: MIN_CONF,
    maxBlockRange: 2000,
    registryPath: p.registry,
    ordersPath: p.orders,
    statePath: p.state,
    now: NOW,
  };
}

describe("monitor: detección de Transfer", () => {
  it("detectar Transfer correcto hacia la treasury", () => {
    const parsed = parseTransferLog(
      {
        address: USDT,
        topics: [TRANSFER_EVENT_TOPIC, padTopicAddress(FROM_A), padTopicAddress(TREASURY)],
        data: `0x${parseUnits(25, 18).toString(16).padStart(64, "0")}`,
        transactionHash: TX1,
        blockNumber: hex(100),
      },
      USDT,
      TREASURY,
      18
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.blockNumber).toBe(100);
    expect(parsed?.amount).toBe(25);
  });

  it("ignorar otro token", () => {
    const parsed = parseTransferLog(
      {
        address: "0x0000000000000000000000000000000000000001",
        topics: [TRANSFER_EVENT_TOPIC, padTopicAddress(FROM_A), padTopicAddress(TREASURY)],
        data: `0x${parseUnits(25, 18).toString(16).padStart(64, "0")}`,
        transactionHash: TX1,
        blockNumber: hex(100),
      },
      USDT,
      TREASURY,
      18
    );
    expect(parsed).toBeNull();
  });

  it("ignorar otro recipient", () => {
    const parsed = parseTransferLog(
      {
        address: USDT,
        topics: [TRANSFER_EVENT_TOPIC, padTopicAddress(FROM_A), padTopicAddress(FROM_B)],
        data: `0x${parseUnits(25, 18).toString(16).padStart(64, "0")}`,
        transactionHash: TX1,
        blockNumber: hex(100),
      },
      USDT,
      TREASURY,
      18
    );
    expect(parsed).toBeNull();
  });
});

describe("monitor: asociación y confirmación", () => {
  let p: { state: string; registry: string; orders: string };
  beforeEach(() => {
    p = paths(`assoc-${Math.random().toString(36).slice(2)}`);
    clean(p);
  });

  it("detectar pago: crea sighting y asocia a la orden", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 105,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const summary = await scanOnce(scanDeps(p, rpc));
    expect(summary.ran).toBe(true);
    expect(summary.newlyMatched).toBe(1);
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("VERIFYING");
  });

  it("pago con monto correcto: PAID tras confirmaciones", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const summary = await scanOnce(scanDeps(p, rpc));
    expect(summary.newlyConfirmed).toBe(1);
    const order = getMirroredOrder(p.orders, "ord-1");
    expect(order?.status).toBe("PAID");
    expect(order?.txHash).toBe(TX1.toLowerCase());
    expect(order?.blockNumber).toBe(100);
    expect(loadRegistry(p.registry).usedTx[TX1.toLowerCase()].orderId).toBe("ord-1");
  });

  it("monto incorrecto: no hay PAID y queda visible para revisión", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(1, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("PENDING");
    const { readMonitorPublic } = await import("./monitor");
    const state = readMonitorPublic(p.state, USDT, TREASURY);
    expect(state.unmatched.some((u) => u.txHash === TX1.toLowerCase())).toBe(true);
  });

  it("múltiples órdenes: cada pago va a su orden; empate exacto va a revisión", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-a", "ana", 10));
    registerMirroredOrder(p.orders, mirrorDefaults("ord-b", "beto", 25));
    registerMirroredOrder(p.orders, mirrorDefaults("ord-c", "carla", 10));
    const rpc = mockRpc({
      tip: 200,
      transfers: [
        { tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) },
        { tx: TX2, block: 101, from: FROM_B, valueWei: parseUnits(10, 18) },
      ],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    // 25 exacto y único → ord-b confirmada.
    expect(getMirroredOrder(p.orders, "ord-b")?.status).toBe("PAID");
    // 10 exacto pero ambiguo (ord-a y ord-c): ninguna se elige, ambas a revisión.
    expect(getMirroredOrder(p.orders, "ord-a")?.status).toBe("REVIEW_REQUIRED");
    expect(getMirroredOrder(p.orders, "ord-c")?.status).toBe("REVIEW_REQUIRED");
  });

  it("múltiples transferencias en el mismo ciclo", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-a", "ana", 10));
    registerMirroredOrder(p.orders, mirrorDefaults("ord-b", "beto", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [
        { tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(10, 18) },
        { tx: TX2, block: 101, from: FROM_B, valueWei: parseUnits(30, 18) },
      ],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const summary = await scanOnce(scanDeps(p, rpc));
    expect(summary.newTransfers).toBe(2);
    expect(getMirroredOrder(p.orders, "ord-a")?.status).toBe("PAID");
    // 30 sin exacto: ord-a ya está asociada a TX1, queda solo ord-b (25) como
    // candidata → overpay aceptado (monto >= requerido) → PAID.
    expect(getMirroredOrder(p.orders, "ord-b")?.status).toBe("PAID");
  });

  it("tx duplicada: reprocesar no duplica nada", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const first = await scanOnce(scanDeps(p, rpc));
    const second = await scanOnce(scanDeps(p, rpc));
    expect(first.newlyConfirmed).toBe(1);
    expect(second.newlyConfirmed ?? 0).toBe(0);
    expect(Object.keys(loadRegistry(p.registry).usedTx)).toHaveLength(1);
  });

  it("pago sin orden: se registra UNMATCHED_PAYMENT", async () => {
    // Sin órdenes el monitor parte del tip: el pago debe estar en un bloque
    // nuevo (hacia adelante), no en historia vieja.
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 200, from: FROM_A, valueWei: parseUnits(50, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const summary = await scanOnce(scanDeps(p, rpc));
    expect(summary.newlyUnmatched).toBe(1);
    const { readMonitorPublic } = await import("./monitor");
    const state = readMonitorPublic(p.state, USDT, TREASURY);
    const u = state.unmatched.find((x) => x.txHash === TX1.toLowerCase());
    expect(u?.amount).toBe(50);
    expect(u?.sender).toBe(FROM_A);
  });

  it("orden expirada: el pago no se asocia", async () => {
    registerMirroredOrder(p.orders, {
      ...mirrorDefaults("ord-1", "juan", 25),
      createdAt: new Date(NOW - 3600000).toISOString(),
      expiresAt: new Date(NOW - 60000).toISOString(),
    });
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("EXPIRED");
  });

  it("confirmaciones insuficientes: queda VERIFYING sin PAID", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 105,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    const order = getMirroredOrder(p.orders, "ord-1");
    expect(order?.status).toBe("VERIFYING");
    expect(loadRegistry(p.registry).usedTx[TX1.toLowerCase()]).toBeUndefined();
  });

  it("confirmaciones suficientes: PAID", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const low = mockRpc({
      tip: 100,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, low));
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("VERIFYING");
    const high = mockRpc({
      tip: 100 + MIN_CONF,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, high));
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("PAID");
  });

  it("worker reiniciado: continúa desde el checkpoint sin perder pagos", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const first = mockRpc({ tip: 110, transfers: [], blockTimeSec: Math.floor(NOW / 1000) });
    const s1 = await scanOnce(scanDeps(p, first));
    expect(s1.toBlock).toBe(110);
    // "Reinicio": el segundo ciclo parte del checkpoint guardado.
    const second = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 150, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    const s2 = await scanOnce(scanDeps(p, second));
    // El hint fromBlock de la orden pendiente rebobina a 90 por diseño (para
    // no perder pagos previos al checkpoint); lo ya visto no se duplica.
    expect(s2.fromBlock).toBe(90);
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("PAID");
  });

  it("checkpoint: no reprocesa bloques ya vistos", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    const again = await scanOnce(scanDeps(p, rpc));
    // El bloque tip se re-escanea por diseño (el tip no es final y puede traer
    // logs nuevos); lo ya procesado no se duplica gracias al anti-replay.
    expect(again.ran).toBe(true);
    expect(again.newlyConfirmed ?? 0).toBe(0);
    expect(again.newTransfers ?? 0).toBe(0);
  });

  it("procesamiento idempotente: dos ciclos, un solo PAID", async () => {
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    await scanOnce(scanDeps(p, rpc));
    const { readMonitorPublic } = await import("./monitor");
    const state = readMonitorPublic(p.state, USDT, TREASURY);
    expect(state.stats.confirmed).toBe(1);
    expect(getMirroredOrder(p.orders, "ord-1")?.status).toBe("PAID");
  });

  it("usuario cierra navegador: el server confirma sin polling del cliente", async () => {
    // Solo espejo + cadena. Ningún fetch a /status ocurre en este test.
    registerMirroredOrder(p.orders, mirrorDefaults("ord-1", "juan", 25));
    const rpc = mockRpc({
      tip: 200,
      transfers: [{ tx: TX1, block: 100, from: FROM_A, valueWei: parseUnits(25, 18) }],
      blockTimeSec: Math.floor(NOW / 1000),
    });
    await scanOnce(scanDeps(p, rpc));
    const order = getMirroredOrder(p.orders, "ord-1");
    expect(order?.status).toBe("PAID");
    expect(order?.txHash).toBe(TX1.toLowerCase());
  });

  it("entitlement duplicado: el monitor no genera doble acceso", () => {
    const store = memoryStorage();
    const created = createOrder(
      {
        buyerId: "juan",
        productId: "prod-1",
        creatorId: "creator-1",
        amount: { amount: 25, currency: "USDT" },
        affiliatePercent: 0,
      },
      store
    );
    expect(markPaidWithTx(created.id, TX1, 100, store)).toBe(true);
    const paid = getOrder(created.id, store);
    if (!paid) throw new Error("orden inexistente en test");
    const e1 = grantEntitlement(paid, store);
    // Segundo procesamiento del mismo pago (reintento del worker).
    expect(markPaidWithTx(created.id, TX1, 100, store)).toBe(true);
    const e2 = grantEntitlement(getOrder(created.id, store) as typeof paid, store);
    expect(e1.id).toBe(e2.id);
    expect(hasAccess("juan", "prod-1", store)).toBe(true);
  });
});

describe("monitor: matching puro", () => {
  it("no elige arbitrariamente entre montos iguales", () => {
    const orders = [
      { ...mirrorDefaults("a", "x", 10), status: "PENDING" as const, txHash: null, blockNumber: null, updatedAt: "", fromBlock: 1 },
      { ...mirrorDefaults("b", "y", 10), status: "PENDING" as const, txHash: null, blockNumber: null, updatedAt: "", fromBlock: 1 },
    ];
    const r = matchTransfer({ amount: 10, blockTimeMs: NOW }, orders, NOW);
    expect(r.kind).toBe("review");
  });
});
