// ============================================
// PUBLISH CLIENT
// ============================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getCreatorProfile,
  listCategories,
  queryPublications,
  saveCreatorProfile,
  savePublication,
  slugifyTitle,
  uid,
  uniqueSlug,
} from "@/app/services/marketplace/marketStore";
import {
  detectLocalProducts,
  summarizeLocalProduct,
  validateForPublish,
  type LocalFormat,
} from "@/app/services/marketplace/productAdapters";
import type { Category, ProductBonus, ProductPublication } from "@/app/services/marketplace/marketTypes";
import { PricingAdvisorWidget } from "@/app/components/PricingAdvisor";
import { extractFeatures } from "@/app/services/pricing/extractFeatures";
import { selectCatalogComparables, type CatalogProduct } from "@/app/services/pricing/marketResearch";
import type { ComparableInput } from "@/app/services/pricing/types";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CURRENCIES = ["USD", "EUR", "ARS", "MXN", "BRL"];

export function PublishClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locals, setLocals] = useState<{ format: LocalFormat; title: string }[]>([]);
  const [format, setFormat] = useState<LocalFormat | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("29");
  const [currency, setCurrency] = useState("USD");
  const [previousPrice, setPreviousPrice] = useState("");
  const [tags, setTags] = useState("");
  const [language, setLanguage] = useState("es");
  const [level, setLevel] = useState("todos");
  const [creatorName, setCreatorName] = useState("");
  const [username, setUsername] = useState("");
  const [affiliateEnabled, setAffiliateEnabled] = useState(false);
  const [affiliatePercent, setAffiliatePercent] = useState("40");
  const [freeChapters, setFreeChapters] = useState("1");
  const [bonusName, setBonusName] = useState("");
  const [bonusDesc, setBonusDesc] = useState("");
  const [bonuses, setBonuses] = useState<ProductBonus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setCategories(listCategories());
    setLocals(detectLocalProducts());
    const from = searchParams.get("from");
    if (from === "course" || from === "web" || from === "pdf" || from === "ebook" || from === "kit") {
      setFormat(from);
    }
    const profile = getCreatorProfile();
    if (profile) {
      setCreatorName(profile.displayName);
      setUsername(profile.username);
    }
  }, [searchParams]);

  const summary = format ? summarizeLocalProduct(format) : null;
  const check = validateForPublish({
    title,
    description,
    category,
    price: Number(price),
    currency,
    format: (format || "pdf") as LocalFormat,
    summary,
  });

  // Pricing Advisor: características reales + comparables del catálogo.
  const pricingFeatures = summary
    ? extractFeatures(summary, {
        title: title || summary.title,
        category,
        level,
        language,
        bonuses: bonuses.length,
      })
    : null;
  const pricingKey = summary
    ? `draft:${summary.format}:${slugifyTitle(title || summary.title)}`
    : "";
  const pricingComparables: ComparableInput[] = summary
    ? selectCatalogComparables(
        queryPublications({ sort: "relevance", pageSize: 48 }).items.map(
          (p): CatalogProduct => ({
            title: p.title,
            category: p.category,
            format: p.format,
            price: p.price.amount,
            currency: p.price.currency,
          })
        ),
        category,
        summary.format,
        title || summary.title
      )
    : [];

  useEffect(() => {
    if (summary && !title) setTitle(summary.title);
    if (summary && !description) setDescription(summary.description.slice(0, 300));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  const publish = (): void => {
    setError(null);
    setDone(null);
    if (!format || !summary) {
      setError("Seleccioná un producto generado realmente en su Studio.");
      return;
    }
    if (!creatorName.trim() || !username.trim()) {
      setError("Completá tu nombre de creador y usuario público.");
      return;
    }
    if (!check.ok) {
      setError(check.blockers[0]);
      return;
    }
    setWorking(true);
    try {
      const creatorId = `creator-${username.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      saveCreatorProfile({
        id: creatorId,
        username: username.trim(),
        displayName: creatorName.trim(),
        bio: "",
        createdAt: new Date().toISOString(),
      });
      const now = new Date().toISOString();
      const pub: ProductPublication = {
        id: uid("pub"),
        slug: uniqueSlug(title),
        format: summary.format,
        title: title.trim(),
        shortDescription: description.trim().slice(0, 140),
        description: description.trim(),
        creatorId,
        creatorName: creatorName.trim(),
        category,
        subcategory: "",
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        language,
        level,
        price: { amount: Number(price), currency },
        previousPrice: previousPrice ? { amount: Number(previousPrice), currency } : null,
        coverSvg: summary.coverSvg,
        previewKind: summary.format === "course" ? "course" : summary.format === "interactive_web" ? "web" : summary.format === "kit" ? "kit" : "pdf",
        previewRef: summary.format === "ebook" ? "ebook" : summary.format === "pdf" ? "pdf" : summary.format,
        freePreviewChapters: Math.max(1, Number(freeChapters) || 1),
        stats: summary.stats,
        includes: summary.includes,
        bonuses,
        ratingSum: 0,
        ratingCount: 0,
        salesCount: 0,
        viewCount: 0,
        featured: false,
        affiliateEnabled,
        affiliatePercent: affiliateEnabled ? Math.min(90, Math.max(0, Number(affiliatePercent) || 0)) : 0,
        status: "PUBLISHED",
        crowQuality: { score: 100, checks: [{ label: "Contenido generado verificado", ok: true }] },
        createdAt: now,
        publishedAt: now,
        updatedAt: now,
      };
      savePublication(pub);
      setDone(pub.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error publicando");
    } finally {
      setWorking(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "20px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Publicar en Marketplace
        </Link>
      </header>

      <section style={{ maxWidth: "820px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "60px 20px", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "16px", background: "rgba(34,197,94,0.08)" }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Producto publicado</div>
            <p style={{ color: "#aaa", margin: "0 0 20px" }}>Ya está visible en el Marketplace.</p>
            <Link href={`/marketplace/product/${done}`} style={{ display: "inline-block", padding: "12px 28px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>
              Ver producto
            </Link>
          </div>
        ) : (
          <>
            <label style={labelStyle}>Producto generado (solo reales)</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as LocalFormat)} style={inputStyle}>
              <option value="">Seleccionar...</option>
              {locals.map((l) => (
                <option key={`${l.format}-${l.title}`} value={l.format}>
                  [{l.format}] {l.title.slice(0, 60)}
                </option>
              ))}
            </select>
            {locals.length === 0 && (
              <div style={{ color: "#888", fontSize: "13px", marginBottom: "16px" }}>
                No hay productos generados en este navegador. Creá uno primero en <Link href="/create" style={{ color: "#a855f7" }}>Create Studio</Link>.
              </div>
            )}

            <label style={labelStyle}>Título (mín. 10 caracteres)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Descripción (mín. 50 caracteres)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Idioma</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Precio</label>
                <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Moneda</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Precio anterior (opcional)</label>
                <input value={previousPrice} onChange={(e) => setPreviousPrice(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nivel</label>
                <input value={level} onChange={(e) => setLevel(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nombre de creador</label>
                <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Usuario público (para /creator/)</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <label style={labelStyle}>Etiquetas (separadas por coma)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} style={inputStyle} />

            <label style={labelStyle}>Capítulos gratuitos en preview (PDF/Ebook)</label>
            <input value={freeChapters} onChange={(e) => setFreeChapters(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={inputStyle} />

            <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="checkbox" checked={affiliateEnabled} onChange={(e) => setAffiliateEnabled(e.target.checked)} />
              Aceptar afiliados
            </label>
            {affiliateEnabled && (
              <>
                <label style={labelStyle}>Comisión afiliado %</label>
                <input value={affiliatePercent} onChange={(e) => setAffiliatePercent(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" style={inputStyle} />
              </>
            )}

            <label style={labelStyle}>Bonos (opcional)</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input value={bonusName} onChange={(e) => setBonusName(e.target.value)} placeholder="Nombre del bono" style={{ ...inputStyle, marginBottom: 0 }} />
              <input value={bonusDesc} onChange={(e) => setBonusDesc(e.target.value)} placeholder="Descripción" style={{ ...inputStyle, marginBottom: 0 }} />
              <button
                onClick={() => {
                  if (!bonusName.trim()) return;
                  setBonuses((b) => [...b, { id: `bonus-${Date.now()}`, name: bonusName.trim(), description: bonusDesc.trim(), kind: "recurso" }]);
                  setBonusName("");
                  setBonusDesc("");
                }}
                style={smallBtn}
              >
                Agregar
              </button>
            </div>
            {bonuses.map((b) => (
              <div key={b.id} style={{ fontSize: "13px", color: "#aaa", marginBottom: "4px" }}>
                {b.name} <button onClick={() => setBonuses((x) => x.filter((y) => y.id !== b.id))} style={{ ...smallBtn, color: "#f87171" }}>quitar</button>
              </div>
            ))}

            <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: check.ok ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)", border: check.ok ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(245,158,11,0.3)", fontSize: "13px", color: "#aaa" }}>
              <strong style={{ color: "#fff" }}>Crow Quality Check</strong>
              {check.ok && check.warnings.length === 0 && <div style={{ color: "#22c55e", marginTop: "6px" }}>Completo: listo para publicar.</div>}
              {check.warnings.map((w) => <div key={w} style={{ marginTop: "6px" }}>Requiere atención: {w}</div>)}
              {check.blockers.map((b) => <div key={b} style={{ marginTop: "6px", color: "#f87171" }}>No puede publicarse: {b}</div>)}
            </div>

            {summary && (
              <PricingAdvisorWidget
                productKey={pricingKey}
                features={pricingFeatures}
                format={summary.format}
                comparables={pricingComparables}
                onUsePrice={(p) => setPrice(String(p))}
                onUsePromo={(regular, sale) => {
                  setPreviousPrice(String(regular));
                  setPrice(String(sale));
                }}
              />
            )}

            {error && <div style={{ color: "#f87171", fontSize: "13px", marginTop: "12px" }}>{error}</div>}
            <button onClick={publish} disabled={working} style={{ width: "100%", marginTop: "16px", padding: "14px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "15px", opacity: working ? 0.6 : 1 }}>
              {working ? "Publicando..." : "Publicar en Marketplace"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#888", fontSize: "11px", marginBottom: "4px", marginTop: "12px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "10px 12px",
  fontSize: "14px",
  marginBottom: "4px",
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
