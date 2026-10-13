---
title: "提取與封裝全專案 Token 節省機制與跨專案移植套件"
plugin: "global"
status: "已完成"
created: "2026-10-10"
deadline: "2026-10-11"
---

## 1. 目標
整理目前 Chrome Plus 專案中完整成套之 Token 節省機制（包含三階段門禁 3-Gate Protocol、代碼骨架提煉 code_skeleton、終端日誌脫水 compact_log、情報雷達 repo_radar、局部讀寫合約、會話重置協議以及四層 SSOT 90/10 分級瘦身等），轉寫一份完整架構與整合說明文檔，並將核心工具鏈、技能與範本打包複製至 `draft/token_optimization_kit/`，供使用者無縫移植至其他軟體專案。

## 2. 策略與鎖定檔案

### 實作策略
1. **來源檢視與盤點**：整合 `0.doc_mg/docs/token_optimization_guide.md`、`.agents/skills/token-saver/`、`.agents/skills/repo-radar/`、`.agents/skills/task-protocol/`、`GEMINI.md` 與 `1.devtools/tools/` 相關腳本。
2. **撰寫統整指南文檔**：撰寫跨專案通用之《AI 輔助開發極致 Token 節約工程架構與移植指南》，詳述設計哲學、5 大 Token 消耗黑洞、4 大節省核心機制、武器庫鏈條與落地工作流。
3. **打包獨立套件目錄**：於 `draft/token_optimization_kit/` 下組織完整獨立目錄結構（`docs/`、`skills/`、`tools/`、`templates/`、`README.md`），複製所有關聯實體檔案並解除 Chrome 專案專用耦合，確保直接拷貝即可於任何專案即插即用。

### 鎖定檔案 (Target Files)
- `0.doc_mg/tasks/task_20261010_global_token_optimization_bundle.md`
- `draft/token_optimization_kit/README.md`
- `draft/token_optimization_kit/docs/token_optimization_guide.md`
- `draft/token_optimization_kit/tools/code_skeleton.py`
- `draft/token_optimization_kit/tools/compact_log.py`
- `draft/token_optimization_kit/tools/repo_radar.py`
- `draft/token_optimization_kit/tools/generate_symbol_index.py`
- `draft/token_optimization_kit/tools/run_py.js`
- `draft/token_optimization_kit/skills/token-saver/SKILL.md`
- `draft/token_optimization_kit/skills/repo-radar/SKILL.md`
- `draft/token_optimization_kit/skills/task-protocol/SKILL.md`
- `draft/token_optimization_kit/templates/task_template_v2.md`
- `draft/token_optimization_kit/templates/RULES_SNIPPET.md`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (本任務為文件與 Draft 打包任務，無核心插件元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`./.agents/skills/[plugin]-core/SKILL.md`
- [ ] L2 插件導航：`./[plugin]/[PLUGIN]_README.md`
- [ ] L3 業務規格：`./[plugin]/docs/[feature]-spec.md`
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 建立打包目錄結構與複製核心工具/技能 狀態：`[已完成]`
- [x] 任務 1.1: 建立 `draft/token_optimization_kit/` 及其子目錄（`docs/`、`skills/`、`tools/`、`templates/`）
- [x] 任務 1.2: 複製核心工具腳本（`code_skeleton.py`、`compact_log.py`、`repo_radar.py`、`generate_symbol_index.py`、`run_py.js`）至 `draft/token_optimization_kit/tools/`
- [x] 任務 1.3: 複製核心專家技能（`token-saver/`、`repo-radar/`、`task-protocol/`）至 `draft/token_optimization_kit/skills/`
- [x] 任務 1.4: 複製任務範本 `task_template_v2.md` 至 `draft/token_optimization_kit/templates/`

### Phase 2: 編撰跨專案通用說明文檔與移植指引 狀態：`[已完成]`
- [x] 任務 2.1: 撰寫 `draft/token_optimization_kit/docs/token_optimization_guide.md`（完整架構、5 大黑洞、4 大機制、武器庫規範）
- [x] 任務 2.2: 撰寫 `draft/token_optimization_kit/templates/RULES_SNIPPET.md`（提供可直接複製貼入新專案 `GEMINI.md` 或 `AGENTS.md` 的精簡規則範本）
- [x] 任務 2.3: 撰寫 `draft/token_optimization_kit/README.md`（跨專案移植安裝說明、依賴項、各工具使用速查表）

### Phase 3: 驗收、完整性校驗與任務歸檔 狀態：`[已完成]`
- [x] 任務 3.1: 驗證 `draft/token_optimization_kit/` 所有檔案結構與執行語法完整性
- [x] 任務 3.2: 實體同步 `task.md` 打勾與收斂
- [x] 任務 3.3: 依照封存協議將任務移動至 `0.doc_mg/tasks/archive/global/` 歸檔

## 4. 影響評估
- 本任務純粹為新增參考資料與工具複製至 `draft/` 目錄，不修改既有外掛原始碼與運行設定，對既有系統零相容性衝擊。
- 打包之 Python 工具皆依賴標準函式庫（Python 3.8+），移植至其他專案無外部 pip 套件強制相依性。

## 5. 驗收標準
- [x] **技術指標**: 打包檔案結構清晰，不含本機絕對路徑，所有參照皆為工作區相對路徑。
- [x] **核心規範**: 完整涵蓋專案所有 Token 節省機制（3-Gate、code_skeleton、compact_log、repo_radar、局部讀寫、會話重置、SSOT 90/10 閉環）。
- [x] **檔案編碼**: 確認所有新增之 Markdown 與腳本檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: [N/A] 輕量任務豁免，不改動既有外掛核心結構。
- [x] **L4 任務封存歸檔**: 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/global/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> **參與對話 ID 紀錄**:
> - 2026-10-10 ID: bc7594dd-835f-4bbc-b241-53e18c1aff84 (初始化 Gate 1 藍圖)
> - 2026-10-10 ID: 663fee88-2263-40b4-9e19-b5e6a845e387 (完成 Phase 1 目錄結構與核心檔案打包複製)
> - 2026-10-10 ID: 187afcd7-ee13-487d-826e-6f2ea8baea51 (完成 Phase 2 跨專案通用文檔、規則範本與 README 編撰)
> - 2026-10-10 ID: 3360177f-c5d1-4ba6-9ae5-6ad40761691d (完成 Phase 3 驗收校驗與任務歸檔)
>
> **跨會話接力狀態 (Session Handover)**:
> 任務全數結案，已移至歸檔區，無後續接力階段。

