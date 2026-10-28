---
title: "[任務標題]"
status: "規劃中" # 規劃中 | 開發中 | 待審核 | 已完成
created: "YYYY-MM-DD"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一 Bug 最多重試 2 次 (熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 1 (Blueprint)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["doc/draft/xxx.md", "doc/draft/draft-YYYYMMDD-xxx.html"])，供自動歸檔工具同步收納至鏡像週目錄
target_post: "" # 發布目標路徑 (例如: "post/news/YYYYMMDD-xxx.html")
---

> - [ ] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> <!-- AI: 嚴格遵循 task-protocol (4-Gate Multi-Session Protocol: Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂)。本範本僅在 Gate 0 獲准方向後，方可於 Gate 1 讀取與克隆為 doc/doc_task/task_MMDD_NN_[slug].md（MMDD 為月日，NN 為當日兩位數流水號如 01、02）。建立任務檔必須第一時間執行 git add 納入版本防護；更新任務檔嚴格限制語意區塊局部替換 (≤ 50-80 行，Checkpoint 單次批次收斂)；建立任務時必須刪除範本內所有 HTML 註解提示。 -->

## 1. 目標與驗證指標 (Objective & Metrics)
<!-- AI: 描述核心挑戰。必須將指令轉化為可客觀物理驗證的成功標準 (如 Exit 0 命令與預期行為)。 -->
- **用戶原始需求 (True Intent)**：<!-- AI: 基於第一性原理，挖掘用戶提出此任務背後的根本痛點，避免盲從表面解法。 -->
- **核心目標**：
- **邊界與假設**：<!-- AI: 思考並列出可能的 Edge cases -->

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

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：<!-- AI: 說明將重用哪些現有組件，避免重複造輪子 -->
- **架構策略與 Tree of Thoughts (ToT)**：<!-- AI: 若有高歧義/多重可行解，簡述 2 候選方案與最終選定理由 -->
- **硬性禁止動作 (Guardrails)**：<!-- AI: 條列本任務明確禁止的誤踩動作 (例如: 禁止 Set-Content / 禁止變更全域 API 介面 / 熔斷上限重試 2 次 / 終端長日誌強制串接 compact_log.py 脫水 / 驗證嚴禁單詞輪巡 Grep 須採單次 Regex / 任務檔收尾嚴禁分拆多輪須單次合併打勾更新) -->

### 鎖定檔案 (Target Files)
<!-- AI: 填寫本任務實質修改的目標檔案。若涉及跨庫修改，請依據相依性盤點結果精準鎖定關聯檔案。 -->
- `c:\Users\G1\00.coding workspace\masonyang-blog\path\to\target`

### 目標 SSOT 閉環宣告 (Target SSOTs)
<!-- AI: [Gate 1 前置衝擊評估] 90/10 分級守則。嚴禁僅列代碼檔案，凡涉及組件/模組新增修改、資料模型或工具規範變動，必須於規劃階段前置宣告四層回寫目標：
  - 90% 輕量任務（樣式微調、文字修正、新聞發布、局部除錯）：L1~L3 填寫 [N/A]，全面豁免讀寫，零額外 Token 損耗。
  - 10% 重大變更（Schema、核心組件、工具鏈、全站規範）：必須列出具體需同步純骨架的檔案，結案驗收時將嚴格核對。 -->
- **L1 專家技能**: <!-- [N/A] 或 .agents/skills/xxx/SKILL.md (純骨架索引，嚴禁貼大段代碼) -->
- **L2 模組導航**: <!-- [N/A] 或 .agents/rules.md / tools/README.md / doc/doc_task/task_manager.md 等進入點清單 -->
- **L3 領域規格**: <!-- [N/A] 或 doc/core/xxx.md / scratch/0mg.md / doc/components/xxx.md 等核心規格文件 -->
- **L4 封存治理**: `doc/doc_task/archive/` (結案時歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)
<!-- AI: 標註屬性標籤 [Serial] | [Independent] | [Blocker]。落實「One Session, One Phase」：完成單一 Phase 必須即時 Checkpoint、收斂狀態並停步。若執行預期大量日誌指令，建議管線串接 2>&1 | py tools/compact_log.py 脫水。遭遇次生突發問題強制停止探索、回寫 [BLOCKED] 實體立案並開新 Session 接力，嚴禁原地滾動 Token 擴散除錯。 -->

