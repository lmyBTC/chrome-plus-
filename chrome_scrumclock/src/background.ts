// 確保 Chrome API 可用

// 專注模式狀態
let focusModeActive = false;
let distractionSites: string[] = [];

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
    periodInMinutes: 24 * 60 // 每24小時重複
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

      // 1. 寫入選取的文字到 storage
      chrome.storage.local.set({ pendingAnalyzeText: pendingData }, () => {
        // 2. 開啟側欄
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

// 監聽消息
chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  switch (message.type) {
    case 'START_FOCUS_MODE':
      startFocusMode();
      if (message.payload?.duration) {
        chrome.alarms.create('sprintFinished', { delayInMinutes: message.payload.duration });
      }
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

// 移除監聽分頁更新的代碼，因為 DNR 已經在網路層處理了

// 監聽鬧鐘
chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === 'dailyReview') {
    showReviewNotification();
  } else if (alarm.name === 'sprintFinished') {
    showSprintFinishedNotification();
  }
});

// 獲取使用者設定
async function getUserSettings() {
  const result = await chrome.storage.local.get('userSettings');
  return result.userSettings || {
    endOfDayReviewTime: '21:00',
    distractionSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com']
  };
}

// 計算下次回顧時間
function getNextReviewTime(hours: number, minutes: number): number {
  const now = new Date();
  const reviewTime = new Date();
  reviewTime.setHours(hours, minutes, 0, 0);
  
  if (reviewTime <= now) {
    reviewTime.setDate(reviewTime.getDate() + 1);
  }
  
  return reviewTime.getTime();
}

// 開始專注模式 (使用 Declarative Net Request 網路層攔截)
async function startFocusMode() {
  const settings = await getUserSettings();
  const sites: string[] = settings.distractionSites;
  
  if (!sites || sites.length === 0) return;

  const rules: any[] = sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { 
      type: "redirect" as const, 
      redirect: { extensionPath: "/blocked.html" } 
    },
    condition: { 
      urlFilter: site, 
      resourceTypes: ["main_frame"] 
    }
  }));

  // 先清空所有舊規則再加入新規則
  chrome.declarativeNetRequest.getDynamicRules((oldRules: any[]) => {
    const oldRuleIds = oldRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });
  });
}

// 停止專注模式
function stopFocusMode() {
  // 清空所有攔截規則
  chrome.declarativeNetRequest.getDynamicRules((oldRules: any[]) => {
    const oldRuleIds = oldRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds
    });
  });
}

// 顯示回顧通知
function showReviewNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Power Kit',
    message: '該進行日終回顧了！打開新分頁開始回顧今天的成果。'
  });
}

function showSprintFinishedNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '衝刺結束',
    message: '太棒了！你的番茄鐘衝刺已經結束，快來記錄你的成果吧！'
  });
}

// 儲存 Gemini 對話資料
async function saveGeminiConversation(conversation: any) {
  try {
    const result = await chrome.storage.local.get('geminiConversations');
    const list = result.geminiConversations || [];
    
    // 檢查是否已存在該 ID，若存在則更新，不存在則插入最前面
    const index = list.findIndex((c: any) => c.id === conversation.id);
    if (index > -1) {
      list[index] = {
        ...list[index],
        title: conversation.title || list[index].title,
        messages: conversation.messages,
        timestamp: conversation.timestamp
      };
    } else {
      list.unshift(conversation);
    }
    
    // 限制對話數量，例如最多保存 50 筆
    if (list.length > 50) {
      list.pop();
    }

    await chrome.storage.local.set({ geminiConversations: list });
    console.log(`Gemini Exporter: 已保存對話「${conversation.title}」，目前共有 ${list.length} 筆對話`);
  } catch (error) {
    console.error('儲存 Gemini 對話失敗:', error);
  }
}