---
name: Token 節省器 (RTK Token Saver)
description: 指導 Agent 在終端執行、檔案讀寫與會話管理中最大化節省 Token，涵蓋 rtk 包裝、代碼骨架提煉、日誌脫水、局部讀寫、會話重置與自動化審計。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化, 局部讀取, 精準寫入, 會話重置, 代碼骨架, 骨架提煉, code_skeleton, 日誌脫水, compact_log]
dependencies: []
ssot_dependencies: [0.doc_mg/docs/token_optimization_guide.md]
---

# 專家技能：Token 節省與開發效率工程 (Token Optimization & RTK)

你負責在各開發流程中落實最嚴格的 Token 節省策略，從終端輸出、檔案 I/O 到會話脈絡，全方位降低 Token 消耗並杜絕注意力退化（Context Rot）。詳細架構哲學參見 `0.doc_mg/docs/token_optimization_guide.md`。

## 1. 終端輸出壓縮 (RTK 與日誌脫水)
使用 `run_command` 時，必須優先評估終端輸出體積：

### RTK 包裝 (優先採用)
- **Git 操作**: `git diff`, `git status`, `git log`, `git show` (例: `rtk git diff`)
- **建置與檢查**: `npm run build`, `tsc`, `eslint` (例: `rtk npm run build`)
- **檔案搜尋**: `grep`, `rg` (例: `rtk rg "pattern"`)

### 日誌脫水過濾器 (compact_log.py)
在執行打包編譯或測試發生報錯時，若無安裝 rtk 或欲精準過濾長篇堆疊，透過管線過濾雜訊：
```bash
npm run build 2>&1 | python 1.devtools/tools/compact_log.py
```
- **核心機制**：智慧過濾 `node_modules` 冗長調用堆疊，只保留出錯檔案、行號與關鍵錯誤描述，避免數千行日誌打爆上下文視窗。

### 容錯與降級
1. 首度執行 `rtk` 前，可執行 `rtk --version` 驗證。
2. 若回報 `command not found` 或錯誤，應降級回原始指令或使用 `compact_log.py` 管線。

## 2. 代碼骨架提煉 (Skeleton Extraction)
理解或調用其他模組介面時，**嚴禁全量讀取包含大量業務實作細節之源碼**：
- **骨架提煉指令**（支援跨平台 npm 與 Windows Python 解釋器防禦）：
  ```bash
  npm run skeleton -- <目標檔案路徑>
  # 或直接透過 Python / 轉發器執行：
  py 1.devtools/tools/code_skeleton.py <目標檔案路徑>
  node 1.devtools/tools/run_py.js 1.devtools/tools/code_skeleton.py <目標檔案路徑>
  ```
- **核心機制**：自動掏空函式體（保留簽名、參數、返回型別與 JSDoc），將數百行組件壓縮為 30~50 行介面骨架，**節省 85%~95% 上下文 Token**。具備 Windows 跨平台自動偵測、孤兒閉合括號修復與非函式變數安全隔離。

## 3. 檔案讀取與精準寫入規範
檔案 I/O 是最常造成上下文爆炸（Context Bloat）的來源，必須遵守：
- **硬窄化探索**：單次探索性讀取嚴格限制 ≤ 30 行公開介面/型別簽名，嚴禁全文 dump。
- **局部讀取**：檔案超過 100 行時，**嚴禁全檔讀取**。先透過 `grep_search` 定位行號，再使用 `view_file` 指定 `StartLine` 與 `EndLine` 讀取精確區塊。
- **精準替換**：修改既有檔案時，優先使用 `replace_file_content` 進行單點替換，禁止無端以 `write_to_file` 整檔覆寫。

## 4. 會話重置協議 (Session Reset Protocol)
- **Gate 1 結束時接力**：當 Gate 1 產出實體 `task.md` 後，輸出標準化跨會話接力指令（如 `載入 ./0.doc_mg/tasks/task_xxx.md，開始執行 Phase 1`）。
- **徹底釋放 Context**：開啟新對話能徹底卸除 Gate 1 探勘佔用之歷史 Tool Outputs，省下 70%~90% 輸入 Token，並確保注意力高度集中於 Gate 2 實作。

## 5. 自動化審計優先 (Automated Tooling First)
- 代碼修改或 Manifest 調整後，優先透過自動化腳本審查（如 `python 1.devtools/tools/audit_manifests.py` 或 `npm run audit:manifests`），切勿透過多輪手動 scan 或逐檔人工排查。

## 6. 效益回報
- 任務結束輸出 `walkthrough.md` 時，可執行 `rtk gain` 取得 Token 節省統計。
- 在給使用者的總結中，主動附上節省數據（如：「本次工作透過 rtk/code_skeleton 節省了約 80%+ 的 Token 傳輸」）。
