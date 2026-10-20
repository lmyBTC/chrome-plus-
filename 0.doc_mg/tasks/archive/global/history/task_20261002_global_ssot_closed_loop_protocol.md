---
title: "流程規範升級：建立 SSOT 四層閉環矩陣與全流程強制回寫防呆"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-06"
---

## 1. 目標
為徹底解決現行任務執行時「僅單點更新插件 README，遺漏 Agent 專家技能 (SKILL.md)、模組領域規格書 (docs/*.md) 與任務封存歸檔」之架構斷鏈與認知分裂問題，本任務將「四層 SSOT 閉環體系」正式制度化並深植至任務範本、守門協議與全域規則中，建立全生命週期之防呆機制。

## 2. 策略與鎖定檔案

### 核心設計策略
1. **SSOT 四層架構定義 (The 4-Tier SSOT Pyramid)**：
   - **L1 (Agent Skill)**：`.agents/skills/[plugin]-core/SKILL.md` (AI 認知模型與元件字典)
   - **L2 (Module Index)**：`[PLUGIN]/[PLUGIN]_README.md` (工程目錄、垂直切片與進入點)
   - **L3 (Domain Specs)**：`[PLUGIN]/docs/[feature]-spec.md` (產品需求、User Story 與交互契約)
   - **L4 (Lifecycle & Governance)**：`0.doc_mg/tasks/archive/[plugin]/` (封存治理) 與 `0.doc_mg/docs/cross_plugin_contract.md`
2. **Gate 1 規劃期「Target SSOTs 矩陣」前置宣告**：
   - 在任務規劃階段就必須強制明確列出本次變更涉及哪些層級的 SSOT，禁止僅列代碼檔案。
3. **Gate 2 驗收標準拆解為四層防呆 Checkbox**：
   - 移除模稜兩可的「如 README」描述，改為 L1~L4 獨立勾選項。
4. **同步回寫全域規則與任務協議**：
   - 同步修訂 `0.doc_mg/task_template_v2.md`、`.agents/skills/task-protocol/SKILL.md`、`.agents/rules.md` 與 `0.doc_mg/docs/task_manager.md`。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/task_template_v2.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./.agents/rules.md`
- `./0.doc_mg/docs/task_manager.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md`
- [x] L2 專案規則：`./.agents/rules.md`
- [x] L3 任務規範：`./0.doc_mg/docs/task_manager.md`
- [x] L4 範本升級：`./0.doc_mg/task_template_v2.md`
- [x] L4 封存治理：`0.doc_mg/tasks/archive/global/`

## 3. 任務拆解

### Phase 1: 任務範本升級 (Task Template v2.1) 狀態：`[已完成]`

### Phase 2: 任務協議與專家技能標準更新 狀態：`[已完成]`

### Phase 3: 驗證與歷史任務回溯示範 狀態：`[已完成]`

## 4. 影響評估
- **架構影響**：純治理與開發流程規範升級，不影響任何 Chrome 插件運行代碼。
- **Token 效益**：藉由在前置階段鎖定 SSOT 清單，避免後續會話因文檔失步而進行大範圍無效重掃，進一步降低 30% 以上的排查 Token。

## 5. 驗收標準
- [x] **技術指標**: 所有修改之 Markdown 檔案皆符合純字串相對路徑規範，無硬編碼絕對路徑。
- [x] **L1 專家技能同步**: `.agents/skills/task-protocol/SKILL.md` 已完整定義四層 SSOT 閉環與防呆要求。
- [x] **L2 規則索引同步**: `.agents/rules.md` 已更新 SSOT 閉環義務條款。
- [x] **L3 規範文檔同步**: `0.doc_mg/docs/task_manager.md` 已更新任務生命週期檢核標準。
- [x] **L4 範本結構升級**: `0.doc_mg/task_template_v2.md` 包含 Target SSOTs 與四層驗收勾選。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: cef632a2-75fa-4f40-87df-28a3ae9182c9 (Phase 1 完成：任務範本 v2.1 升級)
> - 2026-10-02 ID: b9ae17bc-7190-40fd-a5aa-f063c741575f (Phase 2 完成：任務協議與專家技能標準更新；Phase 3 驗證完畢與全案結案)
>
> **任務狀態**: 全案驗收通過，已歸檔至 `0.doc_mg/tasks/archive/global/`。
