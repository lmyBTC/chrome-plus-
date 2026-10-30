export type ScriptCategory = 'pikpak' | 'scraper' | 'automation' | 'utility' | 'custom';

// G-09: 腳本參數定義
export interface ScriptParam {
  name: string;       // 模板替換鍵名，對應 {{NAME}}
  label: string;      // UI 顯示標籤
  type: 'text' | 'number' | 'boolean';
  default?: string;
  placeholder?: string;
}

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
  // G-03: 版本化
  version?: string;
  changelog?: string[];
  // G-09: 參數化
  params?: ScriptParam[];
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface ScriptExecutionLog {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
}

// G-05: 執行進度
export interface ScriptRunProgress {
  percent: number;     // 0~100
  message?: string;
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
  scriptTitle?: string;  // G-01: 歷程顯示用
}

// G-01/G-11: 執行歷程條目
export interface ScriptHistoryEntry {
  id: string;           // `history_${timestamp}`
  scriptId: string;
  scriptTitle: string;
  executedAt: number;
  executionTimeMs: number;
  success: boolean;
  result?: any;
  error?: string;
  logs: ScriptExecutionLog[];
  tabUrl?: string;
  tabTitle?: string;
}

// G-07: Diff 結果節點
export type DiffNodeType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DiffNode {
  key: string;
  type: DiffNodeType;
  prev?: any;
  curr?: any;
  children?: DiffNode[];
}

export interface ScriptRunnerState {
  selectedScriptId: string | null;
  activeCode: string;
  isExecuting: boolean;
  lastResult: ScriptRunResult | null;
}
