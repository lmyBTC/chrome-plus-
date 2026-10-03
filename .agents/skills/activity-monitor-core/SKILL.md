---
name: ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)
description: 定義 browser-activity-monitor 插件之核心定位、雙軌隨選健檢架構、架構入口與深層 SSOT 導航。
triggers: [activity monitor, 瀏覽活動監控, browser activity, 權限審查, 雙層探針, 側邊欄監控, activitymonitor]
dependencies: []
ssot_dependencies: ["browser-activity-monitor/ACTIVITY_MONITOR_README.md", "0.doc_mg/docs/cross_plugin_contract.md"]
---

# 專家技能：ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)

本技能為 `browser-activity-monitor` 插件之輕量調用索引。所有詳細雙軌隨選架構、IndexedDB 儲存 Schema、Resource Profiler 與 ScrumClock 整併架構已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `browser-activity-monitor/`
* **技術棧**: 純原生 Vanilla JavaScript (ES Module) + Vanilla CSS（零外部打包依賴、零構建負擔，MV3）
* **核心原則**: 常態零耗能待命（平時不掛載 `webRequest`，0% 觀察者效應）+ 雙軌隨選健檢（60s 快速採樣 / 持續記錄）

## 2. 關鍵入口架構 (Key Entrypoints)
* `manifest.json`: Manifest V3 配置宣告 (`sidePanel`, `alarms`, `contentSettings`, `webRequest`, `downloads`)
* `background.js`: 背景 Service Worker，隨選掛載/卸載網路攔截、Port 長連接管理、調度 TabTimeTracker
* `scripts/tab-time-tracker.js`: 前台分頁焦點與有效停留時長追蹤器（AM-01 核心，秒級結算與焦點生命週期）
* `scripts/domain-classifier.js`: 網域智慧分類字典與類別時長聚合引擎（生產力 / 通訊 / 娛樂標籤）
* `scripts/privacy-sanitizer.js`: 前端日誌隱私脫敏模組（AM-03 核心，Token/密鑰遮罩、私有 IP 純化與匯出脫敏開關）
* `scripts/session-profiler.js`: 記憶體輕量統計器、Noise Gate 與階段健康報告生成
* `scripts/resource-profiler.js`: 組件資源監視核心（微秒級耗時、DOM/記憶體/佇列診斷，面板收合時 0% 輪詢）
* `scripts/probe-main.js` & `scripts/probe-isolated.js`: 隨選注入之雙層防禦探針（刷新即失效）
* `scripts/storage-db.js`: IndexedDB 本機儲存 (`BrowserActivityMonitorDB`: `activity_logs`, `health_reports`, `time_spent_logs`)
* `sidepanel/`: Chrome 原生側邊欄監控視圖 (`sidepanel.html`, `sidepanel.js`, `sidepanel.css`，含停留時長看板、分類標籤過濾與脫敏開關)

## 3. 安全與合規底線 (Hard Rules)
1. **嚴禁 innerHTML 漏洞**: 所有動態渲染文字節點一律使用 `.textContent` 或安全的 DOM 操作，杜絕 XSS。
2. **CSP 零豁免**: 嚴禁外部 CDN、嚴禁 `unsafe-eval` 或內嵌 HTML 事件監聽 (`onclick`)。
3. **資料本機性與隱私最小化**: 僅收集安全審核元資料並保存在本地 IndexedDB，絕不上傳遠端伺服器；禁止採集密碼或敏感表單。
4. **匯出隱私脫敏管線 (AM-03)**: 匯出與複製日誌時預設純化 Token 與私有 IP，絕不污染底層 IndexedDB 原始除錯數據。
5. **ScrumClock 協同邊界**: 與 ScrumClock 通訊協同遵循 `0.doc_mg/docs/cross_plugin_contract.md` 黑盒契約。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整雙軌架構、儲存 Schema、資源診斷與整合指南**: 詳見 `browser-activity-monitor/ACTIVITY_MONITOR_README.md`


