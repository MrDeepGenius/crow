// ============================================
// IMAGE GENERATION ENGINE - CROW MARKET
// ============================================
// Analiza productos, detecta oportunidades visuales y genera/inserta
// imágenes mock deterministas. Persiste en localStorage (mock).
// No toca curso, web ni el flujo PDF existente.

import { MockImageProvider } from "./ImageProvider";
import type {
  GeneratedImage,
  ImageKind,
  ImagePalette,
  ImageStyle,
  ImageValidationIssue,
  ImageWidth,
  VectorImageSpec,
  VisualOpportunity,
  ImageGenerationState,
} from "./imageTypes";
import type { PdfProduct, PdfContentBlock, ImageBlock } from "@/app/services/ai/pdfTypes";

function stateKey(productId: string): string {
  return `crow_image_state_${productId}`;
}

const OPPORTUNITY_RULES: { match: RegExp; kind: ImageKind; reason: string }[] = [
  { match: /exposici|triángulo|triangulo|apertura|iso|velocidad.*obtur/i, kind: "diagram", reason: "Concepto técnico que se entiende mejor con diagrama" },
  { match: /embudo|ventas|conversi|funnel/i, kind: "diagram", reason: "Proceso por etapas: diagrama de embudo" },
  { match: /presupuesto|gasto|flujo|dinero|ahorro/i, kind: "infographic", reason: "Datos de dinero: visual comparativo" },
  { match: /plan|semana|paso|rutina|calendario|checklist/i, kind: "steps", reason: "Secuencia de pasos: visual paso a paso" },
  { match: /error|compar|antes.*despu|mito/i, kind: "comparison", reason: "Contraste: visual comparativo" },
  { match: /n.mero|color|vocabulario|palabra|frase/i, kind: "educational", reason: "Vocabulario: visual educativo" },
];

function paletteForBranding(b: PdfProduct["branding"]): ImagePalette {
  return {
    primary: b.primaryColor,
    secondary: b.secondaryColor,
    accent: b.accentColor,
    ink: b.textColor,
    paper: "#ffffff",
  };
}

function styleForPreset(preset: string): ImageStyle {
  const valid: ImageStyle[] = ["modern", "editorial", "minimal", "business", "education", "luxury"];
  return (valid as string[]).includes(preset) ? (preset as ImageStyle) : "modern";
}

export class ImageGenerationEngine {
  private provider = new MockImageProvider();

  /** Detecta oportunidades visuales en un producto PDF (determinístico). */
  analyzeProduct(product: PdfProduct): VisualOpportunity[] {
    const opportunities: VisualOpportunity[] = [];
    product.chapters.forEach((ch, ci) => {
      ch.sections.forEach((sec) => {
        const haystack = `${ch.title} ${sec.title} ${sec.blocks
          .map((b) => ("text" in b && typeof b.text === "string" ? b.text : "") + ("title" in b && typeof b.title === "string" ? ` ${b.title}` : ""))
          .join(" ")}`;
        for (const rule of OPPORTUNITY_RULES) {
          if (rule.match.test(haystack)) {
            const lastBlock = sec.blocks[sec.blocks.length - 1];
            opportunities.push({
              id: `opp-${ch.id}-${sec.id}-${rule.kind}`,
              chapterId: ch.id,
              sectionId: sec.id,
              afterBlockId: lastBlock ? lastBlock.id : "",
              kind: rule.kind,
              reason: rule.reason,
              labels: labelsFor(ch.title, sec.title, product.metadata.title),
            });
            break;
          }
        }
        // Garantía: al menos una oportunidad por capítulo (ilustración editorial)
        const hasOpp = opportunities.some((o) => o.sectionId === sec.id);
        if (!hasOpp && sec.blocks.length > 0) {
          const firstSec = ch.sections[0];
          if (sec.id === firstSec.id) {
            const lastBlock = sec.blocks[sec.blocks.length - 1];
            opportunities.push({
              id: `opp-${ch.id}-${sec.id}-editorial`,
              chapterId: ch.id,
              sectionId: sec.id,
              afterBlockId: lastBlock ? lastBlock.id : "",
              kind: "editorial",
              reason: "Apertura de capítulo: imagen editorial",
              labels: [ch.title],
            });
          }
        }
        void ci;
      });
    });
    return opportunities;
  }

