# 多插件開發區：技術索引 (.agents/rules.md)

> [!IMPORTANT]
> **導航協議**: 本檔為 SSOT 索引。執行任務前必須讀取對應指南。

## 0. 專家技能索引 (Skill Tree)
<!-- SKILL_TREE_START -->
|技能名稱|觸發關鍵字 (Triggers)|技能路徑|
|:---|:---|:---|
|**網頁開發與技術規範 (Web Dev & Tech Standards)**|`插件開發`,`chrome開發`,`注入腳本`,`樣式隔離`,`shadow-dom`,`訊息傳遞`,`background-worker`,`manifest修改`,`MV3規範`,`popup開發`|`.agents/skills/dev-standards/`|
|**任務協議管理 (Task Protocol Management)**|`建立任務`,`開始開發`,`任務拆解`,`狀態更新`,`同步進度`|`.agents/skills/task-protocol/`|
|**Token 節省器 (RTK Token Saver)**|`節省Token`,`壓縮輸出`,`優化指令`,`使用rtk`,`token優化`,`執行終端`,`指令節省`|`.agents/skills/token-saver/`|
|**Chrome 插件合規審計 (Chrome Compliance Auditor)**|`安全審查`,`合規檢查`,`manifest審計`,`插件檢查`,`檢查manifest`,`上架檢查`,`原始碼掃描`,`靜態掃描`|`.agents/skills/chrome-auditor/`|
<!-- SKILL_TREE_END -->

## 1. Chrome 插件開發與技術規範
- **核心指南**: [`0.doc_mg/dev_standards.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/dev_standards.md) (SSOT 規範，涵蓋 MV3、Shadow DOM 隔離、通訊與儲存 API)

## 2. 任務管理與規範 (Hard Rules)
- **任務管理指引**: [`0.doc_mg/task_manager.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/task_manager.md)
- **任務記錄範本**: [`0.doc_mg/task_template_v2.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/task_template_v2.md)
- **活動任務目錄**: [`0.doc_mg/tasks/`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/tasks/)
- **底線**:
  * 建立任務前必檢索既有文件，禁止憑記憶生成任務結構。
  * 對話前回報必須勾選實體任務文件。
  * 每階段任務完成或對話結束前，必須對已完成 Phase 執行**狀態收斂 (Dynamic Condensation)**，以節省 Token。

## 3. Token 優化與輔助工具
- **節省器指南**: [`.agents/skills/token-saver/SKILL.md`](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/.agents/skills/token-saver/SKILL.md) (使用 `rtk` 工具包裝指令，降低 Token 消耗)
