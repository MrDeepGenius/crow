// ============================================
// SHELL - sidebar + header del Affiliate OS
// ============================================

"use client";

import { useState } from "react";
import Link from "next/link";
import { C, FONT } from "./ui";

export type ShellSection =
  | "inicio"
  | "marketplace"
  | "promotions"
  | "links"
  | "commissions"
  | "rewards"
  | "analytics"
  | "team"
  | "saleslog"
  | "invites"
  | "kit"
  | "referrals"
  | "notificaciones"
  | "pagos"
  | "settings";

export const NAV: { id: ShellSection; label: string; icon: string; href?: string }[] = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "marketplace", label: "Marketplace", icon: "▦", href: "/affiliates/marketplace" },
  { id: "promotions", label: "Mis promociones", icon: "◈" },
  { id: "links", label: "Mis enlaces", icon: "⧉" },
  { id: "commissions", label: "Comisiones", icon: "◉" },
  { id: "rewards", label: "Rewards", icon: "★" },
  { id: "analytics", label: "Analíticas", icon: "▤" },
  { id: "team", label: "Mi equipo", icon: "◍" },
  { id: "saleslog", label: "Log de ventas", icon: "☰" },
  { id: "invites", label: "Invitaciones", icon: "✉" },
  { id: "kit", label: "Kit promocional", icon: "▣" },
  { id: "referrals", label: "Referidos", icon: "◍" },
  { id: "notificaciones", label: "Notificaciones", icon: "♪" },
  { id: "pagos", label: "Pagos", icon: "▭" },
  { id: "settings", label: "Configuración", icon: "⚙" },
];

