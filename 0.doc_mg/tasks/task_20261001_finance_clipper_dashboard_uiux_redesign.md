---
title: "Finance Clipper 儀表板 UI/UX 重構：族群分頁連動、頂部輸出中心收納與自訂主題標籤"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-01"
deadline: "2026-10-02"
---

## 1. 目標
重構 `finance-research-clipper-oss` 儀表板 (`dashboard.html`) 的版型與互動體驗，解決原版型雙重導航衝突與畫面空間擁擠問題：
1. **底部族群分類 Tab 列**：將底部 Tab 列改為可編輯、可新增、可切換的「族群分類選單」，切換 Tab 時左側邊欄即時動態連動切換對應族群的股票清單。
2. **頂部研究與輸出中心收納**：將原卡片下方冗長的「投資筆記與一鍵輸出中心」（包含加入今日作戰戰役、複製 Markdown、下載 CSV、發送 GAS、批次同步）收納至頂部導航列的新增下拉面板/抽屜，徹底釋放主畫面垂直空間。
3. **頂部可編輯主題式分類**：移除原硬編碼的 NVDA/TSLA/AAPL/MSFT/2330 快捷標籤，改為支援使用者自行新增、編輯、刪除的主題式分類標籤（Topic Tags）。

## 2. 策略與鎖定檔案

