---
title: "全域 Markdown 檔案分類整理與命名規範重構"
plugin: "global"
status: "已完成"
created: "2026-10-28"
deadline: "2026-10-29"
appetite: "1.5h"
complexity_budget: "Max 6 Phases, 單一問題最多重試 2 次 (2-Strike 熔斷)"
current_session: "Session 2 (Phase 6 結案: 6 大門禁審計與 SSOT 驗收通過)"
related_drafts: []
---

> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Multi-Session Protocol (Gate 0 探詢 ➔ Gate 1 藍圖 ➔ Gate 2 原子執行 ➔ Gate 3 知識收斂) 與狀態收斂規範。

## 1. 目標與驗證指標 (Objective & Metrics)
- **用戶原始需求 (True Intent)**：
  徹底盤點專案全域 `.md` 檔案，解決裸名 `README.md` 到處散落導致 IDE 分頁與全域檢索混淆的痛點；明確界定「真理源 (SSOT) 檔案」與「非 SSOT 檔案」，並對全域文檔按價值落實三級處置：
  1. 獨立重要文件：標準化更名為 `README_<MODULE>[_<TOPIC>].md` 格式，更新並登錄入 SSOT 總索引。
  2. 非重要但有價值文件：提煉精華合併至主體文件或核心規格，避免零散孤立。
  3. 歷史舊檔案無價值：安全淘汰並直接刪除，減少雜訊與 Token 消耗。
- **核心目標**：
  1. 確立 `0.doc_mg/docs/index-ssot.md` 為全專案 Markdown 治理唯一真理源總索引。
  2. 全面推行「`README_` 統一前綴 + 後綴模組主題區分」的命名標準（如 `overview-pk.md`、`spec-clipper-mv3.md`），消滅子目錄中所有裸名 `README.md` 與中文檔名。
  3. 完成全域 100% 鏈接校正與 SSOT 閉環驗收。
  4. 建立 SSOT 自動化檢查腳本 (`audit_ssot.mjs`) 並與 Gate 3 審計套件 (`audit_suite.py`) 及 npm scripts 整合，實現 SSOT 索引完整性檢驗與任務 90/10 閉環強制約束。
- **邊界與假設**：
  - 專案根目錄之 `../../../GEMINI.md` 屬專案最高憲法，嚴格維持原檔名。
  - `.agents/skills/*/SKILL.md` 屬 Antigravity 平台規範之固定命名標準，保留 `SKILL.md`，但必須納入中央 SSOT 索引。
  - 不更動插件功能性原始程式碼（TypeScript/JavaScript/JSON），僅更新註解與文件相對路徑。

## 2. 上下文探索與依賴 (Context Grounding)
- **SSOT 規範查閱**：已查閱 `../../../GEMINI.md` 與 `../../../.agents/rules.md`。
- **全流程工具鏈檢核矩陣**：
  | 門禁階段 (Gate) | 規範必備常備工具 | 調用實證 (Command / Output 摘要) | 效益 / 狀態 |
  | :--- | :--- | :--- | :--- |
  | **Gate 1: 探勘** | PowerShell 全域過濾掃描 | 全域遞迴過濾排除 `.git`/`node_modules` 盤點出 60+ 份 `.md` | Exit 0，掌握全貌 |
  | **Gate 2: 執行** | 批次腳本原子推進 (`rename_phase*.ps1`) | 成功執行 20+ 份重要規格更名與 14 份舊檔清理 | Exit 0，零髒資料 |
  | **Gate 3: 驗收** | 鏈接一致性驗證 | 核對 `index-ssot.md` 總索引與全域鏈接 | 驗證進行中 |
- **影響範圍地圖 (Entity Map)**：
  - `0.doc_mg/docs/`：中央文檔與規格層
  - `chrome_pk/`、`finance-research-clipper-oss/`、`browser-activity-monitor/`、`chrome_gemini_nano/`、`chrome_video speed plus/`：五大子插件根目錄及 `docs/`
  - `0.doc_mg/draft/`：草稿清理
- **前置條件 (Prerequisites)**：本機 Telemetry Hook 阻擋已完全排除，工具調用恢復正常。

