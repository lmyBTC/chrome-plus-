---
title: "全域工程衛生清理、跨插件契約審計守門與文檔 Token 脫水治理"
plugin: "global"
status: "已完成"
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "1.5h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase 3 驗收結案)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
  用戶要求執行全面系統優化任務（"do all create task go"），包含工作區任務衛生、跨插件通訊契約審計守門整合、以及核心高耗 Token 文檔脫水精煉。
- **核心目標**：
  1. **工程衛生收斂 (P0)**：歸檔已完結之歷史任務卡，清除 `0.doc_mg/tasks/tmp/` 與雜訊檔案，將 `chrome_video speed plus` 版號修正為 SemVer `1.0.0`。
  2. **契約守門自動化 (P1)**：將 `1.devtools/tools/validate_contract.py` 整合至 `1.devtools/tools/audit_suite.py`，新增「跨插件黑盒契約驗證」門禁，杜絕 Payload 結構漂移。
  3. **Token 脫水精煉 (P1)**：針對 Tier 2 Token 警告最嚴重之核心規格（如 `guide-task-manager.md`、`guide-token-optimization.md`、`spec-cross-plugin-contract.md`）進行高信噪比脫水與表格化精簡，使單檔顯著降至安全水位，且全域交叉參照 0 死鏈。
- **邊界與假設**：
  - 嚴格遵守 3-Gate 門禁與 One Phase, One Session 物理隔絕。
  - 不更動各插件之核心業務邏輯代碼，僅升級自動化工具鏈與優化架構規格文檔。
  - 任務執行期間每一步驗收皆以命令 Exit 0 為唯一客觀判定。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`0.doc_mg/docs/index-ssot.md`、`0.doc_mg/docs/spec-cross-plugin-contract.md`、`0.doc_mg/docs/guide-token-optimization.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `audit_token_usage.py` & `version_manager.py` | 發現 13 筆 Tier 2 Token 警告、VideoSpeedPlus 1.0 非標準版號 | 掌握全域痛點，Exit 0 |
  | **Gate 2: 執行** | `npm run audit:suite` & `task_cli.py` | 待 Phase 1~3 執行時調用 | 待執行 |
  | **Gate 3: 驗收** | `npm run audit:suite` & `npm run audit:ssot` | 待 Phase 3 結案整合驗收 | 待執行 |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_system_opt_blueprint.md`
- **影響範圍地圖 (Entity Map)**：
  - `0.doc_mg/tasks/`（任務歸檔與臨時檔案清理）
  - `chrome_video speed plus/manifest.json`（版本號標準化）
  - `1.devtools/tools/audit_suite.py` 與 `validate_contract.py`（契約守門整合）
  - `0.doc_mg/docs/guide-token-optimization.md`（高信噪比脫水）
  - `0.doc_mg/docs/guide-task-manager.md`（高信噪比脫水）
  - `0.doc_mg/docs/spec-cross-plugin-contract.md`（高信噪比脫水）
- **前置條件 (Prerequisites)**：Git 工作區乾淨且可追蹤。

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：利用既有之 `1.devtools/tools/task_cli.py archive`、`validate_contract.py` 與 `audit_suite.py`，不另建多餘指令。
- **架構策略與 Tree of Thoughts (ToT)**：
  - *方案 A (暴力全面重寫所有大文檔)*：容易引起交叉參照大面積斷鏈與語意遺漏。
  - *方案 B (分層聚焦關鍵瓶頸，以表格與架構圖精煉，保留錨點)*【採納】：聚焦 Token 最膨脹之 Top 3 文檔，保留既有章節錨點，剔除重複敘述，改採緊湊矩陣呈現。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔，嚴禁跨 Phase 自動連續執行。
  - 單一問題重試上限 2 次 (2-Strike 熔斷)。

### 鎖定檔案 (Target Files)
- `chrome_video speed plus/manifest.json` (Line 3: version)
- `1.devtools/tools/audit_suite.py` (整合契約審計門禁)
- `0.doc_mg/docs/guide-token-optimization.md`
- `0.doc_mg/docs/guide-task-manager.md`
- `0.doc_mg/docs/spec-cross-plugin-contract.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘與 Token 審計: `py 1.devtools/tools/audit_token_usage.py`
- [ ] 結案整合審計: `npm run audit:suite`
- [ ] SSOT 靜態審計: `npm run audit:ssot`
- [x] 版本狀態確認: `npm run version:list`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L2 插件導航：`0.doc_mg/docs/index-ssot.md` (若文檔結構有變動時微調)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (結案後歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 工作區任務生命週期結案與工程衛生整理 (P0) 狀態：`[已完成]`
- [x] 任務 1.1: 歸檔結案歷史任務卡（`task_20261029_docs_naming_taxonomy_refactor.md` 與 `task_20261009_global_fix_canary_extensions_persistence.md`）至 `0.doc_mg/tasks/archive/`。
- [x] 任務 1.2: 清理 `0.doc_mg/tasks/tmp/` 臨時目錄與大寫副檔名 `0.doc_mg/tasks/NOTE.MD`。
- [x] 任務 1.3: 將 `chrome_video speed plus/manifest.json` 版本號由 `"1.0"` 修正為標準 SemVer `"1.0.0"`。
- [x] 任務 1.4: 驗收 `npm run version:list` 與 `0.doc_mg/tasks/` 目錄純淨度。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`，將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：於回覆末尾強制輸出開立新 Session 接力提示詞代碼塊，嚴禁於本會話連續推進下一階段。

