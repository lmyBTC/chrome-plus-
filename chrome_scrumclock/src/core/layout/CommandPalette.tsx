import React from 'react';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  useMatches,
  KBarResults,
  Action
} from 'kbar';

interface CommandPaletteProps {
  children: React.ReactNode;
  onNavigate: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ children, onNavigate }) => {
  const actions: Action[] = [
    {
      id: 'scrumclock',
      name: '切換至：敏捷番茄鐘',
      shortcut: ['s'],
      keywords: 'scrumclock pomodoro timer 番茄鐘',
      perform: () => onNavigate('scrumclock'),
    },
    {
      id: 'projects',
      name: '切換至：專案管理 (Demo)',
      shortcut: ['p'],
      keywords: 'projects pm tasks 專案 任務',
      perform: () => onNavigate('projects'),
    },
    {
      id: 'bookmarks',
      name: '切換至：辦公室傳送門',
      shortcut: ['b'],
      keywords: 'bookmarks hub links 傳送門 書籤',
      perform: () => onNavigate('bookmarks'),
    },
    {
      id: 'analytics',
      name: '切換至：數據統計',
      shortcut: ['a'],
      keywords: 'analytics stats data 統計 數據',
      perform: () => onNavigate('analytics'),
    },
    {
      id: 'toolbox',
      name: '切換至：實用工具箱',
      shortcut: ['t'],
      keywords: 'toolbox tools scraper images 工具箱 圖片 爬蟲 下載',
      perform: () => onNavigate('toolbox'),
    }
  ];

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <KBarAnimator className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <KBarSearch 
              className="w-full px-6 py-4 text-lg border-b border-gray-100 outline-none text-gray-800" 
              defaultPlaceholder="輸入指令 (如：scrumclock)..." 
            />
            <RenderResults />
          </KBarAnimator>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
};

function RenderResults() {
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div className="px-6 py-2 text-sm text-gray-500 font-semibold bg-gray-50 uppercase tracking-wider">
            {item}
          </div>
        ) : (
          <div
            className={`px-6 py-3 flex items-center justify-between cursor-pointer ${
              active ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span>{item.name}</span>
            </div>
            {item.shortcut?.length ? (
              <div
                aria-hidden
                className="flex gap-1"
              >
                {item.shortcut.map((sc) => (
                  <kbd
                    key={sc}
                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 font-mono"
                  >
                    {sc}
                  </kbd>
                ))}
              </div>
            ) : null}
          </div>
        )
      }
    />
  );
}
