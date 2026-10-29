# 📉 AI 輔助開發極致 Token 節約工程架構與工作流指南 (Token Optimization Engineering)

> [!IMPORTANT]
> **核心哲學**：**「確定性交給程式碼 (Deterministic Scripts)，機率性才交給大模型 (Probabilistic LLMs)。」**  
> 凡能以 AST、Git、Regex、Linter、靜態快取解決者，嚴禁用 LLM 上下文視窗暴力掃描。

---

## 1. Token 消耗黑洞診斷 (The 5 Token Sinks)

| 黑洞維度 | 表現徵候 | 危害 | 根治對策 |
| :--- | :--- | :--- | :--- |
| **1. 上下文污染 (Context Bloat)** | 一次載入 >100 行實作細節之巨石檔案 | 注意力稀釋、推論品質下滑 | 骨架先行 (`code_skeleton.py`)，細讀限 80~150 行 |
| **2. 盲目探測 (Blind Exploration)** | AI 猜測式全域 grep/ls 尋找目標 | 往返對話消耗大量探索 Token | 情報雷達秒查 (`repo_radar.py map/symbol`) |
| **3. 變更全量回覆 (Full-File Rewrites)** | 改動數行卻重印數百行檔案 | 輸出延遲、觸發輸出截斷 | 原生 `edit_file` 精準語意替換 (≤ 50~80 行) |
| **4. 終端輸出洗版 (Terminal Spam)** | 編譯/測試錯誤噴出千行堆疊雜訊 | 迅速塞滿 Session 上下文 | 管線脫水 (`compact_log.py` / `rtk`) |
| **5. 跨 Session 遺忘 (Amnesia)** | 每次新對話重新全盤解釋架構 | 啟動成本高昂、脈絡斷層 | `task.md` 單一真理源 + 跨會話無損接力碼塊 |

---

## 2. 核心四大防護支柱 (The 4 Protocol Pillars)

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Task & Token Protocol 四大支柱                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. 門禁責任隔離 (Phase-Gated)    : 3-Gate 門禁，客觀 Exit 0 檢核        │
│ 2. 會話物理隔絕 (One Phase, One Session) : 單 Phase 停步，輸出接力碼塊 │
│ 3. 四層 Token 防火牆 (Token Firewall) : 骨架先行、日誌脫水、雷達抽吸   │
│ 4. 實體任務真理源 (Task SSOT)    : task_*.md 為狀態真理，行號錨定零猜測│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 四層 Token 防火牆體系 (4-Layer Token Firewall Architecture)

1. **L1 資料層 (入口物理消毒與骨架化 - Skeleton First)**：
   * 目標代碼逾 100 行者**嚴禁全檔通讀**。
   * 強制優先調用 `code_skeleton.py` 提煉介面簽名，或 `repo_radar.py outline` 萃取大綱。
2. **L2 架構層 (黑盒靜音 CLI 契約與案卷優先 - Silent CLI & Dossier)**：
   * 專案工具與審計命令優先使用 `--compact` 旗標，成功時僅輸出單行摘要。
   * 文檔探勘優先使用 `repo_radar.py section` 單點抽吸（受 150 行超長防護）。
3. **L3 進程層 (沙盒隔離與 2-Strike 熔斷 - Circuit Breaker)**：
   * 單一錯誤嘗試上限為 **2 次**，未果即刻觸發熔斷停步。
   * 調用 `log_issue.py log` 結構化立案，Git 還原工作區並開立新 Session 排查。
4. **L4 流程層 (One Phase, One Session 與水位預警 - Session Swapping)**：
   * 恪守「One Phase, One Session」物理隔絕，Phase 結束於 Checkpoint 批次收斂打勾。
   * 調用 `analyze_task_tokens.py --quick-check` 探查當前 Context 上下文健康度。

---

## 4. 6 大節約核心機制 (Core Mechanisms)

