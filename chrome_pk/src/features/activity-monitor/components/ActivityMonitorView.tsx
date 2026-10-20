import React, { useState, useRef, useEffect } from 'react';
import { useActivityMonitor } from '../hooks/useActivityMonitor';
import { ActivityLog, ActivityCategory } from '../types';

export interface ActivityMonitorViewProps {
  isSidebar?: boolean;
}

export const ActivityMonitorView: React.FC<ActivityMonitorViewProps> = ({ isSidebar = false }) => {
  const {
    isConnected,
    isMonitoring,
    currentTab,
    originSettings,
    isInspectorActive,
    isAuditing,
    isInjecting,
    filterCategory,
    searchQuery,
    autoScroll,
    counts,
    filteredLogs,
    setFilterCategory,
    setSearchQuery,
    setAutoScroll,
    toggleMonitoring,
    refreshCurrentTab,
    auditCurrentOrigin,
    injectInspector,
    clearLogs,
    exportLogsJson
  } = useActivityMonitor();

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const streamBottomRef = useRef<HTMLDivElement>(null);

  // 自動滾動至最新事件
  useEffect(() => {
    if (autoScroll && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs.length, autoScroll]);

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  };

  const getPermissionBadge = (val?: string) => {
    switch (val) {
      case 'allow':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">允許</span>;
      case 'block':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">封鎖</span>;
      case 'ask':
      case 'prompt':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">詢問</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700/40 text-slate-400 border border-slate-700/50">預設/未知</span>;
    }
  };

  const getCategoryBadge = (category: ActivityCategory) => {
    switch (category) {
      case 'probe':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">探針</span>;
      case 'network':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">網路</span>;
      case 'download':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">下載</span>;
      case 'permission':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">權限</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700/40 text-slate-300">活動</span>;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-dark-base text-dark-primary select-none overflow-hidden ${isSidebar ? 'p-2.5 text-xs' : 'p-6 max-w-6xl mx-auto'}`}>
      {/* 頂部 Header & 狀態指示 */}
      <div className="flex items-center justify-between pb-4 border-b border-dark-border-subtle mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xl">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${isSidebar ? 'text-sm' : 'text-xl'} font-bold tracking-wide text-dark-primary`}>
                瀏覽器活動監控
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                v1.0.0
              </span>
              <div
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 animate-pulse'}`}
                title={isConnected ? '背景服務已連線' : '背景服務未連線，正在嘗試重連'}
              />
            </div>
            <p className="text-dark-muted text-xs mt-0.5">
              原生權限審查 + 雙層動態探針 + 實時網路/下載威脅捕捉
            </p>
          </div>
        </div>

        {/* 頂部操作按鈕 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleMonitoring()}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isMonitoring
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-600/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>{isMonitoring ? '🟢 監控中' : '⚪ 已暫停'}</span>
          </button>
          <button
            type="button"
            onClick={() => refreshCurrentTab()}
            title="重新整理當前分頁資訊"
            className="p-1.5 rounded-lg bg-dark-surface hover:bg-dark-hover border border-dark-border-subtle text-dark-secondary hover:text-dark-primary transition-all text-sm cursor-pointer"
          >
            🔄
          </button>
        </div>
      </div>

      {/* 當前分頁資訊狀態卡 */}
      <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-3 mb-4 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-dark-muted font-mono">來源:</span>
            <span className="font-semibold text-blue-400 truncate max-w-[280px]" title={currentTab?.url}>
              {currentTab?.origin || '載入中...'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-0.5 rounded bg-dark-card border border-dark-border-subtle text-dark-muted font-mono text-[11px]">
              {currentTab?.id ? `Tab #${currentTab.id}` : 'Tab #--'}
            </span>
          </div>
        </div>
      </div>

      {/* 上方雙卡區：網站原生權限審查 (80%) + 隨選深度探針 (20%) */}
      <div className={`grid gap-4 mb-4 ${isSidebar ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* 卡片 1: 網站原生權限審查 */}
        <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-border-subtle/50">
            <div className="flex items-center gap-2">
              <span className="text-base">🔐</span>
              <h2 className="text-xs font-bold text-dark-primary">網站原生權限審查</h2>
              <span className="text-[10px] text-dark-muted">(contentSettings)</span>
            </div>
            <button
              type="button"
              onClick={() => auditCurrentOrigin()}
              disabled={isAuditing}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <span>{isAuditing ? '檢查中...' : '重新審查'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
            <div className="bg-dark-card/60 p-2 rounded-lg border border-dark-border-subtle/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-secondary">
                <span>📷</span>
                <span>相機</span>
              </div>
              {getPermissionBadge(originSettings.camera)}
            </div>

            <div className="bg-dark-card/60 p-2 rounded-lg border border-dark-border-subtle/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-secondary">
                <span>🎙️</span>
                <span>麥克風</span>
              </div>
              {getPermissionBadge(originSettings.microphone)}
            </div>

            <div className="bg-dark-card/60 p-2 rounded-lg border border-dark-border-subtle/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-secondary">
                <span>📍</span>
                <span>定位</span>
              </div>
              {getPermissionBadge(originSettings.location)}
            </div>

            <div className="bg-dark-card/60 p-2 rounded-lg border border-dark-border-subtle/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-secondary">
                <span>🔔</span>
                <span>通知</span>
              </div>
              {getPermissionBadge(originSettings.notifications)}
            </div>

            <div className="bg-dark-card/60 p-2 rounded-lg border border-dark-border-subtle/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-dark-secondary">
                <span>📋</span>
                <span>剪貼簿</span>
              </div>
              {getPermissionBadge(originSettings.clipboard)}
            </div>
          </div>
        </div>

        {/* 卡片 2: 隨選深度動態探針 */}
        <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-dark-border-subtle/50">
            <div className="flex items-center gap-2">
              <span className="text-base">🧬</span>
              <h2 className="text-xs font-bold text-dark-primary">深度動態探針 (Deep Inspector)</h2>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              isInspectorActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isInspectorActive ? '🟢 探針攔截中' : '⚪ 隨選待命中'}
            </span>
          </div>

          <p className="text-dark-muted text-xs mb-3">
            隨選注入 MAIN 與 ISOLATED 雙層探針至當前分頁，即時攔截相機、麥克風、地理定位與剪貼簿原生調用。
          </p>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={injectInspector}
              disabled={isInjecting || isInspectorActive}
              className={`w-full py-2 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isInspectorActive
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
              }`}
            >
              {isInjecting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>正在注入雙層探針...</span>
                </>
              ) : isInspectorActive ? (
                <>
                  <span>✓ 探針已啟動 (分頁重載前持續有效)</span>
                </>
              ) : (
                <>
                  <span>⚡ 注入深度探針至當前分頁</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 活動串流工具列：分類過濾、搜尋、清空與匯出 */}
      <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-3 mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* 分類按鈕 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-dark-secondary hover:bg-dark-hover hover:text-dark-primary'
            }`}
          >
            <span>全部</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('probe')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'probe'
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                : 'text-dark-secondary hover:bg-dark-hover hover:text-dark-primary'
            }`}
          >
            <span>探針</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
              {counts.probe}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('network')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'network'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-dark-secondary hover:bg-dark-hover hover:text-dark-primary'
            }`}
          >
            <span>網路</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
              {counts.network}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('download')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'download'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                : 'text-dark-secondary hover:bg-dark-hover hover:text-dark-primary'
            }`}
          >
            <span>下載</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
              {counts.download}
            </span>
          </button>
        </div>

        {/* 搜尋框與快捷動作 */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[240px]">
          <input
            type="text"
            placeholder="搜尋網域、URL、API..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-[200px] px-2.5 py-1 text-xs rounded-lg bg-dark-card border border-dark-border-subtle text-dark-primary placeholder-dark-muted focus:outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={exportLogsJson}
            title="匯出為 JSON 檔案"
            className="px-2.5 py-1 rounded-lg text-xs bg-dark-card hover:bg-dark-hover border border-dark-border-subtle text-dark-secondary hover:text-dark-primary transition-all cursor-pointer"
          >
            匯出
          </button>

          <button
            type="button"
            onClick={clearLogs}
            title="清空所有監控日誌"
            className="px-2.5 py-1 rounded-lg text-xs bg-dark-card hover:bg-rose-950/40 border border-dark-border-subtle hover:border-rose-800/60 text-dark-secondary hover:text-rose-400 transition-all cursor-pointer"
          >
            清空
          </button>

          <label className="flex items-center gap-1 text-[11px] text-dark-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded bg-dark-card border-dark-border-subtle text-blue-500 focus:ring-0"
            />
            <span>自動滾動</span>
          </label>
        </div>
      </div>

      {/* 活動串流瀑布流列表 */}
      <div className="flex-1 bg-dark-surface border border-dark-border-subtle rounded-xl p-3 overflow-y-auto min-h-0 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-dark-muted">
            <span className="text-3xl mb-2">📡</span>
            <span className="text-sm font-semibold text-dark-secondary">暫無監控活動紀錄</span>
            <span className="text-xs text-dark-muted mt-1">
              {isMonitoring ? '請瀏覽網頁或點擊上方「注入深度探針」以開始即時攔截' : '目前監控已暫停，請點擊上方按鈕重新啟動'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="bg-dark-card/70 hover:bg-dark-card border border-dark-border-subtle/60 hover:border-dark-border-subtle rounded-lg p-2.5 transition-all text-xs"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-dark-muted shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    {getCategoryBadge(log.category)}

                    {log.category === 'network' && (
                      <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-blue-950/60 text-blue-400 border border-blue-900/40 shrink-0">
                        {log.method || 'GET'}
                      </span>
                    )}

                    <span className="font-semibold text-dark-primary truncate">
                      {log.category === 'probe' && log.api}
                      {log.category === 'network' && (log.domain || log.url)}
                      {log.category === 'download' && (log.filename || log.url)}
                    </span>

                    {log.type && (
                      <span className="text-[10px] text-dark-muted font-mono shrink-0">
                        [{log.type}]
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {log.tabId && (
                      <span className="text-[10px] text-dark-muted font-mono">
                        Tab #{log.tabId}
                      </span>
                    )}
                    <span className="text-dark-muted text-[10px]">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* 展開之細部內容 */}
                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-dark-border-subtle/50 text-[11px] font-mono space-y-1 text-slate-300">
                    {log.url && (
                      <div className="flex gap-2 break-all">
                        <span className="text-dark-muted shrink-0">URL:</span>
                        <a
                          href={log.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {log.url}
                        </a>
                      </div>
                    )}
                    {log.origin && (
                      <div className="flex gap-2">
                        <span className="text-dark-muted shrink-0">Origin:</span>
                        <span className="text-indigo-400">{log.origin}</span>
                      </div>
                    )}
                    {log.detail && Object.keys(log.detail).length > 0 && (
                      <div className="mt-1">
                        <span className="text-dark-muted block mb-0.5">Detail:</span>
                        <pre className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[10px] overflow-x-auto text-emerald-400">
                          {JSON.stringify(log.detail, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={streamBottomRef} />
      </div>

      {/* 底部摘要列 */}
      <div className="flex items-center justify-between pt-2.5 mt-2 text-[11px] text-dark-muted">
        <span>已載入 {filteredLogs.length} / {counts.all} 筆活動事件</span>
        <span>資料庫保留上限: 500 筆即時快取 (3日自動定時清理)</span>
      </div>
    </div>
  );
};
