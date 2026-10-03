---
title: "ScrumClock Google Tasks 雙向排程與同步入口強化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-05"
---

## 1. 目標
將 `chrome_scrumclock` 既有的 Google Tasks 核心整合能力（`googleTasksSync` 與 `googleAuthClient`）正式掛接至使用者高頻操作之常態主看板視圖（`BoardView.tsx`）與相關任務切換流程。解決 PM 在 Google Tasks 與瀏覽器看板間手動抄寫任務的斷點，提供「一鍵同步拉取 Google Tasks 今日待辦」與「看板任務完成自動雙向回寫 Google Tasks」的無縫閉環體驗。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/dashboard/components/BoardView.tsx` (主看板：新增 Google Tasks 同步按鈕、加載狀態與反饋)
- `chrome_scrumclock/src/shared/google/googleTasksSync.ts` (同步管理：增強拉取與推播之錯誤防呆與即時狀態回傳)
- `chrome_scrumclock/src/shared/google/googleAuthClient.ts` (授權模組：增強 Client ID 未設定或授權失敗之友善提示)
- `chrome_scrumclock/src/features/scrumclock/hooks/useWeeklyMissions.ts` (若適用：任務狀態變更時自動觸發雙向推播)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：`.agents/skills/scrumclock-core/SKILL.md` (增補 Google Tasks 整合入口說明)
- [x] L2 插件導航：`chrome_scrumclock/SCRUMCLOCK_README.md` (模組速查矩陣更新)
- [ ] L3 業務規格：無
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 主看板 Google Tasks 一鍵同步拉取與狀態反饋 狀態：`[已完成]`
- [x] 任務 1.1: 於 `BoardView.tsx` 工具列新增「Google Tasks 同步」按鈕與同步狀態反饋
    - [x] 整合圖示、轉圈 Loading 狀態與上次同步時間 Tooltip
    - [x] 點擊觸發 `googleTasksSync.pullAndMergeTasks`，拉取今日 Google Tasks 合併至本地看板
    - [x] 提供同步成功任務數量（或錯誤提示）之輕量反饋通知
- [x] 任務 1.2: 強化 `googleAuthClient.ts` 與 `googleTasksSync.ts` 的例外處理與引導
    - [x] 若當前尚未配置 Google Client ID 或授權失敗，彈出清楚提示對話框，避免靜默報錯

### Phase 2: 看板任務完成雙向回寫與狀態連動 狀態：`[已完成]`
- [x] 任務 2.1: 看板任務勾選完成/取消完成時自動回寫 Google Tasks
    - [x] 監聽主看板勾選事件，若該任務具有 `workspaceSync.googleTaskId`，自動調用 `pushTaskStatusToGoogle`
    - [x] 提供優雅降級機制：網路中斷或 API 失敗時標記 `syncStatus: 'failed'`，不阻斷本地操作

### Phase 3: 建置驗證與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 3.1: 執行 TypeScript 檢查與 Vite 打包驗證 (`npm run build`)
- [x] 任務 3.2: 完成 L1/L2 SSOT 文檔回寫並歸檔任務檔案至 `0.doc_mg/tasks/archive/chrome_scrumclock/`

## 4. 影響評估
- **權限與安全性**：已於 `public/manifest.json` 配置 `identity` 權限與 `tasks` scope，完全符合 MV3 規範。
- **邊界防禦**：本變更 100% 局限於 `chrome_scrumclock` 插件內部，不影響且不觸碰其他插件。
- **離線與相容性**：Google 服務若無法連線或未授權，系統完全保持本地任務看板正常運作（優雅降級）。

## 5. 驗收標準
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs 清單回寫。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 執行 `npm run build` 通過，無 TypeScript 或打包編譯錯誤。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: a3acf15b-51a9-4fc2-ac74-cb5c056c6a40 (Gate 1 初始化)
> - 2026-10-03 ID: a1edcfa0-ec17-47c1-af2e-3b00b13ef439 (Phase 1 執行)
> - 2026-10-03 ID: 932f7873-d9ae-48b0-a230-b2be93ed0dd6 (Phase 2 執行)
> - 2026-10-03 ID: a0e6e956-324f-4873-a536-6dbce5caf7e5 (Phase 3 驗證與結案歸檔)
