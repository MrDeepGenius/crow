"use client";

import { useState } from "react";
import Link from "next/link";
import { MK, FONT } from "./market-ui";

export interface MarketNavItem {
  id: string;
  label: string;
  icon: string;
  href?: string;
  anchor?: string;
}

export const MARKET_NAV: MarketNavItem[] = [
  { id: "inicio", label: "Inicio", icon: "⌂", href: "/marketplace" },
  { id: "explorar", label: "Explorar", icon: "▦", href: "/marketplace/explore" },
  { id: "top", label: "Top 10", icon: "★", anchor: "#top10" },
  { id: "categorias", label: "Categorías", icon: "◈", anchor: "#categorias" },
  { id: "creadores", label: "Creadores", icon: "◍", anchor: "#creadores" },
  { id: "colecciones", label: "Colecciones", icon: "▣", anchor: "#colecciones" },
  { id: "crear", label: "Crear", icon: "+", href: "/create" },
  { id: "misproductos", label: "Mis productos", icon: "◉", href: "/my-products" },
];

export function MarketSidebar({
  onSearch,
  mobileOpen,
  onMenuToggle,
}: {
  onSearch?: (q: string) => void;
  mobileOpen: boolean;
  onMenuToggle: () => void;
}) {
  const [q, setQ] = useState("");

  return (
    <>
      <aside
        className="mk-sidebar"
        style={{
          width: 220,
          flexShrink: 0,
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, rgba(10,10,14,0.95) 0%, rgba(7,7,10,0.95) 100%)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(124,58,237,0.10)",
          padding: "22px 14px",
          zIndex: 50,
          boxShadow: "4px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <Link
          href="/marketplace"
          style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "17px", padding: "0 8px 22px", flexShrink: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crowlogo.png" alt="Crow" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
          CROW
        </Link>

        {/* Search */}
        {onSearch && (
          <form
            onSubmit={(e) => { e.preventDefault(); onSearch(q); }}
            style={{ marginBottom: "18px", padding: "0 4px" }}
          >
            <label htmlFor="mk-side-search" style={{ position: "absolute", left: "-9999px" }}>Buscar productos</label>
            <input
              id="mk-side-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#fff",
                padding: "9px 12px",
                fontSize: "13px",
                fontFamily: FONT,
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />
          </form>
        )}

        {/* Nav */}
        <nav className="mk-premium-scroll" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
          {MARKET_NAV.map((item) => {
            const content = (
              <>
                <span style={{ width: "20px", textAlign: "center", fontSize: "15px" }} aria-hidden>{item.icon}</span>
                <span style={{ fontSize: "14px" }}>{item.label}</span>
              </>
            );
            const style: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "11px 12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: MK.muted,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              fontFamily: FONT,
              textDecoration: "none",
              transition: "background 0.18s ease, color 0.18s ease, padding-left 0.18s ease",
            };
            if (item.href) {
              return (
                <Link key={item.id} href={item.href} className="mk-navitem" style={style} title={item.label}>
                  {content}
                </Link>
              );
            }
            return (
              <a
                key={item.id}
                href={item.anchor ?? "#"}
                className="mk-navitem"
                style={style}
                title={item.label}
                onClick={() => onMenuToggle()}
              >
                {content}
              </a>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link
            href="/create"
            className="mk-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "11px",
              borderRadius: "12px",
              background: MK.violet,
              color: "#fff",
              fontWeight: "bold",
              textDecoration: "none",
              fontSize: "13px",
              boxShadow: "0 4px 20px rgba(124,58,237,0.25)",
            }}
          >
            <span aria-hidden>+</span> Crear producto
          </Link>
          <Link
            href="/affiliates"
            className="mk-navitem"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "12px",
              color: MK.muted,
              textDecoration: "none",
              fontSize: "13px",
              fontFamily: FONT,
            }}
          >
            <span style={{ width: "20px", textAlign: "center" }} aria-hidden>◈</span>
            Afiliados
          </Link>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={onMenuToggle}
        aria-label="Abrir menú"
        className="mk-mobile-menu-btn"
        style={{
          display: "none",
          position: "fixed",
          top: "14px",
          left: "14px",
          zIndex: 70,
          background: "rgba(7,7,10,0.85)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "10px",
          color: "#fff",
          padding: "10px 13px",
          cursor: "pointer",
          fontSize: "18px",
          backdropFilter: "blur(8px)",
        }}
      >
        ☰
      </button>

      <style>{`
        .mk-navitem:hover { background: rgba(124,58,237,0.08) !important; color: #fff !important; padding-left: 16px !important; }
        .mk-premium-scroll::-webkit-scrollbar { width: 5px; }
        .mk-premium-scroll::-webkit-scrollbar-track { background: transparent; }
        .mk-premium-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.25); border-radius: 10px; }
        .mk-premium-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.45); }
        @media (max-width: 900px) {
          .mk-sidebar { position: fixed !important; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.22s ease !important; width: 220px !important; }
          .mk-sidebar.open { transform: translateX(0); box-shadow: 20px 0 60px rgba(0,0,0,0.6); }
          .mk-mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </>
  );
}
