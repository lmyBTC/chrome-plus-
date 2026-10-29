# 歷史任務與草稿檔案管理指南 (Task & Draft Manager Guide)

本文件說明多插件工作區日常開發任務檔案與關聯草稿之生命週期、管理與歸檔規範，兼顧工作區極致純淨與上下文 Token 最大化節省。

---

## 1. 任務與草稿生命週期管理 (The 3-Gate Protocol)

全專案遵循 3-Gate 門禁與實體任務檔 (`.md`) 推進生命週期：

### 1.1. 3-Gate 門禁總覽矩陣 (The 3-Gate Protocol Matrix)

> [!NOTE]
> **更新提示**：專案已停止使用 Gate 0，直接自 Gate 1 勘查藍圖展開。

| 門禁階段 | 准入條件 | 嚴格禁止事項 (Hard Guardrails) | 核心動作、Token 脫水工具與離開標準 (Exit Criteria) |
| :--- | :--- | :--- | :--- |
| **Gate 1: 脈絡藍圖**<br>*(Session 1)* | 收到新任務需求 | 嚴禁動程式碼、嚴禁實質 Phase、嚴禁 >100 行檔案全檔通讀 | **[Token 探勘硬窄化 & 持久化快取]**：<br>1. 檢索任務歷史：`list_dir 0.doc_mg/tasks/` 及 `archive/` 確認既有脈絡。<br>2. 骨架先行：>100 行檔案調用 `code_skeleton.py` 或 `repo_radar.py` 提煉簽名，細讀視窗限 80~150 行。<br>3. 建立實體 `0.doc_mg/tasks/task_MMDD_01_[plugin]_[topic].md`，語意區塊錨定；常態任務免除工具矩陣與事前驗屍。<br>4. 前置宣告 **Target Devtools** 與 **Target SSOTs** 閉環清單。<br>5. 徹底清理範本中 `<!-- ... -->` 註解。<br>6. 執行 `git add <task-file>` 納入版本防護。<br>7. 強制停步交權，輸出開立新 Session 接力提示詞碼塊。 |
| **Gate 2: 分段原子執行**<br>*(One Phase, One Session)* | 使用者下達執行指定 Phase 指令 | 嚴禁跨 Phase 自動執行、單 Bug 重試 > 2 次、嚴禁盲讀長檔 | **[Token 執行防衛 & 零探索直接開工]**：<br>1. 以實體 `task.md` 為唯一真理源，切斷上文探勘歷史依賴。<br>2. 依賴任務步驟已錨定之語意區塊細讀 (80~150 行)。<br>3. 單輪專注完成當前 Phase 原子任務，Phase 結尾批次打勾同步。<br>4. 終端脫水：除錯/建置強制串接 `2>&1 \| py 1.devtools/tools/compact_log.py` 或 `rtk`。<br>5. 單元驗證通過 (Exit 0)，於 Phase 結尾批次打勾同步任務檔並停步交權，輸出新 Session 接力代碼塊。 |
| **Gate 3: 知識收斂與自動化審計**<br>*(Final Acceptance)* | 所有 Phase 開發完成且驗證通過 | 嚴禁遺留架構漂移、嚴禁跳過驗證標記完成 | **[Token 審計與閉環收尾]**：<br>1. 執行審計套件 (`audit_suite.py`、`doc_cross_ref.py`) 確保 Exit 0。<br>2. 四層 SSOT 閉環（90% 輕量任務豁免，10% 重大變更純骨架回寫）。<br>3. 實體任務檔打勾結案，移入 `0.doc_mg/tasks/archive/` 根目錄。<br>4. 更新任務檔為最後一個工具呼叫，更新即刻停步。 |

### 1.2. 各階段實施細則

