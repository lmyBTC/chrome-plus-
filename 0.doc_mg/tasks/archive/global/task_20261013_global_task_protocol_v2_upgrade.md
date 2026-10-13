---
title: "全面升級任務協議管理系統 (Task Protocol v3.1 & 4-Gate Architecture)"
plugin: "global"
status: "已完成"
created: "2026-10-13"
deadline: "2026-10-14"
appetite: "1.5h"
complexity_budget: "Max 4 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 6 (Phase Final 結案)"
related_drafts: ["0.doc_mg/draft/task_manager.md", "0.doc_mg/draft/task_template_v2.md", "0.doc_mg/draft/SKILL.md"]
---

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：參考 `0.doc_mg/draft/` 下之 `task_manager.md`、`task_template_v2.md` 與 `SKILL.md`，將先進任務生命週期管理實踐正式整入本專案。
- **核心目標**：
  1. 升級任務範本 `0.doc_mg/task_template_v2.md`，融合工具檢核矩陣 (Tool Invocation Matrix)、Gate 1 探勘持久化快取 (Probe Cache)、行號錨定 (Line Anchor) 與事前驗屍 (Pre-Mortem)。
  2. 升級任務協議技能 `.agents/skills/task-protocol/SKILL.md`，正式導入 4-Gate Protocol、One Phase One Session 物理隔絕、2-Strike 熔斷機制與任務檔防護五大戒律。
  3. 升級任務管理文檔 `0.doc_mg/docs/task_manager.md`，納入草稿與任務雙向聯動、白名單安全保護與歸檔指引。
  4. 同步頂層規範 `.agents/rules.md` 與 `GEMINI.md`，確保全站門禁與 SSOT 鏈條高度自洽。
- **邊界與假設**：本專案為 Chrome 擴充功能多插件架構，必須完整保留各插件的獨立隔離底線與專案既有目錄結構 (`0.doc_mg/tasks/`、`1.devtools/tools/`)。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md` 與現行 `0.doc_mg/task_template_v2.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 脫水效益 / 驗收狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `view_file` (精準讀取草稿與規範) | 已對比 draft 三檔與正式目錄四檔行數與差異 | 精確定位升級點，無冗餘探索 |
  | **Gate 2: 執行** | `replace_file_content` / `multi_replace_file_content` | 已於 Phase 1~4 落實局部原子替換與規範升級 | 單次範圍 ≤ 10 行替換防護 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/doc_cross_ref.py` | `py 1.devtools/tools/doc_cross_ref.py --dir 0.doc_mg --dry-run` (Exit 0) | 確保 SSOT 零死鏈與合規 |
- **Gate 1 探勘持久化快取 (Probe Cache)**：本任務直接升級架構規範，相關改動點已於本藍圖之各 Phase 行號錨定鎖定。
- **影響範圍地圖 (Entity Map)**：
  - `0.doc_mg/task_template_v2.md`
  - `.agents/skills/task-protocol/SKILL.md`
  - `0.doc_mg/docs/task_manager.md`
  - `.agents/rules.md`
  - `GEMINI.md`
- **前置條件**：工作區為乾淨狀態，相關 draft 檔案齊全。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延續 Chrome Plus 多插件隔離體系，保留插件目錄歸檔規範，融合草稿中的通用治理架構。
- **架構策略**：採「漸進式融合」，不破壞現有插件專屬工具鏈與專家技能，將 3-Gate 優雅擴展為標準 4-Gate (納入 Gate 3 知識收斂與圖譜防護)，並強化 Token 節省與檔案防護機制。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫 (`write_to_file`) 工作區正式任務檔，後續狀態更新嚴格遵守 `replace_file_content` ≤ 10 行。
  - 對 workspace 專案檔案寫入時嚴禁傳遞 `ArtifactMetadata`。
  - 嚴禁更動不相干插件之業務程式碼。

### 鎖定檔案 (Target Files)
- `0.doc_mg/task_template_v2.md`
- `.agents/skills/task-protocol/SKILL.md`
- `0.doc_mg/docs/task_manager.md`
- `.agents/rules.md`
- `GEMINI.md`

### 鎖定工具鏈 (Target Devtools)
- [ ] 文檔審計工具: `py 1.devtools/tools/doc_cross_ref.py`
- [ ] 暫存追蹤工具: `git add 0.doc_mg/tasks/task_20261013_global_task_protocol_v2_upgrade.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] L1 專家技能：`.agents/skills/task-protocol/SKILL.md` (任務協議守護者 v3.1 規範)
- [ ] L2 插件導航：`.agents/rules.md` (更新門禁指針與 4-Gate 規範)
- [ ] L3 領域規格：`0.doc_mg/docs/task_manager.md`、`0.doc_mg/task_template_v2.md`、`GEMINI.md` (任務管理架構)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 升級任務範本真理源 (task_template_v2.md) 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 融合 draft/task_template_v2.md 之核心欄位與檢核矩陣
    - **動作**: 更新 `0.doc_mg/task_template_v2.md`，加入 `appetite`、`complexity_budget`、`current_session`、`related_drafts`，導入「全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix)」、「Gate 1 探勘持久化快取 (Probe Cache)」、「行號錨定 (Line Anchor)」與「事前驗屍與降級 (Pre-Mortem)」；同時保留 Chrome Plus 的插件欄位與 target devtools 定義。
    - **驗證 (Exit 0)**: 檢查檔案語法，確認無舊版殘留且兼具多插件架構與新一代任務特性。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 執行強制收尾（更新任務檔為本輪最後工具呼叫，嚴守 ≤ 10 行局部替換，更新即停步零冗餘呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 2: 升級任務協議技能 (task-protocol/SKILL.md) 狀態：`[已完成]`

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 執行強制收尾（更新任務檔為本輪最後工具呼叫，嚴守 ≤ 10 行局部替換，更新即停步零冗餘呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 3: 升級任務管理指南 (0.doc_mg/docs/task_manager.md) 狀態：`[已完成]`

