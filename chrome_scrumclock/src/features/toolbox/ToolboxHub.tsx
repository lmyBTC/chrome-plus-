import React, { useState } from 'react';
import { ToolboxToolId, ToolboxToolInfo } from './types';
import { ImageScraper } from './tools/image-scraper';
import { ActivityMonitor } from './tools/activity-monitor';
import { SubtitleCollector } from './tools/subtitle-collector';

const AVAILABLE_TOOLS: ToolboxToolInfo[] = [
  {
    id: 'image-scraper',
    name: '網頁圖片爬取器',
    shortName: '圖片爬取',
    description: '抓取任意網頁（如 Flickr 相簿）或分頁圖片，支援篩選與批量下載',
    icon: '🖼️',
    badge: '熱門'
  },
  {
    id: 'activity-monitor',
    name: '瀏覽行為監控器',
    shortName: '行為監控',
    description: '實時審查網頁敏感權限（鏡頭、定位、剪貼簿）與 API 存取風險',
    icon: '🛡️',
    badge: '安全'
  },
  {
    id: 'subtitle-collector',
    name: '影片字幕收集器',
    shortName: '字幕收集',
    description: '檢視並管理跨插件收集的影音字幕與筆記，支援時間戳跳轉與任務轉化',
    icon: '🎬',
    badge: '影音'
  }
];

export interface ToolboxHubProps {
  isSidebar?: boolean;
}

export const ToolboxHub: React.FC<ToolboxHubProps> = ({ isSidebar = false }) => {
  const [activeTool, setActiveTool] = useState<ToolboxToolId>('image-scraper');

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg text-dark-primary overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
      {/* 頂部 Header */}
      <div className={`border-b border-dark-border-subtle bg-dark-surface sticky top-0 z-10 ${isSidebar ? 'px-3.5 py-2.5' : 'px-8 py-5'}`}>
        {!isSidebar ? (
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
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">🧰</span>
              <span className="text-xs font-bold text-dark-primary tracking-wide">實用工具箱</span>
            </div>
            <span className="text-[10px] text-dark-muted bg-dark-hover px-2 py-0.5 rounded-md border border-dark-border-subtle">
              {AVAILABLE_TOOLS.length} 項工具
            </span>
          </div>
        )}

        {/* 工具分類切換 Tabs */}
        <div className={`mt-2.5 ${isSidebar ? 'grid grid-cols-3 gap-1.5' : 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin'}`}>
          {AVAILABLE_TOOLS.map((tool) => {
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={tool.name}
                className={`flex items-center justify-center space-x-1.5 rounded-lg font-medium transition-all ${
                  isSidebar
                    ? 'px-2 py-1.5 text-xs'
                    : 'px-4 py-2 text-sm'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-dark-card text-dark-secondary hover:bg-dark-hover hover:text-dark-primary border border-dark-border-subtle/60'
                }`}
              >
                <span className={isSidebar ? 'text-xs' : 'text-sm'}>{tool.icon}</span>
                <span className="truncate">{isSidebar ? tool.shortName : tool.name}</span>
                {!isSidebar && tool.badge && (
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
      <div className={`flex-1 ${isSidebar ? 'p-3 w-full' : 'p-8 max-w-7xl w-full mx-auto'}`}>
        {activeTool === 'image-scraper' && <ImageScraper isSidebar={isSidebar} />}
        {activeTool === 'activity-monitor' && <ActivityMonitor isSidebar={isSidebar} />}
        {activeTool === 'subtitle-collector' && <SubtitleCollector isSidebar={isSidebar} />}
      </div>
    </div>
  );
};
