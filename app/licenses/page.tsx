// ============================================
// LICENCIAS - vitrina + compra USDT (flujo quote/verify existente)
// ============================================

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Tier {
  id: string;
  name: string;
  price: number;
  currency: string;
  perks: string[];
}

interface Quote {
  qid: string;
  orderId: string;
  amount: number;
  currency: string;
  sig: string;
  treasury?: string;
  chainId?: number;
  issuedAt?: string;
  exp?: string;
}

function LicensesClient() {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [treasury, setTreasury] = useState("");
  const [txHash, setTxHash] = useState("");
  const [phase, setPhase] = useState<"list" | "pay" | "done" | "error">("list");
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void fetch("/api/licenses")
      .then((r) => r.json() as Promise<{ ok: boolean; tiers?: Tier[] }>)
      .then((d) => {
        if (d.ok && d.tiers) setTiers(d.tiers);
      })
      .catch(() => undefined);
    void fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ ok: boolean; user?: unknown }>)
      .then((d) => setAuthed(Boolean(d.ok && d.user)))
      .catch(() => setAuthed(false));
  }, []);

  const buy = (t: Tier): void => {
    if (!authed) {
      router.push("/login?return=/licenses");
      return;
    }
    setWorking(true);
    setMsg(null);
    void fetch("/api/licenses/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tierId: t.id }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; reason?: string; orderId?: string }>)
      .then((d) => {
        if (!d.ok || !d.orderId) {
          setMsg(`No se pudo crear la orden (${d.reason ?? "error"}).`);
          return;
        }
        setOrderId(d.orderId);
        setTier(t);
        return fetch("/api/payments/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: d.orderId }),
        })
          .then((r) => r.json() as Promise<{ ok: boolean; quote?: Quote; payment?: { treasury?: string } }>)
          .then((q) => {
            if (!q.ok || !q.quote) {
              setMsg("No se pudo generar la cotización.");
              return;
            }
            setQuote(q.quote);
            setTreasury(q.payment?.treasury ?? "");
            setPhase("pay");
          });
      })
      .catch(() => setMsg("Sin conexión."))
      .finally(() => setWorking(false));
  };

  const verify = (): void => {
    if (!orderId || !quote || !txHash.trim()) return;
    setWorking(true);
    setMsg(null);
    void fetch("/api/payments/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, txHash: txHash.trim(), quote }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; reason?: string; reviewRequired?: boolean }>)
      .then((d) => {
        if (!d.ok) {
          setMsg(d.reviewRequired ? "Pago en revisión manual." : `No verificado (${d.reason ?? "error"}).`);
          if (d.reason === "QUOTE_EXPIRED") setPhase("error");
          return;
        }
        setPhase("done");
      })
      .catch(() => setMsg("Sin conexión."))
      .finally(() => setWorking(false));
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "68px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "14px" }}>
        <Link href="/marketplace" style={{ color: "#fff", textDecoration: "none", fontWeight: 800, fontSize: "17px" }}>CROW</Link>
        <span style={{ color: "#666" }}>/</span>
        <span style={{ fontWeight: 700 }}>Licencias</span>
        <div style={{ marginLeft: "auto" }}>
          <BackButton />
        </div>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "44px 24px 80px" }}>
        <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Licencias Crow</h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 8px", lineHeight: 1.6 }}>
          Cada licencia paga el 2% al Crow Rewards Pool. Pagás con USDT en BNB Smart Chain.
        </p>
        {phase === "list" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "12px", marginTop: "24px" }}>
            {tiers.map((t) => (
              <div key={t.id} style={{ padding: "20px", borderRadius: "16px", background: "#0c0c0f", border: t.id === "PRO" ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#a855f7", fontWeight: 800 }}>{t.name.toUpperCase()}</div>
                <div style={{ fontSize: "34px", fontWeight: 800, margin: "6px 0" }}>{t.price} <span style={{ fontSize: "14px", color: "#888" }}>USDT</span></div>
                <ul style={{ margin: "0 0 16px", paddingLeft: "18px", color: "#aaa", fontSize: "12px", lineHeight: 1.7 }}>
                  {t.perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <button
                  onClick={() => buy(t)}
                  disabled={working}
                  style={{ width: "100%", padding: "12px", borderRadius: "11px", border: "none", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "14px" }}
                >
                  Comprar
                </button>
              </div>
            ))}
          </div>
        )}
        {phase === "pay" && tier && (
          <div style={{ maxWidth: "560px", marginTop: "24px", padding: "24px", borderRadius: "16px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: "20px", margin: "0 0 6px" }}>Licencia {tier.name} · {tier.price} USDT</h2>
            <p style={{ color: "#888", fontSize: "13px" }}>Enviá el monto exacto a la wallet de Crow y pegá el hash.</p>
            <div style={{ fontSize: "12px", color: "#888", margin: "12px 0 4px" }}>Wallet receptora (BSC)</div>
            <div style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all", background: "#050505", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
              {treasury || "Cargando..."}
            </div>
            <div style={{ fontSize: "12px", color: "#888", margin: "14px 0 4px" }}>Transaction hash</div>
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value.trim())}
              placeholder="0x..."
              spellCheck={false}
              style={{ width: "100%", boxSizing: "border-box", background: "#050505", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px", fontSize: "13px", fontFamily: "monospace" }}
            />
            <button
              onClick={verify}
              disabled={working || !txHash}
              style={{ width: "100%", marginTop: "14px", padding: "13px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "15px", opacity: working || !txHash ? 0.6 : 1 }}
            >
              {working ? "Verificando..." : "Verificar pago"}
            </button>
          </div>
        )}
        {phase === "done" && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "30px", fontWeight: 800 }}>Pago confirmado</div>
            <p style={{ color: "#888" }}>Tu licencia aporta 2% al Rewards Pool y tu volumen ya suma CP.</p>
            <Link href="/affiliates" style={{ display: "inline-block", marginTop: "12px", padding: "12px 26px", borderRadius: "11px", background: "#7c3aed", color: "#fff", fontWeight: 800, textDecoration: "none" }}>
              Ver mis Rewards
            </Link>
          </div>
        )}
        {msg && <div style={{ color: "#f87171", fontSize: "13px", marginTop: "14px" }}>{msg}</div>}
      </section>
    </main>
  );
}

export default function LicensesPage() {
  return (
    <Suspense>
      <LicensesClient />
    </Suspense>
  );
}
