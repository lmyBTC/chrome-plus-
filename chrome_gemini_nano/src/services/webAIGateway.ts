/**
 * Chrome 130+ 專用 Web AI API 矩陣路由閘道 (Web AI Gateway)
 * 負責能力檢測、多 API 路由排程、降級調度與 GPU VRAM 會話生命週期統一釋放
 *
 * @related ../../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./nanoService.ts                    (Prompt API Fallback 底座)
 * @related ./adapters/types.ts                 (矩陣型別定義)
 */

import { NanoService } from './nanoService';
import {
  WebAIAvailability,
  WebAIMatrixCapabilities,
} from './adapters/types';
import { SummarizerAdapter } from './adapters/summarizerAdapter';
import { WriterAdapter } from './adapters/writerAdapter';
import { RewriterAdapter } from './adapters/rewriterAdapter';
import { TranslatorAdapter } from './adapters/translatorAdapter';

export class WebAIGateway {
  private static instance: WebAIGateway;
  private nanoService: NanoService;
  private activeSessions: Set<{ destroy: () => void }> = new Set();

  private constructor() {
    this.nanoService = NanoService.getInstance();
  }

  public static getInstance(): WebAIGateway {
    if (!WebAIGateway.instance) {
      WebAIGateway.instance = new WebAIGateway();
    }
    return WebAIGateway.instance;
  }

  /**
   * 取得通用全局物件
   */
  private getGlobalScope(): any {
    if (typeof self !== 'undefined') return self;
    if (typeof window !== 'undefined') return window;
    if (typeof globalThis !== 'undefined') return globalThis;
    return {};
  }

  /**
   * 安全獲取 window.ai / self.ai 下的指定 API 實例
   */
  public getAISubmodule(moduleName: 'summarizer' | 'writer' | 'rewriter' | 'languageModel'): any {
    const scope = this.getGlobalScope();
    if (scope.ai && scope.ai[moduleName]) {
      return scope.ai[moduleName];
    }
    // 相容首字母大寫全域掛載或 Chrome 特殊掛載
    const capitalized = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
    if (scope[capitalized]) {
      return scope[capitalized];
    }
    if (typeof chrome !== 'undefined' && (chrome as any)[`ai${capitalized}`]) {
      return (chrome as any)[`ai${capitalized}`];
    }
    return null;
  }

  /**
   * 安全獲取 window.translation 實例
   */
  public getTranslationCore(): any {
    const scope = this.getGlobalScope();
    if (scope.translation) {
      return scope.translation;
    }
    if (typeof chrome !== 'undefined' && (chrome as any).translation) {
      return (chrome as any).translation;
    }
    return null;
  }

  /**
   * 檢查各專用 API 的可用性
   */
  private async probeModuleAvailability(moduleCore: any): Promise<WebAIAvailability> {
    if (!moduleCore) {
      return 'unsupported';
    }

    try {
      if (typeof moduleCore.capabilities === 'function') {
        const caps = await moduleCore.capabilities();
        return (caps?.available as WebAIAvailability) || 'no';
      }
      if (typeof moduleCore.create === 'function') {
        return 'readily';
      }
      return 'no';
    } catch {
      return 'no';
    }
  }

  /**
   * 探測 translation 模組可用性
   */
  private async probeTranslationAvailability(): Promise<WebAIAvailability> {
    const translationCore = this.getTranslationCore();
    if (!translationCore) {
      return 'unsupported';
    }

    try {
      if (typeof translationCore.canTranslate === 'function') {
        const status = await translationCore.canTranslate({
          sourceLanguage: 'en',
          targetLanguage: 'zh-Hant',
        });
        return (status as WebAIAvailability) || 'readily';
      }
      return 'readily';
    } catch {
      return 'no';
    }
  }

  /**
   * 全面動態探測 Web AI 矩陣所有模組能力
   */
  public async capabilities(): Promise<WebAIMatrixCapabilities> {
    const [summarizer, writer, rewriter, translator] = await Promise.all([
      this.probeModuleAvailability(this.getAISubmodule('summarizer')),
      this.probeModuleAvailability(this.getAISubmodule('writer')),
      this.probeModuleAvailability(this.getAISubmodule('rewriter')),
      this.probeTranslationAvailability(),
    ]);

    const languageModel = await this.nanoService.checkAvailability();

    return {
      languageModel,
      summarizer,
      writer,
      rewriter,
      translator,
    };
  }

