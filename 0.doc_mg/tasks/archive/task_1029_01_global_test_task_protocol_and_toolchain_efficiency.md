---
title: "test_task_protocol_and_toolchain_efficiency"
plugin: "global"
status: "已完成" # 規劃中 | 開發中 | 待審核 | 已完成
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "2h" # 人類時間預算
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)" # AI 複雜度約束邊界 (超出則強制停步諮詢)
current_session: "Session 4 (Phase Final Audit & Archive)" # 當前執行會話標記
related_drafts: [] # 關聯草稿清單 (例如: ["0.doc_mg/draft/xxx.md"])
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)

- **用戶原始需求 (True Intent)**：全面測試新升級之任務協議 (3-Gate / One Phase, One Session)、工具鏈各腳本（repo_radar, code_skeleton, compact_log 等）之調用正確性、觸發邊界與 Token 節省效用，並進行實質缺陷修復與優化。
- **核心目標**：
  1. 測試所有核心開發工具的觸發與路徑解析，修復目前發現之 `REPO_ROOT` 相對目錄偏差問題。
  2. 驗證工具鏈之脫水率與 Token 節省實證（骨架化減少 >70% 上下文，日誌脫水過濾堆疊）。
  3. 實作並落實標準 Gate 1 ➔ Gate 2 ➔ Gate 3 轉移流程。
- **邊界與假設**：變更僅限於 `1.devtools/tools/` 工具內部之路徑解析與容錯優化，嚴禁改動插件業務邏輯。

## 2. 上下文探索與依賴 (Context Grounding)

- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`.agents/skills/task-protocol/SKILL.md` 與 `.agents/skills/token-saver/SKILL.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | `py 1.devtools/tools/code_skeleton.py`<br>`py 1.devtools/tools/repo_radar.py` | `py 1.devtools/tools/code_skeleton.py "1.devtools/tools/code_skeleton.py"` 提煉骨架並落地快取 | 565 行 ➔ 167 行，減少 **~70.4%** 上下文雜訊 |
  | **Gate 2: 執行** | `2>&1 \| py 1.devtools/tools/compact_log.py`<br>`rtk` | 修復工具後執行單元測試並管線串接脫水 | 預期過濾冗長堆疊並回傳 Exit 0 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py --compact`<br>`py 1.devtools/tools/generate_symbol_index.py` | 執行整合自動化審計與全域符號索引更新 | 5/5 插件合規，全項 PASS (Exit 0) |
- **Gate 1 探勘持久化快取 (Probe Cache)**：`0.doc_mg/tasks/tmp/tmp_probe_toolchain_test.md` (已建立)
- **影響範圍地圖 (Entity Map)**：
  - `1.devtools/tools/code_skeleton.py` (REPO_ROOT 路徑修正)
  - `1.devtools/tools/repo_radar.py` (REPO_ROOT 路徑修正)
  - `1.devtools/tools/compact_log.py` (REPO_ROOT 路徑修正)
  - `1.devtools/tools/analyze_task_tokens.py` (路徑健全化)
- **前置條件 (Prerequisites)**：Git status 已受版本追蹤。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：統一重用 `detect_repo_root` 或穩健的向上三層 `Path(__file__).resolve().parent.parent.parent`。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A：直接修改 `REPO_ROOT = SCRIPT_DIR.parent.parent`。優點極簡，符合 Chrome Plus 目錄結構。
  - 方案 B：使用動態向上遍歷尋找 `.git` 或 `0.doc_mg` 作為根目錄。優點更具彈性，防止未來移動目錄出錯。
  - 決策：採兼具方案（以 `parent.parent.parent` 為預設，並具備尋找工作區標識的容錯機制）。
- **硬性禁止動作 (Guardrails)**：嚴禁整檔覆寫任務檔、嚴禁對 workspace 檔案傳遞 ArtifactMetadata、嚴禁更動非關工具。

### 鎖定檔案 (Target Files)
- `./1.devtools/tools/code_skeleton.py` (L20-L30: 修正 REPO_ROOT 解析)
- `./1.devtools/tools/repo_radar.py` (L25-L35: 修正 REPO_ROOT 解析)
- `./1.devtools/tools/compact_log.py` (L25-L35: 修正 REPO_ROOT 解析)
- `./1.devtools/tools/analyze_task_tokens.py` (L35-L45: 驗證 REPO_ROOT 解析)

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

