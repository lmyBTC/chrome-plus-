> [!NOTE]
> **任務實施狀態：已落地實作完成 (2026-09-17)**
> - 實體任務追蹤檔：[task_20260917_finance_research_clipper_spa_tab_crawler.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/tasks/task_20260917_finance_research_clipper_spa_tab_crawler.md)
> - 核心爬蟲模組：[crawler.js](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/finance-research-clipper-oss/crawler.js)
> - Popup 整合：[popup.html](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/finance-research-clipper-oss/popup.html)、[popup.js](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/finance-research-clipper-oss/popup.js)

__________________________________________

# Finance Research Clipper (Open-Source Version)

一個輕量、安全且隱私友好的 Chrome 瀏覽器擴充功能。幫助您在瀏覽 Google Finance 時，一鍵擷取股票數據、財務指標與個人筆記，並自動同步至您個人的 Google Sheets 雲端試算表。

此版本為**開源上架版本**，已徹底去識別化，無硬編碼任何個人敏感試算表 ID 或伺服器位址，完全採用本地 `chrome.storage.local` 進行參數化儲存。

---

## 🌟 主要功能

- 📈 **一鍵擷取個股數據**：自動偵測並擷取當前 Google Finance 股票頁面的標的 (Ticker)、目前價格 (Price)、市值、本益比、當日高低範圍、52 週高低範圍。
- 🤖 **AI 對話擷取**：整合 Google Finance Beta 版「研究面板」，可勾選並擷取與 AI 的對話段落。
- 🧹 **智能文字清理**：內建規則引擎，自動過濾常見的 AI 免責聲明與開場白。
- 📊 **表格化輸出**：自動將條列式的數據轉化為 Markdown 表格。
- 📸 **圖表截圖**：支援在個股模式下，自動擷取並等比例壓縮當前畫面，一併同步至雲端。
- ⬇️ **本地導出**：支援將擷取的內容一鍵下載為 Markdown (`.md`) 或 CSV 檔案。

---

## 🛠️ 安裝說明

1. 下載本專案並解壓縮。
2. 開啟 Chrome 瀏覽器，進入 `chrome://extensions/` (擴充功能管理頁面)。
3. 開啟右上角的「**開發人員模式**」。
4. 點擊左上角的「**載入未封裝項目**」，並選擇本專案資料夾。
5. 安裝完成後，建議將「Finance Research Clipper」固定在瀏覽器工具列。

---

## ⚙️ 快速設定指南

為了讓數據能夠同步至您的 Google Sheets，您需要先佈署一個簡單的 Google Apps Script (GAS) 作為 API 中繼站。

1. **建立試算表**：在您的 Google Drive 建立一個新的試算表，並新增一個名為 `Main` 的工作表。
2. **佈署 Google Apps Script**：
   - 點擊試算表選單的 `延伸功能` -> `Apps Script`。
   - 將本專案中的 `docs/google-apps-script.md` 內提供的代碼複製貼入編輯器中。
   - 點擊右上角的「佈署」 -> 「新增佈署作業」。
   - 類型選擇「網頁應用程式」，並設定：
     - **執行身分**：您的 Google 帳戶 (Me)
     - **誰有權限存取**：任何人 (Anyone)
   - 完成佈署後，**複製產生的「網頁應用程式 URL」** (即 Web App URL)。
3. **設定插件**：
   - 點擊瀏覽器工具列中的本插件圖示。
   - 點擊右上角的齒輪圖示 ⚙️ 開啟設定面板。
   - 將剛才複製的 Web App URL 貼入「Google Apps Script URL」欄位。
   - (選填) 將您剛才建立的 Google Sheets 網址貼入「Google Sheets URL」欄位。
   - 點擊「儲存設定」即可。

---

## 🔒 隱私與安全說明

- 本插件**不會收集、傳輸或儲存您的任何個人數據至任何第三方伺服器**。
- 所有擷取到的數據皆只會透過您自己設定的 Google Apps Script URL 直接傳送至您個人的 Google Sheets 中。
- 請妥善保管您的 Google Apps Script URL，切勿外洩，因為任何擁有該 URL 的人都可以向您的試算表寫入數據。




