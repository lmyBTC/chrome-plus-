---
title: "install_task_protocol_pack"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-28"
deadline: "2026-10-28"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 1" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：安裝 `task_protocol_pack\README.md` 的套件，並整合 `0.doc_mg\docs\README_TOKEN_OPTIMIZATION_GUIDE.md`，使 Chrome Plus 專案之任務協議與 Token 最佳化體系完全融合升級。
- **核心目標**：
  1. **Phase 1: 工具鏈與腳本升級安裝**：
     - 執行 `task_protocol_pack/install.py --install`，安裝新工具 (`log_issue.py`, `analyze_task_tokens.py`, `util_archive_manager.py`) 並升級核心腳本 (`repo_radar.py`, `code_skeleton.py`, `compact_log.py`, `generate_symbol_index.py`, `token_estimator.py`)。
     - 驗證各工具於 `1.devtools/tools/` 下可正常執行，無外部依賴損壞。
  2. **Phase 2: 任務規範與專家技能無縫整合 (Chrome Plus 適配)**：
     - 將 `task_protocol_pack` 之規範特質（四大支柱、Probe Cache、Line Anchor、2-Strike 熔斷實體立案）融合進 `.agents/skills/task-protocol/SKILL.md`、`.agents/skills/token-saver/SKILL.md`、`0.doc_mg/task_template_v2.md` 與 `0.doc_mg/docs/README_TASK_MANAGER.md`，維持 Chrome Plus 3-Gate 與插件隔離規範。
  3. **Phase 3: 深度整合 README_TOKEN_OPTIMIZATION_GUIDE.md 與 Gate 3 審計驗收**：
     - 將新工具（`log_issue.py`, `analyze_task_tokens.py`, `util_archive_manager.py`）與 Probe Cache 等架構，完整回寫並同步於 `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md` 與 `1.devtools/README_DEVTOOLS.md`。
     - 執行 `py 1.devtools/tools/audit_suite.py` 確保全項目 Exit 0 綠燈通過。
