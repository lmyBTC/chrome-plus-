---
name: PK+ 插件規格與元件字典 (PK Core Spec)
description: 定義 chrome_pk 插件之核心定位、技術棧、架構入口與深層 SSOT 導航。
triggers: [pk, pk+, power kit, scrumclock, 番茄鐘, 敏捷看板, pk開發, scrum, pomodoro, 側邊欄番茄鐘, officialGeminiConnector, 官方gemini橋接, geminiOfficialBridge]
dependencies: []
ssot_dependencies: ["chrome_pk/PK_README.md", "chrome_pk/docs/guide-pk-features-arch.md", "chrome_pk/docs/web-ai-guard-spec.md", "0.doc_mg/docs/cross_plugin_contract.md", "0.doc_mg/docs/google_ecosystem_integration_spec.md", "0.doc_mg/docs/spec-official-gemini-bridge.md"]
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
* `src/features/project-management/components/board/BoardView.tsx`: 4 欄 GTD 敏捷看板視圖與卡片管理
* `src/features/scrumclock/`: 番茄鐘 25 分鐘衝刺計時與日終反思 (EndOfDayReview)
* `src/features/project-management/services/`: 專案管理 AI 服務層 (taskAIEngine, kanbanAuditor)
* `src/features/toolbox/`: 側邊欄隨選工具箱 (`ToolboxHub.tsx`)，基於 `registry.ts` 外掛註冊協議動態掛載：隨選腳本執行器 (`tools/script-runner/`，支援在線 Prism 語法高亮、分類搜尋 Chips、腳本參數化 `{{KEY}}`、多分頁批次執行、進度條+中斷控制、執行歷程 20 筆環形佇列、JSON Diff 比較、CSV/JSON 匯出；Storage keys: `pk_custom_scripts`, `pk_active_script_id`, `pk_draft_code`, `pk_script_runner_history`)、圖片採集器 (`image-scraper/`)、影音字幕收集器 (`subtitle-collector/`)、活動監控器 (`activity-monitor/`) 與投研自選微工具 (`finance-watchlist`)
* `src/core/ai/nanoPromptGuard.ts`: Gemini Nano 端側小模型四層防崩潰引擎
* `src/core/ai/OfficialGeminiConnector.ts`: 官方 Gemini 雙向橋接連接器 (Ingress 去重/寬容讀者 + Egress injectToOfficialGemini 三層階梯降級)
* `src/shared/google/` & `src/services/googleSyncService.ts`: Google 原生生態與雙軌同步服務 (Tasks, Calendar, GAS 備份)
* `src/components/`: 全域元件 (`SettingsPanel.tsx`, `InstallDocs.tsx`, `GoogleAccountButton.tsx`)

## 3. 專屬工具鏈與指令 (Toolchains & Commands)
* **微工具一鍵生成鷹架**: `py 1.devtools/tools/scaffold_tool.py --plugin chrome_pk --id <id> --name "<名稱>" --category <分類>`
  - 支援自動生成 4 件套（manifest/View/index/types）並自動掛載至 `registry.ts`（支援 `--dry-run` 與 `--remove`）。
* **四層領域架構防腐審查**: `py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk --compact`
  - 杜絕跨 Feature 私有穿透引用、底層反向依賴與微工具交叉耦合。
* **微工具清冊校驗與同步**: `py 1.devtools/tools/sync_toolbox_registry.py --plugin chrome_pk --compact` (加 `--fix` 自動重新構建同步)。

## 4. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨插件掃描**: 嚴禁讀取或檢索其他插件目錄（如 `finance-research-clipper-oss`）之原始碼。
2. **黑盒契約通訊**: 跨插件協同僅透過 `0.doc_mg/docs/cross_plugin_contract.md` 與 `UniversalTaskPayload` v2.3 介面。
3. **優雅降級**: 依賴之外部插件未啟用時，對應小工具必須安全降級，不得中斷核心番茄鐘流程。
4. **架構與命名規範**: 新增微工具或模組必須嚴格遵循 `guide-pk-features-arch.md` 之四層領域切片、Pluggable Micro-Tools 註冊協議與 `kebab-case`/`PascalCase` 命名規範。

## 5. 深層 SSOT 導航 (Deep Reference)
* **架構地圖、資料夾結構與命名規範 (SSOT)**: 詳見 `chrome_pk/docs/guide-pk-features-arch.md`
* **完整元件矩陣、Storage Schema、通訊協議與熱區清單**: 詳見 `chrome_pk/PK_README.md`
* **官方 Gemini 側欄雙向橋接規格**: 詳見 `0.doc_mg/docs/spec-official-gemini-bridge.md`
