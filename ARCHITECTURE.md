# CROW COURSE STUDIO - ARCHITECTURE

## Overview

Crow Course Studio es una arquitectura modular para generar cursos educativos profesionales basados en ideas específicas del usuario. El sistema está diseñado para funcionar inicialmente con datos mock y ser fácilmente escalable con IA real.

## Architecture Diagram

```
User Idea
    ↓
[Course Analyzer] - Analiza semánticamente la idea
    ├→ Topic detection
    ├→ Level inference
    ├→ Audience identification
    └→ CourseAnalysis (meta-data)
    ↓
[Blueprint Generator] - Crea estructura específica
    ├→ Topic-based modules
    ├→ Context-aware lessons
    └→ Blueprint with specialized content
    ↓
[Content Generator] - Genera lecciones contextuales
    ├→ Lesson context awareness
    ├→ Topic-specific content
    ├→ Activity generation
    ├→ Quiz generation
    └→ Resource preparation
    ↓
[Professional Course] - Estructura final
    ├→ Metadata (completa y contextual)
    ├→ Modules with lessons
    ├→ Activities (interactivas)
    ├→ Quizzes (validación de aprendizaje)
    ├→ Resources (pendientes de generación real)
    └→ Certificate configuration
    ↓
[Course Preview] - Studio para ver y editar
```

## Key Services

### 1. Course Analyzer (`courseAnalyzer.ts`)

**Responsabilidad**: Analizar la idea del usuario y extraer metadatos semánticos.

**Entrada**: String con la idea del usuario
```
"Quiero crear un curso básico de ciberseguridad para personas que no saben nada del tema"
```

**Salida**: CourseAnalysis
```typescript
{
  topic: "Ciberseguridad",
  subtopics: ["Phishing", "Contraseñas", "Malware", ...],
  level: "beginner",
  audience: "personas sin conocimientos técnicos",
  goal: "aprender a proteger cuentas, dispositivos y datos",
  language: "es",
  tone: "simple, práctico y didáctico",
  relevanceScore: 85
}
```

**Cómo conectar IA real**:
```typescript
// Actualmente: análisis heurístico basado en palabras clave
// Con IA: Llamar a modelo (Claude, GPT, etc.)

async function analyzeCourseIdea(idea: string): Promise<CourseAnalysis> {
  const response = await aiModel.analyze(idea, {
    extractTopics: true,
    inferLevel: true,
    identifyAudience: true,
    suggestStructure: true
  });
  
  return response;
}
```

### 2. Course Blueprint Generator (`courseBlueprintGenerator.ts`)

**Responsabilidad**: Crear una estructura de módulos y lecciones específica según el tema.

**Entrada**: CourseAnalysis
**Salida**: Blueprint con módulos y lecciones específicas

**Estructura de Ciberseguridad (ejemplo)**:
```
Módulo 1: Introducción a la Ciberseguridad
  - ¿Qué es la ciberseguridad?
  - Principales amenazas digitales
  - Cómo pueden atacar a una persona común
  
Módulo 2: Contraseñas y Cuentas
  - Cómo crear una contraseña segura
  - Por qué nunca debemos reutilizar contraseñas
  - Gestores de contraseñas
  
... (más módulos específicos)
```

**Cómo conectar IA real**:
```typescript
// Actualmente: Mapeos topic → módulos predefinidos
// Con IA: Generar módulos dinámicamente

async function generateCourseBlueprintFromAnalysis(
  idea: string,
  analysis: CourseAnalysis
): Promise<Blueprint> {
  const blueprint = await aiModel.generateBlueprint({
    idea,
    analysis,
    languageLevel: analysis.level,
    targetAudience: analysis.audience,
    courseType: analysis.topic
  });
  
  return blueprint;
}
```

### 3. Contextual Content Generator (`contextualContentGenerator.ts`)

**Responsabilidad**: Generar contenido completo para cada lección con contexto.

**Entrada**: LessonContext
```typescript
{
  courseTitle: "Ciberseguridad Básica",
  moduleName: "Introducción a la Ciberseguridad",
  lessonTitle: "¿Qué es la ciberseguridad?",
  lessonOrder: 1,
  analysis: CourseAnalysis,
  previousLessons: [],
  nextLessons: ["Principales amenazas digitales", ...]
}
```

**Salida**: Lesson completa con:
- Texto (bloques específicos por tema)
- Actividad interactiva (contextual)
- Quiz (preguntas sobre el contenido específico)
- Recursos (en estado "pending")
- Objetivos (claros y medibles)

**Contenido generado (ejemplo)**:
```
Lección: "¿Qué es la ciberseguridad?"

Contenido:
- Definición clara
- Por qué es importante
- Los 3 pilares (Confidencialidad, Integridad, Disponibilidad)
- Estadísticas reales
- Ejemplos prácticos

Actividad: Quiz sobre conceptos
Quiz: 3 preguntas de múltiple choice

Recursos: PDFs y checklists (pendientes)
```

