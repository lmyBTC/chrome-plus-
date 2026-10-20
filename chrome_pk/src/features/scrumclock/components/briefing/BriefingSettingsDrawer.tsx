import React, { useState, useEffect } from 'react';
import { storage } from '../../../../core/chrome/storage';

export interface BriefingSettingsDrawerProps {
  isOpen: boolean;
  initialAppsScriptUrl: string;
  initialDistractionSites: string;
  initialGeminiApiKey: string;
  onSettingsSaved: (settings: {
    appsScriptUrl: string;
    distractionSites: string;
    geminiApiKey: string;
  }) => void;
}

export const BriefingSettingsDrawer: React.FC<BriefingSettingsDrawerProps> = ({
  isOpen,
  initialAppsScriptUrl,
  initialDistractionSites,
  initialGeminiApiKey,
  onSettingsSaved
}) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState(initialAppsScriptUrl);
  const [distractionSites, setDistractionSites] = useState(initialDistractionSites);
  const [geminiApiKey, setGeminiApiKey] = useState(initialGeminiApiKey);

  useEffect(() => {
    setAppsScriptUrl(initialAppsScriptUrl);
  }, [initialAppsScriptUrl]);

  useEffect(() => {
    setDistractionSites(initialDistractionSites);
  }, [initialDistractionSites]);

  useEffect(() => {
    setGeminiApiKey(initialGeminiApiKey);
  }, [initialGeminiApiKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      const userSettings = await storage.getUserSettings();
      userSettings.appsScriptUrl = appsScriptUrl;
      userSettings.distractionSites = distractionSites.split('\n').map(s => s.trim()).filter(Boolean);
      userSettings.geminiApiKey = geminiApiKey;
      await storage.saveUserSettings(userSettings);
      alert('設定已儲存！');
      onSettingsSaved({ appsScriptUrl, distractionSites, geminiApiKey });
    } catch (error) {
      console.error('Save settings failed', error);
      alert('儲存失敗');
    }
  };

  return (
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
          onClick={handleSave}
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
          onClick={handleSave}
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
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 transition-colors font-semibold"
        >
          儲存
        </button>
      </div>
    </div>
  );
};
