// ============================================
// ADMIN PAYMENTS - revisión y auditoría USDT BEP20
// ============================================
// Lee órdenes locales (local-first, como /marketplace/admin) y estado
// operativo del servidor (/api/admin/payments). La aprobación manual es
// EXCEPCIONAL: exige nota de auditoría y nunca reemplaza la verificación
// automática on-chain.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublication } from "@/app/services/marketplace/marketStore";
import {
  getOrder,
  listOrders,
  markPaidWithTx,
  setOrderStatus,
} from "@/app/services/marketplace/marketOrders";
import {
  grantEntitlement,
  postSaleToLedger,
} from "@/app/services/marketplace/marketLedger";
import type { Order, OrderStatus } from "@/app/services/marketplace/marketTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

type Filter = "ALL" | OrderStatus;

const FILTERS: Filter[] = ["ALL", "PENDING", "VERIFYING", "PAID", "EXPIRED", "REVIEW_REQUIRED"];

interface UnmatchedRow {
  txHash: string;
  blockNumber: number;
  sender: string;
  amount: number;
  detectedAt: string;
}

interface SightingRow {
  txHash: string;
  blockNumber: number;
  amount: number;
  orderId: string;
  confirmations: number;
}

interface MonitorInfo {
  status: string;
  paused: boolean;
  lastProcessedBlock: number | null;
  currentBlock: number | null;
  lastScanAt: string | null;
  lastError: string | null;
  transfersDetected: number;
  matched: number;
  confirmed: number;
  unmatched: UnmatchedRow[];
  unmatchedCount: number;
  sightings: SightingRow[];
  errors: number;
  lastTxHash: string | null;
  lastPaymentAt: string | null;
}

interface ServerState {
  treasury: string;
  tokenContract: string;
  minConfirmations: number;
  usedTxCount: number;
  manualReviewEnabled: boolean;
  monitor: MonitorInfo | null;
}

