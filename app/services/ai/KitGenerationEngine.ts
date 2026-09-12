// ============================================
// RESOURCE KIT GENERATION ENGINE - CROW MARKET
// ============================================
// Motor del formato "kit". Etapas reales, persistencia, reanudación.
// No toca PDF, Ebook, cursos ni web.

import { AIProvider, AIProviderFactory, AIProviderType } from "./AIProvider";
import {
  KitGenerationContext,
  KitGenerationState,
  KitGenerationStepId,
  KitBlueprint,
  KitResource,
  KitProduct,
  KitQualityValidation,
  KitReadme,
} from "./kitTypes";
import type { PdfContentBlock } from "./pdfTypes";
import { AI_CONFIG } from "@/app/config/ai";

const KIT_STORAGE_KEY = "crow_kit_generation_state_v1";
const KIT_PRODUCT_KEY = "crow_last_kit";

export class KitGenerationEngine {
  private providerType: AIProviderType = AI_CONFIG.mode as AIProviderType;
  private provider: AIProvider | null = null;
  private state: KitGenerationState | null = null;

  async generateKit(idea: string): Promise<KitProduct> {
    const trimmed = idea.trim();
    if (!trimmed) throw new Error("La idea no puede estar vacía");

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(KIT_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as KitGenerationState;
          if (
            saved.originalIdea === trimmed &&
            saved.status !== "LISTO" &&
            saved.status !== "FAILED" &&
            Array.isArray(saved.resources)
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
      await this.generateResources();
      await this.applyDesign();
      await this.validate();
      return this.complete();
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

  private createInitialState(idea: string): KitGenerationState {
    const steps: KitGenerationState["steps"] = [
      { id: "analyze", name: "Analizando idea", description: "Público, problema y recursos necesarios", status: "pending", progress: 0 },
      { id: "blueprint", name: "Creando Blueprint", description: "Carpetas, recursos y formatos", status: "pending", progress: 0 },
      { id: "resources", name: "Generando recursos", description: "Contenido real por recurso", status: "pending", progress: 0 },
      { id: "design", name: "Aplicando identidad", description: "Colores y coherencia visual", status: "pending", progress: 0 },
      { id: "validate", name: "Validando", description: "Contenido, organización y formatos", status: "pending", progress: 0 },
      { id: "complete", name: "Finalizando", description: "Kit guardado y listo", status: "pending", progress: 0 },
    ];
    return {
      id: `kit-${Date.now()}`,
      originalIdea: idea,
      status: "GENERANDO",
      steps,
      currentStep: "analyze",
      overallProgress: 0,
      isComplete: false,
      hasError: false,
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private context(): KitGenerationContext {
    if (!this.state?.specification) throw new Error("Falta el análisis de la idea");
    return { originalIdea: this.state.originalIdea, specification: this.state.specification, blueprint: this.state.blueprint };
  }

  private async analyze(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.specification) return;
    this.setStep("analyze", "processing", 25);
    this.state.specification = await this.provider.analyzeKitIdea(this.state.originalIdea);
    this.setStep("analyze", "completed", 100);
    this.setOverall(12);
    this.persist();
  }

  private async createBlueprint(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.blueprint) return;
    this.setStep("blueprint", "processing", 10);
    this.state.blueprint = await this.provider.generateKitBlueprint(this.context());
    this.setStep("blueprint", "completed", 100);
    this.setOverall(25);
    this.persist();
  }

  private resourceComplete(r: KitResource | undefined, blueprint: KitBlueprint, index: number): boolean {
    if (!r || r.id !== blueprint.resources[index].id) return false;
    if (r.title.trim().length === 0 || r.blocks.length < 2 || r.status !== "ready") return false;
    return r.blocks.map((b) => blockWords(b)).join(" ").split(/\s+/).filter((w) => w.length > 0).length >= 40;
  }

  private async generateResources(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) throw new Error("Estado no inicializado");
    const blueprint: KitBlueprint = this.state.blueprint;
    const existing = [...this.state.resources];
    const allDone =
      existing.length === blueprint.resources.length &&
      existing.every((r, i) => this.resourceComplete(r, blueprint, i));
    if (allDone) {
      this.setStep("resources", "completed", 100);
      return;
    }
    this.setStep("resources", "processing", 0);
    for (let i = 0; i < blueprint.resources.length; i++) {
      if (!this.resourceComplete(existing[i], blueprint, i)) {
        this.state.currentStep = "resources";
        existing[i] = await this.provider.generateKitResource(this.context(), i);
        this.state.resources = [...existing];
        this.persist();
      }
      this.setStep("resources", "processing", Math.floor(((i + 1) / blueprint.resources.length) * 100));
    }
    this.state.resources = [...existing];
    this.setStep("resources", "completed", 100);
    this.setOverall(65);
    this.persist();
  }

  private async applyDesign(): Promise<void> {
    if (!this.state?.blueprint) throw new Error("Estado no inicializado");
    this.setStep("design", "processing", 50);
    // Operación real: normalizar identidad visual del kit.
    const b = this.state.blueprint.branding;
    const hex = /^#([0-9a-f]{6})$/i;
    const safe = (v: string, fallback: string): string => (hex.test(v) ? v : fallback);
    this.state.blueprint.branding = {
      ...b,
      primaryColor: safe(b.primaryColor, "#7c3aed"),
      secondaryColor: safe(b.secondaryColor, "#a855f7"),
      backgroundColor: safe(b.backgroundColor, "#ffffff"),
      surfaceColor: safe(b.surfaceColor, "#f5f0ff"),
      textColor: safe(b.textColor, "#18181b"),
      mutedColor: safe(b.mutedColor, "#71717a"),
      accentColor: safe(b.accentColor, "#06b6d4"),
    };
    this.setStep("design", "completed", 100);
    this.setOverall(75);
    this.persist();
  }

  private async validate(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) throw new Error("Estado no inicializado");
    if (this.state.resources.length === 0) throw new Error("No hay recursos para validar");
    this.setStep("validate", "processing", 50);
    this.state.status = "EN REVISIÓN";
    const validation: KitQualityValidation = await this.provider.validateKitProduct(
      this.context(),
      { blueprint: this.state.blueprint, resources: this.state.resources }
    );
    this.state.validation = validation;
    this.setStep("validate", validation.passed ? "completed" : "failed", 100);
    this.setOverall(90);
    this.persist();
    if (!validation.passed) {
      throw new Error(
        `Validación del kit no superada (${validation.totalScore}/100). ` +
          (validation.issues[0]?.description ?? "Revisar recursos.")
      );
    }
  }

  private complete(): KitProduct {
    if (!this.state?.blueprint || this.state.resources.length === 0) throw new Error("Estado no inicializado");
    if (!this.state.validation?.passed) throw new Error("El kit no pasó la validación");
    this.setStep("complete", "processing", 50);
    const blueprint = this.state.blueprint;
    const words = this.state.resources
      .flatMap((r) => [r.title, ...r.blocks.map((b) => blockWords(b))])
      .join(" ")
      .split(/\s+/).filter((w) => w.length > 0).length;
    const formats = [...new Set(this.state.resources.flatMap((r) => r.formats))];
    const product: KitProduct = {
      id: this.state.id,
      kind: "kit",
      version: 1,
      name: blueprint.name,
      subtitle: blueprint.subtitle,
      author: "Crow Market",
      description: `${blueprint.promise} Incluye ${this.state.resources.length} recursos organizados en ${blueprint.folders.length} carpetas.`,
      category: this.state.specification?.topic ?? "General",
      folders: blueprint.folders,
      resources: this.state.resources,
      branding: blueprint.branding,
      readme: buildReadme(blueprint, this.state.resources),
      coverImageId: null,
      stats: { totalResources: this.state.resources.length, totalFolders: blueprint.folders.length, totalWords: words, formats },
      status: "LISTO",
      createdAt: this.state.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.state.result = product;
    this.state.status = "LISTO";
    this.setStep("complete", "completed", 100);
    this.setOverall(100);
    this.persist();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(KIT_PRODUCT_KEY, JSON.stringify(product));
      } catch {
        // no bloquea
      }
    }
    return product;
  }

