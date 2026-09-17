// 確保 Chrome API 可用
import { getAICore, checkAiCapabilities, executeNanoInference, parseFinanceSummary } from './utils/ai-helper';
import { buildFinanceSummaryPrompt, FINANCE_SUMMARY_SYSTEM_PROMPT } from './utils/ai-prompts';

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

// -----------------------------------------------------------------------------
// 跨插件 AI 服務化協議監聽器 (externally_connectable)
// 支援 FinanceClipper 或其他外部插件安全調用 Gemini Nano 本地端 AI 能力
// -----------------------------------------------------------------------------
chrome.runtime.onMessageExternal.addListener((message: any, sender: any, sendResponse: any) => {
  console.log('[ScrumClock AI Service] 收到外部插件請求:', message?.type, '來自:', sender.id);

  // 1. 連線與能力探測
  if (message?.type === 'AI_PING' || message?.type === 'AI_CAPABILITIES') {
    (async () => {
      try {
        const aiCore = getAICore();
        const available = await checkAiCapabilities(aiCore);
        sendResponse({
          success: true,
          available,
          model: 'Gemini Nano (On-Device Built-in AI)'
        });
      } catch (err: any) {
        sendResponse({
          success: false,
          available: false,
          error: err?.message || 'AI 狀態檢測異常'
        });
      }
    })();
    return true; // 維持非同步連線
  }

  // 2. 財務研報智能摘要生成
  if (message?.type === 'AI_GENERATE_FINANCE_SUMMARY') {
    (async () => {
      try {
        const payload = message.payload;
        if (!payload || !payload.ticker) {
          sendResponse({ success: false, error: '缺少必要的個股資料 (ticker)' });
          return;
        }

        console.log(`[ScrumClock AI Service] 開始為 ${payload.ticker} 進行本地 Gemini Nano 推論...`);
        const prompt = buildFinanceSummaryPrompt(payload);
        const rawOutput = await executeNanoInference(prompt, FINANCE_SUMMARY_SYSTEM_PROMPT, 30000);
        const summary = parseFinanceSummary(rawOutput, payload.ticker);

        sendResponse({
          success: true,
          summary: {
            ...summary,
            generatedAt: new Date().toLocaleString(),
            model: 'Gemini Nano (On-Device)'
          }
        });
      } catch (err: any) {
        console.error('[ScrumClock AI Service] AI 研報生成失敗:', err);
        sendResponse({
          success: false,
          error: err?.message || '本地 AI 推論失敗或超時'
        });
      }
    })();
    return true; // 維持非同步連線
  }

  // 3. 研報一鍵轉待辦任務 (Phase 3.1)
  if (message?.type === 'CREATE_TASK') {
    (async () => {
      try {
        const result = await handleCreateTaskExternal(message.payload);
        sendResponse(result);
      } catch (err: any) {
        console.error('[ScrumClock Task Service] 建立任務失敗:', err);
        sendResponse({
          success: false,
          error: err?.message || '建立任務時發生未預期錯誤'
        });
      }
    })();
    return true; // 維持非同步連線
  }

  return false;
});

// -----------------------------------------------------------------------------
// Phase 3 輔助函式：研報任務外部寫入與專注模式金融標籤廣播
// -----------------------------------------------------------------------------

