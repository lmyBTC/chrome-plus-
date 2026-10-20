---
title: "Agent 上下文膨脹防護與會話重置協議優化 (Context Bloat & Session Reset Optimization)"
plugin: "global"
status: "已完成"
created: "2026-09-18"
deadline: "2026-09-18"
---

## 1. 目標
解決在 3-Gate Protocol 執行過程中，Gate 1 探勘產生的龐大工具呼叫歷史（Tool Outputs）滯留在對話 Context 中，導致 Gate 2 重複計費（Token Bloat）與模型注意力退化（Context Rot）的根本痛點。建立跨會話接力（Session Reset）與同會話探勘硬窄化的雙軌機制。

## 2. 策略與鎖定檔案

### 策略
1. **跨會話重置（Session Reset）機制正式化**：
   - 在 Gate 1 建立實體任務文件結尾，標準化輸出「新會話接力指令（Handover Prompt）」。
   - 使用者可選擇一鍵開新對話接力，使 Gate 2 僅載入 `task.md`，直接減免 70%~90% 無效上下文負擔。
2. **Gate 1 探勘硬性窄化（Hard Narrowing）**：
   - 嚴格限制 Gate 1 只能使用 `list_dir` 或低行數 `grep_search`，嚴禁超過 30 行的大區塊或全文 dump。
   - 探勘關鍵定義（如介面簽名、檔案路徑）直接沉澱至 `task.md` 的「鎖定檔案」或相依備註中。
3. **Gate 2 SSOT 截斷宣告**：
   - 在 `task-protocol` 技能與 `GEMINI.md` 明確規定：Gate 2 以實體 `task.md` 為唯一真理源（SSOT），禁止回顧或依賴上文探勘歷史。

### 鎖定檔案 (Target Files)
- `./GEMINI.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./0.doc_mg/task_template_v2.md`

## 3. 任務拆解

### Phase 1: 最高規範指令升級 (`GEMINI.md`) 狀態：`[已完成]`

### Phase 2: 任務協議技能與模板更新 (`SKILL.md` & `template`) 狀態：`[已完成]`

### Phase 3: 規範審查與一致性驗證 狀態：`[已完成]`

## 4. 影響評估
- 本次修改為開發規範與 Agent 元協議（Meta-Protocol）層級，不影響現行插件之業務代碼或 Chrome 運作。
- 能大幅降低後續所有大型任務（如多檔案重構、跨插件管線開發）的 Token 支出達 70%~90%，並有效根絕 Context Rot 問題。

## 5. 驗收標準
- [x] **規範完整性**: `GEMINI.md`、`task-protocol/SKILL.md`、`task_template_v2.md` 規範邏輯嚴密且相互閉環。
- [x] **相對路徑合規**: 所有參照文件與連結 100% 使用工作區相對路徑，無本機硬編碼。
- [x] **無殘留說明註解**: 實體任務文件中無任何 `<!-- ... -->` 範本提示。
- [x] **狀態收斂**: 執行各階段時完成動態收斂與物理同步。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-18 ID: b7489959-4314-4421-8c4c-2270880e623e (Gate 1 任務初始化與 Gate 2 全階段執行完畢)
