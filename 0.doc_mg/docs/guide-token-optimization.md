# 📉 AI 輔助開發極致 Token 節約工程架構與工作流指南 (Token Optimization Engineering)

> [!IMPORTANT]
> **核心哲學**：**「確定性的事情交給程式碼（Deterministic Scripts），機率性的事情才交給大模型（Probabilistic LLMs）。」**  
> 任何能用 AST、Git、Regex、Linter、靜態快取或純文字比對解決的問題，嚴禁用 LLM 的上下文視窗去暴力掃描。

---

## 1. Token 消耗黑洞診斷 (The 5 Token Sinks)

在多插件前端與 Chrome Extension 專案中，Token 的主要浪費來源包括：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI 開發 5 大 Token 浪費黑洞                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 上下文污染 (Context Bloat)   : 一次讀取包含大量實作細節的巨石組件   │
│ 2. 盲目探測 (Blind Exploration) : 讓 AI 用猜測的方式反覆 grep/ls 找檔案│
│ 3. 變更全量回覆 (Full-File Rewrites): AI 改動 2 行代碼卻重印 500 行檔案│
│ 4. 終端輸出洗版 (Terminal Spam) : 測試/打包錯誤噴出數千行編譯雜訊      │
│ 5. 跨 Session 遺忘 (Amnesia)    : 每次開啟新對話都要重新解釋專案架構   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心四大防護支柱 (The 4 Protocol Pillars)

本專案整合 `task_protocol_pack`，以四大防護支柱建立確定性的工程閉環：

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Task & Token Protocol 四大支柱                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 門禁責任隔離 (Phase-Gated)    : 3-Gate 門禁，每階段客觀 Exit 0 檢核  │
│ 2. 會話物理隔絕 (One Phase, One Session) : 完成單 Phase 即停步，輸出無損接力碼塊 │
│ 3. 四層 Token 防火牆 (Token Firewall) : 骨架先行、日誌脫水、雷達抽吸、水位預警 │
│ 4. 實體任務真理源 (Task SSOT)    : task_*.md 為唯一狀態真理，行號錨定零猜測 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 四層 Token 防火牆體系 (4-Layer Token Firewall Architecture)

為徹底杜絕終端長篇日誌、檔案巨幅通讀與 Context 無節制膨脹，專案確立四層防禦協議：

1. **L1 資料層 (入口物理消毒與骨架化 - Skeleton First)**：
   * 目標程式碼逾 100 行者，**嚴禁全檔通讀**。
   * 強制優先調用 `py 1.devtools/tools/code_skeleton.py` 掏空實作提煉簽名，或使用 `py 1.devtools/tools/repo_radar.py outline` 萃取大綱。
2. **L2 架構層 (黑盒靜音 CLI 契約與案卷優先 - Silent CLI & Dossier)**：
   * 專案內建工具與審計命令優先使用 `--compact` / `--quiet` 旗標（如 `audit_suite.py --compact`），成功時僅輸出單行摘要。
   * 探勘文檔優先調用 `repo_radar.py section` 精準抽吸單一章節（受 150 行超長防護），杜絕整份 Markdown 載入。
3. **L3 進程層 (沙盒隔離與 2-Strike 熔斷 - Circuit Breaker)**：
   * 單一錯誤或阻礙嘗試上限為 **2 次**。若連續 2 次嘗試未果，立即觸發熔斷停步。
   * 執行 `py 1.devtools/tools/log_issue.py log` 實體立案至 Issue Tracker，並以 Git 乾淨還原工作區，引導開立全新 Session 獨立排查。
4. **L4 流程層 (One Phase, One Session 與水位預警 - Session Swapping)**：
   * 恪守「One Phase, One Session」物理隔絕，每個 Phase 結束後統一於 Checkpoint 批次收斂打勾，輸出標準接力提示詞。
   * 高頻執行 `py 1.devtools/tools/analyze_task_tokens.py --quick-check` 探查當前 Session 上下文水位。

---

## 4. 6 大節約核心機制 (Core Mechanisms)

### 機制 1：代碼「骨架化 / 介面化」提煉 (Skeleton Extraction)
* **原理**：AI 理解或調用模組時，不需要函式內部的具體實作，只需要知道 **函式簽名、型別參數與 JSDoc/註解**。
* **工具**：`1.devtools/tools/code_skeleton.py`（支援 `npm run skeleton -- <路徑>` 或 `py 1.devtools/tools/code_skeleton.py <路徑>`，支援 `--save scratch/tmp/tmp_probe_<task>.md`）。
* **作法**：腳本自動將 `.ts` / `.tsx` / `.js` / `.py` 檔案的實作主體掏空，僅保留型別宣告、介面與函式骨架。
* **效益**：一個 800 行的元件被壓縮至 40 行骨架，**Token 節省 85%~95%**。

