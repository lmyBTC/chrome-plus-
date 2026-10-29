---
title: "chrome_pk_微工具鷹架與領域架構防腐工具鏈開發"
plugin: "chrome_pk"
status: "已完成"
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 5 (Phase Final - Audit & SSOT Consolidation)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：延續 `task_1029_09` 架構重構成果，將建議之三大工作機制腳本（`scaffold_tool.py`、`audit_arch_boundary.py`、`sync_toolbox_registry.py`）正式落地至 `1.devtools/tools/`，提供開箱即用的微工具生成、領域邊界審查與清冊同步能力。
- **核心目標**：
  1. 實作 `1.devtools/tools/scaffold_tool.py`：微工具一鍵生成鷹架，支援自動生成標準 4 件套（manifest/ToolView/index/types）並自動掛載至 `registry.ts`。
  2. 實作 `1.devtools/tools/audit_arch_boundary.py`：單插件內部四層領域架構與 Barrel 門面審查器，杜絕跨 Feature 私有路徑穿透。
  3. 實作 `1.devtools/tools/sync_toolbox_registry.py`：微工具清冊同步與協議校驗器，確保微工具與註冊表 100% 同步且欄位合規。
  4. 整合至全域審計套件 `audit_suite.py`，並透過 Dry-Run 實測驗收（Exit 0）。
- **邊界與假設**：
  - 嚴格遵守多插件隔離，新工具腳本專注服務於 `chrome_pk`（並保留未來相容其他插件的通用抽象）。
  - 嚴禁破壞現有 `chrome_pk` 既有 5 大微工具之運行與編譯。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `chrome_pk/docs/guide-pk-features-arch.md`（四層領域與微工具外掛協議）、`.agents/skills/pk-core/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `task_cli.py init` | `task_cli.py init --plugin chrome_pk` | 已建檔納入 Git 防護 |
  | **Gate 2: 執行** | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` | `npm run build` & `py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk --compact` | Phase 1 建置 & Phase 2 審查皆通過 (Exit 0) |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py --compact` | `audit_suite.py --compact` (Exit 0) & `audit_manifests.py` (Exit 0) | 9 大門禁全數通過，結案驗收 Exit 0 |
- **影響範圍地圖 (Entity Map)**：
  - `1.devtools/tools/scaffold_tool.py` (新增)
  - `1.devtools/tools/audit_arch_boundary.py` (新增)
  - `1.devtools/tools/sync_toolbox_registry.py` (新增)
  - `1.devtools/tools/audit_suite.py` (整合入口調用)
  - `chrome_pk/src/features/toolbox/` (作為基準目標與驗證沙盒)
- **前置條件 (Prerequisites)**：Python 3.10+ 環境、Node/npm 工具鏈就緒。

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：複用 `1.devtools/tools/lib` 與既有審計工具之 CLI 輸出風格與 Windows UTF-8 編碼相容機制。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（合為單一大腳本）：將鷹架、審計與同步寫入單一多功能檔案。缺點：違反單一職責、未來難以單獨調用或整合至 CI。
  - 方案 B（微工具鏈獨立切分 + 整合入口 - 推薦）：
    - `scaffold_tool.py`（寫入/生成）
    - `audit_arch_boundary.py`（唯讀/檢查門禁）
    - `sync_toolbox_registry.py`（讀寫/校驗修復）
    - 最後由 `audit_suite.py` 自動調度審計。模組清晰、易維護、便於代理。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁在 Gate 1 修改任何原始程式碼。
  - 嚴禁打破「One Phase, One Session」會話隔離。
  - 嚴禁更動其他無關插件源碼。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/scaffold_tool.py`
- `./1.devtools/tools/audit_arch_boundary.py`
- `./1.devtools/tools/sync_toolbox_registry.py`
- `./1.devtools/tools/audit_suite.py`