_____________________________________________________


Google Finance Beta 的這四個分頁（Overview、Analysis、Earnings、Financials）屬於單頁應用（SPA）架構。點擊按鈕擷取時，最流暢的架構並非在背景偷偷用 fetch 下載 HTML（因為 SPA 的數據多靠 client-side 動態 render），而是在使用者開啟的當前頁籤中，透過腳本依序切換 Tab、監聽 DOM 渲染、逐一擷取文字，最後聚合輸出。

以下是為您的 Finance Research Clipper 擴充功能設計的爬取架構與 Content Script 實作方案。

架構執行流程
Popup 發起請求：使用者在任一 Google Finance 股票頁面點擊「完整抓取（4合1）」。

Tab 導航與等待：Content Script 讀取當前 Ticker URL，依序透過模擬點擊頁面上的 Tab 按鈕（或修改 window.location.hash / history.pushState 並觸發路由更新）依序走訪 overview -> analysis -> earnings -> financials。

語意解析與去雜訊：Google Finance 常用混淆 class（如 P22Vae 等隨機字串），因此選取器採用文字語意錨定（如尋找包含「Market cap」、「PE ratio」、「Income Statement」等標籤的父層容器）。

輸出聚合：整合成單一結構化 JSON / Markdown，打包傳送至現有的 Google Apps Script Webhook 或匯出本地檔案。

Content Script 核心實作腳本
建議在專案中新增或擴充 crawler.js（作為 Content Script 注入）：

JavaScript
/**
 * Google Finance Beta 數據爬取模組
 */

// 輔助函式：等待特定條件或元素出現
function waitForSelector(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        resolve(null); // 超時回傳 null，避免阻塞流程
      }
    }, 200);
  });
}

// 輔助函式：文字休眠
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 1. 抓取 Overview 分頁數據
function scrapeOverview() {
  const data = { tab: 'overview', stats: {} };
  
  // 標的名稱與即時價格
  data.symbol = document.querySelector('[data-symbol]')?.getAttribute('data-symbol') || 
                document.querySelector('h1')?.innerText?.trim() || '';
  
  // 價格通常在大字體 display 元素中
  const priceContainer = document.querySelector('[data-last-price]');
  data.price = priceContainer ? priceContainer.getAttribute('data-last-price') : 
               document.querySelector('div[class*="price"], span[class*="price"]')?.innerText?.trim() || '';

  // 抓取 Key Stats 鍵值對（例如 市值、PE、高低範圍）
  // 尋找包含常見指標標籤的區塊
  const allLabels = Array.from(document.querySelectorAll('div, span'))
    .filter(el => /Market cap|P\/E ratio|Avg Volume|High|Low|52-wk/i.test(el.innerText) && el.children.length === 0);

  allLabels.forEach(labelEl => {
    const label = labelEl.innerText.trim();
    // 通常 value 是相鄰 sibling 或父層的第二個 child
    const parent = labelEl.parentElement;
    if (parent) {
      const valEl = Array.from(parent.children).find(child => child !== labelEl);
      if (valEl) {
        data.stats[label] = valEl.innerText.trim();
      }
    }
  });

  return data;
}

// 2. 抓取 Analysis 分頁數據
function scrapeAnalysis() {
  const data = { tab: 'analysis', analystRatings: {}, targetPrice: {} };

  // 尋找分析師目標價區間與評級文字
  const textBlocks = Array.from(document.querySelectorAll('div, section'))
    .map(el => el.innerText.trim())
    .filter(t => t.length > 0);

  // 擷取目標價與評級總結區塊
  const targetSection = textBlocks.find(t => /Target price|Analyst rating|Buy|Hold|Sell/i.test(t));
  data.rawAnalysisSummary = targetSection ? targetSection.slice(0, 1000) : '';

  return data;
}

