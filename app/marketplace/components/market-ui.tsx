// ============================================
// MARKET UI - sistema visual de Crow Market
// ============================================
// Negro #07070A + violeta, glow controlado, sin emojis decorativos.
// Solo presentación: los datos siempre vienen de los servicios.

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { AccountMenu } from "@/app/components/AccountMenu";

export const MK = {
  bg: "#07070A",
  surface: "#0D0D12",
  surface2: "#111118",
  violet: "#7c3aed",
  violetBright: "#a855f7",
  text: "#ffffff",
  muted: "#9c9ca6",
  faint: "#5c5c66",
  border: "rgba(255,255,255,0.08)",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#f87171",
};

export const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function MarketLights() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: -1 }}>
      <div className="mk-beam mk-beam-a" />
      <div className="mk-beam mk-beam-b" />
      <div className="mk-beam mk-beam-c" />
      <div className="mk-glow-top" />
      <style>{`
        .mk-beam { position: absolute; top: -20%; width: 340px; height: 140%; border-radius: 50%; filter: blur(90px); opacity: 0.5; }
        .mk-beam-a { left: 6%; background: radial-gradient(closest-side, rgba(124,58,237,0.20), transparent); animation: mkRise 16s ease-in-out infinite alternate; }
        .mk-beam-b { left: 42%; background: radial-gradient(closest-side, rgba(168,85,247,0.13), transparent); animation: mkFall 20s ease-in-out infinite alternate; }
        .mk-beam-c { right: 4%; background: radial-gradient(closest-side, rgba(76,29,149,0.22), transparent); animation: mkRise 24s ease-in-out infinite alternate-reverse; }
        .mk-glow-top { position: absolute; top: 0; left: 0; right: 0; height: 320px; background: radial-gradient(55% 100% at 50% 0%, rgba(124,58,237,0.10) 0%, transparent 70%); }
        @keyframes mkRise { from { transform: translateY(9vh); } to { transform: translateY(-9vh); } }
        @keyframes mkFall { from { transform: translateY(-8vh); } to { transform: translateY(8vh); } }
        @media (prefers-reduced-motion: reduce) {
          .mk-beam { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export const MARKET_CSS = `
.mk-card { transition: transform 0.22s cubic-bezier(0.4,0,0.2,1), border-color 0.22s ease, box-shadow 0.22s ease; }
.mk-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.4); box-shadow: 0 16px 44px rgba(124,58,237,0.14), 0 0 0 1px rgba(124,58,237,0.06); }
.mk-card:hover .mk-zoom { transform: scale(1.06); }
.mk-zoom { transition: transform 0.35s cubic-bezier(0.4,0,0.2,1); }
.mk-btn { transition: filter 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
.mk-btn:hover { filter: brightness(1.12); }
.mk-btn:active { transform: scale(0.98); }
.mk-btn:focus-visible, a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }
.mk-fadein { animation: mkFade 0.45s cubic-bezier(0.4,0,0.2,1) both; }
@keyframes mkFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.mk-skeleton { position: relative; overflow: hidden; background: rgba(255,255,255,0.05); border-radius: 12px; }
.mk-skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(168,85,247,0.1), transparent); animation: mkShimmer 1.5s infinite; }
@keyframes mkShimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.mk-drift { animation: mkDrift 14s ease-in-out infinite alternate; }
@keyframes mkDrift { from { transform: translate(0, 0); } to { transform: translate(30px, -20px); } }
@media (prefers-reduced-motion: reduce) {
  .mk-card, .mk-btn, .mk-fadein, .mk-skeleton::after, .mk-drift { animation: none !important; transition: none !important; }
}
@media (max-width: 760px) {
  .mk-hide-mobile { display: none !important; }
}
`;

// ---------- Header ----------

export function MarketplaceHeader({ onSearch }: { onSearch?: (q: string) => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    const fn = (): void => setScrolled(window.scrollY > 12);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: "68px",
        padding: "0 4%",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        background: scrolled ? "rgba(7,7,10,0.82)" : "rgba(7,7,10,0.6)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        transition: "background 0.2s ease",
      }}
    >
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px", flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crowlogo.png" alt="Crow" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          CROW
        </Link>
      <nav className="mk-hide-mobile" style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
        <Link href="/marketplace" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>Marketplace</Link>
        <Link href="/marketplace/explore" style={{ color: MK.muted, textDecoration: "none" }}>Explorar</Link>
        <a href="/marketplace#categorias" style={{ color: MK.muted, textDecoration: "none" }}>Categorías</a>
        <a href="/marketplace#creadores" style={{ color: MK.muted, textDecoration: "none" }}>Creadores</a>
        <a href="/marketplace#colecciones" style={{ color: MK.muted, textDecoration: "none" }}>Colecciones</a>
      </nav>
      <div style={{ display: "flex", gap: "10px", marginLeft: "auto", alignItems: "center" }}>
        {onSearch && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearch(q);
            }}
            className="mk-hide-mobile"
            style={{ display: "flex" }}
          >
            <label htmlFor="mk-search" style={{ position: "absolute", left: "-9999px" }}>Buscar productos</label>
            <input
              id="mk-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar"
              style={{ width: "170px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", padding: "9px 12px", fontSize: "13px", fontFamily: FONT }}
            />
          </form>
        )}
        <Link href="/my-products" className="mk-btn mk-hide-mobile" style={{ color: MK.muted, textDecoration: "none", fontSize: "14px" }}>
          Mis productos
        </Link>
        <Link href="/create" className="mk-btn" style={{ padding: "10px 18px", borderRadius: "10px", background: MK.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "13px", whiteSpace: "nowrap" }}>
          Crear
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}

// ---------- Hero ----------

export const FORMAT_CHIPS = [
  { value: "", label: "Todos" },
  { value: "course", label: "Cursos" },
  { value: "ebook", label: "Ebooks" },
  { value: "pdf", label: "PDFs" },
  { value: "interactive_web", label: "Web Interactiva" },
  { value: "kit", label: "Kits" },
];

export function MarketplaceHero({
  onSearch,
  onChip,
}: {
  onSearch: (q: string) => void;
  onChip: (format: string) => void;
}) {
  const [q, setQ] = useState("");
  return (
    <section style={{ position: "relative", overflow: "hidden", padding: "72px 24px 48px", textAlign: "center" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(55% 70% at 50% 0%, rgba(124,58,237,0.20) 0%, rgba(124,58,237,0) 70%)" }} />
      <div aria-hidden className="mk-drift" style={{ position: "absolute", width: "420px", height: "420px", left: "-140px", top: "-120px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)" }} />
      <div aria-hidden className="mk-drift" style={{ position: "absolute", width: "360px", height: "360px", right: "-120px", top: "40px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)", animationDelay: "-7s" }} />
      <div style={{ position: "relative", maxWidth: "760px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", margin: "0 0 14px", letterSpacing: "-1.5px", lineHeight: 1.05 }}>
          Descubrí productos digitales que valen la pena.
        </h1>
        <p style={{ color: MK.muted, fontSize: "16px", maxWidth: "620px", margin: "0 auto 28px", lineHeight: 1.65 }}>
          Aprendé, creá y llevá tus proyectos al siguiente nivel con cursos, ebooks, herramientas y experiencias digitales creadas por nuestra comunidad.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(q);
          }}
          style={{ display: "flex", gap: "10px", maxWidth: "560px", margin: "0 auto 20px", padding: "8px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <label htmlFor="mk-hero-search" style={{ position: "absolute", left: "-9999px" }}>¿Qué estás buscando?</label>
          <input
            id="mk-hero-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="¿Qué estás buscando?"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", padding: "12px 16px", fontSize: "15px", fontFamily: FONT, minWidth: 0 }}
          />
          <button type="submit" className="mk-btn" style={{ padding: "12px 26px", borderRadius: "12px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px", whiteSpace: "nowrap" }}>
            Buscar
          </button>
        </form>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
          {FORMAT_CHIPS.map((c) => (
            <button
              key={c.value}
              onClick={() => onChip(c.value)}
              className="mk-btn"
              style={{ padding: "8px 18px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", background: c.value === "" ? "rgba(124,58,237,0.2)" : "transparent", color: "#ddd", cursor: "pointer", fontSize: "13px" }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------- Cards & grids ----------

export function FormatBadge({ format }: { format: ProductPublication["format"] }) {
  const labels: Record<ProductPublication["format"], string> = {
    course: "Curso",
    interactive_web: "Web",
    pdf: "PDF",
    ebook: "Ebook",
    kit: "Kit",
  };
  return (
    <span style={{ fontSize: "11px", color: MK.violetBright, fontWeight: "bold", letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {labels[format]}
    </span>
  );
}

export function RatingStars({ sum, count, minReviews }: { sum: number; count: number; minReviews?: number }) {
  const threshold = minReviews ?? 3;
  if (count < threshold) {
    return <span style={{ fontSize: "12px", color: MK.faint }}>{count === 0 ? "Sin reseñas" : "Nuevo"}</span>;
  }
  const avg = sum / count;
  const full = Math.round(avg);
  return (
    <span style={{ fontSize: "13px", color: "#f59e0b", letterSpacing: "1px" }} aria-label={`${avg.toFixed(1)} de 5`}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
      <span style={{ color: MK.muted, letterSpacing: 0 }}> {avg.toFixed(1)}</span>
    </span>
  );
}

export function FavoriteButton({ productId, size }: { productId: string; size?: number }) {
  const [fav, setFav] = useState(false);
  useEffect(() => {
    import("@/app/services/marketplace/marketStore").then((m) => setFav(m.isFavorite(productId)));
  }, [productId]);
  return (
    <button
      aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        import("@/app/services/marketplace/marketStore").then((m) => setFav(m.toggleFavorite(productId)));
      }}
      className="mk-btn"
      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "50%", width: size ?? 36, height: size ?? 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: fav ? "#f59e0b" : "#fff", fontSize: "16px" }}
    >
      {fav ? "★" : "☆"}
    </button>
  );
}

export function ProductGrid({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "18px" }}>
      {children}
    </div>
  );
}

export function SkeletonCards({ count }: { count?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "18px" }}>
      {Array.from({ length: count ?? 8 }, (_, i) => (
        <div key={i}>
          <div className="mk-skeleton" style={{ height: "170px", marginBottom: "12px" }} />
          <div className="mk-skeleton" style={{ height: "16px", width: "70%", marginBottom: "8px" }} />
          <div className="mk-skeleton" style={{ height: "12px", width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: "22px", margin: "0 0 4px" }}>{title}</h2>
        <p style={{ color: MK.muted, fontSize: "13px", margin: 0 }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyMarket({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "18px" }}>
      <div style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "8px" }}>{title}</div>
      <p style={{ color: MK.muted, fontSize: "14px", margin: "0 0 20px" }}>{detail}</p>
      {action}
    </div>
  );
}

export function MarketError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "56px 20px", border: "1px solid rgba(248,113,113,0.3)", borderRadius: "18px" }}>
      <div style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "8px" }}>No pudimos cargar los productos.</div>
      <p style={{ color: MK.muted, fontSize: "14px", margin: "0 0 20px" }}>Revisá tu conexión e intentá nuevamente.</p>
      <button onClick={onRetry} className="mk-btn" style={{ padding: "12px 26px", borderRadius: "10px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
        Intentar nuevamente
      </button>
    </div>
  );
}

export function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="mk-btn"
      style={{ padding: "8px 18px", borderRadius: "20px", border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)", background: active ? "rgba(124,58,237,0.2)" : "transparent", color: "#ddd", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
    >
      {label}
    </button>
  );
}
