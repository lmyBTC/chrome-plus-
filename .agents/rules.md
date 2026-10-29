# Chrome Plus 多插件開發區：執行指針 (.agents/rules.md)

> [!IMPORTANT]
> **SSOT 執行索引**：本文件為此工作區所有任務執行、Token 優化與架構指針之頂層索引。細部規則已全面下沉至各專屬技能。

---

## 0. 專家技能導航 (Skill Navigation)
<!-- SKILL_TREE_START -->
|技能名稱|觸發關鍵字 (Triggers)|指針路徑|
|:---|:---|:---|
|**網頁開發與技術規範**|`插件開發`,`MV3規範`,`樣式隔離`,`shadow-dom`,`CSP/XSS`|`.agents/skills/dev-standards/SKILL.md`|
|**任務協議管理**|`建立任務`,`開始開發`,`任務拆解`,`動態收斂`,`4-Gate`|`.agents/skills/task-protocol/SKILL.md`|
|**Token 節省器**|`節省Token`,`代碼骨架`,`日誌脫水`,`rtk指令`,`局部讀寫`|`.agents/skills/token-saver/SKILL.md`|
|**Chrome 插件合規審計**|`安全審查`,`合規檢查`,`manifest審計`,`上架檢查`|`.agents/skills/chrome-auditor/SKILL.md`|
|**PK+ 規格字典**|`pk`,`pk+`,`power kit`,`scrumclock`,`番茄鐘`,`敏捷看板`,`pomodoro`|`.agents/skills/pk-core/SKILL.md`|
|**FinanceClipper 研報字典**|`finance-clipper`,`研報採集`,`股票爬蟲`,`財務儀表板`|`.agents/skills/finance-clipper-core/SKILL.md`|
|**VideoSpeedPlus 倍速字典**|`video speed`,`影片倍速`,`youtube倍速`,`videospeedplus`|`.agents/skills/video-speed-core/SKILL.md`|
|**專案情報雷達**|`repo radar`,`符號查詢`,`檢索代碼`,`查型別`,`查文檔`,`專案地圖`|`.agents/skills/repo-radar/SKILL.md`|
<!-- SKILL_TREE_END -->

---

## 1. 守門門禁與任務協議 (Gate Protocol)
* **3-Gate 階段責任隔離 (停止使用 Gate 0，直接自 Gate 1 開始)**：
  * **Gate 1**：物理勘查、骨架快取與建立任務檔（建檔即 `git add`），強制輸出跨會話接力指令，嚴禁動代碼。
  * **Gate 2**：單輪專注一個 Phase 原子執行（One Phase, One Session）、任務檔為唯一真理源、2-Strike 熔斷，Phase 結尾批次同步任務檔。
  * **Gate 3**：自動化審計 Exit 0、四層 SSOT 閉環（90/10 原則）與任務檔雙層歸檔（tasks 根目錄保持純淨零結案）。
* **微觀執行條文下沉指針**：詳細門禁規則、安全守護五大戒律、雙層滾動封存（`archive/` 最近 10 份、歷史入 `history/`）等規範，**完整下沉至 `.agents/skills/task-protocol/SKILL.md`**。

---

## 2. Token 優化與開發工程 (Efficiency & Token Saving)
* **核心規範**：
  * **路徑引用純粹化**：文檔與任務檔內部引用檔案一律使用工作區根目錄相對純行內代碼（如 `GEMINI.md`、`.agents/rules.md`），嚴禁 Markdown 超連結（如 `[text](path)` 或 `[path](path)`），杜絕生命週期搬移後死鏈與 Token 浪費。
  * **局部讀寫**：檔案逾 100 行嚴禁全檔讀取（優先以骨架工具提煉），編輯採精準局部替換。
  * **終端脫水**：編譯、建置與除錯指令優先使用 `rtk` 或管線串接 `compact_log.py`。
  * **會話重置**：落實跨會話接力令，釋放歷史上下文。
* **微觀執行條文下沉指針**：代碼骨架提煉命令、工具鏈調用矩陣與詳細數值規範，**完整下沉至 `.agents/skills/token-saver/SKILL.md`**。

---

## 3. 多插件隔離與邊界防禦 (Multi-Extension Isolation)
* **視野隔離**：開發單一插件時嚴禁跨目錄讀取或檢索其他插件源碼。
* **黑盒契約**：跨插件協同僅透過純資料通訊契約，存儲與依賴 100% 實體隔離。
* *完整契約詳見*：`0.doc_mg/docs/cross_plugin_contract.md`。

---