#### Gate 1: 物理勘查與藍圖建檔 (Grounding & Task Blueprint)
- **前置勘查義務 (Tooling-First Grounding)**: 目標檔案逾 100 行**嚴禁直接盲讀原始碼**，必須調用 `code_skeleton.py` 提取介面骨架；檢索專案拓撲或符號調用 `repo_radar.py`。
- **探勘持久化快取 (Probe Cache)**: 探勘獲取之核心資訊（精確行號、函式簽名、通訊合約）必須回寫至任務檔第二節「Gate 1 探勘持久化快取」，為後續執行唯一依據。
- **語意區塊錨定 (Semantic Block Anchor)**: 目標函式或介面以完整語意為單位錨定（細讀限 80~150 行），避免行號漂移。
- **建檔路徑與命名**: 存於 `0.doc_mg/tasks/`，格式為 `task_MMDD_01_[plugin]_[topic].md`（可由 `task_cli.py init` 自動生成）。
- **乾淨範本初始化**: 複製 `0.doc_mg/task_template_v2.md`，填入目標與 Phase 拆解，徹底清除所有 `<!-- ... -->` 註解。
- **前置宣告清單**: 前置鎖定宣告 Target Devtools（工具鏈）與 Target SSOTs（L1~L4 回寫清單）。
- **中斷點**: 產出 `task.md` 後**強制停步**，**嚴禁修改原始碼**，交回控制權。

#### 1.3. Gate 2: 分段原子執行與狀態收斂 (Atomic Execution & Dynamic Condensation)
- **階段性會話重置協議 (One Phase, One Session Protocol)**:
  * 嚴格落實物理隔絕，單一會話僅專注於一個 Phase 的原子目標與驗收。
  * Phase 驗收通過 (Exit 0) 後，更新任務檔狀態為 `[已完成]` 並追加單行收斂歷程。
  * **強制停步交權**：完成 Checkpoint 後停止工具調用，回覆末尾輸出開立新 Session 接力碼塊。
- **Phase 結尾批次打勾同步**: 嚴禁每步修改任務檔，於 Phase 單元驗證通過後批次打勾同步（≤ 50~80 行局部替換唯一語意區塊）。
- **動態狀態收斂 (Dynamic Condensation)**: Phase 完成後，後續推進時僅保留狀態 `[已完成]` 與 Checkpoint 驗證摘要，避免歷史細節膨脹 context。
- **2-Strike 熔斷與突發隔離協議 (Circuit Breaker & Incident Offloading SOP)**:
  * 單一錯誤嘗試上限為 **2 次**，連續 2 次未果立即觸發熔斷停步。
  * 工作流：1. 中斷探索 (Halt) ➔ 2. 標註 `[BLOCKED: 錯誤簽名]` ➔ 3. `git checkout` 還原工作區 ➔ 4. 輸出新 Session 排查接力碼塊。
- **終端脫水防禦**: 建置/測試強制串接 `compact_log.py` 或 `rtk`，杜絕堆疊雜訊污染。

#### 1.4. Gate 3: 驗收、SSOT 閉環與雙向聯動封存 (Verification, SSOT Closure & Archiving)
- **四層 SSOT 閉環 (90/10 分級守則)**:
  * **90% 輕量任務（全面豁免）**：樣式調整、局部修復重構，L1~L3 豁免讀寫，task 檔標 `[N/A]`，結案僅需 L4 封存。
  * **10% 重大變更（純骨架回寫）**：涉及模組增刪、Storage 模型、跨插件接口變更時，結案前純骨架回寫 Target SSOTs。
- **自動化審計**: 執行 `audit_suite.py`、`doc_cross_ref.py` 確保合規且零死鏈 (Exit 0)。
- **雙向聯動封存**: 驗收通過後觸發任務與關聯草稿封存。

### 1.5. 安全守護五大戒律 (Mandatory Safety Guardrails)
最後工具調用必須是更新/打勾 `0.doc_mg/tasks/task_*.md`。
- **戒律一：精準局部替換鐵律 (Strict Chunk Replacement ≤ 50~80 行 & No ArtifactMetadata on Workspace)**：
  使用原生局部替換工具 (`edit_file`)，單次替換範圍 ≤ 50~80 行唯一語意區塊；嚴禁全檔覆寫；workspace 檔案嚴禁傳遞 `ArtifactMetadata`；嚴禁寫臨時腳本更新任務檔；落實 Phase 結尾批次打勾。
- **戒律二：建檔即 Git Add 防護 (Instant Git Tracking Guard)**：
  新建 `task_*.md` 第一時間執行 `git add <task-file>` 納入暫存區保護。