  /**
   * 取得專用 Summarizer 適配器單例
   */
  public getSummarizer(): SummarizerAdapter {
    return SummarizerAdapter.getInstance();
  }

  /**
   * 取得專用 Writer 適配器單例
   */
  public getWriter(): WriterAdapter {
    return WriterAdapter.getInstance();
  }

  /**
   * 取得專用 Rewriter 適配器單例
   */
  public getRewriter(): RewriterAdapter {
    return RewriterAdapter.getInstance();
  }

  /**
   * 取得專用 Translator 適配器單例
   */
  public getTranslator(): TranslatorAdapter {
    return TranslatorAdapter.getInstance();
  }

  /**
   * 專用模型矩陣分流生成社群貼文初稿 (Summarizer + Writer / Translator -> NanoService Fallback)
   */
  public async generateSocialPosts(
    title: string,
    summary: string,
    url: string
  ): Promise<{ x_en: string; threads_zh: string }> {
    const caps = await this.capabilities();
    const canUseSpecialized =
      (caps.summarizer === 'readily' || caps.summarizer === 'after-download') &&
      (caps.writer === 'readily' || caps.writer === 'after-download');

    if (canUseSpecialized) {
      try {
        const summarizer = this.getSummarizer();
        const writer = this.getWriter();

        // 1. 利用專用 summarizer 提煉 key-points
        const keyPoints = await summarizer.summarize(summary, {
          type: 'key-points',
          length: 'short',
          format: 'plain-text',
        });

        // 2. 利用專用 writer 生成 X 英文推文
        const x_en = await writer.write(
          `Title: ${title}\nKey Findings:\n${keyPoints}\nSource: ${url}`,
          {
            tone: 'neutral',
            format: 'plain-text',
            length: 'short',
            sharedContext: 'Write a high-signal, concise tech/quant post for X (strictly under 280 characters). Include core takeaways and finish with the source URL.',
          }
        );

        // 3. 生成 Threads 繁中貼文 (若 translator 可用則翻譯或由 Rewriter 轉譯)
        let threads_zh = '';
        if (caps.translator === 'readily' || caps.translator === 'after-download') {
          const translator = this.getTranslator();
          threads_zh = await translator.translate(x_en, {
            sourceLanguage: 'en',
            targetLanguage: 'zh-Hant',
          });
        } else {
          const rewriter = this.getRewriter();
          threads_zh = await rewriter.rewrite(
            x_en,
            {
              tone: 'more-casual',
              format: 'plain-text',
              sharedContext: '將英文推文重寫為自然在地的台灣繁體中文 Threads 分享貼文，保持對話感與分段，並保留 URL。',
            }
          );
        }

        if (x_en && threads_zh) {
          return { x_en, threads_zh };
        }
      } catch {
        // 專用矩陣流程異常時，自動透明降級回 NanoService
      }
    }

    // 基礎 Prompt API (NanoService) 降級
    return await this.nanoService.generateSocialPosts(title, summary, url);
  }

  /**
   * 註冊活動會話以供統一生命週期管理
   */
  public registerSession(session: { destroy: () => void }): void {
    this.activeSessions.add(session);
  }

  /**
   * 註銷活動會話
   */
  public unregisterSession(session: { destroy: () => void }): void {
    this.activeSessions.delete(session);
  }

  /**
   * 統一銷毀所有活動會話與釋放 GPU VRAM
   */
  public destroyAll(): void {
    const sessions = Array.from(this.activeSessions);
    for (const session of sessions) {
      try {
        if (typeof session.destroy === 'function') {
          session.destroy();
        }
      } catch {
        // 靜默捕捉釋放異常，避免中斷其他清理
      }
    }
    this.activeSessions.clear();

    // 依序銷毀專用 Adapters 與基礎 Prompt API 會話
    try {
      SummarizerAdapter.getInstance().destroySession();
      WriterAdapter.getInstance().destroySession();
      RewriterAdapter.getInstance().destroySession();
      TranslatorAdapter.getInstance().destroySession();
    } catch {
      // 靜默捕捉
    }

    // 銷毀 NanoService 基礎 Prompt API 會話
    this.nanoService.destroySession();
  }
}
