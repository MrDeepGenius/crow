// ============================================
// KIT EXPORT - archivos reales por recurso
// ============================================
// PDF reutiliza PdfDocumentGenerator (sin duplicar layout).
// TXT/CSV/XLSX/ZIP se generan con datos reales del contenido.

import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import type { KitProduct, KitResource, KitFileFormat } from "@/app/services/ai/kitTypes";
import type { PdfContentBlock, PdfProduct } from "@/app/services/ai/pdfTypes";

export function sanitizeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "recurso"
  );
}

export function folderPath(kit: KitProduct, folderId: string): string {
  const folder = kit.folders.find((f) => f.id === folderId);
  const base = folder ? folder.name : "00 — General";
  return sanitizeFileName(base);
}

// ---------- TXT ----------

export function resourceToText(resource: KitResource): string {
  const lines: string[] = [resource.title.toUpperCase(), "=".repeat(Math.min(60, resource.title.length)), ""];
  for (const b of resource.blocks) {
    switch (b.type) {
      case "heading": lines.push("", `# ${b.text}`, ""); break;
      case "subheading": lines.push("", `## ${b.text}`, ""); break;
      case "paragraph": case "highlight": lines.push(b.text, ""); break;
      case "bulletList": for (const it of b.items) lines.push(`- ${it}`); lines.push(""); break;
      case "numberedList": b.items.forEach((it, i) => lines.push(`${i + 1}. ${it}`)); lines.push(""); break;
      case "quote": lines.push(`"${b.text}" — ${b.author}`, ""); break;
      case "tip": case "warning": case "example": case "callout": case "exercise":
        lines.push(`${b.title.toUpperCase()}: ${b.text}`, ""); break;
      case "checklist":
        lines.push(`${b.title}:`); for (const it of b.items) lines.push(`[ ] ${it}`); lines.push(""); break;
      case "table":
        lines.push(`${b.title}:`); lines.push(b.headers.join(" | "));
        for (const row of b.rows) lines.push(row.join(" | ")); lines.push(""); break;
      case "divider": lines.push("---", ""); break;
      case "image": lines.push(`[Imagen: ${b.alt}]`, ""); break;
      case "reflection": lines.push(`Reflexión: ${b.question}`, ""); break;
      case "chapterSummary":
        lines.push("Puntos clave:"); for (const p of b.points) lines.push(`- ${p}`); lines.push(""); break;
    }
  }
  return lines.join("\n");
}

// ---------- CSV ----------

