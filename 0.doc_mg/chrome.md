# Chrome 瀏覽器行為監控插件：混合式 (Hybrid) 架構實作指南

本架構採用 **「80% 原生常駐監控 + 20% 隨選動態注入」** 的混合設計模式：

- **常駐層 (Always-on Native)**：由 Background Service Worker 負責，僅使用 Chrome 原生 API (`webRequest`, `downloads`, `contentSettings`, `tabs`) 監控網路流量、下載事件與權限設定，保證零 DOM 衝突與極低系統能耗。
- **隨選深入層 (On-Demand Deep Inspection)**：當使用者在 Side Panel 針對特定分頁手動開啟「深度行為追蹤」時，才動態使用 `chrome.scripting.executeScript` 注入雙層 API 探針，即時監控 `getUserMedia`、`geolocation` 與 `clipboard` 呼叫。

---

## 1. 專案目錄結構

```text
browser-activity-monitor/
├── manifest.json
├── background.js
├── scripts/
│   ├── probe-main.js       # 運行於 MAIN world，代理原生敏感 API
│   ├── probe-isolated.js   # 運行於 ISOLATED world，安全轉發訊息至 Background
│   └── storage-db.js       # IndexedDB 持久化與過期日誌清理模組
├── sidepanel/
│   ├── sidepanel.html      # 側邊欄 UI
│   └── sidepanel.js        # Port 連線、權限審查與事件渲染
└── icons/
    └── icon128.png
```

---

## 2. manifest.json 配置

```json
{
  "manifest_version": 3,
  "name": "Browser Activity Hybrid Monitor",
  "version": "1.0.0",
  "description": "原生流量審查與隨選深層行為監控擴充功能",
  "permissions": [
    "tabs",
    "webRequest",
    "downloads",
    "contentSettings",
    "scripting",
    "sidePanel",
    "alarms"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  }
}
```

---

## 3. 背景核心服務 (background.js)

Background 負責收集原生事件、維護 Side Panel 的長連接（Port）、持久化事件日誌，並在使用者觸發時動態注入探針。

```javascript
// background.js
import { AuditStorageDB } from './scripts/storage-db.js';

const storageDB = new AuditStorageDB();

// 儲存已連線的 UI Ports (例如 SidePanel)
const activePorts = new Set();
const inspectedTabs = new Set(); // 記錄哪些 Tab 已啟用深度探針

// 1. 維護與 Side Panel 的 Port 連線
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'monitor-stream') return;
  activePorts.add(port);

  port.onMessage.addListener(async (msg) => {
    if (msg.action === 'ENABLE_DEEP_INSPECTION') {
      await injectDeepInspector(msg.tabId);
      port.postMessage({ type: 'STATUS', message: `Tab ${msg.tabId} 深度探針已啟動` });
    } else if (msg.action === 'GET_CONTENT_SETTINGS') {
      const settings = await auditOriginSettings(msg.origin);
      port.postMessage({ type: 'CONTENT_SETTINGS_RESULT', data: settings });
    }
  });

  port.onDisconnect.addListener(() => {
    activePorts.delete(port);
  });
});

// 廣播事件至所有連線中的 UI 並批次持久化
function broadcast(type, payload) {
  const item = { type, payload, timestamp: Date.now() };

  for (const port of activePorts) {
    try {
      port.postMessage(item);
    } catch {
      activePorts.delete(port);
    }
  }

  // 異步寫入 IndexedDB
  storageDB.batchInsert([item]).catch(console.error);
}

// 2. 原生監控：網路請求 (唯讀模式)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.startsWith('chrome-extension://')) return;

    broadcast('NETWORK_REQUEST', {
      tabId: details.tabId,
      initiator: details.initiator || '內部/其他',
      url: details.url,
      method: details.method,
      type: details.type,
      hasUploadBody: Boolean(details.requestBody)
    });
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// 3. 原生監控：檔案下載
chrome.downloads.onCreated.addListener((item) => {
  broadcast('DOWNLOAD_CREATED', {
    id: item.id,
    referrer: item.referrer,
    url: item.url,
    filename: item.filename,
    fileSize: item.totalBytes
  });
});

// 4. 原生審查：Content Settings 批次查詢
async function auditOriginSettings(origin) {
  if (!origin.startsWith('http')) return [];
  const originPattern = origin + '/*';
  const permissions = ['camera', 'microphone', 'location', 'notifications', 'clipboard'];

  const results = await Promise.all(
    permissions.map(async (perm) => {
      try {
        const res = await chrome.contentSettings[perm].get({ primaryUrl: originPattern });
        return { permission: perm, setting: res.setting };
      } catch {
        return { permission: perm, setting: 'unsupported' };
      }
    })
  );
  return results;
}

// 5. 隨選動態注入深度探針 (需使用者主動開啟才執行)
async function injectDeepInspector(tabId) {
  if (inspectedTabs.has(tabId)) return;

  try {
    // 注入 MAIN world 腳本以攔截原生 JS API
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/probe-main.js'],
      world: 'MAIN'
    });

    // 注入 ISOLATED world 腳本負責轉發訊息
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/probe-isolated.js'],
      world: 'ISOLATED'
    });

    inspectedTabs.add(tabId);
  } catch (err) {
    console.error('動態探針注入失敗:', err);
  }
}

// 監聽來自 ISOLATED 腳本轉發的深層行為日誌
chrome.runtime.onMessage.addListener((message) => {
  if (message.source === '__INJECTED_PROBE__') {
    broadcast('SENSITIVE_API_CALL', message.payload);
  }
});

// 分頁關閉時釋放狀態
chrome.tabs.onRemoved.addListener((tabId) => {
  inspectedTabs.delete(tabId);
});

// 6. 註冊定時清理過期日誌任務 (Alarms)
chrome.alarms.create('PURGE_EXPIRED_LOGS', {
  periodInMinutes: 60 * 24 // 每 24 小時執行一次清理
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'PURGE_EXPIRED_LOGS') {
    await storageDB.purgeExpiredLogs(7 * 24 * 60 * 60 * 1000); // 清理 7 天前的舊紀錄
  }
});
```

