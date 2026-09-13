// ============================================
// INTERACTIVE WEB BUILDER - Preview + Editor
// ============================================
// Ruta: /create/builder/interactive-web
// Flujo exclusivo del formato web; el flujo de cursos no se toca.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  InteractiveWebGenerationEngine,
  WEB_PRODUCT_KEY,
} from "@/app/services/ai/InteractiveWebGenerationEngine";
import { AIProviderFactory } from "@/app/services/ai/AIProvider";
import type {
  InteractiveWebProduct,
  InteractiveWebSection,
  InteractiveWebBranding,
  WebGenerationState,
  WebQualityValidation,
} from "@/app/services/ai/interactiveWebTypes";
import { InteractiveWebRenderer } from "../components/InteractiveWebRenderer";
import { PublishButton } from "../components/PublishButton";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export default function InteractiveWebBuilderPage() {
  const router = useRouter();
  const [engine] = useState(() => new InteractiveWebGenerationEngine());
  const [idea, setIdea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [webState, setWebState] = useState<WebGenerationState | null>(null);
  const [generating, setGenerating] = useState(false);
  const [product, setProduct] = useState<InteractiveWebProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [validation, setValidation] = useState<WebQualityValidation | null>(null);
  const [revalidating, setRevalidating] = useState(false);

  // Cargar idea + producto guardado (persistencia mock en localStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedIdea = sessionStorage.getItem("crow_web_idea");
    setIdea(savedIdea);
    try {
      const raw = window.localStorage.getItem(WEB_PRODUCT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as InteractiveWebProduct;
        if (!savedIdea || saved.metadata.title) {
          setProduct(saved);
          setEditedTitle(saved.metadata.title);
        }
      }
    } catch {
      // sin producto guardado
    }
    setLoading(false);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!idea?.trim()) {
      setError("Falta la idea original. Volvé a Create Studio.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const result = await engine.generateWeb(idea);
      setProduct(result);
      setEditedTitle(result.metadata.title);
      setValidation(engine.getCurrentState()?.validation ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando la web");
    } finally {
      setGenerating(false);
    }
  }, [idea, engine]);

  // Autoiniciar si hay idea y no hay producto listo
  useEffect(() => {
    if (loading || !idea) return;
    if (product && product.status === "READY") return;
    if (!generating) void startGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, idea]);

  // Observar estado real del engine (sin progreso fingido)
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => {
      setWebState(engine.getCurrentState());
    }, 500);
    return () => clearInterval(t);
  }, [generating, engine]);

  const handleBack = (): void => {
    router.push("/create");
  };

  const persistEditedProduct = (next: InteractiveWebProduct): void => {
    setProduct(next);
    engine.applyLocalSections(next.sections);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WEB_PRODUCT_KEY, JSON.stringify(next));
      } catch {
        // no bloquea
      }
    }
  };

  const updateSection = (sectionId: string, patch: Partial<InteractiveWebSection>): void => {
    if (!product) return;
    persistEditedProduct({
      ...product,
      sections: product.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  };

  const moveSection = (index: number, dir: -1 | 1): void => {
    if (!product) return;
    const next = [...product.sections];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(j, 0, moved);
    persistEditedProduct({
      ...product,
      sections: next.map((s, i) => ({ ...s, order: i + 1 })),
    });
  };

  const deleteSection = (sectionId: string): void => {
    if (!product) return;
    persistEditedProduct({
      ...product,
      sections: product.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i + 1 })),
    });
  };

  const deleteComponent = (sectionId: string, componentId: string): void => {
    if (!product) return;
    persistEditedProduct({
      ...product,
      sections: product.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              components: s.components
                .filter((c) => c.id !== componentId)
                .map((c, i) => ({ ...c, order: i + 1 })),
            }
          : s
      ),
    });
  };

  const moveComponent = (sectionId: string, index: number, dir: -1 | 1): void => {
    if (!product) return;
    const section = product.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const next = [...section.components].sort((a, b) => a.order - b.order);
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(j, 0, moved);
    persistEditedProduct({
      ...product,
      sections: product.sections.map((s) =>
        s.id === sectionId
          ? { ...s, components: next.map((c, i) => ({ ...c, order: i + 1 })) }
          : s
      ),
    });
  };

  const updateComponentText = (sectionId: string, componentId: string, field: string, value: string): void => {
    if (!product) return;
    persistEditedProduct({
      ...product,
      sections: product.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              components: s.components.map((c) => {
                if (c.id !== componentId) return c;
                if (field === "paragraphs") {
                  try {
                    const arr: unknown = JSON.parse(value);
                    if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
                      return { ...c, paragraphs: arr } as typeof c;
                    }
                  } catch {
                    // texto parcial: no aplicar
                  }
                  return c;
                }
                return { ...c, [field]: value } as typeof c;
              }),
            }
          : s
      ),
    });
  };

  const updateTitle = (value: string): void => {
    if (!product) return;
    setEditedTitle(value);
    persistEditedProduct({
      ...product,
      metadata: { ...product.metadata, title: value },
    });
  };

  const updateBranding = (patch: Partial<InteractiveWebBranding>): void => {
    if (!product) return;
    const branding = { ...product.branding, ...patch };
    engine.applyLocalBranding(branding);
    const next = { ...product, branding };
    setProduct(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WEB_PRODUCT_KEY, JSON.stringify(next));
      } catch {
        // no bloquea
      }
    }
  };

  const revalidate = async (): Promise<void> => {
    if (!product) return;
    const st = engine.getCurrentState();
    if (!st?.specification || !st?.blueprint) {
      setError("Falta el contexto de generación para revalidar.");
      return;
    }
    setRevalidating(true);
    try {
      const provider = await AIProviderFactory.create();
      const result = await provider.validateWebProduct(
        { originalIdea: st.originalIdea, specification: st.specification, blueprint: st.blueprint },
        { blueprint: st.blueprint, sections: product.sections }
      );
      setValidation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error revalidando");
    } finally {
      setRevalidating(false);
    }
  };

  // ================= PANTALLAS =================

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando...</div>
      </main>
    );
  }

  if (!idea) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "16px" }}>SIN IDEA</div>
        <h1 style={{ fontSize: "26px", margin: "0 0 12px" }}>No hay una web para construir.</h1>
        <p style={{ color: "#888", marginBottom: "24px" }}>Volvé a Create Studio, escribí tu idea y elegí Web interactiva.</p>
        <button onClick={handleBack} style={{ padding: "14px 28px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Volver a Create Studio
        </button>
      </main>
    );
  }

  const showProgress = generating || (!product && !error);
  const steps = webState?.steps ?? [];

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(5,5,5,0.85)" }}>
        <button onClick={handleBack} style={{ background: "transparent", border: "none", color: "#fff", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Crow Web Builder
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#aaa", fontSize: "13px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: product ? "#22c55e" : "#c084fc", display: "inline-block" }} />
          {product ? `Web lista · ${product.stats.totalSections} secciones` : "Generando web..."}
        </div>
      </header>

      <section style={{ maxWidth: "1250px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {showProgress && (
          <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "30px", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>Crow está creando tu web</h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>
              Idea: {idea} — cada etapa guarda su resultado y el progreso refleja contenido existente.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px", color: "#aaa" }}>
              <span>Progreso real</span>
              <strong style={{ color: "#a855f7" }}>{webState?.overallProgress ?? 0}%</strong>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
              <div style={{ height: "100%", width: `${webState?.overallProgress ?? 0}%`, background: "#7c3aed", transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px" }}>
                  <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", background: s.status === "completed" ? "rgba(34,197,94,0.2)" : s.status === "processing" ? "rgba(124,58,237,0.3)" : s.status === "failed" ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", color: s.status === "completed" ? "#22c55e" : s.status === "processing" ? "#a855f7" : s.status === "failed" ? "#ef4444" : "#666" }}>
                    {s.status === "completed" ? "OK" : s.status === "failed" ? "!" : i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#fff" }}>{s.name} — {s.progress}%</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginTop: "16px", padding: "14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#fca5a5" }}>
                {error}
                <div style={{ marginTop: "10px" }}>
                  <button onClick={() => void startGeneration()} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {product && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
              <div>
                <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>WEB INTERACTIVA · {product.status}</div>
                <h1 style={{ fontSize: "30px", margin: "6px 0 4px" }}>{product.metadata.title}</h1>
                <p style={{ color: "#888", fontSize: "14px", margin: 0 }}>
                  {product.stats.totalSections} secciones · {product.stats.totalComponents} componentes · {product.stats.totalInteractive} interactivos
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={() => setViewMode("desktop")} style={viewBtn(viewMode === "desktop")}>Desktop</button>
                <button onClick={() => setViewMode("mobile")} style={viewBtn(viewMode === "mobile")}>Mobile</button>
                <button onClick={() => setEditing((e) => !e)} style={viewBtn(editing)}>{editing ? "Cerrar editor" : "Editar"}</button>
                <PublishButton from="web" />
              </div>
            </div>

            {validation && (
              <div style={{ padding: "14px 18px", borderRadius: "12px", marginBottom: "20px", background: validation.passed ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: validation.passed ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#aaa" }}>
                Validación: estructura {validation.structureScore} · contenido {validation.contentScore} · interacción {validation.interactionScore} · diseño {validation.designScore} → <strong style={{ color: validation.passed ? "#22c55e" : "#f87171" }}>{validation.overallScore} {validation.passed ? "APROBADA" : "NO APROBADA"}</strong>
                {validation.issues.slice(0, 3).map((iss) => (
                  <div key={iss.description} style={{ marginTop: "4px" }}>· {iss.description}</div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: editing ? 2 : 1, minWidth: "320px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: viewMode === "mobile" ? "390px" : "100%", maxWidth: "100%", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", overflow: "hidden" }}>
                  <InteractiveWebRenderer product={product} />
                </div>
              </div>

              {editing && (
                <aside style={{ flex: 1, minWidth: "300px", background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px" }}>
                  <h2 style={{ fontSize: "16px", margin: "0 0 16px" }}>Editor básico</h2>

                  <label style={labelStyle}>Título de la web</label>
                  <input value={editedTitle} onChange={(e) => updateTitle(e.target.value)} style={inputStyle} />

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                    <div>
                      <label style={labelStyle}>Primario</label>
                      <input type="color" value={toColorInput(product.branding.primaryColor)} onChange={(e) => updateBranding({ primaryColor: e.target.value })} style={{ width: "100%", height: "36px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Fondo</label>
                      <input type="color" value={toColorInput(product.branding.backgroundColor)} onChange={(e) => updateBranding({ backgroundColor: e.target.value })} style={{ width: "100%", height: "36px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Texto</label>
                      <input type="color" value={toColorInput(product.branding.textColor)} onChange={(e) => updateBranding({ textColor: e.target.value })} style={{ width: "100%", height: "36px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    </div>
                  </div>

                  {product.sections.map((s, si) => (
                    <div key={s.id} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                      <input value={s.title} onChange={(e) => updateSection(s.id, { title: e.target.value })} style={{ ...inputStyle, fontWeight: "bold" }} />
                      <textarea value={s.purpose} onChange={(e) => updateSection(s.id, { purpose: e.target.value })} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                        <button onClick={() => moveSection(si, -1)} style={smallBtn}>Subir</button>
                        <button onClick={() => moveSection(si, 1)} style={smallBtn}>Bajar</button>
                        <button onClick={() => deleteSection(s.id)} style={{ ...smallBtn, color: "#f87171" }}>Eliminar sección</button>
                      </div>
                      {[...s.components].sort((a, b) => a.order - b.order).map((c, ci) => (
                        <div key={c.id} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px", marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "11px", color: "#a855f7", fontWeight: "bold" }}>{c.type.toUpperCase()}</span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button onClick={() => moveComponent(s.id, ci, -1)} style={smallBtn}>↑</button>
                              <button onClick={() => moveComponent(s.id, ci, 1)} style={smallBtn}>↓</button>
                              <button onClick={() => deleteComponent(s.id, c.id)} style={{ ...smallBtn, color: "#f87171" }}>✕</button>
                            </div>
                          </div>
                          <ComponentTextFields
                            sectionId={s.id}
                            componentId={c.id}
                            component={c}
                            onChange={updateComponentText}
                          />
                        </div>
                      ))}
                    </div>
                  ))}

                  <button onClick={() => void revalidate()} disabled={revalidating} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}>
                    {revalidating ? "Revalidando..." : "Revalidar web editada"}
                  </button>
                </aside>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function viewBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: "10px",
    border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(124,58,237,0.2)" : "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  };
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

function toColorInput(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  return "#7c3aed";
}

function ComponentTextFields({
  sectionId,
  componentId,
  component,
  onChange,
}: {
  sectionId: string;
  componentId: string;
  component: InteractiveWebProduct["sections"][number]["components"][number];
  onChange: (sectionId: string, componentId: string, field: string, value: string) => void;
}) {
  const field = (name: string, value: string, multiline = false) =>
    multiline ? (
      <textarea value={value} onChange={(e) => onChange(sectionId, componentId, name, e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
    ) : (
      <input value={value} onChange={(e) => onChange(sectionId, componentId, name, e.target.value)} style={inputStyle} />
    );
  switch (component.type) {
    case "hero":
      return <>{field("title", component.title)}{field("subtitle", component.subtitle, true)}{field("ctaLabel", component.ctaLabel)}</>;
    case "richText":
      return (
        <>
          {field("heading", component.heading)}
          {component.paragraphs.map((p, i) => (
            <textarea
              key={i}
              value={p}
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              onChange={(e) => {
                const next = [...component.paragraphs];
                next[i] = e.target.value;
                onChange(sectionId, componentId, "paragraphs", JSON.stringify(next));
              }}
            />
          ))}
        </>
      );
    case "image":
      return <>{field("src", component.src)}{field("alt", component.alt)}{field("caption", component.caption)}</>;
    case "cards":
      return <>{field("heading", component.heading)}</>;
    case "accordion":
      return <>{field("heading", component.heading)}</>;
    case "tabs":
      return <>{field("heading", component.heading)}</>;
    case "quiz":
      return <>{field("title", component.title)}</>;
    case "flashcards":
      return <>{field("title", component.title)}</>;
    case "checklist":
      return <>{field("title", component.title)}</>;
    case "progress":
      return <>{field("title", component.title)}</>;
    case "cta":
      return <>{field("title", component.title)}{field("body", component.body, true)}{field("buttonLabel", component.buttonLabel)}</>;
    case "vocabMatch":
      return <>{field("title", component.title)}{field("instruction", component.instruction)}</>;
  }
}
