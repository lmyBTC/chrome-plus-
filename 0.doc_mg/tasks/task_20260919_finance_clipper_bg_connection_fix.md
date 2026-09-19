---
title: "修復 FinanceClipper 深度採集背景通訊失效錯誤 (Receiving end does not exist)"
plugin: "finance-research-clipper-oss"
status: "規劃中"
created: "2026-09-19"
deadline: "2026-09-20"
---

## 1. 目標
修復使用者在 Dashboard 執行「4合1 深度採集」時出現的 `通訊錯誤：Could not establish connection. Receiving end does not exist.`。
徹底解決 Extension Context Invalidation、Service Worker 休眠喚醒失敗以及未就緒通道導致的通訊中斷，並加入平滑重試與友善修復提示。

## 2. 策略與鎖定檔案
1. **根因診斷與情境防禦**：
   - 擴充套件重新載入後，既有分頁成為孤兒分頁（Orphaned tab），觸發此錯誤時提供明確的重新整理引導與一鍵恢復機制。
   - Service Worker 休眠喚醒短暫延遲時，在前端實作輕量重試機制（Retry mechanism with backoff），避免一次性通訊震盪直接報錯。
2. **通訊生命週期閉環 (Safe Messaging)**：
   - 在 `dashboard-actions.js` 與 `sidepanel.js` 的 `sendMessage` 加入重試機制與 context 檢查。
   - 確保 `background.js` 中 `chrome.runtime.onMessage` 的 `CRAWL_STOCK` 異步回傳在任何異常情境下皆能 100% 回呼 `sendResponse`，杜絕通道過早關閉。

### 鎖定檔案 (Target Files)
- `./finance-research-clipper-oss/dashboard-actions.js`
- `./finance-research-clipper-oss/background.js`
- `./finance-research-clipper-oss/sidepanel.js`
- `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`

## 3. 任務拆解

### Phase 1: 前端通訊防禦與自動重試機制 狀態：`[待辦]`
- [ ] 任務 1.1: 強化 `dashboard-actions.js` 的 `triggerCrawl` 通訊機制
    - [ ] 封裝安全發送訊息函數 `sendRuntimeMessageWithRetry`，支援 1~2 次指數退避重試以因應 Service Worker 喚醒。
    - [ ] 精確捕獲 `Receiving end does not exist` 或 `Extension context invalidated` 錯誤，彈出友善引導（提示「擴充功能已重新載入或連線中斷，請按 F5 重新整理」）。
- [ ] 任務 1.2: 同步強化 `sidepanel.js` 的 `triggerCrawl` 通訊防禦
    - [ ] 套用相同通訊安全機制，避免側邊欄遇到相同斷線問題。

### Phase 2: 背景 Service Worker 監聽器與通道強固 狀態：`[待辦]`
- [ ] 任務 2.1: 審查與強化 `background.js` 的 `CRAWL_STOCK` 監聽邏輯
    - [ ] 確保 `chrome.runtime.onMessage` 中的 Promise catch 能安全回傳錯誤資訊，避免 unhandled exception 導致 Service Worker 異常終止。
    - [ ] 支援 `PING` 內部心跳動作，便於前端於發送大任務前快速探測 Service Worker 就緒狀態。

### Phase 3: 驗證、SSOT 文檔同步與狀態收斂 狀態：`[待辦]`
- [ ] 任務 3.1: 驗證在 Service Worker 休眠與擴充套件重新載入情境下的防禦行為。
- [ ] 任務 3.2: 同步更新 `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md` 與專屬技能字典。
- [ ] 任務 3.3: 完成實體任務檔案打勾、狀態收斂與結案。

## 4. 影響評估
- 本次修改僅增強前端通訊容錯率與背景例外捕獲，不變更 Manifest 權限與對外 API 契約。
- 向上相容現有資料結構與爬蟲模組，無破壞性變更。

## 5. 驗收標準
- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全）。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 文件同步**: 若架構、模組清單、檔案分拆或接口有變動，已同步回寫並更新該插件專屬 SSOT 文件 (如 `./finance-research-clipper-oss/FINANCE_CLIPPER_README.md`)。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-19 ID: f30b79a0-36a7-4010-9056-b168f4c2a36f (初始化)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260919_finance_clipper_bg_connection_fix.md，開始執行 Phase 1
> ```
