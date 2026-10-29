---
title: "devtools 純粹全域職責重構：下沉插件工具至專屬插件目錄"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-28"
deadline: "2026-10-28"
appetite: "1.5h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase Final Gate 3 Completed & Archived)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
  「`1.devtools 應該只放專案工作區global 與管理用途的工具，若為插件使用的工具或腳本應該搬移到獨立的插件中管理收納使用`」
- **核心目標**：
  1. **界定與純化 `1.devtools` 邊界**：`1.devtools` 僅收納專案工作區 Global 開發、治理、審計與跨插件規範工具（如 `audit_suite.py`, `repo_radar.py`, `task_cli.py`, `validate_contract.py`, `launch_canary_dev.bat` 等），嚴禁存放單一插件內部業務工具與測試。
  2. **下沉插件專屬工具與測試**：
     - `chrome_gemini_nano`: 廢除 `1.devtools/tools/main_dispatcher.py` 冗餘轉發代理，全域微服務指引回歸 `chrome_gemini_nano/tools/main_dispatcher.py` 本身。
     - `finance-research-clipper-oss`:
       - 搬移 `1.devtools/tools/export_converter.py` ➔ `finance-research-clipper-oss/tools/export_converter.py`
       - 搬移 `1.devtools/tools/gas/google_sync_hub.gs` ➔ `finance-research-clipper-oss/tools/gas/google_sync_hub.gs`（清理 `1.devtools/tools/gas` 目錄）
       - 搬移 `1.devtools/scripts/split_dashboard_phase3.py` ➔ `finance-research-clipper-oss/scripts/split_dashboard_phase3.py`
       - 搬移 `1.devtools/tests/test_google_sheets_exporter.js` ➔ `finance-research-clipper-oss/tests/test_google_sheets_exporter.js`
  3. **測試與全域工具鏈解耦**：
     - 重構 `1.devtools/tests/run_tests.py`：使 `1.devtools` 測試套件專注於 Global 工具（`validate_contract.py` 與 `test_cross_plugin_e2e.py`）。
     - 更新 `1.devtools/README_DEVTOOLS.md`：移除插件專屬工具，維持乾淨的 Global 開發者工具矩陣。
  4. **全域引用路徑校正**：校驗並修正所有文檔（`README.md`, `README_USER_MANUAL.md`, `0.doc_mg/docs/README_CROSS_PLUGIN_CONTRACT.md`, `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md`, `finance-research-clipper-oss/options.html` 等）對搬移檔案之鏈接。
  5. **自動化審計閉環**：確保 `audit_suite.py --strict`、`audit_ssot.mjs --strict`、`doc_cross_ref.py --audit` 全數 Exit 0。
- **邊界與假設**：
  - `1.devtools/scripts/unified_gas_router.gs` 與 `README_GAS_SETUP.md` 屬多插件數據匯流雲端後端，作為跨插件生態之全域雲端部署範本，保留在 `1.devtools/scripts/`。
  - `chrome_gemini_nano/tools/main_dispatcher.py` 已是完整本機 FastAPI 服務，移除 `1.devtools` 中的轉發 proxy 不會造成功能損失。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `../../../GEMINI.md`、[.agents/rules.md](../../../.agents/rules.md) 及 `../../../1.devtools/README_DEVTOOLS.md`。
