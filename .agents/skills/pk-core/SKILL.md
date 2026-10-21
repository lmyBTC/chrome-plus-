---
name: PK+ 插件規格與元件字典 (PK Core Spec)
description: 定義 chrome_pk 插件之核心定位、技術棧、架構入口與深層 SSOT 導航。
triggers: [pk, pk+, power kit, scrumclock, 番茄鐘, 敏捷看板, pk開發, scrum, pomodoro, 側邊欄番茄鐘]
dependencies: []
ssot_dependencies: ["chrome_pk/PK_README.md", "chrome_pk/docs/web-ai-guard-spec.md", "0.doc_mg/docs/cross_plugin_contract.md", "0.doc_mg/docs/google_ecosystem_integration_spec.md"]
---

# 專家技能：PK+ 插件規格與元件字典 (PK Core Spec)

本技能為 `chrome_pk` 插件之輕量調用索引。所有詳細資料模型 (Storage Schema)、8 大模組元件字典與通訊細節已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `chrome_pk/`
* **技術棧**: React 18 + TypeScript + Vite + Tailwind CSS + Lucide React (MV3)
* **建置指令**: `npm run dev` (開發) / `npm run build` (打包至 `dist/`)

## 2. 關鍵入口架構 (Key Entrypoints)
* `src/background.ts`: Service Worker 背景路由、Alarms 調度與跨插件分流
* `src/entries/`: 前端視圖入口 (`sidebar/` 側邊欄工具箱與助理、`newtab/` 新分頁儀表板、`popup/` 快顯)
* `src/dashboard/components/BoardView.tsx`: 4 欄 GTD 敏捷看板視圖與卡片管理
* `src/features/scrumclock/`: 番茄鐘 25 分鐘衝刺計時與日終反思 (EndOfDayReview)
* `src/features/project-management/services/`: 專案管理 AI 服務層 (taskAIEngine, kanbanAuditor)
* `src/core/ai/nanoPromptGuard.ts`: Gemini Nano 端側小模型四層防崩潰引擎
* `src/shared/google/` & `src/services/googleSyncService.ts`: Google 原生生態與雙軌同步服務 (Tasks, Calendar, GAS 備份)
* `src/components/`: 全域元件 (`SettingsPanel.tsx`, `InstallDocs.tsx`, `GoogleAccountButton.tsx`)

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨插件掃描**: 嚴禁讀取或檢索其他插件目錄（如 `finance-research-clipper-oss`）之原始碼。
2. **黑盒契約通訊**: 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 與 `UniversalTaskPayload` v2.3 介面。
3. **優雅降級**: 依賴之外部插件未啟用時，對應小工具必須安全降級，不得中斷核心番茄鐘流程。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整元件矩陣、Storage Schema、通訊協議與熱區清單**: 詳見 `chrome_pk/PK_README.md`
