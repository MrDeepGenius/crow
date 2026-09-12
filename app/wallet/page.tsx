// ============================================
// WALLET - balances reales del ledger
// ============================================

import type { Metadata } from "next";
import { WalletClient } from "./WalletClient";

export const metadata: Metadata = {
  title: "Wallet · Crow Market",
  description: "Tus balances, transacciones y retiros.",
};

export default function WalletPage() {
  return <WalletClient />;
}
