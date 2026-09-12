// POST /api/payments/verify — verificación REAL on-chain (server)
// Nunca confía en el frontend: monto y tesorería salen de la quote firmada.
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { createRpcFetch, parseUnits } from "@/app/services/payments/chain";
import { isQuoteExpired, verifyQuoteSignature, type PaymentQuote } from "@/app/services/payments/quotes";
import { loadRegistry, logRegistryEvent, saveRegistry } from "@/app/services/payments/registry";
import { USDTBEP20Verifier } from "@/app/services/payments/providers";

const WINDOW_MS = 60000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_REQUESTS;
}

function signConfirmation(secret: string, orderId: string, txHash: string, amount: number): string {
  return createHmac("sha256", secret).update([orderId, txHash.toLowerCase(), amount].join("|")).digest("hex");
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, reason: "RATE_LIMITED", retryable: true }, { status: 429 });
  }

  try {
    const body = (await req.json()) as {
      orderId?: unknown;
      txHash?: unknown;
      expectedAmount?: unknown;
      quote?: unknown;
    };
    if (typeof body.orderId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(body.orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    if (typeof body.txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(body.txHash)) {
      return NextResponse.json({ ok: false, reason: "INVALID_TX_HASH" }, { status: 400 });
    }
    const quote = body.quote as PaymentQuote | null;
    if (!quote || typeof quote !== "object") {
      return NextResponse.json({ ok: false, reason: "QUOTE_REQUIRED" }, { status: 400 });
    }

    const config = getPaymentsConfig();
    const registry = loadRegistry(config.registryPath);
    const txKey = body.txHash.toLowerCase();

    // 1. Quote: firma, expiración, orden y uso único.
    if (!verifyQuoteSignature(quote, config.quoteSecret)) {
      logRegistryEvent(config.registryPath, "verify_rejected", `quote inválida order=${body.orderId}`);
      return NextResponse.json({ ok: false, reason: "INVALID_QUOTE", retryable: false });
    }
    if (isQuoteExpired(quote)) {
      return NextResponse.json({ ok: false, reason: "QUOTE_EXPIRED", retryable: false });
    }
    if (quote.orderId !== body.orderId) {
      return NextResponse.json({ ok: false, reason: "QUOTE_ORDER_MISMATCH", retryable: false });
    }
    if (typeof body.expectedAmount === "number" && body.expectedAmount !== quote.amount) {
      return NextResponse.json({ ok: false, reason: "AMOUNT_MISMATCH", retryable: false });
    }
    if (registry.usedQuotes[quote.qid]) {
      return NextResponse.json({ ok: false, reason: "QUOTE_ALREADY_USED", retryable: false });
    }

    // 2. TX ya utilizada (una transacción no paga dos órdenes).
    if (registry.usedTx[txKey]) {
      logRegistryEvent(config.registryPath, "verify_rejected", `tx reutilizada ${txKey} order=${body.orderId}`);
      return NextResponse.json({ ok: false, reason: "TX_ALREADY_USED", retryable: false });
    }

    // 3. Verificación on-chain REAL. Monto y tesorería: de la quote firmada.
    const verifier = new USDTBEP20Verifier(createRpcFetch(config.rpcUrl), {
      usdtContract: config.usdtContract,
      treasury: config.treasury,
      requiredWei: parseUnits(quote.amount, 18),
      minConfirmations: config.minConfirmations,
    });
    const result = await verifier.verify({ orderId: body.orderId, txHash: body.txHash, expectedAmount: quote.amount });

    if (!result.ok || !result.receipt) {
      logRegistryEvent(
        config.registryPath,
        "verify_failed",
        `order=${body.orderId} reason=${result.reason} tx=${txKey}`
      );
      return NextResponse.json({ ok: false, reason: result.reason ?? "UNKNOWN", retryable: result.retryable ?? false });
    }

    // 4. Idempotencia: marcar quote y tx como usadas ANTES de responder.
    const fresh = loadRegistry(config.registryPath);
    if (fresh.usedTx[txKey] || fresh.usedQuotes[quote.qid]) {
      return NextResponse.json({ ok: false, reason: "TX_ALREADY_USED", retryable: false });
    }
    fresh.usedTx[txKey] = { orderId: body.orderId, usedAt: new Date().toISOString() };
    fresh.usedQuotes[quote.qid] = { orderId: body.orderId, usedAt: new Date().toISOString() };
    saveRegistry(config.registryPath, fresh);
    logRegistryEvent(
      config.registryPath,
      "payment_confirmed",
      `order=${body.orderId} tx=${txKey} amount=${result.receipt.amount}`
    );

    return NextResponse.json({
      ok: true,
      receipt: result.receipt,
      confirmation: {
        orderId: body.orderId,
        txHash: txKey,
        amount: result.receipt.amount,
        signature: signConfirmation(config.quoteSecret, body.orderId, txKey, result.receipt.amount),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR", retryable: true }, { status: 500 });
  }
}
