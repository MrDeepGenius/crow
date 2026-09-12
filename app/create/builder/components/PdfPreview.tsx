// ============================================
// PDF PREVIEW - CROW MARKET
// ============================================
// Vista previa HTML que representa fielmente el documento final
// (portada, índice numerado, capítulos, bloques, header/footer).
// Las imágenes sin URL real muestran un placeholder elegante SOLO aquí;
// en el PDF se omiten.

"use client";

import type { PdfProduct, PdfContentBlock } from "@/app/services/ai/pdfTypes";
import { svgForImage } from "@/app/services/images/svgImageRenderer";
import { IMAGE_WIDTHS } from "@/app/services/images/imageTypes";

export function PdfPreview({ product }: { product: PdfProduct }) {
  const b = product.branding;
  const page: React.CSSProperties = {
    background: b.backgroundColor,
    color: b.textColor,
    fontFamily: b.fontFamily,
    borderRadius: b.borderRadius,
    overflow: "hidden",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PreviewCover product={product} />
      <div style={{ ...page, padding: "32px" }}>
        <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
          PRESENTACIÓN
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: "22px" }}>Antes de empezar</h2>
        <p style={{ color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 }}>{product.presentation.welcome}</p>
        <h4 style={{ fontSize: "15px", margin: "14px 0 8px" }}>Qué aprenderás</h4>
        <ol style={{ paddingLeft: "20px", margin: 0, fontSize: "14px", color: b.mutedColor }}>
          {product.presentation.whatYouLearn.map((item, i) => <li key={i}>{item}</li>)}
        </ol>
        <h4 style={{ fontSize: "15px", margin: "14px 0 8px" }}>Para quién es</h4>
        <p style={{ color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 }}>{product.presentation.whoFor}</p>
        <h4 style={{ fontSize: "15px", margin: "14px 0 8px" }}>Cómo usar este ebook</h4>
        <p style={{ color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 }}>{product.presentation.howToUse}</p>
      </div>
      <div style={{ ...page, padding: "32px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "22px" }}>Índice</h2>
        {product.chapters.map((ch, i) => (
          <div key={ch.id} style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
            <strong style={{ color: b.primaryColor, minWidth: "24px" }}>{i + 1}</strong>
            <div>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>{ch.title}</div>
              {ch.sections.map((s, j) => (
                <div key={s.id} style={{ color: b.mutedColor, fontSize: "12px", marginTop: "2px" }}>
                  {i + 1}.{j + 1} {s.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {product.chapters.map((ch, i) => (
        <div key={ch.id} style={{ ...page, padding: "32px" }}>
          <div style={{ color: b.primaryColor, fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
            CAPÍTULO {i + 1}
          </div>
          <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>{ch.title}</h2>
          {ch.introduction.split("\n\n").map((p, k) => (
            <p key={k} style={{ color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 }}>{p}</p>
          ))}
          {ch.sections.map((s) => (
            <div key={s.id}>
              {s.blocks.map((blk) => (
                <PreviewBlock key={blk.id} block={blk} product={product} />
              ))}
            </div>
          ))}
        </div>
      ))}
      <div style={{ textAlign: "center", color: b.mutedColor, fontSize: "12px" }}>
        {b.showFooter !== false && (
          <span>{b.footerText || product.metadata.title}{b.showPageNumbers ? " · paginado en el PDF" : ""}</span>
        )}
      </div>
    </div>
  );
}

function PreviewCover({ product }: { product: PdfProduct }) {
  const b = product.branding;
  const c = product.cover;
  const base: React.CSSProperties = {
    borderRadius: b.borderRadius,
    padding: "48px 40px",
    fontFamily: b.fontFamily,
    overflow: "hidden",
  };
  if (b.coverStyle === "classic") {
    return (
      <div style={{ ...base, background: b.backgroundColor, color: b.textColor }}>
        <div style={{ fontSize: "11px", color: b.mutedColor, marginBottom: "32px" }}>{c.brandLine}</div>
        <div style={{ borderTop: `2px solid ${b.primaryColor}`, paddingTop: "20px", marginBottom: "12px" }} />
        <h1 style={{ margin: "0 0 10px", fontSize: "34px" }}>{c.title}</h1>
        <p style={{ color: b.mutedColor, fontSize: "14px", margin: "0 0 40px" }}>{c.subtitle}</p>
        <div style={{ fontSize: "13px" }}>{c.author}</div>
        <div style={{ fontSize: "11px", color: b.mutedColor, marginTop: "4px" }}>{c.edition}</div>
      </div>
    );
  }
  if (b.coverStyle === "band") {
    return (
      <div style={{ ...base, background: b.backgroundColor, color: b.textColor, padding: 0 }}>
        <div style={{ background: b.primaryColor, color: "#fff", padding: "48px 40px" }}>
          <div style={{ fontSize: "11px", opacity: 0.85, marginBottom: "12px" }}>{c.brandLine}</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "32px" }}>{c.title}</h1>
          <p style={{ margin: 0, opacity: 0.9 }}>{c.subtitle}</p>
        </div>
        <div style={{ padding: "32px 40px" }}>
          <div style={{ fontSize: "13px" }}>{c.author}</div>
          <div style={{ fontSize: "11px", color: b.mutedColor, marginTop: "4px" }}>{c.edition}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...base, background: b.primaryColor, color: "#fff" }}>
      <div style={{ fontSize: "11px", opacity: 0.85, marginBottom: "48px" }}>{c.brandLine}</div>
      <h1 style={{ margin: "0 0 12px", fontSize: "36px" }}>{c.title}</h1>
      <div style={{ background: b.secondaryColor, width: "64px", height: "4px", marginBottom: "14px" }} />
      <p style={{ opacity: 0.92, margin: "0 0 56px" }}>{c.subtitle}</p>
      <div style={{ fontWeight: "bold" }}>{c.author}</div>
      <div style={{ fontSize: "11px", opacity: 0.8, marginTop: "4px" }}>{c.edition}</div>
    </div>
  );
}

function PreviewBlock({ block: blk, product }: { block: PdfContentBlock; product: PdfProduct }) {
  const b = product.branding;
  const muted: React.CSSProperties = { color: b.mutedColor, fontSize: "14px", lineHeight: 1.7 };
  switch (blk.type) {
    case "heading": return <h3 style={{ fontSize: "19px", margin: "18px 0 8px" }}>{blk.text}</h3>;
    case "subheading": return <h4 style={{ fontSize: "16px", margin: "16px 0 8px" }}>{blk.text}</h4>;
    case "paragraph": return <p style={muted}>{blk.text}</p>;
    case "bulletList":
      return <ul style={{ ...muted, paddingLeft: "20px" }}>{blk.items.map((it, i) => <li key={i} style={{ marginBottom: "4px" }}>{it}</li>)}</ul>;
    case "numberedList":
      return <ol style={{ ...muted, paddingLeft: "20px" }}>{blk.items.map((it, i) => <li key={i} style={{ marginBottom: "4px" }}>{it}</li>)}</ol>;
    case "quote":
      return (
        <blockquote style={{ borderLeft: `3px solid ${b.primaryColor}`, margin: "12px 0", paddingLeft: "12px" }}>
          <p style={{ margin: 0 }}>"{blk.text}"</p>
          <cite style={{ ...muted, fontSize: "12px" }}>— {blk.author}</cite>
        </blockquote>
      );
    case "highlight":
      return <div style={{ background: `${b.primaryColor}14`, borderLeft: `3px solid ${b.primaryColor}`, borderRadius: "6px", padding: "12px", margin: "10px 0", fontSize: "14px" }}>{blk.text}</div>;
    case "tip":
      return <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "12px", margin: "10px 0" }}><strong style={{ color: "#15803d", fontSize: "13px" }}>{blk.title}</strong><p style={{ margin: "6px 0 0", fontSize: "13px", color: "#166534" }}>{blk.text}</p></div>;
    case "warning":
      return <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "12px", margin: "10px 0" }}><strong style={{ color: "#b91c1c", fontSize: "13px" }}>{blk.title}</strong><p style={{ margin: "6px 0 0", fontSize: "13px", color: "#7f1d1d" }}>{blk.text}</p></div>;
    case "example":
      return <div style={{ background: b.surfaceColor, border: "1px solid rgba(0,0,0,0.08)", borderRadius: "8px", padding: "12px", margin: "10px 0" }}><strong style={{ color: b.primaryColor, fontSize: "13px" }}>{blk.title}</strong><p style={{ margin: "6px 0 0", fontSize: "13px", ...muted }}>{blk.text}</p></div>;
    case "checklist":
      return (
        <div style={{ margin: "10px 0" }}>
          <strong style={{ fontSize: "13px" }}>{blk.title}</strong>
          {blk.items.map((it, i) => (
            <label key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: b.mutedColor, marginTop: "6px" }}>
              <input type="checkbox" /> {it}
            </label>
          ))}
        </div>
      );
    case "table":
      return (
        <div style={{ margin: "10px 0", overflowX: "auto" }}>
          <strong style={{ fontSize: "13px" }}>{blk.title}</strong>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "13px" }}>
            <thead><tr>{blk.headers.map((h, i) => <th key={i} style={{ background: b.primaryColor, color: "#fff", padding: "8px", textAlign: "left" }}>{h}</th>)}</tr></thead>
            <tbody>{blk.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "8px" }}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "callout":
      return <div style={{ background: b.primaryColor, color: "#fff", borderRadius: "8px", padding: "14px", margin: "10px 0" }}><strong>{blk.title}</strong><p style={{ margin: "6px 0 0", fontSize: "13px", opacity: 0.95 }}>{blk.text}</p></div>;
    case "divider": return <hr style={{ border: "none", borderTop: "1px solid rgba(0,0,0,0.1)", margin: "14px 0" }} />;
    case "image": {
      const width = `${IMAGE_WIDTHS[blk.width ?? "medium"]}%`;
      if (blk.vector) {
        const svg = svgForImage(blk.vector);
        return (
          <figure style={{ margin: "10px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
              alt={blk.alt}
              style={{ width, borderRadius: "6px" }}
            />
            {blk.caption.trim() && <figcaption style={{ fontSize: "12px", color: b.mutedColor, textAlign: "center", marginTop: "6px" }}>{blk.caption}</figcaption>}
          </figure>
        );
      }
      if (!blk.src.trim()) {
        return (
          <div style={{ border: "1px dashed rgba(0,0,0,0.2)", borderRadius: "8px", padding: "24px", textAlign: "center", color: b.mutedColor, fontSize: "13px", margin: "10px 0" }}>
            Imagen pendiente — agrega una URL real desde el editor
            {blk.alt ? ` (${blk.alt})` : ""}
          </div>
        );
      }
      return (
        <figure style={{ margin: "10px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blk.src} alt={blk.alt} style={{ width, borderRadius: "6px" }} />
          {blk.caption.trim() && <figcaption style={{ fontSize: "12px", color: b.mutedColor, textAlign: "center", marginTop: "6px" }}>{blk.caption}</figcaption>}
        </figure>
      );
    }
    case "exercise":
      return <div style={{ border: `1px dashed ${b.accentColor}`, borderRadius: "8px", padding: "12px", margin: "10px 0" }}><strong style={{ color: b.accentColor, fontSize: "13px" }}>{blk.title}</strong><p style={{ margin: "6px 0 0", fontSize: "13px" }}>{blk.text}</p></div>;
    case "reflection":
      return <div style={{ background: b.surfaceColor, borderRadius: "8px", padding: "12px", margin: "10px 0" }}><strong style={{ color: b.secondaryColor, fontSize: "13px" }}>Para reflexionar</strong><p style={{ margin: "6px 0 0", fontSize: "13px" }}>{blk.question}</p></div>;
    case "chapterSummary":
      return (
        <div style={{ background: b.surfaceColor, borderRadius: "8px", padding: "12px", margin: "12px 0" }}>
          <strong style={{ fontSize: "13px" }}>Puntos clave del capítulo</strong>
          <ul style={{ paddingLeft: "20px", margin: "8px 0 0", fontSize: "13px", color: b.mutedColor }}>{blk.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      );
  }
}
