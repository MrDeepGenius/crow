// ============================================
// SETTLE - hook tras pago confirmado (server-side, best-effort)
// ============================================
// Se llama DESPUÉS de confirmPaymentTx (verify route). Nunca rompe el pago:
// cualquier fallo se registra y se devuelve como pendiente, sin revertir.

import { getDb } from "../db/database";
import { addValidSaleVolume } from "./volume";
import { creditLicensePool } from "./pool";
import { promoteWaitingRewards } from "./rewards";
import { activateLicense } from "../licenses/service";
import { tierFromProductId } from "../licenses/catalog";

export interface SettleResult {
  volumeCp: number | null;
  poolCredited: number | null;
  unlockedLevels: number[];
  promotedWaiting: number;
  licenseActivated: boolean | null;
  errors: string[];
}

/** ¿Es orden de licencia? (productId `license:TIER` o orderType). */
export function isLicenseOrder(orderId: string): boolean {
  const row = getDb().prepare("SELECT productId, orderType FROM orders WHERE id = ?").get(orderId) as
    | { productId: string; orderType: string }
    | undefined;
  if (!row) return false;
  return row.orderType === "license" || row.productId.startsWith("license:");
}

export function settlePaidOrder(orderId: string): SettleResult {
  const db = getDb();
  const order = db.prepare("SELECT id, userId, status FROM orders WHERE id = ?").get(orderId) as
    | { id: string; userId: string; status: string }
    | undefined;
  const errors: string[] = [];
  if (!order || order.status !== "PAID") {
    return { volumeCp: null, poolCredited: null, unlockedLevels: [], promotedWaiting: 0, licenseActivated: null, errors: ["ORDER_NOT_PAID"] };
  }
  let volumeCp: number | null = null;
  let unlockedLevels: number[] = [];
  try {
    const res = addValidSaleVolume({ userId: order.userId, orderId: order.id });
    volumeCp = res.cp;
    unlockedLevels = res.unlockedLevels;
  } catch (err) {
    // 0 CP definitivo (fraude, autoconsumo, pendiente): no es error del pago.
    errors.push(err instanceof Error ? err.message : "VOLUME_SKIPPED");
  }
  let poolCredited: number | null = null;
  if (isLicenseOrder(order.id)) {
    try {
      const res = creditLicensePool({ userId: order.userId, licenseOrderId: order.id });
      poolCredited = res.credited;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "POOL_SKIPPED");
    }
  }
  let promotedWaiting = 0;
  try {
    promotedWaiting = promoteWaitingRewards();
  } catch {
    // best-effort
  }
  // Activar licencia Creator tras pago confirmado (server-side, sin bypass).
  let licenseActivated: boolean | null = null;
  if (isLicenseOrder(order.id)) {
    try {
      const productId = db.prepare("SELECT productId FROM orders WHERE id = ?").get(order.id) as
        | { productId: string }
        | undefined;
      const tier = productId ? tierFromProductId(productId.productId) : null;
      if (tier) {
        const res = activateLicense(order.userId, order.id, tier.id);
        licenseActivated = res.created;
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "LICENSE_ACTIVATION_SKIPPED");
    }
  }
  return { volumeCp, poolCredited, unlockedLevels, promotedWaiting, licenseActivated, errors };
}
