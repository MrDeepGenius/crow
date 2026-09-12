import type { Metadata } from "next";
import { AdminPaymentsClient } from "./AdminPaymentsClient";

export const metadata: Metadata = {
  title: "Pagos · Admin Crow",
  description: "Administración de pagos USDT BEP-20: órdenes, estados y revisión manual excepcional.",
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsClient />;
}
