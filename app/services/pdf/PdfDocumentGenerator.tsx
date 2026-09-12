// ============================================
// PDF DOCUMENT GENERATOR - CROW MARKET
// ============================================
// Convierte PdfProduct en un archivo .PDF real (bytes válidos) usando
// @react-pdf/renderer. Solo fuentes built-in (sin descargas externas).
// Sin placeholders: portada, índice y contenido salen del producto.

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import type {
  PdfProduct,
  PdfContentBlock,
} from "@/app/services/ai/pdfTypes";
import { PdfVectorImage } from "./PdfVectorImage";

// Desactivar hyphenation externa: built-ins, sin red.
Font.registerHyphenationCallback((word) => [word]);

const BUILTIN_FONTS = new Set([
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
  "Courier",
  "Courier-Bold",
]);

function font(name: string, fallback: string): string {
  return BUILTIN_FONTS.has(name) ? name : fallback;
}

function hex(value: string, fallback: string): string {
  return /^#([0-9a-f]{6})$/i.test(value) ? value : fallback;
}

// ============================================
// DOCUMENTO
// ============================================

export function PdfDocument({ product }: { product: PdfProduct }): React.JSX.Element {
  const b = product.branding;
  const H = font(b.headingFont, "Helvetica-Bold");
  const B = font(b.bodyFont, "Helvetica");
  const primary = hex(b.primaryColor, "#1e3a8a");
  const secondary = hex(b.secondaryColor, "#b45309");
  const bg = hex(b.backgroundColor, "#ffffff");
  const surface = hex(b.surfaceColor, "#f1f5f9");
  const text = hex(b.textColor, "#0f172a");
  const muted = hex(b.mutedColor, "#64748b");
  const accent = hex(b.accentColor, "#b45309");
  const radius = Math.max(2, Math.min(32, b.borderRadius));

  const styles = StyleSheet.create({
    page: { backgroundColor: bg, paddingTop: 64, paddingBottom: 56, paddingHorizontal: 56, fontFamily: B, fontSize: 10.5, lineHeight: 1.6, color: text },
    header: { position: "absolute", top: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "flex-start", borderBottomWidth: 1, borderBottomColor: muted, paddingBottom: 6 },
    headerTitle: { fontFamily: H, fontSize: 8, color: muted },
    footer: { position: "absolute", bottom: 24, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    footerText: { fontSize: 8, color: muted },
    chapterLabel: { fontFamily: H, fontSize: 10, color: primary, marginBottom: 4 },
    chapterTitle: { fontFamily: H, fontSize: 22, color: text, marginBottom: 8 },
    intro: { fontSize: 10.5, color: muted, marginBottom: 12, lineHeight: 1.7 },
    sectionTitle: { fontFamily: H, fontSize: 14, color: text, marginTop: 14, marginBottom: 6 },
    paragraph: { fontSize: 10.5, marginBottom: 7, lineHeight: 1.65 },
    listItem: { flexDirection: "row", marginBottom: 4 },
    bullet: { width: 14, fontSize: 10.5, color: primary },
    bulletNum: { width: 18, fontSize: 10.5, fontFamily: H, color: primary },
    listText: { flex: 1, fontSize: 10.5, lineHeight: 1.6 },
    box: { borderRadius: radius - 2 < 2 ? 2 : radius - 2, padding: 10, marginVertical: 8 },
    boxTitle: { fontFamily: H, fontSize: 10, marginBottom: 4 },
    boxText: { fontSize: 10, lineHeight: 1.6 },
    quoteBox: { borderLeftWidth: 3, borderLeftColor: primary, paddingLeft: 10, marginVertical: 8 },
    quoteText: { fontSize: 11, color: text },
    quoteAuthor: { fontSize: 9, color: muted, marginTop: 4 },
    tableTitle: { fontFamily: H, fontSize: 10, marginTop: 8, marginBottom: 4 },
    tableHeaderRow: { flexDirection: "row", backgroundColor: primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    tableCell: { flex: 1, padding: 6, fontSize: 9 },
    tableHeaderCell: { flex: 1, padding: 6, fontSize: 9, fontFamily: H, color: "#ffffff" },
    tocTitle: { fontFamily: H, fontSize: 20, marginBottom: 12 },
    tocChapterRow: { flexDirection: "row", marginBottom: 6 },
    tocNum: { width: 28, fontFamily: H, fontSize: 11, color: primary },
    tocEntry: { flex: 1 },
    tocChapterTitle: { fontFamily: H, fontSize: 11 },
    tocSection: { fontSize: 9.5, color: muted, marginTop: 2 },
    summaryBox: { backgroundColor: surface, borderRadius: 6, padding: 10, marginTop: 10 },
    checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    checkBox: { width: 9, height: 9, borderWidth: 1, borderColor: muted, marginRight: 7 },
    image: { width: "100%", borderRadius: 4, marginVertical: 8 },
    caption: { fontSize: 8.5, color: muted, textAlign: "center", marginBottom: 8 },
  });

  const showChrome = b.showHeader || (b.showFooter && b.showPageNumbers);
  const headerText = product.metadata.title;
  const footerLabel = b.footerText.trim() || product.metadata.title;

  function chrome(): React.JSX.Element | null {
    if (!showChrome) return null;
    return (
      <>
        {b.showHeader && (
          <View style={styles.header} fixed>
            <Text style={styles.headerTitle} render={({ pageNumber }: { pageNumber: number }) => (pageNumber <= 2 ? "" : headerText)} />
          </View>
        )}
        {b.showFooter && b.showPageNumbers && (
          <View style={styles.footer} fixed>
            <Text style={styles.footerText} render={({ pageNumber }: { pageNumber: number }) => (pageNumber <= 2 ? "" : footerLabel)} />
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                pageNumber <= 2 ? "" : `Página ${pageNumber - 2} de ${totalPages - 2}`
              }
            />
          </View>
        )}
      </>
    );
  }

  function block(blk: PdfContentBlock): React.JSX.Element | null {
    switch (blk.type) {
      case "heading":
        return <Text style={{ fontFamily: H, fontSize: 16, marginTop: 12, marginBottom: 6 }}>{blk.text}</Text>;
      case "subheading":
        return <Text style={styles.sectionTitle}>{blk.text}</Text>;
      case "paragraph":
        return <Text style={styles.paragraph}>{blk.text}</Text>;
      case "bulletList":
        return (
          <View style={{ marginBottom: 7 }}>
            {blk.items.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      case "numberedList":
        return (
          <View style={{ marginBottom: 7 }}>
            {blk.items.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bulletNum}>{i + 1}.</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      case "quote":
        return (
          <View style={styles.quoteBox}>
            <Text style={styles.quoteText}>"{blk.text}"</Text>
            <Text style={styles.quoteAuthor}>— {blk.author}</Text>
          </View>
        );
      case "highlight":
        return (
          <View style={{ ...styles.box, backgroundColor: "#eef2ff", borderLeftWidth: 3, borderLeftColor: primary }}>
            <Text style={styles.boxText}>{blk.text}</Text>
          </View>
        );
      case "tip":
        return (
          <View style={{ ...styles.box, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac" }}>
            <Text style={{ ...styles.boxTitle, color: "#15803d" }}>{blk.title}</Text>
            <Text style={styles.boxText}>{blk.text}</Text>
          </View>
        );
      case "warning":
        return (
          <View style={{ ...styles.box, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5" }}>
            <Text style={{ ...styles.boxTitle, color: "#b91c1c" }}>{blk.title}</Text>
            <Text style={styles.boxText}>{blk.text}</Text>
          </View>
        );
      case "example":
        return (
          <View style={{ ...styles.box, backgroundColor: surface, borderWidth: 1, borderColor: "#e2e8f0" }}>
            <Text style={{ ...styles.boxTitle, color: primary }}>{blk.title}</Text>
            <Text style={styles.boxText}>{blk.text}</Text>
          </View>
        );
      case "checklist":
        return (
          <View style={{ marginBottom: 7 }}>
            <Text style={{ fontFamily: H, fontSize: 10, marginBottom: 5 }}>{blk.title}</Text>
            {blk.items.map((item, i) => (
              <View key={i} style={styles.checkRow}>
                <View style={styles.checkBox} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>
        );
      case "table":
        return (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.tableTitle}>{blk.title}</Text>
            <View style={styles.tableHeaderRow}>
              {blk.headers.map((h, i) => (
                <Text key={i} style={styles.tableHeaderCell}>{h}</Text>
              ))}
            </View>
            {blk.rows.map((row, i) => (
              <View key={i} style={styles.tableRow} wrap={false}>
                {row.map((cell, j) => (
                  <Text key={j} style={styles.tableCell}>{cell}</Text>
                ))}
              </View>
            ))}
          </View>
        );
      case "callout":
        return (
          <View style={{ ...styles.box, backgroundColor: primary, borderRadius: 6 }}>
            <Text style={{ ...styles.boxTitle, color: "#ffffff" }}>{blk.title}</Text>
            <Text style={{ ...styles.boxText, color: "#ffffff" }}>{blk.text}</Text>
          </View>
        );
      case "divider":
        return <View style={{ borderBottomWidth: 1, borderBottomColor: "#e2e8f0", marginVertical: 10 }} />;
      case "image": {
        const widthPercent = blk.width === "small" ? 45 : blk.width === "large" ? 100 : 70;
        if (blk.vector) {
          return (
            <View style={{ alignItems: "center" }}>
              <View style={{ width: `${widthPercent}%` }}>
                <PdfVectorImage spec={blk.vector} widthPercent={100} />
              </View>
              {blk.caption.trim() && <Text style={styles.caption}>{blk.caption}</Text>}
            </View>
          );
        }
        if (!blk.src.trim()) return null;
        return (
          <View style={{ alignItems: "center" }}>
            <View style={{ width: `${widthPercent}%` }}>
              <Image style={styles.image} src={blk.src} />
            </View>
            {blk.caption.trim() && <Text style={styles.caption}>{blk.caption}</Text>}
          </View>
        );
      }
      case "exercise":
        return (
          <View style={{ ...styles.box, borderWidth: 1, borderColor: accent }}>
            <Text style={{ ...styles.boxTitle, color: accent }}>{blk.title}</Text>
            <Text style={styles.boxText}>{blk.text}</Text>
          </View>
        );
      case "reflection":
        return (
          <View style={{ ...styles.box, backgroundColor: surface }}>
            <Text style={{ ...styles.boxTitle, color: secondary }}>Para reflexionar</Text>
            <Text style={styles.boxText}>{blk.question}</Text>
          </View>
        );
      case "chapterSummary":
        return (
          <View style={styles.summaryBox}>
            <Text style={{ fontFamily: H, fontSize: 10, marginBottom: 5 }}>Puntos clave del capítulo</Text>
            {blk.points.map((p, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.listText}>{p}</Text>
              </View>
            ))}
          </View>
        );
    }
  }

  return (
    <Document
      title={product.metadata.title}
      author={product.metadata.author}
      subject={product.metadata.subject}
      keywords={product.metadata.keywords}
      creator={product.metadata.creator}
    >
      <CoverPage product={product} />
      <Page size="A4" style={styles.page}>
        {chrome()}
        <Text style={styles.chapterLabel}>PRESENTACIÓN</Text>
        <Text style={styles.chapterTitle}>Antes de empezar</Text>
        <Text style={styles.intro}>{product.presentation.welcome}</Text>
        <Text style={styles.sectionTitle}>Qué aprenderás</Text>
        {product.presentation.whatYouLearn.map((item, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={styles.bulletNum}>{i + 1}.</Text>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Para quién es</Text>
        <Text style={styles.paragraph}>{product.presentation.whoFor}</Text>
        <Text style={styles.sectionTitle}>Cómo usar este ebook</Text>
        <Text style={styles.paragraph}>{product.presentation.howToUse}</Text>
      </Page>
      <Page size="A4" style={styles.page}>
        {chrome()}
        <Text style={styles.tocTitle}>Índice</Text>
        {product.chapters.map((ch, i) => (
          <View key={ch.id} style={styles.tocChapterRow}>
            <Text style={styles.tocNum}>{i + 1}</Text>
            <View style={styles.tocEntry}>
              <Text style={styles.tocChapterTitle}>{ch.title}</Text>
              {ch.sections.map((s, j) => (
                <Text key={s.id} style={styles.tocSection}>
                  {i + 1}.{j + 1}  {s.title}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </Page>
      {product.chapters.map((ch, i) => (
        <Page key={ch.id} size="A4" style={styles.page}>
          {chrome()}
          <Text style={styles.chapterLabel}>CAPÍTULO {i + 1}</Text>
          <Text style={styles.chapterTitle}>{ch.title}</Text>
          {ch.introduction.split("\n\n").map((p, k) => (
            <Text key={k} style={styles.intro}>{p}</Text>
          ))}
          {ch.sections.map((s) => (
            <View key={s.id}>
              {s.blocks.map((blk) => (
                <React.Fragment key={blk.id}>{block(blk)}</React.Fragment>
              ))}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

function CoverPage({ product }: { product: PdfProduct }): React.JSX.Element {
  const b = product.branding;
  const H = font(b.headingFont, "Helvetica-Bold");
  const B = font(b.bodyFont, "Helvetica");
  const primary = hex(b.primaryColor, "#1e3a8a");
  const secondary = hex(b.secondaryColor, "#b45309");
  const cover = product.cover;
  const ink = hex(b.textColor, "#0f172a");
  const paper = hex(b.backgroundColor, "#ffffff");

  if (b.coverStyle === "classic") {
    return (
      <Page size="A4" style={{ backgroundColor: paper, padding: 64, fontFamily: B }}>
        <Text style={{ fontFamily: H, fontSize: 10, color: hex(b.mutedColor, "#64748b"), marginBottom: 40 }}>{cover.brandLine}</Text>
        <View style={{ borderTopWidth: 2, borderTopColor: primary, paddingTop: 24, marginBottom: 16 }} />
        <Text style={{ fontFamily: H, fontSize: 34, color: ink, marginBottom: 12 }}>{cover.title}</Text>
        <Text style={{ fontSize: 13, color: hex(b.mutedColor, "#64748b"), marginBottom: 48 }}>{cover.subtitle}</Text>
        <Text style={{ fontSize: 11, color: ink }}>{cover.author}</Text>
        <Text style={{ fontSize: 9, color: hex(b.mutedColor, "#64748b"), marginTop: 4 }}>{cover.edition}</Text>
      </Page>
    );
  }

  if (b.coverStyle === "band") {
    return (
      <Page size="A4" style={{ backgroundColor: paper, fontFamily: B }}>
        <View style={{ backgroundColor: primary, padding: 40, paddingTop: 72 }}>
          <Text style={{ fontFamily: H, fontSize: 9, color: "#ffffff", marginBottom: 16 }}>{cover.brandLine}</Text>
          <Text style={{ fontFamily: H, fontSize: 32, color: "#ffffff", marginBottom: 10 }}>{cover.title}</Text>
          <Text style={{ fontSize: 12, color: "#ffffff" }}>{cover.subtitle}</Text>
        </View>
        <View style={{ padding: 40 }}>
          <Text style={{ fontSize: 11, color: ink }}>{cover.author}</Text>
          <Text style={{ fontSize: 9, color: hex(b.mutedColor, "#64748b"), marginTop: 4 }}>{cover.edition}</Text>
        </View>
      </Page>
    );
  }

  return (
    <Page size="A4" style={{ backgroundColor: primary, padding: 56, fontFamily: B }}>
      <Text style={{ fontFamily: H, fontSize: 10, color: "#ffffff", marginBottom: 56 }}>{cover.brandLine}</Text>
      <Text style={{ fontFamily: H, fontSize: 36, color: "#ffffff", marginBottom: 14 }}>{cover.title}</Text>
      <View style={{ backgroundColor: secondary, width: 64, height: 4, marginBottom: 16 }} />
      <Text style={{ fontSize: 13, color: "#ffffff", marginBottom: 64 }}>{cover.subtitle}</Text>
      <Text style={{ fontFamily: H, fontSize: 12, color: "#ffffff" }}>{cover.author}</Text>
      <Text style={{ fontSize: 9, color: "#ffffff", marginTop: 4 }}>{cover.edition}</Text>
    </Page>
  );
}

// ============================================
// EXPORTACIÓN A BYTES REALES
// ============================================

export interface PdfBytesResult {
  bytes: Uint8Array;
  pageCount: number;
  byteSize: number;
}

export function isValidPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  );
}

/** Cuenta páginas reales del archivo contando objetos /Type /Page. */
export function countPdfPages(bytes: Uint8Array): number {
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 0;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

interface ReadableLike {
  on: (event: string, cb: (arg?: unknown) => void) => void;
}

function isStreamLike(out: unknown): out is ReadableLike {
  return !!out && typeof out === "object" && typeof (out as ReadableLike).on === "function";
}

function streamToBytes(stream: ReadableLike): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (c) => {
      if (c instanceof Uint8Array) chunks.push(c);
    });
    stream.on("end", () => {
      try {
        resolve(concatBytes(chunks));
      } catch (err) {
        reject(err);
      }
    });
    stream.on("error", (err) => reject(err instanceof Error ? err : new Error(String(err))));
  });
}

async function toUint8Array(out: unknown): Promise<Uint8Array> {
  if (out instanceof Uint8Array) return out;
  if (typeof Blob !== "undefined" && out instanceof Blob) {
    return new Uint8Array(await out.arrayBuffer());
  }
  if (isStreamLike(out)) return streamToBytes(out);
  if (out && typeof out === "object" && "data" in out) {
    const data = (out as { data: unknown }).data;
    if (Array.isArray(data)) return new Uint8Array(data as number[]);
  }
  throw new Error("Formato de salida del motor PDF no reconocido");
}

export async function generatePdfBytes(product: PdfProduct): Promise<PdfBytesResult> {
  const instance = pdf(<PdfDocument product={product} />);
  const out: unknown = await instance.toBuffer();
  const bytes = await toUint8Array(out);
  if (!isValidPdfBytes(bytes)) {
    throw new Error("El motor generó bytes inválidos (sin firma %PDF)");
  }
  return { bytes, pageCount: countPdfPages(bytes), byteSize: bytes.byteLength };
}

export async function generatePdfBlob(product: PdfProduct): Promise<Blob> {
  const instance = pdf(<PdfDocument product={product} />);
  const blob = await instance.toBlob();
  if (!isValidPdfBytes(new Uint8Array(await blob.slice(0, 8).arrayBuffer()))) {
    throw new Error("El motor generó un Blob inválido (sin firma %PDF)");
  }
  return blob;
}
