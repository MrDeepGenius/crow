"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPublication, logEvent } from "@/app/services/marketplace/marketStore";
import { listEntitlements } from "@/app/services/marketplace/marketLedger";
import type { Entitlement, ProductPublication } from "@/app/services/marketplace/marketTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function MyProductsClient() {
  const [buyerId, setBuyerId] = useState("");
  const [input, setInput] = useState("");
  const [items, setItems] = useState<{ entitlement: Entitlement; product: ProductPublication }[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crow_buyer_id");
      if (saved) {
        setBuyerId(saved);
        setInput(saved);
      }
    } catch {
      // sin comprador
    }
  }, []);

  useEffect(() => {
    if (!buyerId) {
      setItems([]);
      return;
    }
    const mine = listEntitlements()
      .filter((e) => e.userId === buyerId && !e.revokedAt)
      .flatMap((entitlement) => {
        const product = getPublication(entitlement.productId);
        return product ? [{ entitlement, product }] : [];
      });
    setItems(mine);
  }, [buyerId]);

  const login = (): void => {
    if (!input.trim()) return;
    setBuyerId(input.trim());
    try {
      window.localStorage.setItem("crow_buyer_id", input.trim());
    } catch {
      // no bloquea
    }
  };

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
      logEvent("download", product.id, buyerId);
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
      </header>
      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!buyerId ? (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", maxWidth: "480px" }}>
            <h1 style={{ fontSize: "22px", margin: "0 0 8px" }}>Identificate para ver tus productos</h1>
            <p style={{ color: "#888", fontSize: "14px" }}>Usá el mismo identificador con el que compraste.</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tu email o usuario" style={{ flex: 1, background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT }} />
              <button onClick={login} style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                Entrar
              </button>
            </div>
          </div>
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
            {items.map(({ entitlement, product }) => (
              <div key={entitlement.id} style={{ padding: "20px", borderRadius: "16px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "11px", color: "#a855f7", fontWeight: "bold", marginBottom: "6px" }}>
                  {product.format.toUpperCase()} · comprado {entitlement.grantedAt.slice(0, 10)}
                </div>
                <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "12px" }}>{product.title}</div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {product.format === "course" && (
                    <Link href={`/learn/${product.id}`} style={actionBtn}>Continuar</Link>
                  )}
                  {product.format === "interactive_web" && (
                    <Link href={`/product/${product.id}/interactive`} style={actionBtn}>Abrir</Link>
                  )}
                  {(product.format === "pdf" || product.format === "ebook" || product.format === "kit") && (
                    <button onClick={() => void downloadProduct(product)} disabled={working} style={{ ...actionBtnCss, opacity: working ? 0.6 : 1 }}>
                      Descargar
                    </button>
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
  padding: "10px 18px",
  borderRadius: "10px",
  background: "#7c3aed",
  color: "#fff",
  fontWeight: "bold",
  textDecoration: "none",
  fontSize: "13px",
};

const actionBtnCss: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: "10px",
  border: "none",
  background: "#7c3aed",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "13px",
};

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
