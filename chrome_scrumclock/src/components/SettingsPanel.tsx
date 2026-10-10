import React, { useState, useEffect } from 'react';
import { storage } from '../core/chrome/storage';
import { syncService } from '../core/chrome/syncService';
import { UserSettings, NorthStarGoal, WeeklyMission } from '../types';
import { DEFAULT_FINANCE_CLIPPER_ID } from '../features/finance-integration/financeClient';

// 確保 Chrome API 可用
declare const chrome: any;

interface SettingsPanelProps {
  onNavigateToDocs?: () => void;
}

type TabType = 'basic' | 'focus' | 'ai';

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onNavigateToDocs }) => {
  // Tabs state
  const [activeTab, setActiveTab] = useState<TabType>('basic');

  // Basic Settings States
  const [userName, setUserName] = useState('');
  const [pomodoroDuration, setPomodoroDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [endOfDayReviewTime, setEndOfDayReviewTime] = useState('21:00');
  const [northStarGoal, setNorthStarGoal] = useState('');
  const [weeklyMissions, setWeeklyMissions] = useState('');

  // Agile & GTD Feature Flags
  const [enableGtdCapture, setEnableGtdCapture] = useState(true);
  const [enableWipLimit, setEnableWipLimit] = useState(true);
  const [maxWipLimit, setMaxWipLimit] = useState(3);

  // AI & Sync States
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [enableGoogleSync, setEnableGoogleSync] = useState(true);
  const [googleSyncLocalHubFallback, setGoogleSyncLocalHubFallback] = useState(true);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('載入中...');
  const [enableWebhook, setEnableWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecretToken, setWebhookSecretToken] = useState('');
  const [financeClipperExtensionId, setFinanceClipperExtensionId] = useState('');

  // Focus Blocker State
  const [distractionSites, setDistractionSites] = useState('');

  // Status States
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await storage.getAllData();
      
      // Basic Settings
      setUserName(data.userSettings.userName || '');
      setPomodoroDuration(data.userSettings.pomodoroDuration || 25);
      setBreakDuration(data.userSettings.breakDuration || 5);
      setEndOfDayReviewTime(data.userSettings.endOfDayReviewTime || '21:00');
      
      // Agile & GTD Flags
      setEnableGtdCapture(data.userSettings.enableGtdCapture !== false);
      setEnableWipLimit(data.userSettings.enableWipLimit !== false);
      setMaxWipLimit(typeof data.userSettings.maxWipLimit === 'number' ? data.userSettings.maxWipLimit : 3);

      // Goals & Missions
      setNorthStarGoal(data.northStarGoal.text || '');
      setWeeklyMissions(data.weeklyMissions.map((m: WeeklyMission) => m.text).join('\n'));
      
      // Focus Sites
      setDistractionSites((data.userSettings.distractionSites || []).join('\n'));
      
      // AI & Cloud Sync
      setAppsScriptUrl(data.userSettings.appsScriptUrl || '');
      setSpreadsheetUrl(data.userSettings.spreadsheetUrl || '');
      setEnableGoogleSync(data.userSettings.enableGoogleSync !== false);
      setGoogleSyncLocalHubFallback(data.userSettings.googleSyncLocalHubFallback !== false);
      setGeminiApiKey(data.userSettings.geminiApiKey || '');
      setEnableWebhook(data.userSettings.enableWebhook || false);
      setWebhookUrl(data.userSettings.webhookUrl || '');
      setWebhookSecretToken(data.userSettings.webhookSecretToken || '');
      setFinanceClipperExtensionId(data.userSettings.financeClipperExtensionId || '');
      
      const time = await syncService.getLastSyncTime();
      setLastSyncTime(time);
    } catch (e) {
      console.error('載入設定失敗:', e);
      setMessage({ type: 'error', text: '❌ 載入設定失敗，請確認 LocalStorage 權限。' });
    }
  };

  const handlePullSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await syncService.pullAndMergeFromCloud();
      if (res.success) {
        setLastSyncTime(res.lastSyncTime || '剛剛');
        setMessage({ type: 'success', text: '🎉 資料拉取並智慧合併成功！已更新本地狀態。' });
        // 重新載入設定以顯示雲端同步過來的欄位
        loadSettings();
      } else {
        setMessage({ type: 'error', text: `❌ 同步失敗: ${res.message}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ 同步發生錯誤: ${err.message || err}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await syncService.pushToCloud();
      if (res.success) {
        setLastSyncTime(res.lastSyncTime || '剛剛');
        setMessage({ type: 'success', text: '🎉 本地資料已成功推送備份至雲端硬碟！' });
      } else {
        setMessage({ type: 'error', text: `❌ 同步失敗: ${res.message}` });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `❌ 同步發生錯誤: ${err.message || err}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // 1. 解析並建立週任務結構
      const currentMissions = await storage.getWeeklyMissions();
      const missionTexts = weeklyMissions.trim()
        ? weeklyMissions.split('\n').filter(text => text.trim())
        : [];
      
      const newMissions = missionTexts.map((text, index) => {
        // 儘量保留原本任務的 completed 狀態
        const existing = currentMissions.find((m: WeeklyMission) => m.text === text.trim());
        return {
          id: existing?.id || `mission-${Date.now()}-${index}`,
          text: text.trim(),
          isCompleted: existing?.isCompleted || false
        };
      });

      // 2. 解析干擾網站
      const blockSites = distractionSites.trim()
        ? distractionSites.split('\n').filter(site => site.trim())
        : [];

      // 3. 取得目前設定並合併新設定
      const settings = await storage.getUserSettings();
      const updatedSettings: UserSettings = {
        ...settings,
        userName: userName.trim(),
        pomodoroDuration: Number(pomodoroDuration) || 25,
        breakDuration: Number(breakDuration) || 5,
        endOfDayReviewTime: endOfDayReviewTime || '21:00',
        appsScriptUrl: appsScriptUrl.trim(),
        spreadsheetUrl: spreadsheetUrl.trim(),
        enableGoogleSync: enableGoogleSync,
        googleSyncLocalHubFallback: googleSyncLocalHubFallback,
        geminiApiKey: geminiApiKey.trim(),
        distractionSites: blockSites,
        enableWebhook: enableWebhook,
        webhookUrl: webhookUrl.trim(),
        webhookSecretToken: webhookSecretToken.trim(),
        financeClipperExtensionId: financeClipperExtensionId.trim(),
        enableGtdCapture: enableGtdCapture,
        enableWipLimit: enableWipLimit,
        maxWipLimit: Number(maxWipLimit) || 3
      };

      const updatedGoal: NorthStarGoal = {
        id: 'north-star-goal',
        text: northStarGoal.trim()
      };

      // 4. 寫入 Storage
      await storage.saveUserSettings(updatedSettings);
      await storage.saveNorthStarGoal(updatedGoal);
      await storage.saveWeeklyMissions(newMissions);

      // 同步更新辦公室傳送門的 Google Sheets 書籤網址
      if (spreadsheetUrl.trim()) {
        const bookmarkRes = await chrome.storage.local.get('bookmarks');
        if (bookmarkRes && Array.isArray(bookmarkRes.bookmarks)) {
          const updatedBookmarks = bookmarkRes.bookmarks.map((b: any) => {
            if (b.id === 'google-sheets' || b.url.includes('sheets.google.com') || b.title.toLowerCase().includes('google sheets')) {
              return { ...b, url: spreadsheetUrl.trim() };
            }
            return b;
          });
          await chrome.storage.local.set({ bookmarks: updatedBookmarks });
        }
      }

      // 5. 重新配置日終回顧鬧鐘
      const [hours, minutes] = updatedSettings.endOfDayReviewTime.split(':');
      const reviewTime = new Date();
      reviewTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (reviewTime <= new Date()) {
        reviewTime.setDate(reviewTime.getDate() + 1);
      }

      await chrome.alarms.clear('dailyReview');
      await chrome.alarms.create('dailyReview', {
        when: reviewTime.getTime(),
        periodInMinutes: 24 * 60
      });

      setMessage({ type: 'success', text: '🎉 所有設定已成功儲存與排程！' });
    } catch (e) {
      console.error('儲存設定失敗:', e);
      setMessage({ type: 'error', text: '❌ 儲存設定失敗，請確認權限設定。' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-dark-card rounded-2xl shadow-xl border border-dark-border-subtle p-8 shadow-slate-950/50">
      {/* 標頭 */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-dark-border-subtle">
        <span className="text-3xl">⚙️</span>
        <div>
          <h1 className="text-2xl font-bold text-dark-primary">全域系統設定</h1>
          <p className="text-sm text-dark-muted">配置您的個人效率瑞士刀，包含同步、AI 與專注防禦模組。</p>
        </div>
      </div>

      {/* 回饋訊息 */}
      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold transition-all ${
          message.type === 'success' 
            ? 'bg-green-950/30 border border-green-800/60 text-green-400' 
            : 'bg-red-950/30 border border-red-800/60 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs 導航 */}
      <div className="flex border-b border-dark-border-subtle mb-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'basic'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          ⏱️ 效率核心與目標
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('focus')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'focus'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🚫 專注阻擋
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'ai'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-dark-muted hover:text-dark-primary'
          }`}
        >
          🤖 AI 與雲端同步
        </button>
      </div>

      {/* 表單內容 */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Tab 1: Basic & Goals */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-dark-primary mb-1.5">使用者名稱</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="請輸入您的名字"
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-dark-primary mb-1.5">日終回顧時間</label>
                <input
                  type="time"
                  value={endOfDayReviewTime}
                  onChange={(e) => setEndOfDayReviewTime(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-dark-primary mb-1.5">番茄鐘時長 (分鐘)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={pomodoroDuration}
                  onChange={(e) => setPomodoroDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-dark-primary mb-1.5">休息時長 (分鐘)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
                />
              </div>
            </div>

            {/* ScrumClock 敏捷與 GTD 模組控制 */}
            <div className="bg-dark-surface/70 border border-dark-border-default rounded-xl p-4.5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-dark-border-subtle">
                <span className="text-sm font-bold text-dark-primary flex items-center gap-1.5">
                  <span>⚡</span> ScrumClock 敏捷與 GTD 模組控制
                </span>
                <span className="text-[11px] text-dark-muted font-mono">本地 Feature Flags</span>
              </div>

              {/* GTD 快捷捕捉開關 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-sm font-semibold text-dark-primary block">📥 GTD 全域快速捕捉 (Alt+Q / 右鍵)</label>
                  <p className="text-xs text-dark-muted mt-0.5">
                    啟用後，可隨時按下快捷鍵 Alt+Q 或在任何網頁點擊右鍵選單，秒級捕捉文字或網頁標題至 Inbox。
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableGtdCapture}
                    onChange={(e) => setEnableGtdCapture(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* WIP 限制開關與上限設定 */}
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-dark-border-subtle/50">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-dark-primary block">🛡️ 看板在製品限制 (WIP Limit)</label>
                  <p className="text-xs text-dark-muted mt-0.5">
                    對敏捷看板「進行中 (In Progress)」欄位卡片數量進行上限保護，防止多工分心。
                  </p>
                  {enableWipLimit && (
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-dark-secondary">
                      <span>上限卡片數量：</span>
                      <select
                        value={maxWipLimit}
                        onChange={(e) => setMaxWipLimit(Number(e.target.value))}
                        className="px-2.5 py-1 bg-dark-card border border-dark-border-default rounded-lg text-xs text-dark-primary outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                          <option key={num} value={num}>
                            {num} 個任務
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={enableWipLimit}
                    onChange={(e) => setEnableWipLimit(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-card peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-dark-primary mb-1.5">🎯 你的北極星目標 (長遠願景)</label>
              <textarea
                value={northStarGoal}
                onChange={(e) => setNorthStarGoal(e.target.value)}
                placeholder="例如：在一年內開發出個人 SaaS 產品並開始盈利"
                rows={2}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-dark-primary mb-1.5">📝 本週關鍵任務 (每行一個)</label>
              <textarea
                value={weeklyMissions}
                onChange={(e) => setWeeklyMissions(e.target.value)}
                placeholder="例如:&#10;完成新介面重構&#10;撰寫測試案例&#10;發布新版本"
                rows={4}
                className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Focus Blocker */}
        {activeTab === 'focus' && (
          <div className="space-y-4">
            <div className="bg-dark-surface border border-dark-border-default rounded-xl p-5">
              <label className="block text-sm font-bold text-dark-primary mb-1 flex items-center gap-1.5">
                <span>🚫</span> 專注模式阻擋名單
              </label>
              <p className="text-xs text-dark-muted mb-3">
                當開啟「硬核專注模式」時，插件將在瀏覽器底層攔截以下網站（每行輸入一個網址，例如 facebook.com）。
              </p>
              <textarea
                value={distractionSites}
                onChange={(e) => setDistractionSites(e.target.value)}
                placeholder="例如:&#10;youtube.com&#10;facebook.com&#10;twitter.com&#10;instagram.com"
                rows={6}
                className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
              />
            </div>
          </div>
        )}

        {/* Tab 3: AI & Sync */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Gemini API 設定 */}
            <div className="bg-purple-950/20 border border-purple-900/50 rounded-xl p-5">
              <label className="block text-sm font-bold text-purple-300 mb-1 flex items-center gap-1.5">
                <span>🤖</span> Gemini API Key (自備金鑰)
              </label>
              <p className="text-xs text-purple-300/80 mb-3">
                本插件為 100% 本地運行，不儲存您的金鑰。請至 <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-purple-400 hover:text-purple-300">Google AI Studio</a> 免費申請 API Key，以啟用 AI 寫作增強與側邊欄對話。
              </p>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AI Studio 申請的 API Key (AI 助理功能必備)"
                className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-dark-primary font-mono text-sm shadow-sm"
              />
            </div>

            {/* Google Apps Script 設定 */}
            <div className="bg-blue-950/20 border border-blue-900/50 rounded-xl p-5">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-blue-300 flex items-center gap-1.5">
                  <span>🔗</span> Google Apps Script URL (雲端同步)
                </label>
                {onNavigateToDocs && (
                  <button
                    onClick={onNavigateToDocs}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
                    type="button"
                  >
                    📖 查看安裝與說明書
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-300/80 mb-3">
                貼上您部署好的 GAS Web App 連結。這將用於雙向同步您的 Google Tasks 與 Google Sheets 計畫日誌，實現完全的數據隱私主權。
              </p>
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
              />

              {/* Google Sheets 專案試算表網址 */}
              <div className="mt-4">
                <label className="block text-sm font-bold text-blue-300 flex items-center gap-1.5 mb-1">
                  <span>📊</span> Google Sheets 試算表網址 (選填 / 傳送門直達)
                </label>
                <p className="text-xs text-blue-300/80 mb-2">
                  填寫此網址後，「辦公室傳送門」的 Google Sheets 捷徑將會直接開啟您的專案計畫表。
                </p>
                <input
                  type="url"
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-dark-primary text-sm shadow-sm"
                />
              </div>

              {/* Google 生態雙軌同步細部設定開關 */}
              <div className="mt-4 pt-4 border-t border-blue-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-blue-200 block">📊 日終戰報與看板自動同步</label>
                    <p className="text-xs text-blue-300/70">
                      日終回顧送出時自動沉澱戰報至 Google Sheets，看板焦點切換時同步 Google Tasks。
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={enableGoogleSync}
                      onChange={(e) => setEnableGoogleSync(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-dark-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-semibold text-blue-200 block">🛡️ 本機 Local Hub 離線重試備援</label>
                    <p className="text-xs text-blue-300/70">
                      當網路斷線或 GAS Webhook 請求逾時 (10s) 時，自動轉發至本機 Dispatcher (Port 8765) 暫存重試。
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={googleSyncLocalHubFallback}
                      onChange={(e) => setGoogleSyncLocalHubFallback(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-dark-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* GAS Cloud Sync Actions */}
              {appsScriptUrl.trim() && (
                <div className="bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border border-blue-900/40 rounded-xl p-5 mt-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-900/40">
                    <span className="text-sm font-bold text-blue-300 flex items-center gap-1.5">
                      <span>🔄</span> 跨瀏覽器使用者資料同步 (Profile Sync)
                    </span>
                    <span className="text-xs text-dark-muted font-mono">
                      最後同步: {lastSyncTime}
                    </span>
                  </div>
                  <p className="text-xs text-blue-300/80 mb-4 leading-relaxed">
                    如果您在多個 Chrome 使用者 (Profile) 中使用 Power Kit，可在儲存設定後點擊以下按鈕同步。
                  </p>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handlePullSync}
                      className="flex-1 px-4 py-2.5 bg-dark-card hover:bg-dark-hover text-blue-400 border border-blue-900/60 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSyncing ? '同步中...' : '📥 拉取並智慧合併'}
                    </button>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handlePushSync}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSyncing ? '同步中...' : '📤 推送本地到雲端'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 外部 Webhook 自動化同步 */}
            <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>🔌</span> 外部 Webhook 自動化同步
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableWebhook}
                    onChange={(e) => setEnableWebhook(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-dark-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-indigo-300/80 mb-3 leading-relaxed">
                啟用後，每當建立/完成/刪除每日任務，或更新專案進度時，系統會自動在背景發送 POST 請求至指定的 Webhook 接收端（如 n8n, Make, GAS），實現即時的跨系統數據同步。
              </p>
              {enableWebhook && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-dark-muted">Webhook 接收網址 (URL / GAS Web App)</label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      required={enableWebhook}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-dark-primary text-sm shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-dark-muted">安全權杖 / 金鑰 (Secret Token)</label>
                      <span className="text-[11px] text-dark-muted">(選填，若 GAS 有設定則需匹配)</span>
                    </div>
                    <input
                      type="password"
                      value={webhookSecretToken}
                      onChange={(e) => setWebhookSecretToken(e.target.value)}
                      placeholder="例如: my_secret_token_123"
                      className="w-full px-4 py-2 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-dark-primary text-sm font-mono shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Finance Research Clipper 聯動設定 */}
            <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-5">
              <label className="block text-sm font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                <span>📈</span> Finance Research Clipper 跨插件連線
              </label>
              <p className="text-xs text-emerald-300/80 mb-3 leading-relaxed">
                填寫 Finance Research Clipper 擴充功能的 Extension ID（於 <code>chrome://extensions</code> 檢視），即可在 New Tab 即時同步自選股監控、一鍵開啟大螢幕儀表板並觸發背景爬蟲。
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={financeClipperExtensionId}
                  onChange={(e) => setFinanceClipperExtensionId(e.target.value)}
                  placeholder={`預設: ${DEFAULT_FINANCE_CLIPPER_ID} (留空自動套用預設值)`}
                  className="flex-1 px-4 py-2.5 bg-dark-surface border border-dark-border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-dark-primary font-mono text-sm shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setFinanceClipperExtensionId(DEFAULT_FINANCE_CLIPPER_ID)}
                  className="px-3 py-2 bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/50 text-emerald-300 text-xs rounded-xl font-medium transition-colors shrink-0"
                  title="帶入合約規範之預設 ID"
                >
                  帶入預設 ID
                </button>
              </div>
              <p className="text-[11px] text-emerald-400/80 mt-1.5 font-mono">
                恆定 ID: {DEFAULT_FINANCE_CLIPPER_ID}
              </p>
            </div>
          </div>
        )}

        {/* 底部儲存按鈕 */}
        <div className="pt-4 border-t border-dark-border-subtle flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-hover disabled:text-dark-muted text-white rounded-xl font-bold shadow-lg shadow-blue-950/50 transition-all flex items-center gap-2"
          >
            {isSaving ? '正在儲存...' : '儲存設定'}
          </button>
        </div>
      </form>
    </div>
  );
};
