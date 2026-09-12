// POST /api/payments/verify — verificación REAL on-chain (server)
// Requiere sesión: userId sale de la cookie, el monto de la DB (el body se
// ignora para auth y precio). Al confirmar: transacción ATÓMICA en DB
// (Payment+Order PAID, tx reclamada, Entitlement) + claim anti-replay legacy.
// Crow NO custodia private keys: solo lectura JSON-RPC.
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { createRpcFetch, parseUnits } from "@/app/services/payments/chain";
import { isQuoteExpired, verifyQuoteSignature, type PaymentQuote } from "@/app/services/payments/quotes";
import { checkReplay, claimTxAndQuote, classifyFailure } from "@/app/services/payments/bscPaymentService";
import { logRegistryEvent } from "@/app/services/payments/registry";
import { USDTBEP20Verifier } from "@/app/services/payments/providers";
import {
  PaymentError,
  confirmPaymentTx,
  ensurePaymentPending,
  getOrderForUser,
  getPaymentByOrder,
  setOrderStatus,
} from "@/app/services/db/purchase";
import { setMirrorStatus } from "@/app/services/payments/orderMirror";
import { settlePaidOrder } from "@/app/services/rewards/settle";

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

function signConfirmation(
  secret: string,
  orderId: string,
  userId: string,
  txHash: string,
  amount: number
): string {
  return createHmac("sha256", secret)
    .update([orderId, userId, txHash.toLowerCase(), amount].join("|"))
    .digest("hex");
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, reason: "RATE_LIMITED", retryable: true }, { status: 429 });
  }

  try {
    const user = getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    }
    const body = (await req.json()) as {
      orderId?: unknown;
      txHash?: unknown;
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

    // Orden de LA DB y del usuario (anti-IDOR). El monto es el de la DB.
    const order = getOrderForUser(body.orderId, user.id);
    if (!order) {
      return NextResponse.json({ ok: false, reason: "FORBIDDEN" }, { status: 403 });
    }
    if (order.status === "PAID") {
      const payment = getPaymentByOrder(order.id);
      if (payment?.txHash) {
        const config = getPaymentsConfig();
        return NextResponse.json({
          ok: true,
          idempotent: true,
          receipt: {
            hash: payment.txHash,
            amount: payment.amount,
            blockNumber: payment.blockNumber,
            confirmations: payment.confirmations,
          },
          confirmation: {
            orderId: order.id,
            userId: user.id,
            txHash: payment.txHash,
            amount: payment.amount,
            blockNumber: payment.blockNumber,
            signature: signConfirmation(config.quoteSecret, order.id, user.id, payment.txHash, payment.amount),
          },
        });
      }
    }
    if (order.status !== "PENDING" && order.status !== "VERIFYING") {
      return NextResponse.json({ ok: false, reason: "ORDER_NOT_ACTIVE", retryable: false });
    }

    const config = getPaymentsConfig();
    const txKey = body.txHash.toLowerCase();

    // 1. Quote: firma, expiración y correspondencia con la orden de la DB.
    if (!verifyQuoteSignature(quote, config.quoteSecret)) {
      logRegistryEvent(config.registryPath, "verify_rejected", `quote inválida order=${order.id} user=${user.id}`);
      return NextResponse.json({ ok: false, reason: "INVALID_QUOTE", retryable: false });
    }
    if (isQuoteExpired(quote)) {
      return NextResponse.json({ ok: false, reason: "QUOTE_EXPIRED", retryable: false, expired: true });
    }
    if (quote.orderId !== order.id) {
      return NextResponse.json({ ok: false, reason: "QUOTE_ORDER_MISMATCH", retryable: false });
    }
    if (quote.amount !== order.paymentAmount) {
      return NextResponse.json({ ok: false, reason: "AMOUNT_MISMATCH", retryable: false });
    }
    const replay = checkReplay(config.registryPath, txKey, quote.qid);
    if (replay.quoteAlreadyUsed) {
      return NextResponse.json({ ok: false, reason: "QUOTE_ALREADY_USED", retryable: false });
    }
    if (replay.txAlreadyUsed) {
      logRegistryEvent(config.registryPath, "verify_rejected", `tx reutilizada ${txKey} order=${order.id}`);
      return NextResponse.json({ ok: false, reason: "TX_ALREADY_USED", retryable: false });
    }

    // 2. Verificación on-chain REAL con valores oficiales + monto de la DB.
    setOrderStatus(order.id, "VERIFYING");
    const verifier = new USDTBEP20Verifier(createRpcFetch(config.rpcUrl), {
      usdtContract: config.usdtContract,
      treasury: config.treasury,
      requiredWei: parseUnits(order.paymentAmount, 18),
      minConfirmations: config.minConfirmations,
    });
    const result = await verifier.verify({ orderId: order.id, txHash: body.txHash, expectedAmount: order.paymentAmount });

    if (!result.ok || !result.receipt) {
      const reason = result.reason ?? "UNKNOWN";
      const kind = classifyFailure(reason);
      logRegistryEvent(
        config.registryPath,
        kind === "REVIEW_REQUIRED" ? "verify_review" : "verify_failed",
        `order=${order.id} user=${user.id} reason=${reason} tx=${txKey}`
      );
      if (kind === "REVIEW_REQUIRED") {
        setOrderStatus(order.id, "REVIEW_REQUIRED");
        try {
          setMirrorStatus(config.ordersPath, order.id, "REVIEW_REQUIRED", { txHash: txKey });
        } catch {
          // espejo best-effort
        }
        return NextResponse.json({
          ok: false,
          reason,
          retryable: false,
          reviewRequired: true,
          detail: "La transacción existe pero no coincide con la orden. Quedó marcada para revisión manual excepcional.",
        });
      }
      return NextResponse.json({ ok: false, reason, retryable: result.retryable ?? false });
    }

    // 3. Claim anti-replay legacy + confirmación ATÓMICA en DB.
    const claimed = claimTxAndQuote(config.registryPath, txKey, quote.qid, order.id);
    if (!claimed) {
      return NextResponse.json({ ok: false, reason: "TX_ALREADY_USED", retryable: false });
    }
    ensurePaymentPending(order);
    try {
      confirmPaymentTx({
        orderId: order.id,
        txHash: result.receipt.hash,
        blockNumber: result.receipt.blockNumber,
        confirmations: result.receipt.confirmations,
        sender: result.receipt.from,
        tokenContract: config.usdtContract,
        recipient: config.treasury,
        amount: result.receipt.amount,
        currency: order.currency,
      });
    } catch (err) {
      if (err instanceof PaymentError && err.code === "TX_ALREADY_USED") {
        return NextResponse.json({ ok: false, reason: "TX_ALREADY_USED", retryable: false });
      }
      logRegistryEvent(config.registryPath, "verify_failed", `confirm DB falló order=${order.id}`);
      return NextResponse.json({ ok: false, reason: "SERVER_ERROR", retryable: true }, { status: 500 });
    }
    try {
      setMirrorStatus(config.ordersPath, order.id, "PAID", {
        txHash: result.receipt.hash,
        blockNumber: result.receipt.blockNumber,
      });
    } catch {
      // espejo best-effort
    }
    // Rewards/volumen post-pago (best-effort: jamás rompe un pago confirmado).
    try {
      settlePaidOrder(order.id);
    } catch {
      // se audita dentro del settle cuando es posible
    }

    return NextResponse.json({
      ok: true,
      receipt: result.receipt,
      confirmation: {
        orderId: order.id,
        userId: user.id,
        txHash: txKey,
        amount: result.receipt.amount,
        blockNumber: result.receipt.blockNumber,
        signature: signConfirmation(config.quoteSecret, order.id, user.id, txKey, result.receipt.amount),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR", retryable: true }, { status: 500 });
  }
}
