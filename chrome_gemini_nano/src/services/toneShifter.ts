/**
 * toneShifter.ts - 專屬 Gemini Nano 調音算子庫
 * 針對社群草稿提供 4 大極速、零延遲的局部文案打磨算子
 *
 * @related ../../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./nanoService.ts                   (上游: AI 推論引擎)
 * @related ../types.ts                        (型別: ToneShiftMode, ToneShiftResult)
 * @related ../components/SocialDispatcher.tsx (下游: UI 消費者)
 */

import { NanoService } from './nanoService';
import { ToneShiftMode, ToneShiftResult } from '../types';

export class ToneShifter {
  private static instance: ToneShifter;
  private nano = NanoService.getInstance();

  private constructor() {}

  public static getInstance(): ToneShifter {
    if (!ToneShifter.instance) {
      ToneShifter.instance = new ToneShifter();
    }
    return ToneShifter.instance;
  }

  /**
   * 1. 觀點銳化 (Sharpen)：消除被動語態，直接將最強烈之反常識結論或數據移至首句
   */
  public async sharpen(text: string): Promise<ToneShiftResult> {
    const systemPrompt = `
You are an elite quantitative analyst and copywriter.
Sharpen the user's draft by:
1. Moving the core counter-intuitive data or finding directly to the very first sentence.
2. Removing passive voice, generic corporate fillers, and introductory fluff.
3. Keeping the tone confident, decisive, and punchy.
4. Preserving all quantitative figures and URLs.
Output the sharpened text directly. Do not add explanations or quotes.
`;
    this.nano.destroySession();
    const session = await this.nano.getOrCreateSession({ systemPrompt, temperature: 0.2 });
    const shifted = (await session.prompt(text)).trim();

    return {
      mode: 'sharpen',
      original: text,
      shifted
    };
  }

  /**
   * 2. 字數壓線 (Fit 280)：將英文精準壓縮在 240~270 字元之間，保留原始數字與 URL
   */
  public async fit280(text: string): Promise<ToneShiftResult> {
    const systemPrompt = `
You are a Twitter/X character optimization specialist.
Rewrite the provided English text strictly under 270 characters (aim for 240-265 characters):
1. Preserve all key metric numbers, ticker symbols ($TICKER), and URLs.
2. Use concise phrasing, dashes, or bullet points.
3. Never truncate mid-sentence.
Output strictly the rewritten tweet text only without commentary.
`;
    this.nano.destroySession();
    const session = await this.nano.getOrCreateSession({ systemPrompt, temperature: 0.1 });
    const shifted = (await session.prompt(text)).trim();

    return {
      mode: 'fit280',
      original: text,
      shifted
    };
  }

  /**
   * 3. 在地去油 (De-jargon)：消除「賦能、閉環、抓手、底層邏輯」等詞彙，轉換為台灣科技與投資圈口語
   */
  public async dejargon(text: string): Promise<ToneShiftResult> {
    const systemPrompt = `
你是一位熟悉台灣科技圈與量化投資社群的專業文字編輯。
請將提供的貼文進行「去油打磨」：
1. 嚴格過濾「賦能、閉環、抓手、打法、落地、底層邏輯、背書」等非台灣本土語彙，替換為自然、在地的繁體中文口語表達。
2. 維持真實誠懇、啟發討論的視角，段落自然分行。
3. 務必保留關鍵數字與原始網址。
直接輸出打磨後的完整繁體中文內容，切勿加上前後註解或額外說明。
`;
    this.nano.destroySession();
    const session = await this.nano.getOrCreateSession({ systemPrompt, temperature: 0.25 });
    const shifted = (await session.prompt(text)).trim();

    return {
      mode: 'dejargon',
      original: text,
      shifted
    };
  }

  /**
   * 4. 長文切 Thread (Split Thread)：將長文重組為 3 則帶有編號 (1/3, 2/3, 3/3) 的推文鏈
   */
  public async splitThread(text: string): Promise<ToneShiftResult> {
    const systemPrompt = `
You are a Twitter Thread architect.
Split and reorganize the provided post into a 3-part thread (labeled 1/3, 2/3, 3/3):
Part 1: The Hook and core surprising problem/data.
Part 2: The deep mechanism or analytical breakdown.
Part 3: The forward-looking takeaway and reference URL.
Separate each tweet clearly with "---TWEET---".
Output only the thread parts.
`;
    this.nano.destroySession();
    const session = await this.nano.getOrCreateSession({ systemPrompt, temperature: 0.2 });
    const rawOutput = (await session.prompt(text)).trim();

    return {
      mode: 'splitThread',
      original: text,
      shifted: rawOutput
    };
  }

  /**
   * 統一呼叫調音算子
   */
  public async shift(mode: ToneShiftMode, text: string): Promise<ToneShiftResult> {
    switch (mode) {
      case 'sharpen':
        return this.sharpen(text);
      case 'fit280':
        return this.fit280(text);
      case 'dejargon':
        return this.dejargon(text);
      case 'splitThread':
        return this.splitThread(text);
      default:
        throw new Error(`未知的調音模式: ${mode}`);
    }
  }
}
