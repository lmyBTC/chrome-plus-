---
title: "PM 敏捷工作流 P0 速贏體驗升級 (P0 Quick Wins)"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-10"
---

## 1. 目標
依據 `0.doc_mg/tasks/pm_workflow_friction_matrix.md` 診斷成果，聚焦實作 8 項最高價值且低成本之 **P0 速贏功能 (Quick Wins)**。打通 PM 高頻日常中的「外部捕獲、工時預算、衝刺中斷、日曆防撞、網域分類、週報匯出、結構化拋轉與跨插件狀態聯動」，以最小代價消除 80% 的工作流中斷阻力。

## 2. 策略與鎖定檔案

### 核心策略
- **原子切片推進**：依功能類型拆分為 4 個階段，各階段單獨可驗證且不破壞現有資料結構。
- **跨插件黑盒通訊**：遵循 `0.doc_mg/docs/cross_plugin_contract.md` 規範，以原生 `chrome.runtime.sendMessage` 直連廣播衝刺會話事件，不破壞插件獨立性。
- **漸進增強不破壞相容性**：既有資料結構採可選欄位擴充（如 `interruptionCount`, `interruptionReason`, `estimatedPomodoros`），保證舊版資料完全相容。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/background.ts`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskDetailDrawer.tsx`
- `chrome_scrumclock/src/features/project-management/components/tabs/SprintLogsTab.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/SprintPomodoro.tsx`
- `chrome_scrumclock/src/shared/google/googleCalendarService.ts`
- `chrome_scrumclock/src/shared/messaging/outboxQueue.ts`
- `browser-activity-monitor/background.js`
- `browser-activity-monitor/sidepanel/sidepanel.js`
- `browser-activity-monitor/scripts/domain-classifier.js` (新增分類模組)
- `0.doc_mg/tasks/pm_workflow_friction_matrix.md` (需求真理源)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] [N/A] 輕量任務豁免 (本開發以修復摩擦力與體驗增強為主，結案時視架構變更評估是否回寫)

## 3. 任務拆解

### Phase 1: ScrumClock 輸入與屬性速贏 (IF-01 & IF-03) 狀態：`[已完成]`

### Phase 2: 番茄鐘衝刺防護與中斷收集 (SF-02 & SC-V03) 狀態：`[已完成]`

### Phase 3: ActivityMonitor 網域智慧分類與跨插件通訊 (AM-V01 & SF-03) 狀態：`[已完成]`

### Phase 4: 結算週報與結構化工時拋轉 (SC-V02 & EF-03) 狀態：`[已完成]`

## 4. 影響評估
- **破壞性評估**：無破壞性。所有新增屬性均為可選擴充，相容既有 Storage 資料。
- **效能影響**：日曆預警採快取比對；ActivityMonitor 分類字典採記憶體 Map 查表，零網路延遲。
- **跨插件相容**：採原生直連廣播，單向優雅降級，任一插件未開啟皆不引發運行期錯誤。

## 5. 驗收標準
- [x] **外部快速捕獲**: 右鍵選取文字可成功建立任務卡片至 Inbox，並包含網址來源。
- [x] **屬性輸入完整**: TaskDetailDrawer 可正常調整預估番茄數並設定 P0 優先度。
- [x] **中斷與日曆預警**: 衝刺暫停能記錄原因；遇行事曆會議重疊能主動跳出衝突建議。
- [x] **網域分類直觀**: ActivityMonitor 日誌能正確顯示生產力/娛樂標籤並支援篩選。
- [x] **跨插件衝刺標記**: ScrumClock 衝刺時 ActivityMonitor 能自動感知並打上會話標記。
- [x] **週報與拋轉導出**: 能正確產生本週 Markdown 週報，並能一鍵導出標準 CSV 工時紀錄。
- [x] **代碼合規審查**: 通過 CSP、XSS 安全檢查與 TypeScript 編譯無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: c0f1ae83-45b6-42d1-976c-714c8fcf6932 (Gate 1 Blueprint 初始化)
> - 2026-10-03 ID: 3e042038-90f5-458d-a19b-b2aeb85bf617 (Gate 2 Phase 1 完成)
> - 2026-10-03 ID: f0671d86-e520-402d-ba9a-7a2c3a6fc6b9 (Gate 2 Phase 2 完成)
> - 2026-10-03 ID: 01c1de6d-729a-4863-8c8e-dbe5b6114c3b (Gate 2 Phase 3 完成)
> - 2026-10-03 ID: 6191de4c-e3b4-4e93-90ab-5a97c0f7bb75 (Gate 2 Phase 4 完成，全案收斂完工)
> - 2026-10-03 ID: 0ae76c58-5d09-4d22-84d8-d9c250c5efd6 (結案歸檔與 SSOT 封存)

