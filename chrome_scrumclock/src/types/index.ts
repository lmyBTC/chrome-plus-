export interface UserSettings {
  userName: string;
  pomodoroDuration: number; // in minutes
  breakDuration: number; // in minutes
  endOfDayReviewTime: string; // HH:mm format
  distractionSites: string[];
  appsScriptUrl?: string;
  taskAdapter?: 'google' | 'notion';
  notionWebhookUrl?: string;
  whiteNoiseEnabled?: boolean;
  whiteNoiseVolume?: number;
  geminiApiKey?: string;
  enableWebhook?: boolean;
  webhookUrl?: string;
}

export interface NorthStarGoal {
  id: string;
  text: string;
}

export interface WeeklyMission {
  id: string;
  text: string;
  isCompleted: boolean;
  aiTip?: string;
  suggestedDuration?: number; // in minutes
  priority?: 'P1' | 'P2' | 'P3'; // 新增：優先級 P1/P2/P3
  notes?: string; // 新增：執行備註/備忘
  createdAt?: string; // 新增：建立時間 (格式: YYYY-MM-DD HH:mm)
  completedAt?: string; // 新增：完成時間
  progressPercent?: number; // 新增：進度百分比
}

export interface InboxItem {
  id: string;
  text: string;
  contextUrl?: string;
  createdAt: string;
  processed: boolean;
}

export interface CoreBattle {
  missionId: string;
  committedTime: string; // format: "HH:mm-HH:mm"
}

export interface CalendarEvent {
  title: string;
  startTime: number;
  endTime: number;
}

export interface SprintLog {
  sprintId: string;
  missionId: string;
  startTime: number; // timestamp
  endTime: number; // timestamp
  result: string;
}

export interface DailyReview {
  highlight: string;
  lesson: string;
  nextAction: string;
}

export interface DailyLog {
  coreBattles: CoreBattle[];
  sprintLogs: SprintLog[];
  review?: DailyReview;
}

export interface AppData {
  userSettings: UserSettings;
  northStarGoal: NorthStarGoal;
  weeklyMissions: WeeklyMission[];
  dailyLogs: Record<string, DailyLog>; // key: YYYY-MM-DD
  inboxItems?: InboxItem[]; // 新增：本地收件匣快取
}

export type TimerState = 'idle' | 'running' | 'paused' | 'logging' | 'break';

export interface TimerContextType {
  state: TimerState;
  timeLeft: number;
  currentSprint: SprintLog | null;
  startSprint: (missionId: string, customDurationMinutes?: number) => void;
  pauseSprint: () => void;
  resumeSprint: () => void;
  stopSprint: () => void;
  logResult: (result: string) => void;
  whiteNoiseEnabled: boolean;
  setWhiteNoiseEnabled: (enabled: boolean) => void;
  whiteNoiseVolume: number;
  setWhiteNoiseVolume: (volume: number) => void;
} 