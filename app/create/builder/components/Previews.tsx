// ============================================
// PREVIEW COMPONENTS
// ============================================

import {
  CourseProduct,
  EbookProduct,
  GuideProduct,
  WebProduct,
  ResourceKitProduct,
} from "@/app/types";
import { useState } from "react";

// ============================================
// COURSE PREVIEW
// ============================================

export function CoursePreview({
  product,
  onEdit,
}: {
  product: CourseProduct;
  onEdit?: (field: string, value: string) => void;
}) {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentModule = product.modules[selectedModule];
  const currentLesson = currentModule?.lessons[selectedLesson];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "250px 1fr",
        minHeight: "600px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0c10",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "25px 15px",
          background: "#0a090d",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            letterSpacing: "1px",
            marginBottom: "15px",
            padding: "0 10px",
            fontWeight: "bold",
          }}
        >
          MÓDULOS ({product.modules.length})
        </div>

        {product.modules.map((mod, idx) => (
          <button
            key={mod.title}
            onClick={() => {
              setSelectedModule(idx);
              setSelectedLesson(0);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              borderRadius: "10px",
              padding: "12px 10px",
              marginBottom: "6px",
              cursor: "pointer",
              color: selectedModule === idx ? "#fff" : "#888",
              background:
                selectedModule === idx
                  ? "rgba(124,58,237,0.2)"
                  : "transparent",
              fontSize: "13px",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    selectedModule === idx
                      ? "#7c3aed"
                      : "rgba(255,255,255,0.1)",
                  fontSize: "10px",
                }}
              >
                {idx + 1}
              </span>
              <span>{mod.title}</span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: "4px",
                marginLeft: "32px",
              }}
            >
              {mod.lessons.length} lecciones
            </div>
          </button>
        ))}

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            fontSize: "12px",
            color: "#aaa",
            lineHeight: "1.5",
          }}
        >
          <div
            style={{
              color: "#c084fc",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            📊 Progreso
          </div>
          {progress}% completado
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div
        style={{
          padding: "30px",
          background: "linear-gradient(135deg, #111014 0%, #0a090d 100%)",
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            marginBottom: "25px",
            paddingBottom: "20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "8px" }}>
            {currentModule?.title} • Lección {selectedLesson + 1}
          </div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "24px",
              fontWeight: "bold",
            }}
          >
            {currentLesson?.title}
          </h2>
        </div>

        {/* LESSON CONTENT */}
        {currentLesson && (
          <div style={{ color: "#ddd", lineHeight: "1.8" }}>
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(124,58,237,0.1)",
              }}
            >
              <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 8px" }}>
                Introducción
              </h3>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>
                {currentLesson.introduction}
              </p>
            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 8px" }}>
                Explicación
              </h3>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>
                {currentLesson.explanation}
              </p>
            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 8px" }}>
                Puntos Clave
              </h3>
              <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "13px" }}>
                {currentLesson.keyPoints.map((point) => (
                  <li key={point} style={{ marginBottom: "6px", color: "#aaa" }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <h3 style={{ color: "#fff", fontSize: "14px", margin: "0 0 8px" }}>
                Ejercicio
              </h3>
              <p style={{ margin: "0", fontSize: "13px", color: "#aaa" }}>
                {currentLesson.exercise}
              </p>
            </div>

            {/* NAVIGATION */}
            <div
              style={{
                marginTop: "30px",
                display: "flex",
                gap: "12px",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => {
                  if (selectedLesson > 0) setSelectedLesson(selectedLesson - 1);
                  else if (selectedModule > 0) {
                    setSelectedModule(selectedModule - 1);
                    setSelectedLesson(
                      product.modules[selectedModule - 1].lessons.length - 1
                    );
                  }
                }}
                disabled={selectedModule === 0 && selectedLesson === 0}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#888",
                  cursor:
                    selectedModule === 0 && selectedLesson === 0
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    selectedModule === 0 && selectedLesson === 0 ? 0.5 : 1,
                  fontSize: "12px",
                }}
              >
                ← Anterior
              </button>

              <button
                onClick={() => setProgress(Math.min(100, progress + 10))}
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                ✓ Marcar completada
              </button>

              <button
                onClick={() => {
                  if (
                    selectedLesson <
                    currentModule.lessons.length - 1
                  ) {
                    setSelectedLesson(selectedLesson + 1);
                  } else if (selectedModule < product.modules.length - 1) {
                    setSelectedModule(selectedModule + 1);
                    setSelectedLesson(0);
                  }
                }}
                disabled={
                  selectedModule === product.modules.length - 1 &&
                  selectedLesson === currentModule.lessons.length - 1
                }
                style={{
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#888",
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
                  fontSize: "12px",
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// EBOOK PREVIEW
// ============================================

export function EbookPreview({ product }: { product: EbookProduct }) {
  const [selectedChapter, setSelectedChapter] = useState(0);

  const chapter = product.chapters[selectedChapter];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        minHeight: "600px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0c10",
      }}
    >
      {/* TABLE OF CONTENTS */}
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "25px 15px",
          background: "#0a090d",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            letterSpacing: "1px",
            marginBottom: "15px",
            fontWeight: "bold",
          }}
        >
          CAPÍTULOS
        </div>

        <div
          style={{
            marginBottom: "15px",
            padding: "12px",
            borderRadius: "10px",
            background: "rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.3)",
            fontSize: "12px",
            color: "#c084fc",
            cursor: "pointer",
          }}
        >
          📖 Introducción
        </div>

        {product.chapters.map((ch, idx) => (
          <button
            key={ch.title}
            onClick={() => setSelectedChapter(idx)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "6px",
              cursor: "pointer",
              color: selectedChapter === idx ? "#fff" : "#888",
              background:
                selectedChapter === idx
                  ? "rgba(124,58,237,0.2)"
                  : "transparent",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📄</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {ch.title}
              </span>
            </div>
          </button>
        ))}
      </aside>

      {/* CONTENT */}
      <div
        style={{
          padding: "30px",
          background: "linear-gradient(135deg, #111014 0%, #0a090d 100%)",
          overflowY: "auto",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "28px",
            fontWeight: "bold",
          }}
        >
          {chapter.title}
        </h1>

        <div
          style={{
            color: "#888",
            fontSize: "13px",
            marginBottom: "20px",
          }}
        >
          Capítulo {selectedChapter + 1} de {product.chapters.length}
        </div>

        <div
          style={{
            color: "#ddd",
            lineHeight: "1.8",
            fontSize: "14px",
            whiteSpace: "pre-wrap",
            marginBottom: "25px",
          }}
        >
          {chapter.content}
        </div>

        {chapter.highlights.length > 0 && (
          <div
            style={{
              padding: "15px",
              borderRadius: "10px",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.2)",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                color: "#c084fc",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              ⭐ DESTACADOS
            </div>
            {chapter.highlights.map((h) => (
              <div
                key={h}
                style={{ color: "#aaa", fontSize: "12px", marginBottom: "4px" }}
              >
                • {h}
              </div>
            ))}
          </div>
        )}

        {/* NAVIGATION */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "30px",
            justifyContent: "space-between",
          }}
        >
          <button
            disabled={selectedChapter === 0}
            onClick={() => setSelectedChapter(Math.max(0, selectedChapter - 1))}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#888",
              cursor: selectedChapter === 0 ? "not-allowed" : "pointer",
              opacity: selectedChapter === 0 ? 0.5 : 1,
              fontSize: "12px",
            }}
          >
            ← Anterior
          </button>

          <button
            disabled={selectedChapter === product.chapters.length - 1}
            onClick={() =>
              setSelectedChapter(
                Math.min(product.chapters.length - 1, selectedChapter + 1)
              )
            }
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#888",
              cursor:
                selectedChapter === product.chapters.length - 1
                  ? "not-allowed"
                  : "pointer",
              opacity:
                selectedChapter === product.chapters.length - 1 ? 0.5 : 1,
              fontSize: "12px",
            }}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// GUIDE PREVIEW
