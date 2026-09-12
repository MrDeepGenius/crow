// ============================================
// PROFESSIONAL COURSE TYPES & STRUCTURES
// ============================================

// ============================================
// VIDEO
// ============================================

export interface VideoContent {
  type: "video";
  videoUrl?: string;
  thumbnail?: string;
  duration?: string;
  captions?: string;
  status: "pending" | "generated" | "uploaded"; // pending = no existe aún
}

// ============================================
// TEXT CONTENT
// ============================================

export type TextBlockType =
  | "paragraph"
  | "heading"
  | "subheading"
  | "list"
  | "table"
  | "quote"
  | "highlight"
  | "code";

export interface TextBlock {
  type: TextBlockType;
  content: string;
  order: number;
}

export interface TextContent {
  type: "text";
  blocks: TextBlock[];
}

// ============================================
// ACTIVITIES
// ============================================

export type ActivityType =
  | "multiple-choice"
  | "true-false"
  | "order-steps"
  | "fill-blanks"
  | "match-concepts"
  | "checklist"
  | "reflection";

export interface MultipleChoiceActivity {
  type: "multiple-choice";
  question: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
}

export interface TrueFalseActivity {
  type: "true-false";
  statement: string;
  correctAnswer: boolean;
  explanation: string;
}

export interface OrderStepsActivity {
  type: "order-steps";
  instructions: string;
  steps: { id: string; text: string }[];
  correctOrder: string[];
  explanation: string;
}

export interface ChecklistActivity {
  type: "checklist";
  title: string;
  items: { id: string; text: string; completed?: boolean }[];
  description: string;
}

export interface ReflectionActivity {
  type: "reflection";
  question: string;
  minWords?: number;
  prompt: string;
}

export type Activity =
  | MultipleChoiceActivity
  | TrueFalseActivity
  | OrderStepsActivity
  | ChecklistActivity
  | ReflectionActivity;

// ============================================
// QUIZ
// ============================================

export interface QuizQuestion {
  id: string;
  question: string;
  options: { id: string; text: string }[];
  correctOption: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number; // porcentaje 0-100
  maxAttempts: number;
}

// ============================================
// RESOURCES
// ============================================

export type ResourceType = "pdf" | "file" | "link" | "template" | "checklist";

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  url?: string;
  fileStatus: "pending" | "uploaded"; // pending = no existe aún
}

// ============================================
// LESSON CONTENT
// ============================================

export interface Lesson {
  id: string;
  title: string;
  description: string;
  order: number;
  duration?: string; // "15 min"
  content: {
    video?: VideoContent;
    text?: TextContent;
    activity?: Activity;
    quiz?: Quiz;
    resources?: Resource[];
  };
  objectives: string[];
  keyTakeaways: string[];
}

// ============================================
// MODULE
// ============================================

export interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
  estimatedHours: number;
}

// ============================================
// CERTIFICATE
// ============================================

export interface CertificateConfig {
  enabled: boolean;
  title: string;
  description: string;
  conditions: {
    requireAllLessons: boolean;
    requireFinalExam: boolean;
    minimumScore: number; // porcentaje
  };
}

export interface Certificate {
  id: string;
  courseTitle: string;
  studentName: string;
  instructor: string;
  dateIssued: string;
  certificateId: string;
  status: "earned" | "pending"; // pending hasta que cumpla condiciones
  verificationUrl?: string;
}

// ============================================
// FINAL EXAM
// ============================================

export interface FinalExam {
  enabled: boolean;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  maxAttempts: number;
  timeLimit?: number; // minutos
}

// ============================================
// COURSE BRANDING
// ============================================

export interface CourseBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logo?: string;
  coverImage?: string;
  coverImageStatus: "pending" | "uploaded";
  textStyle: "modern" | "professional" | "casual";
}

// ============================================
// COURSE METADATA
// ============================================

export interface CourseMetadata {
  title: string;
  subtitle: string;
  description: string;
  author: string;
  authorBio?: string;
  authorImage?: string;
  language: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  tags: string[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MAIN COURSE STRUCTURE
// ============================================

export interface ProfessionalCourse {
  id: string;
  metadata: CourseMetadata;
  branding: CourseBranding;
  modules: Module[];
  finalExam?: FinalExam;
  certificate: CertificateConfig;
  stats: {
    totalLessons: number;
    totalDuration: number; // minutos
    totalActivities: number;
    totalQuizzes: number;
  };
}

// ============================================
// STUDENT PROGRESS
// ============================================

export interface StudentProgress {
  courseId: string;
  studentId: string;
  enrolledAt: string;
  lastAccessedLessonId?: string;
  completedLessons: Set<string>;
  completedModules: Set<string>;
  activityAnswers: Record<string, string>; // activityId -> answer
  quizScores: Record<string, number>; // quizId -> score
  finalExamScore?: number;
  certificateId?: string;
  completedAt?: string;
  progress: number; // porcentaje 0-100
}
