// ============================================
// OPENAI PROVIDER - (PLACEHOLDER PARA FUTURO)
// ============================================

import { AIProvider } from "./AIProvider";
import {
  GenerationContext,
  ProductSpecification,
  CourseBlueprint,
  GeneratedModule,
  GeneratedLesson,
  ActivityContent,
  GeneratedQuiz,
  VideoContent,
  GeneratedExam,
  GeneratedCertificate,
  QualityValidation,
} from "./types";

export class OpenAIProvider extends AIProvider {
  async analyzeIdea(idea: string): Promise<ProductSpecification> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateBlueprint(context: GenerationContext): Promise<CourseBlueprint> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateModule(
    context: GenerationContext,
    moduleIndex: number
  ): Promise<GeneratedModule> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateLesson(
    context: GenerationContext,
    moduleIndex: number,
    lessonIndex: number
  ): Promise<GeneratedLesson> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateActivity(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<ActivityContent> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateQuiz(
    context: GenerationContext,
    moduleTitle: string,
    lessonTitles: string[]
  ): Promise<GeneratedQuiz> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateFinalExam(
    context: GenerationContext,
    courseContent: GeneratedModule[]
  ): Promise<GeneratedExam> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateVideoScript(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<VideoContent> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async generateCertificate(context: GenerationContext): Promise<GeneratedCertificate> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
  
  async validateCourse(
    context: GenerationContext,
    course: {
      blueprint: CourseBlueprint;
      modules: GeneratedModule[];
      exam: GeneratedExam;
    }
  ): Promise<QualityValidation> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  // Web interactiva: stubs necesarios por la interfaz (mock activo en desarrollo)
  async analyzeWebIdea(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generateWebBlueprint(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generateWebSection(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async validateWebProduct(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  // PDF / Ebook: stubs necesarios por la interfaz (mock activo en desarrollo)
  async analyzePdfIdea(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generatePdfBlueprint(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generatePdfChapter(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async validatePdfProduct(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generatePdfPresentation(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async rewritePdfBlock(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async regeneratePdfSection(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  // Kit de recursos: stubs (mock activo en desarrollo)
  async analyzeKitIdea(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generateKitBlueprint(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async generateKitResource(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async rewriteKitResource(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }

  async validateKitProduct(): Promise<never> {
    throw new Error("OpenAI Provider no implementado - Modo desarrollo activo");
  }
}