async function handleCreateTaskExternal(payload: any) {
  if (!payload || (!payload.title && !payload.ticker)) {
    return { success: false, error: '缺少必要的任務標題或股票代碼' };
  }

  const rawTicker = typeof payload.ticker === 'string' ? payload.ticker.trim().toUpperCase() : '';
  const safeTicker = rawTicker ? rawTicker.slice(0, 20) : undefined;
  const rawTitle = typeof payload.title === 'string' ? payload.title.trim() : '';
  const safeTitle = (rawTitle || (safeTicker ? `${safeTicker} 投資研報深度分析` : '未命名研報任務')).slice(0, 200);
  const safeNotes = typeof payload.notes === 'string' ? payload.notes.slice(0, 15000) : '';
  const safeUrl = typeof payload.url === 'string' ? payload.url.slice(0, 500) : undefined;
  const safePomodoros = typeof payload.estimatedPomodoros === 'number' && payload.estimatedPomodoros > 0
    ? Math.min(Math.round(payload.estimatedPomodoros), 20)
    : 2;

  // 清洗 tags
  const defaultTags = ['#投資研究'];
  if (safeTicker) defaultTags.push(`$${safeTicker}`);
  const inputTags = Array.isArray(payload.tags)
    ? payload.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
    : [];
  const safeTags = Array.from(new Set([...defaultTags, ...inputTags])).slice(0, 10);

  // 讀取既有任務與今日戰役
  const storageData = await chrome.storage.local.get(['weeklyMissions', 'dailyLogs']);
  const weeklyMissions: any[] = storageData.weeklyMissions || [];
  const dailyLogs: Record<string, any> = storageData.dailyLogs || {};
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs[today] || { coreBattles: [], sprintLogs: [] };
  const coreBattles: any[] = todayLog.coreBattles || [];

  // 防重複檢查：檢查今日核心戰役內是否已有相同 ticker 或相同標題
  const existingBattleMission = weeklyMissions.find((m) => {
    const inToday = coreBattles.some((b) => b.missionId === m.id);
    if (!inToday) return false;
    if (safeTicker && m.ticker && m.ticker.toUpperCase() === safeTicker) return true;
    return m.text === safeTitle;
  });

  if (existingBattleMission) {
    // 若已存在，若有新的 notes 則安全追加
    if (safeNotes && (!existingBattleMission.notes || !existingBattleMission.notes.includes(safeNotes.slice(0, 100)))) {
      existingBattleMission.notes = existingBattleMission.notes
        ? `${existingBattleMission.notes}\n\n---\n\n${safeNotes}`
        : safeNotes;
      await chrome.storage.local.set({ weeklyMissions });
    }

    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎯 今日戰役已存在',
        message: `標的「${safeTicker || safeTitle}」已在今日戰役清單中，已為您同步更新筆記備忘！`
      });
    } catch (_) {}

    return {
      success: true,
      taskId: existingBattleMission.id,
      duplicate: true,
      message: '今日戰役已包含此標的研究任務'
    };
  }

  // 建立新任務
  const newMission: any = {
    id: 'mission-' + Date.now(),
    text: safeTitle,
    isCompleted: false,
    priority: 'P1',
    notes: safeNotes,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    progressPercent: 0,
    ticker: safeTicker,
    tags: safeTags,
    url: safeUrl,
    suggestedDuration: safePomodoros * 25,
    estimatedPomodoros: safePomodoros
  };

  const updatedWeekly = [...weeklyMissions, newMission];
  const updatedCoreBattles = [...coreBattles, { missionId: newMission.id, committedTime: '今日待排定' }];
  dailyLogs[today] = { ...todayLog, coreBattles: updatedCoreBattles };

  await chrome.storage.local.set({
    weeklyMissions: updatedWeekly,
    dailyLogs: dailyLogs
  });

  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '🎯 已加入今日作戰戰役',
      message: `成功將「${safeTitle}」加入 ScrumClock 今日戰役 (${safePomodoros} 顆番茄鐘)！`
    });
  } catch (_) {}

  return {
    success: true,
    taskId: newMission.id,
    duplicate: false
  };
}

async function broadcastFocusToFinanceClipper(payload?: any) {
  try {
    const text = payload?.missionText || '';
    const tags: string[] = Array.isArray(payload?.tags) ? payload.tags : [];
    
    // 檢測是否包含金融/投資相關標籤
    const isFinanceTask = 
      text.includes('#投資研究') ||
      text.includes('#美股') ||
      text.includes('#台股') ||
      text.includes('#股票') ||
      text.includes('#財報') ||
      /\$([A-Za-z0-9]+)/.test(text) ||
      tags.some((t: any) => typeof t === 'string' && (t.includes('投資') || t.includes('股票') || t.startsWith('$')));

    if (!isFinanceTask) return;

    // 提取 ticker
    let ticker = payload?.ticker;
    if (!ticker) {
      const match = text.match(/\$([A-Za-z0-9]+)/);
      if (match) {
        ticker = match[1].toUpperCase();
      }
    }

    const settings = await getUserSettings();
    const extId = settings.financeClipperExtensionId;
    if (!extId) {
      return;
    }

    chrome.runtime.sendMessage(
      extId,
      {
        protocolVersion: 1,
        type: 'FOCUS_STARTED',
        payload: {
          ticker: ticker || undefined,
          missionText: text,
          tags: tags
        }
      },
      () => {
        if (chrome.runtime.lastError) {
          // 對端未啟動或未安裝，靜默降級
          return;
        }
      }
    );
  } catch (err) {
    console.warn('[ScrumClock Focus Broadcast] 廣播失敗:', err);
  }
}