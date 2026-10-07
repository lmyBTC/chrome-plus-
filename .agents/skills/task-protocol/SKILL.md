---
name: 任務協議管理 (Task Protocol Management)
description: 強制執行 `task_template_v2.md` 的初始化、物理同步、狀態收斂與封存管理規範。
triggers: [建立任務, 開始開發, 任務拆解, 狀態更新, 同步進度, 任務歸檔, 歷史任務, 封存任務, 狀態收斂]
dependencies: []
ssot_dependencies: ["0.doc_mg/task_template_v2.md", "0.doc_mg/docs/task_manager.md"]
---

# 技能指令：任務協議守護者 (v3.0 - 3-Gate Protocol)

你負責確保專案「任務物理同步」、「三階段守門門禁」與 Token 節省策略 100% 執行。

## 1. 任務啟動三階段門禁 (The 3-Gate Bootstrap Protocol)

### Gate 0: 方案探詢與方向確認 (Zero-Tool, Zero-Scan)
當使用者提出新需求、架構變更或功能規劃時，**嚴禁呼叫任何檔案掃描工具（如 glob/grep/list_dir/view_file）或建立實體文件**：
1. **零工具思考**：僅憑現有問題脈絡與常識直覺，輸出 100~200 字的高階架構思考（包含 1~2 種可能作法與權衡取捨）。
2. **尋求方向授權**：明確詢問：「是否同意此方向？確認後我將開始掃描相關模組並產出 task.md。」
3. **強制交出控制權**：**停止呼叫任何工具並直接輸出回覆**，等待使用者明確授權（如「同意」、「可行」或提出調整意見）。

### Gate 1: 脈絡勘查與任務藍圖 (Grounding & Task Blueprint)
獲得使用者對 Gate 0 方向的明確確認後，始得進入深度勘查與建檔：
1. **Step -1: 主題檢索**：呼叫 `list_dir` 檢索 `0.doc_mg/tasks/` 及其 `archive/` 目錄，確認有無同主題或既有任務。
2. **Step 0: 讀取範本/既有文件**：
   - 若無相關主題：呼叫 `view_file` 讀取 `0.doc_mg/task_template_v2.md`。
   - 若有相關主題：讀取該既有任務檔案。
3. **Step 1: 精準唯讀掃描（探勘硬窄化與武器庫鏈條）**：僅針對目標插件或相依檔案進行最小化上下文探索（嚴禁全盤無效掃描或跨插件污染）。**強制武器庫鏈條**：代碼檔案逾 100 行者，嚴禁直接使用 `view_file`，強制優先調用 `python 1.devtools/tools/code_skeleton.py <路徑>` 或 `repo-radar` 提取大綱骨架；僅在取得骨架行號後，始得針對目標函式介面簽名進行局部 `view_file` 採集（單次嚴格限制 ≤ 30 行），實作細節留待 Gate 2；關鍵介面簽名與型別直接沉澱至 `task.md`。
4. **Step 2: 建立/更新實體文件與 SSOT 衝擊評估**：
   - 建立 `0.doc_mg/tasks/task_YYYYMMDD_[plugin]_[topic].md`（`plugin` 填寫插件名稱或 `global`/`agents`）。
   - 填寫目標、鎖定檔案、具體 Phase 與驗收標準。
   - **SSOT 衝擊評估 (Target SSOTs)**：凡涉及元件新增修改、狀態模型或架構變動，必須在「鎖定 SSOT 回寫清單 (Target SSOTs)」前置宣告四層回寫目標（L1 專家技能、L2 插件導航、L3 業務規格、L4 任務生命週期），嚴禁僅列代碼檔案。
   - 在 AI 簽到區勾選並記錄對話 ID。
   - **[強制] 刪除範本中所有帶有說明性質的 `<!-- ... -->` 註解文字。**
5. **強制停步與會話接力輸出 (Blueprint Halt & Handover)**：
   - 輸出 `task.md` 的路徑與綱要，**嚴禁在此步驟直接修改任何原始碼**。
   - **必須輸出「跨會話接力指令（Session Reset Handover）」**：
     - 提示使用者可開啟新對話視窗並輸入接力指令（例如 `載入 ./0.doc_mg/tasks/task_xxx.md，開始執行 Phase 1`）。
     - 此舉能徹底釋放 Gate 1 探勘佔用之龐大 Tool Outputs，杜絕注意力退化（Context Rot）並節省 70%~90% 輸入 Token。
     - 若使用者選擇同會話繼續，亦可回覆「開始執行」或「GO」。
   - 明確等待使用者下達執行授權。

### Gate 2: 分段原子執行 (Atomic Execution)
使用者核准 `task.md` 後，始可進入實體程式碼執行階段：
- **依賴截斷 (Context Pruning)**: Gate 2 嚴格以實體 `task.md` 為唯一真理源（SSOT），切斷對上文探勘歷史之依賴，禁止回顧先前探勘輸出。
- **原子化執行**: 每回合對話/工具呼叫僅限處理一個原子任務，防範品質劣化與幻覺。
- **Phase 嚴格限制**: 嚴禁在單一對話回合中跨越執行多個 Phase。
- **局部讀取與精準寫入**: 對於超過 100 行之原始碼或文檔，嚴禁通讀全檔。必須先以 `grep_search` 或骨架工具精準定位關鍵行號，再使用 `view_file` 指定範圍（`StartLine`/`EndLine`）局部讀取；修改時單點變更使用 `replace_file_content`，若同檔案有多處修改則強制優先調用 `multi_replace_file_content` 一次性完成，避免多輪工具呼叫與冗餘上下文回傳，嚴禁覆寫全檔。
- **物理同步義務**: 每完成一個原子任務或 Phase，必須立即在實體 `task.md` 中打勾 `[x]`。
- **狀態收斂 (Dynamic Condensation)**: 當 Phase 內所有原子任務完成，進入下一 Phase 前，**必須刪除已完成 Phase 的細部原子任務**，僅保留：
  ```markdown
  ### Phase X: [標題] 狀態：`[已完成]`
  ```
