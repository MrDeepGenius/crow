# CROW COURSE STUDIO - TESTING GUIDE

## Quick Start

### 1. Build & Start Development Server

```bash
npm run build  # Verificar 0 errores
npm run dev    # Iniciar servidor (http://localhost:3000)
```

### 2. Test the Flow

```
http://localhost:3000
  ↓
Click "Crear Mi Producto"
  ↓
Enter idea: "Quiero crear un curso básico de ciberseguridad para personas 
que no tienen conocimientos técnicos y quieren aprender a proteger sus 
cuentas, dispositivos y datos personales"
  ↓
Select type: "Curso"
  ↓
Click "Generar Producto"
  ↓
Wait for build process to complete
  ↓
View course in Preview (modules, lessons, content, activities)
```

---

## Test Case 1: Ciberseguridad Básica

### Input
```
Idea: "Quiero crear un curso básico de ciberseguridad para personas que no 
       tienen conocimientos técnicos y quieren aprender a proteger sus 
       cuentas, dispositivos y datos personales"
Type: Curso
Title: Ciberseguridad Básica
```

### Expected Output

#### Analysis
```
✓ topic: "Ciberseguridad"
✓ level: "beginner"
✓ audience: "personas sin conocimientos técnicos"
✓ relevanceScore: >= 80
```

#### Blueprint Modules
```
✓ Módulo 1: Introducción a la Ciberseguridad
✓ Módulo 2: Contraseñas y Cuentas
✓ Módulo 3: Autenticación y Acceso
✓ Módulo 4: Phishing e Ingeniería Social
✓ Módulo 5: Protección de Dispositivos
✓ Módulo 6: Redes e Internet Seguro
✓ Módulo 7: Privacidad y Datos Personales
✓ Módulo 8: Qué Hacer Ante un Incidente
✓ Módulo 9: Buenas Prácticas de Seguridad
```

#### Lessons
```
Módulo 1 should contain:
  ✓ "¿Qué es la ciberseguridad?"
  ✓ "Principales amenazas digitales"
  ✓ "Cómo pueden atacar a una persona común"
  ✓ "Por qué es importante la ciberseguridad"
  
NOT:
  ✗ "Conceptos Fundamentales" (generic)
  ✗ "Aplicación Práctica" (generic)
  ✗ Marketing/Negocios topics
```

#### Lesson Content
For "¿Qué es la ciberseguridad?":
```
✓ Specific security definition
✓ Why it matters (2024 statistics)
✓ 3 pillars: Confidentiality, Integrity, Availability
✓ Real-world examples
✓ Interactive activity (related to security)
✓ Quiz questions about security concepts
✓ Resources marked as "pending"
```

#### Certificate
```
✓ certificate.enabled = true
✓ certificate.title contains "Ciberseguridad"
✓ certificate.conditions.requireAllLessons = true
✓ certificate.conditions.minimumScore = 70
```

### Validation Checklist
- [ ] Course is about SECURITY (not marketing/generic)
- [ ] 8-10 specific security modules
- [ ] 35-45 security-focused lessons
- [ ] Content is NOT generic ("Módulo 1: Conceptos")
- [ ] Activities match lesson topics
- [ ] Quizzes are about real security concepts
- [ ] Resources show "pending" status (honest)
- [ ] Certificate configured for completion
- [ ] Course metadata reflects security theme
- [ ] All lessons in Spanish (language detection working)

---

## Test Case 2: Programación Python

### Input
```
Idea: "Quiero aprender Python desde cero. Soy principiante absoluto"
Type: Curso
Title: Python para Principiantes
```

### Expected Output

#### Analysis
```
✓ topic: "Programación"
✓ subtopic: "Python"
✓ level: "beginner"
✓ relevanceScore: >= 70
```

#### Blueprint Modules
```
✓ Módulo 1: Fundamentos
✓ Módulo 2: Tipos de Datos y Variables
✓ Módulo 3: Control de Flujo
✓ Módulo 4: Estructuras de Datos
✓ Módulo 5: Programación Orientada a Objetos
✓ Módulo 6: Manejo de Errores
✓ Módulo 7: Proyecto Práctico
```

#### Lessons
```
Should focus on PROGRAMMING concepts:
✓ "Tu primer programa"
✓ "Variables y tipos"
✓ "Condicionales"
✓ "Bucles"
✓ "Funciones"
✓ "Arrays y listas"

NOT:
✗ Marketing content
✗ Security content
✗ Generic modules
```

