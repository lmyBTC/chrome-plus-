---
title: "強化 Token 節省檢索與維護工具鏈於 Task 流程之強制調用機制"
plugin: "global"
status: "已完成"
created: "2026-10-12"
deadline: "2026-10-12"
---

## 1. 目標
解決現有開發生態中 `1.devtools` 工具鏈（如 `repo_radar.py`、`code_skeleton.py`、`compact_log.py`、`audit_manifests.py`、`doc_cross_ref.py` 等）在任務流程中未被有效觸發與調用的問題。透過在 `task_template_v2.md`、`.agents/rules.md`、任務協議技能與管理文件中建立「強制門禁條件」與「工具調用檢核矩陣」，確保 Agent 在 Gate 1 探勘、Gate 2 執行、終端輸出與驗收結案時必然調用對應工具。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./0.doc_mg/task_template_v2.md`
- `./.agents/rules.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/skills/token-saver/SKILL.md`
- `./0.doc_mg/docs/task_manager.md`
- `./1.devtools/README.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (新增工具鏈調用門禁檢核與 SOP)
- [x] L1 專家技能：`./.agents/skills/token-saver/SKILL.md` (同步更新任務觸發矩陣)
- [x] L2 插件導航：`./1.devtools/README.md` (更新任務流程各階段工具調用映射手冊)
- [x] L3 業務規格：`./0.doc_mg/docs/task_manager.md` (任務生命週期中各 Gate 工具調用強制規範)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 任務範本 (`task_template_v2.md`) 工具鏈檢核點嵌入 狀態：`[已完成]`

### Phase 2: 頂層規範與門禁協議 (`.agents/rules.md`) 工具強制鏈條升級 狀態：`[已完成]`

### Phase 3: 專家技能與治理指引全面對齊與驗收 狀態：`[已完成]`

## 4. 影響評估
- 本任務僅調整工作區規範、提示詞技能、任務範本與文檔，不變更各 Chrome 插件原始碼。
- 透過硬性流程門禁能大幅降低日常開發中 Agent 的無效全文讀取與終端雜訊輸出，節省 70%~90% 上下文 Token，防止注意力退化。

## 5. 驗收標準
- [x] **技術指標**: 任務範本與各規範文件皆明確標記各階段（Gate 1 探勘、Gate 2 實作與建置、結案審計）之對應工具指令。
- [x] **核心規範**: 符合路徑跳轉雙軌制（內部純字串相對路徑，對話框提供 file:/// 連結）。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 Target SSOTs 宣告之 L1~L4 回寫與歸檔。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-12 ID: 0c142191-3761-4f1b-9599-b608b49dfc98 (Gate 1 藍圖建立)
> - 2026-10-12 ID: 47bac705-a4a9-4a60-91a2-174ee75ed6f9 (Phase 1 範本與任務流程工具鏈嵌入完成、Phase 2 頂層規範升級完成)
> - 2026-10-12 ID: f53b4817-fbeb-4653-8ddb-2989b28b290e (Phase 3 專家技能與治理指引全面對齊與驗收完成，任務結案)
