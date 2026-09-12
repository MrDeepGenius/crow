// ============================================
// MOCK AI PROVIDER - CROW COURSE STUDIO
// ============================================

import { AIProvider } from "./AIProvider";
import {
  GenerationContext,
  ProductSpecification,
  CourseBlueprint,
  GeneratedModule,
  GeneratedLesson,
  ActivityContent,
  GeneratedQuiz,
  VideoContent,
  GeneratedExam,
  GeneratedCertificate,
  QualityValidation,
  LessonContent,
  LessonBlueprint,
  QuizBlueprint,
} from "./types";
import {
  WebGenerationContext,
  WebSpecification,
  InteractiveWebBlueprint,
  InteractiveWebSection,
  InteractiveWebComponent,
  InteractiveWebBranding,
  WebComponentType,
  WebQualityValidation,
  WebSectionBlueprint,
} from "./interactiveWebTypes";
import {
  PdfGenerationContext,
  PdfSpecification,
  PdfBlueprint,
  PdfChapter,
  PdfSection,
  PdfContentBlock,
  PdfBranding,
  PdfStylePreset,
  PdfCover,
  PdfQualityValidation,
  PdfTextAction,
  PdfPresentation,
  PdfEditorialBrief,
  PdfTone,
} from "./pdfTypes";
import {
  KitGenerationContext,
  KitSpecification,
  KitBlueprint,
  KitResource,
  KitResourceBlueprint,
  KitFolder,
  KitQualityValidation,
  KitTextAction,
} from "./kitTypes";

import { AI_CONFIG } from "@/app/config/ai";

// ============================================
// DATOS DE PRUEBA REALISTAS PARA CIBERSEGURIDAD
// ============================================

const CYBERSECURITY_TOPICS = {
  "fundamentos": [
    "¿Qué es la ciberseguridad?",
    "Por qué es importante proteger tu información",
    "Tipos de amenazas digitales",
    "Principios básicos de seguridad en línea",
    "Mitos y verdades sobre seguridad digital"
  ],
  "contraseñas": [
    "Crear contraseñas seguras y únicas",
    "Gestores de contraseñas: qué son y cómo usarlos",
    "Autenticación de dos factores",
    "Cómo evitar la reutilización de contraseñas",
    "Recuperación segura de contraseñas"
  ],
  "phishing": [
    "¿Qué es el phishing y cómo funciona?",
    "Cómo identificar correos falsos",
    "Sitios web fraudulentos: señales de alerta",
    "Protección contra ataques de ingeniería social",
    "Qué hacer si caíste en un ataque de phishing"
  ],
  "malware": [
    "Tipos de malware: virus, troyanos, ransomware",
    "Cómo prevenir infecciones por malware",
    "Antivirus y software de seguridad",
    "Actualizaciones de seguridad: por qué son vitales",
    "Limpieza de dispositivos infectados"
  ],
  "dispositivos": [
    "Seguridad en teléfonos móviles",
    "Protección de computadoras personales",
    "Configuración de seguridad en dispositivos",
    "Apps peligrosas: cómo detectarlas",
    "Protección de tablets y otros dispositivos"
  ],
  "redes": [
    "WiFi público: riesgos y precauciones",
    "Configuración segura de redes domésticas",
    "VPN: qué son y cuándo usarlas",
    "Navegación segura en redes sociales",
    "Protección en redes corporativas"
  ],
  "privacidad": [
    "Protección de datos personales en línea",
    "Configuración de privacidad en aplicaciones",
    "¿Qué información compartir en internet?",
    "Protección de la identidad digital",
    "Gestión de la huella digital"
  ],
  "backups": [
    "Importancia de las copias de seguridad",
    "Métodos de backup: local, nube, híbridos",
    "Frecuencia de backup recomendada",
    "Pruebas de recuperación de backups",
    "Backups para dispositivos móviles"
  ],
  "incidentes": [
    "Cómo detectar un incidente de seguridad",
    "Primeros pasos tras una violación de seguridad",
    "Reporte de incidentes a autoridades",
    "Recuperación tras un ataque",
    "Aprendizaje de incidentes de seguridad"
  ]
};

// ============================================
// MOCK AI PROVIDER
// ============================================

export class MockAIProvider extends AIProvider {
  private simulatedDelay(): Promise<void> {
    if (!AI_CONFIG.mock?.simulatedDelay) return Promise.resolve();
    
    return new Promise(resolve => 
      setTimeout(resolve, AI_CONFIG.mock!.delayMs)
    );
  }

  async analyzeIdea(idea: string): Promise<ProductSpecification> {
    await this.simulatedDelay();
    
    // Detectar tema de ciberseguridad
    const isCybersecurity = idea.toLowerCase().includes("ciberseguridad") ||
                            idea.toLowerCase().includes("seguridad") ||
                            idea.toLowerCase().includes("hacker") ||
                            idea.toLowerCase().includes("phishing");
    
    if (isCybersecurity) {
      return {
        topic: "Ciberseguridad para principiantes",
        type: "curso",
        audience: "Personas sin conocimientos técnicos que quieren proteger sus cuentas, dispositivos y datos personales",
        level: "principiante",
        goal: "Aprender a proteger información personal, identificar amenazas digitales y aplicar medidas de seguridad básicas",
        subtopics: [
          "Fundamentos de ciberseguridad",
          "Amenazas digitales comunes",
          "Protección de contraseñas",
          "Autenticación de dos factores",
          "Phishing y engaño social",
          "Malware y protección antivirus",
          "Seguridad de dispositivos móviles",
          "Protección de datos personales",
          "Conexiones WiFi seguras",
          "Copias de seguridad"
        ],
        requirements: [
          "Conocimientos básicos de internet",
          "Dispositivo con conexión a internet",
          "Disposición para aplicar medidas de seguridad",
          "Tiempo de práctica regular"
        ],
        estimatedDuration: 20 // horas estimadas
      };
    }
    
    // Análisis genérico para otros temas
    return {
      topic: idea.substring(0, 100),
      type: "curso",
      audience: "Personas interesadas en aprender sobre el tema",
      level: "principiante",
      goal: "Adquirir conocimientos fundamentales y aplicables sobre el tema",
      subtopics: ["Introducción", "Fundamentos", "Aplicaciones prácticas", "Mejores prácticas"],
      requirements: ["Conocimientos básicos", "Disposición para aprender", "Práctica regular"],
      estimatedDuration: 15
    };
  }

  async generateBlueprint(context: GenerationContext): Promise<CourseBlueprint> {
    await this.simulatedDelay();
    
    interface ModuleBlueprint {
      title: string;
      description: string;
      objectives: string[];
      lessons: LessonBlueprint[];
      quiz?: QuizBlueprint;
    }
    
    const modules: ModuleBlueprint[] = [
      {
        title: "Fundamentos de Ciberseguridad",
        description: "Introducción a los conceptos básicos y por qué la seguridad digital es importante para todos",
        objectives: [
          "Entender qué es la ciberseguridad",
          "Identificar amenazas digitales comunes",
          "Comprender la importancia de proteger la información personal",
          "Conocer los principios básicos de seguridad en línea"
        ],
        lessons: [
          {
            title: "¿Qué es la ciberseguridad y por qué te importa?",
            objectives: ["Definir ciberseguridad", "Entender por qué es relevante para personas sin conocimientos técnicos"],
            contentTypes: ["explicación", "ejemplos", "consejos prácticos"],
            duration: 15,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: false
          },
          {
            title: "Tipos de amenazas digitales que enfrentas",
            objectives: ["Identificar diferentes tipos de amenazas", "Reconocer señales de peligro"],
            contentTypes: ["explicación", "casos reales", "señales de alerta"],
            duration: 20,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: true
          },
          {
            title: "Principios básicos de seguridad en línea",
            objectives: ["Aplicar principios fundamentales", "Establecer hábitos seguros"],
            contentTypes: ["guía práctica", "checklist", "rutinas recomendadas"],
            duration: 25,
            hasVideo: false,
            hasActivity: true,
            hasQuiz: true
          }
        ],
        quiz: {
          title: "Quiz: Fundamentos de Ciberseguridad",
          questionCount: 5,
          passingScore: 60
        }
      },
      {
        title: "Contraseñas y Autenticación Segura",
        description: "Cómo crear y gestionar contraseñas seguras, y proteger el acceso a tus cuentas",
        objectives: [
          "Crear contraseñas fuertes y únicas",
          "Utilizar gestores de contraseñas",
          "Implementar autenticación de dos factores",
          "Gestionar recuperación de acceso de forma segura"
        ],
        lessons: [
          {
            title: "Crear contraseñas seguras que puedas recordar",
            objectives: ["Diseñar contraseñas robustas", "Métodos para recordar contraseñas seguras"],
            contentTypes: ["técnicas", "ejemplos prácticos", "generadores"],
            duration: 20,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: false
          },
          {
            title: "Gestores de contraseñas: tu caja fuerte digital",
            objectives: ["Elegir un gestor de contraseñas", "Configurar y usar efectivamente"],
            contentTypes: ["comparación", "tutorial paso a paso", "buenas prácticas"],
            duration: 25,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: true
          },
          {
            title: "Autenticación de dos factores: la segunda llave",
            objectives: ["Entender cómo funciona la 2FA", "Implementar en tus cuentas principales"],
            contentTypes: ["explicación técnica simple", "configuración paso a paso", "opciones disponibles"],
            duration: 20,
            hasVideo: false,
            hasActivity: true,
            hasQuiz: true
          }
        ],
        quiz: {
          title: "Quiz: Seguridad de Contraseñas",
          questionCount: 5,
          passingScore: 60
        }
      },
      {
        title: "Phishing y Engaño Digital",
        description: "Cómo identificar y protegerse de intentos de engaño en línea",
        objectives: [
          "Reconectar correos y mensajes falsos",
          "Identificar sitios web fraudulentos",
          "Protegerse contra la ingeniería social",
          "Responder adecuadamente ante ataques"
        ],
        lessons: [
          {
            title: "¿Qué es el phishing y cómo funciona?",
            objectives: ["Entender el concepto de phishing", "Identificar técnicas comunes"],
            contentTypes: ["explicación", "ejemplos visuales", "señales de alerta"],
            duration: 15,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: false
          },
          {
            title: "Correos falsos: aprendiendo a detectarlos",
            objectives: ["Analizar elementos sospechosos", "Verificar la autenticidad"],
            contentTypes: ["análisis de ejemplos", "puntos de verificación", "herramientas de ayuda"],
            duration: 20,
            hasVideo: true,
            hasActivity: true,
            hasQuiz: true
          },
          {
            title: "Protección contra ingeniería social",
            objectives: ["Reconectar técnicas de manipulación", "Establecer límites de información"],
            contentTypes: ["casos reales", "estrategias de protección", "respuestas adecuadas"],
            duration: 20,
            hasVideo: false,
            hasActivity: true,
            hasQuiz: true
          }
        ],
        quiz: {
          title: "Quiz: Detección de Phishing",
          questionCount: 5,
          passingScore: 60
        }
      }
    ];

    return {
      title: context.originalIdea,
      description: "Curso completo de ciberseguridad para personas sin conocimientos técnicos que quieren proteger su información personal",
      objectives: [
        "Proteger cuentas personales de amenazas digitales",
        "Implementar medidas de seguridad en dispositivos",
        "Identificar y evitar ataques de phishing",
        "Gestionar datos personales de forma segura",
        "Crear y mantener hábitos de seguridad sostenibles"
      ],
      modules,
      finalExam: {
        title: "Examen Final: Ciberseguridad para Principiantes",
        description: "Evaluación final para verificar comprensión de los conceptos clave del curso",
        passingScore: 70,
        timeLimit: 60, // minutos
        questionCount: 10
      },
      certificate: {
        enabled: true,
        title: "Certificado en Ciberseguridad para Principiantes",
        description: "Certificado por completar el curso de ciberseguridad básica",
        requirements: ["Completar todas las lecciones", "Aprobar exámenes de módulo", "Aprobar examen final"]
      },
      metadata: {
        totalLessons: modules.reduce((sum, mod) => sum + mod.lessons.length, 0),
        estimatedHours: Math.ceil(modules.reduce((sum, mod) => sum + mod.lessons.length * 0.5, 0)),
        difficulty: "Principiante"
      }
    };
  }

  async generateModule(
    context: GenerationContext,
    moduleIndex: number
  ): Promise<GeneratedModule> {
    await this.simulatedDelay();

    const moduleBlueprint = context.courseBlueprint!.modules[moduleIndex];

    // FASE 4: cada lección con contenido completo y específico del tema.
    const lessons: GeneratedLesson[] = moduleBlueprint.lessons.map((lesson, lessonIndex) => {
      const content: LessonContent = buildSpecificLessonContent(lesson.title);

      return {
        id: `lesson-${moduleIndex}-${lessonIndex}`,
        title: lesson.title,
        content,
        order: lessonIndex + 1,
        estimatedMinutes: lesson.duration
      };
    });

    return {
      id: `module-${moduleIndex}`,
      title: moduleBlueprint.title,
      description: moduleBlueprint.description,
      lessons,
      order: moduleIndex + 1,
      estimatedHours: Math.ceil(moduleBlueprint.lessons.reduce((sum, lesson) => sum + lesson.duration, 0) / 60)
    };
  }

  async generateLesson(
    context: GenerationContext,
    moduleIndex: number,
    lessonIndex: number
  ): Promise<GeneratedLesson> {
    await this.simulatedDelay();

    const moduleBlueprint = context.courseBlueprint!.modules[moduleIndex];
    const lessonBlueprint = moduleBlueprint.lessons[lessonIndex];
    return {
      id: `lesson-${moduleIndex}-${lessonIndex}`,
      title: lessonBlueprint.title,
      content: buildSpecificLessonContent(lessonBlueprint.title),
      order: lessonIndex + 1,
      estimatedMinutes: lessonBlueprint.duration
    };
  }

