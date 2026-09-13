// ============================================
// AFFILIATES MARKETPLACE - productos para promocionar
// ============================================

import type { Metadata } from "next";
import { AffiliatesMarketplaceClient } from "./AffiliatesMarketplaceClient";

export const metadata: Metadata = {
  title: "Afiliados · Crow Market",
  description: "Encontrá productos para promocionar y generá comisiones.",
};

export default function AffiliatesMarketplacePage() {
  return <AffiliatesMarketplaceClient />;
}
