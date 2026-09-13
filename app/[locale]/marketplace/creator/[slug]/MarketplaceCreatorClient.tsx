"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { FONT, MARKET_CSS, MarketLights, MarketplaceHeader, MK, RatingStars } from "../../components/market-ui";
import { ProductCard } from "../../components/ProductCard";

interface ServerPage {
  slug: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}

export function MarketplaceCreatorClient() {
  const params = useParams<{ slug: string }>();
  const [products, setProducts] = useState<ProductPublication[]>([]);
  const [server, setServer] = useState<ServerPage | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const slug = decodeURIComponent(params.slug);
    // Fetch products by creator from API
    fetch(`/api/products?creatorId=${encodeURIComponent(slug)}&pageSize=48`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.items) {
          setProducts(data.items as ProductPublication[]);
        }
      })
      .catch(() => {});
    // Fetch creator page
    fetch(`/api/creators/${encodeURIComponent(slug.toLowerCase())}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.ok && data.page) setServer(data.page);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [params.slug]);

  const localName = products[0]?.creatorName ?? decodeURIComponent(params.slug);
  const name = server?.displayName ?? localName;
  const sales = products.reduce((n, p) => n + (p.salesCount ?? 0), 0);
  const rated = products.filter((p) => p.ratingCount > 0);
  const avg = rated.length > 0 ? rated.reduce((n, p) => n + p.ratingSum / p.ratingCount, 0) / rated.length : null;
  const totalRatings = rated.reduce((n, p) => n + p.ratingCount, 0);

  if (!ready) {
    return <main style={{ minHeight: "100vh", background: MK.bg }} />;
  }

  return (
    <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
      <MarketLights />
      <MarketplaceHeader />
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ display: "flex", gap: "22px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
          {server?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={server.avatarUrl} alt={`Foto de ${name}`} style={{ width: "88px", height: "88px", borderRadius: "50%", objectFit: "cover", border: "2px solid #7c3aed", flexShrink: 0 }} />
          ) : (
            <div style={{ width: "88px", height: "88px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", fontWeight: "bold", flexShrink: 0 }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "30px" }}>{name}</h1>
            {server && (
              <div style={{ color: MK.muted, fontSize: "13px", marginTop: "2px" }}>
                /{server.slug} · Creador verificado de Crow
              </div>
            )}
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", color: MK.muted, fontSize: "14px", marginTop: "8px" }}>
              <span>{products.length} producto(s)</span>
              {sales > 0 && <span>{sales} venta(s)</span>}
              {avg !== null ? (
                <span style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                  <RatingStars sum={rated.reduce((n, p) => n + p.ratingSum, 0)} count={totalRatings} />
                  <span>{avg.toFixed(1)} ({totalRatings})</span>
                </span>
              ) : (
                <span>Sin reseñas todavía</span>
              )}
            </div>
          </div>
        </div>
        {server?.bio && (
          <p style={{ color: "#c9c9d1", fontSize: "15px", lineHeight: 1.7, maxWidth: "720px", margin: "12px 0 0" }}>
            {server.bio}
          </p>
        )}
        {products.length === 0 ? (
          <div style={{ color: MK.muted, marginTop: "24px" }}>
            Este creador todavía no tiene productos publicados.{" "}
            <Link href="/marketplace" style={{ color: MK.violetBright }}>Explorar Marketplace →</Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: "20px", margin: "36px 0 0" }}>Productos publicados</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "18px", marginTop: "18px" }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </section>
      <style>{MARKET_CSS}</style>
    </main>
  );
}
