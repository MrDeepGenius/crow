"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/app/components/BackButton";
import { AIProviderFactory } from "@/app/services/ai/AIProvider";
import type {
  CourseBlueprint,
  ProductSpecification,
} from "@/app/services/ai/types";
import type {
  InteractiveWebBlueprint,
  WebSpecification,
} from "@/app/services/ai/interactiveWebTypes";
import type {
  PdfBlueprint,
  PdfSpecification,
} from "@/app/services/ai/pdfTypes";
import type {
  KitBlueprint,
  KitSpecification,
} from "@/app/services/ai/kitTypes";

export default function CreatePage() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [realSpec, setRealSpec] = useState<ProductSpecification | null>(null);
  const [realBlueprint, setRealBlueprint] = useState<CourseBlueprint | null>(null);
  const [webSpec, setWebSpec] = useState<WebSpecification | null>(null);
  const [webBlueprint, setWebBlueprint] = useState<InteractiveWebBlueprint | null>(null);
  const [kitSpec, setKitSpec] = useState<KitSpecification | null>(null);
  const [kitBlueprint, setKitBlueprint] = useState<KitBlueprint | null>(null);
  const [pdfSpec, setPdfSpec] = useState<PdfSpecification | null>(null);
  const [pdfBlueprint, setPdfBlueprint] = useState<PdfBlueprint | null>(null);
  const router = useRouter();

  const products = [
    { icon: "Eb", name: "Ebook", text: "Producto editorial premium creado por Crow AI" },
    { icon: "Pd", name: "PDF", text: "Guías, manuales y documentos profesionales" },
    { icon: "Cu", name: "Curso", text: "Curso completo con módulos y lecciones" },
    { icon: "Wb", name: "Web interactiva", text: "Experiencia web lista para usar" },
    { icon: "Kt", name: "Kit de recursos", text: "Plantillas, herramientas y recursos" },
  ];

  async function createBlueprint() {
    const trimmed = idea.trim();
    if (!trimmed) {
      alert("Contale a Crow qué producto querés crear.");
      return;
    }

    const productType = selectedProduct || "Curso";
    setSelectedProduct(productType);
    setLoading(true);
    setAnalysisError(null);

    try {
      if (productType === "Kit de recursos") {
        const provider = await AIProviderFactory.create();
        const spec = await provider.analyzeKitIdea(trimmed);
        const blueprint = await provider.generateKitBlueprint({
          originalIdea: trimmed,
          specification: spec,
        });
        setKitSpec(spec);
        setKitBlueprint(blueprint);
        setRealSpec(null);
        setRealBlueprint(null);
        setWebSpec(null);
        setWebBlueprint(null);
        setPdfSpec(null);
        setPdfBlueprint(null);
      } else if (productType === "Ebook" || productType === "PDF") {
        const provider = await AIProviderFactory.create();
        const spec = await provider.analyzePdfIdea(trimmed);
        const blueprint = await provider.generatePdfBlueprint({
          originalIdea: trimmed,
          specification: spec,
        });
        setPdfSpec(spec);
        setPdfBlueprint(blueprint);
        setRealSpec(null);
        setRealBlueprint(null);
        setWebSpec(null);
        setWebBlueprint(null);
      } else if (productType === "Web interactiva") {
        const provider = await AIProviderFactory.create();
        const spec = await provider.analyzeWebIdea(trimmed);
        const blueprint = await provider.generateWebBlueprint({
          originalIdea: trimmed,
          specification: spec,
        });
        setWebSpec(spec);
        setWebBlueprint(blueprint);
        setRealSpec(null);
        setRealBlueprint(null);
        setPdfSpec(null);
        setPdfBlueprint(null);
        setKitSpec(null);
        setKitBlueprint(null);
      } else if (productType === "Curso") {
        const provider = await AIProviderFactory.create();
        const spec = await provider.analyzeIdea(trimmed);
        const context = {
          originalIdea: trimmed,
          productSpecification: spec,
          learningObjectives: spec.subtopics,
          audience: spec.audience,
          level: spec.level.includes("principiante")
            ? ("beginner" as const)
            : spec.level.includes("intermedio")
              ? ("intermediate" as const)
              : ("advanced" as const),
          language: "español",
          tone: "professional" as const,
        };
        const blueprint = await provider.generateBlueprint(context);
        setRealSpec(spec);
        setRealBlueprint(blueprint);
        setWebSpec(null);
        setWebBlueprint(null);
        setPdfSpec(null);
        setPdfBlueprint(null);
        setKitSpec(null);
        setKitBlueprint(null);
      } else {
        setRealSpec(null);
        setRealBlueprint(null);
        setWebSpec(null);
        setWebBlueprint(null);
        setPdfSpec(null);
        setPdfBlueprint(null);
        setKitSpec(null);
        setKitBlueprint(null);
      }
      setCreated(true);
    } catch (err) {
      console.error("Error analizando idea:", err);
      setAnalysisError(err instanceof Error ? err.message : "Error analizando la idea");
    } finally {
      setLoading(false);
    }
  }

  function buildProduct() {
    const productType = selectedProduct || "Curso";
    const finalIdea =
      idea.trim() || `Quiero crear un ${productType.toLowerCase()} profesional`;

    if (typeof window === "undefined") return;

    if (productType === "Kit de recursos" && kitBlueprint && kitSpec) {
      sessionStorage.setItem("crow_kit_idea", finalIdea);
      sessionStorage.setItem("crow_kit_spec", JSON.stringify(kitSpec));
      sessionStorage.setItem("crow_kit_blueprint", JSON.stringify(kitBlueprint));
      router.push("/create/builder/kit");
      return;
    } else if (productType === "Kit de recursos") {
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    }

    if (productType === "Ebook" && pdfBlueprint && pdfSpec) {
      sessionStorage.setItem("crow_ebook_idea", finalIdea);
      sessionStorage.setItem("crow_ebook_spec", JSON.stringify(pdfSpec));
      sessionStorage.setItem("crow_ebook_blueprint", JSON.stringify(pdfBlueprint));
      router.push("/create/builder/ebook");
      return;
    } else if (productType === "Ebook") {
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    }

    if (productType === "PDF" && pdfBlueprint && pdfSpec) {
      sessionStorage.setItem("crow_pdf_idea", finalIdea);
      sessionStorage.setItem("crow_pdf_spec", JSON.stringify(pdfSpec));
      sessionStorage.setItem("crow_pdf_blueprint", JSON.stringify(pdfBlueprint));
      router.push("/create/builder/pdf");
      return;
    } else if (productType === "PDF") {
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    }

    if (productType === "Web interactiva" && webBlueprint && webSpec) {
      sessionStorage.setItem("crow_web_idea", finalIdea);
      sessionStorage.setItem("crow_web_spec", JSON.stringify(webSpec));
      sessionStorage.setItem("crow_web_blueprint", JSON.stringify(webBlueprint));
      router.push("/create/builder/interactive-web");
      return;
    } else if (productType === "Web interactiva") {
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    }

    if (productType === "Curso" && realBlueprint && realSpec) {
      sessionStorage.setItem("crow_idea", finalIdea);
      sessionStorage.setItem("crow_spec", JSON.stringify(realSpec));
      sessionStorage.setItem("crow_blueprint", JSON.stringify(realBlueprint));
      const legacy = {
        title: realBlueprint.title,
        type: "Curso",
        idea: finalIdea,
        description: realBlueprint.description,
        modules: realBlueprint.modules.map((m) => ({
          title: m.title,
          lessons: m.lessons.map((l) => l.title),
        })),
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem("productBlueprint", JSON.stringify(legacy));
    } else if (productType === "Curso") {
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    } else {
      const blueprint = generateBlueprint(productType, finalIdea);
      sessionStorage.setItem("productBlueprint", JSON.stringify(blueprint));
      sessionStorage.setItem("crow_idea", finalIdea);
    }

    router.push("/create/builder");
  }

  function generateBlueprint(type: string, userIdea: string) {
    let modules: Array<{ title: string; lessons: string[] }> = [];

    if (type === "Curso") {
      throw new Error(
        "Flujo Curso legacy eliminado: usar analyzeIdea + generateBlueprint del provider."
      );
    } else if (type === "Ebook") {
      modules = [
        { title: "Capítulo 1: Introducción", lessons: ["Presentación", "Contexto", "Objetivos del libro"] },
        { title: "Capítulo 2: Contenido principal", lessons: ["Sección A", "Sección B", "Sección C"] },
        { title: "Capítulo 3: Aplicación práctica", lessons: ["Ejemplos", "Ejercicios", "Recursos"] },
      ];
    } else if (type === "Web interactiva") {
      modules = [
        { title: "Páginas principales", lessons: ["Home", "Productos", "Contacto"] },
        { title: "Funcionalidades", lessons: ["Carrito", "Checkout", "Dashboard"] },
        { title: "Integraciones", lessons: ["Pagos", "Email", "Análitica"] },
      ];
    } else if (type === "Kit de recursos") {
      modules = [
        { title: "Plantillas", lessons: ["Plantilla 1", "Plantilla 2", "Plantilla 3"] },
        { title: "Herramientas", lessons: ["Herramienta A", "Herramienta B", "Herramienta C"] },
        { title: "Guías", lessons: ["Guía rápida", "Mejores prácticas", "FAQ"] },
      ];
    }

    return {
      title: `${type} generado por Crow`,
      type: type,
      idea: userIdea,
      modules: modules,
      createdAt: new Date().toISOString(),
    };
  }

  function chooseProduct(name: string) {
    setSelectedProduct(name);
    if (!idea.trim()) {
      setIdea(
        name === "Curso"
          ? "Quiero crear un curso completo sobre "
          : name === "Ebook"
            ? "Quiero crear un ebook para enseñar a principiantes a "
            : `Quiero crear un ${name.toLowerCase()} sobre `
      );
    }
  }

  return (
    <main className="create-page">
      {/* Ambient glow */}
      <div className="create-ambient" aria-hidden />

      <nav className="create-nav">
        <a href="/" className="create-nav-brand">
          <img src="/crowlogo.png" alt="Crow" className="create-nav-logo" />
          <span>Crow Market</span>
        </a>
        <div className="create-nav-links">
          <a href="/" className="create-nav-link">Inicio</a>
          <a href="/marketplace" className="create-nav-link">Marketplace</a>
          <a href="/affiliates" className="create-nav-link">Afiliados</a>
          <BackButton />
        </div>
      </nav>

      <section className="create-content">
        {!created ? (
          <>
            {/* Hero */}
            <div className="create-hero">
              <div className="create-badge">✦ CROW CREATE STUDIO</div>
              <h1 className="create-hero-title">
                ¿Qué tienes{" "}
                <span className="create-hero-gradient">en mente?</span>
              </h1>
              <p className="create-hero-sub">
                Contale a Crow tu idea y transformala en un producto digital
                profesional listo para vender.
              </p>
            </div>

            {/* Chat card */}
            <div className="create-chat-card">
              <div className="create-chat-header">
                <div className="create-chat-avatar">C</div>
                <div className="create-chat-meta">
                  <div className="create-chat-name">Crow AI</div>
                  <div className="create-chat-role">Create Studio</div>
                </div>
                <div className="create-chat-status">
                  <span className="create-chat-dot" /> Online
                </div>
              </div>

              <div className="create-chat-body">
                <div className="create-chat-bubble">
                  <strong style={{ color: "#fff" }}>Hola</strong>
                  <br />
                  Soy Crow, tu asistente creativo.
                  <br />
                  <br />
                  Contame qué querés crear y voy a convertir tu idea en un
                  blueprint listo para construir.
                </div>

                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Ej: Quiero crear un curso para enseñar a emprendedores a usar inteligencia artificial..."
                  className="create-textarea"
                />

                <div className="create-chat-actions">
                  <span className="create-chat-hint">
                    Crow analizará tu idea antes de construir.
                  </span>
                  <button
                    onClick={createBlueprint}
                    disabled={loading}
                    className={`create-cta ${loading ? "create-cta-loading" : ""}`}
                  >
                    {loading ? (
                      <>
                        <span className="create-spinner" />
                        Crow está analizando...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                        </svg>
                        Crear con Crow
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Product picker */}
            <div className="create-picker-label">
              O elegí un tipo de producto para comenzar
            </div>

            <div className="create-products-grid">
              {products.map((product) => (
                <button
                  key={product.name}
                  onClick={() => chooseProduct(product.name)}
                  className={`create-product-card ${selectedProduct === product.name ? "create-product-active" : ""}`}
                >
                  <div className="create-product-icon">{product.icon}</div>
                  <div className="create-product-name">{product.name}</div>
                  <div className="create-product-text">{product.text}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="create-result">
            <div className="create-result-hero">
              <div className="create-result-badge">✦ BLUEPRINT GENERADO</div>
              <h1 className="create-result-title">
                Tu producto empieza a tomar forma.
              </h1>
              <p className="create-result-sub">
                Crow analizó tu idea y preparó una estructura específica.
              </p>
              {analysisError && (
                <p className="create-result-error">Error: {analysisError}</p>
              )}
              {realSpec && (
                <p className="create-result-meta">
                  Tema detectado: {realSpec.topic} · Nivel: {realSpec.level} ·{" "}
                  Audiencia: {realSpec.audience}
                </p>
              )}
              {webSpec && (
                <p className="create-result-meta">
                  Tema detectado: {webSpec.topic} · Nivel: {webSpec.level} ·{" "}
                  Audiencia: {webSpec.audience}
                </p>
              )}
              {pdfSpec && (
                <p className="create-result-meta">
                  Tema detectado: {pdfSpec.topic} · {pdfSpec.targetPages} páginas objetivo ·{" "}
                  Audiencia: {pdfSpec.audience}
                </p>
              )}
              {kitSpec && (
                <p className="create-result-meta">
                  Tema detectado: {kitSpec.topic} · {kitSpec.recommendedCount} recursos recomendados ·{" "}
                  Audiencia: {kitSpec.audience}
                </p>
              )}
            </div>

            <div className="create-blueprint-card">
              <div className="create-blueprint-label">PRODUCTO</div>
              <h2 className="create-blueprint-title">
                {kitBlueprint?.name ?? pdfBlueprint?.title ?? webBlueprint?.title ?? realBlueprint?.title ?? `${selectedProduct || "Curso"} generado por Crow`}
              </h2>
              <div className="create-blueprint-idea">
                <strong style={{ color: "#fff" }}>Idea:</strong>{" "}
                {idea || "Producto digital creado con Crow."}
              </div>

              <div className="create-blueprint-grid">
                {/* KIT */}
                {(kitBlueprint?.folders ?? []).map((f) => {
                  const count = (kitBlueprint?.resources ?? []).filter((r) => r.folderId === f.id).length;
                  return (
                    <div key={f.id} className="create-bp-item">
                      <div className="create-bp-tag">CARPETA</div>
                      <div className="create-bp-item-title">{f.name}</div>
                      <div className="create-bp-item-meta">{count} recurso(s)</div>
                    </div>
                  );
                })}
                {/* PDF / EBOOK */}
                {(pdfBlueprint?.chapters ?? []).map((ch, idx) => (
                  <div key={ch.id} className="create-bp-item">
                    <div className="create-bp-tag">CAPÍTULO {String(idx + 1).padStart(2, "0")}</div>
                    <div className="create-bp-item-title">{ch.title}</div>
                    <div className="create-bp-item-desc">{ch.summary}</div>
                    <div className="create-bp-item-meta">{ch.sectionTitles.length} secciones</div>
                  </div>
                ))}
                {/* WEB */}
                {(webBlueprint?.sections ?? []).map((sec, idx) => (
                  <div key={sec.id} className="create-bp-item">
                    <div className="create-bp-tag">SECCIÓN {String(idx + 1).padStart(2, "0")}</div>
                    <div className="create-bp-item-title">{sec.title}</div>
                    <div className="create-bp-item-desc">{sec.purpose}</div>
                    <div className="create-bp-item-meta">{sec.componentTypes.length} componentes</div>
                  </div>
                ))}
                {/* CURSO */}
                {(realBlueprint?.modules ?? []).map((mod, idx) => (
                  <div key={mod.title} className="create-bp-item">
                    <div className="create-bp-tag">MÓDULO {String(idx + 1).padStart(2, "0")}</div>
                    <div className="create-bp-item-title">{mod.title}</div>
                    <div className="create-bp-item-desc">{mod.description}</div>
                    <div className="create-bp-item-meta">{mod.lessons.length} lecciones</div>
                  </div>
                ))}
              </div>

              <div className="create-blueprint-actions">
                <button onClick={() => setCreated(false)} className="create-btn-secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Modificar idea
                </button>
                <button onClick={buildProduct} className="create-btn-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                  Construir producto
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="create-footer">
        © 2026 Crow Market — Create. Sell. Grow.
      </footer>

      <style jsx global>{`
        .create-page {
          --c-violet: #7c3aed;
          --c-violet-bright: #a855f7;
          --c-violet-soft: #c084fc;
          --c-bg: #060408;
          --c-surface: rgba(16,12,22,0.85);
          --c-surface-2: #0c0c10;
          --c-border: rgba(255,255,255,0.08);
          --c-border-hover: rgba(124,58,237,0.4);
          --c-text: #fff;
          --c-muted: #9ca3af;
          --c-faint: #6b7280;
          min-height: 100vh;
          background: var(--c-bg);
          color: var(--c-text);
          font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient glow background */
        .create-ambient {
          position: fixed;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 900px;
          height: 700px;
          background: radial-gradient(ellipse at center, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.06) 35%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        /* Nav */
        .create-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background: rgba(6,4,8,0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--c-border);
        }

        .create-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--c-text);
          font-weight: 700;
          font-size: 18px;
        }

        .create-nav-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
        }

        .create-nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
          font-size: 14px;
        }

        .create-nav-link {
          color: var(--c-muted);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .create-nav-link:hover { color: #fff; }

        /* Content */
        .create-content {
          position: relative;
          z-index: 1;
          max-width: 1050px;
          margin: 0 auto;
          padding: 60px 24px 100px;
        }

        /* Hero */
        .create-hero {
          text-align: center;
          margin-bottom: 44px;
          animation: createFadeUp 0.6s ease both;
        }

        .create-badge {
          display: inline-block;
          padding: 7px 16px;
          border-radius: 30px;
          border: 1px solid rgba(168,85,247,0.35);
          background: rgba(124,58,237,0.08);
          color: var(--c-violet-soft);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
        }

        .create-hero-title {
          font-size: clamp(34px, 6vw, 64px);
          margin: 0 auto 16px;
          letter-spacing: -2.5px;
          line-height: 1.05;
          font-weight: 800;
        }

        .create-hero-gradient {
          background: linear-gradient(90deg, #fff 0%, var(--c-violet-bright) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .create-hero-sub {
          color: var(--c-muted);
          font-size: 16px;
          line-height: 1.7;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Chat card */
        .create-chat-card {
          max-width: 820px;
          margin: 0 auto 44px;
          border: 1px solid var(--c-border);
          border-radius: 22px;
          background: var(--c-surface);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(124,58,237,0.08);
          overflow: hidden;
          animation: createFadeUp 0.7s ease 0.1s both;
        }

        .create-chat-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--c-border);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .create-chat-avatar {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c3aed, #5b21b6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(124,58,237,0.3);
        }

        .create-chat-meta { flex: 1; }
        .create-chat-name { font-weight: 700; font-size: 14px; }
        .create-chat-role { color: var(--c-faint); font-size: 12px; }

        .create-chat-status {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #4ade80;
          font-size: 12px;
        }
        .create-chat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.6);
        }

        .create-chat-body { padding: 24px; }

        .create-chat-bubble {
          background: rgba(124,58,237,0.06);
          border: 1px solid rgba(124,58,237,0.15);
          border-radius: 4px 18px 18px 18px;
          padding: 16px 18px;
          color: #d1d5db;
          line-height: 1.65;
          font-size: 14px;
          margin-bottom: 18px;
        }

        .create-textarea {
          width: 100%;
          min-height: 120px;
          box-sizing: border-box;
          resize: vertical;
          border: 1px solid var(--c-border);
          border-radius: 16px;
          outline: none;
          background: var(--c-surface-2);
          color: var(--c-text);
          padding: 16px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .create-textarea:focus {
          border-color: var(--c-border-hover);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.12);
        }
        .create-textarea::placeholder { color: #4b5563; }

        .create-chat-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        .create-chat-hint {
          color: var(--c-faint);
          font-size: 12px;
        }

        .create-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: 12px;
          padding: 13px 22px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          font-family: inherit;
        }
        .create-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(124,58,237,0.4);
        }
        .create-cta:active { transform: translateY(0); }
        .create-cta-loading {
          background: #42206b;
          cursor: wait;
          box-shadow: none;
          transform: none;
        }

        .create-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: createSpin 0.6s linear infinite;
          display: inline-block;
        }

        /* Product picker */
        .create-picker-label {
          text-align: center;
          color: var(--c-faint);
          font-size: 13px;
          margin-bottom: 18px;
          animation: createFadeUp 0.8s ease 0.2s both;
        }

        .create-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          animation: createFadeUp 0.8s ease 0.2s both;
        }

        .create-product-card {
          text-align: left;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--c-border);
          background: rgba(16,12,22,0.7);
          color: var(--c-text);
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }
        .create-product-card:hover {
          transform: translateY(-3px);
          border-color: rgba(124,58,237,0.3);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3), 0 0 40px rgba(124,58,237,0.08);
        }

        .create-product-active {
          border-color: var(--c-violet-bright) !important;
          background: rgba(124,58,237,0.1) !important;
          box-shadow: 0 0 0 1px var(--c-violet-bright), 0 12px 30px rgba(124,58,237,0.15) !important;
        }

        .create-product-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05));
          border: 1px solid rgba(124,58,237,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: var(--c-violet-soft);
          margin-bottom: 14px;
        }

        .create-product-name {
          font-weight: 700;
          font-size: 15px;
          margin-bottom: 6px;
        }

        .create-product-text {
          color: var(--c-faint);
          font-size: 13px;
          line-height: 1.5;
        }

        /* Blueprint result */
        .create-result {
          max-width: 900px;
          margin: 0 auto;
          animation: createFadeUp 0.5s ease both;
        }

        .create-result-hero {
          text-align: center;
          margin-bottom: 36px;
        }

        .create-result-badge {
          color: var(--c-violet-bright);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1.5px;
          margin-bottom: 14px;
        }

        .create-result-title {
          font-size: clamp(28px, 5vw, 48px);
          margin: 0 0 12px;
          letter-spacing: -1.5px;
          font-weight: 800;
        }

        .create-result-sub {
          color: var(--c-muted);
          font-size: 15px;
        }

        .create-result-error {
          color: #f87171;
          font-size: 14px;
          margin-top: 10px;
        }

        .create-result-meta {
          color: var(--c-faint);
          font-size: 13px;
          margin-top: 10px;
        }

        .create-blueprint-card {
          background: var(--c-surface);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--c-border);
          border-radius: 22px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 80px rgba(124,58,237,0.08);
        }

        .create-blueprint-label {
          color: var(--c-faint);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
        }

        .create-blueprint-title {
          font-size: clamp(24px, 4vw, 30px);
          margin: 8px 0 12px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .create-blueprint-idea {
          color: #aaa;
          line-height: 1.7;
          margin-bottom: 28px;
          font-size: 14px;
        }

        .create-blueprint-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 14px;
          margin-bottom: 28px;
        }

        .create-bp-item {
          padding: 18px;
          border-radius: 14px;
          background: var(--c-surface-2);
          border: 1px solid var(--c-border);
          transition: border-color 0.2s ease, transform 0.2s ease;
        }
        .create-bp-item:hover {
          border-color: rgba(124,58,237,0.25);
          transform: translateY(-2px);
        }

        .create-bp-tag {
          color: var(--c-violet-bright);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .create-bp-item-title {
          font-weight: 700;
          font-size: 14px;
        }

        .create-bp-item-desc {
          color: var(--c-faint);
          font-size: 12px;
          margin-top: 5px;
          line-height: 1.5;
        }

        .create-bp-item-meta {
          color: #555;
          font-size: 12px;
          margin-top: 8px;
        }

        .create-blueprint-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .create-btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 13px 20px;
          border-radius: 12px;
          border: 1px solid var(--c-border);
          background: transparent;
          color: var(--c-text);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .create-btn-secondary:hover {
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.03);
        }

        .create-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
        }
        .create-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(124,58,237,0.4);
        }
        .create-btn-primary:active { transform: translateY(0); }

        /* Footer */
        .create-footer {
          position: relative;
          z-index: 1;
          border-top: 1px solid var(--c-border);
          padding: 28px 24px;
          text-align: center;
          color: var(--c-faint);
          font-size: 13px;
        }

        /* Animations */
        @keyframes createFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes createSpin {
          to { transform: rotate(360deg); }
        }

        /* Mobile */
        @media (max-width: 760px) {
          .create-nav { padding: 0 16px; }
          .create-nav-links { gap: 14px; }
          .create-nav-link { display: none; }
          .create-content { padding: 40px 16px 80px; }
          .create-chat-body { padding: 18px; }
          .create-chat-actions { flex-direction: column; align-items: stretch; }
          .create-chat-hint { text-align: center; }
          .create-cta { justify-content: center; }
          .create-products-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .create-product-card { padding: 16px; }
          .create-product-icon { width: 36px; height: 36px; font-size: 12px; }
          .create-blueprint-card { padding: 20px; }
          .create-blueprint-grid { grid-template-columns: 1fr; }
          .create-blueprint-actions { flex-direction: column; }
          .create-btn-secondary, .create-btn-primary { justify-content: center; }
        }
      `}</style>
    </main>
  );
}
