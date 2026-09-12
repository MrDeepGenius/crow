// ============================================
// COURSE GENERATION ENGINE - CROW COURSE STUDIO
// ============================================

import { AIProvider, AIProviderFactory, AIProviderType } from "./AIProvider";
import {
  GenerationContext,
  GenerationProgress,
  GenerationState,
  CourseBlueprint,
  GeneratedModule,
  GeneratedExam,
  GeneratedCertificate,
  QualityValidation,
  GeneratedCourse,
  GeneratedLesson
} from "./types";

// Exportar para uso externo
export type { GenerationProgress, GeneratedCourse };

import { AI_CONFIG } from "@/app/config/ai";

// ============================================
// COURSE GENERATION ENGINE
// ============================================

const ENGINE_STORAGE_KEY = "crow_generation_state_v1";

export class CourseGenerationEngine {
  private providerType: AIProviderType = AI_CONFIG.mode as AIProviderType;
  private provider: AIProvider | null = null;
  private state: GenerationState | null = null;

  // ============================================
  // CONSTRUCCIÓN DE CURSO COMPLETO (FLUJO ÚNICO REAL)
  // ============================================
  // FASE 1: único flujo principal. El progreso solo avanza
  // después de que cada etapa guarda su resultado real.
  // FASE 2: persistencia por etapa + reanudación sin duplicar.

