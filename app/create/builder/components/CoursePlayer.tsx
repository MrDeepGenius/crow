// ============================================
// COURSE PLAYER - Visualizador de cursos
// ============================================

"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  GeneratedCourse,
  GeneratedLesson,
  GeneratedQuiz,
  ActivityContent,
} from "@/app/services/ai/types";

// ============================================
// PROPS
// ============================================

interface CoursePlayerProps {
  course: GeneratedCourse;
  /** Si se provee, el progreso se persiste (usado por /learn). */
  progressKey?: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function CoursePlayer({ course, progressKey }: CoursePlayerProps) {
  const [currentModule, setCurrentModule] = useState<number>(0);
  const [currentLesson, setCurrentLesson] = useState<number>(0);
  const [restoredProgress, setRestoredProgress] = useState(false);
  // FASE 8: vistas lección | examen | certificado (único reproductor principal)
  const [view, setView] = useState<"lesson" | "exam" | "certificate">("lesson");
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  // Respuestas por actividad/quiz/examen (sin any): clave -> índice u opción
  const [activityAnswers, setActivityAnswers] = useState<Record<string, string | number>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | number>>({});
  const [quizChecked, setQuizChecked] = useState<Record<string, boolean>>({});
  const [examAnswers, setExamAnswers] = useState<Record<string, string | number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // ============================================
  // ESTADO INICIAL
  // ============================================

  const currentModuleData = course.modules[currentModule];
  const currentLessonData = currentModuleData?.lessons[currentLesson];

  // ============================================
  // MANEJO DE PROGRESO
  // ============================================

  // Progreso persistido (solo cuando progressKey está definido, ej. /learn).
  useEffect(() => {
    if (!progressKey || restoredProgress || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(progressKey);
      if (raw) {
        const saved = JSON.parse(raw) as { lessons?: string[]; module?: number; lesson?: number };
        if (Array.isArray(saved.lessons)) setCompletedLessons(new Set(saved.lessons));
        if (typeof saved.module === "number") setCurrentModule(saved.module);
        if (typeof saved.lesson === "number") setCurrentLesson(saved.lesson);
      }
    } catch {
      // sin progreso previo
    }
    setRestoredProgress(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey]);

  useEffect(() => {
    if (!progressKey || !restoredProgress || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        progressKey,
        JSON.stringify({ lessons: [...completedLessons], module: currentModule, lesson: currentLesson })
      );
    } catch {
      // no bloquea
    }
  }, [progressKey, restoredProgress, completedLessons, currentModule, currentLesson]);

  const markLessonComplete = (moduleId: string, lessonId: string) => {
    setCompletedLessons(prev => new Set([...prev, `${moduleId}-${lessonId}`]));
  };

  const isLessonComplete = (moduleId: string, lessonId: string): boolean => {
    return completedLessons.has(`${moduleId}-${lessonId}`);
  };

  // ============================================
  // NAVEGACIÓN
  // ============================================

  const openLesson = (m: number, l: number) => {
    setCurrentModule(m);
    setCurrentLesson(l);
    setView("lesson");
  };

  const openExam = () => setView("exam");
  const openCertificate = () => setView("certificate");

  const goToPrevious = () => {
    if (view !== "lesson") {
      setView("lesson");
      return;
    }
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
    } else if (currentModule > 0) {
      setCurrentModule(currentModule - 1);
      const prevModule = course.modules[currentModule - 1];
      setCurrentLesson(prevModule.lessons.length - 1);
    }
  };

  const goToNext = () => {
    if (view !== "lesson") {
      setView("lesson");
      return;
    }
    if (currentLesson < currentModuleData.lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    } else if (currentModule < course.modules.length - 1) {
      setCurrentModule(currentModule + 1);
      setCurrentLesson(0);
    } else {
      // Al terminar las lecciones, llevar al examen final real
      setView("exam");
    }
  };

  // FASE 6: puntuación real del examen
  const examScore = (() => {
    const qs = course.finalExam.questions;
    if (qs.length === 0) return { earned: 0, total: 0, percent: 0, passed: false };
    let earned = 0;
    let total = 0;
    qs.forEach((q) => {
      total += q.points;
      const ans = examAnswers[q.id];
      if (ans !== undefined && String(ans) === String(q.correctAnswer)) earned += q.points;
    });
    const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
    return { earned, total, percent, passed: percent >= course.finalExam.passingScore };
  })();

