# 📈 [FinanceClipper] Finance Research Clipper (Open-Source Version)

> Google Finance 一鍵式深度研報採集與智能投資儀表板 (Manifest V3)

---

## 🛠️ 技術棧與架構原則 (Tech Stack & Principles)
* **核心技術**: 純原生 Vanilla JS (ES6+) + CSS3 + HTML5（零構建、零依賴、即改即測）
* **擴充規範**: Chrome Extension Manifest V3 (`storage`, `activeTab`, `scripting`, `sidePanel`, `externally_connectable`)
* **核心特點**: 4合1 SPA 背景靜默採集、雙載體工作流（獨立分頁大螢幕儀表板 + 側邊欄快捷工具箱）、無污染 Clean TSV 匯出與 Google 生態系直連

---

## 🧭 核心架構入口 (Extension Entrypoints)
* `manifest.json`: Manifest V3 擴充配置宣告
* `background.js`: 後台 Service Worker，無感分頁調度、4合1 SPA 採集走訪與跨插件通訊監聽
* `crawler.js` / `crawler-sanitizer.js`: 頁面 DOM 爬取探針與純數字清洗/Miner Schema 正規化函式庫
* `dashboard.html` / `dashboard.js`: 獨立分頁完整儀表板（個股看板、損益表、同業對比矩陣、估值敏感度沙盒）
* `sidepanel.html` / `sidepanel.js`: Chrome 側邊欄常駐快捷工具箱
* `popup.html` / `popup.js`: 工具列彈出視窗主控
* `aiClient.js`: 跨插件通信客戶端（與 ScrumClock 本地 Gemini Nano 交互）

---

## 📖 完整規格與 SSOT 導航 (Deep SSOT Reference)
本插件所有詳細資料來源選擇器字典（Google/Yahoo/Finviz/Goodinfo/Investing）、Miner Schema 規範、Storage Schema 字典、跨插件 Outbox 通訊協議與 Google 生態系協作規格，請查閱：
👉 **`FINANCE_CLIPPER_README.md`** (本插件 Single Source of Truth)
