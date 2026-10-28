# 🛡️ Browser Activity Monitor - 瀏覽器活動監控與原生授權審查

> 雙軌隨選健檢架構、常態零耗能待命與原生 Chrome 授權審查工具 (Manifest V3)

---

## 🛠️ 技術棧與架構原則 (Tech Stack & Principles)
* **核心技術**: 純原生 Vanilla JavaScript (ES Module) + Vanilla CSS（零外部打包依賴、零 Webpack/Vite 負擔）
* **擴充規範**: Chrome Extension Manifest V3 (`sidePanel`, `alarms`, `contentSettings`, `webRequest`, `downloads`, `scripting`, `tabs`)
* **核心特點**: 常態零耗能待命（0% 觀察者效應）、雙軌隨選監測（60s 快速健檢 + 持續記錄模式）、隨選動態雙層探針、IndexedDB 結構化報告持久化

---

## 🧭 核心架構入口 (Extension Entrypoints)
* `manifest.json`: Manifest V3 擴充配置宣告
* `background.js`: 背景服務核心 (Service Worker)，負責動態掛載/卸載 `webRequest` 攔截器、Session 生命週期與 Port 廣播
* `scripts/session-profiler.js`: Session 彙總分析引擎，記憶體輕量統計器、Noise Gate 與優化建議生成
* `scripts/resource-profiler.js`: 組件資源監視與效能診斷核心，微秒級耗時採集、DOM/記憶體/佇列診斷
* `scripts/probe-main.js` / `scripts/probe-isolated.js`: 隨選注入之 MAIN / ISOLATED 雙層安全探針
* `scripts/storage-db.js`: IndexedDB 本機審計儲存層 (`BrowserActivityMonitorDB`)
* `sidepanel/sidepanel.html` / `sidepanel.js` / `sidepanel.css`: Chrome 原生側邊欄監控視圖 UI、雙軌生命週期控制器與深色主題樣式

---

## 📖 完整規格與 SSOT 導航 (Deep SSOT Reference)
本插件所有詳細雙軌隨選健檢架構、IndexedDB 儲存 Schema、前端環形緩衝區規範、資源效能診斷閾值與 ScrumClock 整併架構，請查閱：
👉 **`ACTIVITY_MONITOR_README.md`** (本插件 Single Source of Truth)