- [x] **全流程工具鏈檢核矩陣 (已遵循 README_TOKEN_OPTIMIZATION_GUIDE.md 強制執行)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `py 1.devtools/tools/code_skeleton.py 1.devtools/tools/export_converter.py` ➔ 374行降為51行 | 減少 86.4% 雜訊 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | 全面強制串接 `compact_log.py` 與 `rtk` 命令，搭配 `analyze_task_tokens.py --quick-check` 監控水位 | 節省 70%~95% 輸出 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `doc_cross_ref.py` | 全自動整合審計套件與死鏈校驗 | Exit 0 |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_1028_04_devtools_refactor.md` (已錨定待下沉之 5 份檔案與目標目錄)
- **影響範圍地圖 (Entity Map)**：
  - 待下沉遷移至插件之檔案：
    - `1.devtools/tools/main_dispatcher.py` ➔ 廢除（直接由 `chrome_gemini_nano/tools/main_dispatcher.py` 承接）
    - `1.devtools/tools/export_converter.py` ➔ `finance-research-clipper-oss/tools/export_converter.py`
    - `1.devtools/tools/gas/google_sync_hub.gs` ➔ `finance-research-clipper-oss/tools/gas/google_sync_hub.gs`
    - `1.devtools/scripts/split_dashboard_phase3.py` ➔ `finance-research-clipper-oss/scripts/split_dashboard_phase3.py`
    - `1.devtools/tests/test_google_sheets_exporter.js` ➔ `finance-research-clipper-oss/tests/test_google_sheets_exporter.js`
  - 需解耦與更新之工具/測試：
    - `1.devtools/tests/run_tests.py`
    - `1.devtools/README_DEVTOOLS.md`
  - 需校正引用之文檔與前端：
    - `README.md`
    - `README_USER_MANUAL.md`
    - `0.doc_mg/docs/README_CROSS_PLUGIN_CONTRACT.md`
    - `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md`
    - `0.doc_mg/docs/README_SSOT.md`
    - `finance-research-clipper-oss/options.html`
- **前置條件 (Prerequisites)**：Git 工作目錄乾淨，`audit_suite.py --compact` 現況通過。

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：堅決杜絕插件內部微服務與轉譯腳本在 `1.devtools` 重複存放或以 proxy 形式存在。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A：在 `1.devtools` 保留所有檔案，僅更新文檔說明。
    - 缺點：違反使用者明確指示，`1.devtools` 依舊混雜外掛私有代碼。
  - 方案 B（選定）：嚴格落實職責分離。凡屬特定插件使用的工具、腳本與單元測試，一律搬入該插件的 `tools/`, `scripts/`, `tests/`；`1.devtools` 僅保留跨插件/工作區層級的 Global 治理工具。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁破壞 `chrome_gemini_nano/tools/main_dispatcher.py` 本身之 FastAPI 服務邏輯與同層模組載入。
  - 嚴禁遺漏文檔中提及舊路徑之死鏈，必須以 `doc_cross_ref.py --audit` 驗證。

### 鎖定檔案 (Target Files)

- `1.devtools/tools/main_dispatcher.py` (廢除移除)
- `1.devtools/tools/export_converter.py` (遷移至 finance-research-clipper-oss)
- `1.devtools/tools/gas/google_sync_hub.gs` (遷移至 finance-research-clipper-oss)
- `1.devtools/scripts/split_dashboard_phase3.py` (遷移至 finance-research-clipper-oss)
- `1.devtools/tests/test_google_sheets_exporter.js` (遷移至 finance-research-clipper-oss)
- `finance-research-clipper-oss/tools/export_converter.py` (新路徑)
- `finance-research-clipper-oss/tools/gas/google_sync_hub.gs` (新路徑)
- `finance-research-clipper-oss/scripts/split_dashboard_phase3.py` (新路徑)
- `finance-research-clipper-oss/tests/test_google_sheets_exporter.js` (新路徑)
- `1.devtools/tests/run_tests.py` (純化為 Global 測試)
- `1.devtools/README_DEVTOOLS.md` (純化工具表)
- `README.md` (修正微服務啟動指令)
- `README_USER_MANUAL.md` (修正微服務啟動指令)
- `0.doc_mg/docs/README_CROSS_PLUGIN_CONTRACT.md` (更新轉譯器路徑)
- `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md` (更新 GAS 路徑)
- `finance-research-clipper-oss/options.html` (更新提示路徑)

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py` / `py 1.devtools/tools/repo_radar.py`
- [x] 終端日誌脫水: `<command> 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [x] 水位預警探針: `py 1.devtools/tools/analyze_task_tokens.py --quick-check`
- [x] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log`
- [x] 整合審計套件: `py 1.devtools/tools/audit_suite.py --compact`
- [x] 任務 CLI 歸檔: `py 1.devtools/tools/task_cli.py archive`

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [x] L2 插件/模組導航：`1.devtools/README_DEVTOOLS.md` (更新工具矩陣)
- [x] L2 全域導航：`0.doc_mg/docs/README_SSOT.md` (更新索引)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 插件專屬工具下沉遷移與目錄收納 狀態：`[已完成]`
- [x] 任務 1.1: 遷移 `finance-research-clipper-oss` 專屬工具與測試
    - **動作**:
      1. 建立 `finance-research-clipper-oss/tools/` 與 `finance-research-clipper-oss/tools/gas/`，搬移 `export_converter.py` 與 `google_sync_hub.gs`。
      2. 建立 `finance-research-clipper-oss/scripts/`，搬移 `split_dashboard_phase3.py`。
      3. 建立 `finance-research-clipper-oss/tests/`，搬移 `test_google_sheets_exporter.js`，並修正其 `require` 路徑 (`../src/services/googleSheetsExporter.js`)。
      4. 刪除 `1.devtools/tools/gas/`、`1.devtools/tools/export_converter.py`、`1.devtools/scripts/split_dashboard_phase3.py` 與 `1.devtools/tests/test_google_sheets_exporter.js`。
    - **驗證 (Exit 0)**:
      - 執行 `node finance-research-clipper-oss/tests/test_google_sheets_exporter.js` 通過。
      - 執行 `py -m py_compile finance-research-clipper-oss/tools/export_converter.py` 語法通過。
- [x] 任務 1.2: 廢除 `1.devtools/tools/main_dispatcher.py` 冗餘轉發代理
    - **動作**: 刪除 `1.devtools/tools/main_dispatcher.py`，確認微服務核心完全由 `chrome_gemini_nano/tools/main_dispatcher.py` 獨立承擔。
    - **驗證 (Exit 0)**: 確認 `1.devtools/tools/main_dispatcher.py` 已清除，`chrome_gemini_nano/tools/main_dispatcher.py` 存在且可編譯。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出接力指令切換至 Session 3 (執行 Phase 2)。

