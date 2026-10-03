import { AuditStorageDB } from './scripts/storage-db.js';
import { profiler } from './scripts/resource-profiler.js';
import { ProfilerSession } from './scripts/session-profiler.js';
import { TabTimeTracker } from './scripts/tab-time-tracker.js';

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

// 跨插件衝刺協同狀態 (SF-03)
let activeSprintSession = null;

// 初始化前台分頁焦點與停留時長追蹤器 (AM-01)
const timeTracker = new TabTimeTracker(db, {
  onTimeLogged: (log) => {
    broadcast({
      type: 'TIME_STATS_UPDATED',
      latestLog: log
    });
  }
});
timeTracker.init();

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

// 監聽 Alarm 事件：定期清理過期日誌 (3 天)、停留記錄 (7 天) 與檢測報告 (7 天)
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'DAILY_AUDIT_PURGE') {
      try {
        await db.purgeExpiredLogs(3);
        await db.purgeExpiredReports(7);
        await db.purgeExpiredTimeLogs(7);
      } catch (err) {
        console.warn('[BAM SW] 定期清理過期日誌或報告失敗:', err);
      }
    }
  });
}

/**
 * 廣播訊息至所有已連接的 Side Panel
 * @param {Object} payload 廣播的事件物件
 */
function broadcast(payload) {
  const startTime = performance.now();
  // 停用常態單筆 IndexedDB 寫入，徹底消除高頻 I/O 開銷；改由 Session 結算時寫入結構化報告

  // 若當前處於敏捷衝刺狀態，自動為日誌事件打上衝刺會話標記 (SF-03)
  if (activeSprintSession && payload?.log) {
    payload.log.sprintSessionId = activeSprintSession.sprintSessionId;
    payload.log.missionId = activeSprintSession.missionId;
    payload.log.isSprintFocus = true;
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

// 2. 隨選監測架構：動態掛載/卸載網路請求監控 (chrome.webRequest) 與 Session 狀態機
let currentSession = null;
let timedSessionTimeoutId = null;
let isWebRequestMounted = false;

function onBeforeRequestListener(details) {
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

  recordSessionEvent(event);
  broadcast({ type: 'ACTIVITY_LOG', log: event });
  profiler.recordDuration('原生網路監聽 (WebRequest)', performance.now() - startTime);
}

function mountWebRequest() {
  if (isWebRequestMounted) return;
  if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
    chrome.webRequest.onBeforeRequest.addListener(
      onBeforeRequestListener,
      { urls: ['<all_urls>'] }
    );
    isWebRequestMounted = true;
  }
}

function unmountWebRequest() {
  if (!isWebRequestMounted) return;
  if (chrome.webRequest && chrome.webRequest.onBeforeRequest) {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);
    isWebRequestMounted = false;
  }
}

/**
 * 非同步批次查詢 Top 分頁之標題、網址與圖示資訊
 * @param {Array<number>} tabIds 分頁 ID 陣列
 * @returns {Promise<Array<Object>>}
 */
async function enrichTabsInfo(tabIds) {
  if (!tabIds || tabIds.length === 0) return [];

  const results = await Promise.allSettled(
    tabIds.map(async (tabId) => {
      if (tabId == null || tabId === -1) {
        return { tabId: -1, title: '系統背景/非分頁請求', url: '', favIconUrl: '' };
      }
      try {
        const tab = await chrome.tabs.get(tabId);
        return {
          tabId,
          title: tab?.title || `分頁 #${tabId}`,
          url: tab?.url || '',
          favIconUrl: tab?.favIconUrl || ''
        };
      } catch {
        return {
          tabId,
          title: `分頁 #${tabId} (已關閉)`,
          url: '',
          favIconUrl: ''
        };
      }
    })
  );

  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}

function recordSessionEvent(event) {
  if (!currentSession) return;
  currentSession.recordEvent(event);
}

function getSessionSnapshot() {
  if (!currentSession) {
    return { status: 'IDLE' };
  }
  return currentSession.getSnapshot();
}

