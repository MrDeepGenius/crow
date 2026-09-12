// ============================================
// PRICING ADVISOR WIDGET - "Precio inteligente"
// ============================================
// La IA recomienda, el creador decide. Nunca publica ni fija precios solo.

"use client";

import { useEffect, useState } from "react";
import type { ComparableInput, PricingFormat, ProductFeatures } from "@/app/services/pricing/types";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export interface StoredAnalysisView {
  id: string;
  recommendedPrice: number;
  rangeMin: number;
  rangeMax: number;
  budgetPrice: number;
  premiumPrice: number;
  confidence: number;
  marketPosition: string;
  reasoning: string[];
  internalEstimate: number;
  marketMedian: number | null;
  comparablesUsed: number;
  lowDataWarning: string | null;
  analyzedAt: string;
  comparables: {
    title: string;
    category: string;
    type: string;
    observedPrice: number;
    currency: string;
    normalizedPrice: number | null;
    sourceUrl?: string;
  }[];
}

type Phase = "idle" | "product" | "market" | "calc" | "ready" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Listo para analizar",
  product: "Analizando producto...",
  market: "Investigando mercado...",
  calc: "Calculando recomendación...",
  ready: "Resultado listo",
  error: "Error",
};

export function PricingAdvisorWidget(props: {
  productKey: string;
  features: ProductFeatures | null;
  format: PricingFormat;
  comparables: ComparableInput[];
  onUsePrice: (price: number) => void;
  onUsePromo: (regular: number, sale: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [analysis, setAnalysis] = useState<StoredAnalysisView | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Caché vigente al abrir (sin re-analizar ni gastar búsquedas).
  useEffect(() => {
    if (!props.features) return;
    void fetch(`/api/pricing/analyses?productKey=${encodeURIComponent(props.productKey)}`)
      .then((r) => r.json() as Promise<{ ok: boolean; analysis?: StoredAnalysisView | null }>)
      .then((data) => {
        if (data.ok && data.analysis) {
          setAnalysis(data.analysis);
          setPhase("ready");
        }
      })
      .catch(() => {
        // sin caché: el creador lanza el análisis manualmente
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.productKey]);

  const analyze = async (): Promise<void> => {
    if (!props.features) return;
    setError(null);
    setPhase("product");
    try {
      setPhase("market");
      const res = await fetch("/api/pricing/analyze?refresh=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productKey: props.productKey,
          features: props.features,
          comparables: props.comparables,
        }),
      });
      setPhase("calc");
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        analysis?: StoredAnalysisView;
      };
      if (res.status === 401) {
        setError("Iniciá sesión para usar el Pricing Advisor.");
        setPhase("error");
        return;
      }
      if (!data.ok || !data.analysis) {
        setError("No se pudo completar el análisis. Reintentá.");
        setPhase("error");
        return;
      }
      setAnalysis(data.analysis);
      setPhase("ready");
    } catch {
      setError("Error de red. Reintentá.");
      setPhase("error");
    }
  };

  if (!props.features) {
    return (
      <div style={boxStyle}>
        <strong style={{ color: "#fff" }}>Precio inteligente</strong>
        <p style={mutedStyle}>Terminá tu producto en su Studio para activar el análisis de precio.</p>
        <style>{SLIDE_CSS}</style>
      </div>
    );
  }

  return (
    <div style={boxStyle}>
      <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: 800, letterSpacing: "2px" }}>CROW AI PRICING</div>
      <h3 style={{ fontSize: "20px", margin: "6px 0 4px" }}>Precio inteligente</h3>
      <p style={mutedStyle}>Deja que Crow analice tu producto y el mercado para encontrar un precio competitivo.</p>

      {phase !== "ready" || !analysis ? (
        <>
          <button
            onClick={() => void analyze()}
            disabled={phase === "product" || phase === "market" || phase === "calc"}
            style={primaryBtn(phase === "product" || phase === "market" || phase === "calc")}
          >
            {phase === "idle" || phase === "error" ? (analysis ? "Actualizar recomendación" : "Analizar precio") : PHASE_LABEL[phase]}
          </button>
          {(phase === "product" || phase === "market" || phase === "calc") && <ProgressBar />}
          {error && <div style={{ color: "#f87171", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
        </>
      ) : (
        <ResultView
          analysis={analysis}
          onUsePrice={props.onUsePrice}
          onUsePromo={props.onUsePromo}
          onRefresh={() => void analyze()}
        />
      )}
      <style>{SLIDE_CSS}</style>
    </div>
  );
}

function ResultView(props: {
  analysis: StoredAnalysisView;
  onUsePrice: (price: number) => void;
  onUsePromo: (regular: number, sale: number) => void;
  onRefresh: () => void;
}) {
  const a = props.analysis;
  const [showComparables, setShowComparables] = useState(false);
  const marketRange =
    a.comparablesUsed > 0
      ? (() => {
          const vals = a.comparables.filter((c) => c.normalizedPrice !== null).map((c) => c.normalizedPrice as number);
          return vals.length > 0 ? `${Math.min(...vals)}–${Math.max(...vals)} USD` : null;
        })()
      : null;

  return (
    <div>
      <div style={{ textAlign: "center", padding: "20px 12px", borderRadius: "14px", background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(124,58,237,0.04))", border: "1px solid rgba(124,58,237,0.4)", marginTop: "12px" }}>
        <div style={{ color: "#aaa", fontSize: "12px", letterSpacing: "1px" }}>PRECIO SUGERIDO POR CROW AI</div>
        <div style={{ fontSize: "44px", fontWeight: 800 }}>{a.recommendedPrice} USDT</div>
        <div style={{ color: "#aaa", fontSize: "13px", marginTop: "4px" }}>
          Rango recomendado · {a.rangeMin} — {a.rangeMax} USDT
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "12px" }}>
        <PriceOption label="ECONÓMICO" price={a.budgetPrice} highlight={false} onUse={() => props.onUsePrice(a.budgetPrice)} />
        <PriceOption label="RECOMENDADO" price={a.recommendedPrice} highlight onUse={() => props.onUsePrice(a.recommendedPrice)} />
        <PriceOption label="PREMIUM" price={a.premiumPrice} highlight={false} onUse={() => props.onUsePrice(a.premiumPrice)} />
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
        <button onClick={() => props.onUsePrice(a.recommendedPrice)} style={primaryBtn(false)}>
          Usar precio recomendado
        </button>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
        <button
          onClick={() => props.onUsePromo(a.premiumPrice, a.recommendedPrice)}
          style={ghostBtn}
          title="Precio normal = premium, precio de venta = recomendado"
        >
          Usar como promo ({a.premiumPrice} → {a.recommendedPrice} USDT)
        </button>
        <button onClick={props.onRefresh} style={ghostBtn}>
          Actualizar recomendación
        </button>
      </div>
      <p style={{ color: "#666", fontSize: "12px", marginTop: "10px", lineHeight: 1.6 }}>
        Puedes definir tu propio precio editando los campos: la IA solo recomienda, nunca publica sin tu autorización.
      </p>

      <div style={{ marginTop: "16px", padding: "14px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", fontSize: "13px", color: "#aaa", lineHeight: 1.7 }}>
        <div>Productos comparables analizados: <strong style={{ color: "#fff" }}>{a.comparablesUsed}</strong></div>
        {marketRange && <div>Rango observado: <strong style={{ color: "#fff" }}>{marketRange}</strong></div>}
        <div>Tu producto se posiciona como: <strong style={{ color: "#fff" }}>{a.marketPosition}</strong></div>
        <div>Confianza de recomendación: <strong style={{ color: "#fff" }}>{a.confidence} ({confidenceWord(a.confidence)})</strong></div>
      </div>

      {a.lowDataWarning && (
        <div style={{ marginTop: "10px", padding: "12px", borderRadius: "10px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", fontSize: "13px", color: "#fbbf24" }}>
          {a.lowDataWarning} Recomendación basada en las características internas del producto (menor confianza).
        </div>
      )}

      <div style={{ marginTop: "14px" }}>
        <div style={{ fontWeight: 800, fontSize: "14px", marginBottom: "8px" }}>¿Por qué recomendamos este precio?</div>
        {a.reasoning.map((r) => (
          <div key={r.slice(0, 40)} style={{ color: "#aaa", fontSize: "13px", lineHeight: 1.65, marginBottom: "6px" }}>· {r}</div>
        ))}
      </div>

      <button onClick={() => setShowComparables(!showComparables)} style={{ ...ghostBtn, marginTop: "12px" }}>
        {showComparables ? "Ocultar comparables" : `Ver productos comparables (${a.comparables.length})`}
      </button>
      {showComparables && (
        <div style={{ marginTop: "10px" }}>
          {a.comparables.length === 0 ? (
            <div style={{ color: "#666", fontSize: "13px" }}>Sin comparables observados para este análisis.</div>
          ) : (
            a.comparables.map((c) => (
              <div key={`${c.title}-${c.observedPrice}`} style={{ padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "13px" }}>
                <div style={{ fontWeight: 700 }}>{c.title}</div>
                <div style={{ color: "#888", fontSize: "12px", marginTop: "2px" }}>
                  {c.category} · {c.type} · observado {c.observedPrice} {c.currency}
                  {c.normalizedPrice !== null && c.currency !== "USD" && c.currency !== "USDT" ? ` · ≈${c.normalizedPrice} USD (ref.)` : ""}
                  {" · "}Catálogo Crow
                </div>
              </div>
            ))
          )}
          <div style={{ color: "#555", fontSize: "11px", marginTop: "8px" }}>
            Datos observados del catálogo. La recomendación de arriba es una estimación de Crow AI, no un precio de mercado confirmado.
          </div>
        </div>
      )}
    </div>
  );
}

