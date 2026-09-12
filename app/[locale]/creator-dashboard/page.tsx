// ============================================
// CREATOR DASHBOARD - métricas reales
// ============================================

import type { Metadata } from "next";
import { CreatorDashboardClient } from "./CreatorDashboardClient";

export const metadata: Metadata = {
  title: "Creator Dashboard · Crow Market",
  description: "Tus visitas, ventas e ingresos como creador.",
};

export default function CreatorDashboardPage() {
  return <CreatorDashboardClient />;
}