  async generateActivity(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<ActivityContent> {
    await this.simulatedDelay();
    
    // FASE 5: actividad determinística y específica (sin random).
    // El tipo rota por hash del título para variar sin aleatoriedad.
    const activityTypes = ["multiple_choice", "true_false", "case_study", "checklist"] as const;
    const hash = [...lessonTitle].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const type = activityTypes[hash % activityTypes.length];

    return {
      type,
      title: `Actividad: ${lessonTitle}`,
      description: "Actividad práctica para aplicar lo aprendido",
      instruction: generateActivityInstruction(type, lessonTitle),
      content: generateActivityContent(type, lessonTitle),
      feedback: generateActivityFeedback(lessonTitle)
    };
  }

  async generateQuiz(
    context: GenerationContext,
    moduleTitle: string,
    lessonTitles: string[]
  ): Promise<GeneratedQuiz> {
    await this.simulatedDelay();

    // FASE 5: quiz específico por módulo (no genérico). IDs estables para reanudar.
    const questions = buildModuleQuizQuestions(moduleTitle, lessonTitles);

    return {
      id: `quiz-${slugify(moduleTitle)}`,
      title: `Quiz: ${moduleTitle}`,
      questions,
      passingScore: 60,
      timeLimit: 15
    };
  }

  async generateFinalExam(
    context: GenerationContext,
    courseContent: GeneratedModule[]
  ): Promise<GeneratedExam> {
    await this.simulatedDelay();
    
    const questions = [
      // Fundamento (2 preguntas)
      {
        id: "exam1",
        type: "multiple_choice" as const,
        question: "¿Cuál es la definición más acertada de ciberseguridad?",
        options: [
          "Protección de sistemas informáticos contra accesos no autorizados",
          "Evitar todo uso de internet",
          "Solo proteger cuentas bancarias",
          "Complicar la vida digital innecesariamente"
        ],
        correctAnswer: 0,
        explanation: "La ciberseguridad protege sistemas y datos contra amenazas digitales.",
        points: 10
      },
      {
        id: "exam2",
        type: "true_false" as const,
        question: "Las personas sin conocimientos técnicos no necesitan preocuparse por la ciberseguridad",
        correctAnswer: "false",
        explanation: "Todos los usuarios de internet deben tomar medidas básicas de seguridad.",
        points: 10
      },
      // Contraseñas (2 preguntas)
      {
        id: "exam3",
        type: "multiple_choice" as const,
        question: "¿Cuál es la longitud MÍNIMA recomendada para una contraseña segura?",
        options: ["6 caracteres", "8 caracteres", "12 caracteres", "20 caracteres"],
        correctAnswer: 2,
        explanation: "Las contraseñas de 12+ caracteres son más seguras contra ataques.",
        points: 10
      },
      {
        id: "exam4",
        type: "multiple_choice" as const,
        question: "¿Qué herramienta ayuda a gestionar múltiples contraseñas seguras?",
        options: ["Gestor de contraseñas", "Hoja de cálculo", "Bloque de notas", "Correo electrónico"],
        correctAnswer: 0,
        explanation: "Los gestores de contraseñas almacenan y generan contraseñas seguras.",
        points: 10
      },
      // Phishing (2 preguntas)
      {
        id: "exam5",
        type: "multiple_choice" as const,
        question: "¿Qué deberías hacer si recibes un correo sospechoso de phishing?",
        options: [
          "Borrar sin abrir",
          "Reportar como spam/phishing",
          "No responder ni hacer clic en enlaces",
          "Todas las anteriores"
        ],
        correctAnswer: 3,
        explanation: "Todas estas acciones ayudan a protegerse contra el phishing.",
        points: 10
      },
      {
        id: "exam6",
        type: "true_false" as const,
        question: "Los sitios de phishing siempre tienen URLs que comienzan con 'https://'",
        correctAnswer: "false",
        explanation: "Muchos sitios de phishing usan certificados falsos y URLs engañosas.",
        points: 10
      },
      // Dispositivos (2 preguntas)
      {
        id: "exam7",
        type: "multiple_choice" as const,
        question: "¿Por qué es importante actualizar regularmente tus dispositivos?",
        options: [
          "Para obtener nuevas funciones",
          "Para corregir vulnerabilidades de seguridad",
          "Para mejorar el rendimiento",
          "Todas las anteriores"
        ],
        correctAnswer: 3,
        explanation: "Las actualizaciones incluyen parches de seguridad críticos.",
        points: 10
      },
      {
        id: "exam8",
        type: "true_false" as const,
        question: "Los WiFi públicos son siempre seguros para realizar transacciones bancarias",
        correctAnswer: "false",
        explanation: "Los WiFi públicos pueden ser interceptados, evita actividades sensibles.",
        points: 10
      },
      // Backup (1 pregunta)
      {
        id: "exam9",
        type: "multiple_choice" as const,
        question: "¿Con qué frecuencia se recomienda hacer backup de datos importantes?",
        options: ["Una vez al año", "Una vez al mes", "Semanalmente", "Depende de la frecuencia de cambio"],
        correctAnswer: 3,
        explanation: "La frecuencia debe basarse en cuán a menudo cambian tus datos importantes.",
        points: 10
      },
      // Incidentes (1 pregunta)
      {
        id: "exam10",
        type: "true_false" as const,
        question: "Si tu cuenta fue comprometida, solo necesitas cambiar la contraseña",
        correctAnswer: "false",
        explanation: "Debes cambiar contraseña, revisar actividad reciente y habilitar 2FA si está disponible.",
        points: 10
      }
    ];

    return {
      id: `exam-${Date.now()}`,
      title: "Examen Final: Ciberseguridad para Principiantes",
      description: "Evalúa tu comprensión de los conceptos clave del curso",
      questions,
      passingScore: 70,
      timeLimit: 60,
      instructions: [
        "Tienes 60 minutos para completar el examen",
        "Lee cada pregunta cuidadosamente",
        "Selecciona la mejor respuesta",
        "Necesitas 70% para aprobar",
        "Buena suerte!"
      ]
    };
  }

  async generateVideoScript(
    context: GenerationContext,
    lessonTitle: string,
    lessonContent: string
  ): Promise<VideoContent> {
    await this.simulatedDelay();
    
    const scenes = [
      { text: `Bienvenidos a la lección sobre ${lessonTitle}.`, duration: 5, visualCue: "Intro animada" },
      { text: "Hoy aprenderemos cómo proteger tu información personal en internet.", duration: 10, visualCue: "Infografía de seguridad" },
      { text: "Las amenazas digitales son reales, pero con conocimiento puedes evitarlas.", duration: 8, visualCue: "Estadísticas visuales" },
      { text: "Te mostraré paso a paso qué hacer para mantenerte seguro.", duration: 6, visualCue: "Checklist animado" },
      { text: "Recuerda: la seguridad es un hábito, no un evento único.", duration: 7, visualCue: "Conclusión con resumen" }
    ];

    return {
      enabled: true,
      status: "pending",
      title: `Video: ${lessonTitle}`,
      script: scenes.map(s => s.text).join(" "),
      scenes,
      duration: scenes.reduce((sum, scene) => sum + scene.duration, 0),
      thumbnail: undefined,
      url: undefined
    };
  }

  async generateCertificate(context: GenerationContext): Promise<GeneratedCertificate> {
    await this.simulatedDelay();

    // FASE 7: certificado opcional con campos visualizables. ID estable por idea.
    const topic = context.productSpecification.topic || "Curso";
    return {
      id: `cert-${slugify(context.originalIdea).slice(0, 32) || "curso"}`,
      title: `Certificado en ${topic}`,
      description: `Certifica la finalización exitosa del curso de ${topic.toLowerCase()}`,
      template: "modern_dark_purple",
      requirements: {
        completedLessons: true,
        passedExam: true,
        minimumScore: 70
      },
      enabled: true,
      courseTitle: context.courseBlueprint?.title ?? topic,
      author: "Crow Market",
      dateIssued: new Date().toISOString(),
      certificateId: `CROW-${slugify(topic).toUpperCase().slice(0, 8)}-2026`
    };
  }

  async validateCourse(
    context: GenerationContext,
    course: {
      blueprint: CourseBlueprint;
      modules: GeneratedModule[];
      exam: GeneratedExam;
    }
  ): Promise<QualityValidation> {
    await this.simulatedDelay();

    // FASE 9: validación determinística (sin Math.random).
    return validateCourseDeterministic(context, course);
  }

  // ============================================
  // WEB INTERACTIVA (segundo formato; curso intacto)
  // ============================================

  async analyzeWebIdea(idea: string): Promise<WebSpecification> {
    await this.simulatedDelay();
    const t = idea.toLowerCase();
    if (t.includes("ingl") || t.includes("english")) {
      return {
        topic: "Inglés desde cero",
        audience: "Principiantes sin conocimientos previos de inglés",
        level: "principiante",
        goal: "Aprender saludos, números, colores y frases básicas para comunicarse desde la primera semana",
        language: "es",
        sections: ["start", "greetings", "numbers", "colors", "phrases", "progress"],
      };
    }
    const topic = idea.length > 80 ? `${idea.slice(0, 77)}...` : idea;
    return {
      topic,
      audience: "Personas interesadas en el tema",
      level: "principiante",
      goal: idea,
      language: "es",
      sections: ["intro", "esencial", "practica", "progreso"],
    };
  }

  async generateWebBlueprint(context: WebGenerationContext): Promise<InteractiveWebBlueprint> {
    await this.simulatedDelay();
    const spec = context.specification;
    const t = spec.topic.toLowerCase();
    if (t.includes("inglés") || t.includes("ingles") || t.includes("english")) {
      return {
        title: "Inglés desde Cero",
        description:
          "Web interactiva para aprender inglés desde cero: saludos, números, colores y frases útiles con práctica real en cada sección.",
        targetAudience: spec.audience,
        level: spec.level,
        language: spec.language,
        branding: {
          primaryColor: "#4f46e5",
          secondaryColor: "#0d9488",
          backgroundColor: "#faf8f2",
          surfaceColor: "#ffffff",
          textColor: "#1c1917",
          mutedColor: "#78716c",
          borderRadius: 14,
          fontFamily: '"Inter", system-ui, sans-serif',
          themeName: "english-warm",
        },
        sections: [
          { id: "start", title: "Empieza aquí", purpose: "Orientación: cómo usar esta web y tu plan de 15 minutos al día.", componentTypes: ["hero", "richText", "checklist"] },
          { id: "greetings", title: "Saludos básicos", purpose: "Saludar, presentarte y despedirte en inglés.", componentTypes: ["richText", "flashcards", "quiz"] },
          { id: "numbers", title: "Números del 0 al 20", purpose: "Contar, dar tu edad y tu número de teléfono.", componentTypes: ["cards", "vocabMatch", "quiz"] },
          { id: "colors", title: "Colores y objetos", purpose: "Nombrar colores y objetos del aula.", componentTypes: ["tabs", "flashcards", "quiz"] },
          { id: "phrases", title: "Frases que ya puedes usar", purpose: "Frases útiles para situaciones reales.", componentTypes: ["accordion", "quiz"] },
          { id: "progress", title: "Tu progreso", purpose: "Ver tu avance y fijar el siguiente paso.", componentTypes: ["progress", "checklist", "cta"] },
        ],
      };
    }
    // Fallback específico por tema (sin placeholders, sin estructuras genéricas)
    const branding = brandingForTopic(spec.topic);
    return {
      title: spec.topic,
      description: spec.goal,
      targetAudience: spec.audience,
      level: spec.level,
      language: spec.language,
      branding,
      sections: [
        { id: "intro", title: `Introducción a ${spec.topic}`, purpose: `Qué es ${spec.topic} y cómo usar esta web.`, componentTypes: ["hero", "richText", "checklist"] },
        { id: "esencial", title: `${spec.topic} esencial`, purpose: `Los conceptos clave de ${spec.topic}.`, componentTypes: ["cards", "quiz"] },
        { id: "practica", title: `Practica ${spec.topic}`, purpose: `Ejercicios interactivos de ${spec.topic}.`, componentTypes: ["richText", "quiz", "checklist"] },
        { id: "progreso", title: "Tu progreso", purpose: "Ver tu avance y fijar el siguiente paso.", componentTypes: ["progress", "cta"] },
      ],
    };
  }

  async generateWebSection(
    context: WebGenerationContext,
    sectionIndex: number
  ): Promise<InteractiveWebSection> {
    await this.simulatedDelay();
    const blueprint = context.blueprint;
    if (!blueprint) throw new Error("Falta el blueprint web");
    const sb = blueprint.sections[sectionIndex];
    if (!sb) throw new Error(`Sección web ${sectionIndex} inexistente`);
    const topic = context.specification.topic;
    const build = ENGLISH_SECTIONS[sb.id] ?? fallbackSectionContent(topic, sb.id);
    const components = build(sb.id, sb.componentTypes);
    return { id: sb.id, title: sb.title, purpose: sb.purpose, order: sectionIndex + 1, components };
  }

  async validateWebProduct(
    context: WebGenerationContext,
    product: { blueprint: InteractiveWebBlueprint; sections: InteractiveWebSection[] }
  ): Promise<WebQualityValidation> {
    await this.simulatedDelay();
    return validateWebDeterministic(context, product);
  }

  // ============================================
  // PDF / EBOOK (tercer formato; curso y web intactos)
  // ============================================

  async analyzePdfIdea(idea: string): Promise<PdfSpecification> {
    await this.simulatedDelay();
    const pages = parseTargetPages(idea);
    const t = idea.toLowerCase();
    const { tone, toneSpecified } = detectPdfTone(t);
    const { style, styleSpecified } = detectPdfStyle(t);
    const paletteMode = /personalizada|color|colores|paleta/i.test(idea) ? "custom" as const : "auto" as const;
    const extra = {
      tone,
      style,
      paletteMode,
      recommendedByCrow: !toneSpecified && !styleSpecified,
    };
    const base = { language: "es" as const, targetPages: pages, ...extra };
    const audienceDefault = "Lectores principiantes interesados en el tema";
    if (t.includes("marketing")) {
      return { topic: "Marketing digital para emprendedores", audience: "Emprendedores que están empezando y necesitan sus primeros clientes", level: "principiante", goal: idea, ...base };
    }
    if (t.includes("ingl") || t.includes("english")) {
      return { topic: "Inglés desde cero", audience: "Personas sin conocimientos previos de inglés", level: "principiante", goal: idea, ...base };
    }
    if (t.includes("foto")) {
      return { topic: "Fotografía desde cero", audience: "Aficionados que quieren tomar mejores fotos con lo que tienen", level: "principiante", goal: idea, ...base };
    }
    if (t.includes("correr") || t.includes("running") || t.includes("5k") || t.includes("5 k")) {
      return { topic: "Entrenamiento para correr 5K", audience: "Personas sedentarias que quieren correr sus primeros 5 kilómetros", level: "principiante", goal: idea, ...base };
    }
    return { topic: idea.length > 80 ? `${idea.slice(0, 77)}...` : idea, audience: audienceDefault, level: "principiante", goal: idea, ...base };
  }

  async generatePdfBlueprint(context: PdfGenerationContext): Promise<PdfBlueprint> {
    await this.simulatedDelay();
    const spec = context.specification;
    const topicKey = pdfTopicKey(spec.topic);
    const chapters = pdfChaptersFor(topicKey, spec.topic);
    // Respeta el estilo elegido por el usuario; si no eligió, Crow recomienda.
    const branding = brandingForPreset(spec.style, topicKey);
    const subtitle = subtitleForTopic(topicKey, spec.topic);
    const title = titleForTopic(topicKey, spec.topic);
    return {
      title,
      subtitle,
      description: spec.goal,
      targetAudience: spec.audience,
      level: spec.level,
      language: spec.language,
      targetPages: spec.targetPages,
      chapters: chapters.map((c, i) => ({
        id: `ch-${i + 1}`,
        title: c.title,
        summary: c.summary,
        sectionTitles: c.sections.map((s) => s.title),
      })),
      branding,
      cover: {
        title,
        subtitle,
        author: "Crow Market",
        brandLine: "CROW MARKET · EDICIÓN DIGITAL",
        edition: "1.ª edición",
      },
      brief: buildEditorialBrief(topicKey, spec, title, subtitle, chapters.length),
      personalization: {
        tone: spec.tone,
        style: spec.style,
        paletteMode: spec.paletteMode,
        recommended: spec.recommendedByCrow,
      },
    };
  }

  async generatePdfPresentation(context: PdfGenerationContext): Promise<PdfPresentation> {
    await this.simulatedDelay();
    const spec = context.specification;
    const chapters = context.blueprint?.chapters ?? [];
    return {
      welcome: `Bienvenido a ${context.blueprint?.title ?? spec.topic}. Este ebook fue creado para llevarte desde cero hasta un resultado concreto, paso a paso y sin humo.`,
      whatYouLearn: chapters.map((c) => c.title),
      whoFor: `Este ebook es para ti si: ${spec.audience.charAt(0).toLowerCase() + spec.audience.slice(1)}. No necesitas experiencia previa, solo ganas de aplicar.`,
      howToUse: "Lee los capítulos en orden, completa un ejercicio por capítulo antes de seguir y marca tu avance. Reserva sesiones cortas y regulares: la constancia supera a la intensidad.",
    };
  }

  async rewritePdfBlock(
    context: PdfGenerationContext,
    block: PdfContentBlock,
    action: PdfTextAction
  ): Promise<PdfContentBlock> {
    await this.simulatedDelay();
    const topicKey = pdfTopicKey(context.specification.topic);
    return rewriteBlockText(block, action, topicKey);
  }

  async regeneratePdfSection(
    context: PdfGenerationContext,
    chapterIndex: number,
    sectionIndex: number,
    variant: number
  ): Promise<PdfSection> {
    await this.simulatedDelay();
    const blueprint = context.blueprint;
    if (!blueprint) throw new Error("Falta el blueprint PDF");
    const topicKey = pdfTopicKey(context.specification.topic);
    const bank = pdfChaptersFor(topicKey, context.specification.topic);
    const source = bank[chapterIndex];
    if (!source || !source.sections[sectionIndex]) throw new Error("Sección inexistente");
    const rebuilt = buildPdfChapter(`ch-${chapterIndex + 1}`, chapterIndex, blueprint.chapters[chapterIndex]?.title ?? source.title, {
      ...source,
      sections: [applySectionVariant(source.sections[sectionIndex], variant, topicKey)],
    });
    const sec = rebuilt.sections[0];
    return { ...sec, id: `ch-${chapterIndex + 1}-s${sectionIndex + 1}`, order: sectionIndex + 1 };
  }

  async generatePdfChapter(
    context: PdfGenerationContext,
    chapterIndex: number
  ): Promise<PdfChapter> {
    await this.simulatedDelay();
    const blueprint = context.blueprint;
    if (!blueprint) throw new Error("Falta el blueprint PDF");
    const cb = blueprint.chapters[chapterIndex];
    if (!cb) throw new Error(`Capítulo PDF ${chapterIndex} inexistente`);
    const topicKey = pdfTopicKey(context.specification.topic);
    const source = pdfChaptersFor(topicKey, context.specification.topic)[chapterIndex];
    if (!source) throw new Error(`Contenido inexistente para capítulo ${chapterIndex}`);
    return buildPdfChapter(cb.id, chapterIndex, cb.title, source);
  }

  async validatePdfProduct(
    context: PdfGenerationContext,
    product: {
      blueprint: PdfBlueprint;
      chapters: PdfChapter[];
      exportInfo?: { pageCount: number; byteSize: number } | null;
    }
  ): Promise<PdfQualityValidation> {
    await this.simulatedDelay();
    return validatePdfDeterministic(context, product);
  }

  // ============================================
  // KIT DE RECURSOS (quinto formato; resto intacto)
  // ============================================

  async analyzeKitIdea(idea: string): Promise<KitSpecification> {
    await this.simulatedDelay();
    const t = idea.toLowerCase();
    if ((t.includes("inteligencia artificial") || t.includes(" ia ") || t.includes("con ia")) && (t.includes("emprendedor") || t.includes("negocio") || t.includes("cliente"))) {
      return {
        topic: "IA para emprendedores",
        audience: "Emprendedores que quieren conseguir clientes usando IA",
        problem: "No tienen tiempo ni equipo para marketing constante",
        goal: idea,
        level: "principiante",
        recommendedCount: 9,
      };
    }
    if (t.includes("contenido")) {
      return {
        topic: "Creación de contenido",
        audience: "Creadores y emprendedores que publican en redes",
        problem: "Se quedan sin ideas y publican sin sistema",
        goal: idea,
        level: "principiante",
        recommendedCount: 8,
      };
    }
    return {
      topic: idea.length > 80 ? `${idea.slice(0, 77)}...` : idea,
      audience: "Personas interesadas en el tema",
      problem: "Falta de sistema y materiales prácticos",
      goal: idea,
      level: "principiante",
      recommendedCount: 6,
    };
  }

  async generateKitBlueprint(context: KitGenerationContext): Promise<KitBlueprint> {
    await this.simulatedDelay();
    const spec = context.specification;
    const t = spec.topic.toLowerCase();
    if (t.includes("ia para emprendedores")) return aiBusinessKitBlueprint(spec);
    if (t.includes("contenido")) return contentKitBlueprint(spec);
    return fallbackKitBlueprint(spec);
  }

  async generateKitResource(
    context: KitGenerationContext,
    resourceIndex: number
  ): Promise<KitResource> {
    await this.simulatedDelay();
    const blueprint = context.blueprint;
    if (!blueprint) throw new Error("Falta el blueprint del kit");
    const rb = blueprint.resources[resourceIndex];
    if (!rb) throw new Error(`Recurso del kit ${resourceIndex} inexistente`);
    const topicKey = kitTopicKey(context.specification.topic);
    const blocks = buildKitResourceBlocks(topicKey, rb.id, context.specification.topic);
    return {
      id: rb.id,
      title: rb.title,
      kind: rb.kind,
      folderId: rb.folderId,
      formats: rb.formats,
      summary: rb.summary,
      blocks,
      order: resourceIndex + 1,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
  }

  async rewriteKitResource(
    context: KitGenerationContext,
    resource: KitResource,
    action: KitTextAction
  ): Promise<KitResource> {
    await this.simulatedDelay();
    const topic = context.specification.topic;
    return { ...resource, blocks: resource.blocks.map((b) => rewriteKitBlock(b, action, topic)), updatedAt: new Date().toISOString() };
  }

  async validateKitProduct(
    context: KitGenerationContext,
    product: { blueprint: KitBlueprint; resources: KitResource[] }
  ): Promise<KitQualityValidation> {
    await this.simulatedDelay();
    return validateKitDeterministic(context, product);
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// DEPRECATED: helpers genéricos rotativos. Se conservan por compatibilidad,
// pero el flujo principal usa buildSpecificLessonContent (FASE 4).
function generateCybersecurityExplanation(title: string): string {
  return buildSpecificLessonContent(title).explanation;
}

function generateCybersecurityExamples(title: string): string[] {
  return buildSpecificLessonContent(title).examples;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "leccion";
}

type LessonKind =
  | "que-es"
  | "amenazas"
  | "principios"
  | "passwords"
  | "gestor"
  | "2fa"
  | "phishing-que-es"
  | "correo-falso"
  | "ingenieria";

function lessonKind(title: string): LessonKind {
  const t = title.toLowerCase();
  if (t.includes("correo") || t.includes("falso") || t.includes("detectar")) return "correo-falso";
  if (t.includes("ingenieria") || t.includes("ingeniería") || t.includes("social")) return "ingenieria";
  if (t.includes("phishing")) return "phishing-que-es";
  if (t.includes("gestor") || t.includes("caja fuerte")) return "gestor";
  if (t.includes("dos factores") || t.includes("2fa") || t.includes("segunda llave") || t.includes("autentic")) return "2fa";
  if (t.includes("contrase") || t.includes("recordar")) return "passwords";
  if (t.includes("amenaza") || t.includes("tipos")) return "amenazas";
  if (t.includes("principio") || t.includes("hábito") || t.includes("habito")) return "principios";
  return "que-es";
}

interface SpecificLesson {
  introduction: string;
  explanation: string;
  sections: { heading: string; body: string }[];
  keyPoints: string[];
  examples: string[];
  exercise: string;
  summary: string;
  resources: string[];
}

const LESSON_BANK: Record<LessonKind, SpecificLesson> = {
  "que-es": {
    introduction:
      "La ciberseguridad es cómo protegés tus cuentas, tu celular y tu dinero cuando usás internet. En esta lección vas a entender qué protege y por qué te importa aunque no seas técnico.",
    explanation:
      "Ciberseguridad significa proteger sistemas, cuentas y datos del acceso no autorizado, el engaño y el robo. Para un principiante, se resume en tres ideas: confidencialidad (nadie entra a tus cuentas sin permiso), integridad (nadie cambia tu información) y disponibilidad (podés usar tus servicios cuando los necesitás).\n\nLos ataques más comunes no requieren que seas famoso ni rico: usan contraseñas débiles, correos falsos y descuidos cotidianos. Por eso la defensa más fuerte no es un programa caro, sino hábitos simples repetidos todos los días.",
    sections: [
      {
        heading: "Los 3 pilares en lenguaje simple",
        body: "Confidencialidad: tu email, fotos y claves solo las ves vos. Integridad: tu dinero y tus mensajes no son alterados. Disponibilidad: cuando necesitás entrar a tu cuenta, funciona. Cada medida que aprendas en este curso protege uno de estos pilares.",
      },
      {
        heading: "Por qué atacan a personas comunes",
        body: "Porque es más fácil. Un atacante prueba miles de contraseñas filtradas en segundos, envía correos falsos masivos y aprovecha cuentas sin segundo factor. No te elige a vos: aprovecha el descuido más común.",
      },
      {
        heading: "Qué vas a lograr en este curso",
        body: "Vas a crear contraseñas fuertes sin olvidarlas, activar el segundo factor, detectar correos falsos y ordenar tus dispositivos. Al final, tu nivel de riesgo baja drásticamente con 4 o 5 hábitos.",
      },
    ],
    keyPoints: [
      "Ciberseguridad = proteger cuentas, dispositivos y datos del acceso no autorizado",
      "Los 3 pilares son confidencialidad, integridad y disponibilidad",
      "La mayoría de los ataques aprovechan descuidos humanos, no fallas técnicas",
      "Con hábitos simples (claves únicas + 2FA + detectar phishing) evitás la mayoría de los casos",
    ],
    examples: [
      "Caso: Lucía usaba la misma clave en email y tienda online. Filtraron la tienda y entraron a su email. Con claves únicas, el daño quedaba aislado.",
      "Caso: a Pedro le llegó un correo falso de su banco con urgencia. Como verificó la dirección real del remitente, no hizo clic y evitó el robo.",
      "Práctica: anotá hoy tus 3 cuentas más importantes (email, banco, red social). Esas son las primeras que vas a proteger en el módulo 2.",
    ],
    exercise:
      "Ejercicio (10 min): escribí qué información perderías si hoy te roban el celular (fotos, chats, banco, email). Ordenala por importancia. Esa lista será tu mapa de protección del curso.",
    summary:
      "Aprendiste qué es la ciberseguridad, por qué atacan a personas comunes y cuáles son los 3 pilares. El siguiente paso es conocer las amenazas concretas para reconocerlas cuando aparezcan.",
    resources: [
      "Checklist: mis 3 cuentas críticas",
      "Guía: los 3 pilares con ejemplos",
      "Lista: señales de una cuenta en riesgo",
    ],
  },
  amenazas: {
    introduction:
      "Phishing, malware, robo de cuentas e ingeniería social: en esta lección vas a reconocer cada amenaza por su forma de operar y sus señales.",
    explanation:
      "Las amenazas digitales más frecuentes para principiantes son cuatro. Phishing: mensajes falsos que imitan a tu banco o a una empresa para robarte la clave. Malware: programas maliciosos que se instalan por adjuntos o apps truchas y roban datos. Robo de cuentas: prueban claves filtradas de otros sitios hasta entrar (por eso no hay que reutilizar). Ingeniería social: te manipulan por urgencia, miedo o premio para que entregues un código.\n\nTodas dejan rastros: remitentes raros, enlaces que no coinciden, adjuntos inesperados, pedidos de códigos por mensaje y ofertas demasiado buenas.",
    sections: [
      {
        heading: "Phishing y malware",
        body: "Phishing llega por email, SMS o WhatsApp y te lleva a una página falsa idéntica a la real. Malware llega como adjunto, app fuera de tiendas oficiales o programa pirata. En ambos casos, el clic es la puerta de entrada.",
      },
      {
        heading: "Robo y reutilización de claves",
        body: "Cuando un sitio es hackeado, tu email y tu clave circulan en listas. Los atacantes las prueban en Gmail, Instagram y bancos. Si repetís claves, una filtración abre todas tus puertas.",
      },
      {
        heading: "Ingeniería social",
        body: "Frases típicas: tu cuenta será bloqueada, ganaste un premio, soy soporte y necesito tu código. Ningún banco ni empresa seria te pide la clave o el código por mensaje. La urgencia es la herramienta del estafador.",
      },
    ],
    keyPoints: [
      "Phishing = mensaje falso que imita a una empresa para robar claves",
      "Malware = software malicioso que roba o bloquea tu dispositivo",
      "Reutilizar claves convierte una filtración en robo total",
      "La urgencia, el premio y el pedido de códigos son señales de ingeniería social",
    ],
    examples: [
      "Ejemplo phishing: email de banco-seguro-alerta.com (dominio falso) con botón Urgente: verificá tu cuenta. El banco real usa su dominio oficial y no presiona así.",
      "Ejemplo malware: app de linterna fuera de la tienda oficial que pide acceso a contactos y SMS. Una linterna no necesita esos permisos.",
      "Práctica: abrí un email real de tu banco y verificá remitente, dominio del enlace (sin hacer clic) y tono. Comparalo con las señales de esta lección.",
    ],
    exercise:
      "Ejercicio (15 min): buscá en tu bandeja 1 mensaje promocional y analizalo con la regla de 3: remitente, enlace y pedido. Anotá qué es legítimo y qué sería sospechoso si cambiara.",
    summary:
      "Ya distinguís phishing, malware, robo por reutilización e ingeniería social. Ahora toca convertir ese conocimiento en hábitos diarios de protección.",
    resources: [
      "Guía visual: anatomía de un correo falso",
      "Checklist: 7 señales de phishing",
      "Lista: permisos sospechosos en apps",
    ],
  },
  principios: {
    introduction:
      "No necesitás ser experto: con 5 principios vas a estar mejor protegido que el 90% de los usuarios. Esta lección los convierte en rutina.",
    explanation:
      "Los principios básicos son: 1) claves largas y únicas, 2) segundo factor siempre que exista, 3) desconfiar por defecto de enlaces y adjuntos, 4) actualizar sistema y apps, 5) copias de seguridad de lo importante.\n\nLa clave es el orden: primero tu email (es la llave maestra para recuperar todo), después banco y redes. Actualizar no es estética: cada actualización cierra agujeros que los atacantes ya conocen.",
    sections: [
      {
        heading: "Tu rutina de 10 minutos",
        body: "Activá 2FA en email, revisá sesiones abiertas, cambiá las 3 claves repetidas más importantes y activá actualizaciones automáticas. Repetilo una vez al mes.",
      },
      {
        heading: "Desconfianza sana",
        body: "Antes de hacer clic: ¿esperaba este mensaje? ¿El remitente es exacto? ¿El enlace coincide? Si hay duda, entrá escribiendo la dirección vos mismo en el navegador.",
      },
      {
        heading: "Respaldo mínimo",
        body: "Fotos y documentos importantes con copia automática en la nube más una copia mensual. Un ransomware o un robo dejan de ser tragedia si tenés respaldo.",
      },
    ],
    keyPoints: [
      "Email primero: es la llave para recuperar todas tus cuentas",
      "Claves únicas + 2FA + actualizar = base de tu seguridad",
      "Ante la duda, no hagas clic: accedé escribiendo la dirección vos",
      "Respaldo automático reduce el impacto de cualquier incidente",
    ],
    examples: [
      "Rutina: María activó 2FA en Gmail, cerró sesiones viejas y cambió su clave repetida del banco. En 12 minutos cerró sus 3 riesgos principales.",
      "Caso: Juan evitó un phishing porque en vez de hacer clic, escribió banco.com a mano y vio que no había ninguna alerta real.",
      "Práctica: activá hoy las actualizaciones automáticas del celular y de una app crítica (navegador o email).",
    ],
    exercise:
      "Ejercicio (15 min): aplicá la rutina mínima: 1) revisá sesiones de tu email, 2) activá 2FA donde esté disponible, 3) anotá qué claves repetís para cambiarlas en el módulo 2.",
    summary:
      "Tenés tus 5 principios y una rutina mensual. En el próximo módulo los aplicamos a fondo con contraseñas y autenticación.",
    resources: [
      "Checklist mensual de 10 minutos",
      "Guía: cómo revisar sesiones activas",
      "Plantilla: inventario de cuentas",
    ],
  },
  passwords: {
    introduction:
      "Vas a crear contraseñas de 12 o más caracteres que sí puedas recordar, usando el método de frase. Sin anotarlas en papeles ni repetirlas.",
    explanation:
      "Una contraseña segura tiene 4 rasgos: larga (12 mínimo, 16 ideal), única por cuenta importante, sin datos personales y con mezcla de tipos. Marta1985 se adivina en minutos porque usa nombre + año. En cambio, una frase como MiPerro!Come2vecesAlDía tiene 22 caracteres, es memorable y tarda años en romperse por fuerza bruta.\n\nEl método: elegí una frase personal que no publiques, tomá iniciales o palabras con cambios (a por @, o por 0), agregá un símbolo y un número, y variá el final por sitio (por ejemplo -Mail, -Banco). Nunca reutilices la misma en email y banco.",
    sections: [
      {
        heading: "Método de frase paso a paso",
        body: "1) Frase: Mi abuela cocina ñoquis los domingos. 2) Base: MAcñlD. 3) Endurecer: MAcñlD#2026!. 4) Variar por sitio: MAcñlD#2026!-Mail. Anotá solo la regla, nunca la clave completa.",
      },
      {
        heading: "Errores que debes eliminar hoy",
        body: "No uses nombre, DNI, fechas, equipo favorito ni 123456. No compartas claves por chat. No las guardes en notas sin protección. Y cambiá primero las repetidas del email y el banco.",
      },
      {
        heading: "Cómo recordar sin sufrir",
        body: "Una frase por ámbito (personal, trabajo, banco) y variación por sitio. Practicá escribiéndola 3 veces hoy. En una semana sale sola.",
      },
    ],
    keyPoints: [
      "Mínimo 12 caracteres, ideal 16 o más",
      "Única por cuenta importante, sobre todo email y banco",
      "Sin datos personales ni palabras de diccionario",
      "Método de frase: memorable para vos, imposible para otros",
    ],
    examples: [
      "Débil: Juan2024 o Marta1985 (se adivinan con datos públicos y listas comunes).",
      "Fuerte y memorable: MiPerro!Come2vecesAlDía (22 caracteres, mezcla real, atada a tu vida pero no publicada).",
      "Práctica: creá hoy tu frase para el email principal y probá su longitud. No la compartas ni la escribas completa en papel.",
    ],
    exercise:
      "Ejercicio (20 min): creá 2 frases (email y banco), medí su longitud, verificá que no tengan datos personales y cambiá la del email. Anotá solo la regla de variación.",
    summary:
      "Sabés crear claves largas, únicas y recordables. Ahora necesitás no tener que recordar 50: para eso está el gestor.",
    resources: [
      "Guía: método de frase con ejemplos",
      "Checklist: claves a cambiar primero",
      "Tabla: longitud vs. resistencia",
    ],
  },
  gestor: {
    introduction:
      "Un gestor es tu caja fuerte digital: crea, guarda y completa claves únicas por vos. Vas a elegir uno y configurarlo en tus 3 cuentas críticas.",
    explanation:
      "Recordar 30 claves distintas es imposible; por eso la gente repite. El gestor resuelve eso: genera claves de 16-20 caracteres, las cifra con tu clave maestra y las completa en cada sitio. Opciones conocidas: Bitwarden (gratuito y abierto), 1Password o el llavero de tu sistema.\n\nSolo debés memorizar una: la maestra, larga y con el método de frase. Activá además el segundo factor del gestor. A partir de ahí, cada cuenta nueva lleva clave generada, nunca inventada.",
    sections: [
      {
        heading: "Cómo elegir y empezar",
        body: "Elegí uno con app en celular y compu, sincronización y 2FA. Instalalo, creá la maestra, guardá el código de recuperación en papel en casa y agregá primero email, banco y red principal.",
      },
      {
        heading: "Uso diario",
        body: "Cuando crees una cuenta, usá Generar del gestor (16+ caracteres). No copies claves por chat. Si un sitio no acepta símbolos, pedí longitud máxima igual.",
      },
      {
        heading: "Qué hacer con las viejas",
        body: "El gestor te muestra repetidas y débiles. Cambiá de a 3 por semana empezando por email y dinero. En un mes quedás ordenado.",
      },
    ],
    keyPoints: [
      "El gestor permite tener claves únicas sin memorizarlas",
      "Solo memorizás la clave maestra (larga, método de frase)",
      "Generá claves de 16+ caracteres, nunca las inventes",
      "Activá 2FA también en el gestor y guardá el código de recuperación",
    ],
    examples: [
      "Caso: Diego tenía 40 cuentas con 3 claves repetidas. Migró email, banco e Instagram al gestor en una tarde y redujo su riesgo principal.",
      "Ejemplo: clave generada K9#mQ2!vX7@Lp4$Zq8w (20 caracteres) imposible de adivinar y no necesitás recordarla.",
      "Práctica: instalá un gestor hoy y guardá tu email principal con clave generada nueva.",
    ],
    exercise:
      "Ejercicio (25 min): instalá el gestor, creá la maestra, activá 2FA del gestor y migrá 3 cuentas (email, banco, red). Verificá que el autocompletado funcione.",
    summary:
      "Ya tenés caja fuerte digital. Te falta la segunda llave: el doble factor, que bloquea aunque te roben la clave.",
    resources: [
      "Comparativa simple de gestores",
      "Guía: crear tu clave maestra",
      "Checklist de migración en 4 semanas",
    ],
  },
  "2fa": {
    introduction:
      "El segundo factor es la segunda llave: aunque te roben la clave, no entran sin tu celular. Vas a activarlo donde más importa.",
    explanation:
      "2FA pide algo más además de la clave: un código temporal de app (Google Authenticator, Authy), una llave física o un SMS como último recurso. El código cambia cada 30 segundos y se genera en tu dispositivo, por eso robar la clave ya no alcanza.\n\nPrioridad: email, banco, redes y gestor de claves, en ese orden. Guardá los códigos de respaldo en papel: si perdés el celular, son tu única entrada.",
    sections: [
      {
        heading: "Qué método elegir",
        body: "App de autenticación antes que SMS (el SMS se puede interceptar con engaños a la operadora). Llave física si manejás dinero o trabajo sensible. SMS solo si no hay otra opción.",
      },
      {
        heading: "Activación en 5 minutos",
        body: "Entrá a Seguridad de la cuenta, activá Verificación en dos pasos, escaneá el QR con la app, guardá los 8-10 códigos de respaldo y probá salir y entrar.",
      },
      {
        heading: "Si perdés el celular",
        body: "Usá los códigos impresos, o el email de respaldo. Por eso el email va primero: es tu puerta de recuperación de todo lo demás.",
      },
    ],
    keyPoints: [
      "2FA bloquea el acceso aunque la clave se filtre",
      "Preferí app de códigos antes que SMS",
      "Activá primero email, banco y gestor",
      "Guardá los códigos de respaldo en papel, no en el mismo celular",
    ],
    examples: [
      "Caso: filtraron la clave de Ana, intentaron entrar a su email desde otro país y el 2FA lo frenó. Solo tuvo que cambiar la clave.",
      "Error común: activar 2FA por SMS y no guardar respaldos. Al cambiar de número, quedó afuera una semana.",
      "Práctica: activá hoy 2FA en tu email con app y guardá los códigos impresos.",
    ],
    exercise:
      "Ejercicio (20 min): activá 2FA en email y una red social con app, imprimí respaldos y probá un inicio de sesión completo.",
    summary:
      "Con claves únicas + gestor + 2FA, tu acceso queda en nivel alto. Ahora toca el engaño más común: el phishing.",
    resources: [
      "Guía: activar 2FA en Gmail/Outlook/Instagram",
      "Plantilla: hoja de códigos de respaldo",
      "Comparativa: app vs SMS vs llave",
    ],
  },
  "phishing-que-es": {
    introduction:
      "Phishing es el engaño más usado para robar claves: un mensaje falso que parece real. Vas a entender cómo funciona para no caer nunca más.",
    explanation:
      "Funciona en 3 pasos: 1) te contactan con urgencia o premio (tu cuenta será bloqueada, tenés un reembolso), 2) te llevan a una página o adjunto falso idéntico al real, 3) escribís tu clave o código y lo capturan en el acto.\n\nLlega por email, SMS (smishing) y WhatsApp (vishing por llamada). El objetivo siempre es el mismo: que actúes rápido sin verificar. La defensa es frenar, verificar por otro canal y nunca entregar códigos.",
    sections: [
      {
        heading: "Los 3 pasos del ataque",
        body: "Contacto con urgencia, enlace o adjunto falso, captura de clave o código. Si cortás cualquiera de los tres (no hacés clic, verificás, no das el código), el ataque muere.",
      },
      {
        heading: "Por qué funciona",
        body: "Imita logos, tonos y dominios parecidos (banco-seguro.com vs banco.com). Usa miedo (bloqueo) y codicia (premio). Y llega en el momento justo: fin de mes, impuestos, viajes.",
      },
      {
        heading: "Tu reflejo correcto",
        body: "No hagas clic. Abrí la app oficial o escribí la dirección vos. Llamá al número oficial, no al del mensaje. Y jamás pases un código que llegó a tu celular.",
      },
    ],
    keyPoints: [
      "Phishing = mensaje falso + urgencia + enlace o adjunto falso",
      "Busca que escribas tu clave o entregues tu código",
      "Llega por email, SMS, WhatsApp y llamadas",
      "Frenar y verificar por otro canal lo neutraliza",
    ],
    examples: [
      "Ejemplo: SMS Tu paquete está retenido, pagá $500 aquí con enlace raro. El correo real te pide entrar a su app oficial, no a un link.",
      "Ejemplo: llamada Soy del banco, pasame el código que te llegó. Los bancos nunca piden ese código: es la trampa.",
      "Práctica: reescribí con tus palabras los 3 pasos del phishing y contáselos a alguien hoy.",
    ],
    exercise:
      "Ejercicio (15 min): inventá (en papel) un mensaje de phishing típico y marcá sus 5 trampas. Detectar creando enseña más rápido.",
    summary:
      "Entendés el mecanismo completo. Ahora toca la parte práctica: diseccionar correos falsos reales.",
    resources: [
      "Infografía: los 3 pasos del phishing",
      "Lista: frases típicas de urgencia",
      "Guía: qué hacer si ya hiciste clic",
    ],
  },
  "correo-falso": {
    introduction:
      "Vas a aprender a diseccionar un correo falso en 60 segundos: remitente, enlace, adjunto, tono y pedido. Con práctica se vuelve automático.",
    explanation:
      "Revisá en orden: 1) Remitente exacto (soporte@banco-seguro-alerta.com no es banco.com). 2) Enlace sin hacer clic (pasá el cursor o mantené presionado para ver el destino real). 3) Adjuntos inesperados (.zip, .exe, factura que no esperabas). 4) Tono con urgencia, amenazas o premio y errores. 5) Pedido: claves, códigos o pagos ya es phishing.\n\nUn solo fallo grave alcanza para desconfiar. Y si es tu banco de verdad, el aviso también estará en su app oficial.",
    sections: [
      {
        heading: "Remitente y dominio",
        body: "Mirá después del @. Los atacantes usan subdominios y guiones: seguridad-banco.com, banco.soporte.io. El oficial es corto y conocido. Ante la duda, buscá el dominio oficial en Google.",
      },
      {
        heading: "Enlaces y adjuntos",
        body: "Sin hacer clic, verificá el destino. HTTPS no garantiza nada: también lo usan los falsos. No abras adjuntos no solicitados ni actives macros.",
      },
      {
        heading: "Verificación en 60 segundos",
        body: "¿Lo esperaba? ¿Pide clave/código/pago? ¿Hay urgencia? Si una respuesta es sí a lo sospechoso, reportá como phishing y borrá. Verificá en la app oficial.",
      },
    ],
    keyPoints: [
      "Verificá el dominio exacto después del @",
      "Inspeccioná el enlace sin hacer clic",
      "Urgencia + pedido de clave/código = phishing",
      "La app oficial confirma si el aviso es real",
    ],
    examples: [
      "Falso: De: alertas@banco-seguro24.com Asunto: Cuenta bloqueada en 24h con botón Verificar. Real: tu banco te muestra la misma alerta dentro de su app.",
      "Falso: factura.zip de un proveedor desconocido. Real: tu proveedor usa su dominio y el archivo que esperabas.",
      "Práctica: elegí 2 emails reales y practicá inspeccionar remitente y destino de enlaces sin hacer clic.",
    ],
    exercise:
      "Ejercicio (20 min): con la regla de 5 (remitente, enlace, adjunto, tono, pedido), analizá 3 mensajes viejos y calificá cada punto como OK o sospechoso.",
    summary:
      "Ya detectás correos falsos por estructura, no por intuición. Falta la manipulación más sutil: la ingeniería social.",
    resources: [
      "Checklist de 60 segundos imprimible",
      "Galería: 5 correos falsos diseccionados",
      "Guía: cómo reportar phishing en Gmail/Outlook",
    ],
  },
  ingenieria: {
    introduction:
      "La ingeniería social no ataca tu compu: te ataca a vos con miedo, apuro, simpatía o autoridad. Vas a reconocer sus guiones y a responder sin culpa.",
    explanation:
      "Técnicas típicas: autoridad (soy del banco/soporte), urgencia (se bloquea hoy), premio (ganaste), simpatía (te ayudo, pasame el código) y miedo (hay cargos raros). Por WhatsApp o llamada, te apuran para que no pienses ni verifiques.\n\nTu escudo: cortar, verificar por canal oficial y no entregar nunca códigos ni accesos remotos (AnyDesk, TeamViewer) a desconocidos. Decir necesito verificar y cortar no es grosería: es el protocolo.",
    sections: [
      {
        heading: "Guiones que debes memorizar",
        body: "Pasame el código que te llegó, instalá esta app para ayudarte, transferí para desbloquear, no cuelgues. Cualquiera de esas frases = cortá y verificá.",
      },
      {
        heading: "Cómo responder sin culpa",
        body: "Frase lista: Lo verifico por el canal oficial y te llamo yo. Colgá, buscá el número oficial, llamá vos. Si era real, seguirá ahí.",
      },
      {
        heading: "Proteger a tu familia",
        body: "Acordá una palabra familiar para emergencias, enseñá a no dar códigos y a consultar antes de pagar. Los menores y mayores son el blanco favorito.",
      },
    ],
    keyPoints: [
      "Ningún soporte serio pide tu código ni acceso remoto",
      "La urgencia es la herramienta: frenar es la defensa",
      "Verificá siempre por el canal oficial, nunca por el mismo mensaje",
      "Tené una frase de corte y una palabra familiar",
    ],
    examples: [
      "Caso: a Rosa la llamaron del banco con sus últimos movimientos (dato filtrado) y le pidieron el código. Cortó, llamó al banco y confirmaron que era falso.",
      "Caso: a un abuelo le pidieron instalar AnyDesk para cobrar un reembolso. Era control total de su compu. Regla: jamás acceso remoto a desconocidos.",
      "Práctica: escribí tu frase de corte y tu palabra familiar hoy y compartila en casa.",
    ],
    exercise:
      "Ejercicio (15 min): role-play con alguien: uno intenta apurar (premio/bloqueo) y el otro practica cortar y verificar. Cambien roles.",
    summary:
      "Cerrás el curso sabiendo que la mejor defensa técnica falla si entregás el código. Con claves, 2FA y anti-engaño, tu seguridad queda completa.",
    resources: [
      "Tarjeta: frase de corte para pegar en la heladera",
      "Guía familiar anti-estafas",
      "Checklist: qué hacer si entregaste un código",
    ],
  },
};

function generateActivityInstruction(type: string, lessonTitle: string): string {
  switch(type) {
    case "multiple_choice":
      return `Lee cada pregunta cuidadosamente y selecciona la mejor respuesta relacionada con ${lessonTitle.toLowerCase()}.`;
    case "true_false":
      return `Determina si cada afirmación sobre ${lessonTitle.toLowerCase()} es verdadera o falsa basándote en lo aprendido.`;
    case "case_study":
      return `Analiza el siguiente escenario relacionado con ${lessonTitle.toLowerCase()} y responde las preguntas basándote en los principios aprendidos.`;
    case "checklist":
      return `Revisa la siguiente lista de verificación para ${lessonTitle.toLowerCase()} y marca los elementos que ya implementas.`;
    default:
      return `Completa la actividad sobre ${lessonTitle.toLowerCase()} aplicando los conocimientos adquiridos.`;
  }
}

function generateActivityContent(type: string, lessonTitle: string): unknown {
  const kind = lessonKind(lessonTitle);
  switch (type) {
    case "multiple_choice":
      return { questions: [specificMultipleChoice(kind, lessonTitle)] };
    case "true_false":
      return { statements: specificTrueFalse(kind, lessonTitle) };
    case "case_study":
      return specificCaseStudy(kind, lessonTitle);
    case "checklist":
      return { items: specificChecklist(kind, lessonTitle) };
    default:
      return { description: `Actividad práctica sobre ${lessonTitle}` };
  }
}

function generateActivityFeedback(lessonTitle: string): string {
  const kind = lessonKind(lessonTitle);
  const tips: Record<LessonKind, string> = {
    "que-es": "Ya sabés qué protege la ciberseguridad. Seguí con amenazas para reconocer cada ataque.",
    amenazas: "Ya distinguís las 4 amenazas. El siguiente paso es tu rutina de principios.",
    principios: "Aplicá la rutina de 10 minutos este mes y medí el cambio.",
    passwords: "Cambiá hoy tu clave del email con el método de frase.",
    gestor: "Migrá 3 cuentas esta semana al gestor.",
    "2fa": "Activá el segundo factor en tu email hoy mismo.",
    "phishing-que-es": "Contale a alguien los 3 pasos del phishing: enseñar fija el aprendizaje.",
    "correo-falso": "Practicá la revisión de 60 segundos con 2 emails reales.",
    ingenieria: "Compartí tu frase de corte en casa hoy.",
  };
  return `Bien hecho con ${lessonTitle}. ${tips[kind]} La constancia en estos hábitos es lo que te protege.`;
}

function specificMultipleChoice(kind: LessonKind, lessonTitle: string): {
  question: string;
  options: string[];
  correctAnswer: number;
} {
  switch (kind) {
    case "passwords":
      return {
        question: "¿Cuál es una contraseña realmente segura para tu email?",
        options: ["Marta1985", "123456789", "MiPerro!Come2vecesAlDía", "password1"],
        correctAnswer: 2,
      };
    case "gestor":
      return {
        question: "¿Qué debés memorizar si usás un gestor de contraseñas?",
        options: [
          "Todas las claves de cada sitio",
          "Solo la clave maestra (larga, método de frase)",
          "El código de cada tarjeta",
          "Nada, el gestor no lleva clave",
        ],
        correctAnswer: 1,
      };
    case "2fa":
      return {
        question: "Si te roban la clave pero tenés 2FA con app, ¿qué pasa?",
        options: [
          "Entran igual sin problema",
          "No entran sin el código temporal de tu dispositivo",
          "Solo protege bancos",
          "El 2FA no sirve para nada",
        ],
        correctAnswer: 1,
      };
    case "phishing-que-es":
      return {
        question: "¿Cuál es el objetivo del phishing?",
        options: [
          "Mejorar tu conexión",
          "Que escribas tu clave o entregues tu código en un sitio falso",
          "Actualizar tu sistema",
          "Hacerte un regalo real",
        ],
        correctAnswer: 1,
      };
    case "correo-falso":
      return {
        question: "Recibís un correo de alertas@banco-seguro24.com que pide verificar con urgencia. ¿Qué hacés?",
        options: [
          "Hago clic y verifico ya",
          "Reenvío mi clave por email",
          "No hago clic: entro a la app oficial escribiendo la dirección yo",
          "Descargo el adjunto para ver",
        ],
        correctAnswer: 2,
      };
    case "ingenieria":
      return {
        question: "Te llaman del banco y te piden el código que llegó a tu celular. ¿Respuesta correcta?",
        options: [
          "Se lo paso rápido",
          "Instalo la app que me indican",
          "Corto y verifico por el canal oficial: ningún banco pide ese código",
          "Les doy acceso remoto",
        ],
        correctAnswer: 2,
      };
    case "amenazas":
      return {
        question: "¿Por qué es peligroso reutilizar la misma clave en varios sitios?",
        options: [
          "Porque es difícil de recordar",
          "Porque una filtración en un sitio abre todas tus cuentas",
          "Porque el sistema lo prohíbe",
          "No es peligroso",
        ],
        correctAnswer: 1,
      };
    case "principios":
      return {
        question: "¿Cuál es tu primera cuenta a proteger?",
        options: ["La red social secundaria", "El email (llave de recuperación)", "Un foro viejo", "La app de juegos"],
        correctAnswer: 1,
      };
    default:
      return {
        question: `¿Qué protege la ciberseguridad en tu caso (${lessonTitle})?`,
        options: ["Cuentas, dispositivos y datos", "Solo el wifi", "Solo la compu", "Nada importante"],
        correctAnswer: 0,
      };
  }
}

function specificTrueFalse(
  kind: LessonKind,
  lessonTitle: string
): { statement: string; correctAnswer: boolean }[] {
  switch (kind) {
    case "passwords":
      return [
        { statement: "Una clave de 12+ caracteres única es mucho más segura que Marta1985.", correctAnswer: true },
        { statement: " conviene reutilizar la misma clave en email y banco para no olvidarla.", correctAnswer: false },
      ];
    case "2fa":
      return [
        { statement: "El SMS es mejor segundo factor que una app de códigos.", correctAnswer: false },
        { statement: "Debés guardar los códigos de respaldo en papel, fuera del celular.", correctAnswer: true },
      ];
    case "correo-falso":
      return [
        { statement: "Si un enlace tiene HTTPS, seguro es legítimo.", correctAnswer: false },
        { statement: "Ante un pedido de clave o código por mensaje, hay que verificar en la app oficial.", correctAnswer: true },
      ];
    case "ingenieria":
      return [
        { statement: "Un soporte real puede pedirte acceso remoto sin verificar.", correctAnswer: false },
        { statement: "Cortar y llamar al número oficial es la respuesta correcta ante presión.", correctAnswer: true },
      ];
    default:
      return [
        { statement: `${lessonTitle} solo importa para empresas grandes.`, correctAnswer: false },
        { statement: `Aplicar lo de ${lessonTitle} esta semana mejora tu seguridad real.`, correctAnswer: true },
      ];
  }
}

function specificCaseStudy(kind: LessonKind, lessonTitle: string): {
  scenario: string;
  questions: { question: string; expected: string }[];
} {
  switch (kind) {
    case "correo-falso":
      return {
        scenario:
          "Recibís: De alertas@banco-seguro24.com, Asunto: Cuenta bloqueada en 24h, botón Verificar ahora y adjunto factura.zip que no esperabas.",
        questions: [
          { question: "¿Qué 3 señales ves?", expected: "Dominio falso con guion, urgencia y adjunto no esperado." },
          { question: "¿Qué hacés?", expected: "No hacer clic, verificar en la app oficial y reportar como phishing." },
        ],
      };
    case "ingenieria":
      return {
        scenario:
          "Te llama un supuesto soporte: hay cargos raros, no cuelgues, pasame el código que te llegó e instalá esta app de ayuda.",
        questions: [
          { question: "¿Qué técnica usan?", expected: "Autoridad + urgencia + pedido de código y acceso remoto." },
          { question: "¿Respuesta?", expected: "Cortar, llamar al número oficial y no dar códigos ni accesos." },
        ],
      };
    case "passwords":
      return {
        scenario: "Usás Juan2024 en email, Instagram y banco porque es fácil de recordar.",
        questions: [
          { question: "¿Cuál es el riesgo?", expected: "Una filtración abre las tres cuentas." },
          { question: "¿Cómo lo arreglás?", expected: "Frase larga única por cuenta, empezando por el email, más gestor." },
        ],
      };
    default:
      return {
        scenario: `Situación real sobre ${lessonTitle}: detectá el riesgo y proponé la acción segura.`,
        questions: [
          { question: "¿Dónde está el riesgo?", expected: "Describir la señal concreta." },
          { question: "¿Qué acción segura aplicás?", expected: "Describir el hábito aprendido." },
        ],
      };
  }
}

function specificChecklist(kind: LessonKind, lessonTitle: string): string[] {
  switch (kind) {
    case "passwords":
      return [
        "Creé mi frase de 12+ caracteres sin datos personales",
        "La clave del email ya es única",
        "Anoté solo la regla de variación, no la clave",
        "Identifiqué mis 3 claves repetidas a cambiar",
      ];
    case "gestor":
      return [
        "Instalé el gestor en celular y compu",
        "Creé la clave maestra y guardé el respaldo",
        "Activé 2FA del gestor",
        "Migré email, banco y red principal",
      ];
    case "2fa":
      return [
        "Activé 2FA con app en mi email",
        "Guardé los códigos de respaldo en papel",
        "Probé salir y entrar con el código",
        "Agendé activar banco y redes",
      ];
    case "correo-falso":
      return [
        "Puedo verificar el dominio exacto",
        "Inspecciono enlaces sin hacer clic",
        "Detecto urgencia + pedido de clave",
        "Verifico en la app oficial",
      ];
    case "ingenieria":
      return [
        "Tengo mi frase de corte lista",
        "Acordé palabra familiar en casa",
        "Nunca doy códigos ni acceso remoto",
        "Verifico por canal oficial",
      ];
    default:
      return [
        `Entendí los conceptos de ${lessonTitle}`,
        "Puedo explicarlo con mis palabras",
        "Identifiqué cómo aplicarlo esta semana",
        "Sé dónde verificar si dudo",
      ];
  }
}

function buildSpecificLessonContent(title: string): LessonContent {
  const bank = LESSON_BANK[lessonKind(title)];
  return {
    introduction: bank.introduction,
    explanation: bank.explanation,
    keyPoints: bank.keyPoints,
    examples: bank.examples,
    summary: bank.summary,
    resources: bank.resources,
    sections: bank.sections,
    exercise: bank.exercise,
  };
}

function buildModuleQuizQuestions(
  moduleTitle: string,
  lessonTitles: string[]
): GeneratedQuiz["questions"] {
  const t = moduleTitle.toLowerCase();
  const slug = slugify(moduleTitle);
  const q = (
    id: string,
    type: "multiple_choice" | "true_false",
    question: string,
    explanation: string,
    extra: { options?: string[]; correctAnswer: string | number }
  ): GeneratedQuiz["questions"][number] => ({
    id: `${slug}-${id}`,
    type,
    question,
    explanation,
    points: 20,
    ...extra,
  });

  if (t.includes("fundamento")) {
    return [
      q("1", "multiple_choice", "¿Qué protege la ciberseguridad?", "Protege cuentas, dispositivos y datos del acceso no autorizado.", {
        options: ["Cuentas, dispositivos y datos", "Solo el wifi", "Solo juegos", "Nada"],
        correctAnswer: 0,
      }),
      q("2", "multiple_choice", "¿Por qué atacan a personas comunes?", "Porque los descuidos masivos son más fáciles de explotar.", {
        options: ["Porque son ricas", "Porque los descuidos son fáciles de explotar", "Por fama", "Por azar sin motivo"],
        correctAnswer: 1,
      }),
      q("3", "true_false", "La mayoría de los ataques aprovecha descuidos humanos.", "La ingeniería social y claves débiles son la puerta más común.", { correctAnswer: "true" }),
      q("4", "multiple_choice", "¿Cuál es tu llave maestra?", "El email permite recuperar casi todo lo demás.", {
        options: ["El foro", "El email", "El juego", "Ninguna"],
        correctAnswer: 1,
      }),
      q("5", "true_false", "Con 5 hábitos básicos ya bajás la mayoría del riesgo.", "Claves únicas, 2FA, desconfiar, actualizar y respaldo cubren lo principal.", { correctAnswer: "true" }),
    ];
  }

  if (t.includes("contrase")) {
    return [
      q("1", "multiple_choice", "¿Cuál es una clave segura?", "Larga, única y sin datos personales.", {
        options: ["Marta1985", "123456", "MiPerro!Come2vecesAlDía", "password"],
        correctAnswer: 2,
      }),
      q("2", "true_false", "Conviene reutilizar la misma clave para no olvidarla.", "Reutilizar convierte una filtración en robo total.", { correctAnswer: "false" }),
      q("3", "multiple_choice", "¿Qué memorizás con un gestor?", "Solo la maestra; el resto lo genera y guarda el gestor.", {
        options: ["Todas", "Solo la maestra", "Ninguna", "Las de otros"],
        correctAnswer: 1,
      }),
      q("4", "multiple_choice", "¿Qué segundo factor preferís?", "La app genera códigos en tu dispositivo, más segura que SMS.", {
        options: ["SMS", "App de códigos", "Ninguno", "Email sin 2FA"],
        correctAnswer: 1,
      }),
      q("5", "true_false", "Los códigos de respaldo se guardan en papel fuera del celular.", "Si perdés el celular, son tu entrada.", { correctAnswer: "true" }),
    ];
  }

  // Módulo phishing / ingeniería social
  return [
    q("1", "multiple_choice", "¿Qué es el phishing?", "Mensaje falso que busca tu clave o código.", {
      options: ["Una actualización", "Un mensaje falso que roba claves o códigos", "Un premio real", "Soporte oficial"],
      correctAnswer: 1,
    }),
    q("2", "multiple_choice", `En ${lessonTitles[1] ?? "un correo falso"}, ¿qué revisás primero?`, "El dominio exacto del remitente delata lo falso.", {
      options: ["El color", "El dominio exacto del remitente", "La hora", "El tamaño"],
      correctAnswer: 1,
    }),
    q("3", "true_false", "Si tiene HTTPS, el sitio es legítimo.", "Los falsos también usan HTTPS.", { correctAnswer: "false" }),
    q("4", "multiple_choice", "Te piden el código por llamada. ¿Qué hacés?", "Ningún banco pide ese código; se corta y verifica.", {
      options: ["Lo paso", "Doy acceso remoto", "Corto y verifico por canal oficial", "Pago lo que pidan"],
      correctAnswer: 2,
    }),
    q("5", "true_false", "La urgencia es una herramienta típica del estafador.", "Frenar y verificar neutraliza el ataque.", { correctAnswer: "true" }),
  ];
}

function validateCourseDeterministic(
  context: GenerationContext,
  course: { blueprint: CourseBlueprint; modules: GeneratedModule[]; exam: GeneratedExam }
): QualityValidation {
  const issues: QualityValidation["issues"] = [];
  const recommendations: string[] = [];

  const idea = (context.originalIdea || "").toLowerCase();
  const ideaWords = idea.split(/[^a-záéíóúñü0-9]+/i).filter((w) => w.length > 3);
  const topic = (context.productSpecification.topic || "").toLowerCase();

  // Completitud: todo obligatorio existe
  const totalLessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const lessonsWithContent = course.modules.reduce(
    (n, m) =>
      n +
      m.lessons.filter(
        (l) =>
          l.title.trim().length > 0 &&
          (l.content.introduction || "").trim().length >= 20 &&
          (l.content.explanation || "").trim().length >= 100 &&
          l.content.keyPoints.length >= 3 &&
          l.content.examples.length >= 2 &&
          (l.content.summary || "").trim().length >= 20
      ).length,
    0
  );
  const lessonsWithActivity = course.modules.reduce(
    (n, m) => n + m.lessons.filter((l) => !!l.activity).length,
    0
  );
  const lessonsWithQuiz = course.modules.reduce(
    (n, m) => n + m.lessons.filter((l) => !!l.quiz).length,
    0
  );
  const examOk =
    Array.isArray(course.exam.questions) &&
    course.exam.questions.length >= 5 &&
    course.exam.questions.every(
      (q) => q.question.trim().length > 0 && q.explanation.trim().length > 0
    );

  const completenessScore = Math.round(
    (lessonsWithContent / Math.max(1, totalLessons)) * 50 +
      (lessonsWithActivity / Math.max(1, totalLessons)) * 20 +
      (lessonsWithQuiz / Math.max(1, totalLessons)) * 15 +
      (examOk ? 15 : 0)
  );

  if (lessonsWithContent < totalLessons) {
    issues.push({
      type: "completeness",
      severity: "high",
      description: `Faltan contenidos completos en ${totalLessons - lessonsWithContent} lecciones`,
      suggestion: "Regenerar las lecciones incompletas antes de publicar",
    });
  }
  if (lessonsWithActivity < totalLessons) {
    issues.push({
      type: "completeness",
      severity: "medium",
      description: `Faltan actividades en ${totalLessons - lessonsWithActivity} lecciones`,
      suggestion: "Adjuntar la actividad generada a cada lección",
    });
  }
  if (!examOk) {
    issues.push({
      type: "completeness",
      severity: "high",
      description: "El examen final está incompleto o sin explicaciones",
      suggestion: "Generar el examen con preguntas, opciones y explicaciones",
    });
  }

  // Relevancia: el contenido habla del tema pedido (sin random).
  // Se ignoran palabras vacías de la frase ("quiero", "crear", "curso", ...) y
  // se compara por raíz para tolerar singular/plural ("principiante/s").
  const haystack = (
    course.modules.map((m) => `${m.title} ${m.description}`).join(" ") +
    " " +
    course.modules.flatMap((m) => m.lessons.map((l) => `${l.title} ${l.content.explanation}`)).join(" ")
  ).toLowerCase();
  const STOPWORDS = new Set([
    "quiero", "quieres", "crear", "crea", "hacer", "tener", "curso", "cursos",
    "completo", "completa", "completos", "sobre", "para", "como", "esta",
    "este", "esto", "esta", "unos", "unas", "mucho", "desde", "donde",
  ]);
  const splitWords = (text: string): string[] =>
    text
      .toLowerCase()
      .split(/[^a-záéíóúñü0-9]+/i)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
  const stemHit = (word: string): boolean => {
    if (haystack.includes(word)) return true;
    // Raíz de 6 letras para tolerar plural/género
    if (word.length > 6 && haystack.includes(word.slice(0, 6))) return true;
    return false;
  };
  const coverageOf = (words: string[]): number => {
    const uniq = [...new Set(words)];
    if (uniq.length === 0) return 1;
    return uniq.filter(stemHit).length / uniq.length;
  };
  const topicCoverage = coverageOf(splitWords(topic));
  const subCoverage = coverageOf(
    (context.productSpecification.subtopics ?? []).flatMap(splitWords)
  );
  const ideaCoverage = coverageOf(ideaWords.filter((w) => !STOPWORDS.has(w)));
  const relevanceScore = Math.round(topicCoverage * 50 + subCoverage * 30 + ideaCoverage * 20);
  if (relevanceScore < 60) {
    issues.push({
      type: "relevance",
      severity: "high",
      description: "El contenido no refleja claramente la idea original",
      suggestion: "Regenerar con la idea original como contexto",
    });
  }

  // Calidad: longitud mínima, estructura y sin placeholders
  const placeholders = ["lorem", "ejemplo 1: caso de uso básico", "texto de prueba", "contenido pendiente"];
  const hasPlaceholders = placeholders.some((p) => haystack.includes(p));
  const avgExplanation =
    course.modules.reduce(
      (n, m) => n + m.lessons.reduce((x, l) => x + (l.content.explanation || "").length, 0),
      0
    ) / Math.max(1, totalLessons);
  let qualityScore = 100;
  if (avgExplanation < 300) qualityScore -= 30;
  else if (avgExplanation < 600) qualityScore -= 10;
  if (hasPlaceholders) qualityScore -= 40;
  if (lessonsWithActivity === 0 || lessonsWithQuiz === 0) qualityScore -= 15;
  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));
  if (hasPlaceholders) {
    issues.push({
      type: "quality",
      severity: "high",
      description: "Se detectaron placeholders genéricos en el contenido",
      suggestion: "Reemplazar por contenido específico del tema",
    });
    recommendations.push("Eliminar textos de relleno y usar ejemplos reales del tema");
  }

  // Coherencia: módulos y lecciones ordenados y con títulos únicos no vacíos
  let coherenceScore = 100;
  course.modules.forEach((m, i) => {
    if (m.order !== i + 1) coherenceScore -= 5;
    if (!m.title.trim()) coherenceScore -= 15;
    m.lessons.forEach((l, j) => {
      if (l.order !== j + 1) coherenceScore -= 2;
      if (!l.title.trim()) coherenceScore -= 5;
    });
  });
  const titles = course.modules.flatMap((m) => m.lessons.map((l) => l.title.trim().toLowerCase()));
  if (new Set(titles).size < titles.length) {
    coherenceScore -= 10;
    issues.push({
      type: "coherence",
      severity: "low",
      description: "Hay títulos de lecciones duplicados",
      suggestion: "Diferenciar cada lección por su subtema",
    });
  }
  coherenceScore = Math.max(0, Math.min(100, coherenceScore));

  const overallScore = Math.round(
    (relevanceScore + completenessScore + qualityScore + coherenceScore) / 4
  );
  const passed =
    overallScore >= 70 &&
    lessonsWithContent === totalLessons &&
    examOk &&
    !hasPlaceholders &&
    relevanceScore >= 60;

  if (recommendations.length === 0) {
    recommendations.push(
      "Verificar que cada actividad tenga feedback claro",
      "Sumar un ejemplo real por lección en la próxima iteración",
      "Revisar que el examen cubra los 3 módulos"
    );
  }

  return {
    relevanceScore,
    completenessScore,
    qualityScore,
    coherenceScore,
    overallScore,
    passed,
    issues,
    recommendations,
  };
}

// ============================================
// WEB INTERACTIVA - CONTENIDO MOCK ESPECÍFICO
// ============================================

function webCompId(sectionId: string, order: number): string {
  return `webcomp-${slugify(sectionId)}-${order}`;
}

function brandingForTopic(topic: string): InteractiveWebBranding {
  // Determinístico por tema (sin random): cada idea obtiene acentos distintos.
  let hash = 0;
  for (const ch of topic) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return {
    primaryColor: `hsl(${hash}, 65%, 45%)`,
    secondaryColor: `hsl(${(hash + 140) % 360}, 55%, 35%)`,
    backgroundColor: "#0b0b10",
    surfaceColor: "#14141c",
    textColor: "#f4f2ec",
    mutedColor: "#a1a1aa",
    borderRadius: 14,
    fontFamily: '"Inter", system-ui, sans-serif',
    themeName: `topic-${hash}`,
  };
}

type SectionBuilder = (
  sectionId: string,
  types: WebComponentType[]
) => InteractiveWebComponent[];

function emitOrdered(
  sectionId: string,
  types: WebComponentType[],
  builders: Record<string, (order: number) => InteractiveWebComponent>
): InteractiveWebComponent[] {
  return types.map((t, i) => builders[t](i + 1));
}

const ENGLISH_SECTIONS: Record<string, SectionBuilder> = {
  start: (sid, types) =>
    emitOrdered(sid, types, {
      hero: (o) => ({
        id: webCompId(sid, o), type: "hero", order: o,
        title: "Inglés desde Cero",
        subtitle: "Aprende saludos, números, colores y frases útiles con práctica real en cada sección. 15 minutos al día.",
        ctaLabel: "Empezar con saludos",
        ctaTargetSectionId: "greetings",
      }),
      richText: (o) => ({
        id: webCompId(sid, o), type: "richText", order: o,
        heading: "Cómo usar esta web",
        paragraphs: [
          "Cada sección enseña una cosa y te hace practicarla: tarjetas para memorizar, quizzes con explicación y un juego para unir palabras.",
          "Orden recomendado: saludos, números, colores y frases. Al final, la sección Tu progreso te muestra cuánto completaste.",
          "No necesitas saber nada antes. Si entiendes este texto, puedes empezar.",
        ],
      }),
      checklist: (o) => ({
        id: webCompId(sid, o), type: "checklist", order: o,
        title: "Tu plan de inicio",
        items: [
          "Reservé 15 minutos al día para practicar",
          "Voy a completar las secciones en orden",
          "Voy a repetir en voz alta cada palabra nueva",
        ],
      }),
    }),
  greetings: (sid, types) =>
    emitOrdered(sid, types, {
      richText: (o) => ({
        id: webCompId(sid, o), type: "richText", order: o,
        heading: "Saludar en inglés",
        paragraphs: [
          "Hello sirve para todo. Hi es informal, entre amigos. Good morning se usa hasta el mediodía, Good afternoon después, y Good evening al llegar a un lugar de noche. Good night solo se usa para despedirse.",
          "Para presentarte: My name is... (Me llamo...) y I am from... (Soy de...). Para despedirte: Goodbye o Bye, y See you tomorrow (Nos vemos mañana).",
        ],
      }),
      flashcards: (o) => ({
        id: webCompId(sid, o), type: "flashcards", order: o,
        title: "Memoriza los saludos",
        cards: [
          { front: "Hello", back: "Hola", hint: "Se pronuncia jelóu" },
          { front: "Good morning", back: "Buenos días", hint: "Se pronuncia gud mórning" },
          { front: "Good evening", back: "Buenas noches (al llegar)", hint: "Se pronuncia gud ívning" },
          { front: "My name is Ana", back: "Me llamo Ana", hint: "Se pronuncia mai néim is" },
          { front: "How are you?", back: "¿Cómo estás?", hint: "Se pronuncia jáu ar iu" },
          { front: "Goodbye / Bye", back: "Adiós / Chau", hint: "Se pronuncia gudbái / bai" },
        ],
      }),
      quiz: (o) => ({
        id: webCompId(sid, o), type: "quiz", order: o,
        title: "Quiz: saludos",
        passingScore: 70,
        questions: [
          { id: `${sid}-q1`, question: "¿Cómo saludas a tu jefe a las 9 de la mañana?", options: ["Good night", "Good morning", "Bye", "See you"], correctAnswer: 1, explanation: "Good morning se usa hasta el mediodía en contextos formales." },
          { id: `${sid}-q2`, question: "¿Qué significa How are you?", options: ["¿Cómo te llamas?", "¿De dónde eres?", "¿Cómo estás?", "¿Cuántos años tienes?"], correctAnswer: 2, explanation: "How are you? pregunta cómo estás. Se responde I'm fine, thanks." },
          { id: `${sid}-q3`, question: "Te vas a dormir y te despides de tu familia. ¿Qué dices?", options: ["Good evening", "Good morning", "Good night", "Hello"], correctAnswer: 2, explanation: "Good night es despedida nocturna. Good evening es saludo al llegar." },
          { id: `${sid}-q4`, question: "¿Cómo dices Me llamo Pedro?", options: ["I am Pedro from", "My name is Pedro", "Pedro is name", "Name my is Pedro"], correctAnswer: 1, explanation: "La estructura es My name is + nombre." },
        ],
      }),
    }),
  numbers: (sid, types) =>
    emitOrdered(sid, types, {
      cards: (o) => ({
        id: webCompId(sid, o), type: "cards", order: o,
        heading: "Números del 0 al 20",
        cards: [
          { title: "0–5", body: "Zero, one, two, three, four, five. El truco: three suena con la lengua entre los dientes." },
          { title: "6–10", body: "Six, seven, eight, nine, ten. Practica tu número de teléfono dígito por dígito." },
          { title: "11–15", body: "Eleven, twelve, thirteen, fourteen, fifteen. Del 13 al 15 terminan en -teen (tiiin)." },
          { title: "16–20", body: "Sixteen, seventeen, eighteen, nineteen, twenty. Twenty no sigue la regla: memorizalo aparte." },
        ],
      }),
      vocabMatch: (o) => ({
        id: webCompId(sid, o), type: "vocabMatch", order: o,
        title: "Une cada número con su inglés",
        instruction: "Toca una tarjeta en español y luego su pareja en inglés.",
        pairs: [
          { left: "tres", right: "three" },
          { left: "siete", right: "seven" },
          { left: "once", right: "eleven" },
          { left: "quince", right: "fifteen" },
          { left: "dieciocho", right: "eighteen" },
          { left: "veinte", right: "twenty" },
        ],
      }),
      quiz: (o) => ({
        id: webCompId(sid, o), type: "quiz", order: o,
        title: "Quiz: números",
        passingScore: 70,
        questions: [
          { id: `${sid}-q1`, question: "¿Cómo se dice 3 en inglés?", options: ["Tree", "Three", "Free", "Tee"], correctAnswer: 1, explanation: "Three, con th suave." },
          { id: `${sid}-q2`, question: "¿Qué número es twelve?", options: ["10", "11", "12", "20"], correctAnswer: 2, explanation: "Eleven es 11, twelve es 12." },
          { id: `${sid}-q3`, question: "¿Cómo se dice 20?", options: ["Twoty", "Twenty", "Twelve", "Twin"], correctAnswer: 1, explanation: "Twenty es irregular: hay que memorizarlo." },
          { id: `${sid}-q4`, question: "¿Qué terminación tienen 13, 14 y 15?", options: ["-ty", "-teen", "-ten", "-th"], correctAnswer: 1, explanation: "Trece a diecinueve terminan en -teen." },
        ],
      }),
    }),
  colors: (sid, types) =>
    emitOrdered(sid, types, {
      tabs: (o) => ({
        id: webCompId(sid, o), type: "tabs", order: o,
        heading: "Colores y aula",
        tabs: [
          { label: "Colores", body: "Red (rojo), blue (azul), green (verde), yellow (amarillo), black (negro), white (blanco). Frase útil: My favorite color is blue (Mi color favorito es el azul)." },
          { label: "En el aula", body: "Book (libro), pen (lapicera), table (mesa), chair (silla), door (puerta), window (ventana). Frase útil: This is a book (Esto es un libro)." },
        ],
      }),
      flashcards: (o) => ({
        id: webCompId(sid, o), type: "flashcards", order: o,
        title: "Memoriza colores y objetos",
        cards: [
          { front: "Red", back: "Rojo", hint: "Se pronuncia red" },
          { front: "Blue", back: "Azul", hint: "Se pronuncia blu" },
          { front: "Green", back: "Verde", hint: "Se pronuncia grin" },
          { front: "Book", back: "Libro", hint: "Se pronuncia buk" },
          { front: "Chair", back: "Silla", hint: "Se pronuncia cher" },
          { front: "Window", back: "Ventana", hint: "Se pronuncia uíndou" },
        ],
      }),
      quiz: (o) => ({
        id: webCompId(sid, o), type: "quiz", order: o,
        title: "Quiz: colores y objetos",
        passingScore: 70,
        questions: [
          { id: `${sid}-q1`, question: "¿Cómo se dice azul?", options: ["Blow", "Blue", "Blew", "Bool"], correctAnswer: 1, explanation: "Blue, suena como blu." },
          { id: `${sid}-q2`, question: "¿Qué significa chair?", options: ["Mesa", "Puerta", "Silla", "Libro"], correctAnswer: 2, explanation: "Chair es silla. Table es mesa." },
          { id: `${sid}-q3`, question: "Completa: My favorite color ___ green.", options: ["are", "is", "am", "be"], correctAnswer: 1, explanation: "Color es singular: se usa is." },
        ],
      }),
    }),
  phrases: (sid, types) =>
    emitOrdered(sid, types, {
      accordion: (o) => ({
        id: webCompId(sid, o), type: "accordion", order: o,
        heading: "Frases por situación",
        items: [
          { title: "Al saludar", body: "Hello! My name is... / Nice to meet you (Mucho gusto). Responde igual: Nice to meet you too." },
          { title: "Al pedir ayuda", body: "Can you help me, please? (¿Puedes ayudarme, por favor?) y I don't understand (No entiendo)." },
          { title: "Al agradecer", body: "Thank you (Gracias) y You're welcome (De nada). Thank you very much para enfatizar." },
          { title: "Al despedirte", body: "Goodbye! / See you tomorrow! (¡Nos vemos mañana!) y Have a nice day! (¡Que tengas un buen día!)." },
        ],
      }),
      quiz: (o) => ({
        id: webCompId(sid, o), type: "quiz", order: o,
        title: "Quiz: frases útiles",
        passingScore: 70,
        questions: [
          { id: `${sid}-q1`, question: "No entiendes algo. ¿Qué dices?", options: ["Nice to meet you", "I don't understand", "See you tomorrow", "Good evening"], correctAnswer: 1, explanation: "I don't understand significa no entiendo." },
          { id: `${sid}-q2`, question: "¿Cómo respondes a Thank you?", options: ["Hello", "You're welcome", "Good night", "My name is"], correctAnswer: 1, explanation: "You're welcome es de nada." },
          { id: `${sid}-q3`, question: "Necesitas ayuda en la calle. ¿Qué frase usas?", options: ["Can you help me, please?", "Have a nice day", "How are you?", "Good morning"], correctAnswer: 0, explanation: "Can you help me, please? pide ayuda con cortesía." },
          { id: `${sid}-q4`, question: "¿Qué significa Nice to meet you?", options: ["Buenas noches", "Mucho gusto", "Hasta mañana", "Gracias"], correctAnswer: 1, explanation: "Se usa al conocer a alguien." },
        ],
      }),
    }),
  progress: (sid, types) =>
    emitOrdered(sid, types, {
      progress: (o) => ({ id: webCompId(sid, o), type: "progress", order: o, title: "Tu avance en Inglés desde Cero" }),
      checklist: (o) => ({
        id: webCompId(sid, o), type: "checklist", order: o,
        title: "Mis logros",
        items: [
          "Puedo saludar y presentarme en inglés",
          "Cuento del 0 al 20 sin dudar",
          "Nombro 6 colores y 4 objetos",
          "Uso 4 frases en situaciones reales",
        ],
      }),
      cta: (o) => ({
        id: webCompId(sid, o), type: "cta", order: o,
        title: "Sigue practicando",
        body: "Repite en voz alta las tarjetas que más te costaron y vuelve mañana por 15 minutos.",
        buttonLabel: "Volver al inicio",
        targetSectionId: "start",
      }),
    }),
};

function fallbackSectionContent(topic: string, sectionId: string): SectionBuilder {
  return (sid, types) =>
    emitOrdered(sid, types, {
      hero: (o) => ({
        id: webCompId(sid, o), type: "hero", order: o,
        title: topic,
        subtitle: `Explora ${topic} paso a paso con contenido y práctica en cada sección.`,
        ctaLabel: "Empezar",
        ctaTargetSectionId: "esencial",
      }),
      richText: (o) => ({
        id: webCompId(sid, o), type: "richText", order: o,
        heading: `Sobre ${topic}`,
        paragraphs: [
          `Esta sección de ${topic} explica los puntos esenciales con ejemplos concretos.`,
          `Avanza en orden y completa la práctica antes de pasar a la siguiente sección.`,
        ],
      }),
      cards: (o) => ({
        id: webCompId(sid, o), type: "cards", order: o,
        heading: `Claves de ${topic}`,
        cards: [
          { title: "Concepto 1", body: `La base de ${topic} explicada con un ejemplo concreto.` },
          { title: "Concepto 2", body: `Cómo se aplica ${topic} en un caso real.` },
          { title: "Errores comunes", body: `Los tres errores más frecuentes en ${topic} y cómo evitarlos.` },
        ],
      }),
      quiz: (o) => ({
        id: webCompId(sid, o), type: "quiz", order: o,
        title: `Quiz: ${topic}`,
        passingScore: 70,
        questions: [
          { id: `${sid}-q1`, question: `¿Cuál es la idea central de ${topic}?`, options: ["Aplicar sus conceptos clave", "Evitar el tema", "Memorizar sin practicar", "Saltarse la práctica"], correctAnswer: 0, explanation: `Comprender y aplicar los conceptos de ${topic}.` },
          { id: `${sid}-q2`, question: "¿Cuál es la mejor forma de avanzar?", options: ["En orden y practicando", "Solo leyendo títulos", "Empezando por el final", "Sin practicar"], correctAnswer: 0, explanation: "El orden y la práctica fijan el aprendizaje." },
        ],
      }),
      checklist: (o) => ({
        id: webCompId(sid, o), type: "checklist", order: o,
        title: `Plan de ${topic}`,
        items: [`Leí el contenido de ${topic}`, `Completé la práctica de ${topic}`, "Anoté mis dudas para repasar"],
      }),
      progress: (o) => ({ id: webCompId(sid, o), type: "progress", order: o, title: "Tu avance" }),
      cta: (o) => ({
        id: webCompId(sid, o), type: "cta", order: o,
        title: "Sigue avanzando",
        body: `Repite la práctica de ${topic} y continúa con la siguiente sección.`,
        buttonLabel: "Volver al inicio",
        targetSectionId: "intro",
      }),
    });
}

// ============================================
// VALIDACIÓN WEB DETERMINÍSTICA (sin random)
// ============================================

const WEB_PLACEHOLDERS = [
  "lorem",
  "contenido generado aquí",
  "texto de ejemplo",
  "título de ejemplo",
  "titulo de ejemplo",
  "ejemplo de contenido",
  "contenido pendiente",
];

function webTextOf(c: InteractiveWebComponent): string {
  switch (c.type) {
    case "hero": return `${c.title} ${c.subtitle} ${c.ctaLabel}`;
    case "richText": return `${c.heading} ${c.paragraphs.join(" ")}`;
    case "image": return `${c.alt} ${c.caption}`;
    case "cards": return `${c.heading} ${c.cards.map((x) => `${x.title} ${x.body}`).join(" ")}`;
    case "accordion": return `${c.heading} ${c.items.map((x) => `${x.title} ${x.body}`).join(" ")}`;
    case "tabs": return `${c.heading} ${c.tabs.map((x) => `${x.label} ${x.body}`).join(" ")}`;
    case "quiz": return `${c.title} ${c.questions.map((q) => `${q.question} ${q.options.join(" ")} ${q.explanation}`).join(" ")}`;
    case "flashcards": return `${c.title} ${c.cards.map((x) => `${x.front} ${x.back} ${x.hint}`).join(" ")}`;
    case "checklist": return `${c.title} ${c.items.join(" ")}`;
    case "progress": return c.title;
    case "cta": return `${c.title} ${c.body} ${c.buttonLabel}`;
    case "vocabMatch": return `${c.title} ${c.instruction} ${c.pairs.map((p) => `${p.left} ${p.right}`).join(" ")}`;
  }
}

function validateWebDeterministic(
  context: WebGenerationContext,
  product: { blueprint: InteractiveWebBlueprint; sections: InteractiveWebSection[] }
): WebQualityValidation {
  const issues: WebQualityValidation["issues"] = [];
  const recommendations: string[] = [];
  const sections = product.sections;
  const ids = new Set(sections.map((s) => s.id));

  // Estructura
  let structureScore = 100;
  if (!product.blueprint.title.trim()) {
    structureScore -= 30;
    issues.push({ type: "structure", severity: "high", description: "La web no tiene título", suggestion: "Generar el título desde la idea original" });
  }
  if (sections.length < 3) {
    structureScore -= 30;
    issues.push({ type: "structure", severity: "high", description: `Solo hay ${sections.length} secciones (mínimo 3)`, suggestion: "Generar todas las secciones del blueprint" });
  }
  sections.forEach((s, i) => {
    if (s.order !== i + 1) structureScore -= 3;
    if (!s.title.trim()) structureScore -= 10;
    if (s.components.length < 2) {
      structureScore -= 10;
      issues.push({ type: "structure", severity: "medium", description: `La sección "${s.title}" tiene menos de 2 componentes`, suggestion: "Completar los componentes del blueprint" });
    }
  });
  const dupIds = sections.length - ids.size;
  if (dupIds > 0) structureScore -= 10;
  structureScore = Math.max(0, Math.min(100, structureScore));

  // Contenido: sin placeholders, textos con longitud mínima
  const haystack = sections
    .flatMap((s) => s.components.map(webTextOf))
    .join(" ")
    .toLowerCase();
  const foundPlaceholder = WEB_PLACEHOLDERS.find((p) => haystack.includes(p));
  let contentScore = 100;
  if (foundPlaceholder) {
    contentScore -= 50;
    issues.push({ type: "content", severity: "high", description: `Contenido placeholder detectado ("${foundPlaceholder}")`, suggestion: "Reemplazar por contenido real del tema" });
  }
  // El widget progress no es contenido editorial: se excluye del mínimo.
  const shortTexts = sections.flatMap((s) =>
    s.components.filter((c) => c.type !== "progress" && webTextOf(c).trim().length < 40)
  );
  if (shortTexts.length > 0) {
    contentScore -= shortTexts.length * 5;
    issues.push({ type: "content", severity: "medium", description: `${shortTexts.length} componente(s) con texto demasiado corto`, suggestion: "Desarrollar el contenido de cada componente" });
  }
  contentScore = Math.max(0, Math.min(100, contentScore));

  // Interacción: cada componente interactivo declara su funcionalidad completa
  let interactionScore = 100;
  let interactiveCount = 0;
  const fail = (description: string, suggestion: string, penalty: number, severity: WebQualityValidation["issues"][number]["severity"] = "high"): void => {
    interactionScore -= penalty;
    issues.push({ type: "interaction", severity, description, suggestion });
  };
  for (const s of sections) {
    for (const c of s.components) {
      switch (c.type) {
        case "quiz": {
          interactiveCount++;
          if (c.questions.length < 2) fail(`Quiz "${c.title}" con menos de 2 preguntas`, "Agregar preguntas con opciones y explicación", 20);
          c.questions.forEach((q) => {
            if (q.options.length < 2 || q.correctAnswer < 0 || q.correctAnswer >= q.options.length)
              fail(`Pregunta sin opciones válidas: "${q.question}"`, "Definir opciones y respuesta correcta", 10);
            if (!q.explanation.trim()) fail(`Pregunta sin explicación: "${q.question}"`, "Explicar la respuesta correcta", 5, "medium");
          });
          break;
        }
        case "flashcards": {
          interactiveCount++;
          if (c.cards.length < 3) fail(`Flashcards "${c.title}" con menos de 3 tarjetas`, "Agregar tarjetas frente/dorso", 15);
          break;
        }
        case "tabs": {
          interactiveCount++;
          if (c.tabs.length < 2) fail(`Tabs "${c.heading}" con menos de 2 pestañas`, "Agregar pestañas con contenido", 15);
          break;
        }
        case "accordion": {
          interactiveCount++;
          if (c.items.length < 2) fail(`Acordeón "${c.heading}" con menos de 2 ítems`, "Agregar ítems desplegables", 15);
          break;
        }
        case "vocabMatch": {
          interactiveCount++;
          if (c.pairs.length < 3) fail(`Juego "${c.title}" con menos de 3 parejas`, "Agregar parejas para unir", 15);
          break;
        }
        case "checklist": {
          interactiveCount++;
          if (c.items.length < 2) fail(`Checklist "${c.title}" con menos de 2 ítems`, "Agregar ítems marcables", 10);
          break;
        }
        case "hero": {
          if (!ids.has(c.ctaTargetSectionId)) fail(`Hero con destino inexistente "${c.ctaTargetSectionId}"`, "Apuntar a una sección existente", 15);
          break;
        }
        case "cta": {
          if (!ids.has(c.targetSectionId)) fail(`CTA con destino inexistente "${c.targetSectionId}"`, "Apuntar a una sección existente", 15);
          break;
        }
        case "image": {
          if (!c.src.trim()) fail(`Imagen sin URL real ("${c.alt}")`, "Definir una URL real o eliminar el componente", 15);
          break;
        }
      }
    }
  }
  if (interactiveCount === 0) {
    fail("La web no tiene componentes interactivos", "Incluir quiz, flashcards, tabs o checklist", 40);
  }
  interactionScore = Math.max(0, Math.min(100, interactionScore));

  // Diseño
  let designScore = 100;
  const hex = /^#([0-9a-f]{6})$/i;
  const hsl = /^hsl\(\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\)$/i;
  const colorOk = (v: string): boolean => hex.test(v) || hsl.test(v);
  const b = product.blueprint.branding;
  if (![b.primaryColor, b.secondaryColor, b.backgroundColor, b.surfaceColor, b.textColor, b.mutedColor].every(colorOk)) {
    designScore -= 25;
    issues.push({ type: "design", severity: "medium", description: "Colores de branding inválidos", suggestion: "Usar colores hex o hsl válidos" });
  }
  if (b.borderRadius < 0 || b.borderRadius > 32 || !b.fontFamily.trim()) {
    designScore -= 15;
    issues.push({ type: "design", severity: "low", description: "Branding incompleto (radio o tipografía)", suggestion: "Definir radio y familia tipográfica" });
  }
  designScore = Math.max(0, Math.min(100, designScore));

  const overallScore = Math.round((structureScore + contentScore + interactionScore + designScore) / 4);
  const passed =
    overallScore >= 70 &&
    issues.filter((i) => i.severity === "high").length === 0 &&
    !foundPlaceholder &&
    interactiveCount > 0;

  if (recommendations.length === 0) {
    recommendations.push(
      "Verificar que cada quiz tenga explicación por pregunta",
      "Probar cada interacción en preview desktop y mobile",
      "Revisar que los destinos de botones existan"
    );
  }

  return { structureScore, contentScore, interactionScore, designScore, overallScore, passed, issues, recommendations };
}

// ============================================
// PDF / EBOOK - CONTENIDO MOCK ESPECÍFICO
// ============================================

type PdfTopicKey = "marketing" | "english" | "photo" | "running" | "generic";

function detectPdfTone(t: string): { tone: PdfTone; toneSpecified: boolean } {
  if (t.includes("profesional")) return { tone: "professional", toneSpecified: true };
  if (t.includes("educativ")) return { tone: "educational", toneSpecified: true };
  if (t.includes("cercan")) return { tone: "warm", toneSpecified: true };
  if (t.includes("inspirador")) return { tone: "inspiring", toneSpecified: true };
  if (t.includes("premium")) return { tone: "premium", toneSpecified: true };
  if (t.includes("conversacional")) return { tone: "conversational", toneSpecified: true };
  if (t.includes("marketing")) return { tone: "professional", toneSpecified: false };
  if (t.includes("correr") || t.includes("running")) return { tone: "inspiring", toneSpecified: false };
  return { tone: "educational", toneSpecified: false };
}

function detectPdfStyle(t: string): { style: PdfStylePreset; styleSpecified: boolean } {
  if (t.includes("minimalista")) return { style: "minimal", styleSpecified: true };
  if (t.includes("editorial")) return { style: "editorial", styleSpecified: true };
  if (t.includes("premium") || t.includes("elegante") || t.includes("lujo")) return { style: "luxury", styleSpecified: true };
  if (t.includes("tecnol") || t.includes("moderno") || t.includes("creativo")) return { style: "modern", styleSpecified: true };
  if (t.includes("negocio") || t.includes("business") || t.includes("empresa")) return { style: "business", styleSpecified: true };
  if (t.includes("educ")) return { style: "education", styleSpecified: true };
  return { style: "modern", styleSpecified: false };
}

function buildEditorialBrief(
  key: PdfTopicKey,
  spec: PdfSpecification,
  title: string,
  subtitle: string,
  chapterCount: number
): PdfEditorialBrief {
  const topic = spec.topic;
  return {
    promise: subtitle,
    readerLevel: spec.level,
    goal: spec.goal,
    tone: spec.tone,
    style: spec.style,
    visualIdentity: `Estilo ${spec.style} con paleta ${spec.paletteMode === "auto" ? "automática según el tema" : "personalizada"}: diagramas y ejemplos visuales coherentes en cada capítulo.`,
    resourcesNeeded: [
      "Portada editorial con composición del tema",
      "Un diagrama educativo por capítulo técnico",
      "Tablas comparativas y checklists de acción",
      "Resúmenes con puntos clave por capítulo",
    ],
    conclusion: `El lector cierra con un plan de acción concreto sobre ${topic} y criterios para medir su avance.`,
    finalCta: `Aplica el plan de 30 días de "${title}" y comparte tu primer resultado: el progreso visible es la mejor prueba.`,
  };
}

const EXPAND_BANK: Record<PdfTopicKey, string[]> = {
  marketing: [
    "En la práctica, esto se traduce en una métrica semanal: si no mejora en 14 días, cambia el mensaje antes que el canal.",
    "Los emprendedores que documentan cada intento detectan patrones que los demás no ven: anota qué probaste y qué pasó.",
    "Recuerda: un solo canal bien trabajado durante 90 días supera a cinco canales abandonados en la segunda semana.",
  ],
  english: [
    "Repite cada ejemplo en voz alta tres veces: tu boca necesita entrenar los sonidos tanto como tu memoria las palabras.",
    "Anota cada palabra nueva con su ejemplo completo; una palabra suelta se olvida, una frase se queda.",
    "Si un ejercicio te cuesta, es señal de que ahí está tu crecimiento: repítelo mañana antes de avanzar.",
  ],
  photo: [
    "Haz la prueba hoy mismo con tu celular: la diferencia entre leer sobre luz y verla es total.",
    "Compara tu foto con la de ayer, no con la de un profesional: el progreso propio es la única medida justa.",
    "Cuando una foto no funcione, cambia una sola cosa (luz, ángulo o fondo) y dispara de nuevo.",
  ],
  running: [
    "Escucha a tu cuerpo: la molestia que aparece al correr y desaparece al parar es aviso, no lesión todavía.",
    "Anota cada sesión con sensaciones del 1 al 10: tu registro predice estancamientos antes de que lleguen.",
    "El descanso también entrena: los músculos se reparan durmiendo, no corriendo.",
  ],
  generic: [
    "Aplica esto esta semana en un caso real: la teoría sin práctica se olvida en días.",
    "Anota qué funcionó y qué ajustarías: tu registro es tu mejor maestro.",
    "Si te estancas, vuelve a los fundamentos: el problema casi siempre está ahí.",
  ],
};

const STYLE_CLOSERS: Record<PdfTone, string> = {
  professional: "Aplícalo con criterio profesional: mide, ajusta y documenta cada decisión.",
  educational: "Repasa este punto mañana: la repetición espaciada fija el aprendizaje.",
  warm: "Hazlo a tu ritmo, sin culpa: cada pequeño avance cuenta.",
  inspiring: "Da el primer paso hoy: la motivación sigue a la acción, no al revés.",
  premium: "Ejecútalo con estándar premium: los detalles distinguen lo bueno de lo memorable.",
  conversational: "Pruébalo y cuéntame cómo te fue: aprender conversando fija el doble.",
};

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
}

function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, Math.max(1, n)).join(" ").trim();
}

