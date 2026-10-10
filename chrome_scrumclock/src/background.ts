import {
  getUserSettings,
  getNextReviewTime,
  startFocusMode,
  stopFocusMode,
  handleAlarm
} from './background/alarmHandlers';
import {
  handleExternalMessage,
  broadcastFocusToFinanceClipper,
  broadcastSprintStartToActivityMonitor,
  broadcastSprintStopToActivityMonitor,
  saveGeminiConversation
} from './background/externalService';
import { monitorService } from './features/activity-monitor/services/monitorService';
import { WeeklyMission, InboxItem } from './types';
import { KanbanAuditor } from './features/project-management/services/kanbanAuditor';
// 初始化活動監控服務
monitorService.initialize();

/**
 * 極簡 GTD 快捷捕捉：秒級寫入 Inbox 並發送系統通知
 */
export async function captureToInbox(rawText: string, url?: string, sourceTitle?: string): Promise<string> {
  const settings = await getUserSettings();
  if (settings.enableGtdCapture === false) {
    if (typeof chrome.notifications !== 'undefined') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '⚠️ GTD 快捷捕捉已停用',
        message: '可在 ScrumClock 設定頁面中重新啟用 GTD 快捷捕捉功能。'
      });
    }
    return '';
  }

  const safeText = (rawText || sourceTitle || '未命名捕捉靈感').trim();
  const title = safeText.length > 80 ? safeText.slice(0, 80) + '...' : safeText;
  const notes = safeText.length > 80 ? safeText : '';
  const missionId = 'mission-' + Date.now();
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

  const newMission: WeeklyMission = {
    id: missionId,
    text: title,
    isCompleted: false,
    status: 'inbox',
    url: url || undefined,
    notes: notes || undefined,
    priority: 'P2',
    gtdContext: '@Focus',
    estimatedPomodoros: 1,
    spentPomodoros: 0,
    sourcePlugin: 'OMNI_CAPTURE',
    createdAt: timestamp
  };

  const newInboxItem: InboxItem = {
    id: missionId,
    text: title,
    contextUrl: url,
    createdAt: timestamp,
    processed: false
  };

  try {
    const storageData = await chrome.storage.local.get(['weeklyMissions', 'inboxItems', 'inbox']);
    const weeklyMissions: WeeklyMission[] = storageData.weeklyMissions || [];
    const inboxItems: InboxItem[] = storageData.inboxItems || [];
    const inboxList: any[] = storageData.inbox || [];

    weeklyMissions.unshift(newMission);
    inboxItems.unshift(newInboxItem);
    inboxList.unshift(newInboxItem);

    await chrome.storage.local.set({
      weeklyMissions,
      inboxItems,
      inbox: inboxList
    });

    if (typeof chrome.notifications !== 'undefined') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '📥 已加入 ScrumClock 待辦收件匣',
        message: title
      });
    }
  } catch (error) {
    console.error('[OmniCapture] 寫入 Inbox 失敗:', error);
  }

  return missionId;
}

// ── 常駐行為防禦 (Action & SidePanel) ──────────────────────────────
/**
 * 確保點擊工具列 Action 必定開啟 Popup，且不被 Side Panel 自動接管
 */
function enforceActionPopupBehavior(): void {
  if (typeof chrome.sidePanel !== 'undefined' && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch((error) => console.error("設定側欄行為失敗:", error));
  }
  if (typeof chrome.action !== 'undefined' && chrome.action.setPopup) {
    chrome.action
      .setPopup({ popup: 'src/entries/popup/index.html' })
      .catch((error) => console.error("設定 Action Popup 失敗:", error));
  }
}

// SW 啟動頂層立即執行防禦
enforceActionPopupBehavior();

// 監聽瀏覽器啟動生命週期
chrome.runtime.onStartup.addListener(() => {
  enforceActionPopupBehavior();
});

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Power Kit 已安裝');
  
  // 確保點擊 Action 圖標時預設開啟 Popup
  enforceActionPopupBehavior();
  
  // 建立右鍵選單
  if (typeof chrome.contextMenus !== 'undefined') {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'scrumclock_capture_inbox',
        title: '📥 加入 ScrumClock 待辦收件匣',
        contexts: ['selection', 'page', 'link']
      });

      chrome.contextMenus.create({
        id: 'analyze_tasks',
        title: '🤖 傳送至 Power Kit 助理分析',
        contexts: ['selection']
      });
    });
  }
  
  // 設定每日回顧鬧鐘
  const userSettings = await getUserSettings();
  const [hours, minutes] = userSettings.endOfDayReviewTime.split(':');
  
  chrome.alarms.create('dailyReview', {
    when: getNextReviewTime(parseInt(hours), parseInt(minutes)),
    periodInMinutes: 24 * 60
  });
});

