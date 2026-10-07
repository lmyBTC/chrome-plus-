/**
 * RewriterAdapter - Chrome 130+ 專用改寫與調音模型適配器 (ai.rewriter)
 * 完整解耦原有 Prompt 中的手寫調音規則，原生支援觀點銳化、字數縮減 (280) 與在地去油
 */

import { NanoService } from '../nanoService';

export type RewriterTone = 'as-is' | 'more-formal' | 'more-casual';
export type RewriterFormat = 'as-is' | 'plain-text' | 'markdown';
export type RewriterLength = 'as-is' | 'shorter' | 'longer';

export interface RewriterOptions {
  tone?: RewriterTone;
  format?: RewriterFormat;
  length?: RewriterLength;
  sharedContext?: string;
}

export class RewriterAdapter {
  private static instance: RewriterAdapter;
  private nano = NanoService.getInstance();
  private activeRewriter: any = null;
  private currentConfig: string = '';

  private constructor() {}

  public static getInstance(): RewriterAdapter {
    if (!RewriterAdapter.instance) {
      RewriterAdapter.instance = new RewriterAdapter();
    }
    return RewriterAdapter.instance;
  }

  private getAIRewriterCore(): any {
    if (typeof self !== 'undefined' && (self as any).ai?.rewriter) {
      return (self as any).ai.rewriter;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.rewriter) {
      return (window as any).ai.rewriter;
    }
    return null;
  }

  public async isAvailable(): Promise<boolean> {
    const core = this.getAIRewriterCore();
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

  private async getOrCreateSession(options: RewriterOptions = {}): Promise<any> {
    const configHash = JSON.stringify({
      tone: options.tone || 'as-is',
      format: options.format || 'as-is',
      length: options.length || 'as-is',
      sharedContext: options.sharedContext || ''
    });

    if (this.activeRewriter && this.currentConfig === configHash) {
      return this.activeRewriter;
    }

    this.destroySession();

    const core = this.getAIRewriterCore();
    if (!core) {
      throw new Error('當前環境不支援 Chrome 專用 ai.rewriter API');
    }

    const createParams: any = {
      tone: options.tone || 'as-is',
      format: options.format || 'as-is',
      length: options.length || 'as-is'
    };

    if (options.sharedContext) {
      createParams.sharedContext = options.sharedContext;
    }

    this.activeRewriter = await core.create(createParams);
    this.currentConfig = configHash;
    return this.activeRewriter;
  }

  /**
   * 執行改寫與文字拋光
   */
  public async rewrite(text: string, options: RewriterOptions = {}, context?: string): Promise<string> {
    const canUseSpecialized = await this.isAvailable();

    if (canUseSpecialized) {
      try {
        const session = await this.getOrCreateSession(options);
        const rewriteParams: any = context ? { context } : undefined;
        return await session.rewrite(text, rewriteParams);
      } catch (err) {
        console.warn('[RewriterAdapter] 專用 ai.rewriter 執行失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    // 備援路徑：由通用 Prompt API 處理
    const fallbackPrompt = `Rewrite the following text. Tone: ${options.tone || 'as-is'}, Length: ${options.length || 'as-is'}${context ? `. Context: ${context}` : ''}\n\n${text}`;
    return await this.nano.prompt(fallbackPrompt);
  }

  /**
   * 快捷算子：字數壓線 (Fit 280) - 使用原生 length: 'shorter'
   */
  public async fitShorter(text: string, context?: string): Promise<string> {
    return this.rewrite(text, { length: 'shorter', format: 'plain-text' }, context || 'Preserve all numbers, tickers, and URLs strictly.');
  }

  /**
   * 快捷算子：在地去油 - 使用原生 tone: 'more-casual' 搭配語境
   */
  public async dejargon(text: string): Promise<string> {
    return this.rewrite(
      text,
      { tone: 'more-casual' },
      'Convert corporate jargon (e.g. 賦能, 閉環, 抓手) into authentic Taiwanese Traditional Chinese phrasing.'
    );
  }

  public destroySession(): void {
    if (this.activeRewriter?.destroy) {
      try {
        this.activeRewriter.destroy();
      } catch (_e) {
        // 忽略非致命釋放異常
      } finally {
        this.activeRewriter = null;
        this.currentConfig = '';
      }
    }
  }
}