### Validation Checklist
- [ ] Course is about PROGRAMMING (not other topics)
- [ ] 6-7 programming-specific modules
- [ ] Lessons focus on Python/programming
- [ ] Activities include code examples
- [ ] Quizzes test programming knowledge
- [ ] Content is beginner-appropriate
- [ ] No advanced concepts in "Fundamentos"

---

## Test Case 3: Marketing Digital

### Input
```
Idea: "Curso de marketing digital para principiantes que quieren aprender a 
       promocionar su negocio en redes sociales"
Type: Curso
Title: Marketing Digital Básico
```

### Expected Output

#### Analysis
```
✓ topic: "Marketing Digital"
✓ level: "beginner"
✓ audience: "emprendedores sin experiencia"
```

#### Blueprint Modules
```
✓ Módulo 1: Fundamentos de Marketing
✓ Módulo 2: Estrategia Digital
✓ Módulo 3: Redes Sociales
✓ Módulo 4: SEO y SEM
✓ Módulo 5: Email Marketing
✓ Módulo 6: Analítica
```

#### Lessons
```
Marketing-focused content:
✓ "Qué es el marketing digital"
✓ "Buyer persona"
✓ "Estrategia en redes sociales"
✓ "Creación de contenido"
✓ "Segmentación de audiencia"

NOT:
✗ Programming content
✗ Security content
✗ Generic modules
```

### Validation Checklist
- [ ] Course is about MARKETING (not other topics)
- [ ] Content focuses on digital promotion
- [ ] Lessons are marketing-specific
- [ ] No technical programming content
- [ ] No security/privacy content
- [ ] Activities test marketing knowledge

---

## Test Case 4: Generic Topic (Fallback)

### Input
```
Idea: "Quiero aprender sobre sostenibilidad ambiental"
Type: Curso
Title: Sostenibilidad Básica
```

### Expected Behavior

#### Analysis
```
✓ relevanceScore: < 40 (unknown topic)
✓ topic: "Sostenibilidad Ambiental"
✓ Uses generic structure (but still functional)
```

#### Output
```
✓ Course is generated (doesn't crash)
✓ Generic structure: Introduction, Concepts, Application, Evaluation
✓ Still has content, activities, quizzes
✓ Certificate configured
✓ Resources prepared

Purpose: Better to generate something than nothing,
         but marked as generic fallback internally
```

### Validation Checklist
- [ ] No errors/crashes
- [ ] Course is generated despite unknown topic
- [ ] Usable structure maintained
- [ ] System degrades gracefully

---

## Integration Testing

### Test: Multiple Courses in Session
```
1. Create course 1: Ciberseguridad
2. Save to sessionStorage
3. Complete build
4. Navigate back
5. Create course 2: Python
6. Verify course 1 is still cached
7. Navigate back
8. Verify course 2 is still cached
```

**Expected**: Each course is independent, no mixing of content

### Test: Build Resume
```
1. Start building a course
2. Close browser (simulate interruption)
3. Reopen application
4. Check if saved state is recovered
```

**Expected**: Course data is preserved in sessionStorage

### Test: Progress Tracking
```
1. Build a course
2. Monitor progress bar during build
3. Verify each step updates progress
4. Confirm final status is "completed"
```

**Expected**: Progress bar moves smoothly, all steps complete

---

## Code-Level Testing

### Test courseAnalyzer

```typescript
import { analyzeCourseIdea } from '@/app/lib/courseAnalyzer';

const analysis = analyzeCourseIdea(
  "Quiero aprender ciberseguridad básica"
);

console.assert(analysis.topic === "Ciberseguridad");
console.assert(analysis.level === "beginner");
console.assert(analysis.subtopics.length > 0);
console.assert(analysis.relevanceScore >= 40);
```

### Test courseBlueprintGenerator

```typescript
import { generateCourseBlueprintFromAnalysis } from '@/app/lib/courseBlueprintGenerator';
import { analyzeCourseIdea } from '@/app/lib/courseAnalyzer';

const analysis = analyzeCourseIdea("curso de ciberseguridad");
const blueprint = generateCourseBlueprintFromAnalysis(
  "Quiero aprender ciberseguridad",
  analysis,
  "Ciberseguridad Básica"
);

console.assert(blueprint.modules.length >= 8);
console.assert(blueprint.modules[0].title !== "Módulo 1");
console.assert(blueprint.modules.every(m => m.lessons.length > 0));
```

### Test contentGenerator