---

## 4. 動態探針模組 (scripts/)

### 4.1 scripts/probe-main.js (運行於網頁原生 Context)

```javascript
// scripts/probe-main.js
(() => {
  if (window.__MONITOR_PROBE_INITIALIZED__) return;
  window.__MONITOR_PROBE_INITIALIZED__ = true;

  const emit = (category, detail) => {
    window.postMessage({
      source: '__PROBE_MAIN__',
      category,
      detail,
      timestamp: Date.now()
    }, '*');
  };

  // 1. 攔截相機 / 麥克風調用
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const rawGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (constraints) {
      emit('MEDIA_STREAM', { action: 'getUserMedia', constraints });
      return rawGUM(constraints);
    };
  }

  // 2. 攔截地理位置定位
  if (navigator.geolocation) {
    const rawPos = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = function (...args) {
      emit('GEOLOCATION', { action: 'getCurrentPosition' });
      return rawPos(...args);
    };
  }

  // 3. 攔截剪貼簿讀取
  if (navigator.clipboard && navigator.clipboard.readText) {
    const rawReadText = navigator.clipboard.readText.bind(navigator.clipboard);
    navigator.clipboard.readText = async function () {
      emit('CLIPBOARD', { action: 'readText' });
      return rawReadText();
    };
  }
})();
```

### 4.2 scripts/probe-isolated.js (運行於隔離 Context，安全傳輸)

```javascript
// scripts/probe-isolated.js
(() => {
  if (window.__MONITOR_RELAY_INITIALIZED__) return;
  window.__MONITOR_RELAY_INITIALIZED__ = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== '__PROBE_MAIN__') return;

    chrome.runtime.sendMessage({
      source: '__INJECTED_PROBE__',
      payload: event.data
    }).catch(() => {});
  });
})();
```

### 4.3 scripts/storage-db.js (IndexedDB 持久化與維護)

