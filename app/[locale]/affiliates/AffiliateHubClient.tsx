"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getPublication, listPublications } from "@/app/services/marketplace/marketStore";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import {
  buildAffiliateNotifications,
  createAffiliateLink,
  createAffiliateProfile,
  getAffiliateLink,
  getAffiliateProfile,
  getAffiliateSettings,
  getNotificationsReadAt,
  getOrCreateReferralCode,
  listAffiliateLinks,
  listAffiliateProfiles,
  listClicks,
  listReferralClicks,
  listReferralRegistrations,
  listTransactions,
  markNotificationsRead,
  saveAffiliateSettings,
  setLinkActive,
  type AffiliateNotification,
} from "@/app/services/marketplace/marketLedger";
import type {
  AffiliateProfile,
  Order,
  ProductPublication,
  WalletTransaction,
} from "@/app/services/marketplace/marketTypes";
import { Sidebar, AppHeader, type ShellSection } from "./components/Shell";
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
  RangeBar as UIRangeBar,
  timeAgo as timeAgoUi,
  round2,
  cardStyle,
} from "./components/ui";
import { Sparkline, AreaChart, Donut, bucketize } from "./components/charts";
import { RewardsTab } from "./components/RewardsTab";
import { PhotoUploader } from "@/app/components/CreatorPageEditor";

type Tab = "inicio" | "promotions" | "links" | "commissions" | "rewards" | "analytics" | "invites" | "team" | "saleslog" | "kit" | "referrals" | "notificaciones" | "pagos" | "settings";
type Range = 7 | 30 | 90 | 0;

const SECTION_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  inicio: { title: "Inicio", subtitle: "Tu centro de operaciones" },
  promotions: { title: "Mis promociones", subtitle: "Lo que estás vendiendo" },
  links: { title: "Mis enlaces", subtitle: "Tus links personales" },
  commissions: { title: "Comisiones", subtitle: "Cada movimiento, con estado" },
  rewards: { title: "Crow Rewards", subtitle: "Tus puntos por volumen válido" },
  analytics: { title: "Analíticas", subtitle: "Qué está funcionando" },
  invites: { title: "Invitaciones", subtitle: "Hacé crecer tu red" },
  team: { title: "Mi equipo", subtitle: "Seguimiento, sin multinivel" },
  saleslog: { title: "Log de ventas", subtitle: "Historial financiero" },
  kit: { title: "Kit promocional", subtitle: "Material listo para compartir" },
  referrals: { title: "Referidos", subtitle: "Quién llegó con vos" },
  notificaciones: { title: "Notificaciones", subtitle: "Todo lo importante" },
  pagos: { title: "Pagos", subtitle: "Tu wallet dentro del panel" },
  settings: { title: "Configuración", subtitle: "Tu perfil de afiliado" },
};

export function AffiliateHubClient() {
  const [userId, setUserId] = useState("");
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [tab, setTab] = useState<Tab>("inicio");
  const [range, setRange] = useState<Range>(30);
  const [tick, setTick] = useState(0);
  const [notifications, setNotifications] = useState<AffiliateNotification[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletSummary, setWalletSummary] = useState("USD 0");

  useEffect(() => {
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
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfile(createAffiliateProfile(userId));
  }, [userId, tick]);

  useEffect(() => {
    if (!profile) {
      setNotifications([]);
      return;
    }
    const orders = listOrders().filter((o) => o.affiliateId === profile.id && o.status === "PAID");
    setNotifications(
      buildAffiliateNotifications(profile.id, orders, (pid) => getPublication(pid)?.title ?? pid)
    );
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const w = L.getWallet(profile.id);
      setWalletSummary(`USD ${round2(w.available.amount + w.pending.amount)}`);
    });
  }, [profile, tick]);

  const unread = useMemo(() => {
    if (!profile) return 0;
    const readAt = getNotificationsReadAt(profile.id);
    if (!readAt) return notifications.length;
    return notifications.filter((n) => n.timestamp > readAt).length;
  }, [notifications, profile]);

  const login = (): void => {
    if (!input.trim()) return;
    setUserId(input.trim());
    try {
      window.localStorage.setItem("crow_affiliate_id", input.trim());
    } catch {
      // no bloquea
    }
  };

  const logout = (): void => {
    setUserId("");
    setProfile(null);
    try {
      window.localStorage.removeItem("crow_affiliate_id");
    } catch {
      // no bloquea
    }
  };

  const refresh = (): void => setTick((t) => t + 1);

  const navigate = (s: string): void => {
    if (s === "marketplace") return;
    setTab(s as Tab);
    setMobileOpen(false);
  };

  if (!profile) {
    return (
      <ToastProvider>
        <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div className="aff-fadein" style={{ maxWidth: "480px", width: "100%", ...{ background: "radial-gradient(120% 140% at 50% 0%, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0) 55%), #0c0c10" }, border: "1px solid rgba(255,255,255,0.09)", borderRadius: "22px", padding: "36px", textAlign: "center" }}>
            <img src="/crowlogo.png" alt="Crow" style={{ width: "52px", height: "52px", objectFit: "contain", marginBottom: "12px" }} />
            <h1 style={{ fontSize: "26px", margin: "0 0 8px" }}>Affiliate OS</h1>
            <p style={{ color: C.muted, margin: "0 0 20px", fontSize: "14px" }}>Tu centro de operaciones como afiliado de Crow Market.</p>
            <div style={{ display: "flex", gap: "8px" }}>
              <label htmlFor="aff-login" style={{ position: "absolute", left: "-9999px" }}>Tu usuario o email</label>
              <input id="aff-login" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") login(); }} placeholder="Tu usuario o email" style={{ flex: 1, background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT }} />
              <button onClick={login} className="aff-btn" style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Entrar
              </button>
            </div>
          </div>
        </main>
        <style>{GLOBAL_CSS}</style>
      </ToastProvider>
    );
  }

  const section = SECTION_TITLES[tab];

  return (
    <ToastProvider>
      <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex" }}>
        <Sidebar
          active={tab as ShellSection}
          collapsed={collapsed}
          onNavigate={navigate}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          walletSummary={walletSummary}
          userName={userId}
        />
        <div style={{ flex: 1, minWidth: 0, maxWidth: "1240px", margin: "0 auto", padding: "24px clamp(16px, 3vw, 36px) 64px", width: "100%" }}>
          <AppHeader
            title={section.title}
            subtitle={section.subtitle}
            onMenu={() => setMobileOpen((m) => !m)}
            unread={unread}
            onBell={() => {
              setTab("notificaciones");
              markNotificationsRead(profile.id);
            }}
            walletSummary={walletSummary}
            userName={userId}
            onProfile={() => setTab("settings")}
            onWallet={() => setTab("pagos")}
            onLogout={logout}
          />
          <div key={tab} className="aff-fadein">
            {tab === "inicio" && <HomeTab profile={profile} userName={userId} go={(t) => setTab(t)} />}
            {tab === "promotions" && <PromotionsTab profile={profile} onChange={refresh} />}
            {tab === "links" && <LinksTab profile={profile} />}
            {tab === "commissions" && <CommissionsTab profile={profile} />}
            {tab === "rewards" && <RewardsTab />}
            {tab === "analytics" && <AnalyticsTab profile={profile} range={range} setRange={setRange} />}
            {tab === "invites" && <InvitesTab profile={profile} />}
            {tab === "team" && <TeamTab profile={profile} />}
            {tab === "saleslog" && <SalesLogTab profile={profile} />}
            {tab === "kit" && <KitTab profile={profile} />}
            {tab === "referrals" && <ReferralsTab profile={profile} />}
            {tab === "notificaciones" && <NotificationsTab profile={profile} notifications={notifications} onRead={() => markNotificationsRead(profile.id)} />}
            {tab === "pagos" && <WalletTab profile={profile} />}
            {tab === "settings" && <SettingsTab profile={profile} onChange={refresh} />}
          </div>
        </div>
        <style>{GLOBAL_CSS}</style>
      </main>
    </ToastProvider>
  );
}

// ============================================
// DATOS COMPARTIDOS
// ============================================

interface AffiliateData {
  links: ReturnType<typeof listAffiliateLinks>;
  clicks: number;
  sales: Order[];
  txs: WalletTransaction[];
  products: Map<string, ProductPublication>;
}

function useAffiliateData(profile: AffiliateProfile, tick: number): AffiliateData {
  const [data, setData] = useState<AffiliateData>({ links: [], clicks: 0, sales: [], txs: [], products: new Map() });
  useEffect(() => {
    import("@/app/services/marketplace/marketOrders").then((m) => {
      import("@/app/services/marketplace/marketLedger").then((L) => {
        const links = L.listAffiliateLinks(profile.id);
        const clicks = L.listClicks(profile.id).length;
        const sales = m.listOrders().filter((o) => o.affiliateId === profile.id && o.status === "PAID");
        const txs = L.listTransactions(profile.id).filter((t) => L.isCommissionTx(t.type));
        const products = new Map<string, ProductPublication>();
        for (const l of links) {
          const p = getPublication(l.productId);
          if (p) products.set(l.productId, p);
        }
        setData({ links, clicks, sales, txs, products });
      });
    });
  }, [profile, tick]);
  return data;
}

function since(range: number): number {
  if (range === 0) return 0;
  return Date.now() - range * 24 * 3600 * 1000;
}

function copyText(text: string, done: () => void): void {
  const fallback = (): void => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done();
    } catch {
      // sin portapapeles
    }
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else fallback();
}

function shareText(title: string, text: string, url: string): void {
  const nav = navigator as Navigator & { share?: (data: { title: string; text: string; url: string }) => Promise<void> };
  if (nav.share) {
    nav.share({ title, text, url }).catch(() => undefined);
  } else {
    copyText(url, () => undefined);
  }
}

// ============================================
// DASHBOARD
// ============================================

function DashboardTab({ profile, range, setRange }: { profile: AffiliateProfile; range: number; setRange: (r: Range) => void }) {
  const data = useAffiliateData(profile, 0);
  const [clickTimes, setClickTimes] = useState<number[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      setClickTimes(L.listClicks(profile.id).map((c) => new Date(c.timestamp).getTime()));
    });
  }, [profile]);
  const cutoff = since(range);
  const sales = data.sales.filter((o) => new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
  const residualEarned = round2(
    data.txs
      .filter((t) => t.type === "RESIDUAL_COMMISSION" && new Date(t.createdAt).getTime() >= cutoff)
      .reduce((n, t) => n + t.amount.amount, 0)
  );
  const earned = round2(sales.reduce((n, o) => n + o.affiliateCommission.amount, 0) + residualEarned);
  const available = data.txs.filter((t) => t.status === "AVAILABLE").reduce((n, t) => n + t.amount.amount, 0);
  const pending = data.txs.filter((t) => t.status === "PENDING").reduce((n, t) => n + t.amount.amount, 0);
  const conversion = data.clicks > 0 ? Math.round((data.sales.length / data.clicks) * 1000) / 10 : 0;

  return (
    <div>
      <RangeBar range={range} setRange={setRange} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        <Stat label="Ganancias totales" value={`USD ${round(earned)}`} />
        <Stat label="Residuales equipo" value={`USD ${round(residualEarned)}`} />
        <Stat label="Disponibles" value={`USD ${round(available)}`} />
        <Stat label="Pendientes" value={`USD ${round(pending)}`} />
        <Stat label="Clicks" value={String(data.clicks)} />
        <Stat label="Ventas" value={String(sales.length)} />
        <Stat label="Conversión" value={`${conversion}%`} />
        <Stat label="Promocionados" value={String(data.links.filter((l) => l.active !== false).length)} />
        <ReferralCounts profile={profile} />
      </div>
      <h3 style={{ fontSize: "16px", margin: "0 0 12px" }}>Actividad</h3>
      <LegacyChart
        series={[
          { label: "Clicks", color: "#a855f7", points: bucketCount(range, clickTimes) },
          { label: "Ventas", color: "#22c55e", points: bucketizeSales(sales, range) },
          { label: "Ganancias", color: "#f59e0b", points: bucketizeEarnings(sales, range) },
        ]}
      />
      <h3 style={{ fontSize: "16px", margin: "24px 0 12px" }}>Últimas ventas</h3>
      {sales.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Todavía no tenés ventas en este período.</div>
      ) : (
        sales.slice(0, 8).map((o) => (
          <SaleRow key={o.id} orderId={o.id} productId={o.productId} date={(o.paidAt ?? o.createdAt).slice(0, 10)} amount={o.amount.amount} commission={o.affiliateCommission.amount} />
        ))
      )}
    </div>
  );
}