- **邊界與假設**：保留 Chrome Plus 既有的多插件邊界隔離與 Manifest V3 規範；路徑嚴格遵守 `1.devtools/tools/` 與 `0.doc_mg/`。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `GEMINI.md`, `.agents/rules.md`, `task_protocol_pack/README.md`, `1.devtools/README_DEVTOOLS.md`。
- [x] **全流程工具鏈檢核矩陣**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `task_cli.py init` / `install.py --dry-run` | `py task_protocol_pack/install.py --dry-run` 預檢 12 項清單 | Exit 0 |
  | **Gate 2: 執行** | `py task_protocol_pack/install.py --install` | 正式安裝並更新工具鏈與 SSOT | Exit 0 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` | 整合審計通過，無死鏈無隔離外溢 | Exit 0 |
- **影響範圍地圖 (Entity Map)**：
  - `task_protocol_pack/` (來源套件)
  - `1.devtools/tools/` (目標工具目錄)
  - `.agents/skills/` (專家技能)
  - `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md` (整合指標文件)
  - `0.doc_mg/task_template_v2.md` & `0.doc_mg/docs/README_TASK_MANAGER.md`
- **前置條件 (Prerequisites)**：Git 狀態乾淨，備份機制就緒。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：使用 `install.py` 自動備份既有檔案，升級後以 Chrome Plus SSOT 進行二次對齊，杜絕 masonyang-blog 舊路徑污染。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 分階段進行：第一階段安裝工具與腳本驗證；第二階段融合規範與技能；第三階段整合 Token 指南與全套審計。
- **硬性禁止動作 (Guardrails)**：嚴禁破壞 Chrome Plus 的 3-Gate 與插件隔離規範；嚴禁遺留 `doc/doc_task` 或 `scratch/manage.py` 等外來無效路徑。

### 鎖定檔案 (Target Files)
- `1.devtools/tools/*`
- `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`
- `0.doc_mg/docs/README_TASK_MANAGER.md`
- `0.doc_mg/task_template_v2.md`
- `.agents/skills/task-protocol/SKILL.md`
- `.agents/skills/token-saver/SKILL.md`
- `1.devtools/README_DEVTOOLS.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 安裝腳本: `py task_protocol_pack/install.py --install`
- [x] 符號索引: `py 1.devtools/tools/generate_symbol_index.py`
- [x] 全面審計: `py 1.devtools/tools/audit_suite.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/task-protocol/SKILL.md`, `.agents/skills/token-saver/SKILL.md`
- [x] L2 模組導航：`1.devtools/README_DEVTOOLS.md`
- [x] L3 業務規格：`0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`, `0.doc_mg/docs/README_TASK_MANAGER.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 執行 task_protocol_pack 安裝與腳本就緒驗證 狀態：`[已完成]`
- [x] 任務 1.1: 執行 `py task_protocol_pack/install.py --install` 完成自動備份與實體安裝
    - **動作**: 透過 python 執行安裝器，將新工具與更新檔複製入專案目標目錄。
    - **驗證 (Exit 0)**: 控制台回報成功備份並成功安裝 12 個項目。
- [x] 任務 1.2: 驗證新工具與升級工具之執行狀態
    - **動作**: 執行 `repo_radar.py --help`, `code_skeleton.py --help`, `compact_log.py --help`, `log_issue.py --help`, `analyze_task_tokens.py --help`。
    - **驗證 (Exit 0)**: 全部指令 Exit code 為 0，無語法或匯入錯誤。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] Phase 1 所有單元驗證已通過 (Exit 0)。

### Phase 2: Chrome Plus 專案適配與技能規範融合 狀態：`[已完成]`
- [x] 任務 2.1: 修正與調和 `.agents/skills/task-protocol/SKILL.md` 與 `task_template_v2.md`
    - **動作**: 確保符合 Chrome Plus 3-Gate 開發協議，消除 `doc/doc_task`、`scratch/manage.py` 等外部專案路徑殘留，注入 Probe Cache 與 2-Strike 熔斷機制。
    - **驗證 (Exit 0)**: 內容精確對齊 Chrome Plus 目錄結構與 3-Gate 門禁。
- [x] 任務 2.2: 修正與調和 `.agents/skills/token-saver/SKILL.md` 與 `0.doc_mg/docs/README_TASK_MANAGER.md`
    - **動作**: 確保引用路徑為 `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`，並融入四大防火牆概念。
    - **驗證 (Exit 0)**: SSOT 鏈條無死連結。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] Phase 2 所有單元驗證已通過 (Exit 0)。

### Phase 3: 整合 README_TOKEN_OPTIMIZATION_GUIDE.md 與 Gate 3 自動化驗收 狀態：`[已完成]`
- [x] 任務 3.1: 全面整合更新 `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md` 與 `1.devtools/README_DEVTOOLS.md`
    - **動作**: 加入 `log_issue.py`, `analyze_task_tokens.py`, `util_archive_manager.py` 的調用時機、效益與範例，建立完整工具矩陣。
    - **驗證 (Exit 0)**: 文檔內容詳盡且無死鏈。
- [x] 任務 3.2: 執行 Gate 3 整合審計全套件
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py` 與 `py 1.devtools/tools/generate_symbol_index.py`。
    - **驗證 (Exit 0)**: 審計全項 Exit 0 綠燈通過。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **工具安裝合規**: `1.devtools/tools/` 成功新增 `log_issue.py`, `analyze_task_tokens.py`, `util_archive_manager.py`，且全部工具支援 `--help`。
- [x] **路徑完全在地化**: 全專案不遺留外部專案 (`masonyang-blog`, `doc/doc_task`) 殘留路徑。
- [x] **Token 指南整合**: `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md` 包含四大支柱、最新工具矩陣與使用手冊。
- [x] **全自動審計通過**: `py 1.devtools/tools/audit_suite.py` 審計 100% 通過 (Exit 0)。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-28] 任務初始化，完成 Gate 1 藍圖鎖定 (Session 1)。
- [2026-10-28] 完成 Phase 1: 實體安裝與工具鏈驗證 (Exit 0)。
- [2026-10-28] 完成 Phase 2: Chrome Plus 專案適配與技能規範融合 (Exit 0)。
- [2026-10-28] 完成 Phase 3: README_TOKEN_OPTIMIZATION_GUIDE.md 整合與 Gate 3 整合審計通過 (Exit 0)。