export function AdminPaymentsClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [server, setServer] = useState<ServerState | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<"unauthenticated" | "forbidden" | null>(null);
  const [working, setWorking] = useState(false);

  const reload = (): void => {
    setOrders(listOrders().slice().reverse());
  };

  useEffect(() => {
    // Carga post-montaje a propósito: evita hydration mismatch (localStorage
    // no existe en servidor). Patrón usado en todo el codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    try {
      const saved = window.sessionStorage.getItem("crow_admin_key") ?? "";
      if (saved) setAdminKey(saved);
    } catch {
      // sin clave
    }
    void fetch("/api/admin/payments")
      .then((r) => {
        if (r.status === 401) {
          setAuthError("unauthenticated");
          return null;
        }
        if (r.status === 403) {
          setAuthError("forbidden");
          return null;
        }
        return r.json() as Promise<{
          ok: boolean;
          network?: { treasury: string; tokenContract: string; minConfirmations: number };
          registry?: { usedTxCount: number };
          manualReviewEnabled?: boolean;
          monitor?: MonitorInfo;
        }>;
      })
      .then((data) => {
        if (!data) return;
        if (data.ok && data.network && data.registry) {
          setServer({
            treasury: data.network.treasury,
            tokenContract: data.network.tokenContract,
            minConfirmations: data.network.minConfirmations,
            usedTxCount: data.registry.usedTxCount,
            manualReviewEnabled: data.manualReviewEnabled ?? false,
            monitor: data.monitor ?? null,
          });
        }
      })
      .catch(() => {
        // panel sigue funcionando con datos locales
      });
  }, []);

  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  const saveKey = (): void => {
    try {
      window.sessionStorage.setItem("crow_admin_key", adminKey.trim());
    } catch {
      // no bloquea
    }
    setMsg("Clave admin guardada solo en esta sesión.");
  };

  const audit = async (orderId: string, action: "approve" | "reject"): Promise<boolean> => {
    try {
      const res = await fetch("/api/admin/payments/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {}),
        },
        body: JSON.stringify({ orderId, action, note: note.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; detail?: string };
      if (!data.ok) {
        setMsg(data.detail ?? `El servidor rechazó la auditoría (${data.reason ?? "UNKNOWN"}).`);
        return false;
      }
      return true;
    } catch {
      setMsg("No se pudo auditar en el servidor. No se aplicó ningún cambio.");
      return false;
    }
  };

  const manualApprove = async (id: string): Promise<void> => {
    if (note.trim().length < 10) {
      setMsg("Escribí una nota de auditoría (mín. 10 caracteres) antes de aprobar.");
      return;
    }
    const order = getOrder(id);
    if (!order || order.status !== "REVIEW_REQUIRED") {
      setMsg("Solo se puede aprobar manualmente una orden REVIEW_REQUIRED.");
      return;
    }
    setWorking(true);
    try {
      if (!(await audit(id, "approve"))) return;
      const tx = (order.txHash ?? order.paymentReference ?? "").toLowerCase();
      if (!tx) {
        setMsg("La orden no tiene txHash asociado para aprobar.");
        return;
      }
      if (!markPaidWithTx(id, tx, order.blockNumber ?? undefined)) {
        setMsg("No se pudo marcar PAID (la orden cambió de estado).");
        return;
      }
      const paid = getOrder(id);
      if (paid) {
        grantEntitlement(paid);
        postSaleToLedger(paid);
      }
      setMsg(`Orden ${id} aprobada manualmente y acceso otorgado. Caso excepcional auditado.`);
      setNote("");
      reload();
    } finally {
      setWorking(false);
    }
  };

  const manualReject = async (id: string): Promise<void> => {
    if (note.trim().length < 10) {
      setMsg("Escribí una nota de auditoría (mín. 10 caracteres) antes de rechazar.");
      return;
    }
    const order = getOrder(id);
    if (!order || (order.status !== "REVIEW_REQUIRED" && order.status !== "VERIFYING")) {
      setMsg("Solo se puede rechazar una orden REVIEW_REQUIRED o VERIFYING.");
      return;
    }
    setWorking(true);
    try {
      if (!(await audit(id, "reject"))) return;
      if (!setOrderStatus(id, "FAILED", "admin")) {
        setMsg("No se pudo marcar FAILED.");
        return;
      }
      setMsg(`Orden ${id} rechazada. Nunca se marcó como PAID.`);
      setNote("");
      reload();
    } finally {
      setWorking(false);
    }
  };

  const runMigrate = async (): Promise<void> => {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/payments/migrate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {}),
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        users?: number;
        orders?: number;
        payments?: number;
        entitlements?: number;
        skipped?: string[];
      };
      if (!data.ok) {
        setMsg(`Migración rechazada (${data.reason ?? "UNKNOWN"}).`);
        return;
      }
      setMsg(
        `Migración completa (dev): ${data.users} usuarios, ${data.orders} órdenes, ${data.payments} pagos, ${data.entitlements} accesos. ${(data.skipped ?? []).join(" ")}`
      );
      reload();
    } catch {
      setMsg("No se pudo ejecutar la migración.");
    } finally {
      setWorking(false);
    }
  };

  const toggleMonitor = async (action: "pause" | "resume"): Promise<void> => {    setWorking(true);
    try {
      const res = await fetch("/api/admin/payments/monitor", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(adminKey.trim() ? { "x-admin-key": adminKey.trim() } : {}),
        },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      setMsg(data.ok ? `Monitor ${action === "pause" ? "pausado" : "reanudado"}.` : `No se pudo (${data.reason ?? "UNKNOWN"}).`);
    } catch {
      setMsg("No se pudo contactar al servidor.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "16px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
          ← Marketplace
        </Link>
        <span style={{ color: "#666" }}>/</span>
        <span style={{ fontWeight: "bold" }}>Admin · Pagos USDT BEP-20</span>
      </header>
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 80px" }}>
        <p style={{ color: "#888", fontSize: "13px", maxWidth: "720px", lineHeight: 1.6 }}>
          Verificación automática on-chain primero. La aprobación manual es solo para casos
          excepcionales auditados y nunca reemplaza la verificación de BNB Smart Chain.
        </p>
        {authError && (
          <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#f87171", margin: "16px 0", maxWidth: "720px" }}>
            {authError === "unauthenticated" ? (
              <>Esta sección requiere sesión admin. <Link href="/login?return=/admin/payments" style={{ color: "#f87171", fontWeight: "bold" }}>Iniciar sesión</Link> (o usar x-admin-key abajo).</>
            ) : (
              <>Tu usuario no es admin. Pedí acceso o usá x-admin-key con CROW_ADMIN_KEY.</>
            )}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "16px 0" }}>
          <button onClick={() => void runMigrate()} disabled={working} style={btnSecondary}>
            Migrar JSON dev a DB
          </button>
        </div>
        {server && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "#888", margin: "16px 0" }}>
            <span>Treasury <code style={{ color: "#aaa" }}>{server.treasury.slice(0, 10)}…</code></span>
            <span>USDT <code style={{ color: "#aaa" }}>{server.tokenContract.slice(0, 10)}…</code></span>
            <span>{server.minConfirmations} confirmaciones</span>
            <span>{server.usedTxCount} tx únicas</span>
            <span>{server.manualReviewEnabled ? "Auditoría con clave" : "Auditoría sin clave (definí CROW_ADMIN_KEY en prod)"}</span>
          </div>
        )}

        <h2 style={{ fontSize: "18px", margin: "24px 0 12px" }}>Automatic Monitor</h2>
        {!server?.monitor ? (
          <div style={{ color: "#888", fontSize: "13px" }}>Sin datos del monitor (el worker aún no corrió).</div>
        ) : (
          <div style={{ padding: "16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
              <span style={{
                fontSize: "11px", padding: "4px 10px", borderRadius: "8px", fontWeight: "bold",
                background: server.monitor.status === "RUNNING" ? "rgba(34,197,94,0.15)" : server.monitor.status === "PAUSED" ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                color: server.monitor.status === "RUNNING" ? "#22c55e" : server.monitor.status === "PAUSED" ? "#f59e0b" : "#f87171",
              }}>
                {server.monitor.status}
              </span>
              <button onClick={() => void toggleMonitor(server.monitor?.paused ? "resume" : "pause")} disabled={working} style={btnSecondary}>
                {server.monitor.paused ? "Reanudar" : "Pausar"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", color: "#aaa" }}>
              <div>Último bloque procesado<br /><strong style={{ color: "#fff" }}>{server.monitor.lastProcessedBlock ?? "—"}</strong></div>
              <div>Bloque actual<br /><strong style={{ color: "#fff" }}>{server.monitor.currentBlock ?? "—"}</strong></div>
              <div>Último scan<br /><strong style={{ color: "#fff" }}>{server.monitor.lastScanAt ? server.monitor.lastScanAt.slice(11, 19) : "—"}</strong></div>
              <div>Detectadas<br /><strong style={{ color: "#fff" }}>{server.monitor.transfersDetected}</strong></div>
              <div>Asociadas<br /><strong style={{ color: "#fff" }}>{server.monitor.matched}</strong></div>
              <div>Confirmadas<br /><strong style={{ color: "#fff" }}>{server.monitor.confirmed}</strong></div>
              <div>Sin orden<br /><strong style={{ color: "#fff" }}>{server.monitor.unmatchedCount}</strong></div>
              <div>Errores<br /><strong style={{ color: "#fff" }}>{server.monitor.errors}</strong></div>
            </div>
            <div style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
              Último pago detectado: {server.monitor.lastTxHash ? `${server.monitor.lastTxHash.slice(0, 20)}... (${server.monitor.lastPaymentAt?.slice(0, 16).replace("T", " ") ?? ""})` : "—"}
              {server.monitor.lastError ? ` · último error: ${server.monitor.lastError}` : ""}
            </div>
            {server.monitor.sightings.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ color: "#888", fontSize: "12px", marginBottom: "6px" }}>En verificación (esperando confirmaciones):</div>
                {server.monitor.sightings.map((s) => (
                  <div key={s.txHash} style={{ color: "#aaa", fontSize: "12px", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {s.txHash.slice(0, 20)}... → {s.orderId} · {s.amount} USDT · {s.confirmations} conf.
                  </div>
                ))}
              </div>
            )}
            {server.monitor.unmatched.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ color: "#f59e0b", fontSize: "12px", marginBottom: "6px" }}>UNMATCHED_PAYMENT · REVIEW_REQUIRED (sin orden asociada):</div>
                {server.monitor.unmatched.slice(-10).reverse().map((u) => (
                  <div key={u.txHash} style={{ color: "#aaa", fontSize: "12px", fontFamily: "monospace", wordBreak: "break-all" }}>
                    {u.txHash.slice(0, 20)}... · {u.amount} USDT · de {u.sender.slice(0, 12)}... · bloque {u.blockNumber}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "16px 0" }} role="tablist" aria-label="Filtro por estado">
          {FILTERS.map((f) => (
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
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-admin-key (sesión)"
            aria-label="Clave admin"
            style={{ flex: 1, minWidth: "200px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT }}
          />
          <button onClick={saveKey} style={btnSecondary}>Guardar clave</button>
        </div>
        <label htmlFor="admin-note" style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>
          Nota de auditoría obligatoria para aprobar/rechazar (mín. 10 caracteres)
        </label>
        <textarea
          id="admin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Ej: BscScan muestra 25 USDT a la treasury en el bloque 61234567, verificado manualmente…"
          style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT, marginBottom: "12px" }}
        />

        {msg && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px", color: "#c084fc", marginBottom: "16px" }}>
            {msg}
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ color: "#888", fontSize: "14px" }}>Sin órdenes en este estado.</div>
        ) : (
          filtered.map((o) => {
            const pub = getPublication(o.productId);
            return (
              <div key={o.id} style={{ padding: "14px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", marginBottom: "10px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: "bold" }}>{o.id} · {o.status}</div>
                  <div style={{ color: "#888" }}>{o.createdAt.slice(0, 16).replace("T", " ")}</div>
                </div>
                <div style={{ color: "#aaa", marginTop: "6px" }}>
                  {pub?.title ?? o.productId} · {o.amount.amount} {o.amount.currency} · usuario {o.buyerId}
                </div>
                <div style={{ color: "#666", fontSize: "12px", marginTop: "4px", wordBreak: "break-all" }}>
                  TX {o.txHash ?? o.paymentReference ?? "—"}
                  {typeof o.blockNumber === "number" ? ` · bloque ${o.blockNumber}` : ""}
                  {o.network ? ` · red ${o.network}` : ""}
                </div>
                {(o.status === "REVIEW_REQUIRED" || o.status === "VERIFYING") && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    {o.status === "REVIEW_REQUIRED" && (
                      <button onClick={() => void manualApprove(o.id)} disabled={working} style={btnPrimary}>
                        Aprobar excepcional
                      </button>
                    )}
                    <button onClick={() => void manualReject(o.id)} disabled={working} style={btnDanger}>
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
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
  padding: "10px 16px",
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
