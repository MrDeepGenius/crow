"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  countEvents,
  getCreatorProfile,
  getPublication,
  listPublications,
  saveCreatorProfile,
  savePublication,
  setPublicationStatus,
} from "@/app/services/marketplace/marketStore";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import { detectLocalProducts } from "@/app/services/marketplace/productAdapters";
import type {
  AffiliateLink,
  CreatorProfile,
  Order,
  ProductPublication,
  PublicationStatus,
  WalletTransaction,
} from "@/app/services/marketplace/marketTypes";
import { Sidebar, AppHeader } from "@/app/affiliates/components/Shell";
import { GOLD, GOLD_SOFT, creatorCardStyle, CREATOR_CSS } from "./theme";
import {
  C,
  FONT,
  GLOBAL_CSS,
  ToastProvider,
  SectionTitle,
  EmptyState,
  StatusBadge,
  SkeletonGrid,
  Avatar,
  CopyButton,
  ShareButton,
  RangeBar,
  timeAgo,
  round2,
  cardStyle,
} from "@/app/affiliates/components/ui";
import { Sparkline, AreaChart, Donut, bucketize } from "@/app/affiliates/components/charts";

type CreatorTab =
  | "inicio" | "productos" | "crear" | "marketplace" | "ventas" | "analytics"
  | "afiliados" | "wallet" | "retiros" | "recursos" | "notificaciones" | "config";
type Range = 7 | 30 | 90 | 0;

const NAV_ITEMS = [
  { id: "inicio", label: "Inicio", icon: "⌂" },
  { id: "productos", label: "Mis productos", icon: "▦" },
  { id: "crear", label: "Crear producto", icon: "+" },
  { id: "marketplace", label: "Marketplace", icon: "◈", href: "/marketplace" },
  { id: "ventas", label: "Ventas", icon: "◉" },
  { id: "analytics", label: "Analytics", icon: "▤" },
  { id: "afiliados", label: "Afiliados", icon: "◍" },
  { id: "wallet", label: "Wallet", icon: "▭" },
  { id: "retiros", label: "Retiros", icon: "↩" },
  { id: "recursos", label: "Recursos", icon: "▣" },
  { id: "notificaciones", label: "Notificaciones", icon: "♪" },
  { id: "config", label: "Configuración", icon: "⚙" },
];

const SECTION_TITLES: Record<CreatorTab, { title: string; subtitle: string }> = {
  inicio: { title: "Inicio", subtitle: "Tu ecosistema de productos" },
  productos: { title: "Mis productos", subtitle: "Tu catálogo" },
  crear: { title: "Crear producto", subtitle: "Puerta al Creator Studio" },
  marketplace: { title: "Marketplace", subtitle: "" },
  ventas: { title: "Ventas", subtitle: "Cada venta, con origen" },
  analytics: { title: "Analytics", subtitle: "Qué está funcionando" },
  afiliados: { title: "Afiliados", subtitle: "Quién vende por vos" },
  wallet: { title: "Wallet", subtitle: "Tu dinero, sin tocar reglas" },
  retiros: { title: "Retiros", subtitle: "Historial y solicitudes" },
  recursos: { title: "Recursos", subtitle: "Solo lo que realmente existe" },
  notificaciones: { title: "Notificaciones", subtitle: "Lo importante" },
  config: { title: "Configuración", subtitle: "Tu perfil de creador" },
};

export interface CreatorData {
  profile: CreatorProfile;
  mine: ProductPublication[];
  drafts: { format: string; title: string }[];
  sales: Order[];
  wallet: { available: number; pending: number; withdrawalPending: number; paidOut: number };
  txs: WalletTransaction[];
  views: number;
  links: AffiliateLink[];
}

