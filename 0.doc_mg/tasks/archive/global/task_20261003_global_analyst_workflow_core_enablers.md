---
title: "投資研究員 (Analyst) 投研核心賦能器升級 (Core Enablers & Strategic Model)"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-12"
---

## 1. 目標
依據 `0.doc_mg/docs/analyst_workflow_friction_matrix.md` 規劃之階段二 (Core Enabler) 與階段三 (Strategic) 藍圖，實作三大核心投研斷點賦能功能：
1. **同一影片/標的筆記聚合容器 (Session Draft Box)**：消除 VideoSpeedPlus 單場法說會 10+ 散落零碎卡片，收斂為單一草稿箱容器並支援聚合打包導出。
2. **調研任務 Checklist 子項目支援 (Task Checklist)**：標準化 ScrumClock 投研卡片任務（三表比對、資產負債檢視、估值驗證），支援可勾選清單與進度動態計算。
3. **Google Sheets 財務模型底稿直套 (Financial Model Template Export)**：在 FinanceClipper 封裝完整 3-Statement 與 DCF 估值試算模型底稿，透過 GAS Webhook 或 TSV 一鍵產生雲端分析試算表。

## 2. 策略與鎖定檔案

### 核心策略
- **草稿容器聚合 (Session Aggregation)**：在 VideoSpeedPlus 內部建立以當前影片/標的為維度的草稿聚合箱，支援批次時間戳整理、一鍵複製聚合 Markdown，並支援「一鍵整包匯出至 ScrumClock 任務」。
- **結構化子任務 (Checklist Decomposition)**：在 ScrumClock `WeeklyMission` 資料模型中加入 `checklist` 陣列，並在任務看板 (`TaskPoolTab`) 與任務詳情抽屜 (`TaskDetailDrawer`) 渲染勾選狀態與進度條，支援動態增刪與持久化。
- **財務模型直套 (Financial Model Blueprint)**：在 FinanceClipper 估值沙盒中，將損益表、同業對比與估值參數組織為標準投研試算表架構（損益預測、比率分析、DCF 模型公式），支援透過 GAS Webhook 批次寫入或匯出 Clean TSV 範本。

### 鎖定檔案 (Target Files)
- `chrome_video speed plus/popup.html`
- `chrome_video speed plus/popup.js`
- `chrome_video speed plus/content.js`
- `chrome_scrumclock/src/types/index.ts`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskDetailDrawer.tsx`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/briefing/BriefingMissionSelector.tsx`
- `finance-research-clipper-oss/dashboard-valuation-actions.js`
- `finance-research-clipper-oss/dashboard-valuation-render.js`
- `finance-research-clipper-oss/dashboard-actions.js`
- `finance-research-clipper-oss/dashboard.html`
- `0.doc_mg/docs/analyst_workflow_friction_matrix.md`
- `0.doc_mg/docs/google_ecosystem_integration_spec.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：.agents/skills/video-speed-core/SKILL.md、.agents/skills/scrumclock-core/SKILL.md、.agents/skills/finance-clipper-core/SKILL.md
- [x] L2 插件導航：chrome_video speed plus/VIDEOSPEED_README.md、chrome_scrumclock/SCRUMCLOCK_README.md、finance-research-clipper-oss/FINANCE_CLIPPER_README.md
- [x] L3 業務規格：0.doc_mg/docs/analyst_workflow_friction_matrix.md、0.doc_mg/docs/google_ecosystem_integration_spec.md
- [x] L4 任務生命週期：0.doc_mg/tasks/archive/global/ (結案後封存)

## 3. 任務拆解

### Phase 1: VideoSpeedPlus 法說會/標的筆記聚合草稿箱 (Session Draft Box) 狀態：`[已完成]`

### Phase 2: ScrumClock 卡片 Checklist 子項目標準化 (Task Checklist Support) 狀態：`[已完成]`

### Phase 3: FinanceClipper Google Sheets 財務模型底稿直套 (Financial Model Template Export) 狀態：`[已完成]`

### Phase 4: 跨插件端到端走訪、編譯審計與 SSOT 閉環 狀態：`[已完成]`

## 4. 影響評估
- **資料相容性**：ScrumClock 的 `WeeklyMission.checklist` 為可選欄位，完全向下相容既有任務資料；VideoSpeedPlus 與 FinanceClipper 之擴充均維持既有 LocalStorage 與通訊協定向後相容。
- **效能影響**：草稿箱與 Checklist 資料皆在前端 LocalStorage 進行微型 JSON 操作，無性能損耗；財務模型直套採非同步單次發送，不阻斷主線程。
- **安全合規**：維持無任何外部 CDN 依賴，符合 Manifest V3 CSP 規範，所有外部鏈接均經安全轉義。

## 5. 驗收標準
- [x] **草稿箱聚合**: VideoSpeedPlus 能將同一影片的多筆時間戳筆記聚合於草稿箱，支援一鍵複製聚合 Markdown 與一鍵打包轉入 ScrumClock。
- [x] **Checklist 子項目**: ScrumClock 卡片支援動態新增、勾選、刪除子任務，卡片即時顯示完成進度（如 `☑ 3/5`），重新載入資料不遺失。
- [x] **財務模型直套**: FinanceClipper 能將損益表與估值沙盒數據以標準財務底稿格式（含公式與情境）發送至 Google Sheets GAS 或一鍵複製 Clean TSV 底稿。
- [x] **工程與安全**: ScrumClock TypeScript 編譯 0 錯誤，全插件通過 CSP/XSS 安全檢查。
- [x] **SSOT 閉環**: 完成對應 L1/L2/L3 文檔更新與任務生命週期封存。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: e9a090d1-9a66-4960-b227-1a8d65e6cec8 (Gate 1 Blueprint 初始化完成)
> - 2026-10-03 ID: b13e7d52-38c2-4b20-af6f-7872f186dc41 (Gate 2 Phase 1 實作完成：VideoSpeedPlus 法說會/標的筆記聚合草稿箱)
> - 2026-10-03 ID: 03ffa514-5da3-4747-96b4-8efdbbb475c1 (Gate 2 Phase 2 實作完成：ScrumClock 卡片 Checklist 子項目標準化與看板/晨會指標渲染)
> - 2026-10-03 ID: 486c0243-f380-4fdf-83ec-b0b56fadae13 (Gate 2 Phase 3 實作完成：FinanceClipper Google Sheets 財務模型底稿直套與 Clean TSV 匯出)
> - 2026-10-03 ID: 07571a35-3955-4d4b-85a9-9bff0524b58c (Gate 2 Phase 4 實作完成：端到端走訪、TypeScript/Manifest 審計、四層 SSOT 閉環與封存歸檔)
