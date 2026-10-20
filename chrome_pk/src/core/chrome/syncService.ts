import { AppData, WeeklyMission, DailyLog, UserSettings } from '../../types';
import { storage } from './storage';

// 宣告 Chrome 內建 API
declare const chrome: any;

export interface SyncResult {
  success: boolean;
  message?: string;
  lastSyncTime?: string;
}

export const syncService = {
  /**
   * 推送本地 AppData 到雲端 Google Drive
   */
  async pushToCloud(): Promise<SyncResult> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return { success: false, message: '請先在設定中填寫 Google Apps Script URL' };
      }

      // 取得全量資料
      const localData = await storage.getAllData();
      
      // 同時撈取 bookmarks
      const bookmarkRes = await chrome.storage.local.get('bookmarks');
      const bookmarks = bookmarkRes.bookmarks || [];

      // 包裝成完整同步 Payload
      const syncPayload = {
        ...localData,
        bookmarks
      };

      const response = await fetch(settings.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'push_app_data',
          appData: syncPayload
        }),
        redirect: 'follow'
      });

      const result = await response.json();
      if (result.status === 'success') {
        const nowStr = new Date().toLocaleString();
        await chrome.storage.local.set({ lastSyncTime: nowStr });
        return { success: true, lastSyncTime: nowStr };
      }

      return { success: false, message: result.message || '雲端同步寫入失敗' };
    } catch (e: any) {
      console.error('Push to Cloud Error:', e);
      return { success: false, message: e.message || '網路通訊失敗，請檢查 API URL' };
    }
  },

  /**
   * 從雲端拉取資料，並與本地進行智慧合併，隨後寫回本地
   */
  async pullAndMergeFromCloud(): Promise<SyncResult> {
    try {
      const settings = await storage.getUserSettings();
      if (!settings.appsScriptUrl) {
        return { success: false, message: '請先在設定中填寫 Google Apps Script URL' };
      }

      const url = new URL(settings.appsScriptUrl);
      url.searchParams.append('action', 'pull_app_data');

      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow'
      });

      const result = await response.json();
      if (result.status !== 'success') {
        return { success: false, message: result.message || '雲端拉取失敗' };
      }

      const cloudData = result.data;
      if (!cloudData || typeof cloudData !== 'object') {
        return { success: false, message: '雲端目前尚無有效的備份資料，請先執行「推送到雲端」' };
      }

      // 取得本地全量資料
      const localData = await storage.getAllData();
      const localBookmarkRes = await chrome.storage.local.get('bookmarks');
      const localBookmarks = localBookmarkRes.bookmarks || [];

      // 1. 合併基本資料與 Settings (不覆蓋本地的 appsScriptUrl 與 api key)
      const mergedSettings: UserSettings = {
        ...(cloudData.userSettings || {}),
        ...localData.userSettings,
        // 確保關鍵的連接/配置參數保留本地
        appsScriptUrl: localData.userSettings.appsScriptUrl || cloudData.userSettings?.appsScriptUrl,
        spreadsheetUrl: localData.userSettings.spreadsheetUrl || cloudData.userSettings?.spreadsheetUrl,
        geminiApiKey: localData.userSettings.geminiApiKey || cloudData.userSettings?.geminiApiKey,
      };

      // 2. 合併北極星目標
      const cloudGoal = cloudData.northStarGoal || { id: 'default-goal', text: '設定你的北極星目標' };
      const localGoal = localData.northStarGoal;
      const mergedGoal = localGoal.text !== '設定你的北極星目標' 
        ? localGoal 
        : (cloudGoal.text !== '設定你的北極星目標' ? cloudGoal : localGoal);

      // 3. 合併每週任務 (WeeklyMissions) - 以 ID 進行去重與聯集
      const missionMap = new Map<string, WeeklyMission>();
      const cloudMissions: WeeklyMission[] = cloudData.weeklyMissions || [];
      const localMissions: WeeklyMission[] = localData.weeklyMissions || [];

      cloudMissions.forEach(m => missionMap.set(m.id, { ...m }));
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
      const mergedMissions = Array.from(missionMap.values());

      // 4. 合併每日日誌 (DailyLogs) - key: YYYY-MM-DD
      const cloudLogs: Record<string, DailyLog> = cloudData.dailyLogs || {};
      const localLogs: Record<string, DailyLog> = localData.dailyLogs || {};
      const mergedLogs: Record<string, DailyLog> = { ...cloudLogs };

      Object.keys(localLogs).forEach(date => {
        const localLog = localLogs[date];
        const cloudLog = mergedLogs[date];

        if (cloudLog) {
          // 合併 coreBattles (以 missionId 和 committedTime 組合去重)
          const battleMap = new Map<string, any>();
          (cloudLog.coreBattles || []).forEach(b => battleMap.set(`${b.missionId}-${b.committedTime}`, b));
          (localLog.coreBattles || []).forEach(b => battleMap.set(`${b.missionId}-${b.committedTime}`, b));
          const mergedBattles = Array.from(battleMap.values());

          // 合併 sprintLogs (以 sprintId 或開始結束時間去重)
          const sprintMap = new Map<string, any>();
          (cloudLog.sprintLogs || []).forEach(s => sprintMap.set(s.sprintId || `${s.startTime}-${s.endTime}`, s));
          (localLog.sprintLogs || []).forEach(s => sprintMap.set(s.sprintId || `${s.startTime}-${s.endTime}`, s));
          const mergedSprints = Array.from(sprintMap.values());

          // 合併 Daily Review (保留有填寫的，如果都填了，取字數多/包含內容較多者)
          let mergedReview = cloudLog.review;
          if (localLog.review) {
            if (!mergedReview) {
              mergedReview = localLog.review;
            } else {
              // 都有 review 時進行欄位融合或保留長度長者
              mergedReview = {
                highlight: localLog.review.highlight.length > mergedReview.highlight.length ? localLog.review.highlight : mergedReview.highlight,
                lesson: localLog.review.lesson.length > mergedReview.lesson.length ? localLog.review.lesson : mergedReview.lesson,
                nextAction: localLog.review.nextAction.length > mergedReview.nextAction.length ? localLog.review.nextAction : mergedReview.nextAction,
              };
            }
          }

          mergedLogs[date] = {
            coreBattles: mergedBattles,
            sprintLogs: mergedSprints,
            review: mergedReview
          };
        } else {
          mergedLogs[date] = { ...localLog };
        }
      });

      // 5. 合併書籤 (bookmarks)
      const cloudBookmarks: any[] = cloudData.bookmarks || [];
      const mergedBookmarksMap = new Map<string, any>();
      cloudBookmarks.forEach((b: any) => mergedBookmarksMap.set(b.id || b.url, b));
      localBookmarks.forEach((b: any) => {
        // 重複的 URL 或 ID 則以本地為準
        mergedBookmarksMap.set(b.id || b.url, b);
      });
      const mergedBookmarks = Array.from(mergedBookmarksMap.values());

      // 6. 寫回本地 storage
      const finalMergedData: AppData = {
        userSettings: mergedSettings,
        northStarGoal: mergedGoal,
        weeklyMissions: mergedMissions,
        dailyLogs: mergedLogs
      };

      await storage.saveAllData(finalMergedData);
      await chrome.storage.local.set({ bookmarks: mergedBookmarks });

      const nowStr = new Date().toLocaleString();
      await chrome.storage.local.set({ lastSyncTime: nowStr });

      return { success: true, lastSyncTime: nowStr };
    } catch (e: any) {
      console.error('Pull & Merge from Cloud Error:', e);
      return { success: false, message: e.message || '網路通訊失敗，請檢查 API URL' };
    }
  },

  /**
   * 取得最後一次同步時間
   */
  async getLastSyncTime(): Promise<string> {
    try {
      const res = await chrome.storage.local.get('lastSyncTime');
      return res.lastSyncTime || '從未同步';
    } catch {
      return '無法載入時間';
    }
  }
};
