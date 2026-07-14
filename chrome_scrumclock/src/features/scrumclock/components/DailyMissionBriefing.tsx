import React, { useState, useEffect } from 'react';
import { WeeklyMission, CoreBattle } from '../../../types';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';

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
      let subtasks = await sync.breakdownTask(mission.id);
      if (!subtasks || subtasks.length === 0) {
        // 本地降級模擬
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          每日任務簡報
        </h1>
        <p className="text-gray-600 mb-4">
          從你的週任務中選擇 2-3 個作為今日核心戰役
        </p>
        <button
          onClick={handleSyncFromSheets}
          disabled={isSyncing}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors text-sm"
        >
          {isSyncing ? '同步中...' : '🔄 從 Gemini (Sheet) 匯入最新計畫'}
        </button>
        <button
          onClick={handleImportFromGoogleTasks}
          disabled={isSyncing}
          className="ml-2 px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors text-sm"
        >
          {isSyncing ? '匯入中...' : '✅ 從 Google Tasks 匯入'}
        </button>
        <button
          onClick={() => setIsSettingOpen(!isSettingOpen)}
          className="ml-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
        >
          ⚙️ 設定
        </button>
        
        {isSettingOpen && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow border text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Apps Script URL (同步用)
            </label>
            <div className="flex mb-4">
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
              >
                儲存
              </button>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gemini API Key (自備 AI 助理金鑰)
            </label>
            <div className="flex mb-4">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="填入您的 Gemini API Key (可到 Google AI Studio 免費申請)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
              >
                儲存
              </button>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              專注模式阻擋黑名單 (每行一個網址)
            </label>
            <div className="flex">
              <textarea
                value={distractionSites}
                onChange={(e) => setDistractionSites(e.target.value)}
                placeholder="例如:&#10;youtube.com&#10;facebook.com"
                rows={3}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveUrl}
                className="px-4 py-2 bg-primary-600 text-white rounded-r-md hover:bg-primary-700 transition-colors"
              >
                儲存
              </button>
            </div>
          </div>
        )}
      </div>

      {calendarEvents.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">📅</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                注意：你今天有 {calendarEvents.length} 個既有行程
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {calendarEvents.map((event, idx) => (
                    <li key={idx}>
                      {new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(event.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}: {event.title}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">選擇今日核心戰役</h2>
        
        {/* 手動新增關鍵任務輸入框 */}
        <form onSubmit={handleCreateMission} className="flex mb-5 gap-2 border-b pb-4">
          <input
            type="text"
            placeholder="➕ 手動新增本週關鍵任務..."
            value={newMissionText}
            onChange={(e) => setNewMissionText(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap"
          >
            新增
          </button>
        </form>

        <div className="space-y-4">
          {weeklyMissions.map(mission => (
            <div key={mission.id} className="flex items-center space-x-4 p-4 border rounded-lg">
              <input
                type="checkbox"
                id={mission.id}
                checked={selectedMissions.includes(mission.id)}
                onChange={() => handleMissionToggle(mission.id)}
                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
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
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className={`cursor-pointer select-none hover:text-primary-600 transition-colors ${mission.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}
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
                      className="text-gray-400 hover:text-primary-600 p-0.5 text-xs"
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
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs whitespace-nowrap font-medium disabled:opacity-50"
                >
                  {breakingDownId === mission.id ? '拆解中...' : '🤖 拆解'}
                </button>
              )}
              {!mission.isCompleted && (
                <button
                  onClick={() => handleCompleteMission(mission.id)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs whitespace-nowrap font-medium"
                >
                  完成
                </button>
              )}
              {!mission.isCompleted && (
                <button
                  onClick={() => handleDeleteWeeklyMission(mission.id)}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs whitespace-nowrap font-medium transition-colors"
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
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          開始今日衝刺
        </button>
      </div>

      {/* AI 智能拆解 Modal */}
      {showBreakdownModal && targetWeeklyMission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 border border-gray-100 animate-fade-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                <span>🤖</span> AI 任務智能拆解
              </h3>
              <button 
                onClick={() => setShowBreakdownModal(false)}
                className="text-gray-400 hover:text-gray-600 font-semibold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-3">
              週任務標題：<span className="font-semibold text-gray-800">{targetWeeklyMission.text}</span>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              勾選您想要匯入為今日核心戰役的步驟。系統會自動計算並填入 committedTime 時段。
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-5 p-2 bg-gray-50 rounded-lg">
              {breakdownMissions.map((sub, idx) => (
                <label 
                  key={idx} 
                  className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedBreakdownIdxs.includes(idx)}
                    onChange={() => handleToggleBreakdownIdx(idx)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mt-0.5"
                  />
                  <div className="text-sm text-gray-800 font-medium">{sub}</div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImportBreakdown}
                disabled={selectedBreakdownIdxs.length === 0}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold transition-all"
              >
                一鍵匯入今日戰役
              </button>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-all"
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