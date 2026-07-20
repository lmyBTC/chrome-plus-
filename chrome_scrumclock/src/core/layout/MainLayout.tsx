import React from 'react';
import { Sidebar, ToolView } from './Sidebar';

interface MainLayoutProps {
  currentView: ToolView;
  onViewChange: (view: ToolView) => void;
  isAISidebarOpen: boolean;
  onToggleAISidebar: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  currentView, 
  onViewChange, 
  isAISidebarOpen,
  onToggleAISidebar,
  children 
}) => {
  return (
    <div className="flex min-h-screen bg-dark-base">
      <Sidebar currentView={currentView} onViewChange={onViewChange} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 可選的頂部 Header 區域，目前留空或作為標題使用 */}
        <header className="bg-dark-card shadow-md border-b border-dark-border-subtle px-8 py-4 flex items-center justify-between shadow-slate-950/20">
          <h2 className="text-xl font-semibold text-dark-primary">
            {currentView === 'scrumclock' && '🍅 敏捷番茄鐘'}
            {currentView === 'projects' && '📋 專案管理 (Demo)'}
            {currentView === 'bookmarks' && '🚪 辦公室傳送門'}
            {currentView === 'analytics' && '📊 數據統計'}
            {currentView === 'settings' && '⚙️ 全域設定'}
            {currentView === 'docs' && '📖 安裝與說明書'}
          </h2>
          
          <button
            onClick={onToggleAISidebar}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-95 ${
              isAISidebarOpen
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'bg-dark-surface border border-dark-border-default text-purple-400 hover:bg-dark-hover'
            }`}
            title="開啟/關閉 AI 協作側邊欄 (快捷鍵 Ctrl+Shift+K)"
          >
            <span>🤖</span>
            <span>{isAISidebarOpen ? '收合 AI 助理' : 'AI 專案助理'}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-dark-base">
          {children}
        </div>
      </main>
    </div>
  );
};
