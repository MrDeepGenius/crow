// ============================================
// PROFESSIONAL COURSE GENERATOR
// ============================================

import { Blueprint } from "@/app/types";
import {
  ProfessionalCourse,
  Lesson,
  Module,
  QuizQuestion,
  Activity,
} from "@/app/types/course";

export function generateProfessionalCourse(blueprint: Blueprint): ProfessionalCourse {
  // Generar módulos profesionales
  const modules: Module[] = blueprint.modules.map((mod, modIdx) => ({
    id: `module-${modIdx}`,
    title: mod.title,
    description: `Este módulo cubre ${mod.title.toLowerCase()} y proporciona conocimiento profundo sobre los conceptos clave.`,
    order: modIdx + 1,
    lessons: mod.lessons.map((lesson, lesIdx) => generateLesson(lesson, modIdx, lesIdx)),
    estimatedHours: Math.ceil((mod.lessons.length * 15) / 60),
  }));

  // Calcular estadísticas
  const totalLessons = modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
  const totalActivities = modules.reduce(
    (sum, mod) =>
      sum +
      mod.lessons.filter((les) => les.content.activity || les.content.quiz).length,
    0
  );
  const totalQuizzes = modules.reduce(
    (sum, mod) =>
      sum + mod.lessons.filter((les) => les.content.quiz).length,
    0
  );

  return {
    id: `course-${Date.now()}`,
    metadata: {
      title: blueprint.title,
      subtitle: `Aprende ${blueprint.idea.toLowerCase()}`,
      description: blueprint.idea,
      author: "Crow AI",
      authorBio: "Crow es tu asistente educativo inteligente, diseñado para crear cursos excepcionales.",
      language: "es",
      level: "beginner",
      category: "Educación",
      tags: [blueprint.type, "Crow", "Aprendizaje"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    branding: {
      primaryColor: "#7c3aed",
      secondaryColor: "#9333ea",
      accentColor: "#c084fc",
      textStyle: "modern",
      coverImageStatus: "pending",
    },
    modules,
    certificate: {
      enabled: true,
      title: `Certificado de finalización: ${blueprint.title}`,
      description: "Completaste exitosamente este curso",
      conditions: {
        requireAllLessons: true,
        requireFinalExam: false,
        minimumScore: 70,
      },
    },
    stats: {
      totalLessons,
      totalDuration: modules.reduce(
        (sum, mod) => sum + mod.estimatedHours * 60,
        0
      ),
      totalActivities,
      totalQuizzes,
    },
  };
}

// ============================================
// LESSON GENERATOR
// ============================================

function generateLesson(
  lessonTitle: string,
  moduleIdx: number,
  lessonIdx: number
): Lesson {
  const lessonId = `lesson-${moduleIdx}-${lessonIdx}`;

  return {
    id: lessonId,
    title: lessonTitle,
    description: `En esta lección aprenderás sobre ${lessonTitle.toLowerCase()}.`,
    order: lessonIdx + 1,
    duration: "15 min",
    content: {
      video: {
        type: "video",
        status: "pending", // No existe video real aún
        duration: "15:30",
      },
      text: {
        type: "text",
        blocks: [
          {
            type: "heading",
            content: lessonTitle,
            order: 0,
          },
          {
            type: "paragraph",
            content: `${lessonTitle} es un concepto fundamental que debes comprender. En esta lección exploraremos sus principios básicos, aplicaciones prácticas y casos de uso reales.`,
            order: 1,
          },
          {
            type: "subheading",
            content: "Conceptos Clave",
            order: 2,
          },
          {
            type: "list",
            content: `• ${lessonTitle} requiere comprensión de fundamentos\n• La práctica es esencial para el dominio\n• Hay múltiples enfoques para aplicar este concepto\n• Los mejores resultados vienen de la experimentación`,
            order: 3,
          },
          {
            type: "subheading",
            content: "Aplicaciones Prácticas",
            order: 4,
          },
          {
            type: "paragraph",
            content: `Puedes aplicar ${lessonTitle} en contextos reales: En tu trabajo, en tus proyectos personales, y en colaboraciones con otros. La clave es entender los principios subyacentes.`,
            order: 5,
          },
          {
            type: "highlight",
            content: `💡 Tip: La mejor forma de aprender ${lessonTitle} es haciendo. Completa los ejercicios al final de esta lección.`,
            order: 6,
          },
        ],
      },
      activity: generateActivity(lessonTitle, moduleIdx, lessonIdx),
      quiz: generateQuiz(lessonTitle, moduleIdx, lessonIdx),
      resources: [
        {
          id: `resource-${lessonId}-1`,
          title: `Guía: ${lessonTitle}`,
          description: "PDF con conceptos y ejemplos",
          type: "pdf",
          fileStatus: "pending",
        },
        {
          id: `resource-${lessonId}-2`,
          title: `Checklist de ${lessonTitle}`,
          description: "Verifica qué has aprendido",
          type: "checklist",
          fileStatus: "pending",
        },
      ],
    },
    objectives: [
      `Entender los fundamentos de ${lessonTitle}`,
      `Aplicar ${lessonTitle} en contextos prácticos`,
      `Identificar cuándo usar ${lessonTitle}`,
    ],
    keyTakeaways: [
      `${lessonTitle} es esencial para dominar este tema`,
      "La práctica consistente acelera el aprendizaje",
      "Hay múltiples formas de abordar este concepto",
    ],
  };
}

// ============================================
// ACTIVITY GENERATOR
// ============================================

function generateActivity(
  lessonTitle: string,
  _moduleIdx: number,
  _lessonIdx: number
): Activity {
  // Rotar entre tipos de actividades
  const activityTypes: Array<Activity["type"]> = [
    "multiple-choice",
    "true-false",
    "checklist",
    "reflection",
  ];
  const selectedType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

  switch (selectedType) {
    case "multiple-choice":
      return {
        type: "multiple-choice",
        question: `¿Cuál es el objetivo principal de ${lessonTitle}?`,
        options: [
          { id: "a", text: "Mejorar la comprensión de conceptos fundamentales" },
          { id: "b", text: "Solo obtener certificación" },
          { id: "c", text: "Pasar tiempo sin aprender" },
          { id: "d", text: "Evitar el aprendizaje práctico" },
        ],
        correctOption: "a",
        explanation:
          "Correcto. El objetivo principal es desarrollar una comprensión profunda que puedas aplicar en el mundo real.",
      };

    case "true-false":
      return {
        type: "true-false",
        statement: `${lessonTitle} requiere práctica consistente para ser dominado.`,
        correctAnswer: true,
        explanation:
          "Verdadero. Sin práctica, es muy difícil dominar cualquier concepto, especialmente uno tan importante como este.",
      };

    case "checklist":
      return {
        type: "checklist",
        title: `Checklist: ${lessonTitle}`,
        items: [
          { id: "1", text: "He visto el video de la lección" },
          { id: "2", text: "He leído todo el contenido" },
          { id: "3", text: "He completado los ejemplos prácticos" },
          { id: "4", text: "He respondido las preguntas de reflexión" },
          { id: "5", text: "Entiendo los conceptos clave" },
        ],
        description: "Marca cada paso que completaste",
      };

    case "reflection":
      return {
        type: "reflection",
        question: `¿Cómo aplicarías ${lessonTitle} en tu contexto?`,
        minWords: 50,
        prompt:
          "Reflexiona sobre cómo los conceptos de esta lección pueden aplicarse a tu trabajo o vida personal.",
      };

    default:
      return {
        type: "multiple-choice",
        question: `¿Comprendiste los conceptos de ${lessonTitle}?`,
        options: [
          { id: "a", text: "Sí, completamente" },
          { id: "b", text: "Parcialmente" },
          { id: "c", text: "Necesito revisar" },
          { id: "d", text: "No entendí" },
        ],
        correctOption: "a",
        explanation: "Si respondiste de otro modo, te recomendamos revisar la lección.",
      };
  }
}

// ============================================
// QUIZ GENERATOR
// ============================================

function generateQuiz(
  lessonTitle: string,
  moduleIdx: number,
  lessonIdx: number
): any {
  const questions: QuizQuestion[] = [
    {
      id: `q-${moduleIdx}-${lessonIdx}-1`,
      question: `¿Cuál es la definición correcta de ${lessonTitle}?`,
      options: [
        {
          id: "a",
          text: `${lessonTitle} es un concepto fundamental de este tema`,
        },
        { id: "b", text: "No tiene definición clara" },
        { id: "c", text: "Es un concepto obsoleto" },
        { id: "d", text: "No se aplica en la práctica" },
      ],
      correctOption: "a",
      explanation: `Correcto. ${lessonTitle} es de hecho un concepto fundamental que tiene aplicaciones prácticas en diversos contextos.`,
    },
    {
      id: `q-${moduleIdx}-${lessonIdx}-2`,
      question: `¿Cuándo deberías usar ${lessonTitle}?`,
      options: [
        { id: "a", text: "Cuando necesites resolver problemas complejos" },
        { id: "b", text: "Solo en teoría" },
        { id: "c", text: "Nunca" },
        { id: "d", text: "Solo los expertos" },
      ],
      correctOption: "a",
      explanation:
        "Excelente. Las mejores prácticas profesionales recomiendan aplicar este concepto en problemas del mundo real.",
    },
    {
      id: `q-${moduleIdx}-${lessonIdx}-3`,
      question: `¿Cuál es el beneficio principal de dominar ${lessonTitle}?`,
      options: [
        { id: "a", text: "Mejora tu capacidad de resolver problemas" },
        { id: "b", text: "Solo te da un certificado" },
        { id: "c", text: "No hay beneficios" },
        { id: "d", text: "Es requisito para otro curso" },
      ],
      correctOption: "a",
      explanation:
        "Correcto. Dominar este concepto mejora significativamente tu capacidad profesional y personal.",
    },
  ];

  return {
    id: `quiz-${moduleIdx}-${lessonIdx}`,
    title: `Quiz: ${lessonTitle}`,
    description: `Verifica tu comprensión sobre ${lessonTitle}`,
    questions,
    passingScore: 70,
    maxAttempts: 3,
  };
}
