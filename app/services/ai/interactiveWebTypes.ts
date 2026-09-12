// ============================================
// INTERACTIVE WEB TYPES - CROW MARKET
// ============================================
// Segundo formato de producto ("interactive_web"). No modifica los tipos
// del flujo de cursos (app/services/ai/types.ts), que siguen intactos.

import type { GeneratedCourse } from "./types";

// ============================================
// PRODUCTO GENÉRICO CROW
// ============================================

export type ProductType = "course" | "interactive_web";

export type CrowProduct =
  | { kind: "course"; course: GeneratedCourse }
  | { kind: "interactive_web"; web: InteractiveWebProduct };

// ============================================
// BRANDING (propio de cada web generada)
// ============================================

export interface InteractiveWebBranding {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderRadius: number;
  fontFamily: string;
  themeName: string;
}

// ============================================
// COMPONENTES (unión discriminada, todos funcionales)
// ============================================

export type WebComponentType =
  | "hero"
  | "richText"
  | "image"
  | "cards"
  | "accordion"
  | "tabs"
  | "quiz"
  | "flashcards"
  | "checklist"
  | "progress"
  | "cta"
  | "vocabMatch";

export interface WebComponentBase {
  id: string;
  type: WebComponentType;
  order: number;
}

export interface HeroComponent extends WebComponentBase {
  type: "hero";
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Id de sección destino. Debe existir. */
  ctaTargetSectionId: string;
}

export interface RichTextComponent extends WebComponentBase {
  type: "richText";
  heading: string;
  paragraphs: string[];
}

export interface ImageComponent extends WebComponentBase {
  type: "image";
  /** Solo se emite con URL real (nunca placeholder). */
  src: string;
  alt: string;
  caption: string;
}

export interface CardsComponent extends WebComponentBase {
  type: "cards";
  heading: string;
  cards: { title: string; body: string }[];
}

export interface AccordionComponent extends WebComponentBase {
  type: "accordion";
  heading: string;
  items: { title: string; body: string }[];
}

export interface TabsComponent extends WebComponentBase {
  type: "tabs";
  heading: string;
  tabs: { label: string; body: string }[];
}

export interface WebQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizComponent extends WebComponentBase {
  type: "quiz";
  title: string;
  questions: WebQuizQuestion[];
  passingScore: number;
}

export interface FlashcardsComponent extends WebComponentBase {
  type: "flashcards";
  title: string;
  cards: { front: string; back: string; hint: string }[];
}

export interface ChecklistComponent extends WebComponentBase {
  type: "checklist";
  title: string;
  items: string[];
}

export interface ProgressComponent extends WebComponentBase {
  type: "progress";
  title: string;
}

export interface CtaComponent extends WebComponentBase {
  type: "cta";
  title: string;
  body: string;
  buttonLabel: string;
  /** Id de sección destino. Debe existir. */
  targetSectionId: string;
}

export interface VocabMatchComponent extends WebComponentBase {
  type: "vocabMatch";
  title: string;
  instruction: string;
  pairs: { left: string; right: string }[];
}

export type InteractiveWebComponent =
  | HeroComponent
  | RichTextComponent
  | ImageComponent
  | CardsComponent
  | AccordionComponent
  | TabsComponent
  | QuizComponent
  | FlashcardsComponent
  | ChecklistComponent
  | ProgressComponent
  | CtaComponent
  | VocabMatchComponent;

// ============================================
// BLUEPRINT
// ============================================

export interface WebSectionBlueprint {
  id: string;
  title: string;
  purpose: string;
  componentTypes: WebComponentType[];
}

export interface WebSpecification {
  topic: string;
  audience: string;
  level: string;
  goal: string;
  language: "es" | "en";
  sections: string[];
}

export interface InteractiveWebBlueprint {
  title: string;
  description: string;
  targetAudience: string;
  level: string;
  language: string;
  sections: WebSectionBlueprint[];
  branding: InteractiveWebBranding;
}

export interface WebGenerationContext {
  originalIdea: string;
  specification: WebSpecification;
  blueprint?: InteractiveWebBlueprint;
}

// ============================================
// PRODUCTO
// ============================================

export interface InteractiveWebSection {
  id: string;
  title: string;
  purpose: string;
  order: number;
  components: InteractiveWebComponent[];
}

export type InteractiveWebStatus =
  | "DRAFT"
  | "GENERATING"
  | "VALIDATING"
  | "READY";

export interface InteractiveWebProduct {
  id: string;
  kind: "interactive_web";
  metadata: {
    title: string;
    description: string;
    author: string;
    level: string;
    language: string;
    category: string;
    tags: string[];
    createdAt: string;
  };
  branding: InteractiveWebBranding;
  sections: InteractiveWebSection[];
  stats: {
    totalSections: number;
    totalComponents: number;
    totalInteractive: number;
  };
  status: InteractiveWebStatus;
}

// ============================================
// GENERACIÓN (progreso real, sin timers falsos)
// ============================================

export type WebGenerationStepId =
  | "analyze"
  | "blueprint"
  | "content"
  | "validate"
  | "complete";

export interface WebGenerationStep {
  id: WebGenerationStepId;
  name: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startTime?: string;
  endTime?: string;
}

export interface WebGenerationState {
  id: string;
  originalIdea: string;
  status: InteractiveWebStatus | "FAILED";
  steps: WebGenerationStep[];
  currentStep: WebGenerationStepId;
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  specification?: WebSpecification;
  blueprint?: InteractiveWebBlueprint;
  sections: InteractiveWebSection[];
  validation?: WebQualityValidation;
  result?: InteractiveWebProduct;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// VALIDACIÓN DETERMINÍSTICA
// ============================================

export interface WebQualityIssue {
  type: "structure" | "content" | "interaction" | "design";
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface WebQualityValidation {
  structureScore: number;
  contentScore: number;
  interactionScore: number;
  designScore: number;
  overallScore: number;
  passed: boolean;
  issues: WebQualityIssue[];
  recommendations: string[];
}
