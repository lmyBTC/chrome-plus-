---
title: "Skill_and_Plugin_SSOT_Sink_Standardization"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-30"
deadline: "2026-10-30"
appetite: "3h" # 人類時間預算
complexity_budget: "4 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 5 (Phase Final Audit & Archive Complete)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
  將專案中「每個 skills」與「每個插件的 SSOT」都要有一份下沉的 doc md，用以詳細記錄、管理複雜的內容與組成元件，防止頂層技能或主索引過載，消除架構黑盒與規格腐爛。
- **核心目標**：
  1. 插件層：五大插件 (`chrome_pk`, `chrome_gemini_nano`, `browser-activity-monitor`, `chrome_video speed plus`, `finance-research-clipper-oss`) 與 `1.devtools` 均具備標準化下沉的組成元件字典文檔 (`spec-*-components.md` 或 `spec-devtools-matrix.md`)。
  2. 技能層：10 大專家技能 (`.agents/skills/`) 的 `SKILL.md` 建立明確的 `ssot_dependencies` 指針，將複雜規格與元件清單下沉，技能本體瘦身為精簡導航與觸發索引。
  3. 索引層：更新全域真理源總索引 `0.doc_mg/docs/index-ssot.md`，登錄所有新下沉之 doc md，確保零孤兒文檔。
