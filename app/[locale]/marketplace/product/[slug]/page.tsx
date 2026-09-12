// ============================================
// PRODUCT DETAIL - landing premium por formato
// ============================================

import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";

export const metadata: Metadata = {
  title: "Producto · Crow Market",
  description: "Detalle de un producto digital publicado en Crow Market.",
};

export default function ProductPage({ params }: { params: { slug: string } }) {
  return <ProductDetailClient key={params.slug} />;
}