### 機制 1：代碼「骨架化 / 介面化」提煉 (Skeleton Extraction)
* **原理**：理解模組僅需介面簽名與型別，掏空實作主體。
* **工具**：`npm run skeleton -- <路徑>` 或 `py 1.devtools/tools/code_skeleton.py <路徑>`。
* **效益**：800 行組件壓縮至 40 行，**節省 85%~95% Token**。

### 機制 2：局部修補合約與精準編輯 (Diff & Precision Editing)
* **原理**：禁止全檔重寫，嚴格採唯一前後邊界語意區塊局部替換 (≤ 50~80 行)。
* **工具**：原生 `edit_file`（搭配 `read_file` 局部指定行號視窗）。
* **效益**：輸出 Token 降至 50~150 tokens，**節省 80% 輸出 Token**。

### 機制 3：終端日誌智慧脫水與精簡模式 (Log Desensitizer & Compactor)
* **原理**：過濾編譯/測試長篇堆疊雜訊，僅截取報錯檔案、行號與第一現場錯誤描述。
* **工具**：`compact_log.py`、`rtk` 包裝器、審計腳本 `--compact` 參數。
* **效益**：除錯時避免雜訊灌爆視窗，**節省 75%~90% 上下文 Token**。

### 機制 4：單一真實來源索引快取與雷達導航 (SSOT Micro-Index & Radar)
* **原理**：系統規格、API 與符號濃縮於 `.repo_index.json` 快取，無須逐檔通讀。
* **工具**：`repo_radar.py` (`map` / `symbol` / `section`)、`git_extract_section.py`。
* **效益**：精準抽吸章節與歷史 Commit，**節省 90% 檢索 Token**。

### 機制 5：會話隔離與狀態收斂接力 (One Phase, One Session & Handover)
* **原理**：杜絕單對話累積探勘雜訊與 Context Rot，單一會話聚焦單一 Phase。
* **工具**：`0.doc_mg/tasks/` 任務檔 + 標準接力提示詞。
* **效益**：新對話以 `task.md` 為唯一真理源，**節省 70%~90% 輸入 Token**。

### 機制 6：全自動整合審計守門 (Automated Gate 3 Suite)
* **原理**：一鍵驗證多插件隔離、Manifest 合規、死鏈、Token 預算與 SSOT 閉環。
* **工具**：`py 1.devtools/tools/audit_suite.py`（支援 `--compact` 與 `--strict`）。
* **效益**：單次命令替代 3~5 輪來回提問，**節省 80% 結案驗證 Token**。

---

## 5. 專案內部工具鏈矩陣與生命週期映射 (Toolchain Matrix & Lifecycle Mapping)

### 5.1. 3-Gate 任務生命週期工具鏈調用矩陣 (Task Lifecycle Trigger Matrix)