export function useCreatorData(profile: CreatorProfile | null): CreatorData | null {
  const [data, setData] = useState<CreatorData | null>(null);
  useEffect(() => {
    if (!profile) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const m = await import("@/app/services/marketplace/marketOrders");
      const L = await import("@/app/services/marketplace/marketLedger");
      const A = await import("@/app/services/marketplace/productAdapters");
      const mine = listPublications().filter((p) => p.creatorId === profile.id);
      const ids = new Set(mine.map((p) => p.id));
      const sales = m.listOrders().filter((o) => ids.has(o.productId) && (o.status === "PAID" || o.status === "REFUNDED"));
      const views = mine.reduce((n, p) => n + countEvents("product_view", p.id), 0);
      const w = L.getWallet(profile.id);
      const txs = L.listTransactions(profile.id);
      const drafts = A.detectLocalProducts()
        .filter((d) => !mine.some((p) => p.title.trim().toLowerCase() === d.title.trim().toLowerCase()))
        .map((d) => ({ format: d.format, title: d.title }));
      const links: AffiliateLink[] = [];
      for (const p of mine) {
        try {
          const raw = window.localStorage.getItem("crow_market_affiliate_links");
          const all = raw ? (JSON.parse(raw) as AffiliateLink[]) : [];
          for (const l of all) if (l.productId === p.id) links.push(l);
        } catch {
          // sin links
        }
      }
      if (!cancelled) {
        setData({
          profile,
          mine,
          drafts,
          sales,
          wallet: { available: w.available.amount, pending: w.pending.amount, withdrawalPending: w.withdrawalPending.amount, paidOut: w.paidOut.amount },
          txs,
          views,
          links,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);
  return data;
}

export function since(range: Range): number {
  return range === 0 ? 0 : Date.now() - range * 24 * 3600 * 1000;
}

export function CreatorOsClient() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [tab, setTab] = useState<CreatorTab>("inicio");
  const [range, setRange] = useState<Range>(30);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const data = useCreatorData(profile);
  const [notifications, setNotifications] = useState<{ id: string; title: string; detail: string; timestamp: string }[]>([]);

  useEffect(() => {
    setProfile(getCreatorProfile());
  }, []);

  useEffect(() => {
    if (!profile || !data) {
      setNotifications([]);
      return;
    }
    const notes: { id: string; title: string; detail: string; timestamp: string }[] = [];
    for (const o of data.sales) {
      const p = getPublication(o.productId);
      notes.push({ id: `sale-${o.id}`, title: o.status === "PAID" ? "Nueva venta" : "Venta reembolsada", detail: `${p?.title ?? o.productId} · USD ${o.amount.amount}`, timestamp: o.paidAt ?? o.createdAt });
    }
    for (const l of data.links) {
      notes.push({ id: `aff-${l.id}`, title: "Nuevo afiliado promocionando", detail: `${getPublication(l.productId)?.title ?? l.productId}`, timestamp: l.createdAt });
    }
    for (const p of data.mine) {
      notes.push({ id: `pub-${p.id}`, title: "Producto publicado", detail: p.title, timestamp: p.publishedAt ?? p.createdAt });
    }
    notes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setNotifications(notes.slice(0, 30));
  }, [profile, data]);

  const unread = useMemo(() => {
    if (!profile) return 0;
    try {
      const readAt = window.localStorage.getItem(`crow_creator_notif_read_${profile.id}`);
      if (!readAt) return notifications.length;
      return notifications.filter((n) => n.timestamp > readAt).length;
    } catch {
      return notifications.length;
    }
  }, [notifications, profile]);

  const createProfile = (): void => {
    const clean = nameInput.trim();
    if (!clean) return;
    const username = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const created: CreatorProfile = {
      id: `creator-${username}`,
      username,
      displayName: clean,
      bio: "",
      createdAt: new Date().toISOString(),
    };
    saveCreatorProfile(created);
    setProfile(created);
  };

  const logout = (): void => {
    setProfile(null);
  };

  const navigate = (s: string): void => {
    if (s === "marketplace") return;
    setTab(s as CreatorTab);
    setSelectedProductId(null);
    setMobileOpen(false);
  };

  if (!profile) {
    return (
      <ToastProvider>
        <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div className="aff-fadein" style={{ maxWidth: "480px", width: "100%", background: "radial-gradient(120% 140% at 50% 0%, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0) 55%), #0c0c10", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "22px", padding: "36px", textAlign: "center" }}>
            <img src="/crowlogo.png" alt="Crow" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "12px" }} />
            <h1 style={{ fontSize: "26px", margin: "0 0 8px" }}>Creator <span className="creator-gold-text">OS</span></h1>
            <p style={{ color: C.muted, margin: "0 0 20px", fontSize: "14px" }}>Creá tu perfil de creador para operar (local, sin cuentas reales).</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <label htmlFor="creator-login" style={{ position: "absolute", left: "-9999px" }}>Tu nombre o marca</label>
              <input id="creator-login" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") createProfile(); }} placeholder="Tu nombre o marca" style={{ flex: 1, background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT }} />
              <button onClick={createProfile} className="aff-btn" style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Entrar
              </button>
            </div>
          </div>
        </main>
        <style>{GLOBAL_CSS + CREATOR_CSS}</style>
      </ToastProvider>
    );
  }

  const section = SECTION_TITLES[tab];
  const walletSummary = data ? `USD ${round2(data.wallet.available + data.wallet.pending)}` : "USD 0";

  return (
    <ToastProvider>
      <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex" }}>
        <Sidebar
          active={tab}
          collapsed={collapsed}
          onNavigate={navigate}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          walletSummary={walletSummary}
          userName={profile.displayName}
          accent={GOLD}
          items={[
            { id: "inicio", label: "Inicio", icon: "⌂" },
            { id: "productos", label: "Mis productos", icon: "▦" },
            { id: "crear", label: "Crear producto", icon: "+" },
            { id: "marketplace", label: "Marketplace", icon: "◈", href: "/marketplace" },
            { id: "ventas", label: "Ventas", icon: "◉" },
            { id: "analytics", label: "Analytics", icon: "▤" },
            { id: "afiliados", label: "Afiliados", icon: "◍" },
            { id: "wallet", label: "Wallet", icon: "▭" },
            { id: "retiros", label: "Retiros", icon: "↩" },
            { id: "recursos", label: "Recursos", icon: "▣" },
            { id: "notificaciones", label: "Notificaciones", icon: "♪" },
            { id: "config", label: "Configuración", icon: "⚙" },
          ]}
          brandTitle="CREADOR"
          brandSub="Creator OS"
        />
        <div style={{ flex: 1, minWidth: 0, maxWidth: "1240px", margin: "0 auto", padding: "24px clamp(16px, 3vw, 36px) 64px", width: "100%" }}>
          <AppHeader
            title={section.title}
            subtitle={section.subtitle}
            onMenu={() => setMobileOpen((m) => !m)}
            unread={unread}
            onBell={() => {
              setTab("notificaciones");
              try {
                window.localStorage.setItem(`crow_creator_notif_read_${profile.id}`, new Date().toISOString());
              } catch {
                // no bloquea
              }
            }}
            walletSummary={walletSummary}
            userName={profile.displayName}
            onProfile={() => setTab("config")}
            onWallet={() => setTab("wallet")}
          onLogout={logout}
        />
          <div key={`${tab}-${selectedProductId ?? "list"}`} className="aff-fadein" style={{ background: "radial-gradient(60% 30% at 85% 0%, rgba(232,163,61,0.05) 0%, rgba(232,163,61,0) 60%)", borderRadius: "24px" }}>
            {tab === "inicio" && <HomeTab profile={profile} data={data} go={(t) => setTab(t)} openProduct={(id) => { setSelectedProductId(id); setTab("productos"); }} />}
            {tab === "productos" && (
              <ProductsTab profile={profile} data={data} selectedId={selectedProductId} onSelect={setSelectedProductId} go={(t) => setTab(t)} />
            )}
            {tab === "crear" && <CreateTab />}
            {tab === "ventas" && <SalesTab data={data} />}
            {tab === "analytics" && <AnalyticsTab data={data} range={range} setRange={setRange} />}
            {tab === "afiliados" && <AffiliatesTab data={data} />}
            {tab === "wallet" && <WalletTabCreator data={data} />}
            {tab === "retiros" && <WithdrawalsTab profile={profile} />}
            {tab === "recursos" && <ResourcesTab />}
            {tab === "notificaciones" && <NotificationsTabCreator notifications={notifications} />}
            {tab === "config" && <ConfigTab profile={profile} onChange={() => setProfile(getCreatorProfile())} />}
          </div>
        </div>
        <style>{GLOBAL_CSS + CREATOR_CSS}</style>
      </main>
    </ToastProvider>
  );
}

// ============================================
// HELPERS COMPARTIDOS
// ============================================

export type LifecycleStage = "Borrador" | "Creando" | "Listo" | "En revisión" | "Publicado" | "Vendiendo" | "Pausado" | "Archivado";

export function lifecycleOf(p: {
  status: PublicationStatus;
  salesCount: number;
}): LifecycleStage {
  switch (p.status) {
    case "DRAFT": return "Borrador";
    case "READY": return "Listo";
    case "PENDING_REVIEW": return "En revisión";
    case "UNPUBLISHED": return "Pausado";
    case "ARCHIVED": return "Archivado";
    case "PUBLISHED": return p.salesCount > 0 ? "Vendiendo" : "Publicado";
  }
}

const LIFECYCLE_ORDER: LifecycleStage[] = ["Borrador", "Creando", "Listo", "En revisión", "Publicado", "Vendiendo"];

export function LifecycleStepper({ stage }: { stage: LifecycleStage }) {
  const idx = LIFECYCLE_ORDER.indexOf(stage === "Pausado" || stage === "Archivado" ? "Publicado" : stage);
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }} aria-label={`Estado: ${stage}`}>
      {LIFECYCLE_ORDER.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: i <= idx ? "bold" : "normal",
              padding: "4px 10px",
              borderRadius: "10px",
              background: i < idx ? "rgba(34,197,94,0.15)" : i === idx ? "rgba(232,163,61,0.22)" : "rgba(255,255,255,0.04)",
              color: i < idx ? "#22c55e" : i === idx ? "#fff" : "#63636b",
            }}
          >
            {s}
          </span>
          {i < LIFECYCLE_ORDER.length - 1 && <span style={{ color: "#444" }}>→</span>}
        </div>
      ))}
    </div>
  );
}

