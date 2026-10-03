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
- **左側歷史追蹤庫**：自動紀錄最近爬取過的標的清單（代號、即時價格、時間戳記），支援隨點隨切換、快速比對，並與底部族群分類動態連動。
- **全方位財務矩陣**：
  - 📊 **個股主看板 (Hero)**：即時股價、S&P 500 / Nasdaq 大盤對比、市值、本益比 (P/E)、殖利率、52 週區間。關鍵指標網格採自適應均稱排版（自動平衡卡片消除孤立空隙），並將趨勢向量圖示直接內嵌 SVG，杜絕圖示破圖。
  - 🎯 **分析師共識與目標價階梯**：共識評級徽章 (*Strong Buy* / *Hold*)、最高/中位數/最低目標價視覺化水平儀、潛在上漲空間百分比計算。
  - 📈 **最新季度財報表現 (Earnings)**：EPS 與營收實際值 vs 分析師預期。
  - 📑 **損益表數據矩陣 (Income Statement)**：主動導航至 financials 分頁並結合語意關鍵字白名單，精準呈現個股真實各年/季度營收與獲利變化。
  - 🌐 **市場主題與相關專題 (Market Topics)**：獨立呈現 Overview 總覽頁提取之市場熱門主題、趨勢與相關標的行情矩陣。
  - ⚖️ **同業橫向對比矩陣 (Peer Matrix)**：支援從歷史庫勾選 2~5 檔標的，橫向對比現價、市值、P/E、P/S、EPS、52週高低與潛在上漲空間，具備極值自動標色與市值/估值/上漲空間視覺化長條比對，支援一鍵 Markdown/GAS 匯出。
  - 🧮 **估值情境敏感度沙盒 (Valuation Sandbox)**：以選定標的為基準，提供動態互動滑桿（成長率、Exit P/E、折現率）即時推演 Bear / Base / Bull 三種情境目標價，內建 5x5 成長率 vs P/E 敏感度二維熱力矩陣，並支援一鍵推播作戰任務至 ScrumClock。
- 🏷️ **頂部自訂主題式分類標籤 (Topic Tags)**：可由使用者自訂新增、編輯與刪除主題標籤（存儲於 `custom_topic_tags`），點擊即可快速篩選或一鍵採集特定領域標的。
- ✍️ **頂部研報筆記與輸出中心 (Dropdown Drawer)**：以無干擾的 Modern Glassmorphism 頂部下拉浮動面板整合研報備忘錄與 5 顆輸出操作按鈕（🎯 加入今日作戰戰役轉入 ScrumClock、📋 複製 Markdown、📥 下載 CSV、☁️ 發送至 GAS、📦 批次同步），大幅釋放主內容垂直捲動空間。
- 📑 **底部族群分類選單列 (Category Tabs Bar)**：畫面底端常駐族群分類標籤列（如全部標的、自選核心、科技半導體等），支援新增族群、切換、雙擊編輯名稱與刪除；切換時左側邊欄即時動態連動，標的支援跨族群拖拉或歸類，提供無衝突雙層導航。

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

詳細系統架構與技術規範請參閱完整文件：
- 👉 開發規格與架構說明書 (`docs/chrome-extension-v3-spec.md`)
- 👉 同業對比矩陣與敏感度估值沙盒業務規格 (`docs/peer-matrix-and-valuation-spec.md`)

