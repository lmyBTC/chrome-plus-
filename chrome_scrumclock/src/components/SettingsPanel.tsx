import React, { useState, useEffect } from 'react';
import { storage } from '../core/chrome/storage';
import { syncService } from '../core/chrome/syncService';
import { UserSettings } from '../types';

export const SettingsPanel: React.FC = () => {
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [distractionSites, setDistractionSites] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('載入中...');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await storage.getUserSettings();
      setAppsScriptUrl(settings.appsScriptUrl || '');
      setGeminiApiKey(settings.geminiApiKey || '');
      setDistractionSites((settings.distractionSites || []).join('\n'));
      
      const time = await syncService.getLastSyncTime();
      setLastSyncTime(time);
    } catch (e) {
      console.error('載入設定失敗:', e);
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
      const settings = await storage.getUserSettings();
      const updatedSettings: UserSettings = {
        ...settings,
        appsScriptUrl: appsScriptUrl.trim(),
        geminiApiKey: geminiApiKey.trim(),
        distractionSites: distractionSites
          .split('\n')
          .map(s => s.trim())
          .filter(s => s)
      };

      await storage.saveUserSettings(updatedSettings);
      setMessage({ type: 'success', text: '🎉 設定儲存成功！' });
    } catch (e) {
      console.error('儲存設定失敗:', e);
      setMessage({ type: 'error', text: '儲存失敗，請重試。' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <span className="text-3xl">⚙️</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">全域系統設定</h1>
          <p className="text-sm text-gray-500">配置您的個人效率瑞士刀，包含同步、AI 與專注防禦模組。</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold transition-all ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gemini API 設定 */}
        <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-5">
          <label className="block text-sm font-bold text-purple-900 mb-1 flex items-center gap-1.5">
            <span>🤖</span> Gemini API Key (自備金鑰)
          </label>
          <p className="text-xs text-purple-700/80 mb-3">
            本插件為 100% 本地運行，不儲存您的金鑰。請至 <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-purple-900">Google AI Studio</a> 免費申請 API Key，以啟用 AI 寫作增強與側邊欄對話。
          </p>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AI Studio 申請的 API Key (AI 助理功能必備)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm shadow-sm"
          />
        </div>

        {/* Google Apps Script 設定 */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
          <label className="block text-sm font-bold text-blue-900 mb-1 flex items-center gap-1.5">
            <span>🔗</span> Google Apps Script URL (雲端同步)
          </label>
          <p className="text-xs text-blue-700/80 mb-3">
            貼上您部署好的 GAS Web App 連結。這將用於雙向同步您的 Google Tasks 與 Google Sheets 計畫日誌，實現完全的數據隱私主權。
          </p>
          <input
            type="url"
            value={appsScriptUrl}
            onChange={(e) => setAppsScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
          />

          {/* Profile 雲端同步操作區 (GAS Cloud Sync) */}
          {appsScriptUrl.trim() && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-xl p-5 mt-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-100">
                <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <span>🔄</span> 跨瀏覽器使用者資料同步 (Profile Sync)
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  最後同步: {lastSyncTime}
                </span>
              </div>
              <p className="text-xs text-blue-800/80 mb-4 leading-relaxed">
                如果您在多個 Chrome 使用者 (Profile) 中使用 ScrumClock，可在儲存設定後點擊以下按鈕同步。
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handlePullSync}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? '同步中...' : '📥 拉取並智慧合併'}
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handlePushSync}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? '同步中...' : '📤 推送本地到雲端'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Focus Blocker 設定 */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
            <span>🚫</span> 專注模式阻擋名單
          </label>
          <p className="text-xs text-gray-500 mb-3">
            當開啟「硬核專注模式」時，插件將在瀏覽器底層攔截以下網站（每行輸入一個網址，例如 facebook.com）。
          </p>
          <textarea
            value={distractionSites}
            onChange={(e) => setDistractionSites(e.target.value)}
            placeholder="例如:&#10;youtube.com&#10;facebook.com&#10;twitter.com"
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm shadow-sm"
          />
        </div>

        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-xl font-bold shadow-lg shadow-primary-100 transition-all flex items-center gap-2"
          >
            {isSaving ? '正在儲存...' : '儲存設定'}
          </button>
        </div>
      </form>
    </div>
  );
};
