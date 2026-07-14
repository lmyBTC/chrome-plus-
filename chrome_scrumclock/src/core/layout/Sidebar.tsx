import React from 'react';

export type ToolView = 'scrumclock' | 'projects' | 'bookmarks' | 'analytics' | 'settings';

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
    { id: 'settings', label: '全域設定', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-gray-300 min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
          <span>🛠️</span> Swiss Knife
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === item.id 
                ? 'bg-gray-800 text-white font-medium shadow-sm' 
                : 'hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-800 text-sm text-gray-500">
        v1.0.0 Alpha
      </div>
    </aside>
  );
};
