---
title: "ScrumClock ProjectManagementDemo 專案管理視圖解耦與看板模組化"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-10-03"
---

## 1. 目標
將 `chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx` (826 行) 解耦重構。
將原本雜揉在單一檔案中的「任務池 (TaskPool)」、「待辦收件匣 (Inbox)」、「歷史衝刺日誌 (SprintLogs)」與「同步設定 Modal」抽離為獨立子元件，使主視圖只負責分頁路由與頂層資料加載。

## 2. 策略與鎖定檔案
在 `chrome_scrumclock/src/features/project-management/components/` 下建立專屬子模組目錄，拆解各 Tab 視圖，並統一透過 Props 傳遞核心 actions（新增/編輯/刪除/同步）。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx` (新增)
- `chrome_scrumclock/src/features/project-management/components/tabs/InboxTab.tsx` (新增)
- `chrome_scrumclock/src/features/project-management/components/tabs/SprintLogsTab.tsx` (新增)
- `chrome_scrumclock/src/features/project-management/components/modals/SyncSettingsModal.tsx` (新增)
- `chrome_scrumclock/SCRUMCLOCK_README.md` (SSOT 文檔維護)

## 3. 任務拆解

### Phase 1: 結構梳理與狀態子元件抽離 狀態：`[已完成]`
- [x] 任務 1.1: 介面定義與狀態職責釐清
    - [x] 定義各 Tab 專用 Props 介面
- [x] 任務 1.2: 抽離待辦收件匣與衝刺日誌
    - [x] 實作 `InboxTab.tsx` (新增任務項目、標籤切換、轉移至每週任務)
    - [x] 實作 `SprintLogsTab.tsx` (衝刺記錄過濾與呈現)

### Phase 2: 核心任務池與同步視窗抽離 狀態：`[已完成]`
- [x] 任務 2.1: 抽離核心每週任務池視圖
    - [x] 實作 `TaskPoolTab.tsx` (每週戰役卡片、狀態拖曳/切換、進度計算)
- [x] 任務 2.2: 抽離雲端雙向同步設定視窗
    - [x] 實作 `SyncSettingsModal.tsx` (Google Tasks / Notion Webhook 同步設定與即時狀態回饋)

### Phase 3: 主視圖組合驗證與 SSOT 更新 狀態：`[已完成]`
- [x] 任務 3.1: 重構 `ProjectManagementDemo.tsx` 整合子元件
    - [x] 驗證 Tab 切換與資料更新正常聯動
- [x] 任務 3.2: 執行專案 Build 檢驗
- [x] 任務 3.3: 更新 `SCRUMCLOCK_README.md` 巨石檔案除名記錄

## 4. 影響評估
- 僅涉及 Project Management 表現層視圖拆解。
- 儲存引擎 (`core/chrome/storage.ts`) 與同步引擎 (`core/api/sync.ts`) 資料結構維持 100% 相容。

## 5. 驗收標準
- [x] **技術指標**: 主元件 `ProjectManagementDemo.tsx` 行數降至 250 行以內（實際降至 156 行）。
- [x] **核心規範**: 資料驅動符合 React 單向數據流，無多餘重新渲染。
- [x] **除錯清理**: 移除所有測試用 `console.log`。
- [x] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 保存。
- [x] **SSOT 文件同步**: 更新 `SCRUMCLOCK_README.md` 索引清單。
- [x] **插件驗證**: `npm run build` 通過，且在 New Tab 檢視專案管理各 Tab 功能均運作正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 2ddf9c50-f3a8-445e-8ada-c5bf528b994c (初始化)
> - 2026-09-27 ID: eb6e42e5-ad6e-4aa8-b42e-1455b398c4ee (Phase 1 執行)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260926_scrumclock_refactor_project_mgmt.md，開始執行 Phase 1
> ```
