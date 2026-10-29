import React, { useState } from 'react';
import { ToolboxToolId } from './types';
import { TOOL_REGISTRY, getToolManifest } from './registry';

export interface ToolboxHubProps {
  isSidebar?: boolean;
}

export const ToolboxHub: React.FC<ToolboxHubProps> = ({ isSidebar = false }) => {
  const [activeTool, setActiveTool] = useState<ToolboxToolId>(
    TOOL_REGISTRY[0]?.id || 'script-runner'
  );

  const activeManifest = getToolManifest(activeTool) || TOOL_REGISTRY[0];
  const ActiveComponent = activeManifest?.component;

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
              已載入 {TOOL_REGISTRY.length} 個實用工具
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">🧰</span>
              <span className="text-xs font-bold text-dark-primary tracking-wide">實用工具箱</span>
            </div>
            <span className="text-[10px] text-dark-muted bg-dark-hover px-2 py-0.5 rounded-md border border-dark-border-subtle">
              {TOOL_REGISTRY.length} 項工具
            </span>
          </div>
        )}

        {/* 工具分類切換 Tabs */}
        <div className={`mt-2.5 ${isSidebar ? 'grid grid-cols-5 gap-1' : 'flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin'}`}>
          {TOOL_REGISTRY.map((tool) => {
            const isActive = activeTool === tool.id || (activeTool === 'finance-research' && tool.id === 'finance-watchlist');
            const displayName = tool.title || tool.name;
            const displayShortName = tool.shortName || displayName;

            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                title={displayName}
                className={`flex items-center justify-center space-x-1 rounded-lg font-medium transition-all ${
                  isSidebar
                    ? 'px-1 py-1.5 text-[10px]'
                    : 'px-4 py-2 text-sm'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-dark-card text-dark-secondary hover:bg-dark-hover hover:text-dark-primary border border-dark-border-subtle/60'
                }`}
              >
                <span className={isSidebar ? 'text-xs' : 'text-sm'}>{tool.icon}</span>
                <span className="truncate">{isSidebar ? displayShortName : displayName}</span>
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
      <div className={`flex-1 ${isSidebar ? 'p-2 w-full' : 'p-8 max-w-7xl w-full mx-auto'}`}>
        {ActiveComponent && <ActiveComponent isSidebar={isSidebar} />}
      </div>
    </div>
  );
};
