---
title: "ScrumClock 側欄助理與核心生態系深度整合"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-07-14"
deadline: "2026-07-16"
---

## 1. 目標
將 ScrumClock 側欄助理與核心生態系進行深度整合，實作五大功能：
- **A. 逆向整合**：AI 建議一鍵寫入「今日核心戰役」。
- **B. 狀態連動**：側欄顯示實時番茄鐘計時狀態條。
- **C. 導航優化**：Header 新增儀表板與設定快捷鍵。
- **D. 對話共享**：側欄可載入並續接 `geminiContent.ts` 抓取的官方歷史對話。
- **E. 右鍵選單**：新增右鍵「🤖 傳送至 ScrumClock 助理分析」功能，一鍵開側欄並載入文字。

## 2. 策略與鎖定檔案
- 使用 `chrome.contextMenus` 在背景腳本註冊右鍵選單。
- 在 `chrome.storage.local` 共享 `pendingAnalyzeText`、`activeTimer`、`geminiConversations` 與 `dailyLogs`。
- 在側欄 `main.tsx` 中，使用 `chrome.storage.onChanged` 實時監聽計時器與右鍵選單事件。
- 更新 Manifest 加入 `contextMenus` 權限。

### 鎖定檔案 (Target Files)
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\public\manifest.json` [MODIFY]
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\background.ts` [MODIFY]
- `c:\Users\G1\00.coding workspace\chrome plus project\chrome_scrumclock\src\entries\sidebar\main.tsx` [MODIFY]

## 3. 任務拆解

### Phase 1: 基礎權限與右鍵選單開發 狀態：`[已完成]`

### Phase 2: 側欄 UI 導航與狀態條實作 狀態：`[已完成]`

### Phase 3: 任務寫入與對話續接整合 狀態：`[已完成]`

### Phase 4: 驗證與合規審計 狀態：`[已完成]`

## 4. 影響評估
- **權限變更**: 新增 `contextMenus` 權限。該權限無敏感警告，合規且容易上架。
- **儲存相依性**: 頻繁讀寫 `chrome.storage.local`，均在 client 端進行，無外部網路隱私外洩風險。

## 5. 驗收標準
- [x] **技術指標**: 右鍵選取文字可成功拉起側欄並填入選取內容。
- [x] **核心規範**: 側欄可正常與 `activeTimer` 連動，且 AI 拆解的任務能成功寫入 newtab 頁面的今日戰役。
- [x] **安全規範**: 歷史對話載入渲染符合 XSS 防禦標準。
- [x] **編碼與打包**: Vite 打包無 Error。

## 6. AI 簽到區
- [x] 我已閱讀並承諾遵守「task-protocol」技能中的中斷點與狀態收斂規範。
- **參與對話 ID 紀錄**:
  - [2026-07-14] ID: 9c3bbfa5-39d0-471f-9a0d-a12ada4ba745 (初始化)
