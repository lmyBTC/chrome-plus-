# 📈 [FinanceClipper] Finance Research Clipper (Open-Source Version)

> [!IMPORTANT]
> **AI 開發專用導航指引 (SSOT)**：
> 本文檔為 `finance-research-clipper-oss` (Finance Research Clipper) 之**單一真實來源說明與架構手冊 (SSOT)**。
> 本檔已命名為 `FINANCE_CLIPPER_README.md`，專門防止多專案工作區下的檔名衝突與 AI 上下文污染。
> 修改或維護前，請直接鎖定本檔與目標程式碼，切勿讀取錯誤插件之腳本。

> **Google Finance 一鍵式深度研報採集與智能投資儀表板 (Chrome Extension V3)**

一個輕量、安全且隱私友好的 Chrome 瀏覽器擴充功能。專為價值投資者與量化研究員打造，提供**獨立分頁大螢幕儀表板 (Dashboard)** 與 **Chrome 側邊欄快捷工具箱 (Side Panel)** 雙載體工作流。支援直接輸入代號或名稱啟動 **4合1 SPA 背景靜默採集**、即時預覽損益表矩陣與分析師目標價，並一鍵複製 Markdown、下載 CSV 或同步至個人 Google Sheets。

此版本為**開源上架版本**，完全遵循 Manifest V3 規範，已徹底去識別化，完全採用本地 `chrome.storage.local` 儲存標的庫與參數。

---

## 🌟 核心特色與雙載體工作流 (Core Features)

### 1. 🖥️ 獨立分頁專業儀表板 (`dashboard.html`) —— 主力分析視圖
- **寬螢幕現代科技感**：專為深度研報設計的暗色調（Slate/Dark Mode）視覺風格與資訊卡片。
- **左側歷史追蹤庫**：自動紀錄最近爬取過的標的清單（代號、即時價格、時間戳記），支援隨點隨切換、快速比對。
- **全方位財務矩陣**：
  - 📊 **個股主看板 (Hero)**：即時股價、S&P 500 / Nasdaq 大盤對比、市值、本益比 (P/E)、殖利率、52 週區間。
  - 🎯 **分析師共識與目標價階梯**：共識評級徽章 (*Strong Buy* / *Hold*)、最高/中位數/最低目標價視覺化水平儀、潛在上漲空間百分比計算。
  - 📈 **最新季度財報表現 (Earnings)**：EPS 與營收實際值 vs 分析師預期。
  - 📑 **損益表數據矩陣 (Income Statement)**：完整表格呈現各年/季度營收與獲利變化。
- 📑 **底部 Google Sheets 風格活頁分頁列 (Sheet Tabs Bar)**：畫面底端常駐如 Google Sheets / Excel 的暫存活頁標籤列，每檔爬取或暫存的股票自動生成一個活頁標籤（含 Ticker、最新價格與關閉 `✕` 按鈕），支援平滑左右捲動、秒速點擊切換、隨時新增標的。
- **研報筆記與輸出中心**：自訂投資論述與觀點，支援**一鍵複製完整 Markdown**、**下載 CSV 試算表**與**同步至 Google Sheets**。

### 2. ⚡ Chrome 側邊欄快捷工具箱 (`sidepanel.html`) —— 即時輕量採集
- **常駐瀏覽器右側**：不再因網頁切換或點擊失焦而關閉。
- **快速深度採集**：直接在輸入框鍵入代號（如 `NVDA`, `2330`）或點擊熱門標籤，按 Enter 即可在後台啟動爬蟲。
- **左下角工具箱快速按鍵組合 (Bottom-Left Quick Toolbox)**：
  - 🚀 **開啟獨立儀表板**：一鍵在新分頁展開 `dashboard.html` 查看詳細報表與歷史。
  - 📋 **從剪貼簿快速貼入並爬取**：自動讀取剪貼簿文字代號並秒速開始爬取。
  - 📌 **一鍵抓取當前瀏覽頁面**：若當前分頁正位於 Google Finance，一鍵提取標的數據。
  - ⚙️ **設定捷徑**：快速設定 Google Apps Script Webhook。

### 3. 🤖 背景靜默 4合1 SPA 爬蟲管線 (`background.js` + `crawler.js`)
- **免維護交易所代碼表**：透過 `https://www.google.com/finance?q={query}` 智慧跳轉，自動定位目標股票頁面。
- **靜默背景分頁**：在隱藏背景分頁中自動連續走訪 4 大分頁（Overview, Analysis, Earnings, Financials），採集完畢後立即安全銷毀分頁，零干擾、無殘留。

---

## 🧭 專案模組架構速查 (File Map)

詳細系統架構與技術規範請參閱完整文件：👉 [**開發規格與架構說明書 (docs/chrome-extension-v3-spec.md)**](docs/chrome-extension-v3-spec.md)