| 模組 / 檔案 | 職責說明 | 關鍵元素 / 實作函式 |
| :--- | :--- | :--- |
| `manifest.json` | MV3 規範宣告、權限 (`tabs`, `sidePanel`, `storage`, `scripting`) | `"side_panel": { "default_path": "sidepanel.html" }` |
| `dashboard.html`<br>`dashboard.js`<br>`dashboard.css` | **[核心] 獨立分頁儀表板主控**：生命週期、三向 View Switcher（個股、同業對比、估值沙盒）與核心協調整合器 | `init()`, `setupViewSwitcherEvents()`, `bindEvents()` |
| `dashboard-stock.css`<br>`dashboard-components.css` | **[樣式] 儀表板視覺子模組**：個股 Hero/指標卡/損益表樣式、AI 研報卡片/匯出面板/Modal 樣式 | 指標卡排版、AI 研報雙欄卡片、匯出中心下拉面板樣式 |
| `dashboard-peer-matrix.css`<br>`dashboard-valuation.css` | **[樣式] 儀表板領域樣式子模組**：同業橫向對比矩陣與敏感度估值沙盒專屬樣式隔離 | 2~5 檔標的對比排版、極值高亮、5x5 敏感度二維熱力網格與情境卡片樣式 |
| `dashboard-render.js` | **[視圖] 核心渲染模組**：歷史清單、個股主看板、指標均稱網格 (`renderStatsGrid`)、SVG 趨勢向量 (`formatStatValue`)、損益表與市場專題卡片 | `window.DashboardRender.renderStock()`, `renderFinancialsTable()`, `formatStatValue()` |
| `dashboard-tabs-render.js` | **[視圖] 標籤與分頁渲染模組**：族群分類分頁列、自訂主題標籤列與底部分頁狀態渲染 | `window.DashboardRender.renderCategoryTabs()`, `renderTopicTags()`, `renderSheetTabs()` |
| `dashboard-peer-render.js` | **[視圖] 同業矩陣渲染子模組**：同業橫向對比矩陣、動態標的核選列、市值/估值/上漲空間長條比對圖表與極值標色 | `window.DashboardRender.renderPeerMatrix()` |
| `dashboard-valuation-render.js` | **[視圖] 估值沙盒渲染子模組**：Bear / Base / Bull 三情境卡片、即時參數滑桿與 5x5 成長率 vs P/E 二維敏感度熱力矩陣 | `window.DashboardRender.renderValuationSandbox()` |
| `dashboard-actions.js` | **[動作] 核心動作外發模組**：背景深度採集發起（含 `sendRuntimeMessageWithRetry` 防禦）、CSV 下載、GAS 同步等共通動作通道 | `window.DashboardActions.triggerCrawl()`, `sendRuntimeMessageWithRetry()`, `exportToGas()` |
| `dashboard-peer-actions.js` | **[動作] 同業矩陣動作子模組**：多選標的即時數據聚合、Markdown 對比表格複製、同業矩陣 Google 試算表 (GAS) 獨立同步 | `window.DashboardActions.getPeerComparisonData()`, `exportPeerMatrixMarkdown()`, `exportPeerMatrixToGas()` |
| `dashboard-valuation-actions.js` | **[動作] 估值沙盒動作子模組**：折現現金流與終值估值引擎、模型報表產出、推播 ScrumClock 作戰任務與 GAS 估值頁同步 | `window.DashboardActions.calculateValuation()`, `exportSandboxToGas()`, `pushSandboxToScrumClock()` |
| `dashboard-tabs.js` | **[控制器] 標籤與分類狀態模組**：Categories 族群分類與 Topic Tags 自訂主題標籤狀態維護與持久化 | `window.DashboardTabs.init()`, `setupCategoryEvents()`, `setupTopicTagEvents()` |
| `dashboard-ai.js` | **[控制器] 本地 AI 研報控制器**：連動 ScrumClock 本地 Gemini Nano 之 AI 解讀生命週期與複製功能 | `window.DashboardAI.init()`, `loadStockAi()`, `generateStockAi()`, `copyAiMarkdown()` |
| `aiClient.js` | **[AI] 跨插件通訊客戶端**：與 ScrumClock 本地 Gemini Nano API 交互防腐層 | `window.FinanceAIClient.requestStockSummary()` |
| `sidepanel.html`<br>`sidepanel.js`<br>`sidepanel.css` | **[快捷] Chrome 側邊欄工具箱**：快捷輸入（內建安全重試）、左下角跳轉按鍵組合 | `#btn-side-open-dashboard`, `#btn-side-paste-crawl` |
| `background.js` | 背景服務工作線程：後台無感分頁管理、SPA 走訪調度、Storage 快取維護，支援 `PING` 心跳與安全異步錯誤捕獲 | `crawlStockByKeyword()`, `waitForTabLoaded()` |
| `crawler.js` | SPA 走訪爬蟲模組：語意文字錨點比對、分頁導航（Overview 主題萃取、Key Stats 純淨提取與 Financials 分頁精準提取） | `window.FinanceCrawler.runFullStockScraper()`, `scrapeMarketTopics()`, `scrapeFinancials()` |
| `crawler-sanitizer.js` | **[純函數] 數值清洗與 Miner Schema 模組**：純數字萃取、單位換算（$B/百萬/千）、52週高低範圍、目標價統計與 AI 礦企規範轉換 | `window.CrawlerSanitizer.cleanNumber()`, `cleanMarketCap()`, `sanitizeToMinerSchema()` |
| `popup.html`<br>`popup.js` | 工具列彈出視窗主控：模式切換 (`switchMode`)、選項渲染、標的即時廣播 (`lastCapturedStock`)、攜帶參數跳轉儀表板與雲端設定雙鍵同步 | `#open-dashboard-btn`, `broadcastCapturedStock()`, `handleOpenDashboard()` |
| `popup-scraper.js` | **[採集] 彈窗爬蟲模組**：Google Finance 數據與 AI 對話頁面 DOM 結構解析（具備純圖示字串過濾防禦） | `scrapeAIDialogue()`, `scrapeFinanceData()`, `scrapeOverviewDOM()` |
| `popup-export.js` | **[格式化] 規則與匯出模組**：文字清理規則引擎、圖片壓縮、Markdown/CSV 格式化與下載 | `RuleEngine`, `compressImage()`, `downloadFile()` |

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
[瀏覽任何網頁 / 財經網站]
       │
       ├─────────────────────────────────────────┐
       ▼ (模式 A: 側邊欄常駐)                   ▼ (模式 B: 頂部工具列 Popup)
