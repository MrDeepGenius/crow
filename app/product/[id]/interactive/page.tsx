// ============================================
// INTERACTIVE PRODUCT - web con entitlement
// ============================================

import type { Metadata } from "next";
import { InteractiveProductClient } from "./InteractiveProductClient";

export const metadata: Metadata = {
  title: "Producto interactivo · Crow Market",
  description: "Tu web interactiva comprada en Crow Market.",
};

export default function InteractiveProductPage() {
  return <InteractiveProductClient />;
}
