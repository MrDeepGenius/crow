// ============================================
// PRODUCT DETAIL - landing premium por formato
// ============================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  getPublicationBySlug,
  incrementViews,
  logEvent,
  recommendFor,
  savePublication,
} from "@/app/services/marketplace/marketStore";
import { addReview, canReview, listReviews } from "@/app/services/marketplace/marketLedger";
import { listOrders } from "@/app/services/marketplace/marketOrders";
import type { ProductPublication, Review } from "@/app/services/marketplace/marketTypes";
import type { GeneratedCourse } from "@/app/services/ai/types";
import type { InteractiveWebProduct } from "@/app/services/ai/interactiveWebTypes";
import type { PdfProduct } from "@/app/services/ai/pdfTypes";
import type { KitProduct } from "@/app/services/ai/kitTypes";
import {
  FavoriteButton,
  FONT,
  FormatBadge,
  MARKET_CSS,
  MarketLights,
  MarketplaceHeader,
  MK,
  RatingStars,
} from "../../components/market-ui";
import { ProductCard } from "../../components/ProductCard";

function readLocal(key: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

interface DetailData {
  product: ProductPublication | null;
  recommended: ProductPublication[];
  reviews: Review[];
  eligibleOrderId: string | null;
}

function loadDetail(slug: string): DetailData {
  const empty: DetailData = { product: null, recommended: [], reviews: [], eligibleOrderId: null };
  if (typeof window === "undefined") return empty;
  const found = getPublicationBySlug(slug);
  if (!found || found.status !== "PUBLISHED") return empty;
  let eligibleOrderId: string | null = null;
  try {
    const buyer = window.localStorage.getItem("crow_buyer_id");
    if (buyer) {
      const paidOrder = listOrders().find(
        (o) => o.buyerId === buyer && o.productId === found.id && o.status === "PAID"
      );
      if (paidOrder && canReview(buyer, found.id, paidOrder.id)) {
        eligibleOrderId = paidOrder.id;
      }
    }
  } catch {
    // sin comprador
  }
  return {
    product: found,
    recommended: recommendFor(found.id, 4),
    reviews: listReviews(found.id),
    eligibleOrderId,
  };
}

export function ProductDetailClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  // Primer render vacío = servidor (evita hydration mismatch con localStorage).
  const [data, setData] = useState<DetailData>({ product: null, recommended: [], reviews: [], eligibleOrderId: null });
  useEffect(() => {
    setData(loadDetail(params.slug));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { product, recommended, reviews, eligibleOrderId } = data;
  const missing = product === null;

  useEffect(() => {
    if (product) {
      incrementViews(product.id);
      logEvent("product_view", product.id, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitReview = (): void => {
    if (!product || !eligibleOrderId) return;
    let buyer = "";
    try {
      buyer = window.localStorage.getItem("crow_buyer_id") ?? "";
    } catch {
      buyer = "";
    }
    if (!buyer) return;
    setReviewError(null);
    const created = addReview({ userId: buyer, productId: product.id, orderId: eligibleOrderId, rating, comment });
    if (!created) {
      setReviewError("No se pudo publicar: mínimo 10 caracteres, sin enlaces, una reseña por producto.");
      return;
    }
    const updated: ProductPublication = {
      ...product,
      ratingSum: product.ratingSum + created.rating,
      ratingCount: product.ratingCount + 1,
      updatedAt: new Date().toISOString(),
    };
    savePublication(updated);
    setData({ ...data, product: updated, reviews: listReviews(product.id), eligibleOrderId: null });
    setComment("");
  };

  if (missing) {
    return (
      <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
        <MarketplaceHeader />
        <div style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "24px" }}>Producto no disponible</h1>
          <p style={{ color: MK.muted }}>No existe o ya no está publicado.</p>
          <button onClick={() => router.push("/marketplace")} className="mk-btn" style={{ marginTop: "16px", padding: "12px 24px", borderRadius: "10px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
            Volver al Marketplace
          </button>
        </div>
        <style>{MARKET_CSS}</style>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
        <MarketplaceHeader />
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
          <div className="mk-skeleton" style={{ height: "320px", marginBottom: "16px" }} />
          <div className="mk-skeleton" style={{ height: "20px", width: "50%" }} />
        </div>
        <style>{MARKET_CSS}</style>
      </main>
    );
  }

  const avg = product.ratingCount > 0 ? product.ratingSum / product.ratingCount : null;
  const discount =
    product.previousPrice && product.previousPrice.amount > product.price.amount
      ? Math.round((1 - product.price.amount / product.previousPrice.amount) * 100)
      : 0;

  return (
    <main style={{ minHeight: "100vh", background: MK.bg, color: "#fff", fontFamily: FONT }}>
      <MarketLights />
      <MarketplaceHeader />
      <section style={{ maxWidth: "1180px", margin: "0 auto", padding: "36px 24px 90px" }} className="mk-fadein">
        <div className="detail-grid">
          <div style={{ minWidth: 0 }}>
            <PreviewPanel product={product} />
            <div style={{ marginTop: "32px" }}>
              <DetailTabs product={product} />
            </div>
          </div>
          <aside style={{ minWidth: 0 }}>
            <div style={{ position: "sticky", top: "92px", background: MK.surface, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <FormatBadge format={product.format} />
                <FavoriteButton productId={product.id} />
              </div>
              <h1 style={{ fontSize: "clamp(24px, 3vw, 32px)", margin: "0 0 10px", letterSpacing: "-0.5px" }}>{product.title}</h1>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                <RatingStars sum={product.ratingSum} count={product.ratingCount} />
                {product.salesCount > 0 && <span style={{ fontSize: "12px", color: MK.faint }}>{product.salesCount} ventas</span>}
              </div>
              <div style={{ fontSize: "13px", color: MK.muted, marginBottom: "16px" }}>
                Por <Link href={`/marketplace/creator/${encodeURIComponent(product.creatorId)}`} style={{ color: MK.violetBright }}>{product.creatorName}</Link>
              </div>
              <p style={{ color: MK.muted, fontSize: "14px", lineHeight: 1.65, margin: "0 0 18px" }}>{product.description}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "18px" }}>
                <span style={{ fontSize: "32px", fontWeight: "bold" }}>{product.price.amount} {product.price.currency}</span>
                {discount > 0 && product.previousPrice && (
                  <>
                    <span style={{ color: MK.faint, textDecoration: "line-through", fontSize: "14px" }}>{product.previousPrice.amount} {product.previousPrice.currency}</span>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: MK.green }}>-{discount}%</span>
                  </>
                )}
              </div>
              <Link
                href={`/marketplace/checkout/${product.slug}`}
                className="mk-btn"
                style={{ display: "block", textAlign: "center", padding: "15px", borderRadius: "12px", background: MK.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "15px", boxShadow: "0 10px 30px rgba(124,58,237,0.3)" }}
              >
                Comprar ahora
              </Link>
              {product.affiliateEnabled && (
                <div style={{ marginTop: "10px", fontSize: "12px", color: MK.green, textAlign: "center" }}>
                  Comisión disponible para afiliados: {product.affiliatePercent}%
                </div>
              )}
            </div>
          </aside>
        </div>

        <div style={{ marginTop: "48px" }}>
          <SectionHead title="Reseñas" />
          {product.ratingCount === 0 ? (
            <div style={{ color: MK.muted, fontSize: "14px" }}>Todavía no hay reseñas. Solo compradores verificados podrán dejar la suya.</div>
          ) : (
            <>
              <div style={{ color: MK.muted, fontSize: "14px", marginBottom: "12px" }}>
                Promedio {avg?.toFixed(1)} con {product.ratingCount} reseña(s).
              </div>
              {reviews.map((r) => (
                <div key={r.id} style={{ padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} <span style={{ color: MK.faint, fontWeight: "normal" }}>· compra verificada</span></div>
                  <div style={{ color: MK.muted, fontSize: "13px", marginTop: "6px" }}>{r.comment}</div>
                </div>
              ))}
            </>
          )}
          {eligibleOrderId && (
            <div style={{ marginTop: "16px", padding: "16px", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "12px", background: "rgba(124,58,237,0.08)" }}>
              <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "10px" }}>Dejá tu reseña (compra verificada)</div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }} role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} estrellas`} style={{ background: "transparent", border: "none", color: n <= rating ? "#f59e0b" : "#555", fontSize: "22px", cursor: "pointer" }}>
                    ★
                  </button>
                ))}
              </div>
              <label htmlFor="review-comment" style={{ position: "absolute", left: "-9999px" }}>Tu reseña</label>
              <textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Contá tu experiencia (mín. 10 caracteres, sin enlaces)" rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "10px 12px", fontSize: "13px", fontFamily: FONT, resize: "vertical" }} />
              {reviewError && <div style={{ color: MK.red, fontSize: "12px", marginTop: "8px" }}>{reviewError}</div>}
              <button onClick={submitReview} className="mk-btn" style={{ marginTop: "10px", padding: "10px 20px", borderRadius: "10px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}>
                Publicar reseña
              </button>
            </div>
          )}
        </div>

        {recommended.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <SectionHead title="También te puede interesar" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "16px" }}>
              {recommended.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </section>
      <style>{`
        .detail-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; align-items: start; }
        @media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
        ${MARKET_CSS}
      `}</style>
    </main>
  );
}

function SectionHead({ title }: { title: string }) {
  return <h2 style={{ fontSize: "20px", margin: "0 0 14px" }}>{title}</h2>;
}

// ---------- Preview grande por formato ----------

function PreviewPanel({ product }: { product: ProductPublication }) {
  switch (product.format) {
    case "course":
      return <CoursePreview />;
    case "ebook":
    case "pdf":
      return <DocPreview product={product} />;
    case "interactive_web":
      return <WebDemo />;
    case "kit":
      return <KitPreview />;
  }
}

function PanelShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#0D0D12" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: "12px", color: MK.muted, letterSpacing: "1px", textTransform: "uppercase" }}>
        {title} · {subtitle}
      </div>
      <div style={{ padding: "24px" }}>{children}</div>
    </div>
  );
}

function CoursePreview() {
  const course = readLocal("crow_last_course") as GeneratedCourse | null;
  if (!course || course.modules.length === 0) {
    return (
      <PanelShell title="Vista previa" subtitle="Curso">
        <EmptyPreview />
      </PanelShell>
    );
  }
  const totalMin = course.modules.reduce(
    (n, m) => n + m.lessons.reduce((x, l) => x + (l.estimatedMinutes || 15), 0),
    0
  );
  return (
    <PanelShell title="Vista previa" subtitle={`Curso · ${course.modules.length} módulos · ~${Math.round(totalMin / 60)} h`}>
      {course.modules.slice(0, 3).map((m, i) => (
        <div key={m.id} style={{ padding: "14px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "6px" }}>{i + 1}. {m.title}</div>
          {m.lessons.slice(0, 4).map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: MK.muted, padding: "4px 0" }}>
              <span>{l.title}</span>
              <span>{l.estimatedMinutes || 15} min</span>
            </div>
          ))}
          {m.lessons.length > 4 && <div style={{ fontSize: "12px", color: MK.faint }}>+{m.lessons.length - 4} clases más</div>}
        </div>
      ))}
      {course.modules.length > 3 && <div style={{ fontSize: "12px", color: MK.faint, marginTop: "8px" }}>+{course.modules.length - 3} módulos más al comprar</div>}
    </PanelShell>
  );
}

function DocPreview({ product }: { product: ProductPublication }) {
  const key = product.previewRef === "ebook" ? "crow_last_ebook" : "crow_last_pdf";
  const doc = readLocal(key) as PdfProduct | null;
  if (!doc || doc.chapters.length === 0) {
    return (
      <PanelShell title="Vista previa" subtitle="Documento">
        <EmptyPreview />
      </PanelShell>
    );
  }
  const n = Math.max(1, Math.min(product.freePreviewChapters, doc.chapters.length));
  const ch = doc.chapters.slice(0, n);
  return (
    <PanelShell title="Vista previa" subtitle={`${n} de ${doc.chapters.length} capítulos`}>
      {ch.map((c, i) => (
        <div key={c.id} style={{ marginBottom: "20px" }}>
          <div style={{ color: MK.violetBright, fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>CAPÍTULO {i + 1}</div>
          <div style={{ fontWeight: "bold", fontSize: "17px", marginBottom: "8px" }}>{c.title}</div>
          {c.introduction.split("\n\n").slice(0, 2).map((p, k) => (
            <p key={k} style={{ color: MK.muted, fontSize: "14px", lineHeight: 1.7, margin: "0 0 8px" }}>{p.slice(0, 500)}{p.length > 500 ? "..." : ""}</p>
          ))}
        </div>
      ))}
      {doc.chapters.length > n && (
        <div style={{ fontSize: "13px", color: MK.violetBright, fontWeight: "bold" }}>
          +{doc.chapters.length - n} capítulos completos al comprar
        </div>
      )}
    </PanelShell>
  );
}

function WebDemo() {
  const [started, setStarted] = useState(false);
  const web = readLocal("crow_last_web") as InteractiveWebProduct | null;
  if (!web || web.sections.length === 0) {
    return (
      <PanelShell title="Demo interactiva" subtitle="Web">
        <EmptyPreview />
      </PanelShell>
    );
  }
  const first = web.sections[0];
  if (!started) {
    return (
      <PanelShell title="Demo interactiva" subtitle={web.metadata.title}>
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>Probá la primera sección en vivo</div>
          <p style={{ color: MK.muted, fontSize: "13px", margin: "0 0 16px" }}>
            &quot;{first.title}&quot; con sus {first.components.length} componentes funcionales.
          </p>
          <button onClick={() => setStarted(true)} className="mk-btn" style={{ padding: "12px 28px", borderRadius: "12px", border: "none", background: MK.violet, color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
            Iniciar demo
          </button>
        </div>
      </PanelShell>
    );
  }
  return (
    <PanelShell title="Demo interactiva" subtitle={`${first.title} · ${web.sections.length - 1} secciones más al comprar`}>
      <DemoSection web={web} />
    </PanelShell>
  );
}

function DemoSection({ web }: { web: InteractiveWebProduct }) {
  const [Demo, setDemo] = useState<React.ComponentType<{ product: InteractiveWebProduct }> | null>(null);
  useEffect(() => {
    import("@/app/create/builder/components/InteractiveWebRenderer").then((m) => setDemo(() => m.InteractiveWebRenderer));
  }, []);
  if (!Demo) return <div style={{ color: MK.muted, fontSize: "13px" }}>Cargando demo...</div>;
  return <Demo product={{ ...web, sections: web.sections.slice(0, 1) }} />;
}

function KitPreview() {
  const kit = readLocal("crow_last_kit") as KitProduct | null;
  if (!kit || kit.resources.length === 0) {
    return (
      <PanelShell title="Vista previa" subtitle="Kit">
        <EmptyPreview />
      </PanelShell>
    );
  }
  return (
    <PanelShell title="Vista previa" subtitle={`${kit.resources.length} recursos incluidos`}>
      {kit.resources.slice(0, 5).map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "14px" }}>
          <span>{r.title}</span>
          <span style={{ color: MK.faint, fontSize: "12px" }}>{r.kind} · {r.formats.join("/").toUpperCase()}</span>
        </div>
      ))}
      {kit.resources.length > 5 && (
        <div style={{ fontSize: "13px", color: MK.violetBright, fontWeight: "bold", marginTop: "8px" }}>
          +{kit.resources.length - 5} recursos completos al comprar
        </div>
      )}
    </PanelShell>
  );
}

function EmptyPreview() {
  return <div style={{ color: MK.muted, fontSize: "14px" }}>El creador aún no habilitó vista previa de este producto.</div>;
}

// ---------- Tabs: contenido / info / creador ----------

function DetailTabs({ product }: { product: ProductPublication }) {
  const [tab, setTab] = useState("contenido");
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }} role="tablist" aria-label="Detalle del producto">
        {[
          ["contenido", "Contenido"],
          ["info", "Información"],
          ["creador", "Sobre el creador"],
        ].map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="mk-btn"
            style={{ padding: "9px 18px", borderRadius: "10px", border: tab === id ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)", background: tab === id ? "rgba(124,58,237,0.2)" : "transparent", color: "#fff", cursor: "pointer", fontSize: "13px" }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "contenido" && (
        <div>
          <h3 style={{ fontSize: "16px", margin: "0 0 10px" }}>Qué incluye</h3>
          <ul style={{ margin: 0, paddingLeft: "20px", color: MK.muted, fontSize: "14px", lineHeight: 1.9 }}>
            {product.includes.map((item) => <li key={item}>{item}</li>)}
          </ul>
          {product.bonuses.length > 0 && (
            <>
              <h3 style={{ fontSize: "16px", margin: "20px 0 10px" }}>Bonos incluidos</h3>
              {product.bonuses.map((b) => (
                <div key={b.id} style={{ padding: "12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "14px" }}>{b.name}</div>
                  <div style={{ color: MK.muted, fontSize: "13px" }}>{b.description}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      {tab === "info" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", fontSize: "14px" }}>
          {[
            ["Categoría", product.category],
            ["Idioma", product.language],
            ["Nivel", product.level],
            ["Formato", product.format],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "14px", borderRadius: "12px", background: "#0D0D12", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: MK.faint, fontSize: "12px", marginBottom: "4px" }}>{label}</div>
              <div>{value}</div>
            </div>
          ))}
          {product.tags.length > 0 && (
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {product.tags.map((t) => (
                <span key={t} style={{ fontSize: "12px", padding: "5px 12px", borderRadius: "14px", background: "rgba(124,58,237,0.12)", color: "#c4b5fd" }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "creador" && (
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "bold" }}>
            {product.creatorName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontWeight: "bold", fontSize: "16px" }}>{product.creatorName}</div>
            <Link href={`/marketplace/creator/${encodeURIComponent(product.creatorId)}`} style={{ color: MK.violetBright, fontSize: "13px" }}>
              Ver creador →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
