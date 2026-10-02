export interface UserSettings {
  userName: string;
  pomodoroDuration: number; // in minutes
  breakDuration: number; // in minutes
  endOfDayReviewTime: string; // HH:mm format
  distractionSites: string[];
  appsScriptUrl?: string;
  spreadsheetUrl?: string;
  taskAdapter?: 'google' | 'notion';
  notionWebhookUrl?: string;
  whiteNoiseEnabled?: boolean;
  whiteNoiseVolume?: number;
  geminiApiKey?: string;
  enableWebhook?: boolean;
  webhookUrl?: string;
  webhookSecretToken?: string;
  financeClipperExtensionId?: string;
  enableGtdCapture?: boolean; // GTD 全域快捷捕捉開關 (Alt+Q / 右鍵)
  enableWipLimit?: boolean; // 看板 In Progress 在製品限制開關
  maxWipLimit?: number; // In Progress WIP 卡片上限 (預設 3)
}

export interface NorthStarGoal {
  id: string;
  text: string;
}

export type GTDStatus = 'inbox' | 'next-action' | 'in-progress' | 'done' | 'someday';

export interface WeeklyMission {
  id: string;
  text: string;
  isCompleted: boolean;
  status?: GTDStatus; // GTD 狀態流轉（inbox / next-action / in-progress / done / someday）
  spentPomodoros?: number; // 已消耗番茄鐘數
  aiTip?: string;
  suggestedDuration?: number; // in minutes
  priority?: 'P1' | 'P2' | 'P3'; // 新增：優先級 P1/P2/P3
  notes?: string; // 新增：執行備註/備忘
  createdAt?: string; // 新增：建立時間 (格式: YYYY-MM-DD HH:mm)
  completedAt?: string; // 新增：完成時間
  progressPercent?: number; // 新增：進度百分比
  ticker?: string; // 關聯個股代碼 (例如 NVDA, 2330)
  tags?: string[]; // 任務標籤 (例如 ['#投資研究', '#美股'])
  url?: string; // 關聯網址
  estimatedPomodoros?: number; // 預估番茄鐘數
  gtdContext?: '@Focus' | '@Meeting' | '@Review' | '@Waiting-For' | '@Blocked'; // GTD 情境分類
  workspaceSync?: {
    googleTaskId?: string;
    googleCalendarEventId?: string;
    googleSheetRowId?: string;
    lastSyncedAt?: number;
    syncStatus?: 'synced' | 'pending' | 'failed' | 'idle';
  };
  sourcePlugin?: string; // 來源插件識別 (如 FINANCE_CLIPPER, VIDEO_SPEED_PLUS 等)
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