---
title: "任務協議強制武器庫鏈條與探勘硬窄化優化"
plugin: "agents"
status: "已完成"
created: "2026-10-07"
deadline: "2026-10-07"
---

## 1. 目標
修補 Gate 1「精準唯讀掃描」條文漏洞，將 `1.devtools/tools/code_skeleton.py` 與 `repo-radar` 探勘工具鏈升級為憲法級「強制調用硬防線」。根除 Agent 面對大型代碼時依賴原生 `view_file` / 盲猜 `grep` 造成之 Token 巨量浪費與上下文退化（Context Rot），使 Gate 1 探勘消耗降低 70%~85%。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/rules.md`
- `./0.doc_mg/task_template_v2.md`
- `./0.doc_mg/docs/token_optimization_guide.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md`
- [ ] L2 插件導航：`[N/A]`
- [x] L3 業務規格：`./0.doc_mg/docs/token_optimization_guide.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/agents/`

## 3. 任務拆解

### Phase 1: 核心任務協議技能升級 (`task-protocol/SKILL.md`) 狀態：`[已完成]`

### Phase 2: 專案總規與範本防線同步 (`rules.md` & `task_template_v2.md`) 狀態：`[已完成]`

### Phase 3: 指南文檔閉環與合規審查 狀態：`[已完成]`

## 4. 影響評估
- 本任務純屬 AI Agent 開發協議、規範與文檔優化，不涉及任何 Chrome 擴充功能之 JavaScript / HTML / CSS / Manifest 原始碼改動。
- 不影響各插件之執行期邏輯與權限，將使後續所有插件開發任務之 Token 消耗顯著降低。

## 5. 驗收標準
- [x] **技術指標**: [N/A] 無 Content Script 注入或 Shadow DOM 變動。
- [x] **核心規範**: 符合全域 SSOT 雙軌制與 3-Gate Protocol。
- [x] **檔案編碼**: 確認所有修改之 Markdown 檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 完成 L1 (`task-protocol/SKILL.md`) 與 L3 (`token_optimization_guide.md`) 實體同步。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/agents/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-07 ID: ffbf1e72-debe-4275-85b5-227e9fe94e98 (初始化)
> - 2026-10-07 ID: f0f89dcd-77f9-42c3-8705-5a346fcf80dd (Phase 1 執行完成)
> - 2026-10-07 ID: 6f44fb2d-59ec-481c-9f46-05aee552a8e0 (Phase 2 執行完成)
> - 2026-10-07 ID: e5caaa42-7c47-4cfc-a515-23832054a3ac (Phase 3 執行完成與結案)

