// ============================================
// MY PRODUCTS - acceso real por entitlement
// ============================================

import type { Metadata } from "next";
import { MyProductsClient } from "./MyProductsClient";

export const metadata: Metadata = {
  title: "Mis productos · Crow Market",
  description: "Accedé a tus productos comprados en Crow Market.",
};

export default function MyProductsPage() {
  return <MyProductsClient />;
}
