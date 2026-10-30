---
title: "ScriptRunner_全功能增強_G01-G09-G11"
plugin: "chrome_pk"
status: "規劃中" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-30"
deadline: "2026-10-30"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 1 (Gate 1 Blueprint)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["0.doc_mg/draft/xxx.md"])
---

> - [ ] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：
- **核心目標**：
- **邊界與假設**：

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/rules.md` 對應技能規範與對應插件 `README_<MODULE>.md`。
- [ ] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `[例如：code_skeleton 提煉骨架]` | `[節省 Context]` |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | `[終端脫水或原子替換實證]` | `[Exit 0]` |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | `[合規、隔離與死鏈審計命令結果]` | `[Exit 0]` |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_{task_slug}.md`
- **影響範圍地圖 (Entity Map)**：
- **前置條件 (Prerequisites)**：

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：
- **架構策略與 Tree of Thoughts (ToT)**：
- **硬性禁止動作 (Guardrails)**：

### 鎖定檔案 (Target Files)

- `./chrome_pk/path/to/target_file`

### 鎖定工具鏈 (Target Devtools)

- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [ ] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact` (或 `audit_manifests.py` / `audit_plugin_isolation.py`)
- [ ] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log` (遇非預期 Bug 即刻立案並還原)

### 鎖定 SSOT 回寫清單 (Target SSOTs)

- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/chrome_pk-core/SKILL.md` (僅骨架：元件字典、Storage Schema)
- [ ] L2 插件導航：`./chrome_pk/[PLUGIN]_README.md` (模組速查矩陣、入口索引)
- [ ] L3 業務規格：`./chrome_pk/docs/[feature]-spec.md` (業務規格，無則免填)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/` (執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔緩衝區，自動滾動分流，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: [階段名稱 - 核心實作] 狀態：`[待辦]`
- [ ] 任務 1.1 `[Blocker]`: [前置探勘 / 介面鎖定]
    - **動作**:
    - **驗證 (Exit 0 / 客觀指標)**:
- [ ] 任務 1.2: [核心邏輯實作與驗證]
    - **動作**: 執行功能改動，遵守單次局部替換 (≤ 50~80 行唯一語意區塊)。
    - **驗證 (Exit 0 / 客觀指標)**: 執行建置驗證，長輸出串接 `compact_log.py` 脫水。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [ ] 階段所有單元驗證已通過 (Exit 0)。
> - [ ] 狀態標記為 `[已完成]`（若遇突發阻礙則標記 `[BLOCKED]` 並附錯誤快照，撤回髒代碼後停步開新會話）。
> - [ ] 將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [ ] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫，局部替換 ≤ 50~80 行）。
> - [ ] 遵循「One Phase, One Session」物理隔絕底線：於回覆末尾強制輸出開立新 Session 接力提示詞代碼塊，嚴禁於本會話連續推進下一階段。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[待辦]`
- [ ] 任務 F.1: 自動化工具合規審計
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/audit_manifests.py`。
    - **驗證 (Exit 0)**: 審計工具回報 0 警告 0 錯誤。
- [ ] 任務 F.2: SSOT 實體回寫與任務歸檔
    - **動作**: 依 Target SSOTs 清單回寫 L1~L3 骨架 (若輕量任務則勾選 N/A 豁免)；任務完成後執行 `py 1.devtools/tools/task_cli.py archive` 移入 `0.doc_mg/tasks/archive/` 歸檔緩衝區。
    - **驗證 (Exit 0)**: 檔案已正確歸檔，工作區維持乾淨。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [選填/重大架構適用，常態任務豁免]
- **最可能失敗場景 (Pre-Mortem)**：
- **降級/回滾方案 (Blast Radius Control)**：
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [ ] **工具鏈合規審查 (Devtools Audit)**:
  - [ ] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [ ] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [ ] **合規與合約審計**: 若涉及 Manifest 或文檔變更，已執行自動審計腳本 (`audit_manifests.py` / `audit_suite.py`) 確保通過。
- [ ] **四層 SSOT 閉環 (90/10 分級)**:
  - [ ] [N/A] 輕量任務豁免 (無結構變動，L1~L3 免比對免回寫)
  - [ ] 重大架構同步完成 (已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼)
  - [ ] L4 任務生命週期: 任務結案後已執行 `task_cli.py archive` 移動至 `0.doc_mg/tasks/archive/` 歸檔緩衝區
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案 (嚴格遵守 ≤ 50~80 行局部替換唯一語意區塊，落實 Phase 結尾批次打勾)。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件 (或執行 Vite `npm run build` 後載入 `dist/`)，確認各項功能及背景通訊皆正常無報錯。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-30] 藍圖建立完成 (Session 1)

## 8. AI 簽到區與會話接力
> [ ] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [ ] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [ ] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [ ] 結案前已執行 `audit_suite.py` 完成自動化驗證。
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: [例如: 提煉 popup.ts 介面骨架，節省 88% Token]
> - `compact_log.py`: [例如: 建置錯誤日誌脫水，過濾 120 行堆疊]
> - `audit_suite.py`: [例如: 整合審計 Exit 0 通過]
> **參與對話 ID 紀錄**:
> - [2026-10-30] ID: [當前對話 ID] (初始化)
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 請讀取 0.doc_mg/tasks/task_MMDD_NN_plugin_Topic.md，開始執行 Phase 1
> ```
