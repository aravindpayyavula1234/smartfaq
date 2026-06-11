export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  createdAt: string;
}

export type SenderType = 'user' | 'bot' | 'system';

export interface ChatMessage {
  id: string;
  text: string;
  sender: SenderType;
  confidence?: number;
  matchedFAQId?: string;
  isFallback?: boolean;
  feedback?: 'up' | 'down';
  timestamp: string;
  suggestions?: string[];
  isAudio?: boolean;
  isDeepSolve?: boolean;
}

export interface UserQueryLog {
  id: string;
  query: string;
  matchedFAQId?: string;
  matchedQuestion?: string;
  confidence: number;
  isFallback: boolean;
  timestamp: string;
  feedback?: 'up' | 'down';
}

export interface AnalyticsStats {
  totalFAQs: number;
  totalQueries: number;
  averageConfidence: number;
  queriesOverTime: { date: string; count: number }[];
  categoryStats: { name: string; value: number }[];
  mostAskedFAQ: { question: string; count: number }[];
  confidenceBracket: { bracket: string; count: number }[];
  failedQueriesCount: number;
}

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}
