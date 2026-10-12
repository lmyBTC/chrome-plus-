# 歷史任務檔案管理指南 (Task Manager Guide)

本文件說明如何在這個「多插件開發區」中，建立、管理與歸檔日常開發任務檔案，以維持專案目錄的整潔與對話 Token 的最大化節省。

---

## 1. 任務生命週期管理 (The 3-Gate Protocol)

本專案所有的開發與維護工作均透過「三階段守門門禁」與物理任務檔案 (`.md`) 嚴格推進，其生命週期包含以下核心門禁與封存階段：

### 1.1. Gate 0: 概念對齊與方案探詢 (Zero-Tool, Zero-Scan)
- **原則**: 收到新需求時，**嚴禁呼叫任何掃描工具或建立實體檔案**。
- **產出**: AI 僅憑直覺與既有脈絡，輸出 100~200 字的高階架構方案（包含 1~2 種作法與權衡）。
- **中斷點**: 明確提問並交出控制權，等待開發者核准方向。若方向被否決，節省 80% 以上無謂探索 Token。

### 1.2. Gate 1: 物理勘查與建檔 (Grounding & Task Blueprint)
- **前置勘查工具義務 (Tooling-First Grounding)**: 在探勘目標檔案與模組邊界時，**嚴禁直接盲讀原始碼**。凡目標檔案超過 100 行，**必須先調用 `code_skeleton.py` 提取介面骨架**；探索專案拓撲或跨模組符號時，**必須調用 `repo_radar.py`**，杜絕無效上下文膨脹。
- **跨環境相對路徑**: 任務文件與所有參考連結一律使用專案相對路徑（如 `0.doc_mg/...` 或 `[plugin]/...`），嚴禁寫入本機絕對路徑。
- **建檔路徑**: 一律存放在 `0.doc_mg/tasks/` 目錄下。
- **命名規範**: `task_YYYYMMDD_[plugin]_[topic].md`（範例：`task_20260624_chrome_scrumclock_add_timer.md`）。
- **範本使用**: 必須複製 `0.doc_mg/task_template_v2.md` 作為基準，並填入目標、Phase 拆解、驗收標準與 AI 簽到（同時**徹底刪除範本中所有 `<!-- ... -->` 註解說明**）。
- **Target Devtools 前置宣告**: 在 `task.md` 第二節「策略與鎖定檔案」中，除鎖定檔案外，**必須前置鎖定宣告工具鏈清單 (Target Devtools)**（探勘工具、終端脫水工具、結案自動審計工具），並將工具鏈具體排入 Phase 拆解之執行步驟中。
- **Target SSOTs 前置宣告**: 凡涉及元件、模型或架構變動，必須在建檔時前置列出 L1~L4 回寫清單（L1 專家技能、L2 模組導航、L3 領域規格、L4 任務封存），禁止僅列代碼檔案。
- **中斷點**: 輸出 `task.md` 綱要後**強制停步**，**嚴禁在此時修改原始碼**，等待開發者下達「開始執行」或「approved」指令。

### 1.3. Gate 2: 分段原子執行與狀態收斂 (Atomic Execution & Condensation)
- **原子執行**: 每次僅執行一個原子任務，單一回合嚴禁跨越多個 Phase。
- **物理同步**: 每完成一個原子任務，AI **必須立即**在實體任務檔案中打勾 `[x]`。
- **終端脫水防禦**: 執行建置、編譯、打包或測試時，強制串接 `compact_log.py` 或 `rtk`，嚴禁未過濾長篇 log 污染對話歷史。
- **四層 SSOT 閉環**: 若任務涉及模組新增、修改或架構變動，結案前必須依 Target SSOTs 宣告逐層完成物理回寫（L1 專家技能、L2 模組導航、L3 領域規格、L4 任務封存），並執行 `audit_manifests.py` / `doc_cross_ref.py` 完成自動化驗證。
- **狀態收斂 (Dynamic Condensation)**: 當某個 Phase 裡的所有原子任務皆完成，進入下一 Phase 前，AI **必須刪除該 Phase 內已完成的細節**，僅保留：
  ```markdown
  ### Phase X: [階段名稱] 狀態：`[已完成]`
  ```
  避免冗長歷史步驟塞滿對話 context。

### 1.4. 封存 (Archiving Protocol)

當任務達到結案條件時，應依循標準封存程序將任務檔案自現行目錄移至歸檔目錄，以維持 `0.doc_mg/tasks/` 僅保留進行中任務。

