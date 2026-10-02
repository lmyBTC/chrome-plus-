# Chrome Plus Project - Agent 最高規範指令 (GEMINI.md)

> [!IMPORTANT]
> **SSOT 憲法級指令**：本文件為此工作區 AI Agent 最高行為準則。所有具體功能規範、Token 優化、審計流程與專家技能，一律下沉並遵循 `.agents/rules.md`。

---

## 1. 核心憲法底線 (Core Rules)
* **語言偏好**：始終以「**繁體中文**」進行回應。
* **路徑跳轉雙軌制 (Dual Path Protocol)**：
  * **專案文件內部（極致精簡）**：所有專案檔案、程式碼、Markdown 文檔與專家技能內部，**全面維持最簡潔的純字串相對路徑**（如 `.agents/rules.md`、`0.doc_mg/tasks/`），嚴禁硬編碼本機絕對路徑，亦不包裝多餘的 Markdown 超連結括號，以最大化節省 Token 並杜絕 Context 噪音。
  * **AI 對話框互動（隨點即開）**：AI 在聊天對話框向使用者推薦或呈報檔案時，嚴格遵守 IDE 介面規範一律提供 `file:///` 格式的可點擊跳轉連結，確保使用者在對話框中隨點即開。
* **三階段守門門禁 (3-Gate Protocol)**：
  * **Gate 0 (Zero-Tool, Zero-Scan)**：新需求**嚴禁呼叫任何工具或掃描建檔**，僅提 100~200 字方向與權衡，停步交出控制權等待授權。
  * **Gate 1 (Grounding & Blueprint)**：精準唯讀掃描，於 `0.doc_mg/tasks/` 建立任務檔（清理註解）並輸出「新會話接力指令」，**嚴禁修改原始碼**。
  * **Gate 2 (Atomic Execution)**：單輪專注一個 Phase 原子執行，每回合實體打勾同步與動態收斂；嚴格切斷對上文探勘歷史依賴（以 `task.md` 為唯一真理源）。
* **多插件隔離與邊界防禦**：開發指定插件時**嚴禁跨目錄讀取或檢索其他插件源碼**；各插件儲存與依賴 100% 獨立，跨插件協同僅透過黑盒契約（參見 `0.doc_mg/docs/cross_plugin_contract.md`）。
* **SSOT 文檔閉環（90/10 分級原則）**：90% 輕量任務（單純樣式、文字、局部 Bugfix）**全面豁免閉環**；僅在涉及「新增/刪除元件檔案、修改 Storage 模型、改動跨插件通訊接口」等重大架構變更時，結案前才回寫專屬 SSOT 文檔（如 `[PLUGIN]_README.md` 與對應專家技能 `SKILL.md`）。

---

## 2. 執行法規與技能導航
* 完整專家技能樹、Token 節省技術（會話重置協議、探勘硬窄化、RTK 工具）、MV3 技術標準與 Manifest 合規審計步驟，**詳見 `.agents/rules.md`**。
