---
title: "Popup 與 Dashboard 自動連動與設定同步 (Popup-Dashboard Auto-Sync)"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-03"
completed: "2026-10-03"
---

## 1. 目標
在 `finance-research-clipper-oss` 中實現 Popup 與 Dashboard 的雙向無縫協同與自動連動：
1. **標的自動匯入與即時連動**：當使用者在 Popup 讀取或擷取股票標的時，自動記錄最新標的快照；若 Dashboard 處於開啟狀態，即時收到通知提示並可自動切換或手動一鍵載入深度研報；若從 Popup 點擊「儀表板」，攜帶該標的並自動展開。
2. **設定鍵值統一與雙向同步**：對齊 Popup 與 Dashboard 現存的 GAS Web App URL (`appsScriptUrl` vs `gasUrl`) 與 Google Sheets URL (`userSpreadsheetUrl` vs `sheetsUrl`)，實現雙向相容讀取與儲存同步。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/popup.js`
- `./finance-research-clipper-oss/dashboard.js`
- `./finance-research-clipper-oss/dashboard-render.js`
- `./finance-research-clipper-oss/dashboard-components.css`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (新增 `lastCapturedStock` 與設定鍵值相容說明)
- [x] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (模組速查與跨視圖通訊更新)
- [x] L3 業務規格：`[N/A]` (無獨立業務規則檔，整合於 README)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 設定鍵值統一與雙向同步 狀態：`[已完成]`
- [x] 任務 1.1: 統一設定鍵值與相容讀取
    - [x] 在 `popup.js` 讀取與儲存設定時，兼顧 `gasUrl`/`appsScriptUrl` 與 `sheetsUrl`/`userSpreadsheetUrl` 雙鍵同步。
    - [x] 在 `dashboard.js` 讀取設定時支援 `appsScriptUrl` 與 `userSpreadsheetUrl` 回退，儲存時同步雙鍵。
- [x] 任務 1.2: 設定變更實時監聽
    - [x] 在 `dashboard.js` 透過 `chrome.storage.onChanged` 實時監聽 GAS/Sheets 設定更新，無需重新整理頁面。

### Phase 2: Popup 標的廣播與跳轉參數 狀態：`[已完成]`
- [x] 任務 2.1: 標的讀取自動廣播至 Storage
    - [x] 在 `popup.js` 成功擷取股票標的（或使用者修改 Ticker）時，將 `{ ticker, price, timestamp, mode }` 寫入 `chrome.storage.local` 之 `lastCapturedStock`。
- [x] 任務 2.2: 點擊前往儀表板時攜帶標的參數
    - [x] 在 `popup.js` 之 `handleOpenDashboard` 中，若有有效 Ticker，將 URL 導向為 `dashboard.html?ticker=${encodeURIComponent(ticker)}`。

### Phase 3: Dashboard 自動匯入與非侵入式提示 狀態：`[已完成]`
- [x] 任務 3.1: Dashboard 啟動時解析參數與自動載入
    - [x] 在 `dashboard.js` 的 `init()` 中解析 URL query parameter `ticker`，若存在則自動填入搜尋欄、歷史比對立即渲染並觸發 `triggerCrawl(ticker)`，同時清理 URL 參數防止重綁或無窮遞迴。
- [x] 任務 3.2: Dashboard 實時監聽新擷取標的
    - [x] 在 `dashboard.js` 監聽 `chrome.storage.onChanged` 中的 `lastCapturedStock` 變更。
    - [x] 若當前未在該標的，彈出可點擊之 Toast 提示「📥 Popup 已擷取標的 [Ticker]（$Price），點擊立即載入」，點擊後直接切換並分析；於 `dashboard-components.css` 與 `dashboard-render.js` 擴充可點擊 Toast 與防重綁保護機制。

### Phase 4: 整合驗證與 SSOT 閉環歸檔 狀態：`[已完成]`
- [x] 任務 4.1: 功能與跨視圖通訊全鏈路驗證
    - [x] 驗證 Popup 抓取標的 ➔ Dashboard 即時 Toast 提示與點擊載入。
    - [x] 驗證 Popup 跳轉 Dashboard 攜帶 query 參數直接載入 4合1 深度研報。
    - [x] 驗證 Popup 與 Dashboard 之 GAS URL/Sheets URL 雙向設定同步。
- [x] 任務 4.2: SSOT 回寫與任務歸檔
    - [x] 回寫 L1 `finance-clipper-core/SKILL.md` 與 L2 `FINANCE_CLIPPER_README.md`。
    - [x] 封存任務至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。

## 4. 影響評估
- 本改動僅使用既有 `chrome.storage.local` 與 `chrome.tabs.create`，完全在現有 Manifest 權限範圍內，無需新增額外權限。
- 採用「Toast 提示點擊切換」的非侵入式機制，避免覆蓋使用者正在 Dashboard 進行的同業對比或沙盒試算。

## 5. 驗收標準
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範與訊息傳遞安全。
- [x] **連動體驗**: Popup 擷取或設定變更後，Dashboard 能即時響應無阻礙。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: L1 專家技能與 L2 插件導航已精準回寫，未貼入冗餘代碼。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。
- [x] **插件驗證**: 在 Chrome 中重新載入插件，確認 Popup 與 Dashboard 功能正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: a712810c-f8ac-4478-829f-a76e8093636a (Gate 1 初始化完成)
> - 2026-10-03 ID: 2685f4b0-d8a3-42e6-8dd2-4488276acbb5 (Phase 1 執行完成)
> - 2026-10-03 ID: 1072872d-71eb-4b73-ac6c-d6c375d55e46 (Phase 2 執行完成)
> - 2026-10-03 ID: dc5dcf32-7319-4495-8b3b-8b22ed923496 (Phase 3 執行完成)
> - 2026-10-03 ID: 12e93dcf-51ce-4ad0-bc2e-8f7b011525c2 (Phase 4 整合驗證與 SSOT 閉環歸檔完成)
