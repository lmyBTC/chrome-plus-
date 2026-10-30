import React, { useState, useMemo } from 'react';
import { ScriptRunResult, ScriptExecutionLog, LogLevel, ScriptHistoryEntry, DiffNode } from '../types';
import { diffJsonResult, flattenDiff } from '../utils/diffResult';

export interface ScriptConsoleProps {
  result: ScriptRunResult | null;
  isExecuting: boolean;
  onClear: () => void;
  isSidebar?: boolean;
  // G-05: 進度條 + 中斷
  progressPercent?: number;
  progressMessage?: string;
  onAbort?: () => void;
  // G-01/G-11: 執行歷程
  history?: ScriptHistoryEntry[];
  onClearHistory?: () => void;
}

// G-07: Diff 視圖元件
const DiffView: React.FC<{ nodes: DiffNode[] }> = ({ nodes }) => {
  const rows = flattenDiff(nodes);
  if (rows.length === 0) return <div className="text-slate-500 text-xs py-4 text-center">無差異</div>;

  const colorMap: Record<string, string> = {
    added: 'bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500',
    removed: 'bg-red-950/60 text-red-300 border-l-2 border-red-500',
    changed: 'bg-amber-950/60 text-amber-200 border-l-2 border-amber-500',
    unchanged: 'text-slate-400',
  };
  const iconMap: Record<string, string> = { added: '+', removed: '-', changed: '~', unchanged: ' ' };

  return (
    <div className="space-y-0.5 font-mono text-[11px]">
      {rows.map((row, i) => (
        <div key={i} className={`flex items-start px-2 py-0.5 rounded ${colorMap[row.type] || ''}`}
          style={{ paddingLeft: `${8 + row.depth * 12}px` }}>
          <span className="mr-1.5 opacity-60 shrink-0">{iconMap[row.type]}</span>
          <span className="mr-1 text-slate-400">{row.key}:</span>
          {row.type === 'changed' ? (
            <span>
              <span className="line-through text-red-400 mr-1">{formatValue(row.prev)}</span>
              <span className="text-emerald-300">{formatValue(row.curr)}</span>
            </span>
          ) : (
            <span>{formatValue(row.type === 'removed' ? row.prev : row.curr)}</span>
          )}
        </div>
      ))}
    </div>
  );
};

function formatValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return String(val); }
  }
  return String(val);
}

