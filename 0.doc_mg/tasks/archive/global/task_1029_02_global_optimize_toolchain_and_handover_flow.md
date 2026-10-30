---
title: "optimize_toolchain_and_handover_flow"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 4 (Phase Final 自動化審計驗收、範本文字校正與歸檔閉環)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["0.doc_mg/draft/xxx.md"])
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：基於上一輪工具鏈測試與日誌水位分析（task_1029_01）發現之痛點，全盤優化工具鏈架構與操作流程：抽出共用庫、提供自動會話接力指令 (`handover`)、CLI 位置參數人性化支援、焦點骨架提煉 (`--expand`)、以及校正雙層歸檔說明。
- **核心目標**：
  1. 抽出共用庫 `1.devtools/tools/lib/common.py`，統一路徑計算 `get_repo_root()` 與終端輸出編碼，消除重複代碼。
  2. 強化 `analyze_task_tokens.py` 與 `task_cli.py` 對位置參數的容錯相容性。
  3. 實作 `task_cli.py handover` 指令，一鍵自動產生新 Session 冷啟動無損接力代碼塊。
  4. 擴展 `code_skeleton.py --expand <symbol>` 焦點骨架提煉能力，節省跨函式讀取的回合數。
  5. 統一任務範本中對雙層歸檔緩衝區之文字定義。
- **邊界與假設**：僅限於開發者工具鏈與任務範本優化，嚴禁改動插件業務代碼。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md` 與 `.agents/skills/token-saver/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py` / `repo_radar.py` | `py 1.devtools/tools/code_skeleton.py 1.devtools/tools/task_cli.py` 提取骨架 | 419 行 ➔ 72 行，減少 82.8% 雜訊 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py` / `rtk` | 各 Phase 執行單元測試並串接脫水 | 預期過濾冗長堆疊 (Exit 0) |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` / `audit_manifests.py` | 整合審計驗收 | 預期全項 PASS (Exit 0) |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_optimize_toolchain.md` (已建立)
- **影響範圍地圖 (Entity Map)**：
  - `1.devtools/tools/lib/common.py` (新增共用庫)
  - `1.devtools/tools/task_cli.py` (新增 handover 指令、參數相容)
  - `1.devtools/tools/analyze_task_tokens.py` (位置參數支援)
  - `1.devtools/tools/code_skeleton.py` (支援 --expand 焦點展開)
  - `0.doc_mg/task_template_v2.md` & `task_protocol_pack/docs/task_template_v2.md`
- **前置條件 (Prerequisites)**：Git status clean，任務檔已納入版本控管。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：徹底終結各腳本私自撰寫 `REPO_ROOT` 或 `detect_repo_root()` 的現況，統一由 `lib/common.py` 提供單一真理源。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A：直接修改每個獨立腳本，不建立共用庫。缺點：日後維護成本極高，易產生不一致。
  - 方案 B：建立 `1.devtools/tools/lib/common.py` 作為核心微庫，各工具向後相容引入。優點：結構清爽，一次性解決路徑與編碼問題。
  - 決策：採方案 B。
- **硬性禁止動作 (Guardrails)**：嚴禁整檔覆寫任務檔、嚴禁對 workspace 檔案傳遞 ArtifactMetadata、嚴禁更動插件業務原始碼。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/lib/common.py` (新增)
- `./1.devtools/tools/task_cli.py`
- `./1.devtools/tools/analyze_task_tokens.py`
- `./1.devtools/tools/code_skeleton.py`
- `./0.doc_mg/task_template_v2.md`

### 鎖定工具鏈 (Target Devtools)
- [x] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [x] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [x] 結案整合審計: `py 1.devtools/tools/audit_suite.py --compact`
- [x] 2-Strike 熔斷立案: `py 1.devtools/tools/log_issue.py log` (遇非預期 Bug 即刻立案並還原)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`[N/A]`
- [ ] L2 插件導航：`[N/A]`
- [ ] L3 業務規格：`[N/A]`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 建立共用微庫 `lib/common.py` 與重構路徑依賴 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 建立 `1.devtools/tools/lib/common.py`
    - **動作**: 實作 `get_repo_root()` (向上查找 `.git` 或 `0.doc_mg`)、`setup_utf8_output()` 與 `get_active_task()`。
    - **驗證 (Exit 0 / 客觀指標)**: 單元測試 `py -c "import sys; sys.path.append('1.devtools/tools'); from lib.common import get_repo_root; print(get_repo_root())"` 正確印出專案根目錄。
- [x] 任務 1.2: 重構 `task_cli.py`、`code_skeleton.py`、`analyze_task_tokens.py` 引入共用微庫
    - **動作**: 移除重複之 `BASE_DIR` 與硬編碼相對路徑，替換為 `common.py`。
    - **驗證 (Exit 0 / 客觀指標)**: `py 1.devtools/tools/code_skeleton.py 1.devtools/tools/lib/common.py` 正常輸出無報錯。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫，局部替換 ≤ 50~80 行）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：於回覆末尾強制輸出開立新 Session 接力提示詞代碼塊，嚴禁於本會話連續推進下一階段。

### Phase 2: CLI 體驗健全化、自動接力指令與焦點骨架 狀態：`[已完成]`
- [x] 任務 2.1: 優化 `analyze_task_tokens.py` 支援位置參數相容
    - **動作**: 支援直接傳入 task file 路徑或對話 ID，自動判定 flag。
    - **驗證 (Exit 0)**: `py 1.devtools/tools/analyze_task_tokens.py 0.doc_mg/tasks/task_1029_02_global_optimize_toolchain_and_handover_flow.md` 正常分析無參數錯誤。
- [x] 任務 2.2: 實作 `task_cli.py handover` 自動生成接力 Prompt
    - **動作**: 自動提取進行中任務之下一 Phase 目標與 Context 快照，輸出精準接力代碼塊。
    - **驗證 (Exit 0)**: 執行 `py 1.devtools/tools/task_cli.py handover` 正確輸出 Phase 2 接力代碼。
- [x] 任務 2.3: 實作 `code_skeleton.py --expand <symbol>` 焦點骨架提煉
    - **動作**: 在骨架化同時，完整展開指定函式或類別實作。
    - **驗證 (Exit 0)**: `py 1.devtools/tools/code_skeleton.py 1.devtools/tools/lib/common.py --expand get_repo_root` 驗證其僅完整展開該函式。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 輸出接力提示詞代碼塊。

### Phase Final: 自動化審計驗收、範本文字校正與歸檔閉環 狀態：`[已完成]`
- [x] 任務 F.1: 整合自動化審計與全域符號快取更新
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact`。
    - **驗證 (Exit 0)**: 5/5 插件 Manifest V3 合規，跨插件邊界與 SSOT 檢核全數通過。