  private setStep(id: KitGenerationStepId, status: "processing" | "completed" | "failed", progress: number): void {
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

  private failStep(id: KitGenerationStepId): void {
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
      window.localStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error("Error guardando estado del kit:", error);
    }
  }

  getCurrentState(): KitGenerationState | null {
    return this.state ? { ...this.state } : null;
  }

  applyEditedBlueprint(idea: string, blueprint: KitBlueprint): void {
    if (!this.state || this.state.originalIdea !== idea) {
      this.state = this.createInitialState(idea);
    }
    this.state.blueprint = blueprint;
    this.state.resources = [];
    this.state.validation = undefined;
    this.state.result = undefined;
    this.state.status = "GENERANDO";
    this.state.hasError = false;
    this.state.error = undefined;
    this.persist();
  }

  applyLocalResources(resources: KitResource[]): void {
    if (!this.state) return;
    this.state.resources = resources;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  loadState(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(KIT_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as KitGenerationState;
      if (parsed.id && parsed.originalIdea && Array.isArray(parsed.resources)) {
        this.state = parsed;
        return true;
      }
    } catch (error) {
      console.error("Error cargando estado del kit:", error);
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
    case "tip": case "warning": case "example": case "callout": case "exercise": return `${b.title} ${b.text}`;
    case "checklist": return `${b.title} ${b.items.join(" ")}`;
    case "table": return `${b.title} ${b.headers.join(" ")} ${b.rows.map((r) => r.join(" ")).join(" ")}`;
    case "image": return `${b.alt} ${b.caption}`;
    case "reflection": return b.question;
    case "chapterSummary": return b.points.join(" ");
    case "divider": return "";
  }
}

function buildReadme(blueprint: KitBlueprint, resources: KitResource[]): KitReadme {
  const byFolder = (folderId: string): string[] =>
    resources.filter((r) => r.folderId === folderId).map((r) => r.title);
  return {
    whatItContains: blueprint.folders.flatMap((f) => byFolder(f.id).map((t) => `${f.name}: ${t}`)),
    whoFor: blueprint.audience,
    howToUse: "Empieza por la GUÍA DE INICIO y sigue el orden de carpetas: primero guías, luego checklists y plantillas, después prompts, y cierra con el workbook.",
    recommendedOrder: resources.map((r) => r.title),
    firstResource: resources[0]?.title ?? "",
    tips: [
      "Completa un recurso por día en orden de carpetas.",
      "Adapta cada plantilla con datos reales de tu negocio antes de usarla.",
      "Repite el workbook cada 30 días para medir tu avance.",
    ],
  };
}

export { KIT_STORAGE_KEY, KIT_PRODUCT_KEY };
