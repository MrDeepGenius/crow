// ============================================
// COURSE BLUEPRINT GENERATOR
// ============================================
// Crea blueprints específicos basados en análisis de cursos

import { CourseAnalysis } from "./courseAnalyzer";
import { Blueprint } from "@/app/types";

export interface BlueprintModule {
  title: string;
  lessons: string[];
}

/**
 * Genera un Blueprint específico basado en el análisis del curso
 */
export function generateCourseBlueprintFromAnalysis(
  idea: string,
  analysis: CourseAnalysis,
  title: string
): Blueprint {
  const modules = generateModulesForTopic(analysis);

  return {
    id: `blueprint-${Date.now()}`,
    type: "Curso",
    idea,
    title,
    description: analysis.goal,
    modules,
    createdAt: new Date().toISOString(),
    analysis, // Guardar análisis para referencias futuras
  };
}

/**
 * Genera módulos y lecciones específicas según el tema
 */
function generateModulesForTopic(analysis: CourseAnalysis): BlueprintModule[] {
  const topic = analysis.topic.toLowerCase();

  // CIBERSEGURIDAD
  if (topic.includes("ciberseguridad") || topic.includes("seguridad")) {
    return generateCybersecurityCourse(analysis);
  }

  // PROGRAMACIÓN
  if (topic.includes("programación")) {
    return generateProgrammingCourse(analysis);
  }

  // MARKETING
  if (topic.includes("marketing")) {
    return generateMarketingCourse(analysis);
  }

  // DISEÑO
  if (topic.includes("diseño")) {
    return generateDesignCourse(analysis);
  }

  // NEGOCIOS
  if (topic.includes("negocio")) {
    return generateBusinessCourse(analysis);
  }

  // FALLBACK: Curso genérico
  return generateGenericCourse(analysis);
}

// ============================================
// CIBERSEGURIDAD - Módulos específicos
// ============================================

function generateCybersecurityCourse(_analysis: CourseAnalysis): BlueprintModule[] {
  return [
    {
      title: "Introducción a la Ciberseguridad",
      lessons: [
        "¿Qué es la ciberseguridad?",
        "Principales amenazas digitales",
        "Cómo pueden atacar a una persona común",
        "Por qué es importante la ciberseguridad",
      ],
    },
    {
      title: "Contraseñas y Cuentas",
      lessons: [
        "Cómo crear una contraseña segura",
        "Por qué nunca debemos reutilizar contraseñas",
        "Gestores de contraseñas",
        "Recuperación de cuentas",
      ],
    },
    {
      title: "Autenticación y Acceso",
      lessons: [
        "Autenticación de dos factores (2FA)",
        "Cómo configurar 2FA en tus cuentas",
        "Biometría y seguridad física",
        "Reconocimiento de accesos no autorizados",
      ],
    },
    {
      title: "Phishing e Ingeniería Social",
      lessons: [
        "¿Qué es el phishing?",
        "Cómo reconocer un correo falso",
        "Mensajes fraudulentos y estafas",
        "Técnicas de ingeniería social",
        "Cómo no caer en trampas",
      ],
    },
    {
      title: "Protección de Dispositivos",
      lessons: [
        "Seguridad del celular",
        "Actualizaciones y parches de seguridad",
        "Malware y archivos peligrosos",
        "Antivirus y software de protección",
        "Limpieza y mantenimiento seguro",
      ],
    },
    {
      title: "Redes e Internet Seguro",
      lessons: [
        "Seguridad en WiFi público",
        "Redes privadas virtuales (VPN)",
        "Navegación segura en internet",
        "Certificados SSL y HTTPS",
        "Descargas seguras",
      ],
    },
    {
      title: "Privacidad y Datos Personales",
      lessons: [
        "Qué información compartimos en línea",
        "Privacidad en redes sociales",
        "Protección de información personal",
        "Derechos digitales y GDPR",
        "Auditoría de privacidad personal",
      ],
    },
    {
      title: "Qué Hacer Ante un Incidente",
      lessons: [
        "Identificar que has sido atacado",
        "Pasos inmediatos tras una vulneración",
        "Recuperación de cuentas comprometidas",
        "Copias de seguridad efectivas",
        "Plan de respuesta personal",
      ],
    },
    {
      title: "Buenas Prácticas de Seguridad",
      lessons: [
        "Hábitos seguros en el día a día",
        "Seguridad en el trabajo",
        "Ciberseguridad familiar",
        "Educación de menores en internet",
        "Checklist de seguridad personal",
      ],
    },
  ];
}

// ============================================
// PROGRAMACIÓN - Módulos específicos
// ============================================

function generateProgrammingCourse(analysis: CourseAnalysis): BlueprintModule[] {
  const language = analysis.topic;

  const baseModules: BlueprintModule[] = [
    {
      title: "Fundamentos",
      lessons: [
        "Qué es la programación",
        "Conceptos básicos",
        "Instalación del entorno",
        "Tu primer programa",
      ],
    },
    {
      title: "Tipos de Datos y Variables",
      lessons: [
        "Variables y tipos",
        "Operadores",
        "Conversión de tipos",
        "Buenas prácticas de nomenclatura",
      ],
    },
    {
      title: "Control de Flujo",
      lessons: ["Condicionales", "Bucles", "Funciones", "Alcance de variables"],
    },
    {
      title: "Estructuras de Datos",
      lessons: [
        "Arrays y listas",
        "Objetos y diccionarios",
        "Manipulación de datos",
        "Rendimiento",
      ],
    },
    {
      title: "Programación Orientada a Objetos",
      lessons: [
        "Clases y objetos",
        "Herencia",
        "Polimorfismo",
        "Encapsulación",
      ],
    },
    {
      title: "Manejo de Errores",
      lessons: [
        "Try/Catch",
        "Debugging",
        "Logging",
        "Manejo de excepciones",
      ],
    },
    {
      title: "Proyecto Práctico",
      lessons: [
        "Especificación del proyecto",
        "Arquitectura",
        "Implementación",
        "Testing y mejoras",
      ],
    },
  ];

  return baseModules;
}

