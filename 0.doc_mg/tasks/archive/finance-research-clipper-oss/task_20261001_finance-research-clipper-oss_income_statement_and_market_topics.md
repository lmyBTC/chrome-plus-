---
title: "修復損益表精準擷取與拆分市場主題專題卡片"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-01"
deadline: "2026-10-02"
---

## 1. 目標
修復 FinanceClipper 在 Google Finance Overview 總覽頁誤將全域「市場熱門主題/相關標的」表格判定為個股「損益表 (Income Statement)」的邏輯瑕疵。透過強制分頁導航與語意關鍵字白名單，確保損益表精準呈現個股營收與淨利等財務矩陣；同時將誤抓的市場主題數據獨立封裝為「市場主題與相關專題 (Market Topics)」新卡片，滿足版塊與專題分析需求。

## 2. 策略與鎖定檔案
- **策略**: 
  1. `crawler.js` 爬蟲重構：建立專屬 `scrapeMarketTopics()` 於總覽頁萃取主題行情表格；在 `scrapeFinancials()` 執行前強制導航至 `financials` 分頁，並導入財報語意白名單（如「營收 / Revenue」、「淨利 / Net Income」）進行特徵過濾。
  2. `background.js` 模型擴充：將 `marketTopics` 與 `financials` 獨立封裝，支援向後相容與 Storage 儲存。
  3. `dashboard.html` / `dashboard-render.js` 視圖更新：損益表面板恢復呈現真實季報/年報，並新增獨立卡片「🌐 市場主題與相關專題」專屬呈現主題排行矩陣。
  4. 遵照 SSOT 閉環規範更新 `FINANCE_CLIPPER_README.md` 與技能字典。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/crawler.js`
- `finance-research-clipper-oss/background.js`
- `finance-research-clipper-oss/dashboard.html`
- `finance-research-clipper-oss/dashboard-render.js`
- `finance-research-clipper-oss/dashboard.js`
- `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`

## 3. 任務拆解

### Phase 1: 爬蟲核心分頁導航與語意校驗重構 狀態：`[已完成]`
### Phase 2: 後台資料模型擴充與儲存 狀態：`[已完成]`
### Phase 3: 儀表板視圖升級與獨立主題卡片 狀態：`[已完成]`
### Phase 4: 驗收、SSOT 文檔閉環與歸檔 狀態：`[已完成]`

## 4. 影響評估
- **Chrome API 權限**: 無需新增額外權限，沿用現有 `tabs`、`storage` 與 `scripting`。
- **儲存相容性**: `stockItem.marketTopics` 屬增量欄位，舊歷史記錄無此欄位時自動降級隱藏主題卡片，無破壞性影響。
- **通訊契約**: 跨插件對外接口 `GET_STOCK_SUMMARY` 保持純淨度，不受內部 UI 結構調整影響。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (如 FINANCE_CLIPPER_README.md)。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認損益表不再出現市場主題，且主題卡片正常運作。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-01 ID: 54538723-f5b7-4812-b95e-c4ed65a18d4d (初始化)
> - 2026-10-01 ID: b2876586-1bdc-40d0-b765-e8c2444040eb (Phase 1 執行)
> - 2026-10-01 ID: 3d7a72a4-9a11-428c-a72a-daf8d2b2a204 (Phase 2 執行)
> - 2026-10-01 ID: fa2eebaf-07d8-46b1-96bb-e04039d0e948 (Phase 3 & Phase 4 結案驗收)
>
> **結案狀態**:
> 本任務所有 Phase 均已驗證通過並完成 SSOT 閉環回寫，已封存至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。
