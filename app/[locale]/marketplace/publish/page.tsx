// ============================================
// PUBLISH - del producto real al Marketplace
// ============================================

import { Suspense } from "react";
import type { Metadata } from "next";
import { PublishClient } from "./PublishClient";

export const metadata: Metadata = {
  title: "Publicar · Crow Market",
  description: "Publicá tu producto digital en Crow Market.",
};

export default function PublishPage() {
  return (
    <Suspense>
      <PublishClient />
    </Suspense>
  );
}
