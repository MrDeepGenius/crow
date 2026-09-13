"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreatorPageEditor } from "@/app/components/CreatorPageEditor";
import { BackButton } from "@/app/components/BackButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface DashboardData {
  totalProducts: number;
  publishedProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalViews: number;
  recentProducts: { id: string; title: string; status: string; salesCount: number }[];
  salesByProduct: { productId: string; title: string; sales: number; revenue: number }[];
}

export function CreatorDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/creators/dashboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Creator Dashboard
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <BackButton />
        </div>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {loading ? (
          <div style={{ color: "#888" }}>Cargando...</div>
        ) : error ? (
          <div style={{ color: "#888" }}>
            Necesitás rol de creador. Activá el rol en tu cuenta o publicá tu primer producto en{" "}
            <Link href="/marketplace/publish" style={{ color: "#a855f7" }}>Publicar</Link>.
          </div>
        ) : data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "28px" }}>
              {[
                ["Visitas", String(data.totalViews)],
                ["Ventas", String(data.totalSales)],
                ["Ingresos", `USD ${data.totalRevenue}`],
                ["Productos", String(data.totalProducts)],
                ["Publicados", String(data.publishedProducts)],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: "18px", borderRadius: "14px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>{label}</div>
                  <div style={{ fontSize: "22px", fontWeight: "bold" }}>{value}</div>
                </div>
              ))}
            </div>
            <h2 style={{ fontSize: "18px", margin: "32px 0 0" }}>Mi página pública</h2>
            <CreatorPageEditor />
            <h2 style={{ fontSize: "18px", margin: "32px 0 12px" }}>Top productos</h2>
            {data.salesByProduct.length === 0 ? (
              <div style={{ color: "#888", fontSize: "14px" }}>Todavía no tenés ventas registradas.</div>
            ) : (
              data.salesByProduct.map((t) => (
                <div key={t.productId} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: "14px" }}>
                  <span>{t.title}</span>
                  <span style={{ color: "#888" }}>{t.sales} venta(s) · USD {t.revenue}</span>
                </div>
              ))
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
