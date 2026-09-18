import { getAICore, checkAiCapabilities, executeNanoInference, parseFinanceSummary } from '../utils/ai-helper';
import { buildFinanceSummaryPrompt, FINANCE_SUMMARY_SYSTEM_PROMPT } from '../utils/ai-prompts';
import { getUserSettings } from './alarmHandlers';

/**
 * 儲存 Gemini 對話資料
 */
export async function saveGeminiConversation(conversation: any) {
  try {
    const result = await chrome.storage.local.get('geminiConversations');
    const list = result.geminiConversations || [];
    
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
    
    if (list.length > 50) {
      list.pop();
    }

    await chrome.storage.local.set({ geminiConversations: list });
    console.log(`Gemini Exporter: 已保存對話「${conversation.title}」，目前共有 ${list.length} 筆對話`);
  } catch (error) {
    console.error('儲存 Gemini 對話失敗:', error);
  }
}

/**
 * 跨插件外部通訊處理器 (externally_connectable)
 */
export function handleExternalMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
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
    return true;
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
    return true;
  }

  // 3. 研報一鍵轉待辦任務
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
    return true;
  }

  return false;
}

export async function handleCreateTaskExternal(payload: any) {
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

  const defaultTags = ['#投資研究'];
  if (safeTicker) defaultTags.push(`$${safeTicker}`);
  const inputTags = Array.isArray(payload.tags)
    ? payload.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
    : [];
  const safeTags = Array.from(new Set([...defaultTags, ...inputTags])).slice(0, 10);

  const storageData = await chrome.storage.local.get(['weeklyMissions', 'dailyLogs']);
  const weeklyMissions: any[] = storageData.weeklyMissions || [];
  const dailyLogs: Record<string, any> = storageData.dailyLogs || {};
  const today = new Date().toISOString().split('T')[0];
  const todayLog = dailyLogs[today] || { coreBattles: [], sprintLogs: [] };
  const coreBattles: any[] = todayLog.coreBattles || [];

  const existingBattleMission = weeklyMissions.find((m) => {
    const inToday = coreBattles.some((b) => b.missionId === m.id);
    if (!inToday) return false;
    if (safeTicker && m.ticker && m.ticker.toUpperCase() === safeTicker) return true;
    return m.text === safeTitle;
  });

  if (existingBattleMission) {
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

export async function broadcastFocusToFinanceClipper(payload?: any) {
  try {
    const text = payload?.missionText || '';
    const tags: string[] = Array.isArray(payload?.tags) ? payload.tags : [];
    
    const isFinanceTask = 
      text.includes('#投資研究') ||
      text.includes('#美股') ||
      text.includes('#台股') ||
      text.includes('#股票') ||
      text.includes('#財報') ||
      /\$([A-Za-z0-9]+)/.test(text) ||
      tags.some((t: any) => typeof t === 'string' && (t.includes('投資') || t.includes('股票') || t.startsWith('$')));

    if (!isFinanceTask) return;

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
          return;
        }
      }
    );
  } catch (err) {
    console.warn('[ScrumClock Focus Broadcast] 廣播失敗:', err);
  }
}
