// ============================================
// CONTEXTUAL CONTENT GENERATOR
// ============================================
// Genera contenido de lecciones basado en contexto específico

import {
  Lesson,
  TextBlock,
  Activity,
  Quiz,
  QuizQuestion,
  Resource,
} from "@/app/types/course";
import { CourseAnalysis } from "./courseAnalyzer";

export interface LessonContext {
  courseTitle: string;
  moduleName: string;
  lessonTitle: string;
  lessonOrder: number;
  totalLessons: number;
  analysis: CourseAnalysis;
  previousLessons?: string[]; // Títulos de lecciones anteriores
  nextLessons?: string[]; // Títulos de lecciones siguientes
}

/**
 * Genera una lección completa con contenido contextual
 */
export function generateContextualLesson(context: LessonContext): Lesson {
  const lessonId = `lesson-${context.moduleName}-${context.lessonOrder}`;

  return {
    id: lessonId,
    title: context.lessonTitle,
    description: generateLessonDescription(context),
    order: context.lessonOrder,
    duration: "15-20 min",
    content: {
      video: {
        type: "video",
        status: "pending",
        duration: "15:00",
      },
      text: generateLessonContent(context),
      activity: generateContextualActivity(context),
      quiz: generateContextualQuiz(context),
      resources: generateLessonResources(context),
    },
    objectives: generateLessonObjectives(context),
    keyTakeaways: generateKeyTakeaways(context),
  };
}

// ============================================
// DESCRIPTION & OBJECTIVES
// ============================================

function generateLessonDescription(context: LessonContext): string {
  const { lessonTitle, analysis } = context;

  const descriptions: Record<string, string> = {
    ciberseguridad: generateSecurityDescription(lessonTitle),
    programación: generateProgrammingDescription(lessonTitle),
    marketing: generateMarketingDescription(lessonTitle),
    diseño: generateDesignDescription(lessonTitle),
    negocio: generateBusinessDescription(lessonTitle),
  };

  const topic = analysis.topic.toLowerCase();
  for (const [key, descFn] of Object.entries(descriptions)) {
    if (topic.includes(key)) {
      return descFn;
    }
  }

  return `En esta lección aprenderás conceptos clave sobre "${lessonTitle}" que te ayudarán a comprender mejor este tema.`;
}

function generateSecurityDescription(lessonTitle: string): string {
  const descriptions: Record<string, string> = {
    "¿Qué es la ciberseguridad?":
      "Introduce los conceptos fundamentales de ciberseguridad, explicando qué protege y por qué es crucial en el mundo digital actual.",
    "Principales amenazas digitales":
      "Descubre los tipos de amenazas más comunes que enfrentan los usuarios en internet y cómo funcionan.",
    "Cómo pueden atacar a una persona común":
      "Entiende los métodos que utilizan los ciberdelincuentes para atacar a personas ordinarias.",
    "Cómo crear una contraseña segura":
      "Aprende los criterios para crear contraseñas que realmente protejan tus cuentas.",
    "Autenticación de dos factores":
      "Descubre por qué 2FA es una herramienta poderosa contra el acceso no autorizado.",
    "¿Qué es el phishing?":
      "Comprende la técnica más común utilizada para robar información personal.",
    "Cómo reconocer un correo falso":
      "Desarrolla la capacidad de identificar intentos de phishing antes de caer en la trampa.",
    "Seguridad del celular":
      "Protege tu dispositivo móvil, donde guardas información sensible.",
    "Seguridad en WiFi público":
      "Aprende a navegar seguramente en redes públicas.",
    "Qué información compartimos en línea":
      "Analiza qué datos revelan y cómo pueden ser utilizados.",
  };

  return (
    descriptions[lessonTitle] ||
    `Lección sobre ${lessonTitle} en el contexto de ciberseguridad.`
  );
}

function generateProgrammingDescription(lessonTitle: string): string {
  const descriptions: Record<string, string> = {
    "Qué es la programación":
      "Descubre qué es realmente la programación y cómo cambia el mundo.",
    "Tu primer programa":
      "Escribe tu primer código funcional y entiende cómo funcionan los programas.",
    "Variables y tipos":
      "Comprende cómo los programas almacenan y manipulan información.",
    "Condicionales":
      "Aprende a tomar decisiones en código utilizando condicionales.",
    "Bucles": "Automatiza tareas repetitivas utilizando bucles.",
    "Funciones":
      "Organiza tu código en funciones reutilizables y mantenibles.",
    "Arrays y listas":
      "Trabaja con colecciones de datos de manera eficiente.",
    "Objetos": "Estructura datos complejos utilizando objetos.",
    "Clases y objetos":
      "Implementa programación orientada a objetos en tu código.",
  };

  return (
    descriptions[lessonTitle] ||
    `Lección sobre ${lessonTitle} en programación.`
  );
}

