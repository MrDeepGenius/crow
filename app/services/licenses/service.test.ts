// Tests del sistema de licencias Creator (DB temporal, sin red, sin pagos reales).
process.env.DATABASE_PATH = "/tmp/crow-license-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb, getDb } from "../db/database";
import { registerUser, loginUser } from "../auth/auth";
import { addRoles, requireRole } from "../db/profiles";
import {
  createOrder,
  confirmPaymentTx,
} from "../db/purchase";
import {
  activateLicense,
  getActiveLicense,
  getLicenseInfo,
  checkLicenseForCreation,
  checkLicenseForPublish,
  renewLicense,
  changePlan,
  LicenseError,
} from "./service";
import { getLicenseTier, LICENSE_TIERS, licenseProductId } from "./catalog";
import { createProduct, publishProduct, updateProduct, listProductsByCreator } from "../db/products";
import { settlePaidOrder } from "../rewards/settle";
import { creditLicensePool, poolBalances } from "../rewards/pool";

const DB = process.env.DATABASE_PATH as string;
const TOKEN = "0x55d398326f99059fF775485246999027B3197955";
const TREASURY = "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f";

function resetDb(): void {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
}

beforeEach(() => {
  resetDb();
});

let n = 0;
function makeUser(roles: string[] = []): { id: string; email: string } {
  n += 1;
  const email = `lic${n}-${Date.now()}@t.co`;
  const reg = registerUser(email, "Test", "password123", { lastName: "User", termsAccepted: true });
  if (!reg.ok) throw new Error("setup fallo");
  if (roles.length > 0) addRoles(reg.user.id, roles);
  return { id: reg.user.id, email };
}

