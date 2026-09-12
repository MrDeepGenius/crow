// ============================================
// CONTENT GENERATOR - Mock Data Generator
// ============================================

import {
  Blueprint,
  CourseProduct,
  EbookProduct,
  GuideProduct,
  WebProduct,
  ResourceKitProduct,
  GeneratedProduct,
  LessonContent,
  CourseModule,
} from "@/app/types";
import { ProfessionalCourse, Module } from "@/app/types/course";
import { generateProfessionalCourse } from "./professionalCourseGenerator";
import { analyzeCourseIdea, validateAnalysisSpecificity } from "./courseAnalyzer";
import { generateCourseBlueprintFromAnalysis } from "./courseBlueprintGenerator";
import { generateContextualLesson, LessonContext } from "./contextualContentGenerator";

// Re-export profesional course
export { generateProfessionalCourse };

// ============================================
// LESSON CONTENT GENERATOR
// ============================================

function generateLessonContent(
  lessonTitle: string,
  moduleTitle: string
): LessonContent {
  return {
    title: lessonTitle,
    introduction: `Bienvenido a ${lessonTitle}. En esta lección exploraremos los conceptos clave y aplicaciones prácticas relacionadas con ${moduleTitle}.`,
    explanation: `${lessonTitle} es un componente fundamental de ${moduleTitle}. Durante esta lección aprenderás:

• Conceptos básicos y fundamentos
• Aplicaciones prácticas en el mundo real
• Mejores prácticas de la industria
• Cómo evitar errores comunes
• Estrategias de optimización

Esta lección se construyó basada en años de experiencia y está diseñada para que puedas aplicar los conocimientos inmediatamente.`,
    examples: [
      `Ejemplo 1: Caso de uso básico de ${lessonTitle}`,
      `Ejemplo 2: Aplicación avanzada en contexto empresarial`,
      `Ejemplo 3: Optimización para máximo rendimiento`,
      `Ejemplo 4: Solución a problemas comunes`,
    ],
    keyPoints: [
      `${lessonTitle} es esencial para dominar ${moduleTitle}`,
      "La práctica consistente es la clave del éxito",
      "Entender los fundamentos evita errores costosos",
      "Hay múltiples formas de abordar este tema",
      "La experiencia personal acelera el aprendizaje",
    ],
    exercise: `EJERCICIO PRÁCTICO: Aplicá los conceptos de ${lessonTitle} en un proyecto pequeño. Trata de:
1. Identificar el caso de uso en tu contexto
2. Implementar lo aprendido
3. Medir resultados
4. Documentar tu experiencia

Tiempo estimado: 30-45 minutos`,
    summary: `En esta lección aprendiste sobre ${lessonTitle}. Ahora entiendes:
✓ Los conceptos fundamentales
✓ Cómo aplicarlos en la práctica
✓ Las mejores prácticas
✓ Cómo evitar errores comunes

El siguiente paso es practicar y aplicar estos conocimientos en proyectos reales.`,
  };
}

// ============================================
// COURSE GENERATOR
// ============================================

export function generateCourseProduct(blueprint: Blueprint): CourseProduct {
  const modules: CourseModule[] = blueprint.modules.map((mod, idx) => ({
    title: mod.title,
    description: `Este módulo se enfoca en ${mod.title.toLowerCase()}. Aprenderás conceptos fundamentales, aplicaciones prácticas y cómo integrar estos conocimientos en tu flujo de trabajo.`,
    lessons: mod.lessons.map((lesson) =>
      generateLessonContent(lesson, mod.title)
    ),
    order: idx + 1,
  }));

  return {
    title: blueprint.title,
    description: `Un curso completo diseñado para ayudarte a dominar ${blueprint.idea.toLowerCase()}.`,
    idea: blueprint.idea,
    modules,
    totalLessons: modules.reduce((sum, mod) => sum + mod.lessons.length, 0),
    estimatedHours: Math.ceil(
      modules.reduce((sum, mod) => sum + mod.lessons.length, 0) * 0.5
    ),
  };
}

