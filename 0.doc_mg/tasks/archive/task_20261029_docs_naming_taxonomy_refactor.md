---
title: "全域文檔命名字典重構：消除全大寫 README 轉向語意化連字號分類"
plugin: "global"
status: "已完成"
created: "2026-10-29"
deadline: "2026-10-29"
appetite: "1.5h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 2 (Phase 1, 2, 3 Execution Completed -> Gate 3 Exit 0)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 3-Gate Multi-Session Protocol (Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  先前治理為防止裸名 `README.md` 衝突而強制採用 `README_<MODULE>[_<TOPIC>].md` 全大寫命名，導致全域文檔出現大量 SCREAMING_SNAKE_CASE，視覺噪訊過高、缺少單字上下輪廓極難閱讀。用戶明確要求：doc 中的系統管理文件與規格書不應叫做 readme，應全面改為全小寫連字號 (`kebab-case`)，並給予分類前綴 (`spec-`, `guide-`, `matrix-`, `flow-`, `overview-`, `index-`) 明確區分類型。
- **核心目標**：
  1. 徹底消除全專案 43 份文檔之全大寫 `README_` 前綴，建立小寫分類前綴標準。
  2. 重構 `0.doc_mg/docs/` 下 12 份系統管理文件與中央 SSOT 索引 (`index-ssot.md`)。
  3. 重構五大插件 (`chrome_pk`, `finance-research-clipper-oss`, `browser-activity-monitor`, `chrome_gemini_nano`, `chrome_video speed plus`) 及 `1.devtools` 內所有規格文件與模組首頁導航。
  4. 全域 Markdown 交叉引用原子替換，達成 0 死鏈。
  5. 升級 `1.devtools/tools/audit_ssot.mjs` 審計器規則，支援新版命名規範，確保 Gate 3 審計套件 (`py 1.devtools/tools/audit_suite.py`) 6 大門禁全數 Exit 0 綠燈。
- **邊界與假設**：
  - 專案根目錄 `GEMINI.md` 屬最高憲法，嚴格保持原名。
  - `.agents/skills/*/SKILL.md` 屬 Antigravity 平台固定標準，嚴格維持原名。
  - 不修改任何插件之核心業務邏輯代碼（`.ts`/`.tsx` 等），僅更新註解與相對文檔路徑。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `GEMINI.md`、`.agents/rules.md`、`0.doc_mg/docs/index-ssot.md`、`0.doc_mg/tasks/archive/task_md_governance.md`。
- [x] **全流程工具鏈強制檢核矩陣 (Tool Invocation Matrix / Token Guard - 實證制)**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | PowerShell 全域過濾盤點 | 盤點全專案 43 份待重構 `README_*.md` | Exit 0，掌握全貌 |
  | **Gate 2: 執行** | 自動化批次遷移與替換腳本 | `node 1.devtools/tools/audit_ssot.mjs` | 待 Session 2 執行 |
  | **Gate 3: 驗收** | `py 1.devtools/tools/audit_suite.py` | 整合 6 大門禁審計 | 待 Session 2 結案 |
- **影響範圍地圖 (Entity Map)**：
  - `guide-user-manual.md` -> `guide-user-manual.md`
  - `0.doc_mg/docs/` (12 份)
  - `chrome_pk/` (1 份首頁 + 13 份 docs + 3 份 tools)
  - `finance-research-clipper-oss/` (1 份首頁 + 5 份 docs)
  - `browser-activity-monitor/` (1 份首頁 + 1 份 docs)
  - `chrome_gemini_nano/` (1 份首頁 + 1 份 docs)
  - `chrome_video speed plus/` (1 份首頁)
  - `1.devtools/` (1 份首頁 + 1 份 scripts + `audit_ssot.mjs`)
