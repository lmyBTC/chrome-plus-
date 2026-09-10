import { SprintLog, DailyReview, WeeklyMission, NorthStarGoal, CalendarEvent } from '../../types';
import { storage } from '../chrome/storage';
import { ITaskAdapter } from './ITaskAdapter';
import { GoogleTaskAdapter } from './adapters/GoogleTaskAdapter';
import { NotionTaskAdapter } from './adapters/NotionTaskAdapter';
import { offlineQueue } from './offlineQueue';

const googleAdapter = new GoogleTaskAdapter();
const notionAdapter = new NotionTaskAdapter();

const getAdapter = async (): Promise<ITaskAdapter> => {
  const settings = await storage.getUserSettings();
  if (settings.taskAdapter === 'notion') {
    return notionAdapter;
  }
  return googleAdapter;
};

export const sync = {
  async pullTasksFromSheets(): Promise<boolean> {
    const adapter = await getAdapter();
    return adapter.pullTasksFromSheets();
  },
  async fullPullTasksFromSheets(): Promise<boolean> {
    const adapter = await getAdapter();
    if ((adapter as any).fullPullTasksFromSheets) {
      return (adapter as any).fullPullTasksFromSheets();
    }
    return adapter.pullTasksFromSheets();
  },
  async pushTasksToSheets(missions: WeeklyMission[]): Promise<boolean> {
    const adapter = await getAdapter();
    return adapter.pushTasksToSheets(missions);
  },
  async pullTasksFromGoogleTasks(): Promise<boolean> {
    const adapter = await getAdapter();
    return adapter.pullTasksFromGoogleTasks();
  },
  async pushSprintLog(sprintLog: SprintLog, missionText: string): Promise<boolean> {
    const adapter = await getAdapter();
    const success = await adapter.pushSprintLog(sprintLog, missionText);
    if (!success && adapter instanceof GoogleTaskAdapter) {
      const today = new Date(sprintLog.startTime).toISOString().split('T')[0];
      await offlineQueue.add('log_sprint', {
        date: today,
        missionText: missionText,
        result: sprintLog.result
      });
      return true; // Queued for later
    }
    return success;
  },
  async pushReviewLog(review: DailyReview): Promise<boolean> {
    const adapter = await getAdapter();
    const success = await adapter.pushReviewLog(review);
    if (!success && adapter instanceof GoogleTaskAdapter) {
      const today = new Date().toISOString().split('T')[0];
      await offlineQueue.add('log_review', {
        date: today,
        highlight: review.highlight,
        lesson: review.lesson,
        nextAction: review.nextAction
      });
      return true; // Queued
    }
    return success;
  },
  async pushToCalendar(title: string, startTime: number, endTime: number, description?: string): Promise<boolean> {
    const adapter = await getAdapter();
    return adapter.pushToCalendar(title, startTime, endTime, description);
  },
  async pullTodayCalendarEvents(): Promise<CalendarEvent[]> {
    const adapter = await getAdapter();
    return adapter.pullTodayCalendarEvents();
  },
  async completeTaskWithNotes(taskId: string, notes: string): Promise<boolean> {
    const adapter = await getAdapter();
    const success = await adapter.completeTaskWithNotes(taskId, notes);
    if (!success && adapter instanceof GoogleTaskAdapter) {
      await offlineQueue.add('complete_task_with_notes', {
        taskId,
        notes
      });
      return true; // Queued
    }
    return success;
  },
  async createBusyEvent(title: string, durationMinutes: number): Promise<string | null> {
    const adapter = await getAdapter();
    return adapter.createBusyEvent(title, durationMinutes);
  },
  async deleteBusyEvent(eventId: string): Promise<void> {
    const adapter = await getAdapter();
    return adapter.deleteBusyEvent(eventId);
  },
  async quickCaptureTask(title: string, notes?: string): Promise<void> {
    const adapter = await getAdapter();
    try {
      await adapter.quickCaptureTask(title, notes);
    } catch (e) {
      if (adapter instanceof GoogleTaskAdapter) {
        await offlineQueue.add('log_inbox', {
          title,
          notes
        });
      }
    }
  },
  async breakdownTask(taskId: string): Promise<string[]> {
    const adapter = await getAdapter();
    if (adapter.breakdownTask) {
      return adapter.breakdownTask(taskId);
    }
    return [];
  }
};