### 機制 2：局部修補合約與精準編輯 (Diff & Precision Editing)
* **原理**：禁止 AI 輸出整份重寫檔案，一律採用前後具備唯一邊界的語意區塊（Target / Replacement）進行局部編輯，嚴格限制單次 ≤ 50~80 行。
* **工具**：現代 IDE 原生工具 `edit_file`（搭配 `read_file` 的 `StartLine`/`EndLine` 窄化視窗讀取）。
* **效益**：輸出 Token 通常只有 50~150 tokens，大幅降低輸出延遲與因長度截斷造成之中斷風險，**節省 80% 輸出 Token**。

### 機制 3：終端日誌智慧脫水與精簡模式 (Log Desensitizer & Compactor)
* **原理**：執行建置、TypeScript 檢查或單元測試失敗時，錯誤訊息常伴隨數百行 `node_modules` 內部堆疊或重複資訊。
* **工具**：`1.devtools/tools/compact_log.py`、`rtk` 包裝器，以及審計腳本的 `--compact` 參數。
* **作法**：在終端命令後方串接管線，智慧過濾冗餘 Stack Trace，只截取核心報錯檔案、行號與第一現場錯誤描述。
* **效益**：報錯除錯時避免終端雜訊灌爆對話視窗，**節省 75%~90% 上下文 Token**。

### 機制 4：單一真實來源索引快取與雷達導航 (SSOT Micro-Index & Radar)
* **原理**：將系統規格、API 路由、符號定義與文檔章節濃縮在快取索引中，AI 無需逐檔通讀。
* **工具**：`1.devtools/tools/repo_radar.py`（搭配 `.repo_index.json`）、`git_extract_section.py`。
* **作法**：先透過 `map` 指令鎖定架構，或 `symbol` 指令秒查定義位置，再透過 `section` 單點抽吸特定章節；歷史版本直接以 Commit 標題精準抽吸。
* **效益**：免去讀取多份長篇文檔之成本，**節省 90% 以上檢索 Token**。

### 機制 5：會話隔離與狀態收斂接力 (One Phase, One Session & Handover)
* **原理**：避免單一對話視窗持續累積歷史探勘雜訊與長篇對話記錄，造成 Context Rot 與推論品質下滑。
* **工具**：`0.doc_mg/tasks/` 任務檔管理與「跨會話接力指令」。
* **作法**：落實「One Phase, One Session」門禁原則與 2-Strike 熔斷，每個 Phase 結束後將核心狀態收斂於任務檔，輸出標準接力提示詞開立新對話。
* **效益**：新對話僅需載入單一任務檔作為唯一真理源，**節省 70%~90% 輸入 Token**。

### 機制 6：全自動整合審計守門 (Automated Gate 3 Suite)
* **原理**：杜絕人類或 AI 透過多輪提問反覆手動排查 Manifest、死鏈、隔離破壞與格式問題。
* **工具**：`1.devtools/tools/audit_suite.py`（整合多插件隔離、Manifest 合規、死鏈、Token 預算與 SSOT 驗證）。
* **作法**：Gate 3 一鍵執行全套件審計（Exit 0 綠燈通行，支援 `--compact` 與 `--strict`）。
* **效益**：以單次執行替代 3~5 輪來回對話，**節省 80% 結案驗證 Token**。

---

## 5. 專案內部工具鏈矩陣與生命週期映射 (Toolchain Matrix & Lifecycle Mapping)

專案在 `1.devtools/tools/` 內建純標準函式庫之專屬工具鏈（零外部依賴），並在 **3-Gate 開發協議**（停止使用 Gate 0，直接自 Gate 1 開始）各階段強制映射調用：

### 5.1. 3-Gate 任務生命週期工具鏈調用矩陣 (Task Lifecycle Trigger Matrix)

