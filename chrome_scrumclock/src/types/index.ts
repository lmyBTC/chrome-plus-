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