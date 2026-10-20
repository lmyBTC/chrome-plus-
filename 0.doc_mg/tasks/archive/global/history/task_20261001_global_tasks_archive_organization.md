---
title: "全面整理與分類 0.doc_mg/tasks/archive 歷史任務檔案及標準化歸檔流程"
plugin: "global"
status: "已完成"
created: "2026-10-01"
deadline: "2026-10-01"
---

## 1. 目標
1. 全面整理 `0.doc_mg/tasks/archive/` 根目錄下散落之歷史任務檔案，分類歸入對應插件與全域子目錄中。
2. 同步更新與標準化任務管理指南 (`0.doc_mg/docs/task_manager.md`) 及任務協議技能 (`.agents/skills/task-protocol/SKILL.md`)，明確規範日後任務封存的標準作業程序 (SOP) 與歸檔子目錄結構。

## 2. 策略與鎖定檔案

### 核心策略
1. **目錄結構標準化與 SSOT 閉環**：
   - 明確訂定 5 大歸檔子目錄：
     - `0.doc_mg/tasks/archive/chrome_scrumclock/`
     - `0.doc_mg/tasks/archive/chrome_video speed plus/`
     - `0.doc_mg/tasks/archive/finance-research-clipper-oss/`
     - `0.doc_mg/tasks/archive/browser-activity-monitor/`
     - `0.doc_mg/tasks/archive/global/`
   - 將封存規範同步至 `0.doc_mg/docs/task_manager.md` 與 `.agents/skills/task-protocol/SKILL.md`。
2. **無破壞性安全遷移**：
   - 採用移動（Move）方式歸位，嚴格遵守「不刪除任何檔案」的使用者準則。
   - 不更動檔案內部內容或時間標記，維持完整稽核記錄。
3. **路徑一致性**：
   - 維持純字串相對路徑規範。

### 鎖定檔案 (Target Files)
- 任務管理指引：`0.doc_mg/docs/task_manager.md`
- 專家技能字典：`.agents/skills/task-protocol/SKILL.md`
- 任務追蹤記錄：`0.doc_mg/tasks/task_20261001_global_tasks_archive_organization.md`

## 3. 任務拆解

### Phase 1: 遷移 Chrome ScrumClock 任務檔案 狀態：`[已完成]`
### Phase 2: 遷移 VideoSpeed、FinanceClipper 與 BrowserActivityMonitor 任務檔案 狀態：`[已完成]`
### Phase 3: 遷移 Global 任務檔案並驗證收斂 狀態：`[已完成]`
### Phase 4: 更新與標準化歸檔流程文件 狀態：`[已完成]`

## 4. 影響評估
- 強化文件管理與規範一致性，確保未來所有完成之任務檔案均能被正確歸類至標準目錄，避免根目錄散落雜亂。
- 不影響任何插件執行階段程式碼。

## 5. 驗收標準
- [x] **檔案完整性**: 歷史任務檔案已完整歸納入對應子目錄。
- [x] **流程文件同步**: `0.doc_mg/docs/task_manager.md` 已載入最新 5 大封存子目錄與 SOP。
- [x] **專家技能同步**: `.agents/skills/task-protocol/SKILL.md` 已補齊封存協議與防呆檢查。
- [x] **路徑規範遵守**: 所有文件維持純字串相對路徑。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-01 ID: 10ce59de-41e0-4a18-a1e5-e0344a24058f (初始化)
> - 2026-10-01 ID: 468f2338-75fa-418d-9f93-b5283b3071ad (Phase 1, Phase 2 執行)
> - 2026-10-01 ID: 97ea4252-dc41-4669-a7ae-be78d624bacd (Phase 3 執行)
> - 2026-10-01 ID: d975b841-37e7-4396-8edf-fd6d65441491 (規劃並執行 Phase 4 歸檔流程文件更新，全案圓滿收斂)
>
> **狀態**: 全數階段已完成，任務圓滿收斂。
