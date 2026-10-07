/**
 * toneShifter.ts - 專屬 Gemini Nano 調音算子庫
 * 針對社群草稿提供 4 大極速、零延遲的局部文案打磨算子
 * 底層採用 Chrome 130+ ai.rewriter 專用適配器 (RewriterAdapter)，支援 Prompt API 透明降級
 *
 * @related ../../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./adapters/rewriterAdapter.ts      (上游: 原生改寫適配器)
 * @related ../types.ts                        (型別: ToneShiftMode, ToneShiftResult)
 * @related ../components/SocialDispatcher.tsx (下游: UI 消費者)
 */

import { RewriterAdapter } from './adapters/rewriterAdapter';
import { ToneShiftMode, ToneShiftResult } from '../types';

export class ToneShifter {
  private static instance: ToneShifter;
  private rewriter = RewriterAdapter.getInstance();

  private constructor() {}

  public static getInstance(): ToneShifter {
    if (!ToneShifter.instance) {
      ToneShifter.instance = new ToneShifter();
    }
    return ToneShifter.instance;
  }

  /**
   * 1. 觀點銳化 (Sharpen)：消除被動語態，直接將最強烈之反常識結論或數據移至首句
   */
  public async sharpen(text: string): Promise<ToneShiftResult> {
    const shifted = await this.rewriter.rewrite(
      text,
      {
        tone: 'more-formal',
        format: 'plain-text',
        sharedContext: 'Move core counter-intuitive data or findings directly to the very first sentence. Remove passive voice and corporate fillers. Keep confident and punchy. Preserve all quantitative figures and URLs.',
      }
    );

    return {
      mode: 'sharpen',
      original: text,
      shifted,
    };
  }

  /**
   * 2. 字數壓線 (Fit 280)：將英文精準壓縮在 240~270 字元之間，保留原始數字與 URL
   */
  public async fit280(text: string): Promise<ToneShiftResult> {
    const shifted = await this.rewriter.rewrite(
      text,
      {
        length: 'shorter',
        format: 'plain-text',
        sharedContext: 'Rewrite strictly under 270 characters (aim for 240-265 characters) for Twitter/X. Preserve all metric numbers, ticker symbols ($TICKER), and URLs without mid-sentence truncation.',
      }
    );

    return {
      mode: 'fit280',
      original: text,
      shifted,
    };
  }

  /**
   * 3. 在地去油 (De-jargon)：消除「賦能、閉環、抓手、底層邏輯」等詞彙，轉換為台灣科技與投資圈口語
   */
  public async dejargon(text: string): Promise<ToneShiftResult> {
    const shifted = await this.rewriter.rewrite(
      text,
      {
        tone: 'more-casual',
        format: 'plain-text',
        sharedContext: '嚴格過濾「賦能、閉環、抓手、打法、落地、底層邏輯、背書」等非台灣本土語彙，替換為自然、在地的台灣繁體中文口語表達。段落自然分行，保留關鍵數字與原始網址。',
      }
    );

    return {
      mode: 'dejargon',
      original: text,
      shifted,
    };
  }

  /**
   * 4. 長文切 Thread 與金句提煉 (Split Thread & Punchline)：將長文重組為 3 則帶有編號的推文鏈
   */
  public async splitThread(text: string): Promise<ToneShiftResult> {
    const shifted = await this.rewriter.rewrite(
      text,
      {
        format: 'plain-text',
        sharedContext: 'Split and structure into a 3-part thread (labeled 1/3, 2/3, 3/3). Part 1: Punchy hook and surprising data. Part 2: Deep mechanism analysis. Part 3: Takeaway and reference URL. Separate each tweet with "---TWEET---".',
      }
    );

    return {
      mode: 'splitThread',
      original: text,
      shifted,
    };
  }

  /**
   * 統一呼叫調音算子
   */
  public async shift(mode: ToneShiftMode, text: string): Promise<ToneShiftResult> {
    switch (mode) {
      case 'sharpen':
        return this.sharpen(text);
      case 'fit280':
        return this.fit280(text);
      case 'dejargon':
        return this.dejargon(text);
      case 'splitThread':
        return this.splitThread(text);
      default:
        throw new Error(`未知的調音模式: ${mode}`);
    }
  }
}
