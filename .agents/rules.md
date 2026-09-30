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
|**Token 節省器**|`節省Token`,`rtk指令`,`局部讀取`,`精準寫入`,`會話重置`|`.agents/skills/token-saver/SKILL.md`|
|**Chrome 插件合規審計**|`安全審查`,`合規檢查`,`manifest審計`,`上架檢查`|`.agents/skills/chrome-auditor/SKILL.md`|
|**ScrumClock 規格字典**|`scrumclock`,`番茄鐘`,`敏捷看板`,`pomodoro`|`.agents/skills/scrumclock-core/SKILL.md`|
|**FinanceClipper 研報字典**|`finance-clipper`,`研報採集`,`股票爬蟲`,`財務儀表板`|`.agents/skills/finance-clipper-core/SKILL.md`|
|**VideoSpeedPlus 倍速字典**|`video speed`,`影片倍速`,`youtube倍速`,`videospeedplus`|`.agents/skills/video-speed-core/SKILL.md`|
<!-- SKILL_TREE_END -->

---

## 1. 守門門禁與任務協議 (Gate Protocol)
- **3-Gate 門禁守則**：**Gate 0** 零工具直覺方向確認（禁掃描）➔ **Gate 1** 窄化勘查、產出 `task.md` (`0.doc_mg/tasks/`) 並輸出會話接力指令（禁改碼）➔ **Gate 2** 分段原子執行與動態收斂（物理打勾）。
- **SSOT 閉環義務**：凡涉模組變更或分拆，結案前必須回寫插件專屬 SSOT 文檔與對應技能字典。
- *完整流程詳見*：`.agents/skills/task-protocol/SKILL.md` 及 `0.doc_mg/docs/task_manager.md`。

---

## 2. Token 優化與開發工程 (Efficiency & Token Saving)
- **局部讀寫**：檔案逾 100 行嚴禁全檔讀取，採 `grep_search` + 區段 `view_file` + `replace_file_content` 單點替換。
- **終端壓縮**：終端高輸出指令優先包裝 `rtk`（如 `rtk git diff`, `rtk rg`）。
- **會話重置**：Gate 1 完成後建議開新視窗傳入接力令，釋放 70%~90% 上下文負擔。
- *完整規範詳見*：`.agents/skills/token-saver/SKILL.md`。

---

## 3. 多插件隔離與邊界防禦 (Multi-Extension Isolation)
- **視野隔離**：開發單一插件時嚴禁跨目錄讀取或檢索其他插件源碼。
- **黑盒契約**：跨插件協同僅透過純資料通訊契約，存儲與依賴 100% 實體隔離。
- *完整契約詳見*：`0.doc_mg/docs/cross_plugin_contract.md`。

---

## 4. 路徑跳轉雙軌制 (Dual Path Protocol)
- **專案文件內部（極致精簡）**：所有專案檔案、程式碼、Markdown 文檔與專家技能內部，全面維持最簡潔的純字串相對路徑（如 `.agents/rules.md`、`0.doc_mg/tasks/`），嚴禁硬編碼本機絕對路徑，亦不包裝多餘的 Markdown 超連結括號，以最大化節省 Token 並杜絕 Context 噪音。
- **AI 互動標準（對話回覆）**：AI 在聊天對話框向使用者推薦或呈報檔案時，嚴格遵守 IDE 介面規範一律提供 `file:///` 格式的可點擊跳轉連結，確保使用者在對話框中隨點即開。

