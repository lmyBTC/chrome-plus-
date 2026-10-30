import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ScriptItem, ScriptCategory, ScriptRunResult, ScriptHistoryEntry } from './types';
import { PRESET_SCRIPTS } from './presets';
import { executeScriptOnActiveTab, executeScriptOnTabs, getWindowTabs } from './services/scriptExecutionService';
import { ScriptEditor } from './components/ScriptEditor';
import { ScriptConsole } from './components/ScriptConsole';

const STORAGE_KEYS = {
  CUSTOM_SCRIPTS: 'pk_custom_scripts',
  ACTIVE_SCRIPT_ID: 'pk_active_script_id',
  DRAFT_CODE: 'pk_draft_code',
  HISTORY: 'pk_script_runner_history',  // G-01/G-11
};

const HISTORY_CAP = 20; // G-01: 環形佇列上限

export interface ScriptRunnerProps {
  isSidebar?: boolean;
}

export const ScriptRunner: React.FC<ScriptRunnerProps> = ({ isSidebar = false }) => {
  const [selectedScript, setSelectedScript] = useState<ScriptItem | null>(PRESET_SCRIPTS[0]);
  const [activeCode, setActiveCode] = useState<string>(PRESET_SCRIPTS[0].code);
  const [customScripts, setCustomScripts] = useState<ScriptItem[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ScriptRunResult | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(true);
  // G-01/G-11: 歷史佇列
  const [history, setHistory] = useState<ScriptHistoryEntry[]>([]);
  // G-05: AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const [progressMessage, setProgressMessage] = useState<string | undefined>(undefined);
  // G-02: 多分頁模式
  const [multiTabMode, setMultiTabMode] = useState<boolean>(false);
  const [windowTabs, setWindowTabs] = useState<chrome.tabs.Tab[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<Set<number>>(new Set());

  // 1. 初始化：讀取 Storage（含 G-11 歷史還原）
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const res = await chrome.storage.local.get([
            STORAGE_KEYS.CUSTOM_SCRIPTS,
            STORAGE_KEYS.ACTIVE_SCRIPT_ID,
            STORAGE_KEYS.DRAFT_CODE,
            STORAGE_KEYS.HISTORY,
          ]);

          const savedCustom: ScriptItem[] = res[STORAGE_KEYS.CUSTOM_SCRIPTS] || [];
          setCustomScripts(savedCustom);

          // G-11: 還原歷史
          const savedHistory: ScriptHistoryEntry[] = res[STORAGE_KEYS.HISTORY] || [];
          setHistory(savedHistory);

          const lastId: string = res[STORAGE_KEYS.ACTIVE_SCRIPT_ID];
          const draftCode: string = res[STORAGE_KEYS.DRAFT_CODE];

          if (lastId) {
            const foundPreset = PRESET_SCRIPTS.find(s => s.id === lastId);
            const foundCustom = savedCustom.find(s => s.id === lastId);
            if (foundPreset) {
              setSelectedScript(foundPreset);
              setActiveCode(draftCode || foundPreset.code);
            } else if (foundCustom) {
              setSelectedScript(foundCustom);
              setActiveCode(draftCode || foundCustom.code);
            } else if (lastId === 'scratchpad') {
              setSelectedScript({ id: 'scratchpad', title: '自訂草稿腳本', description: '隨選即時編輯與注入', code: draftCode || '', category: 'custom', createdAt: Date.now(), updatedAt: Date.now() });
              setActiveCode(draftCode || '');
            }
          }
        }
      } catch { /* 容錯防護 */ } finally {
        setIsLoadingStorage(false);
      }
    };
    loadStoredData();
  }, []);

  // G-02: 多分頁模式啟動時，查詢視窗分頁
  useEffect(() => {
    if (multiTabMode) {
      getWindowTabs().then(tabs => {
        setWindowTabs(tabs);
        setSelectedTabIds(new Set()); // 重置選擇
      });
    } else {
      setWindowTabs([]);
      setSelectedTabIds(new Set());
    }
  }, [multiTabMode]);

  // G-01/G-11: 推入歷史佇列並持久化
  const pushHistory = useCallback(async (result: ScriptRunResult, scriptTitle: string) => {
    const entry: ScriptHistoryEntry = {
      id: `history_${Date.now()}`,
      scriptId: selectedScript?.id || 'scratchpad',
      scriptTitle,
      executedAt: result.executedAt,
      executionTimeMs: result.executionTimeMs,
      success: result.success,
      result: result.result,
      error: result.error,
      logs: result.logs,
      tabUrl: result.tabUrl,
      tabTitle: result.tabTitle,
    };

    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, HISTORY_CAP);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
      }
      return updated;
    });
  }, [selectedScript]);

  // 2. 切換腳本
  const handleSelectScript = useCallback((script: ScriptItem) => {
    setSelectedScript(script);
    setActiveCode(script.code);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: script.id, [STORAGE_KEYS.DRAFT_CODE]: script.code });
    }
  }, []);

  // 3. 變更代碼
  const handleChangeCode = useCallback((newCode: string) => {
    setActiveCode(newCode);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEYS.DRAFT_CODE]: newCode });
    }
  }, []);

  // 4. 儲存自訂腳本
  const handleSaveCustomScript = useCallback(async (title: string, category: ScriptCategory, code: string) => {
    const now = Date.now();
    const newScript: ScriptItem = { id: `custom_${now}`, title, description: '自訂隨選注入腳本', code, category, isPreset: false, createdAt: now, updatedAt: now };
    const updated = [newScript, ...customScripts];
    setCustomScripts(updated);
    setSelectedScript(newScript);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated, [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: newScript.id, [STORAGE_KEYS.DRAFT_CODE]: code });
    }
  }, [customScripts]);

  // 5. 刪除自訂腳本
  const handleDeleteCustomScript = useCallback(async (id: string) => {
    const updated = customScripts.filter(s => s.id !== id);
    setCustomScripts(updated);
    if (selectedScript?.id === id) {
      const fallback = PRESET_SCRIPTS[0];
      setSelectedScript(fallback);
      setActiveCode(fallback.code);
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated, [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: fallback.id, [STORAGE_KEYS.DRAFT_CODE]: fallback.code });
      }
    } else {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated });
      }
    }
  }, [customScripts, selectedScript]);

  // 6. 執行腳本（G-02 多分頁 + G-05 AbortController）
  const handleExecute = useCallback(async (resolvedCode: string) => {
    if (isExecuting || !resolvedCode.trim()) return;

    // G-05: 建立 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsExecuting(true);
    setProgressPercent(0);
    setProgressMessage('注入腳本中...');

    try {
      if (multiTabMode && selectedTabIds.size > 0) {
        // G-02: 批次多分頁執行
        const tabIds = Array.from(selectedTabIds);
        setProgressMessage(`對 ${tabIds.length} 個分頁執行...`);
        const results = await executeScriptOnTabs(tabIds, resolvedCode, { signal: controller.signal });
        setProgressPercent(100);

        // 彙整結果為主顯示（取第一個成功結果或最後一個）
        const primaryResult = results.find(r => r.success) || results[results.length - 1];
        if (primaryResult) {
          const multiTabResult: ScriptRunResult = {
            ...primaryResult,
            result: { multiTabResults: results.map(r => ({ tabId: r.tabId, tabTitle: r.tabTitle, tabUrl: r.tabUrl, success: r.success, result: r.result, error: r.error })) },
          };
          setLastResult(multiTabResult);
          await pushHistory(multiTabResult, selectedScript?.title || '自訂腳本');
        }
      } else {
        // 單分頁執行
        setProgressMessage('注入並執行...');
        const res = await executeScriptOnActiveTab(resolvedCode, { signal: controller.signal });
        setProgressPercent(100);
        setLastResult(res);
        await pushHistory(res, selectedScript?.title || '自訂腳本');
      }
    } catch (err: any) {
      const errResult: ScriptRunResult = { success: false, error: err.message || '腳本執行失敗', logs: [], executionTimeMs: 0, executedAt: Date.now() };
      setLastResult(errResult);
    } finally {
      setIsExecuting(false);
      abortControllerRef.current = null;
      setTimeout(() => { setProgressPercent(undefined); setProgressMessage(undefined); }, 800);
    }
  }, [isExecuting, multiTabMode, selectedTabIds, selectedScript, pushHistory]);

  // G-05: 中止執行
  const handleAbort = useCallback(() => {
    abortControllerRef.current?.abort();
    setProgressMessage('正在中止...');
  }, []);

  // G-01: 清空歷史
  const handleClearHistory = useCallback(async () => {
    setHistory([]);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    }
  }, []);

  if (isLoadingStorage) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-secondary">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        <span className="text-xs">載入腳本環境...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* G-02: 多分頁模式控制列 */}
      <div className="flex items-center space-x-2 px-0.5">
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <div
            onClick={() => setMultiTabMode(v => !v)}
            className={`w-8 h-4 rounded-full transition-colors relative ${multiTabMode ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow ${multiTabMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-dark-secondary">多分頁批次模式</span>
        </label>
      </div>

      {/* G-02: 多分頁選擇器 */}
      {multiTabMode && windowTabs.length > 0 && (
        <div className="bg-dark-card border border-dark-border-subtle rounded-lg px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-dark-secondary font-medium">選擇目標分頁（已選 {selectedTabIds.size} / {windowTabs.length}）</span>
            <div className="flex space-x-1.5">
              <button onClick={() => setSelectedTabIds(new Set(windowTabs.map(t => t.id!)))}
                className="text-[10px] text-blue-400 hover:text-blue-300">全選</button>
              <button onClick={() => setSelectedTabIds(new Set())}
                className="text-[10px] text-dark-muted hover:text-dark-secondary">清除</button>
            </div>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
            {windowTabs.map(tab => (
              <label key={tab.id} className="flex items-center space-x-2 cursor-pointer hover:bg-dark-hover rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={selectedTabIds.has(tab.id!)}
                  onChange={e => {
                    setSelectedTabIds(prev => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(tab.id!); else next.delete(tab.id!);
                      return next;
                    });
                  }}
                  className="accent-blue-500"
                />
                <span className="text-[11px] text-dark-secondary truncate max-w-[200px]">{tab.title || tab.url}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 主內容：上下分欄（側邊欄）或左右雙欄 */}
      <div className={`flex-1 min-h-0 ${isSidebar ? 'flex flex-col space-y-3' : 'grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-200px)]'}`}>
        <div className={`min-h-[260px] ${isSidebar ? 'h-[46%]' : 'h-full'}`}>
          <ScriptEditor
            activeCode={activeCode}
            onChangeCode={handleChangeCode}
            onExecute={handleExecute}
            isExecuting={isExecuting}
            selectedScript={selectedScript}
            onSelectScript={handleSelectScript}
            onSaveCustomScript={handleSaveCustomScript}
            customScripts={customScripts}
            onDeleteCustomScript={handleDeleteCustomScript}
            runtimeError={lastResult?.error || null}
            onClearRuntimeError={() => setLastResult(prev => prev ? { ...prev, error: undefined } : null)}
            tabInfo={{ url: lastResult?.tabUrl, title: lastResult?.tabTitle }}
            isSidebar={isSidebar}
          />
        </div>

        <div className={`min-h-[240px] ${isSidebar ? 'h-[50%]' : 'h-full'}`}>
          <ScriptConsole
            result={lastResult}
            isExecuting={isExecuting}
            onClear={() => setLastResult(null)}
            isSidebar={isSidebar}
            progressPercent={progressPercent}
            progressMessage={progressMessage}
            onAbort={handleAbort}
            history={history}
            onClearHistory={handleClearHistory}
          />
        </div>
      </div>
    </div>
  );
};
