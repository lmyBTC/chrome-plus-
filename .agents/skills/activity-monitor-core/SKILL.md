---
name: ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)
description: 定義 browser-activity-monitor 插件之核心定位、雙軌隨選健檢架構、架構入口與深層 SSOT 導航。
triggers: [activity monitor, 瀏覽活動監控, browser activity, 權限審查, 雙層探針, 側邊欄監控, activitymonitor]
dependencies: []
ssot_dependencies: ["browser-activity-monitor/docs/spec-actmon-components.md", "browser-activity-monitor/ACTIVITY_MONITOR_README.md", "0.doc_mg/docs/spec-cross-plugin-contract.md"]
---

# 專家技能：ActivityMonitor 瀏覽器活動監控規格字典 (ActivityMonitor Core Spec)

本技能為 `browser-activity-monitor` 插件之輕量調用索引。所有詳細雙軌隨選架構、IndexedDB 儲存 Schema、Resource Profiler 與 PK+ (ScrumClock) 整併架構已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `browser-activity-monitor/`
* **技術棧**: 純原生 Vanilla JavaScript (ES Module) + Vanilla CSS（零外部打包依賴、零構建負擔，MV3）
* **核心原則**: 常態零耗能待命（平時不掛載 `webRequest`，0% 觀察者效應）+ 雙軌隨選健檢（60s 快速採樣 / 持續記錄）

## 2. 關鍵入口架構 (Key Entrypoints)
* `manifest.json`: Manifest V3 配置宣告 (`sidePanel`, `alarms`, `contentSettings`, `webRequest`, `downloads`, `storage`)
* `background.js`: 背景 Service Worker，隨選掛載/卸載網路攔截、Port 長連接與組件調度
* `scripts/`: 核心服務層
  - `tab-time-tracker.js` & `domain-classifier.js`: 前台分頁焦點停留時長與網域智慧分類
  - `tab-interceptor.js`, `interceptor-content.js`, `interceptor-main.js`: 彈窗與跳窗攔截防護引擎
  - `privacy-sanitizer.js`: 前端日誌隱私脫敏管線 (Token/私有 IP 遮罩)
  - `session-profiler.js` & `resource-profiler.js`: 階段健康報告與資源效能診斷核心
  - `storage-db.js`: IndexedDB 本機儲存 (`activity_logs`, `health_reports`, `time_spent_logs`)
* `sidepanel/`: Chrome 原生側邊欄監控視圖 (時長看板、分類過濾、攔截佇列、脫敏開關)
* `management/`: 獨立管理控制台 (總覽儀表板、專注度分佈、黑名單 CRUD、JSON 匯入匯出)

## 3. 安全與合規底線 (Hard Rules)
1. **嚴禁 innerHTML 漏洞**: 所有動態渲染文字節點一律使用 `.textContent` 或安全的 DOM 操作，杜絕 XSS。
2. **CSP 零豁免**: 嚴禁外部 CDN、嚴禁 `unsafe-eval` 或內嵌 HTML 事件監聽 (`onclick`)。
3. **資料本機性與隱私最小化**: 僅收集安全審核元資料並保存在本地 IndexedDB，絕不上傳遠端伺服器；禁止採集密碼或敏感表單。
4. **匯出隱私脫敏管線 (AM-03)**: 匯出與複製日誌時預設純化 Token 與私有 IP，絕不污染底層 IndexedDB 原始除錯數據。
5. **PK+ (ScrumClock) 協同邊界**: 與 PK+ 通訊協同遵循 `0.doc_mg/docs/spec-cross-plugin-contract.md` 黑盒契約。

## 4. 深層 SSOT 導航 (Deep Reference)
* **組成元件字典與架構切片 (SSOT)**: 詳見 `browser-activity-monitor/docs/spec-actmon-components.md`
* **完整雙軌架構、儲存 Schema、資源診斷與整合指南**: 詳見 `browser-activity-monitor/ACTIVITY_MONITOR_README.md`
* **跨插件黑盒契約規範**: 詳見 `0.doc_mg/docs/spec-cross-plugin-contract.md`


