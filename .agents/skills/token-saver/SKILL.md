---
name: Token 節省器 (RTK Token Saver)
description: 指導 Agent 在終端執行、檔案讀寫與會話管理中最大化節省 Token，涵蓋 rtk 包裝、代碼骨架提煉、日誌脫水、局部讀寫、會話重置與自動化審計。
triggers: [節省Token, 壓縮輸出, 優化指令, 使用rtk, token優化, 執行終端, 指令節省, rtk指令, 終端優化, 局部讀取, 精準寫入, 會話重置, 代碼骨架, 骨架提煉, code_skeleton, 日誌脫水, compact_log, 水位分析, analyze_task_tokens]
dependencies: []
ssot_dependencies: ["0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md", ".agents/rules.md"]
---

# 專家技能：Token 節省與開發效率工程 (Token Optimization & RTK - Chrome Plus 版)

在各開發流程中落實最嚴格的 Token 節省策略。詳細架構哲學與工具矩陣詳見 `0.doc_mg/docs/README_TOKEN_OPTIMIZATION_GUIDE.md`。

## 1. 終端輸出壓縮 (RTK 與日誌脫水)
- **RTK 包裝優先**：終端指令優先使用 `rtk`（例：`rtk git diff`, `rtk npm run build`, `rtk rg`）。
- **長日誌脫水**：編譯、檢查或測試預期產生大量堆疊時，強制管線串接脫水器：
  ```bash
  npm run build 2>&1 | py 1.devtools/tools/compact_log.py
  ```
- **容錯降級**：若環境未安裝 `rtk`，則降級使用 `compact_log.py` 或原生指令。

## 2. 代碼骨架提煉 (Skeleton Extraction)
探勘 >100 行之代碼時，**嚴禁全檔 dump**，強制提取介面骨架（節省 85%~95% Token）：
```bash
py 1.devtools/tools/code_skeleton.py <目標檔案路徑>
# 或支援落盤為 Gate 1 持久化快取
py 1.devtools/tools/code_skeleton.py <目標檔案路徑> --save scratch/tmp/tmp_probe_<task>.md
```

## 3. 檔案讀取與精準寫入規範
- **硬窄化探索**：探索性讀取限制 ≤ 30 行型別/介面；細讀視窗以 80~150 行自然語意單元為準。
- **局部讀取**：>100 行檔案先透過 `repo_radar.py` 或符號索引定位行號，再以 `read_file` 指定 `StartLine` 與 `EndLine` 局部讀取。
- **精準寫入**：修改既有檔案一律使用原生 `edit_file` 精準局部替換（≤ 50~80 行前後具備唯一邊界的語意區塊），嚴禁整檔覆寫。

## 4. 四層 Token 防火牆體系 (4-Layer Token Firewall Architecture)
1. **L1 資料層 (入口物理消毒與骨架化)**：
   - 探索程式碼時逾 100 行強制先跑 `code_skeleton.py` 或 `repo_radar.py`，拒絕直接通讀長源碼。
2. **L2 架構層 (黑盒靜音 CLI 契約與案卷優先)**：
   - 審計與維護命令優先使用 `--compact` / `--quiet` 旗標（例如 `audit_suite.py --compact`），通過時僅輸出單行通過摘要。
3. **L3 進程層 (沙盒隔離與 2-Strike 熔斷)**：
   - 單一問題重試上限 2 次，失敗即刻熔斷，執行 `py 1.devtools/tools/log_issue.py log` 實體立案並還原工作區。
4. **L4 流程層 (One Phase, One Session & 水位監控)**：
   - 恪守單 Phase 原子執行與停步交權，可執行 `py 1.devtools/tools/analyze_task_tokens.py --quick-check` 秒查當前對話 Context 水位。

## 5. CLI 極簡/脫水模式規範 (Compact Mode)
* 針對高頻執行之專案維護命令，優先使用內建的緊湊/極簡輸出，防止數十至數百行日誌佔滿 Context：
  * **一鍵全自動審計套件**：`py 1.devtools/tools/audit_suite.py --compact`
  * **多插件隔離審查**：`py 1.devtools/tools/audit_plugin_isolation.py --compact`
  * **Manifest V3 安全審查**：`py 1.devtools/tools/audit_manifests.py --compact`
  * **終端報錯日誌脫水**：`<command> 2>&1 | py 1.devtools/tools/compact_log.py`
  * **情報雷達架構地圖**：`py 1.devtools/tools/repo_radar.py map`
  * **情報雷達符號秒查**：`py 1.devtools/tools/repo_radar.py symbol <Name>`
  * **文檔精準章節切片**：`py 1.devtools/tools/repo_radar.py section <file> --heading "<標題>"`
  * **雷達索引重建/更新**：`py 1.devtools/tools/generate_symbol_index.py`
  * **對話 Token 水位分析**：`py 1.devtools/tools/analyze_task_tokens.py --current`

## 6. Context 膨脹預警與 Session 換場指南 (Session Swapping SOP)
* **換場時機**：完成單一 Phase 原子任務，或單一對話 Session Context 累積高水位時，**必須主動觸發 Session 換場**。
* **標準停步換場流程 (Session Handoff SOP)**：
  1. **狀態落盤收斂**：將當前 Phase 的關鍵驗證結果以單行緊湊摘要寫入實體任務檔（`0.doc_mg/tasks/task_*.md`）之「7. 狀態收斂歷程」。
  2. **勾選 Checkpoint**：勾選當前 Phase 的 Checkpoint，將狀態更新為 `[已完成]`。
  3. **清理暫存區**：確認中間除錯檔已清理，確保 Git 工作區乾淨。
  4. **停步交回控制權**：強制輸出標準跨會話接力代碼塊，由使用者開啟全新 Session 接力推進。
