---
title: "全面落實規範與技能文件之跨環境相對路徑跳轉連結"
plugin: "global"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-26"
---

## 1. 目標
依據 `GEMINI.md` 憲法核心底線「路徑跳轉雙軌制」原則，全面盤點工作區中所有規範指針（`GEMINI.md`、`.agents/rules.md`）、專家技能字典（`.agents/skills/**/SKILL.md`）及任務範本文件。
將專案內部所有檔案與目錄參照全面收斂為**最簡潔的純字串相對路徑**，徹底杜絕本機絕對路徑與冗長 Markdown 連結標籤引起的 Token 浪費；同時確保 AI 對話框中嚴格遵循 IDE 規範提供 `file:///` 可點擊連結。

## 2. 策略與鎖定檔案

### 核心原則
1. **嚴禁本機絕對路徑**：全專案規範內 100% 消除磁碟機代號、使用者目錄等本機特徵路徑。
2. **極致精簡純字串**：專案內部所有檔案、目錄與指令參照，一律維持純字串或代碼字串格式（如 `.agents/rules.md`、`0.doc_mg/tasks/`），嚴禁在文件內包裝多餘的 Markdown 相對超連結標籤，最大化節省 Token。
3. **AI 對話框可點擊**：僅在 AI 對話框向使用者回覆時，採用 IDE 專用 `file:///` 格式，保障點擊即開。
4. **原子修改與狀態收斂**：在 Gate 2 中使用 `replace_file_content` 進行單點替換與動態收斂。

### 鎖定檔案 (Target Files)
- `GEMINI.md`
- `.agents/rules.md`
- `.agents/skills/task-protocol/SKILL.md`
- `.agents/skills/token-saver/SKILL.md`
- `.agents/skills/dev-standards/SKILL.md`
- `.agents/skills/chrome-auditor/SKILL.md`
- `.agents/skills/scrumclock-core/SKILL.md`
- `.agents/skills/finance-clipper-core/SKILL.md`
- `.agents/skills/video-speed-core/SKILL.md`
- `0.doc_mg/task_template_v2.md`
- `0.doc_mg/task_manager.md`

## 3. 任務拆解

### Phase 1: 頂層規範與執行指針純字串精簡 狀態：`[已完成]`
- [x] 任務 1.1: 檢視並確認 `GEMINI.md` 中的所有檔案參照全面改為簡潔純字串相對路徑。
- [x] 任務 1.2: 檢查並確認 `.agents/rules.md` 中的技能導航與文件參照全面改為簡潔純字串路徑。

### Phase 2: 基礎管理與技術規範技能純字串精簡 狀態：`[已完成]`
- [x] 任務 2.1: 盤點並確認 `.agents/skills/task-protocol/SKILL.md` 內文為純字串路徑，移除所有冗餘 Markdown 連結。
- [x] 任務 2.2: 盤點並確認 `.agents/skills/token-saver/SKILL.md` 保持純文字指令，杜絕 Token 膨脹。
- [x] 任務 2.3: 盤點並確認 `.agents/skills/dev-standards/SKILL.md` 引用為純字串路徑。
- [x] 任務 2.4: 盤點並確認 `.agents/skills/chrome-auditor/SKILL.md` 引用與指令維持純字串。

### Phase 3: 各插件核心規格字典純字串查核 狀態：`[已完成]`
- [x] 任務 3.1: 盤點 `.agents/skills/scrumclock-core/SKILL.md`，確認維持乾淨純字串路徑。
- [x] 任務 3.2: 盤點 `.agents/skills/finance-clipper-core/SKILL.md`，確認維持乾淨純字串路徑。
- [x] 任務 3.3: 盤點 `.agents/skills/video-speed-core/SKILL.md`，確認維持乾淨純字串路徑。

### Phase 4: 任務範本校驗與全專案靜態驗證 狀態：`[已完成]`
- [x] 任務 4.1: 盤點 `0.doc_mg/task_template_v2.md` 與 `0.doc_mg/task_manager.md`，確認均為純字串路徑。
- [x] 任務 4.2: 進行全專案靜態檢索，確認無本機絕對路徑與無效冗餘連結。

## 4. 影響評估
- 徹底消除專案文件內 Markdown 連結帶來的 Token 浪費，極大化精簡 Context。
- 專案內部保持乾淨、可攜性高。
- AI 聊天回覆中維持 `file:///` 格式，使用者體驗 100% 順暢。

## 5. 驗收標準
- [x] **純字串極簡 100% 覆蓋**: 專案內所有檔案參照皆為簡潔純字串相對路徑，零冗餘 Markdown 標籤。
- [x] **本機絕對路徑零殘留**: 工作區文件內無任何硬編碼磁碟代號（如 `c:\` 或 `file:///`）。
- [x] **檔案編碼一致**: 所有修改文件皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **狀態動態收斂**: 各階段完成後即時打勾並落實狀態動態收斂。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 0f42baf2-f778-4777-b9b8-2f1bfc7467e6 (Gate 1 初始化藍圖)
> - 2026-09-26 ID: 32b81dcb-0358-4a24-802d-a0744328241f (Phase 1 & Phase 2 執行完成)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260926_global_rules_skills_relative_paths.md，開始執行 Phase 3
> ```
