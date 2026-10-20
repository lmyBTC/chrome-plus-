---
title: "開發者工具鏈升級 (插件隔離審計/審計套件/task_cli雙層歸檔)"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 5 (Phase Final Complete)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：分析並實作 Chrome Plus 專案所需新增或更新的 Python CLI 開發者工具，補齊架構防衛、降低手動門禁操作成本並確保跨平台穩定性。
- **核心目標**：
  1. 實作 `audit_plugin_isolation.py`：實體防護 GEMINI.md 憲法級規則「多插件隔離與邊界防禦」，靜態審計跨目錄 import 與非法引用。
  2. 升級現有工具：
     - `audit_manifests.py`：新增 `--compact` 脫水模式，避免數十行 innerHTML 噪音污染 Context。
     - `task_cli.py`：升級支援自動清理範本 HTML 註解、自動 `git add`，並適配雙層滾動歸檔 (Two-Tier Archive Governance)。
  3. 實作 Gate 3 整合審計 CLI `audit_suite.py`：一鍵執行全套審計（Manifest、隔離、Markdown 連結、交叉引用、Token 預算），輸出簡報矩陣並統一 Exit code 0/1。
  4. 同步更新 `1.devtools/README.md`。
- **邊界與假設**：
  - 零外部 pip 依賴，100% 使用 Python 3 原生標準庫。
  - 完全相容 Windows PowerShell 與 UTF-8 環境。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`1.devtools/README.md`、`.agents/skills/task-protocol/SKILL.md`。
- **影響範圍地圖 (Entity Map)**：
  - `1.devtools/tools/audit_plugin_isolation.py` (新增)
  - `1.devtools/tools/audit_suite.py` (新增)
  - `1.devtools/tools/audit_manifests.py` (更新: 支援 `--compact`)
  - `1.devtools/tools/task_cli.py` (更新: 支援自動清理註解、git add 與雙層歸檔)
  - `1.devtools/README.md` (文檔同步)
- **前置條件 (Prerequisites)**：Git 工作區乾淨，Python 3 環境正常。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：複用現有 `discover_plugins()` 邏輯與標準 argparse 模式，遵循既有 devtools 風格。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（各自獨立單腳本）：繼續維持 16+ 腳本分散手動調用。缺點：Gate 3 驗收繁瑣，Agent 易漏測。
  - 方案 B（核心獨立 + 門禁套件 CLI，選定）：各工具專注單一職責，並透過 `audit_suite.py` 整合 Gate 3 一鍵檢驗，大幅降低執行摩擦與 Token 耗損。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔，落實局部錨定更新 (≤ 50~80 行)。
  - 嚴禁傳遞 ArtifactMetadata 於專案檔案。
  - 嚴禁更動各 Chrome 插件源碼業務邏輯。
  - 嚴禁引入外部 pip 第三方套件依賴。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/audit_plugin_isolation.py`
- `./1.devtools/tools/audit_suite.py`
- `./1.devtools/tools/audit_manifests.py`
- `./1.devtools/tools/task_cli.py`
- `./1.devtools/README.md`
- `0.doc_mg/tasks/task_20261020_global_devtools_enhancement_and_isolation_guard.md`

### 鎖定工具鏈 (Target Devtools)
- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py` / `py 1.devtools/tools/repo_radar.py`
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py`
- [ ] 結案自動審計: `py 1.devtools/tools/audit_suite.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無插件元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L4 任務生命週期: `0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 實作多插件隔離防衛審計器 (audit_plugin_isolation.py) 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 設計並建立 `1.devtools/tools/audit_plugin_isolation.py`
    - **動作**: 實作插件目錄動態發現與源碼掃描，檢測跨目錄 import (如 `../<other_plugin>`) 與違反黑盒契約之私有路徑調用。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_plugin_isolation.py` 成功掃描現有 5 大插件並回報 0 隔離違背 (Exit code 0)。
- [x] 任務 1.2: 邊界測試與命令列參數支援
    - **動作**: 支援 `--compact` 輸出與指定 `--plugin` 檢查單一插件，提供清晰違規行號與改善指引。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_plugin_isolation.py --compact` 驗證輸出簡潔性。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫，局部替換 ≤ 50~80 行）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 現有工具強化與雙層歸檔支援 (audit_manifests.py & task_cli.py) 狀態：`[已完成]`
- [x] 任務 2.1: `audit_manifests.py` 新增 `--compact` 與 `--strict` 模式
    - **動作**: 局部修改 `audit_manifests.py`，支援在 `--compact` 下抑制非致命 innerHTML 詳細清單，僅輸出統計摘要；保留 `--strict` 提供詳細除錯。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_manifests.py --compact` 輸出控制在 10 行以內 (實測 7 行)。
