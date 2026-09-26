---
title: "重構與拆解 chrome.md 監控插件系統架構指南"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-09-25"
deadline: "2026-09-26"
---

## 1. 目標
將現有 `./0.doc_mg/chrome.md` 確立之 **「80% 原生常駐監控 + 20% 隨選動態注入」混合架構 (Hybrid Architecture)** 進行工程規格化與任務拆解，建立符合 SSOT 規範之系統架構藍圖，明確定義：
1. **80% 原生常駐層**：Background Service Worker 利用 Chrome 原生 API（`webRequest`, `downloads`, `contentSettings`, `tabs`）達成零 DOM 衝突與極低能耗的流量與權限審查。
2. **20% 隨選動態注入層**：透過 Side Panel 使用者主動觸發，以 `chrome.scripting.executeScript` 注入雙層探針（`probe-main.js` 與 `probe-isolated.js`），即時監控 `getUserMedia`、`geolocation`、`clipboard` 敏感 API。
3. **高效通訊與持久化閉環**：整合 `TelemetryBroker`（Port 長連接批次傳輸）、`CircularBuffer`（快照回放）與 `AuditStorageDB`（IndexedDB + `chrome.alarms` 定期清理）。

## 2. 策略與鎖定檔案

### 核心策略
- **混合分層防禦**：平日瀏覽零腳本注入，保障極高網頁相容性與極低能耗；僅在使用者手動按鈕時針對特定 Tab 動態注入探針，最大程度降低 Web Store 審查被阻擋風險。
- **高頻效能保護**：以 `TelemetryBroker` 批次佇列（200ms/50筆）消化高頻 `webRequest` 事件，搭配 `CircularBuffer` 避免 Service Worker 記憶體外洩。
- **原生權限清查**：利用 `chrome.contentSettings` 主動清查目前站點的攝影機、麥克風、地理位置、通知與剪貼簿狀態。
- **相依與合規隔離**：嚴格遵循專案之多插件獨立防護原則，確保此插件規劃不與既有插件（`chrome_scrumclock`, `chrome_video speed plus`, `finance-research-clipper-oss`）儲存與通訊衝突。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/chrome.md`
- `./0.doc_mg/tasks/task_20260925_global_chrome_md_blueprint.md`

## 3. 任務拆解

### Phase 1: 文檔結構重組與架構規範化 狀態：`[已完成]`

### Phase 2: 混合架構規格梳理與工程落地規劃 狀態：`[已完成]`
- [x] 任務 2.1: 定義混合架構 (Hybrid Architecture) 規格
    - [x] 確立 80% 原生常駐層：`webRequest` 唯讀流量、`downloads` 檔案傳輸、`contentSettings` 網站權限審查。
    - [x] 確立 20% 隨選動態層：Side Panel 點擊時以 `chrome.scripting.executeScript` 注入 `probe-main.js` 與 `probe-isolated.js`。
    - [x] 規範目錄結構：`browser-activity-monitor/`（含 `manifest.json`, `background.js`, `scripts/`, `sidepanel/`）。
- [x] 任務 2.2: 整合高效通訊與非阻塞儲存閉環
    - [x] 長連接 (`Port`) 批次緩衝 (`TelemetryBroker`) 與記憶體環狀緩衝 (`CircularBuffer`)。
    - [x] `AuditStorageDB` 非同步批次交易與 `chrome.alarms` 自動清理過期日誌（每 24 小時維護）。
- [x] 任務 2.3: 梳理 `./0.doc_mg/chrome.md` 末端格式與驗收標準（清理零碎結尾，確立完整 SSOT）
- [x] 任務 2.4: 驗證跨插件隔離與 Web Store MV3 合規審計規範

## 4. 關鍵架構落地規格 (Hybrid MV3 SSOT)

### 4.1 專案目錄結構規範
```text
browser-activity-monitor/
├── manifest.json
├── background.js
├── scripts/
│   ├── probe-main.js       # 運行於 MAIN world，代理原生敏感 API (getUserMedia, geolocation, clipboard)
│   └── probe-isolated.js   # 運行於 ISOLATED world，安全轉發訊息至 Background
├── sidepanel/
│   ├── sidepanel.html      # 側邊欄 UI（原生權限狀態、隨選開關、即時瀑布流）
│   └── sidepanel.js        # Port 長連接管理、動態注入觸發與資料渲染
└── icons/
    └── icon128.png
