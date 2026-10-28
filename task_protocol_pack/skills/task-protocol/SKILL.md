---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的克隆、同步與中斷點規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度]
dependencies: []
ssot_dependencies: ["doc/doc_task/task_template_v2.md", "doc/core/meta-skills-guide.md"]
---

# 技能指令：任務協議守護者 (v3.2 鬆綁流暢版)

你負責確保專案「任務物理同步」規範與 Token 節省策略 100% 執行，落實前置思考、多會話隔離與驗證機制。任務模板真理源為 `doc/doc_task/task_template_v2.md`。

## 1. 前置思維底線：編碼前思考 (Think Before Coding)
- **不要假設**：若有歧義，主動列出權衡並詢問使用者，嚴禁默默替使用者猜測。
- **禁止以歷史產物為規格 (Artifacts ≠ Specifications)**：探索規範一律讀取 `doc/` 或 `doc_template/` 下的 SSOT，**嚴禁抄襲 `news/` 或 `post/` 歷史檔案**。
- **目標驅動 (Goal-Oriented)**：將指令式任務轉化為可重現、可客觀驗證的 Exit 0 成功標準，並於事前驗屍 (Pre-Mortem) 逆向推演降級方案。
- **探勘硬窄化與語意細讀 (Outline First & Semantic Unit Read)**：探索與鎖定程式碼時，逾 150 行之代碼或長文檔**強制調用 `py tools/repo_radar.py outline <path>` 提取骨架或章節，嚴禁全檔盲讀 `view_file`**；局部細讀以完整函式/組件為自然單元（放寬為 80 ~ 150 行），徹底消除切香腸式破碎讀取帶來的盲目猜測與 Token 浪費。

## 2. 任務啟動四階段門禁 (The 4-Gate Protocol)

專案推行**階段責任隔離 (Phase-Gated Execution)**，實體任務檔案 (`task_*.md`) 為唯一狀態真理源。每階段完成後必須停步交回控制權，嚴禁自動偷跑下一階段。

| 門禁階段 | 准入條件 | 嚴格禁止事項 (Hard Guardrails) | 核心動作、Token 脫水工具與離開標準 (Exit Criteria) |
| :--- | :--- | :--- | :--- |
| **Gate 0: 方向探詢**<br>*(Session 0)* | 使用者提出新需求或模糊構想 | **嚴禁呼叫任何工具**、嚴禁讀寫掃描檔案 | 純推理輸出 100~200 字方案思考與權衡，**物理交回控制權**等待核准。 |
| **Gate 1: 脈絡藍圖**<br>*(Session 1)* | 使用者明確同意 Gate 0 方向 | **嚴禁動程式碼**、嚴禁執行實質 Phase、**嚴禁 >150 行代碼/長文檔全檔 view_file** | **[Token 探勘硬窄化 & 持久化快取實證]**：<br>1. 草稿/長文檔：強制 `py tools/repo_radar.py outline <path> --save scratch/tmp/tmp_probe_{task}.md`<br>2. 複雜組件/資料庫：強制 `py tools/code_skeleton.py --save scratch/tmp/tmp_probe_{task}.md <path>` 提煉骨架<br>3. 精準章節調閱：強制 `py tools/repo_radar.py section <path> --heading "<標題>" [--save ...]`<br>4. 讀取 `task_template_v2.md` 建立實體 `doc/doc_task/task_MMDD_NN_Topic.md` 並回填**工具調用矩陣實證與探勘快取路徑**，任務拆解落實**行號錨定 (Line Anchor)**，**第一時間執行 `git add <task-file>` 納入暫存區受版本防護**，停步待核准。 |
| **Gate 2: 分段原子執行**<br>*(Phase Execution)* | 使用者下達執行指定 Phase 指令 | **嚴禁跨 Phase 自動執行**、單 Bug 重試 > 2 次、**嚴禁重複盲讀原始長檔** | **[Token 執行防衛 & 零探索直接開工]**：新 Session 啟動強制優先查閱 Gate 1 持久化快取檔 (`tmp_probe_*.md`)，禁止重新掃描；若快取遺失或不存在，優先依賴任務步驟已錨定之行號區間細讀 (80~150 行語意單元)，若需重新探勘強制以 `code_skeleton`/`repo_radar` 原生落盤，嚴禁 `view_file` 原始長檔；單輪完成該 Phase 原子任務；大量輸出/除錯強制串接 `2>&1 \| py tools/compact_log.py` 脫水；增量比對調用 `py tools/diff_inspector.py`；Exit 0 驗證通過，**實體打勾並動態收斂後強制停步交權，輸出開立新 Session 接力代碼塊**。 |
| **Gate 3: 知識收斂與圖譜防護**<br>*(Final Acceptance)* | 所有 Phase 開發完成且單元驗證通過 | **嚴禁遺留架構漂移**、嚴禁跳過驗證標記完成 | **[Token 快取閉環]**：<br>1. 執行 `py scratch/manage.py audit-ssot [--compact]` 確保 Exit 0<br>2. 若有新增組件、函式或正式文章，強制執行 `py tools/generate_symbol_index.py` 更新快取<br>3. 落實四層 SSOT 閉環（10% 純骨架，90% 豁免），最後一個工具呼叫強制更新實體 task 打勾結案，更新完即刻停步。 |

