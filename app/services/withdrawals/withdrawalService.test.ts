// Tests del sistema de retiros manuales USDT BEP20.
process.env.DATABASE_PATH = "/tmp/crow-withdrawal-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb, getDb } from "../db/database";
import { registerUser } from "../auth/auth";
import { addRoles } from "../db/profiles";
import {
  MIN_WITHDRAWAL,
  FIRST_WITHDRAWAL_FEE,
  SUBSEQUENT_WITHDRAWAL_FEE,
  requestWithdrawal,
  getBalance,
  calculateFee,
  isFirstInPeriod,
  processWithdrawal,
  confirmWithdrawal,
  rejectWithdrawal,
  failWithdrawal,
  listWithdrawals,
  getWithdrawal,
  getWithdrawalAudit,
} from "./withdrawalService";

const DB = process.env.DATABASE_PATH as string;

function resetDb(): void {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch { /* sigue */ }
}

beforeEach(() => {
  resetDb();
});

function makeUser(email?: string) {
  const e = email ?? `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.co`;
  const reg = registerUser(e, "Test", "password123", { lastName: "User", termsAccepted: true });
  if (!reg.ok) throw new Error("setup falló");
  return reg.user;
}

function makeAffiliate() {
  const user = makeUser();
  addRoles(user.id, ["affiliate"]);
  return user;
}

/** Simula comisiones APPROVED en el ledger para que el usuario tenga saldo. */
function seedBalance(userId: string, amount: number) {
  const db = getDb();
  const now = new Date().toISOString();
  const orderId = `seed-order-${userId}-${Date.now()}`;
  // Crear orden dummy (FK requirement)
  db.prepare(
    `INSERT INTO orders (id, userId, productId, baseAmount, paymentAmount, currency, network, expectedRecipient, status, createdAt, expiresAt, updatedAt, isDev)
     VALUES (?, ?, 'seed-product', ?, ?, 'USDT', 'BSC', '0x0', 'PAID', ?, ?, ?, 0)`
  ).run(orderId, userId, amount, amount, now, now, now);
  db.prepare(
    `INSERT INTO commission_ledger (id, orderId, account, affiliateUserId, recipientRef, level, percentage, amount, currency, status, note, createdAt)
     VALUES (?, ?, 'AFFILIATE_DIRECT', ?, ?, 0, 30, ?, 'USDT', 'APPROVED', '', ?)`
  ).run(`led-seed-${userId}-${Date.now()}`, orderId, userId, userId, amount, now);
}

const VALID_WALLET = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

// ============================================
// TESTS
// ============================================

