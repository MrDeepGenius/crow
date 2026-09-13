// ============================================
// WITHDRAWAL PROVIDER INTERFACE
// ============================================
// Interfaz para que en el futuro se pueda automatizar el envío de USDT
// mediante API/blockchain. En este MVP se usa ManualWithdrawalProvider,
// donde el admin transfiere manualmente y carga el TX Hash.

export interface WithdrawalRequest {
  withdrawalId: string;
  userId: string;
  netAmount: number;
  currency: string;
  walletAddress: string;
}

export interface WithdrawalResult {
  txHash: string | null;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  message: string;
}

export interface WithdrawalProvider {
  /** Inicia el proceso de envío. En manual, no hace nada (espera al admin). */
  initiate(request: WithdrawalRequest): Promise<WithdrawalResult>;

  /** Verifica el estado del envío. En manual, siempre PENDING hasta confirmación admin. */
  checkStatus(withdrawalId: string): Promise<WithdrawalResult>;

  /** Nombre del provider para auditoría. */
  readonly name: string;
}

// ============================================
// MANUAL WITHDRAWAL PROVIDER (MVP)
// ============================================

export class ManualWithdrawalProvider implements WithdrawalProvider {
  readonly name = "manual";

  async initiate(_request: WithdrawalRequest): Promise<WithdrawalResult> {
    return {
      txHash: null,
      status: "PENDING",
      message: "Retiro creado. El admin debe transferir manualmente y cargar el TX Hash.",
    };
  }

  async checkStatus(_withdrawalId: string): Promise<WithdrawalResult> {
    return {
      txHash: null,
      status: "PENDING",
      message: "Esperando confirmación manual del admin.",
    };
  }
}
