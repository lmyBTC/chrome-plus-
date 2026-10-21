# 歷史任務與草稿檔案管理指南 (Task & Draft Manager Guide)

本文件說明如何在這個「多插件開發區」中，建立、管理、維護日常開發任務檔案與關聯草稿，並透過收納工具歸檔歷史檔案，以維持專案目錄的極致整潔與上下文 Token 的最大化節省。

---

## 1. 任務與草稿生命週期管理 (The 4-Gate Protocol)

本專案所有的開發與維護工作均透過「四階段守門門禁」與物理任務檔案 (`.md`) 嚴格推進，其生命週期包含以下核心門禁與封存階段：

### 1.1. 4-Gate 門禁總覽矩陣 (The 4-Gate Protocol Matrix)

| 門禁階段 | 准入條件 | 嚴格禁止事項 (Hard Guardrails) | 核心動作、Token 脫水工具與離開標準 (Exit Criteria) |
| :--- | :--- | :--- | :--- |
| **Gate 0: 方向探詢**<br>*(Session 0)* | 使用者提出新需求或模糊構想 | **嚴禁呼叫任何工具**、嚴禁讀寫掃描檔案 | 純推理輸出 100~200 字高階思考與權衡，**物理交回控制權**等待授權。 |
| **Gate 1: 脈絡藍圖**<br>*(Session 1)* | 使用者明確同意 Gate 0 方向 | **嚴禁動程式碼**、嚴禁執行實質 Phase、**嚴禁 >100 行檔案全檔 view_file** | **[Token 探勘硬窄化 & 持久化快取實證]**：<br>1. 主題檢索：`list_dir 0.doc_mg/tasks/` 及歸檔目錄確認有無同主題或既有任務。<br>2. 骨架提煉：逾 100 行檔案強制調用 `py 1.devtools/tools/code_skeleton.py` 或 `repo-radar` 提煉大綱骨架，細讀視窗放寬至 80~150 行。<br>3. 讀取 `0.doc_mg/task_template_v2.md` 建立實體 `0.doc_mg/tasks/task_MMDD_01_[plugin]_[topic].md`，任務拆解採**語意區塊錨定**；常態任務免除工具矩陣與事前驗屍。<br>4. 前置宣告 **Target Devtools** 與 **Target SSOTs** 四層閉環清單。<br>5. 徹底清理範本中所有 `<!-- ... -->` 註解。<br>6. **第一時間執行 `git add <task-file>` 納入暫存區受版本防護**。<br>7. **強制停步交權，輸出開立新 Session 接力提示詞代碼塊**，嚴禁同輪改動程式碼。 |
| **Gate 2: 分段原子執行**<br>*(One Phase, One Session)* | 使用者下達執行指定 Phase 指令 | **嚴禁跨 Phase 自動執行**、單 Bug 重試 > 2 次、**嚴禁重複盲讀原始長檔** | **[Token 執行防衛 & 零探索直接開工]**：<br>1. 依賴截斷：以實體 `task.md` 為唯一真理源，切斷上文探勘歷史依賴。<br>2. 零探索直接開工：依賴任務步驟已錨定之語意區塊細讀 (80~150 行)；若需重勘強制以骨架工具提煉，嚴禁盲讀長檔。<br>3. 單輪專注完成當前 Phase 原子任務，禁止每步即刻同步任務檔，改為 Phase 結尾批次打勾同步。<br>4. 終端脫水：大量除錯/建置/測試強制串接 `2>&1 \| py 1.devtools/tools/compact_log.py` 或 `rtk`。<br>5. 單元驗證通過 (Exit 0)，**於 Phase 結尾批次打勾同步任務檔（作為最後工具呼叫）並動態收斂後強制停步交權，輸出開立新 Session 接力代碼塊**。 |
| **Gate 3: 知識收斂與自動化審計**<br>*(Final Acceptance)* | 所有 Phase 開發完成且單元驗證通過 | **嚴禁遺留架構漂移**、嚴禁跳過驗證標記完成 | **[Token 審計與閉環收尾]**：<br>1. 執行合規與鏈接審計工具 (`audit_manifests.py`、`doc_cross_ref.py`) 確保 Exit 0。<br>2. 落實四層 SSOT 閉環（90% 輕量任務豁免，10% 重大變更純骨架回寫）。<br>3. 實體任務檔打勾結案並移入 `0.doc_mg/tasks/archive/` 根目錄（常態保留最新 10 份，溢出自動分流）。<br>4. 更新任務檔為最後一個工具呼叫，更新即刻停步。 |

