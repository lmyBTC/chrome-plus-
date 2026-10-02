# 🛡️ 活動監控模組技術規格書 (Activity Monitor Spec)

> **SSOT 狀態**：本文件為 `chrome_scrumclock/src/features/activity-monitor/` 模組之業務邏輯、技術架構、儲存模型與安全規範的 Single Source of Truth (SSOT)。

---

## 1. 模組概述與整合架構 (Overview & Architecture)

活動監控模組源自獨立插件 `browser-activity-monitor`，經重構整併至 `chrome_scrumclock`（Power Kit），達成單一建置管線（Vite）、單一 Manifest V3 權限宣告與共享 React UI 元件庫。

### 核心設計原則：80% 原生常駐 + 20% 隨選深度探針 (Hybrid Architecture)
* **80% 原生常駐監控 (Zero Content Script Overhead)**：
  - 平時 **0%** 網頁腳本常駐注入，不對使用者瀏覽網頁造成任何記憶體洩漏或效能損耗。
  - **網路請求審查**：背景監聽 `chrome.webRequest.onBeforeRequest`，即時攔截並記錄第三方 API、跨站資源請求。
  - **檔案下載審查**：背景監聽 `chrome.downloads.onCreated`，記錄下載檔名、大小與 MIME 類型。
  - **分頁生命週期**：背景監聽 `chrome.tabs.onUpdated`，追蹤分頁導航與網址切換。
  - **實體權限審查**：調用 `chrome.contentSettings` 審查目前活躍網域之相機、麥克風、地理定位與通知權限。
* **20% 隨選動態雙層探針 (On-Demand Deep Inspector)**：
  - 僅當使用者在前端面板主動點擊「注入深度探針」時，由 Background 透過 `chrome.scripting.executeScript` 注入雙層探針：
    1. **MAIN 世界探針 (`probe-main.js`)**：直接掛鉤網頁主執行緒中的 `navigator.mediaDevices.getUserMedia`、`geolocation.getCurrentPosition` 與 `navigator.clipboard.readText` 原生 API，捕獲調用參數與 Callstack。
    2. **ISOLATED 世界探針 (`probe-isolated.js`)**：作為隔離防禦中繼層，驗證 `__PROBE_MAIN__` 特徵標籤並安全轉發訊息至背景 Service Worker。
  - 網頁重新整理或分頁關閉後探針即刻銷毀，不留任何常駐副作用。

---

## 2. 模組目錄結構 (Module Structure)

模組遵循垂直切片架構與 Barrel Pattern 規範：

```text
chrome_scrumclock/src/features/activity-monitor/
├── index.ts                           # 模組門面導出 (Barrel Export)
├── components/
│   └── ActivityMonitorView.tsx        # React 核心視圖（日誌串流、過濾、統計圖表、探針注入）
├── services/
│   └── monitorService.ts              # 背景監控管理服務（事件掛載、過期日誌清理）
├── storage/
│   └── activityDb.ts                  # 本機 IndexedDB 封裝層 (Promise-based CRUD)
└── types/
    └── index.ts                       # TypeScript 型別宣告 (ActivityLog, ActivityStats, etc.)
```

外部動態探針資源存儲於：
`chrome_scrumclock/public/scripts/probes/`：
- `probe-main.js`
- `probe-isolated.js`

---

## 3. 資料模型與儲存 SSOT (Storage Schema)

活動監控日誌採用獨立之本機 IndexedDB 持久化存儲，與 Chrome Storage Local 徹底隔離：

### IndexedDB 配置
* **資料庫名稱 (DB Name)**: `BrowserActivityMonitorDB`
* **版本 (Version)**: `1`
* **資料表 (Object Store)**: `activity_logs`
* **主鍵 (Primary Key)**: `id` (autoIncrement: true)
* **索引 (Indexes)**:
  * `timestamp`: 日誌時間戳（遞減排序）
  * `type`: 事件類別 (`webRequest` | `download` | `probe` | `permission` | `navigation`)
  * `origin`: 來源網域 (例如 `https://example.com`)
  * `tabId`: 瀏覽器分頁 ID

