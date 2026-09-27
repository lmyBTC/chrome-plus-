import React from 'react';
import { ImageFormat } from '../types';
import { ScraperFilterBarProps } from './types';

const FORMAT_OPTIONS: ImageFormat[] = ['jpg', 'png', 'webp', 'gif', 'svg', 'mp4', 'webm'];

export const ScraperFilterBar: React.FC<ScraperFilterBarProps> = ({
  pageTitle,
  totalCount,
  videoCount,
  selectedCount,
  hasHighRes,
  formatFilters,
  onToggleFormatFilter,
  onResetFormatFilters,
  minWidth,
  onMinWidthChange,
  searchKeyword,
  onSearchKeywordChange,
  onSelectAll,
  onInvertSelect,
  showAdvanced,
  onToggleAdvanced,
  isSidebar = false
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {/* 頂部資訊列 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-border-subtle/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">📁</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-semibold text-dark-primary truncate max-w-[150px]" title={pageTitle}>
                {pageTitle}
              </h3>
              <span className="text-[11px] text-dark-muted">
                共 {totalCount} 項
                {videoCount > 0 && (
                  <span className="text-purple-300 ml-1">
                    (含 {videoCount} 影片)
                  </span>
                )}
              </span>
              <span className="text-blue-400 font-medium text-[11px]">
                已選 {selectedCount}
              </span>
              {hasHighRes && (
                <span className="text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40 text-[10px]">
                  ✨ 高清原圖
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 選取快捷操作與進階開關 */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectAll(true)}
            className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-primary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
            title="全選所有圖片"
          >
            全選
          </button>
          <button
            type="button"
            onClick={() => onSelectAll(false)}
            className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-secondary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
            title="取消全部選取"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onInvertSelect}
            className="px-2 py-1 bg-dark-surface hover:bg-dark-hover text-dark-secondary rounded border border-dark-border-subtle transition-colors text-[11px] cursor-pointer"
            title="反向選取"
          >
            反選
          </button>
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={`px-2 py-1 rounded border transition-colors text-[11px] flex items-center gap-1 cursor-pointer ${
              showAdvanced
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-dark-surface text-dark-secondary border-dark-border-subtle hover:text-dark-primary'
            }`}
            title="展開/收合詳細儲存設定與篩選條件"
          >
            <span>⚙️</span>
            <span>{showAdvanced ? '收起' : '進階'}</span>
          </button>
        </div>
      </div>

      {/* 格式標籤篩選列 */}
      <div className="flex items-center gap-1 flex-wrap text-xs">
        <span className="text-dark-muted mr-1 text-[11px]">格式:</span>
        {FORMAT_OPTIONS.map(fmt => {
          const isChecked = formatFilters.has(fmt);
          const isVid = fmt === 'mp4' || fmt === 'webm';
          return (
            <button
              key={fmt}
              type="button"
              onClick={(e) => onToggleFormatFilter(fmt, e.altKey)}
              title="點擊切換；按住 Alt+點擊可「僅選此格式」"
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-all flex items-center gap-0.5 cursor-pointer ${
                isChecked
                  ? isVid
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/60 shadow-sm'
                    : 'bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm'
                  : 'bg-dark-surface text-dark-muted border border-dark-border-subtle opacity-60 hover:opacity-100'
              }`}
            >
              {isVid && <span>🎥</span>}
              <span>{fmt}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onResetFormatFilters}
          className="text-[10px] text-dark-muted hover:text-blue-400 underline ml-1 cursor-pointer transition-colors"
          title="重設為顯示所有圖片與影片格式"
        >
          全部
        </button>
      </div>

      {/* 寬度過濾與關鍵字搜尋（進階或側邊欄展開） */}
      {(showAdvanced || !isSidebar) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-dark-muted text-[11px]">最小寬度:</span>
            <select
              value={minWidth}
              onChange={e => onMinWidthChange(Number(e.target.value))}
              className="bg-dark-card border border-dark-border-subtle text-dark-primary rounded px-2 py-1 outline-none text-xs"
            >
              <option value={0}>不限</option>
              <option value={200}>&gt; 200px</option>
              <option value={500}>&gt; 500px</option>
              <option value={1000}>&gt; 1000px</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="搜尋檔名或描述..."
            value={searchKeyword}
            onChange={e => onSearchKeywordChange(e.target.value)}
            className="bg-dark-card border border-dark-border-subtle rounded px-2 py-1 text-dark-primary placeholder-dark-muted outline-none w-32 focus:w-40 transition-all text-xs"
          />
        </div>
      )}
    </div>
  );
};
