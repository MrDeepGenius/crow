// ============================================
// MARKETPLACE HOME - experiencia premium real
// ============================================

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  listCategories,
  queryPublications,
} from "@/app/services/marketplace/marketStore";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import { computeCollections, computeCreators } from "@/app/services/marketplace/collections";
import type { Category, ProductPublication } from "@/app/services/marketplace/marketTypes";
import {
  CategoryChip,
  EmptyMarket,
  FONT,
  MARKET_CSS,
  MarketLights,
  MarketError,
  MarketplaceHero,
  MK,
  ProductGrid,
  SectionHeader,
  SkeletonCards,
} from "./components/market-ui";
import { MarketSidebar } from "./components/MarketSidebar";
import { Top10List } from "./components/Top10List";
import { ProductCard } from "./components/ProductCard";

const OBJECTIVES = [
  { label: "Ganar dinero", category: "Finanzas", gradient: "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.03))" },
  { label: "Aprender una habilidad", category: "Educación", gradient: "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.03))" },
  { label: "Crear un negocio", category: "Emprendimiento", gradient: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.03))" },
  { label: "Dominar la IA", category: "Inteligencia Artificial", gradient: "linear-gradient(135deg, rgba(168,85,247,0.28), rgba(168,85,247,0.03))" },
  { label: "Mejorar tus ventas", category: "Ventas", gradient: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(245,158,11,0.03))" },
  { label: "Crear contenido", category: "Creación de Contenido", gradient: "linear-gradient(135deg, rgba(236,72,153,0.22), rgba(236,72,153,0.03))" },
];

interface HomeData {
  pubs: ProductPublication[];
  categories: Category[];
  stats: { sales: number; buyers: number; rating: number };
  failed: boolean;
}

function loadHome(): HomeData {
  try {
    const pubs = queryPublications({ sort: "relevance", pageSize: 48 }).items;
    const orders = listOrders().filter((o) => o.status === "PAID");
    const rated = pubs.filter((p) => p.ratingCount >= 3);
    return {
      pubs,
      categories: listCategories(),
      stats: {
        sales: orders.length,
        buyers: new Set(orders.map((o) => o.buyerId)).size,
        rating: rated.length > 0 ? rated.reduce((n, p) => n + p.ratingSum / p.ratingCount, 0) / rated.length : 0,
      },
      failed: false,
    };
  } catch {
    return { pubs: [], categories: [], stats: { sales: 0, buyers: 0, rating: 0 }, failed: true };
  }
}