### 日誌介面定義 (`types/index.ts`)
```typescript
export interface ActivityLog {
  id?: number;
  timestamp: number;
  type: 'webRequest' | 'download' | 'probe' | 'permission' | 'navigation';
  title: string;
  details: Record<string, unknown> | string;
  origin?: string;
  tabId?: number;
  riskLevel?: 'info' | 'warn' | 'danger';
}
```

### 自動清理機制 (Data Retention)
- 由 `chrome_scrumclock/src/background.ts` 之 `chrome.alarms` 定期（每日）調用 `monitorService.cleanupExpiredLogs(3)`。
- 自動刪除超過 3 天前之歷史日誌，確保 IndexedDB 儲存空間維持在輕量水位 (< 5MB)。

---

## 4. 通訊協定與訊息格式 (Runtime Communication)

前台 React 面板與背景監控服務透過 `chrome.runtime.sendMessage` 與 Port 長連接進行通訊：

### 支援之 Actions 清單
1. `GET_ACTIVITY_LOGS`: 取得歷史活動日誌（支援 limit 與 offset 分頁）。
2. `GET_ACTIVITY_STATS`: 取得即時統計摘要（總事件數、高風險計數、各類別分佈）。
3. `CLEAR_ACTIVITY_LOGS`: 一鍵清空所有本機活動記錄。
4. `INJECT_PROBE`: 針對指定 `tabId` 動態注入雙層探針。
5. `CHECK_PERMISSIONS`: 查詢指定網域之 Chrome contentSettings 權限狀態。

### 即時推播 (Port Streaming)
- 前端面板掛載時透過 `chrome.runtime.connect({ name: 'activity-monitor-stream' })` 建立長連接。
- 背景捕獲新事件並寫入 IndexedDB 後，即時向連線中的 Port 廣播 `NEW_ACTIVITY_LOG` 訊息，達成 0 延遲即時串流更新。

---

## 5. UI 與體驗設計 (UI/UX Design)

- **視覺風格**：遵循 ScrumClock 統一之高質感暗色主題（Zinc / Slate 漸層、毛玻璃玻璃擬態、清晰圓角卡片）。
- **關鍵元件**：
  - **即時日誌串流**：卡片式列表展示時間、類別圖示、網域、詳細參數與風險等級標籤。
  - **統計概覽卡片**：即時顯示總請求數、下載數、敏感權限調用數與高風險事件警示。
  - **分類篩選工具列**：一鍵快速切換檢視全部、網路請求、下載、動態探針或權限變更。
  - **隨選探針控制器**：一鍵向當前活躍分頁注入動態探針，並提供注入狀態反饋。
- **自適應模式**：全面適配全螢幕新分頁（New Tab）與窄屏側邊欄（Side Panel / ToolboxHub 模式）。

---

## 6. 安全性與合規規範 (Security & Compliance)

1. **Manifest V3 合規**：背景服務完全依託 Service Worker，無任何持久化 Background Page。
2. **CSP 零豁免**：禁止使用 `eval()`、`new Function()` 或外部未打包腳本。
3. **防禦性 DOM 操作**：React 渲染全面杜絕 `dangerouslySetInnerHTML`，動態文字皆以安全節點構造，杜絕 XSS。
4. **探針訊息隔離**：MAIN 世界與 ISOLATED 世界透過 `window.postMessage` 溝通時，嚴格校驗自定義暗號標籤（`__PROBE_MAIN__`），杜絕網頁宿主腳本偽造假訊息。
5. **使用者隱私保護**：僅記錄安全審計必要之網址中繼資料（URL、HTTP Method、MIME Type、呼叫 API 名稱），絕不紀錄密碼、Cookie 內容或表單鍵入敏感資料。
