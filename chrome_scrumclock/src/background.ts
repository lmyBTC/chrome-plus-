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
  saveGeminiConversation
} from './background/externalService';

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Power Kit 已安裝');
  
  // 設定點擊 Action 圖標時開啟側邊欄
  if (typeof chrome.sidePanel !== 'undefined' && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("設定側欄行為失敗:", error));
  }
  
  // 建立右鍵選單
  if (typeof chrome.contextMenus !== 'undefined') {
    chrome.contextMenus.create({
      id: 'analyze_tasks',
      title: '🤖 傳送至 Power Kit 助理分析',
      contexts: ['selection']
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

// 監聽快捷鍵 (Quick Capture)
chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'quick_capture') {
    chrome.windows.create({
      url: chrome.runtime.getURL('index.html?quick=true'),
      type: 'popup',
      width: 600,
      height: 400
    });
  }
});

// 監聽內部訊息
chrome.runtime.onMessage.addListener((message: any) => {
  switch (message.type) {
    case 'START_FOCUS_MODE':
      startFocusMode();
      if (message.payload?.duration) {
        chrome.alarms.create('sprintFinished', { delayInMinutes: message.payload.duration });
      }
      broadcastFocusToFinanceClipper(message.payload);
      break;
    case 'STOP_FOCUS_MODE':
      stopFocusMode();
      chrome.alarms.clear('sprintFinished');
      break;
    case 'UPDATE_GEMINI_CHAT':
      saveGeminiConversation(message.payload);
      break;
    case 'OPEN_DASHBOARD':
      chrome.tabs.create({ url: chrome.runtime.getURL('src/entries/newtab/index.html') });
      break;
  }
});

// 監聽鬧鐘
chrome.alarms.onAlarm.addListener(handleAlarm);

// 跨插件 AI 服務化協議監聽器 (externally_connectable)
chrome.runtime.onMessageExternal.addListener(handleExternalMessage);