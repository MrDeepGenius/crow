// POST /api/admin/payments/migrate — importa JSON dev a DB (idempotente)
// Migrar datos críticos de data/*.json a SQLite sin borrar los archivos.
// Todo lo importado queda marcado isDev=1 (datos de desarrollo, nunca
// mezclar con producción). Solo PAID con evidencia server (registry.usedTx
// apunta a esa orden) importa pago+entitlement; el resto entra sin acceso.
// Requiere admin real. No toca el monitor.
import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { checkOrigin, isAdminRequest } from "@/app/services/auth/auth";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { getDb } from "@/app/services/db/database";

interface MirrorJson {
  orderId: string;
  buyerId: string;
  productId: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  txHash: string | null;
  blockNumber: number | null;
}

function readJsonFile<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const admin = isAdminRequest(req);
    if (!admin.ok) {
      return NextResponse.json(
        { ok: false, reason: admin.reason },
        { status: admin.reason === "FORBIDDEN" ? 403 : 401 }
      );
    }
    const config = getPaymentsConfig();
    const mirror = readJsonFile<{ orders: Record<string, MirrorJson> }>(config.ordersPath, { orders: {} });
    const registry = readJsonFile<{ usedTx: Record<string, { orderId: string }> }>(config.registryPath, { usedTx: {} });
    const db = getDb();
    const now = new Date().toISOString();
    let users = 0;
    let orders = 0;
    let payments = 0;
    let entitlements = 0;
    const skipped: string[] = [];

    for (const m of Object.values(mirror.orders ?? {})) {
      if (!validEmail(m.buyerId)) {
        skipped.push(`${m.orderId}: buyerId no es email, sin usuario al cual ligar`);
        continue;
      }
      const email = m.buyerId.trim().toLowerCase();
      let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: string } | undefined;
      if (!user) {
        const id = `usr-dev-${randomBytes(4).toString("hex")}`;
        db.prepare(
          "INSERT INTO users (id, email, name, passwordHash, isAdmin, isDev, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, 1, ?, ?)"
        ).run(id, email, email.split("@")[0] ?? "dev", `locked$${randomBytes(16).toString("hex")}`, now, now);
        user = { id };
        users += 1;
      }
      const existingOrder = db.prepare("SELECT id FROM orders WHERE id = ?").get(m.orderId) as { id: string } | undefined;
      if (!existingOrder) {
        const confirmedTx = Object.entries(registry.usedTx ?? {}).find(([, v]) => v.orderId === m.orderId);
        const status = confirmedTx ? "PAID" : m.status === "PAID" ? "REVIEW_REQUIRED" : m.status;
        db.prepare(
          `INSERT INTO orders (id, userId, productId, baseAmount, paymentAmount, currency, network,
           expectedRecipient, status, createdAt, expiresAt, paidAt, updatedAt, isDev)
           VALUES (?, ?, ?, ?, ?, ?, 'BSC', ?, ?, ?, ?, ?, ?, 1)`
        ).run(
          m.orderId, (user as { id: string }).id, m.productId, m.amount, m.amount,
          (m.currency || "USDT").toUpperCase(), config.treasury, status,
          m.createdAt, m.expiresAt, confirmedTx ? now : null, now
        );
        orders += 1;
        if (confirmedTx) {
          const [txHash] = confirmedTx;
          db.prepare(
            `INSERT OR IGNORE INTO payments (id, orderId, network, tokenContract, recipient, sender, amount,
             currency, txHash, blockNumber, confirmations, status, detectedAt, confirmedAt, createdAt, updatedAt, isDev)
             VALUES (?, ?, 'BSC', ?, ?, NULL, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, 1)`
          ).run(
            `pay-mig-${m.orderId}`, m.orderId, config.usdtContract, config.treasury, m.amount,
            (m.currency || "USDT").toUpperCase(), txHash.toLowerCase(), m.blockNumber,
            config.minConfirmations, now, now, now, now
          );
          payments += 1;
          db.prepare(
            `INSERT OR IGNORE INTO entitlements (id, userId, productId, orderId, status, grantedAt, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`
          ).run(`ent-mig-${m.orderId}`, (user as { id: string }).id, m.productId, m.orderId, now, now, now);
          entitlements += 1;
        }
      }
    }
    return NextResponse.json({ ok: true, users, orders, payments, entitlements, skipped });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
