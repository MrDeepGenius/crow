// ============================================
// CHECKOUT HONESTO - orden PENDING real, sin pago fingido
// ============================================

import type { Metadata } from "next";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout · Crow Market",
  description: "Finalizá tu compra en Crow Market.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