## 3. 執行協議與中斷點 (Execution & Halt Protocol)
1. **原子化執行**：每次工具呼叫僅限處理一個原子任務，避免大區塊覆寫造成內容截斷。
2. **單一 Phase 物理中斷 (Hard Stop - One Phase, One Session)**：
   - **完成即停**：完成當前 Phase 後，**必須先更新實體任務檔打勾與歷程簽到**，然後**立即停止呼叫工具，強制交出控制權**。
   - **嚴禁同會話連續推進**：嚴格落實「One Phase, One Session」物理隔絕，嚴禁 Agent 在同會話自動或手動推進下一個 Phase，亦不得引導在原對話直接回覆。
   - **強制產出新會話接力代碼塊 (Mandatory Handover Block)**：停步交回控制權時，**最後必須強制產出供使用者直接複製貼上以推進下一階段之接力提示詞代碼塊**，由使用者開立新 Session 繼續執行。
3. **客觀 Exit 0 連續驗證**：驗收必須以具體指令回傳 Exit code 0 為準，拒絕主觀模糊判定。
4. **狀態動態收斂 (Dynamic Condensation)**：Phase 執行期間嚴禁在原子步驟間頻繁打勾橫跳；統一於 Phase 結尾 Checkpoint 階段進行單次批次打勾與狀態收斂，將該階段標記為 `[已完成]`，刪除已完成的原子任務條目，並在 `## 7. 狀態收斂歷程` 追加單行記錄：`- [YYYY-MM-DD] [Phase X] 摘要成果 (Session N)`。
5. **四層 SSOT 閉環義務 (4-Tier SSOT Closed-Loop - 90/10 分級守則)**：
   - **唯一規格真理源**：完整定義請參閱 `doc/core/meta-skills-guide.md` (Section 2)。
   - **核心底線 (90/10 分級)**：
     - **90% 輕量任務（全面豁免）**：樣式調整、文字排版、新聞發布、局部除錯重構，**L1~L3 全面豁免讀寫**，task 檔直標 `[N/A]`，結案僅需 L4 任務收斂。
     - **10% 重大變更（純骨架回寫）**：僅涉及元件增刪、資料庫 Schema 變動、底層工具鏈重構或 SSOT 規範變動時，結案前依 Target SSOTs 完成純骨架（Index）回寫防腐；新增或修改 `tools/` 內部工具時，其 SSOT 必須包含 `tools/README.md`（同步更新工具矩陣與使用規範）。