### 鎖定工具鏈 (Target Devtools)
- [x] 終端日誌脫水: `py 1.devtools/tools/compact_log.py`
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [x] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/pk-core/SKILL.md` (註冊新腳本指令)
- [x] L2 插件導航：`./chrome_pk/overview-pk.md` (微工具擴充指南章節更新)
- [x] L3 業務規格：`./chrome_pk/docs/guide-pk-features-arch.md` (更新鷹架工具用法)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (結案時歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 微工具一鍵鷹架生成器 (`scaffold_tool.py`) 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 設計標準微工具模版字串與命令列參數解析
  - **動作**: 支援 `--plugin`, `--id`, `--name`, `--category`, `--icon`, `--badge`, `--permissions` 參數，定義 `manifest.ts`、`{PascalName}View.tsx`、`index.ts`、`types.ts` 之標準樣板。
- [x] 任務 1.2: 實作檔案生成與 `registry.ts` 自動掛載
  - **動作**: 安全讀取現有 `registry.ts`，精準追加 import 與陣列元素；提供 `--dry-run`、防覆寫保護與 `--remove` 卸載還原功能。
- [x] 任務 1.3: 實機驗證（產生測試工具並測試編譯）
  - **動作**: 產生測試工具 `sample-tool`，掛載至 `registry.ts`，執行 `npm run build` 驗證編譯通過（Exit 0），並透過 `--remove` 安全清理還原。
  - **驗證 (Exit 0)**: `scaffold_tool.py` 執行成功且建置 Exit 0。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 遵循「One Phase, One Session」停步交權，輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 領域架構防腐與 Barrel 門面審查器 (`audit_arch_boundary.py`) 狀態：`[已完成]`
- [x] 任務 2.1: 定義四層架構路徑規則與穿透引用規則
  - **動作**: 解析 JS/TS 之 import/export 語法，檢查是否穿透引用私有目錄（如 `features/X/components/...`）。
- [x] 任務 2.2: 實作審計報告輸出與 Exit 0/1 門禁
  - **動作**: 區分 ERROR (嚴重架構穿透) 與 WARNING，支援 `--compact` 輸出模式。
- [x] 任務 2.3: 實機審計現有 `chrome_pk`
  - **動作**: 運行 `py 1.devtools/tools/audit_arch_boundary.py --plugin chrome_pk`，驗證當前重構後架構 100% 合規。
  - **驗證 (Exit 0)**: 審查器 Exit 0 通過。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循「One Phase, One Session」停步交權。

### Phase 3: 微工具清冊自動審驗與同步器 (`sync_toolbox_registry.py`) 狀態：`[已完成]`
- [x] 任務 3.1: 實作清冊一致性檢查
  - **動作**: 比對 `tools/` 實體目錄與 `registry.ts`，驗證是否有孤兒工具或無效註冊。
- [x] 任務 3.2: 實作一鍵修復/同步模式 (`--fix`)
  - **動作**: 能依據現有 `tools/*/manifest.ts` 自動重新構建乾淨的 `registry.ts`。
- [x] 任務 3.3: 整合至 `audit_suite.py`
  - **動作**: 在全域審計中加入 `audit_arch_boundary.py` 與 `sync_toolbox_registry.py`。
  - **驗證 (Exit 0)**: `py 1.devtools/tools/audit_suite.py --compact` 全數通過。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循「One Phase, One Session」停步交權。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 全套自動化合規審計
  - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/audit_manifests.py`。
  - **驗證 (Exit 0)**: 審計回報 0 錯誤。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
  - **動作**: 回寫 `guide-pk-features-arch.md`、`overview-pk.md` 與 `pk-core/SKILL.md`，執行 `py 1.devtools/tools/task_cli.py archive`。
  - **驗證 (Exit 0)**: 檔案已正確歸檔。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 審計 Exit 0 通過。
> - [x] 狀態標記為 `[已完成]`。
> - [x] SSOT 回寫完成並歸檔。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：AST 或正則解析 import 語法時對多行 import 或動態 import 誤判。
- **降級/回滾方案**：使用正則模式精確限定 `from ['"].*['"]` 結構，並於腳本內提供單元測試案例防禦。
- **熔斷機制**：2-Strike 熔斷，單一問題最多除錯 2 次，失敗即刻立案還原。

## 6. 驗收標準 (Acceptance Criteria)
- [x] `scaffold_tool.py` 可正確生成微工具並完成 `registry.ts` 掛載，產物編譯 Exit 0。
- [x] `audit_arch_boundary.py` 可準確辨識跨 Feature 私有穿透，現有 `chrome_pk` 通過檢驗。
- [x] `sync_toolbox_registry.py` 可自動偵測工具清冊一致性。
- [x] `audit_suite.py` 整合後無縫納入全域驗收。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-29] [Gate 1] 完成目標規劃與 Phase 拆解，建立任務檔並納入 Git 防護 (Session 1)
- [2026-10-29] [Gate 2 - Phase 1] 實作 `1.devtools/tools/scaffold_tool.py`，支援標準 4 件套（manifest/View/index/types）、`registry.ts` 自動掛載與 `--remove` 卸載。實機生成 `sample-tool` 並完成 `npm run build` 編譯驗證（Exit 0），最後執行清理還原成功 (Session 2)
- [2026-10-29] [Gate 2 - Phase 2] 實作 `1.devtools/tools/audit_arch_boundary.py`，完成四層領域架構反向依賴檢測 (`RULE_ARCH_SHARED_PURITY`)、跨 Feature 門面穿透檢測 (`RULE_ARCH_BARREL_PENETRATION`) 與微工具隔離防護 (`RULE_ARCH_MICRO_TOOL_ISOLATION`)。沙盒單元測試與 `chrome_pk` 154 個檔案實機審計皆 100% 通過 (Exit 0) (Session 3)
- [2026-10-29] [Gate 2 - Phase 3] 實作 `1.devtools/tools/sync_toolbox_registry.py`，支援孤兒工具、幽靈工具、manifest 協議合規檢查與 `--fix` 自動重新同步；成功整合至 `audit_suite.py` 成為 Suite 8 與 9，實機 9 大門禁審計 100% 通過 (Exit 0) (Session 4)
- [2026-10-29] [Gate 3 - Phase Final] 執行 `audit_suite.py --compact` 與 `audit_manifests.py` 全數 Exit 0 通過；完成 SSOT 實體閉環回寫（`guide-pk-features-arch.md`、`overview-pk.md` 與 `pk-core/SKILL.md`）；本任務全數達成並正式歸檔 (Session 5)

## 8. AI 簽到區與會話接力
> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol 與會話隔離底線。
> - [x] 嚴禁在 Gate 1 修改任何原始程式碼。
