// ============================================
// PAYMENTS - capa desacoplada
// ============================================
// NINGÚN proveedor real conectado. TestPaymentProvider es explícitamente
// DEMO (modo test segregado): sirve para probar el pipeline
// PENDING→PAID→entitlement→comisión→ledger sin fingir cargos reales.
// Conectar Stripe/MP/crypto = implementar esta interfaz en backend.

import type { Money, Order } from "./marketTypes";

export type PaymentStatus = "requires_action" | "succeeded" | "failed";

export interface PaymentIntent {
  id: string;
  orderId: string;
  amount: Money;
  provider: string;
  testMode: boolean;
  status: PaymentStatus;
  reference: string | null;
  createdAt: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly testMode: boolean;
  createIntent(order: Order): Promise<PaymentIntent>;
  confirmIntent(intentId: string): Promise<PaymentIntent>;
}

export function isPaymentsConnected(): boolean {
  return false;
}

export class TestPaymentProvider implements PaymentProvider {
  readonly name = "test";
  readonly testMode = true;
  private intents = new Map<string, PaymentIntent>();

  async createIntent(order: Order): Promise<PaymentIntent> {
    const intent: PaymentIntent = {
      id: `pi_test_${order.id}`,
      orderId: order.id,
      amount: order.amount,
      provider: this.name,
      testMode: true,
      status: "requires_action",
      reference: null,
      createdAt: new Date().toISOString(),
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  async confirmIntent(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) throw new Error("Intento de pago inexistente");
    intent.status = "succeeded";
    intent.reference = `test_charge_${Date.now().toString(36)}`;
    return intent;
  }
}

let demoEnabled = false;

export function isDemoPaymentsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("crow_payments_demo") === "on" && demoEnabled;
  } catch {
    return false;
  }
}

/** El modo demo se activa solo por acción explícita del usuario, por sesión. */
export function enableDemoPayments(): void {
  demoEnabled = true;
  try {
    window.localStorage.setItem("crow_payments_demo", "on");
  } catch {
    // no bloquea
  }
}