function generateMarketingDescription(lessonTitle: string): string {
  const descriptions: Record<string, string> = {
    "Qué es el marketing digital":
      "Comprende el panorama completo del marketing en la era digital.",
    "Buyer persona":
      "Crea un perfil detallado de tu cliente ideal para marketing más efectivo.",
    "Estrategia en redes sociales":
      "Diseña una estrategia que resuene con tu audiencia en redes sociales.",
    "Posicionamiento en buscadores":
      "Aprende a aparecer en los primeros resultados de Google.",
    "Creación de contenido":
      "Domina el arte de crear contenido que atrae y convierte.",
  };

  return (
    descriptions[lessonTitle] ||
    `Lección sobre ${lessonTitle} en marketing digital.`
  );
}

function generateDesignDescription(lessonTitle: string): string {
  const descriptions: Record<string, string> = {
    "Elementos de diseño":
      "Entiende los bloques fundamentales que componen todo buen diseño.",
    "Composición":
      "Aprende a organizar elementos para crear diseños visualmente efectivos.",
    "Tipografía":
      "Domina el arte de elegir y usar tipos de letra correctamente.",
    "Teoría del color":
      "Entiende cómo los colores comunican emociones y significados.",
    "Experiencia del usuario":
      "Diseña pensando en las necesidades y emociones del usuario.",
  };

  return (
    descriptions[lessonTitle] ||
    `Lección sobre ${lessonTitle} en diseño.`
  );
}

function generateBusinessDescription(lessonTitle: string): string {
  const descriptions: Record<string, string> = {
    "Tipos de negocio":
      "Descubre los diferentes modelos de negocio y cómo funcionan.",
    "Plan de negocios":
      "Aprende a estructurar un plan que comunique tu visión de negocio.",
    "Propuesta de valor":
      "Define claramente qué valor ofreces a tus clientes.",
    "Contabilidad básica":
      "Entiende los números detrás de tu negocio.",
    "Liderazgo": "Desarrolla habilidades para guiar equipos efectivamente.",
  };

  return (
    descriptions[lessonTitle] ||
    `Lección sobre ${lessonTitle} en negocios.`
  );
}

function generateLessonObjectives(context: LessonContext): string[] {
  const { lessonTitle, analysis } = context;
  const level = analysis.level;

  const objectives = [
    `Comprender los conceptos clave de "${lessonTitle}"`,
    `Explicar ${lessonTitle} con tus propias palabras`,
  ];

  if (level === "intermediate" || level === "advanced") {
    objectives.push(`Analizar casos prácticos de ${lessonTitle}`);
  }

  if (level === "advanced") {
    objectives.push(`Aplicar ${lessonTitle} en contextos complejos`);
  }

  objectives.push(`Evaluar la importancia de ${lessonTitle}`);

  return objectives;
}

function generateKeyTakeaways(context: LessonContext): string[] {
  const { lessonTitle } = context;

  return [
    `${lessonTitle} es un concepto fundamental para este curso`,
    "La práctica consistente acelera tu comprensión",
    `Hay múltiples formas de aplicar ${lessonTitle}`,
    "La experiencia real es el mejor maestro",
  ];
}

// ============================================
// CONTENT GENERATION
// ============================================

function generateLessonContent(context: LessonContext): any {
  const { lessonTitle, analysis, courseTitle } = context;
  const topic = analysis.topic.toLowerCase();

  if (topic.includes("ciberseguridad")) {
    return generateSecurityContent(lessonTitle, courseTitle);
  } else if (topic.includes("programación")) {
    return generateProgrammingContent(lessonTitle);
  } else if (topic.includes("marketing")) {
    return generateMarketingContent(lessonTitle);
  } else if (topic.includes("diseño")) {
    return generateDesignContent(lessonTitle);
  } else if (topic.includes("negocio")) {
    return generateBusinessContent(lessonTitle);
  }

  return generateGenericContent(lessonTitle, analysis);
}