- **戒律三：更新即停步零冗餘 (Update & Immediate Halt & Prior Cleanup)**：
  暫存檔清理前置於任務檔更新；更新任務檔為本輪最後一個工具調用，更新完成即刻停步交權。
- **戒律四：驗證正則合併與單次收尾更新 (Regex Batch Verification & Single-Pass Task Update)**：
  驗收禁止多輪單詞 Grep；打勾、收斂歷程與 frontmatter 狀態單次原子替換完成。
- **戒律五：工具檢核矩陣分級豁免 (Tool Invocation Matrix Leveling)**：
  常態任務全面免除工具檢核矩陣填寫；僅重大架構變更選填，選填必須提供調用實證。

---

## 2. 草稿生命週期與同名隔離先行原則 (Draft Lifecycle & Safe Isolation)

1. **草稿生命週期命名與同名隔離先行原則 (Draft Lifecycle Naming SSOT)**：
   - 中間規格草稿存放於 `0.doc_mg/draft/`，檔名表達模組與主題（如 `oauth_flow.md`）。
   - 模組與介面命名直接對齊正式落地結構，杜絕更名脫鉤。
2. **任務與關聯草稿雙向聯動生命週期 (Bi-directional Linkage)**：
   - 任務檔 Frontmatter 聲明 `related_drafts: [...]`。
   - 驗收完畢後，關聯草稿移入 `0.doc_mg/draft/archive/`，保持根目錄純淨；當日任務保留於 `0.doc_mg/tasks/`。
3. **歷史草稿存量分類 (Draft Backfill)**：依歸屬插件移入 `0.doc_mg/draft/archive/` 對應目錄。

---

## 3. 白名單保護安全邊界 (Whitelist Protection)

歸檔整理時**嚴禁刪除任何檔案**，保護白名單如下：
- **核心管理檔案**：`0.doc_mg/task_template_v2.md`、`guide-task-manager.md` 及今日進行中任務。
- **規格草稿與模板**：`00` 開頭模板、架構手冊與跨插件契約 (`spec-cross-plugin-contract.md`)。
- **未完成任務與草稿**：狀態為「開發中」、「進行中」、「規劃中」或「待辦」者永久保留。

---

## 4. 日期辨識規則與優先級

1. **檔名日期**：優先匹配 `task_(YYYYMMDD)_*.md` 或 `task_(MMDD)_*.md`。
2. **內文 Frontmatter**：匹配 `date:\s*["']?(YYYY-MM-DD)["']?` 或 `created:\s*["']?(YYYY-MM-DD)["']?`。
3. **系統檔案日期**：取用 OS 建立/修改時間。
4. **Fallback 安全歸檔**：無法解析者移至 `archive/unknown/`。

---

## 5. Windows 環境執行相容性規範

> [!TIP]
> **Windows 環境相容性規範 (Windows Py Execution Standard)**：
> 為避免 Windows Store 0.0.0.0 樁阻斷，全專案一律使用 `py` 前綴調用 Python 直譯器（如 `py 1.devtools/tools/task_cli.py ...`）。

---

## 6. 雙層滾動歸檔架構與標準目錄對照 (Two-Tier Retention & Archive Governance)

### 6.1. 雙層滾動架構原則
1. **第零層（根層純淨區 - `0.doc_mg/tasks/`）**：僅存進行中任務，結案立即移入 `archive/`。
2. **第一層（近期封存緩衝區 - `0.doc_mg/tasks/archive/` 根目錄）**：平鋪常態保留最新 10 份結案任務，便於縱覽跨插件脈絡。
3. **第二層（冷儲存分類區 - `0.doc_mg/tasks/archive/[plugin]/`）**：超過 10 份之舊任務依 plugin 分流移入子目錄，超額下沉至 `history/`。

### 6.2. 標準歸檔目錄對照表 (各插件活躍區與歷史區)

