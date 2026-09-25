# Chrome 瀏覽器行為與資源監控插件：系統架構與功能規劃指南

本規劃旨在設計一款能夠即時檢視 **「誰（哪個網頁/哪個擴充功能）正在存取什麼（權限/行為/網路請求/下載/上傳）」** 的 Chrome 擴充功能（基於 Manifest V3）。

---

## 1. 核心監控維度與功能劃分

為了釐清瀏覽器內的各種行為，建議將監控功能拆解為四大模組：

| 模組名稱 | 監控目標（誰在做什麼） | 關鍵偵測指標 |
| :--- | :--- | :--- |
| **網路流量與傳輸 (Network & I/O)** | 哪個網頁正在發送 API、上傳檔案、下載資料 | 請求發起端 (Initiator)、目標 URL、傳輸方向 (Upload/Download)、大小、狀態碼 |
| **分頁與頁面生命週期 (Tabs & Pages)** | 當前開啟了哪些頁面、背景分頁是否活躍 | 分頁狀態 (Active/Audible/Muted)、記憶體佔用、URL 與標題、執行腳本 |
| **檔案傳輸 (Downloads)** | 哪個頁面觸發了下載、檔案存放與進度 | 下載發起源、MIME 類型、檔案大小、危險警示 (Danger flag) |
| **權限與生態系 (Permissions & Extensions)** | 頁面或其它擴充功能申請與佔用了哪些系統權限 | 麥克風/攝影機使用狀態、地理位置、通知、擴充功能清單與權限 |

---

## 2. 核心技術與 Chrome API 對應

在 Manifest V3 (MV3) 架構下，各項監控功能對應的核心 API 如下：

### 2.1 網路活動與資料上傳/下載 (declarativeNetRequest vs webRequest)
- **`chrome.webRequest` (只讀監控模式)**：
  - 需宣告權限：`"webRequest"`
  - 監控事件：
    - `onBeforeRequest`：取得請求的 URL、`initiator`（由哪個網頁發起）、請求類型（`xmlhttprequest`, `fetch`, `script`, `image` 等）。
    - 取得請求主體中的上傳數據 (`requestBody`，需配合 `"webRequest"` 權限與 Host Permissions)。
    - `onCompleted` / `onErrorOccurred`：統計流量大小與完成狀態。
  - *注意：若只做觀察記錄而不攔截/修改，不需要使用 blocking 模式，符合 Web Store 審查安全原則。*

### 2.2 檔案下載監控
- **`chrome.downloads`**：
  - 監控事件：`chrome.downloads.onCreated`, `chrome.downloads.onChanged`
  - 關鍵屬性：
    - `item.referrer`：發起下載的來源網頁。
    - `item.url`：實際下載鏈結。
    - `item.totalBytes` / `item.bytesReceived`：傳輸體積。
    - `item.danger`：是否為潛在惡意檔案。

### 2.3 網頁行為與硬體/敏感狀態
- **`chrome.tabs`**：
  - 監控事件：`onCreated`, `onUpdated`, `onRemoved`, `onActivated`
  - 敏感狀態屬性：
    - `tab.audible`：是否正在播放聲音（判斷背景偷跑媒體）。
    - `tab.mutedInfo`：靜音狀態。
    - `tab.discarded`：分頁是否因記憶體不足被凍結。
- **媒體串流/硬體佔用 (攝影機/麥克風)**：
  - 目前 Chrome 原生只在分頁標題提示「錄音/錄影中」，擴充功能層級可透過 Content Script 監聽或代理 `navigator.mediaDevices.getUserMedia` 來捕獲頁面是否在調用麥克風/鏡頭。

### 2.4 其他擴充功能與權限檢視 (生態系審計)
- **`chrome.management`**：
  - 需宣告權限：`"management"`
  - 功能：
    - `chrome.management.getAll()`：枚舉目前瀏覽器安裝的所有擴充功能與應用程式。
    - 取得每個 Extension 的 `permissions`（如 `<all_urls>`, `cookies`, `storage`, `tabs` 等），評估各插件的潛在隱私風險。

---