// 3. 抓取 Earnings 分頁數據
function scrapeEarnings() {
  const data = { tab: 'earnings', history: [] };

  // 尋找財報表格或 EPS 歷史數據
  const tables = document.querySelectorAll('table');
  if (tables.length > 0) {
    tables.forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
        Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim())
      );
      data.history.push(rows);
    });
  } else {
    // 若使用 SVG 圖表呈現，擷取圖表旁的輔助說明與數據清單
    const statContainers = document.querySelectorAll('[role="region"], section');
    statContainers.forEach(c => {
      if (/EPS|Revenue|Surprise/i.test(c.innerText)) {
        data.history.push(c.innerText.trim());
      }
    });
  }

  return data;
}

// 4. 抓取 Financials 分頁數據
function scrapeFinancials() {
  const data = { tab: 'financials', statements: [] };

  // 尋找 Income Statement, Balance Sheet, Cash Flow 區塊
  const tables = document.querySelectorAll('table');
  tables.forEach(tbl => {
    const rows = Array.from(tbl.querySelectorAll('tr')).map(tr => 
      Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim())
    );
    data.statements.push(rows);
  });

  return data;
}

// 主調度器：依序切換 Tab 並收集全部數據
async function runFullStockScraper(onProgress) {
  const results = {};
  const tabs = [
    { name: 'overview', fn: scrapeOverview },
    { name: 'analysis', fn: scrapeAnalysis },
    { name: 'earnings', fn: scrapeEarnings },
    { name: 'financials', fn: scrapeFinancials }
  ];

  for (const tab of tabs) {
    if (onProgress) onProgress(`正在爬取 ${tab.name}...`);

    // 尋找對應的頁籤按鈕並點擊
    const tabButton = Array.from(document.querySelectorAll('[role="tab"], button, a'))
      .find(el => new RegExp(`^${tab.name}$`, 'i').test(el.innerText.trim()) || 
                  el.href?.includes(`tab=${tab.name}`));

    if (tabButton) {
      tabButton.click();
      await sleep(1500); // 等待 SPA 動態載入資料
    } else {
      // 若按鈕未直接顯示，採用修改 URL Hash / Query 的備案
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', tab.name);
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
      await sleep(2000);
    }

    results[tab.name] = tab.fn();
  }

  if (onProgress) onProgress('全部數據爬取完成！');
  return results;
}
將爬取數據轉化為 Markdown 表格
為了符合擴充功能現有的導出格式，可在取得 results 後加入轉換器：

JavaScript
function formatToMarkdown(results) {
  let md = `# Stock Report: ${results.overview?.symbol || 'Unknown'}\n`;
  md += `**Current Price:** ${results.overview?.price || 'N/A'}\n\n`;

  // Key Stats 表格
  md += `## Key Overview Stats\n\n`;
  md += `| 指標 | 數值 |\n|---|---|\n`;
  if (results.overview?.stats) {
    for (const [k, v] of Object.entries(results.overview.stats)) {
      md += `| ${k} | ${v} |\n`;
    }
  }
  md += `\n`;

  // Analysis
  md += `## Analyst Consensus & Targets\n\n`;
  md += `\`\`\`\n${results.analysis?.rawAnalysisSummary || '無分析資料'}\n\`\`\`\n\n`;

  // Financials
  md += `## Financials Overview\n\n`;
  if (results.financials?.statements?.length) {
    results.financials.statements.forEach((tableRows) => {
      tableRows.forEach((row, idx) => {
        md += `| ${row.join(' | ')} |\n`;
        if (idx === 0) md += `| ${row.map(() => '---').join(' | ')} |\n`;
      });
      md += `\n`;
    });
  }

  return md;
}
擴充功能整合建議
Popup UI 新增快捷鍵：在現有 UI 上增加一個「一鍵抓取 4 大分頁」開關。點擊時透過 chrome.tabs.sendMessage 通知 content script 執行 runFullStockScraper。

Google Apps Script 欄位映射：原本的 Webhook 若只吃單行字串，可將產生的 Markdown 直接放進 notes 欄位；若要分欄，可將 stats['Market cap']、stats['P/E ratio'] 直接拆解為專屬 payload 屬性傳入。