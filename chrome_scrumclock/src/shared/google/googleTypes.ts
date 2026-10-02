/**
 * Google 整合共用資料模型與型別定義 (SSOT)
 */

export interface GoogleAuthState {
  isAuthenticated: boolean;
  token?: string;
  userEmail?: string;
  lastAuthTime?: number;
  error?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  notes?: string;
  due?: string; // RFC 3339 timestamp (e.g. 2026-10-02T00:00:00.000Z)
  completed?: string;
  updated?: string;
  links?: Array<{ type: string; description: string; link: string }>;
}

export interface GoogleCalendarEventTime {
  dateTime: string; // RFC 3339 timestamp
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: GoogleCalendarEventTime;
  end: GoogleCalendarEventTime;
  colorId?: string; // Google Calendar 預設色彩編號 (如 11 為蕃茄紅)
  htmlLink?: string;
}

export interface GoogleSyncConfig {
  enabled: boolean;
  autoSyncTasksOnComplete: boolean;
  defaultTaskListId?: string;
  autoPushPomodoroToCalendar: boolean;
  calendarId: string; // 預設 'primary'
  calendarEventPrefix?: string; // 預設 '[🍅專注]'
}

export interface GoogleSyncResult {
  success: boolean;
  syncedCount: number;
  errors?: string[];
  lastSyncedAt: number;
}