function rewriteBlockText(
  block: PdfContentBlock,
  action: PdfTextAction,
  key: PdfTopicKey
): PdfContentBlock {
  const apply = (text: string): string => {
    switch (action) {
      case "fix": return cleanText(text);
      case "shorten": return firstSentences(cleanText(text), 2);
      case "expand": {
        const bank = EXPAND_BANK[key];
        return `${cleanText(text)} ${bank[text.length % bank.length]}`;
      }
      case "improve":
      case "professional":
      case "persuasive": {
        const tone: PdfTone = action === "persuasive" ? "inspiring" : action === "professional" ? "professional" : "educational";
        return `${cleanText(text)} ${STYLE_CLOSERS[tone]}`;
      }
    }
  };
  const applyList = (items: string[]): string[] =>
    action === "shorten" ? items.slice(0, Math.max(1, Math.ceil(items.length / 2))) : items.map(apply);
  switch (block.type) {
    case "heading": case "subheading": case "paragraph": case "highlight":
      return { ...block, text: apply(block.text) };
    case "bulletList": case "numberedList":
      return { ...block, items: applyList(block.items) };
    case "quote":
      return { ...block, text: apply(block.text) };
    case "tip": case "warning": case "example": case "callout": case "exercise":
      return { ...block, text: apply(block.text) };
    case "checklist":
      return { ...block, items: applyList(block.items) };
    case "table":
      return { ...block, rows: block.rows.map((r) => r.map((c) => (action === "fix" ? cleanText(c) : c))) };
    case "reflection":
      return { ...block, question: apply(block.question) };
    case "chapterSummary":
      return { ...block, points: applyList(block.points) };
    case "divider": case "image":
      return block;
  }
}

