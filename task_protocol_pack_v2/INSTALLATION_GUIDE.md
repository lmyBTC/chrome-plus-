# Task & Token Protocol 安裝與實戰調優手冊 (INSTALLATION GUIDE)

> [!IMPORTANT]
> 本手冊為 **Task & Token Protocol Pack** 的權威安裝與工程實踐調優指南。彙整自多個真實專案中導入、路徑踩坑、控制台編碼除錯、工具鏈演進與效能實測之第一手實證數據，旨在協助開發者與 AI 代理快速建立高規格、低 Token 消耗、具備物理會話隔離與 3-Gate 門禁機制的任務治理體系。

---

## 1. 核心定位與價值總覽 (Overview & Core Philosophy)

在長週期或高度複雜的軟體專案中，人類工程師與 AI 代理 (Coding Agents) 協同作業時常面臨三大致命痛點：
1. **探索期 Token 爆炸**：AI 習慣盲目全文讀取專案檔案，導致 Context Window 迅速填滿、記憶衰退並產生嚴重幻覺。
2. **缺乏會話隔離 (Context Bloat)**：多個 Phase 在同一個對話視窗中持續累積，對話後期 Context 膨脹至 100k+ tokens，推理品質陡降且容易忽略憲法級規範。
3. **任務管理漂移與 SSOT 失控**：任務過程缺乏結構化跟蹤，結案時程式碼與架構文檔脫節。

**Task & Token Protocol** 提供了一套標準化、輕量級的工程規範與工具鏈，落實以下核心準則：
* **3-Gate Multi-Session Protocol**：
  * **Gate 1 (Blueprint)**：唯讀探勘、鎖定範圍、產出藍圖任務檔並自動納入版本控制，產出接力指令後立即停步。
  * **Gate 2 (Atomic Execution)**：落實 **One Phase, One Session** 會話隔絕，每輪專注單一 Phase，實施 2-Strike 熔斷，結束時於 Checkpoint 批次更新狀態並輸出接力指令。
  * **Gate 3 (Knowledge Consolidation)**：執行自動化審計確實驗收，落實 SSOT 90/10 閉環，透過雙層滾動歸檔維持任務目錄純淨。
* **極低 Token 探索**：以雷達 (`repo_radar.py`)、焦點骨架 (`code_skeleton.py`) 與日誌脫水 (`compact_log.py`) 達成 80%~90% 以上的 Token 節約。

---

## 2. 環境準備與系統需求 (Prerequisites)

在安裝與使用本套件前，請確認環境滿足以下基本要求：

| 項目 | 最低需求 | 建議規格 | 說明 |
| :--- | :--- | :--- | :--- |
| **作業系統** | Windows 10/11, macOS, Linux | 跨平台支援 | 已針對 Windows 控制台 (CP950/CP936) 進行 UTF-8 專門防護 |
| **Python** | Python 3.8+ | Python 3.10+ | 標準庫支援 (無需額外第三方龐大依賴) |
| **版本控制** | Git 2.20+ | Git 最新版 | 用於任務生命週期自動防護 (`git add`) 與目錄定位 |
| **AI 代理環境** | Antigravity / Claude Code / Gemini CLI | 具備 Tool Calling 能力 | 支援各類支援代理工具調用之環境 |

---

## 3. 快速安裝與升級指南 (Installation Guide)

本套件內建專屬安裝程式 `install.py`，支援自動偵測、預覽、自動備份與安全覆蓋。

### 3.1 安裝流程與指令

請於 `task_protocol_pack` 目錄或宿主專案根目錄執行安裝腳本：

```bash
# 1. 預覽模式 (Dry-Run)：檢視即將建立或覆蓋的檔案清單與目標路徑
py task_protocol_pack/install.py --dry-run

# 2. 執行安裝 (預設自動建立時間戳備份目錄 backup_YYYYMMDD_HHMMSS)
py task_protocol_pack/install.py --install

# 3. 略過備份直接安裝 (適用於全新乾淨專案)
py task_protocol_pack/install.py --install --no-backup
```

### 3.2 目標安裝路徑對照表 (MappingSSOT)

`install.py` 會將套件組件自動分派至宿主專案的標準位置：

