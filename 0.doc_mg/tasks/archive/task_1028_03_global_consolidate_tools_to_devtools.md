---
title: "全面整併 0.doc_mg/tools 工具鏈至 1.devtools 消除職責重疊"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-28"
deadline: "2026-10-28"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 2 (Phase 1~3 全部完成，Gate 3 審計 Exit 0 通過)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
  「`0.doc_mg\tools` 重複功能了 應該以 `1.devtools` 為主」
- **核心目標**：
  1. 明確架構邊界職責：`0.doc_mg` 專注於文件與任務生命週期治理，不再保留工具執行目錄；`1.devtools` 為專案唯一且權威的開發者工具鏈中樞。
  2. 消除重複功能：確認 `0.doc_mg/tools/archive_rotator.py` 已由 `1.devtools/tools/task_cli.py archive` 100% 完整吸收，淘汰冗餘腳本。
  3. 遷移存量工具：將 `main_dispatcher.py` 及 `gas/google_sync_hub.gs` 遷移至 `1.devtools/tools/`，並修正其模組路徑定位。
  4. 全域引用鏈接校正：更新所有提及 `0.doc_mg/tools/...` 之文檔、教學手冊與 UI 提示。
  5. 安全移除 `0.doc_mg/tools/` 目錄，並通過全套自動化審計套件驗收（Exit 0）。
- **邊界與假設**：
  - 微服務 `main_dispatcher.py` 代理目標仍為 `chrome_gemini_nano/tools/main_dispatcher.py`。
  - `task_cli.py` 的雙層滾動歸檔功能維持既有行為標準（上限 10 份緩衝，30 天下沉 history）。
  - 全域審計（`audit_suite.py` 與 `audit_ssot.mjs`）必須維持 0 錯誤 0 死鏈。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 [GEMINI.md](../../GEMINI.md)、[.agents/rules.md](../../.agents/rules.md) 及 [README_DEVTOOLS.md](../../1.devtools/README_DEVTOOLS.md)。
- **影響範圍地圖 (Entity Map)**：
  - 工具層：
    - `0.doc_mg/tools/archive_rotator.py` ➔ 廢除（由 `1.devtools/tools/task_cli.py archive` 取代）
    - `0.doc_mg/tools/main_dispatcher.py` ➔ 遷移至 `1.devtools/tools/main_dispatcher.py`
    - `0.doc_mg/tools/gas/google_sync_hub.gs` ➔ 遷移至 `1.devtools/tools/gas/google_sync_hub.gs`
    - `0.doc_mg/tools/` ➔ 徹底移除
  - 文檔與規格層：
    - `0.doc_mg/docs/README_TASK_MANAGER.md`
    - `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`
    - `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md`
    - `0.doc_mg/docs/README_SSOT.md`
    - `1.devtools/README_DEVTOOLS.md`
    - `README.md`
    - `README_USER_MANUAL.md`
  - 前端與插件層：
    - `finance-research-clipper-oss/options.html`
- **前置條件 (Prerequisites)**：Git 工作目錄乾淨，`task_cli.py archive --dry-run` 執行無報錯。

## 3. 策略與架構防護 (Strategy & Guardrails)

- **DRY 檢查**：堅決杜絕 `task_cli.py` 與 `archive_rotator.py` 功能重複；工具類實體統一收納至 `1.devtools/tools/`。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A：在 `0.doc_mg/tools/` 保留轉發 shim 到 `1.devtools/tools/`。
    - 缺點：目錄依然存在，無法根治使用者指出的重複與架構混亂痛點。
  - 方案 B（選定）：完全遷移並修正所有全域引用路徑，徹底刪除 `0.doc_mg/tools/`。
    - 優點：單一真理源，`0.doc_mg` 職責純化為純文檔與任務記錄，`1.devtools` 成為專案唯一工具庫。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁破壞 `chrome_gemini_nano/tools/main_dispatcher.py` 既有 FastAPI / Uvicorn 服務邏輯。
  - 嚴禁在未修正文檔引用前逕行刪除導致死鏈。

### 鎖定檔案 (Target Files)

- `1.devtools/tools/main_dispatcher.py` (新增/遷移)
- `1.devtools/tools/gas/google_sync_hub.gs` (新增/遷移)
- `0.doc_mg/tools/archive_rotator.py` (移除)
- `0.doc_mg/tools/main_dispatcher.py` (移除)
- `0.doc_mg/tools/gas/google_sync_hub.gs` (移除)
- `0.doc_mg/docs/README_TASK_MANAGER.md` (更新引用)
- `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md` (更新引用)
- `0.doc_mg/docs/README_GAS_DEPLOYMENT_GUIDE.md` (更新引用)
- `0.doc_mg/docs/README_SSOT.md` (更新索引)
- `1.devtools/README_DEVTOOLS.md` (更新工具表)
- `README.md` (更新指令)
- `README_USER_MANUAL.md` (更新指令)
- `finance-research-clipper-oss/options.html` (更新路徑提示)