function applySectionVariant(
  section: PdfChapterSource["sections"][number],
  variant: number,
  key: PdfTopicKey
): PdfChapterSource["sections"][number] {
  if (variant <= 0) return section;
  const bank = EXPAND_BANK[key];
  const extra = bank[(variant - 1) % bank.length];
  return {
    ...section,
    paragraphs: section.paragraphs.map((p) => `${cleanText(p)} ${extra}`),
  };
}

function parseTargetPages(idea: string): number {
  const m = idea.match(/(\d{2,3})\s*páginas/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 10 && n <= 300) return n;
  }
  return 50;
}

function pdfTopicKey(topic: string): PdfTopicKey {
  const t = topic.toLowerCase();
  if (t.includes("marketing")) return "marketing";
  if (t.includes("ingl") || t.includes("english")) return "english";
  if (t.includes("foto")) return "photo";
  if (t.includes("correr") || t.includes("running") || t.includes("5k")) return "running";
  return "generic";
}

function presetForTopic(key: PdfTopicKey): PdfStylePreset {
  switch (key) {
    case "marketing": return "business";
    case "english": return "education";
    case "photo": return "editorial";
    case "running": return "modern";
    default: return "minimal";
  }
}

function titleForTopic(key: PdfTopicKey, topic: string): string {
  switch (key) {
    case "marketing": return "Marketing Digital para Emprendedores";
    case "english": return "Inglés desde Cero";
    case "photo": return "Fotografía desde Cero";
    case "running": return "De Cero a 5K";
    default: return topic;
  }
}