  const allLessonsDone = completedLessons.size >= course.stats.totalLessons;
  // FASE 7: certificado opcional con condiciones reales
  const certificateEnabled = course.certificate.enabled !== false;
  const certificateEarned = certificateEnabled && allLessonsDone && examSubmitted && examScore.passed;

  const cardStyle: CSSProperties = {
    background: "rgba(124,58,237,0.08)",
    border: "1px solid rgba(124,58,237,0.25)",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "25px",
  };
  const labelStyle: CSSProperties = {
    color: "#c084fc",
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "10px",
  };
  const bodyStyle: CSSProperties = { color: "#aaa", fontSize: "14px", lineHeight: "1.7" };

  const renderActivity = (activity: ActivityContent, scopeId: string) => {
    const key = `${scopeId}-activity`;
    if (activity.type === "multiple_choice") {
      const payload = activity.content as {
        questions?: { question: string; options: string[]; correctAnswer: number }[];
      } | null | undefined;
      const q = payload?.questions?.[0] ?? null;
      if (!q) return null;
      const picked = activityAnswers[key];
      return (
        <div style={cardStyle}>
          <div style={labelStyle}>Actividad · {activity.title}</div>
          <div style={{ ...bodyStyle, marginBottom: "8px" }}>{activity.instruction}</div>
          <div style={{ color: "#fff", fontSize: "14px", fontWeight: "bold", marginBottom: "12px" }}>{q.question}</div>
          {q.options.map((opt, idx) => (
            <label key={opt} style={{ display: "flex", gap: "10px", alignItems: "center", color: "#aaa", fontSize: "13px", marginBottom: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name={key}
                checked={picked === idx}
                onChange={() => setActivityAnswers((p) => ({ ...p, [key]: idx }))}
              />
              {opt}
            </label>
          ))}
          {picked !== undefined && (
            <div style={{ ...bodyStyle, marginTop: "10px", color: picked === q.correctAnswer ? "#22c55e" : "#f87171" }}>
              {picked === q.correctAnswer ? "Correcto. " : "Todavía no. "}
              {activity.feedback}
            </div>
          )}
        </div>
      );
    }
    if (activity.type === "true_false") {
      const payload = activity.content as {
        statements?: { statement: string; correctAnswer: boolean }[];
      } | null | undefined;
      const statements = payload?.statements ?? [];
      return (
        <div style={cardStyle}>
          <div style={labelStyle}>Actividad · {activity.title}</div>
          <div style={{ ...bodyStyle, marginBottom: "12px" }}>{activity.instruction}</div>
          {statements.map((s, i) => {
            const k = `${key}-tf-${i}`;
            const picked = activityAnswers[k];
            return (
              <div key={s.statement} style={{ marginBottom: "12px" }}>
                <div style={{ color: "#ddd", fontSize: "13px", marginBottom: "6px" }}>{s.statement}</div>
                <div style={{ display: "flex", gap: "12px" }}>
                  {(["true", "false"] as const).map((v) => (
                    <label key={v} style={{ color: "#aaa", fontSize: "13px", display: "flex", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={k}
                        checked={picked === v}
                        onChange={() => setActivityAnswers((p) => ({ ...p, [k]: v }))}
                      />
                      {v === "true" ? "Verdadero" : "Falso"}
                    </label>
                  ))}
                </div>
                {picked !== undefined && (
                  <div style={{ fontSize: "12px", marginTop: "4px", color: String(picked) === String(s.correctAnswer) ? "#22c55e" : "#f87171" }}>
                    {String(picked) === String(s.correctAnswer) ? "Correcto." : "Revisá la lección e intentá de nuevo."}
                  </div>
                )}
              </div>
            );
          })}
          <div style={bodyStyle}>{activity.feedback}</div>
        </div>
      );
    }
    if (activity.type === "checklist") {
      const payload = activity.content as { items?: string[] } | null | undefined;
      const items = payload?.items ?? [];
      return (
        <div style={cardStyle}>
          <div style={labelStyle}>Actividad · {activity.title}</div>
          <div style={{ ...bodyStyle, marginBottom: "12px" }}>{activity.instruction}</div>
          {items.map((item) => {
            const k = `${key}-check-${item}`;
            return (
              <label key={item} style={{ display: "flex", gap: "10px", color: "#aaa", fontSize: "13px", marginBottom: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!checklist[k]}
                  onChange={() => setChecklist((p) => ({ ...p, [k]: !p[k] }))}
                />
                {item}
              </label>
            );
          })}
          <div style={bodyStyle}>{activity.feedback}</div>
        </div>
      );
    }
    // case_study y otros: escenario + preguntas con respuesta esperada
    const payload = activity.content as {
      scenario?: string;
      questions?: { question: string; expected: string }[];
    } | null | undefined;
    const scenario = payload?.scenario;
    const questions = payload?.questions ?? [];
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Actividad · {activity.title}</div>
        <div style={{ ...bodyStyle, marginBottom: "12px" }}>{activity.instruction}</div>
        {scenario && <div style={{ color: "#ddd", fontSize: "13px", marginBottom: "12px" }}>{scenario}</div>}
        {questions.map((item) => (
          <div key={item.question} style={{ marginBottom: "10px" }}>
            <div style={{ color: "#fff", fontSize: "13px", marginBottom: "4px" }}>{item.question}</div>
            <div style={{ color: "#888", fontSize: "12px" }}>Respuesta esperada: {item.expected}</div>
          </div>
        ))}
        <div style={bodyStyle}>{activity.feedback}</div>
      </div>
    );
  };

  const renderQuiz = (quiz: GeneratedQuiz, scopeId: string) => {
    const checked = !!quizChecked[scopeId];
    let earned = 0;
    let total = 0;
    quiz.questions.forEach((q) => {
      total += q.points;
      const ans = quizAnswers[`${scopeId}-${q.id}`];
      if (ans !== undefined && String(ans) === String(q.correctAnswer)) earned += q.points;
    });
    const percent = total === 0 ? 0 : Math.round((earned / total) * 100);
    return (
      <div style={cardStyle}>
        <div style={labelStyle}>Quiz · {quiz.title} (aprobás con {quiz.passingScore}%)</div>
        {quiz.questions.map((q) => {
          const k = `${scopeId}-${q.id}`;
          const ans = quizAnswers[k];
          return (
            <div key={q.id} style={{ marginBottom: "14px" }}>
              <div style={{ color: "#fff", fontSize: "13px", fontWeight: "bold", marginBottom: "8px" }}>{q.question}</div>
              {q.type === "true_false" ? (
                <div style={{ display: "flex", gap: "12px" }}>
                  {(["true", "false"] as const).map((v) => (
                    <label key={v} style={{ color: "#aaa", fontSize: "13px", display: "flex", gap: "6px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={k}
                        checked={ans === v}
                        onChange={() => setQuizAnswers((p) => ({ ...p, [k]: v }))}
                      />
                      {v === "true" ? "Verdadero" : "Falso"}
                    </label>
                  ))}
                </div>
              ) : (
                (q.options ?? []).map((opt, idx) => (
                  <label key={opt} style={{ display: "flex", gap: "10px", color: "#aaa", fontSize: "13px", marginBottom: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={k}
                      checked={ans === idx}
                      onChange={() => setQuizAnswers((p) => ({ ...p, [k]: idx }))}
                    />
                    {opt}
                  </label>
                ))
              )}
              {checked && (
                <div style={{ fontSize: "12px", marginTop: "6px", color: ans !== undefined && String(ans) === String(q.correctAnswer) ? "#22c55e" : "#f87171" }}>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
        <button
          onClick={() => setQuizChecked((p) => ({ ...p, [scopeId]: true }))}
          style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: "13px" }}
        >
          {checked ? `Verificado: ${percent}%` : "Verificar respuestas"}
        </button>
      </div>
    );
  };

  const renderExam = () => (
    <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "16px", padding: "30px", marginBottom: "20px" }}>
      <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", marginBottom: "15px" }}>
        EVALUACIÓN FINAL · {course.finalExam.timeLimit} min · Aprobás con {course.finalExam.passingScore}%
      </div>
      <h2 style={{ fontSize: "24px", margin: "0 0 10px" }}>{course.finalExam.title}</h2>
      <div style={{ color: "#aaa", fontSize: "14px", marginBottom: "12px" }}>{course.finalExam.description}</div>
      <ul style={{ color: "#666", fontSize: "12px", marginBottom: "20px", paddingLeft: "18px" }}>
        {course.finalExam.instructions.map((ins) => (
          <li key={ins}>{ins}</li>
        ))}
      </ul>
      {course.finalExam.questions.map((q, idx) => {
        const ans = examAnswers[q.id];
        return (
          <div key={q.id} style={{ marginBottom: "18px", padding: "16px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>
              {idx + 1}. {q.question} ({q.points} pts)
            </div>
            {q.type === "true_false" ? (
              <div style={{ display: "flex", gap: "12px" }}>
                {(["true", "false"] as const).map((v) => (
                  <label key={v} style={{ color: "#aaa", fontSize: "13px", display: "flex", gap: "6px", cursor: "pointer" }}>
                    <input type="radio" name={q.id} checked={ans === v} disabled={examSubmitted} onChange={() => setExamAnswers((p) => ({ ...p, [q.id]: v }))} />
                    {v === "true" ? "Verdadero" : "Falso"}
                  </label>
                ))}
              </div>
            ) : (
              (q.options ?? []).map((opt, oidx) => (
                <label key={opt} style={{ display: "flex", gap: "10px", color: "#aaa", fontSize: "13px", marginBottom: "6px", cursor: "pointer" }}>
                  <input type="radio" name={q.id} checked={ans === oidx} disabled={examSubmitted} onChange={() => setExamAnswers((p) => ({ ...p, [q.id]: oidx }))} />
                  {opt}
                </label>
              ))
            )}
            {examSubmitted && (
              <div style={{ fontSize: "12px", marginTop: "8px", color: ans !== undefined && String(ans) === String(q.correctAnswer) ? "#22c55e" : "#f87171" }}>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
      {!examSubmitted ? (
        <button
          onClick={() => setExamSubmitted(true)}
          style={{ padding: "12px 20px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
        >
          Enviar examen
        </button>
      ) : (
        <div style={{ padding: "16px", borderRadius: "10px", background: examScore.passed ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", border: examScore.passed ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ fontWeight: "bold", color: examScore.passed ? "#22c55e" : "#f87171" }}>
            Resultado: {examScore.earned}/{examScore.total} puntos · {examScore.percent}% · {examScore.passed ? "Aprobado" : "No aprobado"}
          </div>
          {!examScore.passed && (
            <button
              onClick={() => { setExamSubmitted(false); setExamAnswers({}); }}
              style={{ marginTop: "10px", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: "13px" }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderCertificateView = () => {
    if (!certificateEnabled) {
      return <div style={bodyStyle}>El certificado está desactivado para este curso.</div>;
    }
    return (
      <div style={{ background: "#0d0c10", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "16px", padding: "30px", marginBottom: "20px", textAlign: "center" }}>
        <div style={{ color: "#f59e0b", fontSize: "12px", fontWeight: "bold", marginBottom: "10px" }}>
          {certificateEarned ? "CERTIFICADO OBTENIDO" : "CERTIFICADO PENDIENTE"}
        </div>
        <h2 style={{ fontSize: "24px", margin: "0 0 8px" }}>{course.certificate.title}</h2>
        <div style={{ color: "#aaa", fontSize: "14px", marginBottom: "16px" }}>{course.certificate.description}</div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#888", fontSize: "12px", display: "block", marginBottom: "6px" }}>Nombre del alumno</label>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Escribí tu nombre para el diploma"
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)", background: "#000", color: "#fff", width: "280px", maxWidth: "100%" }}
          />
        </div>
        <div style={{ color: "#ddd", fontSize: "14px", lineHeight: "1.8" }}>
          <div><strong>{studentName || "Tu nombre"}</strong> completó <strong>{course.certificate.courseTitle ?? course.metadata.title}</strong></div>
          <div style={{ color: "#888", fontSize: "12px", marginTop: "8px" }}>
            Autor: {course.certificate.author ?? course.metadata.author} · Fecha: {(course.certificate.dateIssued ?? course.metadata.createdAt).slice(0, 10)} · ID: {course.certificate.certificateId ?? course.certificate.id}
          </div>
          <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>
            Requiere {course.certificate.requirements.minimumScore}% en examen
            {course.certificate.requirements.completedLessons ? " y todas las lecciones" : ""}.
            Estado: {completedLessons.size}/{course.stats.totalLessons} lecciones · Examen {examSubmitted ? `${examScore.percent}%` : "pendiente"}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDERIZADO DE LECCIÓN
  // ============================================

  const renderLessonContent = (lesson: GeneratedLesson) => (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      borderRadius: "16px",
      padding: "30px",
      marginBottom: "20px"
    }}>
      <div style={{
        color: "#a855f7",
        fontSize: "12px",
        fontWeight: "bold",
        marginBottom: "15px"
      }}>
        LECCIÓN {currentLesson + 1} • {lesson.estimatedMinutes}min
      </div>

      <h2 style={{
        fontSize: "24px",
        margin: "0 0 20px",
        fontWeight: "bold"
      }}>
        {lesson.title}
      </h2>

      {/* INTRODUCCIÓN */}
      <div style={{ marginBottom: "25px" }}>
        <div style={{
          color: "#888",
          fontSize: "13px",
          marginBottom: "8px"
        }}>
          Introducción
        </div>
        <div style={{
          color: "#fff",
          lineHeight: "1.7",
          fontSize: "15px"
        }}>
          {lesson.content.introduction}
        </div>
      </div>

      {/* EXPLICACIÓN */}
      <div style={{ marginBottom: "25px" }}>
        <div style={{
          color: "#888",
          fontSize: "13px",
          marginBottom: "8px"
        }}>
          Contenido
        </div>
        <div style={{
          color: "#aaa",
          lineHeight: "1.8",
          fontSize: "14px",
          whiteSpace: "pre-line"
        }}>
          {lesson.content.explanation}
        </div>
      </div>

      {/* PUNTOS CLAVE */}
      {lesson.content.keyPoints && lesson.content.keyPoints.length > 0 && (
        <div style={{ marginBottom: "25px" }}>
          <div style={{
            color: "#888",
            fontSize: "13px",
            marginBottom: "8px"
          }}>
            Puntos clave
          </div>
          <ul style={{
            color: "#aaa",
            lineHeight: "1.7",
            fontSize: "14px",
            paddingLeft: "20px",
            margin: 0
          }}>
            {lesson.content.keyPoints.map((point, idx) => (
              <li key={idx} style={{ marginBottom: "8px" }}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* EJEMPLOS */}
      {lesson.content.examples && lesson.content.examples.length > 0 && (
        <div style={{ marginBottom: "25px" }}>
          <div style={{
            color: "#888",
            fontSize: "13px",
            marginBottom: "8px"
          }}>
            Ejemplos prácticos
          </div>
          <div style={{
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: "12px",
            padding: "20px"
          }}>
            {lesson.content.examples.map((example, idx) => (
              <div key={idx} style={{
                marginBottom: "15px",
                paddingBottom: "15px",
                borderBottom: idx < lesson.content.examples.length - 1 
                  ? "1px solid rgba(255,255,255,0.1)" 
                  : "none"
              }}>
                <div style={{
                  color: "#a855f7",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "6px"
                }}>
                  Ejemplo {idx + 1}
                </div>
                <div style={{
                  color: "#aaa",
                  lineHeight: "1.6",
                  fontSize: "14px"
                }}>
                  {example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FASE 4: secciones desarrolladas */}
      {lesson.content.sections && lesson.content.sections.length > 0 && (
        <div style={{ marginBottom: "25px" }}>
          {lesson.content.sections.map((s) => (
            <div key={s.heading} style={{ marginBottom: "16px" }}>
              <div style={{ color: "#fff", fontSize: "14px", fontWeight: "bold", marginBottom: "6px" }}>
                {s.heading}
              </div>
              <div style={{ color: "#aaa", lineHeight: "1.8", fontSize: "14px" }}>{s.body}</div>
            </div>
          ))}
        </div>
      )}

      {/* FASE 4: ejercicio práctico */}
      {lesson.content.exercise && (
        <div style={{
          marginBottom: "25px",
          padding: "20px",
          borderRadius: "12px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.25)",
        }}>
          <div style={{ color: "#93c5fd", fontSize: "12px", fontWeight: "bold", marginBottom: "8px" }}>
            Ejercicio práctico
          </div>
          <div style={{ color: "#aaa", lineHeight: "1.7", fontSize: "14px", whiteSpace: "pre-line" }}>
            {lesson.content.exercise}
          </div>
        </div>
      )}

      {/* VIDEO: sin URLs inventadas. Solo reproductor si hay URL real. */}
      {lesson.video && (
        <div style={{ marginBottom: "25px" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px" }}>
            Video educativo
          </div>
          {lesson.video.url ? (
            <video controls src={lesson.video.url} style={{ width: "100%", borderRadius: "12px" }} />
          ) : (
            <div style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center"
            }}>
              <div style={{ color: "#888", fontSize: "14px", marginBottom: "10px" }}>
                {lesson.video.title}
              </div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Video pendiente — duración estimada {lesson.video.duration} segundos.
                Se podrá incorporar una URL real más adelante.
              </div>
            </div>
          )}
        </div>
      )}

      {/* FASE 5: actividad interactiva funcional */}
      {lesson.activity && renderActivity(lesson.activity, lesson.id)}

      {/* FASE 5: quiz de la lección con feedback */}
      {lesson.quiz && renderQuiz(lesson.quiz, `lesson-${lesson.id}`)}

      {/* Recursos */}
      {lesson.content.resources && lesson.content.resources.length > 0 && (
        <div style={{ marginBottom: "25px" }}>
          <div style={{ color: "#888", fontSize: "13px", marginBottom: "8px" }}>
            Recursos
          </div>
          <ul style={{ color: "#aaa", fontSize: "13px", paddingLeft: "20px", margin: 0 }}>
            {lesson.content.resources.map((r) => (
              <li key={r} style={{ marginBottom: "6px" }}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RESUMEN */}
      {lesson.content.summary && (
        <div style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "25px"
        }}>
          <div style={{
            color: "#22c55e",
            fontSize: "12px",
            fontWeight: "bold",
            marginBottom: "10px"
          }}>
            Resumen de la lección
          </div>
          <div style={{
            color: "#aaa",
            lineHeight: "1.7",
            fontSize: "14px"
          }}>
            {lesson.content.summary}
          </div>
        </div>
      )}

      {/* BOTONES DE NAVEGACIÓN */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "30px"
      }}>
        <button
          onClick={goToPrevious}
          disabled={currentModule === 0 && currentLesson === 0}
          style={{
            padding: "12px 20px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "#aaa",
            cursor: currentModule === 0 && currentLesson === 0 ? "not-allowed" : "pointer",
            opacity: currentModule === 0 && currentLesson === 0 ? 0.5 : 1,
            fontSize: "14px"
          }}
        >
          ← Anterior
        </button>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => markLessonComplete(currentModuleData.id, lesson.id)}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "1px solid rgba(124,58,237,0.3)",
              background: "rgba(124,58,237,0.1)",
              color: "#a855f7",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            {isLessonComplete(currentModuleData.id, lesson.id) ? "✓ Completada" : "Marcar como completada"}
          </button>

          <button
            onClick={goToNext}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {currentModule === course.modules.length - 1 &&
            currentLesson === currentModuleData.lessons.length - 1
              ? "Ir al examen final"
              : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div style={{
      minHeight: "100vh",
      background: "rgba(5,5,5,0.95)",
      color: "#fff"
    }}>
      {/* HEADER */}
      <header style={{
        height: "70px",
        padding: "0 4%",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(10,10,12,0.9)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px"
        }}>
          <img
            src="/crowlogo.png"
            alt="Crow"
            style={{
              width: "32px",
              height: "32px",
              objectFit: "contain"
            }}
          />
          <div>
            <div style={{
              fontSize: "14px",
              color: "#888"
            }}>
              Crow Course Studio
            </div>
            <div style={{
              fontSize: "16px",
              fontWeight: "bold"
            }}>
              {course.metadata.title}
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "15px"
        }}>
          <div style={{
            color: "#888",
            fontSize: "12px"
          }}>
            Progreso: {completedLessons.size}/{course.stats.totalLessons} lecciones
          </div>
          <div style={{
            width: "100px",
            height: "6px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "3px",
            overflow: "hidden"
          }}>
            <div style={{
              height: "100%",
              width: `${(completedLessons.size / course.stats.totalLessons) * 100}%`,
              background: "#7c3aed",
              transition: "width 0.3s ease"
            }} />
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <div style={{
        display: "flex",
        minHeight: "calc(100vh - 70px)"
      }}>
        {/* SIDEBAR - MÓDULOS */}
        <div style={{
          width: "280px",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,15,18,0.8)",
          padding: "20px",
          overflowY: "auto"
        }}>
          <div style={{
            color: "#888",
            fontSize: "12px",
            marginBottom: "20px",
            fontWeight: "bold"
          }}>
            MÓDULOS DEL CURSO
          </div>

          {course.modules.map((module, moduleIdx) => (
            <div key={module.id} style={{ marginBottom: "15px" }}>
              <div
                onClick={() => openLesson(moduleIdx, 0)}
                style={{
                  padding: "15px",
                  borderRadius: "10px",
                  background: moduleIdx === currentModule 
                    ? "rgba(124,58,237,0.2)" 
                    : "rgba(255,255,255,0.03)",
                  border: moduleIdx === currentModule 
                    ? "1px solid rgba(124,58,237,0.4)" 
                    : "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px"
                }}>
                  <div style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: moduleIdx === currentModule ? "#fff" : "#aaa"
                  }}>
                    {module.title}
                  </div>
                  <div style={{
                    fontSize: "11px",
                    color: "#666"
                  }}>
                    {module.estimatedHours}h
                  </div>
                </div>

                <div style={{
                  fontSize: "12px",
                  color: "#888",
                  marginBottom: "12px",
                  lineHeight: "1.4"
                }}>
                  {module.description}
                </div>

                {/* LECCIONES DEL MÓDULO */}
                <div style={{ paddingLeft: "10px" }}>
                  {module.lessons.map((lesson, lessonIdx) => (
                    <div
                      key={lesson.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        openLesson(moduleIdx, lessonIdx);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        marginBottom: "6px",
                        background: moduleIdx === currentModule && lessonIdx === currentLesson
                          ? "rgba(124,58,237,0.3)"
                          : "transparent",
                        border: "1px solid rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: isLessonComplete(module.id, lesson.id)
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(255,255,255,0.1)",
                        color: isLessonComplete(module.id, lesson.id)
                          ? "#22c55e"
                          : "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: "bold"
                      }}>
                        {isLessonComplete(module.id, lesson.id) ? "✓" : lessonIdx + 1}
                      </div>
                      
                      <div style={{
                        fontSize: "12px",
                        color: moduleIdx === currentModule && lessonIdx === currentLesson
                          ? "#fff"
                          : isLessonComplete(module.id, lesson.id)
                          ? "#aaa"
                          : "#888",
                        flex: 1,
                        lineHeight: "1.3"
                      }}>
                        {lesson.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* FASE 6-7: examen final y certificado reales en la navegación */}
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={openExam}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: view === "exam" ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)",
                background: view === "exam" ? "rgba(124,58,237,0.2)" : "transparent",
                color: "#ddd",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                textAlign: "left",
              }}
            >
              Evaluación final · {course.finalExam.questions.length} preguntas
              {examSubmitted ? ` · ${examScore.percent}%` : ""}
            </button>
            {certificateEnabled && (
              <button
                onClick={openCertificate}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  border: view === "certificate" ? "1px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: view === "certificate" ? "rgba(245,158,11,0.12)" : "transparent",
                  color: "#ddd",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "bold",
                  textAlign: "left",
                }}
              >
                Certificado {certificateEarned ? "· obtenido" : "· pendiente"}
              </button>
            )}
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div style={{
          flex: 1,
          padding: "30px",
          overflowY: "auto"
        }}>
          {view === "exam" ? (
            renderExam()
          ) : view === "certificate" ? (
            renderCertificateView()
          ) : currentLessonData ? (
            renderLessonContent(currentLessonData)
          ) : (
            <div style={{
              textAlign: "center",
              padding: "60px",
              color: "#888"
            }}>
              <div style={{ fontSize: "18px", marginBottom: "10px" }}>
                Selecciona una lección para comenzar
              </div>
              <div style={{ fontSize: "14px" }}>
                Haz clic en cualquier lección del panel izquierdo para ver su contenido
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}