function ReferralCounts({ profile }: { profile: AffiliateProfile }) {
  const [counts, setCounts] = useState({ aff: 0, cre: 0 });
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const codes = [L.getOrCreateReferralCode(profile.id, "affiliate").code, L.getOrCreateReferralCode(profile.id, "creator").code];
      void codes;
      setCounts({
        aff: L.listReferralRegistrations(profile.id, "affiliate").length,
        cre: L.listReferralRegistrations(profile.id, "creator").length,
      });
    });
  }, [profile]);
  return (
    <>
      <Stat label="Afiliados invitados" value={String(counts.aff)} />
      <Stat label="Creadores invitados" value={String(counts.cre)} />
    </>
  );
}

function SaleRow({ orderId, productId, date, amount, commission }: { orderId: string; productId: string; date: string; amount: number; commission: number }) {
  const [txStatus, setTxStatus] = useState("PENDING");
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const tx = L.listTransactions().find((t) => t.referenceId === orderId && L.isCommissionTx(t.type));
      if (tx) setTxStatus(tx.status);
    });
  }, [orderId]);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap" }}>
      <span>{getPublication(productId)?.title ?? productId} <span style={{ color: "#666" }}>· {date}</span></span>
      <span style={{ color: "#888" }}>USD {amount} · <strong style={{ color: "#22c55e" }}>+USD {commission}</strong> · {txStatus}</span>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

function RangeBar({ range, setRange }: { range: number; setRange: (r: Range) => void }) {
  const opts: { v: Range; l: string }[] = [
    { v: 7, l: "7 días" },
    { v: 30, l: "30 días" },
    { v: 90, l: "90 días" },
    { v: 0, l: "Todo" },
  ];
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
      {opts.map((o) => (
        <button
          key={o.l}
          onClick={() => setRange(o.v)}
          style={{ padding: "8px 14px", borderRadius: "8px", border: range === o.v ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: range === o.v ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "12px" }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function bucketCount(range: number, timestamps: number[]): number[] {
  const days = range === 0 ? 12 : range <= 7 ? 7 : range <= 30 ? 30 : 13;
  const buckets = new Array<number>(days).fill(0);
  const now = Date.now();
  const span = range === 0 ? 90 * 24 * 3600 * 1000 : range * 24 * 3600 * 1000;
  for (const t of timestamps) {
    if (range !== 0 && t < now - span) continue;
    const idx = Math.min(days - 1, Math.floor(((t - (now - span)) / span) * days));
    if (idx >= 0) buckets[idx] += 1;
  }
  return buckets;
}

function bucketSum(range: number, entries: { t: number; v: number }[]): number[] {
  const days = range === 0 ? 12 : range <= 7 ? 7 : range <= 30 ? 30 : 13;
  const buckets = new Array<number>(days).fill(0);
  const now = Date.now();
  const span = range === 0 ? 90 * 24 * 3600 * 1000 : range * 24 * 3600 * 1000;
  for (const e of entries) {
    if (range !== 0 && e.t < now - span) continue;
    const idx = Math.min(days - 1, Math.floor(((e.t - (now - span)) / span) * days));
    if (idx >= 0) buckets[idx] = Math.round((buckets[idx] + e.v) * 100) / 100;
  }
  return buckets;
}

function bucketizeSales(sales: Order[], range: number): number[] {
  return bucketCount(range, sales.map((o) => new Date(o.paidAt ?? o.createdAt).getTime()));
}

function bucketizeEarnings(sales: Order[], range: number): number[] {
  return bucketSum(range, sales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: o.affiliateCommission.amount })));
}

function NotificationPanel({ notifications }: { notifications: AffiliateNotification[] }) {
  if (notifications.length === 0) {
    return (
      <div style={{ padding: "16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px", color: "#888", fontSize: "14px" }}>
        Sin notificaciones. Aquí verás ventas, comisiones, retiros y referidos.
      </div>
    );
  }
  return (
    <div style={{ padding: "8px 16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "20px", maxHeight: "260px", overflowY: "auto" }}>
      {notifications.slice(0, 20).map((n) => (
        <div key={n.id} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
          <strong>{n.title}</strong>
          <div style={{ color: "#888" }}>{n.detail} · {n.timestamp.slice(0, 10)}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MIS PROMOCIONES
// ============================================

function PromotionsTab({ profile, onChange }: { profile: AffiliateProfile; onChange: () => void }) {
  const data = useAffiliateData(profile, 0);
  const [copied, setCopied] = useState<string | null>(null);
  const [statsFor, setStatsFor] = useState<string | null>(null);

  const perProduct = (productId: string): { clicks: number; sales: number; earned: number } => ({
    clicks: 0,
    sales: 0,
    earned: 0,
  });

  return (
    <div>
      {data.links.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>
          Todavía no promocionás productos. Elegí uno en el <Link href="/affiliates/marketplace" style={{ color: "#a855f7" }}>Marketplace de afiliados</Link>.
        </div>
      ) : (
        data.links.map((link) => {
          const url = typeof window !== "undefined" ? `${window.location.origin}/r/${link.code}` : "";
          return (
            <PromotionRow
              key={link.id}
              productId={link.productId}
              active={link.active !== false}
              copied={copied === link.id}
              showStats={statsFor === link.id}
              url={url}
              onCopy={() => {
                copyText(url, () => {
                  setCopied(link.id);
                  setTimeout(() => setCopied(null), 2000);
                });
              }}
              onShare={() => shareText("Te recomiendo este producto", "Mirá lo que encontré en Crow Market", url)}
              onToggleStats={() => setStatsFor(statsFor === link.id ? null : link.id)}
              onToggleActive={(active) => {
                import("@/app/services/marketplace/marketLedger").then((L) => {
                  L.setLinkActive(link.id, active);
                  onChange();
                });
              }}
            />
          );
        })
      )}
    </div>
  );
}

function PromotionRow({
  productId,
  active,
  copied,
  showStats,
  url,
  onCopy,
  onShare,
  onToggleStats,
  onToggleActive,
}: {
  productId: string;
  active: boolean;
  copied: boolean;
  showStats: boolean;
  url: string;
  onCopy: () => void;
  onShare: () => void;
  onToggleStats: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const [product, setProduct] = useState<ProductPublication | null>(null);
  const [stats, setStats] = useState({ clicks: 0, sales: 0, earned: 0 });
  useEffect(() => {
    setProduct(getPublication(productId));
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        const clicks = L.listClicks().filter((c) => c.productId === productId).length;
        const sales = m.listOrders().filter((o) => o.productId === productId && o.status === "PAID");
        setStats({ clicks, sales: sales.length, earned: Math.round(sales.reduce((n, o) => n + o.affiliateCommission.amount, 0) * 100) / 100 });
      });
    });
  }, [productId]);
  if (!product) return null;
  return (
    <PromotionCard
      product={product}
      active={active}
      copied={copied}
      showStats={showStats}
      stats={stats}
      onCopy={onCopy}
      onShare={onShare}
      onToggleStats={onToggleStats}
      onToggleActive={onToggleActive}
    />
  );
}

function PromotionCard({
  product,
  active,
  copied,
  showStats,
  stats,
  onCopy,
  onShare,
  onToggleStats,
  onToggleActive,
}: {
  product: ProductPublication;
  active: boolean;
  copied: boolean;
  showStats: boolean;
  stats: { clicks: number; sales: number; earned: number };
  onCopy: () => void;
  onShare: (url: string) => void;
  onToggleStats: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  return (
    <div style={{ padding: "16px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px", opacity: active ? 1 : 0.6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "15px" }}>{product.title}</div>
          <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
            USD {product.price.amount} · comisión {product.affiliatePercent}% (≈ USD {Math.round(product.price.amount * product.affiliatePercent) / 100}) · {active ? "activa" : "pausada"}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={onCopy} style={smallBtn}>{copied ? "Copiado" : "Copiar link"}</button>
          <button onClick={() => onShare("")} style={smallBtn}>Compartir</button>
          <Link href={`/marketplace/product/${product.slug}`} style={{ ...smallBtn, textDecoration: "none", display: "inline-block" }}>Ver producto</Link>
          <button onClick={onToggleStats} style={smallBtn}>{showStats ? "Ocultar stats" : "Ver estadísticas"}</button>
          <button onClick={() => onToggleActive(!active)} style={{ ...smallBtn, color: active ? "#f87171" : "#22c55e" }}>
            {active ? "Dejar de promocionar" : "Reactivar"}
          </button>
        </div>
      </div>
      {showStats && (
        <div style={{ marginTop: "12px", fontSize: "13px", color: "#aaa" }}>
          Clicks: {stats.clicks} · Ventas: {stats.sales} · Conversión: {stats.clicks > 0 ? Math.round((stats.sales / stats.clicks) * 1000) / 10 : 0}% · Ganancias: USD {stats.earned}
          <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>Clicks y ventas totales del producto (todos los afiliados).</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMISIONES
// ============================================

function CommissionsTab({ profile }: { profile: AffiliateProfile }) {
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "AVAILABLE" | "PAID" | "REVERSED">("ALL");
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      setTxs(L.listTransactions(profile.id).filter((t) => L.isCommissionTx(t.type)).reverse());
    });
  }, [profile]);
  const shown = filter === "ALL" ? txs : txs.filter((t) => t.status === filter);
  const sum = (s: WalletTransaction["status"]): number =>
    Math.round(txs.filter((t) => t.status === s).reduce((n, t) => n + t.amount.amount, 0) * 100) / 100;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <Stat label="Pendientes" value={`USD ${sum("PENDING")}`} />
        <Stat label="Disponibles" value={`USD ${sum("AVAILABLE")}`} />
        <Stat label="Pagadas" value={`USD ${sum("PAID")}`} />
        <Stat label="Revertidas" value={`USD ${sum("REVERSED")}`} />
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {(["ALL", "PENDING", "AVAILABLE", "PAID", "REVERSED"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 14px", borderRadius: "8px", border: filter === f ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: filter === f ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "12px" }}>
            {f === "ALL" ? "Todas" : f === "PAID" ? "Pagadas" : f === "PENDING" ? "Pendientes" : f === "AVAILABLE" ? "Disponibles" : "Revertidas"}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Sin comisiones en este estado.</div>
      ) : (
        shown.map((t) => (
          <CommissionRow key={t.id} tx={t} />
        ))
      )}
    </div>
  );
}

function CommissionRow({ tx }: { tx: WalletTransaction }) {
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => {
    import("@/app/services/marketplace/marketOrders").then((m) => {
      setOrder(m.getOrder(tx.referenceId));
    });
  }, [tx.referenceId]);
  const product = order ? getPublication(order.productId) : null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap" }}>
      <span>
        {tx.type === "RESIDUAL_COMMISSION" && (
          <span style={{ fontSize: "11px", fontWeight: "bold", padding: "3px 8px", borderRadius: "8px", background: "rgba(168,85,247,0.15)", color: "#c084fc", marginRight: "8px" }}>
            RESIDUAL N{tx.level ?? "?"}
          </span>
        )}
        {product?.title ?? tx.referenceId}
        <span style={{ color: "#666" }}> · orden {tx.referenceId.slice(-6)} · {tx.createdAt.slice(0, 10)}</span>
      </span>
      <span>
        <span style={{ color: "#888" }}>{order ? `venta USD ${order.amount.amount} · ` : ""}</span>
        <strong style={{ color: "#22c55e" }}>+USD {tx.amount.amount}</strong>
        <span style={{ color: "#666" }}> · {tx.status}</span>
      </span>
    </div>
  );
}

// ============================================
// ANALÍTICAS
// ============================================

function AnalyticsTab({ profile, range, setRange }: { profile: AffiliateProfile; range: number; setRange: (r: Range) => void }) {
  const [clicks, setClicks] = useState<number[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [ranking, setRanking] = useState<{ productId: string; title: string; clicks: number; sales: number; conversion: number }[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        const clickTimes = L.listClicks(profile.id).map((c) => ({ t: new Date(c.timestamp).getTime(), productId: c.productId }));
        setClicks(clickTimes.map((c) => c.t));
        const mySales = m.listOrders().filter((o) => o.affiliateId === profile.id && o.status === "PAID");
        setSales(mySales);
        const byProduct = new Map<string, { clicks: number; sales: number }>();
        for (const c of clickTimes) {
          const e = byProduct.get(c.productId) ?? { clicks: 0, sales: 0 };
          e.clicks += 1;
          byProduct.set(c.productId, e);
        }
        for (const o of mySales) {
          const e = byProduct.get(o.productId) ?? { clicks: 0, sales: 0 };
          e.sales += 1;
          byProduct.set(o.productId, e);
        }
        setRanking(
          [...byProduct.entries()]
            .map(([productId, v]) => ({
              productId,
              title: getPublication(productId)?.title ?? productId,
              clicks: v.clicks,
              sales: v.sales,
              conversion: v.clicks > 0 ? Math.round((v.sales / v.clicks) * 1000) / 10 : 0,
            }))
            .sort((a, b) => b.conversion - a.conversion || b.clicks - a.clicks)
        );
      });
    });
  }, [profile]);
  const cutoff = since(range);
  const salesInRange = sales.filter((o) => new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
  const ticket = salesInRange.length > 0 ? Math.round((salesInRange.reduce((n, o) => n + o.amount.amount, 0) / salesInRange.length) * 100) / 100 : 0;
  const earned = Math.round(salesInRange.reduce((n, o) => n + o.affiliateCommission.amount, 0) * 100) / 100;
  return (
    <div>
      <RangeBar range={range} setRange={setRange} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <Stat label="Clicks" value={String(clicks.filter((t) => t >= cutoff).length)} />
        <Stat label="Ventas" value={String(salesInRange.length)} />
        <Stat label="Conversión" value={`${salesInRange.length > 0 || clicks.length > 0 ? Math.round((salesInRange.length / Math.max(1, clicks.filter((t) => t >= cutoff).length)) * 1000) / 10 : 0}%`} />
        <Stat label="Ingresos generados" value={`USD ${Math.round(salesInRange.reduce((n, o) => n + o.amount.amount, 0) * 100) / 100}`} />
        <Stat label="Comisiones" value={`USD ${earned}`} />
        <Stat label="Ticket promedio" value={`USD ${ticket}`} />
      </div>
      <h3 style={{ fontSize: "16px", margin: "0 0 12px" }}>Evolución</h3>
      <LegacyChart
        series={[
          { label: "Clicks", color: "#a855f7", points: bucketCount(range, clicks) },
          { label: "Ventas", color: "#22c55e", points: bucketizeSales(salesInRange, range) },
          { label: "Ganancias", color: "#f59e0b", points: bucketizeEarnings(salesInRange, range) },
        ]}
      />
      <h3 style={{ fontSize: "16px", margin: "24px 0 12px" }}>Productos que mejor convierten</h3>
      {ranking.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Sin datos todavía.</div>
      ) : (
        ranking.map((r) => (
          <div key={r.productId} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
            <span>{r.title}</span>
            <span style={{ color: "#888" }}>{r.conversion}% · {r.clicks} clicks · {r.sales} ventas</span>
          </div>
        ))
      )}
      <div style={{ color: "#666", fontSize: "12px", marginTop: "8px" }}>
        El ranking muestra los clicks para evitar conclusiones con muestras mínimas.
      </div>
    </div>
  );
}

