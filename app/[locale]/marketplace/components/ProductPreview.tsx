// ============================================
// PRODUCT PREVIEW - vista previa real por formato
// ============================================
// Muestra contenido REAL limitado según lo definido por el creador
// (freePreviewChapters). Nada inventado.

"use client";

import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import type { GeneratedCourse } from "@/app/services/ai/types";
import type { InteractiveWebProduct } from "@/app/services/ai/interactiveWebTypes";
import type { PdfProduct } from "@/app/services/ai/pdfTypes";
import type { KitProduct } from "@/app/services/ai/kitTypes";
import { PdfPreview } from "@/app/create/builder/components/PdfPreview";

function readLocal(key: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

export function ProductPreview({ product }: { product: ProductPublication }) {
  switch (product.previewKind) {
    case "pdf": {
      const full = readLocal(product.previewRef === "ebook" ? "crow_last_ebook" : "crow_last_pdf") as PdfProduct | null;
      if (!full || full.chapters.length === 0) return <EmptyPreview />;
      const n = Math.max(1, Math.min(product.freePreviewChapters, full.chapters.length));
      return (
        <div>
          <PreviewNote text={`Vista previa: ${n} de ${full.chapters.length} capítulos`} />
          <PdfPreview product={{ ...full, chapters: full.chapters.slice(0, n) }} />
        </div>
      );
    }
    case "course": {
      const full = readLocal("crow_last_course") as GeneratedCourse | null;
      const lesson = full?.modules[0]?.lessons[0];
      if (!lesson) return <EmptyPreview />;
      return (
        <div>
          <PreviewNote text={`Vista previa: lección 1 de ${full.stats.totalLessons} (${full.modules[0].title})`} />
          <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "18px" }}>{lesson.title}</h3>
            <p style={{ color: "#aaa", fontSize: "14px", lineHeight: 1.7 }}>{lesson.content.introduction}</p>
            <p style={{ color: "#aaa", fontSize: "14px", lineHeight: 1.7 }}>{lesson.content.explanation.slice(0, 600)}...</p>
            <ul style={{ paddingLeft: "20px", color: "#aaa", fontSize: "13px" }}>
              {lesson.content.keyPoints.slice(0, 3).map((k) => <li key={k}>{k}</li>)}
            </ul>
          </div>
        </div>
      );
    }
    case "web": {
      const full = readLocal("crow_last_web") as InteractiveWebProduct | null;
      if (!full || full.sections.length === 0) return <EmptyPreview />;
      return (
        <div>
          <PreviewNote text={`Vista previa: índice de ${full.sections.length} secciones (acceso completo al comprar)`} />
          <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" }}>
            {full.sections.map((s, i) => (
              <div key={s.id} style={{ padding: "10px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ fontWeight: "bold", fontSize: "14px" }}>{i + 1}. {s.title}</div>
                <div style={{ color: "#888", fontSize: "12px" }}>{s.purpose}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "kit": {
      const full = readLocal("crow_last_kit") as KitProduct | null;
      if (!full || full.resources.length === 0) return <EmptyPreview />;
      const first = full.resources[0];
      return (
        <div>
          <PreviewNote text={`Vista previa: 1 de ${full.resources.length} recursos (${first.title})`} />
          <div style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "18px" }}>{first.title}</h3>
            <p style={{ color: "#888", fontSize: "13px" }}>{first.summary}</p>
            <div style={{ color: "#888", fontSize: "13px" }}>{first.blocks.length} bloques de contenido</div>
          </div>
        </div>
      );
    }
  }
}

function PreviewNote({ text }: { text: string }) {
  return (
    <div style={{ fontSize: "12px", color: "#a855f7", fontWeight: "bold", marginBottom: "12px" }}>
      {text}
    </div>
  );
}

function EmptyPreview() {
  return (
    <div style={{ padding: "24px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", color: "#888", fontSize: "14px" }}>
      El creador aún no habilitó vista previa de este producto.
    </div>
  );
}
