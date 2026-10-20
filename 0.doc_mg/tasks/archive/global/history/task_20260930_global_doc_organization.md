---
title: "標準格式文件與文檔目錄結構歸納整理"
plugin: "global"
status: "已完成"
created: "2026-09-30"
deadline: "2026-09-30"
---

## 1. 目標
將散落在 `0.doc_mg/` 根目錄下的標準規格、開發指南與 Agent 優化文件（`dev_standards.md`、`chrome_agent_optimization.md`、`task_manager.md` 等），統一收斂至 `0.doc_mg/docs/` 目錄，使 `0.doc_mg/` 目錄層級清晰、職責分明（`docs/` 統整所有標準文件，`tasks/` 追蹤任務，根目錄維持最少核心範本與工具），並全面更新相依路徑引用（`README.md`、`GEMINI.md`、`.agents/` 技能與規範），確保單一真理源（SSOT）與跨環境相容。

## 2. 策略與鎖定檔案
- 統一收納標準：
  - `0.doc_mg/docs/`：存放全域靜態架構規格、開發標準、通訊契約與優化指南。
  - `0.doc_mg/` 根目錄：僅保留核心任務範本 `task_template_v2.md` 以及執行目錄（`docs/`、`tasks/`、`scripts/`、`tools/`）。
- 實作遷移方案：
  - 移動 `0.doc_mg/dev_standards.md` -> `0.doc_mg/docs/dev_standards.md`
  - 移動 `0.doc_mg/chrome_agent_optimization.md` -> `0.doc_mg/docs/chrome_agent_optimization.md`
  - 移動 `0.doc_mg/task_manager.md` -> `0.doc_mg/docs/task_manager.md`
  - 保留 `0.doc_mg/docs/cross_plugin_contract.md`
- 相依更新：
  - 全域規則 `GEMINI.md`、`.agents/rules.md`、根目錄 `README.md`
  - 專家技能 `task-protocol/SKILL.md`、`dev-standards/SKILL.md`、`token-saver/SKILL.md`

### 鎖定檔案 (Target Files)
- `./0.doc_mg/docs/dev_standards.md`
- `./0.doc_mg/docs/chrome_agent_optimization.md`
- `./0.doc_mg/docs/task_manager.md`
- `./0.doc_mg/docs/cross_plugin_contract.md`
- `./README.md`
- `./GEMINI.md`
- `./.agents/rules.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/skills/dev-standards/SKILL.md`

## 3. 任務拆解

### Phase 1: 實體標準文件收納至 `0.doc_mg/docs/` 狀態：`[已完成]`

### Phase 2: 全域相依路徑與 SSOT 引用同步 狀態：`[已完成]`

## 4. 影響評估
- 本任務純屬文件與規格收納架構調整，不更動各插件（`chrome_scrumclock`、`chrome_video speed plus`、`finance-research-clipper-oss`、`browser-activity-monitor`）的執行原始碼與 Manifest 配置。
- 對於 AI Agent 與開發者，所有標準格式文件均統一定位在 `0.doc_mg/docs/`，檢索更單純直覺。

## 5. 驗收標準
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **目錄整潔**: 標準規格文件已收納至 `0.doc_mg/docs/`（根目錄舊檔案待使用者手動清理）。
- [x] **SSOT 文件同步**: `README.md`、`GEMINI.md` 與 `.agents/` 技能字典之相對路徑已全面同步更新。
- [x] **路徑防呆**: 專案文檔內部全數維持最簡相對路徑，無硬編碼本機絕對路徑。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-30 ID: 475aaf5b-0562-4e80-9287-27cec5c51066 (初始化)
> - 2026-09-30 ID: 6122174c-5367-4291-bdf0-1635e2afbd7e (Phase 1 完成)
> - 2026-09-30 ID: 63f92869-f43d-4541-836c-b996e73ef83c (Phase 2 全域路徑同步完成並結案)

