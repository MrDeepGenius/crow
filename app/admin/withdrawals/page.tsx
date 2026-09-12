"use client";

import { useEffect, useState, useCallback } from "react";
import type { Withdrawal, WithdrawalStatus } from "@/app/services/withdrawals/withdrawalService";

interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, AdminUser>>({});
  const [actionState, setActionState] = useState<string | null>(null);
  const [txHashInput, setTxHashInput] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/withdrawals");
      const data = await res.json();
      if (data.ok) {
        const wds = data.withdrawals as Withdrawal[];
        setWithdrawals(wds);
        // Cargar info de usuarios
        const userIds = [...new Set(wds.map((w) => w.userId))];
        const userMap: Record<string, AdminUser> = {};
        for (const id of userIds) {
          try {
            const ures = await fetch(`/api/admin/users/${id}`);
            const udata = await ures.json();
            if (udata.ok) userMap[id] = udata.user;
          } catch { /* best-effort */ }
        }
        setUsers(userMap);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function doAction(endpoint: string, method = "POST", body?: unknown) {
    setActionState(endpoint);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!data.ok) alert(data.message || "Error");
      await load();
    } catch { /* ignore */ }
    setActionState(null);
  }

  const filtered = filter === "ALL"
    ? withdrawals
    : withdrawals.filter((w) => w.status === filter);

  const statusColors: Record<WithdrawalStatus, string> = {
    PENDING: "#f59e0b",
    PROCESSING: "#3b82f6",
    CONFIRMED: "#22c55e",
    REJECTED: "#ef4444",
    FAILED: "#6b7280",
  };

  return (
    <main className="aw-page">
      <div className="aw-header">
        <h1>Retiros · Admin</h1>
        <div className="aw-filters">
          {["ALL", "PENDING", "PROCESSING", "CONFIRMED", "REJECTED", "FAILED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`aw-filter-btn ${filter === s ? "aw-filter-active" : ""}`}
            >
              {s === "ALL" ? "Todos" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="aw-loading">Cargando retiros...</div>
      ) : filtered.length === 0 ? (
        <div className="aw-empty">No hay retiros para mostrar.</div>
      ) : (
        <div className="aw-list">
          {filtered.map((w) => (
            <div key={w.id} className="aw-card">
              <div className="aw-card-top">
                <div className="aw-card-user">
                  <div className="aw-avatar">
                    {(users[w.userId]?.name || w.userId).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="aw-user-name">{users[w.userId]?.name || w.userId.slice(0, 12)}</div>
                    <div className="aw-user-email">{users[w.userId]?.email || ""}</div>
                  </div>
                </div>
                <div className="aw-status-badge" style={{ background: statusColors[w.status] + "22", color: statusColors[w.status] }}>
                  {w.status}
                </div>
              </div>

              <div className="aw-card-grid">
                <div className="aw-field">
                  <span className="aw-field-label">Monto solicitado</span>
                  <span className="aw-field-value">{w.amount} USDT</span>
                </div>
                <div className="aw-field">
                  <span className="aw-field-label">Comisión ({w.feePercent}%)</span>
                  <span className="aw-field-value">{w.fee} USDT</span>
                </div>
                <div className="aw-field">
                  <span className="aw-field-label">Neto a recibir</span>
                  <span className="aw-field-value aw-field-net">{w.net} USDT</span>
                </div>
                <div className="aw-field aw-field-wallet">
                  <span className="aw-field-label">Wallet BEP20</span>
                  <span className="aw-field-value aw-mono">{w.walletAddress.slice(0, 10)}...{w.walletAddress.slice(-6)}</span>
                </div>
                <div className="aw-field">
                  <span className="aw-field-label">Fecha</span>
                  <span className="aw-field-value">{new Date(w.createdAt).toLocaleString("es-AR")}</span>
                </div>
                <div className="aw-field">
                  <span className="aw-field-label">TX Hash</span>
                  <span className="aw-field-value aw-mono">{w.txHash ? `${w.txHash.slice(0, 16)}...` : "—"}</span>
                </div>
              </div>

              {w.status === "PENDING" && (
                <div className="aw-actions">
                  <button
                    onClick={() => doAction(`/api/admin/withdrawals/${w.id}/process`)}
                    disabled={actionState !== null}
                    className="aw-btn aw-btn-blue"
                  >
                    Marcar procesando
                  </button>
                  <input
                    type="text"
                    placeholder="Motivo de rechazo"
                    value={rejectReason[w.id] || ""}
                    onChange={(e) => setRejectReason({ ...rejectReason, [w.id]: e.target.value })}
                    className="aw-input"
                  />
                  <button
                    onClick={() => doAction(`/api/admin/withdrawals/${w.id}/reject`, "POST", { reason: rejectReason[w.id] || "Rechazado" })}
                    disabled={actionState !== null}
                    className="aw-btn aw-btn-red"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {w.status === "PROCESSING" && (
                <div className="aw-actions">
                  <input
                    type="text"
                    placeholder="0x... TX Hash de la transferencia"
                    value={txHashInput[w.id] || ""}
                    onChange={(e) => setTxHashInput({ ...txHashInput, [w.id]: e.target.value })}
                    className="aw-input aw-input-tx"
                  />
                  <button
                    onClick={() => doAction(`/api/admin/withdrawals/${w.id}/confirm`, "POST", { txHash: txHashInput[w.id] })}
                    disabled={actionState !== null || !txHashInput[w.id]}
                    className="aw-btn aw-btn-green"
                  >
                    Confirmar retiro
                  </button>
                  <button
                    onClick={() => doAction(`/api/admin/withdrawals/${w.id}/fail`, "POST", { reason: "Transferencia fallida" })}
                    disabled={actionState !== null}
                    className="aw-btn aw-btn-gray"
                  >
                    Marcar fallido
                  </button>
                  <button
                    onClick={() => doAction(`/api/admin/withdrawals/${w.id}/reject`, "POST", { reason: "Rechazado en procesamiento" })}
                    disabled={actionState !== null}
                    className="aw-btn aw-btn-red"
                  >
                    Rechazar
                  </button>
                </div>
              )}

              {w.rejectedReason && (
                <div className="aw-reject-reason">Motivo: {w.rejectedReason}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        .aw-page {
          min-height: 100vh;
          background: #060408;
          color: #fff;
          font-family: "Inter", system-ui, sans-serif;
          padding: 24px;
        }
        .aw-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }
        .aw-header h1 { font-size: 24px; font-weight: 800; margin: 0; }
        .aw-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .aw-filter-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
        }
        .aw-filter-active {
          background: rgba(124,58,237,0.15);
          border-color: rgba(124,58,237,0.4);
          color: #c084fc;
        }
        .aw-loading, .aw-empty { color: #6b7280; text-align: center; padding: 60px; }
        .aw-list { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
        .aw-card {
          background: rgba(16,12,22,0.85);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 20px;
        }
        .aw-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .aw-card-user { display: flex; align-items: center; gap: 10px; }
        .aw-avatar {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px;
        }
        .aw-user-name { font-weight: 600; font-size: 14px; }
        .aw-user-email { color: #6b7280; font-size: 12px; }
        .aw-status-badge {
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }
        .aw-card-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .aw-field { display: flex; flex-direction: column; gap: 3px; }
        .aw-field-label { font-size: 11px; color: #6b7280; }
        .aw-field-value { font-size: 14px; font-weight: 600; }
        .aw-field-net { color: #22c55e; }
        .aw-field-wallet { grid-column: span 1; }
        .aw-mono { font-family: monospace; font-size: 12px; }
        .aw-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .aw-input {
          background: #0c0c10;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #fff;
          padding: 8px 12px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          min-width: 160px;
        }
        .aw-input-tx { font-family: monospace; flex: 1; min-width: 240px; }
        .aw-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          color: #fff;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s;
        }
        .aw-btn:disabled { opacity: 0.5; cursor: wait; }
        .aw-btn-blue { background: #3b82f6; }
        .aw-btn-green { background: #22c55e; }
        .aw-btn-red { background: #ef4444; }
        .aw-btn-gray { background: #6b7280; }
        .aw-reject-reason {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(239,68,68,0.08);
          border-radius: 8px;
          color: #f87171;
          font-size: 12px;
        }
        @media (max-width: 760px) {
          .aw-card-grid { grid-template-columns: 1fr; }
          .aw-actions { flex-direction: column; align-items: stretch; }
          .aw-input { min-width: 0; }
        }
      `}</style>
    </main>
  );
}
