import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../../index.css';

const PopupApp: React.FC = () => {
  const [statusText, setStatusText] = useState('載入中...');
  const [completedSprints, setCompletedSprints] = useState(0);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await chrome.storage.local.get(['userSettings', 'dailyLogs']);
      const dailyLogs = result.dailyLogs || {};
      const today = new Date().toISOString().split('T')[0];
      const todayLog = dailyLogs[today];

      if (!todayLog || !todayLog.coreBattles || todayLog.coreBattles.length === 0) {
        setStatusText('今日尚未開始規劃 ☕');
      } else if (todayLog.review) {
        setStatusText('今日循環已完成 🎉');
      } else if (todayLog.sprintLogs && todayLog.sprintLogs.length > 0) {
        setCompletedSprints(todayLog.sprintLogs.length);
        setStatusText(`進行中 (已完成 ${todayLog.sprintLogs.length} 個衝刺) 🚀`);
      } else {
        setStatusText('已規劃，等待開始衝刺 ⏱️');
      }
    } catch (error) {
      setStatusText('載入狀態失敗 ❌');
      console.error('載入狀態失敗:', error);
    }
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
    window.close();
  };

  return (
    <div className="w-full bg-dark-card border border-dark-border-subtle p-5 font-sans rounded-lg">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-border-subtle">
        <span className="text-xl">🕰️</span>
        <h2 className="text-lg font-bold text-dark-primary tracking-wide">Power Kit</h2>
      </div>

      <div className="bg-dark-surface border border-dark-border-default rounded-xl p-4 mb-4 text-center">
        <p className="text-xs text-dark-muted mb-1 font-semibold tracking-wider uppercase">今日狀態</p>
        <p className="text-sm font-bold text-dark-primary leading-relaxed">{statusText}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleOpenDashboard}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-950/40 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>🖥️</span> 打開儀表板
        </button>

        <button
          onClick={handleOpenOptions}
          className="w-full py-2.5 px-4 bg-dark-surface hover:bg-dark-hover text-dark-primary border border-dark-border-default font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
        >
          <span>⚙️</span> 全域系統設定
        </button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
