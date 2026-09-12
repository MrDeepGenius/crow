"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Blueprint } from "@/app/types";
import type { GeneratedCourse } from "@/app/services/ai/types";
import { MockAIEngine } from "./components/MockAIEngine";
// DEPRECATED (FASE 1): camino simulado con progreso falso. Se conserva por
// compatibilidad pero ya no es el flujo principal. Flujo principal:
// Create Studio -> MockAIProvider -> CourseGenerationEngine -> CoursePlayer.
import {
  EbookPreview,
  GuidePreview,
  WebPreview,
  ResourceKitPreview,
} from "./components/Previews";
import { CoursePlayer } from "./components/CoursePlayer";
import { PublishButton } from "./components/PublishButton";

export default function BuilderPage() {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  // FASE 10: tipo canónico GeneratedCourse. Se acepta GeneratedProduct legacy
  // solo para no romper previews viejos (deprecated).
  const [product, setProduct] = useState<GeneratedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [buildStarted, setBuildStarted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  // FASE 1: flujo único principal = mock real. No hay toggle a simulado.
  const [mockResult, setMockResult] = useState<GeneratedCourse | null>(null);
  const [mockError, setMockError] = useState<string | null>(null);

  // Cargar Blueprint de sessionStorage. La idea original se conserva en
  // crow_idea y el blueprint específico en crow_blueprint (FASE 3).
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedBlueprint =
        sessionStorage.getItem("productBlueprint") ??
        sessionStorage.getItem("crow_blueprint");

      if (savedBlueprint) {
        try {
          const parsed = JSON.parse(savedBlueprint);
          // Normalizar: el blueprint real trae lessons como objetos; el legacy
          // como strings. El Builder usa el formato legacy para el header.
          if (Array.isArray(parsed.modules) && parsed.modules[0]?.lessons?.[0]?.title) {
            setBlueprint({
              title: parsed.title,
              type: "Curso",
              idea:
                parsed.idea ??
                sessionStorage.getItem("crow_idea") ??
                parsed.description ??
                "",
              modules: parsed.modules.map(
                (m: { title: string; lessons: { title: string }[] }) => ({
                  title: m.title,
                  lessons: m.lessons.map((l) => l.title),
                })
              ),
            });
            setEditingTitle(parsed.title);
          } else {
            setBlueprint(parsed);
            setEditingTitle(parsed.title);
          }
        } catch (error) {
          console.error("Error al parsear Blueprint:", error);
          setBlueprint(null);
        }
      }

      setLoading(false);
    }
  }, []);

  const handleMockComplete = (result: GeneratedCourse) => {
    setMockResult(result);
  };

  const handleMockError = (error: string) => {
    setMockError(error);
  };

  // Auto-usar resultado del Build Engine real si está disponible.
  // El progreso viene del estado real del engine (MockAIEngine), no de timers falsos.
  useEffect(() => {
    if (mockResult && !product) {
      setProduct(mockResult);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("generatedProduct", JSON.stringify(mockResult));
          localStorage.setItem("crow_last_course", JSON.stringify(mockResult));
        } catch {
          // almacenamiento lleno o no disponible: no bloquea el flujo
        }
      }
    }
  }, [mockResult, product]);

  // Los errores de generación se guardan y muestran; no hay fallback a simulado.
  useEffect(() => {
    if (mockError) {
      console.error("Error en generación (Build Engine real):", mockError);
    }
  }, [mockError]);

  // Manejar clic en "Construir producto"
  const handleStartBuild = () => {
    setBuildStarted(true);
  };

  // Manejar clic en "Volver a Create"
  const handleBackToCreate = () => {
    sessionStorage.removeItem("productBlueprint");
    sessionStorage.removeItem("generatedProduct");
    sessionStorage.removeItem("crow_idea");
    sessionStorage.removeItem("crow_spec");
    sessionStorage.removeItem("crow_blueprint");
    router.push("/create");
  };

  // Pantalla vacía si no hay Blueprint
  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#888",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "15px" }}>
            ⟳
          </div>
          <div style={{ fontSize: "16px" }}>Cargando...</div>
        </div>
      </main>
    );
  }

  if (!blueprint) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "2px",
              color: "#a855f7",
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            SIN PROYECTO
          </div>

          <h1
            style={{
              fontSize: "28px",
              marginBottom: "12px",
              margin: "0 0 12px",
            }}
          >
            No encontramos un proyecto para construir.
          </h1>

          <p
            style={{
              color: "#888",
              fontSize: "15px",
              marginBottom: "30px",
              lineHeight: "1.6",
            }}
          >
            Parece que no hay un Blueprint disponible. Vuelve a Create Studio
            para generar una nueva idea y comenzar la construcción.
          </p>

          <button
            onClick={handleBackToCreate}
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ← Volver a Create Studio
          </button>
        </div>
      </main>
    );
  }

  // ========================================
  // FASE 1: BLUEPRINT PREVIEW (antes de construir)
  // ========================================
  if (!buildStarted) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* HEADER */}
        <header
          style={{
            height: "72px",
            padding: "0 4%",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(5,5,5,0.8)",
          }}
        >
          <a
            href="/create"
            onClick={(e) => {
              e.preventDefault();
              handleBackToCreate();
            }}
            style={{
              color: "#fff",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: "bold",
              fontSize: "19px",
              cursor: "pointer",
            }}
          >
            <img
              src="/crowlogo.png"
              alt="Crow"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
              }}
            />
            Crow Create Studio
          </a>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#aaa",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#8f8",
                display: "inline-block",
              }}
            />
            Blueprint listo
          </div>
        </header>

        {/* CONTENT */}
        <section
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
            padding: "45px 24px 80px",
          }}
        >
          {/* TOP */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "30px",
              marginBottom: "35px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#a855f7",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  letterSpacing: "1px",
                }}
              >
                ✦ BLUEPRINT GENERADO
              </div>

              <h1
                style={{
                  fontSize: "clamp(30px, 5vw, 48px)",
                  margin: "0 0 12px",
                  letterSpacing: "-2px",
                }}
              >
                {blueprint.title}
              </h1>

              <p
                style={{
                  color: "#888",
                  maxWidth: "650px",
                  lineHeight: "1.6",
                  margin: 0,
                  fontSize: "15px",
                }}
              >
                {blueprint.idea}
              </p>
            </div>

            <div
              style={{
                minWidth: "190px",
                padding: "18px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.09)",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  color: "#666",
                  fontSize: "11px",
                  marginBottom: "8px",
                }}
              >
                TIPO DE PRODUCTO
              </div>

              <div
                style={{
                  color: "#c084fc",
                  fontWeight: "bold",
                  fontSize: "15px",
                }}
              >
                {blueprint.type}
              </div>

              <div
                style={{
                  color: "#666",
                  fontSize: "11px",
                  marginTop: "8px",
                }}
              >
                {blueprint.modules.length} módulos
              </div>
            </div>
          </div>

          {/* BLUEPRINT DETAILS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "15px",
              marginBottom: "30px",
            }}
          >
            {blueprint.modules.map((module, idx) => (
              <div
                key={module.title}
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
                    fontWeight: "bold",
                  }}
                >
                  MÓDULO {idx + 1}
                </div>

                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  {module.title}
                </div>

                <div
                  style={{
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  {module.lessons.length} lecciones
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "11px",
                    color: "#666",
                  }}
                >
                  {module.lessons.slice(0, 2).map((lesson) => (
                    <div key={lesson} style={{ marginBottom: "4px" }}>
                      • {lesson}
                    </div>
                  ))}
                  {module.lessons.length > 2 && (
                    <div style={{ marginTop: "4px", fontStyle: "italic" }}>
                      + {module.lessons.length - 2} más
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={handleBackToCreate}
              style={{
                padding: "14px 20px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              ← Modificar Blueprint
            </button>

            <button
              onClick={handleStartBuild}
              style={{
                padding: "14px 22px",
                borderRadius: "12px",
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Construir producto
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ========================================
  // FASE 2: BUILD PROGRESS (REAL O SIMULADO)
  // ========================================
  // FASE 2: BUILD PROGRESS (MOCK O SIMULADO)
  // FASE 1: flujo único real. Sin timers falsos: el progreso lo reporta
  // MockAIEngine desde el estado real de CourseGenerationEngine.
  if (buildStarted && !mockResult) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* HEADER */}
        <header
          style={{
            height: "72px",
            padding: "0 4%",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(5,5,5,0.8)",
          }}
        >
          <div
            style={{
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: "bold",
              fontSize: "19px",
            }}
          >
            <img
              src="/crowlogo.png"
              alt="Crow"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
              }}
            />
            Crow Product Builder
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#aaa",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#c084fc",
                display: "inline-block",
              }}
            />
            Generando con Build Engine (mock, contenido real)
          </div>
        </header>

        {/* CONTENT */}
        <section
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
            padding: "45px 24px 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "30px",
              marginBottom: "35px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "#a855f7",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "12px",
                  letterSpacing: "1px",
                }}
              >
                CROW BUILD ENGINE
              </div>

              <h1
                style={{
                  fontSize: "clamp(30px, 5vw, 48px)",
                  margin: "0 0 12px",
                  letterSpacing: "-2px",
                }}
              >
                Crow está creando tu curso
              </h1>

              <p
                style={{
                  color: "#888",
                  maxWidth: "650px",
                  lineHeight: "1.6",
                  margin: 0,
                  fontSize: "15px",
                }}
              >
                Crow analiza tu idea, diseña la estructura pedagógica y genera contenido real etapa por etapa. Cada etapa guarda su resultado y el progreso refleja contenido existente, no una animación.
              </p>
            </div>
          </div>

          {/* BUILD ENGINE REAL (único flujo principal) */}
          {blueprint ? (
            <MockAIEngine
              idea={blueprint.idea}
              onComplete={handleMockComplete}
              onError={handleMockError}
            />
          ) : (
            <div style={{ color: "#888", fontSize: "14px" }}>
              Falta el Blueprint. Volvé a Create Studio para generarlo desde tu idea.
            </div>
          )}

          <div
            style={{
              textAlign: "center",
              marginTop: "25px",
              padding: "15px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#666",
              fontSize: "11px",
            }}
          >
            Modo mock: contenido específico sin APIs externas. El camino simulado
            anterior quedó deprecated y no se usa en este flujo.
          </div>
        </section>
      </main>
    );
  }

  // ========================================
  // FASE 3: PRODUCTO COMPLETADO + PREVIEW
  // ========================================
  // Solo se muestra como completado si el producto existe realmente (regla absoluta).
  // FASE 3: PRODUCTO COMPLETADO + PREVIEW
  if (!showPreview && mockResult && product) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* HEADER */}
        <header
          style={{
            height: "72px",
            padding: "0 4%",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(5,5,5,0.8)",
          }}
        >
          <div
            style={{
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: "bold",
              fontSize: "19px",
            }}
          >
            <img
              src="/crowlogo.png"
              alt="Crow"
              style={{
                width: "40px",
                height: "40px",
                objectFit: "contain",
              }}
            />
            Crow Market
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#aaa",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#8f8",
                display: "inline-block",
              }}
            />
            Producto completado
          </div>
        </header>

        {/* CONTENT */}
        <section
          style={{
            maxWidth: "1250px",
            margin: "0 auto",
            padding: "45px 24px 80px",
          }}
        >
          {/* SUCCESS MESSAGE */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "40px",
              padding: "30px",
              borderRadius: "18px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div
              style={{
                fontSize: "13px",
                letterSpacing: "2px",
                color: "#22c55e",
                marginBottom: "15px",
                fontWeight: "bold",
              }}
            >
              PRODUCTO COMPLETADO
            </div>

            <h1
              style={{
                fontSize: "32px",
                margin: "0 0 12px",
              }}
            >
              Tu producto está listo
            </h1>

            <p
              style={{
                color: "#888",
                fontSize: "15px",
              }}
            >
              Hemos generado {product ? product.stats.totalLessons : 0} lecciones,
              {product ? product.stats.totalActivities : 0} actividades y{" "}
              {product ? product.stats.totalQuizzes : 0} quizzes de contenido real,
              listos para usar.
            </p>
          </div>

          {/* PRODUCT SUMMARY */}
          <div
            style={{
              background: "rgba(15,15,18,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "24px",
              padding: "35px",
              boxShadow: "0 25px 80px rgba(100,30,255,0.15)",
              marginBottom: "30px",
            }}
          >
            <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px" }}>
              RESUMEN DEL PRODUCTO
            </div>

            <h2
              style={{
                fontSize: "28px",
                margin: "8px 0 12px",
                fontWeight: "bold",
              }}
            >
              {blueprint.title}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "15px",
                marginBottom: "25px",
              }}
            >
              <div
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  background: "#0c0c0f",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ color: "#666", fontSize: "11px" }}>TIPO</div>
                <div style={{ fontWeight: "bold", marginTop: "6px" }}>
                  {blueprint.type}
                </div>
              </div>

              <div
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  background: "#0c0c0f",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ color: "#666", fontSize: "11px" }}>MÓDULOS</div>
                <div
                  style={{
                    fontWeight: "bold",
                    marginTop: "6px",
                    fontSize: "18px",
                    color: "#a855f7",
                  }}
                >
                  {blueprint.modules.length}
                </div>
              </div>

              <div
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  background: "#0c0c0f",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ color: "#666", fontSize: "11px" }}>ESTADO</div>
                <div style={{ fontWeight: "bold", marginTop: "6px", color: "#8f8" }}>
                  ✓ Listo
                </div>
              </div>
            </div>

            <p
              style={{
                color: "#aaa",
                lineHeight: "1.7",
                marginBottom: "25px",
              }}
            >
              <strong style={{ color: "#fff" }}>Descripción:</strong>{" "}
              {blueprint.idea}
            </p>

            {/* ACTION BUTTONS */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowPreview(true)}
                  style={{
                    padding: "14px 22px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#7c3aed",
                    color: "#fff",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Ver preview
                </button>

                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: "14px 22px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Editar producto
                </button>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    setBuildStarted(false);
                  }}
                  style={{
                    padding: "14px 22px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ↻ Regenerar
                </button>

                <PublishButton from="course" />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ========================================
  // FASE 4: PRODUCT PREVIEW
  // ========================================
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 50% 0%, #241044 0%, #09070d 38%, #050505 75%)",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: "72px",
          padding: "0 4%",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(5,5,5,0.8)",
        }}
      >
        <button
          onClick={() => setShowPreview(false)}
          style={{
            background: "transparent",
            color: "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          ← Volver
        </button>

        <div
          style={{
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          Preview - {blueprint.type}
        </div>

        <div style={{ width: "100px" }} />
      </header>

      {/* CONTENT */}
      <section
        style={{
          maxWidth: "1250px",
          margin: "0 auto",
          padding: "30px 24px 60px",
        }}
      >
        {/* FASE 8: CoursePlayer es el único reproductor principal del flujo.
            Los previews legacy (Ebook/Guía/Web/Kit) se conservan en
            components/Previews.tsx como deprecated para reutilizar luego. */}
        {product ? (
          <CoursePlayer course={product} />
        ) : (
          <div style={{ color: "#888", fontSize: "14px" }}>
            El producto todavía no existe. Completá la generación para ver el preview.
          </div>
        )}
      </section>
    </main>
  );
}