function generateSecurityContent(
  lessonTitle: string,
  courseTitle: string
): any {
  const contentMap: Record<string, TextBlock[]> = {
    "¿Qué es la ciberseguridad?": [
      {
        type: "heading",
        content: "¿Qué es la Ciberseguridad?",
        order: 0,
      },
      {
        type: "paragraph",
        content:
          "La ciberseguridad es la práctica de proteger sistemas, redes, programas y datos del acceso no autorizado, modificación o destrucción por parte de personas maliciosas.",
        order: 1,
      },
      {
        type: "subheading",
        content: "¿Por qué es importante?",
        order: 2,
      },
      {
        type: "paragraph",
        content:
          "En 2024, millones de personas son víctimas de ciberataques cada año. Desde robo de identidad hasta pérdida de dinero, los riesgos son reales. La ciberseguridad no solo protege tus datos, también protege tu tranquilidad.",
        order: 3,
      },
      {
        type: "subheading",
        content: "Los Pilares de la Ciberseguridad",
        order: 4,
      },
      {
        type: "list",
        content:
          "• Confidencialidad: Solo personas autorizadas acceden a tus datos\n• Integridad: Tus datos no son modificados sin permiso\n• Disponibilidad: Tus sistemas funcionan cuando los necesitas",
        order: 5,
      },
      {
        type: "highlight",
        content:
          "💡 La ciberseguridad no es solo para expertos. Las mejores defensas comienzan con hábitos simples y conscientes.",
        order: 6,
      },
    ],
    "Principales amenazas digitales": [
      {
        type: "heading",
        content: "Principales Amenazas Digitales",
        order: 0,
      },
      {
        type: "subheading",
        content: "Malware",
        order: 1,
      },
      {
        type: "paragraph",
        content:
          "Software malicioso diseñado para dañar, espiar o controlar tu dispositivo. Incluye virus, gusanos, troyanos y ransomware.",
        order: 2,
      },
      {
        type: "subheading",
        content: "Phishing",
        order: 3,
      },
      {
        type: "paragraph",
        content:
          "Correos, mensajes o sitios web fraudulentos diseñados para engañarte y robar tus credenciales.",
        order: 4,
      },
      {
        type: "subheading",
        content: "Acceso No Autorizado",
        order: 5,
      },
      {
        type: "paragraph",
        content:
          "Personas sin permiso accediendo a tus cuentas, datos o dispositivos. Pueden ocurrir por contraseñas débiles o vulnerabilidades.",
        order: 6,
      },
      {
        type: "subheading",
        content: "Ingeniería Social",
        order: 7,
      },
      {
        type: "paragraph",
        content:
          "Manipulación psicológica para engañarte y revelar información sensible. Puede ocurrir por teléfono, email o en persona.",
        order: 8,
      },
      {
        type: "highlight",
        content:
          "⚠️ La mayoría de los ataques exitosos explotan la conducta humana, no debilidades técnicas.",
        order: 9,
      },
    ],
    "Cómo crear una contraseña segura": [
      {
        type: "heading",
        content: "Cómo Crear una Contraseña Segura",
        order: 0,
      },
      {
        type: "paragraph",
        content:
          "Una contraseña fuerte es tu primera línea de defensa. Pero muchas personas siguen usando contraseñas débiles como '123456' o 'password'.",
        order: 1,
      },
      {
        type: "subheading",
        content: "Criterios para una Contraseña Fuerte",
        order: 2,
      },
      {
        type: "list",
        content:
          "• Mínimo 12 caracteres (16+ es mejor)\n• Mezcla de mayúsculas, minúsculas, números y símbolos\n• Sin información personal (nombre, cumpleaños, etc.)\n• Única para cada cuenta importante\n• Sin palabras del diccionario",
        order: 3,
      },
      {
        type: "subheading",
        content: "Método de Frase de Contraseña",
        order: 4,
      },
      {
        type: "paragraph",
        content:
          "Una técnica efectiva es usar la primera letra de una frase memorable: 'Mi gato Fluffy come pescado todos los días' → MgFcptd (luego añade números y símbolos → MgFcptd#2024!)",
        order: 5,
      },
      {
        type: "highlight",
        content:
          "✅ Usa un gestor de contraseñas para generar y almacenar contraseñas complejas de forma segura.",
        order: 6,
      },
    ],
  };

  const content = contentMap[lessonTitle] || generateGenericSecurityContent(lessonTitle);

  return {
    type: "text",
    blocks: content,
  };
}

