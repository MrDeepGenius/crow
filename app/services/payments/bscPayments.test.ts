// ============================================
// BSC PAYMENTS TESTS - modo dev/test SEPARADO del flujo real
// ============================================
// Estos tests usan RpcFetch mockeado (inyectado). NUNCA tocan BSC real.
// No simulan una transferencia como si fuera real: verifican que el
// validador clasifique correctamente hechos on-chain falsos vs válidos.

import { describe, expect, it, beforeEach } from "vitest";
import {
  TRANSFER_SELECTOR,
  parseUnits,
  verifyChainPayment,
  type RpcFetch,
} from "./chain";
import {
  classifyFailure,
  checkReplay,
  claimTxAndQuote,
} from "./bscPaymentService";
import { isQuoteExpired, issueQuote, verifyQuoteSignature } from "./quotes";
import { loadRegistry, saveRegistry } from "./registry";
import { createOrder, getOrder, markExpiredOrders, markPaidWithTx } from "../marketplace/marketOrders";
import { grantEntitlement, hasAccess, listEntitlements } from "../marketplace/marketLedger";
import type { StorageLike } from "../marketplace/marketStore";

const USDT = "0x55d398326f99059ff775485246999027b3197955";
const TREASURY = "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f";
const OTHER = "0x1111111111111111111111111111111111111111";
const TX = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
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
  return `${TRANSFER_SELECTOR}${addr}${val}`;
}

function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

interface MockTx {
  to?: string | null;
  chainId?: string;
  input?: string;
  from?: string;
  blockNumber?: string | null;
  receiptStatus?: string | null;
  latest?: number;
}

/** RPC falso determinístico: hechos on-chain controlados por el test. */
function mockRpc(tx: MockTx | null): RpcFetch {
  return async (method: string): Promise<unknown> => {
    if (method === "eth_getTransactionByHash") {
      if (!tx) return null;
      return {
        hash: TX,
        chainId: tx.chainId ?? "0x38",
        to: tx.to ?? USDT,
        input: tx.input ?? transferInput(TREASURY, parseUnits(25, 18)),
        from: tx.from ?? OTHER,
        blockNumber: tx.blockNumber ?? hex(100),
      };
    }
    if (method === "eth_getTransactionReceipt") {
      if (!tx || !(tx.blockNumber ?? hex(100))) return null;
      return { status: tx.receiptStatus ?? "0x1", blockNumber: tx.blockNumber ?? hex(100) };
    }
    if (method === "eth_blockNumber") {
      return hex(tx?.latest ?? 100 + MIN_CONF);
    }
    throw new Error(`Método no mockeado: ${method}`);
  };
}

const EXPECTED = {
  usdtContract: USDT,
  treasury: TREASURY,
  requiredWei: parseUnits(25, 18),
  minConfirmations: MIN_CONF,
};