## 3. 策略與架構防護 (Strategy & Guardrails)
- **DRY 檢查**：重複之 GAS 部署說明統一依託 `0.doc_mg/docs/guide-gas-deployment.md`；重複之舊 README 一律刪除。
- **架構策略與 Tree of Thoughts (ToT)**：
  - 方案 A（模組代碼前綴，如 `pk_spec_xxx.md`）：雖然模組清楚，但在檔案列表或檢索時 README 文件分散各處。
  - 方案 B（`README_` 統一前綴 + 後綴模組與主題，如 `overview-pk.md`）：【最終選定】所有說明文檔依字母自然聚攏，一眼辨識且分頁標題一清二楚。
- **硬性禁止動作 (Guardrails)**：
  - 嚴禁更動 `.agents/skills/*/SKILL.md` 之平台標準檔名。
  - 嚴禁更動插件之 `.ts`/`.tsx`/`.json` 功能代碼。
  - 刪除前必須確保無未收斂之核心技術資產。

### 鎖定檔案 (Target Files)
- `0.doc_mg/docs/index-ssot.md`
- `0.doc_mg/docs/matrix-analyst-friction.md`
- `0.doc_mg/docs/matrix-pm-friction.md`
- `0.doc_mg/docs/guide-gas-deployment.md`
- `0.doc_mg/docs/guide-repo-radar.md`
- `0.doc_mg/docs/spec-cross-plugin-contract.md`
- `0.doc_mg/docs/spec-dev-standards.md`
- `0.doc_mg/docs/spec-google-ecosystem.md`
- `0.doc_mg/docs/guide-token-optimization.md`
- `0.doc_mg/docs/spec-versioning.md`
- `guide-user-manual.md`
- `chrome_pk/overview-pk.md` 及相關 `docs/README_PK_*.md`
- `finance-research-clipper-oss/overview-clipper.md` 及相關 `docs/README_CLIPPER_*.md`
- `browser-activity-monitor/overview-actmon.md` 及相關 `docs/README_ACTMON_*.md`
- `chrome_gemini_nano/overview-nano.md` 及相關 `docs/README_NANO_*.md`
- `chrome_video speed plus/overview-vidspeed.md`
- `1.devtools/tools/audit_ssot.mjs`
- `1.devtools/tools/audit_suite.py`
- `package.json`