export function resourceToCsv(resource: KitResource): string {
  const rows: string[][] = [["Sección", "Tipo", "Contenido"]];
  const cell = (v: string): string => `"${v.replace(/"/g, '""')}"`;
  for (const b of resource.blocks) {
    switch (b.type) {
      case "table":
        rows.push([b.title, "tabla", b.headers.join(" | ")]);
        for (const r of b.rows) rows.push(["", "", r.join(" | ")]);
        break;
      case "bulletList": case "numberedList": case "checklist": {
        const items = "items" in b ? b.items : [];
        const title = "title" in b && typeof b.title === "string" ? b.title : b.type;
        for (const it of items) rows.push([title, b.type, it]);
        break;
      }
      default:
        break;
    }
  }
  if (rows.length === 1) {
    // Sin tablas/listas: exportar textos como filas para que el CSV sirva.
    for (const b of resource.blocks) {
      const text = blockPlain(b);
      if (text) rows.push([b.type, "texto", text]);
    }
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

function blockPlain(b: PdfContentBlock): string {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight": return b.text;
    case "bulletList": case "numberedList": return b.items.join("; ");
    case "quote": return `${b.text} — ${b.author}`;
    case "tip": case "warning": case "example": case "callout": case "exercise": return `${b.title}: ${b.text}`;
    case "checklist": return `${b.title}: ${b.items.join("; ")}`;
    case "table": return `${b.title}: ${b.headers.join(" | ")}`;
    case "image": return b.alt;
    case "reflection": return b.question;
    case "chapterSummary": return b.points.join("; ");
    case "divider": return "";
  }
}

// ---------- XLSX ----------

export function resourceToXlsx(resource: KitResource): Uint8Array {
  const wb = XLSX.utils.book_new();
  const tables = resource.blocks.filter((b) => b.type === "table");
  if (tables.length > 0) {
    for (const t of tables) {
      if (t.type !== "table") continue;
      const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.rows]);
      XLSX.utils.book_append_sheet(wb, ws, t.title.slice(0, 28) || "Tabla");
    }
  } else {
    const rows: (string | number)[][] = [["#", "Contenido"]];
    let n = 0;
    for (const b of resource.blocks) {
      if (b.type === "bulletList" || b.type === "numberedList" || b.type === "checklist") {
        const items = b.items;
        for (const it of items) rows.push([++n, it]);
      }
    }
    if (rows.length === 1) rows.push([1, resource.summary]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Contenido");
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown;
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}

// ---------- PDF (reutiliza el generador real) ----------

export function kitResourceToPdfProduct(resource: KitResource, kit: KitProduct): PdfProduct {
  return {
    id: `${kit.id}-${resource.id}`,
    kind: "pdf",
    version: 1,
    editorialStatus: "Listo",
    metadata: {
      title: resource.title,
      author: kit.author,
      subject: resource.summary,
      keywords: resource.title,
      creator: "Crow Market",
      createdAt: kit.createdAt,
    },
    cover: {
      title: resource.title,
      subtitle: kit.name,
      author: kit.author,
      brandLine: "CROW MARKET · KIT DE RECURSOS",
      edition: "",
    },
    branding: {
      preset: "modern",
      primaryColor: kit.branding.primaryColor,
      secondaryColor: kit.branding.secondaryColor,
      backgroundColor: "#ffffff",
      surfaceColor: kit.branding.surfaceColor,
      textColor: kit.branding.textColor,
      mutedColor: kit.branding.mutedColor,
      accentColor: kit.branding.accentColor,
      fontFamily: "Helvetica",
      headingFont: "Helvetica-Bold",
      bodyFont: "Helvetica",
      borderRadius: 8,
      showHeader: true,
      showFooter: true,
      showPageNumbers: true,
      headerStyle: "rule",
      footerStyle: "title-page",
      coverStyle: "band",
      footerText: kit.name,
    },
    presentation: { welcome: resource.summary, whatYouLearn: [], whoFor: "", howToUse: "" },
    chapters: [
      {
        id: `${resource.id}-ch1`,
        title: resource.title,
        introduction: resource.summary,
        order: 1,
        sections: [{ id: `${resource.id}-s1`, title: "Contenido", order: 1, blocks: resource.blocks }],
      },
    ],
    stats: { totalChapters: 1, totalSections: 1, totalBlocks: resource.blocks.length, totalWords: 0, estimatedPages: 1 },
    exportInfo: null,
    status: "GENERATING",
  };
}

// ---------- PORTADA + README (documentos reales) ----------

function CoverDoc({ kit }: { kit: KitProduct }): React.JSX.Element {
  return (
    <Document title={kit.name} author={kit.author} creator="Crow Market">
      <Page size="A4" style={{ backgroundColor: kit.branding.primaryColor, padding: 56, fontFamily: "Helvetica" }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: "#ffffff", marginBottom: 56 }}>CROW MARKET · KIT DE RECURSOS</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 36, color: "#ffffff", marginBottom: 14 }}>{kit.name}</Text>
        <View style={{ backgroundColor: kit.branding.secondaryColor, width: 64, height: 4, marginBottom: 16 }} />
        <Text style={{ fontSize: 13, color: "#ffffff", marginBottom: 40 }}>{kit.subtitle}</Text>
        <Text style={{ fontSize: 11, color: "#ffffff" }}>
          {kit.stats.totalResources} recursos · {kit.stats.totalFolders} carpetas
        </Text>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, color: "#ffffff", marginTop: 24 }}>{kit.author}</Text>
      </Page>
    </Document>
  );
}

