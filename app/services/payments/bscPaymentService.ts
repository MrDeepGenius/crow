// ============================================
// BSC PAYMENT SERVICE - orquestador USDT BEP-20
// ============================================
// Reutiliza los modelos existentes (Order, Payment, Entitlement) sin duplicarlos.
// El servidor es la única fuente de verdad: chainId, contrato, treasury y
// monto requerido salen de variables de entorno, nunca del frontend.
// Crow NO custodia private keys: solo verifica hechos on-chain (lectura RPC).

import type { ChainExpectations, RpcFetch, VerifyFailureReason } from "./chain";
import { createRpcFetch, parseUnits } from "./chain";
import { getPaymentsConfig } from "./config";
import { USDTBEP20Verifier } from "./providers";
import { loadRegistry, logRegistryEvent, saveRegistry } from "./registry";

export type BscOrderStatus =
  | "PENDING"
  | "VERIFYING"
  | "PAID"
  | "EXPIRED"
  | "REVIEW_REQUIRED";

export interface BscVerifyInput {
  orderId: string;
  buyerId: string;
  expectedAmount: number;
  txHash: string;
}

export interface BscVerifySuccess {
  ok: true;
  txHash: string;
  blockNumber: number;
  confirmations: number;
  amount: number;
  from: string;
  to: string;
}

export type BscVerifyOutcome =
  | BscVerifySuccess
  | { ok: false; kind: "RETRYABLE"; reason: string }
  | { ok: false; kind: "REVIEW_REQUIRED"; reason: string }
  | { ok: false; kind: "REJECTED"; reason: string };

const RETRYABLE_REASONS: ReadonlySet<string> = new Set([
  "TX_PENDING",
  "NEED_MORE_CONFIRMATIONS",
  "RPC_ERROR",
  "RATE_LIMITED",
  "SERVER_ERROR",
]);

const REVIEW_REASONS: ReadonlySet<string> = new Set([
  "WRONG_CHAIN",
  "WRONG_TOKEN",
  "NOT_A_TRANSFER",
  "WRONG_RECIPIENT",
  "INSUFFICIENT_AMOUNT",
  "TX_FAILED",
]);

export function classifyFailure(reason: string): "RETRYABLE" | "REVIEW_REQUIRED" | "REJECTED" {
  if (RETRYABLE_REASONS.has(reason)) return "RETRYABLE";
  if (REVIEW_REASONS.has(reason)) return "REVIEW_REQUIRED";
  return "REJECTED";
}

export function buildExpectations(requiredAmount: number): ChainExpectations {
  const config = getPaymentsConfig();
  return {
    usdtContract: config.usdtContract,
    treasury: config.treasury,
    requiredWei: parseUnits(requiredAmount, config.usdtDecimals),
    minConfirmations: config.minConfirmations,
  };
}

/**
 * Verifica una TX contra la red con los valores OFICIALES del servidor.
 * No recibe contrato/recipient/monto del frontend: solo orderId, buyerId,
 * expectedAmount (validado contra la quote firmada por el llamante) y txHash.
 * El llamante (route handler) debe haber validado la quote firmada antes.
 */
export async function verifyBscPayment(
  rpc: RpcFetch,
  input: BscVerifyInput
): Promise<BscVerifyOutcome> {
  const verifier = new USDTBEP20Verifier(createRpcFetchFrom(rpc), buildExpectations(input.expectedAmount));
  const result = await verifier.verify({
    orderId: input.orderId,
    txHash: input.txHash,
    expectedAmount: input.expectedAmount,
  });
  if (result.ok && result.receipt) {
    return {
      ok: true,
      txHash: result.receipt.hash,
      blockNumber: result.receipt.blockNumber,
      confirmations: result.receipt.confirmations,
      amount: result.receipt.amount,
      from: result.receipt.from,
      to: result.receipt.to,
    };
  }
  const reason = result.reason ?? "UNKNOWN";
  const kind = classifyFailure(reason);
  return { ok: false, kind, reason };
}

/** fetch inyectable tal cual (separado para tests determinísticos). */
function createRpcFetchFrom(rpc: RpcFetch): RpcFetch {
  return rpc;
}

/** RPC real de producción desde env (server únicamente). */
export function createProductionRpc(): RpcFetch {
  const config = getPaymentsConfig();
  return createRpcFetch(config.rpcUrl);
}

export interface ReplayCheck {
  txAlreadyUsed: boolean;
  quoteAlreadyUsed: boolean;
}

/** Prevención de replay: una txHash solo paga una orden; una quote solo se usa una vez. */
export function checkReplay(registryPath: string, txHash: string, qid: string): ReplayCheck {
  const registry = loadRegistry(registryPath);
  return {
    txAlreadyUsed: Boolean(registry.usedTx[txHash.toLowerCase()]),
    quoteAlreadyUsed: Boolean(registry.usedQuotes[qid]),
  };
}

/** Marca tx+quote como usadas ANTES de responder (idempotencia). Retorna false si hubo carrera. */
export function claimTxAndQuote(
  registryPath: string,
  txHash: string,
  qid: string,
  orderId: string
): boolean {
  const fresh = loadRegistry(registryPath);
  const key = txHash.toLowerCase();
  if (fresh.usedTx[key] || fresh.usedQuotes[qid]) return false;
  fresh.usedTx[key] = { orderId, usedAt: new Date().toISOString() };
  fresh.usedQuotes[qid] = { orderId, usedAt: new Date().toISOString() };
  saveRegistry(registryPath, fresh);
  logRegistryEvent(registryPath, "payment_confirmed", `order=${orderId} tx=${key}`);
  return true;
}

/** Validación de ownership: la orden debe pertenecer al comprador que la consulta. */
export function isOrderOwner(orderBuyerId: string, requestBuyerId: string): boolean {
  return orderBuyerId.trim().toLowerCase() === requestBuyerId.trim().toLowerCase();
}

export type { VerifyFailureReason };