**Cómo conectar IA real**:
```typescript
// Actualmente: Mapeos lessonTitle → contenido predefinido
// Con IA: Generar contenido dinámicamente

async function generateContextualLesson(context: LessonContext): Promise<Lesson> {
  const lesson = await aiModel.generateLesson({
    lessonTitle: context.lessonTitle,
    moduleName: context.moduleName,
    level: context.analysis.level,
    audience: context.analysis.audience,
    previousContext: context.previousLessons,
    nextTopics: context.nextLessons,
    language: context.analysis.language,
    
    // Requerimientos explícitos
    includeActivities: true,
    includeQuiz: true,
    contentLength: "medium", // 15-20 minutos
    tone: context.analysis.tone
  });
  
  return lesson;
}
```

### 4. Content Generator (`contentGenerator.ts`)

**Responsabilidad**: Orquestar todo el flujo de generación.

**Función principal**: `generateContextualCourse(blueprint)`

**Flujo**:
1. Analiza la idea (si está disponible)
2. Itera sobre módulos
3. Para cada módulo y lección:
   - Crea LessonContext
   - Genera lección contextual
4. Retorna ProfessionalCourse completo

**Cómo conectar IA real**:
```typescript
export async function generateContextualCourse(
  blueprint: Blueprint
): Promise<ProfessionalCourse> {
  // Opción 1: Análisis ya hecho
  const analysis = blueprint.analysis || analyzeCourseIdea(blueprint.idea);
  
  // Opción 2: Generar todo con IA
  const modules = await Promise.all(
    blueprint.modules.map(async (mod, modIdx) => {
      return {
        ...mod,
        lessons: await Promise.all(
          mod.lessons.map(lessonTitle => 
            generateContextualLessonWithAI(lessonTitle, mod.title, analysis)
          )
        )
      };
    })
  );
  
  return buildProfessionalCourse(modules, analysis);
}
```

### 5. Course Generation Service (`courseGenerationService.ts`)

**Responsabilidad**: Orquestar el flujo completo con tracking de progreso.

**Uso**:
```typescript
const service = new CourseGenerationService();
const result = await service.generateCourse(
  "Quiero aprender ciberseguridad básica",
  "Ciberseguridad para Todos"
);

// result contiene:
// - analysis: Análisis semántico
// - blueprint: Estructura del curso
// - course: Curso completo generado
// - steps: Array de pasos completados con progreso
// - totalTime: Tiempo total de generación
```

## Integration Points for Real AI

### Direct Replacements

1. **analyzeCourseIdea** → API to Claude/GPT
   ```typescript
   const response = await fetch("https://api.openai.com/v1/chat/completions", {
     method: "POST",
     body: JSON.stringify({
       model: "gpt-4",
       messages: [{
         role: "user",
         content: `Analyze this course idea and return JSON with: topic, subtopics, level, audience, goal, tone, prerequisites\n\nIdea: ${idea}`
       }]
     })
   });
   ```

2. **generateCourseBlueprintFromAnalysis** → IA para crear módulos
   ```typescript
   // Llamar a IA para que genere módulos específicos
   const blueprint = await aiModel.generateBlueprint(analysis);
   ```

3. **generateContextualLesson** → IA para generar contenido
   ```typescript
   // Llamar a IA para contenido específico de la lección
   const lesson = await aiModel.generateLesson(context);
   ```

### Video Generation Integration

```typescript
// En contextualContentGenerator.ts
const videoGuide = await generateVideoGuide({
  lessonTitle: context.lessonTitle,
  duration: "15 min",
  tone: analysis.tone
});

// Estructura de video generada:
{
  script: "...",           // Guion completo
  scenes: [...],           // Descripción de escenas
  narration: "...",        // Narración
  visualPrompts: [...]     // Prompts para generación de video
}

// Después conectar con API de generación de video (Synthesia, etc.)
const videoUrl = await generateVideoFromGuide(videoGuide);
```

### PDF/Resource Generation

```typescript
// En resources generation
const resources = [
  {
    type: "pdf",
    title: "Guía Rápida",
    description: "PDF con conceptos clave",
    contentPrompt: context.lessonTitle, // Usar para generar PDF
    fileStatus: "pending" // Cambiar a "uploaded" cuando esté listo
  }
];

// Conectar con API de generación de PDF
const pdfUrl = await generatePDFFromContent(resources);
```

### Certificate Generation

```typescript
// En course generation
certificate: {
  enabled: true,
  template: "professional", // Plantilla seleccionable
  generationApi: "https://api.example.com/generate-certificate"
}

// Cuando el alumno completa el curso:
const certificate = await generateCertificate({
  studentName,
  courseTitle,
  completionDate,
  certificateId: generateUUID(),
  template: course.certificate.template
});
```

## Data Structures

