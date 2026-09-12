// ============================================
// BLUEPRINT & PRODUCT TYPES
// ============================================

export interface Module {
  title: string;
  lessons: string[];
}

export interface Blueprint {
  id?: string;
  title: string;
  type: "Curso" | "Ebook" | "Guía" | "Web interactiva" | "Kit de recursos";
  idea: string;
  description?: string;
  modules: Module[];
  createdAt?: string;
  // DEPRECATED (FASE 10): el flujo principal usa GeneratedCourse canónico de
  // services/ai/types. Este campo legacy queda como unknown para no ocultar tipos.
  analysis?: unknown;
}

// ============================================
// BUILD PROCESS TYPES
// ============================================

export type BuildStepType =
  | "analyzing"
  | "structure"
  | "content"
  | "design"
  | "resources"
  | "building"
  | "preview";

export interface BuildStep {
  id: BuildStepType;
  label: string;
  status: "pending" | "processing" | "completed";
  progress: number;
}

export type BuildStatus = "idle" | "building" | "completed" | "error";

// ============================================
// PRODUCT CONTENT TYPES
// ============================================

export interface LessonContent {
  title: string;
  introduction: string;
  explanation: string;
  examples: string[];
  keyPoints: string[];
  exercise: string;
  summary: string;
}

export interface CourseModule {
  title: string;
  description: string;
  lessons: LessonContent[];
  order: number;
}

export interface CourseProduct {
  title: string;
  description: string;
  idea: string;
  modules: CourseModule[];
  totalLessons: number;
  estimatedHours: number;
}

export interface EbookChapter {
  title: string;
  content: string;
  highlights: string[];
}

export interface EbookProduct {
  title: string;
  subtitle: string;
  introduction: string;
  chapters: EbookChapter[];
  resources: string[];
  conclusion: string;
  totalPages: number;
}

export interface GuideStep {
  order: number;
  title: string;
  content: string;
  example: string;
  checklist: string[];
}

export interface GuideProduct {
  title: string;
  introduction: string;
  steps: GuideStep[];
  recommendations: string[];
  conclusion: string;
}

export interface WebPage {
  id: string;
  name: string;
  title: string;
  description: string;
  sections: WebSection[];
}

export interface WebSection {
  id: string;
  type: "hero" | "features" | "content" | "cta";
  title: string;
  description: string;
  content: string;
}

export interface WebProduct {
  title: string;
  pages: WebPage[];
  navigation: string[];
  design: {
    primaryColor: string;
    secondaryColor: string;
    typography: string;
  };
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  type: "template" | "tool" | "checklist" | "guide";
}

export interface ResourceKitProduct {
  title: string;
  description: string;
  categories: string[];
  resources: Resource[];
  totalResources: number;
}

// Union type para cualquier tipo de producto
export type GeneratedProduct =
  | CourseProduct
  | EbookProduct
  | GuideProduct
  | WebProduct
  | ResourceKitProduct
  | GeneratedCourse;

// ============================================
// BUILD STATE TYPE
// ============================================

export interface BuildState {
  status: BuildStatus;
  blueprint: Blueprint | null;
  product: GeneratedProduct | null;
  steps: BuildStep[];
  currentStep: BuildStepType;
  progress: number;
  error: string | null;
}

// ============================================
// EDIT STATE TYPE
// ============================================

export interface EditState {
  isEditing: boolean;
  editingField: string | null;
  editingValue: string;
  changes: Record<string, unknown>;
}

// ============================================
// AI COURSE GENERATION TYPES
// ============================================

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

export interface GeneratedModule {
  id: string;
  title: string;
  description: string;
  lessons: GeneratedLesson[];
  order: number;
  estimatedHours: number;
  quiz?: GeneratedQuiz;
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

// DEPRECATED (FASE 10): duplicado legacy. Usar ActivityContent canónico de
// services/ai/types con content: unknown.
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
}