| 生命週期階段 | 門禁時機與條件 | 推薦調用指令 | 預期 Token 效益 |
| :--- | :--- | :--- | :--- |
| **Gate 1: 專案情報檢索** | 探勘拓撲、目錄或符號定義 | `py 1.devtools/tools/repo_radar.py map`<br>`py 1.devtools/tools/repo_radar.py symbol <Name>` | 節省 **80%~92%** |
| **Gate 1: 歷史版本秒抽** | 抽取 Git 歷史章節（免 checkout） | `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` | 節省 **90%** |
| **Gate 1: 模組介面探勘** | 探勘 >100 行原始碼（嚴禁全檔通讀） | `npm run skeleton -- <路徑>`<br>`py 1.devtools/tools/code_skeleton.py <路徑>` | 節省 **85%~95%** |
| **Gate 1: 藍圖建檔** | 建立任務檔並納入 Git 版本防護 | `py 1.devtools/tools/task_cli.py init --plugin <plugin> --title "<標題>"` | 前置鎖定 Devtools 與快取 |
| **Gate 2: 水位監控** | 秒查 Session 上下文健康度 | `py 1.devtools/tools/analyze_task_tokens.py --quick-check` | 即時預警 Context 膨脹 |
| **Gate 2: 終端脫水防禦** | 執行建置、型別檢查或單元測試 | `<cmd> 2>&1 \| py 1.devtools/tools/compact_log.py`<br>`rtk <cmd>` | 節省 **70%~95%** 堆疊雜訊 |
| **Gate 2: 程式碼精準編輯** | 修改代碼或文檔 (≤ 50~80 行) | 原生 `edit_file` 精準局部替換 | 節省 **80%** 輸出 Token |
| **Gate 2: 2-Strike 熔斷** | 連續 2 次失敗或突發阻礙 | `py 1.devtools/tools/log_issue.py log --title "<標題>" --severity HIGH` | 阻斷發散排查，乾淨還原 |
| **Gate 3: 整合自動化審計** | 驗收階段全項快速健檢 (首選) | `py 1.devtools/tools/audit_suite.py --compact` | 單輪對話 Exit 0 綠燈通行 |
| **Gate 3: 插件隔離合規** | 多插件物理目錄邊界審查 | `py 1.devtools/tools/audit_plugin_isolation.py --compact` | 憲法級防護，秒級驗證零外溢 |
| **Gate 3: Manifest 安全** | 涉及權限與 Manifest V3 審查 | `py 1.devtools/tools/audit_manifests.py --compact` | MV3 合規零人工失誤 |
| **Gate 3: 死鏈與交叉引用** | 文件鏈接與 Markdown 錨點校驗 | `py 1.devtools/tools/doc_cross_ref.py --audit` | 自動檢出死鏈與修復索引 |
| **Gate 3: SSOT 真理防腐** | SSOT 靜態合規與 90/10 閉環 | `node 1.devtools/tools/audit_ssot.mjs --compact` | 自動防腐與閉環審計 |
| **Gate 3: Token 預算監控** | 全案規則與技能檔預算水位 | `py 1.devtools/tools/audit_token_usage.py --compact` | 確保 Prompt 與 Rules 不超載 |
| **Gate 3: 跨插件契約校驗** | 跨插件資料 Schema 一致性驗證 | `py 1.devtools/tools/validate_contract.py` | 驗證黑盒通訊契約 |
| **Gate 3: 符號快取更新** | 異動組件或規格後閉環索引 | `py 1.devtools/tools/generate_symbol_index.py` | 保持 `.repo_index.json` 最新 |
| **Gate 3: 雙層滾動歸檔** | 驗收通過後收納歷史任務 | `py 1.devtools/tools/task_cli.py archive` | 自動滾動維護與封存 |

---

### 5.2. 專案開發者工具鏈速查清單 (1.devtools/tools/ 完整矩陣)

