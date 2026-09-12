// ============================================
// SUPER PANEL DE AFILIADOS - centro de operaciones
// ============================================

import type { Metadata } from "next";
import { AffiliateHubClient } from "./AffiliateHubClient";

export const metadata: Metadata = {
  title: "Panel de afiliado · Crow Market",
  description: "Tu centro de operaciones como afiliado de Crow Market.",
};

export default function AffiliateHubPage() {
  return <AffiliateHubClient />;
}