| 套件來源 (`task_protocol_pack/`) | 宿主專案目標路徑 | 類型與用途 |
| :--- | :--- | :--- |
| `docs/task_template_v2.md` | `0.doc_mg/task_template_v2.md` | 任務標準藍圖範本 (包含 3-Gate 與 Checkpoints) |
| `docs/task_manager.md` | `0.doc_mg/docs/README_TASK_MANAGER.md` | 任務管理系統規格與設計說明手冊 |
| `skills/task-protocol/SKILL.md` | `.agents/skills/task-protocol/SKILL.md` | AI 代理任務協議技能 |
| `skills/token-saver/SKILL.md` | `.agents/skills/token-saver/SKILL.md` | AI 代理 Token 節省技術指導技能 |
| `scripts/repo_radar.py` | `1.devtools/tools/repo_radar.py` | 低 Token 情報雷達 (地圖、大綱、切片、符號秒查) |
| `scripts/code_skeleton.py` | `1.devtools/tools/code_skeleton.py` | AST 代碼骨架提煉與焦點符號展開器 |
| `scripts/compact_log.py` | `1.devtools/tools/compact_log.py` | 終端長日誌脫水過濾器 |
| `scripts/generate_symbol_index.py` | `1.devtools/tools/generate_symbol_index.py` | 全域符號索引產生器 |
| `scripts/token_estimator.py` | `1.devtools/tools/token_estimator.py` | Token 消耗估算微庫 |
| `scripts/log_issue.py` | `1.devtools/tools/log_issue.py` | 2-Strike 阻礙與熔斷記錄器 |
| `scripts/analyze_task_tokens.py` | `1.devtools/tools/analyze_task_tokens.py` | 會話與任務 Token 消耗量測器 |
| `scripts/util_archive_manager.py` | `1.devtools/tools/util_archive_manager.py` | 雙層任務生命週期歸檔管理器 |

---

## 4. 三大實戰排坑指南 (Lessons Learned & Critical Pitfalls)

以下彙整自歷史任務（`task_1028_06`, `task_1029_01`, `task_1029_02`）中實際發生的三類嚴重陷阱與工程解法：

### 4.1 根路徑解析缺陷與共用微庫架構 (`lib/common.py`)

* **🚨 陷阱現象**：
  早期工具腳本使用 `Path(__file__).resolve().parent.parent` 來獲取專案根目錄。當工具直接放置於 `tools/` 時運作正常；但當工具收整至次級目錄（例如 `1.devtools/tools/`）時，只退兩層會誤判指向 `1.devtools/`，導致暫存檔、任務檔寫入路徑錯誤，或引發檔案找不到的異常。
* **🛠️ 工程解法**：
  建立 `1.devtools/tools/lib/common.py` 作為工具鏈共用微庫，實作標準根目錄動態探查函式 `get_repo_root()`：
  ```python
  def get_repo_root(start: Optional[Union[Path, str]] = None) -> Path:
      """
      向上搜尋單一真理源標記定位專案根目錄。
      判定標記：存在 .git 目錄、0.doc_mg 目錄 或 GEMINI.md 檔案。
      """
      current = Path(start).resolve() if start else Path.cwd().resolve()
      for parent in [current] + list(current.parents):
          if (parent / ".git").exists() or (parent / "0.doc_mg").is_dir() or (parent / "GEMINI.md").is_file():
              return parent
      return current
  ```
  所有工具腳本一律從 `lib.common` 引入 `REPO_ROOT`、`TASKS_DIR` 與 `TEMPLATE_PATH`，徹底杜絕硬編碼層級倒推的脆裂問題。

### 4.2 Windows 控制台編碼與環境相容 (`UnicodeEncodeError`)

* **🚨 陷阱現象**：
  在 Windows 繁體中文環境（預設代碼頁 CP950）或簡體中文環境（CP936）下，終端輸出 Emoji（如 🚀, 🏁, ⚠️）或特殊 UTF-8 符號時，Python 直譯器會直接噴出 `UnicodeEncodeError: 'cp950' codec can't encode character` 並中斷執行；此外，Token 分析工具讀取使用者 Antigravity Transcript 時，會因使用者主目錄路徑格式或自定義目錄而產生解析錯誤。
* **🛠️ 工程解法**：
  在 `lib/common.py` 中實作跨平台安全的輸出編碼自適應函式 `setup_utf8_output()`，並於工具模組初始化時強制調用：
  ```python
  def setup_utf8_output() -> None:
      """跨平台設置 sys.stdout 與 sys.stderr 為 UTF-8，解決 Windows 控制台亂碼或崩潰問題"""
      for stream_name in ('stdout', 'stderr'):
          stream = getattr(sys, stream_name, None)
          if stream is None:
              continue
          if hasattr(stream, 'reconfigure'):
              try:
                  stream.reconfigure(encoding='utf-8')
              except Exception:
                  pass
  ```
  針對 `analyze_task_tokens.py`，增設對 `~/.gemini/antigravity` 的自動解析相容，支援自動探查、傳入自定義 transcript 路徑及模糊任務名稱比對。

### 4.3 宿主專案適配與殘留清理 (Host Adaptation)