| 工具腳本 | 主要職責 | 常用指令範例 |
| :--- | :--- | :--- |
| **`code_skeleton.py`** | 掏空實作提煉介面與型別骨架（省 85%~95% Token） | `npm run skeleton -- <檔案>`<br>`py 1.devtools/tools/code_skeleton.py <檔案>` |
| **`run_py.js`** | 跨平台 Python 執行轉發器（防 Windows Store 0.0.0.0 樁） | `node 1.devtools/tools/run_py.js 1.devtools/tools/<腳本.py> [參數]` |
| **`compact_log.py`** | 編譯、型別檢查與測試日誌精簡過濾器 | `npm run build 2>&1 \| py 1.devtools/tools/compact_log.py` |
| **`repo_radar.py`** | 極低 Token 專案情報檢索（大綱、切片、符號秒查） | `py 1.devtools/tools/repo_radar.py map`<br>`py 1.devtools/tools/repo_radar.py symbol <Name>` |
| **`generate_symbol_index.py`** | 全域符號與文檔導航快取生成器（生成 `.repo_index.json`） | `py 1.devtools/tools/generate_symbol_index.py` |
| **`audit_suite.py`** | Gate 3 整合自動化審計套件（7 大門禁一鍵驗收） | `py 1.devtools/tools/audit_suite.py --compact` |
| **`audit_plugin_isolation.py`** | 多插件物理目錄邊界與黑盒契約防衛審計器 | `py 1.devtools/tools/audit_plugin_isolation.py --compact` |
| **`audit_manifests.py`** | Manifest V3 合規性與安全性自動審計器 | `py 1.devtools/tools/audit_manifests.py --compact` |
| **`validate_contract.py`** | 跨插件黑盒通訊契約 (JSON Schema) 驗證工具 | `py 1.devtools/tools/validate_contract.py` |
| **`task_cli.py`** | 任務生命週期管理 CLI (建立、註解清理、自動歸檔) | `py 1.devtools/tools/task_cli.py init --plugin <名> --title <標題>`<br>`py 1.devtools/tools/task_cli.py archive` |
| **`export_converter.py`** | 研報格式匯出與資料轉換工具（已下沉至財經插件） | `py finance-research-clipper-oss/tools/export_converter.py` |
| **`doc_cross_ref.py`** | 文件交叉引用、死鏈審計、倒排索引修復工具 | `py 1.devtools/tools/doc_cross_ref.py --audit` |
| **`audit_token_usage.py`** | 規則與技能檔 Token 預算健康度審計 | `py 1.devtools/tools/audit_token_usage.py --compact` |
| **`token_estimator.py`** | 輕量純 Python 字元啟發式 Token 估算器核心模組 | `py 1.devtools/tools/token_estimator.py <檔案路徑>` |
| **`audit_markdown_links.py`** | Markdown 相對路徑與跨檔引用自動校驗修復 | `py 1.devtools/tools/audit_markdown_links.py --fix` |
| **`audit_ssot.mjs`** | SSOT 靜態合規與真理防腐審計器（90/10 閉環） | `node 1.devtools/tools/audit_ssot.mjs --compact` |
| **`main_dispatcher.py`** | 本機 AI 推論微服務中樞（已下沉至 Gemini Nano 插件） | `py chrome_gemini_nano/tools/main_dispatcher.py` |
| **`git_extract_section.py`** | Git 歷史 Commit 秒級抽取 Markdown/HTML 區塊 | `py 1.devtools/tools/git_extract_section.py <commit> <檔案> -s "<標題>"` |
| **`log_issue.py`** | 2-Strike 熔斷與突發次生問題結構化立案工具 | `py 1.devtools/tools/log_issue.py log --title "<標題>" --severity HIGH` |
| **`analyze_task_tokens.py`** | 任務對話日誌 Token 剖析與 Context 水位探針 | `py 1.devtools/tools/analyze_task_tokens.py --quick-check` |
| **`util_archive_manager.py`** | 歷史任務與草稿雙層歸檔管理工具 | `py 1.devtools/tools/util_archive_manager.py` |

---

### 5.3. RTK 指令包裝與終端過濾規範
* **RTK 包裝 (優先)**：Git (`rtk git diff/status/log`)、建置檢查 (`rtk npm run build`、`rtk tsc`)、搜尋 (`rtk rg`)。
* **日誌脫水過濾 (`compact_log.py`)**：智慧過濾堆疊雜訊，保留核心出錯檔案與行號：
  ```bash
  npm run build 2>&1 | py 1.devtools/tools/compact_log.py
  ```
* **審計脫水旗標 (`--compact`)**：通過時僅輸出單行摘要，節省 90% 終端 Token。
* **降級機制**：環境未安裝 `rtk` 時，自動降級為原始指令或 `compact_log.py` 管線。

---

## 6. 日常開發極低 Token 提問工作流 (Low-Token Workflows)

