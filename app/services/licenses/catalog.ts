// ============================================
// LICENCIAS - catálogo centralizado (precios fijos, sin inventar)
// ============================================
// Las licencias se compran con el mismo flujo USDT (quote/verify) mediante
// órdenes orderType='license' + productId 'license:TIER'. El precio final
// pagado (paymentAmount) manda; baseAmount conserva el original si hay promo.

export interface LicenseTier {
  id: string;
  name: string;
  price: number;
  currency: "USDT";
  perks: string[];
}

export const LICENSE_TIERS: LicenseTier[] = [
  { id: "START", name: "Start", price: 20, currency: "USDT", perks: ["Acceso comprador", "1 CP por USDT válido"] },
  { id: "BASIC", name: "Basic", price: 50, currency: "USDT", perks: ["Todo Start", "Soporte prioritario"] },
  { id: "PRO", name: "Pro", price: 100, currency: "USDT", perks: ["Todo Basic", "Herramientas pro"] },
  { id: "BUSINESS", name: "Business", price: 300, currency: "USDT", perks: ["Todo Pro", "Uso en equipo"] },
  { id: "ELITE", name: "Elite", price: 500, currency: "USDT", perks: ["Todo Business", "Acceso anticipado"] },
];

export function getLicenseTier(id: string): LicenseTier | null {
  const clean = id.trim().toUpperCase();
  return LICENSE_TIERS.find((t) => t.id === clean) ?? null;
}

export function licenseProductId(tierId: string): string {
  return `license:${tierId.trim().toUpperCase()}`;
}

export function isLicenseProductId(productId: string): boolean {
  const m = /^license:([A-Z]+)$/.exec(productId.trim());
  return m ? getLicenseTier(m[1] as string) !== null : false;
}

export function tierFromProductId(productId: string): LicenseTier | null {
  const m = /^license:([A-Z]+)$/.exec(productId.trim());
  return m ? getLicenseTier(m[1] as string) : null;
}