* **🚨 陷阱現象**：
  由外部移植之安裝包可能殘留來源專案的特有路徑或檔名（如舊版中的 `doc/doc_task`、`scratch/manage.py`、特定插件前綴）。若未經清理直接執行，會導致 AI 代理依循錯誤的索引建立幽靈目錄。
* **🛠️ 工程解法 (自檢驗證清單)**：
  1. **檢驗任務目錄 SSOT**：確認宿主專案之任務目錄為 `0.doc_mg/tasks/`（非 `doc/doc_task`）。
  2. **檢驗範本變更**：檢查 `0.doc_mg/task_template_v2.md` 中的 Checkpoint 格式與工具鏈呼叫路徑是否對齊。
  3. **專家技能路徑同步**：確保 `.agents/skills/task-protocol/SKILL.md` 與 `token-saver/SKILL.md` 內的腳本執行語法皆為 `py 1.devtools/tools/<script>.py`。

---

## 5. 工具鏈使用矩陣與指令手冊 (Toolchain Reference Matrix)

本套件提供之命令列工具皆具備低耗損、無外部肥大依賴特性。

| 工具指令 (Command) | 核心功能 | 適用階段 | 典型參數 / 使用範例 |
| :--- | :--- | :--- | :--- |
| `py 1.devtools/tools/task_cli.py init <title>` | 初始化新任務檔，自動產生流水號並自動執行 `git add` | Gate 1 | `py 1.devtools/tools/task_cli.py init "user_auth"` |
| `py 1.devtools/tools/task_cli.py status` | 列出當前活躍任務、進度百分比與鎖定狀態 | 全階段 | `py 1.devtools/tools/task_cli.py status` |
| `py 1.devtools/tools/task_cli.py handover` | 解析當前任務進度，生成標準新會話接力代碼塊 | Gate 2 | `py 1.devtools/tools/task_cli.py handover` |
| `py 1.devtools/tools/task_cli.py archive` | 將已完成之任務安全滾動歸檔至 `archive/` | Gate 3 | `py 1.devtools/tools/task_cli.py archive` |
| `py 1.devtools/tools/repo_radar.py map` | 生成專案結構縮略地圖與統計摘要 (超低 Token) | Gate 1 / 探勘 | `py 1.devtools/tools/repo_radar.py map` |
| `py 1.devtools/tools/repo_radar.py outline <file>` | 提取 Markdown 或代碼檔案的大綱/函式樹狀清單 | 探勘 | `py 1.devtools/tools/repo_radar.py outline src/index.ts` |
| `py 1.devtools/tools/repo_radar.py section <file> <H2>` | 僅讀取指定 Markdown 章節，避免全檔載入 | 探勘 | `py 1.devtools/tools/repo_radar.py section README.md "安裝"` |
| `py 1.devtools/tools/repo_radar.py symbol <name>` | 毫秒級全域查詢函式、類別或常數定義位置 | 探勘 / 調試 | `py 1.devtools/tools/repo_radar.py symbol get_repo_root` |
| `py 1.devtools/tools/code_skeleton.py <file>` | AST 語法樹骨架提煉 (保留函式簽名與 docstring) | 探勘 | `py 1.devtools/tools/code_skeleton.py lib/common.py` |
| `py 1.devtools/tools/code_skeleton.py <file> --expand <fn>` | 焦點骨架提煉：特定核心函式保留實作，其餘維持骨架 | 核心開發 | `py 1.devtools/tools/code_skeleton.py app.py --expand main` |
| `2>&1 \| py 1.devtools/tools/compact_log.py` | 終端長日誌脫水過濾 (剔除重覆堆疊與 node_modules 雜訊) | Gate 2 / 建置 | `npm test 2>&1 \| py 1.devtools/tools/compact_log.py` |
| `py 1.devtools/tools/analyze_task_tokens.py <task>` | 分析特定任務在對話軌跡中各會話的 Token 消耗 | 審計 / 複盤 | `py 1.devtools/tools/analyze_task_tokens.py task_1029_01` |
| `py 1.devtools/tools/log_issue.py log <reason>` | 2-Strike 熔斷阻礙記錄器，自動登記至任務檔 | 調試 / 熔斷 | `py 1.devtools/tools/log_issue.py log "跨域通訊逾時"` |

---

## 6. 3-Gate 門禁落地指引 (3-Gate Workflow in Action)

