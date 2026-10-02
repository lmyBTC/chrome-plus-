import { googleAuthClient } from './googleAuthClient';
import { GoogleCalendarEvent, GoogleCalendarEventTime } from './googleTypes';

export interface CreateEventOptions {
  description?: string;
  colorId?: string; // e.g. '11' for Tomato red in Google Calendar
  calendarId?: string; // 預設 'primary'
}

class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  /**
   * 封裝帶授權的 fetch 請求，支援 401 自動刷新 Token
   */
  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    let token = await googleAuthClient.getAuthToken(false);

    let res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      await googleAuthClient.removeCachedToken();
      token = await googleAuthClient.getAuthToken(true);
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google Calendar API 錯誤 (${res.status}): ${errText}`);
    }

    return res;
  }

  /**
   * 格式化時間為 RFC 3339 格式
   */
  private toRfc3339(time: number | string | Date): string {
    if (typeof time === 'string') {
      const date = new Date(time);
      if (!isNaN(date.getTime())) return date.toISOString();
      return time;
    }
    return new Date(time).toISOString();
  }

  /**
   * 取得指定日曆今天的事件列表
   */
  public async getTodayEvents(calendarId = 'primary'): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const url = `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`;
    const res = await this.fetchWithAuth(url);
    const data = await res.json();

    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || '(無標題)',
      description: item.description,
      start: item.start,
      end: item.end,
      colorId: item.colorId,
      htmlLink: item.htmlLink,
    }));
  }

  /**
   * 建立 Google Calendar 事件
   */
  public async createEvent(
    summary: string,
    startTime: number | string | Date,
    endTime: number | string | Date,
    options: CreateEventOptions = {}
  ): Promise<GoogleCalendarEvent> {
    const calendarId = options.calendarId || 'primary';
    const payload: any = {
      summary,
      start: { dateTime: this.toRfc3339(startTime) },
      end: { dateTime: this.toRfc3339(endTime) },
    };

    if (options.description) {
      payload.description = options.description;
    }
    if (options.colorId) {
      payload.colorId = options.colorId;
    }

    const res = await this.fetchWithAuth(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    const item = await res.json();
    return {
      id: item.id,
      summary: item.summary,
      description: item.description,
      start: item.start,
      end: item.end,
      colorId: item.colorId,
      htmlLink: item.htmlLink,
    };
  }

  /**
   * 快速排定時間箱 (Timebox) 預約事件
   * @param title 任務標題
   * @param startTime 開始時間 (timestamp 或 ISO 字串)
   * @param durationMinutes 時間箱長度 (分鐘，預設 25)
   * @param options 額外設定
   */
  public async createTimeboxEvent(
    title: string,
    startTime: number | string | Date,
    durationMinutes = 25,
    options: CreateEventOptions = {}
  ): Promise<GoogleCalendarEvent> {
    const startMs = new Date(startTime).getTime();
    const endMs = startMs + durationMinutes * 60 * 1000;
    const summary = title.startsWith('[時間箱]') ? title : `[時間箱] ${title}`;

    return this.createEvent(summary, startMs, endMs, {
      ...options,
      colorId: options.colorId || '5', // 5 為黃色/香蕉黃，代表時間箱預約
      description: options.description || `ScrumClock 時間箱排程 (${durationMinutes} 分鐘)`,
    });
  }

  /**
   * 番茄鐘衝刺實績自動回填至 Google Calendar
   * 使用蕃茄紅 (colorId 11) 標記真實投入之專注區塊
   */
  public async recordPomodoroEvent(
    missionTitle: string,
    startTime: number,
    endTime: number,
    sprintResult?: string,
    calendarId = 'primary'
  ): Promise<GoogleCalendarEvent> {
    const summary = missionTitle.startsWith('[🍅專注]') ? missionTitle : `[🍅專注] ${missionTitle}`;
    const descParts: string[] = ['來自 ScrumClock 番茄鐘專注實績記錄'];
    if (sprintResult && sprintResult.trim()) {
      descParts.push(`\n衝刺成果：\n${sprintResult}`);
    }

    return this.createEvent(summary, startTime, endTime, {
      calendarId,
      colorId: '11', // Google Calendar Tomato Red (11)
      description: descParts.join('\n'),
    });
  }

  /**
   * 刪除指定日曆事件
   */
  public async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
    await this.fetchWithAuth(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
