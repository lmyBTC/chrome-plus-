/**
 * Chrome 130+ ai.summarizer 原生模型適配器 (Summarizer Adapter)
 * 支援 key-points、tl;dr、teaser、headline 與 Prompt API (NanoService) 透明降級
 *
 * @related ../webAIGateway.ts                 (閘道中樞與生命週期管理)
 * @related ../nanoService.ts                  (Prompt API Fallback 引擎)
 * @related ./types.ts                         (矩陣型別定義)
 */

import { WebAIGateway } from '../webAIGateway';
import { NanoService } from '../nanoService';
import { SummarizerOptions } from './types';

export class SummarizerAdapter {
  private static instance: SummarizerAdapter;
  private activeSession: any = null;
  private currentOptionsKey: string = '';

  private constructor() {}

  public static getInstance(): SummarizerAdapter {
    if (!SummarizerAdapter.instance) {
      SummarizerAdapter.instance = new SummarizerAdapter();
    }
    return SummarizerAdapter.instance;
  }

  /**
   * 檢查當前環境 ai.summarizer 可用性
   */
  public async isAvailable(): Promise<boolean> {
    const gateway = WebAIGateway.getInstance();
    const summarizerCore = gateway.getAISubmodule('summarizer');
    if (!summarizerCore) return false;

    try {
      if (typeof summarizerCore.capabilities === 'function') {
        const caps = await summarizerCore.capabilities();
        return caps?.available === 'readily' || caps?.available === 'after-download';
      }
      return typeof summarizerCore.create === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 建立或取得快取之原生會話
   */
  public async getOrCreateSession(options: SummarizerOptions = {}): Promise<any> {
    const optionsKey = JSON.stringify({
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.sharedContext || '',
    });

    if (this.activeSession && this.currentOptionsKey === optionsKey) {
      return this.activeSession;
    }

    this.destroySession();

    const gateway = WebAIGateway.getInstance();
    const summarizerCore = gateway.getAISubmodule('summarizer');
    if (!summarizerCore || typeof summarizerCore.create !== 'function') {
      throw new Error('原生 ai.summarizer 不可用');
    }

    const createParams: any = {
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
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

    this.activeSession = await summarizerCore.create(createParams);
    this.currentOptionsKey = optionsKey;

    gateway.registerSession(this.activeSession);
    return this.activeSession;
  }

  /**
   * 摘要產出主方法 (具備原生調度與 NanoService 透明降級)
   */
  public async summarize(
    text: string,
    options: SummarizerOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        const result = await session.summarize(text, { context: contextOptions?.context });
        return result.trim();
      }
    } catch {
      // 原生調度失敗，自動降級至 NanoService
    }

    return this.fallbackSummarize(text, options, contextOptions?.context);
  }

  /**
   * 摘要串流產出方法
   */
  public async summarizeStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: SummarizerOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        if (typeof session.summarizeStreaming === 'function') {
          const stream = session.summarizeStreaming(text, { context: contextOptions?.context });
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

    return this.fallbackSummarizeStreaming(text, onChunk, options, contextOptions?.context);
  }

  /**
   * NanoService Prompt API Fallback 核心指令建構
   */
  private buildFallbackPrompt(text: string, options: SummarizerOptions = {}, context?: string): { systemPrompt: string; userQuery: string } {
    const type = options.type || 'key-points';
    const format = options.format || 'markdown';
    const length = options.length || 'medium';

    const typeInstructions: Record<string, string> = {
      'key-points': 'Extract key analytical bullet points with high informational density.',
      'tl;dr': 'Provide a concise, single-paragraph tl;dr overview.',
      'teaser': 'Write an engaging, click-worthy teaser that sparks interest without clickbait.',
      'headline': 'Generate an impactful, punchy title/headline summarizing the main event.',
    };

    const lengthInstructions: Record<string, string> = {
      'short': 'Keep it very brief (1-2 sentences or 2-3 bullets).',
      'medium': 'Provide moderate detail (1 paragraph or 3-5 bullets).',
      'long': 'Provide a detailed summary covering nuances and sub-arguments.',
    };

    const systemPrompt = `You are a professional research summarizer.
Goal: Summarize the provided content.
Mode: ${typeInstructions[type] || typeInstructions['key-points']}
Length: ${lengthInstructions[length] || lengthInstructions['medium']}
Output Format: ${format === 'plain-text' ? 'Strict plain text without markdown styling.' : 'Clean Markdown.'}
${options.sharedContext ? `Background Context: ${options.sharedContext}` : ''}
Output strictly the summary result without conversational filler or preambles.`;

    const userQuery = `${context ? `Context: ${context}\n\n` : ''}Content to summarize:\n${text}`;

    return { systemPrompt, userQuery };
  }

  /**
   * 降級非串流摘要
   */
  private async fallbackSummarize(
    text: string,
    options: SummarizerOptions = {},
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
   * 降級串流摘要
   */
  private async fallbackSummarizeStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: SummarizerOptions = {},
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