function PriceOption({ label, price, highlight, onUse }: { label: string; price: number; highlight: boolean; onUse: () => void }) {
  return (
    <button
      onClick={onUse}
      style={{
        padding: "14px 8px",
        borderRadius: "12px",
        border: highlight ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
        background: highlight ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.02)",
        boxShadow: highlight ? "0 0 26px rgba(124,58,237,0.3)" : "none",
        color: "#fff",
        cursor: "pointer",
        fontFamily: FONT,
      }}
    >
      <div style={{ fontSize: "10px", letterSpacing: "1px", color: highlight ? "#c4b5fd" : "#888", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>{price}</div>
      <div style={{ fontSize: "11px", color: "#888" }}>USDT</div>
    </button>
  );
}

function ProgressBar() {
  return (
    <div style={{ height: "4px", borderRadius: "2px", background: "rgba(124,58,237,0.2)", overflow: "hidden", marginTop: "12px" }}>
      <div style={{ height: "100%", width: "40%", background: "#7c3aed", borderRadius: "2px", animation: "pricingSlide 1.2s ease-in-out infinite" }} />
    </div>
  );
}

function confidenceWord(c: number): string {
  if (c >= 70) return "Alta";
  if (c >= 45) return "Media";
  return "Baja";
}

const boxStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "20px",
  borderRadius: "14px",
  background: "rgba(124,58,237,0.05)",
  border: "1px solid rgba(124,58,237,0.25)",
};

const mutedStyle: React.CSSProperties = { color: "#888", fontSize: "13px", margin: "6px 0 0", lineHeight: 1.6 };

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: disabled ? "#42206b" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "#fff",
    fontWeight: 800,
    cursor: disabled ? "wait" : "pointer",
    fontSize: "15px",
    opacity: disabled ? 0.7 : 1,
    marginTop: "12px",
    boxShadow: "0 10px 30px rgba(124,58,237,0.3)",
  };
}

const ghostBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 700,
  fontFamily: FONT,
};

const SLIDE_CSS = `@keyframes pricingSlide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`;
