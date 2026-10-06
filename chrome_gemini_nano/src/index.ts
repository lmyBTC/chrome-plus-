/**
 * 遵循專案垂直切片架構之 Barrel Export 規範
 *
 * @related ../chrome_gemini_nano_README.md  (核心模組導航)
 * @related ./components/SocialDispatcher.tsx (匯出: 主元件)
 * @related ./services/toneShifter.ts        (匯出: 調音算子)
 * @related ./services/nanoService.ts        (匯出: Nano 核心推論服務)
 * @related ./services/nanoIntentRouter.ts   (匯出: 自然語言意圖路由器)
 * @related ./types.ts                      (匯出: 型別定義)
 */

export { SocialDispatcher } from './components/SocialDispatcher';
export { ToneShifter } from './services/toneShifter';
export { NanoService } from './services/nanoService';
export { NanoIntentRouter } from './services/nanoIntentRouter';
export * from './types';