function subtitleForTopic(key: PdfTopicKey, topic: string): string {
  switch (key) {
    case "marketing": return "Consigue tus primeros clientes sin agencia ni presupuesto gigante";
    case "english": return "Guía práctica con vocabulario, frases y plan de 30 días";
    case "photo": return "Mejores fotos con la cámara que ya tienes";
    case "running": return "Manual de entrenamiento de 8 semanas para principiantes";
    default: return `Guía práctica sobre ${topic}`;
  }
}

export function brandingForPreset(preset: PdfStylePreset, key: PdfTopicKey): PdfBranding {
  void key;
  const palettes: Record<PdfStylePreset, Omit<PdfBranding, "preset" | "footerText" | "coverStyle" | "showHeader" | "showFooter" | "showPageNumbers">> = {
    modern: { primaryColor: "#7c3aed", secondaryColor: "#06b6d4", backgroundColor: "#ffffff", surfaceColor: "#faf5ff", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#06b6d4", fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 8, headerStyle: "rule", footerStyle: "page-only" },
    minimal: { primaryColor: "#18181b", secondaryColor: "#52525b", backgroundColor: "#ffffff", surfaceColor: "#fafafa", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#52525b", fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 4, headerStyle: "plain", footerStyle: "page-only" },
    editorial: { primaryColor: "#111111", secondaryColor: "#9a3412", backgroundColor: "#fdfbf7", surfaceColor: "#ffffff", textColor: "#1c1917", mutedColor: "#78716c", accentColor: "#9a3412", fontFamily: "Times-Roman", headingFont: "Times-Bold", bodyFont: "Times-Roman", borderRadius: 2, headerStyle: "rule", footerStyle: "title-page" },
    business: { primaryColor: "#1e3a8a", secondaryColor: "#b45309", backgroundColor: "#ffffff", surfaceColor: "#f1f5f9", textColor: "#0f172a", mutedColor: "#64748b", accentColor: "#b45309", fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 6, headerStyle: "rule", footerStyle: "title-page" },
    education: { primaryColor: "#4f46e5", secondaryColor: "#0d9488", backgroundColor: "#ffffff", surfaceColor: "#f5f3ff", textColor: "#1c1917", mutedColor: "#78716c", accentColor: "#0d9488", fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 8, headerStyle: "rule", footerStyle: "title-page" },
    luxury: { primaryColor: "#3f3f46", secondaryColor: "#a16207", backgroundColor: "#fafaf9", surfaceColor: "#ffffff", textColor: "#18181b", mutedColor: "#71717a", accentColor: "#a16207", fontFamily: "Times-Roman", headingFont: "Times-Bold", bodyFont: "Times-Roman", borderRadius: 2, headerStyle: "plain", footerStyle: "title-page" },
    premium: { primaryColor: "#6d28d9", secondaryColor: "#a16207", backgroundColor: "#faf9ff", surfaceColor: "#ffffff", textColor: "#1e1b29", mutedColor: "#7c7484", accentColor: "#a16207", fontFamily: "Helvetica", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", borderRadius: 10, headerStyle: "rule", footerStyle: "title-page" },
  };
  const p = palettes[preset];
  return {
    ...p,
    preset,
    showHeader: true,
    showFooter: true,
    showPageNumbers: true,
    coverStyle: preset === "editorial" || preset === "luxury" ? "classic" : "bold",
    footerText: "",
  };
}

interface PdfSectionSource {
  title: string;
  paragraphs: string[];
  list?: { style: "bullets" | "numbers"; items: string[] };
  tip?: { title: string; text: string };
  warning?: { title: string; text: string };
  example?: { title: string; text: string };
  quote?: { text: string; author: string };
  table?: { title: string; headers: string[]; rows: string[][] };
  exercise?: { title: string; text: string };
}

interface PdfChapterSource {
  title: string;
  summary: string;
  intro: string[];
  sections: PdfSectionSource[];
  takeaways: string[];
}

function pdfBlockId(ch: number, sec: number, order: number): string {
  return `pdfb-${ch}-${sec}-${order}`;
}

function buildPdfChapter(
  id: string,
  chapterIndex: number,
  title: string,
  source: PdfChapterSource
): PdfChapter {
  const sections: PdfSection[] = source.sections.map((s, si) => {
    const blocks: PdfContentBlock[] = [];
    let o = 1;
    blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "subheading", order: o++, text: s.title });
    for (const p of s.paragraphs) {
      blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "paragraph", order: o++, text: p });
    }
    if (s.list) {
      blocks.push(s.list.style === "bullets"
        ? { id: pdfBlockId(chapterIndex, si, o), type: "bulletList", order: o++, items: s.list.items }
        : { id: pdfBlockId(chapterIndex, si, o), type: "numberedList", order: o++, items: s.list.items });
    }
    if (s.tip) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "tip", order: o++, title: s.tip.title, text: s.tip.text });
    if (s.warning) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "warning", order: o++, title: s.warning.title, text: s.warning.text });
    if (s.example) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "example", order: o++, title: s.example.title, text: s.example.text });
    if (s.quote) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "quote", order: o++, text: s.quote.text, author: s.quote.author });
    if (s.table) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "table", order: o++, title: s.table.title, headers: s.table.headers, rows: s.table.rows });
    if (s.exercise) blocks.push({ id: pdfBlockId(chapterIndex, si, o), type: "exercise", order: o++, title: s.exercise.title, text: s.exercise.text });
    return { id: `${id}-s${si + 1}`, title: s.title, order: si + 1, blocks };
  });
  // Cierre del capítulo con puntos clave
  const last = sections[sections.length - 1];
  if (last) {
    const o = last.blocks.length + 1;
    last.blocks.push({ id: pdfBlockId(chapterIndex, sections.length - 1, o), type: "chapterSummary", order: o, points: source.takeaways });
  }
  return { id, title, introduction: source.intro.join("\n\n"), order: chapterIndex + 1, sections };
}

function countPdfWords(chapters: PdfChapter[]): number {
  const texts: string[] = [];
  for (const ch of chapters) {
    texts.push(ch.title, ch.introduction);
    for (const s of ch.sections) {
      texts.push(s.title);
      for (const b of s.blocks) texts.push(blockText(b));
    }
  }
  return texts.join(" ").split(/\s+/).filter((w) => w.length > 0).length;
}

function blockText(b: PdfContentBlock): string {
  switch (b.type) {
    case "heading": case "subheading": case "paragraph": case "highlight": return b.text;
    case "bulletList": case "numberedList": return b.items.join(" ");
    case "quote": return `${b.text} ${b.author}`;
    case "tip": case "warning": case "example": case "callout": return `${b.title} ${b.text}`;
    case "checklist": return `${b.title} ${b.items.join(" ")}`;
    case "table": return `${b.title} ${b.headers.join(" ")} ${b.rows.map((r) => r.join(" ")).join(" ")}`;
    case "divider": return "";
    case "image": return `${b.alt} ${b.caption}`;
    case "exercise": return `${b.title} ${b.text}`;
    case "reflection": return b.question;
    case "chapterSummary": return b.points.join(" ");
  }
}

const PDF_PLACEHOLDERS = [
  "lorem",
  "este capítulo explica los conceptos principales",
  "contenido generado aquí",
  "texto de ejemplo",
  "contenido pendiente",
];

