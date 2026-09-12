"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getPublication, logEvent } from "@/app/services/marketplace/marketStore";
import { hasAccess } from "@/app/services/marketplace/marketLedger";
import type { GeneratedCourse } from "@/app/services/ai/types";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { CoursePlayer } from "@/app/create/builder/components/CoursePlayer";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function LearnClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [product, setProduct] = useState<ProductPublication | null>(null);
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [buyerId, setBuyerId] = useState("");

  useEffect(() => {
    const pub = getPublication(params.id);
    if (!pub || pub.status !== "PUBLISHED" || pub.format !== "course") {
      setDenied(true);
      return;
    }
    setProduct(pub);
    const loadContent = (owner: string): void => {
      setBuyerId(owner);
      try {
        const raw = window.localStorage.getItem("crow_last_course");
        if (raw) {
          setCourse(JSON.parse(raw) as GeneratedCourse);
          logEvent("course_started", pub.id, owner || null);
        } else {
          setDenied(true);
        }
      } catch {
        setDenied(true);
      }
    };
    // Acceso server-side primero: el cliente nunca decide.
    void fetch(`/api/access?productId=${encodeURIComponent(pub.id)}`)
      .then((r) => r.json() as Promise<{ ok: boolean; hasAccess?: boolean }>)
      .then((data) => {
        if (data.ok && data.hasAccess) {
          loadContent("server");
          return;
        }
        if (!data.ok) {
          // Servidor inalcanzable: fallback legado solo con entitlement local.
          let buyer = "";
          try {
            buyer = window.localStorage.getItem("crow_buyer_id") ?? "";
          } catch {
            buyer = "";
          }
          if (buyer && hasAccess(buyer, pub.id)) loadContent(buyer);
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
        if (buyer && hasAccess(buyer, pub.id)) loadContent(buyer);
        else setDenied(true);
      });
  }, [params.id]);

  if (denied) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <h1 style={{ fontSize: "24px" }}>Acceso denegado (403)</h1>
        <p style={{ color: "#888" }}>Necesitás haber comprado este curso para acceder.</p>
        <button onClick={() => router.push("/marketplace")} style={{ marginTop: "16px", padding: "12px 24px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Ir al Marketplace
        </button>
      </main>
    );
  }

  if (!course || !product) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando tu curso...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <div style={{ padding: "12px 4%", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/my-products" style={{ color: "#aaa", textDecoration: "none", fontSize: "13px" }}>← Mis productos</Link>
      </div>
      <CoursePlayer course={course} progressKey={`crow_learn_progress_${product.id}_${buyerId}`} />
    </main>
  );
}