### 1.2. 各階段實施細則

#### Gate 0: 概念對齊與方案探詢 (Zero-Tool, Zero-Scan)
- **原則**: 收到新需求時，**嚴禁呼叫任何掃描工具或建立實體檔案**。
- **產出**: AI 僅憑既有高階脈絡，輸出 100~200 字的高階架構方案（包含 1~2 種作法與權衡）。
- **中斷點**: 明確提問並交出控制權，等待開發者核准方向。若方向被否決，節省 80% 以上無謂探索 Token。

#### Gate 1: 物理勘查與藍圖建檔 (Grounding & Task Blueprint)
- **前置勘查工具義務 (Tooling-First Grounding)**: 在探勘目標檔案與模組邊界時，**嚴禁直接盲讀原始碼**。凡目標檔案超過 100 行，**必須先調用 `code_skeleton.py` 提取介面骨架**；探索專案拓撲或跨模組符號時，**必須調用 `repo_radar.py`**，杜絕無效上下文膨脹。
- **探勘持久化快取 (Probe Cache)**: 凡 Gate 1 探勘期間取得之核心關鍵資訊（如目標檔案精確行號、核心函式簽名、資料結構常數、跨插件通訊合約等），**必須以條列方式完整回寫至任務檔第二節「Gate 1 探勘持久化快取 (Probe Cache)」**。此快取為後續執行之唯一真理源，嚴禁後續會話重新全檔探勘。
- **語意區塊錨定 (Semantic Block Anchor)**: 探勘獲取之目標檔案函式、組件或介面區塊，以完整語意為單位錨定（細讀視窗放寬至 80~150 行），避免行號漂移與香腸式切片調用。
- **建檔路徑與命名**: 一律存放在 `0.doc_mg/tasks/` 目錄下，格式為 `task_MMDD_01_[plugin]_[topic].md`（短日期 MMDD 加上當日兩位數流水號如 `_01_`，亦相容歷史 `task_YYYYMMDD_` 格式；可由 `py 1.devtools/tools/task_cli.py init` 自動計算產生）。
- **乾淨範本初始化 (Clean Template)**: 必須複製 `0.doc_mg/task_template_v2.md` 作為基準，常態任務免除工具矩陣與事前驗屍，並填入目標、Phase 拆解、驗收標準與 AI 簽到；同時**徹底刪除範本中所有 `<!-- ... -->` 註解說明**，防止無效 Context 膨脹。
- **Target Devtools 前置宣告**: 在任務檔第二節「策略與鎖定檔案」中，除鎖定檔案外，**必須前置鎖定宣告工具鏈清單 (Target Devtools)**（探勘工具、終端脫水工具、結案自動審計工具），並將工具鏈具體排入 Phase 拆解之執行步驟中。
- **Target SSOTs 前置宣告**: 凡涉及元件、模型或架構變動，必須在建檔時前置列出 L1~L4 回寫清單（L1 專家技能、L2 模組導航、L3 領域規格、L4 任務封存），禁止僅列代碼檔案。
- **中斷點**: 輸出 `task.md` 綱要後**強制停步**，**嚴禁在此時修改原始碼**，等待開發者下達「開始執行」或核准指令。

#### 1.3. Gate 2: 分段原子執行與狀態收斂 (Atomic Execution & Dynamic Condensation)
- **階段性會話重置協議 (One Phase, One Session Protocol)**:
  * 為防止長任務執行中 Context 累積導致注意力稀釋 (Lost in the middle) 與 Token 成本複利膨脹，專案嚴格落實「**One Phase, One Session**」物理隔絕。
  * 單一會話僅專注於一個 Phase 的原子目標與驗收。
  * 當完成當前 Phase 驗收 (Exit 0) 後，立即更新實體任務檔狀態為 `[已完成]`，並在收斂歷程追加單行記錄。
  * **強制停步交權**：完成 Checkpoint 後，AI 必須強制停止一切後續工具調用，嚴禁在同一會話自動推進下一階段；回覆末尾強制輸出開立新 Session 的接力代碼塊。
