/**
 * googleSheetsExporter.ts - Finance Research Clipper Google Sheets 估值沙盒型別與合約定義
 * 
 * 對應原生模組：finance-research-clipper-oss/googleSheetsExporter.js
 * 
 * @version 1.0.0
 * @date 2026-10-08
 */

export interface StockData {
  ticker: string;
  name?: string;
  companyName?: string;
  price?: string | number;
  pe?: string | number;
  yield?: string | number;
  targetPrice?: string | number;
  target_price_median?: string;
  analystTargetPrice?: string;
  analyst_consensus?: string;
  stats?: Record<string, string>;
  keyStats?: Record<string, string>;
  analyst?: {
    consensus?: string;
    targetMedian?: string;
    targetPrice?: string | {
      median?: string;
      high?: string;
      low?: string;
    };
  };
  aiSummary?: string | {
    counterIntuitive?: string;
    bullCase?: string;
    bearCase?: string;
    rawMarkdown?: string;
  };
  currentAiSummary?: any;
  note?: string;
}

export interface PortfolioPayloadData {
  ticker: string;
  name: string;
  price: string;
  pe: string;
  yield: string;
  targetPrice: string;
  notes: string;
  aiDigest: string;
}

export interface PortfolioWebhookEnvelope {
  protocolVersion: number;
  action: "SYNC_PORTFOLIO";
  type: "SYNC_PORTFOLIO";
  secretToken?: string;
  timestamp: number;
  payload: PortfolioPayloadData;
  ticker: string;
  name: string;
  price: string;
  pe: string;
  yield: string;
  targetPrice: string;
  notes: string;
  aiDigest: string;
}

export interface SyncResult {
  success: boolean;
  ticker: string;
  mode?: "inserted" | "updated" | "upserted";
  row?: number;
  message: string;
  error?: string;
  details?: any;
}

export interface BatchSyncResult {
  success: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  results: SyncResult[];
  message: string;
}

export interface ExporterOptions {
  gasUrl?: string;
  secretToken?: string;
  userNote?: string;
  timeoutMs?: number;
}

export declare const GoogleSheetsExporter: {
  buildPortfolioPayload(stock: StockData, options?: ExporterOptions): PortfolioWebhookEnvelope;
  syncSingleStock(stock: StockData, options?: ExporterOptions): Promise<SyncResult>;
  syncBatchStocks(stocks: StockData[], options?: ExporterOptions): Promise<BatchSyncResult>;
  extractPe(stock: StockData): string;
  extractYield(stock: StockData): string;
  extractTargetPrice(stock: StockData): string;
  extractCoreDigest(stock: StockData, userNote?: string): string;
  sendToGasWebhook(gasUrl: string, payload: PortfolioWebhookEnvelope, timeoutMs?: number): Promise<any>;
};
