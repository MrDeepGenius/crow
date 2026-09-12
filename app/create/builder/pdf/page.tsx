// ============================================
// PDF STUDIO - Estudio editorial con IA
// ============================================
// Ruta: /create/builder/pdf
// Flujo: idea → blueprint editable → aprobación → generación →
// imágenes → preview → editor → quality check → vista final → exportar.
// Curso y web no se tocan.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PdfGenerationEngine,
  PDF_PRODUCT_KEY,
} from "@/app/services/ai/PdfGenerationEngine";
import { AIProviderFactory } from "@/app/services/ai/AIProvider";
import type {
  PdfProduct,
  PdfGenerationState,
  PdfQualityValidation,
  PdfExportResult,
  PdfBlueprint,
  PdfSpecification,
  PdfTextAction,
  PdfTone,
  PdfStylePreset,
  PdfProductVersion,
  PdfContentBlock,
} from "@/app/services/ai/pdfTypes";
import { PdfPreview } from "../components/PdfPreview";
import { PdfEditor } from "../components/PdfEditor";
import { PublishButton } from "../components/PublishButton";
import { ImageGenerationEngine } from "@/app/services/images/ImageGenerationEngine";
import type { VisualOpportunity } from "@/app/services/images/imageTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const VERSIONS_KEY = "crow_pdf_versions";

const TONES: { value: PdfTone; label: string }[] = [
  { value: "professional", label: "Profesional" },
  { value: "educational", label: "Educativo" },
  { value: "warm", label: "Cercano" },
  { value: "inspiring", label: "Inspirador" },
  { value: "premium", label: "Premium" },
  { value: "conversational", label: "Conversacional" },
];

const STYLES: { value: PdfStylePreset; label: string }[] = [
  { value: "minimal", label: "Minimalista" },
  { value: "editorial", label: "Editorial" },
  { value: "premium", label: "Premium" },
  { value: "modern", label: "Moderno" },
  { value: "business", label: "Business" },
  { value: "education", label: "Educación" },
  { value: "luxury", label: "Elegante" },
];

function migrateProduct(saved: PdfProduct): PdfProduct {
  return {
    ...saved,
    version: saved.version ?? 1,
    editorialStatus:
      saved.editorialStatus ?? (saved.status === "READY" ? "Listo" : saved.status === "GENERATING" ? "Generando" : "Borrador"),
    presentation: saved.presentation ?? {
      welcome: `Bienvenido a ${saved.metadata.title}.`,
      whatYouLearn: saved.chapters.map((c) => c.title),
      whoFor: "Lectores interesados en el tema.",
      howToUse: "Lee los capítulos en orden y completa un ejercicio por capítulo.",
    },
  };
}

function loadVersions(): PdfProductVersion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VERSIONS_KEY);
    return raw ? (JSON.parse(raw) as PdfProductVersion[]) : [];
  } catch {
    return [];
  }
}