- **Phase 結尾批次打勾同步**: 禁止每執行一步即刻修改任務檔，改為在 Phase 單元驗證通過後於 Checkpoint 收尾時批次打勾同步任務檔（≤ 50~80 行局部替換唯一語意區塊），消除頻繁 I/O 往返與干擾。
- **狀態收斂 (Dynamic Condensation)**: 當某個 Phase 裡的所有原子任務皆完成，進入下一 Phase 前，AI **必須刪除該 Phase 內已完成的細節**，僅保留狀態為 `[已完成]` 與 Checkpoint 驗證記錄，避免冗長歷史步驟塞滿對話 context。
- **2-Strike 熔斷與突發隔離協議 (Circuit Breaker & Incident Offloading SOP)**:
  * 單一錯誤或阻礙嘗試上限為 **2 次**。若連續 2 次嘗試未果，立即觸發熔斷停步。
  * **標準四步工作流**：
    1. **中斷探索 (Halt)**：立即停止任何發散工具呼叫。
    2. **物理回寫 (Write-Back)**：於 `task_*.md` 當前 Phase 標註 `[BLOCKED: 錯誤簽名]`，說明根本原因。
    3. **乾淨還原 (Rollback)**：使用 `git checkout` 撤銷探索性髒修改，確保工作區維持穩定。
    4. **停步並產出提示詞 (Handover)**：AI 強制結束當前輪次並交回控制權，輸出專用接力代碼塊，引導開立全新 Session 獨立排查。
- **終端脫水防禦**: 執行建置、編譯、打包或測試時，強制串接 `compact_log.py` 或 `rtk`，嚴禁未過濾長篇 log 污染對話歷史。

#### 1.4. Gate 3: 驗收、SSOT 閉環與雙向聯動封存 (Verification, SSOT Closure & Archiving)
- **四層 SSOT 閉環 (90/10 分級守則)**:
  * **90% 輕量任務（全面豁免）**：樣式調整、文字排版、局部除錯重構，L1~L3 全面豁免讀寫，task 檔直標 `[N/A]`，結案僅需 L4 任務收斂與封存。
  * **10% 重大變更（純骨架回寫）**：僅涉及模組元件增刪、Storage 模型變動、跨插件通訊接口變更時，結案前依 Target SSOTs 完成純骨架（Index）回寫防腐（L1 專家技能、L2 插件導航、L3 業務規格、L4 任務保留與封存歸檔）。
- **自動化審計**: 執行 `audit_manifests.py`、`doc_cross_ref.py` 確保合規且零死鏈 (Exit 0)。
- **雙向聯動封存**: 驗收通過且無死鏈後，觸發任務與關聯草稿之雙向聯動封存流程。

