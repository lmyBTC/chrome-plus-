0.doc_mg\tasks\archive\global\task_20261028_02_devtools_doc_cross_ref_tool.md  再次執行清理




## 2. 上下文探索與依賴 (Context Grounding)
<!-- AI: [Gate 1] 獲准進入規劃後，執行最小化唯讀探索，禁止憑空猜測路徑與盲目全域掃描。 -->
- **SSOT 規範查閱**：已查閱 `.agents/rules.md` 對應技能規範。
- [ ] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：<!-- AI: 必須填寫各階段工具真實調用實證，嚴禁無證據虛應打勾！逾 150 行代碼/長文檔嚴禁直接 view_file -->
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 脫水效益 / 驗收狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py tools/repo_radar.py outline`<br>`py tools/code_skeleton.py`<br>`py tools/repo_radar.py section` | `[例如：py tools/code_skeleton.py <path>]` | `[原始 X 行 ➔ 骨架 Y 行 / 節省 Z% Context]` |
  | **Gate 2: 執行** | `2>&1 \| py tools/compact_log.py`<br>`py tools/diff_inspector.py` | `[填寫終端脫水指令或無長日誌說明]` | `[日誌脫水率或 Exit 0]` |
  | **Gate 3: 驗收** | `py scratch/manage.py audit-ssot`<br>`py tools/generate_symbol_index.py` | `[填寫驗收命令與快取更新]` | `[SSOT 0 drift / 快取已更新]` |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`scratch/tmp/tmp_probe_{task_slug}.md`
  <!-- AI 強制規則：
       1. Gate 1 探勘工具 (code_skeleton / repo_radar) 產出之骨架或大綱，必須透過 `--save scratch/tmp/tmp_probe_{task_slug}.md` 落地保存。
       2. 後續 Session (Phase 1+) 啟動時，強制優先查閱此快取檔，嚴禁重新 view_file 原始長檔案或重新探索！
       3. 本任務完工結案後，由 clean-scratch 自動回收，零環境污染。
       4. 若快取遺失或不存在，優先依賴任務步驟已錨定之行號 (80~150 行語意單元細讀)；若需重勘強制調用 code_skeleton/repo_radar 重新落盤，嚴禁直接 view_file 原始長檔。 -->
- **影響範圍地圖 (Entity Map)**：<!-- AI: 列出本次改動牽連的檔案、組件與模組相依性。[依賴前置] 涉及跨模組變更時，優先以目錄限縮的精準檢索或架構路徑盤點上下游，杜絕盲目全域 grep；大型重構時可按需參考 graph_query.py。 -->
- **前置條件 (Prerequisites)**：<!-- AI: 開發前必須完成的環境或狀態準備 (如 git status 乾淨、套件安裝等)。 -->