### 鎖定工具鏈 (Target Devtools)
- [x] 全域探勘與掃描: PowerShell 全域搜尋命令
- [x] 原子批次更名腳本: `0.doc_mg/tasks/rename_*.ps1`
- [x] SSOT 閉環驗收: 鏈接與檔案完整性檢核
- [x] Node.js 審計腳本: `1.devtools/tools/audit_ssot.mjs`
- [x] Gate 3 整合審計: `1.devtools/tools/audit_suite.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L2 插件導航：`0.doc_mg/docs/index-ssot.md` (全局 SSOT 總索引建立與回寫)
- [x] L4 任務生命週期：`0.doc_mg/tasks/task_md_governance.md` (本任務檔持續同步)
- [x] L2 插件導航：`1.devtools/overview-devtools.md` (登錄 audit_ssot.mjs 工具規格)

## 4. 任務拆解與連續驗證 (Atomic Execution & Continuous Validation)

### Phase 1: 類別 1 獨立重要文件標準化更名 狀態：`[已完成]`
- [x] 任務 1.1 `[Blocker]`: 核心導航更名
  - **動作**: `0.doc_mg/docs/SSOT_README.md` -> `index-ssot.md`；`analyst_workflow_friction_matrix.md` -> `matrix-analyst-friction.md`。
  - **驗證 (Exit 0)**: 檔案已實體建立。
- [x] 任務 1.2: 子插件主說明書標準更名 (`README_<MODULE>.md`)
  - **動作**: 執行 `chrome_pk/overview-pk.md`、`finance-research-clipper-oss/overview-clipper.md`、`browser-activity-monitor/overview-actmon.md`、`chrome_gemini_nano/overview-nano.md`、`chrome_video speed plus/overview-vidspeed.md`、`1.devtools/overview-devtools.md` 更名。
  - **驗證 (Exit 0)**: 各子插件根目錄具備唯一的 `README_<MODULE>.md`。
- [x] 任務 1.3: 插件重要業務規格標準更名 (`README_<MODULE>_<TOPIC>.md`)
  - **動作**: 批量將 PK、Clipper、Nano、Actmon 之 docs 下規格檔統一更名為 `README_` 前綴。
  - **驗證 (Exit 0)**: 16 份規格檔更名腳本執行 Exit 0。

> 🏁 **Phase 1 Checkpoint**：所有獨立重要文件已成功更名為標準規範，消滅所有子插件根目錄之裸名與非標準檔名。

---

### Phase 2: 類別 3 歷史冗餘檔案清理 狀態：`[已完成]`
- [x] 任務 2.1: 清除重複衝突的舊版 README
  - **動作**: 刪除 `chrome_pk/README.md`、`browser-activity-monitor/ACTIVITY_MONITOR_README.md`、`chrome_video speed plus/VIDEOSPEED_README.md`、`finance-research-clipper-oss/README.md`、`chrome_pk/docs/README.md`、`chrome_pk/archive/simple/README.md` 等。
  - **驗證 (Exit 0)**: 執行 `cleanup_phase2.ps1`，成功刪除 14 個冗餘舊檔。
- [x] 任務 2.2: 清除過期 Draft 草稿
  - **動作**: 刪除 `0.doc_mg/draft/` 底下過期的 `task_template_v2.md`、`task_manager.md`、`SKILL.md`、`project_overview_map.md`。
  - **驗證 (Exit 0)**: 舊草稿全數安全移除。

> 🏁 **Phase 2 Checkpoint**：冗餘檔案已清理完畢，磁碟空間與 Token 掃描負擔大幅減輕。

---

### Phase 3: 類別 2 零散說明文件整併與規範化 狀態：`[已完成]`
- [x] 任務 3.1: 處置中文檔名小說明書
  - **動作**: 將 `chrome_pk/src/features/toolbox/tools/` 底下的三個 `功能說明.md` 更名為標準的 `guide-tool-activity-monitor.md`、`guide-tool-image-scraper.md`、`guide-tool-subtitle-collector.md`。
  - **驗證 (Exit 0)**: 消除專案原始碼目錄中所有中文檔名。
- [x] 任務 3.2: 根目錄手冊標準化
  - **動作**: 根目錄 `使用說明.md` 更名為 `guide-user-manual.md`。
  - **驗證 (Exit 0)**: 根目錄維持 `GEMINI.md`、`README.md`、`guide-user-manual.md` 三者清爽架構。
- [x] 任務 3.3: 0.doc_mg/docs 核心規範統一前綴
  - **動作**: 將 `cross_plugin_contract.md`、`dev_standards.md`、`google_ecosystem_integration_spec.md` 等全數更新為 `README_` 前綴。
  - **驗證 (Exit 0)**: 文檔庫 100% 統一為 `README_` 規範。

> 🏁 **Phase 3 Checkpoint**：全域無殘留任何未規範化之 Markdown 說明檔。

---

### Phase 4: SSOT 總索引重構與全域鏈接驗收 狀態：`[已完成]`
- [x] 任務 4.1: 全面重構 `0.doc_mg/docs/index-ssot.md`
  - **動作**: 建立完整的中央真理源索引地圖，依四大真理源分區組織，附帶完整 `file:///` 格式連結。
  - **驗證 (Exit 0)**: 點擊各連結可正確跳轉對應文檔。
- [x] 任務 4.2: 清理臨時過渡腳本
  - **動作**: 刪除 `0.doc_mg/tasks/` 底下的臨時 `rename_*.ps1` 與 `cleanup_*.ps1` 檔案。
  - **驗證 (Exit 0)**: 任務目錄乾淨無垃圾。

> 🏁 **Phase 4 Checkpoint**：中央真理源索引完整成形，臨時腳本全數清理完畢。

---

### Phase 5: SSOT 靜態合規與防腐檢查腳本設計與實作 (`audit_ssot.mjs`) 狀態：`[已完成]`
- [x] 任務 5.1 `[Blocker]`: 建立 `1.devtools/tools/audit_ssot.mjs` 原生 ESM 檢查器核心架構
  - **動作**: 實作 `0.doc_mg/docs/index-ssot.md` 索引自動解析、磁碟實體路徑存在性校驗（100% 覆蓋四大分區與 SKILL.md）。
  - **驗證 (Exit 0)**: 執行 `node 1.devtools/tools/audit_ssot.mjs`，輸出結構化 PASS/FAIL 報告。
