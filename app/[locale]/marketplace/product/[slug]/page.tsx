// ============================================
// PRODUCT DETAIL - landing premium por formato
// ============================================

import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";

export const metadata: Metadata = {
  title: "Producto · Crow Market",
  description: "Detalle de un producto digital publicado en Crow Market.",
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductDetailClient key={slug} />;
}