// ============================================
// MARKETING - Módulos específicos
// ============================================

function generateMarketingCourse(_analysis: CourseAnalysis): BlueprintModule[] {
  return [
    {
      title: "Fundamentos de Marketing",
      lessons: [
        "Qué es el marketing digital",
        "Objetivos y KPIs",
        "Segmentación de audiencia",
        "Buyer persona",
      ],
    },
    {
      title: "Estrategia Digital",
      lessons: [
        "Plan de marketing",
        "Canales digitales",
        "Presupuesto y ROI",
        "Métricas de éxito",
      ],
    },
    {
      title: "Redes Sociales",
      lessons: [
        "Estrategia en redes sociales",
        "Creación de contenido",
        "Engagement",
        "Publicidad pagada",
      ],
    },
    {
      title: "SEO y SEM",
      lessons: [
        "Posicionamiento en buscadores",
        "Palabras clave",
        "Optimización técnica",
        "Análisis de competencia",
      ],
    },
    {
      title: "Email Marketing",
      lessons: [
        "Construcción de listas",
        "Segmentación",
        "Automatización",
        "Métricas de email",
      ],
    },
    {
      title: "Analítica",
      lessons: [
        "Google Analytics",
        "Interpretación de datos",
        "Reporting",
        "Toma de decisiones",
      ],
    },
  ];
}

// ============================================
// DISEÑO - Módulos específicos
// ============================================

function generateDesignCourse(_analysis: CourseAnalysis): BlueprintModule[] {
  return [
    {
      title: "Principios de Diseño",
      lessons: [
        "Elementos de diseño",
        "Composición",
        "Jerarquía visual",
        "Contraste y balance",
      ],
    },
    {
      title: "Tipografía",
      lessons: [
        "Clasificación de tipografías",
        "Legibilidad",
        "Pairing",
        "Uso correcto de fuentes",
      ],
    },
    {
      title: "Color",
      lessons: [
        "Teoría del color",
        "Paletas de color",
        "Psicología del color",
        "Accesibilidad de color",
      ],
    },
    {
      title: "UX/UI Basics",
      lessons: [
        "Experiencia del usuario",
        "Interfaz de usuario",
        "User research",
        "Wireframing",
      ],
    },
    {
      title: "Herramientas de Diseño",
      lessons: ["Figma", "Adobe XD", "Prototyping", "Presentación de diseños"],
    },
    {
      title: "Proyecto Práctico",
      lessons: [
        "Brief del proyecto",
        "Investigación",
        "Diseño",
        "Presentación final",
      ],
    },
  ];
}

// ============================================
// NEGOCIOS - Módulos específicos
// ============================================

function generateBusinessCourse(_analysis: CourseAnalysis): BlueprintModule[] {
  return [
    {
      title: "Fundamentos de Negocios",
      lessons: [
        "Tipos de negocio",
        "Modelos de negocio",
        "Viabilidad",
        "Oportunidad de mercado",
      ],
    },
    {
      title: "Plan de Negocios",
      lessons: [
        "Estructura del plan",
        "Análisis de mercado",
        "Proyecciones financieras",
        "Presentación a inversores",
      ],
    },
    {
      title: "Marketing y Ventas",
      lessons: [
        "Propuesta de valor",
        "Posicionamiento",
        "Estrategia de precios",
        "Canales de venta",
      ],
    },
    {
      title: "Gestión Financiera",
      lessons: [
        "Contabilidad básica",
        "Cash flow",
        "Inversión inicial",
        "Break-even",
      ],
    },
    {
      title: "Gestión de Equipos",
      lessons: [
        "Estructura organizacional",
        "Reclutamiento",
        "Cultura empresarial",
        "Liderazgo",
      ],
    },
    {
      title: "Escalabilidad",
      lessons: [
        "Crecimiento sostenible",
        "Procesos",
        "Automatización",
        "Inversión y financiación",
      ],
    },
  ];
}

// ============================================
// CURSO GENÉRICO - Fallback
// ============================================

function generateGenericCourse(analysis: CourseAnalysis): BlueprintModule[] {
  return [
    {
      title: "Introducción",
      lessons: [
        `¿Qué es ${analysis.topic}?`,
        "Por qué es importante",
        "Objetivos del curso",
        "Requisitos previos",
      ],
    },
    {
      title: "Conceptos Fundamentales",
      lessons: analysis.subtopics.map((sub) => `Entendiendo ${sub}`),
    },
    {
      title: "Aplicación Práctica",
      lessons: [
        "Ejercicio 1",
        "Ejercicio 2",
        "Caso de estudio",
        "Solución de problemas",
      ],
    },
    {
      title: "Evaluación Final",
      lessons: ["Resumen", "Quiz final", "Certificación"],
    },
  ];
}
