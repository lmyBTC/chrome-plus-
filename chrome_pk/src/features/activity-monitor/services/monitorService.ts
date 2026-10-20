import { activityDb } from '../storage/activityDb';
import { ActivityLog, ActivityCategory, OriginAuditSettings } from '../types';

/**
 * ActivityMonitorService
 * 負責瀏覽器活動監控服務核心：
 * 1. 80% 原生常駐監控 (webRequest, downloads, tabs)
 * 2. 20% 隨選動態探針注入 (ISOLATED + MAIN worlds)
 * 3. 網站敏感權限審查 (contentSettings)
 * 4. 長連接 Port 廣播 (monitor-stream) 與單次訊息響應
 * 5. 定期清理與生命週期管理
 */
export class ActivityMonitorService {
  private activePorts = new Set<chrome.runtime.Port>();
  private activeInspectorTabs = new Set<number>();
  private isEnabled = true;
  private isInitialized = false;

  private generateId(prefix = 'bam'): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * 初始化監控服務
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 載入持久化監控啟用狀態
    try {
      const stored = await chrome.storage.local.get('activity_monitor_enabled');
      if (typeof stored.activity_monitor_enabled === 'boolean') {
        this.isEnabled = stored.activity_monitor_enabled;
      }
    } catch {
      // 靜默 fallback 保持預設值
    }

