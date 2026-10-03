---
title: "FinanceClipper 擴大架構解耦與大檔模組化分拆 (Phase 2)"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-03"
---

## 1. 目標與背景
延續 Phase 1（已成功將同業矩陣與估值沙盒自 `dashboard-actions.js`、`dashboard-render.js` 與 `dashboard.css` 抽離），本階段針對 `finance-research-clipper-oss` 剩餘的千行級與職責混雜檔案進行第二輪深度解耦。
核心目標為將超過 700~1,500 行的巨石檔（`dashboard.css` 1,570行、`dashboard.js` 1,106行、`crawler.js` 815行、`dashboard-render.js` 770行）依職責正交拆解至 300~600 行健康區間，大幅降低 Context 噪音與 Token 消耗，並保持 100% 向後相容與零打包負擔。

## 2. 擴大分析與拆分策略

### 盤點檔案現況（行數與職責）
1. `dashboard.css` (1,570 行): 包含基礎版型、個股卡片/財務報表、AI 研報卡片與匯出下拉面板、彈窗與 Toast。
2. `dashboard.js` (1,106 行): 混雜全域狀態、族群分類(Categories)與標籤(Topic Tags)管理、AI 研報生命週期、同業/估值視圖膠水層、主事件綁定。
3. `crawler.js` (815 行): 包含純函數數據清洗與換算(Sanitizer)約 210 行，以及 SPA DOM 遍歷與 Tab 切換探針約 605 行。
4. `dashboard-render.js` (770 行): 包含個股報表渲染、歷史側邊欄渲染，以及族群/標籤/分頁列渲染約 220 行。

### 拆分方案設計
1. **樣式層分拆 (CSS)**:
   - 抽出 `dashboard-stock.css` (個股數據、Hero Section、分析師卡片、損益表、市場專題等視覺樣式，約 550 行)。
   - 抽出 `dashboard-components.css` (AI 研報卡片、匯出中心下拉選單、Toast、Modal 彈窗樣式，約 450 行)。
   - 保留 `dashboard.css` (主佈局框架、Navbar、Sidebar、全域 CSS 變數與 Reset，降至約 570 行)。
2. **儀表板控制器分拆 (Dashboard JS)**:
   - 抽出 `dashboard-tabs.js` (掛載至 `window.DashboardTabs`，專責 Categories 族群、Topic Tags 自訂標籤、底部分頁管理與 Chrome Storage 持久化，約 250 行)。
   - 抽出 `dashboard-ai.js` (掛載至 `window.DashboardAI`，專責本機 AI 狀態檢測、研報快取載入、推論渲染與 Markdown 複製，約 200 行)。
   - 精簡 `dashboard.js` (保留核心儀表板控制器、生命週期與主事件匯流排，降至約 450 行)。
3. **渲染器分拆 (Render JS)**:
   - 抽出 `dashboard-tabs-render.js` (擴充 `window.DashboardRender`，承接 `renderCategoryTabs`、`renderTopicTags`、`renderSheetTabs`，約 220 行)。
   - 精簡 `dashboard-render.js` (專注於個股、財務報表與歷史清單視圖渲染，降至約 550 行)。
4. **爬蟲層清洗解耦 (Crawler JS)**:
   - 抽出 `crawler-sanitizer.js` (掛載 `window.CrawlerSanitizer`，提供 `cleanNumber`、`cleanMarketCap`、`cleanPercent`、`cleanVolume`、`cleanPE`、`sanitizeToMinerSchema`，約 210 行，可供 background/popup 跨模組共用)。
   - 精簡 `crawler.js` (專注於 Google Finance Beta SPA DOM 節點走訪與 Tab 切換探針，降至約 605 行)。

