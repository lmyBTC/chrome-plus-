# 🍅 [ScrumClock] 功能全景與精準架構索引 (AI 導航手冊)

> [!IMPORTANT]
> **AI 開發專用導航指引 (SSOT)**：
> 本文檔為 `chrome_scrumclock` (ScrumClock Power Kit) 之**單一真實來源索引 (SSOT)**。
> 本檔已命名為 `SCRUMCLOCK_README.md`，專門防止多專案工作區下的檔名衝突與 AI 上下文污染。
> 在執行任何功能開發、修復或重構前，**請優先查閱下述矩陣與索引**，直接鎖定目標檔案，嚴禁未經查表即對全目錄進行盲目掃描或巨石檔案全檔讀取，以最大化節省 Token。

---

## 🧭 1. 8 大垂直切片功能模組速查矩陣 (8 Feature Modules Index)

所有功能皆遵循「垂直切片架構」與「門面匯出規範 (Barrel Pattern)」。外部使用時一律透過 `@/features/[module]` 引用。

| 功能模組 | 核心職責 | 門面出口 (`index.ts`) | 專屬型別 (`types.ts`) | 核心視圖元件 (`components/`) | 服務與邏輯層 (`services/` / `utils/`) | 測試/除錯工具 (`dev-tools/`) | 對應規格文件 (`docs/`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. ScrumClock (番茄鐘 - 執行態)** | 當前 25 分鐘衝刺計時、今日焦點戰役 (Focus Battles) 執行、結算回顧與靈感閃電捕捉。介面聚焦高專注執行，提供快速導航至專案池挑選任務 | `src/features/scrumclock/index.ts` | `src/features/scrumclock/types.ts` | - `DailyMissionBriefing.tsx`<br>  ↳ `briefing/BriefingMissionSelector.tsx`<br>  ↳ `briefing/BriefingCalendarSchedule.tsx`<br>  ↳ `briefing/BriefingSettingsDrawer.tsx`<br>- `SprintPomodoro.tsx`<br>  ↳ `sprint/SprintBattleItem.tsx`<br>  ↳ `sprint/SprintMarkdownImporter.tsx`<br>  ↳ `sprint/SprintResultModal.tsx`<br>- `EndOfDayReview.tsx`<br>- `QuickCapture.tsx` | `contexts/TimerContext.tsx` (全域計時狀態與事件發布) | - | `docs/productivity-workflow-guide.md`<br>`docs/workflow-flowchart.md` |
| **2. AI Sidebar (AI 對話助理)** | 側邊欄即時對話、網頁內容上下文分析、剪貼簿文字處理、本地 AI 整合（採按需延遲載入 `AIAssistantView`，避免啟動效能損耗） | `src/features/ai-sidebar/index.ts` | `src/features/ai-sidebar/types.ts` | `AIAssistantView.tsx` (側邊欄對話互動面板)<br>`AISidebar.tsx` | - `src/utils/ai-helper.ts`<br>- `src/utils/ai-prompts.ts`<br>- `src/utils/ai-schemas.ts` | `src/features/ai-sidebar/dev-tools/README.md`<br>(對應測試腳本 `tests/prompt-eval.ts`) | `docs/gemini-nano-tool.md`<br>`docs/ai-feature-update-guide.md` |
| **3. Toolbox (工具箱中樞)** | 擴充工具箱總入口，支援 `isSidebar` 緊湊模式，原生整合圖片擷取、行為監控與影音字幕收集 | `src/features/toolbox/index.ts` | `src/features/toolbox/types.ts` | `ToolboxHub.tsx` (工具箱選單中樞視圖，支援 `isSidebar`) | - | - | - |
| ↳ **Sub: Image Scraper** | 網頁圖片批次擷取、IG 動態解析、高畫質升級、多格式篩選、ZIP 批次下載 | `src/features/toolbox/tools/image-scraper/index.ts` | `src/features/toolbox/tools/image-scraper/types.ts` | `ImageScraper.tsx` (主狀態調度容器)<br>  ↳ `components/ScraperInputBar.tsx`<br>  ↳ `components/ScraperFilterBar.tsx`<br>  ↳ `components/ScraperImageList.tsx`<br>  ↳ `components/ScraperDownloadControls.tsx`<br>  ↳ `components/ScraperPreviewModal.tsx` | 策略模式架構：<br>- `services/imageExtractor.ts` (主調度門面與爬取工作流)<br>- `services/instagramExtractor.ts` (IG 策略)<br>- `services/carouselExtractor.ts` (輪播策略)<br>- `services/extractorUtils.ts` (通用解析工具)<br>- `services/downloader.ts` (ZIP/單檔下載與目錄存取) | `src/features/toolbox/tools/image-scraper/dev-tools/` (包含 IG 探測腳本與離線樣本) | `docs/image-scraper-spec.md`<br>`src/features/toolbox/tools/image-scraper/功能說明.md` |
| ↳ **Sub: Activity Monitor** | 當前分頁敏感權限（鏡頭/麥克風/定位/剪貼簿）實時審查與安全日誌 | `src/features/toolbox/tools/activity-monitor/index.ts` | `src/features/toolbox/tools/activity-monitor/types.ts` | `ActivityMonitor.tsx` (權限卡片、日誌串流) | - | - | `src/features/toolbox/tools/activity-monitor/功能說明.md` |
| ↳ **Sub: Subtitle Collector** | 跨插件收集影音字幕與筆記快照，支援時間戳跳轉、Markdown 導出、本地 SRT 拖放解析匯入與今日戰役/收件匣任務轉化 | `src/features/toolbox/tools/subtitle-collector/index.ts` | `src/features/toolbox/tools/subtitle-collector/types.ts` | `SubtitleCollector.tsx` (搜尋列、標籤過濾、卡片流、SRT拖放) | - `services/srtParser.ts` (SRT 解析與轉化)<br>- `services/subtitleConverter.ts` (今日戰役與收件匣轉接器)<br>- `chrome.storage.local` (`capturedNotes`) 即時同步 | - | `src/features/toolbox/tools/subtitle-collector/功能說明.md` |
| **4. Project Mgmt (專案規劃看板 - 規劃態)** | 專案規劃核心中樞（已正名為「專案規劃看板」），整合每週任務池 Backlog、待辦收件匣 (Inbox)、歷史衝刺日誌看板、AI 任務拆解、Google Sheets 雙向同步；支援 Linear 風格單行清單、右側滑出式任務詳情抽屜 (TaskDetailDrawer) 與批次一鍵推入今日焦點戰役 (Focus Battles) | `src/features/project-management/index.ts` | `src/features/project-management/types.ts` | `ProjectManagementDemo.tsx` (主視圖容器)<br>  ↳ `components/tabs/TaskPoolTab.tsx`<br>  ↳ `components/tabs/TaskDetailDrawer.tsx`<br>  ↳ `components/tabs/InboxTab.tsx`<br>  ↳ `components/tabs/SprintLogsTab.tsx`<br>  ↳ `components/modals/SyncSettingsModal.tsx` | - `hooks/useProjectManagement.ts` (狀態與 CRUD Hook)<br>- `src/core/api/sync.ts` (雙向雲端同步引擎) | - | `docs/user-story-spec.md` |
| **5. Analytics (數據分析)** | 每日專注時長統計、每週生產力柱狀圖 (Chart.js)、完成任務總結報表 | `src/features/analytics/index.ts` | `src/features/analytics/types.ts` | `AnalyticsDashboard.tsx` (圖表與報告面板) | - | - | - |
| **6. Bookmarks (辦公室傳送門)** | 常用辦公服務傳送門（Google Tasks, Notion, Jira, GitHub）書籤與導航 | `src/features/bookmarks/index.ts` | `src/features/bookmarks/types.ts` | `BookmarksHub.tsx` (自訂圖示與快速開啟面板) | - | - | - |
| **7. Gemini Exporter (對話匯出)** | Gemini 官方網頁對話自動偵測、Markdown 結構化轉換與本機檔案下載 | `src/features/gemini-exporter/index.ts` | `src/features/gemini-exporter/types.ts` | `GeminiManager.tsx` (對話清單管理面板) | - `utils/exporter.ts` (Markdown 轉換與觸發下載)<br>- **注入腳本**：`src/geminiContent.ts` | - | `docs/gemini-content-spec.md` |
| **8. Experimental SRT (字幕實驗室)** | 字幕檔案解析原型（解析核心已整併至 Subtitle Collector，維持代理相容） | `src/features/experimental-srt/index.ts` | `types/srt.ts` | `SrtReader.tsx` | `utils/srtParser.ts` (已代理轉接至 Subtitle Collector) | - | - |
| **9. Finance Integration (投研自選看板)** | 載入 Clipper 投研快照 JSON、華爾街目標價偏離程度展示、深度投研清單 (Checklist) 聯動與 25m 番茄鐘專注日誌產出 (支援 `ToolboxHub` isSidebar 與獨立頁面) | `src/features/finance-integration/index.ts` | `src/features/finance-integration/types.ts` | `WatchListWidget.tsx` (支援 `isSidebar`) | - `financeClient.ts` (快照防腐解析、Local 快照與日誌儲存、Clipper 通訊)<br>- `contexts/TimerContext.tsx` 整合 | - | `0.doc_mg/docs/cross_plugin_contract.md` |

---

## 🔌 2. Chrome Extension 核心生命週期與入口索引

| 入口檔案 | 類型 / 職責 | 關鍵依賴與通訊機制 | 備註 |
| :--- | :--- | :--- | :--- |
| `src/background.ts` | **Background Service Worker** | `chrome.alarms`, `chrome.notifications`, `chrome.commands`, `chrome.contextMenus` | 背景常駐事件路由中心 (96 行)。業務邏輯分流至：<br>- `src/background/alarmHandlers.ts` (定時鬧鐘)<br>- `src/background/externalService.ts` (外部通訊與 Offscreen 音效) |
| `src/content.ts` | **全域 Content Script** | 注入於 `<all_urls>` | 網頁端快捷鍵攔截、輔助 DOM 操作 |
| `src/geminiContent.ts` | **Gemini 專屬 Content Script** | 注入於 `https://gemini.google.com/*`，Shadow DOM 封裝 | 自動監聽對話變更、浮動按鈕、一鍵同步至 Extension Storage |
| `src/entries/sidebar/` | **Side Panel (側邊欄)** | `main.tsx`, `components/AIAssistantView.tsx`, `hooks.ts`, `index.html` | 側邊欄完整工作區視圖 (123 行)。提供「🧰 實用工具箱 (ToolboxHub)」與「🤖 PK+ 助理 (AIAssistantView)」雙分頁切換，預設按需延遲載入 Gemini Nano，避免啟動效能損耗。`hooks.ts` 為門面 (8 行)，子 Hooks 位於 `src/entries/sidebar/hooks/`：<br>- `useAISession.ts` (AI 對話 session)<br>- `useTimerSync.ts` (計時器同步)<br>- `useContextMenuSync.ts` (右鍵選單同步) |
| `src/entries/newtab/` | **New Tab (新分頁)** | `main.tsx`, `index.html` | 新分頁主儀表板，整合每日作戰簡報與全景工作台 |
| `src/entries/popup/` | **Popup (快顯小窗)** | `main.tsx`, `index.html` | 點擊瀏覽器工具列圖示彈出之快速面板 |
| `src/entries/options/` | **Options (設定頁面)** | `main.tsx`, `index.html` | 整合 `SettingsPanel.tsx`，配置 API Key、同步網址與偏好 |

---

## 🧱 3. 基礎架構與通用模組索引 (Core & Utilities)

| 目錄 / 模組 | 檔案路徑 | 核心職責 |
| :--- | :--- | :--- |
| **Chrome 本地儲存** | `src/core/chrome/storage.ts` | 封裝 `chrome.storage.local`，提供型別安全的非同步讀寫快取 |
| **雲端雙向同步** | `src/core/api/sync.ts`<br>`src/core/api/offlineQueue.ts` | 離線佇列、網路恢復自動重試、雲端資料雙向比對 |
| **任務適配器介面** | `src/core/api/ITaskAdapter.ts`<br>`src/core/api/adapters/GoogleTaskAdapter.ts` | Google Tasks、Notion Webhook 介面抽換與適配 |
| **全域版面框架** | `src/core/layout/MainLayout.tsx`<br>`src/core/layout/Sidebar.tsx`<br>`src/core/layout/CommandPalette.tsx` | 應用程式頂部導航、側邊選單、鍵盤快捷命令列 (`Ctrl+P` / `Cmd+K`) |
| **AI 引擎核心** | `src/utils/ai-helper.ts`<br>`src/utils/ai-prompts.ts`<br>`src/utils/ai-schemas.ts` | Chrome 內建 Gemini Nano Prompt API、外接 Gemini API Key 調用、Prompt 系統提示詞、JSON Action 解析規範 |
| **文字與標籤解析** | `src/utils/markdown.tsx`<br>`src/utils/task-parser.ts` | 輕量 Markdown 渲染元件、文字自然語言任務時間解析 |
| **頂層通用元件** | `src/components/SettingsPanel.tsx`<br>`src/components/InstallDocs.tsx` | 全域系統設定視窗、初次安裝指引手冊 |

---

## ⚠️ 4. 巨石檔案與熱區警示 (Token 節約重點提醒)

以下檔案程式碼行數龐大 (>500 行)。**AI 讀取或修改時，切勿全文載入，必須先用 `grep_search` 定位關鍵行號，再搭配 `view_file` (指定 `StartLine`/`EndLine`) 局部讀取**：

- 🔴 `src/geminiContent.ts` (~569 行) - Gemini 網頁注入 Content Script
- 🔴 `src/components/InstallDocs.tsx` (~558 行) - 系統安裝說明文檔元件

#### 🟢 模組化瘦身成功紀錄 (已自巨石清單除名)
- 🟢 `src/features/project-management/components/ProjectManagementDemo.tsx` (826 行 ➔ 156 行) - 解耦抽離任務池、收件匣、衝刺日誌與同步設定視窗至 `components/`，並封裝 `useProjectManagement` Hook
- 🟢 `src/features/toolbox/tools/image-scraper/ImageScraper.tsx` (1,252 行 ➔ 341 行) - 解耦抽離輸入主控、篩選器、圖片列表、下載控制與預覽燈箱至 `components/`
- 🟢 `src/features/scrumclock/components/DailyMissionBriefing.tsx` (700 行 ➔ 194 行) - 解耦抽離任務選取器、行事曆提醒與設定抽屜至 `components/briefing/`
- 🟢 `src/entries/sidebar/main.tsx` (658 行 ➔ 123 行) - 解耦抽離 AIAssistantView 子元件實現按需延遲載入 (Lazy Loading)，並原生嵌入 ToolboxHub isSidebar 自適應模式
- 🟢 `src/features/toolbox/tools/image-scraper/services/imageExtractor.ts` (1,939 行 ➔ 287 行) - 策略模式重構完成，平台解析已分流
- 🟢 `src/features/scrumclock/components/SprintPomodoro.tsx` (758 行 ➔ 412 行) - 任務項目、Markdown 匯入與結算彈窗已解耦至 `components/sprint/`
- 🟢 `src/entries/sidebar/hooks.ts` (653 行 ➔ 8 行) - 抽離為 `useAISession`、`useTimerSync`、`useContextMenuSync`
- 🟢 `src/background.ts` (467 行 ➔ 96 行) - 拆分為 `alarmHandlers.ts` 與 `externalService.ts`


---

## 📚 5. 專案設計與規格文件索引 (`docs/` 索引)

| 規格文件名稱 | 相對路徑 | 內容重點 |
| :--- | :--- | :--- |
| **架構地圖與維護指南** | `docs/features-architecture-guide.md` | 垂直切片規範、Barrel Export 導出準則、模組邊界定義 |
| **圖片擷取器規格書** | `docs/image-scraper-spec.md` | 圖片抓取邏輯、IG 解析策略、下載佇列併發設計 |
| **Gemini 注入規格書** | `docs/gemini-content-spec.md` | Content Script 注入規則、DOM 擷取與 Markdown 轉換流程 |
| **Gemini Nano 整合手冊** | `docs/gemini-nano-tool.md` | Chrome 內建 AI Prompt API 與外接 API Key 雙軌架構說明 |
| **生產力敏捷工作流** | `docs/productivity-workflow-guide.md` | 雙圈回饋 (今日戰役 + 每週專案)、番茄鐘衝刺與防禦設計 |
| **使用者故事與驗收標準**| `docs/user-story-spec.md` | 核心角色痛點 (Max)、敏捷流程故事與驗收條件 (AC) |
| **暗色系設計系統** | `docs/dark_theme_design_system.md` | TailwindCSS 色彩規範、高質感暗色主題元件設計風格 |
| **Google Apps Script 串接**| `docs/google-apps-script.md` | Google 日曆不可打擾事件建立、試算表自動化記錄腳本 |
| **工作流流程圖** | `docs/workflow-flowchart.md` | Mermaid 繪製之整體數據流與狀態機轉移圖 |
