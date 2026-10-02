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
  * `scripts/`: 包含動態注入探針 (`probe-main.js`, `probe-isolated.js`)、本機資料庫模組 (`storage-db.js`) 以及組件資源監視與效能診斷核心 (`resource-profiler.js`)。

---

## 2. 核心架構：常態零耗能待命 + 雙軌隨選監測 (Zero Standby & On-Demand Profiling)
* **常態零耗能待命 (Zero Standby Overhead - 根除觀察者效應)**:
  - 平時 Service Worker 處於深度休眠，完全不掛載 `webRequest` 網路攔截器、不進行背景磁碟寫入。
  - 網頁端 **0%** 腳本常駐注入，杜絕記憶體洩漏與網頁 DOM 污染。
  - 網域物理權限：調用 `chrome.contentSettings` 隨選批次審查相機、麥克風、地理定位、通知與剪貼簿。
* **雙軌隨選監測架構 (Dual Profiling Modes)**:
  1. **軌道 A：快速定時健檢 (Quick Audit - 60s)**：一鍵啟動 60 秒採樣，時間倒數結束自動結算並完全卸載 `webRequest` 監聽。
  2. **軌道 B：持續檢測記錄模式 (Continuous Session Mode)**：使用者點擊「開始檢測記錄」後啟動動態監聽，持續收集直到手動停止、關閉面板（Sidepanel Disconnect）或關閉瀏覽器（SW Suspend），即刻自動結算統計並持久化儲存「階段檢測報告」，隨後卸載監聽恢復零耗能。
* **動態生命週期防護 (Lifecycle Guards)**:
  - 監聽 `port.onDisconnect`（當所有面板關閉且 Session 進行中時自動安全結算）與 `chrome.runtime.onSuspend`（瀏覽器休眠時自動結算並卸載監聽），確保永遠不產生孤兒監聽器。
* **20% 隨選動態雙層探針 (On-Demand Deep Inspector)**:
  - 僅在使用者主動點擊 Side Panel 的「注入深度探針」時，由 Background 透過 `chrome.scripting.executeScript` 注入：
    1. **MAIN 探針** (`scripts/probe-main.js`)：掛鉤 `getUserMedia`、`getCurrentPosition`、`readText` 原生 API，捕獲調用參數與 Callstack。
    2. **ISOLATED 探針** (`scripts/probe-isolated.js`)：作為防禦中繼層，驗證 `__PROBE_MAIN__` 標籤並安全轉發訊息。
  - 網頁重整或分頁關閉後探針即刻失效，不留常駐副作用。

---

## 3. 資料模型與儲存 SSOT (Storage Schema)
日誌與狀態透過本機 IndexedDB (`BrowserActivityMonitorDB`) 持久化，不傳送外部伺服器：
* **資料表 (Object Stores)**:
  * `activity_logs`:
    - 主鍵: `id` (autoIncrement)
    - 索引: `timestamp`、`type` (webRequest / download / probe / permission)、`origin`、`tabId`
  * `health_reports`:
    - 階段檢測報告儲存集合，僅在每次 Session 結算時寫入 1 筆結構化報告（包含統計指標、耗能排行、TOP 分頁與優化建議）。
    - 主鍵: `id` (string，如 `rep_timestamp_uuid`)
    - 索引: `timestamp`、`mode` (TIMED / CONTINUOUS)、`healthScore`
* **資料清理機制**:
  - 拔除高頻單筆日誌寫入，徹底消除日常磁碟 I/O。
  - 整合 `chrome.alarms` 定期（每日）觸發過期檢查，自動清除超過 3 天之歷史日誌與超過 7 天之檢測報告。

---

## 4. 前端 DOM 節點控制與環形緩衝區 (Ring Buffer Spec)
* **環形緩衝區機制**: Side Panel 即時串流嚴格維持最新 30 筆 (`MAX_RING_BUFFER = 30`)，新記錄移入時同步將 DOM 頂部最舊節點移除。
* **節點上限約束**: 全面板 DOM 節點總量恆定控制在 100 以內，根除「節點過多造成效能低落」警示。
* **雙視圖架構**: 提供「即時串流 (Stream)」與「階段檢測報告 (Reports)」分頁無縫切換。

---

## 5. 與 ScrumClock 之整併關係 (ScrumClock Integration)
* **已整合至 ScrumClock 架構**:
  - 核心監控邏輯、IndexedDB 本機資料庫與雙層探針已整併至 `chrome_scrumclock/src/features/activity-monitor/`。
  - 背景監聽掛載於 `chrome_scrumclock/src/background.ts`（由 `monitorService.ts` 統一管理）。
  - UI 介面已移植為 React + Tailwind 元件 `ActivityMonitorView.tsx`，並整合於 ScrumClock 側邊欄與工具箱。
* **獨立專案定位**: `browser-activity-monitor/` 原型目錄保留作為零依賴 Vanilla JS/CSS 原生參考實作。跨專案通訊協同仍依循 `0.doc_mg/docs/cross_plugin_contract.md` 規範。

---

## 6. 組件資源監視與效能診斷規格 (Resource Profiler & Diagnostic Spec)
* **核心採集器 (`scripts/resource-profiler.js`)**:
  - **模組耗時統計**: 提供 `time(label)`、`timeEnd(label)` 與 `measure(label, fn)`，以微秒級精度計算 avg、min、max、calls 與最近 30 次歷史採樣。
  - **四宮格系統指標**: 實時採集 DOM 節點總量、JS Heap 記憶體粗估 (`performance.memory`)、佇列積壓深度 (`db_batch_queue`, `active_ports`) 與全域平均呼叫延遲。
  - **智慧優化建議引擎**: 自動對比延遲閾值（如單次呼叫 >16ms / >40ms、高頻調用、DOM 節點 >1000、佇列積壓 >20），自動產出 `warning`、`critical` 或 `good` 級別的可操作優化建議。
* **零常駐負擔原則**:
  - 資源監視面板預設為收合狀態，不註冊常駐定時器；僅在使用者手動展開面板時啟動 3 秒輪詢，折疊收合時立即銷毀 Timer，達成 0% 額外常駐開銷。

---

## 7. 安全與合規底線 (Compliance Rules)
1. **嚴禁 innerHTML 漏洞**: 所有動態渲染之文字節點一律使用 `.textContent` 或安全的 DOM 元素構造，杜絕 XSS。
2. **CSP 零豁免**: 禁止引入外部 CDN 腳本，禁止 `unsafe-eval`、`new Function()` 或 HTML 內嵌事件監聽 (`onclick`)。
3. **隱私最小化**: 僅收集用於本機安全審查之網路與行為元資料，不記錄使用者鍵入之敏感密碼或表單內容。

