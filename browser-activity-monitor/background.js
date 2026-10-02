import { AuditStorageDB } from './scripts/storage-db.js';
import { profiler } from './scripts/resource-profiler.js';

/**
 * Browser Activity Monitor - Background Service Worker (MV3)
 * 專責 80% 原生常駐監控：網路流量、下載審查、網站原生權限審查，並提供 Port 長連接事件廣播與 IndexedDB 持久化。
 */

// 初始化 IndexedDB 審計儲存實例
const db = new AuditStorageDB();

// 存放所有連線中的 Side Panel Port (name: 'monitor-stream')
const activePorts = new Set();

// 存放當前已注入深入動態探針的 tabId 集合
const activeInspectorTabs = new Set();

// 1. 初始化擴充功能行為：點擊 Action 圖示直接開啟 Side Panel，並註冊排程清理 alarm
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.warn('[BAM SW] Failed to set sidePanel behavior:', err));
  }

  // 註冊每日定期清理過期日誌 alarm (每 1440 分鐘 / 24 小時執行一次)
  if (chrome.alarms) {
    chrome.alarms.create('DAILY_AUDIT_PURGE', {
      delayInMinutes: 60,
      periodInMinutes: 1440
    });
  }
});

// 監聽 Alarm 事件：定期清理 3 天前過期日誌
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'DAILY_AUDIT_PURGE') {
      try {
        await db.purgeExpiredLogs(3);
      } catch (err) {
        console.warn('[BAM SW] 定期清理過期日誌失敗:', err);
      }
    }
  });
}

/**
 * 廣播訊息至所有已連接的 Side Panel 並非同步寫入 IndexedDB
 * @param {Object} payload 廣播的事件物件
 */
function broadcast(payload) {
  const startTime = performance.now();
  // 若為活動日誌，非同步持久化至 IndexedDB
  if (payload && payload.type === 'ACTIVITY_LOG' && payload.log) {
    db.insertLog(payload.log).catch((err) => {
      console.warn('[BAM SW] 寫入 IndexedDB 失敗:', err);
    });
  }

  for (const port of activePorts) {
    try {
      port.postMessage(payload);
    } catch {
      activePorts.delete(port);
    }
  }
  profiler.recordDuration('訊息廣播 (SW Broadcast)', performance.now() - startTime);
  profiler.recordQueue('active_ports', activePorts.size);
}

/**
 * 動態注入雙層探針 (ISOLATED 與 MAIN) 至指定分頁
 * @param {number} tabId 目標分頁 ID
 * @returns {Promise<{ success: boolean, tabId: number, message?: string }>}
 */
async function injectDeepInspector(tabId) {
  if (!tabId || typeof tabId !== 'number') {
    throw new Error('無效的 tabId');
  }
  const startTime = performance.now();

  // 1. 注入 ISOLATED 中繼探針 (具備 chrome.runtime 訪問能力)
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['scripts/probe-isolated.js'],
    world: 'ISOLATED'
  });

  // 2. 注入 MAIN 核心探針 (可攔截 window / navigator 原生 API)
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['scripts/probe-main.js'],
    world: 'MAIN'
  });

  activeInspectorTabs.add(tabId);
  profiler.recordDuration('動態探針注入 (Deep Injection)', performance.now() - startTime);
  broadcast({
    type: 'INSPECTOR_STATUS_CHANGED',
    tabId,
    active: true
  });

  return { success: true, tabId };
}

// 監聽分頁關閉：自動清理探針注入追蹤狀態
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeInspectorTabs.has(tabId)) {
    activeInspectorTabs.delete(tabId);
    broadcast({
      type: 'INSPECTOR_STATUS_CHANGED',
      tabId,
      active: false
    });
  }
});

// 監聽分頁刷新或跳轉：頁面重新載入後探針會自動失效，重置追蹤狀態
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && activeInspectorTabs.has(tabId)) {
    activeInspectorTabs.delete(tabId);
    broadcast({
      type: 'INSPECTOR_STATUS_CHANGED',
      tabId,
      active: false
    });
  }
});

/**
 * 查詢指定 Origin 之 Chrome 原生權限設定 (contentSettings)
 * @param {string} origin 目標網站來源 (例如: https://example.com)
 * @returns {Promise<Object>} 各敏感權限的原生狀態 ('allow' | 'block' | 'ask' | 'unknown')
 */
async function auditOriginSettings(origin) {
  if (!origin || !origin.startsWith('http')) {
    return { error: '無效或非 HTTP(S) Origin' };
  }
  const startTime = performance.now();

  const permissions = [
    { key: 'camera', api: chrome.contentSettings?.camera },
    { key: 'microphone', api: chrome.contentSettings?.microphone },
    { key: 'location', api: chrome.contentSettings?.location },
    { key: 'notifications', api: chrome.contentSettings?.notifications },
    { key: 'clipboard', api: chrome.contentSettings?.clipboard }
  ];

  const results = {};

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

  profiler.recordDuration('原生權限審查 (Native Audit)', performance.now() - startTime);
  return results;
}