const PDF_CHAPTERS: Record<Exclude<PdfTopicKey, "generic">, PdfChapterSource[]> = {
  marketing: [
    {
      title: "Introducción: el marketing que sí funciona empezando",
      summary: "Qué puedes esperar de esta guía y el enfoque sin humo que usaremos.",
      intro: [
        "Si estás empezando un emprendimiento, el marketing digital puede parecer un océano: redes, anuncios, emails, embudos, influencers. Esta guía recorta todo eso a lo esencial: conseguir tus primeros clientes con poco presupuesto y mucho foco.",
        "No necesitas una agencia ni miles de dólares. Necesitas entender a quién le vendes, decirle algo que le importe y repetir el canal que funcione. Cada capítulo termina con una acción concreta para que avances mientras lees.",
      ],
      sections: [
        {
          title: "Cómo usar esta guía",
          paragraphs: [
            "Lee los capítulos en orden la primera vez: cada uno construye sobre el anterior. El capítulo 10 convierte todo en un plan de 30 días con tareas diarias.",
            "Si ya tienes clientes, salta al capítulo 7 u 8 según tu cuello de botella: o no te encuentran (visibilidad) o te encuentran pero no compran (conversión).",
          ],
          list: { style: "numbers", items: ["Lee un capítulo por día", "Aplica su acción antes de seguir", "Mide un solo número por semana"] },
          tip: { title: "Regla de oro", text: "Un canal, un mensaje, un mes. La dispersión es el impuesto de los principiantes." },
        },
        {
          title: "Qué no es este libro",
          paragraphs: [
            "No es un manual de trucos virales ni de growth hacking. Los trucos caducan; los fundamentos (cliente, oferta, mensaje, canal) duran décadas.",
            "Tampoco promete resultados sin trabajo: el marketing digital premia la constancia semanal más que el talento ocasional.",
          ],
          quote: { text: "Haz menos marketing, pero hazlo todas las semanas.", author: "Principio de esta guía" },
        },
      ],
      takeaways: ["El objetivo son tus primeros clientes, no los seguidores", "Un canal bien trabajado supera a cinco a medias", "Cada capítulo tiene una acción: aplícala antes de seguir"],
    },
    {
      title: "Fundamentos del marketing digital",
      summary: "Tráfico, conversión y ticket: las tres palancas de todo negocio online.",
      intro: [
        "Todo el marketing digital se resume en tres números: cuánta gente te ve (tráfico), qué porcentaje compra (conversión) y cuánto deja en promedio (ticket). Si uno de los tres es cero, el negocio es cero.",
        "Un emprendedor que empieza debe obsesionarse con la conversión antes de pagar tráfico: de nada sirve llevar mil visitas a una página que no vende.",
      ],
      sections: [
        {
          title: "Las tres palancas",
          paragraphs: [
            "Tráfico es atención: visitas, seguidores, vistas. Conversión es decisión: compras, reservas, mensajes. Ticket es valor: precio más venta adicional.",
            "Ejemplo: 1.000 visitas × 2% conversión × $25 ticket = $500. Duplicar la conversión rinde lo mismo que duplicar el tráfico, pero suele costar menos.",
          ],
          table: { title: "Dónde actuar según tu caso", headers: ["Síntoma", "Palanca", "Acción"], rows: [["Nadie te ve", "Tráfico", "Contenido + un canal"], ["Te ven pero no compran", "Conversión", "Oferta y prueba social"], ["Compran poco", "Ticket", "Combos y upsell"]] },
        },
        {
          title: "El error más caro",
          paragraphs: [
            "Pagar publicidad para llevar tráfico a una oferta sin validar. Primero vende a 10 personas con mensajes directos o contenido orgánico; después escala con anuncios lo que ya funciona.",
          ],
          example: { title: "Caso", text: "Lucía gastó $300 en anuncios para su curso sin haber vendido uno solo. Pausó, vendió 8 por WhatsApp ajustando el mensaje, y recién entonces reactivó anuncios con la mitad de costo por venta." },
        },
      ],
      takeaways: ["Mide tráfico, conversión y ticket cada semana", "Valida vendiendo en pequeño antes de pagar escala", "La conversión se mejora con oferta clara y prueba social"],
    },
    {
      title: "Tu cliente ideal",
      summary: "Definir a quién le vendes para dejar de hablarle a todo el mundo.",
      intro: [
        "Si le hablas a todo el mundo, no le hablas a nadie. Tu cliente ideal no es un dato demográfico: es una persona con un problema concreto que ya intenta resolver (mal) de otra forma.",
        "Este capítulo te deja con una ficha de cliente de una página: quién es, qué le duele, qué ya probó y por qué te elegiría a ti.",
      ],
      sections: [
        {
          title: "La ficha de cliente",
          paragraphs: [
            "Completa estas frases con un cliente real en mente, no imaginario: tiene entre X y Y años, trabaja en..., su problema más molesto es..., ya probó... y no le funcionó porque...",
            "Si no puedes completarlas, tu tarea es hablar con 5 clientes potenciales esta semana. Sin entrevistas no hay ficha; sin ficha no hay mensaje.",
          ],
          list: { style: "bullets", items: ["Nombre y edad aproximada", "Problema concreto en sus palabras", "Qué ya intentó y por qué falló", "Dónde pasa tiempo online", "Qué lo haría comprar hoy"] },
        },
        {
          title: "Dónde encontrarlo",
          paragraphs: [
            "Tu cliente ideal ya está agrupado: grupos de Facebook, subreddits, hashtags de Instagram, comentarios de YouTube, ferias locales. Tu trabajo es escuchar antes de publicar.",
            "Dedica una hora a leer comentarios y reseñas de la competencia: ahí están las objeciones y los deseos escritos por ellos mismos.",
          ],
          exercise: { title: "Ejercicio", text: "Escribe tu ficha de cliente en una página y consigue que 3 personas de ese perfil te digan si se reconocen en ella." },
        },
      ],
      takeaways: ["Un cliente concreto supera a un mercado abstracto", "Sus palabras exactas son tu mejor copy", "5 entrevistas valen más que 5 cursos"],
    },
    {
      title: "Propuesta de valor",
      summary: "Explicar en una frase por qué elegirte a ti.",
      intro: [
        "Tu propuesta de valor responde: ¿qué resultado ofreces, a quién y por qué eres la opción segura? Si un visitante no la entiende en 5 segundos, se va.",
        "Fórmula útil: Ayudo a [cliente] a [resultado] sin [dolor habitual] en [plazo]. Ejemplo: Ayudo a peluquerías a llenar turnos flojos sin pagar agencia, en 30 días.",
      ],
      sections: [
        {
          title: "Construye la tuya",
          paragraphs: [
            "Escribe 5 versiones de tu frase y pruébalas con clientes reales: la que genera preguntas curiosas gana. Evita adjetivos vacíos (calidad, excelencia) y usa resultados medibles.",
            "Coloca la frase ganadora en tu perfil, tu WhatsApp Business y el inicio de tu página. La repetición crea posicionamiento.",
          ],
          example: { title: "Antes y después", text: "Antes: Diseños creativos de alta calidad. Después: Logos para food trucks que se leen desde la calle y se entregan en 7 días." },
        },
        {
          title: "Prueba social mínima",
          paragraphs: [
            "Nadie cree promesas sin pruebas. Reúne tus primeras 3 pruebas: capturas de resultados, testimonios con nombre y foto, o trabajos de muestra con proceso visible.",
            "Si empiezas de cero, ofrece tus primeros 3 trabajos con descuento a cambio de testimonio detallado y permiso para publicarlo.",
          ],
          tip: { title: "Pide bien el testimonio", text: "Pregunta: ¿qué problema tenías, qué hicimos y qué cambió? Un testimonio con números vale por diez genéricos." },
        },
      ],
      takeaways: ["Una frase, un resultado, un plazo", "Prueba con clientes reales, no con amigos", "3 pruebas concretas valen más que 100 adjetivos"],
    },
    {
      title: "Redes sociales: elige una",
      summary: "Cómo elegir tu canal principal y publicar sin agotarte.",
      intro: [
        "Estar en todas las redes es la forma más rápida de abandonar todas. Elige UNA donde esté tu cliente y publícala 3 veces por semana durante 90 días antes de juzgar.",
        "Instagram y TikTok sirven para mostrar; Facebook para comunidades locales y mayores de 35; LinkedIn para servicios entre empresas; YouTube para enseñar en profundidad.",
      ],
      sections: [
        {
          title: "Criterio de elección",
          paragraphs: [
            "Pregunta a tus 5 entrevistados dónde pasan tiempo y qué cuentas siguen. Elige el canal que puedas sostener: si odias la cámara, prefiere carruseles o texto.",
            "Optimiza tu perfil antes de publicar: foto clara, propuesta de valor en la bio y un solo enlace o botón de contacto.",
          ],
          list: { style: "numbers", items: ["Pregunta a clientes dónde están", "Elige un solo canal por 90 días", "Arregla foto, bio y contacto", "Publica 3 veces por semana"] },
        },
        {
          title: "Qué publicar",
          paragraphs: [
            "Alterna 4 tipos: educativo (cómo hacer X), prueba (casos y resultados), personal (quién eres) y oferta (qué vendes y cómo comprar). La oferta directa debe ser 1 de cada 4.",
            "Repite los temas que funcionen con otros formatos. Publicar no es inventar cada día: es insistir en lo que tu cliente necesita oír.",
          ],
          exercise: { title: "Ejercicio", text: "Planifica tus próximas 12 publicaciones (4 semanas) en una tabla: fecha, tipo, tema y llamado a la acción." },
        },
      ],
      takeaways: ["Un canal durante 90 días", "Perfil optimizado antes del contenido", "Regla 3-1: tres de valor por cada oferta"],
    },
    {
      title: "Contenido que atrae",
      summary: "Ideas, formatos y frecuencia para no quedarte en blanco.",
      intro: [
        "El contenido es tu vendedor gratuito: responde dudas, demuestra que sabes y atrae búsquedas. No necesitas ser original; necesitas ser útil y constante.",
        "Piensa en preguntas reales de clientes: cuánto cuesta, cuánto tarda, qué incluye, por qué tú, qué pasa si sale mal. Cada pregunta es una publicación.",
      ],
      sections: [
        {
          title: "Banco de ideas",
          paragraphs: [
            "Crea una lista de 30 preguntas de clientes y ordénalas por frecuencia. Esas son tus próximas 30 publicaciones, sin pensar más.",
            "Reutiliza: un video se vuelve carrusel, email y 3 frases. Un buen tema merece 4 formatos.",
          ],
          table: { title: "Formatos por esfuerzo", headers: ["Formato", "Tiempo", "Ideal para"], rows: [["Foto + texto", "20 min", "Consejos rápidos"], ["Carrusel", "1 hora", "Paso a paso"], ["Video corto", "1-2 horas", "Demostraciones"], ["Video largo / vivo", "3+ horas", "Profundidad y confianza"]] },
        },
        {
          title: "Llamados a la acción",
          paragraphs: [
            "Toda publicación termina con una instrucción: guarda, comenta, escríbeme, agenda. Sin llamado, el contenido entretiene pero no vende.",
            "El mejor llamado para empezar es la conversación: escríbeme la palabra X por mensaje directo. Así construyes lista de interesados.",
          ],
          tip: { title: "Mide poco pero mide", text: "Por publicación anota alcance y mensajes recibidos. Repite formato y tema de las 3 mejores cada mes." },
        },
      ],
      takeaways: ["30 preguntas reales = 30 publicaciones", "Reutiliza cada tema en 4 formatos", "Siempre termina con un llamado a la acción"],
    },
    {
      title: "Email marketing",
      summary: "La lista es tuya: cómo captar emails y escribir correos que venden.",
      intro: [
        "Las redes alquilan audiencia; el email es propiedad. Un seguidor vale centavos, un suscriptor que abre tus correos vale dólares: nadie te quita tu lista.",
        "Empieza simple: un regalo a cambio del email (guía, descuento, checklist), un correo semanal útil y una secuencia de bienvenida de 3 correos.",
      ],
      sections: [
        {
          title: "Captar suscriptores",
          paragraphs: [
            "Ofrece un lead magnet concreto: checklist de 1 página, plantilla, cupón del 15%. Pídelo en tu perfil, al final de tus publicaciones y en tu WhatsApp.",
            "Herramientas gratuitas alcanzan para empezar (hasta 500-1.000 contactos). Lo importante es el hábito semanal, no la herramienta.",
          ],
          list: { style: "bullets", items: ["Lead magnet de 1 página", "Formulario en perfil y publicaciones", "Correo semanal el mismo día", "Secuencia de bienvenida de 3 correos"] },
        },
        {
          title: "Qué escribir",
          paragraphs: [
            "Estructura simple: historia o dato (2 líneas), enseñanza (3 líneas), oferta suave (1 línea). Asunto de menos de 8 palabras, curioso y específico.",
            "La secuencia de bienvenida: correo 1 entrega el regalo, correo 2 cuenta quién eres y a quién ayudas, correo 3 muestra un caso y ofrece una llamada o compra inicial.",
          ],
          example: { title: "Asuntos que abren", text: "El error que me costó $500 / Cómo llené mi agenda en 30 días / 3 turnos libres esta semana (vs. Newsletter #12)." },
        },
      ],
      takeaways: ["Tu lista es tu activo más valioso", "Un correo semanal útil supera a 5 promocionales", "Automatiza la bienvenida desde el día uno"],
    },
    {
      title: "Publicidad pagada sin quemar dinero",
      summary: "Cuándo pautar, con cuánto y cómo leer los números.",
      intro: [
        "La publicidad acelera lo que ya funciona; no resucita lo que no vende. Regla: pauta solo cuando ya vendiste al menos 10 veces en orgánico o por referidos.",
        "Empieza con $5-10 diarios en una sola campaña, un solo público y un solo anuncio durante 7 días. Cambiar todo cada día es tirar dinero.",
      ],
      sections: [
        {
          title: "Tu primera campaña",
          paragraphs: [
            "Objetivo: mensajes o visitas a WhatsApp, no seguidores. Público: tu ciudad + edad de tu cliente, o similar a tus compradores si la plataforma lo permite.",
            "El anuncio usa tu mejor publicación orgánica (la que más mensajes trajo). Si ninguna trajo mensajes, vuelve al contenido antes de pagar.",
          ],
          table: { title: "Lectura a los 7 días", headers: ["Métrica", "Bien", "Mal"], rows: [["Costo por mensaje", "Menor a tu margen/10", "Mayor a tu margen/3"], ["Mensajes diarios", "3 o más", "0-1"], ["Cierres", "1 de cada 5", "0 de 20"]] },
        },
        {
          title: "Escalar sin romper",
          paragraphs: [
            "Si la campaña vende con margen, sube el presupuesto 20-30% cada 3 días, no lo dupliques de golpe. Crea una variante del anuncio ganador por semana.",
            "Pausa sin piedad lo que no vende en 7-10 días con tráfico suficiente. El 80% de los anuncios pierde; el negocio está en encontrar el 20%.",
          ],
          warning: { title: "Cuidado", text: "Nunca pauses a las 24 horas ni edites a diario: el algoritmo necesita 3-4 días para aprender." },
        },
      ],
      takeaways: ["Pauta lo validado, no lo imaginado", "$5-10/día, 7 días, sin tocar", "Escala 20-30% cada 3 días"],
    },
    {
      title: "Embudos de venta simples",
      summary: "El camino de desconocido a cliente en 3 pasos.",
      intro: [
        "Un embudo es el recorrido que diseñas: te descubren (contenido o anuncio), te conocen (lead magnet o mensajes) y compran (oferta clara). Sin recorrido diseñado, cada venta es casualidad.",
        "Para empezar alcanza un embudo de mensajes: publicación → mensaje directo → cierre por WhatsApp con catálogo y medios de pago listos.",
      ],
      sections: [
        {
          title: "Embudo de mensajes",
          paragraphs: [
            "Paso 1: publica contenido con llamado a escribirte. Paso 2: responde en menos de 1 hora con 2-3 preguntas (qué necesita, para cuándo, presupuesto). Paso 3: envía propuesta de 5 líneas con precio, plazo y cómo pagar.",
            "Guarda respuestas modelo para las 10 preguntas repetidas. La velocidad de respuesta es tu ventaja contra competidores grandes.",
          ],
          list: { style: "numbers", items: ["Contenido con llamado a escribir", "Respuesta en menos de 1 hora", "2-3 preguntas para calificar", "Propuesta de 5 líneas con precio", "Seguimiento a las 48 horas"] },
        },
        {
          title: "Seguimiento",
          paragraphs: [
            "El 50% de las ventas se cierra en el seguimiento, no en el primer mensaje. Agenda un recordatorio a las 48 horas: ¿pudiste ver la propuesta? ¿te ayudo con algo?",
            "No persigas: dos seguimientos amables y una despedida con la puerta abierta. La presión quema referidos.",
          ],
          tip: { title: "Plantilla", text: "Hola [nombre], ¿pudiste ver la propuesta? Quedan [X] lugares esta semana. ¿Te reservo uno o prefieres que hablemos?" },
        },
      ],
      takeaways: ["Diseña el recorrido, no esperes casualidades", "Responde en menos de 1 hora", "El seguimiento cierra la mitad de las ventas"],
    },
    {
      title: "Tu plan de acción de 30 días",
      summary: "Qué hacer cada semana para tener un sistema funcionando.",
      intro: [
        "Este capítulo convierte el libro en calendario. Treinta días, una hora diaria, un sistema mínimo andando: perfil optimizado, un canal activo, lista empezada y primer embudo.",
        "Marca cada tarea al completarla. Si un día fallas, retoma al siguiente sin compensar con atracones: la constancia gana.",
      ],
      sections: [
        {
          title: "Semana por semana",
          paragraphs: [
            "Semana 1: ficha de cliente (5 entrevistas), propuesta de valor y perfil optimizado. Semana 2: 6 publicaciones y lead magnet publicado.",
            "Semana 3: primer correo semanal, embudo de mensajes con respuestas modelo. Semana 4: mide, repite lo mejor y decide si pautas $5/día.",
          ],
          list: { style: "numbers", items: ["Semana 1: cliente + propuesta + perfil", "Semana 2: contenido + lead magnet", "Semana 3: email + embudo de mensajes", "Semana 4: medir, repetir, decidir pauta"] },
        },
        {
          title: "Tablero semanal",
          paragraphs: [
            "Todos los domingos anota 4 números: publicaciones, mensajes recibidos, ventas y facturación. Compara con la semana anterior, no con gurúes.",
            "Cada mes elimina el canal o formato con peores números y duplica tiempo al mejor. Así el sistema mejora solo.",
          ],
          table: { title: "Tablero mínimo", headers: ["Métrica", "Meta inicial", "Revisar"], rows: [["Publicaciones/semana", "3", "Domingo"], ["Mensajes/semana", "5", "Domingo"], ["Ventas/mes", "4", "Fin de mes"], ["Ticket promedio", "Subir 10%/trim", "Fin de mes"]] },
          exercise: { title: "Compromiso", text: "Escribe tu meta de 30 días en una frase con número y fecha, y pégala donde trabajas. Ejemplo: 4 ventas antes del 30." },
        },
      ],
      takeaways: ["1 hora diaria durante 30 días", "Mide 4 números cada domingo", "Duplica lo que funciona, elimina lo que no"],
    },
  ],
  english: [
    {
      title: "Introducción: cómo usar esta guía",
      summary: "Método, materiales y plan para aprender desde cero.",
      intro: [
        "No necesitas saber nada de inglés para usar esta guía. Cada capítulo enseña poco vocabulario bien elegido y te hace usarlo de inmediato: leer en voz alta, completar ejercicios y hablar desde el día uno.",
        "Estudia 20 minutos diarios mejor que 3 horas un domingo. La repetición espaciada (repasar al día siguiente y a la semana) es lo que fija las palabras.",
      ],
      sections: [
        {
          title: "Tu método en 3 pasos",
          paragraphs: [
            "Paso 1: lee la explicación con los ejemplos. Paso 2: tapa la traducción y repite en voz alta. Paso 3: completa el ejercicio escribiendo.",
            "Hablar bajito también cuenta: tu boca necesita entrenar sonidos nuevos como el th de three o la r suave.",
          ],
          list: { style: "numbers", items: ["Lee y entiende", "Repite en voz alta tapando", "Escribe el ejercicio"] },
          tip: { title: "Pronunciación", text: "Las guías entre paréntesis son aproximadas para arrancar. Escucha cada palabra en un diccionario online cuando puedas." },
        },
        {
          title: "Materiales",
          paragraphs: [
            "Solo necesitas este ebook, un cuaderno y 20 minutos. Anota cada palabra nueva con su ejemplo, no suelta: Hello — Hello, Ana! funciona mejor que hello = hola.",
          ],
          exercise: { title: "Arranque", text: "Escribe tu meta con fecha: Hablaré de mí en inglés el día __. Firma y fecha de hoy." },
        },
      ],
      takeaways: ["20 minutos diarios superan a sesiones maratónicas", "Lee, repite en voz alta, escribe", "Anota palabras con ejemplo, no sueltas"],
    },
    {
      title: "Pronunciación básica",
      summary: "Los 5 sonidos que más cuestan y cómo entrenarlos.",
      intro: [
        "El inglés se escribe de una forma y se pronuncia de otra. Buena noticia: con 5 sonidos dominados te entenderán en el 80% de las situaciones básicas.",
        "Practica frente al espejo 5 minutos: ver tu boca acelera el aprendizaje de sonidos que el español no tiene.",
      ],
      sections: [
        {
          title: "Los 5 sonidos clave",
          paragraphs: [
            "TH suave (three, think): lengua entre los dientes soplando. TH sonoro (this, that): igual pero con vibración en la garganta.",
            "R suave (red, right): lengua atrás sin vibrar, a diferencia de la erre española. I corta (fish, big): breve, entre i y e. SH (she, fish): como pedir silencio.",
          ],
          table: { title: "Practica en pares", headers: ["Sonido", "Palabra", "Prueba"], rows: [["TH suave", "three (tres)", "three vs tree"], ["TH sonoro", "this (esto)", "this vs dis"], ["R suave", "red (rojo)", "red vs led"], ["I corta", "fish (pez)", "fish vs feesh"], ["SH", "she (ella)", "she vs see"]] },
        },
        {
          title: "Rutina de 5 minutos",
          paragraphs: [
            "Repite cada palabra de la tabla 5 veces exagerando el gesto. Graba tu voz con el celular y compara con un diccionario online una vez por semana.",
          ],
          exercise: { title: "Ejercicio", text: "Lee en voz alta: This is a red fish. She thinks three things. Repite 5 veces sin trabarte." },
        },
      ],
      takeaways: ["TH, R suave, I corta y SH son tu prioridad", "Exagera el gesto frente al espejo", "Grábate una vez por semana"],
    },
    {
      title: "Saludos y presentaciones",
      summary: "Saludar, presentarte y despedirte desde hoy.",
      intro: [
        "Con este capítulo ya puedes tener tu primera conversación: saludar según la hora, decir tu nombre y de dónde eres, y despedirte con naturalidad.",
        "Hello sirve siempre. Hi es informal. Good morning hasta el mediodía, Good afternoon después, Good evening al llegar de noche. Good night solo para despedirse.",
      ],
      sections: [
        {
          title: "Saludos por momento",
          paragraphs: [
            "De día con desconocidos o jefes: Good morning / Good afternoon. Con amigos a cualquier hora: Hi! Hello! Al llegar a un restaurante de noche: Good evening.",
            "Respuestas: How are you? se responde I'm fine, thanks. And you? aunque estés regular: es cortesía, no terapia.",
          ],
          list: { style: "bullets", items: ["Hello / Hi: sirven casi siempre", "Good morning: hasta el mediodía", "Good evening: saludo nocturno al llegar", "Good night: solo despedida", "Bye / Goodbye: despedida general"] },
        },
        {
          title: "Presentarte",
          paragraphs: [
            "My name is... (Me llamo...) y I am from... (Soy de...). Ejemplo completo: Hello! My name is Pedro. I am from México. Nice to meet you.",
            "Nice to meet you (Mucho gusto) se responde igual: Nice to meet you too. Practícalo con tu propio nombre y país hasta que salga solo.",
          ],
          example: { title: "Diálogo modelo", text: "A: Hello! My name is Ana. I am from Colombia. B: Hi, Ana! My name is John. Nice to meet you. A: Nice to meet you too." },
          exercise: { title: "Ejercicio", text: "Escribe tu presentación de 3 frases y léela en voz alta 5 veces. Luego cámbiale el país a 3 distintos." },
        },
      ],
      takeaways: ["Hello/Hi para casi todo; morning/afternoon/evening según la hora", "My name is + I am from te presentan al mundo", "Practica con tu nombre real hasta automatizarlo"],
    },
    {
      title: "Números, días y tiempo",
      summary: "Contar del 0 al 100, días de la semana y decir la hora.",
      intro: [
        "Los números abren puertas: precios, teléfonos, direcciones y horarios. Del 0 al 20 se memorizan; del 20 en adelante hay sistema.",
        "Los días y la hora completan lo esencial para citas: Monday a Sunday, y la hora con o'clock en punto o twenty past / to para minutos.",
      ],
      sections: [
        {
          title: "Números",
          paragraphs: [
            "Base: zero a twenty (0-20) de memoria, con atención a thirteen/fifteen (acento en -teen) vs thirty/fifty (acento al inicio). Del 21 en adelante se combinan: twenty-one, thirty-five.",
            "Decenas: twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety. Cien es a hundred. Para teléfonos, di dígito por dígito: 555-0134 es five five five zero one three four.",
          ],
          table: { title: "Trampas comunes", headers: ["Par", "Diferencia"], rows: [["thirteen / thirty", "Acento: thirTEEN vs THIRty"], ["fifteen / fifty", "Acento: fifTEEN vs FIFty"], ["forty", "Se escribe sin u: forty, no fourty"]] },
        },
        {
          title: "Días y hora",
          paragraphs: [
            "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday. Se escriben con mayúscula y llevan on: on Monday (el lunes).",
            "Hora: It's three o'clock (Son las 3). Minutos pasados: twenty past three (3:20). Para llegar: twenty to four (3:40). AM de mañana, PM de tarde/noche.",
          ],
          exercise: { title: "Ejercicio", text: "Escribe tu número de teléfono en inglés dígito por dígito y la hora actual de 3 formas distintas." },
        },
      ],
      takeaways: ["Memoriza 0-20 y el sistema de decenas", "thirteen/thirty se distinguen por el acento", "Días con mayúscula y on; hora con o'clock, past y to"],
    },
    {
      title: "Colores y objetos cotidianos",
      summary: "Nombrar colores, ropa y objetos del aula y la casa.",
      intro: [
        "Describir lo que ves es el puente entre palabras sueltas y frases. Con 10 colores y 15 objetos ya puedes jugar a señalar y nombrar todo tu entorno.",
        "La estructura This is a... (Esto es un/una...) convierte vocabulario en oraciones desde el primer día.",
      ],
      sections: [
        {
          title: "Colores",
          paragraphs: [
            "Red, blue, green, yellow, black, white, orange, pink, brown, gray. Frase modelo: My favorite color is blue.",
            "Juego: mira alrededor y nombra 10 cosas con su color: a red book, a blue chair. Si no sabes el objeto, anótalo en español para buscarlo.",
          ],
          list: { style: "bullets", items: ["red (rojo), blue (azul), green (verde)", "yellow (amarillo), black (negro), white (blanco)", "orange, pink, brown, gray"] },
        },
        {
          title: "Objetos",
          paragraphs: [
            "Aula: book, pen, table, chair, door, window. Casa: bed, kitchen, bathroom. Recuerda a/an: a book, an apple (an antes de vocal).",
            "Plurales simples: agrega -s (books, chairs). Los irregulares comunes vendrán después; por ahora comunica con -s.",
          ],
          example: { title: "Minidiálogo", text: "A: What is this? B: This is a pen. A: What color is it? B: It is blue." },
          exercise: { title: "Ejercicio", text: "Etiqueta 15 objetos de tu casa con papelitos en inglés. Quítalos cuando los digas sin dudar." },
        },
      ],
      takeaways: ["This is a... convierte palabras en frases", "a/an depende del sonido inicial", "Etiquetar tu casa acelera la memoria"],
    },
    {
      title: "Gramática mínima: el verbo to be",
      summary: "El único verbo que necesitas esta semana: I am, you are, he/she/it is.",
      intro: [
        "El verbo to be (ser/estar) aparece en casi cada frase básica: quién eres, de dónde eres, cómo estás. Dominarlo es el 50% de la gramática inicial.",
        "Formas: I am, you are, he/she/it is, we are, they are. Negativo con not: I am not, he is not (isn't). Pregunta invirtiendo: Are you...? Is he...?",
      ],
      sections: [
        {
          title: "Afirmativo, negativo y pregunta",
          paragraphs: [
            "Afirmativo: She is a doctor (Ella es doctora). Negativo: They are not ready (No están listos). Pregunta: Are you tired? (¿Estás cansado?).",
            "Contracciones (obligatorias al hablar): I'm, you're, he's, she's, it's, we're, they're, isn't, aren't.",
          ],
          table: { title: "Tabla to be", headers: ["Persona", "Afirmativo", "Negativo"], rows: [["I", "am", "am not"], ["you/we/they", "are", "are not (aren't)"], ["he/she/it", "is", "is not (isn't)"]] },
        },
        {
          title: "Errores típicos",
          paragraphs: [
            "No digas I am have 20 years: la edad es I am 20 (years old). No omitas el verbo: She happy está mal; She is happy está bien.",
            "Practica transformando: afirmativa a negativa y a pregunta, en voz alta, 10 frases por día.",
          ],
          exercise: { title: "Ejercicio", text: "Escribe 5 frases sobre ti con am/is/are, pásalas a negativo y a pregunta." },
        },
      ],
      takeaways: ["am/is/are según la persona", "Habla con contracciones desde ya", "Edad y estados usan to be, no have"],
    },
    {
      title: "Frases para situaciones reales",
      summary: "Pedir ayuda, agradecer, comprar y orientarte.",
      intro: [
        "Con 15 frases memorizadas sobrevives un viaje: pedir ayuda, precios, direcciones y agradecer. Este capítulo es tu kit de emergencia.",
        "Memoriza por situación, no en lista: imagina la escena completa cada vez que repites.",
      ],
      sections: [
        {
          title: "El kit de 15",
          paragraphs: [
            "Ayuda: Can you help me, please? / I don't understand. / Do you speak Spanish? Compras: How much is it? / I'll take it. Orientación: Where is...? / Is it far?",
            "Cortesía: Please, Thank you, You're welcome, Excuse me (para llamar la atención o disculparse).",
          ],
          list: { style: "numbers", items: ["Can you help me, please?", "How much is it?", "Where is the bathroom?", "I don't understand", "Thank you very much"] },
        },
        {
          title: "Cómo memorizarlas",
          paragraphs: [
            "Repasa 5 por día actuándolas: pide de verdad un café imaginario en voz alta. Al tercer día, las 15 salen sin pensar.",
            "Anota las que más uses en una tarjeta en tu billetera: tu chuleta legal de emergencia.",
          ],
          quote: { text: "No necesitas muchas palabras. Necesitas las correctas, listas.", author: "Método de esta guía" },
        },
      ],
      takeaways: ["15 frases cubren el 80% de emergencias", "Memoriza actuando la escena", "Lleva tu chuleta en la billetera"],
    },
    {
      title: "Tu plan de práctica de 30 días",
      summary: "Calendario concreto para no abandonar en la semana 2.",
      intro: [
        "La mayoría abandona por falta de plan, no de capacidad. Aquí tienes 30 días en bloques semanales de 20 minutos con repaso incluido.",
        "Marca cada día en el calendario. Dos días seguidos sin estudiar rompen el hábito: si fallas uno, el siguiente es sagrado.",
      ],
      sections: [
        {
          title: "El calendario",
          paragraphs: [
            "Días 1-7: saludos y to be (capítulos 3 y 6). Días 8-14: números y colores con etiquetas en casa (4 y 5). Días 15-21: frases actuadas (7). Días 22-30: mezcla todo y repasa lo marcado como difícil.",
            "Cada sesión: 5 min repaso de ayer, 10 min tema nuevo en voz alta, 5 min ejercicio escrito.",
          ],
          table: { title: "Sesión de 20 minutos", headers: ["Bloque", "Minutos", "Qué"], rows: [["Repaso", "5", "Ayer en voz alta"], ["Nuevo", "10", "Tema del día"], ["Escritura", "5", "Ejercicio del capítulo"]] },
          exercise: { title: "Compromiso", text: "Escribe tus 20 minutos diarios (hora y lugar) y tu premio al día 30. Firmado y fechado." },
        },
      ],
      takeaways: ["20 minutos diarios con estructura 5-10-5", "Nunca dos días seguidos sin estudiar", "El día 30 repasa todo y celebra"],
    },
  ],
  photo: [
    {
      title: "Introducción: la cámara que tienes alcanza",
      summary: "Por qué el equipo no es tu límite y cómo usar esta guía.",
      intro: [
        "La mejor cámara es la que llevas encima. Esta guía está escrita para celulares y cámaras básicas: el 90% de la mejora viene de luz y composición, no de megapíxeles.",
        "Cada capítulo tiene una misión fotográfica concreta. Hazla antes de seguir: la fotografía se aprende disparando, no leyendo.",
      ],
      sections: [
        {
          title: "Cómo usar esta guía",
          paragraphs: [
            "Lee un capítulo, haz su misión el mismo día y quédate con tus 3 mejores fotos. Al final tendrás un mini-portafolio de 21 fotos.",
            "Borra sin culpa: los profesionales descartan el 90%. Quedarse con todo impide ver el progreso.",
          ],
          list: { style: "numbers", items: ["Lee el capítulo", "Haz la misión el mismo día", "Elige tus 3 mejores", "Compara con la semana anterior"] },
        },
      ],
      takeaways: ["Luz y composición superan al equipo", "Una misión por capítulo, el mismo día", "Descarta el 90% sin culpa"],
    },
    {
      title: "Conoce tu cámara",
      summary: "Los 4 ajustes que importan y el modo que debes usar.",
      intro: [
        "Solo necesitas entender cuatro cosas: enfoque (dónde está nítido), exposición (qué tan clara sale), zoom (acércate con los pies, no con el dedo) y ráfaga (varias fotos para elegir).",
        "Usa el modo automático o retrato por ahora. El modo manual puede esperar al capítulo 6; primero aprende a ver.",
      ],
      sections: [
        {
          title: "Enfoque y exposición",
          paragraphs: [
            "Toca la pantalla sobre tu sujeto para enfocar y ajustar la luz. Si sale muy clara u oscura, desliza el dedo (el solcito) hasta que se vea bien.",
            "Limpia la lente con tu remera antes de cada sesión: la mitad de las fotos borrosas son suciedad, no técnica.",
          ],
          tip: { title: "Truco", text: "Mantén presionado para bloquear enfoque y exposición, recomponé la escena y dispara." },
          exercise: { title: "Misión", text: "Fotografía el mismo objeto tocando 5 puntos de enfoque distintos. Elige el mejor y explica por qué." },
        },
      ],
      takeaways: ["Toca para enfocar, desliza para exponer", "Limpia la lente siempre", "Acércate con los pies"],
    },
    {
      title: "La luz lo es todo",
      summary: "Hora dorada, luz dura y cómo usar la ventana.",
      intro: [
        "La misma escena con distinta luz son dos fotos distintas. La luz suave y lateral embellece; la luz dura del mediodía crea sombras feas.",
        "Tus dos mejores amigas: la hora dorada (primera y última hora del día) y una ventana grande en interiores.",
      ],
      sections: [
        {
          title: "Dónde está la buena luz",
          paragraphs: [
            "Afuera: temprano o al atardecer, con el sol de costado o detrás para siluetas. Evita el mediodía; si no queda otra, busca sombra completa.",
            "Adentro: pon a la persona de costado a una ventana, apaga las luces amarillas del techo y evita el flash directo siempre que puedas.",
          ],
          list: { style: "bullets", items: ["Hora dorada: primera y última hora", "Ventana lateral en interiores", "Sombra completa al mediodía", "Flash directo: último recurso"] },
          example: { title: "Prueba", text: "Fotografía a alguien a las 13:00 y a las 18:30 en el mismo lugar. Compara sombras en la cara: la diferencia te convence para siempre." },
        },
      ],
      takeaways: ["Luz lateral y suave favorece", "Mediodía: sombra o nada", "La ventana es tu estudio gratis"],
    },
    {
      title: "Composición",
      summary: "Regla de tercios, líneas y fondos limpios.",
      intro: [
        "Componer es decidir qué entra, qué sale y dónde va cada cosa. Tres herramientas bastan para que tus fotos parezcan profesionales.",
        "Activa la cuadrícula en los ajustes de tu cámara: es gratis y lo cambia todo.",
      ],
      sections: [
        {
          title: "Las tres herramientas",
          paragraphs: [
            "Tercios: coloca el sujeto en un cruce de líneas, no al centro. Líneas: usa calles, barandas o ríos para guiar la vista. Fondo: agáchate o muévete hasta que el fondo no distraiga.",
            "Deja aire hacia donde mira la persona. Una foto respira cuando el sujeto tiene espacio.",
          ],
          exercise: { title: "Misión", text: "Haz 10 fotos del mismo sujeto cambiando ángulo y fondo. Quédate con 2 y anota qué regla aplicó." },
        },
      ],
      takeaways: ["Sujeto en los tercios, no al centro", "Guía la vista con líneas", "El fondo limpio es media foto"],
    },
    {
      title: "Retratos que gustan",
      summary: "Cómo hacer que la gente salga bien y relajada.",
      intro: [
        "A nadie le gusta cómo sale parado tieso. Los buenos retratos nacen de conversación, luz suave y ráfaga, no de poses forzadas.",
        "Habla mientras disparas: haz preguntas y dispara cuando se ríen de verdad. Esos 2 segundos son la foto.",
      ],
      sections: [
        {
          title: "Dirección simple",
          paragraphs: [
            "Pide hombros a 45 grados y mentón levemente hacia la cámara. Manos ocupadas (bolsillos, taza) evitan brazos tiesos.",
            "Dispara en ráfaga los momentos de risa y elige después. Diez fotos para una buena es normal.",
          ],
          tip: { title: "Fondo", text: "Un fondo simple y lejos del sujeto (modo retrato) hace todo el trabajo." },
        },
      ],
      takeaways: ["Conversación + ráfaga = naturalidad", "Hombros a 45°, mentón a cámara", "El fondo simple hace el trabajo"],
    },
    {
      title: "Edición básica",
      summary: "Endereza, recorta y ajusta luz en 2 minutos.",
      intro: [
        "Editar no es trucar: es terminar la foto. Con 4 ajustes (enderezar, recortar, luz, color) cualquier foto mejora sin verse falsa.",
        "Usa la app gratuita que ya trae tu celular. Los presets de otros sirven de punto de partida, nunca de destino.",
      ],
      sections: [
        {
          title: "Flujo de 2 minutos",
          paragraphs: [
            "Endereza el horizonte, recorta distracciones de los bordes, sube sombras un poco y baja altas luces si el cielo se quemó. Menos es más: si se nota el filtro, te pasaste.",
            "Edita siempre sobre copia y compara antes/después. Si no mejora claramente, deshaz.",
          ],
          list: { style: "numbers", items: ["Enderezar horizonte", "Recortar bordes", "Sombras arriba, altas abajo", "Comparar y deshacer si empeora"] },
        },
      ],
      takeaways: ["4 ajustes bastan", "Si se nota el filtro, te pasaste", "Trabaja sobre copia"],
    },
    {
      title: "Proyecto de 7 días",
      summary: "Un tema por día para consolidar todo.",
      intro: [
        "Una foto diaria con tema fijo durante una semana fija más que un mes de teoría. Al final elige tus 7 y ordénalas: ese es tu primer portafolio.",
        "Comparte una por día con alguien que te dé opinión honesta, no likes automáticos.",
      ],
      sections: [
        {
          title: "El calendario",
          paragraphs: [
            "Día 1 luz de ventana, día 2 tercios, día 3 fondo limpio, día 4 retrato con conversación, día 5 hora dorada, día 6 edición comparada, día 7 tu favorita repetida mejor.",
          ],
          exercise: { title: "Cierre", text: "Imprime (en papel o PDF) tus 7 fotos con una línea sobre qué aprendiste en cada una. Guárdalas un año." },
        },
      ],
      takeaways: ["Un tema diario durante 7 días", "Opinión honesta supera a likes", "Tu portafolio empieza con 7 fotos"],
    },
  ],
  running: [
    {
      title: "Introducción: de cero a 5K",
      summary: "El plan, las reglas de seguridad y qué necesitas (casi nada).",
      intro: [
        "Correr 5 kilómetros seguidos es un objetivo perfecto para empezar: ambicioso pero alcanzable en 8 semanas caminando y trotando por intervalos.",
        "Necesitas zapatillas cómodas (no necesariamente caras), ropa que no roce y un lugar seguro y plano. Lo demás es opcional.",
      ],
      sections: [
        {
          title: "Reglas de oro",
          paragraphs: [
            "Habla con tu médico si tienes más de 40, sobrepeso importante o dolores crónicos. El dolor agudo no se entrena: se para y se consulta.",
            "Progresión 10%: no subas más del 10% tu tiempo semanal. El cuerpo se adapta; los tendones tardan más que los pulmones.",
          ],
          list: { style: "bullets", items: ["Chequeo médico si corresponde", "Dolor agudo = parar", "Subir 10% por semana como máximo", "Un día de descanso entre sesiones al inicio"] },
          warning: { title: "Importante", text: "Esta guía es educativa, no un plan médico. Escucha a tu cuerpo y a tu profesional de salud." },
        },
      ],
      takeaways: ["5K en 8 semanas con intervalos", "10% de progresión semanal", "El dolor agudo siempre para"],
    },
    {
      title: "Base aeróbica sin lesionarte",
      summary: "Caminar-trotar: el método que funciona para todos.",
      intro: [
        "Nadie empieza corriendo 30 minutos. El método caminar-trotar alterna esfuerzos cortos con recuperación y construye base sin fundirte.",
        "La intensidad correcta: puedes decir una frase corta sin jadear (prueba del habla). Si no puedes, camina: no es retroceder, es entrenar bien.",
      ],
      sections: [
        {
          title: "Tu primera semana",
          paragraphs: [
            "Tres sesiones: 5 min caminata + 8 rondas de (1 min trote suave + 2 min caminata) + 5 min caminata. Total 34 minutos.",
            "Trote suave significa que podrías seguir: si terminas destruido, la próxima baja el ritmo, no el tiempo.",
          ],
          tip: { title: "Ritmo", text: "Corre a un ritmo que te permita sonreír para la foto. La velocidad llegará sola." },
        },
      ],
      takeaways: ["Alterna trote y caminata desde el día 1", "Prueba del habla para regularte", "Termina pudiendo más, no fundido"],
    },
    {
      title: "El plan de 8 semanas",
      summary: "Semana por semana hasta correr 30 minutos seguidos.",
      intro: [
        "Cada semana alarga el trote y acorta la caminata. Si una semana se te hace dura, repítela: repetir no es fracasar, es consolidar.",
        "Tres sesiones semanales con un día de descanso entre ellas. Los otros días, camina 20-30 minutos si quieres moverte.",
      ],
      sections: [
        {
          title: "El calendario",
          paragraphs: [
            "Semanas 1-2: intervalos 1'/2'. Semanas 3-4: 2'/2' y luego 3'/1'. Semanas 5-6: 5'/1' y 8'/2'. Semana 7: 15' + 10' con 2' caminando. Semana 8: 25' y luego 30' seguidos: tus 5K.",
          ],
          table: { title: "Resumen del plan", headers: ["Semanas", "Trote", "Caminata"], rows: [["1-2", "1 min", "2 min"], ["3-4", "2-3 min", "2-1 min"], ["5-6", "5-8 min", "1-2 min"], ["7", "15 + 10 min", "2 min en medio"], ["8", "25 y 30 min", "—"]] },
          exercise: { title: "Registro", text: "Anota cada sesión: minutos, sensaciones del 1 al 10 y cualquier molestia. El registro predice lesiones." },
        },
      ],
      takeaways: ["3 sesiones semanales con descanso", "Si cuesta, repite la semana", "Semana 8: 30 minutos seguidos"],
    },
    {
      title: "Técnica de carrera",
      summary: "Postura, cadencia y respiración sin complicarte.",
      intro: [
        "No necesitas técnica de atleta, pero tres ajustes evitan lesiones y cansancio: postura alta, pasos cortos y respiración rítmica.",
        "Piensa en correr silencioso: si tus pisadas se escuchan mucho, estás cayendo duro. Aterriza suave bajo tu cuerpo.",
      ],
      sections: [
        {
          title: "Los tres ajustes",
          paragraphs: [
            "Postura: mira al frente (no a tus pies), hombros sueltos, brazos a 90 grados sin cruzar. Cadencia: pasos cortos y frecuentes mejor que zancadas largas.",
            "Respiración: inhala 3 pasos, exhala 2. Si te falta aire, baja el ritmo antes de parar: casi siempre es ritmo, no fondo.",
          ],
          list: { style: "bullets", items: ["Mira al frente, hombros sueltos", "Pasos cortos bajo el cuerpo", "Aterriza suave y silencioso", "Respira 3 pasos dentro, 2 fuera"] },
        },
      ],
      takeaways: ["Corre silencioso", "Pasos cortos, no zancadas", "Falta de aire = baja el ritmo"],
    },
    {
      title: "Nutrición e hidratación",
      summary: "Come normal, hidrátate siempre y cena pensando en mañana.",
      intro: [
        "Para 30-40 minutos no necesitas geles ni dietas raras: comida normal, agua siempre a mano y una colación liviana 1-2 horas antes.",
        "Después: agua más algo con proteína y carbohidratos en la hora siguiente (yogur con fruta, sándwich).",
      ],
      sections: [
        {
          title: "Antes, durante y después",
          paragraphs: [
            "Antes: banana, tostada o yogur 1-2 h antes; nada nuevo ni pesado el día de fondo largo. Durante: agua en sesiones de más de 30 min o con calor.",
            "Evita estrenar zapatillas, ropa o comidas el día de tu mejor marca o carrera: lo nuevo se prueba entrenando.",
          ],
          tip: { title: "Hidratación", text: "Orina clara = bien hidratado. Lleva agua siempre que haga calor, aunque sean 20 minutos." },
        },
      ],
      takeaways: ["Comida normal + agua", "Liviano 1-2 h antes", "Nada nuevo el día importante"],
    },
    {
      title: "Lesiones: prevenir y actuar",
      summary: "Las 3 molestias típicas y el protocolo ante dolor.",
      intro: [
        "Casi todas las lesiones del principiante vienen de lo mismo: demasiado, muy rápido, muy pronto. La prevención es el plan, el descanso y la fuerza básica.",
        "Molestias típicas: periostitis (espinillas), rodilla del corredor y fascitis (planta del pie al levantarse). Todas piden lo mismo al inicio: bajar carga.",
      ],
      sections: [
        {
          title: "Protocolo RICE adaptado",
          paragraphs: [
            "Ante dolor agudo: para, hielo 15 min, compresión suave y elevación. Si duele al caminar al día siguiente, descansa 3-5 días y consulta.",
            "Prevención semanal: 2 sesiones de 15 min de sentadillas, estocadas, plancha y gemelos. El músculo protege a la articulación.",
          ],
          warning: { title: "Señales de alarma", text: "Dolor que aumenta al correr, cojera, hinchazón o dolor nocturno: consulta profesional sin demora." },
        },
      ],
      takeaways: ["Carga progresiva = prevención", "Dolor agudo: para, hielo, consulta", "Fuerza 2 veces por semana"],
    },
    {
      title: "El día de la carrera",
      summary: "Logística, estrategia y disfrute de tus primeros 5K.",
      intro: [
        "Llegaste: corres 30 minutos seguidos. El día de la carrera (oficial o tu propio test) se gana con logística tranquila y salida conservadora.",
        "Estrategia: primera mitad cómoda (puedes hablar), segunda mitad progresiva. Los que salen a todo gas caminan al km 3; tú los pasarás.",
      ],
      sections: [
        {
          title: "Checklist del día",
          paragraphs: [
            "Noche anterior: ropa lista, chip/dorsal si hay, desayuno probado. Llega 45 min antes: baño, trote suave 10 min y 3 progresiones cortas.",
            "Durante: nada nuevo, hidrátate en puestos sin parar del todo, y guarda energía para el último kilómetro: es el que recordarás.",
          ],
          list: { style: "numbers", items: ["Ropa y desayuno probados", "Llegar 45 min antes", "Trote suave + progresiones", "Salir cómodo, cerrar fuerte", "Festejar y registrar tu marca"] },
          quote: { text: "No corres contra nadie. Corres contra el que no podía correr 1 minuto hace 8 semanas.", author: "Para leer en el km 4" },
        },
      ],
      takeaways: ["Logística la noche anterior", "Primera mitad cómoda", "Registra tu marca y elige el próximo objetivo"],
    },
  ],
};
function pdfChaptersFor(key: PdfTopicKey, topic: string): PdfChapterSource[] {
  if (key === "generic") return fallbackPdfChapters(topic);
  return PDF_CHAPTERS[key];
}