6. **強制收尾協議與安全守護 (Mandatory Closure & Safety Guards)**：
   任務標記完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `doc/doc_task/task_*.md`。若回報完成但實體任務未打勾收斂，視為未完成並違反門禁。
   - **防護一：語意錨定局部替換與零錯誤傳參 (Semantic Chunk Replacement ≤ 50-80 行 & No ArtifactMetadata on Workspace)**：更新代碼與實體任務檔時，**嚴格限制使用原生局部替換工具 (`replace_file_content`)，單次替換範圍放寬為語意區塊 (≤ 50-80 行，以唯一前後上下文或完整函式邊界為語意錨點)**，徹底杜絕微片段替換引發的行號漂移與報錯重試。**嚴禁使用 `write_to_file` 進行整檔覆寫或大區塊重寫**，杜絕巨量 Token 輸出及 IDE 底層 Diff 演算法嚴重耗時（逾時阻塞 50+ 秒）引發的使用者端死鎖體感；**對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata` 參數**（該參數僅限 `brain/` 之專屬 Artifact），徹底杜絕無效工具調用報錯（Invalid tool call）導致的 50 秒重試延遲。**嚴禁編寫任何 Python/PowerShell 臨時腳本更新任務檔**（必須使用原生檔案替換工具直接原子更新）。
   - **防護二：建檔即 Git Add 防護 (Instant Git Tracking Guard)**：新建 `doc/doc_task/task_*.md` 必須第一時間執行 `git add <task-file>` 納入暫存區，確保受 Git 版本管理與還原防護，杜絕 untracked 狀態下的覆蓋或意外損毀。
   - **防護三：更新即停步零冗餘與清理前置 (Update & Immediate Halt & Prior Cleanup)**：暫存檔案（如 `scratch/tmp/` 臨時腳本）之清理必須**完全前置**於任務檔更新之前；更新任務檔**必須是本輪對話的最後一個工具呼叫**。更新完成後**嚴禁**再調用 `view_file`、`run_command` 或任何冗餘工具，必須立即停止工具調用並交回控制權。
    - **防護四：驗證正則合併與單次收尾更新 (Regex Batch Verification & Single-Pass Task Update)**：驗收階段嚴禁多輪單詞 Grep 輪巡，必須合併為單次正則表達式；收尾時嚴禁分拆多次替換微調任務檔（打勾、收斂歷程與 frontmatter 狀態必須單次原子替換完成），杜絕重複 Round-trip 造成 Token 與 Context 劇烈膨脹。
    - **防護五：全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix Guard)**：嚴格落實四階段門禁工具調用矩陣。在 `task_*.md` 的 `## 2. 上下文探索與依賴` 必須填寫真實工具調用實證（Gate 1 探勘骨架/大綱、Gate 2 執行脫水、Gate 3 驗收審計與快取），嚴禁無證據虛應打勾。

## 4. 2-Strike 熔斷與突發問題隔離機制 (Circuit Breaker & Incident Offloading)
單一錯誤或驗收失敗**最多僅允許 2 次修復嘗試**。第 2 次失敗嚴禁第 3 次盲試；若遇次生突發問題則提前中斷：
1. **停止猜測與探索**：立即停止盲目嘗試；嚴禁在原對話展開跨模組深層排查或連續發起大檔閱讀，杜絕 Context 泛洪。
2. **乾淨復原**：以 Git 還原工作區至變更前乾淨狀態，杜絕半成品污染。
3. **實體立案回寫**：
   - 若為當前任務阻礙，於實體 `task_*.md` 對應 Phase 標記 `[BLOCKED: 錯誤摘要]`。
   - 若為獨立系統 Bug，執行 `py tools/log_issue.py` 登記至 `issue_tracker_log.md`。
4. **強制停步交權**：停止呼叫工具，輸出診斷報告與新會話接力代碼塊，引導人類開立乾淨 Session 專注處理。

## 5. 多會話接力提示詞代碼塊 (Session Handover Blocks)
Phase 結束停步或遭遇突發問題中斷時，可於回覆末尾附上具自包含設計的接力代碼塊（明訂上階產出、本階目標與檔案錨點，消除新會話冷啟動盲搜）：

