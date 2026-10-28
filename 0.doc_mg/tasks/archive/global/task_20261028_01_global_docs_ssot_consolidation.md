---
title: "0.doc_mg/docs 文件 SSOT 盤點與孤兒重疊文檔整合治理"
plugin: "global"
status: "已完成"
created: "2026-10-28"
deadline: "2026-10-28"
appetite: "1h"
complexity_budget: "Max 3 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 4 (Phase 3 Completed -> Gate 3 Consolidated)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：檢查 `0.doc_mg/docs` 中現有 12 份文件是否皆具備 SSOT 定位或被系統關聯引用，杜絕「孤兒檔案」；對獨立無主、歷史過期或內容重複的文檔進行深度分析，提出評估與整合治理方案。
- **核心目標**：
  1. 盤點 `0.doc_mg/docs` 全部 12 份文檔之 SSOT 定位與全域活躍引用情況。
  2. 識別並標記「核心 SSOT (7 份)」、「配套指南 (1 份)」、「重複冗餘 (1 份)」、「孤兒業務分析 (2 份)」與「歷史審計報告 (1 份)」。
  3. 整合重複內容（消除 `chrome_agent_optimization.md` 重複維護問題），治理孤兒檔案（整合或建立索引），建立 `0.doc_mg/docs/SSOT_README.md` (中央 SSOT 總覽導航)，確保文檔目錄 100% 具備 SSOT 定位與雙向關聯。
- **邊界與假設**：僅限治理 `0.doc_mg/docs` 目錄及相關引用其文檔的技能與設定（如 `chrome-auditor/SKILL.md`），不修改各插件業務程式碼。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `.agents/rules.md`、`GEMINI.md`、`0.doc_mg/docs/dev_standards.md`、`0.doc_mg/docs/token_optimization_guide.md`。
- **影響範圍地圖 (Entity Map)**：
  - `0.doc_mg/docs/` 全體 12 份文件
  - 新建：`0.doc_mg/docs/SSOT_README.md` (全域文檔索引與 SSOT 地圖)
  - 待整合清理：`0.doc_mg/docs/chrome_agent_optimization.md` (併入 `dev_standards.md` & `token_optimization_guide.md`)
  - 待歸檔遷移：`0.doc_mg/docs/task_protocol_bottleneck_analysis_20261013.md` (移入 `0.doc_mg/draft/archive/`)
  - 待建立雙向索引：`0.doc_mg/docs/pm_workflow_friction_matrix.md`、`0.doc_mg/docs/analyst_workflow_friction_matrix.md`、`0.doc_mg/docs/gas_deployment_guide.md`
  - 引用更新：`.agents/skills/chrome-auditor/SKILL.md` (移除重複引用)
- **全域檔案盤點與診斷矩陣**：
  | 序號 | 檔案名稱 | 活躍引用數 | 類型判定 | 診斷分析與處置方案 |
  | :--- | :--- | :--- | :--- | :--- |
  | 1 | `cross_plugin_contract.md` | 31 | 核心 SSOT | 跨插件黑盒契約最高真理源，保留並設為頂層核心規格。 |
  | 2 | `dev_standards.md` | 3 | 核心 SSOT | 插件技術規範 (MV3, Shadow DOM) 最高真理源，保留。 |
  | 3 | `token_optimization_guide.md` | 2 | 核心 SSOT | Token 節省技術最高真理源，保留。 |
  | 4 | `task_manager.md` | 4 | 核心 SSOT | 任務協議管理與 4-Gate 流程真理源，保留。 |
  | 5 | `repo_radar_ai_prompt_instructions.md` | 3 | 核心 SSOT | Repo Radar 工具提示詞真理源，保留。 |
  | 6 | `versioning_spec.md` | 2 | 核心 SSOT | 語意化版本與發布真理源，保留。 |
  | 7 | `google_ecosystem_integration_spec.md` | 5 | 核心 SSOT | Google 生態系雙軌串接真理源，補齊對 `gas_deployment_guide.md` 之鏈接。 |
  | 8 | `gas_deployment_guide.md` | 1 | 配套指南 | GAS 部署操作手冊，非獨立規格。於 `README.md` 及主規格書補正為一級配套手冊。 |
  | 9 | `chrome_agent_optimization.md` | 1 | 重複冗餘 | 內容與 `dev_standards.md` 及 `token_optimization_guide.md` 100% 重複。評估合併後刪除/封存，更新 `chrome-auditor` 技能。 |
  | 10 | `analyst_workflow_friction_matrix.md` | 1 | 業務矩陣 | 投研員摩擦力矩陣，僅 1 處弱引用。納入中央文檔地圖，與 PM 矩陣成對管理。 |
  | 11 | `pm_workflow_friction_matrix.md` | 0 | 孤兒檔案 | 專案經理摩擦力矩陣，無任何活躍檔案引用。納入中央文檔地圖，終結孤兒狀態。 |
  | 12 | `task_protocol_bottleneck_analysis_20261013.md` | 0 | 歷史審計 | 單次特定日期事後審計報告，非活體規範。移至 `0.doc_mg/draft/archive/` 封存。 |

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：徹底消除 `chrome_agent_optimization.md` 與現有 SSOT 的雙重真理衝突。
- **防護措施**：
  - 嚴禁更動各 Chrome 插件源碼。
  - 對於移動檔案或廢止檔案，需檢查並同步修正所有調用端路徑，杜絕死鏈。
  - 建立 `0.doc_mg/docs/SSOT_README.md`，使所有留存文檔皆有頂層導航，實現「零孤兒 (Zero-Orphan)」。

