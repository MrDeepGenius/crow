"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listCategories,
  listPublications,
  saveCategories,
  savePublication,
  setPublicationStatus,
} from "@/app/services/marketplace/marketStore";
import { getOrder, listOrders, setOrderStatus } from "@/app/services/marketplace/marketOrders";
import {
  listTransactions,
  listWithdrawals,
  releasePending,
  revokeEntitlement,
  reverseSale,
  settleWithdrawal,
} from "@/app/services/marketplace/marketLedger";
import type { Category, ProductPublication } from "@/app/services/marketplace/marketTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function AdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [products, setProducts] = useState<ProductPublication[]>([]);
  const [orders, setOrders] = useState<ReturnType<typeof listOrders>>([]);
  const [transactions, setTransactions] = useState<ReturnType<typeof listTransactions>>([]);
  const [withdrawals, setWithdrawals] = useState<ReturnType<typeof listWithdrawals>>([]);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const reload = (): void => {
    setCategories(listCategories());
    setProducts(listPublications());
    setOrders(listOrders().slice().reverse());
    setTransactions(listTransactions().slice().reverse());
    setWithdrawals(listWithdrawals().slice().reverse());
  };

  useEffect(() => {
    reload();
  }, []);

  const refundOrder = (id: string): void => {
    const order = getOrder(id);
    if (!order || order.status !== "PAID") {
      setAdminMsg("Solo se puede reembolsar una orden PAID.");
      return;
    }
    if (!setOrderStatus(id, "REFUNDED", "admin")) {
      setAdminMsg("No se pudo marcar REFUNDED.");
      return;
    }
    revokeEntitlement(id);
    reverseSale({ ...order, status: "REFUNDED" });
    setAdminMsg(`Orden ${id} reembolsada: acceso revocado y comisiones revertidas.`);
    reload();
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Admin Marketplace
        </Link>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        <h1 style={{ fontSize: "26px", margin: "0 0 8px" }}>Categorías</h1>
        <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>Gestionan los filtros del Marketplace.</p>
        {categories.map((c) => (
          <div key={c.id} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input
              value={c.name}
              onChange={(e) => {
                const next = categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x));
                setCategories(next);
                saveCategories(next);
              }}
              style={inputStyle}
            />
            <button
              onClick={() => {
                const next = categories.filter((x) => x.id !== c.id);
                setCategories(next);
                saveCategories(next);
              }}
              style={smallBtn}
            >
              Quitar
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", marginBottom: "40px" }}>
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nueva categoría" style={{ ...inputStyle, marginBottom: 0 }} />
          <button
            onClick={() => {
              if (!newCategory.trim()) return;
              const next = [...categories, { id: `cat-${Date.now()}`, name: newCategory.trim(), order: categories.length + 1 }];
              setCategories(next);
              saveCategories(next);
              setNewCategory("");
            }}
            style={smallBtn}
          >
            Agregar
          </button>
        </div>

        {adminMsg && (
          <div style={{ padding: "12px", borderRadius: "10px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px", color: "#c084fc", marginBottom: "20px" }}>
            {adminMsg}
          </div>
        )}

        <h1 style={{ fontSize: "26px", margin: "32px 0 16px" }}>Órdenes ({orders.length})</h1>
        {orders.length === 0 && <div style={{ color: "#888", fontSize: "14px", marginBottom: "16px" }}>Sin órdenes.</div>}
        {orders.map((o) => (
          <div key={o.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px", flexWrap: "wrap", fontSize: "13px" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontWeight: "bold" }}>{o.id} · {o.status}</div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                {o.amount.amount} {o.amount.currency} · comprador {o.buyerId}{o.affiliateId ? ` · afiliado ${o.affiliateId}` : ""} · {o.createdAt.slice(0, 10)}
              </div>
            </div>
            {o.status === "PAID" && (
              <button onClick={() => refundOrder(o.id)} style={{ ...smallBtn, color: "#f87171" }}>
                Reembolsar
              </button>
            )}
          </div>
        ))}

        <div style={{ margin: "24px 0" }}>
          <button
            onClick={() => {
              const ids = [...new Set(transactions.filter((t) => t.status === "PENDING").map((t) => t.userId))];
              let n = 0;
              for (const id of ids) if (releasePending(id, "admin")) n += 1;
              setAdminMsg(n > 0 ? `Fondos liberados para ${n} usuario(s).` : "No hay pendientes para liberar.");
              reload();
            }}
            style={smallBtn}
          >
            Liberar fondos pendientes (clearing)
          </button>
        </div>

        <h1 style={{ fontSize: "26px", margin: "32px 0 16px" }}>Transacciones ({transactions.length})</h1>
        {transactions.length === 0 && <div style={{ color: "#888", fontSize: "14px", marginBottom: "16px" }}>Sin movimientos.</div>}
        {transactions.slice(0, 30).map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "13px" }}>
            <span>{t.type} <span style={{ color: "#666" }}>· {t.userId} · {t.status}</span></span>
            <span style={{ color: t.amount.amount < 0 ? "#f87171" : "#22c55e", fontWeight: "bold" }}>
              {t.amount.amount < 0 ? "" : "+"}{t.amount.amount} {t.amount.currency}
            </span>
          </div>
        ))}

        <h1 style={{ fontSize: "26px", margin: "32px 0 16px" }}>Retiros ({withdrawals.length})</h1>
        {withdrawals.length === 0 && <div style={{ color: "#888", fontSize: "14px", marginBottom: "16px" }}>Sin retiros.</div>}
        {withdrawals.map((w) => (
          <div key={w.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px", flexWrap: "wrap", fontSize: "13px" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontWeight: "bold" }}>USD {w.amount.amount} (neto USD {w.net.amount}) · {w.status}</div>
              <div style={{ color: "#666", fontSize: "12px" }}>{w.userId} · {w.method} · {w.address.slice(0, 20)}...</div>
            </div>
            {w.status === "REQUESTED" && (
              <>
                <button onClick={() => { settleWithdrawal(w.id, "COMPLETED"); reload(); }} style={smallBtn}>
                  Completar
                </button>
                <button onClick={() => { settleWithdrawal(w.id, "REJECTED"); reload(); }} style={{ ...smallBtn, color: "#f87171" }}>
                  Rechazar
                </button>
              </>
            )}
          </div>
        ))}

        <h1 style={{ fontSize: "26px", margin: "0 0 16px" }}>Productos ({products.length})</h1>
        {products.length === 0 && <div style={{ color: "#888" }}>Todavía no hay productos en el catálogo.</div>}
        {products.map((p) => (
          <div key={p.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>{p.title}</div>
              <div style={{ color: "#666", fontSize: "12px" }}>{p.status} · {p.category} · {p.salesCount} ventas</div>
            </div>
            <button
              onClick={() => {
                const found = listPublications().find((x) => x.id === p.id);
                if (found) {
                  savePublication({ ...found, featured: !found.featured, updatedAt: new Date().toISOString() });
                  reload();
                }
              }}
              style={smallBtn}
            >
              {p.featured ? "Quitar destacado" : "Destacar"}
            </button>
            {p.status === "PUBLISHED" ? (
              <button onClick={() => { setPublicationStatus(p.id, "UNPUBLISHED"); reload(); }} style={{ ...smallBtn, color: "#f87171" }}>
                Despublicar
              </button>
            ) : (
              <button onClick={() => { setPublicationStatus(p.id, "PUBLISHED"); reload(); }} style={smallBtn}>
                Publicar
              </button>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "8px 10px",
  fontSize: "13px",
  fontFamily: FONT,
};

const smallBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "12px",
  whiteSpace: "nowrap",
};
