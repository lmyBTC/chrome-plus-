import { storage } from '../../core/chrome/storage';
import { StockWatchItem, FinanceClipperResponse } from './types';

declare const chrome: any;

const STORAGE_KEY_FC_ID = 'finance_clipper_ext_id';

export const financeClient = {
  /**
   * 獲取配置的 FinanceClipper Extension ID
   */
  async getExtensionId(): Promise<string> {
    try {
      const userSettings = await storage.getUserSettings();
      if (userSettings.financeClipperExtensionId) {
        return userSettings.financeClipperExtensionId;
      }
      const local = await chrome.storage?.local?.get([STORAGE_KEY_FC_ID]);
      return local?.[STORAGE_KEY_FC_ID] || '';
    } catch {
      return '';
    }
  },

  /**
   * 儲存 FinanceClipper Extension ID
   */
  async setExtensionId(id: string): Promise<void> {
    try {
      const trimmed = id.trim();
      const userSettings = await storage.getUserSettings();
      await storage.saveUserSettings({
        ...userSettings,
        financeClipperExtensionId: trimmed
      });
      await chrome.storage?.local?.set({ [STORAGE_KEY_FC_ID]: trimmed });
    } catch (e) {
      console.warn('儲存 FinanceClipper ID 失敗', e);
    }
  },

  /**
   * 測試跨插件連線
   */
  async ping(extId?: string): Promise<boolean> {
    const id = extId || (await this.getExtensionId());
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false;

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'PING' }, (response: any) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch {
        resolve(false);
      }
    });
  },

  /**
   * 取得最新 WatchList 清單
   */
  async getWatchlist(): Promise<{ success: boolean; watchlist: StockWatchItem[]; error?: string }> {
    const id = await this.getExtensionId();
    if (!id) {
      return { success: false, watchlist: [], error: '尚未設定 FinanceClipper 擴充功能 ID' };
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false, watchlist: [], error: '非 Chrome 擴充功能環境' };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'GET_WATCHLIST' }, (response: FinanceClipperResponse) => {
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              watchlist: [],
              error: chrome.runtime.lastError.message || '無法連線至 FinanceClipper'
            });
            return;
          }
          if (response && response.success) {
            resolve({
              success: true,
              watchlist: response.watchlist || []
            });
          } else {
            resolve({
              success: false,
              watchlist: [],
              error: response?.error || '取得清單失敗'
            });
          }
        });
      } catch (err: any) {
        resolve({ success: false, watchlist: [], error: err?.message || '通訊例外' });
      }
    });
  },

  /**
   * 打開 FinanceClipper 獨立大螢幕儀表板
   */
  async openDashboard(ticker?: string): Promise<boolean> {
    const id = await this.getExtensionId();
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'OPEN_DASHBOARD', ticker }, (response: any) => {
          if (chrome.runtime.lastError || !response?.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch {
        resolve(false);
      }
    });
  },

  /**
   * 請求 FinanceClipper 在背景爬取指定股票
   */
  async crawlStock(ticker: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const id = await this.getExtensionId();
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false, error: '未連接 FinanceClipper' };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'CRAWL_STOCK', ticker }, (res: any) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { success: false });
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: err?.message });
      }
    });
  }
};
