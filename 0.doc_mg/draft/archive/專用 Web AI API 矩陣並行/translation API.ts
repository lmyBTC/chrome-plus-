/**
 * TranslatorAdapter - Chrome 130+ 專用神經網路離線翻譯模型適配器 (translation API)
 * 免除通用大模型翻譯時格式跑版或擅自加註的問題，支援美股研報英中對照與雙向轉譯
 */

import { NanoService } from '../nanoService';

export interface TranslationLanguagePair {
  sourceLanguage: string;
  targetLanguage: string;
}

export class TranslatorAdapter {
  private static instance: TranslatorAdapter;
  private nano = NanoService.getInstance();
  private activeTranslator: any = null;
  private currentPair: string = '';

  private constructor() {}

  public static getInstance(): TranslatorAdapter {
    if (!TranslatorAdapter.instance) {
      TranslatorAdapter.instance = new TranslatorAdapter();
    }
    return TranslatorAdapter.instance;
  }

  private getTranslationCore(): any {
    if (typeof self !== 'undefined' && (self as any).translation) {
      return (self as any).translation;
    }
    if (typeof window !== 'undefined' && (window as any).translation) {
      return (window as any).translation;
    }
    if (typeof self !== 'undefined' && (self as any).ai?.translator) {
      return (self as any).ai.translator;
    }
    return null;
  }

  public async canTranslate(pair: TranslationLanguagePair): Promise<boolean> {
    const core = this.getTranslationCore();
    if (!core) return false;

    try {
      if (typeof core.canTranslate === 'function') {
        const status = await core.canTranslate(pair);
        return status === 'readily' || status === 'after-download';
      }
      if (typeof core.capabilities === 'function') {
        const caps = await core.capabilities();
        return caps.available === 'readily' || caps.available === 'after-download';
      }
      return typeof core.createTranslator === 'function' || typeof core.create === 'function';
    } catch (_err) {
      return false;
    }
  }

  private async getOrCreateTranslator(pair: TranslationLanguagePair): Promise<any> {
    const pairHash = `${pair.sourceLanguage}->${pair.targetLanguage}`;
    if (this.activeTranslator && this.currentPair === pairHash) {
      return this.activeTranslator;
    }

    this.destroySession();

    const core = this.getTranslationCore();
    if (!core) {
      throw new Error('當前環境不支援 Chrome 專用 translation API');
    }

    if (typeof core.createTranslator === 'function') {
      this.activeTranslator = await core.createTranslator(pair);
    } else if (typeof core.create === 'function') {
      this.activeTranslator = await core.create(pair);
    } else {
      throw new Error('找不到可用的建立 Translator 方法');
    }

    this.currentPair = pairHash;
    return this.activeTranslator;
  }

  /**
   * 執行純文字神經翻譯
   */
  public async translate(text: string, pair: TranslationLanguagePair = { sourceLanguage: 'en', targetLanguage: 'zh-Hant' }): Promise<string> {
    const canTranslate = await this.canTranslate(pair);

    if (canTranslate) {
      try {
        const translator = await this.getOrCreateTranslator(pair);
        return await translator.translate(text);
      } catch (err) {
        console.warn('[TranslatorAdapter] 專用翻譯失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    // 備援路徑：由通用 Prompt API 處理
    const fallbackPrompt = `Translate the following text accurately from ${pair.sourceLanguage} to ${pair.targetLanguage} (Traditional Chinese / 繁體中文 if target is zh-Hant). Output only the translated text:\n\n${text}`;
    return await this.nano.prompt(fallbackPrompt);
  }

  /**
   * 串流翻譯
   */
  public async translateStreaming(
    text: string,
    onChunk: (chunk: string) => void,
    pair: TranslationLanguagePair = { sourceLanguage: 'en', targetLanguage: 'zh-Hant' }
  ): Promise<string> {
    const canTranslate = await this.canTranslate(pair);

    if (canTranslate) {
      try {
        const translator = await this.getOrCreateTranslator(pair);
        if (typeof translator.translateStreaming === 'function') {
          const stream = translator.translateStreaming(text);
          let fullResult = '';
          for await (const chunk of stream) {
            fullResult = chunk;
            onChunk(fullResult);
          }
          return fullResult;
        }
      } catch (err) {
        console.warn('[TranslatorAdapter] 串流翻譯失敗，降級由 Prompt API 備援處理:', err);
      }
    }

    const fallbackPrompt = `Translate the following text from ${pair.sourceLanguage} to ${pair.targetLanguage}:\n\n${text}`;
    return await this.nano.promptStreaming(fallbackPrompt, onChunk);
  }

  public destroySession(): void {
    if (this.activeTranslator?.destroy) {
      try {
        this.activeTranslator.destroy();
      } catch (_e) {
        // 忽略非致命釋放異常
      } finally {
        this.activeTranslator = null;
        this.currentPair = '';
      }
    }
  }
}