### 鎖定檔案 (Target Files)
- `0.doc_mg/docs/SSOT_README.md` (新建)
- `0.doc_mg/docs/chrome_agent_optimization.md` (待處理)
- `0.doc_mg/docs/task_protocol_bottleneck_analysis_20261013.md` (待遷移)
- `0.doc_mg/docs/google_ecosystem_integration_spec.md` (微調補充引用)
- `.agents/skills/chrome-auditor/SKILL.md` (調整 SSOT 依賴)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/chrome-auditor/SKILL.md`
- [x] L2 插件導航：`./0.doc_mg/docs/SSOT_README.md` (新建中央文檔地圖)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/`

## 4. 任務拆解與連續驗證 (Atomic Execution)

### Phase 1: 建立中央文檔地圖與補齊關聯索引 [Session 2]
- [x] 任務 1.1: 建立 `0.doc_mg/docs/SSOT_README.md` (中央 SSOT 總覽導航)，分門別類索引所有規範與業務手冊。
- [x] 任務 1.2: 於 `google_ecosystem_integration_spec.md` 中補充對 `gas_deployment_guide.md` 的前導導航。
- [x] 任務 1.3: 將 `analyst_workflow_friction_matrix.md` 與 `pm_workflow_friction_matrix.md` 明確註冊為雙軌業務場景矩陣。

### Phase 2: 消除內容重複與歷史檔案歸檔 [Session 3]
- [x] 任務 2.1: 驗證 `chrome_agent_optimization.md` 內容均已在 `dev_standards.md` 與 `token_optimization_guide.md` 涵蓋。
- [x] 任務 2.2: 更新 `.agents/skills/chrome-auditor/SKILL.md` 移除對 `chrome_agent_optimization.md` 之重複依賴。
- [x] 任務 2.3: 將 `chrome_agent_optimization.md` 標註廢止或移除，並將歷史審計報告 `task_protocol_bottleneck_analysis_20261013.md` 移入 `0.doc_mg/draft/archive/`。

### Phase 3: 全域自動化死鏈與合規驗收 [Session 4]
- [x] 任務 3.1: 執行交叉引用檢查腳本，驗證 `0.doc_mg/docs` 內所有檔案均有 ≥1 處活躍引用，孤兒數降為 0。
- [x] 任務 3.2: 驗收 Exit 0，封存任務文檔至 `0.doc_mg/tasks/archive/global/`。

## 5. 驗收結果總結 (Gate 3 Summary)
- **孤兒文檔治理**：`0.doc_mg/docs` 下保留之 11 份真理文檔活躍引用均 ≥ 3 處，孤兒文檔數清零（0）。
- **重複與廢止治理**：
  - `chrome_agent_optimization.md` 完全移至 `0.doc_mg/draft/archive/`，全域殘留引用清零（0）。
  - `task_protocol_bottleneck_analysis_20261013.md` 成功歸檔至 `0.doc_mg/draft/archive/`。
- **中央 SSOT 導航建立**：新建 `0.doc_mg/docs/SSOT_README.md`，並同步掛載至專案根目錄 `README.md` 目錄樹。
- **自動化門禁套件**：執行 `python 1.devtools/tools/audit_suite.py`，全數門禁通過，確認 Exit 0 綠燈結案。
