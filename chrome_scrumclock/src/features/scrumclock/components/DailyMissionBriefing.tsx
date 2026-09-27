import React, { useState, useEffect } from 'react';
import { WeeklyMission, CoreBattle, CalendarEvent } from '../../../types';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { BriefingMissionSelector } from './briefing/BriefingMissionSelector';
import { BriefingCalendarSchedule } from './briefing/BriefingCalendarSchedule';
import { BriefingSettingsDrawer } from './briefing/BriefingSettingsDrawer';

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
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

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
        
        <BriefingSettingsDrawer
          isOpen={isSettingOpen}
          initialAppsScriptUrl={appsScriptUrl}
          initialDistractionSites={distractionSites}
          initialGeminiApiKey={geminiApiKey}
          onSettingsSaved={(newSettings) => {
            setAppsScriptUrl(newSettings.appsScriptUrl);
            setDistractionSites(newSettings.distractionSites);
            setGeminiApiKey(newSettings.geminiApiKey);
          }}
        />
      </div>

      <BriefingCalendarSchedule events={calendarEvents} />

      <BriefingMissionSelector
        weeklyMissions={weeklyMissions}
        selectedMissions={selectedMissions}
        timeSlots={timeSlots}
        geminiApiKey={geminiApiKey}
        onWeeklyMissionsChange={setWeeklyMissions}
        onSelectedMissionsChange={setSelectedMissions}
        onTimeSlotsChange={setTimeSlots}
        onReloadNeeded={loadData}
      />

      <div className="text-center">
        <button
          onClick={handleSubmit}
          disabled={selectedMissions.length === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
        >
          開始今日衝刺
        </button>
      </div>

    </div>
  );
}; 