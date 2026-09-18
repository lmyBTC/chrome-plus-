---
title: "FinanceClipper 核心腳本模組化拆分 (popup.js & dashboard.js)"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-09-18"
deadline: "2026-09-19"
---

## 1. 目標
將 `finance-research-clipper-oss` 專案中兩大超千行肥大單體腳本（`popup.js` 1,128 行、`dashboard.js` 1,123 行）依責任邊界進行模組化拆分。維持零構建（Zero-Build Vanilla JS）架構特性，透過 HTML `<script>` 順序載入，大幅降低後續 AI 協作開發時的 Token 消耗（單次檢索閱讀預估節省 60%~70% Token），並提高單元可維護性。

## 2. 策略與鎖定檔案
- 保持零打包依賴：不引入 Webpack/Vite 等建構工具，維持 Vanilla JS 瀏覽器原生相容。
- 拆分遵循單一職責原則（SRP）：
  - `popup.js`: 將 DOM 爬蟲提取為 `popup-scraper.js`，將匯出/下載邏輯提取為 `popup-export.js`，主控 UI 流程保留於 `popup.js`。
  - `dashboard.js`: 將純渲染函式提取為 `dashboard-render.js`，將資料輸出/同步動作提取為 `dashboard-actions.js`，主控狀態與事件流保留於 `dashboard.js`。
- 在 `popup.html` 與 `dashboard.html` 按相依順序引進拆分模組，確保全域作用域變數/函式平滑過渡無中斷。

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (SSOT 文檔)
- `./finance-research-clipper-oss/popup.html`
- `./finance-research-clipper-oss/popup.js`
- `./finance-research-clipper-oss/popup-scraper.js` (新建)
- `./finance-research-clipper-oss/popup-export.js` (新建)
- `./finance-research-clipper-oss/dashboard.html`
- `./finance-research-clipper-oss/dashboard.js`
- `./finance-research-clipper-oss/dashboard-render.js` (新建)
- `./finance-research-clipper-oss/dashboard-actions.js` (新建)

## 3. 任務拆解

### Phase 1: `popup.js` 模組化分拆 狀態：`[已完成]`

### Phase 2: `dashboard.js` 模組化分拆 狀態：`[已完成]`

### Phase 3: 驗證與規範收斂 狀態：`[已完成]`

## 4. 影響評估
- Chrome API 權限：無更動，維持現有 `storage`, `activeTab`, `scripting`, `sidePanel` 權限。
- 擴充功能相容性：由於 `popup.html` 與 `dashboard.html` 為擴充功能內部頁面，依序載入 script 標籤與原先在單一檔案內執行完全等價，對宿主網頁與背景 Service Worker 完全無破壞性影響。
- 跨插件通信：`background.js` 與外部插件通訊保持獨立，不受此次 UI 腳本拆分影響。

## 5. 驗收標準
- [x] **技術指標**: 所有拆分模組維持原生 ES6+，不引入任何構建工具或第三方程式庫。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範。
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 已同步回寫 `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` 與專家技能字典，完整更新 6 大模組 File Map。
- [x] **插件驗證**: `popup.html` 彈出與 `dashboard.html` 儀表板各項功能（查詢、爬取、渲染、匯出、AI 摘要、GAS 發送）皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-09-18] ID: 64092636-02af-46c1-a064-7e9c36329046 (結案歸檔)
