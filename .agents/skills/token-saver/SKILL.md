---
name: Token 節省器 (RTK Token Saver)
description: 指導 Agent 在終端執行、檔案讀寫與會話管理中最大化節省 Token，涵蓋 rtk 包裝、局部讀寫、會話重置與自動化審計。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化, 局部讀取, 精準寫入, 會話重置]
dependencies: []
ssot_dependencies: []
---

# 專家技能：Token 節省與開發效率工程 (Token Optimization & RTK)

你負責在各開發流程中落實最嚴格的 Token 節省策略，從終端輸出、檔案 I/O 到會話脈絡，全方位降低 Token 消耗並杜絕注意力退化（Context Rot）。

## 1. 終端輸出壓縮 (RTK 指令包裝)
使用 `run_command` 時，必須優先評估是否使用 `rtk` (Rust Token Killer) 包裝：

### 適合包裝之高輸出指令
- **Git 操作**: `git diff`, `git status`, `git log`, `git show` (例: `rtk git diff`)
- **建置與檢查**: `npm run build`, `tsc`, `eslint` (例: `rtk npm run build`)
- **檔案搜尋**: `grep`, `rg` (例: `rtk rg "pattern"`)

### 不適合包裝之指令
- 純系統目錄/環境操作 (如 `mkdir`, `rm`, `cd`)
- 長耗時下載指令 (如 `npm install`)
- 持續運行之 Dev Server (如 `npm run dev`, `vite`)

### 容錯與降級
1. 首度執行 `rtk` 前，可執行 `rtk --version` 驗證。
2. 若回報 `command not found` 或錯誤，應降級回原始指令，並提醒使用者確認。

## 2. 檔案讀取與精準寫入規範
檔案 I/O 是最常造成上下文爆炸（Context Bloat）的來源，必須遵守：
- **硬窄化探索**：單次探索性讀取嚴格限制 ≤ 30 行公開介面/型別簽名，嚴禁全文 dump。
- **局部讀取**：檔案超過 100 行時，**嚴禁全檔讀取**。先透過 `grep_search` 定位行號，再使用 `view_file` 指定 `StartLine` 與 `EndLine` 讀取精確區塊。
- **精準替換**：修改既有檔案時，優先使用 `replace_file_content` 進行單點替換，禁止無端以 `write_to_file` 整檔覆寫。

## 3. 會話重置協議 (Session Reset Protocol)
- **Gate 1 結束時接力**：當 Gate 1 產出實體 `task.md` 後，輸出標準化跨會話接力指令（如 `載入 ./0.doc_mg/tasks/task_xxx.md，開始執行 Phase 1`）。
- **徹底釋放 Context**：開啟新對話能徹底卸除 Gate 1 探勘佔用之歷史 Tool Outputs，省下 70%~90% 輸入 Token，並確保注意力高度集中於 Gate 2 實作。

## 4. 自動化審計優先 (Automated Tooling First)
- 代碼修改或 Manifest 調整後，優先透過自動化腳本審查（如 `python 1.devtools/tools/audit_manifests.py` 或 `npm run audit:manifests`），切勿透過多輪手動 scan 或逐檔人工排查。

## 5. 效益回報
- 任務結束輸出 `walkthrough.md` 時，可執行 `rtk gain` 取得 Token 節省統計。
- 在給使用者的總結中，主動附上節省數據（如：「本次工作透過 rtk 節省了約 14.9% 的 Token 傳輸」）。
