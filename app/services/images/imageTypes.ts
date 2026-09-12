// ============================================
// IMAGE TYPES - CROW MARKET
// ============================================
// Sistema de imágenes para productos. Aislado: no modifica curso, web ni PDF.
// En Mock Mode las imágenes son vectores deterministas (SVG en preview,
// primitivas react-pdf en el PDF): siempre funcionan, sin URLs inventadas.

export type ImageKind =
  | "cover"
  | "chapterCover"
  | "editorial"
  | "illustration"
  | "diagram"
  | "infographic"
  | "comparison"
  | "steps"
  | "educational"
  | "decorative";

export type ImageStyle =
  | "modern"
  | "editorial"
  | "minimal"
  | "business"
  | "education"
  | "luxury";

export type ImageWidth = "small" | "medium" | "large";

export interface ImagePalette {
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  paper: string;
}

/** Especificación vectorial serializable (vive dentro del bloque). */
export interface VectorImageSpec {
  kind: "cover" | "funnel" | "triangle" | "steps" | "comparison" | "bars" | "motif";
  title: string;
  subtitle: string;
  labels: string[];
  notes: string[];
  palette: ImagePalette;
  variant: number;
  motif: "aperture" | "funnel" | "speech" | "pulse" | "coins" | "arcs";
}

export interface ImagePrompt {
  text: string;
  kind: ImageKind;
  style: ImageStyle;
  topic: string;
  sectionTitle: string;
}

export interface ImagePlacement {
  productId: string;
  chapterId: string;
  sectionId: string;
  /** Id del bloque después del cual se inserta. Vacío = al final de la sección. */
  afterBlockId: string;
  width: ImageWidth;
}

export interface GeneratedImage {
  id: string;
  kind: ImageKind;
  title: string;
  prompt: ImagePrompt;
  alt: string;
  placement: ImagePlacement;
  width: ImageWidth;
  style: ImageStyle;
  spec: VectorImageSpec;
  provider: "mock";
  variant: number;
  createdAt: string;
}

export interface ImageGenerationRequest {
  kind: ImageKind;
  topic: string;
  sectionTitle: string;
  style: ImageStyle;
  palette: ImagePalette;
  labels: string[];
  variant: number;
}

export interface ImageGenerationResult {
  image: GeneratedImage;
  /** SVG listo para preview/editor (data URI no necesaria: svg crudo). */
  svg: string;
}

export interface VisualOpportunity {
  id: string;
  chapterId: string;
  sectionId: string;
  afterBlockId: string;
  kind: ImageKind;
  reason: string;
  labels: string[];
}

export interface ImageGenerationState {
  productId: string;
  topic: string;
  style: ImageStyle;
  opportunities: VisualOpportunity[];
  images: GeneratedImage[];
  updatedAt: string;
}

export interface ImageValidationIssue {
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

export const IMAGE_WIDTHS: Record<ImageWidth, number> = {
  small: 45,
  medium: 70,
  large: 100,
};
