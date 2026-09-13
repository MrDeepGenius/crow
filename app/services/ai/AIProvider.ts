// ============================================
// AI PROVIDER INTERFACE - CROW COURSE STUDIO
// ============================================

import {
  GenerationContext,
  ProductSpecification,
  CourseBlueprint,
  GeneratedModule,
  GeneratedLesson,
  GeneratedExam,
  GeneratedCertificate,
  ActivityContent,
  GeneratedQuiz,
  VideoContent,
  QualityValidation,
} from "./types";
import {
  WebGenerationContext,
  WebSpecification,
  InteractiveWebBlueprint,
  InteractiveWebSection,
  InteractiveWebProduct,
  WebQualityValidation,
} from "./interactiveWebTypes";
import {
  PdfGenerationContext,
  PdfSpecification,
  PdfBlueprint,
  PdfChapter,
  PdfSection,
  PdfQualityValidation,
  PdfContentBlock,
  PdfTextAction,
  PdfPresentation,
} from "./pdfTypes";
import {
  KitGenerationContext,
  KitSpecification,
  KitBlueprint,
  KitResource,
  KitQualityValidation,
  KitTextAction,
} from "./kitTypes";

// ============================================
// ABSTRACT AI PROVIDER INTERFACE
// ============================================

export abstract class AIProvider {
  abstract analyzeIdea(idea: string): Promise<ProductSpecification>;
  
  abstract generateBlueprint(
    context: GenerationContext
  ): Promise<CourseBlueprint>;
  
  abstract generateModule(
    context: GenerationContext,
    moduleIndex: number
  ): Promise<GeneratedModule>;
  
  abstract generateLesson(
    context: GenerationContext,
    moduleIndex: number,
    lessonIndex: number
  ): Promise<GeneratedLesson>;
  
  abstract generateActivity(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<ActivityContent>;
  
  abstract generateQuiz(
    context: GenerationContext,
    moduleTitle: string,
    lessonTitles: string[]
  ): Promise<GeneratedQuiz>;
  
  abstract generateFinalExam(
    context: GenerationContext,
    courseContent: GeneratedModule[]
  ): Promise<GeneratedExam>;
  
  abstract generateVideoScript(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<VideoContent>;
  
  abstract generateCertificate(
    context: GenerationContext
  ): Promise<GeneratedCertificate>;
  
  abstract validateCourse(
    context: GenerationContext,
    course: {
      blueprint: CourseBlueprint;
      modules: GeneratedModule[];
      exam: GeneratedExam;
    }
  ): Promise<QualityValidation>;

  // ============================================
  // WEB INTERACTIVA (segundo formato; curso intacto)
  // ============================================

  abstract analyzeWebIdea(idea: string): Promise<WebSpecification>;

  abstract generateWebBlueprint(
    context: WebGenerationContext
  ): Promise<InteractiveWebBlueprint>;

  abstract generateWebSection(
    context: WebGenerationContext,
    sectionIndex: number
  ): Promise<InteractiveWebSection>;

  abstract validateWebProduct(
    context: WebGenerationContext,
    product: {
      blueprint: InteractiveWebBlueprint;
      sections: InteractiveWebSection[];
    }
  ): Promise<WebQualityValidation>;

  // ============================================
  // PDF / EBOOK (tercer formato; curso y web intactos)
  // ============================================

  abstract analyzePdfIdea(idea: string): Promise<PdfSpecification>;

  abstract generatePdfBlueprint(
    context: PdfGenerationContext
  ): Promise<PdfBlueprint>;

  abstract generatePdfChapter(
    context: PdfGenerationContext,
    chapterIndex: number
  ): Promise<PdfChapter>;

  abstract validatePdfProduct(
    context: PdfGenerationContext,
    product: {
      blueprint: PdfBlueprint;
      chapters: PdfChapter[];
      exportInfo?: { pageCount: number; byteSize: number } | null;
    }
  ): Promise<PdfQualityValidation>;

  abstract generatePdfPresentation(
    context: PdfGenerationContext
  ): Promise<PdfPresentation>;

  abstract rewritePdfBlock(
    context: PdfGenerationContext,
    block: PdfContentBlock,
    action: PdfTextAction
  ): Promise<PdfContentBlock>;

  abstract regeneratePdfSection(
    context: PdfGenerationContext,
    chapterIndex: number,
    sectionIndex: number,
    variant: number
  ): Promise<PdfSection>;

  // ============================================
  // KIT DE RECURSOS (quinto formato; resto intacto)
  // ============================================

  abstract analyzeKitIdea(idea: string): Promise<KitSpecification>;

  abstract generateKitBlueprint(
    context: KitGenerationContext
  ): Promise<KitBlueprint>;

  abstract generateKitResource(
    context: KitGenerationContext,
    resourceIndex: number
  ): Promise<KitResource>;

  abstract rewriteKitResource(
    context: KitGenerationContext,
    resource: KitResource,
    action: KitTextAction
  ): Promise<KitResource>;

  abstract validateKitProduct(
    context: KitGenerationContext,
    product: { blueprint: KitBlueprint; resources: KitResource[] }
  ): Promise<KitQualityValidation>;
}

// ============================================
// AI PROVIDER FACTORY
// ============================================

export type AIProviderType = "mock" | "openai" | "anthropic";

export class AIProviderFactory {
  static async create(type?: AIProviderType): Promise<AIProvider> {
    // Si no se especifica tipo, usar el modo configurado
    if (!type) {
      const { AI_CONFIG } = await import("@/app/config/ai");
      type = AI_CONFIG.mode;
    }
    switch (type) {
      case "mock":
        const { MockAIProvider } = await import("./MockAIProvider");
        return new MockAIProvider();
        
      case "openai":
        // Modo desarrollo: por ahora usar Mock si OpenAI no está disponible
        try {
          const { OpenAIProvider } = await import("./OpenAIProvider");
          return new OpenAIProvider();
        } catch (error) {
          console.warn("OpenAI Provider no disponible, usando Mock:", error);
          const { MockAIProvider } = await import("./MockAIProvider");
          return new MockAIProvider();
        }
        
      case "anthropic":
        // Modo desarrollo: por ahora usar Mock si Anthropic no está disponible
        try {
          const { AnthropicProvider } = await import("./AnthropicProvider");
          return new AnthropicProvider();
        } catch (error) {
          console.warn("Anthropic Provider no disponible, usando Mock:", error);
          const { MockAIProvider } = await import("./MockAIProvider");
          return new MockAIProvider();
        }
        
      default:
        throw new Error(`Provider tipo '${type}' no soportado`);
    }
  }
}