### 鎖定檔案清單 (Target Files)
- `./finance-research-clipper-oss/dashboard.html`
- `./finance-research-clipper-oss/dashboard.css`
- `./finance-research-clipper-oss/dashboard-stock.css` (新增)
- `./finance-research-clipper-oss/dashboard-components.css` (新增)
- `./finance-research-clipper-oss/dashboard.js`
- `./finance-research-clipper-oss/dashboard-tabs.js` (新增)
- `./finance-research-clipper-oss/dashboard-ai.js` (新增)
- `./finance-research-clipper-oss/dashboard-render.js`
- `./finance-research-clipper-oss/dashboard-tabs-render.js` (新增)
- `./finance-research-clipper-oss/crawler.js`
- `./finance-research-clipper-oss/crawler-sanitizer.js` (新增)
- `./finance-research-clipper-oss/manifest.json` (若 crawler content script 需預先注入 sanitizer)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (更新模組字典與分工架構)
- [x] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` (更新檔案清單與職責索引)
- [x] L4 任務生命週期：`0.doc_mg/tasks/task_20261002_finance_dashboard_modularization_phase2.md`

## 3. 任務拆解

### Phase 1: CSS 樣式第二輪解耦 狀態：`[已完成]`
- [x] 任務 1.1: 萃取 `dashboard-stock.css` (個股 Hero、財務指標、損益表、市場專題樣式)
- [x] 任務 1.2: 萃取 `dashboard-components.css` (AI 研報卡片、匯出中心下拉面板、Toast、Modal 樣式)
- [x] 任務 1.3: 淨化 `dashboard.css`，並於 `dashboard.html` 引入新樣式檔，驗證視覺無回歸

### Phase 2: Render 渲染器與分頁標籤解耦 狀態：`[已完成]`
- [x] 任務 2.1: 建立 `dashboard-tabs-render.js` (抽離族群分頁、自訂標籤與底部分頁之渲染邏輯)
- [x] 任務 2.2: 淨化 `dashboard-render.js` 並於 `dashboard.html` 註冊新渲染腳本

### Phase 3: Dashboard 主控制器邏輯解耦 狀態：`[已完成]`
- [x] 任務 3.1: 建立 `dashboard-tabs.js` (承接族群與主題標籤之資料狀態與 CRUD 操作)
- [x] 任務 3.2: 建立 `dashboard-ai.js` (承接本機 AI 連線測試、研報請求、推論結果狀態管理)
- [x] 任務 3.3: 淨化 `dashboard.js`，回歸輕量核心協調整合器

### Phase 4: Crawler 數值清洗函式庫抽離與驗收 狀態：`[已完成]`
- [x] 任務 4.1: 建立 `crawler-sanitizer.js` (萃取數值清洗與 Miner Schema 正規化純函數)
- [x] 任務 4.2: 淨化 `crawler.js`，更新 `manifest.json` (如有需要)
- [x] 任務 4.3: 全面功能回歸測試（個股爬取、同業矩陣、估值沙盒、AI研報、分頁管理）
- [x] 任務 4.4: SSOT 閉環（更新 L1 專家技能與 L2 導航）並封存任務檔

## 4. 影響評估
- **效能提升**: 單檔行數顯著縮減，提升瀏覽器解析效率與開發者維護速度。
- **高向後相容**: 透過 `window.DashboardRender`、`window.DashboardTabs` 等命名空間掛載，既有事件與呼叫點保持零中斷。
- **安全與合規**: 100% 符合 Manifest V3 規範，無跨域危險代碼或動態 eval。

## 5. 驗收標準
- [x] **技術指標**: 分拆後之所有檔案行數均降至 300~650 行健康區間，無任何檔案超過 700 行。
- [x] **介面一致性**: 保持原生純 JS (IIFE 命名空間)，無全域變數污染或衝突。
- [x] **功能完整性**: 儀表板所有現存功能（個股檢視、族群分類切換/增刪、主題標籤、AI 研報、同業矩陣、估值沙盒）運作完全正常。
- [x] **檔案編碼**: 確認所有新增與修改檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 L1 技能與 L2 README 之同步回寫。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: d9515917-50b2-46f5-b2fc-33f11020b882 (擴大分析與 Phase 2 藍圖建立)
> - 2026-10-02 ID: b2897b68-e2ff-463e-a1b9-0a7fbd7d37d2 (完成 Phase 1: CSS 樣式第二輪解耦)
> - 2026-10-02 ID: 11cc381e-276c-4822-befe-77ddd9e27a4b (完成 Phase 2: Render 渲染器與分頁標籤解耦)
> - 2026-10-02 ID: 3a2f5d4c-b376-4be3-8fff-5548adc168e9 (完成 Phase 3: Dashboard 主控制器邏輯解耦，撰寫自動化 Python 腳本執行)
> - 2026-10-02 ID: 95f9a7f5-f80a-4e08-a505-3e7da65e6027 (完成 Phase 4: Crawler 數值清洗函式庫抽離、跨環境注入更新、全單元測試與 SSOT 閉環結案)


