// ============================================
// PROFESSIONAL COURSE PLATFORM
// ============================================

import { CourseProduct } from "@/app/types";
import { useState } from "react";

interface CoursePlatformProps {
  product: CourseProduct;
}

export function CoursePlatform({ product }: CoursePlatformProps) {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(
    new Set()
  );
  const [showResources, setShowResources] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentModule = product.modules[selectedModule];
  const currentLesson = currentModule?.lessons[selectedLesson];

  const totalLessons = product.modules.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );
  const progressPercentage = Math.round(
    (completedLessons.size / totalLessons) * 100
  );

  const markLessonComplete = () => {
    const lessonId = `${selectedModule}-${selectedLesson}`;
    const newCompleted = new Set(completedLessons);
    newCompleted.add(lessonId);
    setCompletedLessons(newCompleted);

    // Auto-avanzar a siguiente lección
    if (selectedLesson < currentModule.lessons.length - 1) {
      setSelectedLesson(selectedLesson + 1);
    } else if (selectedModule < product.modules.length - 1) {
      setSelectedModule(selectedModule + 1);
      setSelectedLesson(0);
    }
  };

  const downloadModulePDF = (moduleIdx: number) => {
    const module = product.modules[moduleIdx];
    const content = `
${module.title}
${product.title}

DESCRIPCIÓN:
${module.description}

LECCIONES:
${module.lessons.map((lesson, idx) => `${idx + 1}. ${lesson}`).join("\n")}

CONTENIDO COMPLETO:
${module.lessons
  .map(
    (lesson, idx) => `
LECCIÓN ${idx + 1}: ${lesson}
${currentModule.lessons[idx]?.introduction || "Contenido de la lección"}
`
  )
  .join("\n")}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${module.title.replace(/\s+/g, "_")}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isCourseComplete = completedLessons.size === totalLessons;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f8f9fa",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: sidebarOpen ? "320px" : "0",
          background: "#1f2937",
          color: "#fff",
          borderRight: "1px solid #374151",
          overflowY: "auto",
          transition: "width 0.3s",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "20px" }}>
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Contenido del curso
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>

          {/* PROGRESS */}
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              borderRadius: "8px",
              background: "rgba(124, 58, 237, 0.1)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#aaa",
                marginBottom: "8px",
              }}
            >
              Progreso del curso
            </div>
            <div
              style={{
                height: "6px",
                borderRadius: "3px",
                background: "#333",
                overflow: "hidden",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #7c3aed, #9333ea)",
                  width: `${progressPercentage}%`,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#c084fc",
              }}
            >
              {progressPercentage}% completado
            </div>
          </div>

          {/* MODULES LIST */}
          {product.modules.map((module, modIdx) => (
            <div key={module.title} style={{ marginBottom: "15px" }}>
              <button
                onClick={() => {
                  setSelectedModule(modIdx);
                  setSelectedLesson(0);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    selectedModule === modIdx
                      ? "rgba(124, 58, 237, 0.2)"
                      : "transparent",
                  color: selectedModule === modIdx ? "#fff" : "#aaa",
                  cursor: "pointer",
                  marginBottom: "8px",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        selectedModule === modIdx
                          ? "#7c3aed"
                          : "#444",
                      fontSize: "11px",
                    }}
                  >
                    {modIdx + 1}
                  </span>
                  {module.title}
                </div>
              </button>

                  {selectedModule === modIdx && (
                <div style={{ paddingLeft: "12px" }}>
                  {module.lessons.map((lesson, lesIdx) => {
                    const lessonId = `${modIdx}-${lesIdx}`;
                    const isCompleted = completedLessons.has(lessonId);

                    // Extraer el título si lesson es un objeto
                    const lessonTitle =
                      typeof lesson === "string" ? lesson : lesson.title;

                    return (
                      <button
                        key={lessonTitle}
                        onClick={() => {
                          setSelectedLesson(lesIdx);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: "6px",
                          border: "none",
                          background:
                            selectedLesson === lesIdx
                              ? "rgba(124, 58, 237, 0.3)"
                              : "rgba(255,255,255,0.05)",
                          color: "#ddd",
                          cursor: "pointer",
                          marginBottom: "6px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "50%",
                            border: isCompleted
                              ? "none"
                              : "2px solid #666",
                            background: isCompleted
                              ? "#22c55e"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {isCompleted ? "✓" : ""}
                        </span>
                        <span>{lessonTitle}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            height: "70px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 30px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "transparent",
              border: "none",
              color: "#1f2937",
              cursor: "pointer",
              fontSize: "20px",
            }}
          >
            ☰
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: "bold",
              color: "#1f2937",
            }}
          >
            {product.title}
          </h1>

          <div
            style={{
              display: "flex",
              gap: "12px",
            }}
          >
            <button
              onClick={() => setShowResources(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#1f2937",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              📚 Recursos
            </button>

            {isCourseComplete && (
              <button
                onClick={() => setShowCertificate(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                }}
              >
                🎓 Certificado
              </button>
            )}
          </div>
        </div>

        {/* VIDEO + CONTENT */}
        <div
          style={{
            flex: 1,
            padding: "30px",
            overflowY: "auto",
          }}
        >
          {currentLesson && (
            <>
              {/* VIDEO PLAYER */}
              <div
                style={{
                  marginBottom: "30px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#000",
                  aspectRatio: "16/9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                    color: "#fff",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "15px" }}>
                    ▶️
                  </div>
                  <div style={{ fontSize: "14px", color: "#aaa" }}>
                    Video: {currentLesson.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
                    Duración: ~15 minutos
                  </div>
                </div>
              </div>

              {/* LESSON CONTENT */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "30px",
                  color: "#1f2937",
                  lineHeight: "1.8",
                }}
              >
                <h2 style={{ margin: "0 0 15px", fontSize: "24px" }}>
                  {currentLesson.title}
                </h2>

                <p style={{ color: "#6b7280", marginBottom: "25px" }}>
                  Módulo {selectedModule + 1} • Lección {selectedLesson + 1} de{" "}
                  {currentModule.lessons.length}
                </p>

                {/* INTRODUCTION */}
                <div style={{ marginBottom: "25px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    Introducción
                  </h3>
                  <p style={{ color: "#4b5563" }}>
                    {currentLesson.introduction}
                  </p>
                </div>

                {/* EXPLANATION */}
                <div style={{ marginBottom: "25px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    Contenido
                  </h3>
                  <p style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>
                    {currentLesson.explanation}
                  </p>
                </div>

                {/* EXAMPLES */}
                <div style={{ marginBottom: "25px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    Ejemplos Prácticos
                  </h3>
                  {Array.isArray(currentLesson.examples) && (
                    <ul style={{ color: "#4b5563", paddingLeft: "20px" }}>
                      {currentLesson.examples.map((example: string) => (
                        <li key={example} style={{ marginBottom: "8px" }}>
                          {example}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* KEY POINTS */}
                <div
                  style={{
                    marginBottom: "25px",
                    padding: "15px",
                    borderRadius: "8px",
                    background: "#f3f4f6",
                    borderLeft: "4px solid #7c3aed",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    📌 Puntos Clave
                  </h3>
                  {Array.isArray(currentLesson.keyPoints) && (
                    <ul style={{ color: "#4b5563", paddingLeft: "20px", margin: 0 }}>
                      {currentLesson.keyPoints.map((point: string) => (
                        <li key={point} style={{ marginBottom: "6px" }}>
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* EXERCISE */}
                <div
                  style={{
                    marginBottom: "25px",
                    padding: "15px",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    borderLeft: "4px solid #3b82f6",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    ✏️ Ejercicio
                  </h3>
                  <p style={{ color: "#4b5563", margin: 0, whiteSpace: "pre-wrap" }}>
                    {currentLesson.exercise}
                  </p>
                </div>

                {/* SUMMARY */}
                <div
                  style={{
                    padding: "15px",
                    borderRadius: "8px",
                    background: "#f0fdf4",
                    borderLeft: "4px solid #22c55e",
                  }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "10px" }}>
                    📝 Resumen
                  </h3>
                  <p style={{ color: "#4b5563", margin: 0, whiteSpace: "pre-wrap" }}>
                    {currentLesson.summary}
                  </p>
                </div>

                {/* NAVIGATION */}
                <div
                  style={{
                    marginTop: "30px",
                    paddingTop: "30px",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      if (selectedLesson > 0) {
                        setSelectedLesson(selectedLesson - 1);
                      } else if (selectedModule > 0) {
                        setSelectedModule(selectedModule - 1);
                        setSelectedLesson(
                          product.modules[selectedModule - 1].lessons.length - 1
                        );
                      }
                    }}
                    disabled={selectedModule === 0 && selectedLesson === 0}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#1f2937",
                      cursor:
                        selectedModule === 0 && selectedLesson === 0
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        selectedModule === 0 && selectedLesson === 0 ? 0.5 : 1,
                    }}
                  >
                    ← Anterior
                  </button>

                  <button
                    onClick={markLessonComplete}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "6px",
                      border: "none",
                      background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                      color: "#fff",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ✓ Marcar como completada
                  </button>

                  <button
                    onClick={() => {
                      if (
                        selectedLesson <
                        currentModule.lessons.length - 1
                      ) {
                        setSelectedLesson(selectedLesson + 1);
                      } else if (
                        selectedModule <
                        product.modules.length - 1
                      ) {
                        setSelectedModule(selectedModule + 1);
                        setSelectedLesson(0);
                      }
                    }}
                    disabled={
                      selectedModule === product.modules.length - 1 &&
                      selectedLesson === currentModule.lessons.length - 1
                    }
                    style={{
                      padding: "10px 20px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#1f2937",
                      cursor:
                        selectedModule === product.modules.length - 1 &&
                        selectedLesson === currentModule.lessons.length - 1
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        selectedModule === product.modules.length - 1 &&
                        selectedLesson === currentModule.lessons.length - 1
                          ? 0.5
                          : 1,
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* RECURSOS MODAL */}
      {showResources && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowResources(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
              color: "#1f2937",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 20px", fontSize: "20px" }}>
              Descargar Recursos
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}>
                Materiales por Módulo
              </h3>

              {product.modules.map((module, idx) => (
                <button
                  key={module.title}
                  onClick={() => downloadModulePDF(idx)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px",
                    marginBottom: "8px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>📄 {module.title} - PDF</span>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    ↓
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowResources(false)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "none",
                background: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      {showCertificate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowCertificate(false)}
        >
          <div
            style={{
              background: "#fef3c7",
              borderRadius: "12px",
              padding: "40px",
              maxWidth: "700px",
              textAlign: "center",
              border: "3px solid #f59e0b",
              color: "#b45309",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>
              🎓
            </div>

            <h1 style={{ margin: "0 0 10px", fontSize: "28px", fontWeight: "bold" }}>
              Certificado de Finalización
            </h1>

            <p style={{ margin: "0 0 20px", color: "#92400e" }}>
              Por completar exitosamente
            </p>

            <h2 style={{ margin: "0 0 10px", fontSize: "24px" }}>
              {product.title}
            </h2>

            <p style={{ margin: "0 0 20px", color: "#92400e" }}>
              ¡Felicitaciones! Has completado todos los módulos y lecciones
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                marginTop: "30px",
              }}
            >
              <button
                onClick={() => setShowCertificate(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#f59e0b",
                  color: "#fff",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ✓ Aceptar
              </button>

              <button
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  border: "1px solid #f59e0b",
                  background: "transparent",
                  color: "#b45309",
                  cursor: "pointer",
                }}
              >
                📥 Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
