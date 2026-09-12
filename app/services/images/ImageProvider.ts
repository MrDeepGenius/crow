// ============================================
// IMAGE PROVIDER - CROW MARKET
// ============================================
// Interfaz lista para un proveedor real (sin keys en frontend).
// Activo: MockImageProvider (vectores deterministas por tema, sin random).

import type {
  GeneratedImage,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageKind,
  ImagePalette,
  ImageStyle,
  VectorImageSpec,
} from "./imageTypes";

export interface ImageProvider {
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  generateImages(requests: ImageGenerationRequest[]): Promise<ImageGenerationResult[]>;
  generateCover(input: {
    title: string;
    subtitle: string;
    topic: string;
    author: string;
    style: ImageStyle;
    palette: ImagePalette;
  }): Promise<ImageGenerationResult>;
  generateDiagram(input: {
    title: string;
    topic: string;
    labels: string[];
    style: ImageStyle;
    palette: ImagePalette;
  }): Promise<ImageGenerationResult>;
}

function specFor(
  kind: VectorImageSpec["kind"],
  request: { topic: string; sectionTitle: string; style: ImageStyle; palette: ImagePalette; labels: string[]; variant: number },
  title: string,
  motif: VectorImageSpec["motif"]
): VectorImageSpec {
  return {
    kind,
    title,
    subtitle: request.sectionTitle,
    labels: request.labels,
    notes: [],
    palette: request.palette,
    variant: request.variant,
    motif,
  };
}

function motifForTopic(topic: string): VectorImageSpec["motif"] {
  const t = topic.toLowerCase();
  if (t.includes("foto")) return "aperture";
  if (t.includes("marketing") || t.includes("ventas") || t.includes("embudo")) return "funnel";
  if (t.includes("ingl") || t.includes("english") || t.includes("idioma")) return "speech";
  if (t.includes("correr") || t.includes("running") || t.includes("5k") || t.includes("deporte")) return "pulse";
  if (t.includes("finan") || t.includes("dinero") || t.includes("presupuesto")) return "coins";
  return "arcs";
}

function buildResult(
  request: ImageGenerationRequest,
  kind: ImageKind,
  spec: VectorImageSpec,
  alt: string
): ImageGenerationResult {
  const image: GeneratedImage = {
    id: `img-${request.variant}-${spec.kind}-${slug(request.sectionTitle)}`,
    kind,
    title: spec.title,
    prompt: {
      text: buildPromptText(request, kind),
      kind,
      style: request.style,
      topic: request.topic,
      sectionTitle: request.sectionTitle,
    },
    alt,
    placement: { productId: "", chapterId: "", sectionId: "", afterBlockId: "", width: "medium" },
    width: "medium",
    style: request.style,
    spec,
    provider: "mock",
    variant: request.variant,
    createdAt: new Date().toISOString(),
  };
  return { image, svg: "" };
}

function buildPromptText(request: ImageGenerationRequest, kind: ImageKind): string {
  return `${kind} sobre "${request.sectionTitle}" para ${request.topic}, estilo ${request.style}, paleta (${request.palette.primary}, ${request.palette.secondary}). Etiquetas: ${request.labels.join("; ") || "—"}.`;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32) || "img";
}

export class MockImageProvider implements ImageProvider {
  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    return this.create(request, "illustration");
  }

  async generateImages(requests: ImageGenerationRequest[]): Promise<ImageGenerationResult[]> {
    const out: ImageGenerationResult[] = [];
    for (const r of requests) out.push(await this.generateImage(r));
    return out;
  }

  async generateCover(input: {
    title: string;
    subtitle: string;
    topic: string;
    author: string;
    style: ImageStyle;
    palette: ImagePalette;
  }): Promise<ImageGenerationResult> {
    const request: ImageGenerationRequest = {
      kind: "cover",
      topic: input.topic,
      sectionTitle: "Portada",
      style: input.style,
      palette: input.palette,
      labels: [input.title, input.subtitle, input.author],
      variant: 0,
    };
    const spec = specFor("cover", request, input.title, motifForTopic(input.topic));
    spec.subtitle = input.subtitle;
    spec.notes = [input.author];
    return buildResult(request, "cover", spec, `Portada: ${input.title}`);
  }

  async generateDiagram(input: {
    title: string;
    topic: string;
    labels: string[];
    style: ImageStyle;
    palette: ImagePalette;
  }): Promise<ImageGenerationResult> {
    const request: ImageGenerationRequest = {
      kind: "diagram",
      topic: input.topic,
      sectionTitle: input.title,
      style: input.style,
      palette: input.palette,
      labels: input.labels,
      variant: 0,
    };
    return this.create(request, "diagram");
  }

  private async create(request: ImageGenerationRequest, kind: ImageKind): Promise<ImageGenerationResult> {
    const t = request.topic.toLowerCase();
    const s = request.sectionTitle.toLowerCase();
    // Diagramas específicos por contenido (no genéricos)
    if (s.includes("exposici") || s.includes("triángulo") || s.includes("triangulo") || (s.includes("luz") && t.includes("foto"))) {
      return buildResult(request, "diagram",
        specFor("triangle", request, "Triángulo de exposición", "aperture"),
        "Diagrama: apertura, velocidad e ISO");
    }
    if (s.includes("embudo") || s.includes("ventas") || s.includes("conversi")) {
      return buildResult(request, "diagram",
        specFor("funnel", request, "Embudo de ventas", "funnel"),
        "Diagrama: embudo de ventas por etapas");
    }
    if (s.includes("presupuesto") || s.includes("gasto") || s.includes("flujo") || s.includes("dinero")) {
      const spec = specFor("bars", request, request.sectionTitle, "coins");
      return buildResult(request, "diagram", spec, `Gráfico: ${request.sectionTitle}`);
    }
    if (s.includes("plan") || s.includes("semana") || s.includes("paso") || s.includes("rutina") || s.includes("calendario")) {
      return buildResult(request, "steps",
        specFor("steps", request, request.sectionTitle, motifForTopic(request.topic)),
        `Pasos: ${request.sectionTitle}`);
    }
    if (s.includes("compar") || s.includes("antes") || s.includes("error")) {
      return buildResult(request, "comparison",
        specFor("comparison", request, request.sectionTitle, motifForTopic(request.topic)),
        `Comparación: ${request.sectionTitle}`);
    }
    if (request.labels.length >= 3 && (s.includes("número") || s.includes("color") || s.includes("vocabulario"))) {
      const spec = specFor("bars", request, request.sectionTitle, motifForTopic(request.topic));
      return buildResult(request, "infographic", spec, `Visual: ${request.sectionTitle}`);
    }
    return buildResult(request, "illustration",
      specFor("motif", request, request.sectionTitle, motifForTopic(request.topic)),
      `Ilustración: ${request.sectionTitle}`);
  }
}

// Stubs preparados para el proveedor real (sin keys en frontend: la llamada
// real deberá pasar por backend cuando se conecte).
export class OpenAIImageProvider implements ImageProvider {
  async generateImage(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateImages(): Promise<ImageGenerationResult[]> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateCover(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateDiagram(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
}

export class AnthropicImageProvider implements ImageProvider {
  async generateImage(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateImages(): Promise<ImageGenerationResult[]> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateCover(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
  async generateDiagram(): Promise<ImageGenerationResult> {
    throw new Error("Proveedor de imágenes real no conectado (Mock activo)");
  }
}