  /** Genera la imagen de portada coherente con tema + branding. */
  async generateCover(product: PdfProduct): Promise<GeneratedImage> {
    const palette = paletteForBranding(product.branding);
    const style = styleForPreset(product.branding.preset);
    const result = await this.provider.generateCover({
      title: product.cover.title,
      subtitle: product.cover.subtitle,
      topic: product.metadata.title,
      author: product.cover.author,
      style,
      palette,
    });
    result.image.placement = {
      productId: product.id,
      chapterId: product.chapters[0]?.id ?? "",
      sectionId: product.chapters[0]?.sections[0]?.id ?? "",
      afterBlockId: "",
      width: "large",
    };
    result.image.width = "large";
    return result.image;
  }

  /** Genera una imagen para una oportunidad (variante determinística). */
  async generateForOpportunity(
    product: PdfProduct,
    opp: VisualOpportunity,
    variant: number
  ): Promise<GeneratedImage> {
    const palette = paletteForBranding(product.branding);
    const style = styleForPreset(product.branding.preset);
    const sectionTitle = findSectionTitle(product, opp.sectionId) ?? opp.sectionId;
    const request = {
      kind: opp.kind as ImageKind,
      topic: product.metadata.title,
      sectionTitle,
      style,
      palette,
      labels: opp.labels,
      variant,
    };
    const needsDiagram =
      opp.kind === "diagram" || opp.kind === "infographic" || opp.kind === "educational";
    const result = needsDiagram
      ? await this.provider.generateDiagram({
          title: sectionTitle,
          topic: product.metadata.title,
          labels: opp.labels,
          style,
          palette,
        })
      : await this.provider.generateImage(request);
    result.image.id = `img-${opp.id}-v${variant}`;
    result.image.kind = opp.kind;
    result.image.variant = variant;
    result.image.placement = {
      productId: product.id,
      chapterId: opp.chapterId,
      sectionId: opp.sectionId,
      afterBlockId: opp.afterBlockId,
      width: opp.kind === "diagram" || opp.kind === "infographic" ? "large" : "medium",
    };
    result.image.width = result.image.placement.width;
    result.image.spec.variant = variant;
    return result.image;
  }

  /** Inserta la imagen como bloque en el producto (devuelve producto nuevo). */
  insertImage(product: PdfProduct, image: GeneratedImage): PdfProduct {
    const block = imageToBlock(image);
    return {
      ...product,
      chapters: product.chapters.map((ch) =>
        ch.id !== image.placement.chapterId
          ? ch
          : {
              ...ch,
              sections: ch.sections.map((sec) => {
                if (sec.id !== image.placement.sectionId) return sec;
                const blocks = [...sec.blocks];
                const at = blocks.findIndex((b) => b.id === image.placement.afterBlockId);
                // Portada/capítulo: al inicio; resto: después del bloque indicado.
                if (image.kind === "cover" || image.kind === "chapterCover") blocks.unshift(block);
                else if (at >= 0) blocks.splice(at + 1, 0, block);
                else blocks.push(block);
                return { ...sec, blocks: blocks.map((b, i) => ({ ...b, order: i + 1 })) };
              }),
            }
      ),
    };
  }

  /** Regenera (mock: siguiente variante determinística) y reemplaza el bloque. */
  async regenerateImage(product: PdfProduct, blockId: string): Promise<{ product: PdfProduct; image: GeneratedImage }> {
    const found = findImageBlock(product, blockId);
    if (!found) throw new Error("Bloque de imagen inexistente");
    const currentVariant = found.block.vector?.variant ?? 0;
    const nextVariant = (currentVariant + 1) % 3;
    const sectionTitle = findSectionTitle(product, found.sectionId) ?? "";
    const palette = paletteForBranding(product.branding);
    const style = styleForPreset(product.branding.preset);
    const request = {
      kind: "illustration" as ImageKind,
      topic: product.metadata.title,
      sectionTitle,
      style,
      palette,
      labels: found.block.vector?.labels ?? [sectionTitle],
      variant: nextVariant,
    };
    const result = await this.provider.generateImage(request);
    const image = result.image;
    image.id = found.block.imageId ?? `img-regen-${blockId}-v${nextVariant}`;
    image.variant = nextVariant;
    image.width = found.block.width ?? "medium";
    image.alt = found.block.alt || image.alt;
    if (image.spec) image.spec.variant = nextVariant;
    const next: PdfProduct = {
      ...product,
      chapters: product.chapters.map((ch) => ({
        ...ch,
        sections: ch.sections.map((sec) => ({
          ...sec,
          blocks: sec.blocks.map((b) =>
            b.id === blockId && b.type === "image"
              ? { ...b, vector: image.spec, alt: image.alt, width: image.width, imageId: image.id }
              : b
          ),
        })),
      })),
    };
    return { product: next, image };
  }

