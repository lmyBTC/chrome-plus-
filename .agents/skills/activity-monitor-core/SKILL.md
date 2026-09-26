---
name: ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)
description: 定義 browser-activity-monitor 插件之 80% 原生常駐監控 + 20% 隨選動態探針架構、Side Panel 通訊、IndexedDB 儲存與權限審查 SSOT。
triggers: [activity monitor, 瀏覽活動監控, browser activity, 權限審查, 雙層探針, 側邊欄監控]
dependencies: []
ssot_dependencies: ["browser-activity-monitor/ACTIVITY_MONITOR_README.md"]
---

# 專家技能：ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)

本技能為 `browser-activity-monitor` 插件的 Single Source of Truth (SSOT)，規範其混合監控架構（80% 原生常駐 + 20% 隨選深度探針）、Chrome 原生 Side Panel 實作、IndexedDB 本機日誌持久化與權限審查標準。

---

## 1. 專案技術規格 (Tech Stack & Architecture)
* **目錄位置**: `./browser-activity-monitor/`
* **架構風格**: 純原生 Vanilla JavaScript (ES Module) + Vanilla CSS（零外部打包依賴、零 Webpack/Vite 負擔）
* **擴充功能入口 (Extension Entrypoints)**:
  * `manifest.json`: Manifest V3，宣告 `sidePanel`, `alarms`, `contentSettings`, `webRequest`, `downloads`, `scripting`, `tabs`。
  * `background.js`: 背景 Service Worker 核心，負責監聽原生 webRequest/downloads/contentSettings、排程清理、管理 Port 長連接廣播、調度動態雙層探針。
  * `sidepanel/`: 採用 Chrome 原生 Side Panel API，包含面板 HTML、深色毛玻璃 CSS 與即時串流控制器 `sidepanel.js`。
  * `scripts/`: 包含動態注入探針 (`probe-main.js`, `probe-isolated.js`) 與本機資料庫模組 (`storage-db.js`)。

---

## 2. 核心架構：80% 原生常駐 + 20% 隨選探針 (Hybrid Architecture)
* **80% 原生常駐 (Zero Content Script Overhead)**:
  - 平時 **0%** 網頁腳本常駐注入，杜絕記憶體洩漏與網頁 DOM 污染。
  - 網路請求審查：`chrome.webRequest.onBeforeRequest` 即時監控第三方 API 調用與跨站傳輸。
  - 下載審查：`chrome.downloads.onCreated` 追蹤下載檔名、大小與 MIME 類型。
  - 網域物理權限：調用 `chrome.contentSettings` 批次審查相機、麥克風、地理定位、通知與剪貼簿。
* **20% 隨選動態雙層探針 (On-Demand Deep Inspector)**:
  - 僅在使用者主動點擊 Side Panel 的「注入深度探針」時，由 Background 透過 `chrome.scripting.executeScript` 注入：
    1. **MAIN 探針** (`scripts/probe-main.js`)：掛鉤 `getUserMedia`、`getCurrentPosition`、`readText` 原生 API，捕獲調用參數與 Callstack。
    2. **ISOLATED 探針** (`scripts/probe-isolated.js`)：作為防禦中繼層，驗證 `__PROBE_MAIN__` 標籤並安全轉發訊息。
  - 網頁重整或分頁關閉後探針即刻失效，不留常駐副作用。

---

## 3. 資料模型與儲存 SSOT (Storage Schema)
日誌與狀態透過本機 IndexedDB (`BrowserActivityMonitorDB`) 持久化，不傳送外部伺服器：
* **資料表 (Object Store)**: `activity_logs`
  * 主鍵: `id` (autoIncrement)
  * 索引: `timestamp`、`type` (webRequest / download / probe / permission)、`origin`、`tabId`
* **資料清理機制**:
  - 整合 `chrome.alarms` 定期（每日）觸發過期檢查，自動清除超過 3 天之歷史審計資料。

---

## 4. 與 ScrumClock Toolbox 之邊界與黑盒關係
* **解耦規範**: `chrome_scrumclock/src/features/toolbox/tools/activity-monitor/` 僅為 ScrumClock 內部之純前端展示與安全沙盒檢測視圖，與 `browser-activity-monitor` **源碼 100% 獨立解耦**。
* **無直接依賴**: 兩者不共用代碼庫，嚴禁跨目錄 import。跨專案數據流通一律依循 `0.doc_mg/docs/cross_plugin_contract.md` 規範。

---

## 5. 安全與合規底線 (Compliance Rules)
1. **嚴禁 innerHTML 漏洞**: 所有動態渲染之文字節點一律使用 `.textContent` 或安全的 DOM 元素構造，杜絕 XSS。
2. **CSP 零豁免**: 禁止引入外部 CDN 腳本，禁止 `unsafe-eval` 或 `new Function()`。
3. **隱私最小化**: 僅收集用於本機安全審查之網路與行為元資料，不記錄使用者鍵入之敏感密碼或表單內容。
