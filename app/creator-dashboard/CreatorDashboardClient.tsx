"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listPublications } from "@/app/services/marketplace/marketStore";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import { countEvents, getCreatorProfile } from "@/app/services/marketplace/marketStore";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function CreatorDashboardClient() {
  const [stats, setStats] = useState({
    ready: false,
    name: "",
    visits: 0,
    sales: 0,
    revenue: 0,
    products: 0,
    conversion: 0,
    top: [] as { title: string; sales: number; revenue: number }[],
  });

  useEffect(() => {
    const profile = getCreatorProfile();
    if (!profile) {
      setStats((s) => ({ ...s, ready: true }));
      return;
    }
    const mine = listPublications().filter((p) => p.creatorId === profile.id);
    const ids = new Set(mine.map((p) => p.id));
    const sales = listOrders().filter((o) => ids.has(o.productId) && o.status === "PAID");
    const visits = mine.reduce((n, p) => n + countEvents("product_view", p.id), 0);
    const revenue = Math.round(sales.reduce((n, o) => n + o.creatorShare.amount, 0) * 100) / 100;
    setStats({
      ready: true,
      name: profile.displayName,
      visits,
      sales: sales.length,
      revenue,
      products: mine.length,
      conversion: visits > 0 ? Math.round((sales.length / visits) * 1000) / 10 : 0,
      top: mine
        .map((p) => {
          const mineSales = sales.filter((o) => o.productId === p.id);
          return {
            title: p.title,
            sales: mineSales.length,
            revenue: Math.round(mineSales.reduce((n, o) => n + o.creatorShare.amount, 0) * 100) / 100,
          };
        })
        .sort((a, b) => b.sales - a.sales),
    });
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Creator Dashboard
        </Link>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!stats.ready ? (
          <div style={{ color: "#888" }}>Cargando...</div>
        ) : !stats.name ? (
          <div style={{ color: "#888" }}>
            Todavía no tenés perfil de creador. Publicá tu primer producto en{" "}
            <Link href="/marketplace/publish" style={{ color: "#a855f7" }}>Publicar</Link>.
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: "26px", margin: "0 0 20px" }}>Hola, {stats.name}</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                ["Visitas", String(stats.visits)],
                ["Ventas", String(stats.sales)],
                ["Ingresos (parte creador)", `USD ${stats.revenue}`],
                ["Productos", String(stats.products)],
                ["Conversión", `${stats.conversion}%`],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{value}</div>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: "18px", margin: "0 0 12px" }}>Top productos</h2>
            {stats.top.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px" }}>Todavía no publicaste productos.</div>
            ) : (
              stats.top.map((t) => (
                <div key={t.title} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>{t.title}</span>
                  <span style={{ color: "#888" }}>{t.sales} venta(s) · USD {t.revenue}</span>
                </div>
              ))
            )}
          </>
        )}
      </section>
    </main>
  );
}