- **前置條件 (Prerequisites)**：Git 工作區狀態清晰可控。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：延續既有 SSOT 索引架構，直接原地升級檔名與審計腳本，不重複造輪子。
- **架構策略與分類前綴規範**：
  - `index-`：中央索引導航 (`index-ssot.md`)
  - `overview-`：各插件模組總覽首頁 (`overview-pk.md`, `overview-clipper.md` 等)
  - `spec-`：硬性規格書、架構契約與資料結構 (`spec-dev-standards.md`, `spec-pk-gtd-kanban.md` 等)
  - `guide-`：操作手冊、工作流程指南 (`guide-token-optimization.md`, `guide-pk-ai-update.md` 等)
  - `matrix-`：業務分析、摩擦力矩陣 (`matrix-analyst-friction.md`, `matrix-pm-friction.md`)
  - `flow-`：狀態流轉、泳道圖 (`flow-pk-workflow.md`)
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁整檔覆寫任務檔，必須使用局部編輯。
  - 嚴禁修改非關功能代碼。
  - 單一問題重試上限 2 次 (2-Strike 熔斷)。

### 鎖定檔案 (Target Files)
- `0.doc_mg/docs/index-ssot.md` (原 `index-ssot.md`)
- `1.devtools/tools/audit_ssot.mjs`
- `package.json`

### 鎖定工具鏈 (Target Devtools)
- [x] 全域探勘與路徑盤點: PowerShell 遞迴過濾命令
- [ ] 審計套件驗收: `py 1.devtools/tools/audit_suite.py --compact`
- [ ] SSOT 靜態審計: `node 1.devtools/tools/audit_ssot.mjs`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L2 插件導航：`0.doc_mg/docs/index-ssot.md` (重構為新命名導航索引)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後歸檔)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 全域 43 份文檔實體批次更名 狀態：`[已完成]`
- [x] 任務 1.1: 執行 `0.doc_mg/docs/` 12 份系統管理文件與根手冊更名。
- [x] 任務 1.2: 執行 `chrome_pk/` 1 份首頁 + 13 份 docs + 3 份 tools 更名。
- [x] 任務 1.3: 執行 `finance-research-clipper-oss/`、`browser-activity-monitor/`、`chrome_gemini_nano/`、`chrome_video speed plus/`、`1.devtools/` 更名。
- [x] 驗證指標: 全域無任何非 node_modules 的 `README_*.md` 殘留，Exit 0。

### Phase 2: 全域 Markdown 與腳本交叉引用原子替換 狀態：`[已完成]`
- [x] 任務 2.1: 掃描全專案 `.md`、`.mjs`、`.py`、`.json`，批量替換舊檔名路徑為新檔名。
- [x] 任務 2.2: 驗證死鏈掃描器，確保全域引用無 404 斷鏈。

### Phase 3: 重構中央索引 index-ssot.md 與升級 audit_ssot.mjs 狀態：`[已完成]`
- [x] 任務 3.1: 全面重構 `0.doc_mg/docs/index-ssot.md`，反映新版 5 大分類前綴。
- [x] 任務 3.2: 升級 `1.devtools/tools/audit_ssot.mjs`，支援新版命名白名單與孤兒檢測。
- [x] 任務 3.3: 執行 `py 1.devtools/tools/audit_suite.py` 驗證 6 大門禁全數 PASS (Exit 0)。

## 5. 驗收標準 (Acceptance Criteria)
- [x] 全域文檔完全消除全大寫 `README_` 前綴。
- [x] 文檔嚴格遵從小寫連字號與分類前綴（`index-`, `overview-`, `spec-`, `guide-`, `matrix-`, `flow-`）。
- [x] 中央索引 `index-ssot.md` 結構完整，所有跳轉連結有效。
- [x] `node 1.devtools/tools/audit_ssot.mjs` 審計通過 (Exit 0)。
- [x] `py 1.devtools/tools/audit_suite.py` 6 大門禁全數通過 (Exit 0)。

## 6. 狀態收斂歷程 (Condensed History)
- [2026-10-29] 任務初始化，完成 Gate 1 藍圖規劃，確立全域 43 份文檔分類前綴映射表。
- [2026-10-29] 完成 Phase 1：透過 `git mv` 批次重命名 43 份文檔，完整保留 Git 歷史紀錄。
- [2026-10-29] 完成 Phase 2：全專案 24 個相關檔案中所有舊檔名引用完成原子替換，零死鏈。
- [2026-10-29] 完成 Phase 3：重構 `index-ssot.md` 與 `README.md`，升級 `audit_ssot.mjs` 支援 5 大分類前綴並攔截遺留全大寫檔名。Gate 3 審計套件 6 大門禁全數 Exit 0 綠燈通過。

