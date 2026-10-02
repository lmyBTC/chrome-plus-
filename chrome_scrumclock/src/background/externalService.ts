import { executeNanoInference, parseFinanceSummary } from '../utils/ai-helper';
import { buildFinanceSummaryPrompt, FINANCE_SUMMARY_SYSTEM_PROMPT } from '../utils/ai-prompts';
import { getUserSettings } from './alarmHandlers';
import { sendDirectMessage } from '../shared/messaging/outboxQueue';

export const DEFAULT_FINANCE_CLIPPER_ID = 'imnnkgiglcbjknfbkdfocdhoookkipji';

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
  console.log('[ScrumClock External Service] 收到外部插件請求:', message?.type, '來自:', sender.id);

  // 0. 輕量存活確認 (可選 Ping / Ack，極簡同步回覆，零非同步負擔)
  if (message?.type === 'PING' || message?.type === 'PING_HUB' || message?.type === 'AI_PING') {
    sendResponse({
      success: true,
      ack: true,
      available: true
    });
    return false;
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

  // 4. 影片筆記/字幕收集
  if (message?.type === 'COLLECT_NOTE') {
    (async () => {
      try {
        const result = await handleCollectNoteExternal(message.payload);
        sendResponse(result);
      } catch (err: any) {
        console.error('[ScrumClock Collector Service] 收集筆記失敗:', err);
        sendResponse({
          success: false,
          error: err?.message || '收集筆記時發生未預期錯誤'
        });
      }
    })();
    return true;
  }

  return false;
}

export async function handleCollectNoteExternal(payload: any) {
  if (!payload || !payload.text) {
    return { success: false, error: '缺少必要的筆記或字幕內容 (text)' };
  }

  const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!rawText) {
    return { success: false, error: '筆記內容不可為空' };
  }

  const safeTitle = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim().slice(0, 200)
    : '影片精選內容';
  const safeUrl = typeof payload.url === 'string' ? payload.url.slice(0, 500) : '';
  const safeCurrentTime = typeof payload.currentTime === 'string' ? payload.currentTime.trim().slice(0, 30) : '';
  const safeSource = typeof payload.source === 'string' ? payload.source.slice(0, 50) : 'video_speed_plus';
  const safeNoteType = typeof payload.type === 'string' ? payload.type.slice(0, 30) : 'subtitle';
  const safeText = rawText.slice(0, 20000);

  const defaultTags = ['#影片學習'];
  const inputTags = Array.isArray(payload.tags)
    ? payload.tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
    : [];
  const safeTags = Array.from(new Set([...defaultTags, ...inputTags])).slice(0, 10);

  const noteId = 'note-' + Date.now();
  const noteItem = {
    id: noteId,
    title: safeTitle,
    url: safeUrl,
    currentTime: safeCurrentTime,
    text: safeText,
    source: safeSource,
    type: safeNoteType,
    tags: safeTags,
    createdAt: new Date().toISOString()
  };

  const formattedPendingText = safeCurrentTime ? `[${safeCurrentTime}] ${safeText}` : safeText;
  const pendingData = {
    text: formattedPendingText,
    title: safeTitle,
    url: safeUrl,
    timestamp: Date.now(),
    source: safeSource
  };

  const storageData = await chrome.storage.local.get(['capturedNotes']);
  const capturedNotes: any[] = storageData.capturedNotes || [];
  capturedNotes.unshift(noteItem);
  if (capturedNotes.length > 50) {
    capturedNotes.pop();
  }

  await chrome.storage.local.set({
    pendingAnalyzeText: pendingData,
    capturedNotes: capturedNotes
  });

  try {
    const timePrefix = safeCurrentTime ? `[${safeCurrentTime}] ` : '';
    const snippet = safeText.length > 50 ? `${safeText.slice(0, 50)}...` : safeText;
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '📥 已收集影片筆記/字幕',
      message: `${timePrefix}${snippet}`
    });
  } catch (_) {}

  return {
    success: true,
    ack: true,
    noteId: noteId,
    message: '已成功收集字幕至 ScrumClock'
  };
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

  // v2.3 GTD Context 規範校驗 (@Focus | @Meeting | @Review | @Waiting-For | @Blocked)
  const validGTDContexts = ['@Focus', '@Meeting', '@Review', '@Waiting-For', '@Blocked'];
  const safeGTDContext = (typeof payload.gtdContext === 'string' && validGTDContexts.includes(payload.gtdContext))
    ? payload.gtdContext
    : '@Focus';

  // 優先級 P1 / P2 / P3
  const validPriorities = ['P1', 'P2', 'P3'];
  const safePriority = (typeof payload.priority === 'string' && validPriorities.includes(payload.priority))
    ? payload.priority
    : 'P1';

  // 來源插件標籤
  const safeSourcePlugin = typeof payload.sourcePlugin === 'string' && payload.sourcePlugin.trim()
    ? payload.sourcePlugin.trim().slice(0, 50)
    : (safeTicker ? 'FINANCE_CLIPPER' : 'EXTERNAL');

  const defaultTags = ['#投資研究'];
  if (safeTicker) defaultTags.push(`$${safeTicker}`);
  if (safeGTDContext) defaultTags.push(safeGTDContext);
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
    let hasChanges = false;
    if (safeNotes && (!existingBattleMission.notes || !existingBattleMission.notes.includes(safeNotes.slice(0, 100)))) {
      existingBattleMission.notes = existingBattleMission.notes
        ? `${existingBattleMission.notes}\n\n---\n\n${safeNotes}`
        : safeNotes;
      hasChanges = true;
    }

    if (hasChanges) {
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
      ack: true,
      taskId: existingBattleMission.id,
      duplicate: true,
      message: '今日戰役已包含此標的研究任務'
    };
  }

  const newMission: any = {
    id: 'mission-' + Date.now(),
    text: safeTitle,
    isCompleted: false,
    priority: safePriority,
    gtdContext: safeGTDContext,
    sourcePlugin: safeSourcePlugin,
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
      message: `成功將「${safeTitle}」加入 ScrumClock 今日戰役 (${safePomodoros} 顆番茄鐘，${safeGTDContext})！`
    });
  } catch (_) {}

  return {
    success: true,
    ack: true,
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
    const extId = settings.financeClipperExtensionId || DEFAULT_FINANCE_CLIPPER_ID;
    if (!extId) {
      return;
    }

    await sendDirectMessage(
      extId,
      {
        protocolVersion: 2,
        type: 'FOCUS_STARTED',
        payload: {
          ticker: ticker || undefined,
          missionText: text,
          tags: tags
        }
      },
      {
        timeoutMs: 4000
      }
    );
  } catch (err) {
    console.warn('[ScrumClock Focus Broadcast] 廣播失敗:', err);
  }
}