```typescript
import { generateContextualCourse } from '@/app/lib/contentGenerator';
import { Blueprint } from '@/app/types';

const blueprint: Blueprint = {
  type: "Curso",
  title: "Ciberseguridad Básica",
  idea: "Curso de ciberseguridad para principiantes",
  modules: [/* ... */]
};

const course = generateContextualCourse(blueprint);

console.assert(course.modules.length > 0);
console.assert(course.modules[0].lessons.length > 0);
console.assert(course.modules[0].lessons[0].content.text);
console.assert(course.modules[0].lessons[0].content.activity);
console.assert(course.modules[0].lessons[0].content.quiz);
console.assert(course.certificate.enabled);
```

### Test courseGenerationService

```typescript
import { generateCourseFromIdea } from '@/app/lib/courseGenerationService';

const result = await generateCourseFromIdea(
  "Quiero aprender ciberseguridad",
  "Ciberseguridad Básica"
);

console.assert(result.analysis.topic === "Ciberseguridad");
console.assert(result.blueprint.modules.length > 0);
console.assert(result.course.modules.length > 0);
console.assert(result.steps.every(s => s.status === "completed"));
console.assert(result.totalTime > 0);
```

---

## Performance Testing

### Benchmark: Course Generation Time

```
npm run build: < 2s
Course generation (40 lessons): < 5s (mock)
Full UI render: < 1s

Expected performance:
- Analysis: 100ms
- Blueprint: 500ms
- Content: 2000ms (mock, with real AI would be more)
- Total: ~2.6s
```

### Memory Usage
```
- Course object size: ~200KB (reasonable for 40 lessons)
- SessionStorage limit: 5-10MB (plenty of headroom)
- Page loads: < 3MB with all assets
```

---

## Error Handling Testing

### Test 1: Invalid Idea
```
Input: "" (empty string)
Expected: 
  - Error message or fallback behavior
  - No crash
  - Graceful degradation
```

### Test 2: Extreme Input
```
Input: 10,000 character very long idea
Expected:
  - System handles it
  - No buffer overflow
  - Reasonable timeout
```

### Test 3: SessionStorage Full
```
Scenario: Try to save course when storage is full
Expected:
  - Error handling
  - User notification
  - Fallback to memory
```

---

## Browser Compatibility

### Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Mobile browsers (if applicable)

### Check:
- [ ] Responsive design
- [ ] Touch interactions (if mobile)
- [ ] Console errors
- [ ] Performance metrics

---

## UI/UX Testing

### Visual Inspection
```
✓ Styling matches Crow design (black + purple)
✓ Progress bar animates smoothly
✓ Buttons respond to clicks
✓ Text is readable (contrast, size)
✓ Layout is responsive
✓ No visual glitches
```

### Interaction Testing
```
✓ Click "Create" → navigate to form
✓ Fill form → enable build button
✓ Click "Build" → start progress animation
✓ Wait for completion → show preview
✓ Click modules → expand/collapse
✓ Click lessons → show content
✓ Scroll through content → smooth
```

---

## Checklist: Before Production

- [ ] Build: 0 errors, 0 warnings
- [ ] All test cases pass
- [ ] Ciberseguridad course is recognizably about security
- [ ] Python course is recognizably about programming
- [ ] Marketing course is recognizably about marketing
- [ ] Generic course degrades gracefully
- [ ] Performance acceptable (< 5s generation)
- [ ] Memory usage reasonable
- [ ] Error handling robust
- [ ] UI/UX polished
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for IA integration

---

## When You Connect Real AI

### Integration Checklist

- [ ] Set up API keys (Claude, GPT, etc.)
- [ ] Test API connectivity
- [ ] Implement rate limiting
- [ ] Add error handling for API failures
- [ ] Test with real API calls
- [ ] Monitor costs
- [ ] Optimize prompts
- [ ] Cache results
- [ ] Add logging
- [ ] Performance testing with real API
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Deploy to production

---

## Expected Results Summary

When testing with the ciberseguridad example, you should see:

✅ **NOT**: "Módulo 1: Conceptos", "Módulo 2: Aplicación"
✅ **YES**: "Introducción a la Ciberseguridad", "Phishing", "Contraseñas"

✅ **NOT**: Generic content about any topic
✅ **YES**: Specific security concepts and practices

✅ **NOT**: "This lesson is about X" filler text
✅ **YES**: Real educational content with examples

✅ **NOT**: "Video generated" without a URL
✅ **YES**: "Video pending generation" (honest status)

✅ **NOT**: Random or unrelated activities
✅ **YES**: Activities specific to the lesson topic

✅ **NOT**: Quizzes with questions unrelated to content
✅ **YES**: Quizzes testing the actual taught content

This is how you know the system is working correctly.
