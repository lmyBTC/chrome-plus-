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
  * `src/background.ts`: Service Worker，負責倒數計時器 Alarms、Offscreen 音效、跨插件通訊接收。
  * `entries/sidepanel/`: 瀏覽器側邊欄視圖 (Chrome SidePanel API)。
  * `entries/newtab/`: 新分頁儀表板視圖。
  * `public/manifest.json`: Manifest V3 配置，含 `alarms`, `storage`, `sidePanel`, `offscreen` 權限。

---

## 2. 核心元件字典 (Component Catalog)

### 核心版面與容器 (`src/core/layout/`)
- `Sidebar.tsx`: 主側邊欄導航，包含番茄鐘、任務列表、看板、儀表板與財務整合分頁切換。
- `Header.tsx`: 頂部狀態列，顯示今日專注時長與全域控制。

### 業務組件 (`src/components/`)
- `Timer.tsx`: 核心番茄鐘/倒數計時組件，支援工作、短休、長休與即時音效。
- `TaskList.tsx`: 條列式任務清單，支援快速新增、勾選完成、估計番茄鐘數標記。
- `TaskBoard.tsx` / `Kanban/`: 敏捷看板 (To Do / In Progress / Done / Archive) 拖曳視圖。
- `SettingsPanel.tsx`: 系統設定面板，包含時長設定、聲音偏好、外部整合開關與 API Key。
- `Statistics.tsx`: 生產力圖表，顯示每日/每週專注趨勢。

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

---

## 4. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **禁止跨目錄讀取**: 開發 ScrumClock 時，禁止讀取 `finance-research-clipper-oss` 內部 UI 或爬蟲代碼。
2. **通訊採黑盒模式**: 如需更新財務功能，僅參照 `0.doc_mg/docs/cross_plugin_contract.md` 介面協定。
3. **安全優雅降級**: 若 FinanceClipper 未安裝，`WatchListWidget` 自動顯示離線或佔位提示，保證番茄鐘核心流程 100% 正常。
