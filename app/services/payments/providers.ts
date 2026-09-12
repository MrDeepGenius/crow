// ============================================
// PAYMENT PROVIDERS - arquitectura desacoplada
// ============================================

import type { ChainExpectations, ChainVerification, RpcFetch } from "./chain";
import { verifyChainPayment } from "./chain";

export interface PaymentVerifyRequest {
  orderId: string;
  txHash: string;
  expectedAmount: number;
}

export interface PaymentVerifyResult {
  ok: boolean;
  reason?: string;
  retryable?: boolean;
  receipt?: {
    hash: string;
    from: string;
    to: string;
    amount: number;
    blockNumber: number;
    confirmations: number;
  };
}

export interface PaymentVerifier {
  readonly name: string;
  verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResult>;
}

export class USDTBEP20Verifier implements PaymentVerifier {
  readonly name = "usdt-bep20";

  constructor(
    private readonly rpc: RpcFetch,
    private readonly expectations: Omit<ChainExpectations, "requiredWei"> & { requiredWei: bigint }
  ) {}

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResult> {
    let result: ChainVerification;
    try {
      result = await verifyChainPayment(this.rpc, request.txHash, this.expectations);
    } catch {
      return { ok: false, reason: "RPC_ERROR", retryable: true };
    }
    if (!result.ok || !result.facts) {
      return { ok: false, reason: result.reason ?? "UNKNOWN", retryable: result.retryable ?? false };
    }
    const f = result.facts;
    return {
      ok: true,
      receipt: {
        hash: f.hash,
        from: f.from,
        to: f.recipient,
        amount: Number(f.valueWei) / 10 ** 18,
        blockNumber: f.blockNumber,
        confirmations: f.confirmations,
      },
    };
  }
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(orderId: string): Promise<{ provider: string; orderId: string }>;
}

export class USDTBEP20Provider implements PaymentProvider {
  readonly name = "usdt-bep20";
  async createCheckout(orderId: string): Promise<{ provider: string; orderId: string }> {
    // BEP20 es push: el checkout muestra dirección + QR, no redirige.
    return { provider: this.name, orderId };
  }
}

// Preparados para el futuro sin rehacer el checkout.
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercadopago";
  async createCheckout(): Promise<{ provider: string; orderId: string }> {
    throw new Error("MercadoPago no conectado");
  }
}

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  async createCheckout(): Promise<{ provider: string; orderId: string }> {
    throw new Error("Stripe no conectado");
  }
}
