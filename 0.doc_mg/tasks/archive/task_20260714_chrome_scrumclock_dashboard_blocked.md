---
title: "修復 ScrumClock 儀表板 ERR_BLOCKED_BY_CLIENT 錯誤"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-14"
deadline: "2026-07-14"
---

## 1. 目標
修復當使用者在 Gemini 網頁中點擊懸浮 Widget 的「打開 ScrumClock 儀表板」按鈕時，瀏覽器彈出 `ERR_BLOCKED_BY_CLIENT` 遭到封鎖的錯誤。改以透過 Background Service Worker (Service Worker) 進行安全跳轉，以符合 Chrome 插件的安全規範。

## 2. 策略與鎖定檔案
由於 Content Script (geminiContent.ts) 運行於 `https://gemini.google.com/` 的沙盒化環境中，直接呼叫 `window.open(chrome.runtime.getURL(...))` 會被 Chrome 的安全原則阻擋（以防惡意網頁探測或載入插件敏感內部資源）。
解決策略：
1. 在 `geminiContent.ts` 中的點擊監聽器改為向 Background 傳送消息 `{ type: 'OPEN_DASHBOARD' }`。
2. 在 `background.ts` 的訊息監聽器中接收此消息，並利用特權 Chrome API `chrome.tabs.create({ url: chrome.runtime.getURL('src/entries/newtab/index.html') })` 來安全地開啟儀表板分頁。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\geminiContent.ts`
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\background.ts`

## 3. 任務拆解

### Phase 1: 規劃與審查 狀態：`[已完成]`

### Phase 2: 代碼實作 狀態：`[已完成]`

### Phase 3: 驗證與構建 狀態：`[已完成]`

## 4. 影響評估
此修改不涉及額外的權限請求。使用 `chrome.tabs.create` 是最標準的開啟頁面方法，不會影響既有功能，並能大幅提升插件安全性，減少將內部資源曝露於 `web_accessible_resources` 的風險。

## 5. 驗收標準
- [x] **技術指標**: 點擊「打開 ScrumClock 儀表板」能正確且安全地開啟新分頁，不再出現 `ERR_BLOCKED_BY_CLIENT`。
- [x] **核心規範**: 符合 Chrome Extension MV3 安全通訊規範，背景腳本透過 Service Worker 接收非持續性訊息。
- [x] **除錯清理**: 確保無殘留測試用的 debug `console.log`。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **插件驗證**: 執行 `npm run build` 並在 `chrome://extensions/` 重新載入，確認功能正常。

## 6. AI 簽到區
> [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-07-14] ID: 21d646f8-f0e2-4d10-8395-1b08cd84cd3e (完成)
