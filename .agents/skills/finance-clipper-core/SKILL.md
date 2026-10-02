---
name: FinanceClipper 研報採集與財務規格字典 (FinanceClipper Core Spec)
description: 定義 finance-research-clipper-oss 插件之技術規格、資料來源選擇器 SSOT、頁面架構、儲存模型與跨插件對外接口。
triggers: [finance-clipper, 研報採集, 股票爬蟲, 財務儀表板, yahoo finance爬蟲, 個股剪輯, 財報分析]
dependencies: []
ssot_dependencies: ["finance-research-clipper-oss/FINANCE_CLIPPER_README.md", "0.doc_mg/docs/cross_plugin_contract.md"]
---

# 專家技能：FinanceClipper 研報採集與財務規格字典 (FinanceClipper Core Spec)

本技能為 `finance-research-clipper-oss` 插件的 Single Source of Truth (SSOT)，包含其原生技術架構、多市場爬蟲選擇器、UI 視圖架構、儲存結構與對外服務契約。

---

## 1. 專案技術規格 (Tech Stack & Zero-Build Architecture)
* **目錄位置**: `./finance-research-clipper-oss/`
* **架構風格**: 純原生 Vanilla JS (ES6+) + CSS3 + HTML5（零構建、無 Webpack/Vite 依賴、即改即測）
* **擴充功能入口 (Extension Entrypoints)**:
  * `manifest.json`: Manifest V3，宣告 `storage`, `activeTab`, `scripting`, `sidePanel` 與 `externally_connectable`。
  * `background.js`: Service Worker，處理 `onMessageExternal`（跨插件資料服務 API）與擴充功能生命週期。
  * `crawler.js`: Content Script，注入至各財經網站擷取結構化財務數據。
  * `popup.html` / `popup.js`: 點擊插件圖示的輕量彈出視窗主控（模式切換、選項渲染）。
    * `popup-scraper.js`: 彈窗專屬 DOM 爬取模組（解析 Google Finance 與 AI 對話頁面）。
    * `popup-export.js`: 彈窗文字規則引擎（RuleEngine）、圖片壓縮與 MD/CSV 匯出下載。
  * `sidepanel.html` / `sidepanel.js`: Chrome 側邊欄，提供即時個股摘要與快速筆記。
  * `dashboard.html` / `dashboard.js` / `dashboard.css`: 核心完整獨立儀表板主控，支援多頁籤、Gemini Nano AI 研報推論連動。
    * `dashboard-render.js`: 儀表板視圖渲染模組（`window.DashboardRender`，涵蓋指標卡、損益表、市場主題與相關專題、Sheet Tabs 分頁列與吐司）。
    * `dashboard-actions.js`: 動作外發模組（`window.DashboardActions`，涵蓋背景採集發起、`sendRuntimeMessageWithRetry` 指數退避重試防禦、GAS 同步、CSV/MD 下載與 ScrumClock 任務建立）。
  * `aiClient.js`: 跨插件通信客戶端（連動 ScrumClock 本地 Gemini Nano 研報推論 API）。

---

## 2. 資料來源選擇器與爬蟲字典 (Crawler Data Sources SSOT)

### 支援目標網站與核心解析邏輯 (`crawler.js`)
1. **Google Finance (美股/台股/全球 - 核心爬蟲管線)**:
   - 4合1 SPA 走訪導航：Overview、Analysis、Earnings、Financials。
   - Overview 總覽頁：萃取基本盤價量、Key Stats、及市場專題表格 `marketTopics`（透過語意排除財報）。
   - Financials 分頁：主動導航並以語意關鍵字白名單校驗萃取真實 `financials` 損益表矩陣。
2. **Yahoo Finance (美股/台股/全球)**:
   - 標的名稱/代號: `h1`, `div[data-testid="quote-hdr"]`
   - 即時報價與漲跌: `fin-streamer[data-field="regularMarketPrice"]`, `fin-streamer[data-field="regularMarketChangePercent"]`
   - 估值指標: PE (TTM), Forward PE, Market Cap, Beta, 52 Week Range.
3. **Finviz (美股量化指標與基本面)**:
   - 財務比率矩陣: `table.snapshot-table2` (P/E, P/B, EPS, ROE, Debt/Eq, RSI).
   - 分析師評級與目標價: Target Price, Recommendation.
4. **Goodinfo / 台灣股市資訊網 (台股法人與營收)**:
   - 外資/投信買賣超, 月營收年增率 (YoY), 殖利率.