function generateGenericSecurityContent(lessonTitle: string): TextBlock[] {
  return [
    {
      type: "heading",
      content: lessonTitle,
      order: 0,
    },
    {
      type: "paragraph",
      content: `${lessonTitle} es un tema importante en ciberseguridad que debes comprender para protegerte en el mundo digital.`,
      order: 1,
    },
    {
      type: "subheading",
      content: "Conceptos Clave",
      order: 2,
    },
    {
      type: "list",
      content: `• Punto 1: Entendimiento fundamental\n• Punto 2: Aplicación práctica\n• Punto 3: Mejores prácticas\n• Punto 4: Casos reales`,
      order: 3,
    },
    {
      type: "subheading",
      content: "Cómo Aplicar Esto",
      order: 4,
    },
    {
      type: "paragraph",
      content:
        "La mejor forma de aprender es practicando. Completa la actividad interactiva a continuación para reforzar estos conceptos.",
      order: 5,
    },
    {
      type: "highlight",
      content: `💡 Tip: Vuelve a esta lección cuando necesites recordar ${lessonTitle}.`,
      order: 6,
    },
  ];
}

function generateProgrammingContent(lessonTitle: string): any {
  return {
    type: "text",
    blocks: [
      {
        type: "heading",
        content: lessonTitle,
        order: 0,
      },
      {
        type: "paragraph",
        content: `En esta lección aprenderás sobre ${lessonTitle}, un concepto fundamental en programación.`,
        order: 1,
      },
      {
        type: "subheading",
        content: "Conceptos Clave",
        order: 2,
      },
      {
        type: "list",
        content: "• Concepto 1\n• Concepto 2\n• Concepto 3",
        order: 3,
      },
      {
        type: "subheading",
        content: "Ejemplo Práctico",
        order: 4,
      },
      {
        type: "code",
        content: `// Ejemplo de ${lessonTitle}\nconst ejemplo = "código";`,
        order: 5,
      },
    ],
  };
}

function generateMarketingContent(lessonTitle: string): any {
  return {
    type: "text",
    blocks: [
      {
        type: "heading",
        content: lessonTitle,
        order: 0,
      },
      {
        type: "paragraph",
        content: `${lessonTitle} es esencial para el éxito en marketing digital moderno.`,
        order: 1,
      },
    ],
  };
}

function generateDesignContent(lessonTitle: string): any {
  return {
    type: "text",
    blocks: [
      {
        type: "heading",
        content: lessonTitle,
        order: 0,
      },
      {
        type: "paragraph",
        content: `Descubre cómo ${lessonTitle} impacta en la calidad de tus diseños.`,
        order: 1,
      },
    ],
  };
}

function generateBusinessContent(lessonTitle: string): any {
  return {
    type: "text",
    blocks: [
      {
        type: "heading",
        content: lessonTitle,
        order: 0,
      },
      {
        type: "paragraph",
        content: `${lessonTitle} es un componente crítico del éxito empresarial.`,
        order: 1,
      },
    ],
  };
}

function generateGenericContent(lessonTitle: string, _analysis: CourseAnalysis): any {
  return {
    type: "text",
    blocks: [
      {
        type: "heading",
        content: lessonTitle,
        order: 0,
      },
      {
        type: "paragraph",
        content: `En esta lección exploraremos ${lessonTitle} en profundidad.`,
        order: 1,
      },
      {
        type: "subheading",
        content: "Puntos Clave",
        order: 2,
      },
      {
        type: "list",
        content: "• Punto importante 1\n• Punto importante 2\n• Punto importante 3",
        order: 3,
      },
    ],
  };
}

// ============================================
// ACTIVITY GENERATION
// ============================================

