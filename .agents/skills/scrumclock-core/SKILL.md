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
  * `src/background.ts`: Service Worker 入口，負責事件路由。分流模組：
    - `src/background/alarmHandlers.ts`: 倒數計時器 Alarms 與通知管理。
    - `src/background/externalService.ts`: 跨插件通訊接收與 Offscreen 音效協調。
    - `src/features/activity-monitor/services/monitorService.ts`: 瀏覽器活動監控背景監聽器（webRequest, downloads, tabs, contentSettings）。
  * `src/entries/sidebar/`: 瀏覽器側邊欄視圖 (Chrome SidePanel API)。雙模式：工具箱 (`ToolboxHub`) 與 PK+ 助理 (`AIAssistantView`)。子 Hooks 位於 `src/entries/sidebar/hooks/`。
  * `src/entries/newtab/`: 新分頁儀表板視圖。
  * `public/manifest.json`: Manifest V3 配置 (`alarms`, `storage`, `sidePanel`, `offscreen`, `webRequest`, `contentSettings`, `downloads`, `scripting`)。
  * `public/scripts/probes/`: 動態探針資源 (`probe-main.js`, `probe-isolated.js`)。

---

## 2. 核心元件字典 (Component Catalog)

### 核心版面與容器 (`src/core/layout/`)
- `Sidebar.tsx`: 主側邊欄導航 (番茄鐘、專案看板、儀表板、財務)。
- `Header.tsx`: 頂部狀態列 (今日專注時長與全域控制)。

### 番茄鐘衝刺元件 (`src/features/scrumclock/components/`)
- `SprintPomodoro.tsx`: 核心番茄鐘衝刺計時面板，焦點戰役與 25 分鐘衝刺。
- `sprint/SprintBattleItem.tsx`: 單一作戰任務項目視圖與狀態控制。
- `sprint/SprintMarkdownImporter.tsx`: Markdown 任務解析與批次匯入。
- `DailyMissionBriefing.tsx`: 每日作戰目標簡報面板。
- `briefing/BriefingMissionSelector.tsx`: 每週作戰清單、手動新增與 AI 拆解。
- `briefing/BriefingCalendarSchedule.tsx`: 日曆行程排程整合提醒。
- `briefing/BriefingSettingsDrawer.tsx`: Apps Script URL、Gemini API Key 與黑名單抽屜。
- `EndOfDayReview.tsx`: 每日結算回顧面板。
- `QuickCapture.tsx`: 閃電捕捉靈感與待辦。

### 專案規劃看板元件 (`src/features/project-management/components/` & `src/dashboard/components/`)
- `ProjectManagementDemo.tsx`: 專案規劃看板主視圖容器 (Backlog、收件匣、衝刺日誌、同步設定、站會 Copilot)。
- `BoardView.tsx` (`src/dashboard/components/BoardView.tsx`): 極簡 GTD 敏捷看板，實作 4 核心欄位（Inbox, Next Actions, In Progress, Done）+ 可折疊 Someday 抽屜、原生 HTML5 拖拉流轉、一鍵 Inbox Zero 與 In Progress WIP 在製品上限警示。
- `TaskCard.tsx` (`src/dashboard/components/TaskCard.tsx`): 敏捷任務卡片，支援雙擊行內編輯、🍅 番茄工時即時指標（已消耗/預估）、GTD 一鍵流轉按鈕與優先級標籤。
- `tabs/TaskPoolTab.tsx`: 每週任務池看板，支援看板/表格雙視圖切換、AI 拆解、Sheets 同步、Google Tasks 雙向同步、Calendar 時間箱排定與批次推入焦點。
- `tabs/TaskDetailDrawer.tsx`: 任務詳情抽屜，支援備忘、子任務、狀態優先級切換。
- `tabs/InboxTab.tsx`: 待辦收件匣，快取靈感與轉化為每週任務。
- `tabs/SprintLogsTab.tsx`: 歷史衝刺日誌看板，番茄鐘衝刺歷程與統計。
- `modals/SyncSettingsModal.tsx`: Google Sheets 雙向同步設定。
- `modals/StandupModal.tsx` (亦實作於 `src/dashboard/components/StandupModal.tsx`): 站會 Copilot 產生器，彙總 Done/Focus/Blockers，支援一鍵複製 Markdown 與 HTML 富文本。

### Google 原生生態整合模組 (`src/shared/google/`)
- `googleAuthClient.ts`: 封裝 `chrome.identity.getAuthToken`，管理 OAuth2 存取 Token、自動快取與失效續約。
- `googleTasksService.ts`: 封裝 Google Tasks REST API，提供清單讀取、任務建立、狀態更新 (`completed`)。
- `googleTasksSync.ts`: Google Tasks 雙向同步引擎，支援智慧合併、雙向推播與衝突解決。
- `googleCalendarService.ts`: Google Calendar REST API 服務，支援時間箱預約排程與番茄鐘專注實績自動回填。
- `googleTypes.ts`: Google 整合資料模型、授權狀態與同步參數型別定義。

### 側邊欄與視圖元件 (`src/entries/sidebar/components/`)
- `AIAssistantView.tsx`: 獨立 AI 對話助理視圖，按需延遲載入。

### 圖片擷取策略模組 (`src/features/toolbox/tools/image-scraper/services/`)
- `imageExtractor.ts`: 圖片萃取主調度門面。
- `instagramExtractor.ts`: Instagram 動態與多圖特定解析。
- `carouselExtractor.ts`: 通用輪播圖多圖提取。
- `extractorUtils.ts`: DOM 屬性與正則工具函式。
- `downloader.ts`: 批次 ZIP 下載打包服務。

