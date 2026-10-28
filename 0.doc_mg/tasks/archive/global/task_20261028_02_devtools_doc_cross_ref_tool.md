---
title: "實作 doc_cross_ref.py CLI 審計與自動修復工具並清理文檔死鏈與冗餘語法"
plugin: "global"
status: "已完成"
created: "2026-10-28"
deadline: "2026-10-28"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase 3: 全域自動化驗證與 Gate 3 結案收斂 - 結案)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  - 專案文檔與規範中存在死鏈、遷移後的錯誤路徑與冗餘鏈接語法（如 `[path](path)` 冗餘標記、以及檔案搬移後失效的相對路徑），造成 Token 浪費與 AI 導航失靈。
  - 需要撰寫工具檢查並清理文檔上的相對路徑，特別是核心文件與規範文件，杜絕低效代碼與 Token 浪費。
- **核心目標**：
  1. 重構實作 `1.devtools/tools/doc_cross_ref.py`：輕量、零依賴、純 Python 3 CLI 工具，支援 `--audit` (死鏈審計，有死鏈 exit 1，無死鏈 exit 0)、`--fix` (根據檔案倉庫自動修正路徑)、`--clean-redundant` (清理冗餘語法) 與 `--dry-run`。
  2. 掃描修復核心文檔與關鍵路徑：針對 `.agents/rules.md`、`GEMINI.md`、各技能 `SKILL.md`、`0.doc_mg/` 與 `README.md`，修復所有已失效的死鏈。
  3. 全域驗證：執行 `py 1.devtools/tools/doc_cross_ref.py --audit` 達到 Exit 0（零死鏈）。
- **邊界與假設**：
  - 工具必須純 Python 3 標準庫（`argparse`, `re`, `pathlib`, `os`, `sys`, `json`），杜絕第三方依賴。
  - 遵循專案「路徑跳轉雙軌制」：文檔源碼內部維持純相對路徑或 Repo 相對路徑，嚴禁寫入 `file:///`；對話框提示才使用 `file:///`。
  - 多插件邊界防禦：不得違反跨插件隔離防禦規範。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：
  - `.agents/rules.md`
  - `GEMINI.md`
  - `0.doc_mg/docs/dev_standards.md`
  - `0.doc_mg/docs/token_optimization_guide.md`
  - `0.doc_mg/docs/task_manager.md`
  - `0.doc_mg/docs/SSOT_README.md`
- **現況探索與初步掃描**：
  - 目前 `1.devtools/tools/doc_cross_ref.py` 為舊版 Gemini Nano 關鍵字專用語法，尚未支援通用 Markdown 死鏈審計、倉庫反查修復與冗餘清理。
  - 初步連結掃描顯示全倉庫約有 16 處死鏈（主要集中於子插件 docs 與遷移後路徑）及 56 處冗餘鏡像路徑。
- **影響範圍地圖 (Entity Map)**：
  - 重構目標：`1.devtools/tools/doc_cross_ref.py`
  - 核心文檔：`.agents/rules.md`, `GEMINI.md`, `.agents/skills/*/SKILL.md`, `0.doc_mg/`, `README.md`
  - 配套工具適配：`1.devtools/tools/audit_suite.py` (確認 Suite 4 與門禁相容)

## 3. 策略與架構防護 (Strategy & Guardrails)
- **倒排索引智慧修復演算法**：
  - 掃描工作區建立檔案庫字典（`filename -> [repo_rel_paths]`）。
  - 對於死鏈，提取其目標檔名進行檢索。若在倉庫中恰好存在唯一檔案，則自動計算從當前文件出發的正確相對路徑進行修復；若有多個候選或找不到，則列入警告等待人工確認，避免誤改。
- **冗餘語法清理規則**：
  - 識別 `[text](target)` 其中 `text` 與 `target` 高度重疊（如 `[`path`](path)` 或 `[path](path)`），轉換為簡潔的純文字或行內代碼，大幅精簡 context token。