export function Sidebar({
  active,
  collapsed,
  onNavigate,
  onToggle,
  mobileOpen,
  walletSummary,
  userName,
  items,
  brandTitle,
  brandSub,
  accent,
}: {
  active: string;
  collapsed: boolean;
  onNavigate: (s: string) => void;
  onToggle: () => void;
  mobileOpen: boolean;
  walletSummary: string;
  userName: string;
  items?: { id: string; label: string; icon: string; href?: string }[];
  brandTitle?: string;
  brandSub?: string;
  accent?: string;
}) {
  const navItems = items ?? NAV;
  // Solo cuando se provee `accent` se agregan toques de color propios;
  // sin él, el render es idéntico al original.
  const brandAccent = accent ?? C.violetSoft;
  return (
    <>
      <aside
        aria-label={brandTitle ? `Navegación de ${brandTitle}` : "Navegación de afiliado"}
        className={`aff-sidebar${mobileOpen ? " open" : ""}`}
        style={{
          width: collapsed ? 76 : 248,
          flexShrink: 0,
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, rgba(12,12,18,0.95) 0%, rgba(8,8,12,0.95) 100%)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(124,58,237,0.12)",
          padding: "20px 12px",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 50,
          boxShadow: "4px 0 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px 20px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          {!collapsed && (
            <div>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>Crow</div>
              <div style={{ color: brandAccent, fontSize: "12px", fontWeight: "bold" }}>{brandSub ?? "Affiliate OS"}</div>
            </div>
          )}
          <button onClick={onToggle} aria-label={collapsed ? "Expandir menú" : "Contraer menú"} className="aff-btn hide-mobile" style={{ marginLeft: "auto", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#888", cursor: "pointer", padding: "4px 8px", fontSize: "12px" }}>
            {collapsed ? "»" : "«"}
          </button>
        </div>
        {!collapsed && (
          <div style={{ padding: "0 8px 12px", fontSize: "11px", letterSpacing: "1px", color: C.faint, fontWeight: "bold" }}>
            {brandTitle ?? "AFILIADO"}
          </div>
        )}
        <nav className="aff-premium-scroll" style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
          {navItems.map((item) => {
            const isActive = active === item.id;
            const inner = (
              <>
                <span style={{ width: "22px", textAlign: "center", fontSize: "15px" }} aria-hidden>{item.icon}</span>
                {!collapsed && <span style={{ fontSize: "14px" }}>{item.label}</span>}
              </>
            );
            const style: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "11px 12px",
              borderRadius: "12px",
              border: "none",
              boxShadow: isActive ? "inset 3px 0 0 #7c3aed, 0 4px 16px rgba(124,58,237,0.15)" : "none",
              background: isActive ? "linear-gradient(135deg, rgba(124,58,237,0.28), rgba(124,58,237,0.08))" : "transparent",
              color: isActive ? "#fff" : "#a1a1aa",
              fontWeight: isActive ? "bold" : "normal",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              fontFamily: FONT,
              textDecoration: "none",
            };
            return item.href ? (
              <Link key={item.id} href={item.href} className="aff-navitem" style={style} title={item.label}>{inner}</Link>
            ) : (
              <button key={item.id} onClick={() => onNavigate(item.id)} className="aff-navitem" aria-current={isActive ? "page" : undefined} style={style} title={item.label}>{inner}</button>
            );
          })}
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <button onClick={() => onNavigate("pagos")} className="aff-navitem" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 12px", borderRadius: "12px", border: "none", background: active === "pagos" ? "rgba(124,58,237,0.2)" : "transparent", color: "#a1a1aa", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: FONT }} title="Wallet">
            <span style={{ width: "22px", textAlign: "center" }} aria-hidden>◍</span>
            {!collapsed && (
              <span style={{ fontSize: "13px" }}>Wallet<br /><strong style={{ color: "#fff" }}>{walletSummary}</strong></span>
            )}
          </button>
          <button onClick={() => onNavigate("settings")} className="aff-navitem" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 12px", borderRadius: "12px", border: "none", background: "transparent", color: "#a1a1aa", cursor: "pointer", width: "100%", textAlign: "left", fontFamily: FONT }} title="Perfil">
            <span style={{ width: "22px", textAlign: "center" }} aria-hidden>●</span>
            {!collapsed && <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName || "Perfil"}</span>}
          </button>
        </div>
      </aside>
      <style>{`
        @media (max-width: 900px) {
          .aff-sidebar { position: fixed !important; left: 0; top: 0; transform: translateX(-100%); transition: transform 0.22s ease !important; width: 248px !important; }
          .aff-sidebar.open { transform: translateX(0); box-shadow: 20px 0 60px rgba(0,0,0,0.6); }
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </>
  );
}

export function AppHeader({
  title,
  subtitle,
  onMenu,
  unread,
  onBell,
  walletSummary,
  userName,
  onProfile,
  onWallet,
  onLogout,
}: {
  title: string;
  subtitle: string;
  onMenu: () => void;
  unread: number;
  onBell: () => void;
  walletSummary: string;
  userName: string;
  onProfile: () => void;
  onWallet: () => void;
  onLogout: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", flexWrap: "wrap", padding: "16px 20px", borderRadius: "16px", background: "rgba(12,12,18,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <button onClick={onMenu} aria-label="Abrir menú" className="aff-btn show-mobile-menu" style={{ display: "none", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "9px 13px", cursor: "pointer" }}>
        ☰
      </button>
      <div style={{ flex: 1, minWidth: "180px" }}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>{title}</h1>
        <div style={{ color: C.muted, fontSize: "13px", marginTop: "2px" }}>{subtitle}</div>
      </div>
      <button onClick={onBell} aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ""}`} className="aff-btn" style={{ position: "relative", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff", padding: "9px 13px", cursor: "pointer", fontSize: "16px" }}>
        ♪
        {unread > 0 && (
          <span style={{ position: "absolute", top: "-6px", right: "-6px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "bold", borderRadius: "10px", padding: "1px 6px" }}>
            {unread}
          </span>
        )}
      </button>
      <button onClick={onWallet} className="aff-btn hide-wallet-chip" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "12px", color: "#86efac", padding: "9px 14px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
        {walletSummary}
      </button>
      <div style={{ position: "relative" }}>
        <button onClick={() => setMenu((m) => !m)} aria-label="Menú de usuario" aria-expanded={menu} className="aff-btn" style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)", borderRadius: "12px", color: "#fff", padding: "6px 12px 6px 6px", cursor: "pointer", fontSize: "13px" }}>
          <span style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "12px" }}>
            {(userName.replace(/[^a-zA-Z0-9 ]/g, "").trim().charAt(0) || "?").toUpperCase()}
          </span>
          <span className="hide-username">{userName.split(/[@\s]/)[0] || "Afiliado"}</span>
        </button>
        {menu && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#14141c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", minWidth: "180px", zIndex: 100, overflow: "hidden" }}>
            {[
              { label: "Mi perfil", fn: onProfile },
              { label: "Mi wallet", fn: onWallet },
              { label: "Cerrar sesión", fn: onLogout },
            ].map((item) => (
              <button key={item.label} onClick={() => { setMenu(false); item.fn(); }} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ddd", padding: "12px 16px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .show-mobile-menu { display: inline-block !important; }
          .hide-wallet-chip, .hide-username { display: none !important; }
        }
      `}</style>
    </header>
  );
}
