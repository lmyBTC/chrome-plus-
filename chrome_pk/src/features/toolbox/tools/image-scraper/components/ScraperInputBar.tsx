import React from 'react';
import { isFileSystemAccessSupported } from '../services/downloader';
import { ScraperInputBarProps } from './types';

export const ScraperInputBar: React.FC<ScraperInputBarProps> = ({
  crawlMode,
  onCrawlModeChange,
  targetUrl,
  onTargetUrlChange,
  isLoading,
  errorMsg,
  currentTabInfo,
  activeTabMode,
  onActiveTabModeChange,
  carouselProgress,
  onStartScrape,
  onStopTraverse,
  selectedCount,
  downloadProgress,
  onStartBatchDownload,
  targetDirHandle,
  targetDirName,
  onPickDirectory,
  hasImages,
  isSidebar = false
}) => {
  const handleOpenNewTab = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: 'chrome://newtab' });
    }
  };

  return (
    <div className={`bg-dark-card border border-dark-border-subtle rounded-xl ${isSidebar ? 'p-3' : 'p-6'} shadow-sm`}>
      <div className={`flex items-center justify-between gap-2 ${isSidebar ? 'mb-2.5' : 'mb-4'}`}>
        <div className="flex items-center gap-2">
          <h2 className={`${isSidebar ? 'text-sm' : 'text-xl'} font-bold text-dark-primary flex items-center gap-1.5`}>
            <span>🖼️</span> <span>{isSidebar ? '圖片採集器' : '網頁圖片爬取與批量下載器'}</span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 模式切換 */}
          <div className="flex items-center bg-dark-surface p-0.5 rounded-lg border border-dark-border-subtle">
            <button
              type="button"
              onClick={() => onCrawlModeChange('url')}
              className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                crawlMode === 'url'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              🌐 網址
            </button>
            <button
              type="button"
              onClick={() => onCrawlModeChange('active-tab')}
              className={`px-2 py-1 text-xs font-medium rounded transition-all cursor-pointer ${
                crawlMode === 'active-tab'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              📑 分頁
            </button>
          </div>

          {isSidebar && (
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="text-xs text-blue-400 hover:text-blue-300 p-1 hover:bg-dark-surface rounded transition-colors cursor-pointer"
              title="在新分頁開啟全螢幕儀表板"
            >
              <span>🖥️</span>
            </button>
          )}
        </div>
      </div>

      {!isSidebar && (
        <p className="text-sm text-dark-secondary mb-4">
          一鍵提取任意網頁所有高畫質原圖，支援條件篩選、全選預覽與多執行緒平滑下載。
        </p>
      )}

      {/* 輸入與觸發區 */}
      {crawlMode === 'url' ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="請輸入網頁 URL (例如 https://example.com/...)"
              value={targetUrl}
              onChange={e => onTargetUrlChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onStartScrape()}
              className="flex-1 bg-dark-surface border border-dark-border-subtle rounded-lg px-4 py-2.5 text-sm text-dark-primary placeholder-dark-muted focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={onStartScrape}
              disabled={isLoading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>深度分析中...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>開始爬取圖片</span>
                </>
              )}
            </button>
          </div>

          {/* Instagram 貼心提醒 */}
          {targetUrl.toLowerCase().includes('instagram.com') && (
            <div className="p-3 bg-pink-950/40 border border-pink-800/50 rounded-lg text-xs text-pink-200 flex items-start gap-2.5">
              <span className="text-base leading-none">📷</span>
              <div className="flex-1">
                <strong>Instagram 多圖貼文採集提示：</strong>
                <div className="text-pink-300/90 mt-0.5">
                  Instagram 對外部直接 URL 爬取有嚴格的反爬與登入限制。若要完整採集貼文中的所有多張相片（如 index 1~14），強烈建議您在瀏覽器分頁開啟貼文後，切換為「<strong>抓取當前瀏覽分頁</strong>」並使用「<strong>相簿劇院輪巡</strong>」模式！
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onCrawlModeChange('active-tab');
                    onActiveTabModeChange('carousel-traverse');
                  }}
                  className="mt-2 px-2.5 py-1 bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 rounded text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>👉</span>
                  <span>一鍵切換至「當前分頁相簿輪巡」</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* 當前鎖定分頁即時指示條 */}
          {currentTabInfo && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-950/25 border border-emerald-800/40 rounded-lg text-xs text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="font-semibold flex-shrink-0">鎖定分頁：</span>
              <span className="truncate flex-1 text-slate-200 font-medium text-[11px]" title={currentTabInfo.title}>
                {currentTabInfo.title || currentTabInfo.url}
              </span>
            </div>
          )}

          {/* 分頁模式選擇：精簡 Segmented Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-dark-surface rounded-lg border border-dark-border-subtle text-xs">
            <button
              type="button"
              onClick={() => onActiveTabModeChange('fast')}
              className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTabMode === 'fast'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
              }`}
              title="瞬間提取當前 DOM 樹中已渲染之所有圖片（最快）"
            >
              <span>⚡</span>
              <span className="truncate">快速快照</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveTabModeChange('deep-scroll')}
              className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTabMode === 'deep-scroll'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
              }`}
              title="自動向下平滑滑動以觸發延遲載入 (Lazy-load) 圖片"
            >
              <span>📜</span>
              <span className="truncate">深度滾動</span>
            </button>

            <button
              type="button"
              onClick={() => onActiveTabModeChange('carousel-traverse')}
              className={`py-1.5 px-1.5 rounded font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeTabMode === 'carousel-traverse'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-dark-secondary hover:text-dark-primary hover:bg-dark-hover/40'
              }`}
              title="自動模擬切換下一張，逐張擷取 FB / IG 貼文多圖"
            >
              <span>🔄</span>
              <span className="truncate">相簿輪巡</span>
            </button>
          </div>

          {/* 雙核心高能主控列 (Dual Action Bar: 輪巡與下載同屏聯動) */}
          <div className="flex flex-col gap-2 p-2.5 bg-dark-surface/90 rounded-lg border border-dark-border-subtle shadow-inner">
            {/* 輪巡進度條 (輪巡進行時即時展示) */}
            {activeTabMode === 'carousel-traverse' && carouselProgress?.isTraversing && (
              <div className="flex flex-col gap-1 px-0.5">
                <div className="flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    <span className="truncate max-w-[190px]">{carouselProgress.statusText}</span>
                  </div>
                  <span className="text-indigo-300 font-mono text-[10px]">已採集 {carouselProgress.currentCount} 張</span>
                </div>
                <div className="w-full bg-dark-card h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(8, (carouselProgress.currentCount / 30) * 100))}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* 雙核心按鈕區：左【輪巡/採集】+ 右【立即下載】 */}
            <div className="grid grid-cols-2 gap-2">
              {/* 按鈕 1: 輪巡/採集控制 */}
              {isLoading && activeTabMode === 'carousel-traverse' ? (
                <button
                  type="button"
                  onClick={onStopTraverse}
                  className="w-full py-2 px-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-1 cursor-pointer"
                  title="立即停止相簿輪巡並保留已採集圖片"
                >
                  <span className="text-sm">🛑</span>
                  <span className="truncate">停止並匯出</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartScrape}
                  disabled={isLoading}
                  className={`w-full py-2 px-2 font-semibold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer ${
                    activeTabMode === 'carousel-traverse'
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                  } disabled:opacity-50`}
                  title={
                    activeTabMode === 'carousel-traverse'
                      ? '自動遍歷下一張並逐張採集 FB / IG 相簿'
                      : activeTabMode === 'deep-scroll'
                      ? '向下平滑滾動以觸發延遲加載'
                      : '瞬間提取當前頁面所有圖片'
                  }
                >
                  {isLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="truncate">{activeTabMode === 'carousel-traverse' ? '輪巡中...' : '採集中...'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">{activeTabMode === 'carousel-traverse' ? '🔄' : activeTabMode === 'deep-scroll' ? '📜' : '⚡'}</span>
                      <span className="truncate">
                        {activeTabMode === 'carousel-traverse'
                          ? hasImages ? '繼續輪巡相簿' : '開始輪巡相簿'
                          : activeTabMode === 'deep-scroll'
                          ? '深度滾動抓取'
                          : '即時快照'}
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* 按鈕 2: 立即下載 (同屏一鍵觸發！) */}
              <button
                type="button"
                onClick={onStartBatchDownload}
                disabled={selectedCount === 0 || downloadProgress?.isDownloading}
                className={`w-full py-2 px-2 font-semibold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1 ${
                  selectedCount > 0
                    ? targetDirHandle
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/40 cursor-pointer'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25 cursor-pointer'
                    : 'bg-dark-card text-dark-muted border border-dark-border-subtle cursor-not-allowed opacity-50'
                }`}
                title={
                  selectedCount > 0
                    ? `立即下載已選取的 ${selectedCount} 個項目 (儲存至 ${targetDirName || '預設下載匣'})`
                    : '請先透過左側按鈕輪巡或選取圖片'
                }
              >
                <span className="text-sm">{downloadProgress?.isDownloading ? '⏳' : targetDirHandle ? '⚡' : '⬇️'}</span>
                <span className="truncate">
                  {downloadProgress?.isDownloading
                    ? `下載中 (${downloadProgress.current}/${downloadProgress.total})`
                    : selectedCount > 0
                    ? `立即下載 (${selectedCount}張)`
                    : '下載圖片 (0張)'}
                </span>
              </button>
            </div>

            {/* 儲存目錄與快捷切換指示列 */}
            <div className="flex items-center justify-between text-[11px] text-dark-muted pt-1 border-t border-dark-border-subtle/50 px-0.5">
              <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                <span>📁</span>
                <span className="truncate text-dark-secondary" title={targetDirName ? `儲存至: ${targetDirName} (免逐張彈窗)` : '儲存至瀏覽器預設下載匣'}>
                  {targetDirName ? (
                    <span className="text-emerald-300 font-mono text-[10px]">
                      {targetDirName} <span className="text-[9px] px-1 py-0.2 bg-emerald-950/80 text-emerald-400 rounded border border-emerald-800/40">免彈窗</span>
                    </span>
                  ) : (
                    '預設下載匣'
                  )}
                </span>
              </div>

              {isFileSystemAccessSupported() && (
                <button
                  type="button"
                  onClick={onPickDirectory}
                  className="text-blue-400 hover:text-blue-300 underline text-[10px] cursor-pointer flex-shrink-0 transition-colors"
                  title="指定本機資料搞，建立獨立相簿並免彈窗直存"
                >
                  {targetDirHandle ? '更換目錄' : '選定資料夾'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 錯誤反饋提示 */}
      {errorMsg && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm text-red-300 flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
