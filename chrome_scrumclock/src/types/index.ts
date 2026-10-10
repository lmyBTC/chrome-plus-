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
  enableGoogleSync?: boolean; // Google 生態系自動同步開關 (日終 Sheets / 看板 Tasks)
  googleSyncLocalHubFallback?: boolean; // 當 GAS Webhook 逾時或失敗時，是否退避轉發至本機 Local Hub 佇列
  enableGoogleTasksSync?: boolean; // Google Tasks 雙向同步開關
  activityMonitorExtensionId?: string; // Activity Monitor Extension ID (預設 kjnoegggihncdaimlgfccccogghjapgn)
}

export interface NorthStarGoal {
  id: string;
  text: string;
}

export type GTDStatus = 'inbox' | 'next-action' | 'in-progress' | 'done' | 'someday';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * 計算 Checklist 統計資訊與完成百分比
 */
export function calculateChecklistProgress(checklist?: ChecklistItem[]): {
  total: number;
  completed: number;
  percent: number;
  summary: string;
} {
  if (!checklist || checklist.length === 0) {
    return { total: 0, completed: 0, percent: 0, summary: '' };
  }
  const total = checklist.length;
  const completed = checklist.filter((item) => item.completed).length;
  const percent = Math.round((completed / total) * 100);
  const summary = `${completed}/${total}`;
  return { total, completed, percent, summary };
}

export interface WeeklyMission {
  id: string;
  text: string;
  isCompleted: boolean;
  status?: GTDStatus; // GTD 狀態流轉（inbox / next-action / in-progress / done / someday）
  spentPomodoros?: number; // 已消耗番茄鐘數
  aiTip?: string;
  suggestedDuration?: number; // in minutes
  priority?: 'P0' | 'P1' | 'P2' | 'P3'; // 優先級 P0(Blocker)/P1/P2/P3
  notes?: string; // 新增：執行備註/備忘
  createdAt?: string; // 新增：建立時間 (格式: YYYY-MM-DD HH:mm)
  completedAt?: string; // 新增：完成時間
  progressPercent?: number; // 新增：進度百分比
  ticker?: string; // 關聯個股代碼 (例如 NVDA, 2330)
  tags?: string[]; // 任務標籤 (例如 ['#投資研究', '#美股'])
  url?: string; // 關聯網址
  deepLinkUrl?: string; // 跨插件反向喚起 Deep-Link (例如研報儀表板或影音秒數)
  estimatedPomodoros?: number; // 預估番茄鐘數
  gtdContext?: '@Focus' | '@Meeting' | '@Review' | '@Waiting-For' | '@Blocked'; // GTD 情境分類
  checklist?: ChecklistItem[]; // 任務 Checklist 子項目（支援勾選狀態與進度計算）
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
  interruptionCount?: number;
  interruptionReasons?: string[];
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
  pauseSprint: (reason?: string) => void;
  resumeSprint: () => void;
  stopSprint: () => void;
  logResult: (result: string) => void;
  recordInterruption: (reason: string) => void;
  whiteNoiseEnabled: boolean;
  setWhiteNoiseEnabled: (enabled: boolean) => void;
  whiteNoiseVolume: number;
  setWhiteNoiseVolume: (volume: number) => void;
} 