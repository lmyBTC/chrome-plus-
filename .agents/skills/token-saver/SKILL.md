---
name: Token 節省器 (RTK Token Saver)
description: 指導 Agent 在終端執行、檔案讀寫與會話管理中最大化節省 Token，涵蓋 rtk 包裝、代碼骨架提煉、日誌脫水、局部讀寫、會話重置與自動化審計。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化, 局部讀取, 精準寫入, 會話重置, 代碼骨架, 骨架提煉, code_skeleton, 日誌脫水, compact_log, 水位分析, analyze_task_tokens, 情報雷達, repo_radar]
dependencies: []
ssot_dependencies: ["0.doc_mg/docs/guide-token-optimization.md", ".agents/rules.md"]
---

# 專家技能：Token 節省器 (RTK Token Saver - Chrome Plus v3.2 旗艦版)

你負責在專案開發過程中，透過 `rtk` (Rust Token Killer) 工具、程式碼骨架化、終端日誌脫水與會話物理隔絕，最大化節省 LLM Token 消耗。詳細架構哲學與工具矩陣詳見 `0.doc_mg/docs/guide-token-optimization.md`。

## 1. 指令改寫規範 (RTK 與日誌脫水)
當你需要使用 `run_command` 執行終端指令時，**必須** 優先評估是否可以使用 `rtk` 包裝。

### 適合包裝的指令（高輸出量）
* **Git 相關**：`git diff`、`git status`、`git log`、`git show` 
  * 範例：`rtk git diff`
* **測試相關**：`npm test`、`jest`、`vitest`、`cargo test`
  * 範例：`rtk npm test`
* **檢查與建置**：`eslint`、`tsc`、`cargo build`、`webpack`、`npm run build`
  * 範例：`rtk tsc`
* **搜尋與查看**：`grep`、`rg`（ripgrep）
  * 範例：`rtk grep "pattern" .`

### 長日誌管線脫水
若執行無 `rtk` 支援或預期產生大量 Traceback/報錯堆疊之指令，強制管線串接日誌脫水器：
```bash
npm run build 2>&1 | py 1.devtools/tools/compact_log.py
py 1.devtools/tools/audit_suite.py 2>&1 | py 1.devtools/tools/compact_log.py
```

### 容錯與降級機制
1. 第一次在會話中使用 `rtk` 前，可先執行 `rtk --version` 驗證其可用性。
2. 若執行 `rtk <command>` 時出現 `command not found` 或環境不支援，應平滑降級使用 `compact_log.py` 或原生指令。

### 效益追蹤與回報
* 當你結束任務或輸出總結時，可執行 `rtk gain` 取得目前的 Token 節省統計。
* 在給使用者的總結中，主動附上節省數據（例如：「本次工作透過 rtk 節省了約 80% 的 Token 傳輸」）。

## 2. 代碼骨架提煉 (Skeleton Extraction)
探勘逾 100~150 行之代碼時，**嚴禁全檔盲讀 `read_file`**，強制提取介面骨架（節省 85%~95% Token）：
```bash
py 1.devtools/tools/code_skeleton.py <目標檔案路徑>
# 或落盤為 Gate 1 探勘持久化快取 (供後續 Gate 2 Session 直接開工)
py 1.devtools/tools/code_skeleton.py <目標檔案路徑> --save 0.doc_mg/tasks/tmp/tmp_probe_<task>.md
```

