// ============================================
// MOCK AI ENGINE - Componente de interfaz
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { CourseGenerationEngine } from "@/app/services/ai/CourseGenerationEngine";
import { GenerationState, GeneratedCourse } from "@/app/services/ai/types";

// ============================================
// PROPS
// ============================================

interface MockAIEngineProps {
  idea: string;
  onComplete: (result: GeneratedCourse) => void;
  onError: (error: string) => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function MockAIEngine({ idea, onComplete, onError }: MockAIEngineProps) {
  const [engine] = useState(() => new CourseGenerationEngine());
  const [state, setState] = useState<GenerationState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentOperation, setCurrentOperation] = useState("Inicializando...");
  const [elapsedTime, setElapsedTime] = useState(0);

  // ============================================
  // EFECTOS DE TIEMPO
  // ============================================

  useEffect(() => {
    if (!state || !isGenerating) return;

    const interval = setInterval(() => {
      const start = new Date(state.createdAt);
      const now = new Date();
      setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [state, isGenerating]);

  // ============================================
  // INICIAR GENERACIÓN
  // ============================================

  const startGeneration = useCallback(async () => {
    if (!idea.trim()) {
      onError("Por favor ingresa una idea para el curso");
      return;
    }

    setIsGenerating(true);
    setCurrentOperation("Analizando idea...");
    
    try {
      const result = await engine.generateCourse(idea);
      setCurrentOperation("Finalizando...");
      onComplete(result);
    } catch (error) {
      console.error("Error en generación:", error);
      onError(error instanceof Error ? error.message : "Error desconocido en generación");
    } finally {
      setIsGenerating(false);
    }
  }, [idea, engine, onComplete, onError]);

  // ============================================
  // INICIALIZACIÓN AUTOMÁTICA
  // ============================================

  useEffect(() => {
    // Verificar si hay estado guardado
    const hasSavedState = engine.loadStateFromStorage();
    
    if (hasSavedState) {
      const savedState = engine.getCurrentState();
      setState(savedState);
      setCurrentOperation("Recuperando generación previa...");
      
      // Continuar generación (el progreso es estado real del engine, no animación).
      // Nota: este setTimeout solo difiere la reanudación 1s para mostrar el
      // estado recuperado; no finge progreso.
      setTimeout(() => {
        if (savedState?.status === "completed" && savedState.result) {
          onComplete(savedState.result);
        } else if (savedState && savedState.status !== "failed" && savedState.originalIdea === idea) {
          startGeneration();
        } else {
          startGeneration();
        }
      }, 1000);
    } else {
      // Iniciar nueva generación
      startGeneration();
    }
  }, [idea]);

  // ============================================
  // OBSERVAR ESTADO
  // ============================================

  useEffect(() => {
    if (!isGenerating) return;

    const checkState = setInterval(() => {
      const currentState = engine.getCurrentState();
      setState(currentState);
      
      if (currentState?.progress?.currentStep) {
        const currentStep = currentState.progress.steps.find(
          s => s.id === currentState.progress.currentStep
        );
        
        if (currentStep) {
          setCurrentOperation(currentStep.description || currentStep.name);
        }
      }
    }, 500);

    return () => clearInterval(checkState);
  }, [isGenerating, engine]);

  // ============================================
  // FORMATO DE TIEMPO
  // ============================================

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  if (!state) {
    return (
      <div style={{
        textAlign: "center",
        padding: "40px",
        color: "#888"
      }}>
        <div style={{ fontSize: "32px", marginBottom: "15px" }}>⟳</div>
        <div>Preparando generador de cursos...</div>
      </div>
    );
  }

  const progress = state.progress.overallProgress;
  const currentStep = state.progress.steps.find(s => s.id === state.progress.currentStep);
  const completedSteps = state.progress.steps.filter(s => s.status === "completed").length;
  const totalSteps = state.progress.steps.length;

  return (
    <div style={{
      background: "rgba(15,15,18,0.9)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "20px",
      padding: "30px",
      marginTop: "20px"
    }}>
      {/* TÍTULO */}
      <div style={{
        marginBottom: "25px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h3 style={{
            fontSize: "20px",
            margin: "0 0 8px",
            fontWeight: "bold"
          }}>
            Crow AI - Generando Curso
          </h3>
          <div style={{
            color: "#888",
            fontSize: "13px"
          }}>
            {currentOperation}
          </div>
        </div>
        
        <div style={{
          background: "rgba(124,58,237,0.2)",
          color: "#a855f7",
          padding: "6px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "bold"
        }}>
          MODO MOCK
        </div>
      </div>

      {/* PROGRESO GENERAL */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px"
        }}>
          <span style={{ fontSize: "13px", color: "#aaa" }}>Progreso total</span>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#a855f7" }}>
            {progress}%
          </span>
        </div>
        
        <div style={{
          height: "8px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "#7c3aed",
            borderRadius: "4px",
            transition: "width 0.5s ease"
          }} />
        </div>
        
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "6px",
          fontSize: "11px",
          color: "#666"
        }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* PASOS DETALLADOS */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{
          color: "#888",
          fontSize: "12px",
          marginBottom: "15px"
        }}>
          Progreso por etapa ({completedSteps}/{totalSteps} completadas)
        </div>
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {state.progress.steps.map((step, index) => (
            <div key={step.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.05)",
              transition: "all 0.3s ease"
            }}>
              {/* INDICADOR DE ESTADO */}
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: step.status === "completed" 
                  ? "rgba(34,197,94,0.2)" 
                  : step.status === "processing"
                  ? "rgba(124,58,237,0.3)"
                  : "rgba(255,255,255,0.1)",
                color: step.status === "completed" 
                  ? "#22c55e"
                  : step.status === "processing"
                  ? "#a855f7"
                  : "#666",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                {step.status === "completed" ? "✓" :
                 step.status === "processing" ? "⟳" :
                 step.status === "failed" ? "✗" : index + 1}
              </div>

              {/* DETALLES DEL PASO */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px"
                }}>
                  <div style={{
                    fontWeight: step.status === "processing" ? "bold" : "normal",
                    color: step.status === "processing" ? "#fff" : 
                           step.status === "completed" ? "#aaa" : "#888",
                    fontSize: "14px"
                  }}>
                    {step.name}
                  </div>
                  
                  {step.progress > 0 && (
                    <div style={{
                      fontSize: "11px",
                      color: "#666"
                    }}>
                      {step.progress}%
                    </div>
                  )}
                </div>
                
                <div style={{
                  color: "#666",
                  fontSize: "11px"
                }}>
                  {step.description}
                </div>
                
                {/* BARRA DE PROGRESO DEL PASO */}
                {step.status === "processing" && step.progress > 0 && (
                  <div style={{
                    marginTop: "8px",
                    height: "4px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "2px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${step.progress}%`,
                      background: "#7c3aed",
                      borderRadius: "2px",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "12px",
        marginBottom: "25px"
      }}>
        <div style={{
          padding: "15px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "10px",
          textAlign: "center"
        }}>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px" }}>
            Tiempo
          </div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#a855f7" }}>
            {formatTime(elapsedTime)}
          </div>
        </div>
        
        <div style={{
          padding: "15px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "10px",
          textAlign: "center"
        }}>
          <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px" }}>
            Pasos
          </div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#a855f7" }}>
            {completedSteps}/{totalSteps}
          </div>
        </div>
        
        {state.progress.estimatedTimeRemaining && (
          <div style={{
            padding: "15px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "10px",
            textAlign: "center"
          }}>
            <div style={{ color: "#666", fontSize: "11px", marginBottom: "6px" }}>
              Estimado
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#a855f7" }}>
              ~{Math.ceil(state.progress.estimatedTimeRemaining / 60)}min
            </div>
          </div>
        )}
      </div>

      {/* CONTADOR DE ELEMENTOS GENERADOS */}
      {state.generatedModules.length > 0 && (
        <div style={{
          padding: "15px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                color: "#22c55e",
                fontSize: "13px",
                fontWeight: "bold",
                marginBottom: "4px"
              }}>
                Contenido generado
              </div>
              <div style={{ color: "#888", fontSize: "11px" }}>
                {state.generatedModules.length} módulos con {
                  state.generatedModules.reduce((sum, mod) => sum + mod.lessons.length, 0)
                } lecciones
              </div>
            </div>
            
            <div style={{
              background: "rgba(34,197,94,0.2)",
              color: "#22c55e",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: "bold"
            }}>
              EN PROGRESO
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE INFORMATIVO */}
      <div style={{
        padding: "15px",
        background: "rgba(124,58,237,0.1)",
        border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: "10px",
        fontSize: "12px",
        color: "#aaa",
        lineHeight: "1.6"
      }}>
        <strong>Nota:</strong> Este es el modo de desarrollo de Crow AI. El sistema está generando 
        contenido realista de prueba sin consumir APIs externas. Para producción, cambia a 
        OpenAI o Anthropic en la configuración.
      </div>

      {/* BOTONES DE CONTROL */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginTop: "25px",
        justifyContent: "flex-end"
      }}>
        <button
          onClick={() => engine.pauseGeneration()}
          disabled={!isGenerating}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#aaa",
            cursor: isGenerating ? "pointer" : "not-allowed",
            opacity: isGenerating ? 1 : 0.5,
            fontSize: "12px"
          }}
        >
          Pausar
        </button>
        
        <button
          onClick={() => {
            if (state.status === "failed" || state.progress.hasError) {
              startGeneration();
            } else {
              engine.cancelGeneration();
            }
          }}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.1)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "12px"
          }}
        >
          {state.status === "failed" ? "Reintentar" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}