### 1.5. 安全守護五大戒律 (Mandatory Safety Guardrails)
任務標記完成或對話結束前，**最後一個工具呼叫必須是更新、打勾或收斂** `0.doc_mg/tasks/task_*.md`。若回報完成但實體任務未打勾收斂，視為未完成並違反門禁。
- **戒律一：精準局部替換鐵律與零錯誤傳參 (Strict Chunk Replacement ≤ 50~80 行 & No ArtifactMetadata on Workspace)**：
  更新實體任務檔時，**嚴格限制使用原生局部替換工具 (`replace_file_content`)，單次替換範圍 ≤ 50~80 行唯一語意區塊**。嚴禁使用 `write_to_file` 進行整檔覆寫或大區塊重寫，杜絕巨量 Token 輸出及 IDE 底層 Diff 演算法嚴重耗時（逾時阻塞 50+ 秒）引發的使用者端死鎖體感；**對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata` 參數**（該參數僅限 `brain/` 之專屬 Artifact），徹底杜絕無效工具調用報錯（Invalid tool call）導致的 50 秒重試延遲。**嚴禁編寫任何 Python/PowerShell 臨時腳本更新任務檔**（必須使用原生檔案替換工具直接原子更新）。落實 **Phase 結尾批次打勾同步**，禁止每執行一步即刻修改任務檔，消除頻繁 I/O 與上下文干擾。
- **戒律二：建檔即 Git Add 防護 (Instant Git Tracking Guard)**：
  新建 `0.doc_mg/tasks/task_*.md` 必須第一時間執行 `git add <task-file>` 納入暫存區，確保受 Git 版本管理與還原防護，杜絕 untracked 狀態下的覆蓋或意外損毀。
- **戒律三：更新即停步零冗餘與清理前置 (Update & Immediate Halt & Prior Cleanup)**：
  暫存檔案（如臨時腳本）之清理必須**完全前置**於任務檔更新之前；更新任務檔**必須是本輪對話的最後一個工具呼叫**。更新完成後**嚴禁**再調用 `view_file`、`run_command` 或任何冗餘工具，必須立即停止工具調用並交回控制權。
- **戒律四：驗證正則合併與單次收尾更新 (Regex Batch Verification & Single-Pass Task Update)**：
  驗收階段嚴禁多輪單詞 Grep 輪巡，必須合併為單次正則表達式；收尾時嚴禁分拆多次替換微調任務檔（打勾、收斂歷程與 frontmatter 狀態必須單次原子替換完成），杜絕重複 Round-trip 造成 Token 與 Context 劇烈膨脹。
- **戒律五：工具檢核矩陣分級豁免 (Tool Invocation Matrix Leveling)**：
  常態日常開發任務**全面免除**工具檢核矩陣填寫；僅在涉及重大架構重構或跨插件核心變動時保留選填，消除形式主義開銷。在選填填寫時必須提供真實調用實證，嚴禁無證據虛應打勾。

---

## 2. 草稿生命週期與同名隔離先行原則 (Draft Lifecycle & Safe Isolation)

在進行大型重構、複雜演算法規劃或多插件通訊合約設計時，往往伴隨暫存設計草稿與規格中繼檔（存放在 `0.doc_mg/draft/`）：

1. **草稿生命週期命名與同名隔離先行原則 (Draft Lifecycle Naming SSOT)**：
   - **中間規格草稿**：統一存放於 `0.doc_mg/draft/`，檔名清楚表達模組與主題（例如：`0.doc_mg/draft/oauth_flow.md`），且建議具備 Frontmatter 宣告對應的目標插件與功能。
   - **同名隔離先行**：草稿在 `0.doc_mg/draft/` 規劃時，其模組命名與介面定義直接對齊正式落地結構，徹底杜絕手動更名導致的關聯脫鉤。正式落地時僅作實體檔案生成或目錄遷移。
2. **任務與關聯草稿雙向聯動生命週期 (Bi-directional Linkage)**：
   - 在任務檔 `task_*.md` 的 Frontmatter 中，透過 `related_drafts: []` 顯式聲明關聯草稿清單（例如：`related_drafts: ["0.doc_mg/draft/oauth_flow.md"]`）。
   - **「草稿完成即歸檔，Task 保留今日」原則**：當功能與規格實作驗收完畢後，關聯草稿應立即收納歸檔至 `0.doc_mg/draft/archive/`，確保 `0.doc_mg/draft/` 根目錄永久保持極致純淨；當日任務則穩定保留於 `0.doc_mg/tasks/` 根目錄供審閱。
3. **歷史草稿存量分類 (Draft Backfill)**：
   - 歷史草稿依據歸屬插件或時間軸，安全移動至 `0.doc_mg/draft/archive/` 對應子目錄中。

---

## 3. 白名單保護安全邊界 (Whitelist Protection)

無論手動或透過工具執行檔案整理與歸檔，**絕對不可刪除任何檔案**，且必須嚴格遵守以下白名單保護規範：

- **保護核心任務管理檔案**：
  * 嚴格保護 `0.doc_mg/task_template_v2.md`、`0.doc_mg/docs/task_manager.md`、`0.doc_mg/tasks/NOTE.MD` 以及**今日新建或進行中之任務檔**。
- **保護規格草稿與模板檔案**：
  * 嚴格保護所有 `00` 開頭的模板檔（如 `00_template.md`）以及寫作規範、架構手冊與跨插件契約（如 `0.doc_mg/docs/cross_plugin_contract.md`），絕不誤移。
- **未完成任務與草稿保護**：
  * 狀態為「開發中」、「進行中」、「規劃中」或「待辦」的未完成任務檔及其對應草稿，永久保留於工作區，除非明確指定強制處理。

---

## 4. 日期辨識規則與優先級

為了精準追溯每份任務與草稿的建立時間與所屬週期，解析時依序採用以下優先級：

1. **檔名日期**：優先匹配檔名中的 `task_(YYYYMMDD)_*.md` 格式。
2. **內文 Frontmatter / 標記**：若檔名無日期，讀取檔案前 30 行，匹配 `date:\s*["']?(YYYY-MM-DD)["']?` 或 `建立日期:\s*(YYYY-MM-DD)`。
3. **系統檔案日期**：若皆無上述標記，則取用該檔案在作業系統中的建立/修改時間。
4. **Fallback 安全歸檔**：若上述方式皆無法解析，則將該檔案安全歸檔至 `archive/unknown/` 目錄，確保絕不遺失任何歷史資產。

---

## 5. Windows 環境執行相容性規範

> [!TIP]
> **Windows 環境相容性規範 (Windows Py Execution Standard)**：
> 在 Windows 環境下，直接執行 `python` 可能會觸發系統應用程式執行別名（Windows Store 0.0.0.0 樁）導致 Exit 1 或中斷。
> 專案全面規範**一律使用 `py` 前綴調用 Python 直譯器**（例如：`py 1.devtools/tools/task_cli.py ...`、`py 1.devtools/tools/repo_radar.py ...`），確保在各終端環境皆能穩定執行。

---

## 6. 雙層滾動歸檔架構與標準目錄對照 (Two-Tier Retention & Archive Governance)

當任務完成結案時，實體檔案應立即從 `0.doc_mg/tasks/` 移入歸檔緩衝區 `0.doc_mg/tasks/archive/` 根目錄（tasks 根目錄保持純淨零結案滯留）。歸檔目錄實施「雙層滾動歸檔機制」以兼顧近期縱覽脈絡與長期冷儲存治理：

### 6.1. 雙層滾動架構原則
1. **第零層（根層進行中純淨區 - `0.doc_mg/tasks/`）**：
   - 僅存放進行中 (In-Progress) 任務與工作清單，結案後立即移入 `archive/` 根層級，嚴禁滯留已結案任務。
2. **第一層（近期封存緩衝區 - `0.doc_mg/tasks/archive/` 根目錄）**：
   - 所有結案任務統一平鋪存放於 `archive/` 根層級，常態保留最新 10 份已結案任務，便於隨時縱覽近期跨插件工作脈絡。
3. **第二層（冷儲存分類區 - `0.doc_mg/tasks/archive/[plugin]/`）**：
   - 只有當 `archive/` 根目錄任務數超過 10 份時，最舊的溢出任務才依所屬 plugin 分流移入各插件專屬目錄（若各插件子目錄再超過閾值或天數，則下沉至 `history/`），以徹底消除視覺噪音。

### 6.2. 標準歸檔目錄對照表 (各插件活躍區與歷史區)
- **ScrumClock 插件 (`chrome_scrumclock`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_scrumclock/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_scrumclock/history/`
- **PK+ 插件 (`chrome_pk`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_pk/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_pk/history/`
- **VideoSpeed 插件 (`chrome_video speed plus`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_video speed plus/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_video speed plus/history/`
- **研報採集器插件 (`finance-research-clipper-oss`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/finance-research-clipper-oss/history/`
- **活動監控插件 (`browser-activity-monitor`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/browser-activity-monitor/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/browser-activity-monitor/history/`
- **GeminiNano 插件 (`chrome_gemini_nano`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/chrome_gemini_nano/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/chrome_gemini_nano/history/`
- **全域與跨插件任務 (`global`)**：
  - 活躍區 (≤ 30 天)：`0.doc_mg/tasks/archive/global/`
  - 歷史區 (> 30 天)：`0.doc_mg/tasks/archive/global/history/`

### 6.3. 自動化維護與封存作業原則
- **自動化滾動工具**：
  - 執行 `py 0.doc_mg/tools/archive_rotator.py --limit 10 --dry-run` 預覽溢出與逾期任務。
  - 執行 `py 0.doc_mg/tools/archive_rotator.py --limit 10 --execute` 批次執行下沉遷移。
- **無破壞性安全遷移**：一律採用移動（Move）方式歸位，嚴格遵守「嚴禁刪除任何檔案」的底線。
- **維持原始內容**：封存過程不得竄改檔案內容、變更時間標記或遺失歷史驗收記錄。
- **純字串相對路徑**：文檔內部連結與路徑參照一律維持專案純字串相對路徑規範。

---

## 7. 任務生命週期與 Devtools 映射矩陣 (Task Lifecycle & Devtools Matrix)

為落實 Token 節省工程與自動化合規審計，任務生命週期各階段強制映射以下開發者工具鏈：

| 生命週期階段 | 核心規範與門禁 | 強制調用工具 | 替代/輔助指令 | 預期防護與效益 |
|:---|:---|:---|:---|:---|
| **Gate 0: 概念對齊** | 嚴禁調用任何掃描工具或建立實體文件 | *(無工具調用)* | *(無)* | 節省 80%+ 無效探索 Token |
| **Gate 1: 專案情報檢索** | 探勘拓撲、檔案關聯或跨模組符號 | `py 1.devtools/tools/repo_radar.py map`<br/>`py 1.devtools/tools/repo_radar.py symbol <Name>` | `npm run skeleton` | 節省 80%~90% 結構掃描 Token |
| **Gate 1: 模組介面探勘** | 目標檔案 > 100 行時，嚴禁直接盲讀原始碼 | `py 1.devtools/tools/code_skeleton.py <目標檔案>` | `npm run skeleton -- <檔案>`<br/>`node 1.devtools/tools/run_py.js ...` | 掏空實作提煉簽名，節省 85%~95% 源碼 Token |
| **Gate 1: 藍圖建檔** | 宣告 Target Devtools、Target SSOTs 與快取 | `py 1.devtools/tools/task_cli.py init --plugin <plugin> --title "<標題>"` | 手動複製並徹底刪除註解 | 確保任務結構一致並前置鎖定工具鏈與快取 |
| **Gate 2: 終端脫水防禦** | 執行建置、打包、型別檢查或測試 | `<command> 2>&1 \| py 1.devtools/tools/compact_log.py` | `rtk <command>` | 過濾冗長堆疊雜訊，節省 70%~95% 終端 log Token |
| **Gate 2: 程式碼修改** | 超過 100 行之代碼或文檔局部替換 (放寬至 ≤ 50~80 行唯一語意區塊) | `replace_file_content`<br/>`multi_replace_file_content` | *(嚴禁無故使用全檔覆寫)* | 避免全量覆寫帶來的重覆上下文膨脹 |
| **Gate 3: Manifest 審計** | 涉及 Chrome 插件清單與安全設定 | `py 1.devtools/tools/audit_manifests.py` | `npm run audit:manifests` | MV3 與安全合規零遺漏 |
| **Gate 3: 文檔與契約驗證** | 跨插件契約或文檔交叉引用一致性 | `py 1.devtools/tools/doc_cross_ref.py`<br/>`py 1.devtools/tools/validate_contract.py` | *(手動檢查前必跑)* | 自動檢出死鏈與 JSON Schema 破壞 |
| **Gate 3: 任務自動歸檔** | 驗收通過且無死鏈後執行歷史收納 | `py 1.devtools/tools/task_cli.py archive --dry-run`<br/>`py 1.devtools/tools/task_cli.py archive` | 手動安全搬移 | 自動歸類至各插件封存目錄，工作區常保純淨 |

---

## 8. 突發問題分流與多會話隔離協議 (Incident Offloading SOP)

當執行任務過程中發現非當前 Phase 原子目標的次生 Bug、全域依賴衝突或單次嘗試未果之深層問題時，**嚴禁在原對話展開跨模組深挖探索**，避免 Traceback 與大檔閱讀造成 Context 滾雪球膨脹。

### 標準四步工作流：
1. **中斷探索 (Halt)**：立即停止任何探索性工具呼叫。
2. **物理回寫 (Write-Back)**：若為本任務阻礙，於 `task_*.md` 當前 Phase 標註 `[BLOCKED: 錯誤簽名]`，詳細記錄錯誤訊息；若為獨立系統 Bug，記載於草稿或任務問題區。
3. **乾淨還原 (Rollback)**：使用 `git checkout` 撤銷探索性髒修改，確保工作區維持穩定與可編譯狀態。
4. **停步並產出提示詞 (Handover)**：AI 強制結束當前輪次並交回控制權，輸出專用接力代碼塊，引導開立全新的 0 Token 乾淨 Session 獨立解決該問題。
