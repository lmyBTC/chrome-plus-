---
title: "專案管理與番茄鐘內容任務同步化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-16"
deadline: "2026-07-18"
---

## 1. 目標
將專案管理頁面中原本為 mock 的假資料替換為真實的 Chrome 本地儲存資料（與番茄鐘所使用的 weeklyMissions/dailyLogs 接軌），並實作雙向同步，實現 SSOT 任務管理與收件匣 (Inbox) 機制。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\types\index.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\core\chrome\storage.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\scrumclock\components\QuickCapture.tsx`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\features\project-management\components\ProjectManagementDemo.tsx`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`

### Phase 2: 基礎資料與儲存層實作 狀態：`[已完成]`

### Phase 3: 功能整合與 UI 面板開發 狀態：`[已完成]`

### Phase 4: 測試與合規審計 狀態：`[已完成]`

## 4. 影響評估
- 本次改動僅在 storage.ts 及既有 type file 增加可選欄位與 inboxItems，對雲端同步 API 的輸入輸出結構完全相容，無重大破壞性影響。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-16] ID: 6ea380c4-447e-429e-8ccc-237d0ecb302b (已完成)
