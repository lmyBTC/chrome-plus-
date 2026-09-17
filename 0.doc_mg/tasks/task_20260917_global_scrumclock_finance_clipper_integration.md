---
title: "ScrumClock 與 FinanceClipper 雙插件共用互通與協同生產力整合方案 (Epic Master Index)"
plugin: "global"
status: "開發中"
created: "2026-09-17"
deadline: "2026-09-30"
---

## 1. 目標
將 `chrome_scrumclock` (敏捷生產力與番茄鐘) 與 `finance-research-clipper-oss` (個股研報採集與財務儀表板) 兩大 Chrome 擴充功能進行深度整合，建立跨插件資料共享、AI 賦能、任務自動化串接與雲端數據匯流，打造完整的「投資研究與生產力閉環」工作流。

為避免單一任務過度龐大造成上下文溢出與執行阻礙，本專案已完全解耦並拆分為四個獨立且高度專業化的 Sub-Tasks。

## 2. 總體策略與子任務索引 (Epic Sub-Tasks Index)

| 階段 | 任務標題 | 優先級 / 價值 | 狀態 | 獨立任務檔案連結 |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **New Tab 共享標的監控與快速導航** (零耦合數據層) | 優先級 1 / 最快見效 | `已完成` | [task_20260917_global_phase1_shared_watchlist_navigation.md](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase1_shared_watchlist_navigation.md) |
| **Phase 2** | **Gemini Nano AI 研報摘要引擎共用服務** (AI Service as an Agent) | 優先級 2 / 核心賦能 | `規劃中` | [task_20260917_global_phase2_gemini_nano_ai_service.md](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase2_gemini_nano_ai_service.md) |
| **Phase 3** | **研報任務化與研究番茄鐘雙向工作流** (Research-to-Action) | 優先級 3 / 業務閉環 | `規劃中` | [task_20260917_global_phase3_cross_plugin_tasks_pomodoro.md](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase3_cross_plugin_tasks_pomodoro.md) |
| **Phase 4** | **統一 Google Apps Script (GAS) 雲端數據匯流與量化複盤** | 優先級 4 / 數據沉澱 | `規劃中` | [task_20260917_global_phase4_unified_gas_data_pipeline.md](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase4_unified_gas_data_pipeline.md) |

### 核心模組鎖定檔案 (Target Files)
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/manifest.json`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/background.js`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/dashboard.html`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/finance-research-clipper-oss/dashboard.js`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/public/manifest.json`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/background.ts`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/features/finance-integration/`
- `c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/chrome_scrumclock/src/components/SettingsPanel.tsx`

## 3. 階段概覽與狀態收斂

### Phase 1: New Tab 共享標的監控與快速導航 狀態：`[已完成]`
- 詳見獨立任務文檔：[`task_20260917_global_phase1_shared_watchlist_navigation.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase1_shared_watchlist_navigation.md)
- [x] FinanceClipper `externally_connectable` 與 `onMessageExternal` API 服務接口上線。
- [x] ScrumClock `finance-integration` 模組上線（WatchListWidget、financeClient、types）。
- [x] ScrumClock 側邊欄與 New Tab 儀表板視圖整合完成，支援即時行情預覽與一鍵直達。
- [x] Vite 打包通過，Manifest V3 合規審計無警示。

### Phase 2: Gemini Nano AI 研報摘要引擎共用 狀態：`[待辦]`
- 詳見獨立任務文檔：[`task_20260917_global_phase2_gemini_nano_ai_service.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase2_gemini_nano_ai_service.md)
- [ ] 跨插件 AI 請求協定與 ScrumClock `externally_connectable` 配置。
- [ ] 專用財務摘要 Prompt 與結構化解析（三句話速讀、多空亮點、風險警示）。
- [ ] FinanceClipper 接入「🤖 AI 智能解讀面板」與自動/手動觸發連動。

### Phase 3: 研報任務化與研究番茄鐘工作流 狀態：`[待辦]`
- 詳見獨立任務文檔：[`task_20260917_global_phase3_cross_plugin_tasks_pomodoro.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase3_cross_plugin_tasks_pomodoro.md)
- [ ] FinanceClipper 儀表板一鍵加入「今日作戰戰役 (ScrumClock)」。
- [ ] ScrumClock 研究番茄鐘啟動時自動連動 FinanceClipper 標的側邊欄或預熱行情。
- [ ] Quick Capture 智能辨識個股標籤語法 (`$TICKER`)。

### Phase 4: 統一 Google Apps Script (GAS) 數據匯流 狀態：`[待辦]`
- 詳見獨立任務文檔：[`task_20260917_global_phase4_unified_gas_data_pipeline.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/tasks/task_20260917_global_phase4_unified_gas_data_pipeline.md)
- [ ] 統一 GAS Webhook 路由腳本與 Google Sheets 分流儲存。
- [ ] 雙插件統一 Webhook 發送與離線佇列機制。
- [ ] 專注時長 vs 投資回報交叉生產力週報範本。

## 4. 影響評估與隔離防護原則
- **任務拆分效益**：單一任務範圍收斂至 200 行內，避免對話 context 超載與卡頓，方便依 Phase 專注實作與驗收。
- **模組解耦**：各階段具備清晰依賴關係，Phase 1 完成後可獨立推進 Phase 2 或 Phase 3。
- **邊界隔離鐵律 (Zero Cross-Pollution)**：
  1. **AI 視野隔離**：開發個別插件時禁止跨目錄讀取無關代碼，杜絕 Token 浪費與代碼幻覺。
  2. **黑盒契約通訊**：跨插件協同僅依賴 [`cross_plugin_contract.md`](file:///c:/Users/烈日千陽/vide-coding-workspace/chrome-plus/0.doc_mg/docs/cross_plugin_contract.md)，把對端視為遠端 API。
  3. **資料與儲存實體隔離**：不共用 DB、不共享 storage，單向只讀快照傳遞。
  4. **可選外掛與優雅降級**：任一插件未安裝或當機，不得影響自身核心功能運作。

## 5. 驗收標準
- [x] **任務拆解規範**: 所有獨立 Phase 任務均符合 `task_template_v2.md` 與 `task-protocol` 規範，並刪除範本註解。
- [x] **超連結導航**: 主總覽文件與各子任務檔案間具備完整的檔案路徑超連結。
- [x] **狀態收斂**: 各階段進度標記清楚，AI 簽到區記錄完整。
- [x] **隔離防禦確認**: 固化多插件邊界隔離規範，落實 SSOT 規範與通訊契約。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-17 ID: 0fb0a759-d1eb-4b1f-bc01-fccf89431599 (初始化與 Phase 1 完成收斂)
> - 2026-09-17 ID: 62b94652-be5e-4dd8-8a35-f8216a8f824c (拆分子任務為獨立檔案並深度細分原子任務)
> - 2026-09-17 ID: f5766527-7ec4-4ea5-8817-57b256e35b11 (確立多插件獨立開發、資料隔離與 AI 邊界防禦機制)

