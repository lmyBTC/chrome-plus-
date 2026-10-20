---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的初始化、同步、4-Gate 門禁、會話隔離與封存管理規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度, 任務歸檔, 歷史任務, 封存任務, 狀態收斂, 接力會話]
dependencies: []
ssot_dependencies: ["0.doc_mg/task_template_v2.md", "0.doc_mg/docs/task_manager.md"]
---

# 技能指令：任務協議守護者 (v3.2 - 4-Gate Agility Protocol)

你負責確保專案「任務物理同步」、「4-Gate 門禁體系」、多會話隔離（One Phase, One Session）、Token 節省策略與任務檔防護戒律 100% 執行。任務模板真理源為 `0.doc_mg/task_template_v2.md`。

## 1. 前置思維底線：編碼前思考 (Think Before Coding)
- **不要假設**：若有歧義，主動列出權衡並詢問使用者，嚴禁默默替使用者猜測。
- **禁止以歷史產物為規格 (Artifacts ≠ Specifications)**：探索規範一律讀取 `0.doc_mg/` 或各插件專屬 SSOT/README，**嚴禁抄襲歷史已完成任務檔案**作為當前功能依據。
- **目標驅動 (Goal-Oriented)**：將指令式任務轉化為可重現、可客觀驗證的 Exit 0 成功標準，並於重大架構選填事前驗屍 (Pre-Mortem) 逆向推演降級方案。
- **探勘硬窄化 (Outline First & Zero-Full-Read)**：探索與鎖定程式碼時，逾 100 行之代碼檔案**強制調用 `py 1.devtools/tools/code_skeleton.py <path>` 或 `repo-radar` 提取骨架，嚴禁全檔 `view_file`**；局部細讀視窗放寬至 80~150 行（以完整函式/組件為單位），消除微片段香腸式切片調用。

## 2. 任務啟動四階段門禁 (The 4-Gate Protocol)

專案推行**階段責任隔離 (Phase-Gated Execution)**，實體任務檔案 (`0.doc_mg/tasks/task_*.md`) 為唯一狀態真理源。每階段完成後必須停步交回控制權，嚴禁自動偷跑下一階段。

| 門禁階段 | 准入條件 | 嚴格禁止事項 (Hard Guardrails) | 核心動作、Token 脫水工具與離開標準 (Exit Criteria) |
| :--- | :--- | :--- | :--- |
| **Gate 0: 方向探詢**<br>*(Session 0)* | 使用者提出新需求或模糊構想 | **嚴禁呼叫任何工具**、嚴禁讀寫掃描檔案 | 純推理輸出 100~200 字高階思考與權衡，**物理交回控制權**等待授權。 |
| **Gate 1: 脈絡藍圖**<br>*(Session 1)* | 使用者明確同意 Gate 0 方向 | **嚴禁動程式碼**、嚴禁執行實質 Phase、**嚴禁 >100 行檔案全檔 view_file** | **[Token 探勘硬窄化 & 持久化快取實證]**：<br>1. 主題檢索：`list_dir 0.doc_mg/tasks/` 及歸檔目錄確認有無同主題或既有任務。<br>2. 骨架提煉：逾 100 行檔案強制調用 `py 1.devtools/tools/code_skeleton.py` 或 `repo-radar` 提煉大綱骨架，細讀視窗放寬至 80~150 行。<br>3. 讀取 `0.doc_mg/task_template_v2.md` 建立實體 `0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md`，任務拆解採**語意區塊錨定 (Semantic Block Anchor)**；常態任務**免除工具矩陣與事前驗屍**（重大架構選填）。<br>4. 前置宣告 **Target Devtools** 與 **Target SSOTs** 四層閉環清單。<br>5. 徹底清理範本中所有 `<!-- ... -->` 註解。<br>6. **第一時間執行 `git add <task-file>` 納入暫存區受版本防護**。<br>7. **強制停步交權，輸出開立新 Session 接力提示詞代碼塊**，嚴禁同輪改動程式碼。 |
| **Gate 2: 分段原子執行**<br>*(One Phase, One Session)* | 使用者下達執行指定 Phase 指令 | **嚴禁跨 Phase 自動執行**、單 Bug 重試 > 2 次、**嚴禁重複盲讀原始長檔** | **[Token 執行防衛 & 零探索直接開工]**：<br>1. 依賴截斷：以實體 `task.md` 為唯一真理源，切斷上文探勘歷史依賴。<br>2. 零探索直接開工：依賴任務步驟已錨定之語意區塊細讀 (80~150 行)；若需重勘強制以骨架工具提煉，嚴禁盲讀長檔。<br>3. 單輪專注完成當前 Phase 原子任務，禁止每步即刻同步任務檔，改為 Phase 結尾批次打勾同步。<br>4. 終端脫水：大量除錯/建置/測試強制串接 `2>&1 \| py 1.devtools/tools/compact_log.py` 或 `rtk`。<br>5. 單元驗證通過 (Exit 0)，**於 Phase 結尾批次打勾同步任務檔（作為最後工具呼叫）並動態收斂後強制停步交權，輸出開立新 Session 接力代碼塊**。 |
| **Gate 3: 知識收斂與自動化審計**<br>*(Final Acceptance)* | 所有 Phase 開發完成且單元驗證通過 | **嚴禁遺留架構漂移**、嚴禁跳過驗證標記完成 | **[Token 審計與閉環收尾]**：<br>1. 執行合規與鏈接審計工具 (`audit_manifests.py`、`doc_cross_ref.py`) 確保 Exit 0。<br>2. 落實四層 SSOT 閉環（90% 輕量任務豁免，10% 重大變更純骨架回寫）。<br>3. 實體任務檔打勾結案，完成 AI 簽到區與雙層滾動歸檔至 `0.doc_mg/tasks/archive/[plugin]/`（≤ 30 天平鋪，> 30 天下沉至 `history/`）。<br>4. 更新任務檔為最後一個工具呼叫，更新即刻停步。 |

