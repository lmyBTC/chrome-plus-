---
title: "修復影片標題過長時 Speed Plus 按鈕無法顯示的問題，並將按鈕移至 LIKE 左側"
plugin: "chrome_video speed plus"
status: "已完成"
created: "2026-07-15"
deadline: "2026-07-15"
---

## 1. 目標
當 YouTube 影片標題過長時，原本附加在標題尾端的 Speed Plus 快捷按鈕會被擠壓或隱藏。本任務之目標為將按鈕的注入位置移到影片下方按讚/不喜歡按鈕的左側，解決按鈕隱藏的問題。同時為求保險與相容性，亦將原本標題後方的按鈕恢復，實作雙方案並行。另外，針對開啟 popup 時 Content Script 尚未加載造成的 Unchecked runtime.lastError 連線失敗進行修復。

## 2. 策略與鎖定檔案
- 修改 `content.js`，將原有的單一按鈕注入改為雙按鈕（標題側按鈕與 LIKE 側按鈕）獨立注入。
- 為了避免 ID 衝突，兩個按鈕分別使用 `yt-speed-plus-title-btn` 與 `yt-speed-plus-like-btn`，並調整 `removeButtonAndPanel()` 進行雙重清理。
- 兩個按鈕點擊後能共用並正確定位懸浮控制面板。
- 持續結合 MutationObserver 與 1.5 秒定時輪詢，以最大化防禦 Polymer 重複渲染刷除。
- 修改 `popup.js` 中的訊息傳遞，對所有發送訊息添加 `chrome.runtime.lastError` 防禦性捕獲，防止未捕獲錯誤。

### 鎖定檔案 (Target Files)
- `./chrome_video speed plus\content.js`
- `./chrome_video speed plus\popup.js`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`
- [x] 任務 1.1: 建立實體任務文件與設計實作計畫
- [x] 任務 1.2: 取得使用者審查與確認

### Phase 2: 程式碼修改 狀態：`[已完成]`
- [x] 任務 2.1: 修改 `content.js` 的按鈕尋找邏輯 `tryInjectButton`
- [x] 任務 2.2: 修改 `content.js` 的按鈕樣式與插入邏輯 `injectButton`
- [x] 任務 2.3: 實作定時輪詢與父節點變更生命週期檢測以解決 SPA 重新渲染導致按鈕消失的問題
- [x] 任務 2.4: 恢復標題後按鈕，重構為獨立 ID 雙軌按鈕注入並行

### Phase 3: 合規與驗證 狀態：`[已完成]`
- [x] 任務 3.1: 執行自動化 manifest/代碼審計
- [x] 任務 3.2: 載入擴充功能並手動驗證長標題與短標題下的按鈕位置與面板功能

### Phase 4: Popup 錯誤修復 狀態：`[已完成]`
- [x] 任務 4.1: 重構 `popup.js` 訊息傳送，增加 `chrome.runtime.lastError` 安全捕獲以修復連線建立失敗錯誤

## 4. 影響評估
- 由於此變更僅為 UI 注入位置與樣式的調整，不涉及 Chrome API 權限或 CSP 的變動，故不影響 Manifest 安全權限。
- 需要注意 YouTube 會動態載入元件，當前的 MutationObserver 機制需要確保能正確觸發 like/dislike 按鈕的注入。

## 5. 驗收標準
- [ ] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [ ] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範。
- [ ] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [ ] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **插件驗證**: 已在 Chrome 中重新載入插件，確認各項功能及背景通訊皆正常無報錯。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-15] ID: c7075084-3169-4434-b2a9-1e5ea1a6fbd1 (初始化)
