import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import { ScriptItem, ScriptCategory, ScriptParam } from '../types';
import { PRESET_SCRIPTS } from '../presets';

export interface ScriptEditorProps {
  activeCode: string;
  onChangeCode: (code: string) => void;
  onExecute: (resolvedCode: string) => void;
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

// G-06: 分類配置
const CATEGORY_CHIPS: { value: 'all' | ScriptCategory; label: string; emoji: string }[] = [
  { value: 'all', label: '全部', emoji: '🌐' },
  { value: 'pikpak', label: 'PikPak', emoji: '📦' },
  { value: 'scraper', label: '爬取', emoji: '🕷️' },
  { value: 'automation', label: '自動化', emoji: '🤖' },
  { value: 'utility', label: '工具', emoji: '🔧' },
  { value: 'custom', label: '自訂', emoji: '✏️' },
];

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
  // G-06: 分類過濾 + 搜尋
  const [filterCategory, setFilterCategory] = useState<'all' | ScriptCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // G-09: 參數值
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  // G-04: Prism 高亮 HTML
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);

  // G-04: Prism 語法高亮（每次 activeCode 變更時更新）
  useEffect(() => {
    const html = Prism.highlight(activeCode || '', Prism.languages.javascript, 'javascript');
    setHighlightedHtml(html + '\n'); // 尾部空行防止最後一行不顯示
  }, [activeCode]);

  // G-04: 同步 textarea 與 pre 的捲動
  const syncScroll = useCallback(() => {
    if (preRef.current && textareaRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // 1. 即時原生語法預檢 (靜態符號配對掃描，合規 MV3)
  const syntaxError = useMemo(() => {
    if (!activeCode || !activeCode.trim()) return null;
    try {
      const stack: string[] = [];
      const pairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
      let inString: string | null = null;
      let isEscaped = false;

      for (let i = 0; i < activeCode.length; i++) {
        const char = activeCode[i];
        if (isEscaped) { isEscaped = false; continue; }
        if (char === '\\') { isEscaped = true; continue; }
        if (inString) { if (char === inString) inString = null; continue; }
        if (char === '"' || char === "'" || char === '`') { inString = char; continue; }
        if (char === '(' || char === '{' || char === '[') { stack.push(char); }
        else if (char === ')' || char === '}' || char === ']') {
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

  const activeError = syntaxError ? `語法錯誤: ${syntaxError}` : runtimeError;

  // G-06: 過濾後腳本列表
  const allScripts = useMemo(() => {
    return [...PRESET_SCRIPTS, ...customScripts];
  }, [customScripts]);

  const filteredScripts = useMemo(() => {
    let scripts = allScripts;
    if (filterCategory !== 'all') {
      scripts = scripts.filter(s => s.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      scripts = scripts.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return scripts;
  }, [allScripts, filterCategory, searchQuery]);

  // G-09: 當選取腳本改變時，重置參數值
  useEffect(() => {
    if (selectedScript?.params) {
      const defaults: Record<string, string> = {};
      selectedScript.params.forEach(p => { defaults[p.name] = p.default ?? ''; });
      setParamValues(defaults);
    } else {
      setParamValues({});
    }
  }, [selectedScript?.id]);

  // G-09: 解析參數並替換模板，產生最終執行代碼
  const resolveCode = useCallback((code: string, params: Record<string, string>): string => {
    let resolved = code;
    Object.entries(params).forEach(([key, val]) => {
      // 使用 split/join 替代 replaceAll，兼容 ES2019 target
      resolved = resolved.split(`{{${key}}}`).join(val);
    });
    return resolved;
  }, []);

  useEffect(() => {
    if (selectedScript) {
      setScriptTitle(selectedScript.title);
      setScriptCategory(selectedScript.category);
    } else {
      setScriptTitle('');
      setScriptCategory('custom');
    }
  }, [selectedScript]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isExecuting && activeCode.trim()) {
        onExecute(resolveCode(activeCode, paramValues));
      }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = activeCode.substring(0, start) + '  ' + activeCode.substring(end);
      onChangeCode(newValue);
      setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = start + 2; }, 0);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChangeCode(text);
    } catch { /* 容錯防護 */ }
  };

  const handleCopyErrorReport = async () => {
    if (!activeError) return;
    const report = [
      '### 🚨 Chrome PK 隨選腳本錯誤報告',
      `- **腳本名稱**: ${selectedScript?.title || scriptTitle || '自訂腳本'}`,
      `- **產生時間**: ${new Date().toLocaleString()}`,
      `- **目標頁面**: ${tabInfo?.title || '當前活躍分頁'} (${tabInfo?.url || '未知網址'})`,
      `- **錯誤類型**: ${syntaxError ? 'SyntaxError' : 'RuntimeError'}`,
      '', '#### 錯誤訊息:', '```', activeError, '```',
      '', '#### 腳本代碼:', '```javascript', activeCode, '```', ''
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setCopyNotice('已複製完整報錯資訊至剪貼簿！');
      setTimeout(() => setCopyNotice(null), 2500);
    } catch { /* 容錯降級 */ }
  };

  const handleSave = async () => {
    if (!scriptTitle.trim()) { alert('請輸入自訂腳本名稱'); return; }
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
          {/* G-06: 搜尋欄 */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜尋腳本..."
            className="text-xs bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2 py-1 w-[120px] focus:outline-none focus:border-blue-500"
          />
          <select
            value={selectedScript?.id || 'custom'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'custom') {
                onSelectScript({ id: 'scratchpad', title: '自訂草稿腳本', description: '隨選即時編輯與注入', code: activeCode, category: 'custom', createdAt: Date.now(), updatedAt: Date.now() });
              } else {
                const target = filteredScripts.find(s => s.id === val);
                if (target) onSelectScript(target);
              }
            }}
            className="text-xs bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2 py-1 max-w-[200px] truncate focus:outline-none focus:border-blue-500"
          >
            <optgroup label="⚡ 符合結果">
              {filteredScripts.filter(s => s.isPreset).map(s => (
                <option key={s.id} value={s.id}>{s.title}{s.version ? ` v${s.version}` : ''}</option>
              ))}
            </optgroup>
            {filteredScripts.some(s => !s.isPreset) && (
              <optgroup label="💾 我的自訂腳本">
                {filteredScripts.filter(s => !s.isPreset).map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </optgroup>
            )}
            <option value="custom">✏️ 自訂草稿 (空白/即時剪貼)</option>
          </select>

          {/* G-03: 版本標籤 */}
          {selectedScript?.isPreset && selectedScript.version && (
            <span className="text-[10px] bg-blue-950/70 text-blue-300 border border-blue-800/40 px-1.5 py-0.5 rounded whitespace-nowrap">
              v{selectedScript.version}
            </span>
          )}

          {selectedScript && !selectedScript.isPreset && selectedScript.id !== 'scratchpad' && onDeleteCustomScript && (
            <button
              onClick={() => { if (confirm(`確定刪除自訂腳本「${selectedScript.title}」？`)) onDeleteCustomScript(selectedScript.id); }}
              title="刪除此自訂腳本"
              className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-950/40"
            >
              🗑️
            </button>
          )}
        </div>

        {/* 編輯器快捷按鈕 */}
        <div className="flex items-center space-x-1.5">
          <button onClick={handlePasteClipboard} title="從剪貼簿貼上代碼"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
            <span>📋</span>{!isSidebar && <span>貼上</span>}
          </button>
          <button onClick={() => onChangeCode('')} title="清空代碼"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
            <span>🧹</span>{!isSidebar && <span>清空</span>}
          </button>
          <button
            onClick={() => { setScriptTitle(selectedScript?.isPreset ? `${selectedScript.title} (副本)` : selectedScript?.title || '我的腳本'); setShowSaveModal(true); }}
            title="另存為自訂腳本"
            className="text-xs bg-dark-hover hover:bg-slate-700 text-dark-secondary hover:text-dark-primary px-2 py-1 rounded border border-dark-border-subtle/80 flex items-center space-x-1">
            <span>💾</span>{!isSidebar && <span>儲存</span>}
          </button>
          <button
            onClick={() => onExecute(resolveCode(activeCode, paramValues))}
            disabled={isExecuting || !activeCode.trim()}
            title="注入當前活躍分頁並執行 (Ctrl+Enter)"
            className={`text-xs px-3 py-1 rounded font-medium flex items-center space-x-1 transition-all ${isExecuting || !activeCode.trim() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20 active:scale-95'}`}>
            <span>{isExecuting ? '⏳' : '⚡'}</span>
            <span>{isExecuting ? '執行中...' : '執行腳本'}</span>
          </button>
        </div>
      </div>

      {/* G-06: 分類 Chips 過濾列 */}
      <div className="bg-dark-bg/60 px-3 py-1.5 border-b border-dark-border-subtle/40 flex items-center space-x-1 overflow-x-auto scrollbar-thin">
        {CATEGORY_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setFilterCategory(chip.value)}
            className={`text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap border transition-all shrink-0 ${filterCategory === chip.value ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold' : 'bg-dark-card border-dark-border-subtle/60 text-dark-muted hover:text-dark-primary hover:border-slate-600'}`}
          >
            {chip.emoji} {chip.label}
          </button>
        ))}
        <span className="text-[10px] text-dark-muted ml-auto shrink-0">{filteredScripts.length} 個腳本</span>
      </div>

      {/* 提示訊息 */}
      {saveSuccessNotice && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-300 text-xs px-3 py-1 flex items-center justify-between">
          <span>✓ {saveSuccessNotice}</span>
        </div>
      )}
      {copyNotice && (
        <div className="bg-blue-950/60 border-b border-blue-800/40 text-blue-300 text-xs px-3 py-1">
          <span>📋 {copyNotice}</span>
        </div>
      )}

      {/* 🔴 報錯橫幅 */}
      {activeError && (
        <div className="bg-red-950/80 border-b border-red-800/60 p-2 text-xs text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-inner">
          <div className="flex items-start space-x-1.5 flex-1 min-w-0">
            <span className="text-red-400 shrink-0 text-sm">⚠️</span>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-red-300 mr-1.5">{syntaxError ? '[語法錯誤]' : '[執行例外]'}</span>
              <span className="font-mono text-[11px] break-all leading-tight">{activeError}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
            <button onClick={handleCopyErrorReport} title="複製完整除錯報告"
              className="text-[11px] bg-red-800/70 hover:bg-red-700 text-white px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition-all shadow-sm active:scale-95">
              <span>📋</span><span>複製報錯問題</span>
            </button>
            {onClearRuntimeError && !syntaxError && (
              <button onClick={onClearRuntimeError} title="關閉" className="text-red-400 hover:text-red-200 text-xs px-1.5 py-0.5 rounded hover:bg-red-900/40">✕</button>
            )}
          </div>
        </div>
      )}

      {/* 腳本描述 + G-03 版本/changelog */}
      {selectedScript?.description && (
        <div className="bg-dark-bg/60 px-3 py-1.5 text-[11px] text-dark-secondary border-b border-dark-border-subtle/40">
          <div className="flex items-center space-x-1.5">
            <span className="text-blue-400">ℹ️</span>
            <span className="truncate flex-1">{selectedScript.description}</span>
            {selectedScript.targetUrlPattern && (
              <span className="text-[10px] text-dark-muted ml-auto bg-dark-hover px-1.5 py-0.5 rounded border border-dark-border-subtle/40 shrink-0">
                適用: {selectedScript.targetUrlPattern}
              </span>
            )}
          </div>
          {selectedScript.changelog && selectedScript.changelog.length > 0 && (
            <div className="mt-0.5 text-[10px] text-dark-muted">
              📋 {selectedScript.changelog[selectedScript.changelog.length - 1]}
            </div>
          )}
        </div>
      )}

      {/* G-09: 參數化填寫區 */}
      {selectedScript?.params && selectedScript.params.length > 0 && (
        <div className="bg-amber-950/30 border-b border-amber-800/30 px-3 py-2 space-y-1.5">
          <div className="text-[11px] text-amber-300 font-medium flex items-center space-x-1">
            <span>⚙️</span><span>腳本參數 (執行前請填寫)</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {selectedScript.params.map((param: ScriptParam) => (
              <div key={param.name} className="flex items-center space-x-2">
                <label className="text-[11px] text-dark-secondary w-24 shrink-0">{param.label}</label>
                {param.type === 'boolean' ? (
                  <input type="checkbox"
                    checked={paramValues[param.name] === 'true'}
                    onChange={e => setParamValues(prev => ({ ...prev, [param.name]: e.target.checked ? 'true' : 'false' }))}
                    className="accent-blue-500"
                  />
                ) : (
                  <input
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={paramValues[param.name] ?? param.default ?? ''}
                    onChange={e => setParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                    placeholder={param.placeholder || `{{${param.name}}}`}
                    className="flex-1 text-xs bg-dark-bg text-dark-primary border border-amber-800/40 rounded px-2 py-1 focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* G-04: 代碼編輯區塊（Prism overlay 語法高亮）*/}
      <div className="flex-1 relative min-h-[160px] bg-slate-950 flex flex-col overflow-hidden">
        {/* Prism 高亮層 (背景，pointer-events:none) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 p-3 font-mono text-xs leading-relaxed overflow-auto m-0 pointer-events-none whitespace-pre-wrap break-words"
          style={{ tabSize: 2, wordBreak: 'break-word' }}
        >
          <code
            className="language-javascript"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </pre>

        {/* 透明 textarea (前景，接受輸入) */}
        <textarea
          ref={textareaRef}
          value={activeCode}
          onChange={(e) => onChangeCode(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          placeholder="// 在此貼上或編寫 JavaScript 腳本...&#10;// 快捷鍵: Ctrl + Enter 快速執行"
          className="relative w-full flex-1 p-3 bg-transparent text-transparent caret-white font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-blue-600/40"
          spellCheck={false}
          style={{ tabSize: 2, caretColor: '#94a3b8' }}
        />

        <div className="bg-slate-900/80 px-3 py-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center space-x-2">
            <span>JavaScript</span>
            <span>•</span>
            <span>{activeCode.length} 字元</span>
            <span>•</span>
            <span>{activeCode.split('\n').length} 行</span>
            <span>•</span>
            {syntaxError ? (
              <span className="text-red-400 flex items-center space-x-1"><span>✕</span><span>語法錯誤</span></span>
            ) : (
              <span className="text-emerald-400 flex items-center space-x-1"><span>✓</span><span>語法正常</span></span>
            )}
            {Object.keys(paramValues).length > 0 && (
              <><span>•</span><span className="text-amber-400">⚙️ {Object.keys(paramValues).length} 個參數</span></>
            )}
          </span>
          <span className="text-slate-500">Ctrl + Enter 快速執行</span>
        </div>
      </div>

      {/* 另存腳本彈窗 */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border-subtle rounded-xl p-4 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-dark-primary mb-3 flex items-center space-x-1.5">
              <span>💾</span><span>另存為自訂腳本</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-dark-secondary mb-1">腳本名稱</label>
                <input type="text" value={scriptTitle} onChange={e => setScriptTitle(e.target.value)}
                  placeholder="例如：抓取商品清單"
                  className="w-full bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-dark-secondary mb-1">腳本分類</label>
                <select value={scriptCategory} onChange={e => setScriptCategory(e.target.value as ScriptCategory)}
                  className="w-full bg-dark-bg text-dark-primary border border-dark-border-subtle rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500">
                  <option value="custom">自訂腳本 (custom)</option>
                  <option value="pikpak">PikPak 專用 (pikpak)</option>
                  <option value="scraper">資料爬取 (scraper)</option>
                  <option value="automation">流程自動化 (automation)</option>
                  <option value="utility">實用工具 (utility)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end space-x-2">
              <button onClick={() => setShowSaveModal(false)}
                className="text-xs px-3 py-1.5 rounded text-dark-secondary hover:text-dark-primary bg-dark-hover">取消</button>
              <button onClick={handleSave}
                className="text-xs px-3 py-1.5 rounded font-medium bg-blue-600 hover:bg-blue-500 text-white shadow">確認儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