    this.registerAlarm();
    this.registerListeners();
  }

  /**
   * 註冊定時日誌清理 Alarm (每 24 小時一次)
   */
  private registerAlarm(): void {
    if (typeof chrome.alarms !== 'undefined') {
      chrome.alarms.create('DAILY_AUDIT_PURGE', {
        delayInMinutes: 60,
        periodInMinutes: 1440
      });
    }
  }

  /**
   * 處理 Alarm 觸發事件
   */
  async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (alarm.name === 'DAILY_AUDIT_PURGE') {
      try {
        await activityDb.purgeExpiredLogs(3);
      } catch (err) {
        console.warn('[ActivityMonitor] 定期清理過期日誌失敗:', err);
      }
    }
  }

  /**
   * 廣播訊息至所有已連接的 Side Panel 並非同步寫入 IndexedDB
   */
  broadcast(payload: { type: string; [key: string]: unknown }): void {
    if (payload && payload.type === 'ACTIVITY_LOG' && payload.log) {
      activityDb.insertLog(payload.log as ActivityLog).catch((err) => {
        console.warn('[ActivityMonitor] 寫入 IndexedDB 失敗:', err);
      });
    }

    for (const port of this.activePorts) {
      try {
        port.postMessage(payload);
      } catch {
        this.activePorts.delete(port);
      }
    }
  }

  /**
   * 設定監控開關狀態
   */
  async setMonitoringEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    try {
      await chrome.storage.local.set({ activity_monitor_enabled: enabled });
    } catch {
      // 容錯
    }
    this.broadcast({
      type: 'MONITORING_STATUS_CHANGED',
      enabled: this.isEnabled
    });
  }

  /**
   * 取得當前監控開關狀態
   */
  isMonitoring(): boolean {
    return this.isEnabled;
  }

  /**
   * 查詢指定 Origin 之敏感原生權限設定
   */
  async auditOriginSettings(origin: string): Promise<OriginAuditSettings | { error: string }> {
    if (!origin || !origin.startsWith('http')) {
      return { error: '無效或非 HTTP(S) Origin' };
    }

    const cs = (chrome as any).contentSettings;
    if (!cs) {
      return { error: 'contentSettings API 未提供或未聲明權限' };
    }

    const permissions = [
      { key: 'camera', api: cs.camera },
      { key: 'microphone', api: cs.microphone },
      { key: 'location', api: cs.location },
      { key: 'notifications', api: cs.notifications },
      { key: 'clipboard', api: cs.clipboard }
    ];

    const results: OriginAuditSettings = {};

    await Promise.allSettled(
      permissions.map(async ({ key, api }) => {
        if (!api || typeof api.get !== 'function') {
          results[key] = 'unsupported';
          return;
        }
        try {
          const details = await api.get({ primaryUrl: origin });
          results[key] = details?.setting || 'unknown';
        } catch {
          results[key] = 'error';
        }
      })
    );

    return results;
  }

  /**
   * 動態注入雙層探針 (ISOLATED 與 MAIN) 至指定分頁
   */
  async injectDeepInspector(tabId: number): Promise<{ success: boolean; tabId: number; error?: string }> {
    if (!tabId || typeof tabId !== 'number') {
      throw new Error('無效的 tabId');
    }

    if (typeof chrome.scripting === 'undefined') {
      throw new Error('chrome.scripting API 不可用');
    }

    try {
      // 1. 注入 ISOLATED 中繼探針
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['scripts/probes/probe-isolated.js'],
        world: 'ISOLATED'
      });

      // 2. 注入 MAIN 核心探針 (攔截 window / navigator 原生 API)
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['scripts/probes/probe-main.js'],
        world: 'MAIN'
      });

      this.activeInspectorTabs.add(tabId);
      this.broadcast({
        type: 'INSPECTOR_STATUS_CHANGED',
        tabId,
        active: true
      });

      return { success: true, tabId };
    } catch (err: any) {
      console.warn('[ActivityMonitor] 注入動態探針失敗:', err);
      return { success: false, tabId, error: err?.message || '注入失敗' };
    }
  }

  /**
   * 檢查分頁是否已啟用探針
   */
  isInspectorActive(tabId: number): boolean {
    return this.activeInspectorTabs.has(tabId);
  }

  /**
   * 註冊原生事件監聽器
   */
  private registerListeners(): void {
    // 1. 網路請求監控 (chrome.webRequest)
    if (typeof chrome.webRequest !== 'undefined' && chrome.webRequest.onBeforeRequest) {
      chrome.webRequest.onBeforeRequest.addListener(
        (details) => {
          if (!this.isEnabled) return;

          // 排除擴充功能自身內部請求與系統內部 scheme
          if (
            details.url.startsWith('chrome-extension://') ||
            details.url.startsWith('chrome://') ||
            details.url.startsWith('edge://') ||
            details.url.startsWith('devtools://')
          ) {
            return;
          }

          let domain = '';
          try {
            domain = new URL(details.url).hostname;
          } catch {
            domain = 'unknown';
          }

          const event: ActivityLog = {
            id: this.generateId('net'),
            category: 'network',
            method: details.method || 'GET',
            url: details.url,
            domain,
            type: details.type || 'other',
            tabId: details.tabId >= 0 ? details.tabId : null,
            timestamp: Date.now()
          };

          this.broadcast({ type: 'ACTIVITY_LOG', log: event });
        },
        { urls: ['<all_urls>'] }
      );
    }

    // 2. 下載事件審查 (chrome.downloads)
    if (typeof chrome.downloads !== 'undefined' && chrome.downloads.onCreated) {
      chrome.downloads.onCreated.addListener((downloadItem) => {
        if (!this.isEnabled) return;

        let domain = '';
        try {
          domain = downloadItem.url ? new URL(downloadItem.url).hostname : '';
        } catch {
          domain = 'unknown';
        }

        const event: ActivityLog = {
          id: this.generateId('dl'),
          category: 'download',
          filename: downloadItem.filename || '未知檔名',
          fileSize: downloadItem.fileSize || 0,
          url: downloadItem.url,
          domain,
          mime: downloadItem.mime || 'unknown',
          timestamp: Date.now()
        };

        this.broadcast({ type: 'ACTIVITY_LOG', log: event });
      });
    }

    // 3. 監聽分頁關閉：清理探針追蹤狀態
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.activeInspectorTabs.has(tabId)) {
        this.activeInspectorTabs.delete(tabId);
        this.broadcast({
          type: 'INSPECTOR_STATUS_CHANGED',
          tabId,
          active: false
        });
      }
    });

    // 4. 監聽分頁刷新或跳轉：頁面重新載入後探針會失效，重置追蹤狀態
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'loading' && this.activeInspectorTabs.has(tabId)) {
        this.activeInspectorTabs.delete(tabId);
        this.broadcast({
          type: 'INSPECTOR_STATUS_CHANGED',
          tabId,
          active: false
        });
      }
    });
  }

  /**
   * 處理 Port 長連接 (例如 side panel / dashboard 之 monitor-stream)
   */
  handlePortConnect(port: chrome.runtime.Port): void {
    if (port.name !== 'monitor-stream') return;

    this.activePorts.add(port);

    port.onDisconnect.addListener(() => {
      this.activePorts.delete(port);
    });

    port.onMessage.addListener(async (msg) => {
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'AUDIT_ORIGIN': {
          const settings = await this.auditOriginSettings(msg.origin);
          port.postMessage({
            type: 'AUDIT_RESULT',
            origin: msg.origin,
            settings
          });
          break;
        }

        case 'INJECT_INSPECTOR': {
          try {
            const result = await this.injectDeepInspector(msg.tabId);
            port.postMessage({
              type: 'INJECT_INSPECTOR_RESULT',
              tabId: msg.tabId,
              success: result.success,
              active: true,
              error: result.error
            });
          } catch (err: any) {
            port.postMessage({
              type: 'INJECT_INSPECTOR_RESULT',
              tabId: msg.tabId,
              success: false,
              error: err?.message || '注入失敗'
            });
          }
          break;
        }

        case 'CHECK_INSPECTOR_STATUS': {
          port.postMessage({
            type: 'INSPECTOR_STATUS_RESULT',
            tabId: msg.tabId,
            active: this.isInspectorActive(msg.tabId)
          });
          break;
        }

        case 'GET_RECENT_LOGS': {
          try {
            const logs = await activityDb.getRecentLogs(msg.limit || 100, msg.category || null);
            port.postMessage({
              type: 'RECENT_LOGS_RESULT',
              logs
            });
          } catch (err: any) {
            port.postMessage({
              type: 'RECENT_LOGS_RESULT',
              logs: [],
              error: err?.message
            });
          }
          break;
        }

        case 'CLEAR_ALL_LOGS': {
          try {
            await activityDb.clearAllLogs();
            port.postMessage({
              type: 'ALL_LOGS_CLEARED',
              success: true
            });
          } catch (err: any) {
            port.postMessage({
              type: 'ALL_LOGS_CLEARED',
              success: false,
              error: err?.message
            });
          }
          break;
        }

        case 'GET_MONITOR_STATUS': {
          port.postMessage({
            type: 'MONITOR_STATUS_RESULT',
            enabled: this.isEnabled
          });
          break;
        }

        case 'SET_MONITOR_STATUS': {
          await this.setMonitoringEnabled(Boolean(msg.enabled));
          port.postMessage({
            type: 'MONITOR_STATUS_RESULT',
            enabled: this.isEnabled
          });
          break;
        }
      }
    });
  }

  /**
   * 處理單次 runtime 訊息傳遞 (Content Script、探針或面板請求)
   */
  handleRuntimeMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
    if (!message || typeof message !== 'object') return false;

    // 1. 網站權限審查請求
    if (message.type === 'AUDIT_ORIGIN_QUERY') {
      this.auditOriginSettings(message.origin).then((settings) => {
        sendResponse({ origin: message.origin, settings });
      });
      return true; // 非同步響應
    }

    // 2. 注入深入探針請求
    if (message.type === 'INJECT_INSPECTOR') {
      this.injectDeepInspector(message.tabId)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // 3. 查詢探針狀態
    if (message.type === 'CHECK_INSPECTOR_STATUS') {
      sendResponse({
        tabId: message.tabId,
        active: this.isInspectorActive(message.tabId)
      });
      return false;
    }

    // 4. 接收動態探針回傳的敏感 API 調用事件
    if (message.type === 'PROBE_EVENT') {
      if (!this.isEnabled) {
        sendResponse({ received: true, ignored: true });
        return false;
      }

      const origin = sender.origin || (sender.tab ? sender.tab.url : 'unknown');
      let domain = '';
      try {
        domain = origin && origin.startsWith('http') ? new URL(origin).hostname : 'unknown';
      } catch {
        domain = 'unknown';
      }

      const event: ActivityLog = {
        id: this.generateId('probe'),
        category: 'probe',
        api: message.api,
        detail: message.detail || {},
        origin,
        domain,
        tabId: sender.tab?.id ?? null,
        timestamp: message.timestamp || Date.now()
      };

      this.broadcast({ type: 'ACTIVITY_LOG', log: event });
      sendResponse({ received: true });
      return false;
    }

    // 5. 取得近期日誌 (單次請求)
    if (message.type === 'GET_ACTIVITY_LOGS') {
      activityDb.getRecentLogs(message.limit || 100, message.category || null)
        .then((logs) => sendResponse({ success: true, logs }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // 6. 清理所有日誌 (單次請求)
    if (message.type === 'CLEAR_ACTIVITY_LOGS') {
      activityDb.clearAllLogs()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    // 7. 切換或讀取監控狀態
    if (message.type === 'GET_MONITORING_STATUS') {
      sendResponse({ enabled: this.isEnabled });
      return false;
    }

    if (message.type === 'SET_MONITORING_STATUS') {
      this.setMonitoringEnabled(Boolean(message.enabled))
        .then(() => sendResponse({ success: true, enabled: this.isEnabled }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    return false;
  }
}

export const monitorService = new ActivityMonitorService();
