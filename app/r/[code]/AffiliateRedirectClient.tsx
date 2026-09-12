"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  findLinkByCode,
  recordClick,
  saveAttribution,
} from "@/app/services/marketplace/marketLedger";
import { getPublication } from "@/app/services/marketplace/marketStore";

export function AffiliateRedirectClient() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const link = findLinkByCode(params.code);
    if (!link || link.active === false) {
      setError(true);
      return;
    }
    recordClick(link.affiliateId, link.productId);
    saveAttribution({ affiliateId: link.affiliateId, productId: link.productId, timestamp: new Date().toISOString() });
    const product = getPublication(link.productId);
    if (!product || product.status !== "PUBLISHED") {
      setError(true);
      return;
    }
    router.replace(`/marketplace/product/${product.slug}`);
  }, [params.code, router]);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#888", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: '"Inter", system-ui, sans-serif' }}>
      {error ? "Enlace de afiliado inválido o pausado." : "Redirigiendo..."}
    </main>
  );
}