## 3. 執行協議與中斷點 (Execution & Halt Protocol)
1. **原子化執行**：每次工具呼叫僅限處理一個原子任務，避免大區塊覆寫造成內容截斷。
2. **單一 Phase 物理中斷 (Hard Stop - One Phase, One Session)**：
   - **完成即停**：完成當前 Phase 後，**必須先更新實體任務檔打勾與歷程簽到**，然後**立即停止呼叫工具，強制交出控制權**。
   - **嚴禁同會話連續推進**：嚴格落實「One Phase, One Session」物理隔絕，嚴禁 Agent 在同會話自動或手動推進下一個 Phase，亦不得引導在原對話直接回覆。
   - **強制產出新會話接力代碼塊 (Mandatory Handover Block)**：停步交回控制權時，**最後必須強制產出供使用者直接複製貼上以推進下一階段之接力提示詞代碼塊**，由使用者開立新 Session 繼續執行。
3. **客觀 Exit 0 連續驗證**：驗收必須以具體指令回傳 Exit code 0 為準，拒絕主觀模糊判定。
4. **狀態動態收斂 (Dynamic Condensation)**：Phase 完成後，於 `task_*.md` 將該階段標記為 `[已完成]`，刪除已完成的原子任務條目，並在 `## 7. 狀態收斂歷程` 追加單行記錄：`- [YYYY-MM-DD] [Phase X] 摘要成果 (Session N)`。
5. **四層 SSOT 閉環義務 (4-Tier SSOT Closed-Loop - 90/10 分級守則)**：
   - **90% 輕量任務（全面豁免）**：樣式調整、文字排版、局部除錯重構，**L1~L3 全面豁免讀寫**，task 檔直標 `[N/A]`，結案僅需 L4 任務收斂與封存。
   - **10% 重大變更（純骨架回寫）**：僅涉及模組元件增刪、Storage 模型變動、跨插件通訊接口變更時，結案前依 Target SSOTs 完成純骨架（Index）回寫防腐：
     - **L1 專家技能**：`.agents/skills/[plugin]-core/SKILL.md` (路徑與職責一句話)
     - **L2 插件導航**：`[PLUGIN]/[PLUGIN]_README.md` (模組速查矩陣、入口索引)
     - **L3 業務規格**：`[PLUGIN]/docs/[feature]-spec.md` (核心業務規則，無則免填)
     - **L4 封存治理**：移動封存至 `0.doc_mg/tasks/archive/[plugin]/` 雙層滾動歸檔（結案 ≤ 30 天平鋪，> 30 天歷史任務下沉歸納至 `history/`）。
