// ============================================
// PAYMENTS CONFIG - variables de entorno
// ============================================
// NUNCA commitear secretos: usar .env.local (ver .env.example).
// Solo se lee en backend (route handlers / servicios server).

export interface PaymentsConfig {
  treasury: string;
  rpcUrl: string;
  usdtContract: string;
  usdtDecimals: number;
  chainId: number;
  network: string;
  minConfirmations: number;
  orderTtlMinutes: number;
  quoteSecret: string;
  registryPath: string;
  ordersPath: string;
  monitorStatePath: string;
  monitorIntervalMs: number;
  monitorMaxBlockRange: number;
  monitorAuto: boolean;
  adminKey: string | null;
  usingDevSecret: boolean;
}

function required(name: string, fallback: string): { value: string; isDefault: boolean } {
  const raw = process.env[name];
  if (raw && raw.trim().length > 0) return { value: raw.trim(), isDefault: false };
  return { value: fallback, isDefault: true };
}

export function getPaymentsConfig(): PaymentsConfig {
  // Alias oficial: CROW_PAYMENT_WALLET tiene prioridad, CROW_TREASURY_BEP20 por compat.
  const treasuryRaw = process.env.CROW_PAYMENT_WALLET?.trim() || process.env.CROW_TREASURY_BEP20?.trim() || "";
  const treasury = treasuryRaw.length > 0
    ? { value: treasuryRaw, isDefault: false }
    : required(
      "CROW_TREASURY_BEP20",
      "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f"
    );
  // RPC oficial BNB Smart Chain Mainnet (valor del usuario, sin inventar).
  const rpcUrl = required("BSC_RPC_URL", "https://bsc-dataseed.bnbchain.org/");
  // Contrato oficial Tether USDT en BSC (18 decimales). Verificar en BscScan
  // ante cualquier duda; override vía env si cambia.
  const usdtContract = required(
    "USDT_BSC_CONTRACT",
    "0x55d398326f99059fF775485246999027B3197955"
  );
  const secret = required("PAYMENT_QUOTE_SECRET", "dev-only-change-me");
  const registryPath = required("PAYMENTS_REGISTRY_PATH", "./data/payments.json");
  const ordersPath = required("ORDERS_REGISTRY_PATH", "./data/orders.json");
  const monitorStatePath = required("MONITOR_STATE_PATH", "./data/monitor.json");
  const adminRaw = process.env.CROW_ADMIN_KEY?.trim() || "";

  return {
    treasury: treasury.value.toLowerCase(),
    rpcUrl: rpcUrl.value,
    usdtContract: usdtContract.value.toLowerCase(),
    usdtDecimals: 18,
    chainId: 56,
    network: "BSC",
    minConfirmations: Number(process.env.MIN_CONFIRMATIONS ?? 12),
    orderTtlMinutes: Number(process.env.ORDER_TTL_MINUTES ?? 30),
    quoteSecret: secret.value,
    registryPath: registryPath.value,
    ordersPath: ordersPath.value,
    monitorStatePath: monitorStatePath.value,
    monitorIntervalMs: Number(process.env.MONITOR_INTERVAL_MS ?? 15000),
    monitorMaxBlockRange: Number(process.env.MONITOR_MAX_BLOCK_RANGE ?? 2000),
    monitorAuto: (process.env.MONITOR_AUTO ?? "on").trim().toLowerCase() !== "off",
    adminKey: adminRaw.length > 0 ? adminRaw : null,
    usingDevSecret: secret.isDefault,
  };
}
