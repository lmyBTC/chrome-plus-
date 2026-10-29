---
title: "修復 FinanceClipper 代號輸入採集與 Dashboard 背景爬蟲通訊阻斷"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-21"
deadline: "2026-10-21"
appetite: "1h"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session Final (Gate 3 - 結案審計與歸檔完成)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  用戶在 Popup 彈窗中看到「觀測標的: UNKNOWN」且無法手動輸入代號進行採集；點擊進入「儀表板」在搜尋列輸入 `NVDA` 點擊「深度採集」時，又彈出「❌ 擷取失敗，請確認代號是否正確或網路是否通暢」。用戶期望能夠自由輸入股票代號（例如 `NVDA`、`CORZ`）並自動於背景採集最新行情與財務數據。
- **核心目標**：
  1. 徹底修復 Dashboard 搜尋採集通訊：消除 `dashboard.js` 發送之 `TRIGGER_DASHBOARD_CRAWL` 與 `background.js` 監聽之 `CRAWL_STOCK` 動作名稱不匹配問題，統一規範並加上防禦性雙向相容。
  2. 解除 Popup 輸入限制並支援手動代號背景採集：解除 `popup.html` 中 `ticker` 輸入框的 `readonly` 鎖定，允許用戶主動輸入代號；當在非 Google Finance 分頁時，點擊採集或按 Enter 可直接呼叫 `background.js` 的 `CRAWL_STOCK` 完成無感採集並自動回填。
- **邊界與假設**：
  - 嚴守 Manifest V3 規範與 zero-dependency 零構建原生 JS 架構。
  - 不得破壞原有的 Google Finance 當前分頁 DOM 直接提取邏輯，只在非目標頁或用戶手動輸入時走背景無感分頁管線。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`FINANCE_CLIPPER_README.md`。
- **影響範圍地圖 (Entity Map)**：
  - `finance-research-clipper-oss/src/dashboard/js/dashboard.js`（修復 action 名稱與參數）
  - `finance-research-clipper-oss/background.js`（增加相容監聽防禦）
  - `finance-research-clipper-oss/popup.html`（解除 ticker readonly 限制）
  - `finance-research-clipper-oss/src/popup/popup.js`（增加手動輸入代號與背景採集調度）
- **前置條件 (Prerequisites)**：Git status 乾淨，確認無衝突修改。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：重用 `background.js` 現有的 `crawlStockByKeyword` 完整 4合1 SPA 爬蟲管線。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔或程式碼。
  - 遵守 2-Strike 熔斷，單一 Bug 最多重試 2 次。
  - 嚴格維持與其他插件的解耦隔離。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/src/dashboard/js/dashboard.js`
- `finance-research-clipper-oss/background.js`
- `finance-research-clipper-oss/popup.html`
- `finance-research-clipper-oss/src/popup/popup.js`

### 鎖定工具鏈 (Target Devtools)
- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py`
- [ ] 結案自動審計: `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: Dashboard 與 Background 採集通訊阻斷修復 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 修復 `dashboard.js` 中的採集 Action 與參數
    - **動作**: 將 `dashboard.js` 中的 `triggerCrawl` 修正為發送 `action: 'CRAWL_STOCK', keyword: cleanTicker, ticker: cleanTicker`，並增強錯誤處理。
    - **驗證**: 語法檢查通過 (`node -c`)，訊息 payload 與通道一致。
- [x] 任務 1.2: 增強 `background.js` 訊息監聽器相容性
    - **動作**: 讓 `background.js` 同時相容 `CRAWL_STOCK` 與 `TRIGGER_DASHBOARD_CRAWL`，支援 `message.keyword || message.ticker`。
    - **驗證**: 語法檢查通過 (`node -c`)，完成雙向通訊協議對齊。

### Phase 2: Popup 解除輸入鎖定與主動背景採集串接 狀態：`[已完成]`
- [x] 任務 2.1: 解除 `popup.html` 的 `ticker` 唯讀限制
    - **動作**: 移除 `popup.html` 中 `id="ticker"` 的 `readonly` 屬性，加入清晰 placeholder（例如：`例如: NVDA, CORZ 或於 Google Finance 自動帶入`）。
    - **驗證**: 確認輸入框可正常打字與接收焦點。
- [x] 任務 2.2: 於 `popup.js` 實現輸入代號主動背景爬取
    - **動作**: 當使用者手動在 `ticker` 輸入代號並按下 Enter 或點擊「一鍵完整抓取」時，若當前分頁非 Google Finance 標的頁，主動透過 `chrome.runtime.sendMessage({ action: 'CRAWL_STOCK', keyword: ticker })` 調用後台採集並將結果回填 UI。
    - **驗證**: 語法檢查通過 (`node -c`)，非 Google Finance 分頁下手動輸入代號支援 Enter 及按鈕發起背景爬取與完整財報回填。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計 (`audit_suite.py` / `doc_cross_ref.py`)
- [x] 任務 F.2: 結案歸檔至 `0.doc_mg/tasks/archive/`

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景**: 背景分頁在某些網路環境下載入超時；防範措施：維持 `background.js` 現有的 8 秒與 12 秒超時防護與分頁強制銷毀機制，不阻斷 UI。

## 6. 驗收標準 (Acceptance Criteria)
- [x] 在 Dashboard 搜尋列輸入 `NVDA` 或 `CORZ` 點擊「深度採集」，能成功發起背景抓取並取得最新數據，無「擷取失敗」報錯。
- [x] 在 Popup 彈窗中，用戶能手動輸入股票代號（例如 `NVDA`），並支援一鍵啟動背景採集回填。
- [x] 結案自動化審計 Exit 0。

## 7. 狀態收斂歷程 (State Transition Log)
- 2026-10-21: 初始化任務藍圖，完成問題根本原因定位 (Gate 1 Blueprint)。
- 2026-10-21: 完成 Phase 1，修復 `dashboard.js` 與 `background.js` 間的 Action 名稱及參數雙向通訊協議阻斷問題 (Gate 2 - Phase 1)。
- 2026-10-21: 完成 Phase 2，解除 `popup.html` ticker 唯讀限制，於 `popup.js` 實作 Enter 與「一鍵完整抓取」的背景爬蟲調度與數據回填機制 (Gate 2 - Phase 2)。
- 2026-10-21: 完成 Phase Final，通過 Gate 3 自動化審計套件 (Exit 0)，完成 SSOT 閉環與任務歸檔結案 (Gate 3 Consolidation)。
