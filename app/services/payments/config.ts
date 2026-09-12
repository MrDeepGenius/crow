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
  minConfirmations: number;
  orderTtlMinutes: number;
  quoteSecret: string;
  registryPath: string;
  usingDevSecret: boolean;
}

function required(name: string, fallback: string): { value: string; isDefault: boolean } {
  const raw = process.env[name];
  if (raw && raw.trim().length > 0) return { value: raw.trim(), isDefault: false };
  return { value: fallback, isDefault: true };
}

export function getPaymentsConfig(): PaymentsConfig {
  const treasury = required(
    "CROW_TREASURY_BEP20",
    "0x5c77b34c16bae2ccb21695564c2fe68ec99f771f"
  );
  const rpcUrl = required("BSC_RPC_URL", "https://bsc-dataseed.binance.org/");
  // Contrato oficial Tether USDT en BSC (18 decimales). Verificar en BscScan
  // ante cualquier duda; override vía env si cambia.
  const usdtContract = required(
    "USDT_BSC_CONTRACT",
    "0x55d398326f99059fF775485246999027B3197955"
  );
  const secret = required("PAYMENT_QUOTE_SECRET", "dev-only-change-me");
  const registryPath = required("PAYMENTS_REGISTRY_PATH", "./data/payments.json");

  return {
    treasury: treasury.value.toLowerCase(),
    rpcUrl: rpcUrl.value,
    usdtContract: usdtContract.value.toLowerCase(),
    usdtDecimals: 18,
    chainId: 56,
    minConfirmations: Number(process.env.MIN_CONFIRMATIONS ?? 12),
    orderTtlMinutes: Number(process.env.ORDER_TTL_MINUTES ?? 30),
    quoteSecret: secret.value,
    registryPath: registryPath.value,
    usingDevSecret: secret.isDefault,
  };
}