### Phase 2: 審計套件升級：整合跨插件黑盒契約驗證 (P1) 狀態：`[已完成]`
- [x] 任務 2.1: 檢視 `1.devtools/tools/validate_contract.py` 的調用介面與驗收返回值。
- [x] 任務 2.2: 升級 `1.devtools/tools/audit_suite.py`，將跨插件契約驗證納為第 7 項守門門禁。
- [x] 任務 2.3: 執行 `npm run audit:suite`，驗證 7 大門禁全數 PASS (Exit 0)。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`，將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 輸出新會話接力提示詞代碼塊，交回控制權。

### Phase 3: 核心 SSOT 文檔 Token 脫水與高信噪比精煉 (P1) 狀態：`[已完成]`
- [x] 任務 3.1: 對 `guide-token-optimization.md`、`guide-task-manager.md` 與 `spec-cross-plugin-contract.md` 進行冗餘敘述脫水、結構化表格化精煉，保留所有錨點。
- [x] 任務 3.2: 執行 `py 1.devtools/tools/audit_token_usage.py`，驗證 Tier 2 警告顯著下降。
- [x] 任務 3.3: 執行 `npm run audit:suite` 與 `npm run audit:ssot`，確認全域交叉參照 0 死鏈、0 孤兒 (Exit 0)。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [ ] 狀態標記為 `[已完成]`，將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 執行 `npm run task:archive` 封存結案本任務。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：
  - 文檔脫水過程中不慎刪除了其他文件或腳本所依賴的 Heading 錨點，引發死鏈。
  - 降級方案：精煉後立即執行 `py 1.devtools/tools/doc_cross_ref.py --audit` 檢查，若發現斷鏈即刻原樣補齊錨點。
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] `0.doc_mg/tasks/` 根目錄僅保留模板與進行中任務，已結案任務均已歸檔。
- [x] 全專案 5 大插件版本號符合標準 SemVer，`npm run version:list` 零異常。
- [x] `npm run audit:suite` 成功納入契約驗證，7 大門禁全數 PASS (Exit 0)。
- [x] 核心文檔 Token 顯著下降，全專案 Markdown 交叉參照 0 死鏈、0 孤兒。
- [x] 結案前已更新實體 task 檔案並依協議歸檔。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-29] Gate 1 藍圖建立完成：完成全域痛點探勘，確立 3 大 Phase 執行清單 (Session 1)
- [2026-10-29] Phase 1 完成：歸檔 2 份已完成任務卡、清理 tmp 與 NOTE.MD、標準化 VideoSpeedPlus 為 1.0.0，5 大插件 SemVer 驗收 Exit 0 (Session 2)
- [2026-10-29] Phase 2 完成：升級 audit_suite.py 整合 validate_contract.py 作為第 7 大門禁，校驗 7 份契約快照，7 大門禁全數 PASS (Exit 0) (Session 3)
- [2026-10-29] Phase 3 完成：核心 3 大 SSOT 文檔脫水降幅達 28%~47%（累計省 12,623 Tokens），保留 100% 錨點，7 大門禁 Exit 0 綠燈通過 (Session 4)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `audit_token_usage.py`: 探勘全域文檔 Token 水位，鎖定 13 筆 Tier 2 警告清單
> - `version_manager.py`: 盤點與驗收全專案 5 大插件版本號符合標準 SemVer 1.0.0
> - `task_cli.py`: 執行雙層任務歸檔，收斂根目錄純淨度
> - `validate_contract.py`: 驗證 7 份跨插件契約快照 Schema 100% 合規
> - `audit_suite.py`: 升級 7 大門禁自動化審計全數 PASS
> **參與對話 ID 紀錄**:
> - [2026-10-29] ID: aa812669-46d8-4c15-8463-a1e6c25604b7 (Gate 1 藍圖規劃)
> - [2026-10-29] ID: a6364b1e-04f1-4984-bd6c-5e5653d6a3e4 (Phase 1 執行)
> - [2026-10-29] ID: 35d7e4fe-57dd-4d08-a66b-0d1b36b29950 (Phase 2 執行)
> - [2026-10-29] ID: 5973fd96-5e92-4adc-ad8c-6e1647b69f17 (Phase 3 驗收結案)