- **邊界與假設**：
  - 本任務聚焦於文檔與規格層面的下沉架構治理，不修改插件的業務程式碼實作。
  - 文檔格式一律遵守 kebab-case 命名法與專案文檔治理五大前綴規範 (`spec-`, `guide-`, `overview-`)。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `GEMINI.md`, `.agents/rules.md`, `0.doc_mg/docs/index-ssot.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/repo_radar.py` | `repo_radar.py map --all` 掃描 23 篇文檔 | 掌握全局文檔拓撲，節省 Context |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` | 下沉文檔建立與局部語意編輯 | 遵循 ≤ 50~80 行編輯 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` | 驗收階段全項審計 | `[待執行]` |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_ssot_sinking.md`
- **影響範圍地圖 (Entity Map)**：
  - 各插件 `docs/` (`chrome_video speed plus`, `chrome_gemini_nano`, `browser-activity-monitor`, `finance-research-clipper-oss`, `chrome_pk`, `1.devtools`)
  - `.agents/skills/*/SKILL.md` (10 個技能)
  - `0.doc_mg/docs/index-ssot.md`
- **前置條件 (Prerequisites)**：
  - Python 3 環境，支援 `repo_radar.py`, `audit_suite.py`。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：
  - 各插件之組成元件架構字典僅建立於各插件專屬之 `docs/spec-<module>-components.md`，技能 `SKILL.md` 僅作為索引與指針，嚴禁雙重拷貝。
- **架構策略與 Tree of Thoughts (ToT)**：
  - Option A: 直接將所有組件資訊擴寫到各插件的 `overview-*.md`。（缺點：造成入口導航膨脹，違反極簡速查原則）
  - Option B: 直接將所有組件細節塞入 `.agents/skills/*/SKILL.md`。（缺點：造成每次載入技能耗費巨額 Token，違反 TokenSaver 核心原則）
  - Option C (採用): 採用雙層下沉解耦架構。各插件在 `docs/` 下維護專屬 `spec-<module>-components.md` 記錄複雜內容與組成元件；各技能 `SKILL.md` 透過 `ssot_dependencies` 明確指向該下沉 doc，僅留精準觸發關鍵字與速查索引。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁在任務檔與下沉文檔中使用 Markdown 內部超連結語法 `[text](path)`，統一使用工作區純行內代碼引用（如 `GEMINI.md`）。
  - 嚴禁更動各插件實際業務程式碼，純專注於下沉 SSOT 與技能指針治理。

### 鎖定檔案 (Target Files)

- `chrome_video speed plus/docs/spec-vidspeed-components.md` (新設)
- `chrome_gemini_nano/docs/spec-nano-components.md` (新設)
- `browser-activity-monitor/docs/spec-actmon-components.md` (新設)
- `finance-research-clipper-oss/docs/spec-clipper-components.md` (新設)
- `chrome_pk/docs/spec-pk-components.md` (新設)
- `1.devtools/docs/spec-devtools-matrix.md` (新設)
- `0.doc_mg/docs/spec-chrome-auditor.md` (新設)
- `.agents/skills/*/SKILL.md` (10 個技能指針校準)
- `0.doc_mg/docs/index-ssot.md` (總索引同步)

### 鎖定工具鏈 (Target Devtools)

- [x] 探勘骨架/雷達: `py 1.devtools/tools/repo_radar.py map --all`
- [x] 終端日誌脫水: `py 1.devtools/tools/compact_log.py`
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [x] 符號索引刷新: `py 1.devtools/tools/generate_symbol_index.py`
- [x] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log` (遇非預期 Bug 即刻立案並還原)

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [x] L1 專家技能：`.agents/skills/*/SKILL.md` (校準 10 大技能之 ssot_dependencies 與下沉指針)
- [x] L2 插件導航：各插件 `overview-*.md` (登錄專屬組件規格指針)
- [x] L3 業務規格：各插件 `docs/spec-*-components.md` (落實組成元件字典)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/` (執行 `py 1.devtools/tools/task_cli.py archive` 歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 五大插件與 DevTools 組成元件字典實體建置 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 建立 VideoSpeedPlus 組成元件規格下沉文檔
    - **動作**: 建立 `chrome_video speed plus/docs/spec-vidspeed-components.md`，記錄 Shadow DOM 注入容器、浮動控制條、快速鍵控制器與時間戳筆記元件。
    - **驗證 (Exit 0)**: 檔案建立且通過 UTF-8 與純行內代碼檢查。
- [x] 任務 1.2: 建立 Gemini Nano 與 Activity Monitor 組成元件規格下沉文檔
    - **動作**: 建立 `chrome_gemini_nano/docs/spec-nano-components.md` 與 `browser-activity-monitor/docs/spec-actmon-components.md`，記錄 Prompt API Pipeline、Tool Agent 與雙軌探針元件。
    - **驗證 (Exit 0)**: 檔案建立且結構符合 kebab-case 與 5 大分類前綴。
- [x] 任務 1.3: 建立 Finance Clipper、PK+ 與 DevTools 組成元件規格下沉文檔
    - **動作**: 建立 `finance-research-clipper-oss/docs/spec-clipper-components.md`、`chrome_pk/docs/spec-pk-components.md` 與 `1.devtools/docs/spec-devtools-matrix.md`。
    - **驗證 (Exit 0)**: 檔案建立且詳載各切片模組之 UI/Service/Store 矩陣。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出接力代碼塊並停步交權。

### Phase 2: 10 大專家技能 SSOT 依賴與下沉指針治理 狀態：`[已完成]`
- [x] 任務 2.1: 補齊審計技能專屬下沉規格文檔
    - **動作**: 建立 `0.doc_mg/docs/spec-chrome-auditor.md`，詳載 Manifest V3 / CSP / XSS 審計清單與規則細節。
    - **驗證 (Exit 0)**: 檔案建立且通過格式審查。
- [x] 任務 2.2: 校準 10 大技能之 `SKILL.md` 前置 YAML 與下沉指針
    - **動作**: 更新 `.agents/skills/*/SKILL.md` 中之 `ssot_dependencies`，精準指向專屬下沉 doc md，提煉頂層速查索引。
    - **驗證 (Exit 0)**: 10 個技能之 frontmatter 皆具備合法 ssot_dependencies 且無死鏈。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出接力代碼塊並停步交權。

### Phase 3: 全域真理源總索引同步與入口串接 狀態：`[已完成]`
- [x] 任務 3.1: 更新全域真理源總索引 `0.doc_mg/docs/index-ssot.md`
    - **動作**: 將新建之 6 份插件組件字典與審計下沉文檔登錄於矩陣，確保零孤兒文檔。
    - **驗證 (Exit 0)**: `index-ssot.md` 更新且排版對齊。
- [x] 任務 3.2: 更新各插件入口 `overview-*.md`
    - **動作**: 於各插件之入口手冊深層導航區塊追加專屬組成元件下沉文檔指針。
    - **驗證 (Exit 0)**: 入口指針正確導向 `docs/spec-*-components.md`。

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0，`audit_ssot.mjs` 通過驗證 64 份 SSOT，0 缺失 0 孤兒)。
> - [x] 狀態標記為 `[已完成]` 並寫入收斂歷程，輸出接力代碼塊並停步交權。