async function startSession(mode = 'TIMED', durationMs = 60000) {
  if (currentSession) {
    await stopSession('SUPERSEDED');
  }

  currentSession = new ProfilerSession({ mode, durationMs });
  mountWebRequest();

  if (mode === 'TIMED') {
    if (timedSessionTimeoutId) clearTimeout(timedSessionTimeoutId);
    timedSessionTimeoutId = setTimeout(async () => {
      await stopSession('TIMED_OUT');
    }, durationMs);
  }

  broadcast({
    type: 'SESSION_STATE_CHANGED',
    session: getSessionSnapshot()
  });

  return getSessionSnapshot();
}

async function stopSession(reason = 'MANUAL') {
  if (!currentSession) {
    unmountWebRequest();
    return null;
  }

  if (timedSessionTimeoutId) {
    clearTimeout(timedSessionTimeoutId);
    timedSessionTimeoutId = null;
  }

  const session = currentSession;
  currentSession = null;
  unmountWebRequest();

  // 嘗試取得 Top 分頁之標題與網址資訊以提升報告可讀性
  const topTabIds = Array.from(session.tabStats.keys());
  const enrichedTabs = await enrichTabsInfo(topTabIds);

  // 由 Session Profiler 引擎產出結構化健康檢測報告與可操作建議
  const report = session.generateReport({
    stopReason: reason,
    enrichedTabs
  });

  // 持久化儲存報告至 IndexedDB (health_reports) - 僅結算時寫入 1 筆
  try {
    await db.insertReport(report);
  } catch (err) {
    console.warn('[BAM SW] 儲存健康報告失敗:', err);
  }

  broadcast({
    type: 'SESSION_STATE_CHANGED',
    session: { status: 'IDLE', currentReport: report }
  });

  broadcast({
    type: 'SESSION_REPORT_CREATED',
    report
  });

  return report;
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

    recordSessionEvent(event);
    broadcast({ type: 'ACTIVITY_LOG', log: event });
  });
}

