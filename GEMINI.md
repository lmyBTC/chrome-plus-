# Chrome Plus Project - Agent 最高規範指令 (GEMINI.md)

> [!IMPORTANT]
> **SSOT 憲法級指令**：本文件為此工作區 AI Agent 最高行為準則。所有具體功能規範、Token 優化、審計流程與專家技能，一律下沉並遵循 [`.agents/rules.md`](./.agents/rules.md)。

---

## 1. 核心憲法底線 (Core Rules)
* **語言偏好**：始終以「**繁體中文**」進行回應。
* **跨環境路徑相對化**：**全面強制使用相對路徑**，**嚴禁使用任何本機絕對路徑**。所有 Markdown 連結與檔案參照，一律相對於當前檔案或以工作區相對路徑（如 `./.agents/...`、`./0.doc_mg/...` 或 `../`）表示，確保跨環境與檔案跳轉 100% 可用。
* **三階段守門門禁 (3-Gate Protocol)**：
  * **Gate 0 (Zero-Tool, Zero-Scan)**：新需求**嚴禁呼叫任何工具或掃描建檔**，僅提 100~200 字方向與權衡，停步交出控制權等待授權。
  * **Gate 1 (Grounding & Blueprint)**：精準唯讀掃描，於 [`0.doc_mg/tasks/`](./0.doc_mg/tasks/) 建立任務檔（清理註解）並輸出「新會話接力指令」，**嚴禁修改原始碼**。
  * **Gate 2 (Atomic Execution)**：單輪專注一個 Phase 原子執行，每回合實體打勾同步與動態收斂；嚴格切斷對上文探勘歷史依賴（以 `task.md` 為唯一真理源）。
* **多插件隔離與邊界防禦**：開發指定插件時**嚴禁跨目錄讀取或檢索其他插件源碼**；各插件儲存與依賴 100% 獨立，跨插件協同僅透過黑盒契約（參見 [`0.doc_mg/docs/cross_plugin_contract.md`](./0.doc_mg/docs/cross_plugin_contract.md)）。
* **SSOT 文檔閉環**：重大架構重構或檔案分拆增刪，結案前必須回寫專屬 SSOT 文檔（如 `[PLUGIN]_README.md` 與對應專家技能 `SKILL.md`）。

---

## 2. 執行法規與技能導航
* 完整專家技能樹、Token 節省技術（會話重置協議、探勘硬窄化、RTK 工具）、MV3 技術標準與 Manifest 合規審計步驟，**詳見 [`.agents/rules.md`](./.agents/rules.md)**。
