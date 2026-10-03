---
title: "投資研究員 (Analyst) 投研工作流 P0 速贏體驗升級 (P0 Quick Wins)"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-10"
---

## 1. 目標
依據 `0.doc_mg/docs/analyst_workflow_friction_matrix.md` 診斷成果，聚焦實作投研高頻日常中價值最高、成本最低之 **P0 速贏功能 (Quick Wins)**。針對「財務表格格式斷裂 (FF-01)」、「法說會快篩盲打調速與標記中斷」以及「跨插件單向拋轉缺乏反向 Deep-Link (AF-03)」三大核心痛點進行精準代碼升級，使投資研究員在數據落試算表與法說會複聽比對中省去 80% 的人工修復代償時間。

## 2. 策略與鎖定檔案

### 核心策略
- **格式潔淨化 (Data Sanitization)**：在 FinanceClipper 儀表板各表格（損益表、同業對比、估值沙盒）提供一鍵複製 Clean TSV/Markdown，內建字串清洗器自動去除千分位逗號、轉換會計負數格式（如 `(123.4)` 轉為 `-123.4`），直貼 Excel/Google Sheets 零錯位。
- **全螢幕盲打體驗 (Blind Operation)**：VideoSpeedPlus 擴充全域鍵盤監聽，在播放視窗中直接以單鍵步進調速（`Alt+[` / `Alt+]` 微調 0.25x）與即時標記書籤（`Alt+M`），無需分心切出彈窗。
- **雙向深度連結 (Bidirectional Deep-Link)**：規範並實作跨插件附帶之 `deepLinkUrl`，ScrumClock 卡片點擊後能反向定位至 YouTube 特定秒數播放，或直接導向 FinanceClipper 指定標的儀表板。

### 鎖定檔案 (Target Files)
- `finance-research-clipper-oss/dashboard.html`
- `finance-research-clipper-oss/dashboard.js`
- `finance-research-clipper-oss/dashboard-actions.js`
- `finance-research-clipper-oss/dashboard-components.css`
- `finance-research-clipper-oss/dashboard-peer-render.js`
- `finance-research-clipper-oss/dashboard-peer-actions.js`
- `finance-research-clipper-oss/dashboard-valuation-render.js`
- `finance-research-clipper-oss/dashboard-valuation-actions.js`
- `chrome_video speed plus/content.js`
- `chrome_video speed plus/popup.html`
- `chrome_video speed plus/popup.js`
- `0.doc_mg/docs/analyst_workflow_friction_matrix.md` (需求真理源)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：.agents/skills/video-speed-core/SKILL.md、.agents/skills/finance-clipper-core/SKILL.md
- [x] L2 插件導航：chrome_video speed plus/VIDEOSPEED_README.md、finance-research-clipper-oss/FINANCE_CLIPPER_README.md
- [x] L3 業務規格：0.doc_mg/docs/analyst_workflow_friction_matrix.md
- [x] L4 任務生命週期：0.doc_mg/tasks/archive/global/ (結案後封存)

## 3. 任務拆解

### Phase 1: FinanceClipper 財務表格 Clean TSV / Markdown 複製與格式清理 (FF-01) 狀態：`[已完成]`
### Phase 2: VideoSpeedPlus 全螢幕盲打連續步進調速與時間戳快捷標記 狀態：`[已完成]`
### Phase 3: 跨插件雙向 Deep-Link 反向跳轉與秒數導航 (AF-03) 狀態：`[已完成]`
### Phase 4: 跨插件全流程走訪、代碼審計與 SSOT 閉環 狀態：`[已完成]`

## 4. 影響評估
- **破壞性評估**：無破壞性。所有新增按鈕與快捷鍵均為漸進式擴充，不變更底層儲存結構。
- **效能影響**：TSV 清洗為純字串處理（<1ms）；鍵盤監聽為單純事件攔截，無額外計算開銷。
- **跨插件相容**：維持標準協約 `COLLECT_NOTE` 與 `CREATE_TASK`，向下相容舊版結構。

## 5. 驗收標準
- [x] **Clean TSV 複製**: 損益表、同業對比與估值沙盒能一鍵複製 TSV，貼入 Excel 數值正確（無千分位逗號且負數正確）。
- [x] **盲打步進調速**: YouTube 播放中按 `Alt+[` / `Alt+]` 能即時以 0.25x 增減速度並顯示回饋。
- [x] **即時書籤標記**: YouTube 播放中按 `Alt+M` 能免彈窗自動記錄時間戳書籤。
- [x] **雙向 Deep-Link**: 跨插件拋送之任務與筆記均帶有可跳轉定位之精準 Deep-Link。
- [x] **代碼合規安全**: 通過 CSP、XSS 安全檢查，無任何語法錯誤。
- [x] **SSOT 閉環**: 完成文檔同步與任務檔案生命週期歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: ac1cefd6-99d8-4f8b-b4cb-0ad34d4ec828 (Gate 1 Blueprint 初始化)
> - 2026-10-03 ID: 8bbee366-5f5e-4a94-a9a5-786d54ae5f5d (Gate 2 Phase 1 完成)
> - 2026-10-03 ID: 3f3aa923-b9d7-4a98-8ef9-987301b7c579 (Gate 2 Phase 2 完成)
> - 2026-10-03 ID: 7a5a65cd-bfef-4338-9766-f365defc933f (Gate 2 Phase 3 完成)
> - 2026-10-03 ID: 298ad048-2c8b-4a65-8605-2f47dbfeb54a (Gate 2 Phase 4 完成 & 結案歸檔)
>
> **任務狀態**：已順利結案，全數通過驗收標準，移交封存。
