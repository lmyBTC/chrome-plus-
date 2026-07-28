import { MostImportantTask, TimeBlock } from '../../types';

export const googleApi = {
  // 同步 MIT 至 Google Tasks
  async syncMitToTasks(mit: MostImportantTask, token: string): Promise<string | null> {
    try {
      // 1. 取得預設 Task List (或者可以尋找名稱為 "24h Reset System" 的 Task List)
      const listResponse = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listResponse.json();
      if (!listData.items || listData.items.length === 0) return null;
      
      const taskListId = listData.items[0].id; // 簡化處理，取第一個 List

      // 2. 建立或更新 Task
      const taskBody = {
        title: `[MIT] ${mit.title}`,
        status: mit.completed ? 'completed' : 'needsAction'
      };

      let url = `https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`;
      let method = 'POST';

      if (mit.googleTaskId) {
        url = `${url}/${mit.googleTaskId}`;
        method = 'PUT';
        // 需保留原始 id 才能更新
        (taskBody as any).id = mit.googleTaskId;
      }

      const taskResponse = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskBody)
      });

      const taskData = await taskResponse.json();
      return taskData.id || null;
    } catch (error) {
      console.error('syncMitToTasks 發生錯誤:', error);
      return null;
    }
  },

  // 同步當日排程至 Google Calendar
  async syncScheduleToCalendar(schedule: TimeBlock[], token: string): Promise<void> {
    try {
      // 簡化處理：將所有排程寫入 'primary' 日曆
      const calendarId = 'primary';
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      for (const block of schedule) {
        const startTime = new Date(`${today}T${block.startTime}:00`).toISOString();
        const endTime = new Date(`${today}T${block.endTime}:00`).toISOString();

        const eventBody = {
          summary: `[TimeBlock] ${block.title}`,
          start: { dateTime: startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
        };

        let url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
        let method = 'POST';

        if (block.googleEventId) {
          url = `${url}/${block.googleEventId}`;
          method = 'PUT';
        }

        await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventBody)
        });
      }
    } catch (error) {
      console.error('syncScheduleToCalendar 發生錯誤:', error);
    }
  }
};