| 模組 / 檔案 | 職責說明 | 關鍵元素 / 實作函式 |
| :--- | :--- | :--- |
| [`manifest.json`](manifest.json) | MV3 規範宣告、權限 (`tabs`, `sidePanel`, `storage`, `scripting`) | `"side_panel": { "default_path": "sidepanel.html" }` |
| [`dashboard.html`](dashboard.html)<br>[`dashboard.js`](dashboard.js)<br>[`dashboard.css`](dashboard.css) | **[核心] 獨立分頁儀表板主控**：生命週期、事件調度與 Gemini Nano AI 研報交互 | `init()`, `loadStockAi()`, `bindEvents()` |
| [`dashboard-render.js`](dashboard-render.js) | **[視圖] 儀表板渲染模組**：歷史清單、個股主看板、目標價、損益表與 Sheet Tabs 分頁列構建 | `window.DashboardRender.renderStock()`, `renderSheetTabs()` |
| [`dashboard-actions.js`](dashboard-actions.js) | **[動作] 動作外發模組**：背景深度採集發起、Markdown/CSV 匯出、GAS 同步與轉入 ScrumClock | `window.DashboardActions.triggerCrawl()`, `exportMarkdown()`, `sendToGas()` |
| [`aiClient.js`](aiClient.js) | **[AI] 跨插件通訊客戶端**：與 ScrumClock 本地 Gemini Nano API 交互防腐層 | `window.FinanceAIClient.requestStockSummary()` |
| [`sidepanel.html`](sidepanel.html)<br>[`sidepanel.js`](sidepanel.js)<br>[`sidepanel.css`](sidepanel.css) | **[快捷] Chrome 側邊欄工具箱**：快捷輸入、左下角跳轉按鍵組合 | `#btn-side-open-dashboard`, `#btn-side-paste-crawl` |
| [`background.js`](background.js) | 背景服務工作線程：後台無感分頁管理、SPA 走訪調度與 Storage 快取維護 | `crawlStockByKeyword()`, `waitForTabLoaded()` |
| [`crawler.js`](crawler.js) | SPA 走訪爬蟲模組：語意文字錨點比對與 4 大分頁提取 | `window.FinanceCrawler.runFullStockScraper()` |
| [`popup.html`](popup.html)<br>[`popup.js`](popup.js) | 工具列彈出視窗主控：模式切換 (`switchMode`)、選項渲染與一鍵前往儀表板 | `#open-dashboard-btn`, `#btn-goto-dashboard` |
| [`popup-scraper.js`](popup-scraper.js) | **[採集] 彈窗爬蟲模組**：Google Finance 數據與 AI 對話頁面 DOM 結構解析 | `scrapeAIDialogue()`, `scrapeFinanceData()`, `scrapeOverviewDOM()` |
| [`popup-export.js`](popup-export.js) | **[格式化] 規則與匯出模組**：文字清理規則引擎、圖片壓縮、Markdown/CSV 格式化與下載 | `RuleEngine`, `compressImage()`, `downloadFile()` |

---

## 🛠️ 安裝與載入說明

1. 下載或 Clone 本專案至本地資料夾。
2. 開啟 Chrome 瀏覽器，進入 `chrome://extensions/` (擴充功能管理)。
3. 開啟右上角的「**開發人員模式**」。
4. 點擊「**載入未封裝項目**」，選擇本專案目錄 `finance-research-clipper-oss`。
5. 建議點擊瀏覽器右上角的拼圖圖示，將「Finance Research Clipper」釘選在工具列。

---

## 💡 推薦使用流程 (Workflow)

```
[瀏覽任何網頁]
       │
       ▼
在 Chrome 側邊欄 (Side Panel) 輸入股票代號 (如: NVDA) 或點擊熱門標籤
       │
       ▼
背景自動開啟無痕分頁完成 4合1 SPA 採集，側邊欄即時呈現價格與評級摘要
       │
       ▼
點擊側邊欄左下角「🚀 獨立分頁儀表板」按鈕
       │
       ▼
在大螢幕檢視損益表矩陣與財報細節 ──> 一鍵複製 Markdown / 匯出 CSV 試算表
```

---

## ⚙️ 雲端 Google Sheets 同步指南

若需要將資料同步至個人的 Google 雲端試算表：
1. **建立試算表**：在 Google Drive 新增試算表並命名工作表為 `Main`。
2. **部署 GAS**：依照 [`docs/google-apps-script.md`](docs/google-apps-script.md) 將代碼貼至 Apps Script 編輯器，並部署為「網頁應用程式 (所有人具存取權)」。
3. **儲存 URL**：在儀表板或側邊欄點選 ⚙️ 設定圖示，將產生的 Web App URL 貼入並儲存。

---

## 🔒 隱私與安全性保證

- **零外部依賴與第三方追蹤**：無任何追蹤腳本，亦無外部第三方伺服器。
- **純本地 Direct-to-Cloud**：所有數據儲存於瀏覽器本機 `chrome.storage.local`，並僅透過使用者自己設定的 GAS Webhook 進行加密傳輸。
- **XSS 安全防禦**：所有動態渲染欄位全面採用實體轉義 (`escapeHtml`)，符合 Chrome Web Store 最高資安規範。
