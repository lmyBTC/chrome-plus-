/**
 * Chrome 內建 Gemini Nano (Prompt API) 服務封裝
 * 遵循 Chrome 128+ 標準 Draft 規範，具備降級適配與記憶體生命週期防護 (VRAM)
 *
 * @related ../../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./nanoIntentRouter.ts                (下游: 萬能路由器消費者)
 * @related ./toneShifter.ts                     (下游: 調音算子消費者)
 * @related ../components/SocialDispatcher.tsx   (下游: 側邊欄 UI 消費者)
 */

export type NanoAvailability = 'readily' | 'after-download' | 'no' | 'unsupported';

export interface NanoSessionOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  onDownloadProgress?: (loaded: number, total: number) => void;
}

export interface SocialPostResult {
  x_en: string;
  threads_zh: string;
}

export class NanoService {
  private static instance: NanoService;
  private activeSession: any = null;

  private constructor() {}

  public static getInstance(): NanoService {
    if (!NanoService.instance) {
      NanoService.instance = new NanoService();
    }
    return NanoService.instance;
  }

  /**
   * 1. 多命名空間探測：相容各版本 Chrome (Dev, Canary, Stable) 的 API 掛載點
   */
  public getAICore(): any {
    if (typeof self !== 'undefined' && (self as any).ai?.languageModel) {
      return (self as any).ai.languageModel;
    }
    if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
      return (window as any).ai.languageModel;
    }
    if (typeof chrome !== 'undefined' && (chrome as any).aiLanguageModel) {
      return (chrome as any).aiLanguageModel;
    }
    if (typeof (self as any).LanguageModel !== 'undefined') {
      return (self as any).LanguageModel;
    }
    return null;
  }

  /**
   * 2. 檢測模型就緒狀態
   */
  public async checkAvailability(): Promise<NanoAvailability> {
    const aiCore = this.getAICore();
    if (!aiCore) {
      return 'unsupported';
    }

    try {
      if (typeof aiCore.capabilities === 'function') {
        const caps = await aiCore.capabilities();
        return (caps.available as NanoAvailability) || 'no';
      }
      if (typeof aiCore.create === 'function') {
        return 'readily';
      }
      return 'no';
    } catch (err) {
      console.warn('[NanoService] capabilities 檢測失敗:', err);
      return 'no';
    }
  }

  /**
   * 3. 建立或重用會話 (維持 Singleton 避免重複分配消耗 GPU VRAM)
   */
  public async getOrCreateSession(options: NanoSessionOptions = {}): Promise<any> {
    if (this.activeSession) {
      return this.activeSession;
    }

    const aiCore = this.getAICore();
    if (!aiCore) {
      throw new Error('當前瀏覽器環境不支援 Chrome Prompt API (請檢查 flags 與版本)');
    }

    const availability = await this.checkAvailability();
    if (availability === 'no' || availability === 'unsupported') {
      throw new Error('Gemini Nano 模型在當前設備無法使用，請確認 chrome://components 中的 Optimization Guide On Device Model');
    }

    const createParams: any = {
      systemPrompt: options.systemPrompt || 'You are a precise technical analyst and social media strategist.',
    };

    if (options.temperature !== undefined) createParams.temperature = options.temperature;
    if (options.topK !== undefined) createParams.topK = options.topK;

    // 監聽本機模型下載進度
    if (options.onDownloadProgress) {
      createParams.monitor = (m: any) => {
        m.addEventListener('downloadprogress', (e: any) => {
          options.onDownloadProgress?.(e.loaded, e.total);
        });
      };
    }

    this.activeSession = await aiCore.create(createParams);
    return this.activeSession;
  }

  /**
   * 4. 基礎推論 (Blocking)
   */
  public async prompt(text: string): Promise<string> {
    const session = await this.getOrCreateSession();
    return await session.prompt(text);
  }

  /**
   * 5. 串流推論 (打字機漸進效果)
   */
  public async promptStreaming(
    text: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const session = await this.getOrCreateSession();
    const stream = session.promptStreaming(text);
    let fullText = '';

    for await (const chunk of stream) {
      fullText = chunk;
      onChunk(fullText);
    }
    return fullText;
  }

  /**
   * 6. 核心業務場景：Pulse 研報快訊轉換為雙語社群貼文
   */
  public async generateSocialPosts(
    title: string,
    summary: string,
    url: string
  ): Promise<SocialPostResult> {
    const systemPrompt = `
You are a senior tech/quant researcher and social media strategist.
Analyze the provided blog update and output strictly valid JSON matching this schema:
{
  "x_en": "Concise, sharp, analytical English post for X. 3-4 bullets. High signal. Ends with URL.",
  "threads_zh": "Conversational, engaging Taiwanese Traditional Chinese (繁體中文) post for Threads. Natural paragraph breaks. Ends with an open question and URL."
}
Do not wrap your output in markdown code blocks like \`\`\`json. Output raw JSON only.
`;

    // 確保指定 System Prompt 生效，先銷毀重啟
    this.destroySession();
    const session = await this.getOrCreateSession({
      systemPrompt,
      temperature: 0.25,
    });

    const userQuery = `
Title: ${title}
Content: ${summary}
Source URL: ${url}
`;

    const rawResponse = await session.prompt(userQuery);
    return this.safeExtractJSON<SocialPostResult>(rawResponse);
  }

  /**
   * 7. 正則過濾與 JSON 容錯解析 (防止 Nano 夾帶 Markdown 代碼塊)
   */
  public safeExtractJSON<T>(text: string): T {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('未在模型輸出中找到 JSON 區塊');
      }
      return JSON.parse(match[0]) as T;
    } catch (e) {
      console.error('[NanoService] JSON 解析失敗，原始文字為:', text);
      throw new Error(`模型輸出格式不符: ${(e as Error).message}`);
    }
  }

  /**
   * 8. 記憶體釋放：主動銷毀會話，釋放顯卡 VRAM
   */
  public destroySession(): void {
    if (this.activeSession) {
      try {
        this.activeSession.destroy();
      } catch (err) {
        console.warn('[NanoService] 銷毀會話時發生微小異常:', err);
      } finally {
        this.activeSession = null;
      }
    }
  }
}
