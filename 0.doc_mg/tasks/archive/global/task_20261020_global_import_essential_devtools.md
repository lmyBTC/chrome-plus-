---
title: "引入部落格工具庫精選模組 (Token審計/Markdown死鏈/Git段落抽取)"
plugin: "global"
status: "已完成"
created: "2026-10-20"
deadline: "2026-10-20"
appetite: "2h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 5 (Phase Final 完成與結案歸檔)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：閱讀外部投研部落格工程工具庫 (`source-lmyBTC.github.io/tools/README.md`)，篩選並引入完全適合本 Chrome 擴充功能專案的實用工具，強化全域門禁審計與 Token 節省基建。
- **核心目標**：
  1. 引入 `audit_token_usage.py` 與 `token_estimator.py`：建立規則檔與技能檔 Token 預算監控守門員。
  2. 引入 `audit_markdown_links.py`：實現全專案 Markdown 相對路徑、錨點與跨檔引用自動校驗與 `--fix` 修復。
  3. 引入 `git_extract_section.py`：提供自 Git 歷史 Commit 秒級抽取特定章節/函式之能力，杜絕長歷史探勘時全檔 checkout 的 Token 浪費。
  4. 同步更新 `1.devtools/README.md`，納入專案工具清單。
- **邊界與假設**：
  - 嚴格排除部落格專屬之 SEO/資料庫同步與文章編譯管線。
  - 移植之腳本必須維持「零依賴、純 Python 3 原生標準庫」原則，完全相容 Windows 與 PowerShell 環境。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`1.devtools/README.md`。
- **影響範圍地圖 (Entity Map)**：
  - `1.devtools/tools/audit_token_usage.py` (新增)
  - `1.devtools/tools/token_estimator.py` (新增)
  - `1.devtools/tools/audit_markdown_links.py` (新增)
  - `1.devtools/tools/git_extract_section.py` (新增)
  - `1.devtools/README.md` (文檔同步)
- **前置條件 (Prerequisites)**：Git 工作區乾淨，Python 3 環境可用。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：外部工具均採純原生 Python 撰寫，無第三方依賴，直接移植適配本專案目錄規範。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（全量複製）：將外部所有工具複製過來。缺點：引入無效的 SEO 與文章編譯代碼，嚴重污染專案目錄。
  - 方案 B（精準引進高價值通用工具，選定）：僅挑選經評估完全適用於本專案之 Token 預算防護、Markdown 死鏈審計、Git 章節抽取等基建模組。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔，落實局部錨定更新。
  - 嚴禁傳遞 ArtifactMetadata 於專案檔案。
  - 嚴禁更動各 Chrome 插件源碼目錄。
  - 嚴禁引入外部 pip 第三方套件依賴。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/audit_token_usage.py`
- `./1.devtools/tools/token_estimator.py`
- `./1.devtools/tools/audit_markdown_links.py`
- `./1.devtools/tools/git_extract_section.py`
- `./1.devtools/README.md`
- `0.doc_mg/tasks/task_20261020_global_import_essential_devtools.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 終端日誌脫水: `2>&1 | py 1.devtools/tools/compact_log.py`
- [x] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無插件元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [x] L4 任務生命週期: `0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 引入 Token 預算審計與估算器 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 移植 `token_estimator.py` 與 `audit_token_usage.py`
    - **動作**: 自外部工具庫移植至 `1.devtools/tools/`，適配本專案之路徑結構（掃描 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/` 與 `0.doc_mg/`），支援 `--compact` 輸出。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_token_usage.py` 成功輸出本專案核心規則之 Token 消耗與健康度檢查。
- [x] 任務 1.2: 驗證 Token 審計閾值與預警機制
    - **動作**: 測試規則檔 (>2,000 tokens) 與技能檔 (>3,000 tokens) 警報邏輯，確認在無外部依賴下運行正常。
    - **驗證 (Exit 0)**: 執行指令 Exit code 0。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 引入 Markdown 死鏈與錨點審計修復工具 狀態：`[已完成]`
- [x] 任務 2.1 `[Blocker]`: 移植 `audit_markdown_links.py`
    - **動作**: 自外部工具庫移植至 `1.devtools/tools/audit_markdown_links.py`，調整根目錄判定，排查 `0.doc_mg/`、`.agents/` 及各插件之 Markdown 連結。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/audit_markdown_links.py` 成功掃描全站 Markdown 相對連結與錨點。
- [x] 任務 2.2: 驗證路徑漂移排查與 `--fix` 機制
    - **動作**: 驗證死鏈回報機制與自動修復安全防護。
    - **驗證 (Exit 0)**: 審計通過且 Exit code 0。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力提示詞代碼塊。

