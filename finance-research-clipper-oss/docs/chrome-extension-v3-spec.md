# **Finance Research Clipper 開發規格與架構說明書**

本規格書針對「投資研究靈感擷取與自動草稿生成系統」中的**前端擷取端 (Chrome Extension)** 進行詳細的架構設計、技術亮點與未來規劃定義，以確保外掛在 Chrome Extension V3 標準下穩定、安全且高效地執行。

---

## **1. 系統整體架構與數據流 (System Architecture)**

本系統定位為「**投資研究靈感擷取與自動草稿生成系統**」的前端採集端，其核心目標是讓研究員/投資人在瀏覽 Google Finance 網頁（特別是 Beta 新版）或使用其「AI 研究面板」時，能夠一鍵擷取行情與對話，寫下想法並無縫同步至雲端試算表。

### **1.1 數據流向圖 (Data Flow)**

```mermaid
graph TD
    User([使用者]) -->|打開擴充功能 UI| PopupHTML[popup.html]
    PopupHTML -->|執行切換與渲染| PopupJS[popup.js]
    
    subgraph 瀏覽器環境 (Chrome Extension V3)
        PopupJS -->|chrome.scripting.executeScript| TargetTab{Google Finance Tab}
        TargetTab -->|執行 scrapeFinanceData| StockScraper[股票/指標擷取]
        TargetTab -->|執行 scrapeAIDialogue| AIScraper[AI 研究面板擷取]
        
        StockScraper -->|回傳行情/大盤/市值/PE| PopupJS
        AIScraper -->|回傳對話/Markdown 表格化內容| PopupJS
        
        PopupJS -->|chrome.tabs.captureVisibleTab| Screenshot[擷取當前圖表 Base64]
    end

    PopupJS -->|POST text/plain| GASWebapp[Google Apps Script Web App]
    
    subgraph Google 雲端生態系
        GASWebapp -->|解析 JSON Payload| GASCore[Code.gs]
        GASCore -->|分析 note 關鍵字| Sentiment[情緒分析邏輯]
        GASCore -->|解碼 Base64 並存入資料夾| GDrive[Google Drive 圖片備份]
        GASCore -->|寫入 12 欄位數據| GSheets[(Google Sheets - Main)]
        
        GDrive -->|取得共享 URL| GSheets
        GSheets -->|回傳 UUID 與成功狀態| GASCore
    end
    
    GASWebapp -->|回傳 success 響應| PopupJS
    PopupJS -->|更新狀態並顯示試算表連結| User
```

### **1.2 核心元件職責**
*   **彈出視窗 UI ([popup.html](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/popup.html))**：提供直覺、現代化的操作介面，顯示當前抓取到的股票代號、現價，提供設定按鈕（齒輪）讓使用者自訂與儲存 API URL，並提供 Note 輸入框供記錄投資想法。
*   **彈出視窗邏輯 ([popup.js](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/popup.js))**：
    1.  初始化時，利用 `chrome.tabs` 查詢當前活躍的標籤頁。
    2.  利用 `chrome.scripting.executeScript` 動態注入臨時 Content Script 以擷取數據。
    3.  實作 Canvas 等比例壓縮圖片（限制寬度為 800px，JPEG 格式，品質 0.6），減少傳輸負載。
    4.  讀取與儲存 `chrome.storage.local` 中的 Apps Script API URL。
    5.  將資料打包為 JSON 格式，並以 `text/plain` 傳送至後端 Google Apps Script。
*   **背景腳本 ([background.js](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/background.js))**：負責管理擴充功能的 Service Worker 狀態，並在事件觸發時進行全域管理。

---

## **2. 專案目錄結構 (Project Structure)**

在本地端開發目錄中，請保持以下結構：

