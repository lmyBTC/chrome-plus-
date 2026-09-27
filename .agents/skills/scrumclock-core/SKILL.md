---
name: ScrumClock 插件規格與元件字典 (ScrumClock Core Spec)
description: 定義 chrome_scrumclock 插件之技術棧、React/TS 元件架構、資料模型 SSOT 與狀態管理，確保開發時精準引用不跨界。
triggers: [scrumclock, 番茄鐘, 敏捷看板, scrumclock開發, scrum, pomodoro, 側邊欄番茄鐘]
dependencies: []
ssot_dependencies: ["chrome_scrumclock/SCRUMCLOCK_README.md", "0.doc_mg/docs/cross_plugin_contract.md"]
---

# 專家技能：ScrumClock 插件規格與元件字典 (ScrumClock Core Spec)

本技能為 `chrome_scrumclock` 插件的 Single Source of Truth (SSOT)，包含其技術棧、核心元件清單、儲存模型與外部整合邊界。

---

## 1. 專案技術規格 (Tech Stack & Architecture)
* **目錄位置**: `./chrome_scrumclock/`
* **架構風格**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React
* **建置指令**:
  * 開發: `npm run dev` (位於 `chrome_scrumclock/`)
  * 打包: `npm run build` (產出至 `chrome_scrumclock/dist/`)
* **擴充功能入口 (Extension Entrypoints)**:
  * `src/background.ts`: Service Worker 入口 (96 行)，負責事件路由。非同步業務模組化分流至：
    - `src/background/alarmHandlers.ts`: 倒數計時器 Alarms 與通知管理。
    - `src/background/externalService.ts`: 跨插件通訊接收與 Offscreen Document 音效協調。
  * `src/entries/sidebar/`: 瀏覽器側邊欄視圖 (Chrome SidePanel API)。雙模式架構：預設為「🧰 實用工具箱 (ToolboxHub isSidebar)」，按需切換「🤖 PK+ 助理 (AIAssistantView)」延遲載入 Gemini Nano。`hooks.ts` 為 Barrel 門面，子 Hooks 位於 `src/entries/sidebar/hooks/`。
  * `src/entries/newtab/`: 新分頁儀表板視圖。
  * `public/manifest.json`: Manifest V3 配置，含 `alarms`, `storage`, `sidePanel`, `offscreen` 權限。

---

## 2. 核心元件字典 (Component Catalog)

### 核心版面與容器 (`src/core/layout/`)
- `Sidebar.tsx`: 主側邊欄導航，包含番茄鐘、任務列表、看板、儀表板與財務整合分頁切換。
- `Header.tsx`: 頂部狀態列，顯示今日專注時長與全域控制。

### 番茄鐘衝刺元件 (`src/features/scrumclock/components/`)
- `SprintPomodoro.tsx`: 核心番茄鐘衝刺計時面板 (412 行)。
- `sprint/SprintBattleItem.tsx`: 單一作戰任務項目視圖與狀態控制。
- `sprint/SprintMarkdownImporter.tsx`: Markdown 格式任務解析與批次匯入視圖。
- `DailyMissionBriefing.tsx`: 每日作戰目標簡報面板 (194 行)。
- `briefing/BriefingMissionSelector.tsx`: 每週作戰任務清單展示、手動新增編輯與 AI 智能拆解彈窗。
- `briefing/BriefingCalendarSchedule.tsx`: Google Calendar / 本地既有時段行程排程整合提醒視圖。
- `briefing/BriefingSettingsDrawer.tsx`: Google Apps Script URL、Gemini API Key 與分心黑名單配置抽屜。
- `EndOfDayReview.tsx`: 每日結算回顧面板。
- `QuickCapture.tsx`: 閃電捕捉靈感與待辦。

### 側邊欄與視圖元件 (`src/entries/sidebar/components/`)
- `AIAssistantView.tsx`: 獨立封裝之 AI 對話助理視圖，內建 `useAISession`、歷史訊息氣泡、快捷提問與輸入框，僅於使用者切換至助理模式時掛載初始化。

