"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  // FASE 3: blueprint específico derivado de la idea (no hardcodeado)
  const [realSpec, setRealSpec] = useState<ProductSpecification | null>(null);
  const [realBlueprint, setRealBlueprint] = useState<CourseBlueprint | null>(null);
  // WEB INTERACTIVA: spec + blueprint del segundo formato (flujo curso intacto)
  const [webSpec, setWebSpec] = useState<WebSpecification | null>(null);
  const [webBlueprint, setWebBlueprint] = useState<InteractiveWebBlueprint | null>(null);
  // KIT: spec + blueprint del quinto formato (resto intacto)
  const [kitSpec, setKitSpec] = useState<KitSpecification | null>(null);
  const [kitBlueprint, setKitBlueprint] = useState<KitBlueprint | null>(null);
  // PDF / EBOOK: spec + blueprint del tercer formato (curso y web intactos)
  const [pdfSpec, setPdfSpec] = useState<PdfSpecification | null>(null);
  const [pdfBlueprint, setPdfBlueprint] = useState<PdfBlueprint | null>(null);
  const router = useRouter();

  // FASE 11: iconografía funcional (monograma), sin emojis.
  // EBOOK y PDF son productos distintos: Ebook = producto editorial premium,
  // PDF = documento (guías, manuales, workbooks).
  const products = [
    { icon: "Eb", name: "Ebook", text: "Producto editorial premium creado por Crow AI" },
    { icon: "Pd", name: "PDF", text: "Guías, manuales y documentos profesionales" },
    { icon: "Cu", name: "Curso", text: "Curso completo con módulos y lecciones" },
    { icon: "Wb", name: "Web interactiva", text: "Experiencia web lista para usar" },
    { icon: "Kt", name: "Kit de recursos", text: "Plantillas, herramientas y recursos" },
  ];

  // FASE 3: Create Studio real. Sin setTimeout falso: analiza la idea con
  // MockAIProvider y genera un Blueprint específico que conserva la idea original.
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
      // KIT DE RECURSOS: quinto formato (mock, sin APIs externas).
      if (productType === "Kit de recursos") {
        const provider = await AIProviderFactory.create("mock");
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
        const provider = await AIProviderFactory.create("mock");
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
        const provider = await AIProviderFactory.create("mock");
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
        const provider = await AIProviderFactory.create("mock");
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
        // DEPRECATED: otros tipos conservan el generador legacy para reutilizar.
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

    // KIT DE RECURSOS → su propio Studio (crow_kit_*).
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

    // EBOOK: producto editorial premium → su propio Studio (crow_ebook_*).
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

    // PDF: documento (guías, manuales, workbooks) → flujo PDF existente.
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

    // WEB INTERACTIVA: guarda idea + spec + blueprint y va al builder web
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
      // Guardar flujo real: idea original + spec + blueprint específico
      sessionStorage.setItem("crow_idea", finalIdea);
      sessionStorage.setItem("crow_spec", JSON.stringify(realSpec));
      sessionStorage.setItem("crow_blueprint", JSON.stringify(realBlueprint));
      // Adapter legacy para el Builder (modules como strings) sin romper previews viejos
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
      // Sin blueprint real no se avanza: el genérico Fundamentos/Estrategia
      // está prohibido en el flujo Curso (test obligatorio).
      alert("Primero generá el Blueprint específico con Crow antes de construir.");
      return;
    } else {
      // DEPRECATED: blueprint legacy hardcodeado solo para tipos no-Curso
      const blueprint = generateBlueprint(productType, finalIdea);
      sessionStorage.setItem("productBlueprint", JSON.stringify(blueprint));
      sessionStorage.setItem("crow_idea", finalIdea);
    }

    router.push("/create/builder");
  }

  // DEPRECATED: generador legacy solo para tipos no-Curso. La rama Curso fue
  // eliminada: el flujo Curso usa SIEMPRE el Blueprint específico del provider.
  function generateBlueprint(type: string, userIdea: string) {
    // Generar estructura de módulos según el tipo
    let modules: Array<{ title: string; lessons: string[] }> = [];

    if (type === "Curso") {
      throw new Error(
        "Flujo Curso legacy eliminado: usar analyzeIdea + generateBlueprint del provider."
      );
    } else if (type === "Ebook") {
      modules = [
        {
          title: "Capítulo 1: Introducción",
          lessons: ["Presentación", "Contexto", "Objetivos del libro"],
        },
        {
          title: "Capítulo 2: Contenido principal",
          lessons: ["Sección A", "Sección B", "Sección C"],
        },
        {
          title: "Capítulo 3: Aplicación práctica",
          lessons: ["Ejemplos", "Ejercicios", "Recursos"],
        },
      ];
    } else if (type === "Web interactiva") {
      modules = [
        {
          title: "Páginas principales",
          lessons: ["Home", "Productos", "Contacto"],
        },
        {
          title: "Funcionalidades",
          lessons: ["Carrito", "Checkout", "Dashboard"],
        },
        {
          title: "Integraciones",
          lessons: ["Pagos", "Email", "Análitica"],
        },
      ];
    } else if (type === "Kit de recursos") {
      modules = [
        {
          title: "Plantillas",
          lessons: ["Plantilla 1", "Plantilla 2", "Plantilla 3"],
        },
        {
          title: "Herramientas",
          lessons: ["Herramienta A", "Herramienta B", "Herramienta C"],
        },
        {
          title: "Guías",
          lessons: ["Guía rápida", "Mejores prácticas", "FAQ"],
        },
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
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, #241044 0%, #0b0810 35%, #050505 70%)",
        color: "#fff",
        fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <nav
        style={{
          height: "76px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5%",
          background: "rgba(5,5,5,0.75)",
        }}
      >
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textDecoration: "none",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "20px",
          }}
        >
          <img
            src="/crowlogo.png"
            alt="Crow"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
            }}
          />
          Crow Market
        </a>

        <div
          style={{
            display: "flex",
            gap: "28px",
            fontSize: "14px",
          }}
        >
          <a href="/" style={{ color: "#aaa", textDecoration: "none" }}>
            Inicio
          </a>
          <a
            href="/marketplace"
            style={{ color: "#aaa", textDecoration: "none" }}
          >
            Marketplace
          </a>
          <a
            href="/affiliates"
            style={{ color: "#aaa", textDecoration: "none" }}
          >
            Afiliados
          </a>
        </div>
      </nav>

      <section
        style={{
          maxWidth: "1050px",
          margin: "0 auto",
          padding: "70px 24px 100px",
        }}
      >
        {!created ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "50px" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 15px",
                  borderRadius: "30px",
                  border: "1px solid rgba(150,70,255,0.35)",
                  background: "rgba(120,40,255,0.08)",
                  color: "#c58aff",
                  fontSize: "13px",
                  marginBottom: "22px",
                }}
              >
                ✦ CROW CREATE STUDIO
              </div>

              <h1
                style={{
                  fontSize: "clamp(38px, 6vw, 68px)",
                  margin: "0 auto 20px",
                  letterSpacing: "-3px",
                }}
              >
                ¿Qué tienes{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #fff, #a855f7)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  en mente?
                </span>
              </h1>

              <p
                style={{
                  color: "#999",
                  fontSize: "18px",
                  lineHeight: "1.7",
                  maxWidth: "650px",
                  margin: "0 auto",
                }}
              >
                Contale a Crow tu idea y transformala en un producto digital
                profesional listo para vender.
              </p>
            </div>

            <div
              style={{
                maxWidth: "820px",
                margin: "0 auto 50px",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
                background: "rgba(15,15,18,0.9)",
                boxShadow: "0 25px 80px rgba(100,30,255,0.16)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  C
                </div>

                <div>
                  <div style={{ fontWeight: "bold" }}>Crow AI</div>
                  <div style={{ color: "#777", fontSize: "12px" }}>
                    Create Studio
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: "auto",
                    color: "#8f8",
                    fontSize: "12px",
                  }}
                >
                  ● Online
                </div>
              </div>

              <div style={{ padding: "30px" }}>
                <div
                  style={{
                    background: "#18151d",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "4px 18px 18px 18px",
                    padding: "18px 20px",
                    color: "#ddd",
                    lineHeight: "1.6",
                    marginBottom: "20px",
                  }}
                >
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
                  style={{
                    width: "100%",
                    minHeight: "130px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "18px",
                    outline: "none",
                    background: "#0c0c0f",
                    color: "#fff",
                    padding: "18px",
                    fontSize: "15px",
                    fontFamily: "inherit",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    marginTop: "15px",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#666", fontSize: "12px" }}>
                    Crow analizará tu idea antes de construir.
                  </span>

                  <button
                    onClick={createBlueprint}
                    disabled={loading}
                    style={{
                      border: "none",
                      borderRadius: "12px",
                      padding: "14px 22px",
                      background: loading ? "#42206b" : "#7c3aed",
                      color: "#fff",
                      fontWeight: "bold",
                      cursor: loading ? "wait" : "pointer",
                    }}
                  >
                    {loading ? "Crow está analizando..." : "Crear con Crow"}
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                textAlign: "center",
                color: "#777",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              O elegí un tipo de producto para comenzar
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "14px",
              }}
            >
              {products.map((product) => (
                <button
                  key={product.name}
                  onClick={() => chooseProduct(product.name)}
                  style={{
                    textAlign: "left",
                    padding: "22px",
                    borderRadius: "18px",
                    border:
                      selectedProduct === product.name
                        ? "1px solid #9333ea"
                        : "1px solid rgba(255,255,255,0.09)",
                    background:
                      selectedProduct === product.name
                        ? "rgba(124,58,237,0.12)"
                        : "rgba(15,15,18,0.7)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "bold",
                      letterSpacing: "1px",
                      color: "#c084fc",
                      marginBottom: "12px",
                    }}
                  >
                    {product.icon}
                  </div>

                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      marginBottom: "7px",
                    }}
                  >
                    {product.name}
                  </div>

                  <div
                    style={{
                      color: "#777",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    {product.text}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <div
                style={{
                  color: "#b77aff",
                  fontSize: "13px",
                  marginBottom: "15px",
                }}
              >
                ✦ BLUEPRINT GENERADO
              </div>

              <h1
                style={{
                  fontSize: "clamp(32px, 5vw, 52px)",
                  margin: "0 0 15px",
                }}
              >
                Tu producto empieza a tomar forma.
              </h1>

              <p style={{ color: "#888", fontSize: "16px" }}>
                Crow analizó tu idea y preparó una estructura específica.
              </p>
              {analysisError && (
                <p style={{ color: "#f87171", fontSize: "14px", marginTop: "12px" }}>
                  Error: {analysisError}
                </p>
              )}
              {realSpec && (
                <p style={{ color: "#666", fontSize: "13px", marginTop: "12px" }}>
                  Tema detectado: {realSpec.topic} · Nivel: {realSpec.level} ·{" "}
                  Audiencia: {realSpec.audience}
                </p>
              )}
              {webSpec && (
                <p style={{ color: "#666", fontSize: "13px", marginTop: "12px" }}>
                  Tema detectado: {webSpec.topic} · Nivel: {webSpec.level} ·{" "}
                  Audiencia: {webSpec.audience}
                </p>
              )}
              {pdfSpec && (
                <p style={{ color: "#666", fontSize: "13px", marginTop: "12px" }}>
                  Tema detectado: {pdfSpec.topic} · {pdfSpec.targetPages} páginas objetivo ·{" "}
                  Audiencia: {pdfSpec.audience}
                </p>
              )}
              {kitSpec && (
                <p style={{ color: "#666", fontSize: "13px", marginTop: "12px" }}>
                  Tema detectado: {kitSpec.topic} · {kitSpec.recommendedCount} recursos recomendados ·{" "}
                  Audiencia: {kitSpec.audience}
                </p>
              )}
            </div>

            <div
              style={{
                background: "rgba(15,15,18,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
                padding: "35px",
                boxShadow: "0 25px 80px rgba(100,30,255,0.15)",
              }}
            >
              <div style={{ color: "#888", fontSize: "13px" }}>
                PRODUCTO
              </div>

              <h2
                style={{
                  fontSize: "30px",
                  margin: "8px 0 12px",
                }}
              >
                {kitBlueprint?.name ?? pdfBlueprint?.title ?? webBlueprint?.title ?? realBlueprint?.title ?? `${selectedProduct || "Curso"} generado por Crow`}
              </h2>

              <div
                style={{
                  color: "#aaa",
                  lineHeight: "1.7",
                  marginBottom: "30px",
                }}
              >
                <strong style={{ color: "#fff" }}>Idea:</strong>{" "}
                {idea || "Producto digital creado con Crow."}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "15px",
                  marginBottom: "30px",
                }}
              >
                {/* KIT: carpetas y recursos del Blueprint. */}
                {(kitBlueprint?.folders ?? []).map((f) => {
                  const count = (kitBlueprint?.resources ?? []).filter((r) => r.folderId === f.id).length;
                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: "20px",
                        borderRadius: "16px",
                        background: "#0c0c0f",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ color: "#a855f7", fontSize: "12px", marginBottom: "10px" }}>
                        CARPETA
                      </div>
                      <div style={{ fontWeight: "bold" }}>{f.name}</div>
                      <div style={{ color: "#666", fontSize: "13px", marginTop: "8px" }}>
                        {count} recurso(s)
                      </div>
                    </div>
                  );
                })}
                {/* PDF / EBOOK: capítulos específicos del Blueprint PDF. */}
                {(pdfBlueprint?.chapters ?? []).map((ch, idx) => (
                  <div
                    key={ch.id}
                    style={{
                      padding: "20px",
                      borderRadius: "16px",
                      background: "#0c0c0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: "#a855f7",
                        fontSize: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      CAPÍTULO {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div style={{ fontWeight: "bold" }}>{ch.title}</div>
                    <div style={{ color: "#666", fontSize: "12px", marginTop: "6px" }}>
                      {ch.summary}
                    </div>

                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      {ch.sectionTitles.length} secciones
                    </div>
                  </div>
                ))}
                {/* WEB INTERACTIVA: secciones específicas del Blueprint web. */}
                {(webBlueprint?.sections ?? []).map((sec, idx) => (
                  <div
                    key={sec.id}
                    style={{
                      padding: "20px",
                      borderRadius: "16px",
                      background: "#0c0c0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: "#a855f7",
                        fontSize: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      SECCIÓN {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div style={{ fontWeight: "bold" }}>{sec.title}</div>
                    <div style={{ color: "#666", fontSize: "12px", marginTop: "6px" }}>
                      {sec.purpose}
                    </div>

                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      {sec.componentTypes.length} componentes
                    </div>
                  </div>
                ))}
                {/* FASE 3: módulos específicos del Blueprint real. Sin fallback
                    genérico Fundamentos/Estrategia para el flujo Curso. */}
                {(realBlueprint?.modules ?? []).map((mod, idx) => (
                  <div
                    key={mod.title}
                    style={{
                      padding: "20px",
                      borderRadius: "16px",
                      background: "#0c0c0f",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        color: "#a855f7",
                        fontSize: "12px",
                        marginBottom: "10px",
                      }}
                    >
                      MÓDULO {String(idx + 1).padStart(2, "0")}
                    </div>

                    <div style={{ fontWeight: "bold" }}>{mod.title}</div>
                    <div style={{ color: "#666", fontSize: "12px", marginTop: "6px" }}>
                      {mod.description}
                    </div>

                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      {mod.lessons.length} lecciones
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setCreated(false)}
                  style={{
                    padding: "14px 20px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ← Modificar idea
                </button>

                <button
                  onClick={buildProduct}
                  style={{
                    padding: "14px 22px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#7c3aed",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Construir producto
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "30px 5%",
          textAlign: "center",
          color: "#555",
          fontSize: "13px",
        }}
      >
        © 2026 Crow Market — Create. Sell. Grow.
      </footer>
    </main>
  );
}