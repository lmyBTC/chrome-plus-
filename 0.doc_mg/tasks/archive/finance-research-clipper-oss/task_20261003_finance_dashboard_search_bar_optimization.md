---
title: "Finance Clipper 儀表板頂部搜尋列排版優化與標的標籤清理"
plugin: "finance-research-clipper-oss"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-03"
---

## 1. 目標
依據使用者回饋與需求，修復並優化 `finance-research-clipper-oss` 插件中 `dashboard.html` 頂部導航列排版：
1. 移除搜尋框右側擠壓版面的固定標的標籤群（Topic Tags：NVDA, TSLA, AAPL, MSFT, 2330 及新增按鈕）。
2. 解除搜尋列被壓縮導致 placeholder 截斷的排版缺陷，提供寬敞舒適的輸入體驗。
3. 確保 JS 邏輯具備良好相容性與防禦性，無 DOM 空值報錯。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/dashboard.html`
- `./finance-research-clipper-oss/dashboard.css`
- `./finance-research-clipper-oss/dashboard-tabs.js`
- `./finance-research-clipper-oss/dashboard-tabs-render.js`
- `./finance-research-clipper-oss/dashboard.js`
- `./0.doc_mg/tasks/bug.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (單純 HTML/CSS 排版微調與相容性清理，無元件新增刪除、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md`
- [ ] L2 插件導航：`./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`
- [ ] L3 業務規格：`./finance-research-clipper-oss/docs/`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`

## 3. 任務拆解

### Phase 1: 搜尋列結構清理與樣式優化 狀態：`[完成]`
- [x] 任務 1.1: 移除 `dashboard.html` 頂部的 `topic-tags-container` HTML 結構
    - [x] 從頂部導航列中清理 `topic-tags-container`、`topic-tags-list` 與 `btn-add-topic-tag` DOM 節點
- [x] 任務 1.2: 優化 `dashboard.css` 中 `.search-container` 與 `.search-input-wrap` 樣式
    - [x] 調整 `.search-container` 的寬度限制與彈性排版，讓搜尋框在不同解析度下具備寬敞視野
    - [x] 確保 `btn-crawl` 與輸入框和諧併排，消除右側擁擠感

### Phase 2: 腳本安全防禦與相容性適配 狀態：`[完成]`
- [x] 任務 2.1: `dashboard-tabs.js` 與 `dashboard-tabs-render.js` 防禦性檢查
    - [x] 在 `topicTagsList` 元素不存在時安全退出，避免空值操作引發例外
    - [x] 檢查並優化 `renderTopicTags` 呼叫邏輯
- [x] 任務 2.2: `dashboard.js` 整合檢驗
    - [x] 確保事件監聽與初始化流程正常執行，無未捕獲錯誤

### Phase 3: 驗證、清理與任務歸檔 狀態：`[完成]`
- [x] 任務 3.1: 完整性驗證
    - [x] 檢查 `dashboard.html` 畫面表現與控制台 Console，確認無任何腳本報錯
- [x] 任務 3.2: 歸檔與清理
    - [x] 清理或更新 `0.doc_mg/tasks/bug.md`
    - [x] 將本任務檔案移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/` 封存

## 4. 影響評估
- 本次改動僅涉及儀表板頂部搜尋列 HTML/CSS 版面與對應標籤掛載防禦，未更動核心爬蟲架構、資料儲存結構或跨插件通訊協定，影響範圍局部且風險極低。

## 5. 驗收標準
- [x] **視覺效果**: `dashboard.html` 頂部搜尋列寬敞清晰，不再出現字元截斷擠壓；原固定標籤群已成功移除。
- [x] **功能運作**: 股票代號輸入與「深度採集」按鈕功能運作正常。
- [x] **除錯清理**: 瀏覽器控制台無任何 null reference 或未處理錯誤。
- [x] **SSOT 閉環**: [x] 輕量任務豁免。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/finance-research-clipper-oss/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 9a412646-bdd3-4c7f-be0e-a8f4d3db6290 (Gate 1 初始化完成)
> - 2026-10-03 ID: 65c501f6-80a2-47fd-bd43-59df41491c07 (Phase 1 執行完成)
> - 2026-10-03 ID: 26b78614-1f6c-479b-98db-13fa8dcfa2b3 (Phase 2 & Phase 3 執行完成與歸檔)
>
> **任務已圓滿結案並歸檔，無須接力。**
