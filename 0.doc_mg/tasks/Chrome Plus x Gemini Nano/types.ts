/**
 * 社群分發器資料模型與狀態型別宣告
 *
 * @related ./chrome_plus_x_gemini_nano.md  (核心任務看板 Phase 2.2)
 * @related ./toneShifter.ts                (消費者: ToneShiftMode)
 * @related ./SocialDispatcher.tsx           (消費者: SocialPostDraft)
 */

export interface SocialPostDraft {
  x_en: string;
  threads_zh: string;
  originalTitle: string;
  originalSummary: string;
  sourceUrl: string;
  tags?: string[];
}

export type ToneShiftMode = 'sharpen' | 'fit280' | 'dejargon' | 'splitThread';

export type DispatchStepStatus = 
  | 'idle'
  | 'extracting'
  | 'generating'
  | 'dedup_checking'
  | 'publishing_x'
  | 'publishing_threads'
  | 'appending_rss'
  | 'success'
  | 'error';

export interface DedupCheckResult {
  is_duplicate: boolean;
  similarity: number;
  matched_sample?: string;
  message?: string;
}

export interface RssAppendResult {
  status: 'success' | 'error';
  message: string;
  item_title?: string;
}

export interface ToneShiftResult {
  mode: ToneShiftMode;
  original: string;
  shifted: string;
}