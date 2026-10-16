---
title: "番茄鐘任務備註功能新增"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-16"
deadline: "2026-07-16"
---

## 1. 目標
在番茄鐘衝刺頁面（SprintPomodoro）的今日核心戰役列表中，為每個任務新增一個可以撰寫與編輯備註（Notes）的區塊，方便使用者隨時記錄遇到的問題與備忘，並將備註資料持久化儲存。同時，優化任務池（Task Pool）的備註欄位顯示，確保其能夠完整呈現不被縮小或切斷。

## 2. 策略與鎖定檔案
- 於 `WeeklyMission` 介面中已有 `notes?: string` 欄位。
- 在 `SprintPomodoro.tsx` 元件中新增編輯區。
- 在 `ProjectManagementDemo.tsx` 元件中調整任務池表格的 `Execution Notes` 欄位樣式，移除非必要的寬度限制或 `truncate`，使用 `whitespace-normal break-all` 確保內容能自動換行並完整呈現。

### 鎖定檔案 (Target Files)
- `./chrome_scrumclock/src/features/scrumclock/components/SprintPomodoro.tsx`
- `./chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`
### Phase 2: 代碼實作 狀態：`[已完成]`
### Phase 3: 驗證與測試 狀態：`[已完成]`
### Phase 4: UI 微調 (任務池 Execution Notes 欄位完整顯示) 狀態：`[已完成]`

## 4. 影響評估
- 本修改僅調整 `chrome_scrumclock` 插件的 ProjectManagement 表格欄位 CSS 樣式，無任何邏輯變動，風險極低。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-16] ID: 3940a373-cc2f-4ecb-88b4-f4e510d74679 (已完成)
