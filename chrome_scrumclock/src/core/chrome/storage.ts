import { AppData, UserSettings, NorthStarGoal, WeeklyMission, DailyLog, InboxItem } from '../../types';

// 確保 Chrome API 可用
declare const chrome: any;

const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  pomodoroDuration: 25,
  breakDuration: 5,
  endOfDayReviewTime: '21:00',
  distractionSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com'],
  appsScriptUrl: '',
  whiteNoiseEnabled: false,
  whiteNoiseVolume: 0.5,
  geminiApiKey: '',
  enableWebhook: false,
  webhookUrl: ''
};

const DEFAULT_NORTH_STAR_GOAL: NorthStarGoal = {
  id: 'default-goal',
  text: '設定你的北極星目標'
};

const DEFAULT_WEEKLY_MISSIONS: WeeklyMission[] = [
  { id: 'mission-1', text: '完成產品規格書', isCompleted: false },
  { id: 'mission-2', text: '學習 React Hooks', isCompleted: false }
];

export const storage = {
  // 獲取所有資料
  async getAllData(): Promise<AppData> {
    const result = await chrome.storage.local.get([
      'userSettings',
      'northStarGoal',
      'weeklyMissions',
      'dailyLogs',
      'inboxItems'
    ]);

    return {
      userSettings: result.userSettings || DEFAULT_SETTINGS,
      northStarGoal: result.northStarGoal || DEFAULT_NORTH_STAR_GOAL,
      weeklyMissions: result.weeklyMissions || DEFAULT_WEEKLY_MISSIONS,
      dailyLogs: result.dailyLogs || {},
      inboxItems: result.inboxItems || []
    };
  },

  // 儲存所有資料
  async saveAllData(data: AppData): Promise<void> {
    await chrome.storage.local.set({
      userSettings: data.userSettings,
      northStarGoal: data.northStarGoal,
      weeklyMissions: data.weeklyMissions,
      dailyLogs: data.dailyLogs,
      inboxItems: data.inboxItems || []
    });
  },

  // 獲取使用者設定
  async getUserSettings(): Promise<UserSettings> {
    const result = await chrome.storage.local.get('userSettings');
    return result.userSettings || DEFAULT_SETTINGS;
  },

  // 儲存使用者設定
  async saveUserSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({ userSettings: settings });
  },

  // 獲取北極星目標
  async getNorthStarGoal(): Promise<NorthStarGoal> {
    const result = await chrome.storage.local.get('northStarGoal');
    return result.northStarGoal || DEFAULT_NORTH_STAR_GOAL;
  },

  // 儲存北極星目標
  async saveNorthStarGoal(goal: NorthStarGoal): Promise<void> {
    await chrome.storage.local.set({ northStarGoal: goal });
  },

  // 獲取週任務
  async getWeeklyMissions(): Promise<WeeklyMission[]> {
    const result = await chrome.storage.local.get('weeklyMissions');
    return result.weeklyMissions || DEFAULT_WEEKLY_MISSIONS;
  },

  // 儲存週任務
  async saveWeeklyMissions(missions: WeeklyMission[]): Promise<void> {
    await chrome.storage.local.set({ weeklyMissions: missions });
  },

  async getTomorrowBattles(): Promise<string[]> {
    const result = await chrome.storage.local.get('tomorrowBattles');
    return result.tomorrowBattles || [];
  },

  async saveTomorrowBattles(battles: string[]): Promise<void> {
    await chrome.storage.local.set({ tomorrowBattles: battles });
  },

  // 獲取指定日期的日誌
  async getDailyLog(date: string): Promise<DailyLog | null> {
    const result = await chrome.storage.local.get('dailyLogs');
    const dailyLogs = result.dailyLogs || {};
    return dailyLogs[date] || null;
  },

  // 儲存指定日期的日誌
  async saveDailyLog(date: string, log: DailyLog): Promise<void> {
    const result = await chrome.storage.local.get('dailyLogs');
    const dailyLogs = result.dailyLogs || {};
    dailyLogs[date] = log;
    await chrome.storage.local.set({ dailyLogs });
  },

  // 獲取今日日誌
  async getTodayLog(): Promise<DailyLog> {
    const today = new Date().toISOString().split('T')[0];
    const log = await this.getDailyLog(today);
    return log || { coreBattles: [], sprintLogs: [] };
  },

  // 儲存今日日誌
  async saveTodayLog(log: DailyLog): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    await this.saveDailyLog(today, log);
  },

  // 取得過去 7 天的日誌
  async getLast7DaysLogs(): Promise<Record<string, DailyLog>> {
    const result = await chrome.storage.local.get('dailyLogs');
    const allLogs = result.dailyLogs || {};
    const recentLogs: Record<string, DailyLog> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      if (allLogs[dateString]) {
        recentLogs[dateString] = allLogs[dateString];
      }
    }
    return recentLogs;
  },

  // 獲取收件匣內容
  async getInboxItems(): Promise<InboxItem[]> {
    const result = await chrome.storage.local.get('inboxItems');
    return result.inboxItems || [];
  },

  // 儲存收件匣內容
  async saveInboxItems(items: InboxItem[]): Promise<void> {
    await chrome.storage.local.set({ inboxItems: items });
  }
}; 