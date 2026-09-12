// ============================================
// EXPLORE - filtros y orden reales
// ============================================

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  listCategories,
  listFavorites,
  queryPublications,
  type DiscoveryQuery,
} from "@/app/services/marketplace/marketStore";
import { computeCollections } from "@/app/services/marketplace/collections";
import type { Category } from "@/app/services/marketplace/marketTypes";
import {
  EmptyMarket,
  FONT,
  MARKET_CSS,
  MarketLights,
  MarketError,
  MarketplaceHeader,
  MK,
  ProductGrid,
  SkeletonCards,
} from "../components/market-ui";
import { ProductCard } from "../components/ProductCard";

const FORMATS = [
  { value: "", label: "Todos" },
  { value: "course", label: "Cursos" },
  { value: "ebook", label: "Ebooks" },
  { value: "pdf", label: "PDFs" },
  { value: "interactive_web", label: "Web" },
  { value: "kit", label: "Kits" },
];

const SORTS: { value: NonNullable<DiscoveryQuery["sort"]>; label: string }[] = [
  { value: "relevance", label: "Relevancia" },
  { value: "sales", label: "Más vendidos" },
  { value: "rating", label: "Mejor valorados" },
  { value: "newest", label: "Más recientes" },
  { value: "priceAsc", label: "Precio menor" },
  { value: "priceDesc", label: "Precio mayor" },
];

