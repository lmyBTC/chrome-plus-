import { SprintLog, DailyReview, WeeklyMission, CalendarEvent } from '../../types';

export interface ITaskAdapter {
  pullTasksFromSheets(): Promise<boolean>;
  pullTasksFromGoogleTasks(): Promise<boolean>;
  /** 將本地任務清單完整上傳覆寫到 Google Sheet Task 分頁 */
  pushTasksToSheets(missions: import('../../types').WeeklyMission[]): Promise<boolean>;
  pushSprintLog(sprintLog: SprintLog, missionText: string): Promise<boolean>;
  pushReviewLog(review: DailyReview): Promise<boolean>;
  pushToCalendar(title: string, startTime: number, endTime: number, description?: string): Promise<boolean>;
  pullTodayCalendarEvents(): Promise<CalendarEvent[]>;
  completeTaskWithNotes(taskId: string, notes: string): Promise<boolean>;
  createBusyEvent(title: string, durationMinutes: number): Promise<string | null>;
  deleteBusyEvent(eventId: string): Promise<void>;
  quickCaptureTask(title: string, notes?: string): Promise<void>;
  breakdownTask(taskId: string): Promise<string[]>;
}
