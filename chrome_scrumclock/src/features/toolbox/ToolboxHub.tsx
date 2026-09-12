import React, { useState } from 'react';
import { ToolboxToolId, ToolboxToolInfo } from './types';
import { ImageScraper } from './tools/image-scraper';

const AVAILABLE_TOOLS: ToolboxToolInfo[] = [
  {
    id: 'image-scraper',
    name: '網頁圖片爬取器',
    description: '抓取任意網頁（如 Flickr 相簿）或分頁圖片，支援篩選與批量下載',
    icon: '🖼️',
    badge: '熱門'
  }
];

export const ToolboxHub: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolboxToolId>('image-scraper');

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg text-dark-primary overflow-y-auto">
      {/* 頂部 Header */}
      <div className="border-b border-dark-border-subtle bg-dark-surface px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🧰</span>
            <div>
              <h1 className="text-2xl font-bold tracking-wide text-dark-primary">實用工具箱</h1>
              <p className="text-xs text-dark-secondary mt-0.5">
                為開發者與日常生產力打造的高效專屬工具集合
              </p>
            </div>
          </div>
          
          <div className="text-xs text-dark-muted bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-subtle">
            已載入 {AVAILABLE_TOOLS.length} 個實用工具
          </div>
        </div>

        {/* 工具分類切換 Tabs */}
        <div className="flex items-center space-x-2 mt-6 overflow-x-auto pb-1 scrollbar-thin">
          {AVAILABLE_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex items-center space-x-2.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-dark-card text-dark-secondary hover:bg-dark-hover hover:text-dark-primary border border-dark-border-subtle/60'
                }`}
              >
                <span>{tool.icon}</span>
                <span>{tool.name}</span>
                {tool.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                      isActive ? 'bg-blue-800 text-blue-100' : 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 主工作區域 */}
      <div className="flex-1 p-8 max-w-7xl w-full mx-auto">
        {activeTool === 'image-scraper' && <ImageScraper />}
      </div>
    </div>
  );
};