function fallbackPdfChapters(topic: string): PdfChapterSource[] {
  return [
    {
      title: `Introducción a ${topic}`,
      summary: `Qué es ${topic} y cómo aprovechar esta guía.`,
      intro: [
        `Esta guía práctica sobre ${topic} está escrita para empezar desde cero: sin jerga innecesaria y con acciones concretas al final de cada capítulo.`,
        `Te recomiendo leerla en orden y aplicar cada ejercicio antes de seguir. El aprendizaje real ocurre cuando haces, no cuando lees.`,
      ],
      sections: [
        {
          title: "Cómo usar esta guía",
          paragraphs: [
            `Cada capítulo de ${topic} sigue la misma estructura: explicación, ejemplo y ejercicio. Así siempre sabes dónde estás y qué hacer.`,
            `Reserva sesiones cortas y regulares en lugar de maratones esporádicos: la constancia supera a la intensidad.`,
          ],
          list: { style: "numbers", items: ["Lee un capítulo", "Haz su ejercicio el mismo día", "Marca tu avance antes de seguir"] },
        },
      ],
      takeaways: [`${topic} se aprende haciendo`, "Sesiones cortas y regulares", "Un ejercicio por capítulo como mínimo"],
    },
    {
      title: `Fundamentos de ${topic}`,
      summary: `Los conceptos base de ${topic} sin los cuales nada funciona.`,
      intro: [
        `Antes de correr hay que caminar: estos fundamentos de ${topic} son los que separan a quien avanza de quien se frustra.`,
        `No los saltees aunque parezcan obvios: la mayoría de los errores caros vienen de bases flojas.`,
      ],
      sections: [
        {
          title: "Los 3 pilares",
          paragraphs: [
            `Todo ${topic} se sostiene en tres pilares: entender el porqué, dominar lo básico y practicar con feedback.`,
            `Si alguno falla, el avance se estanca: identifica cuál es tu eslabón débil y dedícale la próxima semana.`,
          ],
          list: { style: "bullets", items: ["Entender el porqué antes del cómo", "Dominar lo básico sin atajos", "Practicar con feedback real"] },
          tip: { title: "Diagnóstico", text: `Cuando te estanques en ${topic}, vuelve a este capítulo: el problema casi siempre está aquí.` },
        },
      ],
      takeaways: ["Porqué, básico y práctica: los 3 pilares", "Las bases flojas causan errores caros", "Diagnostica tu eslabón débil"],
    },
    {
      title: `Práctica guiada de ${topic}`,
      summary: `Ejercicios concretos de ${topic} con criterios claros.`,
      intro: [
        `La teoría sin práctica se olvida en días. Esta es la sección más importante de la guía: aquí conviertes ${topic} en habilidad.`,
        `Haz cada ejercicio con lápiz y papel (o archivo) y guarda tus respuestas: serán tu registro de progreso.`,
      ],
      sections: [
        {
          title: "Ejercicios esenciales",
          paragraphs: [
            `Completa estos ejercicios de ${topic} en orden y sin mirar las soluciones antes de intentarlo en serio.`,
          ],
          list: { style: "numbers", items: [`Describe con tus palabras qué es ${topic}`, `Aplica ${topic} a un caso de tu vida real`, `Identifica tus 3 errores más frecuentes`, `Repite el ejercicio más difícil una semana después`] },
          exercise: { title: "Práctica", text: `Elige un caso real de tu vida y aplica ${topic} paso a paso. Anota qué funcionó y qué ajustarías.` },
        },
      ],
      takeaways: ["Practica antes de seguir leyendo", "Guarda tus respuestas como registro", "Repite lo difícil una semana después"],
    },
    {
      title: `Errores comunes en ${topic}`,
      summary: `Lo que hace tropezar a casi todos y cómo evitarlo.`,
      intro: [
        `Conocer los errores típicos de ${topic} te ahorra meses: otros ya los pagaron por ti.`,
        `Lee esta lista con honestidad y marca los que reconozcas en ti: esos son tu plan de mejora.`,
      ],
      sections: [
        {
          title: "Los 4 errores clásicos",
          paragraphs: [
            `Error 1: querer avanzar sin dominar lo básico. Error 2: practicar sin feedback. Error 3: compararse con expertos. Error 4: abandonar en la meseta del progreso lento.`,
          ],
          example: { title: "Caso", text: `Martín estudió ${topic} 3 meses sin practicar y se frustró. Cuando retomó con ejercicios diarios de 20 minutos, avanzó más en 3 semanas que en todo lo anterior.` },
        },
      ],
      takeaways: ["Bases, feedback, comparación sana y paciencia", "La meseta es normal: se cruza practicando", "Marca tus errores y revísalos mensualmente"],
    },
    {
      title: `Tu plan de acción de ${topic}`,
      summary: `Calendario de 30 días para consolidar ${topic}.`,
      intro: [
        `Sin plan, esta guía es información; con plan, es transformación. Aquí conviertes todo lo aprendido de ${topic} en 30 días de acción.`,
        `Una hora diaria como máximo: mejor poco sostenible que mucho abandonado.`,
      ],
      sections: [
        {
          title: "Semana por semana",
          paragraphs: [
            `Semana 1: repasa fundamentos y completa los ejercicios pendientes. Semana 2: aplica ${topic} a 3 casos reales.`,
            `Semana 3: busca feedback externo. Semana 4: mide tu avance contra el día 1 y define el siguiente nivel.`,
          ],
          exercise: { title: "Compromiso", text: `Escribe tu meta de 30 días con ${topic} en una frase con número y fecha, y pégala donde trabajas.` },
        },
      ],
      takeaways: ["30 días, sesiones cortas", "Aplica, pide feedback, mide", "Define tu siguiente nivel al cerrar"],
    },
  ];
}

function validatePdfDeterministic(
  context: PdfGenerationContext,
  product: { blueprint: PdfBlueprint; chapters: PdfChapter[]; exportInfo?: { pageCount: number; byteSize: number } | null }
): PdfQualityValidation {
  const issues: PdfQualityValidation["issues"] = [];
  const chapters = product.chapters;
  const blueprint = product.blueprint;

  // CONTENT 30
  let contentScore = 30;
  const words = countPdfWords(chapters);
  const chaptersOk = chapters.filter(
    (c) =>
      c.title.trim().length > 0 &&
      c.introduction.trim().length >= 100 &&
      c.sections.length > 0 &&
      c.sections.every((s) => s.blocks.length >= 2)
  ).length;
  if (chaptersOk < chapters.length) {
    contentScore -= (chapters.length - chaptersOk) * 4;
    issues.push({ category: "content", severity: "high", description: `${chapters.length - chaptersOk} capítulo(s) con contenido incompleto`, suggestion: "Regenerar los capítulos incompletos" });
  }
  if (words < 1500) {
    contentScore -= 8;
    issues.push({ category: "content", severity: "medium", description: "Contenido total por debajo del mínimo", suggestion: "Desarrollar más cada capítulo" });
  }
  const haystack = chapters.map((c) => `${c.title} ${c.introduction} ${c.sections.map((s) => s.blocks.map(blockText).join(" ")).join(" ")}`).join(" ").toLowerCase();
  const placeholder = PDF_PLACEHOLDERS.find((p) => haystack.includes(p));
  if (placeholder) {
    contentScore -= 15;
    issues.push({ category: "content", severity: "high", description: `Placeholder detectado ("${placeholder}")`, suggestion: "Reemplazar por contenido real del tema" });
  }
  contentScore = Math.max(0, contentScore);

  // STRUCTURE 20
  let structureScore = 20;
  if (!blueprint.title.trim() || !blueprint.description.trim()) {
    structureScore -= 8;
    issues.push({ category: "structure", severity: "high", description: "Título o descripción inválidos", suggestion: "Generar desde la idea original" });
  }
  if (chapters.length < 5) {
    structureScore -= 8;
    issues.push({ category: "structure", severity: "high", description: `Solo ${chapters.length} capítulos (mínimo 5)`, suggestion: "Generar todos los capítulos del blueprint" });
  }
  chapters.forEach((c, i) => {
    if (c.order !== i + 1) structureScore -= 1;
  });
  structureScore = Math.max(0, structureScore);

  // DESIGN 20
  let designScore = 20;
  const b = blueprint.branding;
  const hex = /^#([0-9a-f]{6})$/i;
  if (![b.primaryColor, b.secondaryColor, b.backgroundColor, b.textColor, b.accentColor].every((v) => hex.test(v))) {
    designScore -= 8;
    issues.push({ category: "design", severity: "medium", description: "Colores de branding inválidos", suggestion: "Usar colores hex válidos" });
  }
  if (!b.fontFamily.trim() || !b.headingFont.trim() || !b.bodyFont.trim()) {
    designScore -= 4;
    issues.push({ category: "design", severity: "low", description: "Tipografías incompletas", suggestion: "Definir fuentes de títulos y cuerpo" });
  }
  if (!blueprint.cover.title.trim() || !blueprint.cover.author.trim()) {
    designScore -= 8;
    issues.push({ category: "design", severity: "high", description: "Portada incompleta", suggestion: "Definir título y autor de portada" });
  }
  designScore = Math.max(0, designScore);

  // COMPLETENESS 20
  let completenessScore = 20;
  if (!blueprint.cover.subtitle.trim()) {
    completenessScore -= 5;
    issues.push({ category: "completeness", severity: "low", description: "Falta el subtítulo de portada", suggestion: "Agregar subtítulo" });
  }
  if (chapters.length !== blueprint.chapters.length) {
    completenessScore -= 10;
    issues.push({ category: "completeness", severity: "high", description: "Faltan capítulos del blueprint", suggestion: "Generar los capítulos restantes" });
  }
  const emptyBlocks = chapters.flatMap((c) => c.sections.flatMap((s) => s.blocks)).filter((blk) => blockText(blk).trim().length === 0 && blk.type !== "divider").length;
  if (emptyBlocks > 0) {
    completenessScore -= Math.min(10, emptyBlocks * 2);
    issues.push({ category: "completeness", severity: "medium", description: `${emptyBlocks} bloque(s) vacíos`, suggestion: "Completar o eliminar bloques vacíos" });
  }
  // Imágenes (Image Engine): solo actúan si el producto tiene bloques imagen.
  const imageBlocks = chapters.flatMap((c) => c.sections.flatMap((s) => s.blocks)).filter((blk) => blk.type === "image");
  const sourceless = imageBlocks.filter((blk) => blk.type === "image" && !blk.vector && !blk.src.trim()).length;
  if (sourceless > 0) {
    completenessScore -= Math.min(10, sourceless * 5);
    issues.push({ category: "completeness", severity: "high", description: `${sourceless} imagen(es) sin fuente (ni vector ni URL)`, suggestion: "Generar la imagen o definir una URL real" });
  }
  const noAlt = imageBlocks.filter((blk) => blk.type === "image" && !blk.alt.trim()).length;
  if (noAlt > 0) {
    completenessScore -= Math.min(6, noAlt * 2);
    issues.push({ category: "completeness", severity: "medium", description: `${noAlt} imagen(es) sin texto alternativo`, suggestion: "Agregar alt text descriptivo" });
  }
  completenessScore = Math.max(0, completenessScore);

  // EXPORT 10
  let exportScore = 0;
  if (product.exportInfo && product.exportInfo.pageCount > 0 && product.exportInfo.byteSize > 0) {
    exportScore = 10;
  } else {
    issues.push({ category: "export", severity: "high", description: "PDF no generado o vacío", suggestion: "Generar el archivo PDF real" });
  }

  const totalScore = contentScore + structureScore + designScore + completenessScore + exportScore;
  const passed =
    totalScore >= 70 &&
    issues.filter((i) => i.severity === "high").length === 0 &&
    !placeholder &&
    exportScore === 10;

  const recommendations = [
    "Verificar que cada capítulo cierre con sus puntos clave",
    "Probar la descarga y apertura del PDF en otro dispositivo",
    "Revisar el índice tras editar capítulos",
  ];

  return { contentScore, structureScore, designScore, completenessScore, exportScore, totalScore, passed, issues, recommendations };
}

// ============================================
// KIT DE RECURSOS - CONTENIDO MOCK ESPECÍFICO
// ============================================

type KitTopicKey = "ai-business" | "content" | "generic";

function kitTopicKey(topic: string): KitTopicKey {
  const t = topic.toLowerCase();
  if (t.includes("ia para emprendedores")) return "ai-business";
  if (t.includes("contenido")) return "content";
  return "generic";
}

function kitBranding(): KitBlueprint["branding"] {
  return {
    preset: "modern",
    primaryColor: "#7c3aed",
    secondaryColor: "#a855f7",
    backgroundColor: "#ffffff",
    surfaceColor: "#f5f0ff",
    textColor: "#18181b",
    mutedColor: "#71717a",
    accentColor: "#06b6d4",
  };
}

function aiBusinessKitBlueprint(spec: KitSpecification): KitBlueprint {
  const folders: KitFolder[] = [
    { id: "f-guias", name: "01 — Guías", order: 1 },
    { id: "f-check", name: "02 — Checklists", order: 2 },
    { id: "f-plant", name: "03 — Plantillas", order: 3 },
    { id: "f-prompts", name: "04 — Prompts", order: 4 },
    { id: "f-work", name: "05 — Workbook", order: 5 },
  ];
  return {
    name: "AI Business Starter",
    subtitle: "El sistema de IA para conseguir clientes sin equipo",
    audience: spec.audience,
    goal: spec.goal,
    promise: "En 7 días tendrás un sistema funcionando: contenido semanal, mensajes que venden y 80 prompts listos.",
    level: spec.level,
    folders,
    resources: [
      { id: "r-guia-rapida", title: "Guía rápida de IA para emprendedores", kind: "guide", folderId: "f-guias", formats: ["pdf"], summary: "Qué herramientas usar y cómo empezar hoy." },
      { id: "r-primeros-pasos", title: "Guía de primeros pasos con IA", kind: "guide", folderId: "f-guias", formats: ["pdf"], summary: "Tu primera semana con IA, día por día." },
      { id: "r-check-lanzamiento", title: "Checklist de lanzamiento con IA", kind: "checklist", folderId: "f-check", formats: ["pdf"], summary: "Todo verificado antes de publicar tu oferta." },
      { id: "r-check-contenido", title: "Checklist de contenido semanal", kind: "checklist", folderId: "f-check", formats: ["pdf"], summary: "El control de calidad de cada publicación." },
      { id: "r-plant-plan", title: "Plantilla de planificación semanal", kind: "template", folderId: "f-plant", formats: ["pdf", "xlsx"], summary: "Organiza tu semana de contenido y ventas." },
      { id: "r-plant-estrategia", title: "Plantilla de estrategia de clientes", kind: "template", folderId: "f-plant", formats: ["pdf"], summary: "Define cliente, oferta y canal en una página." },
      { id: "r-prompts-mkt", title: "50 prompts de marketing con IA", kind: "prompts", folderId: "f-prompts", formats: ["pdf", "txt"], summary: "50 prompts listos para contenido y anuncios." },
      { id: "r-prompts-ventas", title: "30 prompts de ventas con IA", kind: "prompts", folderId: "f-prompts", formats: ["pdf", "txt"], summary: "30 prompts para mensajes y cierres." },
      { id: "r-workbook", title: "Workbook de implementación en 7 días", kind: "workbook", folderId: "f-work", formats: ["pdf"], summary: "Un ejercicio por día hasta tener el sistema andando." },
    ],
    branding: kitBranding(),
    coverTitle: "AI Business Starter",
  };
}

function contentKitBlueprint(spec: KitSpecification): KitBlueprint {
  const folders: KitFolder[] = [
    { id: "f-guias", name: "01 — Guías", order: 1 },
    { id: "f-check", name: "02 — Checklists", order: 2 },
    { id: "f-plant", name: "03 — Plantillas", order: 3 },
    { id: "f-prompts", name: "04 — Prompts", order: 4 },
    { id: "f-work", name: "05 — Workbook", order: 5 },
  ];
  return {
    name: "Content System",
    subtitle: "Publica 30 días seguidos sin quedarte sin ideas",
    audience: spec.audience,
    goal: spec.goal,
    promise: "Un sistema de contenido completo: ideas, calendario, prompts y checklist de publicación.",
    level: spec.level,
    folders,
    resources: [
      { id: "c-guia-contenido", title: "Guía del sistema de contenido", kind: "guide", folderId: "f-guias", formats: ["pdf"], summary: "Cómo funciona el sistema de punta a punta." },
      { id: "c-check-publicacion", title: "Checklist de publicación", kind: "checklist", folderId: "f-check", formats: ["pdf"], summary: "Verifica cada publicación antes de subirla." },
      { id: "c-plant-calendario", title: "Calendario de contenido de 30 días", kind: "template", folderId: "f-plant", formats: ["pdf", "xlsx"], summary: "Qué publicar cada día del mes." },
      { id: "c-ideas", title: "100 ideas de publicaciones", kind: "ideas", folderId: "f-plant", formats: ["pdf", "txt"], summary: "100 ideas listas para adaptar a tu nicho." },
      { id: "c-prompts-hooks", title: "40 prompts de hooks con IA", kind: "prompts", folderId: "f-prompts", formats: ["pdf", "txt"], summary: "Inicios que frenan el scroll." },
      { id: "c-banco-cta", title: "Banco de llamados a la acción", kind: "bank", folderId: "f-prompts", formats: ["pdf", "txt"], summary: "CTAs para cada objetivo." },
      { id: "c-workbook", title: "Workbook: tus primeros 30 días", kind: "workbook", folderId: "f-work", formats: ["pdf"], summary: "Implementación guiada día por día." },
    ],
    branding: kitBranding(),
    coverTitle: "Content System",
  };
}

function fallbackKitBlueprint(spec: KitSpecification): KitBlueprint {
  const folders: KitFolder[] = [
    { id: "f-guias", name: "01 — Guías", order: 1 },
    { id: "f-check", name: "02 — Checklists", order: 2 },
    { id: "f-plant", name: "03 — Plantillas", order: 3 },
    { id: "f-prompts", name: "04 — Prompts", order: 4 },
    { id: "f-work", name: "05 — Workbook", order: 5 },
  ];
  const t = spec.topic;
  return {
    name: t,
    subtitle: `Kit práctico de ${t}`,
    audience: spec.audience,
    goal: spec.goal,
    promise: `Todo lo necesario para aplicar ${t} con sistema: guías, checklists, plantillas y prompts.`,
    level: spec.level,
    folders,
    resources: [
      { id: "g-guia-rapida", title: `Guía rápida de ${t}`, kind: "guide", folderId: "f-guias", formats: ["pdf"], summary: `Lo esencial de ${t} en 20 minutos.` },
      { id: "g-checklist", title: `Checklist de ${t}`, kind: "checklist", folderId: "f-check", formats: ["pdf"], summary: `Verifica cada paso de ${t}.` },
      { id: "g-plantilla", title: `Plantilla de ${t}`, kind: "template", folderId: "f-plant", formats: ["pdf", "xlsx"], summary: `Organiza tu trabajo de ${t}.` },
      { id: "g-prompts", title: `25 prompts de ${t}`, kind: "prompts", folderId: "f-prompts", formats: ["pdf", "txt"], summary: `Prompts listos sobre ${t}.` },
      { id: "g-workbook", title: `Workbook de ${t} en 5 días`, kind: "workbook", folderId: "f-work", formats: ["pdf"], summary: `Implementación guiada de ${t}.` },
    ],
    branding: kitBranding(),
    coverTitle: t,
  };
}

function kitBlockId(resId: string, order: number): string {
  return `kitb-${resId}-${order}`;
}