### Phase 1: <!-- AI: 填寫階段目標 --> 狀態：`[待辦]`
- [ ] 任務 1.1 `[Blocker]`: <!-- AI: 填寫中任務標題 -->
    - **動作**: <!-- AI: 具體修改哪個檔案或哪個組件。必須落實「行號錨定 (Line Anchor)」：明確標註目標檔案與精確行號區間 (例如: path/to/file.py L45-L60)，讓新 Session 0 探索直接開工！ -->
    - **驗證 (Exit 0 / 客觀指標)**: <!-- AI: 具體可執行的客觀驗證命令或檢查 (如 py tools/validate.py 或明確的單元驗收) -->

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [ ] 階段所有單元驗證已通過 (Exit 0)。
> - [ ] 狀態標記為 `[已完成]`（若遇突發阻礙則標記 `[BLOCKED]` 並附錯誤快照，撤回髒代碼後停步開新會話）。
> - [ ] 統一於本 Checkpoint 批次勾選完成項目，並將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [ ] 執行強制收尾（更新任務檔為本輪最後工具呼叫，嚴守 ≤ 50-80 行語意局部替換，更新即停步零冗餘呼叫）。
> - [ ] 遵循「One Phase, One Session」物理隔絕底線：於回覆末尾強制輸出開立新 Session 接力提示詞代碼塊，嚴禁於本會話連續推進下一階段。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
<!-- AI: 假設本任務失敗，逆向推理最可能的事故場景與降級/撤退步驟。 -->
- **最可能失敗場景 (Pre-Mortem)**：<!-- AI: 描述預測的高風險故障點與防範措施 -->
- **降級/回滾方案 (Blast Radius Control)**：<!-- AI: 若驗收失敗如何迅速撤退恢復 -->
- **熔斷與突發隔離機制 (Circuit Breaker & Incident Offloading)**：單一 Bug 連續嘗試 2 次失敗立即熔斷停步，禁止第 3 次盲試；若執行中遇次生非預期錯誤，嚴禁原地展開跨模組深挖探索（杜絕 Token 滾雪球），強制於本 Phase 標記 `[BLOCKED]` 或調用 `py tools/log_issue.py` 實體立案、Git 乾淨還原後強制停步，輸出新會話代碼塊由全新 Context 獨立處理。

## 6. 驗收標準 (Acceptance Criteria)
<!-- AI: 根據任務性質保留適用項目，並自訂至少 2 項具體的客觀驗證步驟 -->
- [ ] **四層 SSOT 閉環 (90/10 分級)**:
  - [ ] L1 專家技能: <!-- [N/A] 或已同步純骨架 -->
  - [ ] L2 模組導航: <!-- [N/A] 或已同步純骨架 -->
  - [ ] L3 領域規格: <!-- [N/A] 或已同步純骨架 -->
  - [ ] L4 任務收斂: 本任務檔案收斂並完成結案
- [ ] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案。
- [ ] **情報索引閉環**: 若本任務有新增/變更代碼符號、組件或正式文章，已執行 `py tools/generate_symbol_index.py` 閉環更新 `.repo_index.json`。
- [ ] **知識收斂與圖譜防護 (Gate 3)**: 執行 `py scratch/manage.py audit-ssot` (若有代碼更動加 `--impact`) 通過 Exit 0，確保全站 SSOT 與架構契約圖譜零漂移，並同步更新關聯指南與技能。
- [ ] **狀態隔離與安全**: 產生的分析腳本已放置於 `scratch/tmp/` 並符合 `0mg.md` 命名；無殘留測試代碼 (`console.log` 等)；若涉及草稿轉換，已執行 `py scratch/manage.py archive-drafts` 完成草稿即時歸檔 (今日 task 任務保留於 `doc/doc_task/` 根目錄)。
- [ ] **[客觀驗證 1]**: <!-- AI: 依據任務填寫具體 Exit 0 動作，如特定驗證指令通過 -->
- [ ] **[客觀驗證 2]**: <!-- AI: 介面或資料狀態客觀無異常 -->

## 7. 狀態收斂歷程 (Condensed History)
<!-- AI: 實體記憶真理源。每完成一個階段或重大操作，追加單行記錄；切換 Session 時以此為唯一歷史索引，嚴禁肉身搬運舊對話。 -->
- [YYYY-MM-DD] 藍圖建立完成 (Session 1)