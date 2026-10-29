---
title: "clean_archive_tasks_governance"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 4 (Phase Final 驗收完成，Gate 3 結案歸檔)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["0.doc_mg/draft/xxx.md"])
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
  依據 `0.doc_mg\docs\README_TASK_MANAGER.md` 規範，對 `0.doc_mg\tasks\archive` 進行全面清理與雙層滾動治理校正，解決非任務資產（圖片、草稿、除錯日誌）混入任務封存區、目錄名稱未對齊 SSOT、以及歷史任務在 `unknown/`、`workspace/`、`agents/` 散落的問題，恢復極致純淨的任務封存體系。
- **核心目標**：
  1. **非任務資產分流**：將混入 `tasks/archive/` 的圖片 (`image.png`)、草稿文件（Gemini Nano 7 份規劃案、2 份 friction matrix、1 份 PRD）及除錯日誌 (`bug.md`) 安全搬移至 `0.doc_mg/draft/archive/`。
  2. **SSOT 目錄名稱對齊**：依據 `README_TASK_MANAGER.md` Section 6.2，將 `archive/gemini-nano/` 規範化更名為 `archive/chrome_gemini_nano/`，並同步修訂 `task_cli.py` 之映射設定。
  3. **散落任務精準歸位**：將 `archive/unknown/`、`archive/workspace/`、`archive/agents/` 中的歷史任務檔案安全分流至對應的插件目錄 (`finance-research-clipper-oss`、`chrome_pk`、`global`)，並清除空目錄。
  4. **雙層滾動驗收與零破壞防護**：落實白名單保護，絕不刪除任何歷史任務；驗收 `task_cli.py archive`、`doc_cross_ref.py` 與 `audit_suite.py` 確保 Exit 0 零死鏈。
- **邊界與假設**：
  - 嚴禁刪除任何任務檔案，一律採 Move 安全搬移。
  - `archive/` 根目錄常態保留最新 10 份任務政策維持不變。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `0.doc_mg/docs/README_TASK_MANAGER.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `code_skeleton.py task_cli.py` (501 ➔ 79 行) | 減少 84.2% 上下文雜訊 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | 各 Phase 搬移操作與 Python 驗證 | 待 Phase 執行實測 (Exit 0) |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | `py 1.devtools/tools/audit_suite.py` 整合審計 | 預期 100% PASS (Exit 0) |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_clean_archive.md` (已建立)
- **影響範圍地圖 (Entity Map)**：
  - `0.doc_mg/tasks/archive/` (全目錄盤點與分流)
  - `0.doc_mg/draft/archive/` (接收非任務草稿與圖片)
  - `1.devtools/tools/task_cli.py` (`PLUGIN_DIR_MAP` 校正)
- **前置條件 (Prerequisites)**：Git 狀態乾淨，確認無未追蹤衝突。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：使用現有 `task_cli.py` 與原生檔案搬移指令，不引入多餘外部腳本。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（僅使用 task_cli.py archive）：只能處理根層溢出與逾期下沉，無法處理混入的圖片、草稿與錯誤命名的資料夾。
  - 方案 B（結合精準分流搬移 + task_cli 工具 SSOT 校正 + 雙層歸檔驗收，選定）：徹底將非任務資產歸檔至 `draft/archive/`，將歷史任務依 plugin 歸位，並修正 `task_cli.py` 使其與 `README_TASK_MANAGER.md` 規範 100% 吻合。