| 任務生命週期階段 | 強制門禁條件與時機 | 推薦調用指令範例 | 預期 Token 節省效益 |
|:---|:---|:---|:---|
| **Gate 1: 專案情報檢索** | 探勘專案拓撲、目錄結構或跨模組符號 | `py 1.devtools/tools/repo_radar.py map`<br/>`py 1.devtools/tools/repo_radar.py symbol <Name>` | 節省 **80%~92%** 結構掃描 Token |
| **Gate 1: 歷史版本秒抽** | 抽取 Git 歷史 Commit 代碼/文檔章節 | `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` | 免全量 checkout，節省 **90%** |
| **Gate 1: 模組介面探勘** | 探勘 >100 行原始碼（嚴禁全檔讀取） | `npm run skeleton -- <路徑>`<br/>`py 1.devtools/tools/code_skeleton.py <路徑> --save scratch/tmp/tmp_probe_<task>.md` | 節省 **85%~95%** 源碼讀取 Token |
| **Gate 1: 藍圖建檔** | 初始化任務檔並納入 Git 版本防護 | `py 1.devtools/tools/task_cli.py init --plugin <plugin> --title "<標題>"` | 確保架構防護與快取沉澱 |
| **Gate 2: 水位監控** | 秒查當前 Session 上下文水位與健康度 | `py 1.devtools/tools/analyze_task_tokens.py --quick-check` | 即時預警 Context 膨脹風險 |
| **Gate 2: 終端脫水防禦** | 執行建置、型別檢查或單元測試 | `<command> 2>&1 \| py 1.devtools/tools/compact_log.py`<br/>`rtk npm run build` | 節省 **70%~95%** 堆疊日誌雜訊 |
| **Gate 2: 程式碼精準編輯** | 修改代碼或文檔（單次 ≤ 50~80 行） | 原生 `edit_file`（精準唯一語意區塊替換） | 節省 **80%** 輸出 Token，杜絕整檔覆寫 |
| **Gate 2: 2-Strike 熔斷** | 連續 2 次失敗或遭遇次生突發問題 | `py 1.devtools/tools/log_issue.py log --title "<標題>" --severity HIGH` | 立即停止原地探索，乾淨還原 |
| **Gate 3: 一鍵整合自動化審計** | 驗收階段全項快速健檢（推薦首選） | `py 1.devtools/tools/audit_suite.py`<br/>`py 1.devtools/tools/audit_suite.py --compact` | 1 輪對話完成全套檢查 (Exit 0) |
| **Gate 3: 實體隔離合規審查** | Chrome 多插件工作區物理隔離審查 | `py 1.devtools/tools/audit_plugin_isolation.py --compact` | 憲法級防護，秒級驗證零外溢 |
| **Gate 3: Manifest 安全審計** | 涉及權限、Manifest V3 或安全變更 | `py 1.devtools/tools/audit_manifests.py --compact` | MV3 合規零人工失誤 |
| **Gate 3: 死鏈與交叉引用** | 文件交叉引用與 Markdown 錨點校驗 | `py 1.devtools/tools/doc_cross_ref.py --audit`<br/>`py 1.devtools/tools/audit_markdown_links.py --fix` | 自動檢出死鏈並修復倒排索引 |
| **Gate 3: SSOT 真理防腐審查** | SSOT 靜態合規與 90/10 任務閉環 | `node 1.devtools/tools/audit_ssot.mjs --compact`<br/>`node 1.devtools/tools/audit_ssot.mjs --task-check` | 自動防腐與閉環審計 |
| **Gate 3: Token 預算監控** | 全案規則與技能檔 Token 預算健康度 | `py 1.devtools/tools/audit_token_usage.py --compact` | 確保 Prompt 與 Rules 不超載 |
| **Gate 3: 跨插件通訊契約** | 跨插件資料通訊 Schema 一致性驗證 | `py 1.devtools/tools/validate_contract.py` | 驗證黑盒通訊契約 |
| **Gate 3: 符號快取更新** | 異動組件、函式或規格後閉環索引 | `py 1.devtools/tools/generate_symbol_index.py` | 保持 `.repo_index.json` 最新 |
| **Gate 3: 雙層滾動歸檔** | 驗收通過且無死鏈後執行歷史收納 | `py 1.devtools/tools/task_cli.py archive`<br/>`py 1.devtools/tools/util_archive_manager.py` | 自動滾動維護與歷史封存 |

---

### 5.2. 專案開發者工具鏈速查清單 (1.devtools/tools/ 完整矩陣)

所有自動化腳本均統一收攏於 `1.devtools/tools/`，以 Python/Node 標準庫實作：

