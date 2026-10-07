/**
 * Chrome 130+ ai.writer 原生模型適配器 (Writer Adapter)
 * 支援 tone (formal/neutral/casual)、format、length 與 Prompt API (NanoService) 透明降級
 *
 * @related ../webAIGateway.ts                 (閘道中樞與生命週期管理)
 * @related ../nanoService.ts                  (Prompt API Fallback 引擎)
 * @related ./types.ts                         (矩陣型別定義)
 */

import { WebAIGateway } from '../webAIGateway';
import { NanoService } from '../nanoService';
import { WriterOptions } from './types';

export class WriterAdapter {
  private static instance: WriterAdapter;
  private activeSession: any = null;
  private currentOptionsKey: string = '';

  private constructor() {}

  public static getInstance(): WriterAdapter {
    if (!WriterAdapter.instance) {
      WriterAdapter.instance = new WriterAdapter();
    }
    return WriterAdapter.instance;
  }

  /**
   * 檢查當前環境 ai.writer 可用性
   */
  public async isAvailable(): Promise<boolean> {
    const gateway = WebAIGateway.getInstance();
    const writerCore = gateway.getAISubmodule('writer');
    if (!writerCore) return false;

    try {
      if (typeof writerCore.capabilities === 'function') {
        const caps = await writerCore.capabilities();
        return caps?.available === 'readily' || caps?.available === 'after-download';
      }
      return typeof writerCore.create === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 建立或取得快取之原生會話
   */
  public async getOrCreateSession(options: WriterOptions = {}): Promise<any> {
    const optionsKey = JSON.stringify({
      tone: options.tone || 'neutral',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.sharedContext || '',
    });

    if (this.activeSession && this.currentOptionsKey === optionsKey) {
      return this.activeSession;
    }

    this.destroySession();

    const gateway = WebAIGateway.getInstance();
    const writerCore = gateway.getAISubmodule('writer');
    if (!writerCore || typeof writerCore.create !== 'function') {
      throw new Error('原生 ai.writer 不可用');
    }

    const createParams: any = {
      tone: options.tone || 'neutral',
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

    this.activeSession = await writerCore.create(createParams);
    this.currentOptionsKey = optionsKey;

    gateway.registerSession(this.activeSession);
    return this.activeSession;
  }

  /**
   * 撰寫文章/文案主方法 (具備原生調度與 NanoService 透明降級)
   */
  public async write(
    writingPrompt: string,
    options: WriterOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        const result = await session.write(writingPrompt, { context: contextOptions?.context });
        return result.trim();
      }
    } catch {
      // 原生調度失敗，自動降級至 NanoService
    }

    return this.fallbackWrite(writingPrompt, options, contextOptions?.context);
  }

  /**
   * 撰寫文章/文案串流產出方法
   */
  public async writeStreaming(
    writingPrompt: string,
    onChunk: (chunk: string) => void,
    options: WriterOptions = {},
    contextOptions?: { context?: string }
  ): Promise<string> {
    try {
      if (await this.isAvailable()) {
        const session = await this.getOrCreateSession(options);
        if (typeof session.writeStreaming === 'function') {
          const stream = session.writeStreaming(writingPrompt, { context: contextOptions?.context });
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

    return this.fallbackWriteStreaming(writingPrompt, onChunk, options, contextOptions?.context);
  }

  /**
   * NanoService Prompt API Fallback 核心指令建構
   */
  private buildFallbackPrompt(writingPrompt: string, options: WriterOptions = {}, context?: string): { systemPrompt: string; userQuery: string } {
    const tone = options.tone || 'neutral';
    const format = options.format || 'markdown';
    const length = options.length || 'medium';

    const toneInstructions: Record<string, string> = {
      'formal': 'Use a formal, rigorous, professional, and authoritative tone.',
      'neutral': 'Use an objective, balanced, and direct tone.',
      'casual': 'Use a casual, conversational, engaging, and friendly tone.',
    };

    const lengthInstructions: Record<string, string> = {
      'short': 'Keep the response concise and tightly structured.',
      'medium': 'Provide a standard, well-developed response with balanced depth.',
      'long': 'Provide an expansive, thoroughly elaborated response.',
    };

    const systemPrompt = `You are an expert content writer.
Goal: Write high quality content based on the user prompt.
Tone: ${toneInstructions[tone] || toneInstructions['neutral']}
Length: ${lengthInstructions[length] || lengthInstructions['medium']}
Output Format: ${format === 'plain-text' ? 'Strict plain text without markdown formatting.' : 'Clean Markdown.'}
${options.sharedContext ? `Shared Background Context: ${options.sharedContext}` : ''}
Output strictly the written content without preamble, meta commentary, or conversational remarks.`;

    const userQuery = `${context ? `Context: ${context}\n\n` : ''}Prompt:\n${writingPrompt}`;

    return { systemPrompt, userQuery };
  }

  /**
   * 降級非串流撰寫
   */
  private async fallbackWrite(
    writingPrompt: string,
    options: WriterOptions = {},
    context?: string
  ): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(writingPrompt, options, context);
    nano.destroySession();
    const session = await nano.getOrCreateSession({ systemPrompt, temperature: 0.3 });
    const result = await session.prompt(userQuery);
    return result.trim();
  }

  /**
   * 降級串流撰寫
   */
  private async fallbackWriteStreaming(
    writingPrompt: string,
    onChunk: (chunk: string) => void,
    options: WriterOptions = {},
    context?: string
  ): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(writingPrompt, options, context);
    nano.destroySession();
    await nano.getOrCreateSession({ systemPrompt, temperature: 0.3 });
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
