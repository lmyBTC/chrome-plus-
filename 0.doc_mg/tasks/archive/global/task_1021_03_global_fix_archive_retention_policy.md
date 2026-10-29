---
title: "修復任務歸檔留存政策：archive 根目錄保留最新 10 個已完成 Task"
plugin: "global"
status: "已完成"
created: "2026-10-21"
deadline: "2026-10-21"
appetite: "1h"
complexity_budget: "Max 2 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase Final 審計完成，正式結案歸檔)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  剛完成的任務（如 `task_1021_01`、`task_1021_02`）不應該直接歸檔到 `0.doc_mg/tasks/archive/finance-research-clipper-oss` 子目錄，而是要停留在 `0.doc_mg/tasks/archive` 根目錄，直到 `0.doc_mg/tasks/archive` 超過 10 個 TASK，才依所屬插件分類下沉歸檔。先前 `task_20261020_tasks_retention_and_archive_policy.md` 未能正確落實此政策，需要全面校正與優化。
- **核心目標**：
  1. **現狀檔案立即校正**：將被過早推入 `archive/finance-research-clipper-oss/` 的兩份今天完成任務檔移回 `0.doc_mg/tasks/archive/` 根層級。
  2. **規範體系修訂**：更新 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`，明確定義「近期封存緩衝區（`0.doc_mg/tasks/archive/`）常態保留最新 10 筆任務，滿 10 筆後溢出者才分流至插件子目錄」之 SSOT。
  3. **工具邏輯重構**：修復 `1.devtools/tools/task_cli.py` (archive 子指令) 與 `0.doc_mg/tools/archive_rotator.py`，落實上述雙層歸檔與滾動邏輯，杜絕再次發生直跳插件目錄之偏差。
- **邊界與假設**：
  - `0.doc_mg/tasks/` 僅放置進行中/待處理活躍任務，結案任務一律移入 `0.doc_mg/tasks/archive/`。
  - `0.doc_mg/tasks/archive/` 根目錄下常態保留最新 10 份已結案任務，按時間由新到舊排序。
  - 當 `0.doc_mg/tasks/archive/` 根目錄下之任務數超過 10 個時，最舊的溢出任務依其 plugin 屬性移動至對應的子目錄（如 `archive/[plugin]/`）。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`、`task_20261020_tasks_retention_and_archive_policy.md`。
- **影響範圍地圖 (Entity Map)**：
  - 核心規範：`GEMINI.md`, `.agents/rules.md`, `.agents/skills/task-protocol/SKILL.md`
  - 維護工具：`1.devtools/tools/task_cli.py`, `0.doc_mg/tools/archive_rotator.py`
  - 任務檔案：`0.doc_mg/tasks/archive/finance-research-clipper-oss/task_1021_01_*.md`, `task_1021_02_*.md`
- **前置條件 (Prerequisites)**：Git 狀態乾淨，確認既有檔案位置與依賴。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：整合 `task_cli.py` 與 `archive_rotator.py` 之判定標準，採用相同的日期解析與排序規則。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（僅手動搬移檔案）：未修復工具，下次執行 `task_cli.py archive` 或手動歸檔時仍會再次放錯位置。
  - 方案 B（檔案搬移 + 規範對齊 + 工具重構，選定）：徹底將規則固化於 SSOT 與工具代碼，確保日後自動歸檔與手動維護均 100% 符合「滿 10 個才分流至插件子目錄」之行為。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁刪除任何任務檔案（No-Deletion Policy）。
  - 嚴禁於 Gate 1 修改任何程式碼。
  - 嚴守 One Phase, One Session 物理隔絕原則。

