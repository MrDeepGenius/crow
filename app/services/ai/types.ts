// ============================================
// AI TYPES - CROW COURSE STUDIO
// ============================================

// ============================================
// GENERATION CONTEXT
// ============================================

export interface GenerationContext {
  originalIdea: string;
  productSpecification: ProductSpecification;
  courseBlueprint?: CourseBlueprint;
  currentModule?: ModuleBlueprint;
  currentLesson?: LessonBlueprint;
  previousLessons?: string[];
  learningObjectives: string[];
  audience: string;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  tone: "professional" | "casual" | "academic" | "friendly";
}

export interface ProductSpecification {
  topic: string;
  type: "curso" | "ebook" | "guia" | "web" | "recursos";
  audience: string;
  level: string;
  goal: string;
  subtopics: string[];
  requirements: string[];
  estimatedDuration: number;
}

export interface CourseBlueprint {
  title: string;
  description: string;
  objectives: string[];
  modules: ModuleBlueprint[];
  finalExam: ExamBlueprint;
  certificate: CertificateBlueprint;
  metadata: {
    totalLessons: number;
    estimatedHours: number;
    difficulty: string;
  };
}

export interface ModuleBlueprint {
  title: string;
  description: string;
  objectives: string[];
  lessons: LessonBlueprint[];
  quiz?: QuizBlueprint;
}

export interface LessonBlueprint {
  title: string;
  objectives: string[];
  contentTypes: string[];
  duration: number;
  hasVideo: boolean;
  hasActivity: boolean;
  hasQuiz: boolean;
}

export interface ExamBlueprint {
  title: string;
  description: string;
  passingScore: number;
  timeLimit: number;
  questionCount: number;
}

export interface CertificateBlueprint {
  enabled: boolean;
  title: string;
  description: string;
  requirements: string[];
}

export interface QuizBlueprint {
  title: string;
  questionCount: number;
  passingScore: number;
}

// ============================================
// GENERATED CONTENT
// ============================================

export interface GeneratedModule {
  id: string;
  title: string;
  description: string;
  lessons: GeneratedLesson[];
  quiz?: GeneratedQuiz;
  order: number;
  estimatedHours: number;
}

export interface GeneratedLesson {
  id: string;
  title: string;
  content: LessonContent;
  video?: VideoContent;
  activity?: ActivityContent;
  quiz?: GeneratedQuiz;
  order: number;
  estimatedMinutes: number;
}

export interface LessonContent {
  introduction: string;
  explanation: string;
  keyPoints: string[];
  examples: string[];
  summary: string;
  resources: string[];
  // FASE 4: contenido completo específico (opcionales para compatibilidad)
  sections?: { heading: string; body: string }[];
  exercise?: string;
}

export interface VideoContent {
  enabled: boolean;
  status: "pending" | "generating" | "ready" | "failed";
  title: string;
  script: string;
  scenes: VideoScene[];
  duration: number;
  thumbnail?: string;
  url?: string;
}

export interface VideoScene {
  text: string;
  duration: number;
  visualCue: string;
}

// FASE 10: tipo canónico. content es unknown con formas conocidas por tipo;
// cada renderer hace narrowing explícito en vez de ocultar con any.
export interface ActivityContent {
  type: "multiple_choice" | "true_false" | "fill_blank" | "matching" | "case_study" | "checklist" | "ordering";
  title: string;
  description: string;
  instruction: string;
  content: unknown;
  feedback: string;
}

export interface GeneratedQuiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number;
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  points: number;
}

export interface GeneratedExam {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number;
  instructions: string[];
}

export interface GeneratedCertificate {
  id: string;
  title: string;
  description: string;
  template: string;
  requirements: {
    completedLessons: boolean;
    passedExam: boolean;
    minimumScore: number;
  };
  // FASE 7: certificado opcional visualizable (opcionales)
  enabled?: boolean;
  courseTitle?: string;
  studentName?: string;
  author?: string;
  dateIssued?: string;
  certificateId?: string;
}

export interface GeneratedCourse {
  id: string;
  metadata: {
    title: string;
    description: string;
    author: string;
    level: string;
    language: string;
    category: string;
    tags: string[];
    createdAt: string;
  };
  modules: GeneratedModule[];
  finalExam: GeneratedExam;
  certificate: GeneratedCertificate;
  stats: {
    totalLessons: number;
    totalDuration: number;
    totalActivities: number;
    totalQuizzes: number;
  };
}

// ============================================
// QUALITY VALIDATION
// ============================================

export interface QualityValidation {
  relevanceScore: number; // 0-100
  completenessScore: number; // 0-100
  qualityScore: number; // 0-100
  coherenceScore: number; // 0-100
  overallScore: number; // 0-100
  passed: boolean;
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  type: "relevance" | "completeness" | "quality" | "coherence";
  severity: "low" | "medium" | "high";
  description: string;
  suggestion: string;
}

// ============================================
// GENERATION PROGRESS
// ============================================

export interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
}

export interface GenerationProgress {
  currentStep: string;
  steps: GenerationStep[];
  overallProgress: number; // 0-100
  isComplete: boolean;
  hasError: boolean;
  estimatedTimeRemaining?: number; // seconds
}

export type { GenerationProgress as CourseGenerationProgress };

export interface GenerationState {
  id: string;
  originalIdea: string;
  status: "analyzing" | "blueprint" | "modules" | "content" | "validation" | "completed" | "failed";
  progress: GenerationProgress;
  context?: GenerationContext;
  blueprint?: CourseBlueprint;
  generatedModules: GeneratedModule[];
  currentModule?: number;
  currentLesson?: number;
  finalExam?: GeneratedExam;
  certificate?: GeneratedCertificate;
  validation?: QualityValidation;
  result?: GeneratedCourse;
  error?: string;
  createdAt: string;
  updatedAt: string;
}