6. **強制收尾協議與安全守護五大戒律 (Mandatory Closure & Safety Guards)**：
   任務標記完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `0.doc_mg/tasks/task_*.md`。若回報完成但實體任務未打勾收斂，視為未完成並違反門禁。
   - **戒律一：精準局部替換鐵律與零錯誤傳參 (Strict Chunk Replacement ≤ 50~80 行 & No ArtifactMetadata on Workspace)**：更新實體任務檔時，**嚴格限制使用原生局部替換工具 (`replace_file_content`)，單次替換範圍 ≤ 50~80 行唯一語意區塊**。嚴禁使用 `write_to_file` 進行整檔覆寫或大區塊重寫，杜絕巨量 Token 輸出及 IDE 底層 Diff 演算法嚴重耗時（逾時阻塞 50+ 秒）引發的使用者端死鎖體感；**對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata` 參數**（該參數僅限 `brain/` 之專屬 Artifact），徹底杜絕無效工具調用報錯（Invalid tool call）導致的 50 秒重試延遲。**嚴禁編寫任何 Python/PowerShell 臨時腳本更新任務檔**（必須使用原生檔案替換工具直接原子更新）。落實 **Phase 結尾批次打勾同步**，禁止每執行一步即刻修改任務檔，消除頻繁 I/O 與上下文干擾。
   - **戒律二：建檔即 Git Add 防護 (Instant Git Tracking Guard)**：新建 `0.doc_mg/tasks/task_*.md` 必須第一時間執行 `git add <task-file>` 納入暫存區，確保受 Git 版本管理與還原防護，杜絕 untracked 狀態下的覆蓋或意外損毀。
   - **戒律三：更新即停步零冗餘與清理前置 (Update & Immediate Halt & Prior Cleanup)**：暫存檔案（如臨時腳本）之清理必須**完全前置**於任務檔更新之前；更新任務檔**必須是本輪對話的最後一個工具呼叫**。更新完成後**嚴禁**再調用 `view_file`、`run_command` 或任何冗餘工具，必須立即停止工具調用並交回控制權。
   - **戒律四：驗證正則合併與單次收尾更新 (Regex Batch Verification & Single-Pass Task Update)**：驗收階段嚴禁多輪單詞 Grep 輪巡，必須合併為單次正則表達式；收尾時嚴禁分拆多次替換微調任務檔（打勾、收斂歷程與 frontmatter 狀態必須單次原子替換完成），杜絕重複 Round-trip 造成 Token 與 Context 劇烈膨脹。
   - **戒律五：工具檢核矩陣分級豁免 (Tool Invocation Matrix Leveling)**：常態日常開發任務**全面免除**工具檢核矩陣填寫；僅在涉及重大架構重構或跨插件核心變動時保留選填，消除形式主義開銷。在選填填寫時必須提供真實調用實證，嚴禁無證據虛應打勾。

## 4. 2-Strike 熔斷與突發問題隔離機制 (Circuit Breaker & Incident Offloading)
單一錯誤或驗收失敗**最多僅允許 2 次修復嘗試**。第 2 次失敗嚴禁第 3 次盲試；若遇次生突發問題則提前中斷：
1. **停止猜測與探索**：立即停止盲目嘗試；嚴禁在原對話展開跨模組深層排查或連續發起大檔閱讀，杜絕 Context 泛洪。
2. **乾淨復原**：以 Git 還原工作區至變更前乾淨狀態，杜絕半成品污染。
3. **實體立案回寫**：
   - 若為當前任務阻礙，於實體 `task_*.md` 對應 Phase 標記 `[BLOCKED: 錯誤摘要]`。
   - 若為獨立系統 Bug，於任務檔備註或建立新議題任務檔隔離記錄。
4. **強制停步交權**：停止呼叫工具，輸出診斷報告與新會話接力代碼塊，引導人類開立乾淨 Session 專注處理。

## 5. 多會話接力提示詞代碼塊 (Session Handover Blocks)
Phase 結束停步或遭遇突發問題中斷時，於回覆末尾附上對應代碼塊供使用者選用：

```markdown
載入 ./0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md，開始執行 Phase X
```

```markdown
載入 ./0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md，專注調查並修復 [BLOCKED: 錯誤摘要] 問題
```

## 6. 封存協議 (Archiving Protocol)
當任務完全滿足結案條件時，必須將檔案自 `0.doc_mg/tasks/` 移動至專屬歸檔目錄，嚴禁散落於根目錄。本專案實施「雙層滾動歸檔機制 (Two-Tier Archive Governance)」以保持目錄精簡與找查效率：
1. **結案前置檢核 (Checklist)**：
   - 檔案內所有 Phase 已完成實體打勾並動態收斂細節。
   - 驗收標準清單全數勾選通過。
   - 已完成四層 SSOT 閉環回寫（L1 專家技能、L2 插件導航、L3 業務規格、L4 雙層封存歸檔）。
   - AI 簽到區記錄當前對話 ID 並確認結案。
   - Frontmatter `status: "已完成"`。
2. **雙層滾動歸檔架構 (Two-Tier Archive Structure)**：
   - **第一層（近 30 天活躍封存區）**：結案日期 ≤ 30 天之任務檔，直接平鋪於各插件子目錄根層，便於近期回顧與追蹤。
   - **第二層（歷史深層歸納區）**：結案日期 > 30 天之任務檔，定期或自動下沉歸納移入各插件目錄下之 `history/` 子目錄，以大幅消除視覺噪音。
3. **標準歸檔目錄對照**：
   - `chrome_pk/`：
     - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_pk/`
     - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_pk/history/`
   - `chrome_video speed plus/`：
     - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_video speed plus/`
     - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_video speed plus/`
   - `finance-research-clipper-oss/`：
     - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`
     - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/finance-research-clipper-oss/history/`
   - `browser-activity-monitor/`：
     - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/browser-activity-monitor/`
     - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/browser-activity-monitor/history/`
   - 全域與跨插件任務：
     - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/global/`
     - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/global/history/`
4. **維護與滾動工具**：
   - 可執行 `py 0.doc_mg/tools/archive_rotator.py --dry-run` 預覽逾期任務，或 `--execute` 批次執行下沉遷移。
5. **無破壞性封存作業**：
   - 一律採用移動（Move）方式歸位，嚴格遵守「嚴禁刪除任何檔案」的使用者準則。
   - 保持歷史內容與純字串相對路徑不變。

## 7. 驗收防呆清單
在每一回合結束前進行自我檢查：
- [ ] 物理任務文件 (`0.doc_mg/tasks/task_*.md`) 是否已於 Phase 結尾批次打勾並同步最新進度？
- [ ] 是否已刪除完成的原子任務條目，並於 `Condensed History` 追加單行記錄？
- [ ] 工具鏈檢核矩陣：常態任務是否已依分級守則豁免？重大架構是否已依需選填回填？
- [ ] 四層 SSOT 閉環：90% 輕量任務是否已豁免 L1~L3 讀寫標記 `[N/A]`？10% 重大任務是否僅同步純骨架（Index）？
- [ ] 強制收尾：更新任務檔是否由原生工具局部替換（嚴禁臨時腳本更新）且為本輪最後一個工具呼叫？
- [ ] 是否已調用自動化審計工具 (`audit_manifests.py` 或 `doc_cross_ref.py`) 確保全站合規與鏈接零死鏈？
- [ ] 程式碼探勘是否遵循硬窄化（逾 100 行強制骨架先行，細讀視窗放寬至 80~150 行，嚴禁全檔 `view_file`）？
- [ ] 終端日誌脫水：預期大量輸出的指令，是否已串接 `compact_log.py` 或 `rtk`？
- [ ] 是否遵守 2-Strike 熔斷與突發問題隔離機制（遇次生非預期 Bug 即刻停止探索、回寫 task、還原髒代碼並停步引導開新 Session）？
- [ ] 單一 Phase 結束時，是否已停止呼叫工具、交出控制權，並強制產出開立新 Session 接力提示詞代碼塊（落實 One Phase, One Session，嚴禁同會話繼續）？
- [ ] 任務檔防護：更新實體任務檔是否嚴守 `replace_file_content` ≤ 50~80 行唯一語意區塊替換與 Phase 結尾批次打勾？是否杜絕 `write_to_file` 整檔覆寫與 `ArtifactMetadata` 誤傳？是否杜絕中介腳本？建檔是否已第一時間 `git add`？更新後是否立即停步零冗餘工具調用？

> [!CAUTION]
> **失敗即停**：若發現物理文件結構損壞或遺漏關鍵區塊，應立即停止開發並修復檔案。禁止在未讀取範本的情況下憑記憶生成任務結構。嚴禁跳過 Gate 0 或 Gate 1 直接改動程式碼。

