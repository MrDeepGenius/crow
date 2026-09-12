// ============================================
// PDF GENERATION ENGINE - CROW MARKET
// ============================================
// Motor del formato "pdf". Mismo concepto que los otros engines:
// etapas reales, persistencia, reanudación. Curso y web intactos.

import { AIProvider, AIProviderFactory, AIProviderType } from "./AIProvider";
import {
  PdfGenerationContext,
  PdfGenerationState,
  PdfGenerationStepId,
  PdfBlueprint,
  PdfChapter,
  PdfProduct,
  PdfQualityValidation,
  PdfExportResult,
  PdfContentBlock,
} from "./pdfTypes";
import { ImageGenerationEngine } from "@/app/services/images/ImageGenerationEngine";
import { AI_CONFIG } from "@/app/config/ai";

const PDF_STORAGE_KEY = "crow_pdf_generation_state_v1";
const PDF_PRODUCT_KEY = "crow_last_pdf";

function storageKey(namespace: string): string {
  return namespace === "pdf" ? PDF_STORAGE_KEY : `crow_${namespace}_generation_state_v1`;
}

function productKey(namespace: string): string {
  return namespace === "pdf" ? PDF_PRODUCT_KEY : `crow_last_${namespace}`;
}

export interface PdfExporter {
  (product: PdfProduct): Promise<{ pageCount: number; byteSize: number; bytes: Uint8Array }>;
}

export class PdfGenerationEngine {
  private providerType: AIProviderType = AI_CONFIG.mode as AIProviderType;
  private provider: AIProvider | null = null;
  private state: PdfGenerationState | null = null;
  private exporter: PdfExporter | null = null;
  private namespace: string;

  /** namespace "pdf" = flujo PDF existente (sin cambios); otros = espacios propios. */
  constructor(namespace = "pdf") {
    this.namespace = namespace;
  }

  private get stateKey(): string {
    return storageKey(this.namespace);
  }

  private get lastProductKey(): string {
    return productKey(this.namespace);
  }

  setExporter(exporter: PdfExporter): void {
    this.exporter = exporter;
  }

