// ============================================
// QUOTES - cotizaciones firmadas anti-manipulación
// ============================================
// La quote liga orderId + monto + tesorería + expiración con HMAC.
// Single-use: una quote confirmada no puede reutilizarse.

import { createHmac, timingSafeEqual } from "node:crypto";

export interface PaymentQuote {
  qid: string;
  orderId: string;
  amount: number;
  currency: string;
  treasury: string;
  chainId: number;
  issuedAt: string;
  exp: string;
  sig: string;
}

function canonical(q: Omit<PaymentQuote, "sig">): string {
  return [q.qid, q.orderId, q.amount, q.currency, q.treasury, q.chainId, q.issuedAt, q.exp].join("|");
}

export function signQuote(q: Omit<PaymentQuote, "sig">, secret: string): string {
  return createHmac("sha256", secret).update(canonical(q)).digest("hex");
}

export function issueQuote(
  input: { orderId: string; amount: number; currency: string; treasury: string; chainId: number; ttlMinutes: number },
  secret: string,
  qid: string,
  now: number = Date.now()
): PaymentQuote {
  const base = {
    qid,
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    treasury: input.treasury.toLowerCase(),
    chainId: input.chainId,
    issuedAt: new Date(now).toISOString(),
    exp: new Date(now + input.ttlMinutes * 60000).toISOString(),
  };
  return { ...base, sig: signQuote(base, secret) };
}

export function verifyQuoteSignature(quote: PaymentQuote, secret: string): boolean {
  const { sig, ...rest } = quote;
  const expected = signQuote(rest, secret);
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isQuoteExpired(quote: PaymentQuote, now: number = Date.now()): boolean {
  return new Date(quote.exp).getTime() <= now;
}