  /** Valida imágenes del producto (determinístico, sin random). */
  validateImages(product: PdfProduct): ImageValidationIssue[] {
    const issues: ImageValidationIssue[] = [];
    const sectionIds = new Set(product.chapters.flatMap((c) => c.sections.map((s) => s.id)));
    const validWidths: ImageWidth[] = ["small", "medium", "large"];
    for (const ch of product.chapters) {
      for (const sec of ch.sections) {
        for (const blk of sec.blocks) {
          if (blk.type !== "image") continue;
          if (!blk.vector && !blk.src.trim()) {
            issues.push({ severity: "high", description: `Imagen sin fuente en "${sec.title}"`, suggestion: "Generar vector o definir URL real" });
          }
          if (!blk.alt.trim()) {
            issues.push({ severity: "medium", description: `Imagen sin alt en "${sec.title}"`, suggestion: "Agregar texto alternativo" });
          }
          if (!sectionIds.has(sec.id)) {
            issues.push({ severity: "high", description: "Imagen con placement inexistente", suggestion: "Reasociar a una sección válida" });
          }
          if (!validWidths.includes(blk.width ?? "medium")) {
            issues.push({ severity: "low", description: `Ancho inválido en imagen de "${sec.title}"`, suggestion: "Usar small, medium o large" });
          }
          void ch;
        }
      }
    }
    return issues;
  }

  /** Estado persistido (oportunidades + imágenes generadas). */
  saveState(state: ImageGenerationState): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(stateKey(state.productId), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
    } catch {
      // no bloquea
    }
  }

  loadState(productId: string): ImageGenerationState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(stateKey(productId));
      return raw ? (JSON.parse(raw) as ImageGenerationState) : null;
    } catch {
      return null;
    }
  }
}

function labelsFor(chapterTitle: string, sectionTitle: string, topic: string): string[] {
  const t = `${chapterTitle} ${sectionTitle}`.toLowerCase();
  if (/exposici|apertura|iso|obtur/.test(t)) return ["Apertura", "Velocidad", "ISO"];
  if (/embudo|ventas|conversi/.test(t)) return ["Descubrimiento", "Interés", "Decisión", "Compra"];
  if (/presupuesto|gasto|ahorro|dinero/.test(t)) return ["Ingresos", "Gastos", "Ahorro"];
  if (/luz|hora dorada|ventana/.test(t)) return ["Hora dorada", "Ventana", "Mediodía"];
  if (/composici|tercios|fondo/.test(t)) return ["Tercios", "Líneas", "Fondo limpio"];
  if (/retrato/.test(t)) return ["Luz suave", "45 grados", "Fondo simple"];
  if (/n.mero|color|vocabulario|saludo/.test(t)) return [sectionTitle];
  void topic;
  return [chapterTitle, sectionTitle].filter(Boolean).slice(0, 4);
}

function findSectionTitle(product: PdfProduct, sectionId: string): string | null {
  for (const ch of product.chapters) {
    const sec = ch.sections.find((s) => s.id === sectionId);
    if (sec) return sec.title;
  }
  return null;
}

function findImageBlock(
  product: PdfProduct,
  blockId: string
): { block: ImageBlock; sectionId: string } | null {
  for (const ch of product.chapters) {
    for (const sec of ch.sections) {
      const blk = sec.blocks.find((b) => b.id === blockId);
      if (blk && blk.type === "image") return { block: blk, sectionId: sec.id };
    }
  }
  return null;
}

function imageToBlock(image: GeneratedImage): ImageBlock {
  return {
    id: `blk-${image.id}`,
    type: "image",
    order: 1,
    src: "",
    alt: image.alt,
    caption: image.title,
    vector: image.spec,
    width: image.width,
    imageId: image.id,
  };
}

export type { VectorImageSpec };