// 2. 80% 原生監控：網路請求監控 (chrome.webRequest)
if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      // 排除擴充功能自身內部請求與系統內部 scheme
      if (
        details.url.startsWith('chrome-extension://') ||
        details.url.startsWith('chrome://') ||
        details.url.startsWith('edge://') ||
        details.url.startsWith('devtools://')
      ) {
        return;
      }

      const startTime = performance.now();
      const event = {
        id: crypto.randomUUID ? crypto.randomUUID() : `bam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: 'network',
        method: details.method || 'GET',
        url: details.url,
        type: details.type || 'other',
        tabId: details.tabId,
        timestamp: Date.now()
      };

      broadcast({ type: 'ACTIVITY_LOG', log: event });
      profiler.recordDuration('原生網路監聽 (WebRequest)', performance.now() - startTime);
    },
    { urls: ['<all_urls>'] }
  );
}

// 3. 80% 原生監控：下載事件審查 (chrome.downloads)
if (chrome.downloads && chrome.downloads.onCreated) {
  chrome.downloads.onCreated.addListener((downloadItem) => {
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : `bam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: 'download',
      filename: downloadItem.filename || '未知檔名',
      fileSize: downloadItem.fileSize || 0,
      url: downloadItem.url,
      mime: downloadItem.mime || 'unknown',
      timestamp: Date.now()
    };

    broadcast({ type: 'ACTIVITY_LOG', log: event });
  });
}

// 4. Port 長連接管理 (monitor-stream)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'monitor-stream') {
    activePorts.add(port);

    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
    });

    port.onMessage.addListener(async (msg) => {
      if (!msg || typeof msg !== 'object') return;

      // 權限查詢
      if (msg.type === 'AUDIT_ORIGIN') {
        const settings = await auditOriginSettings(msg.origin);
        port.postMessage({
          type: 'AUDIT_RESULT',
          origin: msg.origin,
          settings
        });
      }

      // 請求注入深入動態探針
      if (msg.type === 'INJECT_INSPECTOR') {
        try {
          const result = await injectDeepInspector(msg.tabId);
          port.postMessage({
            type: 'INJECT_INSPECTOR_RESULT',
            tabId: msg.tabId,
            success: true,
            active: true
          });
        } catch (err) {
          port.postMessage({
            type: 'INJECT_INSPECTOR_RESULT',
            tabId: msg.tabId,
            success: false,
            error: err.message
          });
        }
      }

      // 查詢探針注入狀態
      if (msg.type === 'CHECK_INSPECTOR_STATUS') {
        port.postMessage({
          type: 'INSPECTOR_STATUS_RESULT',
          tabId: msg.tabId,
          active: activeInspectorTabs.has(msg.tabId)
        });
      }

      // 取得近期歷史日誌
      if (msg.type === 'GET_RECENT_LOGS') {
        try {
          const logs = await db.getRecentLogs(msg.limit || 100, msg.category || null);
          port.postMessage({
            type: 'RECENT_LOGS_RESULT',
            logs
          });
        } catch (err) {
          port.postMessage({
            type: 'RECENT_LOGS_RESULT',
            logs: [],
            error: err.message
          });
        }
      }

      // 清空日誌儲存
      if (msg.type === 'CLEAR_ALL_LOGS') {
        try {
          await db.clearAllLogs();
          port.postMessage({
            type: 'ALL_LOGS_CLEARED',
            success: true
          });
        } catch (err) {
          port.postMessage({
            type: 'ALL_LOGS_CLEARED',
            success: false,
            error: err.message
          });
        }
      }

      // 取得背景服務 Profiler 指標
      if (msg.type === 'GET_BACKGROUND_PROFILER_METRICS') {
        port.postMessage({
          type: 'BACKGROUND_PROFILER_METRICS_RESULT',
          summary: profiler.getSummary()
        });
      }

      // 重置背景服務 Profiler 指標
      if (msg.type === 'RESET_BACKGROUND_PROFILER') {
        profiler.reset();
        port.postMessage({
          type: 'BACKGROUND_PROFILER_RESET_COMPLETED'
        });
      }
    });
  }
});

// 5. 單次訊息轉發與請求監聽 (供 Content Script 或動態探針使用)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'AUDIT_ORIGIN_QUERY') {
    auditOriginSettings(message.origin).then((settings) => {
      sendResponse({ origin: message.origin, settings });
    });
    return true; // 非同步響應
  }

  // 注入深入探針請求 (透過單次訊息模式)
  if (message.type === 'INJECT_INSPECTOR') {
    injectDeepInspector(message.tabId)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 查詢探針狀態 (透過單次訊息模式)
  if (message.type === 'CHECK_INSPECTOR_STATUS') {
    sendResponse({
      tabId: message.tabId,
      active: activeInspectorTabs.has(message.tabId)
    });
    return false;
  }

  // 接收動態探針回傳的敏感 API 調用事件
  if (message.type === 'PROBE_EVENT') {
    const event = {
      id: crypto.randomUUID ? crypto.randomUUID() : `bam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: 'probe',
      api: message.api,
      detail: message.detail || {},
      origin: sender.origin || (sender.tab ? sender.tab.url : 'unknown'),
      tabId: sender.tab ? sender.tab.id : null,
      timestamp: Date.now()
    };
    broadcast({ type: 'ACTIVITY_LOG', log: event });
    sendResponse({ received: true });
    return false;
  }

  return false;
});
