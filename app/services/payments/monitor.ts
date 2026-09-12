// ============================================
// BSC PAYMENT MONITOR - detección automática USDT BEP-20
// ============================================
// ARQUITECTURA (sin duplicar verificación):
//   BscPaymentMonitor → BSC_PAYMENT_SERVICE → RPC → Blockchain
// El monitor SOLO detecta eventos Transfer y asocia candidatos; TODA decisión
// de PAID pasa por verifyBscPayment + anti-replay existentes.
// Server-side y centralizado: un solo scanner para todas las órdenes (no un
// scanner por navegador). Sobrevive al cierre del checkout (corre en el server).
// PROD: archivos JSON = dev. Migrar a DB (igual que registry.ts/orderMirror.ts).

import type { RpcFetch } from "./chain";
import { createRpcFetch } from "./chain";
import {
  buildExpectations,
  checkReplay,
  claimTxAndQuote,
  isOrderOwner,
  verifyBscPayment,
} from "./bscPaymentService";
import { getPaymentsConfig } from "./config";
import {
  getMirroredOrder,
  listMirroredOrders,
  markMirrorExpired,
  setMirrorStatus,
  type MirroredOrder,
} from "./orderMirror";
import { loadRegistry, logRegistryEvent } from "./registry";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// keccak256("Transfer(address,address,uint256)") — constante estándar ERC-20.
export const TRANSFER_EVENT_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export interface DetectedTransfer {
  txHash: string;
  blockNumber: number;
  from: string;
  /** Suma de valores Transfer hacia la treasury dentro de la misma TX (wei). */
  valueWei: bigint;
  amount: number;
}

export interface Sighting {
  txHash: string;
  blockNumber: number;
  blockTimeMs: number | null;
  from: string;
  amount: number;
  orderId: string;
  buyerId: string;
  firstSeenAt: string;
  lastCheckedAt: string;
  confirmations: number;
}

export interface UnmatchedPayment {
  txHash: string;
  blockNumber: number;
  blockTimeMs: number | null;
  sender: string;
  amount: number;
  tokenContract: string;
  recipient: string;
  detectedAt: string;
}

export type MonitorRunStatus = "RUNNING" | "PAUSED" | "ERROR";

export interface MonitorStats {
  status: MonitorRunStatus;
  lastProcessedBlock: number | null;
  currentBlock: number | null;
  lastScanAt: string | null;
  lastError: string | null;
  transfersDetected: number;
  matched: number;
  confirmed: number;
  unmatched: number;
  errors: number;
  lastTxHash: string | null;
  lastPaymentAt: string | null;
}

export interface MonitorState {
  network: string;
  tokenContract: string;
  recipient: string;
  lastProcessedBlock: number | null;
  updatedAt: string;
  paused: boolean;
  stats: MonitorStats;
  sightings: Record<string, Sighting>;
  unmatched: UnmatchedPayment[];
  blockTimes: Record<string, number>;
}

export function emptyMonitorState(tokenContract: string, recipient: string): MonitorState {
  return {
    network: "BSC",
    tokenContract,
    recipient,
    lastProcessedBlock: null,
    updatedAt: new Date().toISOString(),
    paused: false,
    stats: {
      status: "RUNNING",
      lastProcessedBlock: null,
      currentBlock: null,
      lastScanAt: null,
      lastError: null,
      transfersDetected: 0,
      matched: 0,
      confirmed: 0,
      unmatched: 0,
      errors: 0,
      lastTxHash: null,
      lastPaymentAt: null,
    },
    sightings: {},
    unmatched: [],
    blockTimes: {},
  };
}

export function loadMonitorState(path: string, tokenContract: string, recipient: string): MonitorState {
  try {
    if (!existsSync(path)) return emptyMonitorState(tokenContract, recipient);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<MonitorState>;
    const base = emptyMonitorState(tokenContract, recipient);
    return {
      ...base,
      ...parsed,
      network: "BSC",
      tokenContract,
      recipient,
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      sightings: parsed.sightings ?? {},
      unmatched: parsed.unmatched ?? [],
      blockTimes: parsed.blockTimes ?? {},
    };
  } catch {
    return emptyMonitorState(tokenContract, recipient);
  }
}

