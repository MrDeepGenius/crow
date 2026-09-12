"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getPublication } from "@/app/services/marketplace/marketStore";
import { hasAccess } from "@/app/services/marketplace/marketLedger";
import type { InteractiveWebProduct } from "@/app/services/ai/interactiveWebTypes";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { InteractiveWebRenderer } from "@/app/create/builder/components/InteractiveWebRenderer";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function InteractiveProductClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [web, setWeb] = useState<InteractiveWebProduct | null>(null);

  useEffect(() => {
    const pub: ProductPublication | null = getPublication(params.id);
    if (!pub || pub.status !== "PUBLISHED" || pub.format !== "interactive_web") {
      setDenied(true);
      return;
    }
    const loadContent = (): void => {
      try {
        const raw = window.localStorage.getItem("crow_last_web");
        if (raw) setWeb(JSON.parse(raw) as InteractiveWebProduct);
        else setDenied(true);
      } catch {
        setDenied(true);
      }
    };
    // Acceso server-side primero: el cliente nunca decide.
    void fetch(`/api/access?productId=${encodeURIComponent(pub.id)}`)
      .then((r) => r.json() as Promise<{ ok: boolean; hasAccess?: boolean }>)
      .then((data) => {
        if (data.ok && data.hasAccess) {
          loadContent();
          return;
        }
        if (!data.ok) {
          let buyer = "";
          try {
            buyer = window.localStorage.getItem("crow_buyer_id") ?? "";
          } catch {
            buyer = "";
          }
          if (buyer && hasAccess(buyer, pub.id)) loadContent();
          else setDenied(true);
          return;
        }
        setDenied(true);
      })
      .catch(() => {
        let buyer = "";
        try {
          buyer = window.localStorage.getItem("crow_buyer_id") ?? "";
        } catch {
          buyer = "";
        }
        if (buyer && hasAccess(buyer, pub.id)) loadContent();
        else setDenied(true);
      });
  }, [params.id]);

  if (denied) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <h1 style={{ fontSize: "24px" }}>Acceso denegado (403)</h1>
        <p style={{ color: "#888" }}>Necesitás haber comprado este producto para acceder.</p>
        <button onClick={() => router.push("/marketplace")} style={{ marginTop: "16px", padding: "12px 24px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Ir al Marketplace
        </button>
      </main>
    );
  }

  if (!web) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <div style={{ padding: "12px 4%", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/my-products" style={{ color: "#aaa", textDecoration: "none", fontSize: "13px" }}>← Mis productos</Link>
      </div>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <InteractiveWebRenderer product={web} />
      </div>
    </main>
  );
}
