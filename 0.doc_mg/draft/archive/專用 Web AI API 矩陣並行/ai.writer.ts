/**
 * WriterAdapter - Chrome 130+ 專用寫作模型適配器 (ai.writer)
 * 專為社群貼文初稿、研報大綱與 GTD 任務說明設計的高效小模型，支援語調、格式與長度控制
 */

import { NanoService } from '../nanoService';

export type WriterTone = 'formal' | 'neutral' | 'casual';
export type WriterFormat = 'plain-text' | 'markdown';
export type WriterLength = 'short' | 'medium' | 'long';

export interface WriterOptions {
  tone?: WriterTone;
  format?: WriterFormat;
  length?: WriterLength;
  sharedContext?: string;
}

export class WriterAdapter {
  private static instance: WriterAdapter;
  private nano = NanoService.getInstance();
  private activeWriter: any = null;
  private currentConfig: string = '';

  private constructor() {}

  public static getInstance(): WriterAdapter {
    if (!WriterAdapter.instance) {
      WriterAdapter.instance = new WriterAdapter();
    }
    return WriterAdapter.instance;
  }

  private getAIWriterCore(): any {
    if (typeof self !== 'undefined' && (self as any).ai?.writer) {
      return (self as any).ai.writer;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.writer) {
      return (window as any).ai.writer;
    }
    return null;
  }

  public async isAvailable(): Promise<boolean> {
    const core = this.getAIWriterCore();
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

  private async getOrCreateSession(options: WriterOptions = {}): Promise<any> {
    const configHash = JSON.stringify({
      tone: options.tone || 'neutral',
      format: options.format || 'markdown',
      length: options.length || 'short',
      sharedContext: options.sharedContext || ''
    });

    if (this.activeWriter && this.currentConfig === configHash) {
      return this.activeWriter;
    }

    this.destroySession();

    const core = this.getAIWriterCore();
    if (!core) {
      throw new Error('當前環境不支援 Chrome 專用 ai.writer API');
    }

    const createParams: any = {
      tone: options.tone || 'neutral',
      format: options.format || 'markdown',
      length: options.length || 'short'
    };

    if (options.sharedContext) {
      createParams.sharedContext = options.sharedContext;
    }

    this.activeWriter = await core.create(createParams);
    this.currentConfig = configHash;
    return this.activeWriter;
  }

  /**
   * 生成文字初稿
   */
  public async write(writingPrompt: string, options: WriterOptions = {}, context?: string): Promise<string> {
    const canUseSpecialized = await this.isAvailable();

    if (canUseSpecialized) {
      try {
        const session = await this.getOrCreateSession(options);
        const writeParams: any = context ? { context } : undefined;
        return await session.write(writingPrompt, writeParams);
      } catch (err) {
        console.warn('[WriterAdapter] 專用 ai.writer 執行失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    // 備援路徑：由通用 Prompt API 處理
    const fallbackPrompt = `Write content based on the following instruction. Tone: ${options.tone || 'neutral'}, Format: ${options.format || 'markdown'}, Length: ${options.length || 'short'}${context ? `. Context: ${context}` : ''}:\n\n${writingPrompt}`;
    return await this.nano.prompt(fallbackPrompt);
  }

  /**
   * 串流生成文字初稿
   */
  public async writeStreaming(
    writingPrompt: string,
    onChunk: (chunk: string) => void,
    options: WriterOptions = {},
    context?: string
  ): Promise<string> {
    const canUseSpecialized = await this.isAvailable();

    if (canUseSpecialized) {
      try {
        const session = await this.getOrCreateSession(options);
        const writeParams: any = context ? { context } : undefined;
        const stream = session.writeStreaming(writingPrompt, writeParams);
        let fullResult = '';

        for await (const chunk of stream) {
          fullResult = chunk;
          onChunk(fullResult);
        }
        return fullResult;
      } catch (err) {
        console.warn('[WriterAdapter] 串流寫作失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    const fallbackPrompt = `Write content for: ${writingPrompt} (Tone: ${options.tone || 'neutral'})`;
    return await this.nano.promptStreaming(fallbackPrompt, onChunk);
  }

  public destroySession(): void {
    if (this.activeWriter?.destroy) {
      try {
        this.activeWriter.destroy();
      } catch (_e) {
        // 忽略非致命釋放異常
      } finally {
        this.activeWriter = null;
        this.currentConfig = '';
      }
    }
  }
}