// ============================================
// CENTRO DE INVITACIONES
// ============================================

function InvitesTab({ profile }: { profile: AffiliateProfile }) {
  const [affCode, setAffCode] = useState("");
  const [creCode, setCreCode] = useState("");
  const [affStats, setAffStats] = useState({ clicks: 0, regs: 0 });
  const [creStats, setCreStats] = useState({ clicks: 0, regs: 0 });
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const a = L.getOrCreateReferralCode(profile.id, "affiliate");
      const c = L.getOrCreateReferralCode(profile.id, "creator");
      setAffCode(a.code);
      setCreCode(c.code);
      setAffStats({ clicks: L.listReferralClicks(a.code).length, regs: L.listReferralRegistrations(profile.id, "affiliate").length });
      setCreStats({ clicks: L.listReferralClicks(c.code).length, regs: L.listReferralRegistrations(profile.id, "creator").length });
    });
  }, [profile]);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://crowmarket.com";
  const copy = (which: string, url: string): void => {
    copyText(url, () => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return (
    <div>
      <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Centro de invitaciones</h2>
      <p style={{ fontSize: "13px", margin: "0 0 16px" }}>
        <Link href="/affiliates/program" style={{ color: "#a855f7" }}>Cómo funcionan los residuales hasta 3 niveles →</Link>
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <div style={{ padding: "22px", borderRadius: "16px", background: "#0c0c0f", border: "1px solid rgba(124,58,237,0.35)" }}>
          <div style={{ fontWeight: "bold", fontSize: "17px", marginBottom: "6px" }}>Invita afiliados a Crow</div>
          <p style={{ color: "#888", fontSize: "13px", margin: "0 0 12px" }}>Compartí tu link personal. Cada registro queda atribuido a vos.</p>
          <InviteLinkRow label="Tu link de afiliados" url={`${origin}/join/affiliate/${affCode}`} copied={copied === "aff"} onCopy={() => copy("aff", `${origin}/join/affiliate/${affCode}`)} onShare={() => shareText("Sumate como afiliado a Crow", "Registrate como afiliado con mi invitación", `${origin}/join/affiliate/${affCode}`)} />
          <InviteStats clicks={affStats.clicks} regs={affStats.regs} regLabel="afiliados registrados" />
        </div>
        <div style={{ padding: "22px", borderRadius: "16px", background: "#0c0c0f", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div style={{ fontWeight: "bold", fontSize: "17px", marginBottom: "6px" }}>Invita creadores a Crow</div>
          <p style={{ color: "#888", fontSize: "13px", margin: "0 0 12px" }}>Link independiente del anterior, solo para creadores.</p>
          <InviteLinkRow label="Tu link de creadores" url={`${origin}/join/creator/${creCode}`} copied={copied === "cre"} onCopy={() => copy("cre", `${origin}/join/creator/${creCode}`)} onShare={() => shareText("Publicá en Crow Market", "Registrate como creador con mi invitación", `${origin}/join/creator/${creCode}`)} />
          <InviteStats clicks={creStats.clicks} regs={creStats.regs} regLabel="creadores registrados" />
        </div>
      </div>
    </div>
  );
}

function InviteLinkRow({ label, url, copied, onCopy, onShare }: { label: string; url: string; copied: boolean; onCopy: () => void; onShare: () => void }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input readOnly value={url} style={{ flex: 1, background: "#050505", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#aaa", padding: "8px", fontSize: "11px", minWidth: 0 }} />
        <button onClick={onCopy} style={smallBtn}>{copied ? "Copiado" : "Copiar link"}</button>
        <button onClick={onShare} style={smallBtn}>Compartir</button>
      </div>
    </div>
  );
}

function InviteStats({ clicks, regs, regLabel }: { clicks: number; regs: number; regLabel: string }) {
  return (
    <div style={{ fontSize: "13px", color: "#aaa" }}>
      Clicks: {clicks} · Registros: {regs} · {regLabel}: {regs} · Conversión: {clicks > 0 ? Math.round((regs / clicks) * 1000) / 10 : 0}%
    </div>
  );
}

// ============================================
// KIT PROMOCIONAL
// ============================================

function KitTab({ profile }: { profile: AffiliateProfile }) {
  const data = useAffiliateData(profile, 0);
  const [copied, setCopied] = useState<string | null>(null);
  if (data.links.filter((l) => l.active !== false).length === 0) {
    return <div style={{ color: "#888", fontSize: "14px" }}>Promocioná al menos un producto para ver su kit.</div>;
  }
  return (
    <div>
      {data.links.filter((l) => l.active !== false).map((link) => {
        const product = data.products.get(link.productId);
        if (!product) return null;
        const url = typeof window !== "undefined" ? `${window.location.origin}/r/${link.code}` : "";
        const gain = Math.round(product.price.amount * product.affiliatePercent) / 100;
        const title = `${product.title} — mi recomendado`;
        const desc = product.shortDescription;
        const cta = `Conseguilo aquí: ${url}`;
        const social = `Probé "${product.title}" (${product.format}) y lo recomiendo: ${product.shortDescription} ${url}`;
        const copy = (which: string, text: string): void => {
          copyText(text, () => {
            setCopied(`${link.id}-${which}`);
            setTimeout(() => setCopied(null), 2000);
          });
        };
        return (
          <div key={link.id} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px" }}>
            <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "10px" }}>{product.title}</div>
            <KitField label="Link de afiliado" value={url} copied={copied === `${link.id}-url`} onCopy={() => copy("url", url)} onShare={() => shareText(title, desc, url)} />
            <KitField label="Título sugerido" value={title} copied={copied === `${link.id}-t`} onCopy={() => copy("t", title)} onShare={() => shareText(title, desc, url)} />
            <KitField label="Descripción corta" value={desc} copied={copied === `${link.id}-d`} onCopy={() => copy("d", desc)} onShare={() => shareText(title, desc, url)} />
            <KitField label="CTA" value={cta} copied={copied === `${link.id}-c`} onCopy={() => copy("c", cta)} onShare={() => shareText(title, cta, url)} />
            <KitField label="Copy para redes" value={social} copied={copied === `${link.id}-s`} onCopy={() => copy("s", social)} onShare={() => shareText(title, social, url)} />
            <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
              Precio USD {product.price.amount} · comisión {product.affiliatePercent}% (≈ USD {gain})
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KitField({ label, value, copied, onCopy, onShare }: { label: string; value: string; copied: boolean; onCopy: () => void; onShare: () => void }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input readOnly value={value} style={{ flex: 1, background: "#050505", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#aaa", padding: "8px", fontSize: "12px", minWidth: 0 }} />
        <button onClick={onCopy} style={smallBtn}>{copied ? "Copiado" : "Copiar"}</button>
        <button onClick={onShare} style={smallBtn}>Compartir</button>
      </div>
    </div>
  );
}

// ============================================
// REFERIDOS
// ============================================

function ReferralsTab({ profile }: { profile: AffiliateProfile }) {
  const [sub, setSub] = useState<"aff" | "cre">("aff");
  const [affiliates, setAffiliates] = useState<{ user: string; date: string; clicks: number; sales: number }[]>([]);
  const [creators, setCreators] = useState<{ user: string; date: string; products: number; sales: number }[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        const affRegs = L.listReferralRegistrations(profile.id, "affiliate");
        setAffiliates(
          affRegs.map((r) => {
            const prof = L.listAffiliateProfiles().find((p) => p.userId === r.newUserId);
            const sales = prof ? m.listOrders().filter((o) => o.affiliateId === prof.id && o.status === "PAID").length : 0;
            return { user: r.newUserId, date: r.timestamp.slice(0, 10), clicks: 0, sales };
          })
        );
        const creRegs = L.listReferralRegistrations(profile.id, "creator");
        import("@/app/services/marketplace/marketStore").then((S) => {
          setCreators(
            creRegs.map((r) => {
              const mine = S.listPublications().filter((p) =>
                p.creatorId === `creator-${r.newUserId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` && p.status === "PUBLISHED"
              );
              const sales = mine.reduce((n, p) => n + m.listOrders().filter((o) => o.productId === p.id && o.status === "PAID").length, 0);
              return { user: r.newUserId, date: r.timestamp.slice(0, 10), products: mine.length, sales };
            })
          );
        });
      });
    });
  }, [profile]);
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button onClick={() => setSub("aff")} style={{ padding: "8px 14px", borderRadius: "8px", border: sub === "aff" ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: sub === "aff" ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "13px" }}>
          Afiliados invitados ({affiliates.length})
        </button>
        <button onClick={() => setSub("cre")} style={{ padding: "8px 14px", borderRadius: "8px", border: sub === "cre" ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: sub === "cre" ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "13px" }}>
          Creadores invitados ({creators.length})
        </button>
      </div>
      {sub === "aff" ? (
        affiliates.length === 0 ? (
          <div style={{ color: "#888", fontSize: "14px" }}>Todavía no invitaste afiliados. Usá tu link del Centro de invitaciones.</div>
        ) : (
          affiliates.map((a) => (
            <div key={a.user} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
              <span>{a.user} <span style={{ color: "#666" }}>· {a.date}</span></span>
              <span style={{ color: "#888" }}>{a.sales} venta(s) como afiliado</span>
            </div>
          ))
        )
      ) : creators.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Todavía no invitaste creadores.</div>
      ) : (
        creators.map((c) => (
          <div key={c.user} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
            <span>{c.user} <span style={{ color: "#666" }}>· {c.date}</span></span>
            <span style={{ color: "#888" }}>{c.products} producto(s) · {c.sales} venta(s)</span>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// CONFIGURACIÓN
// ============================================

function AccountPhotoField({ name, onUploaded }: { name: string; onUploaded: (url: string) => void }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [accountAvatar, setAccountAvatar] = useState<string | null>(null);
  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ ok: boolean; user?: { avatarPath?: string | null } | null }>)
      .then((data) => {
        setLoggedIn(Boolean(data.user));
        setAccountAvatar(data.user?.avatarPath ?? null);
      })
      .catch(() => setLoggedIn(false));
  }, []);
  if (loggedIn !== true) return null;
  return (
    <div style={{ padding: "14px", borderRadius: "12px", border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" }}>
      <div style={{ color: "#c4b5fd", fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>
        Foto de tu cuenta Crow (vale para afiliado, comprador y creador)
      </div>
      <PhotoUploader
        currentUrl={accountAvatar}
        name={name}
        compact
        uploadUrl="/api/account/avatar"
        onUploaded={(url) => {
          setAccountAvatar(url);
          onUploaded(url);
        }}
      />
    </div>
  );
}

function SettingsTab({ profile, onChange }: { profile: AffiliateProfile; onChange: () => void }) {
  const [displayName, setDisplayName] = useState(profile.userId);
  const [avatar, setAvatar] = useState("");
  const [email, setEmail] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");
  const [notifySale, setNotifySale] = useState(true);
  const [notifyCommission, setNotifyCommission] = useState(true);
  const [notifyReferral, setNotifyReferral] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const s = L.getAffiliateSettings(profile.id);
      if (s) {
        setDisplayName(s.displayName);
        setAvatar(s.avatar);
        setEmail(s.email);
        setPayoutWallet(s.payoutWallet);
        setNotifySale(s.notifySale);
        setNotifyCommission(s.notifyCommission);
        setNotifyReferral(s.notifyReferral);
      }
    });
  }, [profile]);
  const save = (): void => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      L.saveAffiliateSettings({
        affiliateId: profile.id,
        displayName: displayName.trim() || profile.userId,
        avatar: avatar.trim(),
        email: email.trim(),
        payoutWallet: payoutWallet.trim(),
        notifySale,
        notifyCommission,
        notifyReferral,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChange();
    });
  };
  return (
    <div style={{ maxWidth: "520px" }}>
      <label style={labelStyle}>Nombre</label>
      <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
      <div style={{ marginTop: "16px", marginBottom: "4px" }}>
        <AccountPhotoField
          name={displayName || profile.userId}
          onUploaded={(url) => setAvatar(url)}
        />
      </div>
      <label style={labelStyle}>Foto (URL)</label>
      <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://... (o subí tu foto arriba)" style={inputStyle} />
      <label style={labelStyle}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@email.com" style={inputStyle} />
      <label style={labelStyle}>Wallet de retiro (USDT)</label>
      <input value={payoutWallet} onChange={(e) => setPayoutWallet(e.target.value)} placeholder="Dirección para retiros" style={inputStyle} />
      <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="checkbox" checked={notifySale} onChange={(e) => setNotifySale(e.target.checked)} /> Notificarme por nueva venta
      </label>
      <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="checkbox" checked={notifyCommission} onChange={(e) => setNotifyCommission(e.target.checked)} /> Notificarme por comisión disponible
      </label>
      <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
        <input type="checkbox" checked={notifyReferral} onChange={(e) => setNotifyReferral(e.target.checked)} /> Notificarme por referidos
      </label>
      <div style={{ color: "#666", fontSize: "12px", margin: "12px 0" }}>
        Los balances, comisiones, ventas y estados se calculan desde el ledger y no son editables.
      </div>
      <button onClick={save} style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
        {saved ? "Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#888", fontSize: "11px", marginBottom: "4px", marginTop: "12px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "14px",
  fontFamily: FONT,
};

const smallBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "11px",
  whiteSpace: "nowrap",
};

// ============================================
// MI EQUIPO (solo lectura, primer nivel, sin multinivel)
// ============================================

type MemberStatus = "ACTIVO" | "INACTIVO" | "NUEVO";

interface TeamMember {
  kind: "affiliate" | "creator";
  userId: string;
  displayName: string;
  registeredAt: string;
  status: MemberStatus;
  clicks: number;
  sales: number;
  volume: number;
  lastActivity: string;
}

interface TeamSale {
  orderId: string;
  productId: string;
  productTitle: string;
  affiliateUserId: string;
  date: string;
  amount: number;
  commission: number;
  state: string;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} minuto(s)`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora(s)`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

function memberStatus(registeredAt: string, clicks: number, sales: number): MemberStatus {
  if (Date.now() - new Date(registeredAt).getTime() < 14 * 24 * 3600 * 1000) return "NUEVO";
  return clicks + sales > 0 ? "ACTIVO" : "INACTIVO";
}

function useTeamData(profile: AffiliateProfile) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sales, setSales] = useState<TeamSale[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        import("@/app/services/marketplace/marketStore").then((S) => {
          const affRegs = L.listReferralRegistrations(profile.id, "affiliate");
          const creRegs = L.listReferralRegistrations(profile.id, "creator");
          const allOrders = m.listOrders();
          const txByOrder = new Map<string, string>();
          for (const t of L.listTransactions()) {
            if (L.isCommissionTx(t.type) && !txByOrder.has(t.referenceId)) txByOrder.set(t.referenceId, t.status);
          }
          const memberSales = (affiliateId: string): TeamSale[] =>
            allOrders
              .filter((o) => o.affiliateId === affiliateId && (o.status === "PAID" || o.status === "REFUNDED"))
              .map((o) => ({
                orderId: o.id,
                productId: o.productId,
                productTitle: S.getPublication(o.productId)?.title ?? o.productId,
                affiliateUserId: "",
                date: o.paidAt ?? o.createdAt,
                amount: o.amount.amount,
                commission: o.affiliateCommission.amount,
                state: o.status === "REFUNDED" ? "REVERSED" : (txByOrder.get(o.id) ?? o.status),
              }));
          const affMembers: TeamMember[] = affRegs.map((r) => {
            const prof = L.listAffiliateProfiles().find((p) => p.userId === r.newUserId);
            const clickCount = prof ? L.listClicks(prof.id).length : 0;
            const msales = prof ? memberSales(prof.id) : [];
            const volume = Math.round(msales.reduce((n, s) => n + s.amount, 0) * 100) / 100;
            const last = [r.timestamp, ...msales.map((s) => s.date)].sort().reverse()[0] ?? r.timestamp;
            return {
              kind: "affiliate",
              userId: r.newUserId,
              displayName: r.newUserId,
              registeredAt: r.timestamp,
              status: memberStatus(r.timestamp, clickCount, msales.length),
              clicks: clickCount,
              sales: msales.length,
              volume,
              lastActivity: last,
            };
          });
          const creMembers: TeamMember[] = creRegs.map((r) => {
            const slug = `creator-${r.newUserId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            const mine = S.listPublications().filter((p) => p.creatorId === slug && p.status === "PUBLISHED");
            const creatorSales = mine.reduce(
              (n, p) => n + allOrders.filter((o) => o.productId === p.id && o.status === "PAID").length,
              0
            );
            const volume = Math.round(
              mine.reduce(
                (n, p) => n + allOrders.filter((o) => o.productId === p.id && o.status === "PAID").reduce((x, o) => x + o.amount.amount, 0),
                0
              ) * 100
            ) / 100;
            return {
              kind: "creator",
              userId: r.newUserId,
              displayName: r.newUserId,
              registeredAt: r.timestamp,
              status: memberStatus(r.timestamp, mine.length, creatorSales),
              clicks: 0,
              sales: creatorSales,
              volume,
              lastActivity: r.timestamp,
            };
          });
          setMembers([...affMembers, ...creMembers]);
          const teamAffIds = new Set(
            affRegs
              .map((r) => L.listAffiliateProfiles().find((p) => p.userId === r.newUserId)?.id)
              .filter((x): x is string => !!x)
          );
          const teamSales: TeamSale[] = [];
          for (const o of allOrders) {
            if (o.status !== "PAID" && o.status !== "REFUNDED") continue;
            if (!o.affiliateId || !teamAffIds.has(o.affiliateId)) continue;
            const who = L.listAffiliateProfiles().find((p) => p.id === o.affiliateId);
            teamSales.push({
              orderId: o.id,
              productId: o.productId,
              productTitle: S.getPublication(o.productId)?.title ?? o.productId,
              affiliateUserId: who?.userId ?? o.affiliateId,
              date: o.paidAt ?? o.createdAt,
              amount: o.amount.amount,
              commission: o.affiliateCommission.amount,
              state: o.status === "REFUNDED" ? "REVERSED" : (txByOrder.get(o.id) ?? o.status),
            });
          }
          teamSales.sort((a, b) => b.date.localeCompare(a.date));
          setSales(teamSales);
        });
      });
    });
  }, [profile]);
  return { members, sales };
}

function TeamTab({ profile }: { profile: AffiliateProfile }) {
  const { members, sales } = useTeamData(profile);
  const [range, setRange] = useState<Range>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const cutoff = since(range);
  const inRangeSales = sales.filter((s) => new Date(s.date).getTime() >= cutoff);
  const volume = Math.round(inRangeSales.reduce((n, s) => n + s.amount, 0) * 100) / 100;
  const affMembers = members.filter((m) => m.kind === "affiliate");
  const creMembers = members.filter((m) => m.kind === "creator");
  const active = affMembers.filter((m) => m.status === "ACTIVO").length;
  const isNew = affMembers.filter((m) => m.status === "NUEVO").length;
  const selectedMember = members.find((m) => m.userId === selected) ?? null;

  return (
    <div>
      <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Mi equipo</h2>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>
        Primer nivel, solo estadísticas. Sin multinivel: las comisiones son siempre del afiliado atribuido.
      </p>
      <TeamTree owner={profile.userId} affiliates={affMembers} creators={creMembers} onSelect={setSelected} selected={selected} />
      <RangeBar range={range} setRange={setRange} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        <Stat label="Afiliados invitados" value={String(affMembers.length)} />
        <Stat label="Afiliados activos" value={String(active)} />
        <Stat label="Afiliados nuevos" value={String(isNew)} />
        <Stat label="Creadores invitados" value={String(creMembers.length)} />
        <Stat label="Ventas del equipo" value={String(inRangeSales.length)} />
        <Stat label="Volumen del equipo" value={`USD ${volume}`} />
        <ResidualStat profile={profile} />
      </div>
      {selectedMember ? (
        <MemberDetail member={selectedMember} sales={sales.filter((s) => s.affiliateUserId === selected)} onBack={() => setSelected(null)} />
      ) : (
        <>
          <h3 style={{ fontSize: "16px", margin: "0 0 12px" }}>Afiliados ({affMembers.length})</h3>
          {affMembers.length === 0 ? (
            <div style={{ color: "#888", fontSize: "14px", marginBottom: "20px" }}>
              Nadie se registró con tu link todavía. Compartilo desde el Centro de invitaciones.
            </div>
          ) : (
            affMembers.map((m) => <MemberRow key={m.userId} member={m} onSelect={() => setSelected(m.userId)} />)
          )}
          <h3 style={{ fontSize: "16px", margin: "20px 0 12px" }}>Actividad de mi equipo</h3>
          <TeamActivity profile={profile} />
        </>
      )}
    </div>
  );
}

function ResidualStat({ profile }: { profile: AffiliateProfile }) {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      setTotal(
        Math.round(
          L.listTransactions(profile.id)
            .filter((t) => t.type === "RESIDUAL_COMMISSION")
            .reduce((n, t) => n + t.amount.amount, 0) * 100
        ) / 100
      );
    });
  }, [profile]);
  return <Stat label="Mis residuales (5/3/2%)" value={`USD ${total}`} />;
}

function MemberRow({ member: m, onSelect }: { member: TeamMember; onSelect: () => void }) {
  const conv = m.clicks > 0 ? Math.round((m.sales / m.clicks) * 1000) / 10 : 0;
  return (
    <button
      onClick={onSelect}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", marginBottom: "8px", fontFamily: FONT }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <strong style={{ fontSize: "15px" }}>{m.displayName}</strong>
        <StatusPill status={m.status} />
      </div>
      <div style={{ color: "#888", fontSize: "13px", marginTop: "6px" }}>
        {m.sales} ventas · {m.clicks} clicks · {conv}% conversión · USD {m.volume} en ventas
      </div>
      <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>Registro: {m.registeredAt.slice(0, 10)}</div>
    </button>
  );
}

function StatusPill({ status }: { status: MemberStatus }) {
  const color = status === "ACTIVO" ? "#22c55e" : status === "NUEVO" ? "#a855f7" : "#666";
  return (
    <span style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color }}>
      {status}
    </span>
  );
}

function MemberDetail({ member: m, sales, onBack }: { member: TeamMember; sales: TeamSale[]; onBack: () => void }) {
  const conv = m.clicks > 0 ? Math.round((m.sales / m.clicks) * 1000) / 10 : 0;
  const days = 12;
  const buckets = new Array<number>(days).fill(0);
  const now = Date.now();
  const span = 90 * 24 * 3600 * 1000;
  for (const s of sales) {
    const t = new Date(s.date).getTime();
    const idx = Math.min(days - 1, Math.floor(((t - (now - span)) / span) * days));
    if (idx >= 0) buckets[idx] += 1;
  }
  const max = Math.max(1, ...buckets);
  return (
    <div>
      <button onClick={onBack} style={{ ...smallBtn, marginBottom: "16px" }}>← Volver al equipo</button>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <h3 style={{ fontSize: "20px", margin: 0 }}>{m.displayName}</h3>
        <StatusPill status={m.status} />
      </div>
      <div style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
        Registro: {m.registeredAt.slice(0, 10)} · Última actividad: {timeAgo(m.lastActivity)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <Stat label="Clicks" value={String(m.clicks)} />
        <Stat label="Ventas" value={String(m.sales)} />
        <Stat label="Conversión" value={`${conv}%`} />
        <Stat label="Volumen" value={`USD ${m.volume}`} />
      </div>
      <h4 style={{ fontSize: "15px", margin: "0 0 10px" }}>Actividad (ventas, 90 días)</h4>
      <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "64px", marginBottom: "20px" }}>
        {buckets.map((v, i) => (
          <div key={i} style={{ flex: 1, background: "#7c3aed", borderRadius: "3px", height: `${Math.max(4, (v / max) * 100)}%`, opacity: v > 0 ? 1 : 0.25 }} />
        ))}
      </div>
      <h4 style={{ fontSize: "15px", margin: "0 0 10px" }}>Ventas realizadas (solo lectura)</h4>
      {sales.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Sin ventas atribuidas todavía.</div>
      ) : (
        sales.map((s) => (
          <div key={s.orderId} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap" }}>
            <span>{s.productTitle} <span style={{ color: "#666" }}>· {s.date.slice(0, 10)}</span></span>
            <span style={{ color: "#888" }}>USD {s.amount} · {s.state}</span>
          </div>
        ))
      )}
      <div style={{ color: "#666", fontSize: "12px", marginTop: "12px" }}>
        Solo visualización: no podés modificar ventas, comisiones, órdenes ni balances.
      </div>
    </div>
  );
}

function TeamActivity({ profile }: { profile: AffiliateProfile }) {
  const [items, setItems] = useState<{ text: string; time: string; ts: string }[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        import("@/app/services/marketplace/marketStore").then((S) => {
          const feed: { text: string; time: string; ts: string }[] = [];
          for (const r of L.listReferralRegistrations(profile.id, "affiliate")) {
            feed.push({ text: `${r.newUserId} se registró como afiliado`, time: timeAgo(r.timestamp), ts: r.timestamp });
          }
          for (const r of L.listReferralRegistrations(profile.id, "creator")) {
            feed.push({ text: `${r.newUserId} se registró como creador`, time: timeAgo(r.timestamp), ts: r.timestamp });
            const slug = `creator-${r.newUserId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            for (const p of S.listPublications().filter((x) => x.creatorId === slug)) {
              feed.push({ text: `${r.newUserId} publicó su primer producto: ${p.title}`, time: timeAgo(p.publishedAt ?? p.createdAt), ts: p.publishedAt ?? p.createdAt });
              break;
            }
          }
          const affIds = new Set(
            L.listReferralRegistrations(profile.id, "affiliate")
              .map((r) => L.listAffiliateProfiles().find((p) => p.userId === r.newUserId)?.id)
              .filter((x): x is string => !!x)
          );
          for (const o of m.listOrders()) {
            if (o.status !== "PAID" || !o.affiliateId || !affIds.has(o.affiliateId)) continue;
            const who = L.listAffiliateProfiles().find((p) => p.id === o.affiliateId);
            feed.push({
              text: `${who?.userId ?? "Alguien"} realizó una venta de ${o.amount.amount} ${o.amount.currency}`,
              time: timeAgo(o.paidAt ?? o.createdAt),
              ts: o.paidAt ?? o.createdAt,
            });
          }
          feed.sort((a, b) => b.ts.localeCompare(a.ts));
          setItems(feed.slice(0, 20));
        });
      });
    });
  }, [profile]);
  if (items.length === 0) {
    return <div style={{ color: "#888", fontSize: "14px" }}>Sin actividad todavía.</div>;
  }
  return (
    <div>
      {items.map((it, i) => (
        <div key={`${it.ts}-${i}`} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
          <div>{it.text}</div>
          <div style={{ color: "#666", fontSize: "12px" }}>{it.time}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// ÁRBOL ANIMADO (afiliados + creadores)
// ============================================

function TeamTree({
  owner,
  affiliates,
  creators,
  onSelect,
  selected,
}: {
  owner: string;
  affiliates: TeamMember[];
  creators: TeamMember[];
  onSelect: (userId: string | null) => void;
  selected: string | null;
}) {
  const aff = affiliates.slice(0, 8);
  const cre = creators.slice(0, 8);
  const W = 640;
  const rowY = 168;
  const rootX = W / 2;
  const left = aff.map((_, i) => 40 + (i * (W / 2 - 80)) / Math.max(1, aff.length - 1 || 1));
  const right = cre.map((_, i) => W / 2 + 40 + (i * (W / 2 - 80)) / Math.max(1, cre.length - 1 || 1));
  const colorFor = (m: TeamMember): string =>
    m.status === "ACTIVO" ? "#22c55e" : m.status === "NUEVO" ? "#a855f7" : "#555";
  return (
    <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "12px", marginBottom: "20px", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} 230`} style={{ minWidth: "520px", width: "100%", height: "auto" }}>
        <g className="tree-draw">
          {left.map((x, i) => (
            <path key={`a${i}`} d={`M${rootX},52 C${rootX},110 ${x},110 ${x},${rowY - 16}`} fill="none" stroke="#7c3aed" strokeWidth={2} opacity={0.7} className="tree-edge" style={{ animationDelay: `${0.2 + i * 0.15}s` }} />
          ))}
          {right.map((x, i) => (
            <path key={`c${i}`} d={`M${rootX},52 C${rootX},110 ${x},110 ${x},${rowY - 16}`} fill="none" stroke="#22c55e" strokeWidth={2} opacity={0.7} className="tree-edge" style={{ animationDelay: `${0.2 + (left.length + i) * 0.15}s` }} />
          ))}
        </g>
        <g className="tree-pop">
          <circle cx={rootX} cy={36} r={16} fill="#7c3aed" />
          <text x={rootX} y={40} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#fff">{initials(owner)}</text>
          <text x={rootX} y={66} textAnchor="middle" fontSize={11} fill="#aaa">{truncate(owner, 16)}</text>
        </g>
        {aff.map((m, i) => (
          <NodeG key={m.userId} x={left[i]} y={rowY} member={m} color={colorFor(m)} selected={selected === m.userId} onSelect={() => onSelect(selected === m.userId ? null : m.userId)} delay={0.4 + i * 0.15} />
        ))}
        {cre.map((m, i) => (
          <NodeG key={m.userId} x={right[i]} y={rowY} member={m} color={colorFor(m)} selected={false} onSelect={() => undefined} delay={0.4 + (left.length + i) * 0.15} />
        ))}
        {aff.length === 0 && cre.length === 0 && (
          <text x={rootX} y={140} textAnchor="middle" fontSize={12} fill="#666">Compartí tus links para hacer crecer tu equipo</text>
        )}
      </svg>
      <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#888", marginTop: "4px", flexWrap: "wrap" }}>
        <span><span style={{ color: "#7c3aed" }}>●</span> Tus invitaciones</span>
        <span><span style={{ color: "#22c55e" }}>●</span> Activo</span>
        <span><span style={{ color: "#a855f7" }}>●</span> Nuevo</span>
        <span><span style={{ color: "#555" }}>●</span> Inactivo</span>
      </div>
      <style>{`
        .tree-edge { stroke-dasharray: 220; stroke-dashoffset: 220; animation: treeDraw 0.9s ease forwards; }
        @keyframes treeDraw { to { stroke-dashoffset: 0; } }
        .tree-pop { animation: treePop 0.5s ease both; transform-origin: center; }
        @keyframes treePop { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        .tree-node { cursor: pointer; animation: treePop 0.5s ease both; }
        .tree-node:hover circle { filter: brightness(1.25); }
      `}</style>
    </div>
  );
}

function NodeG({ x, y, member, color, selected, onSelect, delay }: { x: number; y: number; member: TeamMember; color: string; selected: boolean; onSelect: () => void; delay: number }) {
  return (
    <g className="tree-node" style={{ animationDelay: `${delay}s` }} onClick={onSelect}>
      <circle cx={x} cy={y} r={selected ? 17 : 14} fill="none" stroke={color} strokeWidth={selected ? 3 : 2} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#fff">{initials(member.displayName)}</text>
      <text x={x} y={y + 30} textAnchor="middle" fontSize={10} fill={selected ? "#fff" : "#aaa"}>{truncate(member.displayName, 14)}</text>
    </g>
  );
}

function initials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function truncate(name: string, n: number): string {
  return name.length > n ? `${name.slice(0, n - 1)}…` : name;
}

// ============================================
// LOG DE VENTAS
// ============================================

function SalesLogTab({ profile }: { profile: AffiliateProfile }) {
  const [rows, setRows] = useState<TeamSale[]>([]);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"ALL" | "PENDING" | "AVAILABLE" | "PAID" | "REVERSED">("ALL");
  const [range, setRange] = useState<Range>(0);
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      import("@/app/services/marketplace/marketOrders").then((m) => {
        import("@/app/services/marketplace/marketStore").then((S) => {
          const teamAffIds = new Set(
            L.listReferralRegistrations(profile.id, "affiliate")
              .map((r) => L.listAffiliateProfiles().find((p) => p.userId === r.newUserId)?.id)
              .filter((x): x is string => !!x)
          );
          teamAffIds.add(profile.id);
          const txByOrder = new Map<string, string>();
          for (const t of L.listTransactions()) {
            if (L.isCommissionTx(t.type) && !txByOrder.has(t.referenceId)) txByOrder.set(t.referenceId, t.status);
          }
          const whoName = (affiliateId: string | null): string => {
            if (!affiliateId) return "—";
            if (affiliateId === profile.id) return "Vos";
            return L.listAffiliateProfiles().find((p) => p.id === affiliateId)?.userId ?? affiliateId.slice(-6);
          };
          const all: TeamSale[] = [];
          for (const o of m.listOrders()) {
            if (o.status !== "PAID" && o.status !== "REFUNDED") continue;
            if (!o.affiliateId || !teamAffIds.has(o.affiliateId)) continue;
            all.push({
              orderId: o.id,
              productId: o.productId,
              productTitle: S.getPublication(o.productId)?.title ?? o.productId,
              affiliateUserId: whoName(o.affiliateId),
              date: o.paidAt ?? o.createdAt,
              amount: o.amount.amount,
              commission: o.affiliateCommission.amount,
              state: o.status === "REFUNDED" ? "REVERSED" : (txByOrder.get(o.id) ?? o.status),
            });
          }
          all.sort((a, b) => b.date.localeCompare(a.date));
          // Sin duplicados: una fila por orden.
          const seen = new Set<string>();
          setRows(all.filter((r) => (seen.has(r.orderId) ? false : (seen.add(r.orderId), true))));
        });
      });
    });
  }, [profile]);
  const q = search.trim().toLowerCase();
  const cutoff = since(range);
  const shown = rows.filter((r) => {
    if (stateFilter !== "ALL" && r.state !== stateFilter) return false;
    if (new Date(r.date).getTime() < cutoff) return false;
    if (!q) return true;
    return (
      r.productTitle.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      r.affiliateUserId.toLowerCase().includes(q)
    );
  });
  return (
    <div>
      <h2 style={{ fontSize: "20px", margin: "0 0 4px" }}>Log de ventas</h2>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>
        Tus ventas y las de tu equipo. Una fila por orden, sin duplicados. Las comisiones siguen perteneciendo a cada afiliado atribuido.
      </p>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por producto, orden o afiliado..."
        style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 14px", fontSize: "14px", marginBottom: "12px", fontFamily: FONT }}
      />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        {(["ALL", "PENDING", "AVAILABLE", "PAID", "REVERSED"] as const).map((f) => (
          <button key={f} onClick={() => setStateFilter(f)} style={{ padding: "8px 14px", borderRadius: "8px", border: stateFilter === f ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)", background: stateFilter === f ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "12px" }}>
            {f === "ALL" ? "Todas" : f === "PAID" ? "Pagadas" : f === "PENDING" ? "Pendientes" : f === "AVAILABLE" ? "Disponibles" : "Revertidas"}
          </button>
        ))}
      </div>
      <RangeBar range={range} setRange={setRange} />
      {shown.length === 0 ? (
        <div style={{ color: "#888", fontSize: "14px" }}>Sin ventas para estos filtros.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", minWidth: "640px" }}>
            <thead>
              <tr style={{ color: "#666", textAlign: "left" }}>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Fecha</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Producto</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Orden</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Importe</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Afiliado</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Comisión</th>
                <th style={{ padding: "8px", fontWeight: "normal" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.orderId} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "8px", color: "#aaa" }}>{r.date.slice(0, 16).replace("T", " ")}</td>
                  <td style={{ padding: "8px" }}>{r.productTitle}</td>
                  <td style={{ padding: "8px", color: "#888" }}>{r.orderId.slice(-8)}</td>
                  <td style={{ padding: "8px" }}>USD {r.amount}</td>
                  <td style={{ padding: "8px" }}>{r.affiliateUserId}</td>
                  <td style={{ padding: "8px", color: "#22c55e", fontWeight: "bold" }}>USD {r.commission}</td>
                  <td style={{ padding: "8px", fontWeight: "bold", color: r.state === "REVERSED" ? "#f87171" : r.state === "PAID" ? "#22c55e" : r.state === "AVAILABLE" ? "#a855f7" : "#888" }}>{r.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// INICIO (home del Affiliate OS)
// ============================================

interface HomeData {
  displayName: string;
  earned: number;
  available: number;
  pending: number;
  paid: number;
  sales: number;
  clicks: number;
  conversion: number;
  growthPct: number | null;
  clickPoints: number[];
  salesPoints: number[];
  earnPoints: number[];
  earnLabels: string[];
  chartRange: Range;
  topProducts: { id: string; title: string; sales: number; commission: number; price: number; percent: number }[];
  activity: { id: string; icon: string; color: string; title: string; detail: string; amount: string | null; time: string }[];
  affUrl: string;
  creUrl: string;
  walletSummary: string;
}

function useHomeData(profile: AffiliateProfile, range: Range): { data: HomeData | null; loading: boolean } {
  const [data, setData] = useState<HomeData | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("@/app/services/marketplace/marketLedger");
      const m = await import("@/app/services/marketplace/marketOrders");
      const S = await import("@/app/services/marketplace/marketStore");
      const links = L.listAffiliateLinks(profile.id).filter((l) => l.active !== false);
      const clickTimes = L.listClicks(profile.id).map((c) => new Date(c.timestamp).getTime());
      const sales = m.listOrders().filter((o) => o.affiliateId === profile.id && o.status === "PAID");
      const txs = L.listTransactions(profile.id).filter((t) => L.isCommissionTx(t.type));
      const earned = round2(
        sales.reduce((n, o) => n + o.affiliateCommission.amount, 0) +
          txs.filter((t) => t.type === "RESIDUAL_COMMISSION").reduce((n, t) => n + t.amount.amount, 0)
      );
      const available = round2(txs.filter((t) => t.status === "AVAILABLE").reduce((n, t) => n + t.amount.amount, 0));
      const pending = round2(txs.filter((t) => t.status === "PENDING").reduce((n, t) => n + t.amount.amount, 0));
      const paid = round2(txs.filter((t) => t.status === "PAID").reduce((n, t) => n + t.amount.amount, 0));
      const conversion = clickTimes.length > 0 ? Math.round((sales.length / clickTimes.length) * 1000) / 10 : 0;
      const cutoff = since(range);
      const inSales = sales.filter((o) => new Date(o.paidAt ?? o.createdAt).getTime() >= cutoff);
      const residualTx = txs.filter((t) => t.type === "RESIDUAL_COMMISSION" && new Date(t.createdAt).getTime() >= cutoff);
      const residualEarned = round2(residualTx.reduce((n, t) => n + t.amount.amount, 0));
      const prev = sales.filter((o) => {
        const t = new Date(o.paidAt ?? o.createdAt).getTime();
        const span = range === 0 ? 0 : range * 24 * 3600 * 1000;
        return range !== 0 && t < cutoff && t >= cutoff - span;
      });
      const cur = round2(inSales.reduce((n, o) => n + o.affiliateCommission.amount, 0));
      const prv = round2(prev.reduce((n, o) => n + o.affiliateCommission.amount, 0));
      const growthPct = prv > 0 ? Math.round(((cur - prv) / prv) * 10) / 10 : cur > 0 ? 100 : null;
      const buckets = range === 7 ? 7 : range === 30 ? 15 : 15;
      const clickB = bucketize(clickTimes.map((t) => ({ t, v: 1 })), range, buckets);
      const earnB = bucketize(inSales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: o.affiliateCommission.amount })), range, buckets);
      const byProduct = new Map<string, { sales: number; commission: number }>();
      for (const o of sales) {
        const e = byProduct.get(o.productId) ?? { sales: 0, commission: 0 };
        e.sales += 1;
        e.commission = round2(e.commission + o.affiliateCommission.amount);
        byProduct.set(o.productId, e);
      }
      const topProducts = [...byProduct.entries()]
        .map(([pid, v]) => {
          const p = S.getPublication(pid);
          return { id: pid, title: p?.title ?? pid, sales: v.sales, commission: v.commission, price: p?.price.amount ?? 0, percent: p?.affiliatePercent ?? 0 };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4);
      const notes = L.buildAffiliateNotifications(profile.id, sales, (pid) => S.getPublication(pid)?.title ?? pid).slice(0, 6);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const affCode = L.getOrCreateReferralCode(profile.id, "affiliate").code;
      const creCode = L.getOrCreateReferralCode(profile.id, "creator").code;
      const settings = L.getAffiliateSettings(profile.id);
      if (!cancelled) {
        setData({
          displayName: settings?.displayName || profile.userId,
          earned, available, pending, paid,
          sales: inSales.length,
          clicks: clickTimes.filter((t) => t >= cutoff).length,
          conversion, growthPct,
          clickPoints: clickB.points,
          salesPoints: bucketize(inSales.map((o) => ({ t: new Date(o.paidAt ?? o.createdAt).getTime(), v: 1 })), range, buckets).points,
          earnPoints: earnB.points,
          earnLabels: earnB.labels,
          chartRange: range,
          topProducts,
          activity: notes.map((n) => ({
            id: n.id,
            icon: n.kind === "sale" ? "◉" : n.kind.startsWith("referral") ? "◍" : n.kind === "withdrawal" ? "▭" : "●",
            color: n.kind === "sale" ? C.green : n.kind.startsWith("referral") ? C.violetSoft : C.amber,
            title: n.title,
            detail: n.detail,
            amount: n.kind === "sale" ? `+${n.detail.match(/USD ([\d.]+)/)?.[1] ?? ""}` : null,
            time: timeAgoUi(n.timestamp),
          })),
          affUrl: `${origin}/join/affiliate/${affCode}`,
          creUrl: `${origin}/join/creator/${creCode}`,
          walletSummary: `USD ${round2(available + pending)}`,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, range]);
  return { data, loading: !data };
}

function HomeTab({ profile, userName, go }: { profile: AffiliateProfile; userName: string; go: (t: Tab) => void }) {
  const [range, setRange] = useState<Range>(30);
  const { data, loading } = useHomeData(profile, range);

  if (loading || !data) {
    return (
      <div>
        <SkeletonGrid />
        <div style={{ marginTop: "16px" }}><SkeletonGrid /></div>
      </div>
    );
  }

  const firstName = data.displayName.split(/[@\s]/)[0] || userName.split(/[@\s]/)[0] || "Afiliado";

  return (
    <div className="aff-fadein">
      {/* HERO */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "clamp(24px, 3.4vw, 32px)", margin: "0 0 4px" }}>Hola, {firstName}.</h1>
        <p style={{ color: C.muted, margin: "0 0 6px", fontSize: "14px" }}>Este es tu centro de operaciones.</p>
        <p style={{ margin: "0 0 14px", fontSize: "14px", color: data.growthPct === null ? C.faint : data.growthPct >= 0 ? C.green : C.red }}>
          {data.growthPct === null
            ? "Todavía no hay suficiente historial para medir tu ritmo."
            : `Tu rendimiento ${data.growthPct >= 0 ? "está creciendo" : "bajó"} un ${Math.abs(data.growthPct)}% esta semana.`}
        </p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/affiliates/marketplace" className="aff-btn" style={{ padding: "12px 22px", borderRadius: "12px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "14px" }}>
            Explorar oportunidades
          </Link>
          <CopyButton text={data.affUrl} label="Compartir mi link" />
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
        <KpiCard icon="◉" iconBg="rgba(124,58,237,0.2)" iconColor={C.violetSoft} label="Ganancias totales" value={`$${data.earned.toLocaleString("es")}`} sub={data.growthPct === null ? "Sin historial todavía" : `${data.growthPct >= 0 ? "+" : ""}${data.growthPct}% este período`} spark={data.earnPoints} sparkColor={C.violetSoft} />
        <KpiCard icon="◎" iconBg="rgba(56,189,248,0.15)" iconColor={C.blue} label="Ventas generadas" value={String(data.sales)} sub={data.sales > 0 ? "En el período seleccionado" : "Sin ventas todavía"} spark={data.salesPoints} sparkColor={C.blue} />
        <KpiCard icon="◍" iconBg="rgba(34,197,94,0.12)" iconColor={C.green} label="Comisiones pendientes" value={`$${data.pending.toLocaleString("es")}`} sub="Se acreditan al liberarse" spark={data.earnPoints} sparkColor={C.green} />
        <KpiCard icon="⬢" iconBg="rgba(168,85,247,0.15)" iconColor={C.violetSoft} label="Tasa de conversión" value={`${data.conversion}%`} sub={data.clicks > 0 ? `${data.clicks} clicks medidos` : "Sin clicks todavía"} spark={data.clickPoints} sparkColor={C.violetSoft} />
      </div>

      {/* CHART + LINKS */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px", marginBottom: "16px" }} className="home-grid">
        <div className="aff-card" style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ fontSize: "16px", margin: 0 }}>Ingresos por comisión</h2>
            <RangeBar range={range} setRange={setRange} />
          </div>
          {data.earnPoints.every((v) => v === 0) ? (
            <EmptyState title="Sin datos todavía" detail="Tus ingresos aparecerán aquí cuando generes tu primera venta." />
          ) : (
            <AreaChart series={[{ label: "Comisiones", color: C.violetSoft, points: data.earnPoints }]} labels={data.earnLabels} />
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="aff-card" style={cardStyle}>
            <h2 style={{ fontSize: "16px", margin: "0 0 12px" }}>Tus enlaces de referido</h2>
            <LinkRow label="Link para afiliados" desc="Compartí productos y ganá comisiones" url={data.affUrl} goStats={() => go("analytics")} />
            <div style={{ height: "12px" }} />
            <LinkRow label="Link para creadores" desc="Invitá creadores a la plataforma" url={data.creUrl} goStats={() => go("referrals")} />
          </div>
          <div className="aff-card" style={cardStyle}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: C.green }} aria-hidden>◍</span>
              <div>
                <div style={{ color: C.muted, fontSize: "12px" }}>Saldo disponible</div>
                <div style={{ fontSize: "26px", fontWeight: "bold" }}>${data.available.toLocaleString("es")}</div>
              </div>
            </div>
            <button onClick={() => go("pagos")} className="aff-btn" style={{ width: "100%", padding: "13px", borderRadius: "12px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
              Retirar ganancias
            </button>
            <button onClick={() => go("pagos")} style={{ width: "100%", background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "12px", marginTop: "8px" }}>
              Ver historial de pagos →
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCTS + ACTIVITY */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", marginBottom: "16px" }} className="home-grid">
        <div className="aff-card" style={cardStyle}>
          <SectionTitle title="Productos más vendidos" action={<button onClick={() => go("analytics")} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "12px" }}>Ver todos →</button>} />
          <TopProductsList
            products={data.topProducts}
            onPromote={(id) => {
              import("@/app/services/marketplace/marketLedger").then((L) => {
                L.getAffiliateLink(profile.id, id) ?? L.createAffiliateLink(profile.id, id);
                go("promotions");
              });
            }}
          />
        </div>
        <div className="aff-card" style={cardStyle}>
          <SectionTitle title="Actividad reciente" action={<button onClick={() => go("notificaciones")} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: "12px" }}>Ver todas →</button>} />
          {data.activity.length === 0 ? (
            <EmptyState title="Sin actividad todavía" detail="Tus ventas, clics e invitaciones aparecerán aquí." />
          ) : (
            data.activity.slice(0, 5).map((a) => (
              <div key={a.id} style={{ display: "flex", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: a.color, flexShrink: 0 }} aria-hidden>{a.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold" }}>{a.title} {a.amount && <span style={{ color: C.green }}>{a.amount}</span>}</div>
                  <div style={{ color: C.muted, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.detail}</div>
                </div>
                <div style={{ color: C.faint, fontSize: "11px", whiteSpace: "nowrap" }}>{a.time}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KIT + BANNER */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }} className="home-grid">
        <div className="aff-card" style={cardStyle}>
          <h2 style={{ fontSize: "16px", margin: "0 0 6px" }}>Material promocional</h2>
          <p style={{ color: C.muted, fontSize: "13px", margin: "0 0 12px" }}>Copys y links listos para compartir.</p>
          <button onClick={() => go("kit")} style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.2)", color: "#ddd", cursor: "pointer", fontSize: "13px", padding: "4px 0" }}>
            Ver recursos →
          </button>
        </div>
        <div className="aff-card" style={{ ...cardStyle, background: "linear-gradient(120deg, rgba(124,58,237,0.35) 0%, rgba(76,29,149,0.25) 60%, rgba(124,58,237,0.08) 100%)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "6px" }}>Llevá tus ganancias al siguiente nivel.</div>
            <div style={{ color: "#d8ccf5", fontSize: "13px" }}>Compartí tu enlace, recomendá productos y ganá comisiones.</div>
          </div>
          <Link href="/affiliates/marketplace" className="aff-btn" style={{ padding: "12px 20px", borderRadius: "12px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "13px" }}>
            Ver productos destacados →
          </Link>
        </div>
      </div>
      <style>{`
        @media (max-width: 1000px) { .home-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function KpiCard({ icon, iconBg, iconColor, label, value, sub, spark, sparkColor }: { icon: string; iconBg: string; iconColor: string; label: string; value: string; sub: string; spark: number[]; sparkColor: string }) {
  return (
    <div className="aff-card" style={{ ...cardStyle, display: "flex", gap: "12px", alignItems: "center" }}>
      <span style={{ width: "42px", height: "42px", borderRadius: "50%", background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", color: iconColor, flexShrink: 0 }} aria-hidden>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.muted, fontSize: "12px" }}>{label}</div>
        <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
        <div style={{ color: C.faint, fontSize: "11px", marginTop: "2px" }}>{sub}</div>
      </div>
      <Sparkline points={spark} color={sparkColor} width={84} height={34} />
    </div>
  );
}

function LinkRow({ label, desc, url, goStats }: { label: string; desc: string; url: string; goStats: () => void }) {
  return (
    <div style={{ marginBottom: "4px" }}>
      <div style={{ fontWeight: "bold", fontSize: "14px" }}>{label}</div>
      <div style={{ color: C.muted, fontSize: "12px", marginBottom: "8px" }}>{desc}</div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input readOnly value={url} aria-label={label} style={{ flex: 1, background: "#050508", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: C.muted, padding: "9px 10px", fontSize: "11px", minWidth: 0, fontFamily: FONT }} />
        <CopyButton text={url} label="Copiar" />
      </div>
      <button onClick={goStats} style={{ width: "100%", marginTop: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", color: C.muted, cursor: "pointer", fontSize: "12px", padding: "8px" }} className="aff-btn">
        Ver estadísticas →
      </button>
    </div>
  );
}

function TopProductsList({ products, onPromote }: { products: HomeData["topProducts"]; onPromote: (id: string) => void }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    import("@/app/services/marketplace/marketStore").then((S) => {
      setIds(S.queryPublications({ sort: "sales", pageSize: 4 }).items.filter((p) => p.affiliateEnabled).map((p) => p.id));
    });
  }, []);
  const list = products.length > 0 ? products : [];
  if (list.length === 0) {
    return <EmptyState title="Sin datos todavía" detail="Los productos que más venden aparecerán aquí." action={<Link href="/affiliates/marketplace" style={{ color: C.violetSoft, fontSize: "13px" }}>Explorar marketplace →</Link>} />;
  }
  void ids;
  return (
    <div>
      {list.map((p, i) => (
        <div key={p.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
          <span style={{ color: C.faint, fontSize: "13px", width: "16px" }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
            <div style={{ color: C.muted, fontSize: "12px" }}>{p.sales} ventas · Comisión: {p.percent}%</div>
            <div style={{ color: "#ddd", fontSize: "13px" }}>${p.commission.toLocaleString("es")}</div>
          </div>
          <button onClick={() => onPromote(p.id)} className="aff-btn" style={{ padding: "9px 16px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}>
            Promocionar
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================
// CENTRO DE ENLACES
// ============================================

function LinksTab({ profile }: { profile: AffiliateProfile }) {
  const data = useAffiliateData(profile, 0);
  const [affUrl, setAffUrl] = useState("");
  const [creUrl, setCreUrl] = useState("");
  useEffect(() => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setAffUrl(`${origin}/join/affiliate/${L.getOrCreateReferralCode(profile.id, "affiliate").code}`);
      setCreUrl(`${origin}/join/creator/${L.getOrCreateReferralCode(profile.id, "creator").code}`);
    });
  }, [profile]);
  const active = data.links.filter((l) => l.active !== false);
  return (
    <div>
      <SectionTitle title="Links de productos" />
      {active.length === 0 ? (
        <EmptyState title="Sin links todavía" detail="Promocioná un producto para generar tu primer link personal." />
      ) : (
        active.map((link) => {
          const product = data.products.get(link.productId);
          const url = typeof window !== "undefined" ? `${window.location.origin}/r/${link.code}` : "";
          return (
            <div key={link.id} className="aff-card" style={{ ...cardStyle, marginBottom: "12px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "8px" }}>{product?.title ?? link.productId}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <input readOnly value={url} aria-label={`Link de ${product?.title ?? "producto"}`} style={{ flex: 1, minWidth: "200px", background: "#050508", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: C.muted, padding: "9px 10px", fontSize: "12px", fontFamily: FONT }} />
                <CopyButton text={url} label="Copiar" />
                <ShareButton title={product?.title ?? "Producto"} text="Mirá lo que encontré en Crow Market" url={url} label="Compartir" />
              </div>
            </div>
          );
        })
      )}
      <div style={{ marginTop: "20px" }}>
        <SectionTitle title="Links de invitación" />
        <div className="aff-card" style={{ ...cardStyle, marginBottom: "12px" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>Invitar afiliados</div>
          <div style={{ color: C.muted, fontSize: "12px", marginBottom: "8px" }}>Código independiente del de creadores.</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input readOnly value={affUrl} aria-label="Link para invitar afiliados" style={{ flex: 1, minWidth: "200px", background: "#050508", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: C.muted, padding: "9px 10px", fontSize: "12px", fontFamily: FONT }} />
            <CopyButton text={affUrl} label="Copiar" />
            <ShareButton title="Sumate como afiliado" text="Registrate con mi invitación" url={affUrl} label="Compartir" />
          </div>
        </div>
        <div className="aff-card" style={cardStyle}>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px" }}>Invitar creadores</div>
          <div style={{ color: C.muted, fontSize: "12px", marginBottom: "8px" }}>Código independiente del de afiliados.</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input readOnly value={creUrl} aria-label="Link para invitar creadores" style={{ flex: 1, minWidth: "200px", background: "#050508", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: C.muted, padding: "9px 10px", fontSize: "12px", fontFamily: FONT }} />
            <CopyButton text={creUrl} label="Copiar" />
            <ShareButton title="Publicá en Crow" text="Registrate como creador con mi invitación" url={creUrl} label="Compartir" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PAGOS (wallet dentro del panel)
// ============================================

function WalletTab({ profile }: { profile: AffiliateProfile }) {
  const [wallet, setWallet] = useState({ available: 0, pending: 0, withdrawalPending: 0, paidOut: 0 });
  const [history, setHistory] = useState<{ id: string; amount: number; method: string; status: string; date: string }[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"USDT_BEP20" | "USDT_TRC20">("USDT_BEP20");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [clearing, setClearing] = useState(false);
  const refresh = (): void => {
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const w = L.getWallet(profile.id);
      setWallet({ available: w.available.amount, pending: w.pending.amount, withdrawalPending: w.withdrawalPending.amount, paidOut: w.paidOut.amount });
      setHistory(L.listWithdrawals(profile.id).slice().reverse().map((x) => ({ id: x.id, amount: x.amount.amount, method: x.method, status: x.status, date: x.createdAt.slice(0, 10) })));
    });
  };
  const simulateClearing = (): void => {
    setClearing(true);
    setError(null);
    import("@/app/services/marketplace/marketLedger").then((L) => {
      const done = L.releasePending(profile.id, "system");
      if (!done) setError("No hay fondos pendientes para liberar.");
      refresh();
      setClearing(false);
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "12px" }}>
        <Stat label="Disponible" value={`USD ${wallet.available}`} />
        <Stat label="Pendiente" value={`USD ${wallet.pending}`} />
        <Stat label="En retiro" value={`USD ${wallet.withdrawalPending}`} />
        <Stat label="Retirado" value={`USD ${wallet.paidOut}`} />
      </div>
      {wallet.pending > 0 && (
        <div style={{ padding: "12px 16px", borderRadius: "12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", marginBottom: "20px", fontSize: "13px", color: "#fcd34d" }}>
          Tenés USD {wallet.pending} pendientes de clearing (las comisiones se liberan tras el período de seguridad).
          <div style={{ marginTop: "10px" }}>
            <button onClick={simulateClearing} disabled={clearing} className="aff-btn" style={{ padding: "9px 16px", borderRadius: "10px", border: "1px solid rgba(245,158,11,0.4)", background: "transparent", color: "#fcd34d", cursor: "pointer", fontSize: "12px", fontWeight: "bold", opacity: clearing ? 0.6 : 1 }}>
              {clearing ? "Liberando..." : "Simular clearing (demo, sin backend)"}
            </button>
          </div>
        </div>
      )}
      <div className="aff-card" style={{ ...cardStyle, marginBottom: "20px" }}>
        <h3 style={{ fontSize: "15px", margin: "0 0 12px" }}>Solicitar retiro (mín. 25 USDT, fee 2%)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          <div>
            <label htmlFor="wd-amount" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Monto USD</label>
            <input id="wd-amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={{ width: "100%", boxSizing: "border-box", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", fontFamily: FONT }} />
          </div>
          <div>
            <label htmlFor="wd-net" style={{ display: "block", color: C.muted, fontSize: "11px", marginBottom: "4px" }}>Red</label>
            <select id="wd-net" value={method} onChange={(e) => setMethod(e.target.value as "USDT_BEP20" | "USDT_TRC20")} style={{ width: "100%", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", fontFamily: FONT }}>
              <option value="USDT_BEP20">USDT BEP20</option>
              <option value="USDT_TRC20">USDT TRC20</option>
            </select>
          </div>
        </div>
        <label htmlFor="wd-addr" style={{ display: "block", color: C.muted, fontSize: "11px", margin: "10px 0 4px" }}>Dirección</label>
        <input id="wd-addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de tu wallet" style={{ width: "100%", boxSizing: "border-box", background: "#050508", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "14px", marginBottom: "12px", fontFamily: FONT }} />
        {error && <div style={{ color: C.red, fontSize: "13px", marginBottom: "8px" }}>{error}</div>}
        {ok && <div style={{ color: C.green, fontSize: "13px", marginBottom: "8px" }}>Retiro solicitado. Queda en revisión.</div>}
        <button onClick={submit} className="aff-btn" style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Solicitar retiro
        </button>
      </div>
      <h3 style={{ fontSize: "15px", margin: "0 0 10px" }}>Historial</h3>
      {history.length === 0 ? (
        <div style={{ color: C.muted, fontSize: "14px" }}>Sin retiros solicitados.</div>
      ) : (
        history.map((h) => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px", flexWrap: "wrap", gap: "8px" }}>
            <span>USD {h.amount} <span style={{ color: C.faint }}>· {h.method} · {h.date}</span></span>
            <StatusBadge status={h.status} />
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// NOTIFICACIONES
// ============================================

function NotificationsTab({ profile, notifications, onRead }: { profile: AffiliateProfile; notifications: AffiliateNotification[]; onRead: () => void }) {
  useEffect(() => {
    onRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void profile;
  if (notifications.length === 0) {
    return <EmptyState title="Sin notificaciones" detail="Ventas, comisiones, retiros y referidos aparecerán aquí." />;
  }
  return (
    <div>
      {notifications.map((n) => (
        <div key={n.id} style={{ display: "flex", gap: "12px", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ width: "34px", height: "34px", borderRadius: "50%", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: C.violetSoft, flexShrink: 0 }} aria-hidden>
            {n.kind === "sale" ? "◉" : n.kind.startsWith("referral") ? "◍" : n.kind === "withdrawal" ? "▭" : "●"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>{n.title}</div>
            <div style={{ color: C.muted, fontSize: "13px" }}>{n.detail}</div>
          </div>
          <div style={{ color: C.faint, fontSize: "11px", whiteSpace: "nowrap" }}>{timeAgoUi(n.timestamp)}</div>
        </div>
      ))}
    </div>
  );
}

function LegacyChart({ series }: { series: { label: string; color: string; points: number[] }[] }) {
  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const W = 560, H = 160, PAD = 8;
  const step = series[0] ? (W - PAD * 2) / Math.max(1, series[0].points.length - 1) : 0;
  const path = (points: number[]): string =>
    points.map((v, i) => `${i === 0 ? "M" : "L"}${(PAD + i * step).toFixed(1)},${(H - PAD - (v / max) * (H - PAD * 2)).toFixed(1)}`).join(" ");
  return (
    <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
      <div style={{ display: "flex", gap: "16px", marginBottom: "8px", fontSize: "12px", color: "#888" }}>
        {series.map((s) => (
          <span key={s.label}><span style={{ color: s.color }}>●</span> {s.label}</span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.06)" />
        ))}
        {series.map((s) => (
          <path key={s.label} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}