// ============================================
// EBOOK GENERATOR
// ============================================

export function generateEbookProduct(blueprint: Blueprint): EbookProduct {
  const chapters = blueprint.modules.map((mod, idx) => ({
    title: mod.title,
    content: `CAPÍTULO ${idx + 1}: ${mod.title}

${mod.title} es una parte crítica de este material educativo. En este capítulo, exploraremos:

${mod.lessons
  .map((lesson, i) => `Sección ${i + 1}: ${lesson}\n${lesson} es un concepto fundamental que necesitas entender.`)
  .join("\n\n")}

PUNTOS CLAVE:
${mod.lessons.map((lesson) => `• ${lesson}`).join("\n")}

Este capítulo proporciona un conocimiento profundo y aplicable que puedes utilizar inmediatamente en tus proyectos.`,
    highlights: mod.lessons.slice(0, 2),
  }));

  return {
    title: blueprint.title,
    subtitle: `Una guía completa sobre ${blueprint.idea}`,
    introduction: `Bienvenido a este ebook completo sobre ${blueprint.idea}. Este material ha sido cuidadosamente curado para proporcionarte el conocimiento más relevante y práctico del tema.

A través de los siguientes capítulos, descubrirás:
• Conceptos fundamentales
• Aplicaciones prácticas
• Estrategias avanzadas
• Mejores prácticas de la industria`,
    chapters,
    resources: [
      "Plantilla de implementación",
      "Checklist de actividades",
      "Enlaces a recursos adicionales",
      "Código de ejemplo",
    ],
    conclusion: `Felicitaciones por completar este ebook. Ahora tienes el conocimiento necesario para aplicar ${blueprint.idea} en tus proyectos. Recuerda que la práctica es la clave del éxito. Te animamos a:

1. Revisar los conceptos clave regularmente
2. Practicar con ejemplos reales
3. Compartir tu conocimiento con otros
4. Mantenerte actualizado sobre tendencias`,
    totalPages: Math.ceil(chapters.length * 8 + 5),
  };
}

// ============================================
// GUIDE GENERATOR
// ============================================

export function generateGuideProduct(blueprint: Blueprint): GuideProduct {
  const steps = blueprint.modules.flatMap((mod, modIdx) =>
    mod.lessons.map((lesson, lesIdx) => ({
      order: modIdx * mod.lessons.length + lesIdx + 1,
      title: lesson,
      content: `Paso ${modIdx * mod.lessons.length + lesIdx + 1}: ${lesson}

Esta es una etapa crítica en el proceso de ${blueprint.idea}. Seguir correctamente este paso te permitirá avanzar sin problemas.

Descripción detallada:
Este paso te guía a través de los aspectos esenciales de ${lesson}. Asegúrate de comprender completamente antes de avanzar al siguiente paso.

Requisitos previos:
• Entendimiento de pasos anteriores
• Preparación adecuada
• Herramientas necesarias disponibles`,
      example: `Ejemplo práctico de ${lesson}: Cuando implementes esta estrategia, probablemente verás resultados como:
- Mayor eficiencia
- Mejor calidad
- Proceso más simplificado
- Resultados medibles`,
      checklist: [
        `☐ He completado la preparación de ${lesson}`,
        `☐ Entiendo los conceptos clave`,
        `☐ He revisado los ejemplos`,
        `☐ He aplicado esto en un contexto real`,
        `☐ He documentado mis resultados`,
      ],
    }))
  );

  return {
    title: `Guía Completa: ${blueprint.title}`,
    introduction: `Esta guía paso a paso te llevará desde los fundamentos hasta la maestría en ${blueprint.idea}.

La guía está estructura en ${steps.length} pasos claros y accionables que puedes seguir a tu propio ritmo.`,
    steps,
    recommendations: [
      "Sigue los pasos en orden",
      "No saltes pasos, aunque te parezcan obvios",
      "Documenta tu progreso",
      "Revisa regularmente los puntos clave",
      "Aplica lo aprendido en casos reales",
      "Busca feedback de expertos",
      "Mantente actualizado con nuevas tendencias",
    ],
    conclusion: `Completar esta guía te ha proporcionado un conocimiento sólido sobre ${blueprint.idea}. El siguiente paso es la práctica continua y la aplicación en tu vida profesional.`,
  };
}

