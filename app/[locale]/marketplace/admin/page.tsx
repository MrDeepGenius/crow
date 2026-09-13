// ============================================
// MARKETPLACE ADMIN MÍNIMO - categorías y visibilidad
// ============================================
// Solo lo necesario para operar el catálogo real. Sin datos falsos.

import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = {
  title: "Admin · Crow Market",
  description: "Administración del catálogo de Crow Market.",
};

export default function AdminPage() {
  return <AdminClient />;
}
