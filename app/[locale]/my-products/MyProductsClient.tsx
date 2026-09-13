"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { AccountMenu } from "@/app/components/AccountMenu";
import { BackButton } from "@/app/components/BackButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface ServerItem {
  productId: string;
  orderId: string;
  grantedAt: string;
}

export function MyProductsClient() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<{ product: ProductPublication; grantedAt: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUserEmail(data.user?.email ?? null);
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!userEmail) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch("/api/my-products")
      .then((r) => r.json())
      .then(async (data) => {
        if (!data.ok || !data.items) {
          setItems([]);
          return;
        }
        // Fetch product details for each entitlement
        const products = await Promise.all(
          data.items.map(async (it: ServerItem) => {
            try {
              const res = await fetch(`/api/products/${encodeURIComponent(it.productId)}`);
              const p = await res.json();
              if (p.ok && p.product) {
                return { product: p.product as ProductPublication, grantedAt: it.grantedAt };
              }
              return null;
            } catch {
              return null;
            }
          })
        );
        setItems(products.filter(Boolean) as { product: ProductPublication; grantedAt: string }[]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userEmail]);

  const downloadProduct = async (product: ProductPublication): Promise<void> => {
    setWorking(true);
    setError(null);
    try {
      if (product.previewKind === "pdf") {
        const key = product.previewRef === "ebook" ? "crow_last_ebook" : "crow_last_pdf";
        const raw = window.localStorage.getItem(key);
        if (!raw) throw new Error("Contenido no disponible en este dispositivo.");
        const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
        const { bytes } = await generatePdfBytes(JSON.parse(raw) as Parameters<typeof generatePdfBytes>[0]);
        triggerDownload(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), `${product.slug}.pdf`);
      } else {
        const { exportKitZip } = await import("@/app/services/kit/kitExport");
        const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
        const { kitResourceToPdfProduct } = await import("@/app/services/kit/kitExport");
        const raw = window.localStorage.getItem("crow_last_kit");
        if (!raw) throw new Error("Contenido no disponible en este dispositivo.");
        const kit = JSON.parse(raw) as Parameters<typeof kitResourceToPdfProduct>[1];
        const { bytes } = await exportKitZip(kit, null, async (resource) => {
          const r = await generatePdfBytes(kitResourceToPdfProduct(resource, kit));
          return r.bytes;
        });
        triggerDownload(new Blob([bytes as unknown as BlobPart], { type: "application/zip" }), `${product.slug}.zip`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error descargando");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "20px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Mis productos
        </Link>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
          <BackButton />
          <AccountMenu />
        </div>
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!authChecked ? (
          <div style={{ color: "#888" }}>Cargando...</div>
        ) : !userEmail ? (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", maxWidth: "480px" }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 8px" }}>Iniciá sesión para ver tus productos</h1>
            <p style={{ color: "#888", fontSize: "14px" }}>Tus compras están ligadas a tu cuenta, no a este navegador.</p>
            <Link href="/login?return=/my-products" style={{ display: "inline-block", marginTop: "16px", padding: "12px 20px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>
              Iniciar sesión
            </Link>
          </div>
        ) : loading ? (
          <div style={{ color: "#888" }}>Cargando tus productos...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px" }}>
            <div style={{ fontSize: "18px", marginBottom: "8px" }}>Todavía no tenés productos comprados.</div>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>Cuando compres, aparecerán aquí con acceso directo.</p>
            <Link href="/marketplace" style={{ display: "inline-block", padding: "12px 24px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>
              Explorar Marketplace
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {items.map(({ product, grantedAt }) => (
              <div key={product.id} style={{ padding: "20px", borderRadius: "16px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "11px", color: "#a855f7", fontWeight: "bold", marginBottom: "6px" }}>
                  {product.format.toUpperCase()} · comprado {grantedAt.slice(0, 10)}
                </div>
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "12px" }}>{product.title}</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {product.format === "course" && (
                    <Link href={`/learn/${product.id}`} style={actionBtn}>Continuar</Link>
                  )}
                  {product.format === "interactive_web" && (
                    <Link href={`/product/${product.id}/interactive`} style={actionBtn}>Abrir</Link>
                  )}
                  {(product.format === "pdf" || product.format === "ebook") && (
                    <button onClick={() => downloadProduct(product)} disabled={working} style={actionBtn}>Descargar PDF</button>
                  )}
                  {product.format === "kit" && (
                    <button onClick={() => downloadProduct(product)} disabled={working} style={actionBtn}>Descargar ZIP</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div style={{ color: "#f87171", fontSize: "13px", marginTop: "16px" }}>{error}</div>}
      </section>
    </main>
  );
}

const actionBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: "8px",
  background: "rgba(124,58,237,0.15)",
  border: "1px solid rgba(124,58,237,0.3)",
  color: "#c4b5fd",
  fontSize: "13px",
  fontWeight: "bold",
  textDecoration: "none",
  cursor: "pointer",
};

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