### Phase 2: 全域工具/測試解耦與文檔鏈接校正 狀態：`[已完成]`
- [x] 任務 2.1: 重構 `1.devtools/tests/run_tests.py`
    - **動作**: 將 `run_tests.py` 純化為全域整合測試（聚焦於 `validate_contract.py` 與 `test_cross_plugin_e2e.py`），解除對 `export_converter.py` 的硬性路徑依賴（或改為選測插件路徑）。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tests/run_tests.py` 全數 PASS (Exit 0)。
- [x] 任務 2.2: 校正全域文檔與前端 UI 引用
    - **動作**:
      1. 更新 `README.md` 與 `README_USER_MANUAL.md` 中的微服務啟動指令為 `python chrome_gemini_nano/tools/main_dispatcher.py`。
      2. 更新 `0.doc_mg/docs/README_CROSS_PLUGIN_CONTRACT.md` 中的 `export_converter.py` 路徑。
      3. 更新 `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md` 與 `finance-research-clipper-oss/options.html` 中的 GAS 腳本路徑。
      4. 更新 `1.devtools/README_DEVTOOLS.md` 工具清單，移除已下沉的工具並強調純粹全域管理定位。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/doc_cross_ref.py --audit` 0 死鏈。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出接力指令切換至 Session 4 (Gate 3 Final)。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 自動化審計套件全面驗證 (Gate 3 Audit)
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `node 1.devtools/tools/audit_ssot.mjs --strict`。
    - **驗證 (Exit 0)**: 全套審計通過，無 CRITICAL / 死鏈報錯。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 更新 `0.doc_mg/docs/README_SSOT.md`，並執行 `py 1.devtools/tools/task_cli.py archive` 完成歸檔。
    - **驗證 (Exit 0)**: 任務檔移至 `0.doc_mg/tasks/archive/global/`。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 全套自動化審計通過 (Exit 0)，無 CRITICAL / 死鏈報錯。
> - [x] SSOT 真理源回寫完成 (`0.doc_mg/docs/README_SSOT.md`)。
> - [x] 任務標記已完成並透過 `task_cli.py archive` 歸檔封存。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：
  1. 搬移 `export_converter.py` 後，文檔或測試仍參照舊路徑導致死鏈。
  2. 廢除 `main_dispatcher.py` 導致依賴轉發的啟動腳本中斷。
- **降級/回滾方案 (Blast Radius Control)**：
  - 搬移操作前確認 Git 乾淨；若測試或審計報錯，以 `git checkout` 迅速復原。
- **熔斷與突發隔離機制**：
  - 單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤調用 `py 1.devtools/tools/log_issue.py log` 立案並還原代碼，強制停步開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **純粹全域定位**: `1.devtools/tools/` 與 `1.devtools/scripts/` 僅包含全域管理、審計、節省 token 與跨插件規範工具，無單一插件內部業務工具。
- [x] **獨立插件自治**: `finance-research-clipper-oss` 與 `chrome_gemini_nano` 擁有自己的 tools / scripts / tests 目錄，自給自足。
- [x] **全自動審計通過**: `py 1.devtools/tools/audit_suite.py --compact` 與 `node 1.devtools/tools/audit_ssot.mjs --strict` Exit 0。
- [x] **零死鏈**: 全專案 Markdown 與前端 HTML 引用鏈接完全正確，`doc_cross_ref.py --audit` 0 死鏈。
- [x] **四層 SSOT 閉環**: L2 工具矩陣更新完成，任務由 `task_cli.py archive` 歸檔至 `archive/global/`。
- [x] **強制收尾**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-28] [Gate 1]: 完成職責盤點與邊界分析，建立任務藍圖與防護清單，完成規範升級適配 (Session 1)。
- [2026-10-28] [Phase 1]: 完成 finance-research-clipper-oss 工具/腳本/測試下沉與 main_dispatcher proxy 廢除，單元驗證 5/5 全數通過 (Session 2)。
- [2026-10-28] [Phase 2]: 純化 run_tests.py 全域測試套件；校正全專案 README、手冊、合約、GAS 與 options.html 引用；完成 .repo_index.json 快取同步與 doc_cross_ref 零死鏈驗證 (Session 3)。
- [2026-10-28] [Phase Final]: 通過全套門禁審計 (audit_suite / audit_ssot / doc_cross_ref)，回寫 README_SSOT.md，標記完成並執行 task_cli.py archive 歸檔 (Session 4)。

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 效益)**:
> - `doc_cross_ref.py`: 驗證全專案 74 篇 Markdown 交叉引用 (0 死鏈)。
> - `generate_symbol_index.py`: 重新生成全域快取 `.repo_index.json` (347 符號 / 22 篇大綱)。
> - `run_tests.py`: 執行全域解耦整合測試 (4/4 PASS)。
> - `audit_suite.py`: 執行 Gate 3 全域整合門禁審計 (Exit 0)。
> - `audit_ssot.mjs`: 執行 SSOT 真理源防腐審計 (Exit 0)。
> - `task_cli.py`: 執行任務生命週期歸檔 (archive)。
> **任務結案狀態**: 本任務已全數完成驗收標準，所有插件工具下沉自治，門禁無死鏈無破壞，正式結案歸檔。
