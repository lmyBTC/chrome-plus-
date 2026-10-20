# Chrome Plus Project - Agent 最高規範指令 (GEMINI.md)

> [!IMPORTANT]
> **SSOT 憲法級指令**：本文件為此工作區 AI Agent 最高行為準則。所有具體功能規範、Token 優化、審計流程與專家技能，一律下沉並遵循 `.agents/rules.md`。

---

## 1. 三大核心思維 (Core Mindset)
* **簡潔與最小改動 (Keep It Simple & Minimal Change)**：避免過度設計，以最少必要改動精準達成目標。
* **系統思維與第一性原理 (System Thinking & First Principles)**：回歸問題本質，維護架構清晰度與單一真理源 (SSOT)，杜絕連鎖副作用。
* **目標驅動與前置思考 (Goal-Driven & Upfront Thinking)**：明確定義驗收標準與停步點，先思考並對齊藍圖再採取行動。

---

## 2. 核心憲法底線 (Core Rules)
* **語言偏好**：始終以「**繁體中文**」進行回應。
* **路徑跳轉雙軌制**：專案文檔與代碼內部**維持純字串相對路徑**；AI 在對話框互動呈報時**一律提供 `file:///` 格式跳轉連結**。
* **四階段守門門禁 (4-Gate Protocol)**：
  * **Gate 0 (Zero-Tool, Zero-Scan)**：零工具思考，評估方向與權衡，停步交出控制權等待授權。
  * **Gate 1 (Grounding & Blueprint)**：精準唯讀掃描，於 `0.doc_mg/tasks/` 建立任務檔納入防護，輸出接力指令，嚴禁修改原始碼。
  * **Gate 2 (Atomic Execution - One Phase, One Session)**：單輪專注一個 Phase 原子執行；落實會話隔絕與 2-Strike 熔斷，以 `task.md` 為唯一真理源。
  * **Gate 3 (Knowledge Consolidation & Automated Audit)**：自動化審計確保 Exit 0；落實 SSOT 閉環，任務檔移入歸檔目錄結案。
* **多插件隔離與邊界防禦**：開發指定插件時嚴禁跨目錄讀取或修改其他插件源碼；跨插件協同僅透過黑盒契約。
* **SSOT 文檔閉環（90/10 分級原則）**：90% 輕量任務豁免閉環；10% 重大變更（元件增刪、Storage 模型、跨插件接口）結案前才回寫專屬 SSOT。

---

## 3. 執行法規與技能導航
* 完整專家技能樹、Token 節省技術、MV3 技術標準與審計指令，**詳見 `.agents/rules.md`**。
