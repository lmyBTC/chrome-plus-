import React from 'react';
import { isFileSystemAccessSupported } from '../services/downloader';
import { ScraperDownloadControlsProps } from './types';

export const ScraperDownloadControls: React.FC<ScraperDownloadControlsProps> = ({
  downloadFolder,
  onDownloadFolderChange,
  namingPattern,
  onNamingPatternChange,
  namingPrefix,
  onNamingPrefixChange,
  skipExisting,
  onSkipExistingChange,
  targetDirHandle,
  targetDirName,
  onPickDirectory,
  selectedCount,
  downloadProgress,
  onStartBatchDownload,
  onCancelDownload,
  isSidebar = false
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* 資料夾與命名設定 */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dark-border-subtle/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-dark-muted text-[11px]">子資料夾:</span>
            <input
              type="text"
              value={downloadFolder}
              onChange={e => onDownloadFolderChange(e.target.value)}
              className="bg-dark-card border border-dark-border-subtle rounded px-2 py-1 text-dark-primary outline-none text-xs font-mono w-28"
              placeholder="資料夾名稱"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-dark-muted text-[11px]">命名:</span>
            <select
              value={namingPattern}
              onChange={e => onNamingPatternChange(e.target.value as 'original' | 'sequence')}
              className="bg-dark-card border border-dark-border-subtle rounded px-1.5 py-1 text-dark-primary outline-none text-xs"
            >
              <option value="original">原始檔名</option>
              <option value="sequence">序號命名</option>
            </select>
          </div>

          {namingPattern === 'sequence' && (
            <input
              type="text"
              value={namingPrefix}
              onChange={e => onNamingPrefixChange(e.target.value)}
              placeholder="前綴"
              className="bg-dark-card border border-dark-border-subtle rounded px-1.5 py-1 text-dark-primary outline-none w-16 text-xs"
            />
          )}

          {/* 智慧跳過重複檔案開關 */}
          <label className="flex items-center gap-1.5 text-dark-secondary hover:text-dark-primary text-xs cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={e => onSkipExistingChange(e.target.checked)}
              className="rounded border-dark-border-subtle bg-dark-card text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>跳過已存在檔案</span>
          </label>
        </div>

        {/* 目錄設定與下載按鈕 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStartBatchDownload}
            disabled={selectedCount === 0 || downloadProgress?.isDownloading}
            className={`px-3 py-1.5 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer ${
              targetDirHandle
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
            }`}
            title={
              targetDirHandle
                ? `批量下載至 ${targetDirName} (${selectedCount} 張)`
                : `直接下載至預設下載匣 (${selectedCount} 張)`
            }
          >
            <span>{targetDirHandle ? '⚡' : '⬇️'}</span>
            <span>立即下載 ({selectedCount}張)</span>
          </button>

          {targetDirHandle ? (
            <button
              type="button"
              onClick={onPickDirectory}
              className="px-2.5 py-1 bg-dark-card hover:bg-dark-hover text-dark-secondary hover:text-dark-primary text-xs rounded border border-dark-border-subtle transition-colors flex items-center gap-1 cursor-pointer"
              title="更換當前儲存的本機目標資料夾"
            >
              <span>📁</span>
              <span>更換資料夾</span>
            </button>
          ) : (
            isFileSystemAccessSupported() && (
              <button
                type="button"
                onClick={onPickDirectory}
                className="px-2.5 py-1 bg-dark-card hover:bg-dark-hover text-dark-secondary hover:text-dark-primary text-xs rounded border border-dark-border-subtle transition-colors flex items-center gap-1 cursor-pointer"
                title="可選：指定一個本機資料夾，自動建立相簿並免彈窗直存"
              >
                <span>📁</span>
                <span>選定資料夾</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 下載進度條 */}
      {downloadProgress && downloadProgress.isDownloading && (
        <div className="bg-dark-surface p-3 rounded-lg border border-dark-border-subtle flex flex-col gap-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span className="text-dark-primary font-medium">
                下載中... ({downloadProgress.current} / {downloadProgress.total})
              </span>
              <span className="text-dark-muted font-mono truncate max-w-xs">
                {downloadProgress.activeItemName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">成功: {downloadProgress.successCount}</span>
              {downloadProgress.skippedCount > 0 && (
                <span className="text-amber-400">跳過重複: {downloadProgress.skippedCount}</span>
              )}
              {downloadProgress.failureCount > 0 && (
                <span className="text-red-400">失敗: {downloadProgress.failureCount}</span>
              )}
              <button
                type="button"
                onClick={onCancelDownload}
                className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
              >
                中止下載
              </button>
            </div>
          </div>

          <div className="w-full bg-dark-hover h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-200"
              style={{
                width: `${(downloadProgress.current / downloadProgress.total) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