export function saveMonitorState(path: string, state: MonitorState): void {
  mkdirSync(dirname(path), { recursive: true });
  const times = Object.entries(state.blockTimes);
  const trimmed: Record<string, number> =
    times.length > 500
      ? Object.fromEntries(times.slice(-500))
      : Object.fromEntries(times);
  writeFileSync(path, JSON.stringify({ ...state, blockTimes: trimmed }, null, 2), "utf8");
}

export function padTopicAddress(address: string): string {
  return `0x${address.toLowerCase().replace("0x", "").padStart(64, "0")}`;
}

interface RawLog {
  address?: unknown;
  topics?: unknown;
  data?: unknown;
  transactionHash?: unknown;
  blockNumber?: unknown;
}

function hexToNumber(hex: string): number | null {
  try {
    const n = Number(BigInt(hex));
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Valida un log como Transfer USDT hacia la treasury. Null si no corresponde
 * (otro token u otro recipient se ignoran aquí mismo).
 */
export function parseTransferLog(
  log: RawLog,
  tokenContract: string,
  recipient: string,
  decimals: number
): DetectedTransfer | null {
  if (typeof log.address !== "string" || log.address.toLowerCase() !== tokenContract) return null;
  if (!Array.isArray(log.topics) || log.topics.length < 3) return null;
  const topics = log.topics;
  if (typeof topics[0] !== "string" || topics[0].toLowerCase() !== TRANSFER_EVENT_TOPIC) return null;
  if (typeof topics[2] !== "string" || topics[2].toLowerCase() !== padTopicAddress(recipient)) return null;
  if (typeof topics[1] !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(topics[1])) return null;
  if (typeof log.data !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(log.data)) return null;
  if (typeof log.transactionHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(log.transactionHash)) return null;
  if (typeof log.blockNumber !== "string") return null;
  const blockNumber = hexToNumber(log.blockNumber);
  if (blockNumber === null) return null;
  const from = `0x${topics[1].slice(-40)}`.toLowerCase();
  const valueWei = BigInt(log.data);
  return {
    txHash: log.transactionHash.toLowerCase(),
    blockNumber,
    from,
    valueWei,
    amount: Number(valueWei) / 10 ** decimals,
  };
}

export type MatchResult =
  | { kind: "match"; order: MirroredOrder }
  | { kind: "review"; orderIds: string[]; reason: string }
  | { kind: "none" };

function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/**
 * Asocia una transferencia a UNA orden pendiente de forma segura.
 * Reglas: orden PENDING/VERIFYING, no expirada al momento del pago, creada
 * antes del pago, monto <= transferido. Exactitud manda: si exactamente una
 * orden coincide en monto exacto → match; si dos o más son indistinguibles
 * (mismo monto, o varios candidatos sin exacto) → REVIEW_REQUIRED, nunca
 * se elige arbitrariamente (no mezclar el pago de Juan con Pedro).
 */
export function matchTransfer(
  transfer: { amount: number; blockTimeMs: number | null },
  orders: MirroredOrder[],
  now: number = Date.now()
): MatchResult {
  const at = transfer.blockTimeMs ?? now;
  const candidates = orders.filter((o) => {
    if (o.status !== "PENDING" && o.status !== "VERIFYING") return false;
    if (new Date(o.expiresAt).getTime() <= at) return false;
    if (new Date(o.createdAt).getTime() > at + 120000) return false;
    if (!(o.amount > 0) || o.amount - transfer.amount > 0.005) return false;
    return true;
  });
  if (candidates.length === 0) return { kind: "none" };
  const exact = candidates.filter((o) => amountsEqual(o.amount, transfer.amount));
  if (exact.length === 1) return { kind: "match", order: exact[0] };
  if (exact.length > 1) {
    return {
      kind: "review",
      orderIds: exact.map((o) => o.orderId),
      reason: "AMBIGUOUS_AMOUNT",
    };
  }
  if (candidates.length === 1) return { kind: "match", order: candidates[0] };
  return {
    kind: "review",
    orderIds: candidates.map((o) => o.orderId),
    reason: "AMBIGUOUS_CANDIDATES",
  };
}

export interface ScanDeps {
  rpc: RpcFetch;
  usdtContract: string;
  treasury: string;
  decimals: number;
  minConfirmations: number;
  maxBlockRange: number;
  registryPath: string;
  ordersPath: string;
  statePath: string;
  now?: number;
}

export interface ScanSummary {
  ran: boolean;
  reason?: string;
  fromBlock?: number;
  toBlock?: number;
  currentBlock?: number;
  newTransfers?: number;
  newlyMatched?: number;
  newlyConfirmed?: number;
  newlyUnmatched?: number;
}

async function rpcBlockNumber(rpc: RpcFetch): Promise<number | null> {
  try {
    const raw = (await rpc("eth_blockNumber", [])) as string;
    return hexToNumber(raw);
  } catch {
    return null;
  }
}

async function rpcBlockTimeMs(
  rpc: RpcFetch,
  blockNumber: number,
  cache: Record<string, number>
): Promise<number | null> {
  const key = String(blockNumber);
  if (typeof cache[key] === "number") return cache[key];
  try {
    const block = (await rpc("eth_getBlockByNumber", [`0x${blockNumber.toString(16)}`, false])) as {
      timestamp?: unknown;
    } | null;
    if (!block || typeof block.timestamp !== "string") return null;
    const ms = Number(BigInt(block.timestamp)) * 1000;
    if (!Number.isFinite(ms)) return null;
    cache[key] = ms;
    return ms;
  } catch {
    return null;
  }
}

/**
 * Un ciclo del monitor. Idempotente: reprocesar el mismo bloque no duplica
 * nada (registry anti-replay + sightings + unmatched por txHash).
 */
export async function scanOnce(deps: ScanDeps): Promise<ScanSummary> {
  const now = deps.now ?? Date.now();
  const state = loadMonitorState(deps.statePath, deps.usdtContract, deps.treasury);
  if (state.paused) {
    return { ran: false, reason: "PAUSED" };
  }
  markMirrorExpired(deps.ordersPath, now);

  const tip = await rpcBlockNumber(deps.rpc);
  if (tip === null) {
    state.stats.status = "ERROR";
    state.stats.lastError = "RPC_ERROR";
    state.stats.errors += 1;
    state.updatedAt = new Date(now).toISOString();
    saveMonitorState(deps.statePath, state);
    logRegistryEvent(deps.registryPath, "monitor_error", "no se pudo obtener eth_blockNumber");
    return { ran: false, reason: "RPC_ERROR" };
  }
  state.stats.currentBlock = tip;

  const pendings = listMirroredOrders(deps.ordersPath).filter(
    (o) => o.status === "PENDING" || o.status === "VERIFYING"
  );
  const hints = pendings
    .map((o) => o.fromBlock)
    .filter((b): b is number => typeof b === "number" && Number.isFinite(b));
  const from = Math.min(
    state.lastProcessedBlock === null ? tip : state.lastProcessedBlock + 1,
    hints.length > 0 ? Math.min(...hints) : tip
  );
  if (from > tip) {
    state.updatedAt = new Date(now).toISOString();
    saveMonitorState(deps.statePath, state);
    await settleSightings(deps, state, tip, now);
    saveMonitorState(deps.statePath, state);
    return { ran: true, reason: "UP_TO_DATE", currentBlock: tip };
  }
  const to = Math.min(tip, from + Math.max(1, deps.maxBlockRange) - 1);

  let logs: RawLog[];
  try {
    const res = (await deps.rpc("eth_getLogs", [
      {
        address: deps.usdtContract,
        topics: [TRANSFER_EVENT_TOPIC, null, padTopicAddress(deps.treasury)],
        fromBlock: `0x${from.toString(16)}`,
        toBlock: `0x${to.toString(16)}`,
      },
    ])) as RawLog[] | null;
    logs = res ?? [];
  } catch {
    state.stats.status = "ERROR";
    state.stats.lastError = "LOGS_RPC_ERROR";
    state.stats.errors += 1;
    state.updatedAt = new Date(now).toISOString();
    saveMonitorState(deps.statePath, state);
    logRegistryEvent(deps.registryPath, "monitor_error", `eth_getLogs falló ${from}-${to}`);
    return { ran: false, reason: "LOGS_RPC_ERROR" };
  }

  // Agrega por txHash (una TX puede traer varios Transfer a la treasury).
  const byTx = new Map<string, { blockNumber: number; from: string; valueWei: bigint }>();
  for (const log of logs) {
    const parsed = parseTransferLog(log, deps.usdtContract, deps.treasury, deps.decimals);
    if (!parsed) continue;
    const prev = byTx.get(parsed.txHash);
    if (prev) {
      prev.valueWei += parsed.valueWei;
    } else {
      byTx.set(parsed.txHash, {
        blockNumber: parsed.blockNumber,
        from: parsed.from,
        valueWei: parsed.valueWei,
      });
    }
  }

  let newTransfers = 0;
  let newlyMatched = 0;
  let newlyUnmatched = 0;
  const registry = loadRegistry(deps.registryPath);
  // Órdenes ya asociadas (sighting activo) no compiten por nuevas
  // transferencias: evita reasignar y respeta "segundo pago → revisión".
  const claimed = new Set<string>(
    Object.values(state.sightings).map((s) => s.orderId)
  );

  for (const [txHash, info] of byTx) {
    if (registry.usedTx[txHash]) continue;
    if (state.sightings[txHash]) continue;
    if (state.unmatched.some((u) => u.txHash === txHash)) continue;
    newTransfers += 1;
    const amount = Number(info.valueWei) / 10 ** deps.decimals;
    const blockTimeMs = await rpcBlockTimeMs(deps.rpc, info.blockNumber, state.blockTimes);
    const match = matchTransfer(
      { amount, blockTimeMs },
      listMirroredOrders(deps.ordersPath).filter((o) => !claimed.has(o.orderId)),
      now
    );
    if (match.kind === "match") {
      const order = getMirroredOrder(deps.ordersPath, match.order.orderId);
      if (!order || (order.status !== "PENDING" && order.status !== "VERIFYING")) continue;
      claimed.add(order.orderId);
      state.sightings[txHash] = {
        txHash,
        blockNumber: info.blockNumber,
        blockTimeMs,
        from: info.from,
        amount,
        orderId: order.orderId,
        buyerId: order.buyerId,
        firstSeenAt: new Date(now).toISOString(),
        lastCheckedAt: new Date(now).toISOString(),
        confirmations: Math.max(0, tip - info.blockNumber + 1),
      };
      setMirrorStatus(deps.ordersPath, order.orderId, "VERIFYING");
      newlyMatched += 1;
      state.stats.matched += 1;
      logRegistryEvent(
        deps.registryPath,
        "monitor_matched",
        `tx=${txHash} order=${order.orderId} amount=${amount}`
      );
    } else if (match.kind === "review") {
      for (const id of match.orderIds) setMirrorStatus(deps.ordersPath, id, "REVIEW_REQUIRED");
      recordUnmatched(state, {
        txHash,
        blockNumber: info.blockNumber,
        blockTimeMs,
        sender: info.from,
        amount,
        tokenContract: deps.usdtContract,
        recipient: deps.treasury,
        detectedAt: new Date(now).toISOString(),
      });
      newlyUnmatched += 1;
      logRegistryEvent(
        deps.registryPath,
        "monitor_ambiguous",
        `tx=${txHash} reason=${match.reason} orders=${match.orderIds.join(",")}`
      );
    } else {
      recordUnmatched(state, {
        txHash,
        blockNumber: info.blockNumber,
        blockTimeMs,
        sender: info.from,
        amount,
        tokenContract: deps.usdtContract,
        recipient: deps.treasury,
        detectedAt: new Date(now).toISOString(),
      });
      newlyUnmatched += 1;
      logRegistryEvent(deps.registryPath, "monitor_unmatched", `tx=${txHash} amount=${amount}`);
    }
  }

  // Reintenta asociar pagos sin orden (la orden pudo registrarse después).
  await retryUnmatched(deps, state, now);

  const confirmed = await settleSightings(deps, state, tip, now);

  state.lastProcessedBlock = to;
  state.stats.status = "RUNNING";
  state.stats.lastError = null;
  state.stats.lastProcessedBlock = to;
  state.stats.lastScanAt = new Date(now).toISOString();
  state.stats.transfersDetected += newTransfers;
  state.stats.unmatched = state.unmatched.length;
  state.updatedAt = new Date(now).toISOString();
  saveMonitorState(deps.statePath, state);

  return {
    ran: true,
    fromBlock: from,
    toBlock: to,
    currentBlock: tip,
    newTransfers,
    newlyMatched,
    newlyConfirmed: confirmed,
    newlyUnmatched,
  };
}

function recordUnmatched(state: MonitorState, payment: UnmatchedPayment): void {
  if (state.unmatched.some((u) => u.txHash === payment.txHash)) return;
  state.unmatched.push(payment);
  if (state.unmatched.length > 500) state.unmatched = state.unmatched.slice(-500);
}

async function retryUnmatched(deps: ScanDeps, state: MonitorState, now: number): Promise<void> {
  if (state.unmatched.length === 0) return;
  const registry = loadRegistry(deps.registryPath);
  const claimed = new Set<string>(
    Object.values(state.sightings).map((s) => s.orderId)
  );
  const remaining: UnmatchedPayment[] = [];
  for (const u of state.unmatched) {
    if (registry.usedTx[u.txHash]) continue;
    const match = matchTransfer(
      { amount: u.amount, blockTimeMs: u.blockTimeMs },
      listMirroredOrders(deps.ordersPath).filter((o) => !claimed.has(o.orderId)),
      now
    );
    if (match.kind === "match") {
      const order = getMirroredOrder(deps.ordersPath, match.order.orderId);
      if (!order || (order.status !== "PENDING" && order.status !== "VERIFYING")) {
        remaining.push(u);
        continue;
      }
      claimed.add(order.orderId);
      state.sightings[u.txHash] = {
        txHash: u.txHash,
        blockNumber: u.blockNumber,
        blockTimeMs: u.blockTimeMs,
        from: u.sender,
        amount: u.amount,
        orderId: order.orderId,
        buyerId: order.buyerId,
        firstSeenAt: u.detectedAt,
        lastCheckedAt: new Date(now).toISOString(),
        confirmations: 0,
      };
      setMirrorStatus(deps.ordersPath, order.orderId, "VERIFYING");
      state.stats.matched += 1;
      logRegistryEvent(
        deps.registryPath,
        "monitor_matched_late",
        `tx=${u.txHash} order=${order.orderId}`
      );
    } else {
      remaining.push(u);
    }
  }
  state.unmatched = remaining;
}

/**
 * Asienta sightings maduros delegando al BSC_PAYMENT_SERVICE existente
 * (contrato, recipient, monto, receipt y confirmaciones se revalidan on-chain).
 * Retorna cuántos pasaron a PAID en este ciclo.
 */
async function settleSightings(
  deps: ScanDeps,
  state: MonitorState,
  tip: number,
  now: number
): Promise<number> {
  let confirmed = 0;
  for (const sighting of Object.values(state.sightings)) {
    const order = getMirroredOrder(deps.ordersPath, sighting.orderId);
    if (!order) {
      delete state.sightings[sighting.txHash];
      continue;
    }
    if (order.status === "PAID") {
      delete state.sightings[sighting.txHash];
      continue;
    }
    if (order.status === "EXPIRED" || order.status === "FAILED" || order.status === "CANCELLED") {
      recordUnmatched(state, {
        txHash: sighting.txHash,
        blockNumber: sighting.blockNumber,
        blockTimeMs: sighting.blockTimeMs,
        sender: sighting.from,
        amount: sighting.amount,
        tokenContract: deps.usdtContract,
        recipient: deps.treasury,
        detectedAt: new Date(now).toISOString(),
      });
      delete state.sightings[sighting.txHash];
      continue;
    }
    const confirmations = Math.max(0, tip - sighting.blockNumber + 1);
    sighting.confirmations = confirmations;
    sighting.lastCheckedAt = new Date(now).toISOString();
    if (confirmations < deps.minConfirmations) continue;

    const replay = checkReplay(deps.registryPath, sighting.txHash, `auto-${sighting.orderId}`);
    if (replay.txAlreadyUsed) {
      const usedBy = loadRegistry(deps.registryPath).usedTx[sighting.txHash]?.orderId;
      if (usedBy === sighting.orderId) {
        setMirrorStatus(deps.ordersPath, sighting.orderId, "PAID", {
          txHash: sighting.txHash,
          blockNumber: sighting.blockNumber,
        });
        confirmed += 1;
      }
      delete state.sightings[sighting.txHash];
      continue;
    }

    let outcome: Awaited<ReturnType<typeof verifyBscPayment>>;
    try {
      outcome = await verifyBscPayment(deps.rpc, {
        orderId: sighting.orderId,
        buyerId: sighting.buyerId,
        expectedAmount: order.amount,
        txHash: sighting.txHash,
      });
    } catch {
      logRegistryEvent(deps.registryPath, "monitor_error", `verify falló order=${sighting.orderId}`);
      continue;
    }
    if (outcome.ok) {
      const claimed = claimTxAndQuote(
        deps.registryPath,
        outcome.txHash,
        `auto-${sighting.orderId}`,
        sighting.orderId
      );
      if (!claimed) {
        delete state.sightings[sighting.txHash];
        continue;
      }
      setMirrorStatus(deps.ordersPath, sighting.orderId, "PAID", {
        txHash: outcome.txHash,
        blockNumber: outcome.blockNumber,
      });
      delete state.sightings[sighting.txHash];
      confirmed += 1;
      state.stats.confirmed += 1;
      state.stats.lastTxHash = outcome.txHash;
      state.stats.lastPaymentAt = new Date(now).toISOString();
      logRegistryEvent(
        deps.registryPath,
        "monitor_confirmed",
        `order=${sighting.orderId} tx=${outcome.txHash} block=${outcome.blockNumber}`
      );
    } else if (outcome.kind === "REVIEW_REQUIRED") {
      setMirrorStatus(deps.ordersPath, sighting.orderId, "REVIEW_REQUIRED", {
        txHash: sighting.txHash,
        blockNumber: sighting.blockNumber,
      });
      delete state.sightings[sighting.txHash];
      logRegistryEvent(
        deps.registryPath,
        "monitor_review",
        `order=${sighting.orderId} reason=${outcome.reason}`
      );
    }
    // RETRYABLE/REJECTED: se conserva el sighting y se reintenta próximos ciclos.
  }
  return confirmed;
}

// ---------- Scheduler in-process (dev / instancia única) ----------

declare global {
  var __crowMonitorTimer: ReturnType<typeof setInterval> | undefined;
  var __crowMonitorRunning: boolean | undefined;
}

function isTestEnv(): boolean {
  return (
    process.env.VITEST === "true" ||
    process.env.NODE_ENV === "test" ||
    typeof process.env.VITEST_WORKER_ID !== "undefined"
  );
}

/**
 * Worker periódico server-side (cada MONITOR_INTERVAL_MS, default 15s).
 * No depende del navegador: corre en el proceso del servidor aunque el
 * checkout esté cerrado. En producción multi-instancia preferir cron externo
 * contra GET /api/payments/monitor (ver docs del endpoint).
 */
export function ensureMonitorScheduler(): boolean {
  if (isTestEnv()) return false;
  if (typeof globalThis.__crowMonitorTimer !== "undefined") return true;
  let config: ReturnType<typeof getPaymentsConfig>;
  try {
    config = getPaymentsConfig();
  } catch {
    return false;
  }
  if (!config.monitorAuto) return false;
  const interval = Math.min(Math.max(config.monitorIntervalMs, 5000), 120000);
  globalThis.__crowMonitorTimer = setInterval(() => {
    if (globalThis.__crowMonitorRunning) return;
    globalThis.__crowMonitorRunning = true;
    const rpc = createRpcFetch(config.rpcUrl);
    scanOnce({
      rpc,
      usdtContract: config.usdtContract,
      treasury: config.treasury,
      decimals: config.usdtDecimals,
      minConfirmations: config.minConfirmations,
      maxBlockRange: config.monitorMaxBlockRange,
      registryPath: config.registryPath,
      ordersPath: config.ordersPath,
      statePath: config.monitorStatePath,
    })
      .catch(() => {
        // El error ya quedó en el state (status ERROR); no tumbar el worker.
      })
      .finally(() => {
        globalThis.__crowMonitorRunning = false;
      });
  }, interval);
  return true;
}

export function setMonitorPaused(statePath: string, tokenContract: string, recipient: string, paused: boolean): void {
  const state = loadMonitorState(statePath, tokenContract, recipient);
  state.paused = paused;
  state.stats.status = paused ? "PAUSED" : "RUNNING";
  state.updatedAt = new Date().toISOString();
  saveMonitorState(statePath, state);
}

export function readMonitorPublic(statePath: string, tokenContract: string, recipient: string): MonitorState {
  return loadMonitorState(statePath, tokenContract, recipient);
}

export { buildExpectations, isOrderOwner };
