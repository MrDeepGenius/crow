// ============================================
// BUILD PROGRESS COMPONENT
// ============================================

import { BuildStep, BuildStepType } from "@/app/types";
import { useEffect, useState } from "react";

interface BuildProgressProps {
  steps: BuildStep[];
  currentStep: BuildStepType;
  overallProgress: number;
  isComplete: boolean;
}

export function BuildProgress({
  steps,
  currentStep,
  overallProgress,
  isComplete,
}: BuildProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Animar la barra de progreso
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        const target = overallProgress;
        const diff = target - prev;
        if (Math.abs(diff) < 1) return target;
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [overallProgress]);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div
      style={{
        padding: "25px",
        borderRadius: "18px",
        background: "rgba(15,15,18,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "25px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold" }}>
            ✦ CONSTRUCCIÓN EN PROGRESO
          </div>
          <h2 style={{ margin: "8px 0 0", fontSize: "18px" }}>
            {isComplete ? "🎉 ¡Producto completado!" : "Construyendo tu producto"}
          </h2>
        </div>

        <div
          style={{
            textAlign: "right",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "4px" }}>
            Progreso
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: isComplete ? "#8f8" : "#c084fc",
            }}
          >
            {Math.round(displayProgress)}%
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div
        style={{
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            height: "8px",
            borderRadius: "12px",
            background: "#19151f",
            overflow: "hidden",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "12px",
              background: isComplete
                ? "linear-gradient(90deg, #22c55e, #84cc16)"
                : "linear-gradient(90deg, #7c3aed, #c084fc)",
              width: `${displayProgress}%`,
              transition: "width 0.3s ease",
              boxShadow: isComplete
                ? "0 0 20px rgba(34, 197, 94, 0.5)"
                : "0 0 20px rgba(124, 58, 237, 0.5)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#666",
          }}
        >
          <span>Iniciando</span>
          <span>En progreso</span>
          <span>{isComplete ? "Completado" : "Finalizando"}</span>
        </div>
      </div>

      {/* STEPS */}
      <div style={{ marginTop: "25px" }}>
        <div
          style={{
            color: "#666",
            fontSize: "11px",
            fontWeight: "bold",
            marginBottom: "12px",
            letterSpacing: "1px",
          }}
        >
          ETAPAS DE CONSTRUCCIÓN
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          {steps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isProcessing = step.status === "processing";
            const isPending = step.status === "pending";

            return (
              <div
                key={step.id}
                style={{
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    isCompleted
                      ? "rgba(34, 197, 94, 0.1)"
                      : isProcessing
                        ? "rgba(124, 58, 237, 0.15)"
                        : "rgba(255,255,255,0.02)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* ICON */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      background: isCompleted
                        ? "#22c55e"
                        : isProcessing
                          ? "#7c3aed"
                          : "#444",
                      color: "#fff",
                    }}
                  >
                    {isCompleted ? "✓" : isProcessing ? "⟳" : idx + 1}
                  </div>

                  <div
                    style={{
                      fontSize: "11px",
                      color:
                        isCompleted
                          ? "#8f8"
                          : isProcessing
                            ? "#c084fc"
                            : "#666",
                      fontWeight: "bold",
                    }}
                  >
                    {isCompleted ? "Hecho" : isProcessing ? "Procesando" : "Pendiente"}
                  </div>
                </div>

                {/* LABEL */}
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#fff",
                    marginBottom: "6px",
                  }}
                >
                  {step.label}
                </div>

                {/* PROGRESS */}
                <div
                  style={{
                    height: "4px",
                    borderRadius: "2px",
                    background: "rgba(255,255,255,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "2px",
                      background: isCompleted
                        ? "#22c55e"
                        : isProcessing
                          ? "#7c3aed"
                          : "transparent",
                      width: isCompleted ? "100%" : `${step.progress}%`,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CURRENT STEP INFO */}
      {!isComplete && currentStepIndex >= 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "12px",
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <div
            style={{
              color: "#c084fc",
              fontSize: "11px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            ⟳ ETAPA ACTUAL: {steps[currentStepIndex].label}
          </div>
          <div
            style={{
              color: "#aaa",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            {currentStepIndex === 0 &&
              "Analizando el Blueprint y preparando la estructura base..."}
            {currentStepIndex === 1 &&
              "Organizando módulos y definiendo la arquitectura del contenido..."}
            {currentStepIndex === 2 &&
              "Generando contenido detallado, ejemplos y recursos..."}
            {currentStepIndex === 3 &&
              "Diseñando la interfaz y experiencia del usuario..."}
            {currentStepIndex === 4 &&
              "Preparando recursos multimedia y assets adicionales..."}
            {currentStepIndex === 5 &&
              "Integrando todos los componentes en el producto final..."}
            {currentStepIndex === 6 &&
              "Preparando la vista previa interactiva del producto..."}
          </div>
        </div>
      )}

      {/* COMPLETION MESSAGE */}
      {isComplete && (
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            borderRadius: "12px",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "#8f8",
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "6px",
            }}
          >
            ✓ Construcción completada
          </div>
          <div
            style={{
              color: "#aaa",
              fontSize: "12px",
            }}
          >
            Tu producto está listo para ser visualizado, editado y publicado.
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// BUILD PROGRESS SIMULATOR
// ============================================

const BUILD_STEPS_CONFIG: Array<Omit<BuildStep, "progress">> = [
  { id: "analyzing", label: "Analizando Blueprint", status: "pending" },
  { id: "structure", label: "Preparando estructura", status: "pending" },
  { id: "content", label: "Generando contenido", status: "pending" },
  { id: "design", label: "Diseñando experiencia", status: "pending" },
  { id: "resources", label: "Preparando recursos", status: "pending" },
  { id: "building", label: "Construyendo producto", status: "pending" },
  { id: "preview", label: "Preparando Preview", status: "pending" },
];

export function useBuildSimulation() {
  const initialSteps: BuildStep[] = BUILD_STEPS_CONFIG.map((step) => ({
    ...step,
    progress: 0,
  }));

  const [steps, setSteps] = useState<BuildStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState<BuildStepType>("analyzing");
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [currentStepProgress, setCurrentStepProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const TOTAL_STEPS = initialSteps.length;
    const STEP_DURATION = 2000; // 2 segundos por paso
    const ANIMATION_INTERVAL = 100; // 100ms por actualizacion visual
    const INCREMENT_PER_TICK = (ANIMATION_INTERVAL / STEP_DURATION) * 100; // Incremento por tick

    const updateBuild = () => {
      if (!isMounted) return;

      setCurrentStepProgress((prevProgress) => {
        const newProgress = prevProgress + INCREMENT_PER_TICK;

        setCurrentStepIdx((currentIdx) => {
          let nextIdx = currentIdx;

          // Si el paso se completó, pasar al siguiente
          if (newProgress >= 100) {
            // Actualizar steps con el paso actual como completado
            setSteps((prev) => {
              const updated = [...prev];
              
              if (updated[currentIdx] !== undefined) {
                updated[currentIdx].status = "completed";
                updated[currentIdx].progress = 100;
              }

              // Marcar siguiente como processing
              if (currentIdx + 1 < TOTAL_STEPS && updated[currentIdx + 1] !== undefined) {
                updated[currentIdx + 1].status = "processing";
              }

              return updated;
            });

            nextIdx = currentIdx + 1;

            // Si terminaron todos los pasos
            if (nextIdx >= TOTAL_STEPS) {
              if (isMounted) {
                setIsComplete(true);
                setProgress(100);
              }
              return currentIdx; // No avanzar más
            }

            // Cambiar step actual
            if (isMounted && initialSteps[nextIdx]) {
              setCurrentStep(initialSteps[nextIdx].id as BuildStepType);
            }

            return nextIdx;
          } else {
            // Actualizar progreso del step actual
            setSteps((prev) => {
              const updated = [...prev];
              
              if (updated[currentIdx] !== undefined) {
                updated[currentIdx].progress = Math.min(
                  Math.round(newProgress),
                  99
                );
                if (updated[currentIdx].status === "pending") {
                  updated[currentIdx].status = "processing";
                }
              }

              return updated;
            });

            // Calcular progreso total
            const totalProgress = ((currentIdx * 100 + newProgress) / TOTAL_STEPS) * 100;
            if (isMounted) {
              setProgress(Math.min(totalProgress, 99));
            }

            return currentIdx;
          }
        });

        return newProgress >= 100 ? 0 : newProgress;
      });
    };

    const interval = setInterval(updateBuild, ANIMATION_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { steps, currentStep, progress, isComplete };
}