### 核心策略
- **資料模型相容性**：升級 Chrome Storage 本地儲存結構，新增 `categories`（族群清單，如 `[{ id, name }]`）與 `activeCategoryId`，並將現有股票歷史清單資料相容映射至所屬族群（預設分類為「全部標的」或「自選核心」），確保既有使用者爬取資料 100% 完整無損。
- **主題分類標籤（Topic Tags）獨立存儲**：將頂部標籤存儲於 `custom_topic_tags`，提供點擊標籤快速過濾或快速採集能力，支援即時新增與刪除。
- **頂部工具收納下拉層 (Flyout / Drawer)**：以無干擾的 Modern Glassmorphism 下拉浮動面板整合筆記輸入框與 5 顆操作按鈕，支援快捷鍵或按鈕開關，保持原有 API 通訊與跨插件 (ScrumClock) 協同契約不變。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/dashboard.html`
- `finance-research-clipper-oss/dashboard.css`
- `finance-research-clipper-oss/dashboard.js`
- `finance-research-clipper-oss/dashboard-render.js`
- `finance-research-clipper-oss/dashboard-actions.js`
- `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`

## 3. 任務拆解

### Phase 1: 底部 Tab 列改制為族群分類選單（連動左側邊欄） 狀態：`[完成]`
- [x] 任務 1.1: 資料層適配與族群模型建立
    - [x] 在 `dashboard.js` 與存儲層建立族群分類結構（支援預設群組：全部標的、自選核心、科技半導體等）與既有資料平滑遷移。
- [x] 任務 1.2: 底部族群 Tab 列 UI 重構與互動實作
    - [x] 修改 `dashboard.html` 底部 Footer 結構，支援新增族群按鈕、族群切換、雙擊或按鈕編輯族群名稱、刪除族群。
    - [x] 在 `dashboard-render.js` 實現 `renderCategoryTabs` 取代原舊版 `renderSheetTabs`。
- [x] 任務 1.3: 族群與左側歷史清單連動過濾
    - [x] 切換底部族群 Tab 時，即時重新過濾並渲染左側「歷史追蹤清單」，左側清單僅顯示屬於當前族群之標的。
    - [x] 支援標的在不同族群之間的歸類移動或預設綁定。

### Phase 2: 頂端列整合收納「研報筆記與一鍵輸出中心」 狀態：`[完成]`
- [x] 任務 2.1: 頂部導航列新增輸出中心下拉選單 UI 結構
    - [x] 在 `dashboard.html` 頂部右側新增「✍️ 研報筆記與輸出中心」按鈕與下拉浮動面板 (Dropdown Popover/Drawer)。
    - [x] 遷移文字框 `dashboard-note-input` 與 5 顆功能按鈕（加入今日戰役、複製 MD、下載 CSV、發送 GAS、批次同步）。
    - [x] 移除 `main` 內容區原本佔位之 `action-panel`，釋放垂直捲動空間。
- [x] 任務 2.2: 樣式微調與互動事件轉移
    - [x] 在 `dashboard.css` 補齊下拉面板之玻璃擬態 (Glassmorphism)、平滑過渡、點擊外部關閉 (Click Outside) 效果。
    - [x] 確保 `dashboard-actions.js` 內原本對 `btn-add-scrum-task`、`btn-copy-markdown` 等按鈕之監聽正常運作，無毀損原有跨插件通訊。

### Phase 3: 頂端列改為可編輯主題式分類標籤（Topic Tags） 狀態：`[完成]`
- [x] 任務 3.1: 移除硬編碼標籤並建立主題標籤 UI
    - [x] 移除 `dashboard.html` 中固定的 `NVDA`, `TSLA`, `AAPL`, `MSFT`, `2330` 靜態按鈕。
    - [x] 建立主題標籤容器與「+ 新增主題」按鈕。
- [x] 任務 3.2: 主題標籤的 CRUD 與本地儲存
    - [x] 在 `dashboard.js` 中實現自訂主題標籤的新增、刪除（點擊 x）與持久化儲存 (`custom_topic_tags`)。
    - [x] 點選主題標籤可觸發搜尋採集或標籤篩選功能。

### Phase 4: 樣式校正、SSOT 閉環與驗收 狀態：`[完成]`
- [x] 任務 4.1: 全面介面佈局調整與圖示修復
    - [x] 修正核心指標區 `arrow_upward` 破圖現象（改為清晰內嵌 SVG，於 `dashboard-render.js`、`crawler.js` 與 `popup-scraper.js` 健全化過濾與渲染）。
    - [x] 調整主數據卡片排列均稱度，消除落單空隙（自適應 flex-wrap 均稱排版與微互動強化）。
- [x] 任務 4.2: SSOT 文檔回寫與防呆審計
    - [x] 更新 `finance-research-clipper-oss/FINANCE_CLIPPER_README.md`，記載新版雙層族群導航與頂部工具面板規格。
    - [x] 確認控制台無任何 JS 報錯，代碼乾淨符合 MV3 規範。

## 4. 影響評估
- **Storage 結構相容性**：歷史爬取數據維持相容，新增 `clipper_categories` 與 `clipper_topic_tags` 鍵值，若無舊設定自動給予預設值，不影響舊標的展示。
- **跨插件通訊相容性**：「🎯 加入今日作戰戰役」保留原本傳遞至 `chrome_scrumclock` 的事件與格式，通訊契約零影響。
- **視覺體驗**：消除底部與左側雙導航衝突，大幅減少視窗垂直溢出與捲軸。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (如 FINANCE_CLIPPER_README.md)。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-01 ID: 759758d7-a145-49c6-b00a-57cf8d2d9719 (Gate 1 藍圖初始化)
> - 2026-10-01 ID: 40fed41b-e629-47e9-a236-bbecdc2e2ea8 (Phase 1 底部族群 Tab 與左側連動實作完成)
> - 2026-10-01 ID: d95c68df-9e86-462b-a813-69d888cdcf4c (Phase 2 頂端列整合收納「研報筆記與一鍵輸出中心」實作完成)
> - 2026-10-01 ID: c59f4bdb-faaa-4546-a8e9-face8b63d896 (Phase 3 頂端列改為可編輯主題式分類標籤實作完成)
> - 2026-10-01 ID: 91903d43-7d61-4a2d-bc40-4c99126078fd (Phase 4 樣式校正、SSOT 閉環與全專案驗收完成)
>
> **專案結案狀態**:
> 所有 Phase (Phase 1 ~ Phase 4) 均已 100% 執行完畢，SSOT 文件已同步回寫，程式碼無語法報錯，隨時可於 Chrome 中載入體驗。