export default function MarketplacePage() {
  const router = useRouter();
  // Estado inicial vacío = idéntico en servidor y cliente (evita hydration mismatch).
  // Los datos reales (localStorage) se cargan solo tras el montaje.
  const [snapshot, setSnapshot] = useState<HomeData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const all = snapshot?.pubs ?? [];
  const categories = snapshot?.categories ?? [];
  const stats = snapshot?.stats ?? { sales: 0, buyers: 0, rating: 0 };
  const loading = snapshot === null && !loadError;

  const load = (): void => {
    try {
      setSnapshot(loadHome());
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trending = useMemo(
    () => [...all].sort((a, b) => b.viewCount + b.salesCount * 10 - (a.viewCount + a.salesCount * 10)).slice(0, 4),
    [all]
  );
  const top10 = useMemo(() => [...all].sort((a, b) => b.salesCount - a.salesCount).slice(0, 10), [all]);
  const bestSellers = useMemo(() => [...all].sort((a, b) => b.salesCount - a.salesCount).slice(0, 4), [all]);
  const newest = useMemo(
    () => [...all].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 4),
    [all]
  );
  const topRated = useMemo(
    () =>
      all
        .filter((p) => p.ratingCount >= 3)
        .sort((a, b) => b.ratingSum / b.ratingCount - a.ratingSum / a.ratingCount)
        .slice(0, 4),
    [all]
  );
  const collections = useMemo(() => computeCollections(all), [all]);
  const creators = useMemo(() => {
    const orders = listOrders();
    return computeCreators(all, (id) => orders.filter((o) => o.productId === id && o.status === "PAID").length).slice(0, 4);
  }, [all]);

  const goExplore = (params: string): void => {
    router.push(`/marketplace/explore${params}`);
  };

  return (
    <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT, display: "flex", position: "relative" }}>
      <MarketLights />
      <MarketSidebar
        onSearch={(q) => goExplore(`?q=${encodeURIComponent(q)}`)}
        mobileOpen={mobileOpen}
        onMenuToggle={() => setMobileOpen((m) => !m)}
      />
      <div className="mk-content" style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
      <MarketplaceHero
        onSearch={(q) => goExplore(`?q=${encodeURIComponent(q)}`)}
        onChip={(format) => goExplore(format ? `?format=${format}` : "")}
      />

      <div style={{ maxWidth: "1250px", margin: "0 auto", padding: "12px 24px 90px" }} className="mk-content-inner">
        {(stats.sales > 0 || stats.buyers > 0) && (
          <div className="mk-stats-row" style={{ display: "flex", gap: "32px", justifyContent: "center", marginBottom: "44px", flexWrap: "wrap" }}>
            {stats.sales > 0 && <MarketStat value={formatCompact(stats.sales)} label="Ventas" />}
            {stats.buyers > 0 && <MarketStat value={formatCompact(stats.buyers)} label="Compradores" />}
            {stats.rating > 0 && <MarketStat value={stats.rating.toFixed(2)} label="Rating" />}
          </div>
        )}

        {loading ? (
          <SkeletonCards count={8} />
        ) : loadError ? (
          <MarketError onRetry={load} />
        ) : all.length === 0 ? (
          <EmptyMarket
            title="Estamos preparando algo increíble."
            detail="Todavía no hay productos publicados. Creá el primero con Crow Create Studio."
            action={
              <Link href="/create" className="mk-btn" style={{ display: "inline-block", padding: "12px 26px", borderRadius: "10px", background: MK.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "14px" }}>
                Crear producto
              </Link>
            }
          />
        ) : (
          <div className="mk-fadein">
            <SectionHeader
              title="Tendencias ahora"
              subtitle="Los productos que están llamando la atención de la comunidad."
            />
            <ProductGrid>
              {trending.map((p, i) => (
                <ProductCard key={p.id} product={p} badge={i < 3 && p.salesCount > 0 ? "Bestseller" : null} />
              ))}
            </ProductGrid>

            <div id="top10" style={{ marginTop: "56px" }}>
              <SectionHeader
                title="🏆 Top 10 más vendidos"
                subtitle="Los productos con más ventas reales de la plataforma."
              />
              <Top10List products={top10} />
            </div>

            <div id="categorias" style={{ marginTop: "56px" }}>
              <SectionHeader title="¿Qué querés conseguir?" subtitle="Elegí tu objetivo y filtramos por vos." />
              <div className="mk-objectives-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "14px" }}>
                {OBJECTIVES.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => goExplore(`?category=${encodeURIComponent(o.category)}`)}
                    className="mk-btn mk-card"
                    style={{ padding: "22px 16px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: `${o.gradient}, #0D0D12`, color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "bold", textAlign: "left", fontFamily: FONT }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                {categories.map((c) => (
                  <CategoryChip key={c.id} label={c.name} active={false} onClick={() => goExplore(`?category=${encodeURIComponent(c.name)}`)} />
                ))}
              </div>
            </div>

            <div style={{ marginTop: "56px" }}>
              <SectionHeader
                title="Más vendidos"
                subtitle="Ordenados por ventas reales."
                action={<SeeAll onClick={() => goExplore("?sort=sales")} />}
              />
              <ProductGrid>
                {bestSellers.map((p) => (
                  <ProductCard key={p.id} product={p} badge={p.salesCount > 0 ? "Bestseller" : null} />
                ))}
              </ProductGrid>
            </div>

            <div style={{ marginTop: "56px" }}>
              <SectionHeader
                title="Recién publicados"
                subtitle="Lo último de la comunidad."
                action={<SeeAll onClick={() => goExplore("?sort=newest")} />}
              />
              <ProductGrid>
                {newest.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </ProductGrid>
            </div>

            {topRated.length > 0 && (
              <div style={{ marginTop: "56px" }}>
                <SectionHeader
                  title="Mejor valorados"
                  subtitle="Solo productos con reseñas suficientes."
                  action={<SeeAll onClick={() => goExplore("?sort=rating")} />}
                />
                <ProductGrid>
                  {topRated.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </ProductGrid>
              </div>
            )}

            {collections.length > 0 && (
              <div id="colecciones" style={{ marginTop: "56px" }}>
                <SectionHeader title="Colecciones Crow" subtitle="Selecciones editoriales por tema y stack." />
                <div className="mk-collections-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => goExplore(`?collection=${c.id}`)}
                      className="mk-btn mk-card"
                      style={{ padding: "26px 22px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: `linear-gradient(135deg, ${c.accent}33 0%, rgba(13,13,18,1) 65%)`, color: "#fff", cursor: "pointer", textAlign: "left", fontFamily: FONT }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "17px", marginBottom: "6px" }}>{c.title}</div>
                      <div style={{ color: MK.muted, fontSize: "13px", marginBottom: "10px" }}>{c.description}</div>
                      <div style={{ color: MK.violetBright, fontSize: "13px", fontWeight: "bold" }}>{c.productIds.length} productos →</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {creators.length > 0 && (
              <div id="creadores" style={{ marginTop: "56px" }}>
                <SectionHeader title="Creadores destacados" subtitle="Quienes publican y venden en Crow." />
                <div className="mk-creators-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
                  {creators.map((c) => (
                    <Link
                      key={c.creatorId}
                      href={`/marketplace/creator/${encodeURIComponent(c.creatorId)}`}
                      className="mk-btn mk-card"
                      style={{ padding: "20px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "#0D0D12", color: "#fff", textDecoration: "none", display: "block" }}
                    >
                      <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px", marginBottom: "10px" }}>
                        {c.creatorName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: "bold", fontSize: "15px" }}>{c.creatorName}</div>
                      <div style={{ color: MK.muted, fontSize: "12px", marginTop: "4px" }}>
                        {c.products.length} producto(s){c.sales > 0 ? ` · ${c.sales} venta(s)` : ""}
                        {c.avgRating !== null ? ` · ${c.avgRating.toFixed(1)} rating` : ""}
                      </div>
                      <div style={{ color: MK.violetBright, fontSize: "13px", marginTop: "8px", fontWeight: "bold" }}>Ver creador →</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      <style>{MARKET_CSS}</style>
    </main>
  );
}

function MarketStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "30px", fontWeight: "bold" }}>{value}</div>
      <div style={{ color: MK.muted, fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function SeeAll({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mk-btn" style={{ background: "transparent", border: "none", color: MK.muted, cursor: "pointer", fontSize: "13px" }}>
      Ver todos →
    </button>
  );
}

function formatCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}
