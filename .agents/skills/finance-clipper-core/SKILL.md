---
name: FinanceClipper 研報採集與財務規格字典 (FinanceClipper Core Spec)
description: 定義 finance-research-clipper-oss 插件之核心定位、零構建架構入口、跨插件黑盒契約與深層 SSOT 導航。
triggers: [finance-clipper, 研報採集, 股票爬蟲, 財務儀表板, yahoo finance爬蟲, 個股剪輯, 財報分析]
dependencies: []
ssot_dependencies: ["finance-research-clipper-oss/FINANCE_CLIPPER_README.md", "0.doc_mg/docs/cross_plugin_contract.md", "0.doc_mg/docs/google_ecosystem_integration_spec.md"]
---

# 專家技能：FinanceClipper 研報採集與財務規格字典 (FinanceClipper Core Spec)

本技能為 `finance-research-clipper-oss` 插件之輕量調用索引。所有多市場爬蟲選擇器字典、Miner Schema 規範、Storage Schema、Outbox 機制與詳細架構已沉澱至專屬 SSOT 文檔。

## 1. 核心定位與技術棧 (Tech Stack)
* **目錄路徑**: `finance-research-clipper-oss/`
* **架構風格**: 純原生 Vanilla JS (ES6+) + CSS3 + HTML5（零構建、零外部打包依賴、即改即測）
* **擴充規範**: Manifest V3 (`storage`, `activeTab`, `scripting`, `sidePanel`, `externally_connectable`)

## 2. 關鍵入口架構 (Key Entrypoints)
* `manifest.json`: Manifest V3 宣告，配置權限、側邊欄 (`side_panel`) 與外部通訊
* `background.js`: Service Worker，4合1 SPA 背景靜默採集走訪調度與跨插件通訊監聽
* `dashboard.html` / `src/dashboard/`: 獨立分頁大螢幕儀表板主控與渲染模組 (`src/dashboard/js/`, `src/dashboard/css/`)
* `popup.html` / `src/popup/`: 工具列彈窗主控與採集匯出模組 (`src/popup/popup.js`, `popup-scraper.js`, `popup-export.js`)
* `sidepanel.html` / `src/sidepanel/`: Chrome 側邊欄常駐快捷工具箱 (`src/sidepanel/sidepanel.js`, `sidepanel.css`)
* `options.html` / `src/options/`: 設定頁面 (`src/options/options.js`)
* `src/crawler/`: 頁面 DOM 爬蟲探針與純函數數值清洗 (`crawler.js`, `crawler-sanitizer.js`)
* `src/services/`: 跨插件通信與 Google Sheets 匯出 (`aiClient.js`, `googleSheetsExporter.js`)

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨目錄讀取**: 開發 FinanceClipper 時，嚴禁跨目錄讀取 `chrome_pk/`、`browser-activity-monitor/` 等其他插件源碼。
2. **通訊規格驅動**: 跨插件協同（`PING_HUB`, `CREATE_TASK`, `EXPORT_TO_SHEETS`）一律依據 `0.doc_mg/docs/cross_plugin_contract.md` 與 `0.doc_mg/docs/google_ecosystem_integration_spec.md` 黑盒規範。
3. **零構建約束**: 維持無打包純原生 JS 特性，嚴禁引入 Node.js/Webpack/Vite 等構建工具。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整規格、選擇器字典、Miner Schema 與儲存模型**: 詳見 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
* **跨插件協同通訊協議**: 詳見 `0.doc_mg/docs/cross_plugin_contract.md`
* **Google 生態系直連規範**: 詳見 `0.doc_mg/docs/google_ecosystem_integration_spec.md`
