# Chrome 插件 Agent 開發與 Token 優化指南 (Chrome Extension Agent Optimization Guide)

本文件整理了在開發 Chrome 插件（使用 Manifest V3）時的共同注意事項，並針對 LLM Agent 提供可顯著提高開發效率、防範安全漏洞以及降低 Token 消耗的實用技術與開發規範。

---

## 1. Chrome 插件開發共同注意事項 (MV3 核心規範)

在進行插件開發（如 `chrome_scrumclock`、`chrome_video speed plus`、`finance-research-clipper-oss`、`browser-activity-monitor`）時，必須遵守以下 Manifest V3 規範：

### 1.1. Service Worker 生命週期與狀態儲存
* **非持續性背景腳本 (Non-persistent Background)**：MV3 中的 Background 以 Service Worker 運作，這意味著它在閒置時會自動休眠，並在事件觸發時重啟。
* **狀態持久化限制**：**嚴禁在 Service Worker 的全域變數中儲存運行時資料**（例如：`let cachedData = {}`），因為該狀態隨時可能隨 Service Worker 被釋放而遺失。所有需要持久化的配置、快取或使用者狀態，必須使用 `chrome.storage.local` 或 `chrome.storage.sync` 存取。
* **同步事件註冊**：所有事件監聽器（例如 `chrome.runtime.onMessage.addListener`）必須在腳本的**最外層同步註冊**。切勿將監聽器寫在非同步函式（如 `chrome.storage.local.get` 的回傳函式）內，以防 Service Worker 重啟時無法及時綁定事件監聽。

### 1.2. 前端注入與 Shadow DOM 樣式隔離
* **樣式衝突防範**：Content Script 在宿主網頁（Host Page）插入 UI（如面板、選單）時，為避免宿主網頁與插件之間的 CSS 互相污染，**必須**使用 Shadow DOM 進行樣式與 DOM 的隔離。
* **DOM 操作建議**：
  ```javascript
  const host = document.createElement('div');
  host.id = 'my-plugin-root';
  document.body.appendChild(host);
  
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  container.className = 'my-container';
  // 注入樣式與結構至 shadowRoot 中
  shadowRoot.appendChild(container);
  ```

### 1.3. 異步訊息傳遞機制 (Asynchronous Messaging)
* **訊息通道生命週期**：在 `chrome.runtime.onMessage` 中，如果需要執行異步回傳（例如發送網路 fetch 請求或讀取資料庫後回傳 `sendResponse`），**必須在監聽器內明確 `return true;`**。否則訊息通道會被立即關閉，導致發送端拋出 `channel closed before a response was received` 錯誤。

### 1.4. Web Store 審查安全合規 (CSP)
* **禁止動態執行程式碼**：禁止使用 `eval()`、`new Function()` 或傳遞字串到 `setTimeout()`。
* **禁止外部腳本載入**：所有程式碼必須存在於本機套件包中，嚴禁載入遠端託管的 `.js` 檔。
* **XSS 安全防禦**：使用 `textContent` 進行 DOM 資料寫入，或在寫入 `innerHTML` 前使用 DOMPurify 等套件進行消毒。

---

## 2. 適合 Agent 提升效率與節省 Token 的優化技術

LLM Agent 在執行開發與除錯時，可以採用以下幾點技術來減少 Token 消耗並避免資訊冗餘：

### 2.1. 局部程式碼檢索與增量編輯
* **減少完整檔案讀取**：對大型 Content Scripts 或 Background Service Workers（如數百行以上的程式碼），Agent 不應每次都完整讀取檔案。
* **技巧**：
  * 先使用 `grep_search` 定位目標函數或監聽器名稱。
  * 利用 `view_file` 的 `StartLine` 與 `EndLine` 參數，僅讀取該函數所在的局部行數區間（例如只讀取 `150` 到 `210` 行）。
  * 修改時使用 `replace_file_content` 或 `multi_replace_file_content` 精準修改對應區間，不重寫整個大檔案。

### 2.2. 終端機 Verbose 輸出的過濾與壓縮 (RTK 包裝)
* **減少無用日誌**：執行 `npm run build`、`tsc` 或 `eslint` 時，終端機會產生大量非結構化、重複的日誌與警告資訊，浪費 Token。
* **技巧**：
  * 優先使用 RTK Token Saver 工具（即 `.agents/skills/token-saver/SKILL.md` 指導的 `rtk <command>`），自動在底層過濾重複的日誌，只提取關鍵錯誤與編譯結果。
  * 對於測試報告，使用過濾參數（如 `jest --silent` 或 `eslint --quiet`）以避免輸出大量無關通過的測試細節。

### 2.3. 自動化審計工具的整合 (Static Compliance Check)
* **快速健康診斷**：與其讓 Agent 通讀所有代碼尋找安全漏洞與路徑拼寫錯誤，不如執行自動化靜態檢查指令（如 `python 1.devtools/tools/audit_manifests.py`）。
* **技巧**：
  * 每次修改 Manifest 或程式碼後，由 Agent 主動執行此工具，直接取得包含安全警示的結構化摘要報告，從而免除漫長的手動檢查流程。

### 2.4. 對話狀態動態收斂 (Dynamic Condensation)
* **防範長對話 Context 爆炸**：當任務進入多個階段且對話變得非常長時，Agent 應主動在 `task.md` 中對「已完成的 Phase」進行狀態收斂，將細節合併為一行簡潔的摘要，並在下一輪對話中清理不必要的暫存變數。
