// ============================================
// PDF / EBOOK TYPES - CROW MARKET
// ============================================
// Tercer formato de producto ("pdf"). No modifica los tipos de cursos
// (types.ts) ni de web interactiva (interactiveWebTypes.ts).

import type { GeneratedCourse } from "./types";
import type { InteractiveWebProduct } from "./interactiveWebTypes";
import type { VectorImageSpec } from "@/app/services/images/imageTypes";

export type CrowProductFormat = "course" | "interactive_web" | "pdf";

export type AnyCrowProduct =
  | { kind: "course"; course: GeneratedCourse }
  | { kind: "interactive_web"; web: InteractiveWebProduct }
  | { kind: "pdf"; pdf: PdfProduct };

// ============================================
// BLOQUES DE CONTENIDO
// ============================================

export type PdfBlockType =
  | "heading"
  | "subheading"
  | "paragraph"
  | "bulletList"
  | "numberedList"
  | "quote"
  | "highlight"
  | "tip"
  | "warning"
  | "example"
  | "checklist"
  | "table"
  | "callout"
  | "divider"
  | "image"
  | "exercise"
  | "reflection"
  | "chapterSummary";

export interface PdfBlockBase {
  id: string;
  type: PdfBlockType;
  order: number;
}

export interface HeadingBlock extends PdfBlockBase { type: "heading"; text: string; }
export interface SubheadingBlock extends PdfBlockBase { type: "subheading"; text: string; }
export interface ParagraphBlock extends PdfBlockBase { type: "paragraph"; text: string; }
export interface BulletListBlock extends PdfBlockBase { type: "bulletList"; items: string[]; }
export interface NumberedListBlock extends PdfBlockBase { type: "numberedList"; items: string[]; }
export interface QuoteBlock extends PdfBlockBase { type: "quote"; text: string; author: string; }
export interface HighlightBlock extends PdfBlockBase { type: "highlight"; text: string; }
export interface TipBlock extends PdfBlockBase { type: "tip"; title: string; text: string; }
export interface WarningBlock extends PdfBlockBase { type: "warning"; title: string; text: string; }
export interface ExampleBlock extends PdfBlockBase { type: "example"; title: string; text: string; }
export interface ChecklistBlock extends PdfBlockBase { type: "checklist"; title: string; items: string[]; }
export interface TableBlock extends PdfBlockBase {
  type: "table";
  title: string;
  headers: string[];
  rows: string[][];
}
export interface CalloutBlock extends PdfBlockBase { type: "callout"; title: string; text: string; }
export interface DividerBlock extends PdfBlockBase { type: "divider"; }
export interface ImageBlock extends PdfBlockBase {
  type: "image";
  /** Solo URL real (nunca inventada). Vacía = no se exporta al PDF. */
  src: string;
  alt: string;
  caption: string;
  /** Vector determinista del Image Engine (mock offline). Si existe, se usa en el PDF. */
  vector?: VectorImageSpec;
  /** Ancho relativo: small 45% / medium 70% / large 100%. */
  width?: "small" | "medium" | "large";
  /** Id de la GeneratedImage asociada (para regenerar). */
  imageId?: string;
}
export interface ExerciseBlock extends PdfBlockBase { type: "exercise"; title: string; text: string; }
export interface ReflectionBlock extends PdfBlockBase { type: "reflection"; question: string; }
export interface ChapterSummaryBlock extends PdfBlockBase { type: "chapterSummary"; points: string[]; }

export type PdfContentBlock =
  | HeadingBlock
  | SubheadingBlock
  | ParagraphBlock
  | BulletListBlock
  | NumberedListBlock
  | QuoteBlock
  | HighlightBlock
  | TipBlock
  | WarningBlock
  | ExampleBlock
  | ChecklistBlock
  | TableBlock
  | CalloutBlock
  | DividerBlock
  | ImageBlock
  | ExerciseBlock
  | ReflectionBlock
  | ChapterSummaryBlock;

// ============================================
// ESTRUCTURA
// ============================================

export interface PdfSection {
  id: string;
  title: string;
  order: number;
  blocks: PdfContentBlock[];
}

export interface PdfChapter {
  id: string;
  title: string;
  introduction: string;
  order: number;
  sections: PdfSection[];
}

export interface PdfChapterBlueprint {
  id: string;
  title: string;
  summary: string;
  sectionTitles: string[];
}

// ============================================
// BRANDING / DISEÑO
// ============================================

export type PdfStylePreset =
  | "modern"
  | "minimal"
  | "editorial"
  | "business"
  | "education"
  | "luxury"
  | "premium";