### Phase Final: 自動化審計、符號刷新與任務歸檔 狀態：`[已完成]`
- [x] 任務 F.1: 全域自動化合規審計與符號快取刷新
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/generate_symbol_index.py`。
    - **驗證 (Exit 0)**: 審計 0 錯誤 0 警告，符號索引更新完畢 (365 符號, 23 篇文檔)。
- [x] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 執行 `py 1.devtools/tools/task_cli.py archive` 移入 `0.doc_mg/tasks/archive/`。
    - **驗證 (Exit 0)**: 任務根目錄保持乾淨零結案。

> 🏁 **Phase Final Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 任務正式封存並落實 SSOT 閉環。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [選填/重大架構適用，常態任務豁免]
- **最可能失敗場景 (Pre-Mortem)**：
- **降級/回滾方案 (Blast Radius Control)**：
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。(N/A 本次為純文檔與架構治理)
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [x] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [x] **合規與合約審計**: 若涉及 Manifest 或文檔變更，已執行自動審計腳本 (`audit_manifests.py` / `audit_suite.py`) 確保通過。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [x] [N/A] 輕量任務豁免 (無結構變動，L1~L3 免比對免回寫)
  - [x] 重大架構同步完成 (已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼)
  - [x] L4 任務生命週期: 任務結案後已執行 `task_cli.py archive` 移動至 `0.doc_mg/tasks/archive/` 歸檔緩衝區
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案 (嚴格遵守 ≤ 50~80 行局部替換唯一語意區塊，落實 Phase 結尾批次打勾)。
- [x] **插件驗證**: 已通過全域合規整合審計 (Exit 0)，無死鏈與孤兒文檔。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-30] 藍圖建立完成 (Session 1)
- [2026-10-30] Phase 1 完成：完成五大插件與 DevTools 之 6 份組成元件字典實體建置 (`spec-*-components.md`, `spec-devtools-matrix.md`)，驗證零死鏈 (Session 2)
- [2026-10-30] Phase 2 完成：建立 `spec-chrome-auditor.md` 並校準 10 大專家技能之 ssot_dependencies 與下沉指針，驗證零死鏈 Exit 0 (Session 3)
- [2026-10-30] Phase 3 完成：更新全域真理源總索引 `index-ssot.md` 與 6 大插件入口 `overview-*.md` 之深層組件下沉指針，通過 `audit_ssot.mjs` 驗證 0 缺失 0 孤兒 Exit 0 (Session 4)
- [2026-10-30] Phase Final 完成：自動化審計全項通過 (Exit 0)，符號快取刷新完成，執行任務歸檔至 `0.doc_mg/tasks/archive/` (Session 5)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘全局文檔時，已強制優先調用雷達工具提取結構 (`repo_radar.py map --all`)，未直接盲讀。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `repo_radar.py`: 掃描全局文檔與拓撲，提煉 23 篇文檔輪廓，節省 90% Context
> - `task_cli.py`: 初始化任務檔並自動納入 git add 版本防護
> - `audit_markdown_links.py`: 執行 Markdown 連結與格式審計，確保零死鏈與行內代碼引用合規 (Exit 0)
> - `audit_ssot.mjs`: 驗證 64 份 SSOT 矩陣與 60 份手冊，0 缺失 0 孤兒 (Exit 0)
> - `audit_suite.py`: 執行 Gate 3 整合自動化審計套件，全項通過 (Exit 0)
> - `generate_symbol_index.py`: 刷新符號快取至 `.repo_index.json` (365 符號, 23 文檔)
> - `task_cli.py archive`: 自動歸檔已結案任務並納入雙層滾動維護
> **參與對話 ID 紀錄**:
> - [2026-10-30] ID: b2e6e9df-7ef8-43b8-827e-c6067e5700a5 (Gate 1 藍圖規劃)
> - [2026-10-30] ID: df917891-0d96-4cc2-9c48-a6400f2df264 (Phase 1 組件字典實體建置)
> - [2026-10-30] ID: 68e4bed1-cbf9-44f1-b52a-20817cc79804 (Phase 2 技能指針治理與審計下沉文檔建立)
> - [2026-10-30] ID: 76a619f9-599b-470d-9b73-cafe3e62172b (Phase 3 總索引與入口串接)
> - [2026-10-30] ID: 4a7b1a1b-af97-4c6b-83c7-ba3782016a7a (Phase Final 自動化審計、符號刷新與任務歸檔)
> **跨會話接力指令 (Session Handover)**:
> 本任務已結案歸檔，無後續接力會話。全域 SSOT 與技能下沉架構標準化已圓滿完成。