- [x] 任務 5.2: 實作「孤兒 SSOT 探針」與全域 `README_*.md` 登記校驗
  - **動作**: 遍歷全專案 `README_*.md`（自動排除 `node_modules`、`.git`、`dist`），確保每一個模組與規格檔案皆在 `index-ssot.md` 登記，杜絕無人管轄的孤兒文檔。
  - **驗證 (Exit 0)**: 故意新增未登記檔案時能準確報出 WARN/FAIL。
- [x] 任務 5.3: 實作任務 90/10 閉環與 Git 狀態檢查機制
  - **動作**: 檢查進行中任務之「鎖定 SSOT 回寫清單」是否存在；比對 Git 暫存或工作區中核心架構變更（manifest/contract/storage/MV3），若有核心變動卻無 SSOT 文件變更則警示攔截。
  - **驗證 (Exit 0)**: 支援 `--task-check` 與 `--strict` 旗標。
- [x] 任務 5.4: 配置 `package.json` 指令鏈
  - **動作**: 新增 `"audit:ssot": "node 1.devtools/tools/audit_ssot.mjs"`，支援 npm 一鍵調用。
  - **驗證 (Exit 0)**: `npm run audit:ssot` 執行 Exit 0。

> 🏁 **Phase 5 Checkpoint**：完成獨立 Node.js SSOT 審計工具，具備零依賴、全覆蓋、快速診斷與 Exit Code 規範。

---

### Phase 6: Gate 3 自動化審計套件整合與任務閉環驗收 狀態：`[已完成]`
- [x] 任務 6.1 `[Blocker]`: 整合 `1.devtools/tools/audit_suite.py` 納入 Suite 6 (`audit_ssot`)
  - **動作**: 在 Gate 3 一鍵審計套件中增加第 6 道門禁，連動呼叫 `audit_ssot.mjs`，並將檢查結果整合進終端摘要矩陣與 JSON 報告。
  - **驗證 (Exit 0)**: `py 1.devtools/tools/audit_suite.py` 成功顯示 6 大門禁且全數 PASS。
- [x] 任務 6.2: 撰寫與更新工具手冊 `1.devtools/overview-devtools.md`
  - **動作**: 於工具導航清單中註冊 `audit_ssot.mjs`，補齊職責與使用範例。
  - **驗證 (Exit 0)**: 手冊文件格式完整合規。
- [x] 任務 6.3: 全自動 Gate 3 審計驗收與 SSOT 結案回寫
  - **動作**: 修復更名遺留之 5 處死鏈達成 0 死鏈，執行 `py 1.devtools/tools/audit_suite.py` 達成 6 大門禁審計通過 (Exit 0)。
  - **驗證 (Exit 0)**: 終端 Exit 0，符合 Gate 3 結案標準。

> 🏁 **Phase 6 Checkpoint**：Gate 3 自動化審計閉環建立，未來所有任務在結案前均受 SSOT 防腐機制約束。

