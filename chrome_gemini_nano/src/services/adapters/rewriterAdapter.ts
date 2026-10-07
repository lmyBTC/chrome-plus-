/**
 * Chrome 130+ ai.rewriter 原生模型適配器 (Rewriter Adapter)
 * 支援 tone ('as-is'|'more-formal'|'more-casual')、format、length ('as-is'|'shorter'|'longer') 與 Prompt API (NanoService) 透明降級
 *
 * @related ../webAIGateway.ts                 (閘道中樞與生命週期管理)
 * @related ../nanoService.ts                  (Prompt API Fallback 引擎)
 * @related ./types.ts                         (矩陣型別定義)
 */

import { WebAIGateway } from '../webAIGateway';
import { NanoService } from '../nanoService';
import { RewriterOptions } from './types';

export class RewriterAdapter {
  private static instance: RewriterAdapter;
  private activeSession: any = null;
  private currentOptionsKey: string = '';

  private constructor() {}

  public static getInstance(): RewriterAdapter {
    if (!RewriterAdapter.instance) {
      RewriterAdapter.instance = new RewriterAdapter();
    }
    return RewriterAdapter.instance;
  }

  /**
   * 檢查當前環境 ai.rewriter 可用性
   */
  public async isAvailable(): Promise<boolean> {
    const gateway = WebAIGateway.getInstance();
    const rewriterCore = gateway.getAISubmodule('rewriter');
    if (!rewriterCore) return false;

    try {
      if (typeof rewriterCore.capabilities === 'function') {
        const caps = await rewriterCore.capabilities();
        return caps?.available === 'readily' || caps?.available === 'after-download';
      }
      return typeof rewriterCore.create === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 建立或取得快取之原生會話
   */
  public async getOrCreateSession(options: RewriterOptions = {}): Promise<any> {
    const optionsKey = JSON.stringify({
      tone: options.tone || 'as-is',
      format: options.format || 'as-is',
      length: options.length || 'as-is',
      sharedContext: options.sharedContext || '',
    });

    if (this.activeSession && this.currentOptionsKey === optionsKey) {
      return this.activeSession;
    }

    this.destroySession();

    const gateway = WebAIGateway.getInstance();
    const rewriterCore = gateway.getAISubmodule('rewriter');
    if (!rewriterCore || typeof rewriterCore.create !== 'function') {
      throw new Error('原生 ai.rewriter 不可用');
    }

    const createParams: any = {
      tone: options.tone || 'as-is',
      format: options.format || 'as-is',
      length: options.length || 'as-is',
    };

    if (options.sharedContext) {
      createParams.sharedContext = options.sharedContext;
    }

    if (options.onDownloadProgress) {
      createParams.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          options.onDownloadProgress?.(e.loaded, e.total);
        });
      };
    }

    this.activeSession = await rewriterCore.create(createParams);
    this.currentOptionsKey = optionsKey;

    gateway.registerSession(this.activeSession);
    return this.activeSession;
  }

  /**
   * 改寫文字主方法 (具備原生調度與 NanoService 透明降級)
   */
  public async rewrite(
    text: string,
    options: RewriterOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        const result = await session.rewrite(text, { context: contextOptions?.context });
        return result.trim();
      }
    } catch {
      // 原生調度失敗，自動降級至 NanoService
    }

    return this.fallbackRewrite(text, options, contextOptions?.context);
  }

  /**
   * 改寫文字串流產出方法
   */
  public async rewriteStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: RewriterOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        if (typeof session.rewriteStreaming === 'function') {
          const stream = session.rewriteStreaming(text, { context: contextOptions?.context });
          let fullText = '';
          for await (const chunk of stream) {
            fullText = chunk;
            onChunk(fullText);
          }
          return fullText.trim();
        }
      }
    } catch {
      // 原生串流失敗，自動降級
    }

    return this.fallbackRewriteStreaming(text, onChunk, options, contextOptions?.context);
  }

  /**
   * NanoService Prompt API Fallback 核心指令建構
   */
  private buildFallbackPrompt(text: string, options: RewriterOptions = {}, context?: string): { systemPrompt: string; userQuery: string } {
    const tone = options.tone || 'as-is';
    const format = options.format || 'as-is';
    const length = options.length || 'as-is';

    const toneInstructions: Record<string, string> = {
      'as-is': 'Maintain the original tone and mood.',
      'more-formal': 'Make the phrasing more formal, professional, and refined.',
      'more-casual': 'Make the phrasing more casual, relaxed, and conversational.',
    };

    const lengthInstructions: Record<string, string> = {
      'as-is': 'Keep roughly the same length as the original text.',
      'shorter': 'Condense and make the text noticeably shorter and more compact.',
      'longer': 'Elaborate with additional nuance, making the text longer.',
    };

    const formatInstructions: Record<string, string> = {
      'as-is': 'Preserve the original formatting structure.',
      'plain-text': 'Output strict plain text without markdown styling.',
      'markdown': 'Use structured clean Markdown.',
    };

    const systemPrompt = `You are a professional text editor and rewriter.
Goal: Rewrite and polish the provided text according to the following specifications:
- Tone: ${toneInstructions[tone] || toneInstructions['as-is']}
- Length: ${lengthInstructions[length] || lengthInstructions['as-is']}
- Format: ${formatInstructions[format] || formatInstructions['as-is']}
${options.sharedContext ? `Shared Background Context: ${options.sharedContext}` : ''}
Preserve key facts, quantitative figures, and URLs.
Output strictly the rewritten result without commentary or wrappers.`;

    const userQuery = `${context ? `Context: ${context}\n\n` : ''}Original Text:\n${text}`;

    return { systemPrompt, userQuery };
  }

  /**
   * 降級非串流改寫
   */
  private async fallbackRewrite(
    text: string,
    options: RewriterOptions = {},
    context?: string
  ): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(text, options, context);
    nano.destroySession();
    const session = await nano.getOrCreateSession({ systemPrompt, temperature: 0.2 });
    const result = await session.prompt(userQuery);
    return result.trim();
  }

  /**
   * 降級串流改寫
   */
  private async fallbackRewriteStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: RewriterOptions = {},
    context?: string
  ): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(text, options, context);
    nano.destroySession();
    await nano.getOrCreateSession({ systemPrompt, temperature: 0.2 });
    return await nano.promptStreaming(userQuery, onChunk);
  }

  /**
   * 釋放會話資源
   */
  public destroySession(): void {
    if (this.activeSession) {
      WebAIGateway.getInstance().unregisterSession(this.activeSession);
      try {
        if (typeof this.activeSession.destroy === 'function') {
          this.activeSession.destroy();
        }
      } catch {
        // 靜默捕捉釋放異常
      } finally {
        this.activeSession = null;
        this.currentOptionsKey = '';
      }
    }
  }
}
