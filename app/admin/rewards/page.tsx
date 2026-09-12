// ============================================
// ADMIN REWARDS - auditoría pool + emergency (ADMIN ONLY)
// ============================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Overview {
  pool: { balance: number; totalCredits: number; totalDebits: number; totalPaid: number; totalReversed: number; unlockedCount: number; pendingCount: number };
  emergencyReserve: number;
  credits: { licenseOrderId: string; amount: number; createdAt: string }[];
  debits: { licenseOrderId: string; amount: number; createdAt: string }[];
  byStatus: { status: string; n: number; total: number }[];
}

interface PendingReward {
  id: string;
  userId: string;
  email: string;
  level: number;
  amount: number;
  status: string;
  createdAt: string;
}

export default function AdminRewardsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [pending, setPending] = useState<PendingReward[]>([]);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      if (typeof window !== "undefined") return window.sessionStorage.getItem("crow_admin_key") ?? "";
    } catch {
      // sin clave
    }
    return "";
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [payRef, setPayRef] = useState<Record<string, string>>({});
  const [working, setWorking] = useState(false);

  const headers = (): Record<string, string> => ({
    "content-type": "application/json",
    ...(adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {}),
  });

  const load = (): void => {
    void fetch("/api/admin/rewards", { headers: adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {} })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setAuthError(true);
          return null;
        }
        return r.json() as Promise<{ ok: boolean } & Partial<Overview> & { pending?: PendingReward[] }>;
      })
      .then((d) => {
        if (d?.ok) {
          setData(d as Overview);
          setPending(d.pending ?? []);
        }
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = (rewardId: string, userId: string): void => {
    const ref = (payRef[rewardId] ?? "").trim();
    if (!ref) {
      setMsg("Ingresá la referencia del pago REAL (tx hash) antes de marcar PAID.");
      return;
    }
    setWorking(true);
    void fetch("/api/admin/rewards/pay", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ rewardId, userId, paymentRef: ref }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; reason?: string }>)
      .then((d) => {
        setMsg(d.ok ? "Pago registrado." : `Rechazado (${d.reason ?? "error"}).`);
        load();
      })
      .catch(() => setMsg("Error de red."))
      .finally(() => setWorking(false));
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href="/marketplace" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>← Marketplace</Link>
        <span style={{ color: "#666" }}>/</span>
        <span style={{ fontWeight: "bold" }}>Admin · Crow Rewards Pool</span>
        <Link href="/admin/fraud" style={{ marginLeft: "auto", color: "#a855f7", fontSize: "13px" }}>Anti-fraude →</Link>
      </header>
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 80px" }}>
        {authError && (
          <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#f87171", marginBottom: "16px" }}>
            Se requiere sesión admin o x-admin-key. <Link href="/login?return=/admin/rewards" style={{ color: "#f87171", fontWeight: "bold" }}>Iniciar sesión</Link>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-admin-key (opcional si sos admin)"
            aria-label="Clave admin"
            style={{ flex: 1, minWidth: "220px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT }}
          />
          <button onClick={() => { try { window.sessionStorage.setItem("crow_admin_key", adminKey.trim()); } catch { /* noop */ } load(); }} style={btn}>Guardar clave</button>
          <button onClick={load} style={btn}>Actualizar</button>
        </div>
        {msg && <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px", color: "#c084fc", marginBottom: "16px" }}>{msg}</div>}
        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px", marginBottom: "20px" }}>
              <Stat label="REWARDS POOL BALANCE" value={`${data.pool.balance} USDT`} />
              <Stat label="Total créditos" value={`${data.pool.totalCredits} USDT`} />
              <Stat label="Total pagado" value={`${data.pool.totalPaid} USDT`} />
              <Stat label="Total revertido" value={`${data.pool.totalReversed} USDT`} />
              <Stat label="EMERGENCY RESERVE" value={`${data.emergencyReserve} USDT`} />
              <Stat label="Rewards pendientes" value={String(data.pool.pendingCount)} />
            </div>
            <p style={{ color: "#666", fontSize: "12px" }}>
              Fondos separados: Rewards Pool (solo 2% licencias) · Emergency Reserve (solo 2,5% primer desbloqueo L1) · Crow Commission (10% ventas). Nunca se mezclan.
            </p>
            <h2 style={{ fontSize: "18px", margin: "28px 0 12px" }}>Por estado</h2>
            {data.byStatus.map((s) => (
              <div key={s.status} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span>{s.status}</span>
                <span style={{ color: "#aaa" }}>{s.n} · {s.total} USDT</span>
              </div>
            ))}
            <h2 style={{ fontSize: "18px", margin: "28px 0 12px" }}>Recompensas reclamadas (pago manual con referencia real)</h2>
            {pending.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px" }}>Nada pendiente de pago.</div>
            ) : (
              pending.map((p) => (
                <div key={p.id} style={{ padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px", fontSize: "13px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: "180px" }}>{p.email} · Nivel {p.level} · {p.amount} USDT · {p.createdAt.slice(0, 10)}</span>
                  <input
                    value={payRef[p.id] ?? ""}
                    onChange={(e) => setPayRef((m) => ({ ...m, [p.id]: e.target.value }))}
                    placeholder="tx hash del pago real"
                    spellCheck={false}
                    style={{ flex: 1, minWidth: "180px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "9px 12px", fontSize: "12px", fontFamily: "monospace" }}
                  />
                  <button onClick={() => pay(p.id, p.userId)} disabled={working} style={btnPrimary}>Marcar PAID</button>
                </div>
              ))
            )}
            <h2 style={{ fontSize: "18px", margin: "28px 0 12px" }}>Últimos créditos (licencias)</h2>
            {data.credits.slice(0, 15).map((c, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#888", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontFamily: "monospace" }}>
                {c.createdAt.slice(0, 16).replace("T", " ")} · {c.licenseOrderId.slice(0, 14)}… · +{c.amount} USDT
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ color: "#666", fontSize: "11px", letterSpacing: "1px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "12px",
};

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "10px",
  border: "none",
  background: "#7c3aed",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "12px",
};
