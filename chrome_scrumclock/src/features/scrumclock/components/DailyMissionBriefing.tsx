import React, { useState, useEffect } from 'react';
import { WeeklyMission, CoreBattle } from '../../../types';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { geminiService } from '../../../core/api/gemini';
import { getAICore, checkAiCapabilities } from '../../../utils/ai-helper';

interface DailyMissionBriefingProps {
  onComplete: () => void;
}

export const DailyMissionBriefing: React.FC<DailyMissionBriefingProps> = ({ onComplete }) => {
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [selectedMissions, setSelectedMissions] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [distractionSites, setDistractionSites] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  // 新增手動週任務管理 States
  const [newMissionText, setNewMissionText] = useState('');
  const [editingWeeklyId, setEditingWeeklyId] = useState<string | null>(null);
  const [editingWeeklyText, setEditingWeeklyText] = useState('');

  // AI 智能拆解 States
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [breakdownMissions, setBreakdownMissions] = useState<string[]>([]);
  const [selectedBreakdownIdxs, setSelectedBreakdownIdxs] = useState<number[]>([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [targetWeeklyMission, setTargetWeeklyMission] = useState<WeeklyMission | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [missions, userSettings, calendarEventsResult, savedTomorrow] = await Promise.all([
        storage.getWeeklyMissions(),
        storage.getUserSettings(),
        sync.pullTodayCalendarEvents(),
        storage.getTomorrowBattles()
      ]);
      setWeeklyMissions(missions);
      setAppsScriptUrl(userSettings.appsScriptUrl || '');
      setDistractionSites((userSettings.distractionSites || []).join('\n'));
      setGeminiApiKey(userSettings.geminiApiKey || '');
      setCalendarEvents(calendarEventsResult || []);

      // 預先勾選昨晚選定的戰役
      if (savedTomorrow && savedTomorrow.length > 0) {
        setSelectedMissions(savedTomorrow);
        // 載入後清空，避免重複載入
        await storage.saveTomorrowBattles([]);
      }
    } catch (error) {
      console.error('載入週任務失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 手動建立週任務
  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionText.trim()) return;

    const newMission: WeeklyMission = {
      id: `mission-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: newMissionText.trim(),
      isCompleted: false
    };

    try {
      const updated = [...weeklyMissions, newMission];
      await storage.saveWeeklyMissions(updated);
      setWeeklyMissions(updated);
      setNewMissionText('');
    } catch (error) {
      console.error('手動新增週任務失敗:', error);
      alert('新增失敗，請重試');
    }
  };

  // 儲存編輯後的週任務名稱
  const handleSaveWeeklyText = async (missionId: string, newText: string) => {
    if (!newText.trim()) return;
    try {
      const updated = weeklyMissions.map(m =>
        m.id === missionId ? { ...m, text: newText.trim() } : m
      );
      await storage.saveWeeklyMissions(updated);
      setWeeklyMissions(updated);
    } catch (error) {
      console.error('更新週任務失敗:', error);
      alert('更新失敗，請重試');
    }
  };

  // 永久刪除週任務
  const handleDeleteWeeklyMission = async (missionId: string) => {
    if (!window.confirm('確定要永久刪除此週任務嗎？')) return;
    try {
      const updated = weeklyMissions.filter(m => m.id !== missionId);
      await storage.saveWeeklyMissions(updated);
      setWeeklyMissions(updated);
      setSelectedMissions(prev => prev.filter(id => id !== missionId));
    } catch (error) {
      console.error('刪除週任務失敗:', error);
      alert('刪除失敗，請重試');
    }
  };

  const handleSyncFromSheets = async () => {
    setIsSyncing(true);
    try {
      const success = await sync.pullTasksFromSheets();
      if (success) {
        await loadData();
        alert('從試算表同步成功！');
      } else {
        alert('同步失敗，請確認已設定正確的 Google Apps Script URL。');
      }
    } catch (error) {
      console.error('Sync failed', error);
      alert('同步發生錯誤');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFromGoogleTasks = async () => {
    setIsSyncing(true);
    try {
      const success = await sync.pullTasksFromGoogleTasks();
      if (success) {
        await loadData();
        alert('從 Google Tasks 匯入成功！');
      } else {
        alert('匯入失敗，請確認 Apps Script 已正確配置 Tasks API。');
      }
    } catch (error) {
      console.error('Import failed', error);
      alert('匯入發生錯誤');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveUrl = async () => {
    try {
      const userSettings = await storage.getUserSettings();
      userSettings.appsScriptUrl = appsScriptUrl;
      userSettings.distractionSites = distractionSites.split('\n').map(s => s.trim()).filter(s => s);
      userSettings.geminiApiKey = geminiApiKey;
      await storage.saveUserSettings(userSettings);
      alert('設定已儲存！');
    } catch (error) {
      console.error('Save URL failed', error);
      alert('儲存失敗');
    }
  };

  const handleMissionToggle = (missionId: string) => {
    setSelectedMissions(prev => {
      if (prev.includes(missionId)) {
        const newSelected = prev.filter(id => id !== missionId);
        const newTimeSlots = { ...timeSlots };
        delete newTimeSlots[missionId];
        setTimeSlots(newTimeSlots);
        return newSelected;
      } else {
        return [...prev, missionId];
      }
    });
  };

  const handleTimeChange = (missionId: string, timeSlot: string) => {
    setTimeSlots(prev => ({
      ...prev,
      [missionId]: timeSlot
    }));
  };

  const handleCompleteMission = async (missionId: string) => {
    const notes = window.prompt('請輸入執行備註 (Execution Notes)，這將作為 AI 分析的語料：');
    if (notes === null) return; // 使用者取消

    setIsSyncing(true);
    try {
      const success = await sync.completeTaskWithNotes(missionId, notes);
      if (success) {
        alert('任務已標記為完成並回傳備註！');
        await loadData();
      } else {
        alert('標記完成失敗，請檢查設定。');
      }
    } catch (error) {
      console.error('Complete mission failed', error);
      alert('標記完成發生錯誤');
    } finally {
      setIsSyncing(false);
    }
  };

  // AI 智能拆解執行
  const handleWeeklyBreakdown = async (mission: WeeklyMission) => {
    setBreakingDownId(mission.id);
    setTargetWeeklyMission(mission);
    try {
      let subtasks: string[] = [];

      const prompt = `請將任務「${mission.text}」拆解為 3 到 5 個具體且可獨立執行的子步驟。每個步驟請評估所需的番茄鐘數量（1 顆番茄 = 25 分鐘專注）。\n\n請務必嚴格遵循以下回傳格式，每行一個步驟，不需任何標題或 Markdown 標記，也不要有任何項目符號（如 1. 或 -）：\n${mission.text} — [子步驟具體動作] (N 🍅)`;
      const systemInstruction = '你是一個專業的敏捷開發 Scrum Master。你擅長將大型任務拆解為 1~3 個番茄鐘內可以完成的小型衝刺任務。只回傳規定的純文字格式，不要有多餘的問候語。';

      // 優先使用 Chrome 本地端 Gemini Nano (Prompt API)
      try {
        const aiAPI = getAICore();
        const isAiAvailable = await checkAiCapabilities(aiAPI);

        if (aiAPI && isAiAvailable) {
          const session = await aiAPI.create({ systemPrompt: systemInstruction });
          const result = await session.prompt(prompt);
          session.destroy(); // 記得釋放 VRAM

          if (result) {
            subtasks = result.split('\n')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0 && s.includes('🍅'));
          }
        }
      } catch (nanoError) {
        console.warn('Gemini Nano 本地拆解失敗，嘗試其他備援', nanoError);
      }

      // 備援方案：如果有設定 Gemini API Key，使用 Cloud API
      if ((!subtasks || subtasks.length === 0) && geminiApiKey) {
        try {
          const result = await geminiService.generateText(prompt, systemInstruction);
          if (result) {
            subtasks = result.split('\n')
              .map(s => s.trim())
              .filter(s => s.length > 0 && s.includes('🍅'));
          }
        } catch (geminiError) {
          console.warn('Gemini Cloud 拆解失敗，嘗試使用 Sync 備援', geminiError);
        }
      }

      // 若都失敗，退回使用 Sync Webhook
      if (!subtasks || subtasks.length === 0) {
        subtasks = await sync.breakdownTask(mission.id);
      }

      // 最終降級模擬
      if (!subtasks || subtasks.length === 0) {
        subtasks = [
          `${mission.text} — 規劃與分析 (1 🍅)`,
          `${mission.text} — 核心實作與開發 (2 🍅)`,
          `${mission.text} — 測試與優化 (1 🍅)`
        ];
      }

      setBreakdownMissions(subtasks);
      // 預設全選
      setSelectedBreakdownIdxs(subtasks.map((_, i) => i));
      setShowBreakdownModal(true);
    } catch (e) {
      console.warn('AI 拆解出錯，降級為本地模擬', e);
      const subtasks = [
        `${mission.text} — 規劃與分析 (1 🍅)`,
        `${mission.text} — 核心實作與開發 (2 🍅)`,
        `${mission.text} — 測試與優化 (1 🍅)`
      ];
      setBreakdownMissions(subtasks);
      setSelectedBreakdownIdxs(subtasks.map((_, i) => i));
      setShowBreakdownModal(true);
    } finally {
      setBreakingDownId(null);
    }
  };

  // 匯入拆解出來的子任務，並自動進行時間排程
  const handleImportBreakdown = async () => {
    if (!targetWeeklyMission || selectedBreakdownIdxs.length === 0) return;

    const selectedTexts = selectedBreakdownIdxs.map(idx => breakdownMissions[idx]);

    const newMissions: WeeklyMission[] = selectedTexts.map((text, index) => {
      let suggestedDuration = 25;
      const pomoMatch = text.match(/\((\d+)\s*🍅\)/);
      if (pomoMatch) {
        suggestedDuration = parseInt(pomoMatch[1]) * 25;
      }
      return {
        id: `submission-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        text: text,
        isCompleted: false,
        suggestedDuration: suggestedDuration
      };
    });

    try {
      const updatedWeekly = [...weeklyMissions, ...newMissions];
      await storage.saveWeeklyMissions(updatedWeekly);
      setWeeklyMissions(updatedWeekly);

      // 自動排程並選定這些任務為今日戰役
      let baseHour = 9;
      let baseMin = 0;

      const activeTimeSlots = selectedMissions.map(id => timeSlots[id]).filter(t => t && t.includes('-'));
      if (activeTimeSlots.length > 0) {
        const lastSlot = activeTimeSlots[activeTimeSlots.length - 1];
        const endTimeStr = lastSlot.split('-')[1];
        const [h, m] = endTimeStr.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          baseHour = h;
          baseMin = m;
        }
      }

      const newTimeSlots = { ...timeSlots };
      const newSelectedMissions = [...selectedMissions];

      newMissions.forEach(m => {
        const durationMin = m.suggestedDuration || 25;
        const startStr = `${baseHour.toString().padStart(2, '0')}:${baseMin.toString().padStart(2, '0')}`;

        baseMin += durationMin;
        if (baseMin >= 60) {
          baseHour += Math.floor(baseMin / 60);
          baseMin = baseMin % 60;
        }

        const endStr = `${baseHour.toString().padStart(2, '0')}:${baseMin.toString().padStart(2, '0')}`;

        newTimeSlots[m.id] = `${startStr}-${endStr}`;
        newSelectedMissions.push(m.id);
      });

      setTimeSlots(newTimeSlots);
      setSelectedMissions(newSelectedMissions);
      setShowBreakdownModal(false);

      alert(`成功拆解並匯入 ${newMissions.length} 個子任務！已自動為您排程時段。`);
    } catch (err) {
      console.error('匯入拆解任務失敗:', err);
      alert('匯入失敗，請重試');
    }
  };

  const handleToggleBreakdownIdx = (idx: number) => {
    setSelectedBreakdownIdxs(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSubmit = async () => {
    if (selectedMissions.length === 0) {
      alert('請至少選擇一個核心戰役');
      return;
    }

    const coreBattles: CoreBattle[] = selectedMissions.map(missionId => ({
      missionId,
      committedTime: timeSlots[missionId] || '09:00-10:00'
    }));

    try {
      const todayLog = await storage.getTodayLog();
      todayLog.coreBattles = coreBattles;
      await storage.saveTodayLog(todayLog);
      onComplete();
    } catch (error) {
      console.error('儲存核心戰役失敗:', error);
      alert('儲存失敗，請重試');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-dark-primary mb-2">
          每日任務簡報
        </h1>
        <p className="text-dark-secondary mb-4">
          從你的週任務中選擇 2-3 個作為今日核心戰役
        </p>
        <button
          onClick={handleSyncFromSheets}
          disabled={isSyncing}
          className="px-4 py-2 bg-blue-950/40 text-blue-400 border border-blue-900/60 rounded hover:bg-blue-900/40 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {isSyncing ? '同步中...' : '🔄 從 Sheet 匯入最新計畫'}
        </button>
        <button
          onClick={handleImportFromGoogleTasks}
          disabled={isSyncing}
          className="ml-2 px-4 py-2 bg-green-950/40 text-green-400 border border-green-900/60 rounded hover:bg-green-900/40 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {isSyncing ? '匯入中...' : '✅ 從 Google Tasks 匯入'}
        </button>
        <button
          onClick={() => setIsSettingOpen(!isSettingOpen)}
          className="ml-2 px-4 py-2 bg-dark-card text-dark-secondary border border-dark-border-default rounded hover:bg-dark-hover transition-colors text-sm font-medium"
        >
          ⚙️ 設定
        </button>

        {isSettingOpen && (
          <div className="mt-4 p-4 bg-dark-card rounded-lg shadow-xl border border-dark-border-default text-left shadow-slate-950/50">
            <label className="block text-sm font-medium text-dark-secondary mb-1">
              Google Apps Script URL (同步用)
            </label>
            <div className="flex mb-4">
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border-default text-dark-primary rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 transition-colors font-semibold"
              >
                儲存
              </button>
            </div>

            <label className="block text-sm font-medium text-dark-secondary mb-1">
              Gemini API Key (自備 AI 助理金鑰)
            </label>
            <div className="flex mb-4">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="填入您的 Gemini API Key (可到 Google AI Studio 免費申請)"
                className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border-default text-dark-primary rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 transition-colors font-semibold"
              >
                儲存
              </button>
            </div>

            <label className="block text-sm font-medium text-dark-secondary mb-1">
              專注模式阻擋黑名單 (每行一個網址)
            </label>
            <div className="flex">
              <textarea
                value={distractionSites}
                onChange={(e) => setDistractionSites(e.target.value)}
                placeholder="例如:&#10;youtube.com&#10;facebook.com"
                rows={3}
                className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border-default text-dark-primary rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 transition-colors font-semibold"
              >
                儲存
              </button>
            </div>
          </div>
        )}
      </div>

      {calendarEvents.length > 0 && (
        <div className="bg-yellow-950/20 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-500">📅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-400">
                注意：你今天有 {calendarEvents.length} 個既有行程
              </h3>
              <div className="mt-2 text-sm text-yellow-300">
                <ul className="list-disc pl-5 space-y-1">
                  {calendarEvents.map((event, idx) => (
                    <li key={idx}>
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: {event.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-dark-card border border-dark-border-subtle rounded-lg shadow-lg p-6 mb-6 shadow-slate-950/40">
        <h2 className="text-xl font-semibold mb-4 text-dark-primary">選擇今日核心戰役</h2>

        {/* 手動新增關鍵任務輸入框 */}
        <form onSubmit={handleCreateMission} className="flex mb-5 gap-2 border-b border-dark-border-subtle pb-4">
          <input
            type="text"
            placeholder="➕ 手動新增本週關鍵任務..."
            value={newMissionText}
            onChange={(e) => setNewMissionText(e.target.value)}
            className="flex-1 px-3 py-2 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap shadow-md shadow-blue-950/40"
          >
            新增
          </button>
        </form>

        <div className="space-y-4">
          {weeklyMissions.map(mission => (
            <div key={mission.id} className="flex items-center space-x-4 p-4 border border-dark-border-subtle bg-dark-surface/40 hover:bg-dark-surface/70 rounded-lg transition-all">
              <input
                type="checkbox"
                id={mission.id}
                checked={selectedMissions.includes(mission.id)}
                onChange={() => handleMissionToggle(mission.id)}
                className="w-5 h-5 text-blue-500 border-dark-border-default rounded focus:ring-blue-500 bg-dark-card cursor-pointer"
              />

              {editingWeeklyId === mission.id ? (
                <input
                  type="text"
                  value={editingWeeklyText}
                  onChange={(e) => setEditingWeeklyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveWeeklyText(mission.id, editingWeeklyText);
                      setEditingWeeklyId(null);
                    }
                    if (e.key === 'Escape') setEditingWeeklyId(null);
                  }}
                  onBlur={() => {
                    handleSaveWeeklyText(mission.id, editingWeeklyText);
                    setEditingWeeklyId(null);
                  }}
                  className="flex-1 px-2 py-1 bg-dark-card border border-dark-border-default text-dark-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <div className="flex-1 flex items-center space-x-2">
                  <label
                    onDoubleClick={() => {
                      if (!mission.isCompleted) {
                        setEditingWeeklyId(mission.id);
                        setEditingWeeklyText(mission.text);
                      }
                    }}
                    htmlFor={mission.id}
                    className={`cursor-pointer select-none hover:text-blue-400 transition-colors ${mission.isCompleted ? 'line-through text-slate-500' : 'text-dark-secondary'}`}
                    title="雙擊編輯任務"
                  >
                    {mission.text}
                  </label>
                  {!mission.isCompleted && (
                    <button
                      onClick={() => {
                        setEditingWeeklyId(mission.id);
                        setEditingWeeklyText(mission.text);
                      }}
                      className="text-dark-muted hover:text-blue-400 p-0.5 text-xs"
                      title="編輯名稱"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}

              {!mission.isCompleted && (
                <button
                  onClick={() => handleWeeklyBreakdown(mission)}
                  disabled={breakingDownId === mission.id}
                  className="px-3 py-1 bg-purple-950/40 text-purple-400 border border-purple-900/50 rounded hover:bg-purple-900/40 text-xs whitespace-nowrap font-medium disabled:opacity-50"
                >
                  {breakingDownId === mission.id ? '拆解中...' : '🤖 拆解'}
                </button>
              )}
              {!mission.isCompleted && (
                <button
                  onClick={() => handleCompleteMission(mission.id)}
                  className="px-3 py-1 bg-green-950/40 text-green-400 border border-green-900/50 rounded hover:bg-green-900/40 text-xs whitespace-nowrap font-medium"
                >
                  完成
                </button>
              )}
              {!mission.isCompleted && (
                <button
                  onClick={() => handleDeleteWeeklyMission(mission.id)}
                  className="px-2.5 py-1 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/40 rounded text-xs whitespace-nowrap font-medium transition-colors"
                  title="永久刪除此任務"
                >
                  ❌ 刪除
                </button>
              )}
              {selectedMissions.includes(mission.id) && (
                <input
                  type="text"
                  placeholder="09:00-11:00"
                  value={timeSlots[mission.id] || ''}
                  onChange={(e) => handleTimeChange(mission.id, e.target.value)}
                  className="px-3 py-2 bg-dark-card border border-dark-border-default text-dark-primary rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-32"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={selectedMissions.length === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
        >
          開始今日衝刺
        </button>
      </div>

      {/* AI 智能拆解 Modal */}
      {showBreakdownModal && targetWeeklyMission && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-dark-card rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-dark-border-subtle animate-fade-in shadow-slate-950/80">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-dark-border-subtle">
              <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                <span>🤖</span> AI 任務智能拆解
              </h3>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="text-dark-muted hover:text-dark-primary font-semibold transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-dark-muted mb-3">
              週任務標題：<span className="font-semibold text-dark-primary">{targetWeeklyMission.text}</span>
            </p>
            <p className="text-xs text-dark-muted/80 mb-4">
              勾選您想要匯入為今日核心戰役的步驟。系統會自動計算並填入 committedTime 時段。
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-5 p-2 bg-dark-surface rounded-lg">
              {breakdownMissions.map((sub, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-dark-card border border-dark-border-default rounded-lg hover:border-purple-500 hover:bg-dark-hover transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedBreakdownIdxs.includes(idx)}
                    onChange={() => handleToggleBreakdownIdx(idx)}
                    className="w-4 h-4 text-purple-400 border-dark-border-default rounded focus:ring-purple-500 mt-0.5 bg-dark-surface"
                  />
                  <div className="text-sm text-dark-secondary font-medium">{sub}</div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImportBreakdown}
                disabled={selectedBreakdownIdxs.length === 0}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 font-bold transition-all shadow-md shadow-purple-950/40"
              >
                一鍵匯入今日戰役
              </button>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="flex-1 px-4 py-2.5 bg-dark-hover text-dark-secondary border border-dark-border-default rounded-lg hover:bg-dark-card font-semibold transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 