# Chrome 插件開發與技術規範 (Chrome Extension Development Standards)

> [!IMPORTANT]
> **SSOT (Single Source of Truth) 技術規範**：本文件為此「多插件開發區」的網頁與插件開發最高指導原則。所有插件的開發、重構與功能新增皆必須遵循此規範。

---

## 1. 專案技術棧與結構說明

本工作區包含三個獨立的 Chrome 插件，其開發模式分為**編譯型**與**原生零建置型**：

| 插件專案目錄 | 技術棧 | 類型 | 核心檔案與入口 |
| :--- | :--- | :--- | :--- |
| **`chrome_scrumclock`** | Vite, TS, TailwindCSS, PostCSS | 編譯型 (Build required) | `src/`, `vite.config.ts`, `manifest.json` -> 輸出至 `dist/` |
| **`chrome_video speed plus`** | Vanilla HTML / CSS / JS | 原生零建置 (Zero-Build) | `manifest.json`, `popup.html`, `popup.js`, `content.js` |
| **`finance-research-clipper-oss`** | Vanilla HTML / CSS / JS | 原生零建置 (Zero-Build) | `manifest.json`, `popup.html`, `popup.js`, `background.js` |

---

## 2. Manifest V3 核心規範 (MV3 Compliance)

所有插件必須符合 Google Chrome Extension Manifest V3 規範：

### 2.1. Service Worker 生命週期
- Background 腳本在 MV3 中以 Service Worker 運行，為**非持續性 (Non-persistent)**。
- **嚴禁在全域變數中儲存運行時狀態**，因為 Service Worker 會隨時被系統休眠。
- 所有持久化狀態必須寫入 `chrome.storage.local` 或 `chrome.storage.sync`。
- 事件監聽器 (例如 `chrome.runtime.onInstalled.addListener`、`chrome.onMessage.addListener`) 必須在腳本的最上層同步註冊，確保在 Service Worker 被喚醒時能立即接收事件。

### 2.2. 權限最小化原則 (Least Privilege)
- 僅在 `manifest.json` 中宣告必要的 permissions (例如 `storage`, `activeTab`)。
- 主機存取權限 (host permissions) 應僅限於需要的網域，避免使用萬用字元 `*://*/*` 或 `<all_urls>`，除非該插件為通用工具且有明確需求。

---

## 3. 前端注入與樣式隔離 (Content Script & Shadow DOM)

當 Content Script 需要在外部宿主網頁 (Host Page) 插入 UI 元素時，為避免宿主網頁與插件之間的 CSS 互相污染，**必須**使用 Shadow DOM 進行隔離：

### 3.1. Shadow DOM 隔離實作範本
```javascript
// 1. 建立外層容器，掛載於 host page DOM 中
const hostDiv = document.createElement('div');
hostDiv.id = 'my-extension-root';
document.body.appendChild(hostDiv);

// 2. 建立 Shadow Root (使用 closed 或 open，通常 open 即可)
const shadowRoot = hostDiv.attachShadow({ mode: 'open' });

// 3. 注入 CSS (可使用 CSSStyleSheet 或建立 <style> 標籤)
const style = document.createElement('style');
style.textContent = `
  :host {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000000;
  }
  .panel {
    background: #ffffff;
    border: 1px solid #ccc;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
    padding: 16px;
  }
`;
shadowRoot.appendChild(style);

// 4. 注入 HTML 結構
const panel = document.createElement('div');
panel.className = 'panel';
panel.innerHTML = `<h3>插件面板</h3><button id="btn">點擊</button>`;
shadowRoot.appendChild(panel);

// 5. 事件監聽 (必須在 shadowRoot 內進行查詢)
shadowRoot.getElementById('btn').addEventListener('click', () => {
  console.log('Shadow DOM Button Clicked!');
});
```

### 3.2. 樣式防禦原則
- **禁止**直接向宿主網頁的 `document.head` 注入全域樣式表，這會破壞宿主網頁原本的樣式。
- 在編譯型項目 (`chrome_scrumclock`) 中，若使用 TailwindCSS，須確保將 Tailwind 樣式掛載到 shadow root 中，或在配置中指定正確的 prefix 或 isolation 範疇。

