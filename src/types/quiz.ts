export type QuizQuestionType = 'single_choice' | 'boolean' | 'slider';

export interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
  score?: number; // Used to calculate risk factors internally
}

export interface QuizQuestion {
  id: string;
  title: string;
  subtitle?: string;
  type: QuizQuestionType;
  options?: QuizOption[];
  // For sliders:
  min?: number;
  max?: number;
  step?: number;
  sliderLabels?: [string, string]; // e.g. ["Nada", "Muchísimo"]
}

export interface HealthQuiz {
  id: string;
  title: string;
  description: string;
  estimatedTime: string; // e.g. "1 min"
  iconEmoji: string;
  themeColor: string; // e.g. "rose", "emerald", "indigo"
  questions: QuizQuestion[];
}

export interface QuizResult {
  quizId: string;
  completedAt: string;
  answers: Record<string, string | number | boolean>;
  totalScore?: number;
}
