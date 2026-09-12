// ============================================
// COURSE IDEA ANALYZER
// ============================================
// Analiza la idea del usuario y extrae metadatos semánticos

export interface CourseAnalysis {
  topic: string; // Tema principal
  subtopics: string[]; // Temas específicos
  level: "beginner" | "intermediate" | "advanced";
  audience: string; // Público objetivo
  goal: string; // Objetivo del curso
  language: string;
  tone: "simple" | "professional" | "academic" | "practical";
  courseType: string; // tipo inferido
  duration: number; // horas estimadas
  prerequisites?: string;
  relevanceScore: number; // 0-100, qué tan específico es el análisis
}

/**
 * Analiza una idea de curso y extrae metadatos
 */
export function analyzeCourseIdea(idea: string): CourseAnalysis {
  const lowerIdea = idea.toLowerCase();

  // Detectar tema principal
  let topic = "General";
  let subtopics: string[] = [];
  let level: "beginner" | "intermediate" | "advanced" = "beginner";
  let tone: "simple" | "professional" | "academic" | "practical" = "practical";
  let duration = 10;
  let relevanceScore = 0;

  // CIBERSEGURIDAD
  if (
    lowerIdea.includes("ciberseguridad") ||
    lowerIdea.includes("seguridad") ||
    lowerIdea.includes("cyber")
  ) {
    topic = "Ciberseguridad";
    relevanceScore += 30;

    // Detectar nivel
    if (lowerIdea.includes("básico") || lowerIdea.includes("principiante")) {
      level = "beginner";
      relevanceScore += 20;
    } else if (lowerIdea.includes("intermedio")) {
      level = "intermediate";
      relevanceScore += 15;
    } else if (lowerIdea.includes("avanzado") || lowerIdea.includes("experto")) {
      level = "advanced";
      relevanceScore += 15;
    }

    // Detectar subtemas mencionados
    const securityTopics: Record<string, string> = {
      phishing: "Phishing e Ingeniería Social",
      contraseña: "Contraseñas y Autenticación",
      "dos factor": "Autenticación de Dos Factores",
      malware: "Malware y Protección",
      wifi: "Seguridad en Redes WiFi",
      celular: "Seguridad del Celular",
      privacidad: "Privacidad y Datos",
      "cuenta": "Seguridad de Cuentas",
      incidente: "Respuesta a Incidentes",
    };

    for (const [keyword, subtopic] of Object.entries(securityTopics)) {
      if (lowerIdea.includes(keyword)) {
        subtopics.push(subtopic);
        relevanceScore += 5;
      }
    }

    // Si no especificó subtemas, asignar los principales
    if (subtopics.length === 0) {
      subtopics = [
        "Fundamentos de Ciberseguridad",
        "Amenazas Digitales",
        "Contraseñas Seguras",
        "Autenticación",
        "Phishing",
        "Malware",
        "Protección de Dispositivos",
        "Privacidad",
      ];
      relevanceScore += 10;
    }

    duration = 12;
    tone = lowerIdea.includes("simple") || lowerIdea.includes("básico") ? "simple" : "practical";
  }
  // PROGRAMACIÓN
  else if (
    lowerIdea.includes("programación") ||
    lowerIdea.includes("javascript") ||
    lowerIdea.includes("python") ||
    lowerIdea.includes("typescript") ||
    lowerIdea.includes("react") ||
    lowerIdea.includes("code")
  ) {
    topic = "Programación";
    relevanceScore += 25;

    if (lowerIdea.includes("javascript")) {
      subtopics = ["Fundamentos", "DOM", "Async/Await", "ES6+"];
      relevanceScore += 20;
    } else if (lowerIdea.includes("python")) {
      subtopics = ["Fundamentos", "Tipos de Datos", "Funciones", "Librerías"];
      relevanceScore += 20;
    } else if (lowerIdea.includes("react")) {
      subtopics = ["Componentes", "Hooks", "State", "Props"];
      relevanceScore += 20;
    } else {
      subtopics = ["Fundamentos", "Sintaxis", "Estructura", "Práctica"];
      relevanceScore += 10;
    }

    level = lowerIdea.includes("básico") ? "beginner" : "intermediate";
    duration = 15;
    tone = "practical";
  }
  // MARKETING
  else if (lowerIdea.includes("marketing") || lowerIdea.includes("redes sociales")) {
    topic = "Marketing Digital";
    relevanceScore += 20;
    subtopics = ["Estrategia", "Redes Sociales", "SEO", "Análisis"];
    level = "beginner";
    duration = 8;
    tone = "practical";
  }
  // DISEÑO
  else if (
    lowerIdea.includes("diseño") ||
    lowerIdea.includes("ux") ||
    lowerIdea.includes("ui")
  ) {
    topic = "Diseño";
    relevanceScore += 20;
    subtopics = ["Principios", "UX/UI", "Tipografía", "Color"];
    level = "beginner";
    duration = 10;
    tone = "professional";
  }
  // NEGOCIOS
  else if (lowerIdea.includes("negocio") || lowerIdea.includes("emprendimiento")) {
    topic = "Negocios";
    relevanceScore += 20;
    subtopics = ["Plan de Negocios", "Marketing", "Finanzas"];
    level = "intermediate";
    duration = 12;
    tone = "professional";
  }
  // FALLBACK: Genérico
  else {
    topic = capitalizeTopic(idea);
    subtopics = ["Conceptos Fundamentales", "Aplicación Práctica"];
    relevanceScore = 30;
    duration = 8;
  }

  // Detectar público objetivo
  let audience = "Principiantes";
  if (lowerIdea.includes("profesionales") || lowerIdea.includes("experiencia")) {
    audience = "Profesionales";
  } else if (lowerIdea.includes("ejecutivos")) {
    audience = "Ejecutivos";
  } else if (lowerIdea.includes("estudiantes")) {
    audience = "Estudiantes";
  } else if (lowerIdea.includes("personas sin")) {
    audience = "Personas sin conocimientos técnicos";
  }

  // Detectar idioma
  const language = lowerIdea.match(/english|english/i) ? "en" : "es";

  const goal = idea; // La idea misma es el objetivo

  return {
    topic,
    subtopics,
    level,
    audience,
    goal,
    language,
    tone,
    courseType: topic,
    duration,
    relevanceScore: Math.min(relevanceScore, 100),
  };
}

/**
 * Capitaliza un tema genérico
 */
function capitalizeTopic(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Valida que un análisis sea suficientemente específico
 */
export function validateAnalysisSpecificity(analysis: CourseAnalysis): boolean {
  // El análisis debe tener suficiente información para generar un curso real
  return analysis.relevanceScore >= 40 && analysis.subtopics.length > 0;
}