function ExploreClient() {
  const searchParams = useSearchParams();
  // Primer render idéntico al servidor (skeleton); datos tras el montaje.
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setCategories(listCategories());
    setLoading(false);
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [format, setFormat] = useState(searchParams.get("format") ?? "");
  const [sort, setSort] = useState<NonNullable<DiscoveryQuery["sort"]>>(
    (searchParams.get("sort") as NonNullable<DiscoveryQuery["sort"]>) || "relevance"
  );
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [collectionId, setCollectionId] = useState(searchParams.get("collection") ?? "");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState(false);

  const withPageReset = (apply: () => void): void => {
    apply();
    setPage(1);
  };

  const result = useMemo(() => {
    if (!mounted) return { items: [], total: 0, page: 1, pageSize: 12, failed: false };
    try {
      let res = queryPublications({
        search: q || undefined,
        category: category || undefined,
        format: (format || undefined) as DiscoveryQuery["format"],
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        sort,
        page,
        pageSize: 12,
      });
      if (collectionId) {
        const all = queryPublications({ sort, pageSize: 48 }).items;
        const col = computeCollections(all).find((c) => c.id === collectionId);
        const ids = new Set(col?.productIds ?? []);
        const items = res.items.filter((p) => ids.has(p.id));
        res = { ...res, items, total: items.length };
      }
      if (favoritesOnly) {
        const favs = new Set(listFavorites());
        const items = res.items.filter((p) => favs.has(p.id));
        res = { ...res, items, total: items.length };
      }
      return { ...res, failed: false };
    } catch {
      return { items: [], total: 0, page: 1, pageSize: 12, failed: true };
    }
  }, [q, category, format, sort, maxPrice, minRating, favoritesOnly, collectionId, page, mounted]);

  const loadError = result.failed;

  const filters = (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={filterLabel}>Categoría</div>
        <select value={category} onChange={(e) => withPageReset(() => setCategory(e.target.value))} style={filterInput} aria-label="Categoría">
          <option value="">Todas</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <div style={filterLabel}>Tipo</div>
        <select value={format} onChange={(e) => withPageReset(() => setFormat(e.target.value))} style={filterInput} aria-label="Tipo de producto">
          {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <div style={filterLabel}>Orden</div>
        <select value={sort} onChange={(e) => withPageReset(() => setSort(e.target.value as NonNullable<DiscoveryQuery["sort"]>))} style={filterInput} aria-label="Orden">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <div style={filterLabel}>Precio máx.</div>
        <input value={maxPrice} onChange={(e) => withPageReset(() => setMaxPrice(e.target.value.replace(/[^0-9.]/g, "")))} inputMode="decimal" placeholder="Sin tope" style={filterInput} aria-label="Precio máximo" />
      </div>
      <div>
        <div style={filterLabel}>Rating mín.</div>
        <select value={minRating} onChange={(e) => withPageReset(() => setMinRating(e.target.value))} style={filterInput} aria-label="Rating mínimo">
          <option value="">Cualquiera</option>
          <option value="3">3+ estrellas</option>
          <option value="4">4+ estrellas</option>
          <option value="4.5">4.5+ estrellas</option>
        </select>
      </div>
      <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: MK.muted }}>
        <input type="checkbox" checked={favoritesOnly} onChange={(e) => withPageReset(() => setFavoritesOnly(e.target.checked))} />
        Solo favoritos
      </label>
      {(q || category || format || maxPrice || minRating || favoritesOnly || collectionId) && (
        <button
          onClick={() => {
            withPageReset(() => {
              setQ("");
              setCategory("");
              setFormat("");
              setMaxPrice("");
              setMinRating("");
              setFavoritesOnly(false);
              setCollectionId("");
              setSort("relevance");
            });
          }}
          style={{ background: "transparent", border: "none", color: MK.violetBright, cursor: "pointer", fontSize: "13px", textAlign: "left", padding: 0 }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
      <MarketLights />
      <MarketplaceHeader />
      <div style={{ maxWidth: "1250px", margin: "0 auto", padding: "32px 24px 90px" }}>
        <h1 style={{ fontSize: "28px", margin: "0 0 6px" }}>Explorar</h1>
        <p style={{ color: MK.muted, fontSize: "14px", margin: "0 0 20px" }}>{result.total} resultado(s) reales.</p>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: "flex", gap: "10px", marginBottom: "20px" }}
        >
          <label htmlFor="ex-search" style={{ position: "absolute", left: "-9999px" }}>Buscar productos</label>
          <input
            id="ex-search"
            value={q}
            onChange={(e) => withPageReset(() => setQ(e.target.value))}
            placeholder="Buscar por título, categoría, creador..."
            style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", padding: "12px 16px", fontSize: "14px", fontFamily: FONT, minWidth: 0 }}
          />
          <button onClick={() => setDrawer(true)} className="mk-btn show-filters-btn" style={{ padding: "12px 18px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: "13px", display: "none" }}>
            Filtros
          </button>
        </form>
        <div className="explore-layout">
          <aside className="explore-filters">{filters}</aside>
          <div style={{ minWidth: 0 }}>
            {loading ? (
              <SkeletonCards count={6} />
            ) : loadError ? (
              <MarketError onRetry={() => window.location.reload()} />
            ) : result.total === 0 ? (
              <EmptyMarket title="Sin resultados" detail="Probá con otra búsqueda o limpiá los filtros." />
            ) : (
              <>
                <ProductGrid>
                  {result.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </ProductGrid>
                {result.total > result.pageSize && (
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "24px", alignItems: "center" }}>
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={pageBtn(page <= 1)}>Anterior</button>
                    <span style={{ color: MK.muted, fontSize: "13px" }}>Página {result.page}</span>
                    <button disabled={result.page * result.pageSize >= result.total} onClick={() => setPage(page + 1)} style={pageBtn(result.page * result.pageSize >= result.total)}>
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {drawer && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <div onClick={() => setDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "300px", background: "#0D0D12", padding: "24px", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <strong>Filtros</strong>
              <button onClick={() => setDrawer(false)} aria-label="Cerrar filtros" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}>✕</button>
            </div>
            {filters}
            <button onClick={() => setDrawer(false)} className="mk-btn" style={{ width: "100%", marginTop: "16px", padding: "12px", borderRadius: "10px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
              Ver resultados
            </button>
          </div>
        </div>
      )}
      <style>{`
        .explore-layout { display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: start; }
        .explore-filters { position: sticky; top: 92px; }
        @media (max-width: 860px) {
          .explore-layout { grid-template-columns: 1fr; }
          .explore-filters { display: none; }
          .show-filters-btn { display: inline-block !important; }
        }
        ${MARKET_CSS}
      `}</style>
    </main>
  );
}

const filterLabel: React.CSSProperties = { color: MK.muted, fontSize: "11px", marginBottom: "6px", letterSpacing: "0.5px", textTransform: "uppercase" };

const filterInput: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "13px",
  fontFamily: FONT,
};

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    fontSize: "13px",
  };
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#07070A" }} />}>
      <ExploreClient />
    </Suspense>
  );
}
