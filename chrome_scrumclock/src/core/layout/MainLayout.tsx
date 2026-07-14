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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView={currentView} onViewChange={onViewChange} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* 可選的頂部 Header 區域，目前留空或作為標題使用 */}
        <header className="bg-white shadow-sm border-b px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {currentView === 'scrumclock' && '🍅 敏捷番茄鐘'}
            {currentView === 'projects' && '📋 專案管理 (Demo)'}
            {currentView === 'bookmarks' && '🚪 辦公室傳送門'}
            {currentView === 'analytics' && '📊 數據統計'}
            {currentView === 'settings' && '⚙️ 全域設定'}
          </h2>
          
          <button
            onClick={onToggleAISidebar}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-95 ${
              isAISidebarOpen
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-white border text-purple-600 hover:bg-purple-50 hover:border-purple-300'
            }`}
            title="開啟/關閉 AI 協作側邊欄 (快捷鍵 Ctrl+Shift+K)"
          >
            <span>🤖</span>
            <span>{isAISidebarOpen ? '收合 AI 助理' : 'AI 寫作助理'}</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
