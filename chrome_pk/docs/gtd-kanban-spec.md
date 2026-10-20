# ScrumClock 極簡 GTD 與敏捷看板業務規格書 (GTD & Kanban Spec)

> **版本**：v2.0  
> **適用模組**：`chrome_scrumclock` (Power Kit)  
> **最後更新**：2026-10-02  

---

## 1. 核心哲學：零負擔 GTD + 敏捷看板

摒棄多餘的複雜標籤體系與繁重的多維度矩陣，貫徹「零負擔 GTD + 敏捷流轉」極簡哲學：
1. **秒級捕捉 (Capture)**：透過全域快捷鍵與右鍵選單，大腦靈感與待辦秒級寫入收件匣，絕不阻礙當前思考。
2. **極簡狀態 (Clarify & Organize)**：任務僅定義 5 種精準 GTD 狀態：
   - `inbox`: 未釐清的靈感想法。
   - `next-action`: 隨時可啟動的具體下一步行動。
   - `in-progress`: 今日專注戰役衝刺中的焦點任務。
   - `done`: 衝刺落地的成就清單。
   - `someday`: 暫時擱置、非當務之急的備用願望池。
3. **專注保護 (Focus)**：嚴格限制「進行中 (In Progress)」在製品 (WIP) 上限，引導專注單一行動。
4. **工時落地 (Engage)**：番茄鐘計時結束自動將成果回填累加至任務之 `spentPomodoros`。

---

## 2. 功能架構與規格細節

### 2.1 原生全域快速捕捉機制 (Omni-Capture)
- **快捷鍵**：`Alt + Q` (於 `manifest.json` 註冊為 `gtd_omni_capture`)。
- **右鍵選單**：`gtd_capture_inbox`（支援選取文字、整頁標題或超連結）。
- **處理流程**：
  1. 擷取活動分頁選取文字（或降級使用分頁標題）。
  2. 初始化 `WeeklyMission`（狀態為 `inbox`，預設預估 1 顆番茄，標籤為 `@Focus`）。
  3. 寫入 `chrome.storage.local` 中的 `weeklyMissions` 與 `inboxItems`。
  4. 觸發 Chrome 原生 Notification 提供無干擾的成功回饋。

### 2.2 敏捷看板與任務卡片 (`BoardView.tsx` & `TaskCard.tsx`)
- **4 核心流轉欄位**：
  1. **📥 收件匣 (Inbox)**：提供快捷輸入欄與「⚡ 一鍵釐清全部 (Inbox Zero)」按鈕。
  2. **⚡ 下一步行動 (Next Actions)**：可隨時拖曳或點擊「🎯 推進 Doing」推入焦點戰役。
  3. **🚀 進行中 (In Progress)**：受到 WIP 上限保護，卡片超過上限時標頭與邊框觸發紅框脈衝警示。
  4. **✅ 已完成 (Done)**：已完成任務之歸宿，卡片劃線並淡化。
- **💡 日後也許 (Someday / Maybe)**：以底部可折疊抽屜形式呈現，避免干擾主要看板流轉。
- **🍅 卡片番茄工時指標**：
  - 格式：`🍅 {spentPomodoros} / {estimatedPomodoros}`
  - 點擊指標即可快速修改預估番茄鐘數。
  - 當已消耗達到或超過預估時，觸發琥珀色高亮標示。

### 2.3 番茄鐘工時自動累加回填
- **觸發條件**：番茄鐘衝刺計時歸零自然完成（前景 `TimerContext.tsx` 狀態轉為 `logging`），或背景鬧鐘 `sprintFinished` 觸發。
- **防重複累加機制**：
  - 在 `chrome.storage.local` 的 `activeTimer` 維護 `spentPomodoroRecorded: boolean`。
  - 觸發時核對旗標，若未記錄則自動為關聯任務 `spentPomodoros + 1`，並置位 `spentPomodoroRecorded: true`。
  - 透過 `chrome.storage.onChanged` 廣播，所有開啟的看板與卡片即時重新渲染呈現最新工時。

### 2.4 本地 Feature Flags 控制
- **控制項入口**：ScrumClock Options 頁面 (`SettingsPanel.tsx`)。
- **開關項目**：
  - `enableGtdCapture` (boolean, 預設 true)：控制是否啟用 `Alt+Q` 與右鍵捕捉。
  - `enableWipLimit` (boolean, 預設 true)：控制看板是否啟用 WIP 在製品上限警示。
  - `maxWipLimit` (number, 預設 3, 可調範圍 1~10)：進行中卡片上限數量。
