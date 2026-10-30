# 1.devtools 開發者工具鏈矩陣規格字典

> 文件路徑：`1.devtools/docs/spec-devtools-matrix.md`  
> 模組代號：`devtools`  
> 架構規範：Python 3、Node.js、自動化門禁與 Token 防護工具鏈

---

## 1. 架構概述與設計原則

`1.devtools` 作為整個專案的工程基石與守門工具箱，肩負四大核心原則：
* **Token Guard 優先**：所有指令輸出、探勘掃描與日誌呈現均透過脫水與骨架提煉工具進行壓縮，守護對話 Context 窗口。
* **三階段門禁整合 (3-Gate Integration)**：深度適配 Gate 1 探勘、Gate 2 原子執行、Gate 3 驗收結案的自動化檢查。
* **多插件隔離保證**：透過自動化審計腳本嚴格防護五大插件間的目錄與執行時邊界，杜絕跨插件源碼污染。

---

## 2. 工具清單與元件矩陣 (DevTools Matrix)

### 2.1 探勘與情報工具 (Radar & Code Discovery)
* **`repo_radar.py` (`1.devtools/tools/repo_radar.py`)**
  * 職責：全專案情報雷達。
  * 核心子命令：
    * `map --all`: 輸出全專案文檔與目錄拓撲地圖。
    * `outline <path>`: 提取指定 Markdown 文檔的大綱標題結構。
    * `section <path> --heading <title>`: 精準切片提取特定章節內容。
    * `symbol <name>`: 全域秒查指定類別、函式或變數定義。
    * `search <query>`: 具備熔斷限制的精準全文檢索。
* **`code_skeleton.py` (`1.devtools/tools/code_skeleton.py`)**
  * 職責：代碼骨架提煉器。利用 AST 分析 Python、TypeScript 與 JavaScript 原始碼，抽離函式簽名、介面定義與 Docstrings，剔除龐大實作細節，節省 90% Context。
* **`generate_symbol_index.py` (`1.devtools/tools/generate_symbol_index.py`)**
  * 職責：掃描全專案符號並更新快取索引，確保 `repo_radar.py symbol` 秒查效能。

### 2.2 日誌脫水與 Token 度量 (Token Saver Tools)
* **`compact_log.py` (`1.devtools/tools/compact_log.py`)**
  * 職責：終端建置與測試日誌脫水過濾器。透過管線接收輸出，智能過濾重複資訊，僅保留關鍵狀態、錯誤堆疊與結果摘要。
* **`token_estimator.py` / `analyze_task_tokens.py` / `audit_token_usage.py`**
  * 職責：評估任務規劃與檔案修改之 Token 消耗，產出任務 Token 審計指標。

### 2.3 自動化合規審計套件 (Compliance & Audit Suite)
* **`audit_suite.py` (`1.devtools/tools/audit_suite.py`)**
  * 職責：審計總指揮官。整合所有單元審查工具，支援 `--compact` 參數輸出簡明驗收結果，作為 Gate 3 結案標準。
* **`audit_manifests.py` (`1.devtools/tools/audit_manifests.py`)**
  * 職責：遍歷五大插件之 `manifest.json`，核驗 Manifest V3 合規性、最小權限原則與鍵值結構。
* **`audit_arch_boundary.py` / `audit_plugin_isolation.py`**
  * 職責：架構邊界審計。檢查各插件源碼是否存在非法跨目錄 `import` 或實體引用。
* **`audit_markdown_links.py` (`1.devtools/tools/audit_markdown_links.py`)**
  * 職責：檢查全專案 Markdown 檔案是否符合工作區純行內代碼引用規範，防範失效的內部超連結語法。
* **`audit_ssot.mjs` (`1.devtools/tools/audit_ssot.mjs`)**
  * 職責：SSOT 覆蓋率檢查，確認所有下沉文檔皆於 `index-ssot.md` 登錄。

### 2.4 任務生命週期管理 (Task Protocol Tools)
* **`task_cli.py` (`1.devtools/tools/task_cli.py`)**
  * 職責：任務協議標準化 CLI。
  * 核心子命令：
    * `init <task-name>`: 依模板初始化標準任務檔並自動納入 git 防護。
    * `archive <task-path>`: 結案時將任務檔移入 `0.doc_mg/tasks/archive/`。
* **`log_issue.py` (`1.devtools/tools/log_issue.py`)**
  * 職責：2-Strike 熔斷開立與異常追蹤。

### 2.5 跨插件測試與合約驗證 (Contracts & E2E Testing)
* **`validate_contract.py` (`1.devtools/tools/validate_contract.py`)**
  * 職責：依據 JSON Schema 驗證跨插件通訊 Payload 格式。
* **`tests/test_cross_plugin_e2e.py` / `tests/run_tests.py`**
  * 職責：自動化端到端通訊整合測試套件。

---

## 3. 調用管線範式 (Toolchain Invocation Pipelines)

### 3.1 Gate 1 探勘標準管線
```bash
py 1.devtools/tools/repo_radar.py map --all
py 1.devtools/tools/code_skeleton.py <target-file>
```

### 3.2 Gate 2 執行脫水管線
```bash
<build-command> 2>&1 | py 1.devtools/tools/compact_log.py
```

### 3.3 Gate 3 驗收結案管線
```bash
py 1.devtools/tools/audit_suite.py --compact
py 1.devtools/tools/task_cli.py archive <task-path>
```