```javascript
// scripts/storage-db.js
export class AuditStorageDB {
  constructor(dbName = 'BrowserMonitorDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('tabId', 'tabId', { unique: false });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async batchInsert(items) {
    if (!items || items.length === 0) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['logs'], 'readwrite');
      const store = tx.objectStore('logs');
      for (const item of items) {
        store.add(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async purgeExpiredLogs(retentionMs = 7 * 24 * 60 * 60 * 1000) {
    const db = await this.open();
    const expireThreshold = Date.now() - retentionMs;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['logs'], 'readwrite');
      const store = tx.objectStore('logs');
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(expireThreshold);
      const req = index.openKeyCursor(range);

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

---

## 5. 前端面板實作 (sidepanel/)

### 5.1 sidepanel/sidepanel.html

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>即時行為與資源監控</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; font-size: 13px; color: #333; }
    h2 { font-size: 15px; margin: 0 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #ddd; }
    .section { margin-bottom: 16px; }
    .btn { background: #2563eb; color: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn:hover { background: #1d4ed8; }
    .log-container { height: 220px; overflow-y: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; font-family: monospace; font-size: 11px; }
    .log-item { margin-bottom: 4px; padding: 3px 6px; border-radius: 3px; }
    .type-NETWORK { background: #e0f2fe; color: #0369a1; }
    .type-SENSITIVE { background: #fee2e2; color: #b91c1c; font-weight: bold; }
    .type-DOWNLOAD { background: #fef3c7; color: #b45309; }
    .perm-badge { display: inline-block; padding: 2px 6px; margin: 2px; border-radius: 3px; font-size: 11px; background: #f1f5f9; }
    .perm-allow { background: #fee2e2; color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <h2>行為與資源監控面板</h2>

  <!-- 1. 原生權限檢測區 -->
  <div class="section">
    <strong>目前頁面原生權限：</strong>
    <div id="originPermissions" style="margin-top: 6px;">載入中...</div>
  </div>

  <!-- 2. 隨選深度監控開關 -->
  <div class="section">
    <button id="enableDeepAuditBtn" class="btn">啟用當前頁面深度行為追蹤</button>
    <span id="deepAuditStatus" style="font-size: 11px; color: #666; margin-left: 6px;">未啟用</span>
  </div>

  <!-- 3. 即時行為日誌瀑布流 -->
  <div class="section">
    <strong>即時事件流：</strong>
    <div id="eventLog" class="log-container"></div>
  </div>

  <script src="sidepanel.js"></script>
</body>
</html>
```

### 5.2 sidepanel/sidepanel.js

```javascript
// sidepanel/sidepanel.js
let port = null;
let currentTab = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // 連接至 Background
  port = chrome.runtime.connect({ name: 'monitor-stream' });
  port.onMessage.addListener(handleStreamMessage);

  // 1. 查詢原生 Content Settings
  if (currentTab?.url) {
    try {
      const origin = new URL(currentTab.url).origin;
      port.postMessage({ action: 'GET_CONTENT_SETTINGS', origin });
    } catch {
      document.getElementById('originPermissions').textContent = '內部頁面不支援權限審查';
    }
  }

  // 2. 綁定隨選注入按鈕
  document.getElementById('enableDeepAuditBtn').addEventListener('click', () => {
    if (!currentTab?.id) return;
    port.postMessage({ action: 'ENABLE_DEEP_INSPECTION', tabId: currentTab.id });
    document.getElementById('deepAuditStatus').textContent = '已啟用探針監聽';
    document.getElementById('enableDeepAuditBtn').disabled = true;
  });
}

function handleStreamMessage(msg) {
  const logEl = document.getElementById('eventLog');

  if (msg.type === 'CONTENT_SETTINGS_RESULT') {
    renderPermissions(msg.data);
    return;
  }

  const logItem = document.createElement('div');
  logItem.className = 'log-item';

  if (msg.type === 'NETWORK_REQUEST') {
    logItem.classList.add('type-NETWORK');
    logItem.textContent = `[網路] ${msg.payload.method} ${truncate(msg.payload.url, 40)}`;
  } else if (msg.type === 'DOWNLOAD_CREATED') {
    logItem.classList.add('type-DOWNLOAD');
    logItem.textContent = `[下載] 檔案: ${msg.payload.filename || '未知'}`;
  } else if (msg.type === 'SENSITIVE_API_CALL') {
    logItem.classList.add('type-SENSITIVE');
    logItem.textContent = `[警示: 敏感調用] ${msg.payload.category} -> ${msg.payload.detail.action}`;
  }

  if (logItem.textContent) {
    logEl.prepend(logItem);
  }
}

function renderPermissions(list) {
  const container = document.getElementById('originPermissions');
  container.innerHTML = '';

  list.forEach((item) => {
    const span = document.createElement('span');
    span.className = `perm-badge ${item.setting === 'allow' ? 'perm-allow' : ''}`;
    span.textContent = `${item.permission}: ${item.setting}`;
    container.appendChild(span);
  });
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

document.addEventListener('DOMContentLoaded', init);
```

---

## 6. 架構特性與優勢

這套混合方案具備以下核心特性：