export default function PdfBuilderPage() {
  const router = useRouter();
  const [engine] = useState(() => new PdfGenerationEngine());
  const [idea, setIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfState, setPdfState] = useState<PdfGenerationState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState<PdfProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [editing, setEditing] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState(false);
  const [blueprintDraft, setBlueprintDraft] = useState<PdfBlueprint | null>(null);
  const [specDraft, setSpecDraft] = useState<PdfSpecification | null>(null);
  const [validation, setValidation] = useState<PdfQualityValidation | null>(null);
  const [working, setWorking] = useState(false);
  const [exportStale, setExportStale] = useState(false);
  const [imageEngine] = useState(() => new ImageGenerationEngine());
  const [opportunities, setOpportunities] = useState<VisualOpportunity[]>([]);
  const [finalView, setFinalView] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const [versions, setVersions] = useState<PdfProductVersion[]>([]);
  const [showQuality, setShowQuality] = useState(false);
  const [qualityIssues, setQualityIssues] = useState<{ label: string; ok: boolean; detail: string }[]>([]);
  const sectionVariants = useRef<Record<string, number>>({});
  const finalRef = useRef<HTMLDivElement | null>(null);
  const bytesRef = useRef<Uint8Array | null>(null);

  const exporter = useCallback(async (p: PdfProduct) => {
    const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
    const result = await generatePdfBytes(p);
    bytesRef.current = result.bytes;
    return { pageCount: result.pageCount, byteSize: result.byteSize, bytes: result.bytes };
  }, []);

  // Carga inicial: idea, producto guardado (migrado), versiones, blueprint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedIdea = sessionStorage.getItem("crow_pdf_idea");
    setIdea(savedIdea);
    try {
      const raw = window.localStorage.getItem(PDF_PRODUCT_KEY);
      if (raw) {
        const saved = migrateProduct(JSON.parse(raw) as PdfProduct);
        setProduct(saved);
      }
    } catch {
      // sin producto guardado
    }
    setVersions(loadVersions());
    try {
      const b = sessionStorage.getItem("crow_pdf_blueprint");
      const s = sessionStorage.getItem("crow_pdf_spec");
      if (b) setBlueprintDraft(JSON.parse(b) as PdfBlueprint);
      if (s) setSpecDraft(JSON.parse(s) as PdfSpecification);
    } catch {
      // sin blueprint
    }
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
      engine.setExporter(exporter);
      const result = await engine.generatePdf(idea);
      setProduct(result);
      setValidation(engine.getCurrentState()?.validation ?? null);
      setExportStale(false);
      saveVersion(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando el PDF");
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea, engine, exporter]);

  // Con producto existente nunca se regenera solo (versiones/edición seguras).
  // Solo se reanuda si hay progreso previo sin producto (interrupción).
  useEffect(() => {
    if (loading || !idea || product) return;
    engine.loadState();
    const st = engine.getCurrentState();
    setPdfState(st);
    if (st && st.chapters.length > 0 && !generating) void startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, idea]);

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => setPdfState(engine.getCurrentState()), 500);
    return () => clearInterval(t);
  }, [generating, engine]);

  const persistProduct = (next: PdfProduct): void => {
    setProduct(next);
    engine.applyLocalProduct(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PDF_PRODUCT_KEY, JSON.stringify(next));
      } catch {
        // los bytes no se guardan
      }
    }
  };

  const saveVersion = (p: PdfProduct): void => {
    setVersions((prev) => {
      const entry: PdfProductVersion = {
        version: p.version,
        label: `Ebook v${p.version} · ${new Date().toLocaleString("es")}`,
        createdAt: new Date().toISOString(),
        product: p,
      };
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

  const handleEdited = (next: PdfProduct): void => {
    persistProduct({ ...next, editorialStatus: "Borrador" });
    setExportStale(true);
  };

  // ---------- Blueprint: aprobación ----------
  const approveBlueprint = async (): Promise<void> => {
    if (!idea || !blueprintDraft || !specDraft) return;
    setWorking(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("crow_pdf_blueprint", JSON.stringify(blueprintDraft));
        sessionStorage.setItem("crow_pdf_spec", JSON.stringify(specDraft));
      }
      engine.applyEditedBlueprint(idea, blueprintDraft, specDraft);
      await startGeneration();
    } finally {
      setWorking(false);
    }
  };

  const changeStyle = async (style: PdfStylePreset): Promise<void> => {
    if (!blueprintDraft || !specDraft) return;
    const { brandingForPreset } = await import("@/app/services/ai/MockAIProvider");
    const branding = brandingForPreset(style, "generic");
    setBlueprintDraft({
      ...blueprintDraft,
      branding: { ...blueprintDraft.branding, ...branding, preset: style },
    });
    setSpecDraft({ ...specDraft, style, recommendedByCrow: false });
  };

  // ---------- Editor IA ----------
  const refreshPdf = async (next?: PdfProduct): Promise<void> => {
    const current = next ?? product;
    if (!current) return;
    const st = engine.getCurrentState();
    if (!st?.specification || !st?.blueprint) {
      setError("Falta el contexto de generación para revalidar.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
      const result = await generatePdfBytes(current);
      bytesRef.current = result.bytes;
      const exportInfo: PdfExportResult = {
        generatedAt: new Date().toISOString(),
        pageCount: result.pageCount,
        byteSize: result.byteSize,
        fileName: current.exportInfo?.fileName ?? "ebook.pdf",
      };
      const provider = await AIProviderFactory.create("mock");
      const validation = await provider.validatePdfProduct(
        { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint },
        { blueprint: st.blueprint, chapters: current.chapters, exportInfo }
      );
      setValidation(validation);
      persistProduct({
        ...current,
        exportInfo,
        status: validation.passed ? "READY" : "VALIDATING",
        editorialStatus: validation.passed ? "Listo" : "Borrador",
      });
      setExportStale(false);
      if (!validation.passed) {
        setError(`Revalidación no superada (${validation.totalScore}/100). ${validation.issues[0]?.description ?? ""}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error regenerando el PDF");
    } finally {
      setWorking(false);
    }
  };

  const providerContext = () => {
    const st = engine.getCurrentState();
    if (!st?.specification) throw new Error("Falta el contexto de generación");
    return { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint };
  };

  const handleRewriteBlock = async (blockId: string, action: PdfTextAction): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const provider = await AIProviderFactory.create("mock");
      const ctx = providerContext();
      const next: PdfProduct = {
        ...product,
        chapters: await Promise.all(
          product.chapters.map(async (ch) => ({
            ...ch,
            sections: await Promise.all(
              ch.sections.map(async (sec) => ({
                ...sec,
                blocks: await Promise.all(
                  sec.blocks.map((b) => (b.id === blockId ? provider.rewritePdfBlock(ctx, b, action) : Promise.resolve(b)))
                ),
              }))
            ),
          }))
        ),
      };
      persistProduct(next);
      await refreshPdf(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error reescribiendo bloque");
    } finally {
      setWorking(false);
    }
  };

  const handleRegenerateSection = async (chapterId: string, sectionId: string): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const provider = await AIProviderFactory.create("mock");
      const ctx = providerContext();
      const ci = product.chapters.findIndex((c) => c.id === chapterId);
      const si = product.chapters[ci]?.sections.findIndex((s) => s.id === sectionId) ?? -1;
      if (ci < 0 || si < 0) throw new Error("Sección inexistente");
      const key = `${chapterId}/${sectionId}`;
      sectionVariants.current[key] = (sectionVariants.current[key] ?? 0) + 1;
      const rebuilt = await provider.regeneratePdfSection(ctx, ci, si, sectionVariants.current[key]);
      const old = product.chapters[ci].sections[si];
      const next: PdfProduct = {
        ...product,
        chapters: product.chapters.map((c) =>
          c.id === chapterId
            ? { ...c, sections: c.sections.map((s) => (s.id === sectionId ? { ...rebuilt, id: old.id, order: old.order } : s)) }
            : c
        ),
      };
      persistProduct(next);
      await refreshPdf(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error regenerando sección");
    } finally {
      setWorking(false);
    }
  };

  const handleRegenerateCover = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const coverBlock = product.chapters
        .flatMap((c) => c.sections.flatMap((s) => s.blocks.map((b) => ({ b, s }))))
        .find(({ b }) => b.type === "image" && b.vector?.kind === "cover");
      if (!coverBlock) {
        const cover = await imageEngine.generateCover(product);
        persistProduct(imageEngine.insertImage(product, cover));
      } else {
        const { product: next } = await imageEngine.regenerateImage(product, coverBlock.b.id);
        persistProduct(next);
      }
      await refreshPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error regenerando portada");
    } finally {
      setWorking(false);
    }
  };

  // ---------- Imágenes ----------
  const handleGenerateImages = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    setError(null);
    try {
      const opps = imageEngine.analyzeProduct(product);
      setOpportunities(opps);
      let next = product;
      const existingImages = product.chapters.flatMap((c) =>
        c.sections.flatMap((s) => s.blocks.filter((b) => b.type === "image"))
      ).length;
      if (existingImages === 0) {
        next = imageEngine.insertImage(next, await imageEngine.generateCover(next));
      }
      for (const opp of opps) {
        next = imageEngine.insertImage(next, await imageEngine.generateForOpportunity(next, opp, 0));
      }
      imageEngine.saveState({
        productId: next.id,
        topic: next.metadata.title,
        style: "modern",
        opportunities: opps,
        images: [],
        updatedAt: new Date().toISOString(),
      });
      persistProduct(next);
      await refreshPdf(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando imágenes");
    } finally {
      setWorking(false);
    }
  };

  const handleRegenerateImage = async (blockId: string): Promise<void> => {
    if (!product) return;
    setWorking(true);
    try {
      const { product: next } = await imageEngine.regenerateImage(product, blockId);
      persistProduct(next);
      await refreshPdf(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error regenerando imagen");
    } finally {
      setWorking(false);
    }
  };

  // ---------- Descarga real ----------
  const downloadPdf = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    setError(null);
    try {
      let bytes = bytesRef.current;
      if (!bytes || exportStale) {
        const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
        const result = await generatePdfBytes(product);
        bytes = result.bytes;
        bytesRef.current = bytes;
        setExportStale(false);
      }
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = product.exportInfo?.fileName ?? "ebook.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error descargando el PDF");
    } finally {
      setWorking(false);
    }
  };

  const openFinalView = async (): Promise<void> => {
    if (!product) return;
    setFinalView(true);
    setEmbedFailed(false);
    try {
      let bytes = bytesRef.current;
      if (!bytes || exportStale) {
        const { generatePdfBytes } = await import("@/app/services/pdf/PdfDocumentGenerator");
        bytes = (await generatePdfBytes(product)).bytes;
        bytesRef.current = bytes;
        setExportStale(false);
      }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setEmbedFailed(true);
      setError(err instanceof Error ? err.message : "Error abriendo vista final");
    }
  };

  // ---------- Versiones ----------
  const duplicateProduct = (): void => {
    if (!product) return;
    const copy: PdfProduct = {
      ...JSON.parse(JSON.stringify(product)) as PdfProduct,
      id: `pdf-${Date.now()}`,
      version: Math.max(product.version, ...versions.map((v) => v.version), 0) + 1,
      editorialStatus: "Borrador",
    };
    copy.metadata = { ...copy.metadata, title: `${copy.metadata.title} (copia)` };
    const entry = { version: copy.version, label: `Ebook v${copy.version} · ${new Date().toLocaleString("es")}`, createdAt: new Date().toISOString(), product: copy };
    const next = [...versions, entry].sort((a, b) => a.version - b.version);
    setVersions(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VERSIONS_KEY, JSON.stringify(next));
      } catch {
        // no bloquea
      }
    }
    persistProduct(copy);
  };

  const switchVersion = (version: number): void => {
    const found = versions.find((v) => v.version === version);
    if (found) {
      persistProduct(migrateProduct(found.product));
      setExportStale(true);
    }
  };

  const finalizeProduct = (): void => {
    if (!product) return;
    const next = { ...product, editorialStatus: "Listo" as const };
    persistProduct(next);
    saveVersionRef(next);
    void openFinalView();
  };

  const saveVersionRef = (p: PdfProduct): void => {
    setVersions((prev) => {
      const entry = { version: p.version, label: `Ebook v${p.version} · ${new Date().toLocaleString("es")}`, createdAt: new Date().toISOString(), product: p };
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

  const publishProduct = (): void => {
    if (!product) return;
    persistProduct({ ...product, editorialStatus: "Publicado", status: "PUBLISHED" });
  };

  // ---------- Quality check ----------
  const runQualityCheck = (): void => {
    if (!product) return;
    const checks: { label: string; ok: boolean; detail: string }[] = [];
    const v = validation;
    checks.push({ label: "Contenido completo", ok: (v?.contentScore ?? 0) >= 24, detail: `${v?.contentScore ?? 0}/30` });
    checks.push({ label: "Estructura", ok: (v?.structureScore ?? 0) >= 16, detail: `${v?.structureScore ?? 0}/20` });
    checks.push({ label: "Diseño", ok: (v?.designScore ?? 0) >= 16, detail: `${v?.designScore ?? 0}/20` });
    const spell = scanSpelling(product);
    checks.push({ label: "Ortografía básica", ok: spell === 0, detail: spell === 0 ? "sin repeticiones ni dobles espacios" : `${spell} detalle(s)` });
    const titles = product.chapters.map((c) => c.title.trim().toLowerCase());
    checks.push({ label: "Títulos únicos", ok: new Set(titles).size === titles.length, detail: `${titles.length} capítulos` });
    checks.push({ label: "Índice", ok: product.chapters.length > 0, detail: `${product.chapters.length} capítulos indexados` });
    const imgs = product.chapters.flatMap((c) => c.sections.flatMap((s) => s.blocks.filter((b) => b.type === "image")));
    checks.push({ label: "Imágenes", ok: imgs.length > 0 && imgs.every((b) => b.type === "image" && b.alt.trim().length > 0 && (b.vector || b.src.trim().length > 0)), detail: `${imgs.length} imagen(es)` });
    checks.push({ label: "Portada", ok: product.cover.title.trim().length > 0 && product.cover.author.trim().length > 0, detail: product.cover.title });
    checks.push({ label: "Exportación", ok: !!product.exportInfo && product.exportInfo.byteSize > 0, detail: product.exportInfo ? `${product.exportInfo.pageCount} páginas` : "pendiente" });
    setQualityIssues(checks);
    setShowQuality(true);
  };

  const autoFix = async (): Promise<void> => {
    if (!product) return;
    const fixed: PdfProduct = {
      ...product,
      chapters: product.chapters.map((ch) => ({
        ...ch,
        title: ch.title.trim(),
        introduction: fixText(ch.introduction),
        sections: ch.sections.map((sec) => ({
          ...sec,
          title: sec.title.trim(),
          blocks: sec.blocks
            .map(fixBlockTexts)
            .filter((b) => b.type === "divider" || blockHasContent(b)),
        })),
      })),
    };
    persistProduct(fixed);
    await refreshPdf(fixed);
    runQualityCheck();
  };

  const imageSummary = product
    ? product.chapters.map((ch) => ({
        id: ch.id,
        title: ch.title,
        count: ch.sections.reduce((n, s) => n + s.blocks.filter((b) => b.type === "image").length, 0),
      }))
    : [];

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
        <h1 style={{ fontSize: "26px", margin: "0 0 12px" }}>No hay un ebook para construir.</h1>
        <p style={{ color: "#888", marginBottom: "24px" }}>Volvé a Create Studio, escribí tu idea y elegí Ebook.</p>
        <button onClick={() => router.push("/create")} style={{ padding: "14px 28px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Volver a Create Studio
        </button>
      </main>
    );
  }

  const showProgress = generating || (!product && !error);
  const steps = pdfState?.steps ?? [];
  const needsApproval = !product && !generating && !!blueprintDraft;

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(5,5,5,0.85)" }}>
        <button onClick={() => router.push("/create")} style={{ background: "transparent", border: "none", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Crow PDF Studio
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#aaa", fontSize: "13px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: product ? "#22c55e" : "#c084fc", display: "inline-block" }} />
          {product ? `Ebook ${product.editorialStatus} · v${product.version}` : needsApproval ? "Blueprint listo" : "Estudio editorial..."}
        </div>
      </header>

      <section style={{ maxWidth: "1250px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {needsApproval && blueprintDraft && specDraft && (
          <BlueprintApproval
            blueprint={blueprintDraft}
            spec={specDraft}
            editing={editingBlueprint}
            working={working || generating}
            onToggleEdit={() => setEditingBlueprint((e) => !e)}
            onBlueprint={setBlueprintDraft}
            onSpec={setSpecDraft}
            onStyle={changeStyle}
            onApprove={() => void approveBlueprint()}
          />
        )}

        {showProgress && !needsApproval && (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "30px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>Crow está creando tu ebook</h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>
              Idea: {idea} — cada etapa es una operación real del engine.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#aaa" }}>
              <span>Progreso real</span>
              <strong style={{ color: "#a855f7" }}>{pdfState?.overallProgress ?? 0}%</strong>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ height: "100%", width: `${pdfState?.overallProgress ?? 0}%`, background: "#7c3aed", transition: "width 0.5s ease" }} />
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

        {product && !finalView && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>
                  PDF / EBOOK · {product.editorialStatus.toUpperCase()} · v{product.version}
                  {product.exportInfo ? ` · ${product.exportInfo.pageCount} páginas · ${(product.exportInfo.byteSize / 1024).toFixed(0)} KB` : ""}
                  {exportStale ? " · PDF desactualizado" : ""}
                </div>
                <h1 style={{ fontSize: "30px", margin: "6px 0 4px" }}>{product.metadata.title}</h1>
                <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                  {product.stats.totalChapters} capítulos · {product.stats.totalSections} secciones · {product.stats.totalBlocks} bloques · ~{product.stats.totalWords.toLocaleString("es")} palabras
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => setViewMode("desktop")} style={viewBtn(viewMode === "desktop")}>Desktop</button>
                <button onClick={() => setViewMode("mobile")} style={viewBtn(viewMode === "mobile")}>Documento</button>
                <button onClick={() => setEditing((e) => !e)} style={viewBtn(editing)}>{editing ? "Cerrar editor" : "Editar"}</button>
                <button onClick={() => void downloadPdf()} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
                  {working ? "Trabajando..." : "Descargar PDF"}
                </button>
              </div>
            </div>

            {validation && (
              <div style={{ padding: "14px 18px", borderRadius: "12px", marginBottom: "20px", background: validation.passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: validation.passed ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#aaa" }}>
                Calidad: contenido {validation.contentScore}/30 · estructura {validation.structureScore}/20 · diseño {validation.designScore}/20 · completitud {validation.completenessScore}/20 · export {validation.exportScore}/10 →{" "}
                <strong style={{ color: validation.passed ? "#22c55e" : "#f87171" }}>{validation.totalScore}/100 {validation.passed ? "APROBADO" : "NO APROBADO"}</strong>
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
              <button onClick={() => runQualityCheck()} style={viewBtn(false)}>Quality check</button>
              <button onClick={() => finalizeProduct()} style={viewBtn(true)}>Finalizar ebook</button>
              <button onClick={duplicateProduct} style={viewBtn(false)}>Duplicar (nueva versión)</button>
              {product.editorialStatus !== "Publicado" ? (
                <button onClick={publishProduct} style={viewBtn(false)}>Publicar</button>
              ) : (
                <span style={{ fontSize: "12px", color: "#22c55e", alignSelf: "center" }}>Publicado</span>
              )}
              <PublishButton from="pdf" />
              {versions.length > 0 && (
                <select value={product.version} onChange={(e) => switchVersion(Number(e.target.value))} style={{ background: "#0c0c0f", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px", fontSize: "13px" }}>
                  {versions.map((v) => <option key={v.version} value={v.version}>{v.label}</option>)}
                </select>
              )}
              <button disabled title="EPUB disponible próximamente: arquitectura preparada" style={{ ...viewBtn(false), opacity: 0.5, cursor: "not-allowed" }}>EPUB (próximamente)</button>
            </div>

            {showQuality && (
              <div style={{ padding: "18px", borderRadius: "12px", marginBottom: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <strong>Crow Quality Check</strong>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => void autoFix().then(() => undefined)} disabled={working} style={viewBtn(false)}>Corregir automáticamente</button>
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

            <div style={{ padding: "16px 18px", borderRadius: "12px", marginBottom: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                  Imágenes del producto · {imageSummary.reduce((n, s) => n + s.count, 0)} en total
                </div>
                <button onClick={() => void handleGenerateImages()} disabled={working} style={{ padding: "10px 16px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px", opacity: working ? 0.6 : 1 }}>
                  {working ? "Trabajando..." : imageSummary.some((s) => s.count > 0) ? "Regenerar imágenes" : "Generar imágenes"}
                </button>
              </div>
              {imageSummary.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#aaa", padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>{s.title}</span>
                  <span style={{ color: s.count > 0 ? "#22c55e" : "#666", fontWeight: "bold" }}>
                    {s.count > 0 ? `${s.count} generada(s)` : "pendiente"}
                  </span>
                </div>
              ))}
              {opportunities.length > 0 && (
                <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                  Análisis visual: {opportunities.length} oportunidad(es) detectada(s) en el contenido.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: editing ? 2 : 1, minWidth: "320px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: viewMode === "mobile" ? "440px" : "100%", maxWidth: "100%" }}>
                  <PdfPreview product={product} />
                </div>
              </div>
              {editing && (
                <aside style={{ flex: 1, minWidth: "300px", background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px" }}>
                  <h2 style={{ fontSize: "16px", margin: "0 0 16px" }}>Editor</h2>
                  <PdfEditor
                    product={product}
                    onProduct={handleEdited}
                    onRegenerateImage={(id) => void handleRegenerateImage(id)}
                    onRewriteBlock={(id, action) => void handleRewriteBlock(id, action)}
                    onRegenerateSection={(chId, secId) => void handleRegenerateSection(chId, secId)}
                    onRegenerateCover={() => void handleRegenerateCover()}
                    working={working}
                  />
                  <button onClick={() => void refreshPdf()} disabled={working} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", marginTop: "8px", opacity: working ? 0.6 : 1 }}>
                    {working ? "Trabajando..." : "Revalidar y actualizar PDF"}
                  </button>
                </aside>
              )}
            </div>
          </>
        )}

        {product && finalView && (
          <div ref={finalRef}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>PRODUCTO FINAL · {product.metadata.title}</div>
                <div style={{ color: "#888", fontSize: "13px" }}>Vista fiel del archivo PDF real (navegación, zoom y búsqueda del visor).</div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => setFinalView(false)} style={viewBtn(false)}>Volver al estudio</button>
                <button
                  onClick={() => {
                    if (finalRef.current?.requestFullscreen) void finalRef.current.requestFullscreen().catch(() => undefined);
                  }}
                  style={viewBtn(false)}
                >
                  Pantalla completa
                </button>
                <button onClick={() => void downloadPdf()} disabled={working} style={viewBtn(true)}>Descargar PDF</button>
              </div>
            </div>
            {pdfUrl && !embedFailed ? (
              <iframe
                src={pdfUrl}
                title="Vista final del ebook"
                style={{ width: "100%", height: "80vh", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", background: "#fff" }}
                onError={() => setEmbedFailed(true)}
              />
            ) : (
              <div>
                <div style={{ color: "#888", fontSize: "13px", marginBottom: "12px" }}>
                  Vista alternativa del documento (el visor embebido no está disponible aquí).
                </div>
                <PdfPreview product={product} />
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

// ============================================
// BLUEPRINT EDITABLE + PERSONALIZACIÓN
// ============================================

function BlueprintApproval({
  blueprint,
  spec,
  editing,
  working,
  onToggleEdit,
  onBlueprint,
  onSpec,
  onStyle,
  onApprove,
}: {
  blueprint: PdfBlueprint;
  spec: PdfSpecification;
  editing: boolean;
  working: boolean;
  onToggleEdit: () => void;
  onBlueprint: (b: PdfBlueprint) => void;
  onSpec: (s: PdfSpecification) => void;
  onStyle: (s: PdfStylePreset) => void;
  onApprove: () => void;
}) {
  return (
    <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "30px", marginBottom: "24px" }}>
      <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>PROYECTO EDITORIAL · BLUEPRINT</div>
      <h1 style={{ fontSize: "30px", margin: "8px 0 6px" }}>{blueprint.title}</h1>
      <p style={{ color: "#888", fontSize: "14px", margin: "0 0 8px" }}>{blueprint.subtitle}</p>
      <p style={{ color: "#666", fontSize: "13px", margin: "0 0 20px" }}>
        {blueprint.chapters.length} capítulos · {spec.targetPages} páginas objetivo · {spec.audience}
        {spec.recommendedByCrow ? " · Combinación recomendada por Crow" : ""}
      </p>

      {!editing ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            {blueprint.chapters.map((ch, i) => (
              <div key={ch.id} style={{ padding: "16px", borderRadius: "12px", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ color: "#a855f7", fontSize: "11px", marginBottom: "6px" }}>CAPÍTULO {i + 1}</div>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{ch.title}</div>
                <div style={{ color: "#666", fontSize: "12px", marginTop: "6px" }}>{ch.summary}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={onToggleEdit} style={viewBtn(false)}>Editar blueprint</button>
            <button onClick={onApprove} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
              {working ? "Trabajando..." : "Generar ebook"}
            </button>
          </div>
        </>
      ) : (
        <>
          <label style={labelStyle}>Título</label>
          <input value={blueprint.title} onChange={(e) => onBlueprint({ ...blueprint, title: e.target.value, cover: { ...blueprint.cover, title: e.target.value } })} style={inputStyle} />
          <label style={labelStyle}>Subtítulo</label>
          <input value={blueprint.subtitle} onChange={(e) => onBlueprint({ ...blueprint, subtitle: e.target.value, cover: { ...blueprint.cover, subtitle: e.target.value } })} style={inputStyle} />
          <label style={labelStyle}>Público objetivo</label>
          <input value={blueprint.targetAudience} onChange={(e) => { onBlueprint({ ...blueprint, targetAudience: e.target.value }); onSpec({ ...spec, audience: e.target.value }); }} style={inputStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            <div>
              <label style={labelStyle}>Tono</label>
              <select value={spec.tone} onChange={(e) => onSpec({ ...spec, tone: e.target.value as PdfTone, recommendedByCrow: false })} style={inputStyle}>
                {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estilo visual</label>
              <select value={spec.style} onChange={(e) => onStyle(e.target.value as PdfStylePreset)} style={inputStyle}>
                {STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Paleta</label>
              <select value={spec.paletteMode} onChange={(e) => onSpec({ ...spec, paletteMode: e.target.value as "auto" | "custom", recommendedByCrow: false })} style={inputStyle}>
                <option value="auto">Automática por tema</option>
                <option value="custom">Personalizada (editor)</option>
              </select>
            </div>
          </div>
          {blueprint.chapters.map((ch, i) => (
            <div key={ch.id} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input value={ch.title} onChange={(e) => onBlueprint({ ...blueprint, chapters: blueprint.chapters.map((c) => (c.id === ch.id ? { ...c, title: e.target.value } : c)) })} style={{ ...inputStyle, marginBottom: 0 }} />
              <button
                onClick={() => onBlueprint({ ...blueprint, chapters: blueprint.chapters.filter((c) => c.id !== ch.id) })}
                disabled={blueprint.chapters.length <= 3}
                style={smallBtn}
              >
                ✕
              </button>
              <span style={{ color: "#666", fontSize: "12px", alignSelf: "center" }}>Cap. {i + 1}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
            <button onClick={onToggleEdit} style={viewBtn(false)}>Listo</button>
            <button onClick={onApprove} disabled={working} style={{ ...viewBtn(true), opacity: working ? 0.6 : 1 }}>
              {working ? "Trabajando..." : "Generar ebook"}
            </button>
          </div>
        </>
      )}
    </div>
  );
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

// ---------- Ortografía básica + autofix (determinístico) ----------

function scanSpelling(product: PdfProduct): number {
  let count = 0;
  const check = (text: string): void => {
    if (/ {2,}/.test(text)) count += 1;
    const dups = text.match(/\b([a-záéíóúñü]+) \1\b/gi);
    if (dups) count += dups.length;
  };
  for (const ch of product.chapters) {
    check(ch.title);
    check(ch.introduction);
    for (const sec of ch.sections) {
      check(sec.title);
      for (const b of sec.blocks) {
        if (b.type === "divider" || b.type === "image") continue;
        check(blockPlainText(b));
      }
    }
  }
  return count;
}

function blockPlainText(b: PdfContentBlock): string {
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

function fixText(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\b([a-záéíóúñü]+) \1\b/gi, "$1")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

function fixBlockTexts(b: PdfContentBlock): PdfContentBlock {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight":
      return { ...b, text: fixText(b.text) };
    case "bulletList": case "numberedList":
      return { ...b, items: b.items.map(fixText).filter((x) => x.length > 0) };
    case "quote":
      return { ...b, text: fixText(b.text), author: fixText(b.author) };
    case "tip": case "warning": case "example": case "callout": case "exercise":
      return { ...b, title: fixText(b.title), text: fixText(b.text) };
    case "checklist":
      return { ...b, title: fixText(b.title), items: b.items.map(fixText).filter((x) => x.length > 0) };
    case "table":
      return { ...b, title: fixText(b.title), headers: b.headers.map(fixText), rows: b.rows.map((r) => r.map(fixText)) };
    case "reflection":
      return { ...b, question: fixText(b.question) };
    case "chapterSummary":
      return { ...b, points: b.points.map(fixText).filter((x) => x.length > 0) };
    case "divider": case "image":
      return b;
  }
}

function blockHasContent(b: PdfContentBlock): boolean {
  if (b.type === "divider" || b.type === "image") return true;
  return blockPlainText(b).length > 0;
}