function buildKitResourceBlocks(topicKey: KitTopicKey, resourceId: string, topic: string): PdfContentBlock[] {
  if (topicKey === "ai-business") {
    const built = aiBusinessResource(resourceId);
    if (built) return built;
  }
  if (topicKey === "content") {
    const built = contentResource(resourceId);
    if (built) return built;
  }
  return genericResourceBlocks(resourceId, topic);
}

function aiBusinessResource(resourceId: string): PdfContentBlock[] | null {
  const B = (order: number, block: KitBlockInput): PdfContentBlock =>
    ({ ...block, id: kitBlockId(resourceId, order), order } as PdfContentBlock);
  switch (resourceId) {
    case "r-guia-rapida":
      return [
        B(1, { type: "subheading", text: "Las 3 herramientas que necesitas" }),
        B(2, { type: "paragraph", text: "No necesitas 20 herramientas: un chat de IA para textos, un generador de imágenes para visuales y tu WhatsApp para vender alcanzan para empezar. Todo lo demás es distracción hasta que vendas." }),
        B(3, { type: "bulletList", items: ["Chat de IA: ideas, textos, respuestas a clientes", "Generador de imágenes: portadas y publicaciones", "WhatsApp Business: catálogo, respuestas rápidas y cierre"] }),
        B(4, { type: "subheading", text: "Tu primer día con IA" }),
        B(5, { type: "numberedList", items: ["Describe tu negocio en 3 frases y pide 10 ideas de publicaciones", "Elegí la mejor idea y pedí el texto completo adaptado a tu tono", "Publicá hoy mismo con un llamado a escribirte por mensaje"] }),
        B(6, { type: "tip", title: "Regla", text: "La IA propone, tú decides: revisa cada texto antes de publicar y agrega un detalle real de tu negocio." }),
        B(7, { type: "chapterSummary", points: ["3 herramientas alcanzan", "Publica el primer día", "Revisa siempre antes de publicar"] }),
      ];
    case "r-primeros-pasos":
      return [
        B(1, { type: "subheading", text: "Día 1-2: configura tu base" }),
        B(2, { type: "paragraph", text: "Crea tus cuentas, define tu propuesta en una frase y guarda 3 ejemplos de tu tono (mensajes que ya te funcionaron). La IA copia tu tono solo si se lo muestras." }),
        B(3, { type: "subheading", text: "Día 3-5: primer contenido" }),
        B(4, { type: "paragraph", text: "Genera 5 publicaciones con los prompts de este kit, adapta cada una con un caso real tuyo y programa 3. Responde cada comentario el mismo día." }),
        B(5, { type: "subheading", text: "Día 6-7: primeras ventas" }),
        B(6, { type: "paragraph", text: "Escribe a 10 contactos con un mensaje personalizado generado con IA y adaptado por ti. Ofrece una llamada corta, no un PDF largo." }),
        B(7, { type: "exercise", title: "Compromiso", text: "Agenda tus 7 días con horario fijo de 1 hora. Sin horario no hay sistema." }),
      ];
    case "r-check-lanzamiento":
      return [
        B(1, { type: "checklist", title: "Oferta", items: ["Propuesta en una frase con resultado y plazo", "Precio y forma de pago definidos", "Garantía o prueba clara"] }),
        B(2, { type: "checklist", title: "Visibilidad", items: ["3 publicaciones programadas", "Perfil con contacto visible", "10 mensajes directos enviados"] }),
        B(3, { type: "checklist", title: "Cierre", items: ["Respuestas modelo para 5 objeciones", "Propuesta de 5 líneas lista", "Seguimiento a 48h agendado"] }),
      ];
    case "r-check-contenido":
      return [
        B(1, { type: "paragraph", text: "Usa esta lista cada vez que publiques: primero verifica el contenido, después la forma. Un checklist solo sirve si se usa siempre, sin excepciones." }),
        B(2, { type: "checklist", title: "Antes de publicar", items: ["El gancho se entiende en 3 segundos", "Aporta algo útil o entretiene", "Incluye llamado a la acción", "Sin errores: releído en voz alta"] }),
        B(3, { type: "checklist", title: "Después de publicar", items: ["Respondidos los comentarios del día", "Anotados alcance y mensajes", "Guardada la idea que funcionó para repetirla"] }),
      ];
    case "r-plant-plan":
      return [
        B(1, { type: "paragraph", text: "Completa una fila por día. La columna IA indica qué prompt usar; la de estado se marca al publicar." }),
        B(2, { type: "table", title: "Semana tipo", headers: ["Día", "Tema", "Formato", "Prompt IA", "Estado"], rows: [["Lunes", "Consejo útil", "Carrusel", "Prompt 3", "Pendiente"], ["Miércoles", "Caso real", "Video corto", "Prompt 12", "Pendiente"], ["Viernes", "Oferta", "Imagen + texto", "Prompt 27", "Pendiente"]] }),
        B(3, { type: "tip", title: "Uso", text: "Duplica esta tabla cada domingo y planifica la semana en 30 minutos." }),
      ];
    case "r-plant-estrategia":
      return [
        B(1, { type: "paragraph", text: "Completa cada casilla con frases cortas. Si una casilla te cuesta, ahí está tu tarea de la semana." }),
        B(2, { type: "table", title: "Estrategia en una página", headers: ["Bloque", "Tu respuesta"], rows: [["Cliente ideal", ""], ["Problema que resuelves", ""], ["Resultado que prometes", ""], ["Canal principal", ""], ["Oferta de entrada", ""], ["Meta 30 días", ""]] }),
        B(3, { type: "tip", title: "Cómo llenarla", text: "Hazlo con un cliente real en mente y en una sola sentada de 30 minutos. Una estrategia perfecta que nunca se escribe no sirve." }),
      ];
    case "r-prompts-mkt":
      return [
        B(1, { type: "paragraph", text: "Copia cada prompt, reemplaza lo que está [entre corchetes] y pide siempre 3 variantes para elegir." }),
        B(2, { type: "subheading", text: "Contenido (1-20)" }),
        B(3, { type: "numberedList", items: MARKETING_PROMPTS.slice(0, 20) }),
        B(4, { type: "subheading", text: "Ofertas y anuncios (21-35)" }),
        B(5, { type: "numberedList", items: MARKETING_PROMPTS.slice(20, 35) }),
        B(6, { type: "subheading", text: "Email y seguimiento (36-50)" }),
        B(7, { type: "numberedList", items: MARKETING_PROMPTS.slice(35, 50) }),
      ];
    case "r-prompts-ventas":
      return [
        B(1, { type: "paragraph", text: "Úsalos para preparar mensajes, nunca para enviar sin adaptar: tu toque personal cierra la venta." }),
        B(2, { type: "subheading", text: "Apertura y calificación (1-12)" }),
        B(3, { type: "numberedList", items: SALES_PROMPTS.slice(0, 12) }),
        B(4, { type: "subheading", text: "Objeciones y cierre (13-30)" }),
        B(5, { type: "numberedList", items: SALES_PROMPTS.slice(12, 30) }),
      ];
    case "r-workbook":
      return [
        B(1, { type: "subheading", text: "Día 1: tu propuesta" }),
        B(2, { type: "exercise", title: "Ejercicio", text: "Escribe tu propuesta en una frase con resultado y plazo. Valídala con 2 clientes reales." }),
        B(3, { type: "subheading", text: "Día 2-3: contenido" }),
        B(4, { type: "exercise", title: "Ejercicio", text: "Genera 5 publicaciones con los prompts 1-5, adapta 3 con casos reales y programa la primera." }),
        B(5, { type: "subheading", text: "Día 4-5: mensajes" }),
        B(6, { type: "exercise", title: "Ejercicio", text: "Escribe a 10 contactos con mensajes personalizados. Registra respuestas y objeciones." }),
        B(7, { type: "subheading", text: "Día 6-7: cierre y sistema" }),
        B(8, { type: "exercise", title: "Ejercicio", text: "Envía 3 propuestas, agenda seguimientos y completa la plantilla de planificación de la próxima semana." }),
        B(9, { type: "reflection", question: "¿Qué parte del sistema te costó más y qué vas a repetir cada semana?" }),
      ];
    default:
      return null;
  }
}

const MARKETING_PROMPTS: string[] = [
  "Dame 10 ideas de publicaciones sobre [tema] para [cliente ideal]",
  "Escribe un carrusel de 5 placas sobre [tema] con tono [cercano/profesional]",
  "Crea 5 ganchos para un video sobre [tema]",
  "Resume este texto en 3 frases para Instagram: [texto]",
  "Escribe una publicación educativa sobre [error común de tu cliente]",
  "Dame 10 títulos para un video sobre [tema]",
  "Convierte este testimonio en una publicación: [testimonio]",
  "Escribe un antes/después sobre [resultado] para [cliente]",
  "Crea una publicación que responda la objeción [objeción]",
  "Dame 5 ideas de reels sin mostrar mi cara sobre [tema]",
  "Escribe el guion de un video de 60 segundos sobre [tema]",
  "Crea una historia en 3 partes sobre [caso real]",
  "Escribe una publicación de opinión sobre [tema polémico de tu rubro]",
  "Dame preguntas para generar comentarios sobre [tema]",
  "Crea un checklist descargable sobre [tema]",
  "Escribe una mini-guía de 5 pasos sobre [tema]",
  "Compara [opción A] vs [opción B] para [cliente]",
  "Escribe los 5 errores más comunes en [tema]",
  "Crea un mito vs realidad sobre [tema]",
  "Escribe mi presentación de perfil en 2 líneas para [red social]",
  "Escribe una oferta irresistible para [servicio] con garantía",
  "Crea 3 versiones de mi propuesta: corta, media y detallada",
  "Escribe un anuncio para [producto] dirigido a [cliente]",
  "Dame 5 titulares para promocionar [oferta]",
  "Escribe la descripción de [servicio] enfocada en beneficios",
  "Crea urgencia honesta para [oferta con cupos]",
  "Escribe un mensaje de lanzamiento para [producto]",
  "Dame ideas de bonus para [oferta principal]",
  "Escribe una garantía que genere confianza para [servicio]",
  "Crea un paquete de 3 niveles para [servicio]",
  "Redacta precios con anclaje para [servicios]",
  "Escribe un correo de bienvenida para nuevos suscriptores de [negocio]",
  "Crea una secuencia de 3 correos para [oferta]",
  "Escribe un correo que reactive clientes dormidos de [negocio]",
  "Redacta un seguimiento amable a las 48 horas para [propuesta]",
  "Escribe un correo con un caso de éxito de [cliente]",
  "Crea el asunto de 5 correos sobre [tema] que se abran",
  "Escribe una disculpa profesional por [error] con solución",
  "Redacta un pedido de testimonio para [cliente satisfecho]",
  "Escribe un correo mensual con novedades de [negocio]",
  "Crea una invitación a una llamada gratuita sobre [tema]",
  "Escribe un recordatorio de turno/pago para [cliente]",
  "Redacta una despedida elegante para un cliente que se va",
  "Escribe un mensaje de referidos para [cliente feliz]",
  "Crea un correo de fin de año con balance para [negocio]",
  "Escribe una encuesta de 5 preguntas para [clientes]",
  "Redacta un anuncio de aumento de precios con empatía",
  "Escribe un mensaje para retomar contacto con [antiguo cliente]",
  "Crea un texto de agradecimiento post-compra para [producto]",
  "Escribe las preguntas frecuentes de [servicio] con respuestas",
];

const SALES_PROMPTS: string[] = [
  "Escribe un primer mensaje para [contacto] sin sonar vendedor",
  "Crea 3 versiones de mi presentación de 30 segundos para [cliente]",
  "Redacta preguntas para calificar a [cliente] en 5 minutos",
  "Escribe un mensaje para pedir referidos a [cliente]",
  "Crea un guion para llamada de descubrimiento sobre [servicio]",
  "Redacta un mensaje para retomar una conversación fría",
  "Escribe cómo pedir el presupuesto del cliente sin incomodar",
  "Crea respuestas para 'lo voy a pensar' en [rubro]",
  "Redacta una propuesta de 5 líneas para [servicio]",
  "Escribe un mensaje para agendar llamada con [interesado]",
  "Crea respuestas para 'es muy caro' sin bajar el precio",
  "Redacta cómo manejar 'ya tengo proveedor' en [rubro]",
  "Escribe una respuesta para 'no tengo tiempo ahora'",
  "Crea un cierre por urgencia honesta para [oferta]",
  "Redacta un cierre por resumen de beneficios para [servicio]",
  "Escribe cómo pedir la venta directamente sin presionar",
  "Crea un mensaje post-llamada con resumen y próximos pasos",
  "Redacta un ultimátum amable para propuestas vencidas",
  "Escribe un cierre con garantía para indecisos",
  "Crea un mensaje para vender un segundo servicio a [cliente]",
  "Redacta respuestas para 'mándame info por mail'",
  "Escribe cómo responder a la comparación con la competencia",
  "Crea un guion para manejar 3 objeciones seguidas",
  "Redacta un mensaje para clientes que piden descuento",
  "Escribe un cierre para venta por WhatsApp en [rubro]",
  "Crea preguntas para descubrir el verdadero presupuesto",
  "Redacta un mensaje para confirmar una venta con entusiasmo",
  "Escribe cómo pedir testimonio justo después del cierre",
  "Crea un mensaje de bienvenida para nuevos clientes",
  "Redacta un plan de seguimiento de 30 días para [cliente nuevo]",
];

function contentResource(resourceId: string): PdfContentBlock[] | null {
  const B = (order: number, block: KitBlockInput): PdfContentBlock =>
    ({ ...block, id: kitBlockId(resourceId, order), order } as PdfContentBlock);
  switch (resourceId) {
    case "c-guia-contenido":
      return [
        B(1, { type: "paragraph", text: "Este sistema tiene 4 piezas: ideas, calendario, publicación y medición. Cada una alimenta a la siguiente: sin ideas no hay calendario, sin calendario no hay constancia, sin medición no hay mejora." }),
        B(2, { type: "subheading", text: "El ciclo semanal" }),
        B(3, { type: "numberedList", items: ["Lunes: elige 3 ideas del banco", "Miércoles y viernes: publica con checklist", "Domingo: mide y planifica la próxima semana"] }),
        B(4, { type: "tip", title: "Clave", text: "Publica 3 veces por semana durante 90 días antes de juzgar resultados." }),
      ];
    case "c-check-publicacion":
      return [
        B(1, { type: "checklist", title: "Contenido", items: ["El gancho se entiende en 3 segundos", "Aporta algo útil o entretiene", "Incluye llamado a la acción"] }),
        B(2, { type: "checklist", title: "Forma", items: ["Texto releído sin errores", "Imagen legible en el celular", "Hashtags y menciones correctas"] }),
      ];
    case "c-plant-calendario":
      return [
        B(1, { type: "paragraph", text: "Un tema por día, alternando educar, conectar y vender. Marca cada casilla al publicar." }),
        B(2, { type: "table", title: "Semana 1", headers: ["Día", "Tipo", "Tema", "Estado"], rows: [["Lunes", "Educar", "Consejo útil", "Pendiente"], ["Miércoles", "Conectar", "Historia personal", "Pendiente"], ["Viernes", "Vender", "Oferta con CTA", "Pendiente"]] }),
      ];
    case "c-ideas":
      return [
        B(1, { type: "paragraph", text: "Elige una, adaptala a tu nicho con un ejemplo real y publícala. Tacha las usadas." }),
        B(2, { type: "subheading", text: "Educar (1-35)" }),
        B(3, { type: "numberedList", items: Array.from({ length: 35 }, (_, i) => `Idea educativa ${i + 1}: enseña un paso pequeño de tu tema con ejemplo`) }),
        B(4, { type: "subheading", text: "Conectar (36-70)" }),
        B(5, { type: "numberedList", items: Array.from({ length: 35 }, (_, i) => `Idea de conexión ${i + 36}: cuenta una historia o lección de tu camino`) }),
        B(6, { type: "subheading", text: "Vender (71-100)" }),
        B(7, { type: "numberedList", items: Array.from({ length: 30 }, (_, i) => `Idea de venta ${i + 71}: muestra un resultado y ofrece el siguiente paso`) }),
      ];
    case "c-prompts-hooks":
      return [
        B(1, { type: "paragraph", text: "Reemplaza [tema] y pide 5 variantes de cada uno. Los primeros 3 segundos deciden todo." }),
        B(2, { type: "numberedList", items: ["El error que casi todos cometen en [tema]", "Nadie te cuenta esto sobre [tema]", "Cómo logré [resultado] sin [dolor habitual]", "3 señales de que necesitas [solución]", "Lo que aprendí después de [experiencia]", "Deja de hacer [error] si quieres [resultado]"] }),
      ];
    case "c-banco-cta":
      return [
        B(1, { type: "bulletList", items: ["Escríbeme la palabra INFO por mensaje directo", "Guarda este post para aplicarlo después", "Comenta TU DUDA y te respondo", "Agenda tu llamada gratuita aquí", "Comparte con quien lo necesite", "Suscríbete para la parte 2"] }),
      ];
    case "c-workbook":
      return [
        B(1, { type: "exercise", title: "Día 1-10: fundación", text: "Define tu tema, tu cliente y tu promesa en una página. Publica tus primeras 4 piezas educativas." }),
        B(2, { type: "exercise", title: "Día 11-20: ritmo", text: "Publica 6 piezas alternando educar y conectar. Responde cada comentario el mismo día." }),
        B(3, { type: "exercise", title: "Día 21-30: conversión", text: "Agrega llamados a la acción de venta, mide mensajes recibidos y repite lo que funcionó." }),
        B(4, { type: "reflection", question: "¿Qué tipo de contenido te resultó más natural crear y por qué?" }),
      ];
    default:
      return null;
  }
}

function genericResourceBlocks(resourceId: string, topic: string): PdfContentBlock[] {
  const B = (order: number, block: KitBlockInput): PdfContentBlock =>
    ({ ...block, id: kitBlockId(resourceId, order), order } as PdfContentBlock);
  if (resourceId.startsWith("g-prompts") || resourceId.includes("prompt")) {
    return [
      B(1, { type: "paragraph", text: `Reemplaza [corchetes] por tu caso y pide siempre 3 variantes para elegir la mejor.` }),
      B(2, { type: "numberedList", items: Array.from({ length: 15 }, (_, i) => `Prompt ${i + 1} de ${topic}: describe tu situación con [detalle] y pide un plan paso a paso`) }),
    ];
  }
  if (resourceId.startsWith("g-checklist") || resourceId.includes("check")) {
    return [
      B(1, { type: "checklist", title: `Antes de empezar con ${topic}`, items: [`Tengo claro mi objetivo con ${topic}`, "Reuní los materiales necesarios", "Reservé tiempo en mi agenda"] }),
      B(2, { type: "checklist", title: `Durante la aplicación de ${topic}`, items: ["Sigo los pasos en orden", "Anoto dudas para repasar", "Verifico cada resultado parcial"] }),
      B(3, { type: "checklist", title: "Al terminar", items: ["Repasé los puntos clave", "Agendé la próxima práctica", "Celebré el avance"] }),
    ];
  }
  if (resourceId.startsWith("g-plantilla") || resourceId.includes("plant")) {
    return [
      B(1, { type: "paragraph", text: `Completa una fila por día. Duplica la tabla cada semana.` }),
      B(2, { type: "table", title: `Plan semanal de ${topic}`, headers: ["Día", "Tarea", "Estado"], rows: [["Lunes", `Fundamentos de ${topic}`, "Pendiente"], ["Miércoles", `Práctica de ${topic}`, "Pendiente"], ["Viernes", `Repaso de ${topic}`, "Pendiente"]] }),
    ];
  }
  if (resourceId.startsWith("g-workbook") || resourceId.includes("work")) {
    return [
      B(1, { type: "exercise", title: "Día 1-2", text: `Lee la guía de ${topic} y anota tus 3 objetivos principales.` }),
      B(2, { type: "exercise", title: "Día 3-4", text: `Aplica ${topic} en un caso real y registra qué funcionó.` }),
      B(3, { type: "exercise", title: "Día 5", text: `Repite el ejercicio más difícil y pide feedback a alguien.` }),
      B(4, { type: "reflection", question: `¿Qué cambió en tu comprensión de ${topic} esta semana?` }),
    ];
  }
  return [
    B(1, { type: "paragraph", text: `Esta guía condensa lo esencial de ${topic} para empezar hoy mismo, sin vueltas.` }),
    B(2, { type: "subheading", text: "Lo más importante" }),
    B(3, { type: "bulletList", items: [`Entiende el porqué de ${topic} antes del cómo`, "Domina lo básico sin atajos", "Practica con casos reales desde el día uno"] }),
    B(4, { type: "tip", title: "Consejo", text: `Dedica sesiones cortas y regulares a ${topic}: la constancia supera a la intensidad.` }),
    B(5, { type: "chapterSummary", points: [`${topic} se aprende haciendo`, "Avanza en orden", "Repite lo difícil"] }),
  ];
}

const KIT_ELABORATIONS: string[] = [
  "Aplícalo esta semana en un caso real: la diferencia entre leer y dominar está en la primera práctica.",
  "Anota qué funcionó y qué ajustarías: tu registro vale más que cualquier consejo genérico.",
  "Si te cuesta, reduce el paso a la mitad: un avance pequeño sostenido supera un salto abandonado.",
];

function rewriteKitBlock(block: PdfContentBlock, action: KitTextAction, topic: string): PdfContentBlock {
  const clean = (t: string): string => t.replace(/\s+/g, " ").trim();
  const first = (t: string, n: number): string => {
    const parts = clean(t).match(/[^.!?]+[.!?]+/g) ?? [t];
    return parts.slice(0, Math.max(1, n)).join(" ").trim();
  };
  const elab = (t: string): string => `${clean(t)} ${KIT_ELABORATIONS[t.length % KIT_ELABORATIONS.length]}`;
  const apply = (t: string): string => {
    switch (action) {
      case "summarize": return first(t, 2);
      case "expand": case "examples": return elab(t);
      case "regenerate": case "alternative": {
        let h = 0;
        for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) % KIT_ELABORATIONS.length;
        return `${clean(t)} ${KIT_ELABORATIONS[(h + 1) % KIT_ELABORATIONS.length]}`;
      }
      case "improve": case "professional": case "practical": return `${clean(t)} Aplícalo con criterio: mide el resultado y ajusta en 7 días.`;
    }
  };
  const applyList = (items: string[]): string[] =>
    action === "summarize" ? items.slice(0, Math.max(1, Math.ceil(items.length / 2))) : items.map(apply);
  switch (block.type) {
    case "heading": case "subheading": case "paragraph": case "highlight":
      return { ...block, text: apply(block.text) };
    case "bulletList": case "numberedList":
      return { ...block, items: applyList(block.items) };
    case "quote": return { ...block, text: apply(block.text) };
    case "tip": case "warning": case "example": case "callout": case "exercise":
      return { ...block, text: apply(block.text) };
    case "checklist": return { ...block, items: applyList(block.items) };
    case "table": return { ...block, rows: block.rows.map((r) => r.map((c) => clean(c))) };
    case "reflection": return { ...block, question: apply(block.question) };
    case "chapterSummary": return { ...block, points: applyList(block.points) };
    case "divider": case "image": return block;
  }
  void topic;
}

type KitBlockInput = {
  [K in PdfContentBlock["type"]]: Omit<Extract<PdfContentBlock, { type: K }>, "id" | "order">;
}[PdfContentBlock["type"]];

function kitWords(blocks: PdfContentBlock[]): number {
  return blocks.map(blockText).join(" ").split(/\s+/).filter((w) => w.length > 0).length;
}

function validateKitDeterministic(
  context: KitGenerationContext,
  product: { blueprint: KitBlueprint; resources: KitResource[] }
): KitQualityValidation {
  const issues: KitQualityValidation["issues"] = [];
  const resources = product.resources;
  const blueprint = product.blueprint;

  // CONTENT 30 (un recurso es completo con ≥2 bloques y texto sustantivo)
  let contentScore = 30;
  const complete = resources.filter(
    (r) => r.title.trim().length > 0 && r.blocks.length >= 2 && kitWords(r.blocks) >= 40 && r.status === "ready"
  ).length;
  if (complete < resources.length) {
    contentScore -= (resources.length - complete) * 5;
    issues.push({ category: "content", severity: "high", description: `${resources.length - complete} recurso(s) incompletos`, suggestion: "Regenerar los recursos incompletos" });
  }
  const haystack = resources.flatMap((r) => r.blocks.map(blockText)).join(" ").toLowerCase();
  const placeholder = ["lorem", "contenido pendiente", "texto de ejemplo"].find((p) => haystack.includes(p));
  if (placeholder) {
    contentScore -= 10;
    issues.push({ category: "content", severity: "high", description: `Placeholder detectado ("${placeholder}")`, suggestion: "Reemplazar por contenido real" });
  }
  contentScore = Math.max(0, contentScore);

  // ORGANIZATION 30
  let organizationScore = 30;
  const folderIds = new Set(blueprint.folders.map((f) => f.id));
  const orphan = resources.filter((r) => !folderIds.has(r.folderId)).length;
  if (orphan > 0) {
    organizationScore -= orphan * 5;
    issues.push({ category: "organization", severity: "high", description: `${orphan} recurso(s) fuera de carpeta`, suggestion: "Mover a una carpeta válida" });
  }
  const titles = resources.map((r) => r.title.trim().toLowerCase());
  if (new Set(titles).size < titles.length) {
    organizationScore -= 8;
    issues.push({ category: "organization", severity: "medium", description: "Recursos con nombres duplicados", suggestion: "Renombrar para diferenciarlos" });
  }
  if (resources.length < 3) {
    organizationScore -= 10;
    issues.push({ category: "organization", severity: "high", description: "El kit tiene menos de 3 recursos", suggestion: "Agregar recursos que aporten valor" });
  }
  organizationScore = Math.max(0, organizationScore);

  // DESIGN 15
  let designScore = 15;
  const hex = /^#([0-9a-f]{6})$/i;
  if (![blueprint.branding.primaryColor, blueprint.branding.textColor].every((v) => hex.test(v))) {
    designScore -= 7;
    issues.push({ category: "design", severity: "medium", description: "Colores de identidad inválidos", suggestion: "Usar colores hex válidos" });
  }
  if (!blueprint.name.trim()) {
    designScore -= 8;
    issues.push({ category: "design", severity: "high", description: "El kit no tiene nombre", suggestion: "Definir el nombre del kit" });
  }
  designScore = Math.max(0, designScore);

  // FORMATS 25
  let formatsScore = 25;
  const validFormats = ["pdf", "txt", "csv", "xlsx"];
  const badFormats = resources.filter((r) => r.formats.length === 0 || !r.formats.every((f) => validFormats.includes(f))).length;
  if (badFormats > 0) {
    formatsScore -= badFormats * 5;
    issues.push({ category: "formats", severity: "high", description: `${badFormats} recurso(s) sin formato válido`, suggestion: "Asignar PDF, TXT, CSV o XLSX" });
  }
  formatsScore = Math.max(0, formatsScore);

  const totalScore = contentScore + organizationScore + designScore + formatsScore;
  const passed = totalScore >= 70 && issues.filter((i) => i.severity === "high").length === 0 && !placeholder;
  void context;
  return {
    contentScore, organizationScore, designScore, formatsScore, totalScore, passed, issues,
    recommendations: ["Probar cada descarga antes de publicar", "Revisar nombres y orden de carpetas", "Verificar que cada recurso aporte valor único"],
  };
}