| 情境 | ❌ 高浪費做法 | ✅ 極致低 Token 做法 | 節省比例 |
| :--- | :--- | :--- | :--- |
| **調用模組/型別** | 讀取目標檔案全文（如 600 行） | `py 1.devtools/tools/code_skeleton.py <路徑>` 取得介面骨架 | **節省 90%** |
| **歷史代碼比對** | `git checkout` 或全量 dump 舊檔 | `git_extract_section.py <commit> <檔> -s "<標題>"` | **節省 90%** |
| **報錯除錯** | 終端 500 行錯誤訊息全量貼入 | 串接 `compact_log.py` 脫水後提供核心行號與描述 | **節省 85%** |
| **查詢專案規範** | 全量載入 5 份長篇 Markdown | `repo_radar.py map` 鎖定章節，`section` 單點抽吸 | **節省 90%** |
| **代碼修改重構** | 重印 400 行完整檔案 | 原生 `edit_file` 精準替換唯一語意區塊 (≤ 50~80 行) | **節省 80%** (輸出) |
| **突發次生錯誤** | 原地盲試 5 次，擴散排查 | 2 次失敗即調用 `log_issue.py log` 熔斷立案並還原 | **節省 70%** |
| **Context 水位** | 盲目推進長任務致回答截斷 | `analyze_task_tokens.py --quick-check` 秒查健康度 | **預警防護** |
| **結案驗收檢查** | 多輪手動對話逐項確認檢查 | `py 1.devtools/tools/audit_suite.py --compact` 一鍵審計 | **節省 85%** (對話輪數) |
| **跨階段任務接力** | 單對話膨脹至數十萬 Token 繼續 | Phase 結束依接力提示詞開新對話，以任務檔為真理源 | **節省 70%~90%** (輸入) |

---

## 7. Gate 1 探勘期武器庫強制鏈條 (Gate 1 Weaponized Exploration Protocol)

在專案 **3-Gate 門禁體系** 中，**Gate 1（脈絡勘查與任務藍圖）** 是 Token 消耗與 Context Rot 高危期，強制執行武器庫調用鏈：

### 7.1 探勘硬窄化三部曲 (3-Step Exploration Chain)
1. **第一防線：骨架掏空優先（Skeleton First）**
   * 目標檔案 >100 行者**嚴禁全檔讀取**或全局盲目 `grep`。
   * 強制優先調用 `code_skeleton.py` 提煉介面骨架與型別簽名，可透過 `--save` 存為探勘快取 (Probe Cache)。
2. **第二防線：微量採集與簽名沉澱（Micro-Sampling）**
   * 取得骨架後，僅針對目標簽名執行微量局部 `read_file`（單次讀取嚴格限制 **≤ 30 行**）。
   * 關鍵簽名沉澱至 `task.md` 藍圖並落實**行號錨定 (Line Anchor)**。
3. **第三防線：藍圖停步與會話接力（Handover Halt）**
   * 於 `task.md` 宣告 Target Devtools 與 Target SSOTs 後，**嚴禁修改任何原始碼**。
   * 輸出「跨會話接力指令」，開啟全新 Session 釋放探索上下文（節省 70%~90% 輸入 Token），以乾淨 Context 啟動 Gate 2。

### 7.2 典型防呆與實戰案例 (Anti-Patterns vs Best Practices)

| 維度 | ❌ 違規高消耗模式 | ✅ 標準武器庫鏈條模式 | 實測 Token 效益 |
| :--- | :--- | :--- | :--- |
| **檔案初探** | 對 600 行程式碼全量通讀 | `code_skeleton.py` 取得 35 行介面骨架 | 從 ~4,000 降至 ~200 (**-95%**) |
| **介面探查** | 讀取 80 行實作細節理解參數 | 依骨架行號僅調用 `read_file` 讀取前 15 行簽名，實作留 Gate 2 | 從 ~600 降至 ~100 (**-83%**) |
| **檔案編輯** | 輸出 400 行完整檔案覆寫 | `edit_file` 精準局部替換唯一語意區塊 (≤ 50~80 行) | 輸出 Token 縮減 80% (**-80%**) |
| **突發阻礙** | 原地連續盲目修復 5 次製造髒代碼 | 2 次失敗即刻熔斷，`log_issue.py log` 結構化記錄停步 | 阻斷 5 輪以上無效 Context 滾雪球 (**-80%**) |
| **結案審查** | 人工反覆詢問 Manifest 與死鏈狀態 | 執行 `audit_suite.py --compact` 獲得單行 Exit 0 確認 | 節省多輪往返對話 (**-85%**) |
| **藍圖收尾** | Gate 1 探勘後直接修改代碼 | 產出 `task.md` 後停步輸出接力提示詞，新會話以 `task.md` 為真理源 | 輸入 Token 節省 **70%~90%** |

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