1. **高效與節能**：預設僅依賴 Chrome 原生 API，平日瀏覽完全不注入任何腳本，大幅降低資源消耗。
2. **高上架相容性**：不強制在 `<all_urls>` 全局無腦執行 `world: MAIN` 注入，顯著降低 Chrome Web Store 審查被阻擋的機率。
3. **隨選深入捕捉**：透過 Side Panel 點擊時以 `chrome.scripting.executeScript` 動態注入探針，完整補足純原生 API 無法偵測即時 `getUserMedia` 與剪貼簿調用的盲區。

---

## 7. 原生 API vs. 注入攔截 (Monkey Patch) 核心權衡評估

### 7.1 方案維度對照表

| 評估維度 | 純原生 API 方案 (`contentSettings`, `webRequest`, `tabs`) | 注入攔截方案 (`world: MAIN` 劫持 `navigator` / `DOM`) | 混合方案 (原生主體 + 輕量注入) |
| :--- | :--- | :--- | :--- |
| **網頁相容性** | **極高**。完全不碰網頁 JavaScript 環境，零衝突。 | **極差**。容易與現代前端框架（React/Vue）、SPA 路由或防作弊腳本衝突。 | **良好**。核心走原生，僅特定 API 輕量掛鉤。 |
| **Web Store 審查** | **容易過審**。權限意圖明確，代碼靜態分析容易通過。 | **審查嚴苛**。注入 MAIN 腳本常被審核人員標記為潛在惡意腳本（XSS/代碼注入疑慮）。 | **可控**。只需在隱私說明中詳述該注入點的用途。 |
| **監控維度 (即時性)** | **只能看到設定值與宏觀狀態**。知道網頁「有權限開鏡頭」，但不知道「在第幾秒呼叫了 `getUserMedia()`」。 | **即時掌握呼叫瞬間**。能精確獲取調用參數、調用堆疊 (Call Stack) 與頻率。 | **兼具兩者優勢**。日常低耗監控，深入時即時捕獲。 |
| **系統效能開銷** | **低**。事件由瀏覽器底層 C++ 引擎處理，擴充功能只負責接收回呼。 | **高**。每個 Frame 都必須注入腳本，跨 Context 的 `postMessage` 帶來龐大序列化負擔。 | **中等**。僅在使用者要求時針對目標分頁注入。 |

### 7.2 純原生方案的 3 個致命「盲區」

1. **「被授權」不等於「正在使用」**：`chrome.contentSettings` 只能查詢網站狀態為 `allow`，但無法感知其是否正在背景啟用鏡頭或麥克風。原生 `chrome.tabs.onUpdated` 雖有 `audible` 狀態偵測音訊播放，但缺少 `usingCamera` 或 `usingMicrophone` 屬性。
2. **無法獲取剪貼簿讀取細節**：網頁呼叫 `navigator.clipboard.readText()` 時，純原生 API 無法感知，必須透過 Content Script 監聽或代理。
3. **無法溯源 DOM 動作**：網頁動態插入 `<script>` 挖礦、修改 Form 表單 action 偷轉發資料等 DOM 層行為，純原生 Background API 無法探測。

### 7.3 什麼情境下「純原生」絕對更好？

- **隱私儀表板 / 網站權限管家**：如「檢測這個網站有哪些權限，並提供一鍵封鎖」。純原生（`contentSettings` + `management`）寫法乾淨、省電、維護成本極低。
- **網路流量與下載分析**：如「統計分頁吃了多少流量、下載了什麼檔案」。純原生 `webRequest` 與 `downloads` 的穩定度遠超任何前端 fetch hook。
- **準備上架 Chrome Web Store**：如果你希望審查一次就過，避免被 Google 要求填寫繁瑣的安全說明或撤除 `<all_urls>` 主機權限，純原生架構勝率最高。

### 7.4 最終架構建議

如果目標是建立完整的「行為與資源監控」，切忌走向全原生或全注入的極端，推薦採用漸進式混合架構：

- **80% 核心走原生 API**：
  - 網路與流量：`chrome.webRequest` (只讀監控)
  - 檔案傳輸：`chrome.downloads`
  - 權限清查與一鍵撤銷：`chrome.contentSettings`
  - 擴充套件生態審查：`chrome.management`
- **20% 盲區依需求「動態注入」**：
  - 平常不全面注入腳本。
  - 只有當使用者打開監控面板（Side Panel）針對特定分頁按下「深度行為追蹤」時，才透過 `chrome.scripting.executeScript` 注入輕量的 API 監控腳本，用完即關閉。
  - 兼顧原生 API 的穩定與極低能耗，同時規避上架審查與頁面衝突風險。