### 鎖定工具鏈 (Target Devtools)

- [x] 任務 CLI: `py 1.devtools/tools/task_cli.py archive`
- [x] 審計套件: `py 1.devtools/tools/audit_suite.py`
- [x] SSOT 審計: `node 1.devtools/tools/audit_ssot.mjs`
- [x] 死鏈校驗: `py 1.devtools/tools/doc_cross_ref.py --audit`

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [x] L2 插件/模組導航：`1.devtools/README_DEVTOOLS.md` (更新工具清單)
- [x] L2 全域導航：`0.doc_mg/docs/README_SSOT.md` (更新文檔與工具定位)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 工具實體遷移與目錄清退 (Consolidate Scripts to 1.devtools) 狀態：`[已完成]`
- [x] 任務 1.1: 遷移 `main_dispatcher.py` 與 `gas/google_sync_hub.gs` 至 `1.devtools/tools/`
    - **動作**: 建立 `1.devtools/tools/gas/` 目錄並移動 `google_sync_hub.gs`；移動並改寫 `main_dispatcher.py`，調整相對路徑 (`Path(__file__).resolve().parent.parent.parent / "chrome_gemini_nano" / ...`)。
    - **驗證 (Exit 0)**: 執行 `py -m py_compile 1.devtools/tools/main_dispatcher.py` 語法檢查通過。
- [x] 任務 1.2: 廢除 `0.doc_mg/tools/archive_rotator.py` 並清理 `0.doc_mg/tools`
    - **動作**: 確認 `1.devtools/tools/task_cli.py archive --dry-run` 運作正常後，刪除 `0.doc_mg/tools` 整個目錄。
    - **驗證 (Exit 0)**: 確認 `0.doc_mg/tools` 已不存在。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循 One Phase, One Session 規範。

### Phase 2: 全域文檔、註解與前端提示鏈接更新 (Update References & SSOT) 狀態：`[已完成]`
- [x] 任務 2.1: 更新 `0.doc_mg/docs/` 下的文檔引用
    - **動作**: 在 `README_TASK_MANAGER.md` 與 `README_TOKEN_OPTIMIZATION_GUIDE.md` 中將 `0.doc_mg/tools/archive_rotator.py` 改為 `1.devtools/tools/task_cli.py archive`；在 `README_GAS_DEPLOYMENT_GUIDE.md` 中修正 `google_sync_hub.gs` 路徑。
    - **驗證 (Exit 0)**: 搜尋 `0.doc_mg/docs/` 確認已無舊路徑。
- [x] 任務 2.2: 更新根目錄文檔、`1.devtools/README_DEVTOOLS.md` 與前端介面
    - **動作**: 更新 `README.md`、`README_USER_MANUAL.md`、`1.devtools/README_DEVTOOLS.md`、`finance-research-clipper-oss/options.html`。
    - **驗證 (Exit 0)**: 搜尋全局活躍代碼與文檔，確認已無 `0.doc_mg/tools` 引用。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 遵循 One Phase, One Session 規範。

### Phase 3: 自動化審計驗收與任務歸檔 (Gate 3 Automated Audit & SSOT Closure) 狀態：`[已完成]`
- [x] 任務 3.1: 執行自動化審計套件驗收
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py`、`node 1.devtools/tools/audit_ssot.mjs` 與 `py 1.devtools/tools/doc_cross_ref.py --audit`。
    - **驗證 (Exit 0)**: 全部審計工具回報 0 Error 0 Warning (Exit 0)。
- [x] 任務 3.2: 任務狀態標記已完成並雙層歸檔
    - **動作**: 將任務標記為已完成，執行 `py 1.devtools/tools/task_cli.py archive` 自動歸檔。
    - **驗證 (Exit 0)**: 任務檔移至 `0.doc_mg/tasks/archive/`。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)

- **最可能失敗場景 (Pre-Mortem)**：
  - `main_dispatcher.py` 遷移後因目錄深淺變化（從 `0.doc_mg/tools` 深度 2 變為 `1.devtools/tools` 深度 2，深度其實相同），但若路徑計算失誤會導致找不到 `chrome_gemini_nano`。
  - 降級防範：以 `Path(__file__).resolve().parent.parent.parent` 精確計算工作區根目錄，並在遷移後立即執行 import 測試。
- **熔斷機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **工具中樞單一化**: 工作區中僅存在唯一工具目錄 `1.devtools/tools/`，`0.doc_mg/tools/` 徹底移除。
- [x] **功能無損**: `task_cli.py archive` 與 `main_dispatcher.py` 均可正常運作。
- [x] **鏈接與引用一致性**: 全域活躍檔案與文檔皆無指涉 `0.doc_mg/tools` 的死鏈。
- [x] **自動化審計 Exit 0**: `audit_suite.py` 與 `audit_ssot.mjs` 審計全數通過。