### 圖片擷取策略模組 (`src/features/toolbox/tools/image-scraper/services/`)
- `imageExtractor.ts`: 圖片萃取主調度門面 (287 行)。
- `instagramExtractor.ts`: Instagram 動態與多圖特定解析策略。
- `carouselExtractor.ts`: 通用輪播圖多圖提取策略。
- `extractorUtils.ts`: 通用 DOM 屬性與正則工具函式。
- `downloader.ts`: 批次 ZIP 下載打包服務。

### 工具箱中樞與擴充子模組 (`src/features/toolbox/`)
- `ToolboxHub.tsx`: 工具箱選單中樞視圖，支援 `isSidebar?: boolean` 緊湊模式（縮減 padding、自適應 3-column tabs、傳遞 isSidebar 至子工具）。
- `tools/image-scraper/`: 網頁圖片與 IG 多圖批次抓取器 (支援 `isSidebar`)。
- `tools/activity-monitor/`: 瀏覽行為與網頁敏感權限（鏡頭/麥克風/定位/剪貼簿）實時監控面板 (支援 `isSidebar`)。
- `tools/subtitle-collector/`: 跨插件（VideoSpeedPlus）影音字幕與筆記快照收集面板，支援時間戳跳轉、Markdown 引用與今日戰役轉化 (支援 `isSidebar`)。

### 側邊欄 Hooks 子模組 (`src/entries/sidebar/hooks/`)
- `useAISession.ts`: AI 側邊欄會話與 Prompt 互動管理。
- `useTimerSync.ts`: 全域番茄鐘即時狀態雙向同步。
- `useContextMenuSync.ts`: Chrome 右鍵選單快顯事件同步。

### 跨插件整合模組 (`src/features/finance-integration/`)
- `WatchListWidget.tsx`: 嵌入 New Tab 與側邊欄的即時自選股小工具。
- `financeClient.ts`: 外部通訊客戶端，透過 `chrome.runtime.sendMessage` 向 FinanceClipper 取得資料快照。
- `types.ts`: 外部資料快照型別宣告 (`WatchListItem`, `FinanceWidgetConfig`)。

---

## 3. 資料模型與儲存 SSOT (Storage Schema)
所有數據儲存於 `chrome_scrumclock` 獨立之 `chrome.storage.local`，嚴禁與其他插件共用。

### 主要儲存鍵值 (Storage Keys)
1. `scrumclock_tasks`: `Task[]`
   ```typescript
   interface Task {
     id: string;
     title: string;
     description?: string;
     estimatedPomodoros: number;
     completedPomodoros: number;
     status: 'todo' | 'in_progress' | 'done' | 'archived';
     priority: 'low' | 'medium' | 'high';
     tags: string[];
     createdAt: number;
     completedAt?: number;
   }
   ```
2. `scrumclock_sessions`: `PomodoroSession[]`
   ```typescript
   interface PomodoroSession {
     id: string;
     taskId?: string;
     duration: number; // minutes
     type: 'work' | 'short_break' | 'long_break';
     timestamp: number;
   }
   ```
3. `scrumclock_settings`: `SettingsConfig` (工作時長、提示音、自動開始下一階段等)
4. `scrumclock_finance_cache`: 自選股即時快照快取（只讀，來自 FinanceClipper，絕不回寫對端）。
5. `capturedNotes`: `CapturedSubtitleNote[]` (跨插件影音字幕與時間戳筆記快照，由 VideoSpeedPlus 透過 `COLLECT_NOTE` 注入)。

---

## 4. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **禁止跨目錄讀取**: 開發 ScrumClock 時，禁止讀取 `finance-research-clipper-oss` 內部 UI 或爬蟲代碼。
2. **通訊採黑盒模式**: 如需更新財務功能，僅參照 `0.doc_mg/docs/cross_plugin_contract.md` 介面協定。
3. **安全優雅降級**: 若 FinanceClipper 未安裝，`WatchListWidget` 自動顯示離線或佔位提示，保證番茄鐘核心流程 100% 正常。
