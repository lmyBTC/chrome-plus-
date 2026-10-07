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
* `crawler.js` / `crawler-sanitizer.js`: 頁面 DOM 爬蟲探針與純函數數值清洗/Miner Schema 正規化函式庫
* `dashboard.html` / `dashboard.js`: 獨立分頁大螢幕儀表板（個股主視圖、同業對比矩陣、估值敏感度沙盒）
* `sidepanel.html` / `sidepanel.js`: Chrome 側邊欄常駐快捷工具箱（支援剪貼簿秒爬與當前頁面提取）
* `popup.html` / `popup.js`: 工具列彈窗主控（模式切換、標的廣播與雙鍵設定同步）
* `googleSheetsExporter.js`: Google Sheets 雙軌匯出模組（支援個股估值沙盒、P/E、殖利率與 Nano 觀點直連 GAS Web App 與 Local Hub 退避）
* `aiClient.js`: 跨插件通信客戶端（連動 ScrumClock 本地 Gemini Nano 研報推論 API）

## 3. 邊界防禦與隔離禁忌 (Hard Rules)
1. **禁止跨目錄讀取**: 開發 FinanceClipper 時，嚴禁跨目錄讀取 `chrome_scrumclock/`、`browser-activity-monitor/` 等其他插件源碼。
2. **通訊規格驅動**: 跨插件協同（`PING_HUB`, `CREATE_TASK`, `EXPORT_TO_SHEETS`）一律依據 `0.doc_mg/docs/cross_plugin_contract.md` 與 `0.doc_mg/docs/google_ecosystem_integration_spec.md` 黑盒規範。
3. **零構建約束**: 維持無打包純原生 JS 特性，嚴禁引入 Node.js/Webpack/Vite 等構建工具。

## 4. 深層 SSOT 導航 (Deep Reference)
* **完整規格、選擇器字典、Miner Schema 與儲存模型**: 詳見 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
* **跨插件協同通訊協議**: 詳見 `0.doc_mg/docs/cross_plugin_contract.md`
* **Google 生態系直連規範**: 詳見 `0.doc_mg/docs/google_ecosystem_integration_spec.md`
