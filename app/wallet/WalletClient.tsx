"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/app/components/BackButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Balance {
  available: number;
  reserved: number;
  netAvailable: number;
  currency: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net: number;
  currency: string;
  walletAddress: string;
  txHash: string | null;
  status: string;
  feePercent: number;
  periodFirst: number;
  createdAt: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

export function WalletClient() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [balRes, wdRes] = await Promise.all([
        fetch("/api/withdrawals"),
        fetch("/api/withdrawals/mine"),
      ]);
      const balData = await balRes.json();
      if (balData.ok) setBalance(balData.balance);
      const wdData = await wdRes.json();
      if (wdData.ok) setWithdrawals(wdData.withdrawals ?? []);
    } catch {
      // network error
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const submitWithdrawal = async () => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError("Monto inválido.");
      return;
    }
    if (amt < 25) {
      setError("El mínimo de retiro es 25 USDT.");
      return;
    }
    if (!walletAddress.trim() || walletAddress.trim().length < 20) {
      setError("Wallet BEP20 inválida.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, walletAddress: walletAddress.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? data.error ?? "Error solicitando retiro");
        return;
      }
      setSuccess("Retiro solicitado correctamente.");
      setAmount("");
      setWalletAddress("");
      loadData();
    } catch {
      setError("Error de red.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
        <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
          <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
            <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
            Wallet
          </Link>
          <div style={{ marginLeft: "auto" }}>
            <BackButton />
          </div>
        </header>
        <section style={{ maxWidth: "480px", margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px" }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 8px" }}>Iniciá sesión para ver tu wallet</h1>
            <p style={{ color: "#888", fontSize: "14px", marginBottom: "16px" }}>Necesitás estar autenticado para ver tus balances y retiros.</p>
            <Link href="/login" style={{ display: "inline-block", padding: "12px 24px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>
              Iniciar sesión
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const grossAmount = Number(amount) || 0;
  const isFirst = withdrawals.filter((w) => w.status === "CONFIRMED").length === 0;
  const feePercent = isFirst ? 2 : 3;
  const feeAmount = Math.round(grossAmount * feePercent) / 100;
  const netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Wallet
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <BackButton />
        </div>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Balance cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
          {[
            ["Available", balance ? `${balance.available} ${balance.currency}` : "—"],
            ["Reserved", balance ? `${balance.reserved} ${balance.currency}` : "—"],
            ["Net Available", balance ? `${balance.netAvailable} ${balance.currency}` : "—"],
            ["Currency", balance ? balance.currency : "—"],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Withdrawal form */}
        <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Solicitar retiro (mín. 25 USDT)</h2>
        <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px", marginBottom: "28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Monto USDT</label>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="25" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Wallet BEP20</label>
              <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x..." style={inputStyle} />
            </div>
          </div>

          {/* Fee breakdown */}
          {grossAmount > 0 && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#0a0a0c", borderRadius: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#888" }}>Gross withdrawal</span>
                <span>{grossAmount} USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#888" }}>Fee %</span>
                <span>{feePercent}% {isFirst ? "(primer retiro)" : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ color: "#888" }}>Fee amount</span>
                <span>{feeAmount} USDT</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "8px", marginTop: "4px" }}>
                <span style={{ fontWeight: "bold" }}>Net withdrawal</span>
                <span style={{ fontWeight: "bold" }}>{netAmount} USDT</span>
              </div>
            </div>
          )}

          {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px", marginTop: "8px" }}>{error}</div>}
          {success && <div style={{ color: "#4ade80", fontSize: "13px", marginBottom: "8px", marginTop: "8px" }}>{success}</div>}
          <button
            onClick={submitWithdrawal}
            disabled={submitting}
            style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: submitting ? "#5c2ab0" : "#7c3aed", color: "#fff", fontWeight: "bold", cursor: submitting ? "not-allowed" : "pointer", marginTop: "12px" }}
          >
            {submitting ? "Procesando…" : "Solicitar retiro"}
          </button>
          <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
            Los retiros quedan en revisión manual. Primer retiro dentro de 30 días: 2%. Siguientes: 3%. CONFIRMED requiere TX hash.
          </p>
        </div>

        {/* Withdrawal history */}
        <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Historial de retiros</h2>
        {withdrawals.length === 0 ? (
          <div style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Sin retiros solicitados.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {withdrawals.map((w) => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.06)", fontSize: "14px" }}>
                <div>
                  <div style={{ fontWeight: "bold" }}>{w.amount} USDT → neto {w.net} USDT</div>
                  <div style={{ color: "#666", fontSize: "12px" }}>
                    Fee {w.fee} USDT ({w.feePercent}%) · {w.walletAddress.slice(0, 10)}…{w.walletAddress.slice(-6)}
                    {w.txHash && ` · TX: ${w.txHash.slice(0, 12)}…`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    background: w.status === "CONFIRMED" ? "rgba(34,197,94,0.15)" : w.status === "PENDING" ? "rgba(234,179,8,0.15)" : w.status === "REJECTED" || w.status === "FAILED" ? "rgba(239,68,68,0.15)" : "rgba(124,58,237,0.15)",
                    color: w.status === "CONFIRMED" ? "#4ade80" : w.status === "PENDING" ? "#facc15" : w.status === "REJECTED" || w.status === "FAILED" ? "#f87171" : "#a78bfa",
                  }}>
                    {w.status}
                  </span>
                  <div style={{ color: "#555", fontSize: "11px", marginTop: "4px" }}>{w.createdAt.slice(0, 10)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#888",
  marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  color: "#fff",
  padding: "12px 14px",
  fontSize: "14px",
  fontFamily: FONT,
};
