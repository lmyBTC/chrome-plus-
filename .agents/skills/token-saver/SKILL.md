---
name: Token 節省器 (RTK Token Saver)
description: 引導 Agent 在執行高輸出之終端指令時，自動包裝 rtk 前綴以最大化節省 Token。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化]
dependencies: []
ssot_dependencies: []
---

# 技能指令：Token 節省器 (RTK Token Saver)

你負責透過 `rtk` (Rust Token Killer) 工具，最大化節省執行終端指令時產生的 Token 消耗。

## 1. 指令改寫規範
使用 `run_command` 時，**必須** 優先評估是否使用 `rtk` 包裝。

### 適合包裝之高輸出指令
- **Git 操作**: `git diff`, `git status`, `git log`, `git show` (例: `rtk git diff`)
- **建置與檢查**: `npm run build`, `tsc`, `eslint` (例: `rtk npm run build`)
- **檔案搜尋**: `grep`, `rg` (例: `rtk rg "pattern"`)

### 不適合包裝之指令
- 純系統操作 (如 `mkdir`, `rm`, `cd`)
- 長耗時下載指令 (如 `npm install`)
- 持續運行之 Dev Server (如 `npm run dev`, `vite`)

## 2. 容錯與降級
1. 首度執行 `rtk` 前，可執行 `rtk --version` 驗證。
2. 若回報 `command not found` 或錯誤，應降級回原始指令，並提醒使用者確認。

## 3. 效益回報
- 任務結束輸出 `walkthrough.md` 時，可執行 `rtk gain` 取得 Token 節省統計。
- 在給使用者的總結中，主動附上節省數據（如：「本次工作透過 rtk 節省了約 14.9% 的 Token 傳輸」）。
