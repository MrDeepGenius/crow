// ============================================
// BSC CHAIN VERIFICATION - USDT BEP20
// ============================================
// Verifica hechos REALES on-chain vía JSON-RPC. Sin mocks.
// El fetch es inyectable para tests determinísticos.

export const TRANSFER_SELECTOR = "0xa9059cbb";
export const BSC_CHAIN_ID_HEX = "0x38";

export interface ChainFacts {
  hash: string;
  chainIdOk: boolean;
  interactsWithUsdt: boolean;
  isTransferCall: boolean;
  from: string;
  recipient: string;
  valueWei: bigint;
  receiptStatusOk: boolean;
  mined: boolean;
  blockNumber: number;
  confirmations: number;
}

export type RpcFetch = (method: string, params: unknown[]) => Promise<unknown>;

export function createRpcFetch(rpcUrl: string, timeoutMs = 15000): RpcFetch {
  return async (method: string, params: unknown[]): Promise<unknown> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
      const body = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (body.error) throw new Error(`RPC: ${body.error.message ?? "unknown"}`);
      return body.result ?? null;
    } finally {
      clearTimeout(timer);
    }
  };
}

interface RpcTx {
  hash?: string;
  chainId?: string;
  to?: string | null;
  input?: string;
  from?: string;
  blockNumber?: string | null;
}

interface RpcReceipt {
  status?: string;
  blockNumber?: string;
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

/** Decodifica transfer(address,uint256). null si no es una llamada válida. */
export function decodeTransferInput(input: string): { recipient: string; valueWei: bigint } | null {
  if (typeof input !== "string") return null;
  const data = input.startsWith("0x") ? input.slice(2) : input;
  if (!data.startsWith(TRANSFER_SELECTOR.slice(2))) return null;
  if (data.length !== 8 + 64 + 64) return null;
  const recipient = `0x${data.slice(8 + 24, 8 + 64)}`.toLowerCase();
  const valueWei = hexToBigInt(`0x${data.slice(8 + 64, 8 + 128)}`);
  if (!/^0x[0-9a-f]{40}$/.test(recipient)) return null;
  return { recipient, valueWei };
}

export function parseUnits(amount: number | string, decimals: number): bigint {
  const [wholeRaw, fracRaw = ""] = String(amount).split(".");
  if (!/^\d+$/.test(wholeRaw) || !/^\d*$/.test(fracRaw)) {
    throw new Error("Monto inválido para parseUnits");
  }
  const frac = (fracRaw + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(wholeRaw) * BigInt(10) ** BigInt(decimals) + BigInt(frac === "" ? "0" : frac);
}

export type VerifyFailureReason =
  | "TX_NOT_FOUND"
  | "WRONG_CHAIN"
  | "WRONG_TOKEN"
  | "NOT_A_TRANSFER"
  | "WRONG_RECIPIENT"
  | "INSUFFICIENT_AMOUNT"
  | "TX_PENDING"
  | "TX_FAILED"
  | "NEED_MORE_CONFIRMATIONS";

export interface ChainVerification {
  ok: boolean;
  reason?: VerifyFailureReason;
  retryable?: boolean;
  facts?: ChainFacts;
}

export interface ChainExpectations {
  usdtContract: string;
  treasury: string;
  requiredWei: bigint;
  minConfirmations: number;
}

export async function verifyChainPayment(
  rpc: RpcFetch,
  txHash: string,
  expected: ChainExpectations
): Promise<ChainVerification> {
  const hash = txHash.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(hash)) {
    return { ok: false, reason: "TX_NOT_FOUND", retryable: false };
  }

  const tx = (await rpc("eth_getTransactionByHash", [hash])) as RpcTx | null;
  if (!tx) return { ok: false, reason: "TX_NOT_FOUND", retryable: false };
  if (tx.chainId?.toLowerCase() !== BSC_CHAIN_ID_HEX) {
    return { ok: false, reason: "WRONG_CHAIN", retryable: false };
  }
  if ((tx.to ?? "").toLowerCase() !== expected.usdtContract) {
    return { ok: false, reason: "WRONG_TOKEN", retryable: false };
  }
  const decoded = decodeTransferInput(tx.input ?? "");
  if (!decoded) return { ok: false, reason: "NOT_A_TRANSFER", retryable: false };
  if (decoded.recipient !== expected.treasury) {
    return { ok: false, reason: "WRONG_RECIPIENT", retryable: false };
  }
  if (decoded.valueWei < expected.requiredWei) {
    return { ok: false, reason: "INSUFFICIENT_AMOUNT", retryable: false };
  }

  const receipt = (await rpc("eth_getTransactionReceipt", [hash])) as RpcReceipt | null;
  if (!receipt || !receipt.blockNumber) {
    return { ok: false, reason: "TX_PENDING", retryable: true };
  }
  if (receipt.status !== "0x1") {
    return { ok: false, reason: "TX_FAILED", retryable: false };
  }

  const latestHex = (await rpc("eth_blockNumber", [])) as string;
  const confirmations =
    Number(hexToBigInt(latestHex)) - Number(hexToBigInt(receipt.blockNumber)) + 1;
  if (confirmations < expected.minConfirmations) {
    return { ok: false, reason: "NEED_MORE_CONFIRMATIONS", retryable: true };
  }

  return {
    ok: true,
    facts: {
      hash,
      chainIdOk: true,
      interactsWithUsdt: true,
      isTransferCall: true,
      from: (tx.from ?? "").toLowerCase(),
      recipient: decoded.recipient,
      valueWei: decoded.valueWei,
      receiptStatusOk: true,
      mined: true,
      blockNumber: Number(hexToBigInt(receipt.blockNumber)),
      confirmations,
    },
  };
}
