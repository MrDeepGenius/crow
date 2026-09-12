// ============================================
// KIT BUILDER - CROW RESOURCE KIT ENGINE
// ============================================
// Ruta: /create/builder/kit
// Flujo: idea → blueprint editable → generación → panel → editor IA →
// preview → quality check → ZIP real → versiones → marketplace (stub).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KitGenerationEngine,
  KIT_PRODUCT_KEY,
} from "@/app/services/ai/KitGenerationEngine";
import { AIProviderFactory } from "@/app/services/ai/AIProvider";
import type {
  KitProduct,
  KitGenerationState,
  KitQualityValidation,
  KitBlueprint,
  KitSpecification,
  KitResource,
  KitProductVersion,
  KitTextAction,
  KitFileFormat,
  KitMarketplaceListing,
} from "@/app/services/ai/kitTypes";
import type { PdfContentBlock } from "@/app/services/ai/pdfTypes";
import { ImageGenerationEngine } from "@/app/services/images/ImageGenerationEngine";
import type { GeneratedImage } from "@/app/services/images/imageTypes";
import { KitCoverPreview, KitReadmePreview, KitResourcePreview } from "../components/KitPreview";
import { PublishButton } from "../components/PublishButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const VERSIONS_KEY = "crow_kit_versions";
const KIT_ACTIONS: { value: KitTextAction; label: string }[] = [
  { value: "improve", label: "Mejorar" },
  { value: "expand", label: "Expandir" },
  { value: "summarize", label: "Resumir" },
  { value: "regenerate", label: "Regenerar" },
  { value: "professional", label: "Profesional" },
  { value: "practical", label: "Práctico" },
  { value: "examples", label: "Ejemplos" },
  { value: "alternative", label: "Alternativa" },
];

function coverKey(productId: string): string {
  return `crow_kit_cover_${productId}`;
}

