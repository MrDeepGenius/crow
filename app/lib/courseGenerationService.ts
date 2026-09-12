// ============================================
// COURSE GENERATION SERVICE
// ============================================
// Servicio que orquesta el flujo de análisis, blueprint y generación de contenido

import { Blueprint } from "@/app/types";
import { ProfessionalCourse } from "@/app/types/course";
import { analyzeCourseIdea, CourseAnalysis } from "./courseAnalyzer";
import { generateCourseBlueprintFromAnalysis } from "./courseBlueprintGenerator";
import { generateContextualCourse } from "./contentGenerator";

export interface CourseGenerationStep {
  step: string;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  message: string;
}

export interface CourseGenerationResult {
  analysis: CourseAnalysis;
  blueprint: Blueprint;
  course: ProfessionalCourse;
  steps: CourseGenerationStep[];
  totalTime: number; // ms
}

/**
 * Servicio completo de generación de cursos con seguimiento de progreso
 */
export class CourseGenerationService {
  private steps: CourseGenerationStep[] = [];
  private startTime: number = 0;

  constructor() {
    this.initializeSteps();
  }

  private initializeSteps() {
    this.steps = [
      {
        step: "analyzing",
        status: "pending",
        progress: 0,
        message: "Analizando la idea del curso...",
      },
      {
        step: "structure",
        status: "pending",
        progress: 0,
        message: "Creando estructura del curso...",
      },
      {
        step: "content",
        status: "pending",
        progress: 0,
        message: "Generando contenido contextual...",
      },
      {
        step: "resources",
        status: "pending",
        progress: 0,
        message: "Preparando recursos...",
      },
      {
        step: "building",
        status: "pending",
        progress: 0,
        message: "Finalizando construcción...",
      },
    ];
  }

  /**
   * Genera un curso completo a partir de una idea
   */
  async generateCourse(
    idea: string,
    title: string
  ): Promise<CourseGenerationResult> {
    this.startTime = Date.now();
    this.initializeSteps();

    try {
      // Paso 1: Análisis
      const analysis = await this.stepAnalyze(idea);

      // Paso 2: Crear Blueprint
      const blueprint = await this.stepCreateBlueprint(idea, analysis, title);

      // Paso 3: Generar Contenido
      const course = await this.stepGenerateContent(blueprint);

      // Paso 4: Preparar Recursos
      await this.stepPrepareResources(course);

      // Paso 5: Finalizar
      await this.stepFinalize(course);

      const totalTime = Date.now() - this.startTime;

      return {
        analysis,
        blueprint,
        course,
        steps: this.steps,
        totalTime,
      };
    } catch (error) {
      this.updateStep("error", "error", 0, `Error: ${error}`);
      throw error;
    }
  }

  /**
   * Paso 1: Analizar idea
   */
  private async stepAnalyze(idea: string): Promise<CourseAnalysis> {
    this.updateStep("analyzing", "processing", 25, "Analizando concepto...");

    // Simular análisis (en producción sería una llamada a IA)
    await this.simulateDelay(800);

    const analysis = analyzeCourseIdea(idea);

    this.updateStep(
      "analyzing",
      "completed",
      100,
      `Análisis completado: ${analysis.topic} (Especificidad: ${analysis.relevanceScore}%)`
    );

    return analysis;
  }

  /**
   * Paso 2: Crear Blueprint
   */
  private async stepCreateBlueprint(
    idea: string,
    analysis: CourseAnalysis,
    title: string
  ): Promise<Blueprint> {
    this.updateStep(
      "structure",
      "processing",
      25,
      `Creando estructura para ${analysis.topic}...`
    );

    // Simular creación (en producción sería IA)
    await this.simulateDelay(1200);

    const blueprint = generateCourseBlueprintFromAnalysis(idea, analysis, title);

    this.updateStep(
      "structure",
      "completed",
      100,
      `${blueprint.modules.length} módulos, ${blueprint.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lecciones`
    );

    return blueprint;
  }

  /**
   * Paso 3: Generar Contenido
   */
  private async stepGenerateContent(blueprint: Blueprint): Promise<ProfessionalCourse> {
    this.updateStep(
      "content",
      "processing",
      25,
      "Generando contenido contextual..."
    );

    // Simular generación
    await this.simulateDelay(1500);

    const course = generateContextualCourse(blueprint);

    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

    this.updateStep(
      "content",
      "completed",
      100,
      `${totalLessons} lecciones con actividades y quizzes`
    );

    return course;
  }

  /**
   * Paso 4: Preparar Recursos
   */
  private async stepPrepareResources(course: ProfessionalCourse): Promise<void> {
    this.updateStep("resources", "processing", 25, "Configurando recursos...");

    // Simular preparación
    await this.simulateDelay(600);

    // Contar recursos
    const totalResources = course.modules.reduce(
      (sum, m) =>
        sum +
        m.lessons.reduce(
          (lessonSum, l) => lessonSum + (l.content.resources?.length || 0),
          0
        ),
      0
    );

    this.updateStep(
      "resources",
      "completed",
      100,
      `${totalResources} recursos preparados (pendientes de generación)`
    );
  }

  /**
   * Paso 5: Finalizar
   */
  private async stepFinalize(course: ProfessionalCourse): Promise<void> {
    this.updateStep("building", "processing", 50, "Finalizando...");

    // Simular finalización
    await this.simulateDelay(400);

    this.updateStep(
      "building",
      "completed",
      100,
      `Curso "${course.metadata.title}" listo para preview`
    );
  }

  /**
   * Actualiza estado de un paso
   */
  private updateStep(
    stepName: string,
    status: "pending" | "processing" | "completed" | "error",
    progress: number,
    message: string
  ) {
    const step = this.steps.find((s) => s.step === stepName);
    if (step) {
      step.status = status;
      step.progress = Math.min(progress, 100);
      step.message = message;
    }
  }

  /**
   * Simula delay (para desarrollo, en producción sería replaced por IA real)
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtiene progreso actual
   */
  getProgress(): number {
    const totalProgress = this.steps.reduce((sum, s) => sum + s.progress, 0);
    return Math.round(totalProgress / this.steps.length);
  }

  /**
   * Obtiene estado de pasos
   */
  getSteps(): CourseGenerationStep[] {
    return this.steps;
  }
}

/**
 * Función helper para generar un curso de forma simple
 */
export async function generateCourseFromIdea(
  idea: string,
  title: string
): Promise<CourseGenerationResult> {
  const service = new CourseGenerationService();
  return service.generateCourse(idea, title);
}
