import React from 'react';

export type ToolView = 'scrumclock' | 'projects' | 'bookmarks' | 'analytics' | 'settings' | 'docs' | 'gemini';

interface SidebarProps {
  currentView: ToolView;
  onViewChange: (view: ToolView) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems: { id: ToolView; label: string; icon: string }[] = [
    { id: 'scrumclock', label: '敏捷番茄鐘', icon: '🍅' },
    { id: 'projects', label: '專案管理 (Demo)', icon: '📋' },
    { id: 'bookmarks', label: '辦公室傳送門', icon: '🚪' },
    { id: 'analytics', label: '數據統計', icon: '📊' },
    { id: 'gemini', label: 'Gemini 匯出器 🤖', icon: '🤖' },
    { id: 'settings', label: '全域設定', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-dark-surface text-dark-secondary min-h-screen flex flex-col border-r border-dark-border-subtle">
      <div className="p-6">
        <h1 className="text-xl font-bold text-dark-primary tracking-wider flex items-center gap-2">
          <span>🛠️</span> PK+
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm ${
              currentView === item.id 
                ? 'bg-dark-card text-dark-primary font-semibold shadow-md shadow-slate-950/20 border border-dark-border-subtle/50' 
                : 'hover:bg-dark-hover hover:text-dark-primary'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 獨立說明書入口，位於下方 */}
      <div className="px-4 py-3 border-t border-dark-border-subtle">
        <button
          onClick={() => onViewChange('docs')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm ${
            currentView === 'docs'
              ? 'bg-dark-card text-dark-primary font-semibold shadow-md shadow-slate-950/20 border border-dark-border-subtle/50' 
              : 'text-dark-secondary hover:bg-dark-hover hover:text-dark-primary'
          }`}
        >
          <span className="text-xl">📖</span>
          <span>安裝與說明書</span>
        </button>
      </div>

      <div className="p-6 border-t border-dark-border-subtle text-xs text-dark-muted">
        v1.0.0 Alpha
      </div>
    </aside>
  );
};