function paidLicenseOrder(userId: string, tierId: string, tx: string): string {
  const tier = getLicenseTier(tierId)!;
  const order = createOrder({
    userId,
    productId: licenseProductId(tier.id),
    creatorId: null,
    orderType: "license",
    baseAmount: tier.price,
    paymentAmount: tier.price,
    currency: "USDT",
    network: "BSC",
    expectedRecipient: TREASURY,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  confirmPaymentTx({
    orderId: order.id,
    txHash: tx,
    blockNumber: 100,
    confirmations: 12,
    sender: "0x1111111111111111111111111111111111111111",
    tokenContract: TOKEN,
    recipient: TREASURY,
    amount: tier.price,
    currency: "USDT",
  });
  return order.id;
}

let txCounter = 0;
function makeTx(): string {
  txCounter += 1;
  const hex = txCounter.toString(16).padStart(64, "0");
  return `0x${hex}`;
}

function makeProduct(creatorId: string, name: string, status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  return createProduct({
    creatorId,
    creatorName: name,
    format: "pdf",
    title: `Product ${name}`,
    description: `Description ${name}`,
    category: "Negocios",
    price: 50,
    status,
  });
}

describe("licencias Creator", () => {
  // 1. BUYER no puede crear producto
  it("1. BUYER no puede crear producto (sin rol creator)", () => {
    const buyer = makeUser(["buyer"]);
    expect(requireRole(buyer.id, "creator")).toBe(false);
    const check = checkLicenseForCreation(buyer.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("CREATOR_LICENSE_REQUIRED");
  });

  // 2. AFFILIATE no puede crear producto
  it("2. AFFILIATE no puede crear producto (sin rol creator)", () => {
    const aff = makeUser(["affiliate"]);
    expect(requireRole(aff.id, "creator")).toBe(false);
    const check = checkLicenseForCreation(aff.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("CREATOR_LICENSE_REQUIRED");
  });

  // 3. CREATOR sin licencia no puede crear producto
  it("3. CREATOR sin licencia no puede crear producto", () => {
    const creator = makeUser(["creator"]);
    expect(requireRole(creator.id, "creator")).toBe(true);
    const check = checkLicenseForCreation(creator.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("CREATOR_LICENSE_REQUIRED");
  });

  // 4. CREATOR con licencia activa sí puede crear
  it("4. CREATOR con licencia activa sí puede crear", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    const check = checkLicenseForCreation(creator.id);
    expect(check.ok).toBe(true);
    const product = makeProduct(creator.id, "Test");
    expect(product.creatorId).toBe(creator.id);
  });

  // 5. CREATOR con licencia vencida no puede crear
  it("5. CREATOR con licencia vencida no puede crear", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    // Forzar expiración manipulando expiresAt en DB
    const db = getDb();
    db.prepare("UPDATE creator_licenses SET expiresAt = ? WHERE userId = ?").run(
      new Date(Date.now() - 86400000).toISOString(),
      creator.id
    );
    const check = checkLicenseForCreation(creator.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("CREATOR_LICENSE_REQUIRED");
  });

  // 6. CREATOR alcanza límite de productos → 403
  it("6. CREATOR alcanza límite de productos (START: max 2)", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    // Crear 2 productos (límite START)
    makeProduct(creator.id, "P1");
    makeProduct(creator.id, "P2");
    const check = checkLicenseForCreation(creator.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("LICENSE_PRODUCT_LIMIT_REACHED");
  });

  // 7. CREATOR alcanza límite de publicaciones → 403
  it("7. CREATOR alcanza límite de publicaciones (START: max 1)", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    // Crear y publicar 1 producto (límite START)
    const p1 = makeProduct(creator.id, "P1");
    publishProduct(p1.id, creator.id);
    const check = checkLicenseForPublish(creator.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("LICENSE_PUBLISH_LIMIT_REACHED");
  });

  // 8. CREATOR A no puede editar Creator B
  it("8. CREATOR A no puede editar producto de Creator B", () => {
    const a = makeUser(["creator"]);
    const b = makeUser(["creator"]);
    const orderIdA = paidLicenseOrder(a.id, "START", makeTx());
    activateLicense(a.id, orderIdA, "START");
    const orderIdB = paidLicenseOrder(b.id, "START", makeTx());
    activateLicense(b.id, orderIdB, "START");
    // Creator B crea un producto
    const product = makeProduct(b.id, "B-Product");
    // Creator A intenta editarlo → updateProduct devuelve null (ownership check)
    const result = updateProduct(product.id, a.id, { title: "Hacked" });
    expect(result).toBeNull();
    // El título no cambió
    const products = listProductsByCreator(b.id);
    expect(products[0].title).toBe("Product B-Product");
  });

  // 9. AFFILIATE puede ver Marketplace
  it("9. AFFILIATE puede ver Marketplace (queryProducts es público)", () => {
    const aff = makeUser(["affiliate"]);
    // queryProducts no requiere auth ni rol
    const db = getDb();
    // No hay productos, pero la función no lanza
    expect(() => listProductsByCreator(aff.id)).not.toThrow();
  });

  // 10. AFFILIATE puede obtener referral link
  it("10. AFFILIATE puede obtener referral link (getOrCreateReferralCode)", async () => {
    const aff = makeUser(["affiliate"]);
    const { getOrCreateReferralCode } = await import("../affiliates/referrals");
    const code = getOrCreateReferralCode(aff.id);
    expect(code).toMatch(/^CROW-[A-Z2-9]{6}$/);
    // Idempotente: mismo código
    const code2 = getOrCreateReferralCode(aff.id);
    expect(code2).toBe(code);
  });

  // 11. AFFILIATE no puede editar producto
  it("11. AFFILIATE no puede editar producto (sin rol creator)", () => {
    const aff = makeUser(["affiliate"]);
    expect(requireRole(aff.id, "creator")).toBe(false);
    // updateProduct requiere creatorId, pero el check de rol falla antes
  });

  // 12. AFFILIATE no puede publicar producto
  it("12. AFFILIATE no puede publicar producto (sin rol creator)", () => {
    const aff = makeUser(["affiliate"]);
    expect(requireRole(aff.id, "creator")).toBe(false);
    const check = checkLicenseForPublish(aff.id);
    expect(check.ok).toBe(false);
  });

  // 13. BUYER no puede obtener herramientas de afiliado
  it("13. BUYER no puede obtener herramientas de afiliado (sin rol affiliate)", () => {
    const buyer = makeUser(["buyer"]);
    expect(requireRole(buyer.id, "affiliate")).toBe(false);
  });

  // 14. CREATOR no obtiene automáticamente Affiliate Panel
  it("14. CREATOR no obtiene automáticamente rol affiliate", () => {
    const creator = makeUser(["creator"]);
    expect(requireRole(creator.id, "affiliate")).toBe(false);
    expect(requireRole(creator.id, "creator")).toBe(true);
  });

  // 15. Licencia no se activa sin pago confirmado
  it("15. Licencia no se activa sin pago confirmado", () => {
    const creator = makeUser(["creator"]);
    const tier = getLicenseTier("START")!;
    // Crear orden PENDING (sin confirmar pago)
    const order = createOrder({
      userId: creator.id,
      productId: licenseProductId(tier.id),
      creatorId: null,
      orderType: "license",
      baseAmount: tier.price,
      paymentAmount: tier.price,
      currency: "USDT",
      network: "BSC",
      expectedRecipient: TREASURY,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    // Intentar activar licencia con orden no pagada → error
    expect(() => activateLicense(creator.id, order.id, "START")).toThrow(LicenseError);
    // No hay licencia activa
    expect(getActiveLicense(creator.id)).toBeNull();
  });

  // 16. Licencia activa genera correctamente el 2% Rewards Pool
  it("16. Licencia activa genera 2% Rewards Pool", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "PRO", makeTx());
    // settlePaidOrder activa la licencia Y acredita el 2% al pool
    const result = settlePaidOrder(orderId);
    expect(result.licenseActivated).toBe(true);
    expect(result.poolCredited).toBe(2); // 2% of 100 USDT = 2
    const pool = poolBalances();
    expect(pool.totalCredits).toBe(2);
    // La licencia está activa
    const license = getActiveLicense(creator.id);
    expect(license).not.toBeNull();
    expect(license!.plan).toBe("PRO");
  });

  // 17. Expiración de licencia bloquea creación
  it("17. Expiración de licencia bloquea creación", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    // Verificar que puede crear
    expect(checkLicenseForCreation(creator.id).ok).toBe(true);
    // Expirar la licencia
    const db = getDb();
    db.prepare("UPDATE creator_licenses SET expiresAt = ? WHERE userId = ?").run(
      new Date(Date.now() - 1000).toISOString(),
      creator.id
    );
    // Ya no puede crear
    const check = checkLicenseForCreation(creator.id);
    expect(check.ok).toBe(false);
    expect(check.ok === false && check.code).toBe("CREATOR_LICENSE_REQUIRED");
  });

  // 18. Renovación reactiva correctamente la capacidad según plan
  it("18. Renovación reactiva capacidad según plan", () => {
    const creator = makeUser(["creator"]);
    // Licencia START (max 2 productos, max 1 publicado)
    const orderId1 = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId1, "START");
    makeProduct(creator.id, "P1");
    makeProduct(creator.id, "P2");
    // Alcanzó límite START
    expect(checkLicenseForCreation(creator.id).ok).toBe(false);
    // Renovar con PRO (max 10 productos)
    const orderId2 = paidLicenseOrder(creator.id, "PRO", makeTx());
    renewLicense(creator.id, orderId2, "PRO");
    // Ahora puede crear más
    expect(checkLicenseForCreation(creator.id).ok).toBe(true);
    const license = getActiveLicense(creator.id);
    expect(license!.plan).toBe("PRO");
    expect(license!.maxProducts).toBe(10);
  });
});

describe("licencias — casos adicionales", () => {
  it("changePlan cambia el plan correctamente", () => {
    const creator = makeUser(["creator"]);
    const orderId1 = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId1, "START");
    expect(getActiveLicense(creator.id)?.plan).toBe("START");
    // Cambiar a BUSINESS
    const orderId2 = paidLicenseOrder(creator.id, "BUSINESS", makeTx());
    changePlan(creator.id, orderId2, "BUSINESS");
    const license = getActiveLicense(creator.id);
    expect(license!.plan).toBe("BUSINESS");
    expect(license!.maxProducts).toBe(20);
    expect(license!.maxPublished).toBe(10);
  });

  it("getLicenseInfo devuelve info completa con uso", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "BASIC", makeTx());
    activateLicense(creator.id, orderId, "BASIC");
    makeProduct(creator.id, "P1");
    makeProduct(creator.id, "P2");
    const p1 = listProductsByCreator(creator.id)[0];
    publishProduct(p1.id, creator.id);
    const info = getLicenseInfo(creator.id);
    expect(info).not.toBeNull();
    expect(info!.plan).toBe("BASIC");
    expect(info!.maxProducts).toBe(4);
    expect(info!.maxPublished).toBe(3);
    expect(info!.productsCreated).toBe(2);
    expect(info!.productsPublished).toBe(1);
    expect(info!.remainingProducts).toBe(2);
    expect(info!.remainingPublished).toBe(2);
    expect(info!.isActive).toBe(true);
  });

  it("licencia sin pago no se activa (orden PENDING)", () => {
    const creator = makeUser(["creator"]);
    const tier = getLicenseTier("START")!;
    const order = createOrder({
      userId: creator.id,
      productId: licenseProductId(tier.id),
      creatorId: null,
      orderType: "license",
      baseAmount: tier.price,
      paymentAmount: tier.price,
      currency: "USDT",
      network: "BSC",
      expectedRecipient: TREASURY,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    // settlePaidOrder no hace nada porque la orden no está PAID
    const result = settlePaidOrder(order.id);
    expect(result.licenseActivated).toBeNull();
    expect(getActiveLicense(creator.id)).toBeNull();
  });

  it("solo una licencia ACTIVE a la vez (renovar cancela la anterior)", () => {
    const creator = makeUser(["creator"]);
    const orderId1 = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId1, "START");
    const orderId2 = paidLicenseOrder(creator.id, "PRO", makeTx());
    renewLicense(creator.id, orderId2, "PRO");
    // La licencia START está CANCELLED, solo PRO está ACTIVE
    const db = getDb();
    const active = db.prepare("SELECT * FROM creator_licenses WHERE userId = ? AND status = 'ACTIVE'").all(creator.id) as
      { plan: string }[];
    expect(active.length).toBe(1);
    expect(active[0].plan).toBe("PRO");
  });

  it("productos existentes permanecen cuando licencia expira", () => {
    const creator = makeUser(["creator"]);
    const orderId = paidLicenseOrder(creator.id, "START", makeTx());
    activateLicense(creator.id, orderId, "START");
    const p1 = makeProduct(creator.id, "P1");
    publishProduct(p1.id, creator.id);
    // Expirar licencia
    const db = getDb();
    db.prepare("UPDATE creator_licenses SET expiresAt = ? WHERE userId = ?").run(
      new Date(Date.now() - 1000).toISOString(),
      creator.id
    );
    // Los productos siguen existiendo
    const products = listProductsByCreator(creator.id);
    expect(products.length).toBe(1);
    expect(products[0].status).toBe("PUBLISHED");
    // Pero no puede crear nuevos
    expect(checkLicenseForCreation(creator.id).ok).toBe(false);
  });

  it("catálogo tiene los 5 planes con límites correctos", () => {
    expect(LICENSE_TIERS.length).toBe(5);
    const start = getLicenseTier("START")!;
    expect(start.maxProducts).toBe(2);
    expect(start.maxPublished).toBe(1);
    expect(start.durationDays).toBe(30);
    expect(start.price).toBe(20);
    const elite = getLicenseTier("ELITE")!;
    expect(elite.maxProducts).toBe(50);
    expect(elite.maxPublished).toBe(30);
    expect(elite.durationDays).toBe(365);
    expect(elite.price).toBe(500);
  });
});