| 工具腳本 | 主要職責 | 常用指令範例 |
|:---|:---|:---|
| **`code_skeleton.py`** | 掏空程式碼內部實作，提煉介面、型別與簽名骨架（省 85%~95% Token） | `npm run skeleton -- <檔案>`<br/>`py 1.devtools/tools/code_skeleton.py <檔案>` |
| **`run_py.js`** | 跨平台 Python 執行轉發器（防禦 Windows Store shim 阻斷並支援 npm 參數轉發） | `node 1.devtools/tools/run_py.js 1.devtools/tools/<腳本.py> [參數...]` |
| **`compact_log.py`** | 終端編譯、型別檢查與測試日誌精簡過濾器（剔除冗餘堆疊） | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` |
| **`repo_radar.py`** | 極低 Token 專案情報檢索（大綱、章節切片、符號秒查、安全搜尋） | `py 1.devtools/tools/repo_radar.py map`<br/>`py 1.devtools/tools/repo_radar.py symbol <Name>` |
| **`generate_symbol_index.py`** | 專案全域符號與文檔導航快取生成器（產出 `.repo_index.json`） | `py 1.devtools/tools/generate_symbol_index.py` |
| **`audit_suite.py`** | Gate 3 整合自動化審計套件（Manifest/隔離/死鏈/交叉引用/Token 預算/SSOT 防腐一鍵檢驗） | `py 1.devtools/tools/audit_suite.py`<br/>`py 1.devtools/tools/audit_suite.py --compact`<br/>`py 1.devtools/tools/audit_suite.py --strict` |
| **`audit_plugin_isolation.py`** | Chrome 多插件工作區物理隔離與黑盒契約防衛審計器（憲法級防護） | `py 1.devtools/tools/audit_plugin_isolation.py`<br/>`py 1.devtools/tools/audit_plugin_isolation.py --compact` |
| **`audit_manifests.py`** | Chrome 插件 Manifest V3 合規性與安全性自動審計器（支援 `--compact` 脫水模式） | `py 1.devtools/tools/audit_manifests.py`<br/>`py 1.devtools/tools/audit_manifests.py --compact` |
| **`validate_contract.py`** | 跨插件黑盒通訊契約（JSON Schema）驗證工具 | `py 1.devtools/tools/validate_contract.py` |
| **`task_cli.py`** | 任務生命週期管理輔助 CLI (建立、註解自動清理、自動 git-add 與雙層滾動歸檔) | `py 1.devtools/tools/task_cli.py init --plugin <名> --title <標題>`<br/>`py 1.devtools/tools/task_cli.py archive` |
| **`export_converter.py`** | 研報格式匯出與資料轉換工具（已下沉至財經插件） | `py finance-research-clipper-oss/tools/export_converter.py` |
| **`doc_cross_ref.py`** | 文件交叉引用、死鏈審計、倒排索引自動修復與冗餘清理工具 | `py 1.devtools/tools/doc_cross_ref.py --audit`<br/>`py 1.devtools/tools/doc_cross_ref.py --fix --clean-redundant` |
| **`audit_token_usage.py`** | 全專案規則與技能檔 Token 預算監控與健康度審計（支援 `--compact`） | `py 1.devtools/tools/audit_token_usage.py`<br/>`py 1.devtools/tools/audit_token_usage.py --compact` |
| **`token_estimator.py`** | 輕量純 Python 字元啟發式 Token 估算器核心模組 | `py 1.devtools/tools/token_estimator.py <檔案路徑>` |
| **`audit_markdown_links.py`** | 全專案 Markdown 相對路徑、錨點與跨檔引用自動校驗與修復 | `py 1.devtools/tools/audit_markdown_links.py`<br/>`py 1.devtools/tools/audit_markdown_links.py --fix` |
| **`audit_ssot.mjs`** | SSOT 靜態合規與真理防腐審計器（索引存在性校驗/孤兒真理探測/命名防腐/90-10閉環） | `node 1.devtools/tools/audit_ssot.mjs`<br/>`npm run audit:ssot`<br/>`node 1.devtools/tools/audit_ssot.mjs --strict` |
| **`main_dispatcher.py`** | 本機 AI 推論微服務中樞（已下沉至 Gemini Nano 插件） | `py chrome_gemini_nano/tools/main_dispatcher.py` |
| **`git_extract_section.py`** | 自 Git 歷史 Commit 秒級抽取 Markdown 標題或 HTML 區塊（免全量 checkout） | `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` |
| **`log_issue.py`** | 2-Strike 熔斷與突發次生問題結構化立案工具（防原地無效死磕） | `py 1.devtools/tools/log_issue.py log --title "<標題>" --severity HIGH --desc "<快照>"` |
| **`analyze_task_tokens.py`** | 任務對話日誌 Token 深度剖析與 Context 膨脹分析工具（支援秒查水位探針） | `py 1.devtools/tools/analyze_task_tokens.py --quick-check`<br/>`py 1.devtools/tools/analyze_task_tokens.py --current` |
| **`util_archive_manager.py`** | 歷史任務與草稿雙層歸檔管理工具（支援近兩週熱資料滑動維護） | `py 1.devtools/tools/util_archive_manager.py --dry-run`<br/>`py 1.devtools/tools/util_archive_manager.py` |

---

### 5.3. RTK 指令包裝與終端過濾規範
使用 `run_command` 時，必須優先評估終端輸出體積：
- **RTK 包裝 (優先採用)**：
  - Git 操作：`rtk git diff`, `rtk git status`, `rtk git log`, `rtk git show`
  - 建置與檢查：`rtk npm run build`, `rtk tsc`, `rtk eslint`
  - 檔案搜尋：`rtk rg "pattern"`
- **日誌脫水過濾器 (`compact_log.py`)**：
  - 智慧過濾 `node_modules` 冗長調用堆疊，只保留出錯檔案、行號與關鍵錯誤描述：
    ```bash
    npm run build 2>&1 | py 1.devtools/tools/compact_log.py
    ```
- **審計工具脫水旗標 (`--compact`)**：
  - 審計工具均支援 `--compact` 旗標，於通過時僅輸出單行通過摘要，節省 90% 終端回傳 Token。
- **容錯與降級機制**：
  1. 首度執行 `rtk` 前，可執行 `rtk --version` 驗證環境支援。
  2. 若環境未安裝 `rtk`，應降級回原始指令或使用 `compact_log.py` 管線過濾。

---

## 6. 日常開發極低 Token 提問工作流 (Low-Token Workflows)

在日常 Prompt 與任務協作中，遵循以下工作流對照：

| 情境 | ❌ 高浪費做法 (High Token Cost) | ✅ 極致低 Token 做法 (Token Saver) | 節省比例 |
| :--- | :--- | :--- | :--- |
| **調用模組或型別** | 要求讀取目標檔案全文（如 600 行程式碼） | 執行 `py 1.devtools/tools/code_skeleton.py <路徑>` 僅取得介面骨架 | **節省 90%** |
| **歷史代碼比對** | 執行 `git checkout <commit>` 或全量 dump 舊檔案 | 執行 `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` | **節省 90%** |
| **報錯除錯 (Debug)** | 將終端噴出的 500 行錯誤訊息整包貼給 AI | 透過 `compact_log.py` 脫水後只提供核心行號與錯誤描述 | **節省 85%** |
| **查詢專案規範** | 讓 AI 全量載入 5 份長篇 Markdown 文檔 | 執行 `repo_radar.py map` 鎖定章節，再用 `section` 單點抽吸 | **節省 90%** |
| **代碼修改與重構** | 讓 AI 整份檔案重印 400 行內容 | 要求 AI 使用原生 `edit_file` 精準修改變更區塊（≤ 50~80 行） | **節省 80%** (輸出) |
| **突發次生錯誤** | 原地反覆嘗試 5 次，擴散排查引發 Context 泛洪 | 連續 2 次失敗立即調用 `log_issue.py log` 熔斷立案並還原 | **節省 70%** (阻斷失控) |
| **Context 水位檢測** | 盲目推進長任務直到回答被截斷或失智 | 執行 `analyze_task_tokens.py --quick-check` 秒查當前健康度 | **預警防護** |
| **結案驗收檢查** | 來回多輪手動對話逐項確認 Manifest、隔離與死鏈 | 執行 `py 1.devtools/tools/audit_suite.py --compact` 一鍵自動審計 | **節省 85%** (對話輪數) |
| **跨階段任務接力** | 讓單一對話膨脹至數十萬 Token 繼續實作 | Phase 結束後依接力提示詞新開對話，以任務檔為唯一真理源 | **節省 70%~90%** (輸入) |

---

## 7. Gate 1 探勘期武器庫強制鏈條 (Gate 1 Weaponized Exploration Protocol)

在專案 **3-Gate 門禁體系**（Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂）中，**Gate 1（脈絡勘查與任務藍圖）** 是 Token 消耗與 Context Rot 最容易失控的高危險期。為杜絕上下文退化，憲法級規範要求強制調用武器庫工具鏈：

### 7.1 探勘硬窄化三部曲 (3-Step Exploration Chain)
1. **第一防線：骨架掏空優先（Skeleton First）**
   * 目標代碼檔案逾 100 行者，**嚴禁直接調用原生讀取工具全檔讀取** 或盲目全局 `grep`。
   * 強制優先調用 `py 1.devtools/tools/code_skeleton.py <路徑>` 提煉介面骨架與型別簽名，可透過 `--save scratch/tmp/tmp_probe_<task>.md` 落地保存為探勘持久化快取 (Probe Cache)。
2. **第二防線：微量採集與簽名沉澱（Micro-Sampling）**
   * 取得骨架與目標函式精準行號後，僅允許針對目標函式/介面簽名執行微量局部 `read_file`（指定 `StartLine` 與 `EndLine`）。
   * 單次讀取嚴格限制 **≤ 30 行**，僅確認簽名、型別與參數，函式內部實作細節一律留待 Gate 2 原子執行時再讀。
   * 關鍵介面簽名與型別直接沉澱至 `task.md` 藍圖中，並嚴格落實**行號錨定 (Line Anchor)**。
3. **第三防線：藍圖停步與會話接力（Handover Halt）**
   * 於 `task.md` 宣告 Target Devtools 與 Target SSOTs 後，**嚴禁在 Gate 1 修改任何原始碼**。
   * 必須輸出「跨會話接力指令（Session Reset Handover）」，讓使用者能透過開啟新對話釋放 Gate 1 龐大探索上下文（節省 70%~90% 輸入 Token），以乾淨 Context 啟動 Gate 2。

### 7.2 典型防呆與實戰案例 (Anti-Patterns vs Best Practices)

| 維度 | ❌ 違規高消耗模式 (Anti-Pattern) | ✅ 標準武器庫鏈條模式 (Best Practice) | 實測 Token 效益 |
| :--- | :--- | :--- | :--- |
| **檔案初探** | 對 600 行的 `background.ts` 直接全量通讀 | 先執行 `py 1.devtools/tools/code_skeleton.py background.ts` 取得 35 行介面骨架 | 從 ~4,000 tokens 降至 ~200 tokens (**-95%**) |
| **介面探查** | 讀取整段 80 行之模組實作細節來理解參數 | 依骨架行號僅調用 `read_file` 讀取該函式前 15 行簽名與註解，實作留待 Gate 2 | 從 ~600 tokens 降至 ~100 tokens (**-83%**) |
| **檔案編輯** | 輸出 400 行完整檔案進行覆寫 | 使用 `edit_file` 精準局部替換單一語意區塊（≤ 50~80 行） | 工具呼叫與回覆 Token 縮減 80% (**-80%**) |
| **突發阻礙** | 原地連續盲目修復 5 次，製造大量髒代碼 | 2 次失敗即刻熔斷，`log_issue.py log` 結構化記錄並停步 | 阻斷 5 輪以上無效 Context 滾雪球 (**-80%**) |
| **結案審查** | 人工反覆詢問 Manifest 與檔案死鏈是否存在 | 執行 `py 1.devtools/tools/audit_suite.py --compact` 獲得單行 Exit 0 確認 | 節省多輪往返對話 (**-85%**) |
| **藍圖收尾** | Gate 1 探勘完畢後直接接著改代碼，歷史探索上下文伴隨整個開發週期 | 產出 `task.md` 後停步並輸出「跨會話接力指令」，新會話以 `task.md` 為唯一真理源 | 輸入 Token 節省 **70%~90%**，根除 Context Rot |

---

## 8. 相關參照與 SSOT 導航

* **最高行為準則 (憲法)**：`GEMINI.md`
* **Agent 執行法規**：`.agents/rules.md`
* **專家技能**：
  * Token 節省工程：`.agents/skills/token-saver/SKILL.md`
  * 任務協議管理：`.agents/skills/task-protocol/SKILL.md`
  * 專案情報雷達：`.agents/skills/repo-radar/SKILL.md`
  * 插件合規審計：`.agents/skills/chrome-auditor/SKILL.md`
* **指針與指南文檔**：
  * 開發工具鏈矩陣：`1.devtools/overview-devtools.md`
  * 任務管理核心指南：`0.doc_mg/docs/guide-task-manager.md`
  * 專案 SSOT 單一真理源架構：`0.doc_mg/docs/index-ssot.md`
  * 情報雷達提問指引：`0.doc_mg/docs/guide-repo-radar.md`
  * 任務協議實體套件手冊：`task_protocol_pack/README.md`
