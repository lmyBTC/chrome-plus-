import React, { useState, useEffect, useCallback } from 'react';
import { ScriptItem, ScriptCategory, ScriptRunResult } from './types';
import { PRESET_SCRIPTS } from './presets';
import { executeScriptOnActiveTab } from './services/scriptExecutionService';
import { ScriptEditor } from './components/ScriptEditor';
import { ScriptConsole } from './components/ScriptConsole';

const STORAGE_KEYS = {
  CUSTOM_SCRIPTS: 'pk_custom_scripts',
  ACTIVE_SCRIPT_ID: 'pk_active_script_id',
  DRAFT_CODE: 'pk_draft_code',
};

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

  // 1. 初始化讀取 Storage 資料
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get([
            STORAGE_KEYS.CUSTOM_SCRIPTS,
            STORAGE_KEYS.ACTIVE_SCRIPT_ID,
            STORAGE_KEYS.DRAFT_CODE,
          ]);

          const savedCustom: ScriptItem[] = res[STORAGE_KEYS.CUSTOM_SCRIPTS] || [];
          setCustomScripts(savedCustom);

          const lastId: string = res[STORAGE_KEYS.ACTIVE_SCRIPT_ID];
          const draftCode: string = res[STORAGE_KEYS.DRAFT_CODE];

          if (lastId) {
            const foundPreset = PRESET_SCRIPTS.find((s) => s.id === lastId);
            const foundCustom = savedCustom.find((s) => s.id === lastId);
            if (foundPreset) {
              setSelectedScript(foundPreset);
              setActiveCode(draftCode || foundPreset.code);
            } else if (foundCustom) {
              setSelectedScript(foundCustom);
              setActiveCode(draftCode || foundCustom.code);
            } else if (lastId === 'scratchpad') {
              setSelectedScript({
                id: 'scratchpad',
                title: '自訂草稿腳本',
                description: '隨選即時編輯與注入',
                code: draftCode || '',
                category: 'custom',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
              setActiveCode(draftCode || '');
            }
          }
        }
      } catch {
        // 容錯防護
      } finally {
        setIsLoadingStorage(false);
      }
    };

    loadStoredData();
  }, []);

  // 2. 切換或選擇腳本
  const handleSelectScript = useCallback(
    (script: ScriptItem) => {
      setSelectedScript(script);
      setActiveCode(script.code);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: script.id,
          [STORAGE_KEYS.DRAFT_CODE]: script.code,
        });
      }
    },
    []
  );

  // 3. 變更編輯器代碼（暫存至 storage）
  const handleChangeCode = useCallback(
    (newCode: string) => {
      setActiveCode(newCode);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          [STORAGE_KEYS.DRAFT_CODE]: newCode,
        });
      }
    },
    []
  );

  // 4. 儲存自訂腳本
  const handleSaveCustomScript = useCallback(
    async (title: string, category: ScriptCategory, code: string) => {
      const now = Date.now();
      const newScript: ScriptItem = {
        id: `custom_${now}`,
        title,
        description: '自訂隨選注入腳本',
        code,
        category,
        isPreset: false,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newScript, ...customScripts];
      setCustomScripts(updated);
      setSelectedScript(newScript);

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated,
          [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: newScript.id,
          [STORAGE_KEYS.DRAFT_CODE]: code,
        });
      }
    },
    [customScripts]
  );

  // 5. 刪除自訂腳本
  const handleDeleteCustomScript = useCallback(
    async (id: string) => {
      const updated = customScripts.filter((s) => s.id !== id);
      setCustomScripts(updated);

      if (selectedScript?.id === id) {
        const fallback = PRESET_SCRIPTS[0];
        setSelectedScript(fallback);
        setActiveCode(fallback.code);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({
            [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated,
            [STORAGE_KEYS.ACTIVE_SCRIPT_ID]: fallback.id,
            [STORAGE_KEYS.DRAFT_CODE]: fallback.code,
          });
        }
      } else {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({
            [STORAGE_KEYS.CUSTOM_SCRIPTS]: updated,
          });
        }
      }
    },
    [customScripts, selectedScript]
  );

  // 6. 執行腳本
  const handleExecute = useCallback(async () => {
    if (isExecuting || !activeCode.trim()) return;

    setIsExecuting(true);
    try {
      const res = await executeScriptOnActiveTab(activeCode);
      setLastResult(res);
    } catch (err: any) {
      setLastResult({
        success: false,
        error: err.message || '腳本注入執行失敗',
        logs: [],
        executionTimeMs: 0,
        executedAt: Date.now(),
      });
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, activeCode]);

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
      {/* 快捷精選腳本標籤列 */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[11px] text-dark-muted shrink-0 font-medium mr-1">推薦模板:</span>
        {PRESET_SCRIPTS.map((preset) => {
          const isSelected = selectedScript?.id === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectScript(preset)}
              title={preset.description}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-all border shrink-0 ${
                isSelected
                  ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-bold'
                  : 'bg-dark-card border-dark-border-subtle/80 text-dark-secondary hover:text-dark-primary hover:border-slate-600'
              }`}
            >
              {preset.title.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {/* 主內容區塊：在側邊欄模式為上下分欄，在大螢幕為左右雙欄 */}
      <div
        className={`flex-1 min-h-0 ${
          isSidebar
            ? 'flex flex-col space-y-3'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-180px)]'
        }`}
      >
        {/* 左側 / 上方：代碼編輯器 */}
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
            onClearRuntimeError={() => setLastResult((prev) => (prev ? { ...prev, error: undefined } : null))}
            tabInfo={{ url: lastResult?.tabUrl, title: lastResult?.tabTitle }}
            isSidebar={isSidebar}
          />
        </div>

        {/* 右側 / 下方：Console 與結果控制台 */}
        <div className={`min-h-[240px] ${isSidebar ? 'h-[50%]' : 'h-full'}`}>
          <ScriptConsole
            result={lastResult}
            isExecuting={isExecuting}
            onClear={() => setLastResult(null)}
            isSidebar={isSidebar}
          />
        </div>
      </div>
    </div>
  );
};
