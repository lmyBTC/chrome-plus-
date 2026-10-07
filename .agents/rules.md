# Chrome Plus 多插件開發區：執行指針 (.agents/rules.md)

> [!IMPORTANT]
> **SSOT 執行索引**：本文件為此工作區所有任務執行、Token 優化與架構指針之頂層索引。細部規則已全面下沉至各專屬技能。

---

## 0. 專家技能導航 (Skill Navigation)
<!-- SKILL_TREE_START -->
|技能名稱|觸發關鍵字 (Triggers)|指針路徑|
|:---|:---|:---|
|**網頁開發與技術規範**|`插件開發`,`MV3規範`,`樣式隔離`,`shadow-dom`,`CSP/XSS`|`.agents/skills/dev-standards/SKILL.md`|
|**任務協議管理**|`建立任務`,`開始開發`,`任務拆解`,`動態收斂`,`3-Gate`|`.agents/skills/task-protocol/SKILL.md`|
|**Token 節省器**|`節省Token`,`代碼骨架`,`日誌脫水`,`rtk指令`,`局部讀寫`|`.agents/skills/token-saver/SKILL.md`|
|**Chrome 插件合規審計**|`安全審查`,`合規檢查`,`manifest審計`,`上架檢查`|`.agents/skills/chrome-auditor/SKILL.md`|
|**ScrumClock 規格字典**|`scrumclock`,`番茄鐘`,`敏捷看板`,`pomodoro`|`.agents/skills/scrumclock-core/SKILL.md`|
|**FinanceClipper 研報字典**|`finance-clipper`,`研報採集`,`股票爬蟲`,`財務儀表板`|`.agents/skills/finance-clipper-core/SKILL.md`|
|**VideoSpeedPlus 倍速字典**|`video speed`,`影片倍速`,`youtube倍速`,`videospeedplus`|`.agents/skills/video-speed-core/SKILL.md`|
|**專案情報雷達**|`repo radar`,`符號查詢`,`檢索代碼`,`查型別`,`查文檔`,`專案地圖`|`.agents/skills/repo-radar/SKILL.md`|
<!-- SKILL_TREE_END -->

---

## 1. 守門門禁與任務協議 (Gate Protocol)
- **3-Gate 門禁守則**：**Gate 0** 零工具直覺方向確認（禁掃描）➔ **Gate 1** 窄化勘查、前置宣告 Target SSOTs、產出 `task.md` (`0.doc_mg/tasks/`) 並輸出會話接力指令（禁改碼）➔ **Gate 2** 分段原子執行與動態收斂（物理打勾）。
- **四層 SSOT 閉環（90/10 分級與瘦身守則）**：
  - **90% 輕量任務（豁免閉環）**：單純樣式、文字、局部除錯重構，**L1~L3 免讀寫直接跳過**，僅需 L4 歸檔，零額外 Token 損耗。
  - **10% 重大變更（精準回寫）**：僅涉及新增/刪除元件、改動 Storage Schema 或跨插件通訊時，結案前依 Target SSOTs 進行「純骨架（Index）」同步：
    - **L1 專家技能**：`.agents/skills/[plugin]-core/SKILL.md` (僅記路徑與職責一句話，嚴禁貼入長篇代碼與易變行數)
    - **L2 模組導航**：`[PLUGIN]/[PLUGIN]_README.md` (模組速查、架構與進入點清單)
    - **L3 領域規格**：`[PLUGIN]/docs/[feature]-spec.md` (核心業務規則，無則免填)
    - **L4 封存治理**：`0.doc_mg/tasks/archive/[plugin]/` (任務生命週期結案歸檔)
- *完整流程詳見*：`.agents/skills/task-protocol/SKILL.md` 及 `0.doc_mg/docs/task_manager.md`。

---

## 2. Token 優化與開發工程 (Efficiency & Token Saving)
- **局部讀寫與多點修改**：檔案逾 100 行嚴禁全檔讀取，採 `grep_search` + 區段 `view_file`；單點替換用 `replace_file_content`，同檔多處修改強制調用 `multi_replace_file_content`。
- **武器庫強制鏈條（骨架提煉）**：未知或大型模組（逾 100 行）探勘嚴禁直接盲讀原始碼，**強制優先調用** `python 1.devtools/tools/code_skeleton.py <路徑>` 或 `repo-radar` 提取大綱骨架（單次局部讀取限制 ≤ 30 行），掏空實作省下 90% 上下文。
- **終端壓縮與脫水**：終端高輸出指令優先包裝 `rtk`，編譯/測試長堆疊串接 `python 1.devtools/tools/compact_log.py` 脫水。
- **會話重置**：Gate 1 完成後建議開新視窗傳入接力令，釋放 70%~90% 上下文負擔。
- *完整規範詳見*：`.agents/skills/token-saver/SKILL.md` 與 `0.doc_mg/docs/token_optimization_guide.md`。

---

## 3. 多插件隔離與邊界防禦 (Multi-Extension Isolation)
- **視野隔離**：開發單一插件時嚴禁跨目錄讀取或檢索其他插件源碼。
- **黑盒契約**：跨插件協同僅透過純資料通訊契約，存儲與依賴 100% 實體隔離。
- *完整契約詳見*：`0.doc_mg/docs/cross_plugin_contract.md`。

---

## 4. 路徑跳轉雙軌制 (Dual Path Protocol)
- **專案文件內部（極致精簡）**：所有專案檔案、程式碼、Markdown 文檔與專家技能內部，全面維持最簡潔的純字串相對路徑（如 `.agents/rules.md`、`0.doc_mg/tasks/`），嚴禁硬編碼本機絕對路徑，亦不包裝多餘的 Markdown 超連結括號，以最大化節省 Token 並杜絕 Context 噪音。
- **AI 互動標準（對話回覆）**：AI 在聊天對話框向使用者推薦或呈報檔案時，嚴格遵守 IDE 介面規範一律提供 `file:///` 格式的可點擊跳轉連結，確保使用者在對話框中隨點即開。