- [x] 任務 F.2: 校正 `task_template_v2.md` 雙層歸檔路徑與緩衝區說明
    - **動作**: 同步 `0.doc_mg/` 與 `task_protocol_pack/` 下之範本與技能文檔。
    - **驗證 (Exit 0)**: 文檔路徑描述一致。
- [x] 任務 F.3: 雙層任務歸檔下沉與 SSOT 結案
    - **動作**: 執行 `py 1.devtools/tools/task_cli.py archive`。
    - **驗證 (Exit 0)**: 任務自動移入歸檔緩衝區，工作區保持純淨零結案。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [選填/重大架構適用，常態任務豁免]
- **最可能失敗場景 (Pre-Mortem)**：
- **降級/回滾方案 (Blast Radius Control)**：
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: [N/A] 純開發工具鏈與任務範本優化，無 Content Script 或 CSS 改動。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範與全域工具鏈架構。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [x] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [x] **合規與合約審計**: 已執行自動審計套件 (`audit_suite.py --compact`) 確保全數通過 (Exit 0)。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [x] [N/A] 輕量任務豁免 (無插件結構變動，L1~L3 免比對免回寫)
  - [x] 重大架構同步完成 (範本文字校正與雙層歸檔緩衝區定義同步完成)
  - [x] L4 任務生命週期: 任務結案後已由 `task_cli.py archive` 移動至 `0.doc_mg/tasks/archive/` 緩衝區
- [x] **除錯清理**: 已確認移除或註解所有測試用的除錯程式碼，無殘留臨時檔案。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案 (嚴格遵守 ≤ 50~80 行局部替換唯一語意區塊，落實 Phase 結尾批次打勾)。
- [x] **插件驗證**: 審計套件 5/5 插件合規通過，工具鏈全數完成單元驗收。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-29] 藍圖建立完成 (Session 1)
- [2026-10-29] Phase 1 完成：共用微庫 lib/common.py 建立完成，task_cli/code_skeleton/analyze_task_tokens 成功重構引用 (Session 2)
- [2026-10-29] Phase 2 完成：analyze_task_tokens 支援位置參數相容、task_cli 新增 handover 指令、code_skeleton 支援 --expand 焦點骨架提煉 (Session 3)
- [2026-10-29] Phase Final 完成：audit_suite 審計全數 PASS、task_template_v2 雙層歸檔文字校正同步、執行 task_cli archive 歸檔閉環 (Session 4)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 `task_cli.py` 介面骨架，減少 82.8% Token 雜訊；驗證 `lib/common.py`
> - `code_skeleton.py --expand`: 支援展開特定 symbol 焦點提煉，節省跨函式盲讀消耗
> - `task_cli.py`: 初始化本任務檔並自動納入 git 防護；新增 `handover` 自動產出跨會話無損接力指令
> - `analyze_task_tokens.py`: 支援位置參數直覺傳入 task_file 或對話前綴
> - `lib.common`: 提供 SSOT 根目錄定位與 UTF-8 安全輸出，消除跨腳本重複代碼
> - `audit_suite.py`: 結案自動化審計全項目 PASS (Exit 0)
>
> **參與對話 ID 紀錄**:
> - [2026-10-29] ID: ba79e448-a116-47cf-9b06-3ac6c64c3f5a (Gate 1 藍圖建立)
> - [2026-10-29] ID: 97a8719f-7b6e-416e-be6f-5f436bac6d51 (Session 2 - Phase 1 建立共用微庫與重構)
> - [2026-10-29] ID: 8b82dc74-2239-449a-b904-b69755044b3e (Session 3 - Phase 2 CLI 體驗健全化、自動接力指令與焦點骨架)
> - [2026-10-29] ID: 95b504e1-4aac-4be0-92c3-9b13341c8821 (Session 4 - Phase Final 自動化審計驗收、範本文字校正與歸檔閉環)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務所有 Phase 與 Gate 3 審計驗收已全數達成結案標準，無須開立新 Session。
