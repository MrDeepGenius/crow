"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { listOrders as listAllOrders } from "@/app/services/marketplace/marketOrders";
import { listPublications } from "@/app/services/marketplace/marketStore";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { FONT, MARKET_CSS, MarketLights, MarketplaceHeader, MK } from "../../components/market-ui";
import { ProductCard } from "../../components/ProductCard";

export function MarketplaceCreatorClient() {
  const params = useParams<{ slug: string }>();
  const [products, setProducts] = useState<ProductPublication[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const slug = decodeURIComponent(params.slug);
    setProducts(
      listPublications().filter(
        (p) => p.status === "PUBLISHED" && (p.creatorId === slug || p.creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug.toLowerCase())
      )
    );
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const name = products[0]?.creatorName ?? decodeURIComponent(params.slug);
  const sales = products.reduce(
    (n, p) => n + listAllOrders().filter((o) => o.productId === p.id && o.status === "PAID").length,
    0
  );

  if (!ready) {
    return <main style={{ minHeight: "100vh", background: MK.bg }} />;
  }

  return (
    <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
      <MarketLights />
      <MarketplaceHeader />
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "30px" }}>{name}</h1>
            <div style={{ color: MK.muted, fontSize: "14px", marginTop: "4px" }}>
              {products.length} producto(s){sales > 0 ? ` · ${sales} venta(s)` : ""}
            </div>
          </div>
        </div>
        {products.length === 0 ? (
          <div style={{ color: MK.muted, marginTop: "24px" }}>
            Este creador todavía no tiene productos publicados.{" "}
            <Link href="/marketplace" style={{ color: MK.violetBright }}>Explorar Marketplace →</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "18px", marginTop: "24px" }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
      <style>{MARKET_CSS}</style>
    </main>
  );
}