- [x] 任務 2.2: `task_cli.py` 升級自動清理、自動 git-add 與雙層滾動歸檔
    - **動作**:
      1. `init` 子命令：生成任務時自動正則移除所有 `<!-- ... -->` 註解，並呼叫 `git add <task-file>`。
      2. `archive` 子命令：支援「雙層滾動歸檔」判斷（創建或結案超過 30 天移入 `history/` 子目錄）。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/task_cli.py archive --dry-run` 正常執行無錯誤。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力提示詞代碼塊。

### Phase 3: 實作 Gate 3 整合審計套件 CLI (audit_suite.py) 狀態：`[已完成]`
- [x] 任務 3.1: 實作 `audit_suite.py` 統一審計調度
    - **動作**: 整合調用 `audit_manifests.py`、`audit_plugin_isolation.py`、`doc_cross_ref.py`、`audit_markdown_links.py`、`audit_token_usage.py`，統一收集結果生成 Markdown/終端摘要表格。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_suite.py` 成功跑完全站審計並回傳 Exit code 0。
- [x] 任務 3.2: 更新 `1.devtools/README.md`
    - **動作**: 將新工具 `audit_plugin_isolation.py`、`audit_suite.py` 與現有工具更新同步寫入 `1.devtools/README.md`。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_markdown_links.py` 檢查無死鏈。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 執行新版全自動審計套件
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py` 驗收所有插件與文檔健康度。
    - **驗證 (Exit 0)**: 全數通過無阻礙。
- [x] 任務 F.2: 任務雙層封存歸檔
    - **動作**: 將本任務檔依規範移動至 `0.doc_mg/tasks/archive/global/`。
    - **驗證 (Exit 0)**: 任務檔移至歸檔目錄，工作區維持乾淨。

## 5. 驗收標準 (Acceptance Criteria)
- [x] **多插件隔離防衛**: `audit_plugin_isolation.py` 可準確識別非法跨目錄引用並保護各插件獨立性。
- [x] **Token 脫水友好**: `audit_manifests.py --compact` 輸出降至 7 行，杜絕 Context 泛洪。
- [x] **任務管理自癒**: `task_cli.py init` 自動清理 HTML 註解並自動 `git add`，`archive` 遵循雙層架構。
- [x] **全套件一鍵驗收**: `audit_suite.py` 整合全域審計，能精確回傳 Exit code 0/1。
- [x] **零外部依賴**: 全數使用 Python 3 原生標準庫，完全相容 Windows PowerShell。
- [x] **四層 SSOT 閉環**: [N/A] 輕量任務豁免 (L1~L3 豁免)，完成 L4 雙層滾動歸檔。

## 6. 狀態收斂歷程 (Condensed History)
- [2026-10-20] Gate 1 藍圖建立完成，規劃 3 個實作階段與 1 個收斂階段 (Session 1)
- [2026-10-20] Phase 1 完成: 實作 audit_plugin_isolation.py，支援 --compact/--plugin/--strict/--json，全域 5 大插件 252 檔案掃描 Exit 0 (Session 2)
- [2026-10-20] Phase 2 完成: audit_manifests.py 升級 --compact (7 行) / --strict；task_cli.py 升級自動清理 HTML 註解、自動 git add 與雙層滾動歸檔 (Session 3)
- [2026-10-20] Phase 3 完成: 實作 audit_suite.py 整合 5 大門禁 (Manifest/隔離/死鏈/交叉引用/Token 預算)，支援 --compact/--strict/--json/--only/--fix，驗收 Exit 0；同步更新 1.devtools/README.md (Session 4)
- [2026-10-20] Phase Final 完成: 執行 audit_suite.py 全域審計 Exit 0 通過；觸發 L4 雙層歸檔完成結案 (Session 5)

## 7. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
>
> **參與對話 ID 紀錄**:
> - [2026-10-20] ID: 8c744ecf-94c7-4490-abc9-e1e52f778e64 (初始化 Gate 1 藍圖)
> - [2026-10-20] ID: 65d4e54c-02d3-4fde-b951-95a6cb30a229 (執行完成 Phase 1)
> - [2026-10-20] ID: 3e04084a-5622-40ba-bc47-46c0df7c5076 (執行完成 Phase 2)
> - [2026-10-20] ID: 6702c16a-5ffe-48fa-818b-916fd8469b11 (執行完成 Phase 3)
> - [2026-10-20] ID: f8479486-e379-4332-94f9-f21e0995ee95 (執行完成 Phase Final 結案歸檔)
>
> **結案狀態**: 本任務所有階段與 Gate 3 審計驗收均已圓滿達成，正式完成雙層滾動歸檔。
