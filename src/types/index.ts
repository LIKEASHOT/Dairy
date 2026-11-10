export type SlotPeriod = 'morning' | 'afternoon' | 'evening';

export interface Tag {
  id: string;
  name: string;
  color: string; // e.g. '#6366F1'
  bgColor: string; // e.g. '#EEF2FF'
  textColor: string; // e.g. '#4338CA'
  isDefault?: boolean;
  sortOrder: number;
}

export interface ActivityRecord {
  id: string;
  slotId?: string;
  date: string; // YYYY-MM-DD
  period: SlotPeriod;
  content: string;
  tagId: string;
  tag?: Tag;
  sortOrder: number;
  createdAt: string;
}

export interface SlotData {
  id?: string;
  date: string;
  period: SlotPeriod;
  summaryNote?: string;
  records: ActivityRecord[];
}

export interface DayData {
  date: string; // YYYY-MM-DD
  moods: string[]; // array of mood ids/emojis
  diaryNote: string;
  slots: Record<SlotPeriod, SlotData>;
}

export interface MoodOption {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export interface Report {
  id: string;
  type: 'weekly' | 'monthly';
  targetDate: string; // Period identifier (e.g. '2026-W45' or '2026-11')
  startDate: string;
  endDate: string;
  title: string;
  content: string; // Markdown
  createdAt: string;
}

export interface AppConfig {
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
}

export type AIProvider = 'claude' | 'codex' | 'gemini' | 'copilot' | 'opencode' | string;

export interface AIDailyModelUsage {
  date: string; // YYYY-MM-DD (Asia/Shanghai)
  provider: AIProvider;
  model: string;
  displayName: string;
  requests: number;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  savingsUsd: number;
  unpricedCount: number;
  updatedAt: number;
}

export interface AIUsageSummary {
  requests: number;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  savingsUsd: number;
  unpricedCount: number;
  cacheHitRate: number;
}

export interface AIDailyAggregate {
  date: string;
  requests: number;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  savingsUsd: number;
  unpricedCount: number;
  models: AIDailyModelUsage[];
}

export interface AIModelAggregate {
  provider: AIProvider;
  model: string;
  displayName: string;
  requests: number;
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  costUsd: number;
  savingsUsd: number;
  unpricedCount: number;
  costShare: number;
  tokenShare: number;
}

export interface AIUsageQueryParams {
  days?: number;
  startDate?: string;
  endDate?: string;
}

export interface AIUsageQueryResult {
  startDate: string;
  endDate: string;
  todayDate: string;
  todaySummary: AIUsageSummary;
  periodSummary: AIUsageSummary;
  dailyData: AIDailyAggregate[];
  modelBreakdown: AIModelAggregate[];
  binPath: string;
  binExists: boolean;
  binUpdatedAt: number | null;
  syncedDaysCount: number;
  oldestStoredDate: string | null;
  newestStoredDate: string | null;
  warning?: string;
}
