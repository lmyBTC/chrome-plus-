---
title: "Finance Research Clipper - Google Finance Beta SPA 4合1分頁爬蟲重構任務"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-09-17"
deadline: "2026-09-20"
---

## 1. 目標
重構現有 `popup.js` 依賴後台 `fetch` 靜態 HTML 解析的機制，改為基於當前啟用分頁 (Active Tab) 的 SPA 動態走訪爬蟲。透過模擬切換 4 大分頁（Overview、Analysis、Earnings、Financials）、語意化 DOM 等待與解析、進度回饋機制，取得完整的個股數據、分析師評級、歷年財報與損益表，並聚合輸出至現有 Google Sheets (GAS) 與本地 Markdown/CSV 導出功能。

## 2. 策略與鎖定檔案

### 核心策略
1. **SPA Active Tab 走訪驅動**：利用 `chrome.scripting.executeScript` 注入爬蟲腳本至使用者的 Google Finance 分頁，模擬點擊 Tab 或觸發路由切換，監控 DOM 水合完成。
2. **語意化韌性定位 (Semantic Anchoring)**：針對 Google Finance 經常變動的隨機混淆 class（如 Wiz / React 產生的動態名稱），改以文字語意標籤（例如 `Market cap`、`P/E ratio`、`Target price`、`EPS`、`Revenue` 等）定位容器與相鄰欄位。
3. **雙向進度通訊與中斷保護**：在爬取過程中，透過 `chrome.runtime.onMessage` / Port 回報分頁爬取進度（Overview -> Analysis -> Earnings -> Financials），並設定超時 fallback，若某分頁逾時自動跳過，避免阻塞整個抓取流程。
4. **向下相容與數據聚合**：將 4 大分頁爬取的數據整合至既有的 `capturedStockData` 與 `formatToMarkdown` 流程，確保現有的 Google Apps Script Webhook 傳輸與 Markdown/CSV 導出功能不受影響。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss\manifest.json`
- `c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss\popup.html`
- `c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss\popup.js`
- `c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss\crawler.js` (NEW: 模組化爬蟲核心腳本)
- `c:\Users\G1\00.coding workspace\chrome plus project\finance-research-clipper-oss\docs\todotask.md`

## 3. 任務拆解

### Phase 1: 爬蟲核心模組化設計與語意選取器 (Crawler Core) 狀態：`[已完成]`

### Phase 2: Popup 視窗整合與進度回饋 (Popup Integration) 狀態：`[已完成]`

### Phase 3: 數據匯出與 Google Sheets (GAS) 映射升級 狀態：`[已完成]`

### Phase 4: 合規審計與實機驗收 狀態：`[已完成]`

## 4. 影響評估
- **權限無須擴增**：現有 `activeTab`, `scripting` 與 `https://www.google.com/finance/*` 已完全滿足注入需求，無須額外申請危險權限。
- **宿主頁面無侵入性**：爬蟲僅模擬點擊讀取公開 DOM 資訊，不會在宿主頁面留下持久化節點或修改使用者原有的 DOM 狀態。
- **降級安全性**：若 SPA 頁籤點擊或 URL 變更受阻，具備超時機制自動跳過單一分頁，不會造成擴充功能崩潰或卡死。

## 5. 驗收標準
- [x] **技術指標**: SPA 爬取機制在 4 個 Tab 走訪過程中具備防逾時保護（單頁最大等待不超過 5 秒）。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無跨域或未授權腳本注入。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，並在 Google Finance 標的頁測試 4 合 1 抓取與匯出正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-09-17] ID: 5095068d-c9dc-4e0d-a1a9-59ddc8f2e10b (初始化與全部 Phase 實作完成)