describe("bsc payments (dev/test, RPC mockeado)", () => {
  let store: StorageLike;
  beforeEach(() => {
    store = memoryStorage();
  });

  it("pago correcto: verifica y clasifica PAID", async () => {
    const r = await verifyChainPayment(mockRpc({}), TX, EXPECTED);
    expect(r.ok).toBe(true);
    expect(r.facts?.recipient).toBe(TREASURY);
    expect(r.facts?.confirmations).toBeGreaterThanOrEqual(MIN_CONF);
  });

  it("monto insuficiente: no es PAID y va a REVIEW_REQUIRED", async () => {
    const r = await verifyChainPayment(
      mockRpc({ input: transferInput(TREASURY, parseUnits(1, 18)) }),
      TX,
      EXPECTED
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("INSUFFICIENT_AMOUNT");
    expect(classifyFailure(r.reason as string)).toBe("REVIEW_REQUIRED");
  });

  it("contrato incorrecto: token equivocado", async () => {
    const r = await verifyChainPayment(mockRpc({ to: OTHER }), TX, EXPECTED);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("WRONG_TOKEN");
    expect(classifyFailure(r.reason as string)).toBe("REVIEW_REQUIRED");
  });

  it("recipient incorrecto: no era la wallet Crow", async () => {
    const r = await verifyChainPayment(
      mockRpc({ input: transferInput(OTHER, parseUnits(25, 18)) }),
      TX,
      EXPECTED
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("WRONG_RECIPIENT");
  });

  it("tx inexistente: se rechaza sin revisión", async () => {
    const r = await verifyChainPayment(mockRpc(null), TX, EXPECTED);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("TX_NOT_FOUND");
    expect(classifyFailure(r.reason as string)).toBe("REJECTED");
  });

  it("transacción fallida (revertida): no es PAID", async () => {
    const r = await verifyChainPayment(mockRpc({ receiptStatus: "0x0" }), TX, EXPECTED);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("TX_FAILED");
    expect(classifyFailure(r.reason as string)).toBe("REVIEW_REQUIRED");
  });

  it("tx ya utilizada: anti-replay bloquea el segundo uso", () => {
    const path = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\pay-test-replay.json";
    saveRegistry(path, { usedTx: {}, usedQuotes: {}, events: [] });
    expect(claimTxAndQuote(path, TX, "qid-1", "ord-1")).toBe(true);
    const replay = checkReplay(path, TX, "qid-2");
    expect(replay.txAlreadyUsed).toBe(true);
    expect(claimTxAndQuote(path, TX, "qid-2", "ord-2")).toBe(false);
    expect(loadRegistry(path).usedTx[TX].orderId).toBe("ord-1");
  });

  it("orden expirada: quote vencida se rechaza", () => {
    const q = issueQuote(
      { orderId: "ord-1", amount: 25, currency: "USDT", treasury: TREASURY, chainId: 56, ttlMinutes: 30 },
      "secret-test",
      "qid-exp",
      Date.now() - 31 * 60000
    );
    expect(verifyQuoteSignature(q, "secret-test")).toBe(true);
    expect(isQuoteExpired(q)).toBe(true);
  });

  it("orden expirada en store: PENDING vencida pasa a EXPIRED", () => {
    const o = createOrder(
      {
        buyerId: "buyer1",
        productId: "prod1",
        creatorId: "creator1",
        amount: { amount: 25, currency: "USDT" },
        affiliatePercent: 0,
        ttlMinutes: -1,
      },
      store
    );
    const expired = markExpiredOrders(Date.now(), store);
    expect(expired).toContain(o.id);
    expect(getOrder(o.id, store)?.status).toBe("EXPIRED");
  });

  it("doble verificación: la misma quote no se reclama dos veces", () => {
    const path = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\pay-test-double.json";
    saveRegistry(path, { usedTx: {}, usedQuotes: {}, events: [] });
    const tx2 = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    expect(claimTxAndQuote(path, tx2, "qid-dup", "ord-9")).toBe(true);
    expect(checkReplay(path, tx2, "qid-dup").quoteAlreadyUsed).toBe(true);
    expect(claimTxAndQuote(path, tx2, "qid-dup", "ord-9")).toBe(false);
  });

  it("entitlement duplicado: no se duplica aunque se verifique dos veces", () => {
    const o = createOrder(
      {
        buyerId: "buyer-dup",
        productId: "prod-dup",
        creatorId: "creator-dup",
        amount: { amount: 10, currency: "USDT" },
        affiliatePercent: 0,
      },
      store
    );
    expect(markPaidWithTx(o.id, TX, 123, store)).toBe(true);
    const paid = getOrder(o.id, store);
    expect(paid?.status).toBe("PAID");
    expect(paid?.blockNumber).toBe(123);
    const e1 = grantEntitlement(paid as NonNullable<typeof paid>, store);
    const e2 = grantEntitlement(paid as NonNullable<typeof paid>, store);
    expect(e1.id).toBe(e2.id);
    expect(listEntitlements(store).filter((e) => e.orderId === o.id).length).toBe(1);
    expect(hasAccess("buyer-dup", "prod-dup", store)).toBe(true);
    // Segundo PAID con el mismo hash es idempotente y no duplica.
    expect(markPaidWithTx(o.id, TX, 123, store)).toBe(true);
    expect(listEntitlements(store).filter((e) => e.orderId === o.id).length).toBe(1);
  });
});
