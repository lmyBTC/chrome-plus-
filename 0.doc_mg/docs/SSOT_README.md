# Chrome Plus 文檔管理中心與 SSOT 總覽導航 (Documentation Hub)

> [!IMPORTANT]
> **SSOT (Single Source of Truth) 單一真理源原則**：
> 本目錄 (`0.doc_mg/docs/`) 為 Chrome Plus 專案的全域架構、技術標準與跨插件通訊之最高真理源存放庫。
> 所有文檔皆具備明確的 SSOT 地位或業務角色導航，嚴禁存放孤兒文檔、未分類草稿或過期歷史日誌。

---

## 1. 核心架構與規範真理源 (Core Architecture & Standards)

此類別為本工作區最高層級之架構契約、技術守則與開發流程規範，所有插件與自動化工具必須嚴格遵循：

| 規範名稱 | 檔案路徑 | 核心範疇與定位 | 關聯技能 / 參照端 |
| :--- | :--- | :--- | :--- |
| **跨插件通訊黑盒契約** | [`cross_plugin_contract.md`](./cross_plugin_contract.md) | 定義跨插件鬆耦合事件總線、`UniversalGooglePayload` 與標準通訊協議 | 所有插件 README、`rules.md`、各 Core Skills |
| **Chrome 插件開發技術規範** | [`dev_standards.md`](./dev_standards.md) | Manifest V3 規範、Shadow DOM 樣式隔離、CSP/XSS 資安防禦原則 | `dev-standards`, `chrome-auditor`, `README.md` |
| **Token 節省技術指南** | [`token_optimization_guide.md`](./token_optimization_guide.md) | RTK 命令包裝、代碼骨架提煉、終端日誌脫水與長對話動態收斂規範 | `token-saver`, `1.devtools/README.md` |
| **任務協議管理規範** | [`task_manager.md`](./task_manager.md) | 4-Gate 門禁協議、會話隔絕、2-Strike 熔斷與任務生命週期管理 | `task-protocol`, `task_template_v2.md` |
| **Repo Radar 提示詞指南** | [`repo_radar_ai_prompt_instructions.md`](./repo_radar_ai_prompt_instructions.md) | 專案符號秒查、拓撲輪廓提煉與超低 Token 探索規範 | `repo-radar`, `1.devtools/README.md` |
| **語意化版本與發布規範** | [`versioning_spec.md`](./versioning_spec.md) | 專案語意化版號 (SemVer) 推進原則與自動化版號更新規則 | `dev_standards.md`, `README.md` |
| **Google 生態系整合架構規格** | [`google_ecosystem_integration_spec.md`](./google_ecosystem_integration_spec.md) | Google Workspace (Sheets/Docs/Tasks/Calendar) 雙軌串接藍圖 | `finance-clipper-core`, `pk-core` |

---

## 2. 實施手冊與部署操作指南 (Deployment & Operational Guides)

為特定架構規格提供詳細落地步驟之操作指南，從屬於對應的核心規格書：

| 指南名稱 | 檔案路徑 | 所屬主架構規格 | 核心用途與內容 |
| :--- | :--- | :--- | :--- |
| **GAS Web App 部署手冊** | [`gas_deployment_guide.md`](./gas_deployment_guide.md) | [`google_ecosystem_integration_spec.md`](./google_ecosystem_integration_spec.md) | Google Apps Script 個人專屬同步中樞 3 分鐘部署與 Secret 設定步驟 |

---

## 3. 業務場景與工作流摩擦力矩陣 (Workflow Friction Matrices)

針對目標使用者角色日常高頻操作進行摩擦力診斷與需求場景梳理之雙軌真理源：

| 角色情境 | 檔案路徑 | 適用角色 | 涵蓋插件與核心重點 |
| :--- | :--- | :--- | :--- |
| **投資研究員 (Analyst) 工作流矩陣** | [`analyst_workflow_friction_matrix.md`](./analyst_workflow_friction_matrix.md) | 投研員、研究助理、基金經理人 | `finance-research-clipper-oss`、`chrome_video speed plus`（個股基本面、法說會倍速複聽、Google 數據落盤） |
| **專案經理 (PM) 敏捷工作流矩陣** | [`pm_workflow_friction_matrix.md`](./pm_workflow_friction_matrix.md) | 專案經理、敏捷開發者 | `chrome_scrumclock`、`browser-activity-monitor`（衝刺規劃、任務池拋轉、專注時間軌跡記錄） |

---

## 4. 目錄維護與治理原則 (Governance Rules)

1. **拒絕孤兒文檔**：任何新增至本目錄的 `.md` 文件，必須在本文檔 (`0.doc_mg/docs/SSOT_README.md`) 中完成登記與分類。
2. **單一真理源 (DRY)**：技術標準與開發規範一律收斂至主 SSOT，禁止建立內容重複或片段式規範手冊。
3. **歷史分析報告歸檔**：階段性、單次事後複盤或效能審計報告（如效能瓶頸分析），結案後應存放於 `0.doc_mg/draft/archive/`，嚴禁混入規格庫。
