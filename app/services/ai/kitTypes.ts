// ============================================
// RESOURCE KIT TYPES - CROW MARKET
// ============================================
// Quinto formato ("kit"). Aislado: no modifica PDF, Ebook, cursos ni web.
// El contenido de cada recurso reutiliza PdfContentBlock (mismo sistema).

import type { PdfContentBlock, PdfBranding } from "./pdfTypes";

export type KitResourceKind =
  | "guide"
  | "minibook"
  | "checklist"
  | "workbook"
  | "template"
  | "prompts"
  | "worksheet"
  | "script"
  | "calendar"
  | "planner"
  | "ideas"
  | "bank"
  | "framework"
  | "strategy";

export type KitFileFormat = "pdf" | "txt" | "csv" | "xlsx";

export type KitStatus =
  | "BORRADOR"
  | "GENERANDO"
  | "EN REVISIÓN"
  | "LISTO"
  | "PUBLICADO"
  | "ARCHIVADO";

export interface KitFolder {
  id: string;
  name: string;
  order: number;
}

export interface KitResourceBlueprint {
  id: string;
  title: string;
  kind: KitResourceKind;
  folderId: string;
  formats: KitFileFormat[];
  summary: string;
}

export interface KitResource {
  id: string;
  title: string;
  kind: KitResourceKind;
  folderId: string;
  formats: KitFileFormat[];
  summary: string;
  blocks: PdfContentBlock[];
  order: number;
  status: "pending" | "ready";
  updatedAt: string;
}

export interface KitBranding {
  preset: PdfBranding["preset"];
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}

export interface KitBlueprint {
  name: string;
  subtitle: string;
  audience: string;
  goal: string;
  promise: string;
  level: string;
  folders: KitFolder[];
  resources: KitResourceBlueprint[];
  branding: KitBranding;
  coverTitle: string;
}

export interface KitSpecification {
  topic: string;
  audience: string;
  problem: string;
  goal: string;
  level: string;
  recommendedCount: number;
}

export interface KitGenerationContext {
  originalIdea: string;
  specification: KitSpecification;
  blueprint?: KitBlueprint;
}

export interface KitReadme {
  whatItContains: string[];
  whoFor: string;
  howToUse: string;
  recommendedOrder: string[];
  firstResource: string;
  tips: string[];
}

export interface KitProduct {
  id: string;
  kind: "kit";
  version: number;
  name: string;
  subtitle: string;
  author: string;
  description: string;
  category: string;
  folders: KitFolder[];
  resources: KitResource[];
  branding: KitBranding;
  readme: KitReadme;
  coverImageId: string | null;
  stats: {
    totalResources: number;
    totalFolders: number;
    totalWords: number;
    formats: KitFileFormat[];
  };
  status: KitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface KitProductVersion {
  version: number;
  label: string;
  createdAt: string;
  product: KitProduct;
}

export interface KitMarketplaceListing {
  name: string;
  description: string;
  category: string;
  price: null;
  author: string;
  resourceCount: number;
  formats: KitFileFormat[];
  status: "draft";
}

export type KitGenerationStepId =
  | "analyze"
  | "blueprint"
  | "resources"
  | "design"
  | "validate"
  | "complete";

export interface KitGenerationStep {
  id: KitGenerationStepId;
  name: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startTime?: string;
  endTime?: string;
}

export interface KitGenerationState {
  id: string;
  originalIdea: string;
  status: KitStatus | "FAILED";
  steps: KitGenerationStep[];
  currentStep: KitGenerationStepId;
  overallProgress: number;
  isComplete: boolean;
  hasError: boolean;
  specification?: KitSpecification;
  blueprint?: KitBlueprint;
  resources: KitResource[];
  validation?: KitQualityValidation;
  result?: KitProduct;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KitQualityIssue {
  category: "content" | "organization" | "design" | "formats" | "naming";
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export interface KitQualityValidation {
  contentScore: number;
  organizationScore: number;
  designScore: number;
  formatsScore: number;
  totalScore: number;
  passed: boolean;
  issues: KitQualityIssue[];
  recommendations: string[];
}

export type KitTextAction =
  | "improve"
  | "expand"
  | "summarize"
  | "regenerate"
  | "professional"
  | "practical"
  | "examples"
  | "alternative";