export default function KitBuilderPage() {
  const router = useRouter();
  const [engine] = useState(() => new KitGenerationEngine());
  const [imageEngine] = useState(() => new ImageGenerationEngine());
  const [idea, setIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kitState, setKitState] = useState<KitGenerationState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState<KitProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingBlueprint, setEditingBlueprint] = useState(false);
  const [blueprintDraft, setBlueprintDraft] = useState<KitBlueprint | null>(null);
  const [specDraft, setSpecDraft] = useState<KitSpecification | null>(null);
  const [validation, setValidation] = useState<KitQualityValidation | null>(null);
  const [working, setWorking] = useState(false);
  const [versions, setVersions] = useState<KitProductVersion[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [editingResource, setEditingResource] = useState(false);
  const [cover, setCover] = useState<{ image: GeneratedImage; svg: string } | null>(null);
  const [showQuality, setShowQuality] = useState(false);
  const [qualityIssues, setQualityIssues] = useState<{ label: string; ok: boolean; detail: string }[]>([]);
  const [companions, setCompanions] = useState<{ kind: string; title: string }[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedIdea = sessionStorage.getItem("crow_kit_idea");
    setIdea(savedIdea);
    try {
      const raw = window.localStorage.getItem(KIT_PRODUCT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as KitProduct;
        if (saved.kind === "kit") {
          setProduct(saved);
          try {
            const c = window.localStorage.getItem(coverKey(saved.id));
            if (c) setCover(JSON.parse(c) as { image: GeneratedImage; svg: string });
          } catch {
            // sin portada guardada
          }
        }
      }
    } catch {
      // sin producto
    }
    setVersions(loadVersions());
    try {
      const b = sessionStorage.getItem("crow_kit_blueprint");
      const s = sessionStorage.getItem("crow_kit_spec");
      if (b) setBlueprintDraft(JSON.parse(b) as KitBlueprint);
      if (s) setSpecDraft(JSON.parse(s) as KitSpecification);
    } catch {
      // sin blueprint
    }
    // Productos existentes para sugerir kit complementario (§21)
    const found: { kind: string; title: string }[] = [];
    try {
      const c = window.localStorage.getItem("crow_last_course");
      if (c) found.push({ kind: "Curso", title: (JSON.parse(c) as { metadata: { title: string } }).metadata.title });
      const w = window.localStorage.getItem("crow_last_web");
      if (w) found.push({ kind: "Web", title: (JSON.parse(w) as { metadata: { title: string } }).metadata.title });
      const p = window.localStorage.getItem("crow_last_pdf");
      if (p) found.push({ kind: "PDF/Ebook", title: (JSON.parse(p) as { metadata: { title: string } }).metadata.title });
    } catch {
      // sin productos previos
    }
    setCompanions(found);
    setLoading(false);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!idea?.trim()) {
      setError("Falta la idea original. Volvé a Create Studio.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const result = await engine.generateKit(idea);
      setProduct(result);
      setValidation(engine.getCurrentState()?.validation ?? null);
      saveVersion(result);
      await ensureCover(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando el kit");
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, engine]);

  useEffect(() => {
    if (loading || !idea || product) return;
    engine.loadState();
    const st = engine.getCurrentState();
    setKitState(st);
    if (st && st.resources.length > 0 && !generating) void startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, idea]);

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setKitState(engine.getCurrentState()), 500);
    return () => clearInterval(t);
  }, [generating, engine]);

  const persistProduct = (next: KitProduct): void => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setProduct(stamped);
    engine.applyLocalResources(stamped.resources);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KIT_PRODUCT_KEY, JSON.stringify(stamped));
      } catch {
        // no bloquea
      }
    }
  };

  const saveVersion = (p: KitProduct): void => {
    setVersions((prev) => {
      const entry = { version: p.version, label: `Kit v${p.version} · ${new Date().toLocaleString("es")}`, createdAt: new Date().toISOString(), product: p };
      const next = [...prev.filter((v) => v.version !== p.version), entry].sort((a, b) => a.version - b.version);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(VERSIONS_KEY, JSON.stringify(next));
        } catch {
          // no bloquea
        }
      }
      return next;
    });
  };

  // ---------- Blueprint ----------
  const approveBlueprint = async (): Promise<void> => {
    if (!idea || !blueprintDraft) return;
    setWorking(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("crow_kit_blueprint", JSON.stringify(blueprintDraft));
      }
      engine.applyEditedBlueprint(idea, blueprintDraft);
      await startGeneration();
    } finally {
      setWorking(false);
    }
  };

  const regenerateBlueprint = async (): Promise<void> => {
    if (!idea) return;
    setWorking(true);
    try {
      const provider = await AIProviderFactory.create("mock");
      const spec = await provider.analyzeKitIdea(idea);
      const blueprint = await provider.generateKitBlueprint({ originalIdea: idea, specification: spec });
      setSpecDraft(spec);
      setBlueprintDraft(blueprint);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("crow_kit_spec", JSON.stringify(spec));
        sessionStorage.setItem("crow_kit_blueprint", JSON.stringify(blueprint));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error regenerando blueprint");
    } finally {
      setWorking(false);
    }
  };

  const startFromCompanion = async (title: string): Promise<void> => {
    const newIdea = `Kit complementario para ${title}: workbook, checklist, prompts y plantillas.`;
    setIdea(newIdea);
    setProduct(null);
    setValidation(null);
    setCover(null);
    setWorking(true);
    try {
      const provider = await AIProviderFactory.create("mock");
      const spec = await provider.analyzeKitIdea(newIdea);
      const blueprint = await provider.generateKitBlueprint({ originalIdea: newIdea, specification: spec });
      setSpecDraft(spec);
      setBlueprintDraft(blueprint);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("crow_kit_idea", newIdea);
        sessionStorage.setItem("crow_kit_spec", JSON.stringify(spec));
        sessionStorage.setItem("crow_kit_blueprint", JSON.stringify(blueprint));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando kit complementario");
    } finally {
      setWorking(false);
    }
  };

  // ---------- Portada ----------
  const ensureCover = async (p: KitProduct): Promise<void> => {
    try {
      const { svgForImage } = await import("@/app/services/images/svgImageRenderer");
      const image = await imageEngine.generateCover({
        id: p.id, kind: "kit", version: 1, name: p.name, subtitle: p.subtitle, author: p.author,
        description: p.description, category: p.category, folders: p.folders,
        resources: [], branding: { preset: "modern", primaryColor: p.branding.primaryColor, secondaryColor: p.branding.secondaryColor, backgroundColor: "#ffffff", surfaceColor: "#f1f5f9", textColor: "#0f172a", mutedColor: "#64748b", accentColor: p.branding.accentColor, fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 8, showHeader: true, showFooter: true, showPageNumbers: true, headerStyle: "rule", footerStyle: "title-page", coverStyle: "bold", footerText: "" },
        cover: { title: p.name, subtitle: p.subtitle, author: p.author, brandLine: "CROW MARKET", edition: "" },
        chapters: [], stats: { totalChapters: 0, totalSections: 0, totalBlocks: 0, totalWords: 0, estimatedPages: 0 },
        exportInfo: null, status: "GENERATING",
      } as unknown as import("@/app/services/ai/pdfTypes").PdfProduct);
      const entry = { image, svg: svgForImage(image.spec) };
      setCover(entry);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(coverKey(p.id), JSON.stringify(entry));
        } catch {
          // no bloquea
        }
      }
    } catch (err) {
      console.error("Error generando portada del kit:", err);
    }
  };

  // ---------- Recursos ----------
  const updateResource = (id: string, patch: Partial<KitResource>): void => {
    if (!product) return;
    persistProduct({
      ...product,
      status: "BORRADOR",
      resources: product.resources.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)),
    });
  };

  const moveResource = (index: number, dir: -1 | 1): void => {
    if (!product) return;
    const next = [...product.resources].sort((a, b) => a.order - b.order);
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [m] = next.splice(index, 1);
    next.splice(j, 0, m);
    persistProduct({ ...product, status: "BORRADOR", resources: next.map((r, i) => ({ ...r, order: i + 1 })) });
  };

  const duplicateResource = (id: string): void => {
    if (!product) return;
    const src = product.resources.find((r) => r.id === id);
    if (!src) return;
    const copy: KitResource = {
      ...JSON.parse(JSON.stringify(src)) as KitResource,
      id: `${src.id}-copia-${Date.now()}`,
      title: `${src.title} (copia)`,
      order: product.resources.length + 1,
      updatedAt: new Date().toISOString(),
    };
    persistProduct({ ...product, status: "BORRADOR", resources: [...product.resources, copy] });
  };

  const deleteResource = (id: string): void => {
    if (!product) return;
    persistProduct({
      ...product,
      status: "BORRADOR",
      resources: product.resources.filter((r) => r.id !== id).map((r, i) => ({ ...r, order: i + 1 })),
    });
  };

  const rewriteSelected = async (action: KitTextAction): Promise<void> => {
    if (!product || !selectedResourceId) return;
    const resource = product.resources.find((r) => r.id === selectedResourceId);
    if (!resource) return;
    setWorking(true);
    try {
      const st = engine.getCurrentState();
      if (!st?.specification) throw new Error("Falta el contexto de generación");
      const provider = await AIProviderFactory.create("mock");
      const next = await provider.rewriteKitResource(
        { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint },
        resource,
        action
      );
      updateResource(resource.id, { blocks: next.blocks });
      await revalidate(product.resources.map((r) => (r.id === resource.id ? { ...r, blocks: next.blocks } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reescribiendo recurso");
    } finally {
      setWorking(false);
    }
  };

  const revalidate = async (resources?: KitResource[]): Promise<void> => {
    const current = product;
    if (!current) return;
    const st = engine.getCurrentState();
    if (!st?.specification || !st?.blueprint) return;
    setWorking(true);
    try {
      const provider = await AIProviderFactory.create("mock");
      const validation = await provider.validateKitProduct(
        { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint },
        { blueprint: st.blueprint, resources: resources ?? current.resources }
      );
      setValidation(validation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error revalidando");
    } finally {
      setWorking(false);
    }
  };

  const autoFix = (): void => {
    if (!product) return;
    const fixed = product.resources.map((r) => ({
      ...r,
      title: (r.title.trim() || "Recurso sin título"),
      blocks: r.blocks
        .map(fixBlock)
        .filter((b) => b.type === "divider" || b.type === "image" || blockTextOf(b).length > 0)
        .map((b, i) => ({ ...b, order: i + 1 })),
    }));
    // Nombres duplicados → sufijo
    const seen = new Map<string, number>();
    for (const r of fixed) {
      const key = r.title.toLowerCase();
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      if (n > 0) r.title = `${r.title} (${n + 1})`;
    }
    const firstFolder = product.folders[0]?.id ?? "";
    const relocated = fixed.map((r) => ({
      ...r,
      folderId: product.folders.some((f) => f.id === r.folderId) ? r.folderId : firstFolder,
    }));
    persistProduct({ ...product, status: "BORRADOR", resources: relocated });
    void revalidate(relocated);
  };

  // ---------- Descargas reales ----------
  const downloadResource = async (resource: KitResource, format: KitFileFormat): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const { resourceToText, resourceToCsv, resourceToXlsx, kitResourceToPdfProduct, sanitizeFileName } =
        await import("@/app/services/kit/kitExport");
      const base = sanitizeFileName(resource.title);
      if (format === "txt") {
        downloadBlob(new Blob([resourceToText(resource)], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
      } else if (format === "csv") {
        downloadBlob(new Blob([resourceToCsv(resource)], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      } else if (format === "xlsx") {
        downloadBlob(
          new Blob([resourceToXlsx(resource) as unknown as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `${base}.xlsx`
        );
      } else {
        const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
        const { bytes } = await generatePdfBytes(kitResourceToPdfProduct(resource, product));
        downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/pdf" }), `${base}.pdf`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error descargando recurso");
    } finally {
      setWorking(false);
    }
  };

  const downloadZip = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const { exportKitZip } = await import("@/app/services/kit/kitExport");
      const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
      const { kitResourceToPdfProduct } = await import("@/app/services/kit/kitExport");
      const { bytes } = await exportKitZip(product, cover?.svg ?? null, async (resource) => {
        const { bytes: b } = await generatePdfBytes(kitResourceToPdfProduct(resource, product));
        return b;
      });
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: "application/zip" }), `${product.name}.zip`.replace(/\s+/g, "-"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error exportando ZIP");
    } finally {
      setWorking(false);
    }
  };

  // ---------- Versiones / estados / marketplace ----------
  const duplicateKit = (): void => {
    if (!product) return;
    const copy: KitProduct = {
      ...JSON.parse(JSON.stringify(product)) as KitProduct,
      id: `kit-${Date.now()}`,
      version: Math.max(product.version, ...versions.map((v) => v.version), 0) + 1,
      status: "BORRADOR",
      name: `${product.name} (copia)`,
    };
    const entry = { version: copy.version, label: `Kit v${copy.version} · ${new Date().toLocaleString("es")}`, createdAt: new Date().toISOString(), product: copy };
    const next = [...versions, entry].sort((a, b) => a.version - b.version);
    setVersions(next);
    persistVersions(next);
    persistProduct(copy);
  };

  const switchVersion = (version: number): void => {
    const found = versions.find((v) => v.version === version);
    if (found) persistProduct(found.product);
  };

  const publishKit = (): void => {
    if (!product) return;
    persistProduct({ ...product, status: "PUBLICADO" });
  };

  const marketplaceListing = (p: KitProduct): KitMarketplaceListing => ({
    name: p.name,
    description: p.description,
    category: p.category,
    price: null,
    author: p.author,
    resourceCount: p.resources.length,
    formats: p.stats.formats,
    status: "draft",
  });

  // ================= PANTALLAS =================

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando...</div>
      </main>
    );
  }

  if (!idea) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "16px" }}>SIN IDEA</div>
        <h1 style={{ fontSize: "26px", margin: "0 0 12px" }}>¿Qué kit querés crear?</h1>
        <p style={{ color: "#888", marginBottom: "24px" }}>Volvé a Create Studio y contale a Crow qué recursos querés crear.</p>
        <button onClick={() => router.push("/create")} style={{ padding: "14px 28px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Volver a Create Studio
        </button>
      </main>
    );
  }

  const showProgress = generating || (!product && !error);
  const steps = kitState?.steps ?? [];
  const needsApproval = !product && !generating && !!blueprintDraft;
  const selected = product?.resources.find((r) => r.id === selectedResourceId) ?? null;

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(5,5,5,0.85)" }}>
        <button onClick={() => router.push("/create")} style={{ background: "transparent", border: "none", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Crow Kit Studio
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#aaa", fontSize: "13px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: product ? "#22c55e" : "#c084fc", display: "inline-block" }} />
          {product ? `Kit ${product.status} · v${product.version}` : needsApproval ? "Blueprint listo" : "Analizando..."}
        </div>
      </header>

      <section style={{ maxWidth: "1250px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {companions.length > 0 && !product && (
          <div style={{ padding: "14px 18px", borderRadius: "12px", marginBottom: "20px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", fontSize: "13px", color: "#aaa" }}>
            Detectamos tus productos: {companions.map((c) => `${c.kind} "${c.title}"`).join(" · ")}. Podés crear un kit complementario desde cualquiera.
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              {companions.map((c) => (
                <button key={`${c.kind}-${c.title}`} onClick={() => void startFromCompanion(c.title)} disabled={working} style={viewBtn(false)}>
                  Kit para "{c.title.slice(0, 32)}"
                </button>
              ))}
            </div>
          </div>
        )}

        {needsApproval && blueprintDraft && specDraft && (
          <BlueprintApproval
            blueprint={blueprintDraft}
            spec={specDraft}
            editing={editingBlueprint}
            working={working || generating}
            onToggleEdit={() => setEditingBlueprint((e) => !e)}
            onBlueprint={setBlueprintDraft}
            onApprove={() => void approveBlueprint()}
            onRegenerate={() => void regenerateBlueprint()}
          />
        )}

        {showProgress && !needsApproval && (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "30px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>Crow está creando tu kit</h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>Idea: {idea} — cada recurso generado es contenido real.</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#aaa" }}>
              <span>Progreso real</span>
              <strong style={{ color: "#a855f7" }}>{kitState?.overallProgress ?? 0}%</strong>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ height: "100%", width: `${kitState?.overallProgress ?? 0}%`, background: "#7c3aed", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", background: s.status === "completed" ? "rgba(34,197,94,0.2)" : s.status === "processing" ? "rgba(124,58,237,0.3)" : s.status === "failed" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", color: s.status === "completed" ? "#22c55e" : s.status === "processing" ? "#a855f7" : s.status === "failed" ? "#ef4444" : "#666" }}>
                    {s.status === "completed" ? "OK" : s.status === "failed" ? "!" : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#fff" }}>{s.name} — {s.progress}%</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#fca5a5" }}>
                {error}
                <div style={{ marginTop: "10px" }}>
                  <button onClick={() => void startGeneration()} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {product && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>
                  KIT DE RECURSOS · {product.status} · v{product.version}
                </div>
                <h1 style={{ fontSize: "30px", margin: "6px 0 4px" }}>{product.name}</h1>
                <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                  {product.stats.totalResources} recursos · {product.stats.totalFolders} carpetas · {product.stats.formats.join("/").toUpperCase()}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setEditingResource((e) => !e)} style={viewBtn(editingResource)}>{editingResource ? "Cerrar editor" : "Editar"}</button>
                <button onClick={() => void downloadZip()} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
                  {working ? "Trabajando..." : "Exportar Kit (ZIP)"}
                </button>
                <PublishButton from="kit" />
              </div>
            </div>

            {validation && (
              <div style={{ padding: "14px 18px", borderRadius: "12px", marginBottom: "20px", background: validation.passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: validation.passed ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#aaa" }}>
                Calidad: contenido {validation.contentScore}/30 · organización {validation.organizationScore}/30 · diseño {validation.designScore}/15 · formatos {validation.formatsScore}/25 →{" "}
                <strong style={{ color: validation.passed ? "#22c55e" : "#f87171" }}>{validation.totalScore}/100 {validation.passed ? "KIT LISTO PARA PUBLICAR" : "SE ENCONTRARON PROBLEMAS"}</strong>
                {validation.issues.slice(0, 3).map((iss) => (
                  <div key={iss.description} style={{ marginTop: "4px" }}>· {iss.description}</div>
                ))}
              </div>
            )}

            {error && !showProgress && (
              <div style={{ padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#fca5a5", marginBottom: "20px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              <button onClick={() => { runQualityPanel(); }} style={viewBtn(false)}>Quality check</button>
              <button onClick={() => duplicateKit()} style={viewBtn(false)}>Duplicar Kit</button>
              {product.status !== "PUBLICADO" ? (
                <button onClick={publishKit} style={viewBtn(false)}>Publicar</button>
              ) : (
                <span style={{ fontSize: "12px", color: "#22c55e", alignSelf: "center" }}>Publicado</span>
              )}
              <PublishButton from="kit" />
              {versions.length > 0 && (
                <select value={product.version} onChange={(e) => switchVersion(Number(e.target.value))} style={{ background: "#0c0c0f", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px", fontSize: "13px" }}>
                  {versions.map((v) => <option key={v.version} value={v.version}>{v.label}</option>)}
                </select>
              )}
            </div>

            {showQuality && (
              <div style={{ padding: "18px", borderRadius: "12px", marginBottom: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <strong>Crow Resource Quality Check</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => { autoFix(); }} disabled={working} style={viewBtn(false)}>Corregir automáticamente</button>
                    <button onClick={() => setShowQuality(false)} style={viewBtn(false)}>Cerrar</button>
                  </div>
                </div>
                {qualityIssues.map((q) => (
                  <div key={q.label} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#aaa", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: q.ok ? "#22c55e" : "#f87171", fontWeight: "bold", minWidth: "28px" }}>{q.ok ? "OK" : "X"}</span>
                    <span><strong style={{ color: "#fff" }}>{q.label}</strong> · {q.detail}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <KitCoverPreview product={product} coverSvg={cover?.svg ?? null} />
              <KitReadmePreview product={product} />
            </div>

            {product.folders
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((folder) => (
                <div key={folder.id} style={{ marginBottom: "20px" }}>
                  <h2 style={{ fontSize: "16px", margin: "0 0 12px" }}>{folder.name}</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                    {product.resources
                      .filter((r) => r.folderId === folder.id)
                      .sort((a, b) => a.order - b.order)
                      .map((r, idx, arr) => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedResourceId(r.id)}
                          style={{
                            padding: "18px",
                            borderRadius: "14px",
                            background: selectedResourceId === r.id ? "rgba(124,58,237,0.15)" : "#0c0c0f",
                            border: selectedResourceId === r.id ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px" }}>{r.title}</div>
                          <div style={{ color: "#666", fontSize: "12px", marginBottom: "6px" }}>
                            {r.kind} · {r.formats.join("/").toUpperCase()} · {r.blocks.length} bloques
                          </div>
                          <div style={{ color: "#22c55e", fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>Completo</div>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => moveResourceById(r.id, -1)} disabled={idx === 0} style={smallBtn}>↑</button>
                            <button onClick={() => moveResourceById(r.id, 1)} disabled={idx === arr.length - 1} style={smallBtn}>↓</button>
                            <button onClick={() => moveToFolder(r.id)} style={smallBtn}>Mover</button>
                            <button onClick={() => duplicateResource(r.id)} style={smallBtn}>Duplicar</button>
                            <button onClick={() => deleteResource(r.id)} style={{ ...smallBtn, color: "#f87171" }}>Eliminar</button>
                            <button onClick={() => void rewriteSelectedAction(r.id, "regenerate")} disabled={working} style={smallBtn}>Regenerar</button>
                            {r.formats.map((f) => (
                              <button key={f} onClick={() => void downloadResource(r, f)} disabled={working} style={smallBtn}>
                                {f.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}

            {selected && (
              <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <h2 style={{ fontSize: "18px", margin: 0 }}>{selected.title}</h2>
                  <button onClick={() => setSelectedResourceId(null)} style={smallBtn}>Cerrar</button>
                </div>
                <label style={labelStyle}>Título</label>
                <input value={selected.title} onChange={(e) => updateResource(selected.id, { title: e.target.value })} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Carpeta</label>
                    <select value={selected.folderId} onChange={(e) => updateResource(selected.id, { folderId: e.target.value })} style={inputStyle}>
                      {product.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Formatos</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(["pdf", "txt", "csv", "xlsx"] as KitFileFormat[]).map((f) => (
                        <label key={f} style={{ fontSize: "12px", color: "#aaa", display: "flex", gap: "4px", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={selected.formats.includes(f)}
                            onChange={() => {
                              const next = selected.formats.includes(f)
                                ? selected.formats.filter((x) => x !== f)
                                : [...selected.formats, f];
                              if (next.length > 0) updateResource(selected.id, { formats: next });
                            }}
                          />
                          {f.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {KIT_ACTIONS.map((a) => (
                    <button key={a.value} onClick={() => void rewriteSelectedAction(selected.id, a.value)} disabled={working} style={{ ...smallBtn, opacity: working ? 0.6 : 1 }}>
                      {a.label}
                    </button>
                  ))}
                </div>
                {editingResource ? (
                  <ResourceBlockEditor
                    resource={selected}
                    onChange={(blocks) => updateResource(selected.id, { blocks })}
                  />
                ) : (
                  <>
                    <button onClick={() => setEditingResource(true)} style={{ ...smallBtn, marginBottom: "16px" }}>Editar contenido</button>
                    <KitResourcePreview resource={selected} />
                  </>
                )}
              </div>
            )}

            <MarketplacePanel product={product} />
          </>
        )}
      </section>
    </main>
  );

  // ---------- helpers de componente ----------
  function moveResourceById(id: string, dir: -1 | 1): void {
    if (!product) return;
    const sorted = [...product.resources].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((r) => r.id === id);
    moveResource(index, dir);
  }

  function moveToFolder(id: string): void {
    if (!product) return;
    const r = product.resources.find((x) => x.id === id);
    if (!r) return;
    const idx = product.folders.findIndex((f) => f.id === r.folderId);
    const next = product.folders[(idx + 1) % product.folders.length];
    updateResource(id, { folderId: next.id });
  }

  async function rewriteSelectedAction(id: string, action: KitTextAction): Promise<void> {
    setSelectedResourceId(id);
    if (!product) return;
    const resource = product.resources.find((r) => r.id === id);
    if (!resource) return;
    setWorking(true);
    try {
      const st = engine.getCurrentState();
      if (!st?.specification) throw new Error("Falta el contexto");
      const provider = await AIProviderFactory.create("mock");
      const next = await provider.rewriteKitResource(
        { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint },
        resource,
        action
      );
      updateResource(id, { blocks: next.blocks });
      await revalidate(product.resources.map((x) => (x.id === id ? { ...x, blocks: next.blocks } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en acción IA");
    } finally {
      setWorking(false);
    }
  }

  function runQualityPanel(): void {
    if (!product || !validation) return;
    const checks = [
      { label: "Recursos completos", ok: validation.contentScore >= 24, detail: `${validation.contentScore}/30` },
      { label: "Organización", ok: validation.organizationScore >= 24, detail: `${validation.organizationScore}/30` },
      { label: "Diseño", ok: validation.designScore >= 12, detail: `${validation.designScore}/15` },
      { label: "Formatos", ok: validation.formatsScore >= 20, detail: `${validation.formatsScore}/25` },
      { label: "Nombres únicos", ok: new Set(product.resources.map((r) => r.title.toLowerCase())).size === product.resources.length, detail: `${product.resources.length} recursos` },
      { label: "Sin duplicados de archivo", ok: new Set(product.resources.map((r) => `${r.folderId}/${r.title}`)).size === product.resources.length, detail: "rutas únicas" },
    ];
    setQualityIssues(checks);
    setShowQuality(true);
  }
}

function loadVersions(): KitProductVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VERSIONS_KEY);
    return raw ? (JSON.parse(raw) as KitProductVersion[]) : [];
  } catch {
    return [];
  }
}

function persistVersions(next: KitProductVersion[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VERSIONS_KEY, JSON.stringify(next));
  } catch {
    // no bloquea
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function viewBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: "10px",
    border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(124,58,237,0.2)" : "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  };
}

const labelStyle: React.CSSProperties = { display: "block", color: "#888", fontSize: "11px", marginBottom: "4px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "8px 10px",
  fontSize: "13px",
  marginBottom: "8px",
  fontFamily: FONT,
};

const smallBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "11px",
};

// ============================================
// BLUEPRINT
// ============================================

function BlueprintApproval({
  blueprint,
  spec,
  editing,
  working,
  onToggleEdit,
  onBlueprint,
  onApprove,
  onRegenerate,
}: {
  blueprint: KitBlueprint;
  spec: KitSpecification;
  editing: boolean;
  working: boolean;
  onToggleEdit: () => void;
  onBlueprint: (b: KitBlueprint) => void;
  onApprove: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "30px", marginBottom: "24px" }}>
      <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>BLUEPRINT DEL KIT</div>
      <h1 style={{ fontSize: "30px", margin: "8px 0 6px" }}>{blueprint.name}</h1>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 6px" }}>{blueprint.subtitle}</p>
      <p style={{ color: "#666", fontSize: "13px", margin: "0 0 6px" }}>
        {blueprint.resources.length} recursos · {blueprint.folders.length} carpetas · {spec.audience}
      </p>
      <p style={{ color: "#aaa", fontSize: "14px", margin: "0 0 20px" }}>
        <strong style={{ color: "#fff" }}>Promesa:</strong> {blueprint.promise}
      </p>
      {!editing ? (
        <>
          {blueprint.folders.map((f) => (
            <div key={f.id} style={{ marginBottom: "14px" }}>
              <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>{f.name}</div>
              {blueprint.resources
                .filter((r) => r.folderId === f.id)
                .map((r) => (
                  <div key={r.id} style={{ color: "#aaa", fontSize: "13px", padding: "6px 0 6px 12px", borderLeft: "2px solid rgba(124,58,237,0.4)", marginBottom: "6px" }}>
                    <strong style={{ color: "#fff" }}>{r.title}</strong> · {r.kind} · {r.formats.join("/").toUpperCase()}
                    <div style={{ color: "#666", fontSize: "12px" }}>{r.summary}</div>
                  </div>
                ))}
            </div>
          ))}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
            <button onClick={onToggleEdit} style={viewBtn(false)}>Editar Blueprint</button>
            <button onClick={onRegenerate} disabled={working} style={viewBtn(false)}>Regenerar Blueprint</button>
            <button onClick={onApprove} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
              {working ? "Trabajando..." : "Generar Kit"}
            </button>
          </div>
        </>
      ) : (
        <>
          <label style={labelStyle}>Nombre del kit</label>
          <input value={blueprint.name} onChange={(e) => onBlueprint({ ...blueprint, name: e.target.value })} style={inputStyle} />
          <label style={labelStyle}>Subtítulo</label>
          <input value={blueprint.subtitle} onChange={(e) => onBlueprint({ ...blueprint, subtitle: e.target.value })} style={inputStyle} />
          <label style={labelStyle}>Promesa</label>
          <textarea value={blueprint.promise} onChange={(e) => onBlueprint({ ...blueprint, promise: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          {blueprint.resources.map((r) => (
            <div key={r.id} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input value={r.title} onChange={(e) => onBlueprint({ ...blueprint, resources: blueprint.resources.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)) })} style={{ ...inputStyle, marginBottom: 0 }} />
              <button
                onClick={() => onBlueprint({ ...blueprint, resources: blueprint.resources.filter((x) => x.id !== r.id) })}
                disabled={blueprint.resources.length <= 3}
                style={smallBtn}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
            <button onClick={onToggleEdit} style={viewBtn(false)}>Listo</button>
            <button onClick={onApprove} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
              {working ? "Trabajando..." : "Generar Kit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// EDITOR DE BLOQUES DEL RECURSO
// ============================================

function ResourceBlockEditor({
  resource,
  onChange,
}: {
  resource: KitResource;
  onChange: (blocks: PdfContentBlock[]) => void;
}) {
  const setBlocks = (blocks: PdfContentBlock[]): void => {
    onChange(blocks.map((b, i) => ({ ...b, order: i + 1 })));
  };
  return (
    <div>
      {resource.blocks.map((b, i) => (
        <div key={b.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px", marginBottom: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#a855f7", fontWeight: "bold" }}>{b.type.toUpperCase()}</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => {
                  const next = [...resource.blocks];
                  if (i > 0) {
                    const [m] = next.splice(i, 1);
                    next.splice(i - 1, 0, m);
                    setBlocks(next);
                  }
                }}
                style={smallBtn}
              >
                ↑
              </button>
              <button
                onClick={() => {
                  const next = [...resource.blocks];
                  if (i < next.length - 1) {
                    const [m] = next.splice(i, 1);
                    next.splice(i + 1, 0, m);
                    setBlocks(next);
                  }
                }}
                style={smallBtn}
              >
                ↓
              </button>
              <button onClick={() => setBlocks(resource.blocks.filter((x) => x.id !== b.id))} style={{ ...smallBtn, color: "#f87171" }}>
                ✕
              </button>
            </div>
          </div>
          <KitBlockField
            block={b}
            onChange={(next) => setBlocks(resource.blocks.map((x) => (x.id === b.id ? next : x)))}
          />
        </div>
      ))}
    </div>
  );
}

function KitBlockField({
  block: b,
  onChange,
}: {
  block: PdfContentBlock;
  onChange: (next: PdfContentBlock) => void;
}) {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight":
      return <textarea value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />;
    case "bulletList": case "numberedList": case "checklist":
      return (
        <textarea
          value={b.items.join("\n")}
          onChange={(e) => onChange({ ...b, items: e.target.value.split("\n") })}
          rows={Math.max(2, b.items.length)}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      );
    case "quote":
      return (
        <>
          <textarea value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          <input value={b.author} onChange={(e) => onChange({ ...b, author: e.target.value })} style={inputStyle} />
        </>
      );
    case "tip": case "warning": case "example": case "callout": case "exercise":
      return (
        <>
          <input value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} style={inputStyle} />
          <textarea value={b.text} onChange={(e) => onChange({ ...b, text: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </>
      );
    case "table":
      return (
        <textarea
          value={[b.headers.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n")}
          onChange={(e) => {
            const lines = e.target.value.split("\n");
            onChange({
              ...b,
              headers: (lines[0] ?? "").split("|").map((c) => c.trim()),
              rows: lines.slice(1).map((line) => line.split("|").map((c) => c.trim())),
            });
          }}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      );
    case "reflection":
      return <textarea value={b.question} onChange={(e) => onChange({ ...b, question: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />;
    case "chapterSummary":
      return (
        <textarea
          value={b.points.join("\n")}
          onChange={(e) => onChange({ ...b, points: e.target.value.split("\n") })}
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      );
    case "divider": case "image":
      return <div style={{ color: "#666", fontSize: "11px" }}>Bloque {b.type} (se conserva)</div>;
  }
}

// ============================================
// MARKETPLACE (arquitectura preparada, sin pagos)
// ============================================

function MarketplacePanel({ product }: { product: KitProduct }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: "12px", marginBottom: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#aaa" }}>
      <strong style={{ color: "#fff" }}>Marketplace (preparado)</strong>
      <div style={{ marginTop: "8px", lineHeight: 1.8 }}>
        Nombre: {product.name} · Categoría: {product.category} · Autor: {product.author} ·
        Recursos: {product.resources.length} · Formatos: {product.stats.formats.join("/").toUpperCase()} ·
        Precio: pendiente · Estado: borrador
      </div>
      <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>
        Pagos y publicación real se conectarán cuando el marketplace esté disponible.
      </div>
    </div>
  );
}

// ---------- ortografía + autofix ----------

function scanSpelling(product: KitProduct): number {
  let count = 0;
  for (const r of product.resources) {
    if (/ {2,}/.test(r.title)) count += 1;
    for (const b of r.blocks) {
      const text = blockTextOf(b);
      if (/ {2,}/.test(text)) count += 1;
      const dups = text.match(/\b([a-záéíóúñü]+) \1\b/gi);
      if (dups) count += dups.length;
    }
  }
  return count;
}

function blockTextOf(b: PdfContentBlock): string {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight": return b.text;
    case "bulletList": case "numberedList": return b.items.join(" ");
    case "quote": return `${b.text} ${b.author}`;
    case "tip": case "warning": case "example": case "callout": case "exercise": return `${b.title} ${b.text}`;
    case "checklist": return `${b.title} ${b.items.join(" ")}`;
    case "table": return `${b.title} ${b.headers.join(" ")} ${b.rows.map((r) => r.join(" ")).join(" ")}`;
    case "divider": case "image": return "";
    case "reflection": return b.question;
    case "chapterSummary": return b.points.join(" ");
  }
}

function fixBlock(b: PdfContentBlock): PdfContentBlock {
  const fix = (t: string): string =>
    t.replace(/[ \t]{2,}/g, " ").replace(/\b([a-záéíóúñü]+) \1\b/gi, "$1").trim();
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight":
      return { ...b, text: fix(b.text) };
    case "bulletList": case "numberedList":
      return { ...b, items: b.items.map(fix).filter((x) => x.length > 0) };
    case "quote": return { ...b, text: fix(b.text), author: fix(b.author) };
    case "tip": case "warning": case "example": case "callout": case "exercise":
      return { ...b, title: fix(b.title), text: fix(b.text) };
    case "checklist": return { ...b, title: fix(b.title), items: b.items.map(fix).filter((x) => x.length > 0) };
    case "table":
      return { ...b, title: fix(b.title), headers: b.headers.map(fix), rows: b.rows.map((r) => r.map(fix)) };
    case "reflection": return { ...b, question: fix(b.question) };
    case "chapterSummary": return { ...b, points: b.points.map(fix).filter((x) => x.length > 0) };
    case "divider": case "image": return b;
  }
}
