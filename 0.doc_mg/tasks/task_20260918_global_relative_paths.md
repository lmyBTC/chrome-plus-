---
title: "全面規範與檔案路徑相對化重構"
plugin: "global"
status: "已完成"
created: "2026-09-18"
deadline: "2026-09-18"
---

## 1. 目標
配合使用者跨裝置、換電腦開發的需求，徹底消除專案規範、技能與核心文件中硬編碼之本機絕對路徑（例如 `file:///c:/Users/...` 與 `c:\Users\G1\...`），並於最高規範（`GEMINI.md`、`.agents/rules.md`、`task_template_v2.md`）增訂「全面強制相對路徑」守則，避免任何本機路徑造成的相容性問題。

## 2. 策略與鎖定檔案
以專案根目錄為基準，將所有 Markdown 連結與路徑參照轉換為工作區相對路徑（例如 `./0.doc_mg/...` 或 `[檔案名](./路徑)`）。同時更新規範原則，嚴禁 AI 或範本引入絕對路徑。

### 鎖定檔案 (Target Files)
1. 核心規範與範本：
   - `GEMINI.md`
   - `.agents/rules.md`
   - `0.doc_mg/task_template_v2.md`
2. Agent 技能組（`.agents/skills/`）：
   - `.agents/skills/task-protocol/SKILL.md`
   - `.agents/skills/dev-standards/SKILL.md`
   - `.agents/skills/chrome-auditor/SKILL.md`
   - `.agents/skills/finance-clipper-core/SKILL.md`
   - `.agents/skills/scrumclock-core/SKILL.md`
   - `.agents/skills/video-speed-core/SKILL.md`
3. 專案管理與進行中文檔：
   - `0.doc_mg/task_manager.md`
   - `0.doc_mg/chrome_agent_optimization.md`
   - `0.doc_mg/scripts/README_GAS_SETUP.md`
   - `0.doc_mg/tasks/task_20260917_global_scrumclock_finance_clipper_integration.md`
4. 插件內說明文檔（現存寫入絕對路徑處）：
   - `chrome_scrumclock/docs/README.md`
   - `chrome_scrumclock/docs/image-scraper-spec.md`
   - `chrome_scrumclock/docs/gemini-nano-tool.md`
   - `chrome_scrumclock/src/features/toolbox/tools/image-scraper/功能說明.md`
   - `chrome_scrumclock/src/features/ai-sidebar/dev-tools/README.md`
   - `finance-research-clipper-oss/docs/chrome-extension-v3-spec.md`
   - `finance-research-clipper-oss/docs/todotask.md`

## 3. 任務拆解

### Phase 1: 核心規範與任務範本路徑相對化 狀態：`[已完成]`

### Phase 2: Agent 技能組路徑全面清理 狀態：`[已完成]`

### Phase 3: 專案文檔與進行中任務路徑修正 狀態：`[已完成]`

### Phase 4: 全專案掃描驗證與狀態收斂 狀態：`[已完成]`

## 4. 影響評估
- 僅涉及 Markdown 規範、技能定義與說明文件之文字與超連結調整。
- 不影響各插件程式碼執行邏輯或 Chrome 擴充功能運行。
- 全面支援跨電腦、不同使用者資料夾（不同 Windows 帳號或 macOS/Linux）之 Git 協同與環境遷移。

## 5. 驗收標準
- [x] **規範完整性**: `GEMINI.md`、`.agents/rules.md` 與 `task_template_v2.md` 皆已明定相對路徑準則。
- [x] **絕對路徑零殘留**: 活躍文件（非 archive）中未再檢出任何 `file:///c:/Users/` 或本機絕對路徑。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **文件同步**: 實體任務藍圖與進度已即時同步收斂。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-18 ID: f18da3a3-99d2-4ee8-a622-5da5586879e6 (初始化)
