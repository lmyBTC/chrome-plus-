---
name: Token 節省器 (RTK Token Saver)
description: 引導 Agent 在執行終端指令時自動包裝 rtk 前綴，以降低 Token 消耗，並主動監控對話節省效益。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk優化, 情報雷達, 代碼骨架, 終端脫水, repo_radar]
dependencies: []
ssot_dependencies: ["doc/core/token-optimization-guide.md"]
---

# 技能指令：Token 節省器 (RTK Token Saver)

你負責在專案開發過程中，透過 `rtk` (Rust Token Killer) 工具最大化節省 LLM Token 的消耗。

## 1. 指令改寫規範
當你需要使用 `run_command` 執行任何終端指令時，**必須** 優先評估是否可以使用 `rtk` 包裝。

### 適合包裝的指令（高輸出量）
* **Git 相關**：`git diff`、`git status`、`git log`、`git show` 
  * 範例：`rtk git diff`
* **測試相關**：`npm test`、`jest`、`vitest`、`cargo test`、`go test`
  * 範例：`rtk npm test`
* **檢查與建置**：`eslint`、`tsc`、`cargo build`、`webpack`
  * 範例：`rtk tsc`
* **搜尋與查看**：`grep`、`rg`（ripgrep）
  * 範例：`rtk grep "pattern" .`

### 不適合包裝的指令（低輸出或互動性強的指令）
* `mkdir`、`cd`、`rm` 等純系統目錄操作。
* `npm install` 或 `cargo install` 等長耗時下載且不影響後續上下文比對的命令。

## 2. 容錯與降級機制
1. 第一次在會話中使用 `rtk` 前，可先執行 `rtk --version` 驗證其可用性。
2. 若執行 `rtk <command>` 時出現 `command not found` 或其他環境錯誤，應降級使用原始指令，並建議使用者確認 `rtk` 安裝狀態。

## 3. 效益追蹤與回報
* 當你結束任務或提交 `walkthrough.md` 時，可執行 `rtk gain` 取得目前的 Token 節省統計。
* 在給使用者的總結中，主動附上節省數據（例如：「本次工作透過 rtk 節省了約 80% 的 Token 傳輸」）。

## 4. 四層 Token 防火牆體系 (4-Layer Token Firewall Architecture)
為徹底杜絕巨型 Base64 數據、終端長篇日誌、動態腳本泛濫與 Context 無節制膨脹，專案確立四層防禦協議：

1. **L1 資料層 (入口物理消毒)**：
   - **禁止直接讀取**：嚴禁在對話中直接 `view_file` 外部傳入或未消毒的 Markdown 草稿。
   - **強制黑盒預處理**：所有草稿進入編譯前，必須強制執行：
     ```bash
     python tools/compiler/sanitize_draft.py --input <path_to_draft.md> --quiet
     ```
   - **實體抽離**：將巨量 Base64 圖片物理轉存至 `assets/images/draft/`，同時規範化 LaTeX 數學公式並剔除 UI 雜訊。
2. **L2 架構層 (黑盒靜音 CLI 契約與案卷優先)**：
   - **靜音合約**：所有固化 CLI 工具預設必須支援 `--quiet` / `--json`，成功時僅輸出 < 200 字元的單行 JSON 摘要，嚴禁終端泛洪。
   - **Zero-Full-Read 案卷**：規劃階段僅調閱案卷（Dossier < 5KB）或使用 `python tools/repo_radar.py section <file> --heading "<標題>"` 精準調閱單一章節，杜絕全文載入。
3. **L3 進程層 (沙盒隔離與 2-Strike 熔斷)**：
   - **沙盒除錯**：複雜除錯或深層探索任務委派給 Subagent 沙盒執行，避免龐大過程資訊累積至主對話。
   - **2-Strike 熔斷**：單一 Bug 最多重試 2 次，失敗嚴禁第 3 次盲試，立即停步、復原工作區並立案至 Issue Tracker。
4. **L4 流程層 (多 Session 接力與邊界控制)**：
   - 恪守 Gate 2 單 Phase 原子執行與停步交權，單對話 Context > 50,000 Tokens 或 Phase 驗收完成即啟動換場 SOP。

## 5. CLI 極簡/壓縮模式規範 (Compact Mode)
* 針對高頻執行之專案維護命令，優先使用內建的緊湊/極簡輸出，防止數十至數百行日誌佔滿 Context：
  * **單篇草稿物理消毒**：`python tools/compiler/sanitize_draft.py -i <file> -q`（單行微型 JSON 摘要）。
  * **單篇 HTML 靜態合規驗證**：`python scratch/manage.py validate <file_path> --compact`（或 `-c`），成功時僅輸出 1 行摘要。
  * **全站架構與 SSOT 審計**：`python scratch/manage.py audit-ssot` 預設採緊湊摘要，亦可指定 `--compact` 輸出單行總結。
  * **全站資料庫三向同步**：`python scratch/manage.py sync-db --sync --compact`。
  * **程式碼骨架快速提煉**：`python tools/code_skeleton.py <file>`（過濾實作細節，減少 ~50-80% Context 消耗）。
  * **終端報錯日誌脫水**：`command | python tools/compact_log.py`（截斷過長 Traceback 與重複堆疊）。
  * **情報雷達架構地圖**：`python tools/repo_radar.py map`（輸出模組、類別與文檔大綱之輕量情報地圖）。
  * **情報雷達大綱提取**：`python tools/repo_radar.py outline <file>`（提取大綱地圖，適用於代碼或長文檔）。
  * **情報雷達符號秒查**：`python tools/repo_radar.py symbol <name>`（免全文檢索快速定位符號與類別宣告）。
  * **文檔精準章節切片**：`python tools/repo_radar.py section <file> --heading "<標題>"`（精準提取單一章節，杜絕全文載入）。
  * **雷達索引重建/更新**：`python tools/generate_symbol_index.py`（重建 `.repo_index.json` 靜態快取索引）。
* 在非除錯場景下，嚴禁無節制傾印全文終端結果；除錯時僅在 Exit code != 0 或特定錯誤時查閱詳細日誌。

## 6. Context 膨脹預警與 Session 換場指南 (Session Swapping & Boundary Control)
* **Context 水位預警（> 50,000 Tokens）**：
  * 當單一對話 Session 的上下文累積超過 5 萬 Tokens，或已完成一個主要 Phase 的大型重構/編譯開發時，**必須主動觸發 Session 換場準備**。
  * 嚴禁在 Context 膨脹的高水位狀態下硬推跨領域或後續獨立 Phase（如發布、驗收或跨頁面重構）。
* **標準停步換場流程 (Session Handoff SOP)**：
  1. **狀態落盤收斂**：將當前 Phase 的關鍵驗證結果以單行緊湊摘要寫入實體任務檔（`doc/doc_task/task_*.md`）之「7. 狀態收斂歷程」。
  2. **勾選 Checkpoint**：勾選當前 Phase 的 Checkpoint，將狀態更新為 `[已完成]`。
  3. **清理暫存區**：確認 `scratch/tmp/` 內的中間除錯檔已清理，確保 Git 工作區乾淨。
  4. **停步交回控制權**：主動向使用者發出換場建議，並附上下一個 Session 啟動時所需執行的單行精準提示詞。

