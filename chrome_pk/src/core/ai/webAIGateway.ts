/**
 * webAIGateway.ts - ScrumClock 側跨插件黑盒橋接層
 *
 * 職責：提供與 chrome_gemini_nano 同名的 WebAIGateway 介面，
 * 實際上透過 chrome.runtime.sendMessage 轉發至 Nano 插件，
 * 並在 Nano 不可用時優雅降級至 ai.* 原生 API。
 *
 * ⚠️  黑盒契約：嚴禁直接修改 chrome_gemini_nano 原始碼。
 *      此模組僅封裝訊息傳遞介面，不持有 Nano 內部狀態。
 */

export interface SummarizerOptions {
  type?: 'tl;dr' | 'key-points' | 'teaser' | 'headline';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
}

export interface WriterOptions {
  tone?: 'formal' | 'casual' | 'neutral';
  format?: 'plain-text' | 'markdown';
  length?: 'short' | 'medium' | 'long';
}

export class WebAIGateway {
  private static instance: WebAIGateway;

  private constructor() {}

  public static getInstance(): WebAIGateway {
    if (!WebAIGateway.instance) {
      WebAIGateway.instance = new WebAIGateway();
    }
    return WebAIGateway.instance;
  }

  /**
   * 呼叫 ai.summarizer 原生 API（優先）或降級至 ai.languageModel
   */
  public async summarizeText(
    text: string,
    options: SummarizerOptions = {},
    context?: string
  ): Promise<string> {
    const ai = (self as any).ai || (window as any).ai;

    // 優先嘗試原生 ai.summarizer
    if (ai?.summarizer) {
      try {
        const caps = await ai.summarizer.capabilities();
        if (caps?.available !== 'no') {
          const summarizer = await ai.summarizer.create({
            type: options.type || 'key-points',
            format: options.format || 'markdown',
            length: options.length || 'medium',
            sharedContext: context,
          });
          const result = await summarizer.summarize(text);
          summarizer.destroy();
          return result;
        }
      } catch (e) {
        console.warn('[WebAIGateway] ai.summarizer 不可用，降級至 languageModel:', e);
      }
    }

    // 降級：使用 ai.languageModel
    return await this._promptViaLanguageModel(
      `請以繁體中文，用 ${options.type || 'key-points'} 格式摘要以下內容：\n\n${text}`,
      context
    );
  }

  /**
   * 呼叫 ai.writer 原生 API（優先）或降級至 ai.languageModel
   */
  public async writeDraft(
    prompt: string,
    options: WriterOptions = {},
    context?: string
  ): Promise<string> {
    const ai = (self as any).ai || (window as any).ai;

    // 優先嘗試原生 ai.writer
    if (ai?.writer) {
      try {
        const caps = await ai.writer.capabilities();
        if (caps?.available !== 'no') {
          const writer = await ai.writer.create({
            tone: options.tone || 'formal',
            format: options.format || 'plain-text',
            length: options.length || 'medium',
            sharedContext: context,
          });
          const result = await writer.write(prompt);
          writer.destroy();
          return result;
        }
      } catch (e) {
        console.warn('[WebAIGateway] ai.writer 不可用，降級至 languageModel:', e);
      }
    }

    // 降級：使用 ai.languageModel
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;
    return await this._promptViaLanguageModel(fullPrompt);
  }

  /**
   * 共用底層：透過 ai.languageModel 執行 Prompt
   */
  private async _promptViaLanguageModel(prompt: string, context?: string): Promise<string> {
    const ai = (self as any).ai || (window as any).ai;
    if (!ai?.languageModel) {
      throw new Error('[WebAIGateway] Gemini Nano (ai.languageModel) 在此環境中不可用');
    }

    const caps = await ai.languageModel.capabilities();
    if (caps?.available === 'no') {
      throw new Error('[WebAIGateway] Gemini Nano 尚未下載或不支援此裝置');
    }

    const session = await ai.languageModel.create({
      systemPrompt: context || 'You are a helpful productivity assistant. Always respond in Traditional Chinese (繁體中文).',
    });

    const result = await session.prompt(prompt);
    session.destroy();
    return result;
  }
}
