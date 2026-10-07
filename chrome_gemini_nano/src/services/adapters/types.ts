/**
 * Chrome 130+ 原生 Web AI API 矩陣共通型別與參數宣告
 *
 * @related ../webAIGateway.ts (核心路由閘道)
 * @related ../../types.ts     (全域型別匯出)
 */

export type WebAIAvailability = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface WebAIMatrixCapabilities {
  languageModel: WebAIAvailability;
  summarizer: WebAIAvailability;
  writer: WebAIAvailability;
  rewriter: WebAIAvailability;
  translator: WebAIAvailability;
}

export type SummarizerType = 'key-points' | 'tl;dr' | 'teaser' | 'headline';
export type SummarizerFormat = 'markdown' | 'plain-text';
export type SummarizerLength = 'short' | 'medium' | 'long';

export interface SummarizerOptions {
  type?: SummarizerType;
  format?: SummarizerFormat;
  length?: SummarizerLength;
  sharedContext?: string;
  onDownloadProgress?: (loaded: number, total: number) => void;
}

export type WriterTone = 'formal' | 'neutral' | 'casual';
export type WriterFormat = 'markdown' | 'plain-text';
export type WriterLength = 'short' | 'medium' | 'long';

export interface WriterOptions {
  tone?: WriterTone;
  format?: WriterFormat;
  length?: WriterLength;
  sharedContext?: string;
  onDownloadProgress?: (loaded: number, total: number) => void;
}

export type RewriterTone = 'as-is' | 'more-formal' | 'more-casual';
export type RewriterFormat = 'as-is' | 'markdown' | 'plain-text';
export type RewriterLength = 'as-is' | 'shorter' | 'longer';

export interface RewriterOptions {
  tone?: RewriterTone;
  format?: RewriterFormat;
  length?: RewriterLength;
  sharedContext?: string;
  onDownloadProgress?: (loaded: number, total: number) => void;
}

export interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
  onDownloadProgress?: (loaded: number, total: number) => void;
}
