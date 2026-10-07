/**
 * WebAIGateway - Chrome 130+ 專用 Web AI API 矩陣中樞路由閘道
 * 整合專屬小模型適配器 (SummarizerAdapter, WriterAdapter, RewriterAdapter, TranslatorAdapter)
 * 統一調度、動態探測，並維持單一入口與統一記憶體生命週期釋放
 */

import { NanoService } from './nanoService';
import { SummarizerAdapter, SummarizerOptions } from './adapters/summarizerAdapter';
import { WriterAdapter, WriterOptions } from './adapters/writerAdapter';
import { RewriterAdapter, RewriterOptions } from './adapters/rewriterAdapter';
import { TranslatorAdapter, TranslationLanguagePair } from './adapters/translatorAdapter';

export type WebAIAvailability = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface WebAIMatrixCapabilities {
  languageModel: WebAIAvailability;
  summarizer: WebAIAvailability;
  writer: WebAIAvailability;
  rewriter: WebAIAvailability;
  translator: WebAIAvailability;
}

export class WebAIGateway {
  private static instance: WebAIGateway;
  private nano = NanoService.getInstance();

  private summarizerAdapter = SummarizerAdapter.getInstance();
  private writerAdapter = WriterAdapter.getInstance();
  private rewriterAdapter = RewriterAdapter.getInstance();
  private translatorAdapter = TranslatorAdapter.getInstance();

  private constructor() {}

  public static getInstance(): WebAIGateway {
    if (!WebAIGateway.instance) {
      WebAIGateway.instance = new WebAIGateway();
    }
    return WebAIGateway.instance;
  }

  /**
   * 批次探測全矩陣 Web AI API 就緒狀態
   */
  public async checkMatrixCapabilities(): Promise<WebAIMatrixCapabilities> {
    const ai = (self as any).ai || (window as any).ai;
    const translation = (self as any).translation || (window as any).translation;

    const checkService = async (service: any): Promise<WebAIAvailability> => {
      if (!service) return 'unsupported';
      try {
        if (typeof service.capabilities === 'function') {
          const caps = await service.capabilities();
          return (caps.available as WebAIAvailability) || 'no';
        }
        return typeof service.create === 'function' ? 'readily' : 'no';
      } catch (_e) {
        return 'no';
      }
    };

    const lmStatus = await this.nano.checkAvailability();
    const sumStatus = await checkService(ai?.summarizer);
    const writeStatus = await checkService(ai?.writer);
    const rewriteStatus = await checkService(ai?.rewriter);
    const transStatus = await checkService(translation || ai?.translator);

    return {
      languageModel: lmStatus,
      summarizer: sumStatus,
      writer: writeStatus,
      rewriter: rewriteStatus,
      translator: transStatus
    };
  }

  /**
   * 專用摘要生成
   */
  public async summarizeText(text: string, options: SummarizerOptions = {}, context?: string): Promise<string> {
    return await this.summarizerAdapter.summarize(text, options, context);
  }

  /**
   * 專用文字初稿撰寫
   */
  public async writeDraft(prompt: string, options: WriterOptions = {}, context?: string): Promise<string> {
    return await this.writerAdapter.write(prompt, options, context);
  }

  /**
   * 專用改寫與文字調音
   */
  public async rewriteText(text: string, options: RewriterOptions = {}, context?: string): Promise<string> {
    return await this.rewriterAdapter.rewrite(text, options, context);
  }

  /**
   * 專用神經翻譯
   */
  public async translateText(
    text: string,
    pair: TranslationLanguagePair = { sourceLanguage: 'en', targetLanguage: 'zh-Hant' }
  ): Promise<string> {
    return await this.translatorAdapter.translate(text, pair);
  }

  /**
   * 釋放所有專用 API 資源與記憶體
   */
  public destroyAllSessions(): void {
    this.summarizerAdapter.destroySession();
    this.writerAdapter.destroySession();
    this.rewriterAdapter.destroySession();
    this.translatorAdapter.destroySession();
    this.nano.destroySession();
  }
}