// 監聽右鍵選單點擊
if (typeof chrome.contextMenus !== 'undefined') {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'scrumclock_capture_inbox' || info.menuItemId === 'gtd_capture_inbox') {
      const textToCapture = info.selectionText || info.linkUrl || tab?.title || '';
      captureToInbox(textToCapture, info.linkUrl || tab?.url, tab?.title);
      return;
    }

    if (info.menuItemId === 'analyze_tasks' && tab?.id) {
      const pendingData = {
        text: info.selectionText || "",
        title: tab.title || "",
        url: tab.url || "",
        timestamp: Date.now()
      };

      chrome.storage.local.set({ pendingAnalyzeText: pendingData }, () => {
        if (typeof chrome.sidePanel !== 'undefined' && (chrome.sidePanel as any).open) {
          (chrome.sidePanel as any).open({ windowId: tab.windowId })
            .catch((err: any) => console.error("開啟側欄失敗:", err));
        }
      });
    }
  });
}

// 監聽快捷鍵 (Quick Capture / Omni-Capture)
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'quick_capture') {
    chrome.windows.create({
      url: chrome.runtime.getURL('index.html?quick=true'),
      type: 'popup',
      width: 600,
      height: 400
    });
  } else if (command === 'gtd_omni_capture') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        let selectedText = '';
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('chrome-extension://')) {
          try {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => window.getSelection()?.toString() || ''
            });
            if (results && results[0] && typeof results[0].result === 'string') {
              selectedText = results[0].result.trim();
            }
          } catch (_) {
            // 受權限限制分頁直接退回使用 tab.title
          }
        }
        const textToCapture = selectedText || tab.title || '快捷捕捉任務';
        await captureToInbox(textToCapture, tab.url, tab.title);
      }
    } catch (err) {
      console.error('[OmniCapture] 執行快捷捕捉錯誤:', err);
    }
  }
});

// 監聽內部訊息
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  const handledAsync = monitorService.handleRuntimeMessage(message, sender, sendResponse);
  if (handledAsync) {
    return true;
  }

  switch (message.type) {
    case 'START_FOCUS_MODE':
      startFocusMode();
      if (message.payload?.duration) {
        chrome.alarms.create('sprintFinished', { delayInMinutes: message.payload.duration });
      }
      broadcastFocusToFinanceClipper(message.payload);
      broadcastSprintStartToActivityMonitor(message.payload);
      break;
    case 'STOP_FOCUS_MODE':
      stopFocusMode();
      chrome.alarms.clear('sprintFinished');
      broadcastSprintStopToActivityMonitor(message.payload);
      break;
    case 'UPDATE_GEMINI_CHAT':
      saveGeminiConversation(message.payload);
      break;
    case 'OPEN_DASHBOARD':
      chrome.tabs.create({ url: chrome.runtime.getURL('src/entries/newtab/index.html') });
      break;
  }
  return false;
});

// 監聽 Port 長連接 (供 monitor-stream 串流使用)
chrome.runtime.onConnect.addListener((port) => {
  monitorService.handlePortConnect(port);
});

// 監聽鬧鐘
chrome.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm);
  monitorService.handleAlarm(alarm);
});

// 跨插件 AI 服務化協議監聽器 (externally_connectable)
chrome.runtime.onMessageExternal.addListener(handleExternalMessage);

// ── 閒置理牌監聽器 (Kanban Idle Auditor) ──────────────────────────────────
if (typeof chrome.idle !== 'undefined') {
  // 設定閒置判定門檻為 15 分鐘 (900 秒)
  chrome.idle.setDetectionInterval(15 * 60);

  chrome.idle.onStateChanged.addListener(async (newState: string) => {
    if (newState === 'idle' || newState === 'locked') {
      try {
        const storageData = await chrome.storage.local.get(['weeklyMissions']);
        const weeklyMissions: WeeklyMission[] = storageData.weeklyMissions || [];
        if (!weeklyMissions.length) return;

        const auditor = KanbanAuditor.getInstance();
        // 篩選超過 5 天未推進的 in-progress 與 next-action 任務
        const staleCards = auditor.getStaleMissions(weeklyMissions, 5);

        if (staleCards.length > 0) {
          let downgradedCount = 0;
          const updatedMissions = weeklyMissions.map((m) => {
            const isStale = staleCards.some((s) => s.id === m.id);
            if (isStale && (m.status === 'in-progress' || m.status === 'next-action')) {
              downgradedCount++;
              return {
                ...m,
                status: 'someday' as const,
                notes: (m.notes ? m.notes + '\n' : '') +
                  `[看板閒置巡檢] 於 ${new Date().toLocaleDateString('zh-TW')} 因停滯超過 5 天自動移至 Someday`
              };
            }
            return m;
          });

          if (downgradedCount > 0) {
            const notificationMessage = `✨ Nano 已自動將 ${downgradedCount} 則過期任務移至 Someday，今日看板焦點清晰！`;
            await chrome.storage.local.set({
              weeklyMissions: updatedMissions,
              pendingIdleAuditNotification: {
                staleCount: downgradedCount,
                message: notificationMessage,
                timestamp: Date.now()
              }
            });

            if (typeof chrome.notifications !== 'undefined') {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '🧹 看板自動整理完成',
                message: `已將 ${downgradedCount} 則超過 5 天未推進的停滯任務移至 Someday`
              });
            }
          }
        }
      } catch (err) {
        console.error('[KanbanAuditor] 閒置巡檢執行失敗:', err);
      }
    }
  });
}
