export interface StudentDetails {
  name: string;
  email: string;
  phone: string;
  department: string;
  section: string;
  roll: string;
  enrollmentNumber: string;
}

export interface BankQuestion {
  id: string;
  subject: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface QuestionData {
  id: string;
  number: number;
  subject: string;
  question: string;
  codeSnippet?: string;
  options: string[];
}

export interface QuestionBreakdown {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  selectedOption: number | null;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
}

export type SubmissionReason = "AUTO_NETWORK_DETECTED" | "TIMER_EXPIRED" | "MANUAL_SUBMISSION";

export interface QuizSubmission {
  id: string;
  student: StudentDetails;
  answers: Record<string, number>;
  score: number;
  totalQuestions: number;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unansweredCount: number;
  percentage: number;
  timeSpentSeconds: number;
  totalDurationSeconds: number;
  submissionReason: SubmissionReason;
  toggleCount: number;
  submittedAt: string;
  isSubmittedOnNetwork: boolean;
  networkSubmittedAt?: string;
  attemptNumber?: number;
  giftAwarded?: string;
  breakdown: QuestionBreakdown[];
}

export type ExamStep = "REGISTRATION" | "QUIZ_ACTIVE" | "SUBMISSION_RESULT";

export type QuestionViewMode = "QUESTION" | "OPTIONS";

export type NetworkMode = "REAL_DEVICE" | "SIMULATED";

export interface NetworkCheckStatus {
  isOnline: boolean;
  lastChecked: Date | null;
  checkMethod: "navigator" | "probe" | "manual" | "connection-api";
  latencyMs?: number;
  checksCount: number;
  isMobileNetwork?: boolean;
  connectionType?: "cellular" | "wifi" | "ethernet" | "bluetooth" | "none" | "unknown";
  effectiveType?: string;
  networkLabel?: string;
  isMobileDevice?: boolean;
}