  async generateCourse(idea: string): Promise<GeneratedCourse> {
    const trimmed = idea.trim();
    if (!trimmed) throw new Error("La idea no puede estar vacía");

    // Reanudar si ya existe un estado compatible guardado (misma idea)
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ENGINE_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as GenerationState;
          if (
            saved.originalIdea === trimmed &&
            saved.status !== "completed" &&
            saved.status !== "failed" &&
            saved.progress &&
            Array.isArray(saved.generatedModules)
          ) {
            this.state = saved;
          }
        }
      } catch {
        // ignorar estado corrupto y empezar de cero
      }
    }

    if (!this.state || this.state.originalIdea !== trimmed) {
      this.state = this.createInitialState(trimmed);
      this.persist();
    }

    try {
      // 1. Crear provider (Mock por defecto, sin APIs externas)
      this.provider = await AIProviderFactory.create(this.providerType);

      // 2-8. Avanzar solo por etapas incompletas (reanuda, no duplica)
      if (!this.state.context) await this.analyzeIdea();
      if (!this.state.blueprint) await this.generateBlueprint();
      await this.generateModules();
      if (!this.state.finalExam) await this.generateFinalExam();
      if (!this.state.certificate) await this.generateCertificate();
      await this.validateCourse();

      // REGLA ABSOLUTA: solo completar si existe contenido real y pasa validación
      return this.completeCourse();
    } catch (error) {
      if (this.state) {
        this.state.status = "failed";
        this.state.error = error instanceof Error ? error.message : "Error desconocido";
        this.state.progress.hasError = true;
        this.persist();
      }
      throw error;
    }
  }

  // ============================================
  // FLUJO PASO A PASO
  // ============================================

  private createInitialState(idea: string): GenerationState {
    const steps = [
      { id: "analyze", name: "Analizando idea", description: "Comprendiendo el concepto y necesidades", status: "pending" as const, progress: 0 },
      { id: "blueprint", name: "Diseñando curso", description: "Creando estructura pedagógica", status: "pending" as const, progress: 0 },
      { id: "modules", name: "Generando módulos", description: "Creando contenido modular", status: "pending" as const, progress: 0 },
      { id: "exam", name: "Creando examen", description: "Diseñando evaluación final", status: "pending" as const, progress: 0 },
      { id: "certificate", name: "Preparando certificado", description: "Diseñando certificado", status: "pending" as const, progress: 0 },
      { id: "validation", name: "Validando calidad", description: "Asegurando excelencia", status: "pending" as const, progress: 0 },
      { id: "complete", name: "Finalizando", description: "Preparando entrega", status: "pending" as const, progress: 0 }
    ];

    const uid =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : String(Date.now()).slice(-8);
    return {
      id: `gen-${Date.now()}-${uid}`,
      originalIdea: idea,
      status: "analyzing",
      progress: {
        currentStep: "analyze",
        steps,
        overallProgress: 0,
        isComplete: false,
        hasError: false
      },
      generatedModules: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private persist(): void {
    if (!this.state || typeof window === "undefined") return;
    try {
      this.state.updatedAt = new Date().toISOString();
      window.localStorage.setItem(ENGINE_STORAGE_KEY, JSON.stringify(this.state));
      // Compatibilidad con clave anterior usada por MockAIEngine
      window.localStorage.setItem("courseGenerationState", JSON.stringify(this.state));
    } catch (error) {
      console.error("Error guardando estado:", error);
    }
  }

  private isLessonComplete(
    lesson: { content?: { explanation?: string; introduction?: string } | null; activity?: unknown; quiz?: unknown } | null | undefined
  ): boolean {
    if (!lesson || !lesson.content) return false;
    const hasIntro = (lesson.content.introduction ?? "").trim().length >= 20;
    const hasExplanation = (lesson.content.explanation ?? "").trim().length >= 100;
    return hasIntro && hasExplanation && !!lesson.activity && !!lesson.quiz;
  }

  private async analyzeIdea(): Promise<void> {
    if (!this.state || !this.provider) throw new Error("Estado no inicializado");
    if (this.state.context) return; // reanudar: no duplicar

    this.updateStepStatus("analyze", "processing", 25);

    // Análisis real de la idea (MockAIProvider en modo desarrollo)
    const productSpec = await this.provider.analyzeIdea(this.state.originalIdea);

    // La idea original se conserva y se usa en todo el proceso
    this.state.context = {
      originalIdea: this.state.originalIdea,
      productSpecification: productSpec,
      learningObjectives: productSpec.subtopics,
      audience: productSpec.audience,
      level: productSpec.level.includes("principiante") ? "beginner" :
             productSpec.level.includes("intermedio") ? "intermediate" : "advanced",
      language: "español",
      tone: "professional"
    };

    this.updateStepStatus("analyze", "completed", 100);
    this.updateOverallProgress(15);
    this.persist();
  }

  private async generateBlueprint(): Promise<void> {
    if (!this.state || !this.provider || !this.state.context) throw new Error("Estado no inicializado");
    if (this.state.blueprint) {
      this.state.context.courseBlueprint = this.state.blueprint;
      return; // reanudar: no duplicar
    }

    this.updateStepStatus("blueprint", "processing", 10);
    this.state.status = "blueprint";

    // Blueprint específico derivado de la idea (no hardcodeado)
    const blueprint = await this.provider.generateBlueprint(this.state.context);
    this.state.blueprint = blueprint;
    this.state.context.courseBlueprint = blueprint;

    this.updateStepStatus("blueprint", "completed", 100);
    this.updateOverallProgress(30);
    this.persist();
  }

  private async generateModules(): Promise<void> {
    if (!this.state || !this.provider || !this.state.context || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }

    // Si todos los módulos ya existen con contenido completo, no regenerar
    const totalModules = this.state.blueprint.modules.length;
    const existing = this.state.generatedModules ?? [];
    const allDone =
      existing.length === totalModules &&
      existing.every(
        (m) =>
          Array.isArray(m.lessons) &&
          m.lessons.length > 0 &&
          m.lessons.every((l) => this.isLessonComplete(l))
      );
    if (allDone) {
      this.updateStepStatus("modules", "completed", 100);
      return;
    }

    this.updateStepStatus("modules", "processing", 0);
    this.state.status = "modules";

    const modules: GeneratedModule[] = [...existing];

    // FASE 5: todo lo generado se adjunta realmente al producto.
    for (let i = 0; i < totalModules; i++) {
      this.state.currentModule = i;
      const moduleProgress = Math.floor((i / totalModules) * 100);
      this.updateStepStatus("modules", "processing", moduleProgress);

      const blueprintModule = this.state.blueprint.modules[i];
      let module = modules[i];

      // Reutilizar módulo existente si ya está completo
      const moduleComplete =
        module &&
        Array.isArray(module.lessons) &&
        module.lessons.length === blueprintModule.lessons.length &&
        module.lessons.every((l) => this.isLessonComplete(l)) &&
        !!module.quiz;

      if (!moduleComplete) {
        // Generar base del módulo (lecciones con contenido)
        const fresh = await this.provider.generateModule(this.state.context, i);
        module = fresh;

        // Adjuntar actividad + quiz + video a cada lección según blueprint
        for (let j = 0; j < module.lessons.length; j++) {
          this.state.currentLesson = j;
          const lessonBlueprint = blueprintModule.lessons[j];
          const lesson = module.lessons[j];

          if (lessonBlueprint?.hasActivity && !lesson.activity) {
            lesson.activity = await this.provider.generateActivity(
              this.state.context,
              lesson.title,
              lesson.content.explanation
            );
          }
          // Quiz por lección si corresponde, o al menos en la última del módulo
          const needsQuiz =
            lessonBlueprint?.hasQuiz || j === module.lessons.length - 1;
          if (needsQuiz && !lesson.quiz) {
            lesson.quiz = await this.provider.generateQuiz(
              this.state.context,
              module.title,
              module.lessons.map((l: GeneratedLesson) => l.title)
            );
          }
          if (lessonBlueprint?.hasVideo && !lesson.video) {
            lesson.video = await this.provider.generateVideoScript(
              this.state.context,
              lesson.title,
              lesson.content.explanation
            );
          }
          this.persist();
        }

        // Quiz de módulo si el blueprint lo pide
        if (blueprintModule.quiz && !module.quiz) {
          module.quiz = await this.provider.generateQuiz(
            this.state.context,
            module.title,
            module.lessons.map((l: GeneratedLesson) => l.title)
          );
        }

        modules[i] = module;
        this.state.generatedModules = [...modules];
        this.persist();
      }
    }

    this.state.generatedModules = [...modules];
    this.updateStepStatus("modules", "completed", 100);
    this.updateOverallProgress(70);
    this.persist();
  }

  private async generateFinalExam(): Promise<void> {
    if (!this.state || !this.provider || !this.state.context || !this.state.generatedModules.length) {
      throw new Error("Estado no inicializado");
    }
    // FASE 6: el examen existe realmente dentro del producto. Reanudar si ya existe.
    if (
      this.state.finalExam &&
      Array.isArray(this.state.finalExam.questions) &&
      this.state.finalExam.questions.length > 0
    ) {
      return;
    }

    this.updateStepStatus("exam", "processing", 50);
    this.state.status = "content";

    const exam = await this.provider.generateFinalExam(
      this.state.context,
      this.state.generatedModules
    );

    this.state.finalExam = exam;

    this.updateStepStatus("exam", "completed", 100);
    this.updateOverallProgress(85);
    this.persist();
  }

  private async generateCertificate(): Promise<void> {
    if (!this.state || !this.provider || !this.state.context) {
      throw new Error("Estado no inicializado");
    }
    // FASE 7: certificado opcional. Si ya existe, no regenerar.
    if (this.state.certificate) return;

    this.updateStepStatus("certificate", "processing", 50);

    const certificate = await this.provider.generateCertificate(this.state.context);
    this.state.certificate = certificate;

    this.updateStepStatus("certificate", "completed", 100);
    this.updateOverallProgress(92);
    this.persist();
  }

  private async validateCourse(): Promise<void> {
    if (!this.state || !this.provider || !this.state.context || !this.state.blueprint) {
      throw new Error("Estado no inicializado");
    }
    if (!this.state.finalExam) {
      throw new Error("No se puede validar: falta el examen final");
    }

    this.updateStepStatus("validation", "processing", 50);
    this.state.status = "validation";

    // FASE 9: validación determinística del provider (sin Math.random)
    const validation = await this.provider.validateCourse(this.state.context, {
      blueprint: this.state.blueprint,
      modules: this.state.generatedModules,
      exam: this.state.finalExam
    });

    this.state.validation = validation;

    this.updateStepStatus("validation", validation.passed ? "completed" : "failed", 100);
    this.updateOverallProgress(98);
    this.persist();

    if (!validation.passed) {
      throw new Error(
        `Validación de calidad no superada (score ${Math.round(validation.overallScore)}). ` +
          (validation.issues[0]?.description ?? "Revisar contenido generado.")
      );
    }
  }

  private completeCourse(): GeneratedCourse {
    if (!this.state || !this.state.blueprint || !this.state.generatedModules.length) {
      throw new Error("Estado no inicializado");
    }
    if (!this.state.finalExam || !this.state.certificate) {
      throw new Error("No se puede completar: faltan examen o certificado");
    }
    // REGLA ABSOLUTA: no marcar terminado sin validación aprobada
    if (!this.state.validation || !this.state.validation.passed) {
      throw new Error("No se puede completar: el curso no pasó la validación de calidad");
    }

    this.updateStepStatus("complete", "processing", 50);

    // Estadísticas reales derivadas del contenido existente
    const totalLessons = this.state.generatedModules.reduce(
      (sum: number, mod: GeneratedModule) => sum + mod.lessons.length,
      0
    );

    const totalDuration = this.state.generatedModules.reduce(
      (sum: number, mod: GeneratedModule) => sum + mod.estimatedHours,
      0
    );

    const totalActivities = this.state.generatedModules.reduce(
      (sum: number, mod: GeneratedModule) =>
        sum + mod.lessons.filter((l: GeneratedLesson) => !!l.activity).length,
      0
    );

    const totalQuizzes =
      this.state.generatedModules.reduce(
        (sum: number, mod: GeneratedModule) =>
          sum + mod.lessons.filter((l: GeneratedLesson) => !!l.quiz).length,
        0
      ) + this.state.generatedModules.filter((m: GeneratedModule) => m.quiz).length;

    if (totalLessons === 0) {
      throw new Error("No se puede completar: el curso no tiene lecciones reales");
    }

    // Crear curso completo
    const course: GeneratedCourse = {
      id: this.state.id,
      metadata: {
        title: this.state.blueprint.title,
        description: this.state.blueprint.description,
        author: "Crow AI Course Generator",
        level: this.state.context?.level || "beginner",
        language: this.state.context?.language || "español",
        category: this.state.context?.productSpecification.topic || "General",
        tags: this.state.context?.productSpecification.subtopics || [],
        createdAt: this.state.createdAt
      },
      modules: this.state.generatedModules,
      finalExam: this.state.finalExam,
      certificate: this.state.certificate,
      stats: {
        totalLessons,
        totalDuration,
        totalActivities,
        totalQuizzes
      }
    };

    this.state.result = course;
    this.state.status = "completed";
    this.updateStepStatus("complete", "completed", 100);
    this.updateOverallProgress(100);
    this.persist();

    return course;
  }

  // ============================================
  // CONTROL DE PROGRESO
  // ============================================

  private updateStepStatus(stepId: string, status: "pending" | "processing" | "completed" | "failed", progress: number): void {
    if (!this.state) return;
    
    const step = this.state.progress.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.progress = progress;
      
      if (status === "processing" || status === "completed" || status === "failed") {
        this.state.progress.currentStep = stepId;
      }
      
      if (status === "processing") {
        step.startTime = step.startTime || new Date().toISOString();
      }
      
      if (status === "completed" || status === "failed") {
        step.endTime = new Date().toISOString();
      }
    }
    
    this.state.updatedAt = new Date().toISOString();
  }

  private updateOverallProgress(percent: number): void {
    if (!this.state) return;
    
    this.state.progress.overallProgress = percent;
    this.state.progress.isComplete = percent >= 100;
    
    // Calcular tiempo estimado restante (simple estimación)
    if (percent > 0 && percent < 100) {
      const elapsedMs = new Date().getTime() - new Date(this.state.createdAt).getTime();
      const estimatedTotalMs = (elapsedMs / percent) * 100;
      const remainingMs = estimatedTotalMs - elapsedMs;
      this.state.progress.estimatedTimeRemaining = Math.ceil(remainingMs / 1000);
    }
    
    this.state.updatedAt = new Date().toISOString();
  }

  // ============================================
  // PERSISTENCIA Y RECUPERACIÓN
  // ============================================

  getCurrentState(): GenerationState | null {
    return this.state ? { ...this.state } : null;
  }

  saveStateToStorage(key: string = ENGINE_STORAGE_KEY): void {
    if (!this.state) return;
    if (typeof window === "undefined") return;
    try {
      this.state.updatedAt = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(this.state));
      if (key !== "courseGenerationState") {
        localStorage.setItem("courseGenerationState", JSON.stringify(this.state));
      }
    } catch (error) {
      console.error("Error guardando estado:", error);
    }
  }

  loadStateFromStorage(key: string = ENGINE_STORAGE_KEY): boolean {
    if (typeof window === "undefined") return false;

    try {
      const saved =
        localStorage.getItem(key) ?? localStorage.getItem("courseGenerationState");
      if (saved) {
        const parsed = JSON.parse(saved) as GenerationState;

        // Validar estado básico + errores guardados
        if (parsed.id && parsed.originalIdea && parsed.progress) {
          this.state = parsed;
          // No auto-continuar aquí: el llamador decide (evita loops en React).
          return true;
        }
      }
    } catch (error) {
      console.error("Error cargando estado:", error);
    }

    return false;
  }

  async continueGeneration(): Promise<GeneratedCourse> {
    if (!this.state) throw new Error("No hay estado para continuar");

    this.provider = await AIProviderFactory.create(this.providerType);

    try {
      // Reanudar por etapa incompleta, sin duplicar lo ya guardado
      if (!this.state.context) await this.analyzeIdea();
      if (!this.state.blueprint) await this.generateBlueprint();
      await this.generateModules();
      if (!this.state.finalExam) await this.generateFinalExam();
      if (!this.state.certificate) await this.generateCertificate();
      await this.validateCourse();
      return this.completeCourse();
    } catch (error) {
      if (this.state) {
        this.state.status = "failed";
        this.state.error = error instanceof Error ? error.message : "Error desconocido";
        this.state.progress.hasError = true;
        this.persist();
      }
      console.error("Error continuando generación:", error);
      throw error;
    }
  }

  // ============================================
  // CONTROL DE GENERACIÓN
  // ============================================

  pauseGeneration(): void {
    this.persist();
  }

  resumeGeneration(): Promise<GeneratedCourse> {
    return this.continueGeneration();
  }

  cancelGeneration(): void {
    if (this.state) {
      this.state.status = "failed";
      this.state.error = "Generación cancelada por el usuario";
      this.state.progress.hasError = true;
      this.persist();
    }
  }

  // ============================================
  // ESTADÍSTICAS Y REPORTES
  // ============================================

  getGenerationStats(): {
    totalTime: number;
    stepsCompleted: number;
    totalSteps: number;
    successRate: number;
  } | null {
    if (!this.state?.progress) return null;
    
    const completedSteps = this.state.progress.steps.filter(s => s.status === "completed").length;
    const totalSteps = this.state.progress.steps.length;
    
    return {
      totalTime: this.getTotalGenerationTime(),
      stepsCompleted: completedSteps,
      totalSteps,
      successRate: (completedSteps / totalSteps) * 100
    };
  }

  private getTotalGenerationTime(): number {
    if (!this.state || !this.state.progress) return 0;
    
    const start = new Date(this.state.createdAt);
    const end = this.state.progress.isComplete ? 
      new Date(this.state.updatedAt) : new Date();
    
    return Math.floor((end.getTime() - start.getTime()) / 1000); // segundos
  }
}