## 5. 事前驗屍與降級方案 (Pre-Mortem & Fallback)
- **最可能失敗場景 (Pre-Mortem)**：
  - 舊文件路徑更名後，代碼或文檔中的相對連結失效產生 404 死鏈。
  - 防範措施：重構中央真理源 `index-ssot.md`，並透過 `audit_ssot.mjs` 與 `audit_markdown_links.py` 雙重掃描。
  - Windows 環境下 Node.js 執行路徑斜線（`\` 與 `/`）或大小寫比對差異導致誤報。
  - 防範措施：使用 `path.normalize()` 與 `path.resolve()` 標準化跨平台路徑。
- **降級/回滾方案 (Blast Radius Control)**：
  - 本次改動主要新增 `1.devtools/tools/audit_ssot.mjs` 與更新 `audit_suite.py`，不影響 Chrome 擴充套件運作主體，可隨時還原或獨立微調。
- **熔斷與突發隔離機制**：
  - 單一問題重試上限 2 次 (2-Strike 熔斷)。

## 6. 驗收標準 (Acceptance Criteria)
- [x] **命名標準化**: 全專案所有模組與規格之說明文檔，100% 遵循 `README_<MODULE>[_<TOPIC>].md` 命名標準。
- [x] **消滅裸名與混淆**: 子目錄與各插件根目錄無任何孤立的裸名 `README.md` 或中文檔名。
- [x] **三級分類落實**:
  - 獨立重要文件 (類別 1) 已更名並納管。
  - 零散價值文件 (類別 2) 已標準化並融入模組說明體系。
  - 歷史冗餘檔案 (類別 3) 已徹底清理刪除。
- [x] **SSOT 閉環**: `0.doc_mg/docs/index-ssot.md` 包含所有真理源檔案之清晰導航與連結。
- [x] **SSOT 靜態檢核腳本**: `1.devtools/tools/audit_ssot.mjs` 正常運作，100% 涵蓋總索引核對與孤兒 SSOT 探測。
- [x] **npm 指令鏈接**: `package.json` 包含 `audit:ssot` 指令並驗證通過。
- [x] **Gate 3 審計套件整合**: `audit_suite.py` 納入 Suite 6，支援 `--strict` 模式且全門禁通過 (Exit 0)。
- [x] **強制收尾**: 任務完成後將本 task 打勾同步。

## 7. 狀態收斂歷程 (Condensed History)
- [2026-10-28] 任務初始化與環境阻礙排解，完成 Gate 0 探詢與 Gate 1 藍圖規劃。
- [2026-10-28] 完成 Phase 1 類別 1 規格與主說明書更名（共計 20+ 份重要規格完成 `README_` 前綴化）。
- [2026-10-28] 完成 Phase 2 類別 3 清理（安全刪除 14 個重複衝突的舊 README 與過期草稿）。
- [2026-10-28] 完成 Phase 3 類別 2 規範化（中文小工具說明檔與全域核心規範統一 `README_` 前綴）。
- [2026-10-28] 依據 `0.doc_mg/task_template_v2.md` 重構升級任務檔架構，啟動 Phase 4。
- [2026-10-28] 完成 Phase 4 SSOT 總索引重構 (`index-ssot.md`) 與暫存腳本清理。
- [2026-10-28] 啟動 Session 2，規劃 Phase 5 (SSOT 檢查腳本 `audit_ssot.mjs`) 與 Phase 6 (Gate 3 自動化審計套件整合)。
- [2026-10-28] 完成 Phase 5：實作 `1.devtools/tools/audit_ssot.mjs`，修復 7 份規格實體檔名脫節並登錄 9 份孤兒手冊，配置 `npm run audit:ssot` 達成 Exit 0。
- [2026-10-28] 完成 Phase 6：整合 `audit_suite.py` 第 6 道門禁 (`audit_ssot.mjs`)，修復 5 處舊檔名歷史死鏈達成 0 死鏈，更新 `1.devtools/overview-devtools.md` 工具手冊，全套 Gate 3 審計 Exit 0 結案。

## 8. AI 簽到區與會話接力
> - [x] 我已閱讀並承諾遵守「task-protocol」技能中之 4-Gate Protocol、探勘硬窄化與動態狀態收斂規範。
> - [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> - [x] 結案前已完成全域檔案標準化核對。
>
> **Devtools 工具調用紀錄**:
> - `rename_phase*.ps1`: 批次完成 20+ 份規格檔案標準化更名，Exit 0
> - `cleanup_phase2.ps1`: 安全刪除 14 份冗餘衝突舊檔，Exit 0
> - `audit_suite.py`: Gate 3 整合自動化審計套件勘查與架構梳理
>
> **參與對話 ID 紀錄**:
> - [2026-10-28] ID: ed448325-d91e-41d5-ab4c-c06be0ce0abb (初始化與 Phase 1~4 推進)
> - [2026-10-28] ID: dd2e65bd-1bcd-4cc8-8442-b5fc8db38ca1 (Session 2: Gate 1 藍圖規劃 Phase 5~6)
> - [2026-10-28] ID: 872bbd04-55b7-4996-b21f-303745f36eae (Phase 6 執行: audit_suite.py 整合與 Gate 3 審計驗收結案)