### Phase 1: 工具鏈根路徑解析缺陷修復與單元驗證 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 修復 `code_skeleton.py`、`repo_radar.py`、`compact_log.py` 的 `REPO_ROOT` 解析
    - **動作**: 將原本只退一層 `SCRIPT_DIR.parent` (指向 `1.devtools`) 改為退兩層指向專案根目錄，支援相對路徑正確解析。
    - **驗證 (Exit 0 / 客觀指標)**: `py 1.devtools/tools/repo_radar.py outline .agents/rules.md` 與 `py 1.devtools/tools/code_skeleton.py 1.devtools/tools/code_skeleton.py --save 0.doc_mg/tasks/tmp/tmp_probe_toolchain_test.md` 均正常 Exit 0 輸出至正確目錄。
- [x] 任務 1.2: 測試情報雷達四大模式 (map, outline, section, symbol)
    - **動作**: 分別執行 `repo_radar.py map`、`outline`、`section`、`symbol` 驗證其觸發與效用。
    - **驗證 (Exit 0 / 客觀指標)**: 各命令正確輸出且毫秒級返回。

> 🏁 **Phase 1 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`（若遇突發阻礙則標記 `[BLOCKED]` 並附錯誤快照，撤回髒代碼後停步開新會話）。
> - [x] 將關鍵結果以單行緊湊摘要寫入「7. 狀態收斂歷程」。
> - [x] Phase 結尾批次打勾同步任務檔（作為本輪最後工具呼叫，局部替換 ≤ 50~80 行）。
> - [x] 遵循「One Phase, One Session」物理隔絕底線：於回覆末尾強制輸出開立新 Session 接力提示詞代碼塊，嚴禁於本會話連續推進下一階段。

### Phase 2: 工具調用效能與脫水效益綜合分析 狀態：`[已完成]`
- [x] 任務 2.1: 測試 `compact_log.py` 終端日誌脫水過濾效用
    - **動作**: 透過管線串接刻意產生長堆疊之指令，測量日誌壓縮比率。
    - **驗證 (Exit 0)**: 成功過濾堆疊與 node_modules 雜訊，僅保留關鍵報錯與定位，脫水率達到 90.4% (Exit 0)。
- [x] 任務 2.2: 測試 `analyze_task_tokens.py` 與 `token_estimator.py` 水位預警能力
    - **動作**: 修復 `analyze_task_tokens.py` 之 `antigravity/brain` 目錄辨識，執行水位評估與 Task 檔案關聯日誌萃取。
    - **驗證 (Exit 0)**: 正常輸出水位預警指標與 Top-Heavy 步驟，Session 1 峰值 109k 成功示警，Session 2 隔離降至 38.7k (Exit 0)。

> 🏁 **Phase 2 Checkpoint (狀態收斂區)**：
> - [x] 階段所有單元驗證已通過 (Exit 0)。
> - [x] 狀態標記為 `[已完成]`。
> - [x] 將關鍵結果寫入「7. 狀態收斂歷程」。
> - [x] 輸出接力提示詞代碼塊。

### Phase Final: 自動化審計驗收與任務歸檔 狀態：`[已完成]`
- [x] 任務 F.1: 整合自動化審計與全域符號快取更新
    - **動作**: 執行 `py 1.devtools/tools/audit_suite.py --compact` 與 `py 1.devtools/tools/generate_symbol_index.py`。
    - **驗證 (Exit 0)**: 5/5 插件 Manifest V3 合規，跨插件邊界與 SSOT 檢核全數通過，符號索引成功生成 347 符號 22 文檔 (Exit 0)。
- [x] 任務 F.2: 自動化工具合規審計 (Manifests)
    - **動作**: 執行 `py 1.devtools/tools/audit_manifests.py`。
    - **驗證 (Exit 0)**: 5 款插件 Manifest 完全通過檢測 (Exit 0)。
- [x] 任務 F.3: 雙層任務歸檔下沉與 SSOT 結案
    - **動作**: 依 Target SSOTs 勾選 N/A 豁免（純工具優化），執行 `py 1.devtools/tools/task_cli.py archive` 移入歸檔緩衝區。
    - **驗證 (Exit 0)**: `0.doc_mg/tasks/` 根目錄保持純淨零結案。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback) [選填/重大架構適用，常態任務豁免]
- **最可能失敗場景 (Pre-Mortem)**：
- **降級/回滾方案 (Blast Radius Control)**：
- **熔斷與突發隔離機制**：單一問題重試上限 2 次 (2-Strike 熔斷)；遇次生突發錯誤標記 `[BLOCKED]`、還原髒代碼後強制停步，開立新會話處理。

## 6. 驗收標準 (Acceptance Criteria)

- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁（本任務為全域工具鏈，N/A）。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（已執行 audit_suite 與 audit_manifests 5/5 全數 PASS）。
- [x] **工具鏈合規審查 (Devtools Audit)**:
  - [x] **探勘階段**: 檔案逾 100 行時已優先調用骨架/雷達工具 (`code_skeleton.py` / `repo_radar.py`)，無直接全檔 dump 行為。
  - [x] **建置與終端**: 長篇輸出已串接日誌脫水過濾 (`compact_log.py` 或 `rtk`)，無原始長篇 log 污染。
  - [x] **合規與合約審計**: 若涉及 Manifest 或文檔變更，已執行自動審計腳本 (`audit_manifests.py` / `audit_suite.py`) 確保通過。
- [x] **四層 SSOT 閉環 (90/10 分級)**:
  - [x] [N/A] 輕量任務豁免 (無結構變動，L1~L3 免比對免回寫)
  - [ ] 重大架構同步完成 (已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼)
  - [x] L4 任務生命週期: 任務結案後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **強制收尾 (Mandatory Closure)**: 回報任務完成或對話結束前，最後一個工具呼叫必須是更新、打勾或收斂本 task 檔案 (嚴格遵守 ≤ 50~80 行局部替換唯一語意區塊，落實 Phase 結尾批次打勾)。
- [x] **插件驗證**: 已驗證工具鏈功能與插件 Manifest 合規，各項功能正常無報錯。

## 7. 狀態收斂歷程 (Condensed History)

- [2026-10-29] 藍圖建立完成 (Session 1)
- [2026-10-29] Phase 1 完成: 修復 code_skeleton, repo_radar, compact_log 根路徑解析 (detect_repo_root)，通過 radar 四大模式單元驗證 (Exit 0) (Session 2)
- [2026-10-29] Phase 2 完成: compact_log 終端日誌脫水率達 90.4%；健全化 analyze_task_tokens 之 antigravity/brain 支援，多對話水位評估全數 Exit 0 (Session 3)
- [2026-10-29] Phase Final 完成: 整合審計 5/5 插件 MV3 PASS，生成全域符號索引 (347 符號 22 文檔)，完成歸檔與 SSOT 閉環 (Session 4)

## 8. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [x] 結案前已執行 `audit_suite.py` 完成自動化驗證。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 `code_skeleton.py` 與 `task_cli.py` 介面骨架，平均節省 >75% Token，輸出快取路徑修復驗證通過
> - `repo_radar.py`: 驗證 map, outline, section, symbol 四大模式，平均耗損 <80 tokens/次
> - `compact_log.py`: 終端日誌雜訊脫水，原始 1832 字元 ➔ 精簡 176 字元，減少 90.4% 雜訊
> - `analyze_task_tokens.py`: 健全化 brain 搜尋路徑，秒級探針 (115ms) 與多 Session 水位預警驗證通過
> - `task_cli.py`: 成功初始化任務檔並自動 `git add` 納入防護；執行 `archive` 自動歸檔任務
> - `audit_suite.py`: 整合審計 Exit 0 通過 (耗時 0.77s)
> - `generate_symbol_index.py`: 全域符號索引秒級生成 (347 核心符號 / 22 篇大綱，耗時 0.08s)
>
> **參與對話 ID 紀錄**:
> - [2026-10-29] ID: 346609ff-45d2-4d0c-96dc-c01012840c23 (Gate 1 藍圖建立)
> - [2026-10-29] ID: dc4b8896-437f-4afd-8b59-0f3d4ea081c6 (Phase 1 工具鏈修復與雷達驗證)
> - [2026-10-29] ID: 70c2d496-ef41-45ee-96c6-1b2fe60cfa9b (Phase 2 日誌脫水與水位分析驗證)
> - [2026-10-29] ID: b295728c-72ed-49fd-9377-a462b712027d (Phase Final 自動化審計驗收與任務歸檔)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務已結案並完成歸檔，工作區純淨零結案。無需開立接力會話。