export function ProductStatusBadge({ status }: { status: string }) {
  const color =
    status === "PUBLISHED" || status === "Vendiendo" ? "#22c55e"
    : status === "READY" || status === "Listo" ? "#38bdf8"
    : status === "PENDING_REVIEW" || status === "En revisión" ? "#f59e0b"
    : status === "UNPUBLISHED" || status === "Pausado" || status === "ARCHIVED" ? "#63636b"
    : "#a855f7";
  return (
    <span style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color }}>
      {status}
    </span>
  );
}

// ============================================
// INICIO
// ============================================

function HomeTab({
  profile,
  data,
  go,
  openProduct,
}: {
  profile: CreatorProfile;
  data: CreatorData | null;
  go: (t: "productos" | "crear" | "ventas" | "analytics" | "afiliados") => void;
  openProduct: (id: string) => void;
}) {
  const [range, setRange] = useState<Range>(30);
  if (!data) {
    return (
      <div>
        <SkeletonGrid />
        <div style={{ marginTop: "16px" }}><SkeletonGrid /></div>
      </div>
    );
  }
  const cutoff = since(range);
  const sales = data.sales.filter((o) => o.status === "PAID" && new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
  const revenue = round2(sales.reduce((n, o) => n + o.creatorShare.amount, 0));
  const prev = data.sales.filter((o) => {
    const t = new Date(o.paidAt ?? o.createdAt).getTime();
    const span = range === 0 ? 0 : range * 24 * 3600 * 1000;
    return o.status === "PAID" && range !== 0 && t < cutoff && t >= cutoff - span;
  });
  const prevRevenue = prev.reduce((n, o) => n + o.creatorShare.amount, 0);
  const growth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 10) / 10 : revenue > 0 ? 100 : null;
  const firstName = profile.displayName.split(/[@\s]/)[0] || "Creador";
  const buckets = range === 7 ? 7 : 15;
  const salesB = bucketize(sales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: 1 })), range, buckets);
  const revB = bucketize(sales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: o.creatorShare.amount })), range, buckets);
  const featured = [...data.mine].sort((a, b) => {
    const sa = data.sales.filter((o) => o.productId === a.id && o.status === "PAID").length;
    const sb = data.sales.filter((o) => o.productId === b.id && o.status === "PAID").length;
    return sb - sa;
  })[0];
  const featuredSales = featured ? data.sales.filter((o) => o.productId === featured.id && o.status === "PAID") : [];
  const featuredAff = data.links.filter((l) => l.productId === featured?.id).length;

  return (
    <div className="aff-fadein">
      <div className="creator-hero" style={{ marginBottom: "20px", padding: "26px clamp(18px, 3vw, 32px)" }}>
        <div style={{ color: GOLD_SOFT, fontSize: "12px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "6px" }}>CREATOR OS</div>
        <h1 style={{ fontSize: "clamp(26px, 3.6vw, 34px)", margin: "0 0 4px" }}>Hola, <span className="creator-gold-text">{firstName}</span>.</h1>
        <p style={{ color: C.muted, margin: "0 0 6px", fontSize: "14px" }}>Tu ecosistema de productos está creciendo.</p>
        <p style={{ margin: "0 0 14px", fontSize: "14px", color: growth === null ? C.faint : growth >= 0 ? C.green : C.red }}>
          {growth === null
            ? "Todavía no hay suficiente historial para comparar períodos."
            : `Tus ingresos ${growth >= 0 ? "crecieron" : "bajaron"} un ${Math.abs(growth)}% vs el período anterior.`}
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/create" className="aff-btn" style={{ padding: "12px 22px", borderRadius: "12px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "14px" }}>
            Crear producto
          </Link>
          <button onClick={() => go("ventas")} className="aff-btn" style={{ padding: "12px 22px", borderRadius: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontSize: "14px" }}>
            Ver ventas
          </button>
          <Link href="/marketplace" className="aff-btn" style={{ padding: "12px 22px", borderRadius: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", textDecoration: "none", fontSize: "14px" }}>
            Abrir Marketplace
          </Link>
          <button onClick={() => go("analytics")} className="aff-btn" style={{ padding: "12px 22px", borderRadius: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontSize: "14px" }}>
            Ver Analytics
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "16px" }}>
        <div className="aff-card" style={{ ...creatorCardStyle, background: "linear-gradient(135deg, rgba(232,163,61,0.16) 0%, rgba(124,58,237,0.10) 55%, rgba(124,58,237,0.02) 100%), #101016" }}>
          <div style={{ color: GOLD_SOFT, fontSize: "12px", marginBottom: "4px", fontWeight: "bold", letterSpacing: "1px" }}>INGRESOS</div>
          <div style={{ fontSize: "26px", fontWeight: "bold" }}>${revenue.toLocaleString("es")}</div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: C.muted, marginTop: "8px" }}>
            <span>Disponible <strong style={{ color: "#fff" }}>${data.wallet.available}</strong></span>
            <span>Pendiente <strong style={{ color: "#fff" }}>${data.wallet.pending}</strong></span>
            <span>Pagado <strong style={{ color: "#fff" }}>${data.wallet.paidOut}</strong></span>
          </div>
          <button onClick={() => go("ventas")} style={{ background: "transparent", border: "none", color: C.violetSoft, cursor: "pointer", fontSize: "12px", marginTop: "8px", padding: 0 }}>
            Ver wallet →
          </button>
        </div>
        <KpiMini label="Ventas" value={String(sales.length)} spark={salesB.points} color={GOLD} />
        <KpiMini label="Productos" value={`${data.mine.length} publicados · ${data.drafts.length} en creación`} spark={[]} color={C.green} />
        <KpiMini label="Afiliados promoviendo" value={String(new Set(data.links.map((l) => l.affiliateId)).size)} spark={[]} color={C.violetSoft} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "16px" }} className="home-grid">
        <div className="aff-card" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ fontSize: "16px", margin: 0 }}>Rendimiento</h2>
            <RangeBar range={range} setRange={setRange} />
          </div>
          {salesB.points.every((v) => v === 0) && revB.points.every((v) => v === 0) ? (
            <EmptyState title="Sin datos todavía" detail="Tus ventas e ingresos aparecerán aquí cuando vendas." />
          ) : (
            <AreaChart
              series={[
                { label: "Ventas", color: GOLD, points: salesB.points },
                { label: "Ingresos", color: C.violetSoft, points: revB.points },
              ]}
              labels={revB.labels}
            />
          )}
        </div>
          <div className="aff-card" style={{ ...cardStyle, border: "1px solid rgba(232,163,61,0.28)", background: "radial-gradient(120% 120% at 100% 0%, rgba(232,163,61,0.10) 0%, rgba(232,163,61,0) 50%), #101016" }}>
          <SectionTitle title="Producto destacado" />
          {!featured ? (
            <EmptyState title="Sin productos todavía" detail="Creá tu primer producto con Crow AI." action={<Link href="/create" style={{ color: C.violetSoft, fontSize: "13px" }}>Crear ahora →</Link>} />
          ) : (
            <>
              <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "4px" }}>{featured.title}</div>
              <div style={{ color: C.muted, fontSize: "13px", marginBottom: "6px" }}>
                {featuredSales.length} ventas · USD {round2(featuredSales.reduce((n, o) => n + o.creatorShare.amount, 0))} ingresos
              </div>
              <div style={{ color: C.muted, fontSize: "13px", marginBottom: "12px" }}>
                {featuredAff} afiliado(s) promocionándolo
                {featured.ratingCount > 0 ? ` · ${round2(featured.ratingSum / featured.ratingCount)} rating` : " · Sin ratings todavía"}
              </div>
              <button onClick={() => openProduct(featured.id)} className="aff-btn" style={{ padding: "10px 18px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                Gestionar producto
              </button>
            </>
          )}
        </div>
      </div>

      <div className="aff-card" style={cardStyle}>
        <SectionTitle title="Actividad" />
        <CreatorActivity data={data} limit={6} />
      </div>
      <style>{`
        @media (max-width: 1000px) { .home-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function KpiMini({ label, value, spark, color }: { label: string; value: string; spark: number[]; color: string }) {
  return (
    <div className="aff-card" style={{ ...cardStyle, display: "flex", gap: "12px", alignItems: "center" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.muted, fontSize: "12px" }}>{label}</div>
        <div style={{ fontSize: "22px", fontWeight: "bold" }}>{value}</div>
      </div>
      <Sparkline points={spark} color={color} width={84} height={34} />
    </div>
  );
}

function CreatorActivity({ data, limit }: { data: CreatorData; limit: number }) {
  const items: { id: string; text: string; time: string; ts: string }[] = [];
  for (const o of data.sales) {
    const p = data.mine.find((x) => x.id === o.productId);
    items.push({
      id: `sale-${o.id}`,
      text: o.status === "PAID" ? `Nueva venta: ${p?.title ?? o.productId} (USD ${o.amount.amount})` : `Reembolso: ${p?.title ?? o.productId}`,
      time: timeAgo(o.paidAt ?? o.createdAt),
      ts: o.paidAt ?? o.createdAt,
    });
  }
  for (const p of data.mine) {
    items.push({ id: `pub-${p.id}`, text: `Producto publicado: ${p.title}`, time: timeAgo(p.publishedAt ?? p.createdAt), ts: p.publishedAt ?? p.createdAt });
  }
  items.sort((a, b) => b.ts.localeCompare(a.ts));
  const shown = items.slice(0, limit);
  if (shown.length === 0) {
    return <EmptyState title="Sin actividad todavía" detail="Tus ventas y publicaciones aparecerán aquí." />;
  }
  return (
    <div>
      {shown.map((it) => (
        <div key={it.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
          <div>{it.text}</div>
          <div style={{ color: C.faint, fontSize: "12px" }}>{it.time}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MIS PRODUCTOS + CENTRO DE PRODUCTO
// ============================================

const FORMAT_LABELS: Record<string, string> = {
  course: "Curso",
  interactive_web: "Web interactiva",
  pdf: "PDF",
  ebook: "Ebook",
  kit: "Kit",
};

function productMetrics(productId: string, data: CreatorData): { sales: number; revenue: number; promoters: number; views: number } {
  const sales = data.sales.filter((o) => o.productId === productId && o.status === "PAID");
  return {
    sales: sales.length,
    revenue: round2(sales.reduce((n, o) => n + o.creatorShare.amount, 0)),
    promoters: new Set(data.links.filter((l) => l.productId === productId).map((l) => l.affiliateId)).size,
    views: countViews(productId),
  };
}

function countViews(productId: string): number {
  try {
    const raw = window.localStorage.getItem("crow_market_events");
    if (!raw) return 0;
    return (JSON.parse(raw) as { type: string; productId: string | null }[]).filter(
      (e) => e.type === "product_view" && e.productId === productId
    ).length;
  } catch {
    return 0;
  }
}

function ProductsTab({
  profile,
  data,
  selectedId,
  onSelect,
  go,
}: {
  profile: CreatorProfile;
  data: CreatorData | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  go: (t: "crear" | "analytics" | "ventas") => void;
}) {
  void profile;
  if (!data) return <SkeletonGrid />;
  const selected = data.mine.find((p) => p.id === selectedId) ?? null;
  if (selected) {
    return <ProductCenter productId={selected.id} data={data} onBack={() => onSelect(null)} go={go} />;
  }
  return (
    <div>
      <SectionTitle title="Tu catálogo" />
      {data.mine.length === 0 && data.drafts.length === 0 ? (
        <EmptyState
          title="Sin productos todavía"
          detail="Creá tu primer producto con Crow AI."
          action={<Link href="/create" style={{ color: C.violetSoft, fontSize: "13px" }}>Crear ahora →</Link>}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "14px" }}>
          {data.drafts.map((d) => (
            <div key={`draft-${d.title}`} className="aff-card" style={{ ...cardStyle, opacity: 0.85 }}>
              <ProductStatusBadge status="Creando" />
              <div style={{ fontWeight: "bold", fontSize: "15px", margin: "8px 0 4px" }}>{d.title}</div>
              <div style={{ color: C.muted, fontSize: "12px", marginBottom: "12px" }}>{FORMAT_LABELS[d.format] ?? d.format} · en Creator Studio</div>
              <Link href="/create" className="aff-btn" style={{ display: "inline-block", padding: "9px 16px", borderRadius: "10px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "12px" }}>
                Continuar creando
              </Link>
            </div>
          ))}
          {data.mine.map((p) => {
            const m = productMetrics(p.id, data);
            return (
              <div key={p.id} className="aff-card" style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <ProductStatusBadge status={lifecycleOf({ status: p.status, salesCount: m.sales })} />
                  <span style={{ color: C.faint, fontSize: "11px" }}>{FORMAT_LABELS[p.format] ?? p.format}</span>
                </div>
                <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "4px" }}>{p.title}</div>
                <div style={{ color: C.muted, fontSize: "13px", marginBottom: "6px" }}>
                  USD {p.price.amount} · {m.sales} ventas · USD {m.revenue}
                </div>
                <div style={{ color: C.faint, fontSize: "12px", marginBottom: "12px" }}>
                  {p.ratingCount > 0 ? `${round2(p.ratingSum / p.ratingCount)} rating` : "Sin ratings todavía"} · {m.promoters} afiliado(s)
                </div>
                <button onClick={() => onSelect(p.id)} className="aff-btn" style={{ padding: "9px 16px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                  Gestionar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductCenter({
  productId,
  data,
  onBack,
  go,
}: {
  productId: string;
  data: CreatorData;
  onBack: () => void;
  go: (t: "crear" | "analytics" | "ventas") => void;
}) {
  const [tick, setTick] = useState(0);
  void tick;
  const product = data.mine.find((p) => p.id === productId);
  if (!product) {
    return (
      <div>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "13px", marginBottom: "12px" }}>← Volver</button>
        <EmptyState title="Producto no encontrado" detail="Es posible que haya sido eliminado." />
      </div>
    );
  }
  const m = productMetrics(product.id, data);
  const stage = lifecycleOf({ status: product.status, salesCount: m.sales });
  const avg = product.ratingCount > 0 ? round2(product.ratingSum / product.ratingCount) : null;
  const togglePublish = (): void => {
    if (product.creatorId !== data.profile.id) return;
    setPublicationStatus(product.id, product.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED");
    product.status = product.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    product.updatedAt = new Date().toISOString();
    setTick((t) => t + 1);
  };
  void go;
  return (
    <div className="aff-fadein">
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "13px", marginBottom: "12px" }}>← Volver al catálogo</button>
      <div className="aff-card" style={{ ...cardStyle, marginBottom: "14px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "22px", margin: 0, flex: 1, minWidth: "200px" }}>{product.title}</h2>
          <ProductStatusBadge status={stage} />
        </div>
        <div style={{ color: C.muted, fontSize: "13px", marginBottom: "14px" }}>
          {FORMAT_LABELS[product.format] ?? product.format} · USD {product.price.amount} · {product.category}
        </div>
        <LifecycleStepper stage={stage} />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          <Link href={`/marketplace/product/${product.slug}`} className="aff-btn" style={{ padding: "10px 18px", borderRadius: "10px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "13px" }}>
            Ver Marketplace
          </Link>
          {(product.status === "PUBLISHED" || product.status === "UNPUBLISHED") && (
            <button onClick={togglePublish} className="aff-btn" style={{ padding: "10px 18px", borderRadius: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", cursor: "pointer", fontSize: "13px" }}>
              {product.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "14px" }}>
        <MiniStat2 label="Ventas" value={String(m.sales)} />
        <MiniStat2 label="Ingresos" value={`USD ${m.revenue}`} />
        <MiniStat2 label="Afiliados" value={String(m.promoters)} />
        <MiniStat2 label="Rating" value={avg !== null ? String(avg) : "Sin datos"} />
        <MiniStat2 label="Visitas" value={String(m.views)} />
      </div>
      <div className="aff-card" style={{ ...cardStyle, marginBottom: "14px" }}>
        <SectionTitle title="Cómo está funcionando" />
        <Opportunities productId={product.id} data={data} />
      </div>
      <div className="aff-card" style={cardStyle}>
        <SectionTitle title="Últimas ventas" />
        {data.sales.filter((o) => o.productId === product.id).length === 0 ? (
          <div style={{ color: C.muted, fontSize: "14px" }}>Sin ventas todavía.</div>
        ) : (
          data.sales
            .filter((o) => o.productId === product.id)
            .slice(0, 5)
            .map((o) => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "13px", flexWrap: "wrap", gap: "8px" }}>
                <span>{o.createdAt.slice(0, 10)} {o.affiliateId ? "· por afiliado" : "· directa"}</span>
                <span style={{ color: "#ddd" }}>USD {o.amount.amount} · {o.status}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function MiniStat2({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ color: C.faint, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

// ============================================
// CREAR PRODUCTO (puerta al Creator Studio)
// ============================================

const FORMAT_CARDS = [
  { format: "Curso", desc: "Construí una experiencia de aprendizaje completa.", href: "/create" },
  { format: "Ebook", desc: "Creá un producto editorial premium.", href: "/create" },
  { format: "PDF", desc: "Guías y documentos profesionales.", href: "/create" },
  { format: "Web interactiva", desc: "Convertí tu conocimiento en una experiencia interactiva.", href: "/create" },
  { format: "Kit", desc: "Entregá recursos listos para usar.", href: "/create" },
];

function CreateTab() {
  return (
    <div>
      <div className="aff-card" style={{ ...cardStyle, marginBottom: "16px", background: "linear-gradient(120deg, rgba(232,163,61,0.16) 0%, rgba(124,58,237,0.20) 55%, rgba(124,58,237,0.05) 100%)", border: "1px solid rgba(232,163,61,0.22)" }}>
        <h2 style={{ fontSize: "20px", margin: "0 0 6px" }}>Crear con <span className="creator-gold-text">Crow AI</span></h2>
        <p style={{ color: "#d8ccf5", fontSize: "14px", margin: "0 0 14px" }}>Contale a Crow qué querés crear.</p>
        <Link href="/create" className="aff-btn" style={{ display: "inline-block", padding: "12px 24px", borderRadius: "12px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "14px" }}>
          Comenzar
        </Link>
      </div>
      <SectionTitle title="Crear nuevo producto" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
        {FORMAT_CARDS.map((f) => (
          <Link key={f.format} href={f.href} className="aff-card" style={{ ...cardStyle, textDecoration: "none", color: "#fff", display: "block" }}>
            <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "6px" }}>{f.format}</div>
            <div style={{ color: C.muted, fontSize: "13px" }}>{f.desc}</div>
          </Link>
        ))}
      </div>
      <p style={{ color: C.faint, fontSize: "12px", marginTop: "12px" }}>
        La generación sigue ocurriendo en Creator Studio; este panel es la puerta de entrada.
      </p>
    </div>
  );
}

// ============================================
// VENTAS
// ============================================

function SalesTab({ data }: { data: CreatorData | null }) {
  const [range, setRange] = useState<Range>(30);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  if (!data) return <SkeletonGrid />;
  const cutoff = since(range);
  const paid = data.sales.filter((o) => o.status === "PAID" && new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
  const direct = paid.filter((o) => !o.affiliateId);
  const affiliated = paid.filter((o) => !!o.affiliateId);
  const revenue = round2(paid.reduce((n, o) => n + o.creatorShare.amount, 0));
  const ticket = paid.length > 0 ? round2(paid.reduce((n, o) => n + o.amount.amount, 0) / paid.length) : 0;
  const q = search.trim().toLowerCase();
  const rows = data.sales
    .filter((o) => (stateFilter === "ALL" || o.status === stateFilter) && new Date(o.createdAt).getTime() >= (range === 0 ? 0 : cutoff))
    .filter((o) => {
      if (!q) return true;
      const p = data.mine.find((x) => x.id === o.productId);
      return (p?.title ?? "").toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <RangeBar range={range} setRange={setRange} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", margin: "16px 0 20px" }}>
        <MiniStat2 label="Ventas totales" value={String(paid.length)} />
        <MiniStat2 label="Ingresos (90/50)" value={`USD ${revenue}`} />
        <MiniStat2 label="Ticket promedio" value={`USD ${ticket}`} />
        <MiniStat2 label="Directas" value={String(direct.length)} />
        <MiniStat2 label="Por afiliados" value={String(affiliated.length)} />
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por producto u orden..." aria-label="Buscar ventas" style={{ flex: 1, minWidth: "200px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 14px", fontSize: "13px", fontFamily: FONT }} />
        {(["ALL", "PENDING", "PAID", "REFUNDED"] as const).map((s) => (
          <button key={s} onClick={() => setStateFilter(s)} style={{ padding: "8px 14px", borderRadius: "8px", border: stateFilter === s ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: stateFilter === s ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "12px" }}>
            {s === "ALL" ? "Todas" : s === "PAID" ? "Pagadas" : s === "PENDING" ? "Pendientes" : "Reembolsadas"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Sin ventas todavía" detail="Tus ventas aparecerán aquí con origen y estado." />
      ) : (
        <div className="sales-table">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "680px" }}>
            <thead>
              <tr style={{ color: C.faint, textAlign: "left" }}>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Fecha</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Producto</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Orden</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Monto</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Origen</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px", color: C.muted }}>{(o.paidAt ?? o.createdAt).slice(0, 16).replace("T", " ")}</td>
                  <td style={{ padding: "8px" }}>{data.mine.find((x) => x.id === o.productId)?.title ?? o.productId}</td>
                  <td style={{ padding: "8px", color: C.faint }}>{o.id.slice(-8)}</td>
                  <td style={{ padding: "8px" }}>USD {o.amount.amount}</td>
                  <td style={{ padding: "8px", color: C.muted }}>{o.affiliateId ? "Afiliado" : "Directa"}</td>
                  <td style={{ padding: "8px" }}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`
        .sales-table { overflow-x: auto; }
        @media (max-width: 700px) {
          .sales-table table, .sales-table tbody, .sales-table tr, .sales-table td { display: block; width: 100%; }
          .sales-table thead { display: none; }
          .sales-table tr { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 10px; padding: 6px 10px; }
          .sales-table td { border: none !important; padding: 4px 8px !important; }
        }
      `}</style>
    </div>
  );

  function RangeBar({ range, setRange }: { range: Range; setRange: (r: Range) => void }) {
    return (
      <div style={{ display: "flex", gap: "6px" }} role="group" aria-label="Rango de fechas">
        {([7, 30, 90, 0] as Range[]).map((v) => (
          <button key={v} onClick={() => setRange(v)} aria-pressed={range === v} style={{ padding: "7px 13px", borderRadius: "9px", border: range === v ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)", background: range === v ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", fontSize: "12px" }}>
            {v === 0 ? "Todo" : `${v}D`}
          </button>
        ))}
      </div>
    );
  }
}

// ============================================
// ANALYTICS
// ============================================

function AnalyticsTab({ data, range, setRange }: { data: CreatorData | null; range: Range; setRange: (r: Range) => void }) {
  if (!data) return <SkeletonGrid />;
  const cutoff = since(range);
  const sales = data.sales.filter((o) => o.status === "PAID" && new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
  const revenue = round2(sales.reduce((n, o) => n + o.creatorShare.amount, 0));
  const ticket = sales.length > 0 ? round2(sales.reduce((n, o) => n + o.amount.amount, 0) / sales.length) : 0;
  const buckets = range === 7 ? 7 : 15;
  const salesB = bucketize(sales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: 1 })), range, buckets);
  const revB = bucketize(sales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: o.creatorShare.amount })), range, buckets);
  const byProduct = data.mine.map((p) => {
    const ps = sales.filter((o) => o.productId === p.id);
    const views = countViews(p.id);
    return {
      id: p.id,
      title: p.title,
      sales: ps.length,
      revenue: round2(ps.reduce((n, o) => n + o.creatorShare.amount, 0)),
      conversion: views > 0 ? Math.round((ps.length / views) * 1000) / 10 : 0,
      promoters: new Set(data.links.filter((l) => l.productId === p.id).map((l) => l.affiliateId)).size,
      views,
    };
  });
  const hasData = sales.length > 0 || data.views > 0;
  return (
    <div>
      <RangeBar range={range} setRange={setRange} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", margin: "16px 0 20px" }}>
        <MiniStat2 label="Ingresos" value={`USD ${revenue}`} />
        <MiniStat2 label="Ventas" value={String(sales.length)} />
        <MiniStat2 label="Ticket promedio" value={`USD ${ticket}`} />
        <MiniStat2 label="Directas" value={String(sales.filter((o) => !o.affiliateId).length)} />
        <MiniStat2 label="Por afiliados" value={String(sales.filter((o) => !!o.affiliateId).length)} />
      </div>
      {!hasData ? (
        <EmptyState title="Sin datos todavía" detail="Vende tu primer producto y verás tus gráficos aquí." />
      ) : (
        <div className="aff-card" style={{ ...cardStyle, marginBottom: "16px" }}>
          <h3 style={{ fontSize: "15px", margin: "0 0 12px" }}>Ventas e ingresos</h3>
          <AreaChart
            series={[
              { label: "Ventas", color: GOLD_SOFT, points: salesB.points },
              { label: "Ingresos", color: C.violetSoft, points: revB.points },
            ]}
            labels={revB.labels}
          />
        </div>
      )}
      <div className="aff-card" style={cardStyle}>
        <SectionTitle title="Ranking de productos" />
        {byProduct.every((p) => p.sales === 0 && p.views === 0) ? (
          <div style={{ color: C.muted, fontSize: "14px" }}>Sin datos todavía.</div>
        ) : (
          <>
            <RankingRow label="Más vendido" value={topBy(byProduct, (p) => p.sales, (p) => `${p.sales} ventas`)} />
            <RankingRow label="Mayor ingreso" value={topBy(byProduct, (p) => p.revenue, (p) => `USD ${p.revenue}`)} />
            <RankingRow label="Mayor conversión" value={topBy(byProduct.filter((p) => p.views >= 5), (p) => p.conversion, (p) => `${p.conversion}% (${p.views} visitas)`)} empty="Se necesitan 5+ visitas por producto" />
            <RankingRow label="Más promocionado" value={topBy(byProduct, (p) => p.promoters, (p) => `${p.promoters} afiliado(s)`)} />
          </>
        )}
      </div>
    </div>
  );
}

function topBy<T>(items: T[], score: (t: T) => number, fmt: (t: T) => string): string {
  if (items.length === 0) return "";
  const best = [...items].sort((a, b) => score(b) - score(a))[0];
  if (score(best) <= 0) return "";
  const anyBest = best as { title?: string };
  return `${anyBest.title ?? ""} — ${fmt(best)}`;
}

function RankingRow({ label, value, empty }: { label: string; value: string; empty?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap" }}>
      <span style={{ color: C.muted }}>{label}</span>
      <strong>{value || empty || "Sin datos todavía"}</strong>
    </div>
  );
}

// ============================================
// AFILIADOS DEL CREADOR (solo lectura, sin aprobación inventada)
// ============================================

function AffiliatesTab({ data }: { data: CreatorData | null }) {
  if (!data) return <SkeletonGrid />;
  const byAff = new Map<string, { sales: number; volume: number; products: Set<string>; first: string }>();
  for (const l of data.links) {
    const e = byAff.get(l.affiliateId) ?? { sales: 0, volume: 0, products: new Set<string>(), first: l.createdAt };
    e.products.add(l.productId);
    if (l.createdAt < e.first) e.first = l.createdAt;
    byAff.set(l.affiliateId, e);
  }
  for (const o of data.sales) {
    if (o.status !== "PAID" || !o.affiliateId) continue;
    const e = byAff.get(o.affiliateId);
    if (!e) continue;
    e.sales += 1;
    e.volume = round2(e.volume + o.amount.amount);
  }
  const rows = [...byAff.entries()].map(([affiliateId, v]) => ({ affiliateId, ...v }));
  const [detail, setDetail] = useState<string | null>(null);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <MiniStat2 label="Afiliados promoviendo" value={String(rows.length)} />
        <MiniStat2 label="Ventas por afiliados" value={String(rows.reduce((n, r) => n + r.sales, 0))} />
        <MiniStat2 label="Volumen por afiliados" value={`USD ${round2(rows.reduce((n, r) => n + r.volume, 0))}`} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Sin afiliados todavía" detail="Cuando un afiliado promocione tus productos, aparecerá aquí." />
      ) : detail ? (
        <AffiliateDetail affiliateId={detail} data={data} onBack={() => setDetail(null)} />
      ) : (
        rows.map((r) => (
          <button key={r.affiliateId} onClick={() => setDetail(r.affiliateId)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", marginBottom: "8px", fontFamily: FONT }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Avatar name={r.affiliateId} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{shortId(r.affiliateId)}</div>
                <div style={{ color: C.muted, fontSize: "12px" }}>{r.sales} ventas · USD {r.volume} · desde {r.first.slice(0, 10)}</div>
              </div>
              <StatusBadge status={r.sales > 0 ? "ACTIVO" : "NUEVO"} />
            </div>
          </button>
        ))
      )}
      <p style={{ color: C.faint, fontSize: "12px", marginTop: "12px" }}>
        El sistema actual no requiere aprobación: cualquier afiliado puede promocionar. Solo lectura aquí.
      </p>
    </div>
  );
}

function AffiliateDetail({ affiliateId, data, onBack }: { affiliateId: string; data: CreatorData; onBack: () => void }) {
  const links = data.links.filter((l) => l.affiliateId === affiliateId);
  const sales = data.sales.filter((o) => o.affiliateId === affiliateId && o.status === "PAID");
  const volume = round2(sales.reduce((n, o) => n + o.amount.amount, 0));
  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "13px", marginBottom: "12px" }}>← Volver</button>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
        <Avatar name={affiliateId} size={48} />
        <div>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{shortId(affiliateId)}</div>
          <div style={{ color: C.muted, fontSize: "12px" }}>Afiliado · solo lectura</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <MiniStat2 label="Ventas" value={String(sales.length)} />
        <MiniStat2 label="Volumen" value={`USD ${volume}`} />
        <MiniStat2 label="Productos" value={String(new Set(links.map((l) => l.productId)).size)} />
      </div>
      <h4 style={{ fontSize: "15px", margin: "0 0 10px" }}>Por producto</h4>
      {links.length === 0 ? (
        <div style={{ color: C.muted, fontSize: "14px" }}>Sin promociones registradas.</div>
      ) : (
        links.map((l) => {
          const p = data.mine.find((x) => x.id === l.productId);
          const ps = sales.filter((o) => o.productId === l.productId);
          return (
            <div key={l.id} style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
              <div style={{ fontWeight: "bold" }}>{p?.title ?? l.productId}</div>
              <div style={{ color: C.muted, fontSize: "12px", marginTop: "4px" }}>
                {ps.length} ventas · USD {round2(ps.reduce((n, o) => n + o.amount.amount, 0))} · desde {l.createdAt.slice(0, 10)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function shortId(id: string): string {
  return id.length > 18 ? `${id.slice(0, 10)}…${id.slice(-4)}` : id;
}

// ============================================
// WALLET + RETIROS (visualización y solicitud, mismas reglas)
// ============================================

function WalletTabCreator({ data }: { data: CreatorData | null }) {
  if (!data) return <SkeletonGrid />;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <MiniStat2 label="Disponible" value={`USD ${data.wallet.available}`} />
        <MiniStat2 label="Pendiente" value={`USD ${data.wallet.pending}`} />
        <MiniStat2 label="En retiro" value={`USD ${data.wallet.withdrawalPending}`} />
        <MiniStat2 label="Pagado" value={`USD ${data.wallet.paidOut}`} />
      </div>
      <div className="aff-card" style={cardStyle}>
        <SectionTitle title="Movimientos" />
        {data.txs.length === 0 ? (
          <div style={{ color: C.muted, fontSize: "14px" }}>Sin movimientos. Cada venta genera su registro.</div>
        ) : (
          data.txs.slice().reverse().slice(0, 20).map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "13px", flexWrap: "wrap", gap: "8px" }}>
              <span>{t.type} <span style={{ color: C.faint }}>· {t.status} · {t.createdAt.slice(0, 10)}</span></span>
              <span style={{ color: t.amount.amount < 0 ? C.red : C.green, fontWeight: "bold" }}>
                {t.amount.amount < 0 ? "" : "+"}USD {t.amount.amount}
              </span>
            </div>
          ))
        )}
      </div>
      <p style={{ color: C.faint, fontSize: "12px", marginTop: "12px" }}>
        Los balances se calculan del ledger. Nada aquí es editable.
      </p>
    </div>
  );
}

function WithdrawalsTab({ profile }: { profile: CreatorProfile }) {
  const [list, setList] = useState<{ id: string; amount: number; method: string; status: string; date: string }[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"USDT_BEP20" | "USDT_TRC20">("USDT_BEP20");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [available, setAvailable] = useState(0);
  const refresh = (): void => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      setAvailable(L.getWallet(profile.id).available.amount);
      setList(L.listWithdrawals(profile.id).slice().reverse().map((x) => ({ id: x.id, amount: x.amount.amount, method: x.method, status: x.status, date: x.createdAt.slice(0, 10) })));
    });
  };
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  const submit = (): void => {
    setError(null);
    setOk(false);
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const r = L.requestWithdrawal(profile.id, Number(amount), method, address);
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setOk(true);
      setAmount("");
      setAddress("");
      refresh();
    });
  };
  return (
    <div>
      <div className="aff-card" style={{ ...cardStyle, marginBottom: "16px" }}>
        <div style={{ color: C.muted, fontSize: "12px" }}>Disponible para retirar</div>
        <div style={{ fontSize: "26px", fontWeight: "bold", margin: "4px 0 14px" }}>USD {available}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          <div>
            <label htmlFor="c-amount" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Monto USD (mín. 25, fee 2%)</label>
            <input id="c-amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={{ width: "100%", boxSizing: "border-box", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", fontFamily: FONT }} />
          </div>
          <div>
            <label htmlFor="c-net" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Red</label>
            <select id="c-net" value={method} onChange={(e) => setMethod(e.target.value as "USDT_BEP20" | "USDT_TRC20")} style={{ width: "100%", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", fontFamily: FONT }}>
              <option value="USDT_BEP20">USDT BEP20</option>
              <option value="USDT_TRC20">USDT TRC20</option>
            </select>
          </div>
        </div>
        <label htmlFor="c-addr" style={{ display: "block", color: C.muted, fontSize: "11px", margin: "10px 0 4px" }}>Dirección</label>
        <input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de tu wallet" style={{ width: "100%", boxSizing: "border-box", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", marginBottom: "12px", fontFamily: FONT }} />
        {error && <div style={{ color: C.red, fontSize: "13px", marginBottom: "8px" }}>{error}</div>}
        {ok && <div style={{ color: C.green, fontSize: "13px", marginBottom: "8px" }}>Retiro solicitado. Queda en revisión.</div>}
        <button onClick={submit} className="aff-btn" style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Solicitar retiro
        </button>
      </div>
      <h3 style={{ fontSize: "15px", margin: "0 0 10px" }}>Historial</h3>
      {list.length === 0 ? (
        <div style={{ color: C.muted, fontSize: "14px" }}>Sin retiros solicitados.</div>
      ) : (
        list.map((w) => (
          <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap", gap: "8px" }}>
            <span>USD {w.amount} <span style={{ color: C.faint }}>· {w.method} · {w.date}</span></span>
            <StatusBadge status={w.status} />
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// RECURSOS (solo lo que realmente existe)
// ============================================

function ResourcesTab() {
  const [items, setItems] = useState<{ id: string; title: string; kind: string; detail: string; action: () => void; actionLabel: string }[]>([]);
  useEffect(() => {
    const found: { id: string; title: string; kind: string; detail: string; action: () => void; actionLabel: string }[] = [];
    try {
      const kitRaw = window.localStorage.getItem("crow_last_kit");
      if (kitRaw) {
        const kit = JSON.parse(kitRaw) as { name: string; stats: { totalResources: number } };
        found.push({
          id: "kit",
          title: kit.name,
          kind: "Kit de recursos",
          detail: `${kit.stats.totalResources} recursos descargables`,
          action: () => { window.location.href = "/create/builder/kit"; },
          actionLabel: "Abrir kit",
        });
      }
      for (const [key, kind, label] of [["crow_last_pdf", "PDF", "Descargar"], ["crow_last_ebook", "Ebook", "Descargar"]] as const) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const p = JSON.parse(raw) as { metadata: { title: string } };
        found.push({
          id: key,
          title: p.metadata.title,
          kind,
          detail: "Documento exportable",
          action: () => {
            window.location.href = key === "crow_last_pdf" ? "/create/builder/pdf" : "/create/builder/ebook";
          },
          actionLabel: label,
        });
      }
    } catch {
      // sin recursos
    }
    setItems(found);
  }, []);
  if (items.length === 0) {
    return <EmptyState title="Sin recursos todavía" detail="Tus kits y documentos generados aparecerán aquí." />;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
      {items.map((it) => (
        <div key={it.id} className="aff-card" style={cardStyle}>
          <div style={{ color: C.violetSoft, fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>{it.kind.toUpperCase()}</div>
          <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "4px" }}>{it.title}</div>
          <div style={{ color: C.muted, fontSize: "12px", marginBottom: "12px" }}>{it.detail}</div>
          <button onClick={it.action} className="aff-btn" style={{ padding: "9px 16px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            {it.actionLabel}
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================
// NOTIFICACIONES + CONFIG
// ============================================

function NotificationsTabCreator({ notifications }: { notifications: { id: string; title: string; detail: string; timestamp: string }[] }) {
  if (notifications.length === 0) {
    return <EmptyState title="Sin notificaciones" detail="Ventas, afiliados, publicaciones y retiros aparecerán aquí." />;
  }
  return (
    <div>
      {notifications.map((n) => (
        <div key={n.id} style={{ display: "flex", gap: "12px", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>{n.title}</div>
            <div style={{ color: C.muted, fontSize: "13px" }}>{n.detail}</div>
          </div>
          <div style={{ color: C.faint, fontSize: "11px", whiteSpace: "nowrap" }}>{timeAgo(n.timestamp)}</div>
        </div>
      ))}
    </div>
  );
}

function ConfigTab({ profile, onChange }: { profile: CreatorProfile; onChange: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [walletAddr, setWalletAddr] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      setWalletAddr(window.localStorage.getItem("crow_creator_wallet") ?? "");
    } catch {
      // sin wallet
    }
  }, []);
  const save = (): void => {
    saveCreatorProfile({ ...profile, displayName: displayName.trim() || profile.displayName, bio: bio.trim() });
    try {
      window.localStorage.setItem("crow_creator_wallet", walletAddr.trim());
    } catch {
      // no bloquea
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onChange();
  };
  return (
    <div style={{ maxWidth: "520px" }}>
      <label htmlFor="cfg-name" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Nombre</label>
      <input id="cfg-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", marginBottom: "8px", fontFamily: FONT }} />
      <label htmlFor="cfg-bio" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Descripción</label>
      <textarea id="cfg-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", marginBottom: "8px", fontFamily: FONT, resize: "vertical" }} />
      <label htmlFor="cfg-wallet" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Wallet de retiro (USDT)</label>
      <input id="cfg-wallet" value={walletAddr} onChange={(e) => setWalletAddr(e.target.value)} placeholder="Dirección para retiros" style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", marginBottom: "8px", fontFamily: FONT }} />
      <div style={{ color: C.faint, fontSize: "12px", marginBottom: "12px" }}>
        Usuario: {profile.username} · Los balances y comisiones no son editables.
      </div>
      <button onClick={save} className="aff-btn" style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
        {saved ? "Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}

function Opportunities({ productId, data }: { productId: string; data: CreatorData }) {
  const product = data.mine.find((p) => p.id === productId);
  if (!product) return null;
  const m = productMetrics(productId, data);
  const tips: string[] = [];
  if (m.views > 10 && m.sales === 0) tips.push("Este producto tiene visitas pero pocas ventas: revisá precio y propuesta de valor.");
  if (m.sales > 0 && m.promoters === 0) tips.push("Este producto tiene ventas pero todavía no tiene afiliados: activalos en Marketplace.");
  if (m.views === 0 && product.status === "PUBLISHED") tips.push("Está publicado pero sin visibilidad: compartilo y pedí las primeras visitas.");
  if (product.ratingCount >= 3 && product.ratingSum / product.ratingCount >= 4.5) tips.push("Bien valorado: es ideal para llevar afiliados.");
  if (tips.length === 0) {
    return <div style={{ color: C.muted, fontSize: "14px" }}>Cuando tengamos más datos, Crow te mostrará oportunidades.</div>;
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", color: "#ddd", fontSize: "14px" }}>
      {tips.map((t) => <li key={t} style={{ marginBottom: "6px" }}>{t}</li>)}
    </ul>
  );
}