```

### 4.2 核心通訊與隨選注入調度流程
1. **Background Service Worker (`background.js`)**：
   - 監聽 `chrome.runtime.onConnect`（`name: 'monitor-stream'`），維護連線 `activePorts`。
   - 接收 Side Panel 的 `GET_CONTENT_SETTINGS` 請求，透過 `chrome.contentSettings` 批次查詢目標 Origin 權限。
   - 接收 Side Panel 的 `ENABLE_DEEP_INSPECTION` 請求，使用 `chrome.scripting.executeScript` 對指定 `tabId` 分別注入 MAIN 與 ISOLATED 探針。
   - 監聽原生 `webRequest.onBeforeRequest` 與 `downloads.onCreated`，經由批次佇列廣播。
2. **雙層隨選探針 (Dual-World Probes)**：
   - `probe-main.js`：掛鉤（Monkey Patch）`navigator.mediaDevices.getUserMedia`、`navigator.geolocation.getCurrentPosition`、`navigator.clipboard.readText`，透過 `window.postMessage` 發出 `__PROBE_MAIN__` 事件。
   - `probe-isolated.js`：監聽 `message` 事件並過濾來源，透過 `chrome.runtime.sendMessage` 安全回傳 Background。

### 4.3 IndexedDB 持久化與 Alarm 自動清理封裝
```javascript
// storage-db.js
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

```javascript
// background.js - 註冊定時清理任務 (Alarms)
chrome.alarms.create('PURGE_EXPIRED_LOGS', {
  periodInMinutes: 60 * 24 // 每 24 小時執行一次清理
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'PURGE_EXPIRED_LOGS') {
    const db = new AuditStorageDB();
    await db.purgeExpiredLogs(7 * 24 * 60 * 60 * 1000); // 清理 7 天前的舊紀錄
  }
});
```

## 5. 影響評估
- 本任務僅針對 `./0.doc_mg/chrome.md` 進行架構文檔層級的重構與拆解規劃，不影響現有任何執行中插件的原始碼與功能。

## 6. 驗收標準
- [x] **混合架構確立**: 確立「80% 原生常駐 (`webRequest`, `downloads`, `contentSettings`) + 20% 隨選動態注入 (`chrome.scripting.executeScript`)」分層模式。
- [x] **通訊與儲存閉環**: 整合 Port 批次通訊 (`TelemetryBroker`)、`CircularBuffer` 與 `AuditStorageDB` + `chrome.alarms` 定期清理。
- [x] **文檔排版正規化**: 整理 `./0.doc_mg/chrome.md` 末端對照表之排版格式與黏合文字，確保純 Markdown 乾淨可讀。
- [x] **檔案編碼**: 確認文檔以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 文檔連結一律使用工作區相對路徑，無絕對路徑。

## 7. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-25 ID: 68faedbc-35e0-4ac5-bb00-722660b5b1e0 (Gate 1 初始化)
> - 2026-09-25 ID: 5a9b78fd-0128-46e3-ba46-3289b40f03a5 (Gate 1 架構優化與 IndexedDB 整合)
> - 2026-09-25 ID: fa9f6dc2-1368-4166-98e2-9e85e9ae5089 (Gate 2 任務 2.3 排版梳理與全任務收斂結案)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務藍圖已全數驗收完成。後續若需展開實際代碼工程建置（如建立 `browser-activity-monitor/` 目錄與實作），請開啟新對話並發起 Gate 0 需求提議。
