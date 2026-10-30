# Finance Research Clipper OSS 組成元件規格字典

> 文件路徑：`finance-research-clipper-oss/docs/spec-clipper-components.md`  
> 模組代號：`clipper`  
> 架構規範：Manifest V3、零構建 Vanilla JS、模組化架構 (Dashboard / Popup / Crawler / Services)

---

## 1. 架構概述與設計原則

Finance Research Clipper OSS 專為專業投資研報採集、同業估值分析與自動化整理而設計：
* **零構建高度模組化**：採用原生 ES / 模組化腳本分離架構，不需 npm build 即可在 Chrome 直接加載運作。
* **多視圖容器協同**：結合 Popup（一鍵快採）、Dashboard（深層分析矩陣）、Sidepanel（研報伴讀）與 Options（連線配置）。
* **雙向數據同步**：支援本機 Chrome Storage 與 Google Sheets (透過 Google Apps Script Hub) 雲端直連同步。
* **本機 AI 整合**：原生適配 `chrome_gemini_nano`，在無網路情況下執行研報脈動提煉。

---

## 2. 組成元件清單 (Component Inventory)

### 2.1 數據採集與清洗引擎 (Crawler Engine)
* **`FinancialCrawler` (`src/crawler/crawler.js`)**
  * 職責：解析當前頁面金融標的代碼（如台股 2330、美股 AAPL/NVDA）、營收數字、目標價與投資評等。
  * 策略：針對主流金融網站 (Yahoo Finance, Google Finance, 鉅亨網, CMoney) 具備專屬抽取規則。
* **`CrawlerSanitizer` (`src/crawler/crawler-sanitizer.js`)**
  * 職責：數值清洗與格式正規化，處理各國貨幣符號、縮寫 (B/M/K) 換算與日期標準化 (ISO-8601)。

### 2.2 研報分析儀表板 (Dashboard Architecture)
* **核心控制器與渲染器**
  * `src/dashboard/js/dashboard.js`: 儀表板全域狀態樞紐，協調數據載入、搜尋與排序。
  * `src/dashboard/js/dashboard-render.js`: 主表格與研報卡片視圖渲染。
  * `src/dashboard/js/dashboard-tabs.js` / `src/dashboard/js/dashboard-tabs-render.js`: 標籤頁（總覽、估值矩陣、同業比較、AI 對話）切換控制器與視圖容器。
  * `src/dashboard/js/dashboard-actions.js`: 研報項目之新增、批次編輯、狀態切換與匯出。
* **估值矩陣與同業分析模組**
  * `src/dashboard/js/dashboard-valuation-actions.js` / `src/dashboard/js/dashboard-valuation-render.js`: 本益比 (P/E)、股價淨值比 (P/B)、PEG 等估值矩陣計算與敏感度分析圖表渲染。
  * `src/dashboard/js/dashboard-peer-actions.js` / `src/dashboard/js/dashboard-peer-render.js`: 同業競爭者 (Peer Group) 橫向對比、行業中位數計算與對比雷達圖渲染。
* **智慧分析元件**
  * `src/dashboard/js/dashboard-ai.js`: 整合 Nano 本機模型或雲端 API，提供「重點快篩」、「風險點警示」與「法說會摘要問答」。

### 2.3 快捷採集與輔助介面 (Popup & Sidepanel)
* **`PopupScraper` (`src/popup/popup.js`, `src/popup/popup-scraper.js`, `src/popup/popup-export.js`)**
  * 職責：點擊擴充功能圖示時觸發，3 秒內自動探測當前分頁股票代碼，一鍵儲存研報快照並支援立即匯出。
* **`SidepanelReader` (`src/sidepanel/sidepanel.js`, `src/sidepanel/sidepanel.html`, `src/sidepanel/sidepanel.css`)**
  * 職責：伴隨研報閱讀時常駐側邊欄，提供即時筆記、高亮標註與股票基本面速查卡片。
* **`OptionsController` (`src/options/options.js`, `options.html`)**
  * 職責：管理 Google Sheets Web App URL、跨插件通訊授權與自訂爬蟲規則。

### 2.4 外部服務與橋接 (External Services)
* **`GoogleSheetsExporter` (`src/services/googleSheetsExporter.js`)**
  * 職責：直接封裝 HTTP POST/GET 請求至 Google Apps Script (`google_sync_hub.gs`)，將採集數據寫入雲端試算表。
* **`AIClient` (`src/services/aiClient.js`)**
  * 職責：優先嘗試向 `chrome_gemini_nano` 發起本機推論請求；若不可用則優雅降級至雲端 API。

---

## 3. 資料架構與跨模組協定 (Data Schema & Protocols)

### 3.1 研報快照模型 (Research Snapshot Schema)
```json
{
  "ticker": "2330.TW",
  "companyName": "台積電",
  "targetPrice": 1200,
  "rating": "Buy",
  "sourceUrl": "https://example.com/report/123",
  "summary": "先進製程需求強勁，營收續創新高",
  "metrics": {
    "peRatio": 22.5,
    "pbRatio": 5.8,
    "roe": 28.4
  },
  "tags": ["半導體", "AI晶片"],
  "collectedAt": "2026-10-30T10:00:00Z"
}
```

### 3.2 跨插件通訊介面 (Cross-Plugin Messaging)
* **`CLIPPER_NEW_ENTRY`**: 廣播新採集研報至 `chrome_pk` 之專案看板。
* **`CLIPPER_REQ_NANO_PULSE`**: 請求 `chrome_gemini_nano` 進行研報脈動提煉。

