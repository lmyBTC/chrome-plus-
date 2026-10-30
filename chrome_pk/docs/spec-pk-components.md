# PK+ (Personal Knowledge Plus) 組成元件規格字典

> 文件路徑：`chrome_pk/docs/spec-pk-components.md`  
> 模組代號：`pk`  
> 架構規範：Manifest V3、TypeScript + React + Vite + TailwindCSS、切片架構 (Feature Slices)

---

## 1. 架構概述與設計原則

PK+ 作為全功能個人知識庫與生產力中樞，具備高度模組化的切片架構 (Feature Slices)：
* **多視圖入口 (Multi-Entrypoints)**：同一核心邏輯依據不同情境投射至 New Tab (新分頁儀表板)、Sidebar (側邊工作台)、Popup (快捷浮動窗) 與 Options (設定後台)。
* **高內聚切片 (Feature Slices)**：各切片獨立管理其 UI 元件、Hooks、Store 與 Service，切片間通訊依賴全域 EventBus 或黑盒契約。
* **外接生態整合樞紐**：作為瀏覽器內的主控台，聚合 `browser-activity-monitor`、`finance-research-clipper-oss` 與 `chrome_gemini_nano`。

---

## 2. 組成元件清單 (Component Inventory)

### 2.1 應用程式入口視圖 (Entrypoint Containers)
* **`NewTabApp` (`src/entries/newtab/`)**
  * 職責：瀏覽器開啟新分頁時之主控台，承載全景看板、工具箱捷徑與每日專注時間線。
* **`SidebarApp` (`src/entries/sidebar/`)**
  * 職責：側邊工作面板，便於使用者在瀏覽任何網頁時隨時叫出任務清單、研報筆記與 AI 助手。
* **`PopupApp` (`src/entries/popup/`)**
  * 職責：擴充功能圖示彈窗，提供 5 秒快速記筆記、番茄鐘開始/暫停與快捷搜尋。
* **`OptionsApp` (`src/entries/options/`)**
  * 職責：資料匯入匯出、雲端同步帳號綁定 (Google Drive / Apps Script)、快捷鍵配置。

### 2.2 十大切片模組清單 (Feature Slices Matrix)
* **`project-management` (專案與看板模組)**
  * 核心元件：`KanbanBoard.tsx`, `TaskCard.tsx`, `ColumnContainer.tsx`, `FilterBar.tsx`
  * 職責：任務卡片之拖曳管理、分組 (Backlog, Todo, In Progress, Done)、標籤與到期日管理。
* **`toolbox` (動態工具箱)**
  * 核心元件：`ToolboxGrid.tsx`, `ToolCard.tsx`, `ToolRegistry.ts`
  * 職責：註冊並展示常用微工具，支援依標籤過濾與外接插件快捷調度。
* **`activity-monitor` (活動監控整合切片)**
  * 核心元件：`ActivityTimeline.tsx`, `ProductivityHeatmap.tsx`
  * 職責：接收來自 `browser-activity-monitor` 的活動日誌，渲染生產力指數與今日時數分佈。
* **`finance-integration` (金融研報整合切片)**
  * 核心元件：`ResearchSummaryWidget.tsx`, `WatchlistGrid.tsx`
  * 職責：呈現 `finance-research-clipper-oss` 所採集的最新個股快照與估值簡報。
* **`gemini-exporter` (智慧匯出模組)**
  * 核心元件：`ExportDialog.tsx`, `MarkdownFormatter.ts`
  * 職責：將看板任務、活動軌跡或研報打包為標準 Markdown / Google Docs 格式。
* **`scrumclock` (敏捷衝刺時鐘與番茄鐘)**
  * 核心元件：`TimerDisplay.tsx`, `PomodoroRing.tsx`, `SprintTracker.tsx`
  * 職責：專注時間倒數、衝刺節奏掌控，並可透過 Message Passing 觸發倍速控制器暫停。
* **`ai-sidebar` (側邊對話助手)**
  * 核心元件：`ChatBox.tsx`, `MessageBubble.tsx`, `PromptSuggestions.tsx`
  * 職責：封裝與 Gemini Nano / 雲端模型之對話介面。
* **`bookmarks` (智慧書籤模組)**
  * 核心元件：`BookmarkTree.tsx`, `TagManager.tsx`
  * 職責：Chrome 內建書籤之強化分類與過濾。
* **`analytics` (生產力週報切片)**
  * 核心元件：`WeeklyReportChart.tsx`, `TrendAnalysis.tsx`
  * 職責：長期生產力數據視覺化與統計。
* **`experimental-srt` (影音字幕切片)**
  * 核心元件：`SrtParser.tsx`, `TimestampSync.tsx`
  * 職責：法說會與研報影音字幕之時間戳解析與同步打點。

### 2.3 核心架構與基礎服務 (Core & Services)
* **`GasSyncService` (`src/services/GasSyncService.ts`)**
  * 職責：透過 Google Apps Script Hub 實現多端跨裝置無伺服器雙向同步。
* **`StorageManager` (`src/core/storage/`)**
  * 職責：抽象 Chrome Storage API 與 IndexedDB，提供一致的非同步 CRUD 介面。
* **`GlobalEventBus` (`src/core/eventBus.ts`)**
  * 職責：應用程式內部與跨切片之 Pub/Sub 事件匯流排。

---

## 3. 資料結構與介面契約 (Data Schema & Contracts)

### 3.1 核心任務卡片模型 (Task Schema)
```typescript
interface TaskItem {
  id: string;
  title: string;
  description?: string;
  columnId: "backlog" | "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 跨插件整合協定 (Cross-Plugin Messaging)
* **`PK_IMPORT_CLIPPER_DATA`**: 監聽來自 Finance Clipper 的研報，自動轉換為待辦研究卡片。
* **`PK_NOTIFY_ACTIVITY`**: 接收 Activity Monitor 傳來的專注時間段，自動關聯至當前執行中任務。