5. **Investing.com (國際總經與財報日曆)**:
   - 財報發布倒數與每股盈餘預估.

---

## 3. UI 模組與視圖架構 (View Modules)
* **儀表板視圖 (`dashboard-render.js` & `dashboard.js`)**:
  - `renderFinancialsTable()`: 渲染損益表數據矩陣，若無財報數據時優雅顯示提示。
  - `renderMarketTopicsTable()`: 獨立渲染市場熱門主題與相關專題清單矩陣。
  - `renderWatchlist()` / `renderHistoryList()`: 渲染左側歷史追蹤庫、活躍標籤標記。
  - `renderFinancialMetrics()`: 財務三表與關鍵比率卡片。
  - `renderAnalystRatings()`: 分析師評等、目標價階梯與潛在上漲空間儀表。
  - `renderAIReportPanel()`: 研報解讀面板（連動本地 AI 或外部代理）。
* **通訊客戶端 (`aiClient.js`)**:
  - 封裝跨插件請求，內建 `sanitizeFinancePayload()` 白名單防腐層。

---

## 4. 資料模型與儲存 SSOT (Storage Schema)
所有數據儲存於獨立之 `chrome.storage.local`：

### 主要儲存鍵值 (Storage Keys)
1. `stockHistory`: `Array<StockItem>`，個股完整採集資料快照：
   - `financials`: `{ table: Array<Array<string>>, statements: Array<Array<Array<string>>> }`（損益表真實數據）
   - `marketTopics`: `{ table: Array<Array<string>>, tables: Array<Array<Array<string>>> }`（市場主題與專題數據）
   - `stats`, `analyst`, `earnings`, `price`, `ticker` 等。
2. `fc_watchlist`: `Array<{ ticker: string, name: string, price: number, change: number, market: string, updatedAt: number }>`
3. `fc_stock_notes`: `Record<ticker, string>`（用戶對個股的手動筆記與研究心法）
4. `fc_reports`: `Record<ticker, { summary: string, highlights: string[], risks: string[], generatedAt: number }>`
5. `fc_settings`: 偏好設定（預設市場、貨幣單位、自動抓取間隔等）

---

## 5. 跨插件通訊與協作規格 (Cross-Plugin Bus & Outbox)
FinanceClipper (ID: `imnnkgiglcbjknfbkdfocdhoookkipji`) 與 ScrumClock 中樞 (ID: `ahiihabnbjeoeneahcgbdcofncjoclcp`) 透過純資料協議通訊：
1. **自動握手 (PING_HUB)**：`aiClient.js` 初始化時發送 `PING_HUB` 自動探測 ScrumClock 是否在線與能力清單，無需手動填寫 Extension ID。
2. **UniversalTaskPayload v2.3 研報轉任務 (`CREATE_TASK`)**：
   - 透過 `sanitizeTaskPayload()` 防腐層過濾白名單。
   - 支援 `gtdContext` (`@Focus` 等)、`priority` (`P1` 等)、`sourcePlugin: 'FINANCE_CLIPPER'` 與 `workspaceSync` 同步結構。
3. **Outbox 防丟單機制 (`outbox_queue`)**：
   - 當發送 `CREATE_TASK` 遭遇 ScrumClock Service Worker 休眠或連線逾時（6 秒）時，自動寫入本地 `chrome.storage.local` 之 `outbox_queue`。
   - 透過 `chrome.alarms` 定期（每 30 秒）與 `chrome.tabs.onActivated` 進行重試，直至收到對端 ACK。超過最大重試次數 (5 次) 轉入 `dead_letter_queue` 並彈出通知。
4. **外部接口 (`onMessageExternal`)**：
   - **`GET_WATCHLIST`**: 回傳純自選股清單快照（只讀），無副作用。
   - **`GET_STOCK_SUMMARY`**: 傳入 `{ ticker: string }`，回傳個股精簡財務指標。
   - **`FOCUS_STARTED`**: 接收 ScrumClock 開始番茄鐘專注廣播，自動進行標的研報預載。

---

## 6. 邊界與隔離防護準則 (Isolation Hard Rules)
1. **禁止跨目錄讀取**: 開發 FinanceClipper 時，禁止讀取 `chrome_scrumclock/` 內部 React 代碼。
2. **通訊規格驅動**: 跨插件接口一律依據 `0.doc_mg/docs/cross_plugin_contract.md` 規範。
3. **零構建約束**: FinanceClipper 維持零依賴原生 JS 特性，嚴禁無故引入 Node.js/npm 打包流程。