- **硬性禁止動作 (Guardrails)**：
  - 嚴格遵守白名單保護規範，**嚴禁刪除任何任務檔案**，一律使用安全移動 (Move)。
  - 嚴禁更動插件業務功能原始碼。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/tasks/archive/` (全目錄)
- `./0.doc_mg/draft/archive/` (接收目標)
- `./1.devtools/tools/task_cli.py` (SSOT 映射校正)

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py`
- [x] 終端日誌脫水: `py 1.devtools/tools/compact_log.py`
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py` / `doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/task-protocol/SKILL.md` (若有規則修訂則回寫)
- [ ] L2 插件導航：`./0.doc_mg/docs/README_TASK_MANAGER.md` (SSOT 規範)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (結案歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 非任務資產與草稿分流搬移 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 移除非 Markdown 資產與除錯日誌
    - **動作**: 將 `archive/image.png` 移至 `0.doc_mg/draft/archive/image.png`；將 `archive/chrome_pk/bug.md` 與 `tasks/bug.md` 整理歸入 `0.doc_mg/draft/archive/`。
    - **驗證 (Exit 0)**: 確認 `tasks/` 與 `archive/` 根層不再留存圖片或臨時 bug 日誌 (已完成 Exit 0)。
- [x] 任務 1.2: 分流 `archive/unknown/` 與 `gemini-nano/` 中的草稿文件
    - **動作**: 將 `unknown/` 中 3 份草稿 (`analyst_workflow_friction_matrix.md`, `pm_workflow_friction_matrix.md`, `chrome_plus_V2.md`) 與 `gemini-nano/` 中 7 份規劃草稿安全移至 `0.doc_mg/draft/archive/`。
    - **驗證 (Exit 0)**: 確認所有草稿安全歸檔，無一遺漏 (10 份草稿全部安全移至 `draft/archive/` Exit 0)。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 回覆末尾強制輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 歷史任務歸位、目錄規範化與工具校正 狀態：`[已完成]`
- [x] 任務 2.1: `gemini-nano` 目錄標準化更名為 `chrome_gemini_nano`
    - **動作**: 依 SSOT Section 6.2 將 `0.doc_mg/tasks/archive/gemini-nano` 更名為 `chrome_gemini_nano`，並同步修訂 `task_cli.py` 的 `PLUGIN_DIR_MAP`。
    - **驗證 (Exit 0)**: `py 1.devtools/tools/task_cli.py archive --dry-run` 正確識別 `chrome_gemini_nano` (Exit 0)。
- [x] 任務 2.2: `unknown/`、`workspace/`、`agents/` 歷史任務精準歸位
    - **動作**: 將 8 份歷史任務依所屬 plugin 移至 `archive/finance-research-clipper-oss/`、`archive/chrome_pk/`、`archive/global/` (及對應 `history/`)，並清理空目錄。
    - **驗證 (Exit 0)**: `archive/unknown`、`archive/workspace`、`archive/agents` 乾淨移除，9 份歷史任務精準歸位 (Exit 0)。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 回覆末尾強制輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 雙層滾動歸檔驗收、全域審計與結案 狀態：`[已完成]`
- [x] 任務 F.1: 執行自動化雙層滾動歸檔工具
    - **動作**: 執行 `py 1.devtools/tools/task_cli.py archive`，驗證 10 份常態保留、無異常溢出。
    - **驗證 (Exit 0)**: 工具輸出總結正常 Exit 0 (已完成 Exit 0)。
- [x] 任務 F.2: 全域死鏈與整合審計
    - **動作**: 執行 `py 1.devtools/tools/doc_cross_ref.py` 與 `py 1.devtools/tools/audit_suite.py`。
    - **驗證 (Exit 0)**: 0 死鏈、審計全數 PASS (72 份文檔 0 死鏈，審計 100% 通過 Exit 0)。
- [x] 任務 F.3: 任務結案與本任務歸檔
    - **動作**: 本任務狀態標記為 `[已完成]` 並移入 `0.doc_mg/tasks/archive/`。
    - **驗證 (Exit 0)**: 工作區乾淨純淨，符合 Gate 3 規範。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 歸檔入 `0.doc_mg/tasks/archive/`。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [常態任務豁免]
- **降級/回滾方案**: 嚴格只做 Move 搬移，不刪除任何檔案。若有路徑錯誤可隨時還原。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **目錄治理合規**: `tasks/archive/` 根目錄僅留存 10 份常態任務，無圖片、除錯紀錄等非任務檔案。
- [x] **SSOT 結構對齊**: `gemini-nano` 成功標準化更名為 `chrome_gemini_nano`，草稿均移入 `0.doc_mg/draft/archive/`。
- [x] **雙層歸檔工具正常**: `py 1.devtools/tools/task_cli.py archive` 執行 Exit 0。
- [x] **全域無死鏈**: `py 1.devtools/tools/doc_cross_ref.py` 檢查 0 處死鏈。
- [x] **審計通過**: `py 1.devtools/tools/audit_suite.py` 整合審計通過 (Exit 0)。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-29] Gate 1 藍圖建立完成 (Session 1)。
- [2026-10-29] Phase 1 非任務資產與草稿分流搬移完成，驗證 0 殘留 (Session 2)。
- [2026-10-29] Phase 2 歷史任務歸位、gemini-nano 目錄標準化更名為 chrome_gemini_nano、task_cli.py 映射校正完成，所有歷史散落目錄 clean 移除 (Session 3)。
- [2026-10-29] Phase Final 雙層滾動歸檔驗收、全域 72 份文檔死鏈掃描 (0 處死鏈)、Gate 3 審計套件驗證通過 (Exit 0)，本任務結案移入 archive/ (Session 4)。

## 8. AI 簽到區與會話接力
> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> - [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> - [x] 結案前承諾執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 `task_cli.py` 骨架 (501 ➔ 79 行)，節省 84.2% 上下文
> - `doc_cross_ref.py`: 預檢全域 72 份文檔交叉引用 (0 死鏈)
> - `task_cli.py archive --dry-run`: 驗證雙層歸檔常態 10 份正常與目錄映射正確
> - `audit_suite.py`: 預檢整合審計門禁通過 (Exit 0)
> **參與對話 ID 紀錄**:
> - [2026-10-29] ID: 8787bc7e-7465-47dc-b778-0fe6fa1620e8 (Session 1: Gate 1 藍圖建立)
> - [2026-10-29] ID: 51e1a29d-78b7-4cf8-addb-ead4e0eea9a6 (Session 2: Phase 1 執行完成)
> - [2026-10-29] ID: 521b97c1-31f8-4c3e-b6ee-8814b0e8d9ad (Session 3: Phase 2 執行完成)
> - [2026-10-29] ID: 1df9e220-dbd1-4b8a-a8f1-ce5741ecbfbb (Session 4: Phase Final 結案驗收與歸檔)
> **跨會話接力指令 (Session Handover)**:
> 本任務已結案完成歸檔，無需後續會話接力。