> 🏁 **Phase 3 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 執行強制收尾（更新任務檔為本輪最後工具呼叫，嚴守 ≤ 10 行局部替換，更新即停步零冗餘呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase 4: 同步頂層規範指針 (.agents/rules.md & GEMINI.md) 狀態：`[已完成]`

> 🏁 **Phase 4 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 執行強制收尾（更新任務檔為本輪最後工具呼叫，嚴守 ≤ 10 行局部替換，更新即停步零冗餘呼叫）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：輸出開立新 Session 接力提示詞代碼塊。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[已完成]`
- [x] 任務 F.1: 執行文檔交叉引用驗證
    - **動作**: 執行 `py 1.devtools/tools/doc_cross_ref.py`（或專案文檔鏈接驗證工具），確保全站文件引用零死鏈。
    - **驗證 (Exit 0)**: 文檔交叉檢查無遺漏。
- [x] 任務 F.2: 任務打勾收尾與狀態收斂
    - **動作**: 依規範完成本任務結案收斂與歷程記錄。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：
  - 草稿中部分路徑與指令（如 `scratch/manage.py`、`doc/doc_task/`）屬於外部系統，若未適配本專案直接覆蓋，會造成工具鏈找不到目標或路徑報錯。
  - 防範措施：所有規則文字與範本路徑，一律嚴格對齊本專案之真實目錄結構（`0.doc_mg/tasks/`、`1.devtools/tools/`、`.agents/skills/`）。
- **降級/回滾方案 (Blast Radius Control)**：
  - 本次任務僅修改文檔與規則檔案，不涉及插件運行時程式碼。若有文檔衝突或格式非預期，可藉由 Git 直接復原。
- **熔斷與突發隔離機制 (Circuit Breaker & Incident Offloading)**：單一問題最多嘗試 2 次，失敗即熔斷停步，乾淨復原後立案隔離。

## 6. 驗收標準 (Acceptance Criteria)
- [x] `0.doc_mg/task_template_v2.md` 已全面升級，包含工具檢核矩陣、持久化快取、行號錨定與事前驗屍。
- [x] `.agents/skills/task-protocol/SKILL.md` 升級至 v3.1，落實 4-Gate、2-Strike 熔斷、One Phase One Session 與任務檔防護五大戒律。
- [x] `0.doc_mg/docs/task_manager.md` 已整合草稿生命週期、白名單防護與 4-Gate 管理指引。
- [x] `.agents/rules.md` 與 `GEMINI.md` 已同步門禁標準與 SSOT 索引。
- [x] 文檔交叉驗證通過，所有相對路徑與跳轉協議合規。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-13] [Gate 1] 完成專案規範與 draft 三檔比對，建立任務藍圖 (Session 1)。
- [2026-10-13] [Phase 1] 完成 task_template_v2.md 升級，整合工具檢核矩陣、快取、行號錨定與事前驗屍 (Session 2)。
- [2026-10-13] [Phase 2] 完成 task-protocol/SKILL.md 升級至 v3.1，導入 4-Gate、熔斷、會話隔離與防護五大戒律 (Session 3)。
- [2026-10-13] [Phase 3] 完成 0.doc_mg/docs/task_manager.md 升級，整合 4-Gate、草稿雙向聯動、白名單防護與 Windows py 規範 (Session 4)。
- [2026-10-13] [Phase 4] 完成 GEMINI.md 與 rules.md 頂層指針升級至 4-Gate 體系 (Session 5)。
- [2026-10-13] [Phase Final] 完成審計工具驗證 (audit_manifests & doc_cross_ref)，全流程驗收合格，正式結案歸檔 (Session 6)。

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之門禁規範、探勘硬窄化與動態狀態收斂規範。
> [x] 已完成 Gate 1 脈絡探索與任務藍圖建立，本階段嚴禁修改任何正式規範與原始碼。
> [x] 建檔後已第一時間執行 `git add` 納入版本防護。
>
> **參與對話 ID 紀錄**:
> - 2026-10-13 ID: bc7424b8-9fac-498c-9ad6-7c9c0c3a561d (Gate 1: 建立任務協議 v3.1 全面升級藍圖)
> - 2026-10-13 ID: 2643cdca-7fa9-4068-89f6-9b5758157842 (Phase 1: 升級 task_template_v2.md 範本真理源)
> - 2026-10-13 ID: 31a6c089-1ffb-4436-b42f-fef0a01f56e2 (Phase 2: 升級 task-protocol/SKILL.md 技能)
> - 2026-10-13 ID: e0feb942-ab96-4cc7-ac18-52435e5b3b88 (Phase 3: 升級 0.doc_mg/docs/task_manager.md 管理指南)
> - 2026-10-13 ID: aba12eb4-d464-499c-aaa8-153672139fe9 (Phase 4: 同步頂層規範指針 rules.md 與 GEMINI.md)
> - 2026-10-13 ID: 0e5590cb-5bb7-4c7f-b871-06a9c4b83909 (Phase Final: 自動化審計、文檔交叉驗證與結案歸檔)
>
> **任務狀態結案紀錄**:
> 本任務所有 Phase 與驗收標準已 100% 達成，通過 Manifest 合規審計與文檔交叉驗證。正式結案！
