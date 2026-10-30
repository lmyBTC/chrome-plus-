/* 📄 骨架代碼 (typescript): chrome_pk/src/features/toolbox/tools/script-runner/types.ts
 * 原始: 42 行 ➔ 骨架: 41 行 | 減少 ~2.4% 上下文雜訊 */
export type ScriptCategory = 'pikpak' | 'scraper' | 'automation' | 'utility' | 'custom';

export interface ScriptItem {
  id: string;
  title: string;
  description: string;
  code: string;
  category: ScriptCategory;
  targetUrlPattern?: string;
  isPreset?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface ScriptExecutionLog {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
}

export interface ScriptRunResult {
  success: boolean;
  result?: any;
  error?: string;
  logs: ScriptExecutionLog[];
  executionTimeMs: number;
  executedAt: number;
  tabId?: number;
  tabUrl?: string;
  tabTitle?: string;
}

export interface ScriptRunnerState {
  selectedScriptId: string | null;
  activeCode: string;
  isExecuting: boolean;
  lastResult: ScriptRunResult | null;
}