在 Chrome 側邊欄輸入股票代號 (如: NVDA)      點擊 Popup 圖示自動讀取當前個股或手動輸入
       │                                         │
       ▼                                         ▼
背景自動開啟無痕分頁完成 4合1 SPA 採集       Popup 自動廣播最新標的至 Storage
       │                                         │
       ▼                                         ├─ 若 Dashboard 已開啟：即時跳出可點擊 Toast
點擊左下角「🚀 獨立分頁儀表板」按鈕                └─ 點擊「前往儀表板」：攜帶參數直接載入 4合1 研報
       │                                         │
       └─────────────────────────────────────────┘
                               │
                               ▼
在大螢幕檢視損益表矩陣與財報細節 ──> 一鍵複製 Markdown / 匯出 CSV 試算表 / 同步雲端
```

---

## ⚙️ Google 生態系自動化對接指引 (Google Sheets & Docs)

FinanceClipper 支援將個股財務底稿、同業橫向對比矩陣與估值沙盒推演結果，結構化匯出至個人 Google 試算表，並能自動產生排版完整的 Google Docs 深度研報：
1. **建立專屬試算表**：在 Google Drive 新增試算表，並可建立 `Individual_Summary`、`Peer_Comparison` 與 `Valuation_Sandbox` 分頁。
2. **部署 GAS Webhook**：參照全域 SSOT 規格書 `0.doc_mg/docs/google_ecosystem_integration_spec.md` 第 5 章提供之 Apps Script 腳本貼入編輯器，部署為「網頁應用程式 (所有人具存取權)」。
3. **設定 Web App URL**：在儀表板頂部下拉抽屜或側邊欄點選 ⚙️ 設定，貼入 Web App URL 並儲存，即可享受一鍵同步。
4. **跨插件代理轉發**：亦支援直接透過跨插件協議 `EXPORT_TO_SHEETS` 與 `CREATE_DOC_REPORT`，將資料送交 ScrumClock 中樞代為發送。

> 詳細欄位 Schema、排版樣式與常見排查請參閱 `0.doc_mg/docs/google_ecosystem_integration_spec.md` 與專案根目錄之 `使用說明.md`。

---

## 🔒 隱私與安全性保證

- **零外部依賴與第三方追蹤**：無任何追蹤腳本，亦無外部第三方伺服器。
- **純本地 Direct-to-Cloud**：所有數據儲存於瀏覽器本機 `chrome.storage.local`，並僅透過使用者自己設定的 GAS Webhook 進行加密傳輸。
- **XSS 安全防禦**：所有動態渲染欄位全面採用實體轉義 (`escapeHtml`)，符合 Chrome Web Store 最高資安規範。

---

## 🚀 投研工作流支援與演進藍圖 (Analyst Workflow Roadmap)

依據 `0.doc_mg/docs/analyst_workflow_friction_matrix.md` 之診斷分析，後續規劃演進方向：
1. **Clean TSV / Markdown 一鍵複製 (已完成 ✅)**：損益表、同業對比與估值沙盒支援無污染數值與表格一鍵複製，直貼 Excel/Sheets 零跑版。
2. **雙向作戰任務協同 (已完成 ✅)**：與 ScrumClock 實現任務點擊攜帶 `deepLinkUrl` 反向喚起儀表板自動定位標的。
3. **自選投資組合批次巡檢 (Portfolio Watcher)**：支援多標的背景輪詢採集與共識評級變動告警。
4. **動態折現估值公式導出 (已完成 ✅)**：沙盒運算結果支援轉換為標準 3-Statement & DCF 試算表底稿（含動態 Excel 折現公式與情境敏感度分析），支援 GAS 直套與 Clean TSV 複製。