describe("Withdrawal System", () => {

  // --- Retiro menor a 25 USDT ---
  describe("Mínimo de retiro", () => {
    it("rechaza retiro menor a 25 USDT", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const result = requestWithdrawal({
        userId: user.id,
        amount: 10,
        walletAddress: VALID_WALLET,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("BELOW_MINIMUM");
    });

    it("acepta retiro exactamente de 25 USDT", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const result = requestWithdrawal({
        userId: user.id,
        amount: MIN_WITHDRAWAL,
        walletAddress: VALID_WALLET,
      });

      expect(result.ok).toBe(true);
    });
  });

  // --- Comisión 2% ---
  describe("Comisión primera extracción (2%)", () => {
    it("calcula 2% en la primera extracción del período", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const result = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.withdrawal.feePercent).toBe(FIRST_WITHDRAWAL_FEE);
        expect(result.withdrawal.fee).toBe(1); // 2% de 50 = 1
        expect(result.withdrawal.net).toBe(49); // 50 - 1 = 49
        expect(result.withdrawal.periodFirst).toBe(1);
      }
    });
  });

  // --- Comisión 3% ---
  describe("Comisión extracción adicional (3%)", () => {
    it("calcula 3% en extracciones adicionales dentro del mismo período", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 200);

      // Primera extracción
      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      expect(r1.ok).toBe(true);

      // Confirmar la primera para que cuente como completada
      if (r1.ok) {
        processWithdrawal(r1.withdrawal.id, "admin-1");
        confirmWithdrawal(r1.withdrawal.id, "0xabc123def456", "admin-1");
      }

      // Segunda extracción (debe ser 3%)
      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });

      expect(r2.ok).toBe(true);
      if (r2.ok) {
        expect(r2.withdrawal.feePercent).toBe(SUBSEQUENT_WITHDRAWAL_FEE);
        expect(r2.withdrawal.fee).toBe(1.5); // 3% de 50 = 1.5
        expect(r2.withdrawal.net).toBe(48.5); // 50 - 1.5 = 48.5
        expect(r2.withdrawal.periodFirst).toBe(0);
      }
    });
  });

  // --- Saldo insuficiente ---
  describe("Saldo insuficiente", () => {
    it("rechaza retiro cuando el saldo es insuficiente", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 30);

      const result = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("INSUFFICIENT_BALANCE");
    });
  });

  // --- Doble retiro ---
  describe("Doble retiro (reserva de saldo)", () => {
    it("no permite retirar el mismo saldo dos veces", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      // Primer retiro de 60
      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 60,
        walletAddress: VALID_WALLET,
      });
      expect(r1.ok).toBe(true);

      // Segundo retiro de 60 (solo quedan 40 disponibles)
      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 60,
        walletAddress: VALID_WALLET,
      });

      expect(r2.ok).toBe(false);
      if (!r2.ok) expect(r2.error).toBe("INSUFFICIENT_BALANCE");
    });

    it("permite segundo retiro con el saldo restante", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 60,
        walletAddress: VALID_WALLET,
      });
      expect(r1.ok).toBe(true);

      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 40,
        walletAddress: VALID_WALLET,
      });
      expect(r2.ok).toBe(true);
    });
  });

  // --- Idempotencia ---
  describe("Idempotencia", () => {
    it("devuelve el mismo retiro con la misma idempotency key", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);
      const key = "idem-key-123";

      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
        idempotencyKey: key,
      });
      expect(r1.ok).toBe(true);

      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
        idempotencyKey: key,
      });
      expect(r2.ok).toBe(true);
      if (r1.ok && r2.ok) expect(r2.withdrawal.id).toBe(r1.withdrawal.id);
    });

    it("crea retiros diferentes con keys diferentes", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 200);

      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
        idempotencyKey: "key-A",
      });
      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
        idempotencyKey: "key-B",
      });

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (r1.ok && r2.ok) expect(r2.withdrawal.id).not.toBe(r1.withdrawal.id);
    });
  });

  // --- Retiro rechazado ---
  describe("Retiro rechazado", () => {
    it("rechaza un retiro PENDING y libera el saldo", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      const reject = rejectWithdrawal(r.withdrawal.id, "Solicitud inválida", "admin-1");
      expect(reject.ok).toBe(true);

      const wd = getWithdrawal(r.withdrawal.id);
      expect(wd?.status).toBe("REJECTED");

      // El saldo debe estar disponible de nuevo
      const balance = getBalance(user.id);
      expect(balance.netAvailable).toBe(100);
    });

    it("rechaza un retiro PROCESSING", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      const reject = rejectWithdrawal(r.withdrawal.id, "TX fallida", "admin-1");
      expect(reject.ok).toBe(true);
    });

    it("retiro rechazado no consume el beneficio de primera extracción", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 200);

      // Primer retiro que será rechazado
      const r1 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (r1.ok) rejectWithdrawal(r1.withdrawal.id, "Error", "admin-1");

      // Segundo retiro: debe seguir siendo primera extracción (2%)
      const r2 = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      expect(r2.ok).toBe(true);
      if (r2.ok) expect(r2.withdrawal.feePercent).toBe(FIRST_WITHDRAWAL_FEE);
    });
  });

  // --- Retiro sin TX Hash ---
  describe("Confirmación sin TX Hash", () => {
    it("no permite confirmar sin TX Hash", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      const confirm = confirmWithdrawal(r.withdrawal.id, "", "admin-1");
      expect(confirm.ok).toBe(false);
    });
  });

  // --- Confirmación con TX Hash ---
  describe("Confirmación con TX Hash", () => {
    it("confirma un retiro PROCESSING con TX Hash válido", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      const confirm = confirmWithdrawal(r.withdrawal.id, "0xabc123def456789", "admin-1");
      expect(confirm.ok).toBe(true);

      const wd = getWithdrawal(r.withdrawal.id);
      expect(wd?.status).toBe("CONFIRMED");
      expect(wd?.txHash).toBe("0xabc123def456789");
      expect(wd?.confirmedAt).not.toBeNull();
    });

    it("no permite confirmar un retiro que no está PROCESSING", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      // Intentar confirmar sin procesar primero
      const confirm = confirmWithdrawal(r.withdrawal.id, "0xabc123", "admin-1");
      expect(confirm.ok).toBe(false);
    });
  });

  // --- Saldo disponible / reservado ---
  describe("Saldo disponible y reservado", () => {
    it("reserva el saldo al crear un retiro PENDING", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const balanceBefore = getBalance(user.id);
      expect(balanceBefore.available).toBe(100);
      expect(balanceBefore.reserved).toBe(0);
      expect(balanceBefore.netAvailable).toBe(100);

      requestWithdrawal({
        userId: user.id,
        amount: 40,
        walletAddress: VALID_WALLET,
      });

      const balanceAfter = getBalance(user.id);
      expect(balanceAfter.available).toBe(100);
      expect(balanceAfter.reserved).toBe(40);
      expect(balanceAfter.netAvailable).toBe(60);
    });

    it("libera el saldo al rechazar un retiro", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 40,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      rejectWithdrawal(r.withdrawal.id, "test", "admin-1");

      const balance = getBalance(user.id);
      expect(balance.reserved).toBe(0);
      expect(balance.netAvailable).toBe(100);
    });

    it("reduce el disponible al confirmar un retiro", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      confirmWithdrawal(r.withdrawal.id, "0xabc123def456789", "admin-1");

      const balance = getBalance(user.id);
      // 100 - 50 = 50 disponible (el ledger entry marcado como PAID)
      expect(balance.available).toBe(50);
      expect(balance.reserved).toBe(0);
      expect(balance.netAvailable).toBe(50);
    });
  });

  // --- Auditoría ---
  describe("Auditoría", () => {
    it("registra cada cambio de estado", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      confirmWithdrawal(r.withdrawal.id, "0xabc123def456789", "admin-1");

      const audit = getWithdrawalAudit(r.withdrawal.id);
      expect(audit.length).toBe(3); // REQUESTED + PROCESSING + CONFIRMED
      expect(audit[0].event).toBe("WITHDRAWAL_REQUESTED");
      expect(audit[1].event).toBe("WITHDRAWAL_PROCESSING");
      expect(audit[2].event).toBe("WITHDRAWAL_CONFIRMED");
    });
  });

  // --- Estados inválidos ---
  describe("Transiciones de estado inválidas", () => {
    it("no permite procesar un retiro ya confirmado", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      confirmWithdrawal(r.withdrawal.id, "0xabc123def456789", "admin-1");

      // Intentar procesar de nuevo
      const p2 = processWithdrawal(r.withdrawal.id, "admin-1");
      expect(p2.ok).toBe(false);
    });

    it("no permite rechazar un retiro ya confirmado", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: VALID_WALLET,
      });
      if (!r.ok) return;

      processWithdrawal(r.withdrawal.id, "admin-1");
      confirmWithdrawal(r.withdrawal.id, "0xabc123def456789", "admin-1");

      const reject = rejectWithdrawal(r.withdrawal.id, "test", "admin-1");
      expect(reject.ok).toBe(false);
    });
  });

  // --- Wallet inválida ---
  describe("Wallet inválida", () => {
    it("rechaza wallet vacía o muy corta", () => {
      const user = makeAffiliate();
      seedBalance(user.id, 100);

      const r = requestWithdrawal({
        userId: user.id,
        amount: 50,
        walletAddress: "0x123",
      });

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("INVALID_WALLET");
    });
  });
});