export const ScriptConsole: React.FC<ScriptConsoleProps> = ({
  result,
  isExecuting,
  onClear,
  isSidebar = false,
  progressPercent,
  progressMessage,
  onAbort,
  history = [],
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'logs' | 'history'>('result');
  const [logFilter, setLogFilter] = useState<'all' | LogLevel>('all');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  // G-07: Diff 狀態
  const [diffTargetEntry, setDiffTargetEntry] = useState<ScriptHistoryEntry | null>(null);
  const [diffNodes, setDiffNodes] = useState<DiffNode[] | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotice(`${label} 已複製至剪貼簿`);
      setTimeout(() => setCopiedNotice(null), 2000);
    } catch { /* 容錯防護 */ }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!result) return;
    downloadFile(JSON.stringify(result.result !== undefined ? result.result : result, null, 2),
      `script_result_${Date.now()}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    if (!result || !result.result) return;
    let list: any[] = [];
    if (Array.isArray(result.result)) { list = result.result; }
    else if (typeof result.result === 'object') {
      const arrayKey = Object.keys(result.result).find(k => Array.isArray(result.result[k]));
      list = arrayKey ? result.result[arrayKey] : [result.result];
    }
    if (list.length === 0) { alert('未偵測到適合轉化為 CSV 的陣列資料'); return; }
    const allKeys = Array.from(new Set(list.flatMap(item => item && typeof item === 'object' ? Object.keys(item) : ['value'])));
    const escape = (v: any) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return s.match(/[,"\n]/) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csvContent = '\uFEFF' + [allKeys.map(escape).join(','), ...list.map(item => typeof item !== 'object' || !item ? escape(item) : allKeys.map(k => escape(item[k])).join(','))].join('\n');
    downloadFile(csvContent, `script_result_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleCopyErrorReport = async () => {
    if (!result) return;
    const report = [
      '### 🚨 Chrome PK 隨選腳本執行報錯報告',
      `- **產生時間**: ${new Date(result.executedAt || Date.now()).toLocaleString()}`,
      `- **目標頁面**: ${result.tabTitle || '未知'} (${result.tabUrl || '未知網址'})`,
      `- **執行耗時**: ${result.executionTimeMs.toFixed(1)} ms`,
      '', '#### 錯誤訊息:', '```', result.error || '未知錯誤', '```',
      '', '#### Console 日誌:',
      result.logs?.length > 0 ? result.logs.map(l => `[${l.level.toUpperCase()}] ${l.message}`).join('\n') : '（無日誌）', ''
    ].join('\n');
    await copyToClipboard(report, '除錯報錯資訊');
  };

  const formattedResultStr = useMemo(() => {
    if (!result) return '';
    if (result.error) return `Error: ${result.error}`;
    if (result.result === undefined) return 'undefined';
    if (result.result === null) return 'null';
    if (typeof result.result === 'string') return result.result;
    try { return JSON.stringify(result.result, null, 2); } catch { return String(result.result); }
  }, [result]);

  const isArrayResult = useMemo(() => {
    if (!result?.result) return false;
    if (Array.isArray(result.result)) return true;
    return typeof result.result === 'object' && Object.values(result.result).some(v => Array.isArray(v));
  }, [result]);

  const filteredLogs = useMemo(() => {
    if (!result?.logs) return [];
    return logFilter === 'all' ? result.logs : result.logs.filter(l => l.level === logFilter);
  }, [result, logFilter]);

  // G-07: 觸發 Diff 比較
  const handleDiff = (entry: ScriptHistoryEntry) => {
    if (!result) return;
    setDiffTargetEntry(entry);
    setDiffNodes(diffJsonResult(entry.result, result.result));
    setActiveTab('result');
  };

  const showingProgress = isExecuting && progressPercent !== undefined;

  return (
    <div className="flex flex-col h-full bg-dark-card border border-dark-border-subtle rounded-xl overflow-hidden shadow-sm">
      {/* 頂部操作列 */}
      <div className="bg-dark-surface px-3 py-2 border-b border-dark-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm">📟</span>
          {/* G-01: Tabs 含「歷史」 */}
          <div className="flex bg-dark-bg p-0.5 rounded-lg border border-dark-border-subtle">
            {(['result', 'logs', 'history'] as const).map(tab => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setDiffNodes(null); }}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-dark-secondary hover:text-dark-primary'}`}>
                <span>{tab === 'result' ? '回傳結果' : tab === 'logs' ? '日誌' : '歷史'}</span>
                {tab === 'logs' && result?.logs && result.logs.length > 0 && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded-full">{result.logs.length}</span>
                )}
                {tab === 'history' && history.length > 0 && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded-full">{history.length}</span>
                )}
              </button>
            ))}
          </div>

          {result && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${result.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'bg-red-950 text-red-300 border border-red-800/40'}`}>
              {result.success ? '✓ 成功' : '✕ 失敗'}
            </span>
          )}
          {result && <span className="text-[10px] text-dark-muted hidden sm:inline-block">⚡ {result.executionTimeMs.toFixed(1)}ms</span>}
        </div>

        <div className="flex items-center space-x-1.5">
          {result && activeTab === 'result' && !diffNodes && (
            <>
              <button onClick={() => copyToClipboard(formattedResultStr, '回傳結果')} title="複製"
                className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
                <span>📋</span>{!isSidebar && <span>複製</span>}
              </button>
              <button onClick={handleExportJSON} title="匯出 JSON"
                className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
                <span>💾</span><span>JSON</span>
              </button>
              {isArrayResult && (
                <button onClick={handleExportCSV} title="匯出 CSV"
                  className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
                  <span>📊</span><span>CSV</span>
                </button>
              )}
            </>
          )}
          {/* G-07: 關閉 Diff 按鈕 */}
          {diffNodes && (
            <button onClick={() => { setDiffNodes(null); setDiffTargetEntry(null); }}
              className="text-xs bg-amber-900/40 hover:bg-amber-800/50 text-amber-300 px-2 py-1 rounded border border-amber-800/40 flex items-center space-x-1">
              <span>✕</span><span>關閉比較</span>
            </button>
          )}
          {activeTab === 'history' && history.length > 0 && onClearHistory && (
            <button onClick={onClearHistory} title="清空歷史"
              className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80">清空歷史</button>
          )}
          {result && (
            <button onClick={onClear} title="清空控制台"
              className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80">清空</button>
          )}
        </div>
      </div>

      {copiedNotice && (
        <div className="bg-blue-950/60 border-b border-blue-800/40 text-blue-300 text-xs px-3 py-1">
          <span>ℹ️ {copiedNotice}</span>
        </div>
      )}

      {result?.tabUrl && (
        <div className="bg-dark-bg/60 px-3 py-1 text-[11px] text-dark-muted border-b border-dark-border-subtle/40 flex items-center space-x-2 truncate">
          <span className="text-emerald-400">🌐</span>
          <span className="truncate max-w-[240px]" title={result.tabTitle || result.tabUrl}>{result.tabTitle || result.tabUrl}</span>
        </div>
      )}

      {/* G-05: 進度條 */}
      {showingProgress && (
        <div className="bg-dark-bg/80 px-3 py-2 border-b border-dark-border-subtle/40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-blue-300">{progressMessage || '執行中...'}</span>
            <div className="flex items-center space-x-2">
              <span className="text-dark-muted">{progressPercent}%</span>
              {onAbort && (
                <button onClick={onAbort}
                  className="text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-2 py-0.5 rounded border border-red-800/40 flex items-center space-x-1 transition-all">
                  <span>⏹</span><span>停止</span>
                </button>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {/* 主內容 */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 font-mono text-xs text-slate-200">
        {/* 執行中 Spinner（無進度條時） */}
        {isExecuting && !showingProgress && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-blue-300">腳本執行中，正在攔截 Console 輸出...</p>
            {onAbort && (
              <button onClick={onAbort}
                className="text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-1 rounded border border-red-800/40 flex items-center space-x-1 mt-2">
                <span>⏹</span><span>中止執行</span>
              </button>
            )}
          </div>
        )}

        {/* 尚未執行 */}
        {!isExecuting && !result && activeTab !== 'history' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <span className="text-2xl opacity-40">⚡</span>
            <p className="text-xs">尚未執行腳本</p>
            <p className="text-[11px] text-slate-600">按 <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+Enter</kbd> 注入當前分頁</p>
          </div>
        )}

        {/* G-07: Diff 比較視圖 */}
        {!isExecuting && diffNodes && activeTab === 'result' && (
          <div className="space-y-2">
            <div className="text-[11px] text-amber-300 flex items-center space-x-1.5 pb-2 border-b border-slate-800">
              <span>🔍</span>
              <span>與歷史記錄比較：<strong>{diffTargetEntry?.scriptTitle}</strong> @ {new Date(diffTargetEntry?.executedAt || 0).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px] pb-1">
              <span className="text-emerald-300">+ 新增</span>
              <span className="text-red-300">- 刪除</span>
              <span className="text-amber-200">~ 變更</span>
              <span className="text-slate-400">　不變</span>
            </div>
            <DiffView nodes={diffNodes} />
          </div>
        )}

        {/* 回傳結果 */}
        {!isExecuting && result && activeTab === 'result' && !diffNodes && (
          <div className="space-y-2">
            {result.error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-red-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center space-x-1.5"><span>⚠️</span><span>執行錯誤</span></div>
                  <button onClick={handleCopyErrorReport}
                    className="text-[11px] bg-red-800/80 hover:bg-red-700 text-white px-2.5 py-1 rounded flex items-center space-x-1 transition-all active:scale-95">
                    <span>📋</span><span>複製報錯問題</span>
                  </button>
                </div>
                <div className="text-xs whitespace-pre-wrap font-mono bg-red-950/60 p-2.5 rounded border border-red-900/40 select-text leading-relaxed">{result.error}</div>
              </div>
            )}
            {result.result !== undefined && (
              <pre className="whitespace-pre-wrap break-all leading-relaxed select-text">{formattedResultStr}</pre>
            )}
          </div>
        )}

        {/* 日誌 */}
        {!isExecuting && result && activeTab === 'logs' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-800">
              {(['all', 'info', 'warn', 'error', 'success'] as const).map(lvl => (
                <button key={lvl} onClick={() => setLogFilter(lvl)}
                  className={`text-[10px] px-2 py-0.5 rounded capitalize ${logFilter === lvl ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'}`}>
                  {lvl}
                </button>
              ))}
            </div>
            {filteredLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                {result.logs.length === 0 ? '無 Console 日誌' : '無符合篩選條件的日誌'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredLogs.map((log, idx) => {
                  const styles: Record<LogLevel, string> = {
                    info: 'text-blue-400 bg-blue-950/40 border-blue-800/30',
                    warn: 'text-amber-400 bg-amber-950/40 border-amber-800/30',
                    error: 'text-red-400 bg-red-950/40 border-red-800/30',
                    success: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30',
                  };
                  const icons: Record<LogLevel, string> = { info: 'ℹ️', warn: '⚠️', error: '✕', success: '✓' };
                  return (
                    <div key={idx} className="flex items-start space-x-2 py-1 px-1.5 rounded hover:bg-slate-900/60 border border-transparent hover:border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-500 font-mono pt-0.5 shrink-0">+{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`text-[10px] px-1 rounded border uppercase font-bold shrink-0 ${styles[log.level]}`}>{icons[log.level]} {log.level}</span>
                      <span className="text-slate-200 whitespace-pre-wrap break-all flex-1">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* G-01: 歷史 Tab */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">尚無執行歷史記錄</div>
            ) : (
              history.map((entry) => (
                <div key={entry.id}
                  className={`rounded-lg border px-3 py-2 space-y-1 ${entry.success ? 'border-emerald-800/30 bg-emerald-950/10' : 'border-red-800/30 bg-red-950/10'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold ${entry.success ? 'text-emerald-300' : 'text-red-300'}`}>
                        {entry.success ? '✓' : '✕'}
                      </span>
                      <span className="text-xs text-dark-primary truncate max-w-[150px]">{entry.scriptTitle}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-dark-muted">{entry.executionTimeMs}ms</span>
                      <span className="text-[10px] text-dark-muted">{new Date(entry.executedAt).toLocaleTimeString()}</span>
                      {/* G-07: 與當前比較按鈕 */}
                      {result && (
                        <button onClick={() => handleDiff(entry)}
                          title="與當前結果比較差異"
                          className="text-[10px] bg-amber-900/30 hover:bg-amber-800/50 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/30 transition-all">
                          🔍 Diff
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.tabUrl && (
                    <div className="text-[10px] text-dark-muted truncate">{entry.tabTitle || entry.tabUrl}</div>
                  )}
                  {entry.error && (
                    <div className="text-[11px] text-red-300 truncate font-mono">{entry.error}</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
