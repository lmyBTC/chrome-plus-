# Chrome ScrumClock 全功能模組架構地圖與維護指南

本文檔為 `chrome_scrumclock` 插件之架構維護指南，定義專案推行「垂直切片架構 (Vertical Slice Architecture)」與「門面匯出模式 (Barrel Export Pattern)」後的模組標準佈局與開發準則。

---

## 1. 架構核心原則

1. **就地收斂 (Co-location)**：各功能的型別定義 (`types.ts`)、服務模組 (`services/`)、測試/除錯工具 (`dev-tools/`) 與功能文件皆封裝於該 Feature 資料夾內。
2. **門面匯出 (Barrel Pattern)**：每個 Feature 資料夾根目錄必須具備 `index.ts`，外部元件僅允許透過 `@/features/[module]` 匯入，嚴禁跨層引用內部子目錄。
3. **單一真實來源 (SSOT)**：各模組專屬介面定義在模組內，跨全域狀態則集中於 `src/types/index.ts`，避免重複介面宣告。

---

## 2. 8 大功能模組全景地圖

| 模組名稱 | 目錄路徑 | 核心職責 | 門面出口 | 專屬型別 | 開發除錯資源 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ScrumClock** | `src/features/scrumclock/` | 番茄鐘衝刺計時、每日戰役規劃、結算回顧、閃電捕捉 | `DailyMissionBriefing`, `SprintPomodoro`, `EndOfDayReview`, `QuickCapture`, `useTimer` | `types.ts` | - |
| **AI Sidebar** | `src/features/ai-sidebar/` | 本地 AI 與雲端模型即時對話、網頁上下文解析、剪貼簿助手 | `AISidebar` | `types.ts` | `dev-tools/README.md` (對齊 `tests/prompt-eval.ts`) |
| **Toolbox** | `src/features/toolbox/` | 擴充工具箱中樞，包含圖片批次抓取器 (Image Scraper) | `ToolboxHub`, `ImageScraper` | `types.ts` | `tools/image-scraper/dev-tools/` |
| **Project Mgmt** | `src/features/project-management/` | 每週專案任務池、收件匣 (Inbox)、衝刺紀錄 (Sprint Logs) | `ProjectManagementDemo` | `types.ts` | - |
| **Analytics** | `src/features/analytics/` | 生產力圖表可視化、每日/每週完成任務統計報表 | `AnalyticsDashboard` | `types.ts` | - |
| **Bookmarks** | `src/features/bookmarks/` | 常用工具與雲端同步服務傳送門書籤 | `BookmarksHub` | `types.ts` | - |
| **Gemini Exporter** | `src/features/gemini-exporter/` | 官方 Gemini 頁面對話擷取、Markdown 轉換與匯出下載 | `GeminiManager`, `convertToMarkdown`, `triggerDownload` | `types.ts` | 注入腳本：`src/geminiContent.ts` |
| **Experimental SRT** | `src/features/experimental-srt/` | 字幕解析與實驗性功能原型 | `SrtReader` | `types/srt.ts` | `utils/srtParser.ts` |

---

## 3. 跨層依賴與 Content Script 整合規範

1. **Gemini Content Script (`src/geminiContent.ts`)**：
   - 職責：注入至 `https://gemini.google.com/*` 執行 DOM 監聽與擷取。
   - 型別共用：直接引用 `@/features/gemini-exporter/types`，確保資料欄位與 Exporter 元件 100% 同步。
   - 打包配置：在 `vite.config.ts` 中獨立打包為 `dist/geminiContent.js`，完全合規 Manifest V3。

2. **外部調用範例**：
   ```typescript
   // 正確：透過門面匯入
   import { QuickCapture } from '@/features/scrumclock';
   import { ImageScraper } from '@/features/toolbox';
   import { AISidebar } from '@/features/ai-sidebar';

   // 錯誤：禁止跨層深入私有路徑
   import { QuickCapture } from '@/features/scrumclock/components/QuickCapture';
   import { ImageScraper } from '@/features/toolbox/tools/image-scraper';
   ```

---

## 4. 巨石檔案監控清單 (未來重構候選)

下列檔案程式碼行數較大 (>500 行)，建議後續進行單元拆解與子元件解耦：
- `src/features/toolbox/tools/image-scraper/ImageScraper.tsx` (1008 行)
- `src/features/project-management/components/ProjectManagementDemo.tsx` (778 行)
- `src/features/scrumclock/components/SprintPomodoro.tsx` (711 行)
- `src/features/scrumclock/components/DailyMissionBriefing.tsx` (649 行)
- `src/features/toolbox/tools/image-scraper/services/imageExtractor.ts` (640 行)
- `src/geminiContent.ts` (569 行)
- `src/components/InstallDocs.tsx` (558 行)
