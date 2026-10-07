/**
 * Chrome 130+ translation 原生離線神經翻譯適配器 (Translator Adapter)
 * 封裝 createTranslator 原生能力，支援語言對動態切換與 Prompt API (NanoService) 透明降級
 *
 * @related ../webAIGateway.ts                 (閘道中樞與生命週期管理)
 * @related ../nanoService.ts                  (Prompt API Fallback 引擎)
 * @related ./types.ts                         (矩陣型別定義)
 */

import { WebAIGateway } from '../webAIGateway';
import { NanoService } from '../nanoService';
import { TranslatorOptions } from './types';

export class TranslatorAdapter {
  private static instance: TranslatorAdapter;
  private activeSession: any = null;
  private currentLanguagePair: string = '';

  private constructor() {}

  public static getInstance(): TranslatorAdapter {
    if (!TranslatorAdapter.instance) {
      TranslatorAdapter.instance = new TranslatorAdapter();
    }
    return TranslatorAdapter.instance;
  }

  /**
   * 檢查當前環境指定語言對之翻譯能力
   */
  public async isAvailable(sourceLanguage: string = 'en', targetLanguage: string = 'zh-Hant'): Promise<boolean> {
    const gateway = WebAIGateway.getInstance();
    const translationCore = gateway.getTranslationCore();
    if (!translationCore) return false;

    try {
      if (typeof translationCore.canTranslate === 'function') {
        const status = await translationCore.canTranslate({
          sourceLanguage,
          targetLanguage,
        });
        return status === 'readily' || status === 'after-download';
      }
      return typeof translationCore.createTranslator === 'function';
    } catch {
      return false;
    }
  }

  /**
   * 建立或取得快取之原生會話 (支援動態語言對切換)
   */
  public async getOrCreateSession(options: TranslatorOptions): Promise<any> {
    const pairKey = `${options.sourceLanguage}->${options.targetLanguage}`;

    if (this.activeSession && this.currentLanguagePair === pairKey) {
      return this.activeSession;
    }

    this.destroySession();

    const gateway = WebAIGateway.getInstance();
    const translationCore = gateway.getTranslationCore();
    if (!translationCore || typeof translationCore.createTranslator !== 'function') {
      throw new Error(`原生 translation 不可用或不支援語言對: ${pairKey}`);
    }

    const createParams: any = {
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    };

    if (options.onDownloadProgress) {
      createParams.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          options.onDownloadProgress?.(e.loaded, e.total);
        });
      };
    }

    this.activeSession = await translationCore.createTranslator(createParams);
    this.currentLanguagePair = pairKey;

    gateway.registerSession(this.activeSession);
    return this.activeSession;
  }

  /**
   * 翻譯主方法 (具備原生調度與 NanoService 透明降級)
   */
  public async translate(
    text: string,
    options: TranslatorOptions = { sourceLanguage: 'en', targetLanguage: 'zh-Hant' }
  ): Promise<string> {
    try {
      if (await this.isAvailable(options.sourceLanguage, options.targetLanguage)) {
        const session = await this.getOrCreateSession(options);
        const result = await session.translate(text);
        return result.trim();
      }
    } catch {
      // 原生調度失敗，自動降級至 NanoService
    }

    return this.fallbackTranslate(text, options);
  }

  /**
   * 翻譯串流產出方法
   */
  public async translateStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: TranslatorOptions = { sourceLanguage: 'en', targetLanguage: 'zh-Hant' }
  ): Promise<string> {
    try {
      if (await this.isAvailable(options.sourceLanguage, options.targetLanguage)) {
        const session = await this.getOrCreateSession(options);
        if (typeof session.translateStreaming === 'function') {
          const stream = session.translateStreaming(text);
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

    return this.fallbackTranslateStreaming(text, onChunk, options);
  }

  /**
   * NanoService Prompt API Fallback 核心指令建構
   */
  private buildFallbackPrompt(text: string, options: TranslatorOptions): { systemPrompt: string; userQuery: string } {
    const systemPrompt = `You are an expert bilingual localization specialist.
Goal: Accurately translate text from ${options.sourceLanguage} to ${options.targetLanguage}.
Guidelines:
1. Preserve original terminology, ticker symbols ($TICKER), numeric data, and URLs.
2. If translating to zh or zh-Hant, use natural Traditional Chinese (繁體中文) matching Taiwan tech and investment vernacular.
3. Output strictly the translation without commentary, prefixes, or notes.`;

    const userQuery = text;

    return { systemPrompt, userQuery };
  }

  /**
   * 降級非串流翻譯
   */
  private async fallbackTranslate(text: string, options: TranslatorOptions): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(text, options);
    nano.destroySession();
    const session = await nano.getOrCreateSession({ systemPrompt, temperature: 0.1 });
    const result = await session.prompt(userQuery);
    return result.trim();
  }

  /**
   * 降級串流翻譯
   */
  private async fallbackTranslateStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    options: TranslatorOptions
  ): Promise<string> {
    const nano = NanoService.getInstance();
    const { systemPrompt, userQuery } = this.buildFallbackPrompt(text, options);
    nano.destroySession();
    await nano.getOrCreateSession({ systemPrompt, temperature: 0.1 });
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
        this.currentLanguagePair = '';
      }
    }
  }
}