### 鎖定檔案 (Target Files)
- `./GEMINI.md`
- `./.agents/rules.md`
- `./.agents/skills/task-protocol/SKILL.md`
- `./1.devtools/tools/task_cli.py`
- `./0.doc_mg/tools/archive_rotator.py`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py`
- [x] 終端日誌脫水: `py 1.devtools/tools/compact_log.py`
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (Gate 3 歸檔條款與封存架構)
- [x] L2 憲法與規則：`./GEMINI.md`, `./.agents/rules.md` (Gate 3 歸檔條款)
- [ ] L3 業務規格：N/A
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (近期封存緩衝區常態保留最新 10 份)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 現存檔案位置校正與規範體系對齊 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 現存過早歸檔檔案校正
    - **動作**: 將 `0.doc_mg/tasks/archive/finance-research-clipper-oss/` 下的 `task_1021_01_finance_analysis_features_upgrade.md` 與 `task_1021_02_finance-research-clipper-oss_refactor_file_and_folder_structure.md` 搬移至 `0.doc_mg/tasks/archive/` 根層級。
    - **驗證 (Exit 0 / 客觀指標)**: `0.doc_mg/tasks/archive/` 根層級包含此兩份檔案，插件子目錄下無此兩份檔案。
- [x] 任務 1.2: 規範 SSOT 文字對齊
    - **動作**: 更新 `GEMINI.md`、`.agents/rules.md` 與 `.agents/skills/task-protocol/SKILL.md`，明確定義：
      1. 結案任務首先移入 `0.doc_mg/tasks/archive/` 根目錄（近期封存緩衝區）。
      2. `0.doc_mg/tasks/archive/` 根目錄常態保留最新 10 份已結案任務。
      3. 只有當 `0.doc_mg/tasks/archive/` 根目錄之任務數超過 10 份時，最舊的溢出任務才移入對應插件子目錄 `archive/[plugin]/`（冷儲存分類區）。
    - **驗證 (Exit 0 / 客觀指標)**: `git diff` 審查修改，確認語意一致且無死連結。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（局部替換 ≤ 50~80 行）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：強制輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 工具層雙層歸檔與滾動邏輯重構 狀態：`[已完成]`
- [x] 任務 2.1: 重構 `1.devtools/tools/task_cli.py` 之 `archive` 函式
    - **動作**: 調整 `archive_tasks`：
      1. 第一步：將 `0.doc_mg/tasks/` 中已完成任務移入 `0.doc_mg/tasks/archive/` 根目錄。
      2. 第二步：掃描 `0.doc_mg/tasks/archive/` 根目錄下的 `.md` 任務檔，若總數 > 10，依日期/流水號排序，將超過 10 筆的最舊任務依其 `plugin` 移入 `archive/[plugin]/`。
    - **驗證 (Exit 0 / 客觀指標)**: `python 1.devtools/tools/task_cli.py archive --dry-run` 正常執行且輸出符合預期。
- [x] 任務 2.2: 重構 `0.doc_mg/tools/archive_rotator.py`
    - **動作**: 調整治理維護腳本，移除將 `archive/` 根目錄檔案視為散落檔案的警告，支援以 `archive/` 根目錄保留 10 筆為基準的溢出下沉與插件目錄分類。
    - **驗證 (Exit 0 / 客觀指標)**: `python 0.doc_mg/tools/archive_rotator.py --dry-run` 正常執行無報錯。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：強制輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化工具合規審計
    - **動作**: 執行 `python 1.devtools/tools/audit_suite.py` 驗證全站規範與鏈條無死連結。
    - **驗證 (Exit 0)**: 審計工具回報 Exit 0。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 確認 L1/L2 規範與工具一致；本任務結案後移至 `0.doc_mg/tasks/archive/`。
    - **驗證 (Exit 0)**: 本任務成功歸檔於 `0.doc_mg/tasks/archive/`。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：路徑混淆導致任務被移至錯誤插件目錄或檔名衝突覆蓋。防範措施：搬移前檢查目標檔案是否存在，禁止直接覆寫。
- **降級/回滾方案 (Blast Radius Control)**：若搬移出錯，透過 `git status` 與 `git checkout` 立即還原。
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **檔案位置正確性**:
  - [x] `task_1021_01` 與 `task_1021_02` 正確位於 `0.doc_mg/tasks/archive/` 根層級。
  - [x] `0.doc_mg/tasks/archive/` 根層級目前任務檔數量 ≤ 10 (含本任務共 7 份)。
- [x] **規範 SSOT 一致性**:
  - [x] `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md` 中對於歸檔層級的說明完全統一。
- [x] **工具合規與運作**:
  - [x] `task_cli.py archive` 依據新規則執行（先至 `archive/`，>10 才分流至 `archive/[plugin]/`）。
  - [x] `archive_rotator.py` 與 `task_cli.py` 邏輯完全對齊。
  - [x] `python 1.devtools/tools/audit_suite.py` 全數 Exit 0 通過。

## 7. 狀態收斂歷程
- [2026-10-21] [Gate 1] 建立任務藍圖，鎖定規範與工具重構清單，進入 Gate 2 準備 (Session 1)
- [2026-10-21] [Phase 1] 完成 2 份任務檔移回 archive/ 頂層緩衝區，並全面更新 task-protocol SKILL.md 規範文字 (Session 2)
- [2026-10-21] [Phase 2] 重構 task_cli.py 與 archive_rotator.py 雙層歸檔與滾動邏輯，實測 dry-run 均 Exit 0 (Session 3)
- [2026-10-21] [Phase Final] 全站自動化審計 Exit 0 通過，雙層滾動治理 SSOT 閉環，任務結案封存 (Session 4)

## 8. AI 簽到區與狀態收斂
- 當前會話簽到: Session 4 (全任務完成，正式結案歸檔)
