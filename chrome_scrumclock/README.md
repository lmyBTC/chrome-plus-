# 🍅 ScrumClock (Power Kit) - 功能全景與精準架構索引 (AI 導航手冊)

> [!IMPORTANT]
> **AI 開發專用導航指引**：本文件為 `chrome_scrumclock` 插件之**單一真實來源索引 (SSOT)**。在執行任何功能開發、修復或重構前，**請優先查閱下述矩陣與索引**，直接鎖定目標檔案，嚴禁未經查表即對全目錄進行盲目掃描或巨石檔案全檔讀取，以最大化節省 Token。

---

## 🧭 1. 8 大垂直切片功能模組速查矩陣 (8 Feature Modules Index)

所有功能皆遵循「垂直切片架構」與「門面匯出規範 (Barrel Pattern)」。外部使用時一律透過 `@/features/[module]` 引用。

| 功能模組 | 核心職責 | 門面出口 (`index.ts`) | 專屬型別 (`types.ts`) | 核心視圖元件 (`components/`) | 服務與邏輯層 (`services/` / `utils/`) | 測試/除錯工具 (`dev-tools/`) | 對應規格文件 (`docs/`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. ScrumClock (番茄鐘)** | 敏捷衝刺計時、每日作戰規劃、結算回顧、閃電捕捉 | [`features/scrumclock/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/scrumclock/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/scrumclock/types.ts) | - `DailyMissionBriefing.tsx`<br>- `SprintPomodoro.tsx`<br>- `EndOfDayReview.tsx`<br>- `QuickCapture.tsx` | `contexts/TimerContext.tsx` (全域計時狀態與事件發布) | - | [`productivity-workflow-guide.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/productivity-workflow-guide.md)<br>[`workflow-flowchart.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/workflow-flowchart.md) |
| **2. AI Sidebar (AI 對話助理)** | 側邊欄即時對話、網頁內容上下文分析、剪貼簿文字處理、本地 AI 整合 | [`features/ai-sidebar/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/ai-sidebar/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/ai-sidebar/types.ts) | `AISidebar.tsx` (側邊欄對話互動面板) | - `src/utils/ai-helper.ts`<br>- `src/utils/ai-prompts.ts`<br>- `src/utils/ai-schemas.ts` | [`dev-tools/README.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/ai-sidebar/dev-tools/README.md)<br>(對應測試腳本 `tests/prompt-eval.ts`) | [`gemini-nano-tool.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/gemini-nano-tool.md)<br>[`ai-feature-update-guide.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/ai-feature-update-guide.md) |
| **3. Toolbox (工具箱中樞)** | 擴充工具箱總入口，整合圖片批次擷取器 (Image Scraper) | [`features/toolbox/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/types.ts) | `ToolboxHub.tsx` (工具箱選單中樞視圖) | - | - | - |
| ↳ **Sub: Image Scraper** | 網頁圖片批次擷取、IG 動態解析、高畫質升級、多格式篩選、ZIP 批次下載 | [`tools/image-scraper/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/types.ts) | `ImageScraper.tsx` (主互動介面、篩選列、預覽燈箱) | - `services/imageExtractor.ts`<br>- `services/downloader.ts` | [`dev-tools/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/dev-tools/) (包含 IG 探測腳本與離線樣本) | [`image-scraper-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/image-scraper-spec.md)<br>[`功能說明.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/功能說明.md) |
| **4. Project Mgmt (專案管理)** | 每週專案核心戰役、待辦收件匣 (Inbox)、歷史衝刺日誌看板 | [`features/project-management/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/project-management/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/project-management/types.ts) | `ProjectManagementDemo.tsx` (任務池與甘特進度清單) | `src/core/api/sync.ts` (雙向雲端同步引擎) | - | [`user-story-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/user-story-spec.md) |
| **5. Analytics (數據分析)** | 每日專注時長統計、每週生產力柱狀圖 (Chart.js)、完成任務總結報表 | [`features/analytics/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/analytics/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/analytics/types.ts) | `AnalyticsDashboard.tsx` (圖表與報告面板) | - | - | - |
| **6. Bookmarks (辦公室傳送門)** | 常用辦公服務傳送門（Google Tasks, Notion, Jira, GitHub）書籤與導航 | [`features/bookmarks/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/bookmarks/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/bookmarks/types.ts) | `BookmarksHub.tsx` (自訂圖示與快速開啟面板) | - | - | - |
| **7. Gemini Exporter (對話匯出)** | Gemini 官方網頁對話自動偵測、Markdown 結構化轉換與本機檔案下載 | [`features/gemini-exporter/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/gemini-exporter/index.ts) | [`types.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/gemini-exporter/types.ts) | `GeminiManager.tsx` (對話清單管理面板) | - `utils/exporter.ts` (Markdown 轉換與觸發下載)<br>- **注入腳本**：[`src/geminiContent.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/geminiContent.ts) | - | [`gemini-content-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/gemini-content-spec.md) |
| **8. Experimental SRT (字幕實驗室)** | 字幕檔案解析、時間軸匹配與實驗性原型視圖 | [`features/experimental-srt/index.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/experimental-srt/index.ts) | `types/srt.ts` | `SrtReader.tsx` | `utils/srtParser.ts` | - | - |

---

## 🔌 2. Chrome Extension 核心生命週期與入口索引

| 入口檔案 | 類型 / 職責 | 關鍵依賴與通訊機制 | 備註 |
| :--- | :--- | :--- | :--- |
| [`src/background.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/background.ts) | **Background Service Worker** | `chrome.alarms`, `chrome.notifications`, `chrome.commands`, `chrome.contextMenus` | 背景常駐事件處理中心、番茄鐘定時器喚醒、右鍵選單 |
| [`src/content.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/content.ts) | **全域 Content Script** | 注入於 `<all_urls>` | 網頁端快捷鍵攔截、輔助 DOM 操作 |
| [`src/geminiContent.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/geminiContent.ts) | **Gemini 專屬 Content Script** | 注入於 `https://gemini.google.com/*`，Shadow DOM 封裝 | 自動監聽對話變更、浮動按鈕、一鍵同步至 Extension Storage |
| [`src/entries/sidebar/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/sidebar/) | **Side Panel (側邊欄)** | `main.tsx`, `hooks.ts`, `index.html` | 側邊欄完整工作區視圖，包含計時器、AI、工具箱、任務操作 |
| [`src/entries/newtab/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/newtab/) | **New Tab (新分頁)** | `main.tsx`, `index.html` | 新分頁主儀表板，整合每日作戰簡報與全景工作台 |
| [`src/entries/popup/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/popup/) | **Popup (快顯小窗)** | `main.tsx`, `index.html` | 點擊瀏覽器工具列圖示彈出之快速面板 |
| [`src/entries/options/`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/options/) | **Options (設定頁面)** | `main.tsx`, `index.html` | 整合 `SettingsPanel.tsx`，配置 API Key、同步網址與偏好 |

---

## 🧱 3. 基礎架構與通用模組索引 (Core & Utilities)

| 目錄 / 模組 | 檔案路徑 | 核心職責 |
| :--- | :--- | :--- |
| **Chrome 本地儲存** | [`src/core/chrome/storage.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/chrome/storage.ts) | 封裝 `chrome.storage.local`，提供型別安全的非同步讀寫快取 |
| **雲端雙向同步** | [`src/core/api/sync.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/api/sync.ts)<br>[`src/core/api/offlineQueue.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/api/offlineQueue.ts) | 離線佇列、網路恢復自動重試、雲端資料雙向比對 |
| **任務適配器介面** | [`src/core/api/ITaskAdapter.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/api/ITaskAdapter.ts)<br>[`src/core/api/adapters/GoogleTaskAdapter.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/api/adapters/GoogleTaskAdapter.ts) | Google Tasks、Notion Webhook 介面抽換與適配 |
| **全域版面框架** | [`src/core/layout/MainLayout.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/layout/MainLayout.tsx)<br>[`src/core/layout/Sidebar.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/layout/Sidebar.tsx)<br>[`src/core/layout/CommandPalette.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/core/layout/CommandPalette.tsx) | 應用程式頂部導航、側邊選單、鍵盤快捷命令列 (`Ctrl+P` / `Cmd+K`) |
| **AI 引擎核心** | [`src/utils/ai-helper.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/ai-helper.ts)<br>[`src/utils/ai-prompts.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/ai-prompts.ts)<br>[`src/utils/ai-schemas.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/ai-schemas.ts) | Chrome 內建 Gemini Nano Prompt API、外接 Gemini API Key 調用、Prompt 系統提示詞、JSON Action 解析規範 |
| **文字與標籤解析** | [`src/utils/markdown.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/markdown.tsx)<br>[`src/utils/task-parser.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/utils/task-parser.ts) | 輕量 Markdown 渲染元件、文字自然語言任務時間解析 |
| **頂層通用元件** | [`src/components/SettingsPanel.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/components/SettingsPanel.tsx)<br>[`src/components/InstallDocs.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/components/InstallDocs.tsx) | 全域系統設定視窗、初次安裝指引手冊 |

---

## ⚠️ 4. 巨石檔案與熱區警示 (Token 節約重點提醒)

以下檔案程式碼行數龐大 (>500 行)。**AI 讀取或修改時，切勿全文載入，必須先用 `grep_search` 定位關鍵行號，再搭配 `view_file` (指定 `StartLine`/`EndLine`) 局部讀取**：

- 🔴 [`src/features/toolbox/tools/image-scraper/ImageScraper.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/ImageScraper.tsx) (~1,008 行) - 圖片下載主互動視圖
- 🔴 [`src/features/project-management/components/ProjectManagementDemo.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx) (~778 行) - 任務管理清單視圖
- 🔴 [`src/features/scrumclock/components/SprintPomodoro.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/scrumclock/components/SprintPomodoro.tsx) (~711 行) - 番茄鐘衝刺計時面板
- 🔴 [`src/features/scrumclock/components/DailyMissionBriefing.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/scrumclock/components/DailyMissionBriefing.tsx) (~649 行) - 每日作戰目標簡報面板
- 🔴 [`src/features/toolbox/tools/image-scraper/services/imageExtractor.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/toolbox/tools/image-scraper/services/imageExtractor.ts) (~640 行) - 圖片抓取與注入腳本
- 🔴 [`src/entries/sidebar/main.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/sidebar/main.tsx) (~658 行) - 側邊欄全域主互動控制器
- 🔴 [`src/geminiContent.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/geminiContent.ts) (~569 行) - Gemini 網頁注入 Content Script
- 🔴 [`src/components/InstallDocs.tsx`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/components/InstallDocs.tsx) (~558 行) - 系統安裝說明文檔元件
- 🔴 [`src/entries/sidebar/hooks.ts`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/entries/sidebar/hooks.ts) (~543 行) - 側邊欄狀態同步 Hooks

---

## 📚 5. 專案設計與規格文件索引 (`docs/` 索引)

| 規格文件名稱 | 路徑 | 內容重點 |
| :--- | :--- | :--- |
| **架構地圖與維護指南** | [`docs/features-architecture-guide.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/features-architecture-guide.md) | 垂直切片規範、Barrel Export 導出準則、模組邊界定義 |
| **圖片擷取器規格書** | [`docs/image-scraper-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/image-scraper-spec.md) | 圖片抓取邏輯、IG 解析策略、下載佇列併發設計 |
| **Gemini 注入規格書** | [`docs/gemini-content-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/gemini-content-spec.md) | Content Script 注入規則、DOM 擷取與 Markdown 轉換流程 |
| **Gemini Nano 整合手冊** | [`docs/gemini-nano-tool.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/gemini-nano-tool.md) | Chrome 內建 AI Prompt API 與外接 API Key 雙軌架構說明 |
| **生產力敏捷工作流** | [`docs/productivity-workflow-guide.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/productivity-workflow-guide.md) | 雙圈回饋 (今日戰役 + 每週專案)、番茄鐘衝刺與防禦設計 |
| **使用者故事與驗收標準**| [`docs/user-story-spec.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/user-story-spec.md) | 核心角色痛點 (Max)、敏捷流程故事與驗收條件 (AC) |
| **暗色系設計系統** | [`docs/dark_theme_design_system.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/dark_theme_design_system.md) | TailwindCSS 色彩規範、高質感暗色主題元件設計風格 |
| **Google Apps Script 串接**| [`docs/google-apps-script.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/google-apps-script.md) | Google 日曆不可打擾事件建立、試算表自動化記錄腳本 |
| **工作流流程圖** | [`docs/workflow-flowchart.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/docs/workflow-flowchart.md) | Mermaid 繪製之整體數據流與狀態機轉移圖 |