---

## 4. 訊息傳遞與非同步通訊 (Messaging)

### 4.1. 異步回應 (Async sendResponse)
在監聽 `chrome.runtime.onMessage` 時，如果需要非同步回傳 response (例如在回傳前呼叫了 `fetch` 或 `chrome.storage.local.get`)，**必須在監聽器內明確回傳 `true`**。否則通訊管道會立即關閉，導致傳送端拋出 `channel closed before a response was received` 錯誤。

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchData') {
    // 執行異步操作
    fetch(message.url)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // [核心] 保持訊息通道開啟，支援非同步 sendResponse
  }
});
```

---

## 5. 資料存取與安全性 (Data & Storage)

- **Storage API**: 統一使用 `chrome.storage.local` 作為主要快取與配置存取媒介，其性能與非同步表現優於傳統的 `localStorage`。
- **XSS 防範**: 當 Content Script 或 Popup 接收到來自外部網站或 `chrome.storage` 的資料時，應使用 `textContent` 進行賦值，或使用 DOMPurify 進行消毒，**禁止**直接使用 `innerHTML` 渲染未經審查的資料。
- **編碼規範**: 所有程式碼檔案一律採用 **UTF-8 (無 BOM)** 編碼。嚴禁使用 Windows 系統預設的 ANSI 或帶有 UTF-8 BOM 的編碼，以防瀏覽器解析錯誤。

---

## 6. Chrome Web Store 上架合規與安全性禁忌 (Store Review Compliance & CSP)

為了確保插件能順利通過 Chrome Web Store 的自動與人工審查，必須嚴格遵守以下安全性與隱私政策：

### 6.1. 嚴禁動態代碼執行 (No Dynamic Code Execution)
- **禁止使用 `eval()`、`new Function()` 或 `setTimeout(string, ...)`**：這些方法會嘗試將字串解析為程式碼執行，違反 MV3 的預設 Content Security Policy (CSP)，在上架審查時會被直接拒絕。
- **禁止載入遠端腳本**：插件內所有要執行的 JS、CSS 或 HTML 必須以物理檔案包裝在套件中。嚴禁透過 `<script src="https://...">` 或 `import` 載入外部託管的動態代碼。

### 6.2. 最小權限原則與使用者聲明 (Least Privilege & Privacy)
- **Host Permissions 限制**：只在需要對特定主機進行攔截或通訊時宣告該網域權限。如果插件只需要在使用者點擊時操作當前頁面，應使用 `activeTab` 權限，而非 `*://*/*` 或 `<all_urls>`。
- **隱私權政策與說明**：如果插件收集或傳輸任何敏感的使用者資料（如瀏覽歷史、個人憑證），必須在開發者後台提供隱私權政策，且資料傳輸必須使用 HTTPS 加密。

### 6.3. 常見 CSP 宣告規範
在 `manifest.json` 中配置 CSP 時，應使用 MV3 支援的物件格式。若無特殊需求，請勿放寬 CSP 限制：
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```
*註：MV3 不支援在 `extension_pages` 中加入 `'unsafe-eval'`，任何此類配置都會導致 Chrome 載入或上架失敗。*

---

## 7. 開發與測試 SOP

1. **Vite 專案開發 (`chrome_scrumclock`)**:
   - 終端機執行 `npm run dev` 啟動開發伺服器。
   - 修改完成後，必須執行 `npm run build` 生成 `dist/` 目錄。
   - 在 Chrome 瀏覽器 `chrome://extensions/` 頁面，點擊「載入未封裝擴充功能」，選取 `dist/` 目錄載入插件。
2. **原生專案開發**:
   - 直接在 `chrome://extensions/` 載入插件的根目錄 (例如 `chrome_video speed plus` 或 `finance-research-clipper-oss`)。
   - 修改 `manifest.json` 或 background 腳本後，**必須**在擴充功能管理頁面點擊「重新整理」圖示以套用變更。
