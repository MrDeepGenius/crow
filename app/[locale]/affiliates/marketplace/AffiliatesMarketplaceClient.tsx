"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCategories, queryPublications } from "@/app/services/marketplace/marketStore";
import {
  createAffiliateLink,
  createAffiliateProfile,
  getAffiliateLink,
  getAffiliateProfile,
} from "@/app/services/marketplace/marketLedger";
import type { Category, ProductPublication } from "@/app/services/marketplace/marketTypes";
import { ProductCard } from "../../marketplace/components/ProductCard";
import { BackButton } from "@/app/components/BackButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function AffiliatesMarketplaceClient() {
  const [userId, setUserId] = useState("");
  const [input, setInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"sales" | "rating" | "newest">("sales");
  const [products, setProducts] = useState<ProductPublication[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setCategories(listCategories());
    try {
      const saved = window.localStorage.getItem("crow_affiliate_id");
      if (saved) {
        setUserId(saved);
        setInput(saved);
      }
    } catch {
      // sin afiliado
    }
  }, []);

  useEffect(() => {
    setProducts(
      queryPublications({ category: category || undefined, sort, pageSize: 48 }).items.filter((p) => p.affiliateEnabled)
    );
  }, [category, sort]);

  useEffect(() => {
    if (!userId) {
      setProfileId(null);
      return;
    }
    setProfileId(createAffiliateProfile(userId).id);
  }, [userId]);

  const login = (): void => {
    if (!input.trim()) return;
    setUserId(input.trim());
    try {
      window.localStorage.setItem("crow_affiliate_id", input.trim());
    } catch {
      // no bloquea
    }
  };

  const promote = (productId: string): void => {
    if (!profileId) return;
    const link = getAffiliateLink(profileId, productId) ?? createAffiliateLink(profileId, productId);
    const url = `${window.location.origin}/r/${link.code}`;
    setLinks((prev) => ({ ...prev, [productId]: url }));
  };

  const copy = async (productId: string): Promise<void> => {
    const url = links[productId];
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(productId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "20px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Afiliados
        </Link>
        <nav style={{ display: "flex", gap: "16px", fontSize: "14px", marginLeft: "auto", alignItems: "center" }}>
          <Link href="/affiliates/program" style={{ color: "#a855f7", textDecoration: "none", fontWeight: "bold" }}>Programa</Link>
          <Link href="/marketplace" style={{ color: "#aaa", textDecoration: "none" }}>Marketplace</Link>
          <BackButton fallback="/affiliates" />
        </nav>
      </header>
      <section style={{ maxWidth: "1250px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>Productos para promocionar</h1>
        <p style={{ color: "#888", margin: "0 0 24px" }}>Elegí un producto, generá tu enlace único y ganá comisión por cada venta atribuida.</p>

        {!userId ? (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", maxWidth: "480px", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 8px" }}>Identificate como afiliado</h2>
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tu usuario o email" style={{ flex: 1, background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT }} />
              <button onClick={login} style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Entrar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px", alignItems: "center" }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as "sales" | "rating" | "newest")} style={selectStyle}>
              <option value="sales">Popularidad</option>
              <option value="rating">Mejor valorados</option>
              <option value="newest">Nuevos</option>
            </select>
          </div>
        )}

        {userId && products.length === 0 && (
          <div style={{ color: "#888" }}>Ningún producto acepta afiliados con estos filtros.</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
          {userId && products.map((p) => (
            <div key={p.id}>
              <ProductCard product={p} />
              <div style={{ marginTop: "8px", padding: "12px", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "12px", background: "rgba(34,197,94,0.06)" }}>
                <div style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold", marginBottom: "8px" }}>
                  Comisión disponible: {p.affiliatePercent}%
                </div>
                {!links[p.id] ? (
                  <button onClick={() => promote(p.id)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                    Promocionar
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input readOnly value={links[p.id]} style={{ flex: 1, background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#aaa", padding: "8px", fontSize: "11px", minWidth: 0 }} />
                    <button onClick={() => void copy(p.id)} style={{ padding: "8px 12px", borderRadius: "8px", border: "none", background: "#22c55e", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                      {copied === p.id ? "Copiado" : "Copiar enlace"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "13px",
  fontFamily: FONT,
};
