import React, { useState } from 'react';
import { ScriptRunResult, ScriptExecutionLog, LogLevel } from '../types';

export interface ScriptConsoleProps {
  result: ScriptRunResult | null;
  isExecuting: boolean;
  onClear: () => void;
  isSidebar?: boolean;
}

export const ScriptConsole: React.FC<ScriptConsoleProps> = ({
  result,
  isExecuting,
  onClear,
  isSidebar = false,
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'logs'>('result');
  const [logFilter, setLogFilter] = useState<'all' | LogLevel>('all');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // 複製文字至剪貼簿
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotice(`${label} 已複製至剪貼簿`);
      setTimeout(() => setCopiedNotice(null), 2000);
    } catch {
      // 容錯防護
    }
  };

  // 下載檔案輔助函式
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 匯出 JSON
  const handleExportJSON = () => {
    if (!result) return;
    const dataToExport = result.result !== undefined ? result.result : result;
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    downloadFile(jsonStr, `script_result_${Date.now()}.json`, 'application/json');
  };

  // 將資料轉為 CSV 並匯出
  const handleExportCSV = () => {
    if (!result || !result.result) return;
    let list: any[] = [];
    if (Array.isArray(result.result)) {
      list = result.result;
    } else if (typeof result.result === 'object') {
      // 嘗試尋找物件內的陣列欄位 (例如 items, data, links, files)
      const arrayKey = Object.keys(result.result).find((k) => Array.isArray(result.result[k]));
      if (arrayKey) {
        list = result.result[arrayKey];
      } else {
        list = [result.result];
      }
    }

    if (list.length === 0) {
      alert('未偵測到適合轉化為 CSV 的清單或陣列資料');
      return;
    }

    // 取得所有唯一 key
    const allKeys = Array.from(
      new Set(list.flatMap((item) => (item && typeof item === 'object' ? Object.keys(item) : ['value'])))
    );

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = allKeys.map(escapeCsv).join(',');
    const rows = list.map((item) => {
      if (typeof item !== 'object' || item === null) {
        return escapeCsv(item);
      }
      return allKeys.map((key) => escapeCsv(item[key])).join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n');
    downloadFile(csvContent, `script_result_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  // 一鍵複製完整錯誤問題報告
  const handleCopyErrorReport = async () => {
    if (!result) return;
    const report = [
      '### 🚨 Chrome PK 隨選腳本執行報錯報告',
      `- **產生時間**: ${new Date(result.executedAt || Date.now()).toLocaleString()}`,
      `- **目標頁面**: ${result.tabTitle || '未知'} (${result.tabUrl || '未知網址'})`,
      `- **執行耗時**: ${result.executionTimeMs.toFixed(1)} ms`,
      '',
      '#### 錯誤訊息 (Error):',
      '```',
      result.error || '未知錯誤',
      '```',
      '',
      '#### 相關 Console 日誌 (Logs):',
      result.logs && result.logs.length > 0
        ? result.logs.map((l) => `[${l.level.toUpperCase()}] ${l.message}`).join('\n')
        : '（無日誌輸出）',
      ''
    ].join('\n');

    await copyToClipboard(report, '除錯報錯資訊');
  };

  // 格式化回傳值
  const formattedResultStr = React.useMemo(() => {
    if (!result) return '';
    if (result.error) return `Error: ${result.error}`;
    if (result.result === undefined) return 'undefined';
    if (result.result === null) return 'null';
    if (typeof result.result === 'string') return result.result;
    try {
      return JSON.stringify(result.result, null, 2);
    } catch (e) {
      return String(result.result);
    }
  }, [result]);

  // 計算是否具備陣列資料
  const isArrayResult = React.useMemo(() => {
    if (!result || !result.result) return false;
    if (Array.isArray(result.result)) return true;
    if (typeof result.result === 'object') {
      return Object.values(result.result).some((v) => Array.isArray(v));
    }
    return false;
  }, [result]);

  // 過濾日誌
  const filteredLogs = React.useMemo(() => {
    if (!result || !result.logs) return [];
    if (logFilter === 'all') return result.logs;
    return result.logs.filter((log) => log.level === logFilter);
  }, [result, logFilter]);

  return (
    <div className="flex flex-col h-full bg-dark-card border border-dark-border-subtle rounded-xl overflow-hidden shadow-sm">
      {/* 頂部狀態與操作列 */}
      <div className="bg-dark-surface px-3 py-2 border-b border-dark-border-subtle flex flex-wrap items-center justify-between gap-2">
        {/* 左側 Tabs 與狀態標籤 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm">📟</span>
          <div className="flex bg-dark-bg p-0.5 rounded-lg border border-dark-border-subtle">
            <button
              onClick={() => setActiveTab('result')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                activeTab === 'result'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              回傳結果
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
            >
              <span>日誌</span>
              {result?.logs && result.logs.length > 0 && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded-full">
                  {result.logs.length}
                </span>
              )}
            </button>
          </div>

          {/* 狀態 Badge */}
          {result && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                result.success
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                  : 'bg-red-950 text-red-300 border border-red-800/40'
              }`}
            >
              {result.success ? '✓ 成功' : '✕ 失敗'}
            </span>
          )}

          {result && (
            <span className="text-[10px] text-dark-muted hidden sm:inline-block">
              ⚡ {result.executionTimeMs.toFixed(1)}ms
            </span>
          )}
        </div>

        {/* 右側操作按鈕 */}
        <div className="flex items-center space-x-1.5">
          {result && activeTab === 'result' && (
            <>
              <button
                onClick={() => copyToClipboard(formattedResultStr, '回傳結果')}
                title="複製回傳文字"
                className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
              >
                <span>📋</span>
                {!isSidebar && <span>複製</span>}
              </button>

              <button
                onClick={handleExportJSON}
                title="匯出為 JSON 檔案"
                className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
              >
                <span>💾</span>
                <span>JSON</span>
              </button>

              {isArrayResult && (
                <button
                  onClick={handleExportCSV}
                  title="匯出為 CSV 試算表"
                  className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
                >
                  <span>📊</span>
                  <span>CSV</span>
                </button>
              )}
            </>
          )}

          {result && (
            <button
              onClick={onClear}
              title="清空控制台輸出"
              className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 提示訊息 */}
      {copiedNotice && (
        <div className="bg-blue-950/60 border-b border-blue-800/40 text-blue-300 text-xs px-3 py-1 flex items-center justify-between">
          <span>ℹ️ {copiedNotice}</span>
        </div>
      )}

      {/* 目標分頁資訊 */}
      {result?.tabUrl && (
        <div className="bg-dark-bg/60 px-3 py-1 text-[11px] text-dark-muted border-b border-dark-border-subtle/40 flex items-center space-x-2 truncate">
          <span className="text-emerald-400">🌐</span>
          <span className="truncate max-w-[280px]" title={result.tabTitle || result.tabUrl}>
            {result.tabTitle || result.tabUrl}
          </span>
          <span className="text-[10px] text-dark-muted">({result.tabUrl})</span>
        </div>
      )}

      {/* 主呈現內容區 */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-3 font-mono text-xs text-slate-200">
        {/* 執行中狀態 */}
        {isExecuting && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-blue-300">腳本執行中，正在攔截 Console 輸出與結果...</p>
          </div>
        )}

        {/* 尚未執行狀態 */}
        {!isExecuting && !result && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <span className="text-2xl opacity-40">⚡</span>
            <p className="text-xs">尚未執行腳本</p>
            <p className="text-[11px] text-slate-600">
              點擊上方「執行腳本」或按 <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+Enter</kbd> 注入當前分頁
            </p>
          </div>
        )}

        {/* 回傳結果檢視 */}
        {!isExecuting && result && activeTab === 'result' && (
          <div className="space-y-2">
            {result.error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-3 text-red-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold flex items-center space-x-1.5">
                    <span>⚠️</span>
                    <span>執行錯誤</span>
                  </div>
                  <button
                    onClick={handleCopyErrorReport}
                    className="text-[11px] bg-red-800/80 hover:bg-red-700 text-white px-2.5 py-1 rounded flex items-center space-x-1 transition-all active:scale-95 shadow-sm"
                    title="一鍵複製完整錯誤與日誌資訊"
                  >
                    <span>📋</span>
                    <span>複製報錯問題</span>
                  </button>
                </div>
                <div className="text-xs whitespace-pre-wrap font-mono bg-red-950/60 p-2.5 rounded border border-red-900/40 select-text leading-relaxed">
                  {result.error}
                </div>
              </div>
            )}

            {result.result !== undefined && (
              <pre className="whitespace-pre-wrap break-all leading-relaxed select-text">
                {formattedResultStr}
              </pre>
            )}
          </div>
        )}

        {/* 日誌清單檢視 */}
        {!isExecuting && result && activeTab === 'logs' && (
          <div className="space-y-2">
            {/* 日誌級別過濾器 */}
            <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-800">
              {(['all', 'info', 'warn', 'error', 'success'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`text-[10px] px-2 py-0.5 rounded capitalize ${
                    logFilter === lvl
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {filteredLogs.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">
                {result.logs.length === 0 ? '執行期間未產生 Console 日誌' : '無符合篩選條件的日誌'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredLogs.map((log, idx) => {
                  let badgeColor = 'text-blue-400 bg-blue-950/40 border-blue-800/30';
                  let icon = 'ℹ️';
                  if (log.level === 'warn') {
                    badgeColor = 'text-amber-400 bg-amber-950/40 border-amber-800/30';
                    icon = '⚠️';
                  } else if (log.level === 'error') {
                    badgeColor = 'text-red-400 bg-red-950/40 border-red-800/30';
                    icon = '✕';
                  } else if (log.level === 'success') {
                    badgeColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/30';
                    icon = '✓';
                  }

                  return (
                    <div
                      key={idx}
                      className="flex items-start space-x-2 py-1 px-1.5 rounded hover:bg-slate-900/60 border border-transparent hover:border-slate-800 text-xs"
                    >
                      <span className="text-[10px] text-slate-500 font-mono pt-0.5 shrink-0">
                        +{new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded border uppercase font-bold shrink-0 ${badgeColor}`}
                      >
                        {icon} {log.level}
                      </span>
                      <span className="text-slate-200 whitespace-pre-wrap break-all flex-1">
                        {log.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
