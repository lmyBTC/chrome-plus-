/**
 * SummarizerAdapter - Chrome 130+ 專用摘要模型適配器 (ai.summarizer)
 * 具備原生 Key-Points 與 TL;DR 雙模式摘要能力，並在專用 API 未就緒時透明降級為 NanoService 通用 Prompt
 */

import { NanoService } from '../nanoService';

export type SummarizerType = 'key-points' | 'tl-dr' | 'teaser' | 'headline';
export type SummarizerFormat = 'markdown' | 'plain-text';
export type SummarizerLength = 'short' | 'medium' | 'long';

export interface SummarizerOptions {
  type?: SummarizerType;
  format?: SummarizerFormat;
  length?: SummarizerLength;
  sharedContext?: string;
}

export class SummarizerAdapter {
  private static instance: SummarizerAdapter;
  private nano = NanoService.getInstance();
  private activeSummarizer: any = null;
  private currentConfig: string = '';

  private constructor() {}

  public static getInstance(): SummarizerAdapter {
    if (!SummarizerAdapter.instance) {
      SummarizerAdapter.instance = new SummarizerAdapter();
    }
    return SummarizerAdapter.instance;
  }

  /**
   * 取得瀏覽器底層 ai.summarizer 物件
   */
  private getAISummarizerCore(): any {
    if (typeof self !== 'undefined' && (self as any).ai?.summarizer) {
      return (self as any).ai.summarizer;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.summarizer) {
      return (window as any).ai.summarizer;
    }
    return null;
  }

  /**
   * 檢查專用 Summarizer API 是否可用
   */
  public async isAvailable(): Promise<boolean> {
    const core = this.getAISummarizerCore();
    if (!core) return false;

    try {
      if (typeof core.capabilities === 'function') {
        const caps = await core.capabilities();
        return caps.available === 'readily' || caps.available === 'after-download';
      }
      return typeof core.create === 'function';
    } catch (_err) {
      return false;
    }
  }

  /**
   * 建立或重用摘要會話實例 (若設定不同則自動重建)
   */
  private async getOrCreateSession(options: SummarizerOptions = {}): Promise<any> {
    const configHash = JSON.stringify({
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'short',
      sharedContext: options.sharedContext || ''
    });

    if (this.activeSummarizer && this.currentConfig === configHash) {
      return this.activeSummarizer;
    }

    this.destroySession();

    const core = this.getAISummarizerCore();
    if (!core) {
      throw new Error('當前環境不支援 Chrome 專用 ai.summarizer API');
    }

    const createParams: any = {
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'short'
    };

    if (options.sharedContext) {
      createParams.sharedContext = options.sharedContext;
    }

    this.activeSummarizer = await core.create(createParams);
    this.currentConfig = configHash;
    return this.activeSummarizer;
  }

  /**
   * 執行文字摘要 (阻塞式)
   */
  public async summarize(text: string, options: SummarizerOptions = {}, context?: string): Promise<string> {
    const canUseSpecialized = await this.isAvailable();

    if (canUseSpecialized) {
      try {
        const session = await this.getOrCreateSession(options);
        const summarizeParams: any = context ? { context } : undefined;
        return await session.summarize(text, summarizeParams);
      } catch (err) {
        console.warn('[SummarizerAdapter] 專用 Summarizer 失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    // 備援路徑：由通用 Prompt API 處理
    const prompt = `Summarize the following text as ${options.type || 'key points'} in ${options.format || 'markdown'} format (${options.length || 'short'} length)${context ? `. Additional context: ${context}` : ''}:\n\n${text}`;
    return await this.nano.prompt(prompt);
  }

  /**
   * 執行文字摘要 (串流輸出)
   */
  public async summarizeStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: SummarizerOptions = {},
    context?: string
  ): Promise<string> {
    const canUseSpecialized = await this.isAvailable();

    if (canUseSpecialized) {
      try {
        const session = await this.getOrCreateSession(options);
        const summarizeParams: any = context ? { context } : undefined;
        const stream = session.summarizeStreaming(text, summarizeParams);
        let fullResult = '';

        for await (const chunk of stream) {
          fullResult = chunk;
          onChunk(fullResult);
        }
        return fullResult;
      } catch (err) {
        console.warn('[SummarizerAdapter] 串流摘要失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    // 備援路徑：由通用 Prompt API 串流處理
    const prompt = `Summarize the following text as ${options.type || 'key points'} (${options.length || 'short'} length):\n\n${text}`;
    return await this.nano.promptStreaming(prompt, onChunk);
  }

  /**
   * 釋放會話資源與顯存
   */
  public destroySession(): void {
    if (this.activeSummarizer?.destroy) {
      try {
        this.activeSummarizer.destroy();
      } catch (_e) {
        // 忽略釋放過程中的非致命異常
      } finally {
        this.activeSummarizer = null;
        this.currentConfig = '';
      }
    }
  }
}