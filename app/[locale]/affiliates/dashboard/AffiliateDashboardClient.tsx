"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublication } from "@/app/services/marketplace/marketStore";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import {
  getAffiliateProfile,
  listClicks,
  listTransactions,
} from "@/app/services/marketplace/marketLedger";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function AffiliateDashboardClient() {
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState({
    clicks: 0,
    sales: 0,
    conversion: 0,
    commissions: 0,
    top: [] as { title: string; sales: number; commissions: number }[],
    history: [] as { id: string; date: string; amount: number; product: string }[],
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crow_affiliate_id");
      if (saved) setUserId(saved);
    } catch {
      // sin afiliado
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const profile = getAffiliateProfile(userId);
    if (!profile) return;
    const clicks = listClicks(profile.id);
    const sales = listOrders().filter((o) => o.affiliateId === profile.id && o.status === "PAID");
    const txs = listTransactions(profile.id).filter(
      (t) => t.type === "AFFILIATE_COMMISSION" || t.type === "RESIDUAL_COMMISSION"
    );
    const commissions = txs.reduce((n, t) => n + t.amount.amount, 0);
    const byProduct = new Map<string, { sales: number; commissions: number }>();
    for (const o of sales) {
      const entry = byProduct.get(o.productId) ?? { sales: 0, commissions: 0 };
      entry.sales += 1;
      entry.commissions += o.affiliateCommission.amount;
      byProduct.set(o.productId, entry);
    }
    setStats({
      clicks: clicks.length,
      sales: sales.length,
      conversion: clicks.length > 0 ? Math.round((sales.length / clicks.length) * 1000) / 10 : 0,
      commissions: Math.round(commissions * 100) / 100,
      top: [...byProduct.entries()]
        .map(([productId, v]) => ({
          title: getPublication(productId)?.title ?? productId,
          sales: v.sales,
          commissions: Math.round(v.commissions * 100) / 100,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5),
      history: sales.map((o) => ({
        id: o.id,
        date: (o.paidAt ?? o.createdAt).slice(0, 10),
        amount: o.affiliateCommission.amount,
        product: getPublication(o.productId)?.title ?? o.productId,
      })),
    });
  }, [userId]);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "20px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/affiliates/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Dashboard afiliado
        </Link>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!userId ? (
          <div style={{ color: "#888" }}>
            Identificate en <Link href="/affiliates/marketplace" style={{ color: "#a855f7" }}>Afiliados</Link> para ver tus métricas.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                ["Clics", String(stats.clicks)],
                ["Ventas", String(stats.sales)],
                ["Conversión", `${stats.conversion}%`],
                ["Comisiones", `USD ${stats.commissions}`],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</div>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Top productos</h2>
            {stats.top.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px", marginBottom: "24px" }}>Todavía no tenés ventas atribuidas.</div>
            ) : (
              stats.top.map((t) => (
                <div key={t.title} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>{t.title}</span>
                  <span style={{ color: "#888" }}>{t.sales} venta(s) · USD {t.commissions}</span>
                </div>
              ))
            )}
            <h2 style={{ fontSize: "18px", margin: "24px 0 12px" }}>Historial</h2>
            {stats.history.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px" }}>Sin movimientos todavía.</div>
            ) : (
              stats.history.map((h) => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>{h.product} <span style={{ color: "#666" }}>· {h.date}</span></span>
                  <span style={{ color: "#22c55e", fontWeight: "bold" }}>+USD {h.amount}</span>
                </div>
              ))
            )}
          </>
        )}
      </section>
    </main>
  );
}