// 4. Port 長連接管理 (monitor-stream)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'monitor-stream') {
    activePorts.add(port);

    // 若當前有進行中的衝刺，主動同步衝刺狀態至 Side Panel (SF-03)
    if (activeSprintSession) {
      port.postMessage({
        type: 'SPRINT_SESSION_CHANGED',
        sprint: activeSprintSession
      });
    }

    port.onDisconnect.addListener(async () => {
      activePorts.delete(port);
      // 生命週期防護：當所有面板關閉且 Session 進行中時，自動安全結算並卸載監聽
      if (activePorts.size === 0 && currentSession) {
        await stopSession('PANEL_CLOSED');
      }
    });

    port.onMessage.addListener(async (msg) => {
      if (!msg || typeof msg !== 'object') return;

      // Session 生命週期控制：啟動 Session
      if (msg.type === 'START_SESSION') {
        const session = await startSession(msg.mode || 'TIMED', msg.durationMs || 60000);
        port.postMessage({
          type: 'START_SESSION_RESULT',
          success: true,
          session
        });
      }

      // Session 生命週期控制：手動停止 Session
      if (msg.type === 'STOP_SESSION') {
        const report = await stopSession('MANUAL');
        port.postMessage({
          type: 'STOP_SESSION_RESULT',
          success: true,
          report
        });
      }

      // Session 狀態查詢
      if (msg.type === 'GET_SESSION_STATUS') {
        port.postMessage({
          type: 'SESSION_STATUS_RESULT',
          session: getSessionSnapshot()
        });
      }

      // 取得歷史檢測報告清單
      if (msg.type === 'GET_RECENT_REPORTS') {
        try {
          const reports = await db.getRecentReports(msg.limit || 20);
          port.postMessage({
            type: 'RECENT_REPORTS_RESULT',
            reports
          });
        } catch (err) {
          port.postMessage({
            type: 'RECENT_REPORTS_RESULT',
            reports: [],
            error: err.message
          });
        }
      }

      // 清空歷史檢測報告
      if (msg.type === 'CLEAR_ALL_REPORTS') {
        try {
          await db.clearAllReports();
          port.postMessage({
            type: 'ALL_REPORTS_CLEARED',
            success: true
          });
        } catch (err) {
          port.postMessage({
            type: 'ALL_REPORTS_CLEARED',
            success: false,
            error: err.message
          });
        }
      }

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

      // 取得停留時長與網域排行統計 (AM-01 & AM-02)
      if (msg.type === 'GET_TIME_STATS') {
        try {
          const stats = await db.getTimeStatsByRange(msg.startTime, msg.endTime);
          const activeSnapshot = timeTracker.getActiveSnapshot();
          port.postMessage({
            type: 'TIME_STATS_RESULT',
            stats,
            activeSnapshot
          });
        } catch (err) {
          port.postMessage({
            type: 'TIME_STATS_RESULT',
            stats: null,
            error: err.message
          });
        }
      }

      // 取得當前活躍分頁即時時長快照
      if (msg.type === 'GET_ACTIVE_TAB_TIME') {
        port.postMessage({
          type: 'ACTIVE_TAB_TIME_RESULT',
          activeSnapshot: timeTracker.getActiveSnapshot()
        });
      }

      // 清空所有停留時長記錄
      if (msg.type === 'CLEAR_ALL_TIME_LOGS') {
        try {
          await db.clearAllTimeLogs();
          port.postMessage({
            type: 'ALL_TIME_LOGS_CLEARED',
            success: true
          });
        } catch (err) {
          port.postMessage({
            type: 'ALL_TIME_LOGS_CLEARED',
            success: false,
            error: err.message
          });
        }
      }

      // 取得當前進行中的衝刺狀態 (SF-03)
      if (msg.type === 'GET_ACTIVE_SPRINT') {
        port.postMessage({
          type: 'SPRINT_SESSION_CHANGED',
          sprint: activeSprintSession
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

  // 查詢當前前台活躍分頁時長 (單次訊息模式)
  if (message.type === 'GET_ACTIVE_TAB_TIME') {
    sendResponse(timeTracker.getActiveSnapshot());
    return false;
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
    recordSessionEvent(event);
    broadcast({ type: 'ACTIVITY_LOG', log: event });
    sendResponse({ received: true });
    return false;
  }

  return false;
});

// 6. 生命週期防護：監聽瀏覽器休眠 / SW Suspend 事件
if (chrome.runtime && chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    timeTracker.settleCurrentTab('SW_SUSPEND');
    if (currentSession) {
      stopSession('SUSPEND');
    }
    unmountWebRequest();
  });
}

// 7. 跨插件通訊協議監聽器 (SF-03 & externally_connectable)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[BAM External] 收到外部插件通訊:', message?.type, '來自:', sender?.id);

  if (!message || typeof message !== 'object') {
    sendResponse({ success: false, error: '無效的訊息負載' });
    return false;
  }

  // 輕量存活確認
  if (message.type === 'PING' || message.type === 'PING_HUB') {
    sendResponse({
      success: true,
      ack: true,
      plugin: 'ACTIVITY_MONITOR',
      version: '1.0.0',
      activeSprint: activeSprintSession
    });
    return false;
  }

  // 敏捷衝刺啟動廣播 (EVENT_SPRINT_START)
  if (message.type === 'EVENT_SPRINT_START' || message.type === 'FOCUS_STARTED') {
    const payload = message.payload || {};
    activeSprintSession = {
      sprintSessionId: payload.sprintSessionId || `sprint_${Date.now()}`,
      missionId: payload.missionId || '',
      title: payload.title || payload.missionText || '敏捷衝刺',
      duration: payload.duration || payload.durationMinutes || 25,
      startTime: payload.startTime || Date.now()
    };

    // 若尚未開啟網路監測，可自動啟動持續監測以便記錄衝刺活動
    if (!currentSession) {
      startSession('CONTINUOUS').catch((err) => console.warn('[BAM SW] 自動啟動衝刺監測失敗:', err));
    }

    broadcast({
      type: 'SPRINT_SESSION_CHANGED',
      sprint: activeSprintSession
    });

    sendResponse({
      success: true,
      ack: true,
      sprintSessionId: activeSprintSession.sprintSessionId
    });
    return false;
  }

  // 敏捷衝刺結束廣播 (EVENT_SPRINT_STOP)
  if (message.type === 'EVENT_SPRINT_STOP' || message.type === 'FOCUS_STOPPED') {
    const prevSprint = activeSprintSession;
    activeSprintSession = null;

    broadcast({
      type: 'SPRINT_SESSION_CHANGED',
      sprint: null,
      lastSprint: prevSprint,
      status: message.payload?.status || 'COMPLETED'
    });

    sendResponse({
      success: true,
      ack: true
    });
    return false;
  }

  return false;
});