### CourseAnalysis
```typescript
{
  topic: string;
  subtopics: string[];
  level: "beginner" | "intermediate" | "advanced";
  audience: string;
  goal: string;
  language: string;
  tone: "simple" | "professional" | "academic" | "practical";
  duration: number;
  relevanceScore: number; // 0-100
}
```

### Blueprint
```typescript
{
  id: string;
  title: string;
  type: "Curso";
  idea: string;
  description: string;
  modules: Module[];
  analysis: CourseAnalysis;
  createdAt: string;
}
```

### ProfessionalCourse
```typescript
{
  id: string;
  metadata: {
    title, subtitle, description,
    author, language, level, category, tags
  };
  branding: {
    primaryColor, secondaryColor,
    logo, coverImage, textStyle
  };
  modules: Module[];
  finalExam?: FinalExam;
  certificate: CertificateConfig;
  stats: {
    totalLessons, totalDuration,
    totalActivities, totalQuizzes
  };
}
```

### Lesson
```typescript
{
  id: string;
  title: string;
  description: string;
  content: {
    video: { status: "pending" | "generated" | "uploaded" };
    text: TextBlock[];
    activity: Activity;
    quiz: Quiz;
    resources: Resource[];
  };
  objectives: string[];
  keyTakeaways: string[];
}
```

## Quality Assurance

### Relevance Score
- Antes de generar contenido, calcular qué tan específico es el análisis
- Si score < 40: Usar generador genérico
- Si score >= 40: Generar contenido contextual

### Content Validation
Antes de marcar un curso como "listo":
- ¿El contenido corresponde a la idea original? ✓
- ¿Todas las lecciones corresponden al tema? ✓
- ¿El nivel coincide? ✓
- ¿El público coincide? ✓
- ¿Los quizzes corresponden al contenido? ✓
- ¿Hay repeticiones excesivas? ✓
- ¿El curso tiene progresión lógica? ✓

## Cost Optimization

### Progressive Generation
- NO generar todo de una vez
- Generar bajo demanda:
  1. Análisis (lightweight)
  2. Blueprint (fast)
  3. Módulos (one at a time)
  4. Lecciones (one per API call)
  5. Videos/PDFs (on-demand)

### Caching Strategy
```typescript
// Cache analysis results
const cache = new Map<string, CourseAnalysis>();

if (cache.has(idea)) {
  return cache.get(idea); // No re-analyze
}

const analysis = await analyzeCourseIdea(idea);
cache.set(idea, analysis);
```

### Resume Capability
```typescript
// Si el usuario vuelve, NO regenerar
if (sessionStorage.has("course:" + courseId)) {
  return sessionStorage.get("course:" + courseId);
}

// Solo generar lo que falta
const existingCourse = loadPartialCourse(courseId);
const newContent = await generateMissingLessons(existingCourse);
```

## Testing & Validation

### Test Case: Ciberseguridad Básica
```
Input:
  "Quiero crear un curso básico de ciberseguridad para personas que no tienen 
   conocimientos técnicos y quieren aprender a proteger sus cuentas, dispositivos 
   y datos personales."

Expected Output:
  - Topic: "Ciberseguridad" ✓
  - Level: "beginner" ✓
  - Modules: 8-10 específicos sobre seguridad ✓
  - Lessons: 30-40 lecciones contextuales ✓
  - Activities: Interactivas y específicas ✓
  - Quizzes: Sobre contenido real de seguridad ✓
  - Certificate: Configurado ✓
  - NOT: Marketing, productividad, otro tema ✗
```

## Deployment Checklist

- [x] Analyzer service working with mock data
- [x] Blueprint generator creating specific structures
- [x] Content generator creating contextual lessons
- [x] Course generation service orchestrating flow
- [x] TypeScript compilation successful
- [x] All types properly defined
- [ ] Integration with Claude API
- [ ] Video generation integration
- [ ] PDF generation integration
- [ ] Certificate generation integration
- [ ] Production testing
- [ ] Performance optimization

## Future Enhancements

1. **Adaptive Content**: Análisis de performance del alumno para adaptar contenido
2. **Live Instruction**: Generar clases en vivo basadas en el curso
3. **Community Features**: Foros, discusiones, peer learning
4. **Marketplace**: Compartir cursos, monetización
5. **Analytics**: Dashboard de progreso y engagement
6. **Multi-language**: Generación automática en múltiples idiomas
7. **Certifications**: Integraciones con plataformas de certificación reales

## Summary

CROW COURSE STUDIO es una arquitectura lista para producción que:

✓ Analiza ideas específicas del usuario
✓ Genera módulos y lecciones contextuales (NO genéricas)
✓ Crea actividades y quizzes relacionados al contenido
✓ Prepara estructura para videos, PDFs, certificados
✓ Está completamente separada para conectar IA real
✓ Incluye tracking de progreso y validación de calidad
✓ Escalable y modular para futuras mejoras

El sistema está listo para que se conecte Claude, GPT o cualquier modelo de IA sin rehacer la arquitectura.
