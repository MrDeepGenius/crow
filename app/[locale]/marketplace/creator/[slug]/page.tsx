import type { Metadata } from "next";
import { MarketplaceCreatorClient } from "./MarketplaceCreatorClient";

export const metadata: Metadata = {
  title: "Creador · Crow Market",
  description: "Perfil público de un creador de Crow Market.",
};

export default function MarketplaceCreatorPage() {
  return <MarketplaceCreatorClient />;
}
