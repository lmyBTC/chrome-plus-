import { SprintLog, DailyReview, CalendarEvent } from '../../../types';
import { storage } from '../../chrome/storage';
import { ITaskAdapter } from '../ITaskAdapter';

export class NotionTaskAdapter implements ITaskAdapter {
  async pullTasksFromSheets(): Promise<boolean> {
    console.warn('NotionTaskAdapter does not support pulling tasks from Google Sheets');
    return false;
  }

  async pushTasksToSheets(_missions: import('../../../types').WeeklyMission[]): Promise<boolean> {
    console.warn('NotionTaskAdapter does not support pushing tasks to Google Sheets');
    return false;
  }

  async pullTasksFromGoogleTasks(): Promise<boolean> {
    console.warn('NotionTaskAdapter does not support Google Tasks');
    return false;
  }

  async pushSprintLog(sprintLog: SprintLog, missionText: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.notionWebhookUrl) {
        console.warn('Notion Webhook URL is not set', sprintLog, missionText);
        return false;
      }

      const response = await fetch(settings.notionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_sprint',
          sprintId: sprintLog.sprintId,
          missionId: sprintLog.missionId,
          missionText,
          startTime: sprintLog.startTime,
          endTime: sprintLog.endTime,
          result: sprintLog.result
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Notion pushSprintLog error:', e);
      return false;
    }
  }

  async pushReviewLog(review: DailyReview): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.notionWebhookUrl) {
        console.warn('Notion Webhook URL is not set', review);
        return false;
      }

      const response = await fetch(settings.notionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_review',
          review
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Notion pushReviewLog error:', e);
      return false;
    }
  }

  async pushToCalendar(title: string, startTime: number, endTime: number, description?: string): Promise<boolean> {
    console.warn('NotionTaskAdapter does not support Google Calendar', title, startTime, endTime, description);
    return false;
  }

  async pullTodayCalendarEvents(): Promise<CalendarEvent[]> {
    console.warn('NotionTaskAdapter does not support Google Calendar');
    return [];
  }

  async completeTaskWithNotes(taskId: string, notes: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.notionWebhookUrl) {
        console.warn('Notion Webhook URL is not set', taskId, notes);
        return false;
      }

      const response = await fetch(settings.notionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          taskId,
          notes
        })
      });
      return response.ok;
    } catch (e) {
      console.error('Notion completeTaskWithNotes error:', e);
      return false;
    }
  }

  async createBusyEvent(title: string, durationMinutes: number): Promise<string | null> {
    console.warn('NotionTaskAdapter does not support Google Calendar', title, durationMinutes);
    return null;
  }

  async deleteBusyEvent(eventId: string): Promise<void> {
    console.warn('NotionTaskAdapter does not support Google Calendar', eventId);
  }

  async quickCaptureTask(title: string, notes?: string): Promise<void> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.notionWebhookUrl) {
        console.warn('Notion Webhook URL is not set', title, notes);
        return;
      }

      await fetch(settings.notionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_capture_task',
          title,
          notes
        })
      });
    } catch (e) {
      console.error('Notion quickCaptureTask error:', e);
    }
  }

  async breakdownTask(taskId: string): Promise<string[]> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.notionWebhookUrl) {
        console.warn('Notion Webhook URL is not set', taskId);
        return [];
      }

      const response = await fetch(settings.notionWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'breakdown_task',
          taskId
        })
      });
      const data = await response.json();
      if (data && Array.isArray(data.subtasks)) {
        return data.subtasks;
      }
      return [];
    } catch (e) {
      console.error('Notion breakdownTask error:', e);
      return [];
    }
  }
}