## 3. 系統架構設計 (Manifest V3)

```
[ 監控核心 (Background Service Worker) ]
   ├── 註冊各類 API Listener (webRequest, tabs, downloads)
   ├── 彙整即時事件至 In-Memory 佇列或 IndexedDB
   └── 處理統計分析（如：每分頁流量、高風險權限警告）
          │
          ├── 傳輸即時事件 (chrome.runtime.sendMessage)
          ▼
[ 前端展示層 (UI Layer) ]
   ├── Popup (點擊圖標顯示快速面板：當前分頁的即時行為)
   ├── Side Panel / Dashboard (獨立儀表板：完整歷史、網路瀑布流、權限矩陣)
   └── Content Scripts (注入特定頁面，檢測 DOM 操作或 API 劫持，如 Geolocation)
```

---

## 4. `manifest.json` 配置範例

```json
{
  "manifest_version": 3,
  "name": "Browser Activity & Privacy Inspector",
  "version": "1.0.0",
  "description": "即時監控瀏覽器網頁行為、網路流量、下載與系統權限存取。",
  "permissions": [
    "tabs",
    "webRequest",
    "downloads",
    "management",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "瀏覽器活動監控"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

---

## 5. 背景監聽程式邏輯範例 (`background.js`)

```javascript
// 1. 監聽網路請求與上傳/下載流向
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const isUpload = details.method === "POST" || details.method === "PUT";
    const logItem = {
      timestamp: Date.now(),
      tabId: details.tabId,
      initiator: details.initiator || "內部程序/擴充功能",
      targetUrl: details.url,
      type: details.type,
      method: details.method,
      hasUploadData: Boolean(details.requestBody),
      category: isUpload ? "上傳/送出資料" : "讀取/請求資源"
    };

    // 將事件存入暫存或廣播至 UI
    broadcastEvent("NETWORK_EVENT", logItem);
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// 2. 監聽下載行為
chrome.downloads.onCreated.addListener((downloadItem) => {
  const logItem = {
    timestamp: Date.now(),
    sourceUrl: downloadItem.referrer,
    fileUrl: downloadItem.url,
    filename: downloadItem.filename,
    mime: downloadItem.mime,
    fileSize: downloadItem.totalBytes
  };
  broadcastEvent("DOWNLOAD_EVENT", logItem);
});

// 3. 廣播函式 (通知 Popup 或 Side Panel)
function broadcastEvent(type, payload) {
  chrome.runtime.sendMessage({ type, payload }).catch(() => {
    // UI 面板未開啟時忽略錯誤
  });
}
```

---

## 6. 技術挑戰與限制評估

1. **Service Worker 生命週期限制 (MV3)**：
   - Background Service Worker 在無事件處理一段時間後會自動休眠。
   - **解法**：不應依賴全域 JavaScript 變數儲存長時間歷史，建議使用 `IndexedDB` 儲存日誌；定時聚合任務可使用 `chrome.alarms`。
2. **深入的頁面 API 監控 (如 Geolocation, Clipboard, Camera)**：
   - 擴充功能無法直接透過瀏覽器頂層 API 得知特定網頁是否正在呼叫 `navigator.geolocation`。
   - **解法**：需要在 `content_scripts` 中注入代碼到網頁上下文（`world: "MAIN"`），包裝（Monkey Patch）瀏覽器原生 API，再透過 `window.postMessage` 回傳給擴充功能。
3. **Chrome Web Store 審查門檻**：
   - 申請 `<all_urls>` 與 `webRequest` 屬於高敏感權限組合。
   - **解法**：在商店提交時必須明確說明「單純用於本地隱私檢測與視覺化，不外傳任何資料」，並附上嚴格的隱私權政策。
```

這份規劃書涵蓋了功能範疇、底層 API 對應、架構流向以及 MV3 規範下的實現限制。你可以先從「網路流量發起源 (`initiator`)」與「下載追蹤」這兩個核心功能開始實作雛型。如果有特定的行為（例如想知道網頁有沒有偷讀剪貼簿或存取鏡頭）想要深入探討，我們可以進一步針對該功能撰寫 Content Script 注入方案！