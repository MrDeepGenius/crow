// ============================================
// PDF EDITOR - CROW MARKET
// ============================================
// Editor básico: título, subtítulo, autor, capítulos, textos, bloques
// (agregar/eliminar/ordenar), colores, estilo, portada, imágenes por URL,
// header/footer. Todo cambio persiste via onProduct.

"use client";

import { useRef, useState } from "react";
import type {
  PdfProduct,
  PdfChapter,
  PdfSection,
  PdfContentBlock,
  PdfBlockType,
  PdfStylePreset,
  PdfTextAction,
} from "@/app/services/ai/pdfTypes";

const FONT: string = '"Inter", system-ui, sans-serif';

export function PdfEditor({
  product,
  onProduct,
  onRegenerateImage,
  onRewriteBlock,
  onRegenerateSection,
  onRegenerateCover,
  working,
}: {
  product: PdfProduct;
  onProduct: (next: PdfProduct) => void;
  onRegenerateImage?: (blockId: string) => void;
  onRewriteBlock?: (blockId: string, action: PdfTextAction) => void;
  onRegenerateSection?: (chapterId: string, sectionId: string) => void;
  onRegenerateCover?: () => void;
  working?: boolean;
}) {
  const idCounter = useRef(0);
  const [newBlockType, setNewBlockType] = useState<Record<string, PdfBlockType>>({});

  const uid = (prefix: string): string => {
    idCounter.current += 1;
    return `${prefix}-user-${Date.now()}-${idCounter.current}`;
  };

  const set = (patch: Partial<PdfProduct>): void => onProduct({ ...product, ...patch });

  const renumberChapters = (chapters: PdfChapter[]): PdfChapter[] =>
    chapters.map((c, i) => ({ ...c, order: i + 1 }));

  const updateChapter = (id: string, patch: Partial<PdfChapter>): void =>
    set({ chapters: product.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const moveChapter = (index: number, dir: -1 | 1): void => {
    const next = [...product.chapters];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [m] = next.splice(index, 1);
    next.splice(j, 0, m);
    set({ chapters: renumberChapters(next) });
  };

  const deleteChapter = (id: string): void =>
    set({ chapters: renumberChapters(product.chapters.filter((c) => c.id !== id)) });

  const addChapter = (): void => {
    const id = uid("ch");
    set({
      chapters: [
        ...product.chapters,
        { id, title: "Nuevo capítulo", introduction: "", order: product.chapters.length + 1, sections: [] },
      ],
    });
  };

  const updateSection = (chapterId: string, sectionId: string, patch: Partial<PdfSection>): void =>
    set({
      chapters: product.chapters.map((c) =>
        c.id === chapterId
          ? { ...c, sections: c.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)) }
          : c
      ),
    });

  const moveSection = (chapterId: string, index: number, dir: -1 | 1): void => {
    const ch = product.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    const next = [...ch.sections];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [m] = next.splice(index, 1);
    next.splice(j, 0, m);
    updateSectionList(chapterId, next.map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateSectionList = (chapterId: string, sections: PdfSection[]): void =>
    set({ chapters: product.chapters.map((c) => (c.id === chapterId ? { ...c, sections } : c)) });

  const deleteSection = (chapterId: string, sectionId: string): void => {
    const ch = product.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    updateSectionList(
      chapterId,
      ch.sections.filter((s) => s.id !== sectionId).map((s, i) => ({ ...s, order: i + 1 }))
    );
  };

  const addSection = (chapterId: string): void => {
    const ch = product.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    updateSectionList(chapterId, [
      ...ch.sections,
      { id: uid("sec"), title: "Nueva sección", order: ch.sections.length + 1, blocks: [] },
    ]);
  };

  const setBlocks = (chapterId: string, sectionId: string, blocks: PdfContentBlock[]): void => {
    const ch = product.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    updateSectionList(
      chapterId,
      ch.sections.map((s) =>
        s.id === sectionId ? { ...s, blocks: blocks.map((blk, i) => ({ ...blk, order: i + 1 })) } : s
      )
    );
  };

  const updateBlock = (chapterId: string, sectionId: string, block: PdfContentBlock): void => {
    const sec = product.chapters.find((c) => c.id === chapterId)?.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setBlocks(chapterId, sectionId, sec.blocks.map((blk) => (blk.id === block.id ? block : blk)));
  };

  const deleteBlock = (chapterId: string, sectionId: string, blockId: string): void => {
    const sec = product.chapters.find((c) => c.id === chapterId)?.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    setBlocks(chapterId, sectionId, sec.blocks.filter((blk) => blk.id !== blockId));
  };

  const moveBlock = (chapterId: string, sectionId: string, index: number, dir: -1 | 1): void => {
    const sec = product.chapters.find((c) => c.id === chapterId)?.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const next = [...sec.blocks];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [m] = next.splice(index, 1);
    next.splice(j, 0, m);
    setBlocks(chapterId, sectionId, next);
  };

  const addBlock = (chapterId: string, sectionId: string): void => {
    const sec = product.chapters.find((c) => c.id === chapterId)?.sections.find((s) => s.id === sectionId);
    if (!sec) return;
    const type = newBlockType[sectionId] ?? "paragraph";
    setBlocks(chapterId, sectionId, [...sec.blocks, defaultBlock(uid("blk"), type)]);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <EditorSection title="Portada y metadatos">
        <label style={labelStyle}>Título</label>
        <input
          value={product.metadata.title}
          onChange={(e) =>
            set({ metadata: { ...product.metadata, title: e.target.value }, cover: { ...product.cover, title: e.target.value } })
          }
          style={inputStyle}
        />
        <label style={labelStyle}>Subtítulo</label>
        <input
          value={product.cover.subtitle}
          onChange={(e) => set({ cover: { ...product.cover, subtitle: e.target.value } })}
          style={inputStyle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <div>
            <label style={labelStyle}>Autor</label>
            <input
              value={product.cover.author}
              onChange={(e) =>
                set({ cover: { ...product.cover, author: e.target.value }, metadata: { ...product.metadata, author: e.target.value } })
              }
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Edición</label>
            <input
              value={product.cover.edition}
              onChange={(e) => set({ cover: { ...product.cover, edition: e.target.value } })}
              style={inputStyle}
            />
          </div>
        </div>
        <label style={labelStyle}>Línea de marca</label>
        <input
          value={product.cover.brandLine}
          onChange={(e) => set({ cover: { ...product.cover, brandLine: e.target.value } })}
          style={inputStyle}
        />
        {onRegenerateCover && (
          <button onClick={onRegenerateCover} disabled={working} style={{ ...smallBtn, width: "100%", padding: "10px", opacity: working ? 0.6 : 1 }}>
            Regenerar portada (sin tocar el contenido)
          </button>
        )}
      </EditorSection>

      <EditorSection title="Diseño">
        <label style={labelStyle}>Estilo</label>
        <select
          value={product.branding.preset}
          onChange={(e) => onProduct(applyPreset(product, e.target.value as PdfStylePreset))}
          style={inputStyle}
        >
          {(["modern", "minimal", "editorial", "business", "education", "luxury", "premium"] as PdfStylePreset[]).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          {(["primaryColor", "secondaryColor", "backgroundColor", "surfaceColor", "textColor", "mutedColor", "accentColor"] as const).map((k) => (
            <div key={k}>
              <label style={labelStyle}>{k.replace("Color", "")}</label>
              <input
                type="color"
                value={toHex(product.branding[k])}
                onChange={(e) => set({ branding: { ...product.branding, [k]: e.target.value } })}
                style={{ width: "100%", height: "34px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <div>
            <label style={labelStyle}>Fuente títulos</label>
            <select value={product.branding.headingFont} onChange={(e) => set({ branding: { ...product.branding, headingFont: e.target.value } })} style={inputStyle}>
              {["Helvetica-Bold", "Times-Bold", "Courier-Bold"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Fuente cuerpo</label>
            <select value={product.branding.bodyFont} onChange={(e) => set({ branding: { ...product.branding, bodyFont: e.target.value } })} style={inputStyle}>
              {["Helvetica", "Times-Roman", "Courier"].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          <div>
            <label style={labelStyle}>Portada</label>
            <select value={product.branding.coverStyle} onChange={(e) => set({ branding: { ...product.branding, coverStyle: e.target.value as PdfProduct["branding"]["coverStyle"] } })} style={inputStyle}>
              <option value="bold">Intensa</option>
              <option value="classic">Clásica</option>
              <option value="band">Banda</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Radio de bordes: {product.branding.borderRadius}</label>
            <input type="range" min={0} max={24} value={product.branding.borderRadius} onChange={(e) => set({ branding: { ...product.branding, borderRadius: Number(e.target.value) } })} style={{ width: "100%" }} />
          </div>
        </div>
        <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="checkbox" checked={product.branding.showHeader} onChange={(e) => set({ branding: { ...product.branding, showHeader: e.target.checked } })} /> Encabezado
        </label>
        <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="checkbox" checked={product.branding.showFooter} onChange={(e) => set({ branding: { ...product.branding, showFooter: e.target.checked } })} /> Pie de página
        </label>
        <label style={{ ...labelStyle, display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="checkbox" checked={product.branding.showPageNumbers} onChange={(e) => set({ branding: { ...product.branding, showPageNumbers: e.target.checked } })} /> Numeración
        </label>
        <label style={labelStyle}>Texto del pie</label>
        <input value={product.branding.footerText} placeholder="Vacío = título del ebook" onChange={(e) => set({ branding: { ...product.branding, footerText: e.target.value } })} style={inputStyle} />
      </EditorSection>

      <EditorSection title={`Capítulos (${product.chapters.length})`}>
        {product.chapters.map((ch, ci) => (
          <div key={ch.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
            <input value={ch.title} onChange={(e) => updateChapter(ch.id, { title: e.target.value })} style={{ ...inputStyle, fontWeight: "bold" }} />
            <textarea value={ch.introduction} onChange={(e) => updateChapter(ch.id, { introduction: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
              <button onClick={() => moveChapter(ci, -1)} style={smallBtn}>Subir cap.</button>
              <button onClick={() => moveChapter(ci, 1)} style={smallBtn}>Bajar cap.</button>
              <button onClick={() => deleteChapter(ch.id)} style={{ ...smallBtn, color: "#f87171" }}>Eliminar</button>
              <button onClick={() => addSection(ch.id)} style={smallBtn}>+ Sección</button>
            </div>
            {ch.sections.map((s, si) => (
              <div key={s.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
                <input value={s.title} onChange={(e) => updateSection(ch.id, s.id, { title: e.target.value })} style={inputStyle} />
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => moveSection(ch.id, si, -1)} style={smallBtn}>↑</button>
                  <button onClick={() => moveSection(ch.id, si, 1)} style={smallBtn}>↓</button>
                  <button onClick={() => deleteSection(ch.id, s.id)} style={{ ...smallBtn, color: "#f87171" }}>✕ sección</button>
                  {onRegenerateSection && (
                    <button onClick={() => onRegenerateSection(ch.id, s.id)} disabled={working} style={{ ...smallBtn, opacity: working ? 0.6 : 1 }}>
                      Regenerar sección
                    </button>
                  )}
                </div>
                {s.blocks.map((blk, bi) => (
                  <div key={blk.id} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#a855f7", fontWeight: "bold" }}>{blk.type.toUpperCase()}</span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => moveBlock(ch.id, s.id, bi, -1)} style={smallBtn}>↑</button>
                        <button onClick={() => moveBlock(ch.id, s.id, bi, 1)} style={smallBtn}>↓</button>
                        <button onClick={() => deleteBlock(ch.id, s.id, blk.id)} style={{ ...smallBtn, color: "#f87171" }}>✕</button>
                      </div>
                    </div>
                    <BlockFields
                      block={blk}
                      onChange={(next) => updateBlock(ch.id, s.id, next)}
                      onRegenerate={onRegenerateImage}
                      onRewrite={onRewriteBlock ? (action) => onRewriteBlock(blk.id, action) : undefined}
                      working={working}
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: "6px" }}>
                  <select
                    value={newBlockType[s.id] ?? "paragraph"}
                    onChange={(e) => setNewBlockType((p) => ({ ...p, [s.id]: e.target.value as PdfBlockType }))}
                    style={{ ...inputStyle, marginBottom: 0 }}
                  >
                    {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => addBlock(ch.id, s.id)} style={smallBtn}>+ Bloque</button>
                </div>
              </div>
            ))}
          </div>
        ))}
        <button onClick={addChapter} style={{ ...smallBtn, width: "100%", padding: "10px" }}>+ Agregar capítulo</button>
      </EditorSection>
    </div>
  );
}

const BLOCK_TYPES: PdfBlockType[] = [
  "heading", "subheading", "paragraph", "bulletList", "numberedList", "quote",
  "highlight", "tip", "warning", "example", "checklist", "table", "callout",
  "divider", "image", "exercise", "reflection", "chapterSummary",
];

function defaultBlock(id: string, type: PdfBlockType): PdfContentBlock {
  const base = { id, order: 1 };
  switch (type) {
    case "heading": return { ...base, type, text: "Nuevo título" };
    case "subheading": return { ...base, type, text: "Nuevo subtítulo" };
    case "paragraph": return { ...base, type, text: "" };
    case "bulletList": return { ...base, type, items: [""] };
    case "numberedList": return { ...base, type, items: [""] };
    case "quote": return { ...base, type, text: "", author: "" };
    case "highlight": return { ...base, type, text: "" };
    case "tip": return { ...base, type, title: "Consejo", text: "" };
    case "warning": return { ...base, type, title: "Atención", text: "" };
    case "example": return { ...base, type, title: "Ejemplo", text: "" };
    case "checklist": return { ...base, type, title: "Lista", items: [""] };
    case "table": return { ...base, type, title: "Tabla", headers: ["A", "B"], rows: [["", ""]] };
    case "callout": return { ...base, type, title: "Destacado", text: "" };
    case "divider": return { ...base, type };
    case "image": return { ...base, type, src: "", alt: "", caption: "" };
    case "exercise": return { ...base, type, title: "Ejercicio", text: "" };
    case "reflection": return { ...base, type, question: "" };
    case "chapterSummary": return { ...base, type, points: [""] };
  }
}

function applyPreset(product: PdfProduct, preset: PdfStylePreset): PdfProduct {
  const palettes: Record<PdfStylePreset, Partial<PdfProduct["branding"]>> = {
    modern: { preset, primaryColor: "#7c3aed", secondaryColor: "#06b6d4", surfaceColor: "#faf5ff", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#06b6d4", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", coverStyle: "bold" },
    minimal: { preset, primaryColor: "#18181b", secondaryColor: "#52525b", surfaceColor: "#fafafa", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#52525b", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", coverStyle: "classic" },
    editorial: { preset, primaryColor: "#111111", secondaryColor: "#9a3412", backgroundColor: "#fdfbf7", surfaceColor: "#ffffff", textColor: "#1c1917", mutedColor: "#78716c", accentColor: "#9a3412", headingFont: "Times-Bold", bodyFont: "Times-Roman", coverStyle: "classic" },
    business: { preset, primaryColor: "#1e3a8a", secondaryColor: "#b45309", surfaceColor: "#f1f5f9", textColor: "#0f172a", mutedColor: "#64748b", accentColor: "#b45309", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", coverStyle: "band" },
    education: { preset, primaryColor: "#4f46e5", secondaryColor: "#0d9488", surfaceColor: "#f5f3ff", textColor: "#1c1917", mutedColor: "#78716c", accentColor: "#0d9488", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", coverStyle: "bold" },
    luxury: { preset, primaryColor: "#3f3f46", secondaryColor: "#a16207", backgroundColor: "#fafaf9", surfaceColor: "#ffffff", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#a16207", headingFont: "Times-Bold", bodyFont: "Times-Roman", coverStyle: "classic" },
    premium: { preset, primaryColor: "#6d28d9", secondaryColor: "#a16207", backgroundColor: "#faf9ff", surfaceColor: "#ffffff", textColor: "#1e1b29", mutedColor: "#7c7484", accentColor: "#a16207", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", coverStyle: "bold" },
  };
  return { ...product, branding: { ...product.branding, ...palettes[preset] } };
}

function toHex(value: string): string {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#7c3aed";
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontSize: "14px", margin: "0 0 10px", color: "#fff" }}>{title}</h3>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", color: "#888", fontSize: "11px", marginBottom: "4px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0c0c0f",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  color: "#fff",
  padding: "8px 10px",
  fontSize: "13px",
  marginBottom: "8px",
  fontFamily: FONT,
};

const smallBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "transparent",
  color: "#aaa",
  cursor: "pointer",
  fontSize: "11px",
};

function TextInput({ value, onChange, multiline }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return multiline ? (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
  ) : (
    <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
  );
}

function ListEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  return (
    <textarea
      value={items.join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n"))}
      rows={Math.max(2, items.length)}
      style={{ ...inputStyle, resize: "vertical" }}
      placeholder="Un ítem por línea"
    />
  );
}

const TEXT_ACTIONS: { value: PdfTextAction; label: string }[] = [
  { value: "improve", label: "Mejorar" },
  { value: "shorten", label: "Acortar" },
  { value: "expand", label: "Expandir" },
  { value: "professional", label: "Profesional" },
  { value: "persuasive", label: "Persuasivo" },
  { value: "fix", label: "Corregir" },
];

function BlockFields({ block, onChange, onRegenerate, onRewrite, working }: { block: PdfContentBlock; onChange: (b: PdfContentBlock) => void; onRegenerate?: (blockId: string) => void; onRewrite?: (action: PdfTextAction) => void; working?: boolean }) {
  const actions = onRewrite && block.type !== "divider" && block.type !== "image" && (
    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
      {TEXT_ACTIONS.map((a) => (
        <button key={a.value} onClick={() => onRewrite(a.value)} disabled={working} style={{ ...smallBtn, opacity: working ? 0.6 : 1 }}>
          {a.label}
        </button>
      ))}
    </div>
  );
  const withActions = (el: React.ReactNode) => <>{el}{actions}</>;
  switch (block.type) {
    case "heading":
    case "subheading":
    case "paragraph":
    case "highlight":
      return withActions(<TextInput value={block.text} multiline onChange={(v) => onChange({ ...block, text: v })} />);
    case "bulletList":
    case "numberedList":
      return withActions(<ListEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />);
    case "quote":
      return withActions(
        <>
          <TextInput value={block.text} multiline onChange={(v) => onChange({ ...block, text: v })} />
          <TextInput value={block.author} onChange={(v) => onChange({ ...block, author: v })} />
        </>
      );
    case "tip":
    case "warning":
    case "example":
    case "callout":
    case "exercise":
      return withActions(
        <>
          <TextInput value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <TextInput value={block.text} multiline onChange={(v) => onChange({ ...block, text: v })} />
        </>
      );
    case "checklist":
      return withActions(
        <>
          <TextInput value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <ListEditor items={block.items} onChange={(items) => onChange({ ...block, items })} />
        </>
      );
    case "table":
      return withActions(
        <>
          <TextInput value={block.title} onChange={(v) => onChange({ ...block, title: v })} />
          <ListEditor items={block.headers} onChange={(headers) => onChange({ ...block, headers })} />
          <textarea
            value={block.rows.map((r) => r.join(" | ")).join("\n")}
            onChange={(e) =>
              onChange({ ...block, rows: e.target.value.split("\n").map((line) => line.split("|").map((c) => c.trim())) })
            }
            rows={Math.max(2, block.rows.length)}
            style={{ ...inputStyle, resize: "vertical" }}
            placeholder="Una fila por línea, celdas separadas con |"
          />
        </>
      );
    case "divider":
      return <div style={{ color: "#666", fontSize: "11px" }}>Separador visual</div>;
    case "image":
      return (
        <>
          {block.vector && (
            <div style={{ color: "#a855f7", fontSize: "11px", marginBottom: "6px" }}>
              Vector {block.vector.kind} · variante {block.vector.variant} · {block.vector.title}
            </div>
          )}
          <TextInput value={block.src} onChange={(v) => onChange({ ...block, src: v })} />
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px" }}>URL real de imagen (vacía = se usa el vector o no se exporta)</div>
          <TextInput value={block.alt} onChange={(v) => onChange({ ...block, alt: v })} />
          <TextInput value={block.caption} onChange={(v) => onChange({ ...block, caption: v })} />
          <label style={{ display: "block", color: "#888", fontSize: "11px", marginBottom: "4px" }}>Tamaño</label>
          <select
            value={block.width ?? "medium"}
            onChange={(e) => onChange({ ...block, width: e.target.value as "small" | "medium" | "large" })}
            style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", padding: "8px 10px", fontSize: "13px", marginBottom: "8px", fontFamily: FONT }}
          >
            <option value="small">Pequeña (45%)</option>
            <option value="medium">Mediana (70%)</option>
            <option value="large">Grande (100%)</option>
          </select>
          {onRegenerate && (
            <button onClick={() => onRegenerate(block.id)} style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(124,58,237,0.4)", background: "rgba(124,58,237,0.15)", color: "#c084fc", cursor: "pointer", fontSize: "11px" }}>
              Regenerar imagen
            </button>
          )}
        </>
      );
    case "reflection":
      return withActions(<TextInput value={block.question} multiline onChange={(v) => onChange({ ...block, question: v })} />);
    case "chapterSummary":
      return withActions(<ListEditor items={block.points} onChange={(points) => onChange({ ...block, points })} />);
  }
}
