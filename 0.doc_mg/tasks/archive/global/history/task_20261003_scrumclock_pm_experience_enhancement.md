---
title: "ScrumClock 敏捷排程與專注體驗升級"
plugin: "chrome_scrumclock"
status: "規劃中"
created: "2026-10-03"
deadline: "2026-10-06"
---

## 1. 目標
消除 PM 在 ScrumClock 日常排程中的輸入與專注摩擦力。具體落實外部網頁選取文字右鍵快速捕獲至待辦池 (IF-01)、抽屜面板補齊預估工時與 P0 Blocker 屬性 (IF-03)、番茄鐘中斷記錄與原因收集 (SF-02)、行事曆衝突預警 (SC-V03) 及一鍵自動化週報日誌 Markdown 匯出 (SC-V02)。

## 2. 策略與鎖定檔案

### 核心策略
1. **右鍵捕獲管線**：透過 `chrome.contextMenus` 監聽選取文字，透過 `background` 寫入 `chrome.storage.local` 待辦池 (`inboxItems`)。
2. **屬性元件補齊**：修改 `TaskDetailDrawer.tsx`，加入 `estimatedPomodoros` 數字調節器與 `P0 (Blocker)` 標籤選擇器。
3. **專注中斷追蹤**：於 `TimerContext.tsx` 與 `SprintPomodoro.tsx` 擴充 `pauseSprint`，記錄中斷次數 (`interruptionCount`) 與打擾原因快速標記。
4. **衝突預警與週報**：整合現有 Google Calendar 事件快照進行衝刺前衝突檢查，並根據 `sprintLogs` 依週別聚合產出結構化週報 Markdown。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/manifest.json`
- `chrome_scrumclock/src/background/index.ts`
- `chrome_scrumclock/src/features/scrumclock/components/TaskDetailDrawer.tsx`
- `chrome_scrumclock/src/features/scrumclock/contexts/TimerContext.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/SprintPomodoro.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/EndOfDayReview.tsx`
- `chrome_scrumclock/src/types/index.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (更新 contextMenus 支援與中斷日誌 Schema)
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md` (更新功能亮點與速查矩陣)
- [ ] L3 業務規格：`./0.doc_mg/docs/pm_workflow_friction_matrix.md` (同步落實進度)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 外部文字快速捕獲與任務屬性介面補齊 狀態：`[待辦]`
- [ ] 任務 1.1: 實作 Context Menu 快速捕獲 (IF-01)
    - [ ] 於 `manifest.json` 與 `background/index.ts` 註冊 `contextMenus`，支援選取文字右鍵新增至 `InboxItem`。
- [ ] 任務 1.2: 抽屜面板補齊預估工時與 P0 標籤 (IF-03)
    - [ ] 於 `TaskDetailDrawer.tsx` 介面補齊 `estimatedPomodoros` 輸入元件與 `P0 (Blocker)` 優先級按鈕。

### Phase 2: 番茄鐘專注中斷追蹤與原因收集 狀態：`[待辦]`
- [ ] 任務 2.1: 擴充暫停狀態與中斷計數器 (SF-02)
    - [ ] 於 `TimerContext.tsx` 與 `SprintLog` 增加 `interruptionCount` 與 `interruptionReasons` 欄位。
- [ ] 任務 2.2: 實作中斷原因快速標記浮動元件 (SF-02)
    - [ ] 於暫停衝刺時提供輕量快速標籤（如：會議插單、即時訊息、個人休整），消除衝刺數據失真。

### Phase 3: 行事曆衝突預警與一鍵週報匯出 狀態：`[待辦]`
- [ ] 任務 3.1: 衝刺前 Google Calendar 衝突即時攔截 (SC-V03)
    - [ ] 啟動番茄鐘時比對未來 25~50 分鐘日曆事件，遇衝突即彈出建議時間調整預警。
- [ ] 任務 3.2: 實作一鍵自動化週報日誌 Markdown 匯出 (SC-V02)
    - [ ] 聚合當週已完成任務、番茄鐘耗損與中斷率，一鍵複製為標準週報 Markdown。

## 4. 影響評估
- Chrome API: `manifest.json` 需確保具備 `contextMenus` 權限。
- 儲存相容性: `InboxItem` 與 `SprintLog` 增加可選欄位，相容現有資料結構，不破壞既有本機資料。

## 5. 驗收標準
- [ ] **功能驗證**: 選取網頁文字點擊右鍵能成功存入待辦池；TaskDetailDrawer 正常保存 P0 與預估工時。
- [ ] **中斷驗證**: 衝刺暫停時能記錄次數與原因，並正確寫入當次 `sprintLog`。
- [ ] **衝突與週報**: 日曆衝突能主動提示；週報 Markdown 能正確按週別彙整產出。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無背景常駐報錯。
- [ ] **代碼清理**: 移除所有除錯用的 `console.log`。
- [ ] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 閉環**: 完成 L1~L4 骨架同步回寫與任務歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 3247e8d8-8b01-4179-9266-9df9a4af9ad5 (建立子任務 1 規劃)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261003_scrumclock_pm_experience_enhancement.md，開始執行 Phase 1
> ```
