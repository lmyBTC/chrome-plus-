export interface StockWatchItem {
  ticker: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  currency?: string;
  updatedAt?: string;
  dashboardUrl?: string;
}

export interface FinanceClipperResponse {
  success: boolean;
  watchlist?: StockWatchItem[];
  latestStock?: any;
  extensionId?: string;
  dashboardBaseUrl?: string;
  error?: string;
}

// ----------------------------------------------------
// Gemini Nano AI 跨插件服務化協議型別
// ----------------------------------------------------

export interface FinanceAISummary {
  quickTake: string[];        // 三句話精準速讀 (1~3 點)
  bullCase: string[];         // 多方核心看點 (利多、成長引擎)
  bearCase: string[];         // 空方核心疑慮 (風險、隱憂)
  financialHealth: string;    // 財務健康與估值評價
  rawMarkdown?: string;       // 完整 Markdown 摘要
  generatedAt?: string;       // 產生時間
  model?: string;             // 使用模型 (例如 "Gemini Nano (On-Device)")
}

export interface AIPingRequest {
  type: 'AI_PING' | 'AI_CAPABILITIES';
}

export interface AIPingResponse {
  success: boolean;
  available: boolean;
  model: string;
  error?: string;
}

export interface AIFinanceSummaryRequest {
  type: 'AI_GENERATE_FINANCE_SUMMARY';
  payload: {
    ticker: string;
    name?: string;
    price?: string;
    stats?: Record<string, string>;
    analyst?: {
      consensus?: string;
      targetLow?: string;
      targetMedian?: string;
      targetHigh?: string;
    };
    earnings?: {
      epsActual?: string;
      epsEstimate?: string;
      revenueActual?: string;
      revenueEstimate?: string;
    };
    financials?: any;
    note?: string;
  };
}

export interface AIFinanceSummaryResponse {
  success: boolean;
  summary?: FinanceAISummary;
  cached?: boolean;
  error?: string;
}

// ----------------------------------------------------
// Phase 3: 研報任務化與專注番茄鐘雙向工作流協議型別
// ----------------------------------------------------

export interface CreateTaskPayload {
  protocolVersion?: number;
  ticker?: string;
  title: string;
  notes?: string;
  tags?: string[];
  estimatedPomodoros?: number;
  url?: string;
}

export interface CreateTaskResponse {
  success: boolean;
  taskId?: string;
  duplicate?: boolean;
  error?: string;
}

export interface FocusStartedPayload {
  protocolVersion?: number;
  ticker?: string;
  missionText?: string;
  tags?: string[];
}