- **四層 SSOT 閉環義務 (4-Tier SSOT Closed-Loop - 90/10 分級與瘦身守則)**:
  - **90% 輕量任務（豁免閉環）**：若屬單純樣式、文字、局部除錯重構，**L1~L3 全面豁免，免讀取免回寫**，直接在 `task.md` 勾選 `[N/A]`，結案僅需執行 L4 任務封存，零額外 Token 損耗。
  - **10% 重大變更（精準骨架回寫）**：僅當任務涉及「模組元件新增/刪除、Storage 模型變更、跨插件通訊變更」時，在結案前依 Target SSOTs 完成**純骨架（Index）**回寫：
    - **L1 專家技能**：`.agents/skills/[plugin]-core/SKILL.md` (僅補路徑與職責一句話，嚴禁貼入長篇代碼與易變行數)
    - **L2 插件導航**：`[PLUGIN]/[PLUGIN]_README.md` (更新模組速查矩陣、入口、架構索引)
    - **L3 業務規格**：`[PLUGIN]/docs/[feature]-spec.md` (核心業務規則，無則免填)
    - **L4 封存治理**：移動封存至 `0.doc_mg/tasks/archive/[plugin]/` 歸檔結案。
- **強制收尾**: 在回報任務完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `0.doc_mg/tasks/task_*.md`。

## 2. 封存協議 (Archiving Protocol)
當任務完全滿足結案條件時，必須將檔案自 `0.doc_mg/tasks/` 移動至專屬歸檔目錄，嚴禁散落於根目錄：
1. **結案前置檢核 (Checklist)**：
   - 檔案內所有 Phase 已完成實體打勾並動態收斂細節。
   - 驗收標準清單全數勾選通過。
   - 已完成四層 SSOT 閉環回寫（L1 專家技能、L2 插件導航、L3 業務規格、L4 封存歸檔）。
   - AI 簽到區記錄當前對話 ID 並確認結案。
   - Frontmatter `status: "已完成"`。
2. **標準歸檔目錄對照**：
   - `chrome_scrumclock/`：`0.doc_mg/tasks/archive/chrome_scrumclock/`
   - `chrome_video speed plus/`：`0.doc_mg/tasks/archive/chrome_video speed plus/`
   - `finance-research-clipper-oss/`：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`
   - `browser-activity-monitor/`：`0.doc_mg/tasks/archive/browser-activity-monitor/`
   - 全域與跨插件任務：`0.doc_mg/tasks/archive/global/`
3. **無破壞性封存作業**：
   - 一律採用移動（Move）方式歸位，嚴格遵守「嚴禁刪除任何檔案」的使用者準則。
   - 保持歷史內容與純字串相對路徑不變。

## 3. 驗收防呆
- [ ] **Gate 0 守門**: 是否在未呼叫任何掃描工具前先取得方向授權？
- [ ] **Gate 1 探勘硬窄化與武器庫鏈條**: 逾 100 行檔案是否優先調用 code_skeleton.py 或 repo-radar 提取骨架，且單次讀取 ≤ 30 行介面簽名？
- [ ] **Gate 1 藍圖停步與接力**: 是否建立實體 `task.md`、輸出跨會話接力指令並等待授權？
- [ ] **Gate 1 SSOT 衝擊宣告**: 是否在 `Target SSOTs` 區塊前置宣告 L1~L4 回寫清單？
- [ ] **Gate 2 依賴截斷**: 是否純粹以實體 `task.md` 為 SSOT 執行？
- [ ] **局部讀寫與多點修改規範**: 超過 100 行檔案是否採用 grep/骨架 + 區段 view，單點修改使用 replace，多處修改優先調用 multi_replace？
- [ ] **說明註解清理**: `task.md` 中所有 `<!-- ... -->` 範本提示是否已徹底刪除？
- [ ] **四層 SSOT 閉環**: 若架構或檔案結構有變，L1 專家技能、L2 導航 README、L3 業務規格、L4 封存歸檔是否皆已同步完成？
- [ ] **狀態收斂**: 完成之 Phase 是否已執行細節收斂以最大化節省 Token？
- [ ] **物理同步**: 實體任務檔案是否已同步最新狀態？
- [ ] **封存規範**: 若任務結案，是否已正確歸檔至對應插件/全域子目錄且未散落於根目錄？

> [!CAUTION]
> **失敗即停**：若發現物理文件結構損壞或遺漏關鍵區塊，應立即停止開發並修復檔案。禁止在未讀取範本的情況下憑記憶生成任務結構。嚴禁跳過 Gate 0 或 Gate 1 直接改動程式碼。
