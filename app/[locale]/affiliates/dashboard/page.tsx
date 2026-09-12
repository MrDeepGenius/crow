// ============================================
// AFFILIATE DASHBOARD - datos reales del ledger
// ============================================

import type { Metadata } from "next";
import { AffiliateDashboardClient } from "./AffiliateDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard afiliado · Crow Market",
  description: "Tus clics, ventas y comisiones como afiliado.",
};

export default function AffiliateDashboardPage() {
  return <AffiliateDashboardClient />;
}