## 3. 檔案讀取與精準寫入規範
- **硬窄化探索**：探索性讀取限制 ≤ 30 行型別/介面；局部細讀以完整函式/組件為自然語意單元（以 80~150 行為準），徹底消除切香腸式破碎讀取帶來的盲目猜測。
- **局部讀取**：>100 行檔案先透過 `repo_radar.py` 或符號索引定位行號，再以 `read_file` 指定 `StartLine` 與 `EndLine` 局部讀取。
- **精準寫入**：修改既有檔案一律使用原生 `edit_file` 精準局部替換（≤ 50~80 行前後具備唯一邊界的語意區塊），嚴禁整檔覆寫。
- **參數防護**：對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata` 參數。

## 4. 四層 Token 防火牆體系 (4-Layer Token Firewall Architecture)
1. **L1 資料層 (入口物理消毒與骨架化)**：
   - 探索程式碼時逾 100 行強制先跑 `code_skeleton.py` 或 `repo_radar.py outline`，拒絕直接通讀長源碼。
   - 外部草稿進入前執行預處理，轉存大型 Base64 數據並剔除 UI 雜訊。
2. **L2 架構層 (黑盒靜音 CLI 契約與案卷優先)**：
   - 固化維護與審計命令優先使用 `--compact` / `--quiet` 旗標（例如 `audit_suite.py --compact`），通過時僅輸出單行通過摘要。
   - 規劃階段調閱規格優先使用 `py 1.devtools/tools/repo_radar.py section <file> --heading "<標題>"` 精準抽吸單一章節。
3. **L3 進程層 (沙盒隔離與 2-Strike 熔斷)**：
   - 複雜排查委派 Subagent 沙盒執行，避免龐大過程資訊污染主對話。
   - 單一問題重試上限 2 次，失敗即刻熔斷，執行 `py 1.devtools/tools/log_issue.py log` 實體立案並還原工作區。
4. **L4 流程層 (One Phase, One Session & 水位監控)**：
   - 恪守單 Phase 原子執行與停步交權，單對話 Context > 50,000 Tokens 或 Phase 完成即啟動換場 SOP。
   - 可執行 `py 1.devtools/tools/analyze_task_tokens.py --quick-check` 秒查當前對話 Context 水位。

## 5. CLI 極簡/脫水模式規範 (Compact Mode)
* 針對高頻執行之專案維護命令，優先使用內建的緊湊/極簡輸出，防止數十至數百行日誌佔滿 Context：
  * **一鍵全自動審計套件**：`py 1.devtools/tools/audit_suite.py --compact`
  * **多插件隔離審查**：`py 1.devtools/tools/audit_plugin_isolation.py --compact`
  * **Manifest V3 安全審查**：`py 1.devtools/tools/audit_manifests.py --compact`
  * **終端報錯日誌脫水**：`<command> 2>&1 | py 1.devtools/tools/compact_log.py`
  * **情報雷達架構地圖**：`py 1.devtools/tools/repo_radar.py map`
  * **情報雷達大綱提取**：`py 1.devtools/tools/repo_radar.py outline <file>`
  * **情報雷達符號秒查**：`py 1.devtools/tools/repo_radar.py symbol <Name>`
  * **文檔精準章節切片**：`py 1.devtools/tools/repo_radar.py section <file> --heading "<標題>"`
  * **雷達索引重建/更新**：`py 1.devtools/tools/generate_symbol_index.py`
  * **對話 Token 水位分析**：`py 1.devtools/tools/analyze_task_tokens.py --current`
  * **任務管理與封存**：`py 1.devtools/tools/task_cli.py list` / `task_cli.py archive`

## 6. Context 膨脹預警與 Session 換場指南 (Session Swapping SOP)
* **Context 水位預警（> 50,000 Tokens）**：
  * 當單一對話 Session 的上下文累積超過 5 萬 Tokens，或已完成一個主要 Phase 的原子開發時，**必須主動觸發 Session 換場**。
  * 嚴禁在 Context 膨脹的高水位狀態下硬推跨領域或後續獨立 Phase。
* **標準停步換場流程 (Session Handoff SOP)**：
  1. **狀態落盤收斂**：將當前 Phase 的關鍵驗證結果以單行緊湊摘要寫入實體任務檔（`0.doc_mg/tasks/task_*.md`）之「7. 狀態收斂歷程」。
  2. **勾選 Checkpoint**：勾選當前 Phase 的 Checkpoint，將狀態更新為 `[已完成]`。
  3. **清理暫存區**：確認中間除錯檔已清理，確保 Git 工作區乾淨。
  4. **停步交回控制權**：強制輸出標準跨會話接力代碼塊，由使用者開啟全新 Session 接力推進。
