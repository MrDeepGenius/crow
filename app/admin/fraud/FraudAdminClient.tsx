// ============================================
// ADMIN FRAUD - dashboard anti-fraude afiliados
// ============================================
// Señales ≠ prueba: las acciones son manuales y auditadas. IP/device jamás
// bloquean solas (familiares con Wi-Fi compartido son legítimos).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Overview {
  openCases: number;
  highRisk: number;
  reviewRequired: number;
  pendingHolds: number;
  selfAttempts: number;
  cycles: number;
  sharedWallets: { wallet: string; accounts: number }[];
  activity7d: { day: string; n: number }[];
}

interface CaseRow {
  id: string;
  userId: string;
  userEmail: string | null;
  relatedUserId: string | null;
  orderId: string | null;
  status: string;
  riskScore: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

interface CaseDetail {
  case: CaseRow;
  user: { id: string; email: string; name: string; createdAt: string } | null;
  profile: { riskScore: number; riskStatus: string; signals: string[] };
  signals: { type: string; detail: string; weight: number; createdAt: string }[];
  holds: { orderId: string; level: number; amount: number; currency: string; status: string }[];
  audit: { event: string; reason: string; riskScore: number | null; createdAt: string }[];
}

export function FraudAdminClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      if (typeof window !== "undefined") return window.sessionStorage.getItem("crow_admin_key") ?? "";
    } catch {
      // sin clave
    }
    return "";
  });
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [working, setWorking] = useState(false);

  const headers = (): Record<string, string> => ({
    "content-type": "application/json",
    ...(adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {}),
  });

  const load = (): void => {
    void fetch("/api/admin/fraud/overview", { headers: adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {} })
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setAuthError(true);
          return null;
        }
        return r.json() as Promise<{ ok: boolean; overview?: Overview }>;
      })
      .then((data) => {
        if (data?.ok && data.overview) setOverview(data.overview);
      })
      .catch(() => undefined);
    void fetch(`/api/admin/fraud/cases?status=${filter}`, { headers: adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {} })
      .then((r) => (r.ok ? (r.json() as Promise<{ ok: boolean; cases?: CaseRow[] }>) : null))
      .then((data) => {
        if (data?.ok && data.cases) setCases(data.cases);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const openCase = (id: string): void => {
    void fetch(`/api/admin/fraud/cases/${id}`, { headers: headers() })
      .then((r) => r.json() as Promise<{ ok: boolean } & Partial<CaseDetail>>)
      .then((data) => {
        if (data.ok && data.case) setDetail(data as CaseDetail);
      })
      .catch(() => undefined);
  };

  const act = (id: string, action: string): void => {
    if ((action === "BLOCK_COMMISSION" || action === "MARK_SAFE") && note.trim().length < 3) {
      setMsg("Agregá una nota breve para auditar la acción.");
      return;
    }
    setWorking(true);
    void fetch(`/api/admin/fraud/cases/${id}/review`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action, note: note.trim() }),
    })
      .then((r) => r.json() as Promise<{ ok: boolean; reason?: string; case?: CaseDetail["case"] }>)
      .then((data) => {
        if (!data.ok) {
          setMsg(`Acción rechazada (${data.reason ?? "UNKNOWN"}).`);
          return;
        }
        setMsg(`Caso ${id}: ${action}.`);
        setNote("");
        load();
        openCase(id);
      })
      .catch(() => setMsg("Error de red."))
      .finally(() => setWorking(false));
  };

  const saveKey = (): void => {
    try {
      window.sessionStorage.setItem("crow_admin_key", adminKey.trim());
    } catch {
      // no bloquea
    }
    setMsg("Clave admin guardada solo en esta sesión.");
    load();
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "16px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
          ← Marketplace
        </Link>
        <span style={{ color: "#666" }}>/</span>
        <span style={{ fontWeight: "bold" }}>Admin · Anti-fraude afiliados</span>
      </header>
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ color: "#888", fontSize: "13px", maxWidth: "760px", lineHeight: 1.6 }}>
          Las señales son riesgo, no prueba. IP o dispositivo compartido jamás bloquean solos:
          pueden ser familiares, oficina o Wi-Fi compartido. Toda acción queda auditada.
        </p>
        {authError && (
          <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#f87171", margin: "16px 0" }}>
            Se requiere sesión admin o x-admin-key. <Link href="/login?return=/admin/fraud" style={{ color: "#f87171", fontWeight: "bold" }}>Iniciar sesión</Link>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "16px 0" }}>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-admin-key (sesión, opcional si sos admin)"
            aria-label="Clave admin"
            style={{ flex: 1, minWidth: "220px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT }}
          />
          <button onClick={saveKey} style={btnSecondary}>Guardar clave</button>
          <button onClick={load} style={btnSecondary}>Actualizar</button>
        </div>

        {overview && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", margin: "16px 0 24px" }}>
            {[
              ["Casos abiertos", overview.openCases],
              ["HIGH_RISK", overview.highRisk],
              ["REVIEW/BLOCKED", overview.reviewRequired],
              ["Comisiones retenidas", overview.pendingHolds],
              ["Self-referral", overview.selfAttempts],
              ["Ciclos", overview.cycles],
            ].map(([label, value]) => (
              <div key={label as string} style={{ padding: "16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                <div style={{ fontSize: "26px", fontWeight: "bold" }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {overview && overview.sharedWallets.length > 0 && (
          <div style={{ padding: "14px", borderRadius: "12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.35)", fontSize: "13px", marginBottom: "16px" }}>
            <strong>Wallets compartidos (revisar):</strong>
            {overview.sharedWallets.map((w) => (
              <div key={w.wallet} style={{ color: "#aaa", fontFamily: "monospace", fontSize: "12px" }}>
                {w.wallet} · {w.accounts} cuentas
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }} role="tablist" aria-label="Filtro de casos">
          {["OPEN", "ALL"].map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px",
                border: filter === f ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
                background: filter === f ? "rgba(124,58,237,0.2)" : "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: FONT,
              }}
            >
              {f === "OPEN" ? "Abiertos" : "Todos"}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px", color: "#c084fc", marginBottom: "16px" }}>
            {msg}
          </div>
        )}

        {cases.length === 0 ? (
          <div style={{ color: "#888", fontSize: "14px" }}>Sin casos. El sistema está limpio... por ahora.</div>
        ) : (
          cases.map((c) => (
            <div key={c.id} style={{ padding: "14px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", marginBottom: "10px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ fontWeight: "bold" }}>{c.userEmail ?? c.userId.slice(0, 12)} · score {c.riskScore}</div>
                <div style={{ color: "#888" }}>{c.status} · {c.createdAt.slice(0, 16).replace("T", " ")}</div>
              </div>
              <div style={{ color: "#aaa", marginTop: "4px" }}>{c.reason}{c.orderId ? ` · orden ${c.orderId.slice(0, 16)}` : ""}</div>
              <button onClick={() => openCase(c.id)} style={{ ...btnSecondary, marginTop: "10px" }}>Ver detalle</button>
            </div>
          ))
        )}

        {detail && (
          <div style={{ marginTop: "24px", padding: "20px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(124,58,237,0.35)" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 4px" }}>Caso {detail.case.id.slice(0, 16)} · {detail.case.status}</h2>
            <div style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>
              Usuario {detail.user?.email ?? detail.case.userId} · score {detail.profile.riskScore} ({detail.profile.riskStatus})
            </div>
            <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Señales detectadas</div>
            {detail.signals.length === 0 ? (
              <div style={{ color: "#666", fontSize: "13px" }}>Sin señales registradas.</div>
            ) : (
              detail.signals.map((s, i) => (
                <div key={`${s.type}-${i}`} style={{ fontSize: "13px", color: "#aaa" }}>
                  {s.type} (+{s.weight}) <span style={{ color: "#666" }}>{s.detail}</span>
                </div>
              ))
            )}
            <div style={{ fontSize: "13px", fontWeight: "bold", margin: "12px 0 6px" }}>Comisiones afectadas</div>
            {detail.holds.length === 0 ? (
              <div style={{ color: "#666", fontSize: "13px" }}>Ninguna.</div>
            ) : (
              detail.holds.map((h, i) => (
                <div key={i} style={{ fontSize: "13px", color: "#aaa" }}>
                  Orden {h.orderId.slice(0, 16)} · nivel {h.level} · {h.amount} {h.currency} · {h.status}
                </div>
              ))
            )}
            {detail.case.orderId && <OrderLedger orderId={detail.case.orderId} adminKey={adminKey} />}
            <div style={{ fontSize: "13px", fontWeight: "bold", margin: "12px 0 6px" }}>Auditoría reciente</div>
            {detail.audit.slice(0, 10).map((a, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#666" }}>
                {a.createdAt.slice(0, 16).replace("T", " ")} · {a.event} · {a.reason}
              </div>
            ))}
            <label htmlFor="fraud-note" style={{ display: "block", color: "#888", fontSize: "12px", margin: "12px 0 6px" }}>
              Nota de auditoría
            </label>
            <textarea
              id="fraud-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT }}
            />
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              <button onClick={() => act(detail.case.id, "MARK_SAFE")} disabled={working} style={btnPrimary}>Marcar seguro + liberar</button>
              <button onClick={() => act(detail.case.id, "KEEP_UNDER_REVIEW")} disabled={working} style={btnSecondary}>Seguir en revisión</button>
              <button onClick={() => act(detail.case.id, "BLOCK_COMMISSION")} disabled={working} style={btnDanger}>Bloquear comisión</button>
              <button onClick={() => act(detail.case.id, "UNBLOCK_COMMISSION")} disabled={working} style={btnSecondary}>Desbloquear</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
function OrderLedger({ orderId, adminKey }: { orderId: string; adminKey: string }) {
  const [rows, setRows] = useState<{ account: string; level: number | null; percentage: number; amount: number; currency: string; status: string; note: string }[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    void fetch(`/api/admin/fraud/ledger?orderId=${encodeURIComponent(orderId)}`, {
      headers: adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {},
    })
      .then((r) => r.json() as Promise<{ ok: boolean; entries?: { account: string; level: number | null; percentage: number; amount: number; currency: string; status: string; note: string }[]; total?: number }>)
      .then((data) => {
        if (data.ok && data.entries) {
          setRows(data.entries);
          setTotal(data.total ?? null);
        }
      })
      .catch(() => undefined);
  }, [orderId, adminKey]);
  if (!rows) return null;
  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>
        Ledger de la orden (total {total ?? "?"} — debe igualar el pago)
      </div>
      {rows.map((e, i) => (
        <div key={i} style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace" }}>
          {e.account}{e.level !== null && e.level !== undefined ? ` L${e.level}` : ""} · {e.percentage}% · {e.amount} {e.currency} · {e.status}{e.note ? ` · ${e.note}` : ""}
        </div>
      ))}
    </div>
  );
}

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

const btnSecondary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "12px",
};

const btnDanger: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(239,68,68,0.4)",
  background: "transparent",
  color: "#f87171",
  cursor: "pointer",
  fontSize: "12px",
};
