---
title: "任務建立機制升級：檔名去掉年份並加入當日兩位數流水號 (task_MMDD_01_...)"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "1h"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 3 (Gate 3 自動化審計全部通過，任務結案)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  1. 在建立新 TASK 檔名時加入當日流水編碼（兩位數補零如 `_01_`、`_02_`），以利直觀辨別當天任務先後順序。
  2. 【用戶補充】去掉年份 YYYY 縮短名稱，精簡為 `task_MMDD_01_[plugin]_[title].md`。
- **核心目標**：
  1. **工具層**：升級 `1.devtools/tools/task_cli.py` 的 `init_task()`，日期格式精簡為 `MMDD`，自動掃描當日現存任務數量與最高番號，自動指派自增之兩位數補零流水號（如 `_01_`、`_02_`），並提供 `--seq` 參數支援自訂流水號。
  2. **正則相容層**：確保 `task_cli.py`、`0.doc_mg/tools/archive_rotator.py` 等工具腳本之正則無縫相容舊版 8 碼（`task_YYYYMMDD_...`）與新版 4 碼流水號（`task_MMDD_01_...`）格式。
  3. **規範層**：更新 `0.doc_mg/task_template_v2.md` 與 `.agents/skills/task-protocol/SKILL.md` 等 SSOT 規範文檔中的命名範例與規則說明。
- **邊界與假設**：
  - 歷史既有任務檔案維持原檔名不重命名，保持 Git 歷程穩定。
  - 當天第一筆任務預設編號為 `01`；若當日已有無流水號之既有任務，自動偵測並依序銜接或自 `01` 開始。
  - 流水號統一採用兩位數補零（`01`, `02`, ..., `10`），確保檔案總管與 IDE 字母排序正確。
  - 日期採用 `MMDD`（4 碼），若僅含 MMDD 則年份以 frontmatter 的 `created` 或當前年份推斷。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`、`1.devtools/tools/task_cli.py`。
- **影響範圍地圖 (Entity Map)**：
  - 工具腳本：`1.devtools/tools/task_cli.py`, `0.doc_mg/tools/archive_rotator.py`
  - 規範與模板：`0.doc_mg/task_template_v2.md`, `.agents/skills/task-protocol/SKILL.md`
- **前置條件 (Prerequisites)**：Git 狀態乾淨，Python 3 環境正常。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延用 `task_cli.py` 既有 `slugify`、`TASKS_DIR` 與自動 `git add` 機制，僅在產生 `task_filename` 時注入自增流水號邏輯。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（手動命名，不改工具）：容易遺漏格式規範，使用者體驗不佳。
  - 方案 B（`task_cli.py` 自動掃描當日最高序號並自增，選定）：完全自動化，開新任務時無需手動計算序號，且向下相容歷史檔案。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫規範檔，一律採局部精確替換。
  - 嚴禁動其他插件原始碼。
  - 嚴守 Gate 1 不修改原始碼原則與 One Phase, One Session。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/task_cli.py`
- `./0.doc_mg/task_template_v2.md`
- `./.agents/skills/task-protocol/SKILL.md`

### 鎖定工具鏈 (Target Devtools)
- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py`
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/audit_suite.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (任務命名規範升級)
- [ ] L2 插件導航：N/A
- [ ] L3 業務規格：N/A
- [x] L4 任務生命週期：`0.doc_mg/task_template_v2.md` (範本路徑與範例更新)

## 4. 階段實施計畫 (Phased Implementation Plan)

### Phase 1: 工具層升級 — task_cli.py 縮短日期 (MMDD) 與流水號自動計算
- [x] **Step 1.1**: 在 `1.devtools/tools/task_cli.py` 新增 `get_next_sequence_number(date_str, full_date_str)` 輔助函式，掃描 `0.doc_mg/tasks/` 與 `0.doc_mg/tasks/archive/` 中當日檔案（相容 `task_MMDD_` 與歷史 `task_YYYYMMDD_`），解析現有序號並回傳下一個序號（兩位數格式如 `'01'`）。
- [x] **Step 1.2**: 修改 `init_task()`，將預設日期改為 `MMDD` 4 位數，整合流水號產生檔名 `task_{date_str}_{seq}_{plugin}_{title_slug}.md`，並在 CLI 參數新增可選 `--seq`。
- [x] **Step 1.3**: 升級 `task_cli.py` 與 `0.doc_mg/tools/archive_rotator.py` 中之 `DATE_PATTERN`，使其同時相容舊版 8 碼 (`YYYYMMDD`) 與新版 4 碼 (`MMDD`) 之檔名日期解析。
- [x] **Step 1.4**: 執行 `python 1.devtools/tools/task_cli.py --help` 與單元驗證。
- [x] **驗證條件**: CLI 說明正確顯示，建立新任務時能正確帶入 MMDD 短日期與當日流水號。

### Phase 2: 規範層對齊 — task_template_v2.md 與 task-protocol/SKILL.md
- [x] **Step 2.1**: 更新 `0.doc_mg/task_template_v2.md` 中的接力提示詞範例，改為 `task_MMDD_01_[plugin]_[topic].md`。
- [x] **Step 2.2**: 更新 `.agents/skills/task-protocol/SKILL.md` 中的命名規範說明與接力指令範例。
- [x] **Step 2.3**: 執行 `git diff` 審查文字，確認規範與工具行為 100% 一致。
- [x] **驗證條件**: 規範文字清楚、無死鏈、無歧義。

---

## 5. 執行驗證紀錄 (Verification Log)
- Phase 1 驗證結果: [通過]
  1. `task_cli.py --help` 與 `init --help` 成功新增 `--seq` 參數說明。
  2. 單元測試驗證 `get_next_sequence_number`：今日已有多個任務時正確推算下一個番號 (`07`)；新無任務日期時回傳預設番號 (`01`)。
  3. 單元測試驗證 `task_cli.py` 與 `archive_rotator.py`：8 碼 (`task_20261020_...`) 與 4 碼 (`task_1020_01_...`) 均能 100% 精確解析出正確日期 `2026-10-20`。
  4. `archive_rotator.py --dry-run` 執行無誤，雙層滾動歸檔掃描運作完全相容正常。
- Phase 2 驗證結果: [通過]
  1. `0.doc_mg/task_template_v2.md` 接力提示詞範例已精確更新為 `task_MMDD_01_[plugin]_[topic].md`。
  2. `.agents/skills/task-protocol/SKILL.md` 與 `0.doc_mg/docs/task_manager.md` 之 Gate 1 檔名規範及接力代碼塊已全面更新為 `task_MMDD_01_...`。
  3. `git diff` 審查通過，全數變更無衝突且文字精確一致。
  4. 執行 `audit_suite.py` 整合自動化審計全部通過 (Exit 0)。
- Phase 3 驗證結果: [通過]
  1. 執行 `audit_suite.py` 整合自動化審計：5/5 插件 Manifest V3 合規、實體隔離 100%、文件交叉引用檢查通過 (Exit 0)。
  2. 執行 `audit_manifests.py` 深度審查：無任何重大合規與安全性違規 (Exit 0)。
  3. 執行 `archive_rotator.py` 驗證任務治理池：相容性與滾動輪轉驗證通過。

---

## 6. AI 簽到區與狀態收斂
- 當前會話簽到: Session 3 (Gate 3 自動化審計全部通過，四層 SSOT 與任務規範對齊完成，正式結案)

