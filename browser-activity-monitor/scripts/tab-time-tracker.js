/**
 * tab-time-tracker.js - 前台分頁焦點與有效停留時長追蹤器 (AM-01)
 * 專為 PM 工作流設計，精準記錄前台網頁真實活躍時間，排除背景分頁雜訊。
 */

import { classifyDomain, extractHostname } from './domain-classifier.js';
import { profiler } from './resource-profiler.js';

export class TabTimeTracker {
  /**
   * @param {import('./storage-db.js').AuditStorageDB} db
   * @param {Object} options
   * @param {Function} [options.onTimeLogged] 當結算一筆停留時長時的回調
   */
  constructor(db, options = {}) {
    this.db = db;
    this.onTimeLogged = options.onTimeLogged || null;

    // 當前正在前台活躍的分頁狀態
    this.currentActiveTab = null;
    this.isWindowFocused = true;
    this.activeWindowId = null;

    // 最小結算閾值 (秒)：少於 1 秒視為跳轉碎片不予記錄
    this.minDurationThresholdSec = 1;
    this._isSettling = false;
  }

  /**
   * 初始化追蹤器並綁定 Chrome 生命週期事件
   */
  async init() {
    try {
      // 1. 取得當前焦點視窗與作用中分頁
      const currentWin = await chrome.windows.getLastFocused({ populate: true }).catch(() => null);
      if (currentWin && currentWin.focused) {
        this.isWindowFocused = true;
        this.activeWindowId = currentWin.id;
        const activeTab = currentWin.tabs?.find((t) => t.active);
        if (activeTab) {
          this._startTracking(activeTab);
        }
      } else {
        this.isWindowFocused = false;
      }
    } catch (e) {
      console.warn('[TabTimeTracker] 初始化取得視窗失敗:', e);
    }

    // 2. 監聽分頁切換 (chrome.tabs.onActivated)
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      if (!this.isWindowFocused) return;
      await this.settleCurrentTab('TAB_ACTIVATED');
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab) {
          this.activeWindowId = activeInfo.windowId;
          this._startTracking(tab);
        }
      } catch (err) {
        // 分頁可能已關閉
      }
    });

    // 3. 監聽視窗焦點變更 (chrome.windows.onFocusChanged)
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Chrome 瀏覽器整體失焦 (例如使用者切換至 VS Code / Slack)
        this.isWindowFocused = false;
        await this.settleCurrentTab('WINDOW_LOST_FOCUS');
      } else {
        // 切換回某個 Chrome 視窗
        this.isWindowFocused = true;
        this.activeWindowId = windowId;
        try {
          const [tab] = await chrome.tabs.query({ active: true, windowId });
          if (tab) {
            await this.settleCurrentTab('WINDOW_GAINED_FOCUS');
            this._startTracking(tab);
          }
        } catch (err) {
          // 忽略視窗查詢失敗
        }
      }
    });

    // 4. 監聽分頁 URL 導航與更新 (chrome.tabs.onUpdated)
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (!this.currentActiveTab || this.currentActiveTab.tabId !== tabId) return;

      // 如果網址變更，結算舊網址並重新開始追蹤新網址
      if (changeInfo.url && changeInfo.url !== this.currentActiveTab.url) {
        await this.settleCurrentTab('URL_NAVIGATED');
        if (this.isWindowFocused && tab.active) {
          this._startTracking(tab);
        }
        return;
      }

      // 如果只是標題或圖示更新，就地更新當前追蹤物件
      if (changeInfo.title) {
        this.currentActiveTab.title = changeInfo.title;
      }
      if (changeInfo.favIconUrl) {
        this.currentActiveTab.favIconUrl = changeInfo.favIconUrl;
      }
    });

    // 5. 監聽分頁關閉 (chrome.tabs.onRemoved)
    chrome.tabs.onRemoved.addListener(async (tabId) => {
      if (this.currentActiveTab && this.currentActiveTab.tabId === tabId) {
        await this.settleCurrentTab('TAB_REMOVED');
      }
    });
  }

  /**
   * 啟動指定分頁的時間追蹤
   * @param {chrome.tabs.Tab} tab
   * @private
   */
  _startTracking(tab) {
    if (!tab || !tab.url) return;

    // 排除特定內部協定 (可選)，保留常規網頁與擴充功能頁面
    const domain = extractHostname(tab.url) || 'system';
    const classification = classifyDomain(tab.url);

    this.currentActiveTab = {
      tabId: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      domain,
      title: tab.title || domain,
      favIconUrl: tab.favIconUrl || '',
      category: classification.category,
      categoryMeta: classification,
      startTime: Date.now()
    };
  }

  /**
   * 結算當前活躍分頁並寫入資料庫
   * @param {string} reason 結算原因標籤
   * @returns {Promise<Object|null>} 結算後的記錄物件
   */
  async settleCurrentTab(reason = 'UNKNOWN') {
    if (this._isSettling) return null;
    this._isSettling = true;

    try {
      const active = this.currentActiveTab;
      this.currentActiveTab = null;

      if (!active || !active.startTime) return null;

      const now = Date.now();
      const durationSec = Math.max(0, Math.floor((now - active.startTime) / 1000));

      // 若停留時長未達閾值 (例如快速切頁跳過)，不寫入資料庫以防垃圾資料
      if (durationSec < this.minDurationThresholdSec) {
        return null;
      }

      const log = {
        id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tabId: active.tabId,
        url: active.url,
        domain: active.domain,
        title: active.title,
        favIconUrl: active.favIconUrl,
        category: active.category,
        durationSec,
        startTime: active.startTime,
        endTime: now,
        timestamp: now,
        dateStr: new Date(now).toISOString().split('T')[0],
        reason
      };

      const startPerf = performance.now();
      await this.db.insertTimeLog(log);
      profiler.recordDuration('停留時長記錄寫入', performance.now() - startPerf);

      if (typeof this.onTimeLogged === 'function') {
        try {
          this.onTimeLogged(log);
        } catch (e) {
          console.warn('[TabTimeTracker] onTimeLogged 回調錯誤:', e);
        }
      }

      return log;
    } catch (err) {
      console.warn('[TabTimeTracker] 結算分頁時長失敗:', err);
      return null;
    } finally {
      this._isSettling = false;
    }
  }

  /**
   * 取得當前活躍分頁的即時停留狀態
   * @returns {Object|null}
   */
  getActiveSnapshot() {
    if (!this.isWindowFocused || !this.currentActiveTab) {
      return {
        isActive: false,
        currentDurationSec: 0,
        tab: null
      };
    }

    const now = Date.now();
    const currentDurationSec = Math.max(0, Math.floor((now - this.currentActiveTab.startTime) / 1000));

    return {
      isActive: true,
      currentDurationSec,
      tab: {
        ...this.currentActiveTab
      }
    };
  }
}