### 工具箱中樞與擴充子模組 (`src/features/toolbox/`)
- `ToolboxHub.tsx`: 工具箱選單中樞視圖，支援 `isSidebar?: boolean` 緊湊模式（縮減 padding、自適應 3-column tabs、傳遞 isSidebar 至子工具）。
- `tools/image-scraper/`: 網頁圖片與 IG 多圖批次抓取器 (支援 `isSidebar`)。
- `tools/activity-monitor/`: 瀏覽行為與網頁敏感權限（鏡頭/麥克風/定位/剪貼簿）實時監控面板 (支援 `isSidebar`)。
- `tools/subtitle-collector/`: 跨插件（VideoSpeedPlus）影音字幕與筆記快照收集面板，支援時間戳跳轉、Markdown 引用與今日戰役轉化 (支援 `isSidebar`)。

### 活動監控完整模組 (`src/features/activity-monitor/`)
- `index.ts`: 門面導出。
- `components/ActivityMonitorView.tsx`: 活動監控即時面板 (React + Tailwind)，支援即時串流、分類篩選、統計卡片與深度探針觸發。
- `services/monitorService.ts`: 背景監控管理服務，整合 `tabs`, `webRequest`, `downloads`, `contentSettings` 與 alarms 定時清理。
- `storage/activityDb.ts`: IndexedDB (`BrowserActivityMonitorDB`) 本機資料存取層。
- `types/index.ts`: 活動日誌、型態、統計與探針相關 TypeScript 型別定義。

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
所有數據儲存於 `chrome_scrumclock` 獨立之 `chrome.storage.local` 及專屬 IndexedDB，嚴禁與其他插件共用。

### 主要儲存鍵值 (Chrome Storage Local)
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
3. `weeklyMissions`: `WeeklyMission[]` (核心任務池與看板資料源)
   ```typescript
   export type GTDStatus = 'inbox' | 'next-action' | 'in-progress' | 'done' | 'someday';
   export interface WeeklyMission {
     id: string;
     text: string;
     isCompleted: boolean;
     status?: GTDStatus;
     spentPomodoros?: number; // 番茄鐘計時完成時自動累加回填
     estimatedPomodoros?: number;
     priority?: 'P1' | 'P2' | 'P3';
     gtdContext?: '@Focus' | '@Meeting' | '@Review' | '@Waiting-For' | '@Blocked';
     notes?: string;
     url?: string;
     createdAt?: string;
   }
   ```
4. `userSettings`: `UserSettings` (全域設定與本地 Feature Flags)
   ```typescript
   export interface UserSettings {
     pomodoroDuration: number;
     breakDuration: number;
     enableGtdCapture?: boolean; // Alt+Q / 右鍵快捷捕捉開關 (預設 true)
     enableWipLimit?: boolean;   // 看板 In Progress WIP 限制開關 (預設 true)
     maxWipLimit?: number;       // 看板 WIP 卡片數量上限 (預設 3)
     // ... 其他同步與專注名單設定
   }
   ```
5. `scrumclock_finance_cache`: 自選股即時快照快取（只讀，來自 FinanceClipper，絕不回寫對端）。
6. `capturedNotes`: `CapturedSubtitleNote[]` (跨插件影音字幕與時間戳筆記快照，由 VideoSpeedPlus 透過 `COLLECT_NOTE` 注入)。

### 活動監控本機資料庫 (IndexedDB)
* **資料庫名稱**: `BrowserActivityMonitorDB` (版本 1)
* **Object Store**: `activity_logs`
  * 主鍵: `id` (autoIncrement: true)
  * 索引: `timestamp`, `type`, `origin`, `tabId`
  * 自動清理: 每日由 `chrome.alarms` 定期清除超過 3 天之歷史審計記錄。

---

## 4. 跨插件通訊中樞與 UniversalTaskPayload v2.3 規格
ScrumClock 作為 Chrome Plus 系統核心能力中樞 (Hub，ID: `ahiihabnbjeoeneahcgbdcofncjoclcp`)，負責接收與協調各 Spoke 子插件的通訊：
- **原生直連分發 (Direct Messaging)**：拔除 PING_HUB 握手總線與 Outbox 背景輪詢佇列，回歸 Chrome Extension 原生 `chrome.runtime.sendMessage` 直連架構，無常駐 Alarms，完全釋放 Service Worker 休眠生命週期。
- **任務契約 (`UniversalTaskPayload` v2.3)**：
  ```typescript
  export type GTDContext = '@Focus' | '@Meeting' | '@Review' | '@Waiting-For' | '@Blocked';
  export interface UniversalTaskPayload {
    protocolVersion?: 2;
    id?: string;
    title: string;
    ticker?: string;
    notes?: string;
    tags?: string[];
    estimatedPomodoros?: number;
    url?: string;
    gtdContext?: GTDContext;
    priority?: 'P1' | 'P2' | 'P3';
    sourcePlugin?: string;
    createdAt?: number;
  }
  ```
- **極簡發送與回執**：
  - 模組位置：`src/shared/messaging/outboxQueue.ts`（導出 `sendDirectMessage`）、`src/background/externalService.ts`。
  - 跨模組資料交換採前端即時錯誤反饋，不積壓離線死信。

---

## 5. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **禁止跨目錄讀取**: 開發 ScrumClock 時，禁止讀取 `finance-research-clipper-oss` 內部 UI 或爬蟲代碼。
2. **通訊採黑盒模式**: 如需更新財務功能，僅參照 `0.doc_mg/docs/cross_plugin_contract.md` 介面協定。
3. **安全優雅降級**: 若 FinanceClipper 未安裝，`WatchListWidget` 自動顯示離線或佔位提示，保證番茄鐘核心流程 100% 正常。
