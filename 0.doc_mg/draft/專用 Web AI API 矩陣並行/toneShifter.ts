/**
 * toneShifter.ts - 專屬 Web AI 原生改寫算子庫
 * Chrome 130+ 升級版：解耦純手工 Prompt，全面對接 RewriterAdapter 與專用小模型參數
 */

import { RewriterAdapter } from '@/core/ai/adapters/rewriterAdapter';
import { NanoService } from '@/core/ai/nanoService';
import { ToneShiftMode, ToneShiftResult } from './types';

export class ToneShifter {
  private static instance: ToneShifter;
  private rewriter = RewriterAdapter.getInstance();
  private nano = NanoService.getInstance();

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
    const context = 'Sharpen this draft: move the core counter-intuitive data or finding directly to the first sentence. Remove passive voice and fillers. Keep decisive and punchy. Preserve all quantitative metrics and URLs.';
    
    // 優先使用專用 Rewriter
    const shifted = await this.rewriter.rewrite(
      text,
      { tone: 'as-is', length: 'as-is', format: 'plain-text' },
      context
    );

    return {
      mode: 'sharpen',
      original: text,
      shifted: shifted.trim()
    };
  }

  /**
   * 2. 字數壓線 (Fit 280)：使用原生 length: 'shorter' 與字數限制參數
   */
  public async fit280(text: string): Promise<ToneShiftResult> {
    const context = 'Rewrite strictly between 240-270 characters for X/Twitter. Preserve all tickers ($TICKER), metric numbers, and URLs without mid-sentence truncation.';
    const shifted = await this.rewriter.fitShorter(text, context);

    return {
      mode: 'fit280',
      original: text,
      shifted: shifted.trim()
    };
  }

  /**
   * 3. 在地去油 (De-jargon)：消除「賦能、閉環、抓手、底層邏輯」等詞彙
   */
  public async dejargon(text: string): Promise<ToneShiftResult> {
    const shifted = await this.rewriter.dejargon(text);

    return {
      mode: 'dejargon',
      original: text,
      shifted: shifted.trim()
    };
  }

  /**
   * 4. 長文切 Thread (Split Thread)：將長文重組為 3 則帶有編號 (1/3, 2/3, 3/3) 的推文鏈
   */
  public async splitThread(text: string): Promise<ToneShiftResult> {
    const context = 'Split and reorganize this post into a 3-part Twitter thread (1/3, 2/3, 3/3). Part 1: Hook & Core Data; Part 2: Mechanism breakdown; Part 3: Forward takeaway & URL. Separate parts strictly with "---TWEET---".';
    
    let shifted = '';
    if (await this.rewriter.isAvailable()) {
      shifted = await this.rewriter.rewrite(
        text,
        { format: 'plain-text', length: 'as-is' },
        context
      );
    } else {
      // 備援調用 Nano Prompt
      const session = await this.nano.getOrCreateSession({
        systemPrompt: 'You are a Twitter Thread architect. Split content into 3 tweets labeled 1/3, 2/3, 3/3 separated by "---TWEET---".',
        temperature: 0.2
      });
      shifted = await session.prompt(text);
    }

    return {
      mode: 'splitThread',
      original: text,
      shifted: shifted.trim()
    };
  }

  /**
   * 統一調度調音算子
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

  public destroy(): void {
    this.rewriter.destroySession();
  }
}