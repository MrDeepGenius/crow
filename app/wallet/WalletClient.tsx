"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getWallet,
  listTransactions,
  listWithdrawals,
  requestWithdrawal,
} from "@/app/services/marketplace/marketLedger";
import type { Wallet, WalletTransaction, Withdrawal } from "@/app/services/marketplace/marketTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function WalletClient() {
  const [userId, setUserId] = useState("");
  const [input, setInput] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"USDT_BEP20" | "USDT_TRC20">("USDT_BEP20");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = (id: string): void => {
    setWallet(getWallet(id));
    setTxs(listTransactions(id).slice().reverse());
    setWithdrawals(listWithdrawals(id).slice().reverse());
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crow_wallet_id");
      if (saved) {
        setUserId(saved);
        setInput(saved);
      }
    } catch {
      // sin wallet
    }
  }, []);

  useEffect(() => {
    if (userId) refresh(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const login = (): void => {
    if (!input.trim()) return;
    setUserId(input.trim());
    try {
      window.localStorage.setItem("crow_wallet_id", input.trim());
    } catch {
      // no bloquea
    }
  };

  const submitWithdrawal = (): void => {
    if (!userId) return;
    setError(null);
    const result = requestWithdrawal(userId, Number(amount), method, address);
    if (!result.ok) {
      setError(result.error ?? "Error solicitando retiro");
      return;
    }
    setAmount("");
    setAddress("");
    refresh(userId);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Wallet
        </Link>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!userId ? (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", maxWidth: "480px" }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 8px" }}>Identificate para ver tu wallet</h1>
            <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tu usuario o email" style={{ flex: 1, background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT }} />
              <button onClick={login} style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Entrar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                ["Disponible", wallet ? `USD ${wallet.available.amount}` : "—"],
                ["Pendiente", wallet ? `USD ${wallet.pending.amount}` : "—"],
                ["En retiro", wallet ? `USD ${wallet.withdrawalPending.amount}` : "—"],
                ["Retirado", wallet ? `USD ${wallet.paidOut.amount}` : "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Solicitar retiro (mín. 25 USDT, fee 2%)</h2>
            <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px", marginBottom: "28px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Monto USD</label>
                  <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Red</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value as "USDT_BEP20" | "USDT_TRC20")} style={inputStyle}>
                    <option value="USDT_BEP20">USDT BEP20</option>
                    <option value="USDT_TRC20">USDT TRC20</option>
                  </select>
                </div>
              </div>
              <label style={labelStyle}>Dirección</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de tu wallet" style={inputStyle} />
              {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "8px" }}>{error}</div>}
              <button onClick={submitWithdrawal} style={{ padding: "12px 24px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Solicitar retiro
              </button>
              <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
                Los retiros quedan en revisión manual. Nunca podrás retirar más de tu saldo disponible.
              </p>
            </div>

            <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Retiros</h2>
            {withdrawals.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Sin retiros solicitados.</div>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>USD {w.amount.amount} → neto USD {w.net.amount} <span style={{ color: "#666" }}>· {w.method} · {w.status}</span></span>
                  <span style={{ color: "#666" }}>{w.createdAt.slice(0, 10)}</span>
                </div>
              ))
            )}

            <h2 style={{ fontSize: "18px", margin: "24px 0 12px" }}>Movimientos</h2>
            {txs.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px" }}>Sin movimientos. Cada venta, comisión o retiro genera su registro aquí.</div>
            ) : (
              txs.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>{t.type} <span style={{ color: "#666" }}>· {t.status} · {t.createdAt.slice(0, 10)}</span></span>
                  <span style={{ color: t.amount.amount < 0 ? "#f87171" : "#22c55e", fontWeight: "bold" }}>
                    {t.amount.amount < 0 ? "" : "+"}USD {t.amount.amount}
                  </span>
                </div>
              ))
            )}
          </>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#888", fontSize: "11px", marginBottom: "4px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "14px",
  marginBottom: "8px",
  fontFamily: FONT,
};
