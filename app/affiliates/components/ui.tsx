// ============================================
// AFFILIATE OS - sistema visual compartido
// ============================================
// Tokens, tarjetas, estados y microinteracciones. Solo presentación:
// ningún componente modifica reglas de negocio ni datos.

"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const C = {
  bg: "#050505",
  panel: "#0b0b10",
  card: "#101016",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  muted: "#a1a1aa",
  faint: "#63636b",
  violet: "#7c3aed",
  violetSoft: "#a855f7",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#f87171",
  blue: "#38bdf8",
};

export const cardStyle: React.CSSProperties = {
  background: `radial-gradient(120% 140% at 0% 0%, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0) 45%), ${C.card}`,
  border: `1px solid ${C.border}`,
  borderRadius: "18px",
  padding: "20px",
};

export const GLOBAL_CSS = `
.aff-card { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
.aff-card:hover { transform: translateY(-2px); border-color: rgba(124,58,237,0.35); box-shadow: 0 12px 32px rgba(124,58,237,0.12); }
.aff-btn { transition: filter 0.15s ease, transform 0.15s ease, background 0.15s ease; }
.aff-btn:hover { filter: brightness(1.12); }
.aff-btn:active { transform: scale(0.98); }
.aff-btn:focus-visible, .aff-navitem:focus-visible, a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }
.aff-navitem { transition: background 0.15s ease, color 0.15s ease; }
.aff-fadein { animation: affFade 0.35s ease both; }
@keyframes affFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.aff-skeleton { position: relative; overflow: hidden; background: rgba(255,255,255,0.05); border-radius: 8px; }
.aff-skeleton::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(168,85,247,0.12), transparent); animation: affShimmer 1.4s infinite; }
@keyframes affShimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
.aff-toast { animation: affToastIn 0.25s ease both; }
@keyframes affToastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.aff-draw { stroke-dasharray: 600; stroke-dashoffset: 600; animation: affDraw 1s ease forwards; }
@keyframes affDraw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .aff-card, .aff-btn, .aff-fadein, .aff-skeleton::after, .aff-toast, .aff-draw { animation: none !important; transition: none !important; }
}
`;

// ---------- Toast ----------

interface ToastCtx {
  toast: (msg: string) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => undefined });

export function useToast(): ToastCtx {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }} aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="aff-toast" style={{ background: "#17171f", border: "1px solid rgba(124,58,237,0.4)", color: "#fff", padding: "10px 18px", borderRadius: "12px", fontSize: "13px", boxShadow: "0 8px 28px rgba(0,0,0,0.5)" }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------- Piezas ----------

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
      <h2 style={{ fontSize: "17px", margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", border: `1px dashed rgba(255,255,255,0.12)`, borderRadius: "16px" }}>
      <div style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "6px" }}>{title}</div>
      <div style={{ color: C.muted, fontSize: "13px", marginBottom: action ? "16px" : 0 }}>{detail}</div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "PAID" || status === "ACTIVO" || status === "COMPLETED" || status === "Disponible"
      ? C.green
      : status === "PENDING" || status === "NUEVO" || status === "REQUESTED"
        ? C.amber
        : status === "REVERSED" || status === "FAILED" || status === "REJECTED" || status === "INACTIVO"
          ? C.red
          : C.muted;
  return (
    <span style={{ fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", color }}>
      {status}
    </span>
  );
}

export function Skeleton({ height }: { height: number }) {
  return <div className="aff-skeleton" style={{ height, width: "100%" }} />;
}

export function SkeletonGrid() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={110} />
      ))}
    </div>
  );
}

export function Avatar({ name, size }: { name: string; size?: number }) {
  const s = size ?? 40;
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "?";
  const parts = clean.split(/\s+/);
  const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return (
    <div
      aria-hidden
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: s * 0.38,
        fontWeight: "bold",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { toast } = useToast();
  const [ok, setOk] = useState(false);
  return (
    <button
      aria-label={label ?? "Copiar enlace"}
      onClick={() => {
        copyText(text, () => {
          setOk(true);
          toast("Link copiado.");
          setTimeout(() => setOk(false), 2000);
        });
      }}
      className="aff-btn"
      style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: C.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
    >
      {ok ? "Copiado" : (label ?? "Copiar")}
    </button>
  );
}

export function ShareButton({ title, text, url, label }: { title: string; text: string; url: string; label?: string }) {
  const { toast } = useToast();
  return (
    <button
      aria-label={label ?? "Compartir"}
      onClick={() => {
        const nav = navigator as Navigator & { share?: (data: { title: string; text: string; url: string }) => Promise<void> };
        if (nav.share) {
          nav.share({ title, text, url }).catch(() => undefined);
        } else {
          copyText(url, () => toast("Link copiado para compartir."));
        }
      }}
      className="aff-btn"
      style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#ddd", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}
    >
      {label ?? "Compartir"}
    </button>
  );
}

export function copyText(text: string, done: () => void): void {
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

export function RangeBar({ range, setRange }: { range: number; setRange: (r: 7 | 30 | 90 | 0) => void }) {
  const opts: { v: 7 | 30 | 90 | 0; l: string }[] = [
    { v: 7, l: "7D" },
    { v: 30, l: "30D" },
    { v: 90, l: "90D" },
    { v: 0, l: "Todo" },
  ];
  return (
    <div style={{ display: "flex", gap: "6px" }} role="group" aria-label="Rango de fechas">
      {opts.map((o) => (
        <button
          key={o.l}
          onClick={() => setRange(o.v)}
          aria-pressed={range === o.v}
          style={{ padding: "7px 13px", borderRadius: "9px", border: range === o.v ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)", background: range === o.v ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: range === o.v ? "bold" : "normal" }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
