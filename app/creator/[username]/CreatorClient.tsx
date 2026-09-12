"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { listPublications } from "@/app/services/marketplace/marketStore";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { ProductCard } from "../../marketplace/components/ProductCard";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function CreatorClient() {
  const params = useParams<{ username: string }>();
  const [products, setProducts] = useState<ProductPublication[]>([]);

  useEffect(() => {
    setProducts(
      listPublications().filter((p) => p.creatorId === params.username && p.status === "PUBLISHED")
    );
  }, [params.username]);

  const sales = products.reduce((n, p) => n + p.salesCount, 0);
  const ratings = products.filter((p) => p.ratingCount > 0);
  const avg = ratings.length > 0 ? ratings.reduce((n, p) => n + p.ratingSum / p.ratingCount, 0) / ratings.length : null;
  const name = products[0]?.creatorName ?? params.username;

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Crow Market
        </Link>
      </header>
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold" }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px" }}>{name}</h1>
            <div style={{ color: "#888", fontSize: "13px" }}>@{params.username}</div>
          </div>
        </div>
        <div style={{ color: "#888", fontSize: "14px", marginBottom: "28px" }}>
          {products.length} producto(s) · {sales} venta(s){avg !== null ? ` · ${avg.toFixed(1)} promedio` : " · Sin reseñas"}
        </div>
        {products.length === 0 ? (
          <div style={{ color: "#888" }}>Este creador aún no tiene productos publicados.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
