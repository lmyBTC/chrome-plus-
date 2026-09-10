import { SprintLog, DailyReview, WeeklyMission, CalendarEvent } from '../../../types';
import { storage } from '../../chrome/storage';
import { ITaskAdapter } from '../ITaskAdapter';

export class GoogleTaskAdapter implements ITaskAdapter {
  async pullTasksFromSheets(): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      // 裸 GET（無 action）= GAS 預設分支：讀取 Sheet Task 分頁的 B1(北極星) 與 B2+(週任務)
      const response = await fetch(settings.appsScriptUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const data = await response.json();
      if (data.status === 'success' && data.data) {
        // 如果 GAS 有回傳試算表真實網址，自動儲存至設定並同步至傳送門
        const returnedSheetUrl = data.spreadsheetUrl || data.data.spreadsheetUrl;
        if (returnedSheetUrl) {
          settings.spreadsheetUrl = returnedSheetUrl;
          await storage.saveUserSettings(settings);

          const bookmarkRes = await chrome.storage.local.get('bookmarks');
          if (bookmarkRes && Array.isArray(bookmarkRes.bookmarks)) {
            const updatedBookmarks = bookmarkRes.bookmarks.map((b: any) => {
              if (b.id === 'google-sheets' || b.url.includes('sheets.google.com') || b.title.toLowerCase().includes('google sheets')) {
                return { ...b, url: returnedSheetUrl };
              }
              return b;
            });
            await chrome.storage.local.set({ bookmarks: updatedBookmarks });
          }
        }

        // 合併北極星目標（僅在雲端有實際內容時才更新）
        const cloudGoal = data.data.northStarGoal;
        if (cloudGoal && cloudGoal.text && cloudGoal.text !== '設定你的北極星目標') {
          await storage.saveNorthStarGoal(cloudGoal);
        }

        // 智慧合併週任務：以 ID 去重取聯集，Sheet 空時不覆寫本地
        const cloudMissions: WeeklyMission[] = data.data.weeklyMissions || [];
        if (cloudMissions.length > 0) {
          const localMissions = await storage.getWeeklyMissions();
          const missionMap = new Map<string, WeeklyMission>();

          // 先放雲端(Sheet)資料作為基底
          cloudMissions.forEach(m => missionMap.set(m.id, { ...m }));

          // 本地資料疊加（isCompleted 取 OR，本地 aiTip 優先）
          localMissions.forEach(localM => {
            const existing = missionMap.get(localM.id);
            if (existing) {
              missionMap.set(localM.id, {
                ...existing,
                ...localM,
                isCompleted: existing.isCompleted || localM.isCompleted,
                aiTip: localM.aiTip || existing.aiTip,
                suggestedDuration: localM.suggestedDuration || existing.suggestedDuration
              });
            } else {
              missionMap.set(localM.id, { ...localM });
            }
          });

          await storage.saveWeeklyMissions(Array.from(missionMap.values()));
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Pull Tasks Error:', error);
      return false;
    }
  }

  async fullPullTasksFromSheets(): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) return false;

      const response = await fetch(settings.appsScriptUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        if (data.data.northStarGoal) {
          await storage.saveNorthStarGoal(data.data.northStarGoal);
        }
        // 完全拉取：直接覆寫本地（Sheet 空時保持空）
        await storage.saveWeeklyMissions(data.data.weeklyMissions || []);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Full Pull Tasks Error:', error);
      return false;
    }
  }

  async pushTasksToSheets(missions: WeeklyMission[]): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) return false;

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync_tasks_to_sheet',
          tasks: missions.map(m => ({
            id: m.id,
            text: m.text,
            isCompleted: m.isCompleted
          }))
        }),
        redirect: 'follow'
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Push Tasks to Sheet Error:', error);
      return false;
    }
  }

  async pullTasksFromGoogleTasks(): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      const url = new URL(settings.appsScriptUrl);
      url.searchParams.append('action', 'get_tasks');

      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });

      const data = await response.json();
      if (data.status === 'success' && data.data) {
        // 將 Google Tasks 匯入為週任務 (WeeklyMissions)
        await storage.saveWeeklyMissions(data.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Pull Google Tasks Error:', error);
      return false;
    }
  }

  async pushSprintLog(sprintLog: SprintLog, missionText: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      const today = new Date().toISOString().split('T')[0];
      const payload = {
        action: 'log_sprint',
        date: today,
        missionText: missionText,
        result: sprintLog.result
      };

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Push Sprint Log Error:', error);
      return false;
    }
  }

  async pushReviewLog(review: DailyReview): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      const today = new Date().toISOString().split('T')[0];
      const payload = {
        action: 'log_review',
        date: today,
        highlight: review.highlight,
        lesson: review.lesson,
        nextAction: review.nextAction
      };

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Push Review Log Error:', error);
      return false;
    }
  }

  async pushToCalendar(title: string, startTime: number, endTime: number, description?: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      const payload = {
        action: 'create_event',
        title,
        startTime,
        endTime,
        description
      };

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Push to Calendar Error:', error);
      return false;
    }
  }

  async pullTodayCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return [];
      }

      const url = new URL(settings.appsScriptUrl);
      url.searchParams.append('action', 'get_today_events');

      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });

      const data = await response.json();
      if (data.status === 'success' && data.data) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Pull Calendar Events Error:', error);
      return [];
    }
  }

  async completeTaskWithNotes(taskId: string, notes: string): Promise<boolean> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return false;
      }

      const payload = {
        action: 'complete_task_with_notes',
        taskId,
        notes
      };

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });

      const data = await response.json();
      return data.status === 'success';
    } catch (error) {
      console.error('Complete Task Error:', error);
      return false;
    }
  }

  async createBusyEvent(title: string, durationMinutes: number): Promise<string | null> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) return null;

      const startTime = Date.now();
      const endTime = startTime + durationMinutes * 60 * 1000;
      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'create_event',
          title: `[Deep Work] ${title}`,
          startTime,
          endTime,
          description: "Power Kit 專注模式防禦陣地"
        })
      });
      const data = await response.json();
      return data.eventId || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async deleteBusyEvent(eventId: string): Promise<void> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) return;

      await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_event',
          eventId
        })
      });
    } catch (e) {
      console.error(e);
    }
  }

  async quickCaptureTask(title: string, notes?: string): Promise<void> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) return;

      await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'log_inbox',
          title,
          notes
        })
      });
    } catch (e) {
      console.error(e);
    }
  }

  async breakdownTask(taskId: string): Promise<string[]> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return this.getFallbackBreakdown(taskId);
      }

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ai_breakdown',
          taskId
        }),
        redirect: 'follow'
      });

      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.subtasks) && data.subtasks.length > 0) {
        return data.subtasks;
      }
      return this.getFallbackBreakdown(taskId);
    } catch (error) {
      console.error('Breakdown Task Error:', error);
      return this.getFallbackBreakdown(taskId);
    }
  }

  private async getFallbackBreakdown(taskId: string): Promise<string[]> {
    try {
      const missions = await storage.getWeeklyMissions();
      const missionText = missions.find(m => m.id === taskId)?.text || '大任務';
      return [
        `${missionText} — 規劃與分析 (1 🍅)`,
        `${missionText} — 核心實作與開發 (2 🍅)`,
        `${missionText} — 測試與優化 (1 🍅)`
      ];
    } catch (e) {
      return [
        '步驟一：規劃與分析 (1 🍅)',
        '步驟二：核心實作與開發 (2 🍅)',
        '步驟三：測試與優化 (1 🍅)'
      ];
    }
  }
}
