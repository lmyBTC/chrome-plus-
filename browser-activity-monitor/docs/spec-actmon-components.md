# Browser Activity Monitor 組成元件規格字典

> 文件路徑：`browser-activity-monitor/docs/spec-actmon-components.md`  
> 模組代號：`actmon`  
> 架構規範：Manifest V3、零打包 Vanilla JS、雙軌探針 (常態輕量 + 隨選深度)

---

## 1. 架構概述與設計原則

Browser Activity Monitor 負責精確追蹤、分類與分析使用者在瀏覽器中的操作行為與生產力分佈：
* **雙軌探針架構 (Dual-Track Probe)**：
  * **軌道 A (常態輕量探針)**：於 Isolated World 中以低於 0.1% CPU 負載常態運行，追蹤標籤頁切換、活躍焦點與總停留時長。
  * **軌道 B (隨選深度探針)**：僅在特定分析需求或診斷模式下動態注入 Main World，深度探測記憶體配置與資源耗損。
* **隱私優先與本地脫敏 (Privacy First)**：敏感參數 (Tokens, Query Params, PII) 於寫入儲存前必須通過 `privacy-sanitizer.js` 脫敏處理。
* **分層 UI 容器 (Management + Sidepanel)**：提供完整 Management 報表後台與即時輕量 Sidepanel 側邊欄。

---

## 2. 組成元件清單 (Component Inventory)

### 2.1 背景服務與協調核心 (Background Service)
* **`BackgroundCoordinator` (`background.js`)**
  * 職責：MV3 Service Worker 核心，接管 `chrome.tabs`, `chrome.windows`, `chrome.alarms` 與 `chrome.runtime` 事件。
  * 核心機制：維護當前焦點標籤狀態快取，定時將記憶體日誌批次寫入持久化儲存，避免頻繁 I/O。

### 2.2 核心探針與分析腳本 (Probes & Analytical Scripts)
* **`TabInterceptor` (`scripts/tab-interceptor.js`, `scripts/interceptor-content.js`, `scripts/interceptor-main.js`)**
  * 職責：標籤頁導航前置攔截，驗證黑白名單規則，控制探針動態注入。
* **`IsolatedProbe` (`scripts/probe-isolated.js`)**
  * 職責：輕量常態探針。監聽 `document.visibilityState`、使用者互動事件（鼠標/滾動/鍵盤活躍態）並回報至背景。
* **`MainWorldProbe` (`scripts/probe-main.js`)**
  * 職責：隨選深度探針。執行於 Main World，調用 `performance.memory`、Timing API 分析分頁效能負載。
* **`DomainClassifier` (`scripts/domain-classifier.js`)**
  * 職責：網域與頁面分類模組。將造訪頁面分類為：生產力 (Productivity)、研報 (Research)、娛樂 (Entertainment)、通訊 (Social) 等。
* **`TabTimeTracker` (`scripts/tab-time-tracker.js`)**
  * 職責：精確時間計算核心。負責心跳計數、閒置判定 (Idle Timeout)、跨視窗切換的時間切片聚合。
* **`SessionProfiler` (`scripts/session-profiler.js`)**
  * 職責：工作階段分析器。聚合整日或特定任務區間的工作輪廓與專注度指標。
* **`ResourceProfiler` (`scripts/resource-profiler.js`)**
  * 職責：評估分頁資源佔用情況，協助標註高耗能分頁。
* **`PrivacySanitizer` (`scripts/privacy-sanitizer.js`)**
  * 職責：嚴格過濾 URL 中的敏感參數 (如 `access_token`, `auth`, `password`)，支援 SHA-256 單向雜湊化儲存。
* **`StorageDB` (`scripts/storage-db.js`)**
  * 職責：IndexedDB 封裝層，提供歷史活動軌跡的大容量本地儲存與按日索引查詢。
* **`HubClient` (`scripts/hubClient.js`)**
  * 職責：跨插件黑盒客戶端，負責將活動摘要回報給 PK+ 或匯總中心。

### 2.3 使用者介面元件 (UI Components)
* **管理報表後台 (`management/`)**
  * `management/index.html`: 後台主入口。
  * `management/js/dashboard.js`: 視覺化圖表渲染核心（圓餅圖、專注時數熱圖、生產力指數）。
  * `management/js/blacklist.js`: 排除名單與追蹤例外規則設定介面。
  * `management/js/main.js`: 後台導航與狀態分發。
* **側邊欄儀表板 (`sidepanel/`)**
  * `sidepanel/sidepanel.html` / `sidepanel/sidepanel.js` / `sidepanel/sidepanel.css`: 提供當前活躍標籤的即時統計、今日累計時間與快速標籤切換。

---

## 3. 資料結構與介面契約 (Data Schema & Contracts)

### 3.1 活動記錄結構 (Activity Record Schema)
```javascript
{
  id: "act_20261030_123456",
  domain: "github.com",
  category: "Productivity",
  sanitizedUrl: "https://github.com/org/repo",
  activeSeconds: 420,
  idleSeconds: 30,
  startTime: 1730270000000,
  endTime: 1730270450000,
  metadata: {
    pageTitle: "Repository Overview",
    isIncognito: false
  }
}
```

### 3.2 跨插件通訊介面 (Cross-Plugin Messaging)
* **`GET_DAILY_SUMMARY`**: 查詢當日活動時間與分類統計。
* **`RECORD_EXTERNAL_EVENT`**: 接收外部插件（如 `chrome_pk` 或 `chrome_video speed plus`）傳入的特定任務開始/結束事件。