// ============================================

export function GuidePreview({ product }: { product: GuideProduct }) {
  const [selectedStep, setSelectedStep] = useState(0);

  const step = product.steps[selectedStep];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "600px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0c10",
      }}
    >
      {/* STEPS LIST */}
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "25px 15px",
          background: "#0a090d",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            letterSpacing: "1px",
            marginBottom: "15px",
            fontWeight: "bold",
          }}
        >
          PASOS ({product.steps.length})
        </div>

        {product.steps.map((s, idx) => (
          <button
            key={s.title}
            onClick={() => setSelectedStep(idx)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "6px",
              cursor: "pointer",
              color: selectedStep === idx ? "#fff" : "#888",
              background:
                selectedStep === idx
                  ? "rgba(124,58,237,0.2)"
                  : "transparent",
              fontSize: "12px",
              transition: "all 0.2s",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    selectedStep === idx
                      ? "#7c3aed"
                      : "rgba(255,255,255,0.1)",
                  fontSize: "10px",
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.title}
              </span>
            </div>
          </button>
        ))}
      </aside>

      {/* CONTENT */}
      <div
        style={{
          padding: "30px",
          background: "linear-gradient(135deg, #111014 0%, #0a090d 100%)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            marginBottom: "8px",
          }}
        >
          PASO {step.order}
        </div>

        <h2
          style={{
            margin: "0 0 15px",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          {step.title}
        </h2>

        <div
          style={{
            color: "#ddd",
            lineHeight: "1.8",
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <strong style={{ color: "#fff" }}>Descripción:</strong>
          <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
            {step.content}
          </p>
        </div>

        <div
          style={{
            color: "#ddd",
            lineHeight: "1.8",
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <strong style={{ color: "#fff" }}>Ejemplo:</strong>
          <p style={{ margin: "8px 0 0", fontSize: "13px" }}>
            {step.example}
          </p>
        </div>

        <div
          style={{
            padding: "15px",
            borderRadius: "10px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#c084fc",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            ✓ CHECKLIST
          </div>
          {step.checklist.map((item) => (
            <div
              key={item}
              style={{
                color: "#aaa",
                fontSize: "12px",
                marginBottom: "6px",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* NAVIGATION */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "30px",
            justifyContent: "space-between",
          }}
        >
          <button
            disabled={selectedStep === 0}
            onClick={() => setSelectedStep(Math.max(0, selectedStep - 1))}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#888",
              cursor: selectedStep === 0 ? "not-allowed" : "pointer",
              opacity: selectedStep === 0 ? 0.5 : 1,
              fontSize: "12px",
            }}
          >
            ← Paso anterior
          </button>

          <button
            disabled={selectedStep === product.steps.length - 1}
            onClick={() =>
              setSelectedStep(Math.min(product.steps.length - 1, selectedStep + 1))
            }
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent",
              color: "#888",
              cursor:
                selectedStep === product.steps.length - 1
                  ? "not-allowed"
                  : "pointer",
              opacity:
                selectedStep === product.steps.length - 1 ? 0.5 : 1,
              fontSize: "12px",
            }}
          >
            Próximo paso →
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// WEB PREVIEW
// ============================================

export function WebPreview({ product }: { product: WebProduct }) {
  const [selectedPageId, setSelectedPageId] = useState("home");

  const page = product.pages.find((p) => p.id === selectedPageId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "600px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0c10",
      }}
    >
      {/* NAVIGATION */}
      <nav
        style={{
          display: "flex",
          gap: "20px",
          padding: "15px 25px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,15,18,0.8)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
          {product.title}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "15px" }}>
          {product.navigation.map((nav) => (
            <button
              key={nav}
              onClick={() => {
                const page = product.pages.find(
                  (p) => p.name === nav || p.id === nav.toLowerCase()
                );
                if (page) setSelectedPageId(page.id);
              }}
              style={{
                border: "none",
                background: "transparent",
                color:
                  page?.name === nav || page?.id === nav.toLowerCase()
                    ? "#a855f7"
                    : "#888",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {nav}
            </button>
          ))}
        </div>
      </nav>

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "linear-gradient(135deg, #111014 0%, #0a090d 100%)",
          overflowY: "auto",
        }}
      >
        {page ? (
          <>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "28px",
                fontWeight: "bold",
              }}
            >
              {page.title}
            </h1>

            <p
              style={{
                color: "#888",
                fontSize: "13px",
                marginBottom: "25px",
              }}
            >
              {page.description}
            </p>

            {page.sections.map((section) => (
              <div
                key={section.id}
                style={{
                  marginBottom: "25px",
                  padding: "20px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#a855f7",
                    fontSize: "14px",
                    fontWeight: "bold",
                    margin: "0 0 8px",
                  }}
                >
                  {section.title}
                </h3>
                <p
                  style={{
                    color: "#ddd",
                    fontSize: "13px",
                    margin: "0 0 10px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {section.content}
                </p>
              </div>
            ))}
          </>
        ) : (
          <div style={{ color: "#666" }}>Página no encontrada</div>
        )}
      </div>
    </div>
  );
}

// ============================================
// RESOURCE KIT PREVIEW
// ============================================

export function ResourceKitPreview({ product }: { product: ResourceKitProduct }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    product.categories[0] || null
  );

  const categoryResources = selectedCategory
    ? product.resources.filter((r) => r.category === selectedCategory)
    : product.resources;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: "600px",
        borderRadius: "20px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0d0c10",
      }}
    >
      {/* CATEGORIES */}
      <aside
        style={{
          borderRight: "1px solid rgba(255,255,255,0.08)",
          padding: "25px 15px",
          background: "#0a090d",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            letterSpacing: "1px",
            marginBottom: "15px",
            fontWeight: "bold",
          }}
        >
          CATEGORÍAS
        </div>

        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "none",
            borderRadius: "10px",
            padding: "10px",
            marginBottom: "6px",
            cursor: "pointer",
            color: selectedCategory === null ? "#fff" : "#888",
            background:
              selectedCategory === null
                ? "rgba(124,58,237,0.2)"
                : "transparent",
            fontSize: "12px",
          }}
        >
          📦 Todo
        </button>

        {product.categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              width: "100%",
              textAlign: "left",
              border: "none",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "6px",
              cursor: "pointer",
              color: selectedCategory === cat ? "#fff" : "#888",
              background:
                selectedCategory === cat
                  ? "rgba(124,58,237,0.2)"
                  : "transparent",
              fontSize: "12px",
            }}
          >
            📁 {cat}
          </button>
        ))}
      </aside>

      {/* RESOURCES */}
      <div
        style={{
          padding: "30px",
          background: "linear-gradient(135deg, #111014 0%, #0a090d 100%)",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            margin: "0 0 20px",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          {selectedCategory ? selectedCategory : "Todos los recursos"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "15px",
          }}
        >
          {categoryResources.map((resource) => (
            <div
              key={resource.id}
              style={{
                padding: "15px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(124,58,237,0.2)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(124,58,237,0.1)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(124,58,237,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.02)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(124,58,237,0.2)";
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  marginBottom: "8px",
                }}
              >
                {resource.type === "template"
                  ? "📋"
                  : resource.type === "tool"
                    ? "🔧"
                    : resource.type === "checklist"
                      ? "✅"
                      : "📖"}
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "12px",
                  marginBottom: "4px",
                  color: "#fff",
                }}
              >
                {resource.title}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#666",
                  lineHeight: "1.4",
                }}
              >
                {resource.description}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "30px",
            padding: "15px",
            borderRadius: "12px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#c084fc",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Total: {categoryResources.length} recursos
          </div>
        </div>
      </div>
    </div>
  );
}
