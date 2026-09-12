// ============================================
// REWARDS TAB - CROW REWARDS por volumen (dashboard afiliado)
// ============================================
// Solo lectura + reclamo. Todo cálculo es server-side (/api/rewards/*).

"use client";

import { useEffect, useState } from "react";
import { C, FONT, SectionTitle, StatusBadge, cardStyle } from "./ui";

interface Tier {
  level: number;
  cpRequired: number;
  amount: number;
}

interface RewardRow {
  id: string;
  level: number;
  cpRequired: number;
  amount: number;
  status: string;
  paymentRef: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface Summary {
  totalCp: number;
  next: { level: number; cpRequired: number; amount: number; missing: number } | null;
  unlocked: RewardRow[];
  history: RewardRow[];
  tiers: Tier[];
}

function fmt(n: number): string {
  return n.toLocaleString("es-UY");
}

export function RewardsTab() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = (): void => {
    void fetch("/api/rewards/mine")
      .then((r) => r.json() as Promise<{ ok: boolean } & Partial<Summary>>)
      .then((d) => {
        if (d.ok) setData(d as Summary);
        else setError("No se pudo cargar tus rewards.");
      })
      .catch(() => setError("Sin conexión."));
  };

  useEffect(() => {
    load();
  }, []);

  const claim = (rewardId: string): void => {
    setWorking(true);
    void fetch("/api/rewards/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rewardId }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; reason?: string }>)
      .then((d) => {
        if (!d.ok) setError(`No se pudo reclamar (${d.reason ?? "error"}).`);
        load();
      })
      .catch(() => setError("Sin conexión."))
      .finally(() => setWorking(false));
  };

  if (error && !data) {
    return <div style={{ color: "#f87171", fontSize: "14px" }}>{error}</div>;
  }
  if (!data) {
    return <div style={{ color: C.muted, fontSize: "14px" }}>Cargando rewards...</div>;
  }

  const goal = data.next ? data.next.cpRequired : data.totalCp;
  const pct = goal > 0 ? Math.min(100, Math.round((data.totalCp / goal) * 100)) : 100;

  return (
    <div>
      <SectionTitle title="CROW REWARDS" action={<StatusBadge status={data.totalCp > 0 ? "ACTIVO" : "INICIO"} />} />
      <div className="aff-card" style={{ ...cardStyle, padding: "28px", marginBottom: "16px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(420px 220px at 12% 50%, rgba(124,58,237,0.22), transparent 70%)", pointerEvents: "none" }} />
        <div className="crow-cp-hero" style={{ position: "relative", display: "flex", gap: "28px", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rewards-cp.png"
            alt="Moneda Crow Points"
            width={168}
            height={168}
            style={{ width: "168px", height: "168px", objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 0 28px rgba(124,58,237,0.55))", animation: "crow-cp-float 5s ease-in-out infinite" }}
          />
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: "13px", letterSpacing: "2px", color: C.muted, fontWeight: 700 }}>TOTAL CP</div>
            <div style={{ fontSize: "52px", fontWeight: 800, lineHeight: 1.1, textShadow: "0 0 32px rgba(124,58,237,0.45)" }}>
              {fmt(data.totalCp)} CP
            </div>
            <div style={{ color: C.muted, fontSize: "13px", marginTop: "4px" }}>Volumen de ventas válido · 1 USDT = 1 CP</div>
          </div>
        </div>
        <style>{`@keyframes crow-cp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } } @media (max-width: 560px) { .crow-cp-hero { flex-direction: column !important; text-align: center !important; } .crow-cp-hero > div { text-align: center !important; } }`}</style>
        {data.next ? (
          <div style={{ marginTop: "18px", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: C.muted }}>
              <span>{fmt(data.totalCp)} / {fmt(data.next.cpRequired)} CP</span>
              <span>PRÓXIMA RECOMPENSA · {data.next.amount} USDT</span>
            </div>
            <div style={{ height: "10px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", marginTop: "8px", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "6px", background: "linear-gradient(90deg,#7c3aed,#a855f7)", transition: "width 0.4s ease" }} />
            </div>
            <div style={{ fontSize: "13px", color: C.muted, marginTop: "8px" }}>Faltan: {fmt(data.next.missing)} CP</div>
          </div>
        ) : (
          <div style={{ color: "#22c55e", fontSize: "14px", fontWeight: 700, marginTop: "14px" }}>Todos los hitos alcanzados</div>
        )}
      </div>

      <SectionTitle title="Tabla de premios" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "10px", marginBottom: "20px" }}>
        {data.tiers.map((t) => {
          const mine = data.history.find((h) => h.level === t.level);
          const reached = data.totalCp >= t.cpRequired;
          return (
            <div key={t.level} className="aff-card" style={{ ...cardStyle, padding: "14px", opacity: reached ? 1 : 0.55 }}>
              <div style={{ fontSize: "11px", letterSpacing: "1px", color: C.muted, fontWeight: 700 }}>NIVEL {t.level}</div>
              <div style={{ fontSize: "18px", fontWeight: 800 }}>{fmt(t.cpRequired)} CP</div>
              <div style={{ fontSize: "15px", fontWeight: 800, color: C.violetSoft }}>{t.amount} USDT</div>
              <div style={{ marginTop: "6px" }}>
                <StatusBadge status={mine ? mine.status : reached ? "UNLOCKED" : "LOCKED"} />
              </div>
              {mine && (mine.status === "UNLOCKED" || mine.status === "WAITING_FOR_REWARDS_POOL") && (
                <button
                  onClick={() => claim(mine.id)}
                  disabled={working}
                  className="aff-btn"
                  style={{ marginTop: "8px", width: "100%", padding: "9px", borderRadius: "9px", border: "none", background: C.violet, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "12px", fontFamily: FONT }}
                >
                  Reclamar
                </button>
              )}
            </div>
          );
        })}
      </div>

      <SectionTitle title="Historial" />
      {data.history.length === 0 ? (
        <div style={{ color: C.muted, fontSize: "14px" }}>Todavía no desbloqueaste recompensas. Cada venta válida suma 1 CP por USDT.</div>
      ) : (
        data.history.map((h) => (
          <div key={h.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "14px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800 }}>{fmt(h.cpRequired)} CP</span>
            <span style={{ color: C.violetSoft, fontWeight: 800 }}>{h.amount} USDT</span>
            <StatusBadge status={h.status} />
            <span style={{ color: C.muted, fontSize: "12px" }}>{h.createdAt.slice(0, 10)}</span>
            {h.paymentRef && <span style={{ color: C.muted, fontSize: "12px", fontFamily: "monospace" }}>ref {h.paymentRef.slice(0, 18)}…</span>}
            {(h.status === "UNLOCKED" || h.status === "WAITING_FOR_REWARDS_POOL") && (
              <button
                onClick={() => claim(h.id)}
                disabled={working}
                className="aff-btn"
                style={{ padding: "8px 16px", borderRadius: "9px", border: "none", background: C.violet, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "12px", fontFamily: FONT }}
              >
                Reclamar
              </button>
            )}
          </div>
        ))
      )}
      {error && <div style={{ color: "#f87171", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
    </div>
  );
}