- **Exit Code 語義防護**：
  - `--audit` 模式：若存在死鏈則返回 Exit Code 1；若零死鏈則返回 Exit Code 0，方便 CI 與 `audit_suite.py` 整合。

### 鎖定檔案 (Target Files)
- `1.devtools/tools/doc_cross_ref.py` (核心重構)
- `.agents/rules.md`
- `GEMINI.md`
- `.agents/skills/**/SKILL.md`
- `0.doc_mg/**`
- `README.md`
- `1.devtools/tools/audit_suite.py` (調用相容性校準)

## 4. 任務拆解與連續驗證 (Atomic Execution)

### Phase 1: 實作輕量純 Python CLI 工具 `doc_cross_ref.py` [Session 2]
- [x] 任務 1.1: 重構 `1.devtools/tools/doc_cross_ref.py`，建立純標準庫架構，支援 `--audit`, `--fix`, `--clean-redundant`, `--dry-run`, `--dir` 與特定檔案參數。
- [x] 任務 1.2: 實作倉庫倒排索引反查與相對路徑自動計算演算法 (`--fix`)。
- [x] 任務 1.3: 實作冗餘 Markdown 語法清洗器 (`--clean-redundant`) 與死鏈檢測器 (`--audit`)。
- [x] 任務 1.4: 單元測試與 CLI 驗收（測試 dry-run 與基本功能，確認與 audit_suite.py 完美整合）。

### Phase 2: 核心文檔死鏈掃描、修復與冗餘清理 [Session 3]
- [x] 任務 2.1: 針對核心文檔（`.agents/rules.md`、`GEMINI.md`、各技能 `SKILL.md`、`0.doc_mg/`、`README.md`）執行 `--fix` 與 `--clean-redundant`。
- [x] 任務 2.2: 人工排查並校準特殊死鏈（如指向已廢棄/遷移檔案之歷史連結）。
- [x] 任務 2.3: 審查修復後的 Diff，確保無語意破壞且完全符合路徑雙軌制。

### Phase 3: 全域自動化驗證與 Gate 3 結案收斂 [Session 4]
- [x] 任務 3.1: 執行 `py 1.devtools/tools/doc_cross_ref.py --audit` 驗證達到 Exit 0（零死鏈）。
- [x] 任務 3.2: 執行 `py 1.devtools/tools/audit_suite.py` 確保整體 Gate 3 自動化審計套件全綠通過。
- [x] 任務 3.3: 完成 SSOT 回寫、更新任務狀態為「已完成」，並移至 `0.doc_mg/tasks/archive/global/`。

## 5. 驗收結果總結 (Gate 3 Summary)
- **自動化審計驗證**：
  - `py 1.devtools/tools/doc_cross_ref.py --audit`：掃描全工作區 76 份 Markdown 檔案，確認 0 處死鏈、0 處未清理冗餘，通過並回傳 Exit Code 0。
  - `py 1.devtools/tools/audit_suite.py`：全域整合審計通過 (PASS: 4, WARN: 1)，回傳 Exit Code 0。
- **核心成果交付**：
  1. 重構 `1.devtools/tools/doc_cross_ref.py`：
     - 純 Python 3 標準庫實作，零依賴。
     - 具備倉庫倒排索引反查智慧修復 (`--fix`)、冗餘語法清洗 (`--clean-redundant`)、門禁審計 (`--audit`) 與 `--dry-run` 預覽。
  2. 核心文檔死鏈清理：
     - 修復全專案核心文檔與關鍵路徑，消滅所有無效與歷史失效相對鏈接，並精簡冗餘鏡像路徑。
  3. SSOT 與文檔同步：
     - `1.devtools/README.md` 已同步最新 CLI 用法與整合指引。
- **歸檔狀態**：
  - 任務目標 100% 達成，完成狀態變更為「已完成」，並移入 `0.doc_mg/tasks/archive/global/` 歸檔庫。