| 插件代號 | 活躍區 (≤ 30 天) | 歷史區 (> 30 天) |
| :--- | :--- | :--- |
| **chrome_scrumclock** | `0.doc_mg/tasks/archive/chrome_scrumclock/` | `.../chrome_scrumclock/history/` |
| **chrome_pk** | `0.doc_mg/tasks/archive/chrome_pk/` | `.../chrome_pk/history/` |
| **chrome_video speed plus** | `0.doc_mg/tasks/archive/chrome_video speed plus/` | `.../chrome_video speed plus/history/` |
| **finance-research-clipper-oss** | `0.doc_mg/tasks/archive/finance-research-clipper-oss/` | `.../finance-research-clipper-oss/history/` |
| **browser-activity-monitor** | `0.doc_mg/tasks/archive/browser-activity-monitor/` | `.../browser-activity-monitor/history/` |
| **chrome_gemini_nano** | `0.doc_mg/tasks/archive/chrome_gemini_nano/` | `.../chrome_gemini_nano/history/` |
| **global (全域)** | `0.doc_mg/tasks/archive/global/` | `.../global/history/` |

### 6.3. 自動化維護與封存作業原則
- **自動化指令**：`py 1.devtools/tools/task_cli.py archive --dry-run` 預覽；`py 1.devtools/tools/task_cli.py archive` 執行。
- **無破壞性安全遷移**：採用 Move 移動，嚴禁刪除任何檔案，保留原始時間與驗收記錄。

---

## 7. 任務生命週期與 Devtools 映射矩陣 (Task Lifecycle & Devtools Matrix)

| 生命週期階段 | 核心規範與門禁 | 強制調用工具 | 替代/輔助指令 | 預期防護與效益 |
| :--- | :--- | :--- | :--- | :--- |
| **Gate 1: 專案情報檢索** | 探勘拓撲、檔案關聯或符號 | `py 1.devtools/tools/repo_radar.py map`<br>`py 1.devtools/tools/repo_radar.py symbol <Name>` | `npm run skeleton` | 節省 80%~90% 結構掃描 Token |
| **Gate 1: 模組介面探勘** | 目標檔案 > 100 行嚴禁盲讀 | `py 1.devtools/tools/code_skeleton.py <檔案>` | `npm run skeleton -- <檔案>` | 提煉簽名，節省 85%~95% 源碼 Token |
| **Gate 1: 藍圖建檔** | 宣告 Target Devtools/SSOTs 與快取 | `py 1.devtools/tools/task_cli.py init --plugin <plugin> --title "<標題>"` | 手動複製清理註解 | 規範結構並鎖定工具鏈與快取 |
| **Gate 2: 終端脫水防禦** | 執行建置、打包、檢查或測試 | `<command> 2>&1 \| py 1.devtools/tools/compact_log.py` | `rtk <command>` | 過濾堆疊雜訊，節省 70%~95% 終端 Token |
| **Gate 2: 程式碼修改** | 代碼或文檔局部替換 (≤ 50~80 行唯一語意區塊) | 原生 `edit_file` 精準替換 | *(嚴禁全檔覆寫)* | 降低輸出延遲與截斷風險 |
| **Gate 3: Manifest 審計** | 涉及插件清單與安全設定 | `py 1.devtools/tools/audit_manifests.py --compact` | `npm run audit:manifests` | MV3 與安全合規零遺漏 |
| **Gate 3: 契約與死鏈驗證** | 跨插件契約與 Markdown 引用一致性 | `py 1.devtools/tools/doc_cross_ref.py --audit`<br>`py 1.devtools/tools/validate_contract.py` | *(手動檢查前必跑)* | 自動檢出死鏈與 Schema 破壞 |
| **Gate 3: 任務自動歸檔** | 驗收通過後歷史收納 | `py 1.devtools/tools/task_cli.py archive` | 手動安全搬移 | 自動歸納封存，工作區常保純淨 |

---

## 8. 突發問題分流與多會話隔離協議 (Incident Offloading SOP)

發現非當前 Phase 原子目標的次生 Bug 或深層依賴問題時，**嚴禁原地展開跨模組深挖探索**。

### 標準四步工作流：
1. **中斷探索 (Halt)**：立即停止任何探索性工具調用。
2. **物理回寫 (Write-Back)**：於 `task_*.md` 當前 Phase 標註 `[BLOCKED: 錯誤簽名]` 記錄關鍵報錯。
3. **乾淨還原 (Rollback)**：使用 `git checkout` 撤銷髒修改，保持工作區穩定可編譯。
4. **停步並產出提示詞 (Handover)**：AI 結束當前輪次交回控制權，輸出專用接力碼塊開立全新 Session 獨立排查。