```text
# 接續推進下一階段 (標準無損接力模式)
請讀取 doc/doc_task/task_MMDD_NN_Topic.md，接續執行 Phase X：[階段名稱]。
- 【上階產出】：Phase X-1 已完成並收斂狀態（[簡要產出/關鍵修改]）。
- 【本階目標】：[條列 Phase X 核心目標與驗證指標]。
- 【目標檔案與錨點】：[列出目標檔案與預期修改行號/函式區塊]。
- 【門禁約束】：嚴格維持「One Phase, One Session」會話隔離；細讀以 80~150 行語意單元為準，局部替換放寬為 50~80 行語意錨定塊；Phase 結束統一於 Checkpoint 單次批次打勾，更新任務檔後即刻停步交權。
```

```text
# 突發問題隔離修復 (全新乾淨 Session)
請讀取 doc/doc_task/task_MMDD_NN_Topic.md 中的 [BLOCKED] 記錄（或指定 Issue-ID），在全新乾淨上下文下專注調查與修復該突發問題。
```
*(若為常規中斷接力則使用「檢查狀態收斂歷程，繼續執行未完成的 Phase X」)*

## 6. 驗收防呆清單
在每一回合結束前進行自我檢查：
- [ ] 物理任務文件 (`doc/doc_task/task_*.md`) 是否已同步最新進度並打勾？
- [ ] 是否已刪除完成的原子任務條目，並於 `Condensed History` 追加單行記錄？
- [ ] 全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix) 是否已於任務檔實證回填（Gate 1 探勘骨架/大綱、Gate 2 執行日誌脫水、Gate 3 驗收 SSOT 審計與符號快取）？
- [ ] 四層 SSOT 閉環：90% 輕量任務是否已豁免 L1~L3 讀寫標記 `[N/A]`？10% 重大任務是否僅同步純骨架（Index）？新增或修改 tools 內部工具時其 SSOT 是否已包含 `tools/README.md`？
- [ ] 強制收尾：暫存檔清理是否已完全前置？更新任務檔是否由原生工具單次原子替換（嚴禁臨時腳本更新）且為本輪最後一個工具呼叫？
- [ ] 暫存腳本是否均前綴 `tmp_` 並置於 `scratch/tmp/`（根目錄 0 污染，可執行 `py scratch/manage.py clean-scratch --all` 深度淨化過期檔案與子目錄）？
- [ ] 是否已執行 `py scratch/manage.py audit-ssot [--compact]` 確保全站 SSOT 與圖譜零漂移 (Exit 0)？
- [ ] 情報索引閉環：若涉及組件/頁面/符號異動，是否已執行 `py tools/generate_symbol_index.py` 更新全域快取？
- [ ] 程式碼探勘是否遵循硬窄化與語意單元（逾 150 行強制調用 `py tools/repo_radar.py outline` 骨架先行，細讀以 80~150 行完整函式為單元，嚴禁全檔盲讀 `view_file`）？
- [ ] 終端日誌脫水：預期大量輸出的除錯或編譯指令，是否已串接 `2>&1 | py tools/compact_log.py`？
- [ ] 是否遵守 2-Strike 熔斷與突發問題隔離機制（遇次生非預期 Bug 即刻停止探索、回寫 task/issue、還原髒代碼並停步引導開新 Session）？
- [ ] 單一 Phase 結束時，是否已停止呼叫工具、交出控制權，並強制產出開立新 Session 接力提示詞代碼塊（落實 One Phase, One Session，嚴禁同會話繼續）？
- [ ] 任務檔防護：更新實體任務檔是否嚴守 `replace_file_content` 語意錨定局部替換 (≤ 50-80 行)？是否杜絕 `write_to_file` 整檔覆寫與 `ArtifactMetadata` 誤傳？是否杜絕中介腳本？建檔是否已第一時間 `git add`？更新後是否立即停步零冗餘工具調用？
- [ ] 可選驗證指令：`py scratch/manage.py check-task <task_file>`。