function ReadmeDoc({ kit }: { kit: KitProduct }): React.JSX.Element {
  return (
    <Document title={`Guía de inicio - ${kit.name}`} author={kit.author} creator="Crow Market">
      <Page size="A4" style={{ padding: 56, fontFamily: "Helvetica", fontSize: 11, lineHeight: 1.6, color: "#18181b" }}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 22, marginBottom: 6 }}>Guía de inicio</Text>
        <Text style={{ fontSize: 12, color: "#71717a", marginBottom: 16 }}>{kit.name} · {kit.subtitle}</Text>
        <SectionTitle text="Qué contiene este kit" />
        {kit.readme.whatItContains.map((line, i) => (
          <Text key={i} style={{ marginBottom: 4 }}>• {line}</Text>
        ))}
        <SectionTitle text="Para quién es" />
        <Text style={{ marginBottom: 8 }}>{kit.readme.whoFor}</Text>
        <SectionTitle text="Cómo utilizarlo" />
        <Text style={{ marginBottom: 8 }}>{kit.readme.howToUse}</Text>
        <SectionTitle text="Orden recomendado" />
        {kit.readme.recommendedOrder.map((t, i) => (
          <Text key={i} style={{ marginBottom: 3 }}>{i + 1}. {t}</Text>
        ))}
        <SectionTitle text="Empieza por aquí" />
        <Text style={{ marginBottom: 8 }}>{kit.readme.firstResource}</Text>
        <SectionTitle text="Consejos" />
        {kit.readme.tips.map((t, i) => (
          <Text key={i} style={{ marginBottom: 3 }}>• {t}</Text>
        ))}
      </Page>
    </Document>
  );
}

function SectionTitle({ text }: { text: string }): React.JSX.Element {
  return <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 12, marginBottom: 6 }}>{text}</Text>;
}

// ---------- ZIP ----------

export interface KitZipResult {
  bytes: Uint8Array;
  fileName: string;
  fileCount: number;
}

export async function exportKitZip(
  kit: KitProduct,
  coverSvg: string | null,
  pdfFor: (resource: KitResource) => Promise<Uint8Array>
): Promise<KitZipResult> {
  const zip = new JSZip();
  const root = zip.folder(sanitizeFileName(kit.name)) ?? zip;
  let fileCount = 0;

  for (const resource of [...kit.resources].sort((a, b) => a.order - b.order)) {
    const folder = root.folder(folderPath(kit, resource.folderId)) ?? root;
    const base = sanitizeFileName(resource.title);
    for (const format of resource.formats) {
      if (format === "pdf") {
        folder.file(`${base}.pdf`, await pdfFor(resource));
        fileCount += 1;
      } else if (format === "txt") {
        folder.file(`${base}.txt`, resourceToText(resource));
        fileCount += 1;
      } else if (format === "csv") {
        folder.file(`${base}.csv`, resourceToCsv(resource));
        fileCount += 1;
      } else if (format === "xlsx") {
        folder.file(`${base}.xlsx`, resourceToXlsx(resource));
        fileCount += 1;
      }
    }
  }

  const coverPdf = await pdf(<CoverDoc kit={kit} />).toBuffer();
  root.file("PORTADA.pdf", await toBytes(coverPdf));
  fileCount += 1;
  const readmePdf = await pdf(<ReadmeDoc kit={kit} />).toBuffer();
  root.file("README.pdf", await toBytes(readmePdf));
  fileCount += 1;
  if (coverSvg) {
    root.file("portada.svg", coverSvg);
    fileCount += 1;
  }

  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes: blob, fileName: `${sanitizeFileName(kit.name)}.zip`, fileCount };
}

async function toBytes(out: unknown): Promise<Uint8Array> {
  if (out instanceof Uint8Array) return out;
  if (typeof Blob !== "undefined" && out instanceof Blob) return new Uint8Array(await out.arrayBuffer());
  if (out && typeof out === "object" && typeof (out as { on?: unknown }).on === "function") {
    const stream = out as { on: (e: string, cb: (a?: unknown) => void) => void };
    return new Promise<Uint8Array>((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on("data", (c) => {
        if (c instanceof Uint8Array) chunks.push(c);
      });
      stream.on("end", () => {
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) {
          merged.set(c, off);
          off += c.length;
        }
        resolve(merged);
      });
      stream.on("error", (e) => reject(e instanceof Error ? e : new Error(String(e))));
    });
  }
  throw new Error("Salida ZIP/PDF no reconocida");
}

export type { KitFileFormat };
