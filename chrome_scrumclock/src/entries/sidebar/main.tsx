import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../../index.css';
import { useTimerSync } from './hooks/useTimerSync';
import { ToolboxHub } from '../../features/toolbox';
import { AIAssistantView } from './components/AIAssistantView';

// 格式化秒數為 mm:ss
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const SidebarApp: React.FC = () => {
  // 預設為實用工具箱，徹底避免啟動自動載入 AI
  const [sidebarTab, setSidebarTab] = useState<'toolbox' | 'assistant'>('toolbox');

  // 全域番茄鐘計時狀態同步（供頂部狀態條使用）
  const { activeTimer, timeLeft } = useTimerSync(() => {});

  return (
    <div className="flex flex-col h-screen bg-[#0b0f19] text-slate-300 select-none">
      {/* 全域頂部導航欄 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <div>
            <h1 className="text-xs font-bold text-white tracking-wide">ScrumClock</h1>
            <p className="text-[10px] text-slate-400">側欄工作台</p>
          </div>
        </div>

        {/* 頂部快捷動作 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => chrome.tabs.create({ url: 'chrome://newtab' })}
            title="開啟新分頁儀表板"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-xs"
          >
            🖥️
          </button>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            title="系統設定"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all text-xs"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* 側邊欄頂部功能切換 Tabs */}
      <div className="flex items-center px-3 py-2 gap-2 bg-[#0a1024] border-b border-slate-800/80 sticky top-[49px] z-10">
        <button
          type="button"
          onClick={() => setSidebarTab('toolbox')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            sidebarTab === 'toolbox'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🧰</span>
          <span>實用工具箱</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarTab('assistant')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            sidebarTab === 'assistant'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <span>🤖</span>
          <span>PK+ 助理</span>
          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1 py-0.2 rounded font-normal border border-emerald-500/30">
            Nano
          </span>
        </button>
      </div>

      {/* 實時番茄鐘計時狀態條（全域可見） */}
      {activeTimer && activeTimer.state && activeTimer.state !== 'idle' && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
            activeTimer.state === 'running'
              ? 'bg-red-950/30 text-red-400 border-red-900/40'
              : activeTimer.state === 'paused'
              ? 'bg-yellow-950/30 text-yellow-500 border-yellow-900/40'
              : 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span>{activeTimer.state === 'break' ? '💡 休息中' : '🍅 專注衝刺中'}</span>
            <span className="opacity-80 font-normal truncate max-w-[140px]">
              {activeTimer.sprint?.missionId ? `任務: ${activeTimer.sprint.missionId.slice(0, 8)}` : '未命名任務'}
            </span>
          </div>
          <span className="font-mono text-sm tracking-wide font-bold">
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* 主工作內容區：條件渲染以達成按需延遲載入 (Lazy Loading) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {sidebarTab === 'toolbox' && <ToolboxHub isSidebar={true} />}

        {sidebarTab === 'assistant' && <AIAssistantView />}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidebarApp />
  </React.StrictMode>
);
