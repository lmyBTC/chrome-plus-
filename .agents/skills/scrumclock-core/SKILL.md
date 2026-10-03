---
name: ScrumClock 插件規格與元件字典 (ScrumClock Core Spec)
description: 定義 chrome_scrumclock 插件之核心定位、技術棧、架構入口與深層 SSOT 導航。
triggers: [scrumclock, 番茄鐘, 敏捷看板, scrumclock開發, scrum, pomodoro, 側邊欄番茄鐘]
dependencies: []
ssot_dependencies: ["chrome_scrumclock/SCRUMCLOCK_README.md", "0.doc_mg/docs/cross_plugin_contract.md", "0.doc_mg/docs/google_ecosystem_integration_spec.md"]
---

# 專家技能：ScrumClock 插件規格與元件字典 (ScrumClock Core Spec)

本技能為 `chrome_scrumclock` 插件之輕量調用索引。所有詳細資料模型 (Storage Schema)、8 大模組元件字典與通訊細節已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `chrome_scrumclock/`
* **技術棧**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React (MV3)
* **建置指令**: `npm run dev` (開發) / `npm run build` (打包至 `dist/`)

## 2. 關鍵入口架構 (Key Entrypoints)
* `src/background.ts`: Service Worker 背景路由、Alarms、跨插件分流
* `src/entries/sidebar/`: 側邊欄工作區 (`ToolboxHub` 工具箱 / `AIAssistantView` PK+ 助理)
* `src/entries/newtab/`: 新分頁儀表板視圖
* `src/dashboard/components/BoardView.tsx`: 極簡 4 欄 GTD 敏捷看板（整合 Google Tasks 一鍵雙向同步拉取與狀態連動）
* `src/features/scrumclock/components/SprintPomodoro.tsx`: 番茄鐘 25 分鐘衝刺計時面板
* `src/shared/google/`: Google 原生生態引擎 (`googleAuthClient.ts`, `googleTasksSync.ts`, `googleCalendarService.ts`)

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨插件掃描**: 嚴禁讀取或檢索其他插件目錄（如 `finance-research-clipper-oss`）之原始碼。
2. **黑盒契約通訊**: 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 與 `UniversalTaskPayload` v2.3 介面。
3. **優雅降級**: 依賴之外部插件未啟用時，對應小工具必須安全降級，不得中斷核心番茄鐘流程。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整元件矩陣、Storage Schema、通訊協議與熱區清單**: 詳見 `chrome_scrumclock/SCRUMCLOCK_README.md`
