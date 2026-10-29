import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScriptItem, ScriptCategory } from '../types';
import { PRESET_SCRIPTS } from '../presets';

export interface ScriptEditorProps {
  activeCode: string;
  onChangeCode: (code: string) => void;
  onExecute: () => void;
  isExecuting: boolean;
  selectedScript: ScriptItem | null;
  onSelectScript: (script: ScriptItem) => void;
  onSaveCustomScript: (title: string, category: ScriptCategory, code: string) => Promise<void>;
  customScripts: ScriptItem[];
  onDeleteCustomScript?: (id: string) => Promise<void>;
  runtimeError?: string | null;
  onClearRuntimeError?: () => void;
  tabInfo?: { url?: string; title?: string };
  isSidebar?: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  activeCode,
  onChangeCode,
  onExecute,
  isExecuting,
  selectedScript,
  onSelectScript,
  onSaveCustomScript,
  customScripts,
  onDeleteCustomScript,
  runtimeError = null,
  onClearRuntimeError,
  tabInfo,
  isSidebar = false,
}) => {
  const [scriptTitle, setScriptTitle] = useState<string>('');
  const [scriptCategory, setScriptCategory] = useState<ScriptCategory>('custom');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 1. 即時原生語法預檢 (Syntax Check - 安全靜態掃描，完全符合 MV3 CSP 規範)
  const syntaxError = useMemo(() => {
    if (!activeCode || !activeCode.trim()) return null;
    try {
      const stack: string[] = [];
      const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
      let inString: string | null = null;
      let isEscaped = false;

      for (let i = 0; i < activeCode.length; i++) {
        const char = activeCode[i];
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (char === '\\') {
          isEscaped = true;
          continue;
        }
        if (inString) {
          if (char === inString) inString = null;
          continue;
        }
        if (char === '"' || char === "'" || char === '`') {
          inString = char;
          continue;
        }
        if (char === '(' || char === '{' || char === '[') {
          stack.push(char);
        } else if (char === ')' || char === '}' || char === ']') {
          if (stack.length === 0 || stack[stack.length - 1] !== pairs[char]) {
            return `未預期的閉合括號 '${char}' (位置: 第 ${i + 1} 個字元)`;
          }
          stack.pop();
        }
      }
      if (inString) return `字串未閉合 (${inString})`;
      if (stack.length > 0) return `缺少閉合括號: '${stack[stack.length - 1]}'`;
      return null;
    } catch (err: any) {
      return err?.message || '語法解析異常';
    }
  }, [activeCode]);

  // 當前激活的錯誤 (語法錯誤優先於執行期錯誤)
  const activeError = syntaxError ? `語法錯誤: ${syntaxError}` : runtimeError;

  // 當選取的腳本改變時，同步標題與分類
  useEffect(() => {
    if (selectedScript) {
      setScriptTitle(selectedScript.title);
      setScriptCategory(selectedScript.category);
    } else {
      setScriptTitle('');
      setScriptCategory('custom');
    }
  }, [selectedScript]);

  // 快捷鍵支援：Ctrl+Enter 或 Cmd+Enter 執行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isExecuting && activeCode.trim()) {
        onExecute();
      }
    }
    // 支援 Tab 鍵縮排
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = activeCode.substring(0, start) + '  ' + activeCode.substring(end);
      onChangeCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // 貼上剪貼簿內容
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChangeCode(text);
      }
    } catch {
      // 容錯防護
    }
  };

  // 一鍵複製完整報錯報告 (方便發給 AI 或他人除錯)
  const handleCopyErrorReport = async () => {
    if (!activeError) return;
    const report = [
      '### 🚨 Chrome PK 隨選腳本錯誤報告',
      `- **腳本名稱**: ${selectedScript?.title || scriptTitle || '自訂腳本'}`,
      `- **產生時間**: ${new Date().toLocaleString()}`,
      `- **目標頁面**: ${tabInfo?.title || '當前活躍分頁'} (${tabInfo?.url || '未知網址'})`,
      `- **錯誤類型**: ${syntaxError ? 'JavaScript 語法解析錯誤 (SyntaxError)' : '執行期例外錯誤 (RuntimeError)'}`,
      '',
      '#### 錯誤訊息 (Error Message):',
      '```',
      activeError,
      '```',
      '',
      '#### 相關腳本代碼 (Script Code):',
      '```javascript',
      activeCode,
      '```',
      ''
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
      setCopyNotice('已複製完整報錯資訊至剪貼簿！');
      setTimeout(() => setCopyNotice(null), 2500);
    } catch {
      // 容錯降級
    }
  };

  // 儲存腳本處理
  const handleSave = async () => {
    if (!scriptTitle.trim()) {
      alert('請輸入自訂腳本名稱');
      return;
    }
    await onSaveCustomScript(scriptTitle.trim(), scriptCategory, activeCode);
    setShowSaveModal(false);
    setSaveSuccessNotice('腳本已成功儲存！');
    setTimeout(() => setSaveSuccessNotice(null), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-dark-card border border-dark-border-subtle rounded-xl overflow-hidden shadow-sm">
      {/* 頂部工具列 */}
      <div className="bg-dark-surface px-3 py-2 border-b border-dark-border-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <span className="text-sm">📝</span>
          <select
            value={selectedScript?.id || 'custom'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                onSelectScript({
                  id: 'scratchpad',
                  title: '自訂草稿腳本',
                  description: '隨選即時編輯與注入',
                  code: activeCode,
                  category: 'custom',
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              } else {
                const foundPreset = PRESET_SCRIPTS.find((s) => s.id === val);
                const foundCustom = customScripts.find((s) => s.id === val);
                const target = foundPreset || foundCustom;
                if (target) onSelectScript(target);
              }
            }}
            className="text-xs bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2 py-1 max-w-[240px] truncate focus:outline-none focus:border-blue-500"
          >
            <optgroup label="⚡ 內建預設腳本">
              {PRESET_SCRIPTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            {customScripts.length > 0 && (
              <optgroup label="💾 我的自訂腳本">
                {customScripts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="custom">✏️ 自訂草稿 (空白/即時剪貼)</option>
          </select>

          {selectedScript?.isPreset && (
            <span className="text-[10px] bg-blue-950/70 text-blue-300 border border-blue-800/40 px-1.5 py-0.5 rounded">
              內建預設
            </span>
          )}

          {selectedScript && !selectedScript.isPreset && selectedScript.id !== 'scratchpad' && onDeleteCustomScript && (
            <button
              onClick={() => {
                if (confirm(`確定刪除自訂腳本「${selectedScript.title}」？`)) {
                  onDeleteCustomScript(selectedScript.id);
                }
              }}
              title="刪除此自訂腳本"
              className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-950/40"
            >
              🗑️
            </button>
          )}
        </div>

        {/* 編輯器快捷按鈕 */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handlePasteClipboard}
            title="從剪貼簿貼上代碼"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
          >
            <span>📋</span>
            {!isSidebar && <span>貼上</span>}
          </button>

          <button
            onClick={() => onChangeCode('')}
            title="清空代碼"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
          >
            <span>🧹</span>
            {!isSidebar && <span>清空</span>}
          </button>

          <button
            onClick={() => {
              setScriptTitle(selectedScript?.isPreset ? `${selectedScript.title} (副本)` : selectedScript?.title || '我的腳本');
              setShowSaveModal(true);
            }}
            title="另存為自訂腳本"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1"
          >
            <span>💾</span>
            {!isSidebar && <span>儲存</span>}
          </button>

          <button
            onClick={onExecute}
            disabled={isExecuting || !activeCode.trim()}
            title="注入當前活躍分頁並執行 (Ctrl+Enter)"
            className={`text-xs px-3 py-1 rounded font-medium flex items-center space-x-1 transition-all ${
              isExecuting || !activeCode.trim()
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 active:scale-95'
            }`}
          >
            <span>{isExecuting ? '⏳' : '⚡'}</span>
            <span>{isExecuting ? '執行中...' : '執行腳本'}</span>
          </button>
        </div>
      </div>

      {/* 提示訊息 */}
      {saveSuccessNotice && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-300 text-xs px-3 py-1 flex items-center justify-between">
          <span>✓ {saveSuccessNotice}</span>
        </div>
      )}

      {copyNotice && (
        <div className="bg-blue-950/60 border-b border-blue-800/40 text-blue-300 text-xs px-3 py-1 flex items-center justify-between">
          <span>📋 {copyNotice}</span>
        </div>
      )}

      {/* 🔴 醒目報錯橫幅 (支援一鍵複製問題) */}
      {activeError && (
        <div className="bg-red-950/80 border-b border-red-800/60 p-2 text-xs text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
          <div className="flex items-start space-x-1.5 flex-1 min-w-0">
            <span className="text-red-400 shrink-0 text-sm">⚠️</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-300 mr-1.5">
                {syntaxError ? '[語法錯誤]' : '[執行例外]'}
              </span>
              <span className="font-mono text-[11px] break-all leading-tight">
                {activeError}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
            <button
              onClick={handleCopyErrorReport}
              title="複製包含錯誤訊息、網址與代碼的完整除錯報告"
              className="text-[11px] bg-red-800/70 hover:bg-red-700 text-white px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition-all shadow-sm active:scale-95"
            >
              <span>📋</span>
              <span>複製報錯問題</span>
            </button>
            {onClearRuntimeError && !syntaxError && (
              <button
                onClick={onClearRuntimeError}
                title="關閉報錯提示"
                className="text-red-400 hover:text-red-200 text-xs px-1.5 py-0.5 rounded hover:bg-red-900/40"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 腳本描述列 (若有) */}
      {selectedScript?.description && (
        <div className="bg-dark-bg/60 px-3 py-1.5 text-[11px] text-dark-secondary border-b border-dark-border-subtle/40 flex items-center space-x-1.5">
          <span className="text-blue-400">ℹ️</span>
          <span className="truncate">{selectedScript.description}</span>
          {selectedScript.targetUrlPattern && (
            <span className="text-[10px] text-dark-muted ml-auto bg-dark-hover px-1.5 py-0.5 rounded border border-dark-border-subtle/40">
              適用: {selectedScript.targetUrlPattern}
            </span>
          )}
        </div>
      )}

      {/* 代碼編輯區塊 */}
      <div className="flex-1 relative min-h-[160px] bg-slate-950 flex flex-col">
        <textarea
          ref={textareaRef}
          value={activeCode}
          onChange={(e) => onChangeCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="// 在此貼上或編寫 JavaScript 腳本...\n// 支援 ES6 / async-await，回傳之結果將直接顯示於右側/下方 Console\n// 快捷鍵: Ctrl + Enter 即刻注入當前活躍分頁"
          className="w-full flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-blue-600/40"
          spellCheck={false}
        />
        <div className="bg-slate-900/80 px-3 py-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>JavaScript</span>
            <span>•</span>
            <span>{activeCode.length} 字元</span>
            <span>•</span>
            <span>{activeCode.split('\n').length} 行</span>
            <span>•</span>
            {syntaxError ? (
              <span className="text-red-400 flex items-center space-x-1">
                <span>✕</span>
                <span>語法錯誤</span>
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center space-x-1">
                <span>✓</span>
                <span>語法正常</span>
              </span>
            )}
          </span>
          <span className="text-slate-500">按 Ctrl + Enter 快速執行</span>
        </div>
      </div>

      {/* 另存腳本彈窗 Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-4 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-dark-primary mb-3 flex items-center space-x-1.5">
              <span>💾</span>
              <span>另存為自訂腳本</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark-secondary mb-1">腳本名稱</label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  placeholder="例如：抓取商品清單"
                  className="w-full bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-dark-secondary mb-1">腳本分類</label>
                <select
                  value={scriptCategory}
                  onChange={(e) => setScriptCategory(e.target.value as ScriptCategory)}
                  className="w-full bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="custom">自訂腳本 (custom)</option>
                  <option value="pikpak">PikPak 專用 (pikpak)</option>
                  <option value="scraper">資料爬取 (scraper)</option>
                  <option value="automation">流程自動化 (automation)</option>
                  <option value="utility">實用工具 (utility)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-xs px-3 py-1.5 rounded text-dark-secondary hover:text-dark-primary bg-dark-hover"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="text-xs px-3 py-1.5 rounded font-medium bg-blue-600 hover:bg-blue-500 text-white shadow"
              >
                確認儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