### Phase 3: 引入 Git 歷史段落抽取工具 狀態：`[已完成]`
- [x] 任務 3.1: 移植 `git_extract_section.py`
    - **動作**: 自外部工具庫移植至 `1.devtools/tools/git_extract_section.py`，確保 Windows PowerShell 相容與 UTF-8 編碼處理。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/git_extract_section.py --help` 正常顯示 CLI 說明。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔。
> - [x] 輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計、文檔同步與結案歸檔 狀態：`[已完成]`
- [x] 任務 F.1: 同步更新 `1.devtools/README.md`
    - **動作**: 將新引入之 4 個工具加入工具清單矩陣與 CLI 呼叫範例。
    - **驗證 (Exit 0)**: 文檔路徑與描述準確無誤。
- [x] 任務 F.2: 執行自動化工具合規審計與任務歸檔
    - **動作**: 執行 `py 1.devtools/tools/audit_manifests.py` 與 `py 1.devtools/tools/doc_cross_ref.py` 驗證全站無死鏈與 Manifest 合規；依封存協議歸檔至 `0.doc_mg/tasks/archive/global/`。
    - **驗證 (Exit 0)**: 審計通過 0 警告 0 錯誤。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：外部工具寫入檔案時可能未指定 UTF-8 編碼導致 Windows PowerShell 下編碼錯亂。防範措施：在移植時統一檢查並強制 `encoding="utf-8"`。
- **降級/回滾方案 (Blast Radius Control)**：新工具均為獨立新增之腳本，不改動現有外裝外掛代碼；若驗證有誤可直接以 Git 移除單一腳本。
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **獨立可用**: 所有移植之工具均能透過 `py 1.devtools/tools/<script>.py` 獨立執行，不依賴任何第三方 pip 套件。
- [x] **Windows/PowerShell 相容**: 檔案讀寫均使用原生 UTF-8，無 BOM 且無編碼錯誤。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] 已執行自動審計腳本 (`audit_manifests.py` / `doc_cross_ref.py`) 確保通過。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [x] [N/A] 輕量任務豁免 (無插件結構變動，L1~L3 免回寫)
  - [x] L4 任務生命週期: 任務結案後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`
- [x] **強制收尾 (Mandatory Closure)**: 回報任務完成前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-20] 藍圖建立完成 (Session 1)
- [2026-10-20] Phase 1 完成：成功移植 `token_estimator.py` 與 `audit_token_usage.py`，支援純 Python 3 原生無依賴運行、Windows 控制台 UTF-8 相容、POSIX 正斜線路徑格式與 `--compact` 精簡模式，全數通過單元驗證 (Exit 0) (Session 2)
- [2026-10-20] Phase 2 完成：成功移植 `audit_markdown_links.py`，支援全站 78 個 Markdown 檔案秒級快速掃描、死鏈與脆弱路徑排查、`--fix` 鏡像連結自動標準化、`--quiet` 與 `--json` 格式化輸出，全數通過單元驗證 (Exit 0) (Session 3)
- [2026-10-20] Phase 3 完成：成功移植 `git_extract_section.py`，支援跨 Commit 歷史快速精準抽取 Markdown 標題區塊與 HTML 區塊、Windows 控制台 UTF-8 相容、Token 預估、超長預警截斷、落盤與 `--compact` 模式，全數通過單元驗證 (Exit 0) (Session 4)
- [2026-10-20] Phase Final 完成：同步更新 `1.devtools/README.md` 工具矩陣，修復 `audit_manifests.py` 深入走訪剪枝與緩衝效能漏洞，全站 Manifest V3 與引用檢查全部通過 (Exit 0)，完成結案歸檔 (Session 5)

## 8. AI 簽到區與會話接力
> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> - [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> - [x] 結案前已執行 `audit_manifests.py` / `doc_cross_ref.py` 完成自動化驗證。
>
> **參與對話 ID 紀錄**:
> - [2026-10-20] ID: acd970e2-9232-4002-a7f7-1c35bcbf5c72 (Gate 1 初始化)
> - [2026-10-20] ID: 45ddc154-6bf1-4cda-bb68-28e63e53fc00 (Phase 1 執行完成)
> - [2026-10-20] ID: af862dbe-0f9b-4ecc-bf65-a63a06c08a2e (Phase 2 執行完成)
> - [2026-10-20] ID: 6b04b58b-2566-4c81-ad2a-719ec22c7836 (Phase 3 執行完成)
> - [2026-10-20] ID: d4207c5c-8b5a-4a5b-9743-5203f0e592f9 (Phase Final 效能根治、自動化驗證與結案歸檔)
>
> **結案狀態**: 本任務已全數完成並歸檔至 `0.doc_mg/tasks/archive/global/`。