```text
finance-research-clipper/
├── manifest.json         # 外掛核心設定檔 (MV3)
├── popup.html            # 彈出視窗結構與樣式
├── popup.js              # 彈出視窗主要控制邏輯
├── background.js         # 背景服務 (Service Worker)
├── README.md             # 本地開發與安裝說明
└── docs/
    ├── chrome-extension-v3-spec.md  # 本說明書
    ├── google-apps-script.md        # Google Apps Script 雲端中繼站程式碼
    ├── google-finance-beta-data.md  # 數據抓取測試分析
    └── ai-output-console.md         # AI 輸出範本日誌
```

### **核心程式碼跳轉連結**
- 權限與宣告宣告設定：[manifest.json](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/manifest.json)
- 外掛 UI 介面樣式：[popup.html](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/popup.html)
- 抓取、壓縮與傳輸邏輯：[popup.js](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/popup.js)
- 雲端 Apps Script 後端部署程式碼：[google-apps-script.md](file:///c:/Users/G1/00.coding workspace/masonyang-blog/tools/finance-research-clipper/docs/google-apps-script.md)

---

## **3. 功能里程碑與未來路線圖 (Milestones & Roadmap)**

### **3.1 已完成功能 (Milestones)**
*   **MV3 規範與最小權限**：全面採用 Manifest V3 標準，權限落實最小化原則（宣告 `activeTab`, `scripting`, `storage` 等）。
*   **CORS 跨來源突破**：使用 `text/plain` 傳輸與 `redirect: "follow"` 繞過 GAS 的跨網域與 Preflight 阻擋。
*   **Google Finance Beta 多重回退擷取**：克服 Beta 版動態 Class 與 `/beta/quote/` 雙路徑解析，精準擷取個股行情。
*   **AI 研究面板擷取與對話格式化**：一鍵擷取問答內容並自動清理雜訊轉換為標準 Markdown 格式。
*   **安全性優化**：移除了 API URL 的硬編碼，改用 UI 設定面板並安全儲存於 `chrome.storage.local`。
*   **效能優化 (截圖壓縮)**：透過前端 Canvas 將截圖等比例縮放（限制寬度 800px，JPEG 格式品質 0.6），有效節省網路頻寬與雲端硬碟容量。
*   **後端自動化與排版**：GAS 端接收到數據後，自動根據模式（AI / Stock）渲染底色，進行關鍵字情緒分析加粗，並在 Sheets 自動產生 Hyperlink 關聯 Google Drive 截圖。

### **3.2 未來開發路線圖 (Roadmap)**
*   **遠端選擇器配置機制 (Remote Selector Config)**：
    *   *目標*：將 DOM 抓取選擇器定義為遠端託管的 JSON 檔案（如 Github Gist），外掛啟動時非同步讀取。
    *   *效益*：若 Google 更改 Class 結構，只需修改線上 JSON 即可「熱修復」，免除重複打包送審上架。
*   **部落格生態系雙向同步 (Auto Pulse Publish)**：
    *   *目標*：開發 `scratch/util_sync_sheets_to_pulse.py`，定期讀取 Sheets 中 `Status = "Pending"` 的投研資料，並透過 `util_pulse_publish.py` 將其發布為部落格 Pulse (市場瞬息) 網頁。
    *   *效益*：打通「一鍵擷取 -> Sheets 整理 -> 自動發布部落格 Pulse」的極致自動化管線。
*   **知識庫沉澱機制 (Knowledge Cards)**：
    *   *目標*：在 UI 中提供「儲存為知識卡片」選項，當勾選時 GAS 後端打上 Tag，部落格腳本抓取並整合至 `tech-data-architecture.md` 長期知識庫。
*   **鍵盤快捷操作 (UX Enhancements)**：
    *   *目標*：支援 `Ctrl+Enter` 快速傳送，並支援鍵盤 `Tab` 順暢切換欄位，提升使用效率。

---

## **4. 關鍵技術與安全機制 (Technical & Security Highlights)**

### **4.1 CORS 跨域資源共享限制突破**
在 Extension 中，向外部 Google Apps Script Web App 發送 POST 請求常因跨來源限制被阻擋。本系統透過以下技術解決：
1.  **Host Permissions**：在 `manifest.json` 中明確宣告 `https://script.google.com/*` 與 `https://script.googleusercontent.com/*`，免除大部分跨來源檢查。
2.  **`text/plain` 避開 Preflight**：使用 `Content-Type: text/plain;charset=utf-8`。因為 `application/json` 會觸發預檢請求 (OPTIONS)，而 GAS 對 OPTIONS 支援不佳會導致阻擋。採用 `text/plain` 則會被瀏覽器判定為「簡單請求 (Simple Request)」，跳過預檢。
3.  **`redirect: "follow"` 追蹤重導向**：GAS 寫入資料後會利用 HTTP 302 重導向至臨時 Google 伺服器，此配置確保 Fetch API 正確跟隨取得最後 Response。

### **4.2 孤立世界 (Isolated World) 沙盒注入**
動態注入的 `scrapeFinanceData` 臨時 Content Script 運行於 Isolated World 沙盒：
*   它可以讀取與修改當前頁面的 DOM。
*   但它無法存取網頁本身原有的 JavaScript 變數或全域函數，有效防範惡意網頁利用外掛特權進行跨站腳本攻擊 (XSS)。

### **4.3 高容錯多重回退擷取策略 (Fallback Strategy)**
Google Finance 的 Class 常因改版而混淆或更新。外掛採用多重防護抓取邏輯：
*   **Ticker/股價抓取**：優先讀取自定義屬性 `data-ticker-id` / `data-last-price`；失效時自動降級 (Fallback) 透過網址 pathname 正則解析與多個常用顯示股價的 Class（如 `.YMlKvd`, `.fxKb7e`）進行篩選。
*   **AI 面板對話解析**：遍歷包含使用者問答 (`jsname="Ldp1ib"`) 與 AI 分析 (`jsname="lKYlId"`) 的區塊，進行 Markdown 表格化轉換與清洗。

---

## **5. 測試、除錯與常見故障排除 (Troubleshooting & Debugging)**

### **5.1 本地端 Debug 流程**
1.  開啟 Chrome 並進入 `chrome://extensions/`，開啟右上角「開發人員模式」。
2.  點擊「載入未封裝項目」，選擇 `tools/finance-research-clipper` 目錄。
3.  前往 [Google Finance](https://www.google.com/finance/) 股票頁面。
4.  在大盤或個股頁面上，對外掛圖示點擊**右鍵**，選擇「檢查彈出式視窗 (Inspect Popup)」。這會開啟 Popup 的專屬開發者工具，可在 Console 檢視 log、網路請求與錯誤堆疊。

### **5.2 常見問題對照表 (Troubleshooting)**

| 錯誤現象 | 可能原因 | 排除步驟 |
| :--- | :--- | :--- |
| **網頁數據讀取顯示為「未知價格」** | Google Finance 更新了網頁結構，原有的 HTML 屬性或 Class 已失效。 | 1. 檢查 Google Finance 網頁的 DOM 結構。 2. 必要時修改 `popup.js` 中的 `scrapeFinanceData` 選擇器。 |
| **出現 TypeError: Failed to fetch** | 1. Apps Script 部署 URL 輸入錯誤。<br>2. 網路連線中斷。<br>3. Apps Script 未給予所有人 (Anyone) 存取權限。 | 1. 點選設定（齒輪），確認輸入的 URL 正確無誤。<br>2. 檢查 GAS 專案的「管理部署作業」，確認「誰可以存取」設定為「所有人 (Anyone)」。 |
| **外掛按鈕被禁用且顯示橘/紅色提示** | 1. 未填寫 API URL。<br>2. 當前分頁非 `google.com/finance`。 | 1. 點選設定（齒輪）填入合法的 API URL 後儲存。<br>2. 確認網址列包含 `google.com/finance`，非搜尋結果頁。 |