// ============================================
// WEB PRODUCT GENERATOR
// ============================================

export function generateWebProduct(blueprint: Blueprint): WebProduct {
  return {
    title: blueprint.title,
    pages: [
      {
        id: "home",
        name: "Home",
        title: "Inicio",
        description: "Página principal",
        sections: [
          {
            id: "hero",
            type: "hero",
            title: blueprint.title,
            description: blueprint.idea,
            content: `Bienvenido. Descubre ${blueprint.title} - una solución completa para ${blueprint.idea}.`,
          },
          {
            id: "features",
            type: "features",
            title: "Características principales",
            description: "Lo que hace diferente a nuestro producto",
            content: `• Diseño moderno\n• Fácil de usar\n• Altamente personalizable\n• Soporte 24/7`,
          },
          {
            id: "cta",
            type: "cta",
            title: "Comienza ahora",
            description: "Acceso inmediato",
            content: "Obtén acceso a todos los recursos y comienza tu viaje.",
          },
        ],
      },
      {
        id: "contenido",
        name: "Contenido",
        title: "Biblioteca de recursos",
        description: "Accede a todo el contenido",
        sections: [
          {
            id: "modules",
            type: "content",
            title: "Módulos disponibles",
            description: `${blueprint.modules.length} módulos completos`,
            content: blueprint.modules
              .map((m) => `• ${m.title}`)
              .join("\n"),
          },
        ],
      },
      {
        id: "contacto",
        name: "Contacto",
        title: "Ponte en contacto",
        description: "Formulario de contacto",
        sections: [
          {
            id: "contact-form",
            type: "content",
            title: "Contacto directo",
            description: "Déjanos tus datos",
            content:
              "Formulario de contacto disponible en esta sección. Te responderemos en 24 horas.",
          },
        ],
      },
    ],
    navigation: ["Home", "Contenido", "Contacto"],
    design: {
      primaryColor: "#7c3aed",
      secondaryColor: "#9333ea",
      typography: "Modern, Clean",
    },
  };
}

// ============================================
// RESOURCE KIT GENERATOR
// ============================================

export function generateResourceKitProduct(
  blueprint: Blueprint
): ResourceKitProduct {
  const resources = blueprint.modules.flatMap((mod, modIdx) =>
    mod.lessons.map((lesson, lesIdx) => ({
      id: `resource-${modIdx}-${lesIdx}`,
      title: `${lesson} - Template`,
      description: `Plantilla profesional lista para usar en ${lesson}`,
      category: mod.title,
      type: "template" as const,
    }))
  );

  return {
    title: `${blueprint.title} - Kit de Recursos`,
    description: `Colección completa de recursos para implementar ${blueprint.idea}`,
    categories: Array.from(new Set(blueprint.modules.map((m) => m.title))),
    resources: [
      ...resources,
      ...blueprint.modules.map((mod, idx) => ({
        id: `checklist-${idx}`,
        title: `${mod.title} - Checklist`,
        description: `Lista de verificación para ${mod.title}`,
        category: mod.title,
        type: "checklist" as const,
      })),
      ...blueprint.modules.map((mod, idx) => ({
        id: `guide-${idx}`,
        title: `Guía: ${mod.title}`,
        description: `Guía paso a paso para ${mod.title}`,
        category: mod.title,
        type: "guide" as const,
      })),
    ],
    totalResources:
      resources.length + blueprint.modules.length * 2,
  };
}

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export function generateProductContent(
  blueprint: Blueprint
): GeneratedProduct | ProfessionalCourse | any {
  // Para Cursos, usar el nuevo generador contextual
  if (blueprint.type === "Curso") {
    return generateContextualCourse(blueprint);
  }

  switch (blueprint.type) {
    case "Ebook":
      return generateEbookProduct(blueprint);
    case "Guía":
      return generateGuideProduct(blueprint);
    case "Web interactiva":
      return generateWebProduct(blueprint);
    case "Kit de recursos":
      return generateResourceKitProduct(blueprint);
    default:
      throw new Error(`Tipo de producto desconocido: ${blueprint.type}`);
  }
}

