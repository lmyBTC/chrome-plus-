---
name: Token 節省器 (RTK Token Saver)
description: 指導 Agent 在終端執行、檔案讀寫與會話管理中最大化節省 Token，涵蓋 rtk 包裝、代碼骨架提煉、日誌脫水、局部讀寫、會話重置與自動化審計。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化, 局部讀取, 精準寫入, 會話重置, 代碼骨架, 骨架提煉, code_skeleton, 日誌脫水, compact_log]
dependencies: []
ssot_dependencies: [0.doc_mg/docs/token_optimization_guide.md]
---

# 專家技能：Token 節省與開發效率工程 (Token Optimization & RTK)

在各開發流程中落實最嚴格的 Token 節省策略。詳細架構哲學與工具矩陣詳見 `0.doc_mg/docs/token_optimization_guide.md`。

## 1. 終端輸出壓縮 (RTK 與日誌脫水)
- **RTK 包裝優先**：終端指令優先使用 `rtk`（例：`rtk git diff`, `rtk npm run build`, `rtk rg`）。
- **長日誌脫水**：編譯或測試預期產生大量堆疊時，強制管線過濾：
  ```bash
  npm run build 2>&1 | python 1.devtools/tools/compact_log.py
  ```
- **容錯降級**：若無 `rtk` 則降級使用 `compact_log.py` 或原生指令。

## 2. 代碼骨架提煉 (Skeleton Extraction)
探勘 >100 行之代碼時，**嚴禁全檔 dump**，強制提取介面骨架（節省 85%~95% Token）：
```bash
py 1.devtools/tools/code_skeleton.py <目標檔案路徑>
```

## 3. 檔案讀取與精準寫入規範
- **硬窄化探索**：探索性讀取限制 ≤ 30 行型別/介面；細讀視窗放寬至 80~150 行。
- **局部讀取**：>100 行檔案先透過 `grep_search` 定位，再以 `view_file` 局部讀取。
- **精準寫入**：修改既有檔案一律使用 `replace_file_content`，嚴禁無端全檔覆寫。

## 4. 會話隔離與自動化審計
- **會話重置 (One Phase, One Session)**：Phase 結束輸出標準接力代碼塊並停步交權，開啟新對話徹底釋放歷史 Context（節省 70%~90% 輸入 Token）。
- **自動化審計優先**：驗證優先調用自動化工具（`py 1.devtools/tools/audit_manifests.py`、`py 1.devtools/tools/doc_cross_ref.py`），杜絕多輪人工漫遊排查。
- **完整工具鏈矩陣**：完整 4-Gate 工具調用對照與節省數據詳見 `0.doc_mg/docs/token_optimization_guide.md`。
