---
title: "ScrumClock 專案規劃看板 UI/UX 深度視覺與佈局體驗優化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-09"
deadline: "2026-10-10"
---

## 1. 目標
針對 ScrumClock 擴充功能中「專案規劃看板（Project Management Dashboard）」之高資訊密度介面進行現代化 UI/UX 視覺與佈局精修，解決目前工具列堆疊擁擠、外層容器寬度侷限（max-w-6xl 導致兩側大面積黑邊而四欄看板窄縮擠壓）、操作層級不分明、微標籤留白緊迫等問題，打造具有呼吸感、高層次質感與極簡敏捷風格的暗色系體驗。

## 2. 策略與鎖定檔案
- 解放外層容器寬度限制：由固定 `max-w-6xl` 升級為寬螢幕自適應排版（`max-w-[1600px] w-full px-6`），使看板 4 欄具備充足展開寬度與閱讀空間。
- 頂部與快捷工具列重整降噪：
  - 頂部導航列按鈕（Google Tasks、試算表、站會 Copilot、Gemini 狀態）微調群組間距、懸浮反饋與精緻化色彩層級。
  - 提示橫幅採用更典雅的毛玻璃暗色背景與收折質感。
  - 新增任務輸入框與檢視切換、進階按鈕進行響應式重整，減少垂直堆疊感。
- 四欄看板（BoardView）佈局與微交互強化：
  - 統一欄位標頭卡片感，增加 WIP 計數膠囊精緻度。
  - 優化卡片（TaskCard）內部元素間距、優先級標籤、番茄鐘進度與快捷流轉按鈕（如「常態 Doing」）之排版，杜絕擠壓變形。
  - 空白狀態（Empty State）插圖與提示文字柔和化。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`
- `chrome_scrumclock/src/dashboard/components/BoardView.tsx`
- `chrome_scrumclock/src/dashboard/components/TaskCard.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (純 UI/UX 樣式與排版調整，無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`
- [ ] L3 業務規格：`./chrome_scrumclock/docs/web-ai-guard-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/`

## 3. 任務拆解

### Phase 1: 容器寬度解放與頂部儀表板層次優化 狀態：`[已完成]`
### Phase 2: 工具列與新增任務欄降噪重整 狀態：`[已完成]`
### Phase 3: 看板欄位與任務卡片 (BoardView & TaskCard) 細節精修 狀態：`[已完成]`
### Phase 4: 建置驗證與驗收 狀態：`[已完成]`

## 4. 影響評估
- 樣式調整完全局限於 React 呈現層（Tailwind CSS classes），不更動任何資料流、狀態管理（useProjectManagement）與 Chrome Storage 結構。
- 不影響 Chrome Extension 權限與 Service Worker 通訊。
- 零破壞性，100% 向後相容。

## 5. 驗收標準
- [x] **技術指標**: 完全相容 Tailwind CSS 與 React 18，編譯無警告無報錯。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與本專案代碼風格。
- [x] **除錯清理**: 無殘留臨時測試代碼。
- [x] **檔案編碼**: 確認所有修改檔案皆為 UTF-8 (無 BOM)。
- [x] **SSOT 閉環（二選一）**:
  - [x] [N/A] 輕量任務豁免（純 UI/UX 調整，L1~L3 免比對免回寫）
  - [ ] 重大架構同步完成
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議歸檔至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: `npm run build` 成功建置，打包產物結構完整。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-09 ID: 4451bbaa-7a7b-42e5-845f-89b79ca52cb7 (初始化 Gate 1 藍圖)
> - 2026-10-09 ID: 04527ce5-64ed-4f4b-8da8-a3bdc1ba1745 (完成 Phase 1 容器解放與導航優化)
> - 2026-10-09 ID: d9aa52ef-1380-4314-bb1d-f988a98c1b5a (完成 Phase 2 工具列與新增任務欄降噪重整)
> - 2026-10-09 ID: af04e96e-cde9-4ea0-ae56-542547c5e60c (完成 Phase 3 看板欄位與任務卡片細節精修)
> - 2026-10-09 ID: a1afdb8c-c95b-4cb0-9196-a3cd3d8ece04 (完成 Phase 4 建置驗證與封存歸檔結案)
