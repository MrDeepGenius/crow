// ============================================
// INTERACTIVE WEB GENERATION ENGINE - CROW MARKET
// ============================================
// Motor específico del formato "interactive_web". Reutiliza el concepto del
// CourseGenerationEngine (etapas reales, persistencia, reanudación) sin
// modificarlo. Sin timers falsos: el progreso deriva de etapas completadas.

import { AIProvider, AIProviderFactory, AIProviderType } from "./AIProvider";
import {
  WebGenerationContext,
  WebGenerationState,
  WebGenerationStepId,
  InteractiveWebBlueprint,
  InteractiveWebSection,
  InteractiveWebProduct,
  WebQualityValidation,
} from "./interactiveWebTypes";
import { AI_CONFIG } from "@/app/config/ai";

const WEB_STORAGE_KEY = "crow_web_generation_state_v1";
const WEB_PRODUCT_KEY = "crow_last_web";

export class InteractiveWebGenerationEngine {
  private providerType: AIProviderType = AI_CONFIG.mode as AIProviderType;
  private provider: AIProvider | null = null;
  private state: WebGenerationState | null = null;

  async generateWeb(idea: string): Promise<InteractiveWebProduct> {
    const trimmed = idea.trim();
    if (!trimmed) throw new Error("La idea no puede estar vacía");

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as WebGenerationState;
          if (
            saved.originalIdea === trimmed &&
            saved.status !== "READY" &&
            saved.status !== "FAILED" &&
            Array.isArray(saved.sections)
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
      await this.generateSections();
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

  // ============================================
  // ETAPAS
  // ============================================

  private createInitialState(idea: string): WebGenerationState {
    const steps: WebGenerationState["steps"] = [
      { id: "analyze", name: "Analizando idea", description: "Detectando tema, audiencia y secciones", status: "pending", progress: 0 },
      { id: "blueprint", name: "Creando Blueprint", description: "Estructura de secciones y branding", status: "pending", progress: 0 },
      { id: "content", name: "Generando contenido", description: "Secciones y componentes funcionales", status: "pending", progress: 0 },
      { id: "validate", name: "Validando interacciones", description: "Estructura, contenido y funcionalidad", status: "pending", progress: 0 },
      { id: "complete", name: "Finalizando", description: "Producto guardado y listo", status: "pending", progress: 0 },
    ];
    return {
      id: `web-${Date.now()}`,
      originalIdea: idea,
      status: "GENERATING",
      steps,
      currentStep: "analyze",
      overallProgress: 0,
      isComplete: false,
      hasError: false,
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private context(): WebGenerationContext {
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
    const specification = await this.provider.analyzeWebIdea(this.state.originalIdea);
    this.state.specification = specification;
    this.setStep("analyze", "completed", 100);
    this.setOverall(15);
    this.persist();
  }

  private async createBlueprint(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.blueprint) return;
    this.setStep("blueprint", "processing", 10);
    const blueprint = await this.provider.generateWebBlueprint(this.context());
    this.state.blueprint = blueprint;
    this.setStep("blueprint", "completed", 100);
    this.setOverall(30);
    this.persist();
  }

  private sectionComplete(s: InteractiveWebSection | undefined, blueprint: InteractiveWebBlueprint, index: number): boolean {
    if (!s || s.id !== blueprint.sections[index].id) return false;
    if (s.components.length < 2) return false;
    return s.components.every((c) => {
      switch (c.type) {
        case "quiz": return c.questions.length >= 2;
        case "flashcards": return c.cards.length >= 3;
        case "tabs": return c.tabs.length >= 2;
        case "accordion": return c.items.length >= 2;
        case "vocabMatch": return c.pairs.length >= 3;
        case "checklist": return c.items.length >= 2;
        case "hero": return !!c.title.trim() && !!c.ctaTargetSectionId.trim();
        case "cta": return !!c.targetSectionId.trim();
        case "image": return !!c.src.trim();
        default: return true;
      }
    });
  }

  private async generateSections(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    const blueprint: InteractiveWebBlueprint = this.state.blueprint;
    const existing = [...this.state.sections];
    const allDone =
      existing.length === blueprint.sections.length &&
      existing.every((s, i) => this.sectionComplete(s, blueprint, i));
    if (allDone) {
      this.setStep("content", "completed", 100);
      return;
    }

    this.setStep("content", "processing", 0);
    for (let i = 0; i < blueprint.sections.length; i++) {
      if (!this.sectionComplete(existing[i], blueprint, i)) {
        this.state.currentStep = "content";
        const section = await this.provider.generateWebSection(this.context(), i);
        existing[i] = section;
        this.state.sections = [...existing];
        this.persist();
      }
      this.setStep("content", "processing", Math.floor(((i + 1) / blueprint.sections.length) * 100));
    }
    this.state.sections = [...existing];
    this.setStep("content", "completed", 100);
    this.setOverall(70);
    this.persist();
  }

  private async validate(): Promise<void> {
    if (!this.state || !this.provider || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    if (this.state.sections.length === 0) throw new Error("No hay secciones para validar");
    this.setStep("validate", "processing", 50);
    this.state.status = "VALIDATING";
    const validation: WebQualityValidation = await this.provider.validateWebProduct(
      this.context(),
      { blueprint: this.state.blueprint, sections: this.state.sections }
    );
    this.state.validation = validation;
    this.setStep("validate", validation.passed ? "completed" : "failed", 100);
    this.setOverall(90);
    this.persist();
    if (!validation.passed) {
      throw new Error(
        `Validación web no superada (score ${Math.round(validation.overallScore)}). ` +
          (validation.issues[0]?.description ?? "Revisar contenido generado.")
      );
    }
  }

  private complete(): InteractiveWebProduct {
    if (!this.state || !this.state.blueprint || this.state.sections.length === 0) {
      throw new Error("Estado no inicializado");
    }
    if (!this.state.validation?.passed) {
      throw new Error("La web no pasó la validación y no puede marcarse como lista");
    }
    this.setStep("complete", "processing", 50);
    const blueprint = this.state.blueprint;
    const interactive: ReadonlySet<string> = new Set([
      "quiz", "flashcards", "tabs", "accordion", "vocabMatch", "checklist",
    ]);
    const totalComponents = this.state.sections.reduce((n, s) => n + s.components.length, 0);
    const totalInteractive = this.state.sections.reduce(
      (n, s) => n + s.components.filter((c) => interactive.has(c.type)).length,
      0
    );
    const product: InteractiveWebProduct = {
      id: this.state.id,
      kind: "interactive_web",
      metadata: {
        title: blueprint.title,
        description: blueprint.description,
        author: "Crow Market",
        level: blueprint.level,
        language: blueprint.language,
        category: this.state.specification?.topic ?? "General",
        tags: this.state.specification ? [this.state.specification.topic] : [],
        createdAt: this.state.createdAt,
      },
      branding: blueprint.branding,
      sections: this.state.sections,
      stats: {
        totalSections: this.state.sections.length,
        totalComponents,
        totalInteractive,
      },
      status: "READY",
    };
    this.state.result = product;
    this.state.status = "READY";
    this.setStep("complete", "completed", 100);
    this.setOverall(100);
    this.persist();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WEB_PRODUCT_KEY, JSON.stringify(product));
      } catch {
        // no bloquea
      }
    }
    return product;
  }

  // ============================================
  // PROGRESO REAL + PERSISTENCIA
  // ============================================

  private setStep(id: WebGenerationStepId, status: "processing" | "completed" | "failed", progress: number): void {
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

  private failStep(id: WebGenerationStepId): void {
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
      window.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error("Error guardando estado web:", error);
    }
  }

  getCurrentState(): WebGenerationState | null {
    return this.state ? { ...this.state } : null;
  }

  /** Editor básico: reemplaza secciones (p. ej. tras editar) y persiste. */
  applyLocalSections(sections: InteractiveWebSection[]): void {
    if (!this.state) return;
    this.state.sections = sections;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  /** Editor básico: actualiza branding del blueprint y persiste. */
  applyLocalBranding(branding: InteractiveWebBlueprint["branding"]): void {
    if (!this.state?.blueprint) return;
    this.state.blueprint.branding = branding;
    this.state.updatedAt = new Date().toISOString();
    this.persist();
  }

  saveState(): void {
    this.persist();
  }

  loadState(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(WEB_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as WebGenerationState;
      if (parsed.id && parsed.originalIdea && Array.isArray(parsed.sections)) {
        this.state = parsed;
        return true;
      }
    } catch (error) {
      console.error("Error cargando estado web:", error);
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

export { WEB_STORAGE_KEY, WEB_PRODUCT_KEY };