```mermaid
flowchart TD
    subgraph Gate 1 [Gate 1: Blueprint & Grounding]
        A[接收使用者需求] --> B[調用 repo_radar / skeleton 唯讀探勘]
        B --> C[py task_cli.py init 建任務檔]
        C --> D[自動 git add 納入防護]
        D --> E[輸出 Phase 1 接力提示詞後強制停步]
    end

    subgraph Gate 2 [Gate 2: Atomic Execution - One Phase, One Session]
        F[開立新會話貼入接力詞] --> G[單輪專注當前 Phase 原則]
        G --> H{遇到錯誤?}
        H -- 第 1 次失敗 --> I[記錄並調整策略重試]
        H -- 連續 2 次失敗 --> J[觸發 2-Strike 熔斷: log_issue.py 停步]
        H -- 執行成功 --> K[單元驗證 Exit 0]
        K --> L[於 Checkpoint 批次更新打勾]
        L --> M[py task_cli.py handover 生成接力詞並停步]
    end

    subgraph Gate 3 [Gate 3: Knowledge Consolidation & Audit]
        N[開立結案會話] --> O[執行自動化合規審計 audit_suite.py]
        O --> P[90/10 SSOT 閉環回寫]
        P --> Q[py task_cli.py archive 移入歸檔緩衝區]
        Q --> R[任務結案，工作區純淨]
    end

    Gate 1 --> Gate 2
    Gate 2 --> Gate 3
```

### 關鍵守門規範：
1. **嚴禁連跑多個 Phase**：Gate 2 嚴格要求「One Phase, One Session」。單一會話絕不同時推進 Phase 1 與 Phase 2。
2. **2-Strike 熔斷保護**：同一個技術問題或測試失敗連續發生 2 次，禁止進行第 3 次盲目重試，必須調用 `log_issue.py` 記錄阻礙原因並強制停步向使用者求助。
3. **收尾批次打勾原則**：在單一 Phase 執行過程中，嚴禁頻繁調用 `edit_file` 一行一行更新進度；必須在該 Phase 所有代碼修改與單元驗證均完成後，於最後階段進行單一局部語意區塊替換（≤ 50~80 行）。

---

## 7. 實證效能數據與收益評估 (Empirical Benchmarks)

以下數據來自 Chrome Plus Project 在實際導入 Task & Token Protocol 工具鏈後的實測紀錄：

```
+-------------------------------------------------------------------------------+
|                             TOKEN 節省實測效益對比                             |
+--------------------------+--------------------+-------------------+-----------+
| 指標項目                 | 未優化前 (Baseline)| 導入工具鏈優化後   | 效益提升  |
+--------------------------+--------------------+-------------------+-----------+
| 終端建置/測試日誌大小    | 24,580 Tokens      | 2,360 Tokens      | 節省 90.4%|
| 探勘期檔案讀取 (單檔)    | 12,000 Tokens (全讀)| 950 Tokens (雷達) | 節省 92.1%|
| 長任務後期對話 Context   | 109,200 Tokens     | 38,700 Tokens     | 釋放 64.6%|
| 任務完成平均會話數       | 1 個 (臃腫易忘記)  | 3 個 (隔離清爽)   | 幻覺率趨零|
+--------------------------+--------------------+-------------------+-----------+
```

* **90.4% 終端日誌脫水率**：`compact_log.py` 能過濾重複堆疊、編譯進度條與無關相依警告，使模型僅接收關鍵錯誤資訊與摘要。
* **物理會話隔離釋放 64.6% 上下文負擔**：藉由「One Phase, One Session」強制重開視窗接力，將 Context 峰值壓制在 40k 以下，徹底消除因 Context 飽和引起的指令遺忘與格式錯誤。
* **探索期毫秒級結構提煉**：`repo_radar.py` 與 `code_skeleton.py` 在百毫秒內返回結構，避免將數千行代碼全文送入 LLM。

---

## 8. 常見問題與健康檢查 (FAQ & Health Check)

### Q1: 安裝後如何快速驗證工具鏈運作正常？
執行以下一鍵自檢組合指令：
```bash
# 檢查根目錄判定與雷達功能
py 1.devtools/tools/repo_radar.py map

# 檢查任務管理狀態
py 1.devtools/tools/task_cli.py status
```
若均能正常印出 ASCII 圖表與狀態且無 `UnicodeEncodeError`，即代表環境安裝健全。

### Q2: 如果既有專案結構不同（例如任務放在 `docs/tasks`），該如何自訂？
修改 `1.devtools/tools/lib/common.py` 中的 `TASKS_DIR` 與 `TEMPLATE_PATH` 定義，所有工具鏈腳本將自動同步適配，無需逐一修改每個腳本。

### Q3: 什麼時候該執行任務歸檔 (`task_cli.py archive`)？
當任務進入 Gate 3，所有驗收標準已勾選完畢、自動審計通過且 SSOT 已回寫後，執行 `py 1.devtools/tools/task_cli.py archive`，系統會將任務檔由 `0.doc_mg/tasks/` 移動至 `0.doc_mg/tasks/archive/`，保持活躍任務清單維持在 0~1 個的極簡狀態。