export interface PdfBranding {
  preset: PdfStylePreset;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  fontFamily: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: number;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  headerStyle: string;
  footerStyle: string;
  coverStyle: "bold" | "classic" | "band";
  footerText: string;
}

export interface PdfCover {
  title: string;
  subtitle: string;
  author: string;
  brandLine: string;
  edition: string;
}

// ============================================
// BLUEPRINT + PRODUCTO
// ============================================

export type PdfTone =
  | "professional"
  | "educational"
  | "warm"
  | "inspiring"
  | "premium"
  | "conversational";

export interface PdfPersonalization {
  tone: PdfTone;
  style: PdfStylePreset;
  paletteMode: "auto" | "custom";
  recommended: boolean;
}

export interface PdfPresentation {
  welcome: string;
  whatYouLearn: string[];
  whoFor: string;
  howToUse: string;
}

export interface PdfSpecification {
  topic: string;
  audience: string;
  level: string;
  goal: string;
  language: "es" | "en";
  targetPages: number;
  tone: PdfTone;
  style: PdfStylePreset;
  paletteMode: "auto" | "custom";
  recommendedByCrow: boolean;
}

export interface PdfEditorialBrief {
  promise: string;
  readerLevel: string;
  goal: string;
  tone: PdfTone;
  style: PdfStylePreset;
  visualIdentity: string;
  resourcesNeeded: string[];
  conclusion: string;
  finalCta: string;
}

export interface PdfBlueprint {
  title: string;
  subtitle: string;
  description: string;
  targetAudience: string;
  level: string;
  language: string;
  targetPages: number;
  chapters: PdfChapterBlueprint[];
  branding: PdfBranding;
  cover: PdfCover;
  brief: PdfEditorialBrief;
  personalization: PdfPersonalization;
}

export interface PdfGenerationContext {
  originalIdea: string;
  specification: PdfSpecification;
  blueprint?: PdfBlueprint;
}

export type PdfStatus =
  | "DRAFT"
  | "GENERATING"
  | "VALIDATING"
  | "READY"
  | "PUBLISHED";

export type PdfEditorialStatus =
  | "Borrador"
  | "Generando"
  | "Listo"
  | "Publicado";

export interface PdfProductVersion {
  version: number;
  label: string;
  createdAt: string;
  product: PdfProduct;
}

export interface EpubExportResult {
  available: false;
  reason: string;
}

export type PdfTextAction =
  | "improve"
  | "shorten"
  | "expand"
  | "professional"
  | "persuasive"
  | "fix";

export interface PdfDocumentMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  createdAt: string;
}

export interface PdfProduct {
  id: string;
  kind: "pdf";
  version: number;
  editorialStatus: PdfEditorialStatus;
  metadata: PdfDocumentMetadata;
  cover: PdfCover;
  branding: PdfBranding;
  presentation: PdfPresentation;
  chapters: PdfChapter[];
  stats: {
    totalChapters: number;
    totalSections: number;
    totalBlocks: number;
    totalWords: number;
    estimatedPages: number;
  };
  exportInfo: PdfExportResult | null;
  status: PdfStatus;
}

export interface PdfExportResult {
  generatedAt: string;
  pageCount: number;
  byteSize: number;
  fileName: string;
}

// ============================================
// GENERACIÓN (progreso real)
// ============================================

export type PdfGenerationStepId =
  | "analyze"
  | "blueprint"
  | "chapters"
  | "design"
  | "images"
  | "validate"
  | "export"
  | "complete";

export interface PdfGenerationStep {
  id: PdfGenerationStepId;
  name: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startTime?: string;
  endTime?: string;
}

export interface PdfGenerationState {
  id: string;
  originalIdea: string;
  status: PdfStatus | "FAILED";
  steps: PdfGenerationStep[];
  currentStep: PdfGenerationStepId;
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  specification?: PdfSpecification;
  blueprint?: PdfBlueprint;
  presentation?: PdfPresentation;
  chapters: PdfChapter[];
  imagesGenerated: boolean;
  validation?: PdfQualityValidation;
  exportInfo?: PdfExportResult;
  result?: PdfProduct;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// VALIDACIÓN DETERMINÍSTICA (score 100)
// ============================================

export interface PdfQualityIssue {
  category: "content" | "structure" | "design" | "completeness" | "export";
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface PdfQualityValidation {
  contentScore: number; // 30
  structureScore: number; // 20
  designScore: number; // 20
  completenessScore: number; // 20
  exportScore: number; // 10
  totalScore: number; // 100
  passed: boolean;
  issues: PdfQualityIssue[];
  recommendations: string[];
}