// ============================================
// REAL AI COURSE GENERATION
// ============================================

/**
 * Genera un curso completo usando IA real
 * Esta función reemplaza el mock data con generación real
 */
export async function generateRealCourse(idea: string): Promise<any> {
  // Importación dinámica para evitar problemas de módulos
  const { CourseGenerationEngine } = await import("@/app/services/ai/CourseGenerationEngine");
  
  const engine = new CourseGenerationEngine();
  return await engine.generateCourse(idea);
}

/**
 * Genera un curso contextual basado en el análisis de la idea del usuario
 */
export function generateContextualCourse(blueprint: Blueprint): ProfessionalCourse {
  // Paso 1: Analizar la idea del usuario
  const analysis = analyzeCourseIdea(blueprint.idea);

  // Validar que el análisis sea suficientemente específico
  if (!validateAnalysisSpecificity(analysis)) {
    console.warn(
      `Análisis con baja especificidad (${analysis.relevanceScore}%), usando generador genérico`
    );
    // Fallback al generador profesional simple
    return generateProfessionalCourse(blueprint);
  }

  // Paso 2: Generar blueprint contextual (ya tenemos uno, pero podrías regenerar)
  // El blueprint ya viene en la solicitud, pero si necesitaras regenerarlo:
  // const contextualBlueprint = generateCourseBlueprintFromAnalysis(
  //   blueprint.idea,
  //   analysis,
  //   blueprint.title
  // );

  // Paso 3: Generar módulos con lecciones contextuales
  const modules: Module[] = blueprint.modules.map((mod, modIdx) => ({
    id: `module-${modIdx}`,
    title: mod.title,
    description: `Módulo sobre ${mod.title.toLowerCase()} en el contexto de ${analysis.topic}.`,
    order: modIdx + 1,
    lessons: mod.lessons.map((lessonTitle, lesIdx) => {
      // Crear contexto completo para cada lección
      const context: LessonContext = {
        courseTitle: blueprint.title,
        moduleName: mod.title,
        lessonTitle,
        lessonOrder: lesIdx + 1,
        totalLessons: mod.lessons.length,
        analysis,
        previousLessons:
          lesIdx > 0 ? mod.lessons.slice(0, lesIdx) : undefined,
        nextLessons:
          lesIdx < mod.lessons.length - 1
            ? mod.lessons.slice(lesIdx + 1)
            : undefined,
      };

      // Generar lección con contenido contextual
      return generateContextualLesson(context);
    }),
    estimatedHours: Math.ceil((mod.lessons.length * 15) / 60),
  }));

  // Paso 4: Calcular estadísticas
  const totalLessons = modules.reduce((sum, mod) => sum + mod.lessons.length, 0);
  const totalActivities = modules.reduce(
    (sum, mod) =>
      sum +
      mod.lessons.filter((les) => les.content.activity).length,
    0
  );
  const totalQuizzes = modules.reduce(
    (sum, mod) =>
      sum +
      mod.lessons.filter((les) => les.content.quiz).length,
    0
  );

  // Paso 5: Retornar curso profesional contextual
  return {
    id: `course-${Date.now()}`,
    metadata: {
      title: blueprint.title,
      subtitle: `Curso de ${analysis.level}: ${analysis.topic}`,
      description: analysis.goal,
      author: "Crow AI",
      authorBio: `Generado por Crow Course Studio para enseñar ${analysis.topic} a ${analysis.audience}`,
      language: analysis.language,
      level: analysis.level,
      category: analysis.topic,
      tags: [analysis.topic, ...analysis.subtopics.slice(0, 3)],
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
      title: `Certificado: ${blueprint.title}`,
      description: `Completaste exitosamente el curso de ${analysis.topic}`,
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
