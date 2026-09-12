// ============================================
// KIT PREVIEW - vista previa del producto
// ============================================
// Portada (arte SVG del Image Engine), README y render de recursos.
// "Vista previa del Kit": así lo verá el comprador.

"use client";

import type { KitProduct, KitResource } from "@/app/services/ai/kitTypes";
import type { PdfContentBlock } from "@/app/services/ai/pdfTypes";

export function KitCoverPreview({
  product,
  coverSvg,
}: {
  product: KitProduct;
  coverSvg: string | null;
}) {
  return (
    <div style={{ borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
      {coverSvg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(coverSvg)}`} alt={`Portada de ${product.name}`} style={{ width: "100%", display: "block" }} />
      ) : (
        <div style={{ background: product.branding.primaryColor, color: "#fff", padding: "48px 36px" }}>
          <div style={{ fontSize: "11px", opacity: 0.85, marginBottom: "24px" }}>CROW MARKET · KIT DE RECURSOS</div>
          <h1 style={{ margin: "0 0 10px", fontSize: "32px" }}>{product.name}</h1>
          <p style={{ opacity: 0.9, margin: "0 0 24px" }}>{product.subtitle}</p>
          <div style={{ fontSize: "13px" }}>{product.stats.totalResources} recursos · {product.stats.totalFolders} carpetas</div>
        </div>
      )}
      <div style={{ background: "#0c0c0f", padding: "20px 24px", color: "#aaa", fontSize: "13px", lineHeight: 1.6 }}>
        {product.description}
        <div style={{ marginTop: "8px", color: "#666", fontSize: "12px" }}>Por {product.author}</div>
      </div>
    </div>
  );
}

export function KitReadmePreview({ product }: { product: KitProduct }) {
  const r = product.readme;
  return (
    <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "17px" }}>Guía de inicio</h3>
      <ReadmeBlock title="Qué contiene" items={r.whatItContains} />
      <p style={{ color: "#aaa", fontSize: "13px" }}><strong style={{ color: "#fff" }}>Para quién:</strong> {r.whoFor}</p>
      <p style={{ color: "#aaa", fontSize: "13px" }}><strong style={{ color: "#fff" }}>Cómo usarlo:</strong> {r.howToUse}</p>
      <p style={{ color: "#aaa", fontSize: "13px" }}><strong style={{ color: "#fff" }}>Empieza por:</strong> {r.firstResource}</p>
      <ReadmeBlock title="Consejos" items={r.tips} />
    </div>
  );
}

function ReadmeBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", marginBottom: "6px" }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: "20px", color: "#aaa", fontSize: "13px" }}>
        {items.map((it, i) => <li key={i} style={{ marginBottom: "4px" }}>{it}</li>)}
      </ul>
    </div>
  );
}

export function KitResourcePreview({ resource }: { resource: KitResource }) {
  return (
    <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" }}>
      <div style={{ color: "#a855f7", fontSize: "11px", fontWeight: "bold", marginBottom: "6px" }}>
        {resource.kind.toUpperCase()} · {resource.formats.join(" / ").toUpperCase()}
      </div>
      <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>{resource.title}</h2>
      <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>{resource.summary}</p>
      {resource.blocks.map((b) => (
        <KitBlock key={b.id} block={b} />
      ))}
    </div>
  );
}

function KitBlock({ block: b }: { block: PdfContentBlock }) {
  const muted: React.CSSProperties = { color: "#aaa", fontSize: "14px", lineHeight: 1.7 };
  switch (b.type) {
    case "heading": return <h3 style={{ fontSize: "18px", margin: "16px 0 8px" }}>{b.text}</h3>;
    case "subheading": return <h4 style={{ fontSize: "15px", margin: "14px 0 8px" }}>{b.text}</h4>;
    case "paragraph": case "highlight": return <p style={muted}>{b.text}</p>;
    case "bulletList": return <ul style={{ ...muted, paddingLeft: "20px" }}>{b.items.map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case "numberedList": return <ol style={{ ...muted, paddingLeft: "20px" }}>{b.items.map((it, i) => <li key={i}>{it}</li>)}</ol>;
    case "quote": return <blockquote style={{ borderLeft: "3px solid #7c3aed", margin: "12px 0", paddingLeft: "12px" }}><p style={{ margin: 0 }}>"{b.text}"</p><cite style={{ fontSize: "12px", color: "#666" }}>— {b.author}</cite></blockquote>;
    case "tip": return <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "8px", padding: "12px", margin: "10px 0", fontSize: "13px" }}><strong>{b.title}</strong><p style={{ margin: "6px 0 0" }}>{b.text}</p></div>;
    case "warning": return <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "8px", padding: "12px", margin: "10px 0", fontSize: "13px" }}><strong>{b.title}</strong><p style={{ margin: "6px 0 0" }}>{b.text}</p></div>;
    case "example": case "callout": case "exercise":
      return <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "8px", padding: "12px", margin: "10px 0", fontSize: "13px" }}><strong>{b.title}</strong><p style={{ margin: "6px 0 0" }}>{b.text}</p></div>;
    case "checklist":
      return <div style={{ margin: "10px 0" }}><strong style={{ fontSize: "13px" }}>{b.title}</strong>{b.items.map((it, i) => <label key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#aaa", marginTop: "6px" }}><input type="checkbox" /> {it}</label>)}</div>;
    case "table":
      return <div style={{ margin: "10px 0", overflowX: "auto" }}><strong style={{ fontSize: "13px" }}>{b.title}</strong><table style={{ width: "100%", borderCollapse: "collapse", marginTop: "8px", fontSize: "13px" }}><thead><tr>{b.headers.map((h, i) => <th key={i} style={{ background: "#7c3aed", color: "#fff", padding: "8px", textAlign: "left" }}>{h}</th>)}</tr></thead><tbody>{b.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "8px" }}>{cell}</td>)}</tr>)}</tbody></table></div>;
    case "divider": return <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "14px 0" }} />;
    case "image": return <div style={{ border: "1px dashed rgba(255,255,255,0.2)", borderRadius: "8px", padding: "16px", color: "#888", fontSize: "13px", margin: "10px 0" }}>Imagen: {b.alt || "sin descripción"}</div>;
    case "reflection": return <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", margin: "10px 0", fontSize: "13px" }}><strong>Reflexión:</strong> {b.question}</div>;
    case "chapterSummary": return <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", margin: "10px 0", fontSize: "13px" }}><strong>Puntos clave</strong><ul style={{ paddingLeft: "20px", margin: "8px 0 0", color: "#aaa" }}>{b.points.map((p, i) => <li key={i}>{p}</li>)}</ul></div>;
  }
}