#### 1. 結案檢核條件 (Pre-Archive Checklist)
在執行歸檔前，任務檔案必須滿足以下條件：
- [x] 所有 Phase 之原子任務均已完成打勾 `[x]`，並完成動態狀態收斂。
- [x] 驗收標準中所有項目均已檢驗並打勾 `[x]`。
- [x] 完成四層 SSOT 閉環回寫：
  - [x] L1 專家技能：`.agents/skills/[plugin]-core/SKILL.md` (元件字典、模型與隔離)
  - [x] L2 模組導航：`[PLUGIN]/[PLUGIN]_README.md` (模組速查、架構與進入點)
  - [x] L3 領域規格：`[PLUGIN]/docs/[feature]-spec.md` (若涉及業務規格已同步回寫)
  - [x] L4 封存治理：`0.doc_mg/tasks/archive/[plugin]/` (檔案依規範完成移動封存)
- [x] AI 簽到區已記錄參與之對話 ID，並確認狀態為結案。
- [x] 檔案頂部 Frontmatter 之 `status` 欄位已更新為 `"已完成"`。

#### 2. 標準歸檔目錄結構 (Archive Directories)
所有已結案任務檔案依所屬插件或性質，必須移動至對應的子目錄中，嚴禁散落於 `archive/` 根目錄：
- **ScrumClock 插件**：`0.doc_mg/tasks/archive/chrome_scrumclock/`
- **VideoSpeed 插件**：`0.doc_mg/tasks/archive/chrome_video speed plus/`
- **研報採集器插件**：`0.doc_mg/tasks/archive/finance-research-clipper-oss/`
- **活動監控插件**：`0.doc_mg/tasks/archive/browser-activity-monitor/`
- **全域與跨插件架構**：`0.doc_mg/tasks/archive/global/`

#### 3. 封存作業原則
- **無破壞性安全遷移**：一律採用移動（Move）方式歸位，嚴格遵守「嚴禁刪除任何檔案」的準則。
- **維持原始內容**：封存過程不得竄改檔案內容、變更時間標記或遺失歷史驗收記錄。
- **純字串相對路徑**：文檔內部連結與路徑參照一律維持專案純字串相對路徑規範。

---

## 2. 任務生命週期與 Devtools 映射矩陣 (Task Lifecycle & Devtools Mapping)

為落實 Token 節省工程與自動化合規審計，任務生命週期各階段強制映射以下開發者工具鏈：

| 生命週期階段 | 核心規範與門禁 | 強制調用工具 | 替代/輔助指令 | 預期防護與效益 |
|:---|:---|:---|:---|:---|
| **Gate 0: 概念對齊** | 嚴禁調用任何掃描工具或建立實體文件 | *(無工具調用)* | *(無)* | 節省 80%+ 無效探索 Token |
| **Gate 1: 專案情報檢索** | 探勘拓撲、檔案關聯或跨模組符號 | `python 1.devtools/tools/repo_radar.py map`<br/>`python 1.devtools/tools/repo_radar.py symbol <Name>` | `npm run skeleton` | 節省 80%~90% 結構掃描 Token |
| **Gate 1: 模組介面探勘** | 目標檔案 > 100 行時，嚴禁直接盲讀原始碼 | `py 1.devtools/tools/code_skeleton.py <目標檔案>` | `npm run skeleton -- <檔案>`<br/>`node 1.devtools/tools/run_py.js ...` | 掏空實作提煉簽名，節省 85%~95% 源碼 Token |
| **Gate 1: 藍圖建檔** | 宣告 Target Devtools 與 Target SSOTs | `view_file` 讀取 `0.doc_mg/task_template_v2.md` | *(複製並刪除範本註解)* | 確保任務結構一致並前置鎖定工具鏈 |
| **Gate 2: 終端脫水防禦** | 執行建置、打包、型別檢查或測試 | `npm run build 2>&1 \| python 1.devtools/tools/compact_log.py` | `rtk npm test`<br/>`rtk npm run build` | 過濾冗長堆疊雜訊，節省 70%~95% 終端 log Token |
| **Gate 2: 程式碼修改** | 超過 100 行之代碼或文檔局部替換 | `replace_file_content`<br/>`multi_replace_file_content` | *(禁止使用 write_to_file 全檔覆寫)* | 避免全量覆寫帶來的重覆上下文膨脹 |
| **結案驗收: Manifest 審計** | 涉及 Chrome 插件清單與安全設定 | `python 1.devtools/tools/audit_manifests.py` | `npm run audit:manifests` | MV3 與安全合規零遺漏 |
| **結案驗收: 文檔與契約驗證** | 跨插件契約或文檔交叉引用一致性 | `python 1.devtools/tools/doc_cross_ref.py`<br/>`python 1.devtools/tools/validate_contract.py` | *(手動檢查前必跑)* | 自動檢出死鏈與 JSON Schema 破壞 |

---

## 3. 工具與自動化展望

專案目前以嚴格的規範與手動封存為主。未來可視需求在 `1.devtools/tools/` 目錄下建立輕量 Python 腳本（例如 `archive_manager.py`），自動識別 `status: "已完成"` 的任務並將其驗證後歸檔至對應插件的封存目錄中。