function generateContextualActivity(context: LessonContext): Activity {
  const { lessonTitle, analysis } = context;

  // Rotar entre tipos
  const activityTypes: Activity["type"][] = [
    "multiple-choice",
    "true-false",
    "checklist",
    "reflection",
  ];

  const activityType =
    activityTypes[Math.floor(Math.random() % activityTypes.length)];

  if (activityType === "multiple-choice") {
    return {
      type: "multiple-choice",
      question: `¿Cuál es el aspecto más importante de ${lessonTitle}?`,
      options: [
        { id: "a", text: "Comprensión profunda del concepto" },
        { id: "b", text: "Memorizar definiciones" },
        { id: "c", text: "Completar el curso rápido" },
        { id: "d", text: "Evitar errores" },
      ],
      correctOption: "a",
      explanation:
        "Correcto. La comprensión profunda es lo que hace que el aprendizaje sea duradero y aplicable.",
    };
  } else if (activityType === "true-false") {
    return {
      type: "true-false",
      statement: `La práctica regular es esencial para dominar ${lessonTitle}.`,
      correctAnswer: true,
      explanation: "Verdadero. La repetición y la práctica refuerzan el aprendizaje.",
    };
  } else if (activityType === "checklist") {
    return {
      type: "checklist",
      title: `Checklist: ${lessonTitle}`,
      items: [
        { id: "1", text: "He visto el video completo" },
        { id: "2", text: "He leído el contenido" },
        { id: "3", text: "Entiendo los conceptos" },
        { id: "4", text: "Puedo explicarlo a otros" },
      ],
      description: "Marca cada paso que completaste",
    };
  } else {
    return {
      type: "reflection",
      question: `¿Cómo aplicarías ${lessonTitle} en tu contexto?`,
      minWords: 50,
      prompt: `Reflexiona sobre cómo los conceptos de "${lessonTitle}" pueden aplicarse a tu vida o trabajo.`,
    };
  }
}

// ============================================
// QUIZ GENERATION
// ============================================

function generateContextualQuiz(context: LessonContext): any {
  const { lessonTitle } = context;

  const questions: QuizQuestion[] = [
    {
      id: `q1`,
      question: `¿Cuál es la definición correcta de ${lessonTitle}?`,
      options: [
        { id: "a", text: `${lessonTitle} es un concepto fundamental de este módulo` },
        { id: "b", text: "No tiene aplicación práctica" },
        { id: "c", text: "Solo es teoría" },
        { id: "d", text: "No se aplica en la práctica" },
      ],
      correctOption: "a",
      explanation: `Correcto. ${lessonTitle} tiene aplicaciones prácticas reales en múltiples contextos.`,
    },
    {
      id: `q2`,
      question: `¿Cuándo deberías usar los conceptos de ${lessonTitle}?`,
      options: [
        { id: "a", text: "Cuando enfrentes problemas o situaciones relacionadas" },
        { id: "b", text: "Solo en la teoría" },
        { id: "c", text: "Nunca" },
        { id: "d", text: "Solo los expertos pueden usarlo" },
      ],
      correctOption: "a",
      explanation:
        "Excelente. Estos conceptos son aplicables en situaciones reales del día a día.",
    },
    {
      id: `q3`,
      question: `¿Cuál es el beneficio principal de dominar ${lessonTitle}?`,
      options: [
        { id: "a", text: "Mejora tu capacidad de resolver problemas" },
        { id: "b", text: "Solo obtienes un certificado" },
        { id: "c", text: "No hay beneficios reales" },
        { id: "d", text: "Es un requisito para otro curso" },
      ],
      correctOption: "a",
      explanation:
        "Correcto. El verdadero beneficio es mejorar tus habilidades y capacidades prácticas.",
    },
  ];

  return {
    id: `quiz-${lessonTitle}`,
    title: `Quiz: ${lessonTitle}`,
    description: `Verifica tu comprensión sobre ${lessonTitle}`,
    questions,
    passingScore: 70,
    maxAttempts: 3,
  };
}

// ============================================
// RESOURCES GENERATION
// ============================================

function generateLessonResources(context: LessonContext): Resource[] {
  const { lessonTitle } = context;

  return [
    {
      id: `resource-${lessonTitle}-1`,
      title: `Guía Rápida: ${lessonTitle}`,
      description: "Resumen en PDF de los conceptos clave",
      type: "pdf",
      fileStatus: "pending",
    },
    {
      id: `resource-${lessonTitle}-2`,
      title: `Checklist de Práctica`,
      description: "Lista de verificación para aplicar lo aprendido",
      type: "checklist",
      fileStatus: "pending",
    },
    {
      id: `resource-${lessonTitle}-3`,
      title: `Enlaces Útiles`,
      description: "Recursos adicionales y referencias",
      type: "link",
      fileStatus: "pending",
    },
  ];
}