  async generatePdf(idea: string): Promise<PdfProduct> {
    const trimmed = idea.trim();
    if (!trimmed) throw new Error("La idea no puede estar vacía");

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(this.stateKey);
        if (raw) {
          const saved = JSON.parse(raw) as PdfGenerationState;
          if (
            saved.originalIdea === trimmed &&
            saved.status !== "READY" &&
            saved.status !== "FAILED" &&
            Array.isArray(saved.chapters)
          ) {
            this.state = saved;
          }
        }
      } catch {
        // estado corrupto: empezar de cero
      }
    }

    if (!this.state || this.state.originalIdea !== trimmed) {
      this.state = this.createInitialState(trimmed);
      this.persist();
    }

    try {
      this.provider = await AIProviderFactory.create(this.providerType);

      if (!this.state.specification) await this.analyze();
      if (!this.state.blueprint) await this.createBlueprint();
      if (!this.state.presentation) await this.createPresentation();
      await this.generateChapters();
      await this.applyDesign();
      await this.generateImages();
      await this.validateContent();
      const exportInfo = await this.exportPdf();
      await this.verifyExport(exportInfo);
      return this.complete(exportInfo);
    } catch (error) {
      if (this.state) {
        this.state.status = "FAILED";
        this.state.error = error instanceof Error ? error.message : "Error desconocido";
        this.state.hasError = true;
        this.failStep(this.state.currentStep);
        this.persist();
      }
      throw error;
    }
  }

  // ============================================
  // ETAPAS REALES
  // ============================================

  private createInitialState(idea: string): PdfGenerationState {
    const steps: PdfGenerationState["steps"] = [
      { id: "analyze", name: "Analizando idea", description: "Tema, audiencia y páginas objetivo", status: "pending", progress: 0 },
      { id: "blueprint", name: "Creando Blueprint", description: "Capítulos, portada y estilo", status: "pending", progress: 0 },
      { id: "chapters", name: "Generando capítulos", description: "Contenido real por capítulo", status: "pending", progress: 0 },
      { id: "design", name: "Diseñando documento", description: "Branding y estilos aplicados", status: "pending", progress: 0 },
      { id: "images", name: "Generando recursos visuales", description: "Portada e imágenes por capítulo", status: "pending", progress: 0 },
      { id: "validate", name: "Validando", description: "Contenido, estructura y diseño", status: "pending", progress: 0 },
      { id: "export", name: "Generando PDF", description: "Archivo .pdf real", status: "pending", progress: 0 },
      { id: "complete", name: "Finalizando", description: "Producto guardado y listo", status: "pending", progress: 0 },
    ];
    return {
      id: `pdf-${Date.now()}`,
      originalIdea: idea,
      status: "GENERATING",
      steps,
      currentStep: "analyze",
      overallProgress: 0,
      isComplete: false,
      hasError: false,
      chapters: [],
      imagesGenerated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private context(): PdfGenerationContext {
    if (!this.state?.specification) throw new Error("Falta el análisis de la idea");
    return {
      originalIdea: this.state.originalIdea,
      specification: this.state.specification,
      blueprint: this.state.blueprint,
    };
  }

  private async analyze(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.specification) return;
    this.setStep("analyze", "processing", 25);
    this.state.specification = await this.provider.analyzePdfIdea(this.state.originalIdea);
    this.setStep("analyze", "completed", 100);
    this.setOverall(10);
    this.persist();
  }

  private async createBlueprint(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.blueprint) return;
    this.setStep("blueprint", "processing", 10);
    this.state.blueprint = await this.provider.generatePdfBlueprint(this.context());
    this.setStep("blueprint", "completed", 100);
    this.setOverall(22);
    this.persist();
  }

  private async createPresentation(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.presentation) return;
    this.state.presentation = await this.provider.generatePdfPresentation(this.context());
    this.persist();
  }

  private chapterComplete(c: PdfChapter | undefined, blueprint: PdfBlueprint, index: number): boolean {
    if (!c || c.id !== blueprint.chapters[index].id) return false;
    if (c.introduction.trim().length < 100 || c.sections.length === 0) return false;
    return c.sections.every((s) => s.blocks.length >= 2);
  }

  private async generateChapters(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    const blueprint: PdfBlueprint = this.state.blueprint;
    const existing = [...this.state.chapters];
    const allDone =
      existing.length === blueprint.chapters.length &&
      existing.every((c, i) => this.chapterComplete(c, blueprint, i));
    if (allDone) {
      this.setStep("chapters", "completed", 100);
      return;
    }
    this.setStep("chapters", "processing", 0);
    for (let i = 0; i < blueprint.chapters.length; i++) {
      if (!this.chapterComplete(existing[i], blueprint, i)) {
        this.state.currentStep = "chapters";
        existing[i] = await this.provider.generatePdfChapter(this.context(), i);
        this.state.chapters = [...existing];
        this.persist();
      }
      this.setStep("chapters", "processing", Math.floor(((i + 1) / blueprint.chapters.length) * 100));
    }
    this.state.chapters = [...existing];
    this.setStep("chapters", "completed", 100);
    this.setOverall(62);
    this.persist();
  }

  private async applyDesign(): Promise<void> {
    if (!this.state?.blueprint) throw new Error("Estado no inicializado");
    this.setStep("design", "processing", 50);
    // Operación real: normalizar branding (colores hex, radio, fuentes built-in).
    const b = this.state.blueprint.branding;
    const hex = /^#([0-9a-f]{6})$/i;
    const safe = (v: string, fallback: string): string => (hex.test(v) ? v : fallback);
    this.state.blueprint.branding = {
      ...b,
      primaryColor: safe(b.primaryColor, "#1e3a8a"),
      secondaryColor: safe(b.secondaryColor, "#b45309"),
      backgroundColor: safe(b.backgroundColor, "#ffffff"),
      surfaceColor: safe(b.surfaceColor, "#f1f5f9"),
      textColor: safe(b.textColor, "#0f172a"),
      mutedColor: safe(b.mutedColor, "#64748b"),
      accentColor: safe(b.accentColor, "#b45309"),
      borderRadius: Math.max(0, Math.min(32, b.borderRadius)),
    };
    this.setStep("design", "completed", 100);
    this.setOverall(70);
    this.persist();
  }

  private async generateImages(): Promise<void> {
    if (!this.state?.blueprint) throw new Error("Estado no inicializado");
    if (this.state.imagesGenerated) {
      this.setStep("images", "completed", 100);
      return;
    }
    this.setStep("images", "processing", 10);
    // Operación real: análisis visual + portada + imágenes por oportunidad.
    const draft = this.buildProduct(null);
    const imgEngine = new ImageGenerationEngine();
    const opportunities = imgEngine.analyzeProduct(draft);
    let next = draft;
    const hasImages = draft.chapters.some((c) =>
      c.sections.some((s) => s.blocks.some((b) => b.type === "image"))
    );
    if (!hasImages) {
      next = imgEngine.insertImage(next, await imgEngine.generateCover(next));
    }
    let done = 0;
    for (const opp of opportunities) {
      next = imgEngine.insertImage(next, await imgEngine.generateForOpportunity(next, opp, 0));
      done += 1;
      this.setStep("images", "processing", Math.floor((done / Math.max(1, opportunities.length)) * 100));
    }
    this.state.chapters = next.chapters;
    this.state.imagesGenerated = true;
    this.setStep("images", "completed", 100);
    this.setOverall(74);
    this.persist();
  }

  private async validateContent(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    if (this.state.chapters.length === 0) throw new Error("No hay capítulos para validar");
    this.setStep("validate", "processing", 50);
    this.state.status = "VALIDATING";
    // Validación de contenido/diseño (export se verifica tras generar el PDF).
    const validation: PdfQualityValidation = await this.provider.validatePdfProduct(
      this.context(),
      { blueprint: this.state.blueprint, chapters: this.state.chapters, exportInfo: null }
    );
    const withoutExport = validation.issues.filter((i) => i.category !== "export");
    if (withoutExport.filter((i) => i.severity === "high").length > 0) {
      this.state.validation = validation;
      this.setStep("validate", "failed", 100);
      this.setOverall(78);
      this.persist();
      throw new Error(
        `Validación PDF no superada (${validation.totalScore}/100). ` +
          (withoutExport[0]?.description ?? "Revisar contenido generado.")
      );
    }
    this.state.validation = validation;
    this.setStep("validate", "completed", 100);
    this.setOverall(80);
    this.persist();
  }

  private async exportPdf(): Promise<PdfExportResult> {
    if (!this.state?.blueprint) throw new Error("Estado no inicializado");
    if (!this.exporter) throw new Error("Exportador PDF no configurado");
    this.setStep("export", "processing", 30);
    const product = this.buildProduct(null);
    const { pageCount, byteSize } = await this.exporter(product);
    if (pageCount <= 0 || byteSize <= 0) {
      throw new Error("La exportación produjo un PDF vacío");
    }
    const exportInfo: PdfExportResult = {
      generatedAt: new Date().toISOString(),
      pageCount,
      byteSize,
      fileName: `${slugify(product.metadata.title) || "ebook"}.pdf`,
    };
    this.state.exportInfo = exportInfo;
    this.setStep("export", "completed", 100);
    this.setOverall(92);
    this.persist();
    return exportInfo;
  }

  private async verifyExport(exportInfo: PdfExportResult): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    // Revalidación final incluyendo el check de exportación real.
    const validation = await this.provider.validatePdfProduct(
      this.context(),
      { blueprint: this.state.blueprint, chapters: this.state.chapters, exportInfo }
    );
    this.state.validation = validation;
    if (!validation.passed) {
      throw new Error(
        `Validación PDF final no superada (${validation.totalScore}/100). ` +
          (validation.issues[0]?.description ?? "Revisar producto.")
      );
    }
  }

  private complete(exportInfo: PdfExportResult): PdfProduct {
    if (!this.state?.blueprint || this.state.chapters.length === 0) {
      throw new Error("Estado no inicializado");
    }
    if (!this.state.validation?.passed) {
      throw new Error("El producto no pasó la validación y no puede marcarse como listo");
    }
    this.setStep("complete", "processing", 50);
    const product = this.buildProduct(exportInfo);
    product.status = "READY";
    product.editorialStatus = "Listo";
    this.state.result = product;
    this.state.status = "READY";
    this.setStep("complete", "completed", 100);
    this.setOverall(100);
    this.persist();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(this.lastProductKey, JSON.stringify(product));
      } catch {
        // no bloquea (los bytes del PDF no se guardan: se regeneran al exportar)
      }
    }
    return product;
  }

  private buildProduct(exportInfo: PdfExportResult | null): PdfProduct {
    if (!this.state?.blueprint) throw new Error("Falta el blueprint");
    const blueprint = this.state.blueprint;
    const totalSections = this.state.chapters.reduce((n, c) => n + c.sections.length, 0);
    const totalBlocks = this.state.chapters.reduce(
      (n, c) => n + c.sections.reduce((x, s) => x + s.blocks.length, 0),
      0
    );
    const totalWords = this.state.chapters
      .flatMap((c) => [c.title, c.introduction, ...c.sections.flatMap((s) => [s.title, ...s.blocks.map(blockWords)])])
      .join(" ")
      .split(/\s+/).filter((w) => w.length > 0).length;
    const fallbackPresentation = {
      welcome: `Bienvenido a ${blueprint.title}.`,
      whatYouLearn: blueprint.chapters.map((c) => c.title),
      whoFor: blueprint.targetAudience,
      howToUse: "Lee los capítulos en orden y completa un ejercicio por capítulo.",
    };
    return {
      id: this.state.id,
      kind: "pdf",
      version: 1,
      editorialStatus: "Generando",
      metadata: {
        title: blueprint.title,
        author: blueprint.cover.author,
        subject: blueprint.description,
        keywords: blueprint.title,
        creator: "Crow Market",
        createdAt: this.state.createdAt,
      },
      cover: blueprint.cover,
      branding: blueprint.branding,
      presentation: this.state.presentation ?? fallbackPresentation,
      chapters: this.state.chapters,
      stats: {
        totalChapters: this.state.chapters.length,
        totalSections,
        totalBlocks,
        totalWords,
        estimatedPages: Math.max(1, Math.ceil(totalWords / 450)),
      },
      exportInfo,
      status: "GENERATING",
    };
  }

  // ============================================
  // PROGRESO REAL + PERSISTENCIA
  // ============================================

  private setStep(
    id: PdfGenerationStepId,
    status: "processing" | "completed" | "failed",
    progress: number
  ): void {
    if (!this.state) return;
    const step = this.state.steps.find((s) => s.id === id);
    if (!step) return;
    step.status = status;
    step.progress = progress;
    this.state.currentStep = id;
    const now = new Date().toISOString();
    if (status === "processing" && !step.startTime) step.startTime = now;
    if (status !== "processing") step.endTime = now;
  }

  private failStep(id: PdfGenerationStepId): void {
    if (!this.state) return;
    const step = this.state.steps.find((s) => s.id === id);
    if (step && step.status !== "completed") {
      step.status = "failed";
      step.endTime = new Date().toISOString();
    }
  }

  private setOverall(percent: number): void {
    if (!this.state) return;
    this.state.overallProgress = percent;
    this.state.isComplete = percent >= 100;
  }

  private persist(): void {
    if (!this.state || typeof window === "undefined") return;
    try {
      this.state.updatedAt = new Date().toISOString();
      window.localStorage.setItem(this.stateKey, JSON.stringify(this.state));
    } catch (error) {
      console.error("Error guardando estado PDF:", error);
    }
  }

  getCurrentState(): PdfGenerationState | null {
    return this.state ? { ...this.state } : null;
  }

  /** Blueprint aprobado/editado por el usuario: se usa en lugar de generar uno nuevo. */
  applyEditedBlueprint(
    idea: string,
    blueprint: PdfBlueprint,
    specification: PdfGenerationContext["specification"]
  ): void {
    if (!this.state || this.state.originalIdea !== idea) {
      this.state = this.createInitialState(idea);
    }
    this.state.blueprint = blueprint;
    this.state.specification = specification;
    this.state.presentation = undefined;
    this.state.chapters = [];
    this.state.imagesGenerated = false;
    this.state.validation = undefined;
    this.state.exportInfo = undefined;
    this.state.result = undefined;
    this.state.status = "GENERATING";
    this.state.hasError = false;
    this.state.error = undefined;
    this.persist();
  }

  applyLocalProduct(product: PdfProduct): void {
    if (!this.state) return;
    this.state.chapters = product.chapters;
    if (product.branding) {
      if (this.state.blueprint) this.state.blueprint.branding = product.branding;
      if (this.state.blueprint) {
        this.state.blueprint.title = product.metadata.title;
        this.state.blueprint.cover = product.cover;
      }
    }
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  loadState(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(this.stateKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as PdfGenerationState;
      if (parsed.id && parsed.originalIdea && Array.isArray(parsed.chapters)) {
        this.state = parsed;
        return true;
      }
    } catch (error) {
      console.error("Error cargando estado PDF:", error);
    }
    return false;
  }

  cancel(): void {
    if (this.state) {
      this.state.status = "FAILED";
      this.state.error = "Generación cancelada por el usuario";
      this.state.hasError = true;
      this.persist();
    }
  }
}

function blockWords(b: PdfContentBlock): string {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight": return b.text;
    case "bulletList": case "numberedList": return b.items.join(" ");
    case "quote": return `${b.text} ${b.author}`;
    case "tip": case "warning": case "example": case "callout": return `${b.title} ${b.text}`;
    case "checklist": return `${b.title} ${b.items.join(" ")}`;
    case "table": return `${b.title} ${b.headers.join(" ")} ${b.rows.map((r) => r.join(" ")).join(" ")}`;
    case "divider": return "";
    case "image": return `${b.alt} ${b.caption}`;
    case "exercise": return `${b.title} ${b.text}`;
    case "reflection": return b.question;
    case "chapterSummary": return b.points.join(" ");
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "ebook";
}

export { PDF_STORAGE_KEY, PDF_PRODUCT_KEY };

/** Claves de storage para un namespace (pdf = flujo existente). */
export function keysForNamespace(namespace: string): { stateKey: string; productKey: string } {
  return { stateKey: storageKey(namespace), productKey: productKey(namespace) };
}

export const EBOOK_PRODUCT_KEY = "crow_last_ebook";
