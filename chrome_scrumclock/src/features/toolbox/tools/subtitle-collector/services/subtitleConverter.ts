import { CapturedSubtitleNote } from '../types';
import { WeeklyMission, CoreBattle, InboxItem, DailyLog } from '../../../../../types';

/**
 * 解析時間戳字串為總秒數 (支援 HH:MM:SS 或 MM:SS 或純秒數)
 */
export function parseTimeToSeconds(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  if (parts.some((num) => isNaN(num))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * 建立跳轉時間點 URL (針對 YouTube 附加 &t=Xs)
 */
export function buildJumpUrl(url: string, timeStr?: string): string {
  if (!url) return '';
  if (!timeStr) return url;
  const seconds = parseTimeToSeconds(timeStr);
  if (seconds <= 0) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      u.searchParams.set('t', `${seconds}s`);
      return u.toString();
    }
  } catch {
    // 若 URL 非標準格式則直接返回
  }
  return url;
}

/**
 * 將 CapturedSubtitleNote 格式化為 WeeklyMission 資料結構
 */
export function convertToWeeklyMission(note: CapturedSubtitleNote): WeeklyMission {
  const safeTitle = (note.title || '影片學習任務').slice(0, 80);
  const jumpUrl = buildJumpUrl(note.url, note.currentTime);

  return {
    id: `mission-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: `影音精讀: ${safeTitle}`,
    isCompleted: false,
    priority: 'P2',
    notes: `【來源影片】${safeTitle}\n時間戳: ${note.currentTime || '無'}\n網址: ${jumpUrl}\n\n${note.text}`,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    progressPercent: 0,
    tags: Array.from(new Set(['#影片學習', ...(note.tags || [])])),
    url: jumpUrl,
    suggestedDuration: 25,
    estimatedPomodoros: 1
  };
}

/**
 * 將 missionId 包裝為 CoreBattle 資料結構
 */
export function convertToCoreBattle(missionId: string, committedTime = '今日待排定'): CoreBattle {
  return {
    missionId,
    committedTime
  };
}

/**
 * 將 CapturedSubtitleNote 格式化為 InboxItem 資料結構
 */
export function convertToInboxItem(note: CapturedSubtitleNote): InboxItem {
  const safeTitle = note.title || '影音記錄';
  const jumpUrl = buildJumpUrl(note.url, note.currentTime);
  const snippet = note.text.length > 80 ? `${note.text.slice(0, 80)}...` : note.text;

  return {
    id: `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: `【影音記錄】${safeTitle} (${note.currentTime || '無時戳'}): ${snippet}`,
    contextUrl: jumpUrl,
    createdAt: new Date().toISOString(),
    processed: false
  };
}

/**
 * 將字幕筆記轉化並儲存至今日戰役任務 (weeklyMissions & dailyLogs)
 */
export async function addNoteToTodayBattle(
  note: CapturedSubtitleNote
): Promise<{ success: boolean; isAppended?: boolean; message: string }> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return { success: false, message: '無法存取 Chrome Storage 儲存區' };
  }

  try {
    const storageData = await chrome.storage.local.get(['weeklyMissions', 'dailyLogs']);
    const weeklyMissions: WeeklyMission[] = storageData.weeklyMissions || [];
    const dailyLogs: Record<string, DailyLog> = storageData.dailyLogs || {};
    const today = new Date().toISOString().split('T')[0];
    const todayLog: DailyLog = dailyLogs[today] || { coreBattles: [], sprintLogs: [] };
    const coreBattles: CoreBattle[] = todayLog.coreBattles || [];

    const safeTitle = (note.title || '影片學習任務').slice(0, 80);
    const missionText = `影音精讀: ${safeTitle}`;

    // 檢查是否已有相同文字之任務，若有則直接追加筆記
    const existingIndex = weeklyMissions.findIndex((m) => m.text === missionText);
    if (existingIndex > -1) {
      const existing = weeklyMissions[existingIndex];
      const appendNote = `\n\n---\n[${note.currentTime || '時戳'}] ${note.text}`;
      existing.notes = existing.notes ? `${existing.notes}${appendNote}` : appendNote.trim();
      await chrome.storage.local.set({ weeklyMissions });
      return { success: true, isAppended: true, message: '已同步補充筆記至既有任務！' };
    }

    const newMission = convertToWeeklyMission(note);
    const updatedWeekly = [...weeklyMissions, newMission];
    const updatedCoreBattles = [...coreBattles, convertToCoreBattle(newMission.id)];
    dailyLogs[today] = { ...todayLog, coreBattles: updatedCoreBattles };

    await chrome.storage.local.set({
      weeklyMissions: updatedWeekly,
      dailyLogs
    });

    return { success: true, isAppended: false, message: '🎯 已成功轉為今日戰役任務！' };
  } catch (error) {
    return { success: false, message: '轉化任務時發生儲存錯誤' };
  }
}

/**
 * 將字幕筆記放入 ScrumClock 收件匣 (InboxItems)
 */
export async function addNoteToInbox(
  note: CapturedSubtitleNote
): Promise<{ success: boolean; message: string }> {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return { success: false, message: '無法存取 Chrome Storage 儲存區' };
  }

  try {
    const storageData = await chrome.storage.local.get(['inboxItems']);
    const inboxItems: InboxItem[] = storageData.inboxItems || [];
    const newInbox = convertToInboxItem(note);
    const updatedInbox = [newInbox, ...inboxItems];

    await chrome.storage.local.set({ inboxItems: updatedInbox });
    return { success: true, message: '📥 已成功放入收件匣！' };
  } catch (error) {
    return { success: false, message: '放入收件匣時發生錯誤' };
  }
}
