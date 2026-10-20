---
title: "專案經理 (PM) 敏捷衝刺與工時軌跡工作流體檢與斷點分析"
plugin: "global"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-05"
---

## 1. 目標
聚焦專案經理 (PM) 高頻敏捷衝刺日常，實景體檢 ScrumClock（待辦、看板、番茄鐘衝刺）與 ActivityMonitor（活動軌跡、分心分頁與網路請求審查）之協同作業。深度挖掘現有操作流程中的手動中斷點、資料孤島與工時結算阻力，並產出 PM 專屬斷點矩陣與功能真空區清單，作為後續自動化升級之依據。

## 2. 策略與鎖定檔案

### 核心體驗流程
1. **排程與衝刺**：ScrumClock 建立 Epic/User Story 任務卡片、優先級排序、啟動蕃茄鐘專注倒數。
2. **監控與審查**：ActivityMonitor 追蹤衝刺時段之非專注分頁、API 請求與本機資源佔用。
3. **結算與同步**：衝刺結束後進行工時對帳、日誌導出與外部行事曆/看板同步。

### 鎖定檔案 (Target Files)
- 使用說明.md
- 0.doc_mg/docs/cross_plugin_contract.md
- chrome_scrumclock/SCRUMCLOCK_README.md
- browser-activity-monitor/ACTIVITY_MONITOR_README.md
- 0.doc_mg/docs/pm_workflow_friction_matrix.md (規劃產出)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [x] L1 專家技能：.agents/skills/scrumclock-core/SKILL.md、.agents/skills/activity-monitor-core/SKILL.md (補充工作流體驗規格與斷點備註)
- [x] L2 插件導航：chrome_scrumclock/SCRUMCLOCK_README.md、browser-activity-monitor/ACTIVITY_MONITOR_README.md
- [x] L3 業務規格：0.doc_mg/docs/pm_workflow_friction_matrix.md (PM 斷點診斷矩陣與真空區盤點)
- [x] L4 任務生命週期：0.doc_mg/tasks/archive/global/ (結案後封存)

## 3. 任務拆解

### Phase 1: PM 敏捷排程與專注衝刺閉環實測 狀態：`[已完成]`
- [x] 任務 1.1: 測試任務卡片建立與層級管理
    - [x] 驗證 ScrumClock 新增 Epic/User Story/Subtask 之輸入流暢度
    - [x] 測試標籤分類、估算工時與優先度 (P0~P3) 設定便利性
- [x] 任務 1.2: 測試番茄鐘專注衝刺與中斷保護
    - [x] 啟動番茄鐘倒數，驗證專注模式下中斷/暫停記錄機制
    - [x] 測試音效、通知與衝刺結算彈窗

### Phase 1 實測診斷成果紀錄
1. **任務卡片層級管理 (任務 1.1)**：
   - **資料模型扁平**：`WeeklyMission` 為單層扁平結構，缺乏 `parentId` 與 `Epic / Story / Subtask` 敏捷層級劃分。
   - **AI 拆解子任務平鋪**：Gemini 拆解後的行動子任務「批量轉入任務池」時，以獨立平鋪任務寫入，失去與父任務的樹狀階層與摺疊關聯。
   - **屬性編輯缺口**：
     - 優先度僅有 `P1`、`P2`、`P3`，缺乏緊急阻斷等級 `P0` (Blocker)。
     - 資料結構雖有 `estimatedPomodoros`，但 `TaskDetailDrawer` 抽屜面板**缺少預估工時輸入元件**，僅能透過 Google Calendar 預約時間箱。
     - 缺乏視覺化標籤管理元件，需手動於文字夾帶 `#tag`。

2. **番茄鐘專注衝刺與中斷保護 (任務 1.2)**：
   - **衝刺與封鎖**：倒數啟動正常觸發 Calendar Busy Event 與 DeclarativeNetRequest 分心網站封鎖。
   - **中斷記錄真空**：`pauseSprint` 僅解除封鎖並將狀態設為 `paused`，完全未記錄中斷次數 (Interruption Count) 或打擾原因 (會議/突發溝通)，無法產出敏捷專注品質指標。
   - **彈窗結算限制**：衝刺完成彈出 `SprintResultModal` 並自動將 `spentPomodoros + 1`，但若提前中止或需部分工時折抵，系統無彈性結算機制。

### Phase 2: 衝刺期間活動軌跡審查與工時對齊 狀態：`[已完成]`
- [x] 任務 2.1: 測試 ActivityMonitor 背景追蹤與分頁分心指標
    - [x] 驗證衝刺期間瀏覽非關聯網站時之活動記錄精準度
    - [x] 審查 Request 監控與 DOM 負載對專注體驗之效能影響
- [x] 任務 2.2: 實測活動日誌與任務工時之手動比對阻力
    - [x] 測試由 ActivityMonitor 數據回溯至 ScrumClock 任務卡片之比對摩擦

### Phase 2 實測診斷成果紀錄
1. **背景追蹤與分心指標 (任務 2.1)**：
   - **底層網路噪音 vs 語意化停留時長**：ActivityMonitor 核心架構為 `webRequest` 網路封包與敏感權限審查，未追蹤 `tabs.onActivated` 停留時長，亦無「工作 vs 娛樂」網域分類庫。當 PM 衝刺時瀏覽分心網站，系統記錄的是數十筆靜態資源/CDN 請求，無法產出直觀的「分心時長與分心指數」。
   - **串流資訊過載對專注的干擾**：即時面板雖有 30 筆環形緩衝區保護，但高頻封包串流會造成視圖高頻跳動，使 PM 面臨「底層數據過載」，而非「專注狀態簡報」。

2. **活動日誌與工時對齊阻力 (任務 2.2)**：
   - **雙向資料孤島**：`ActivityLog` 缺乏 `sprintId` 與 `missionId` 外鍵關聯，ActivityMonitor 的 IndexedDB 與 ScrumClock 的 `sprintLogs` 完全脫鉤。
   - **人工對帳認知負擔**：PM 衝刺後若需核實工時投入分頁，必須人工比對時間戳，並在一堆雜亂請求中肉眼篩選工作網址，手動抄寫回任務卡片，單次結算耗時 3~5 分鐘，形成顯著工作流摩擦。

### Phase 3: 斷點挖掘與 PM 摩擦力矩陣產出 狀態：`[已完成]`
- [x] 任務 3.1: 盤點三級摩擦力 (輸入、同步、匯出)
    - [x] 輸入摩擦力：任務手動建立過繁、無法外部快速捕獲
    - [x] 同步摩擦力：無 Google Calendar/Tasks 雙向即時排程
    - [x] 匯出摩擦力：工時結算需手動複製、缺乏 Jira/Sheets 結構化拋轉
- [x] 任務 3.2: 撰寫 PM 斷點分析報告 (0.doc_mg/docs/pm_workflow_friction_matrix.md)

### Phase 3 實測診斷成果紀錄
1. **三級摩擦力深度診斷 (任務 3.1)**：
   - **輸入摩擦力 (Input Friction)**：
     - **IF-01 外部捕獲真空**：無法於 GitHub PR、Jira、Slack 透過反白右鍵或快捷鍵快速捕獲任務，跨頁複製造成情境切換阻力 (每任務 15~30s)。
     - **IF-02 缺乏敏捷階層**：`WeeklyMission` 為單層扁平結構，缺乏 `Epic -> Story -> Subtask` 關聯。
     - **IF-03 關鍵屬性缺口**：抽屜面板缺少 `estimatedPomodoros` 預估輸入元件，優先級缺乏阻斷級 `P0`。
   - **同步摩擦力 (Sync Friction)**：
     - **SF-01 外部日曆單向阻力**：僅支援衝刺單向寫入 Busy Event，缺乏與 Google Tasks / Calendar 雙向同步排程，外部會議改期無法聯動。
     - **SF-02 中斷指標真空**：番茄鐘暫停未記錄中斷次數 (Interruption Count) 與中斷原因（會議/插單），無法產出敏捷專注品質指標。
     - **SF-03 跨插件狀態脫鉤**：ScrumClock 啟動衝刺時 ActivityMonitor 不知情，無法自動打上衝刺會話標記。
   - **匯出摩擦力 (Export Friction)**：
     - **EF-01 封包噪音 vs 語意停留**：ActivityMonitor 記錄的是底層 `webRequest`，無分頁停留時長與網域分類，肉眼過濾造成認知過載。
     - **EF-02 工時結算肉眼比對**：缺少 `missionId` 關聯，兩插件資料庫完全脫鉤，每日對帳需 10~15 分鐘。
     - **EF-03 缺乏結構化拋轉**：結算後無法一鍵匯出為 Jira Worklog / Sheets 格式，需重複手動複製。
2. **產出 PM 斷點分析報告 (任務 3.2)**：
   - 已建立 [pm_workflow_friction_matrix.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/docs/pm_workflow_friction_matrix.md)，定義完整 8 大斷點編號、時長代價評級、跨插件深水區時序圖與三階段演進藍圖。

### Phase 4: PM 場景功能真空區盤點與優先度評估 狀態：`[已完成]`
- [x] 任務 4.1: 盤點 ScrumClock 與 ActivityMonitor 之功能真空區
    - [x] ScrumClock：缺少甘特圖視角、週/月報日誌自動匯出、行事曆衝突預警
    - [x] ActivityMonitor：缺少依工作/休閒域名智慧打標、專注度分數
- [x] 任務 4.2: 產出 Impact vs Effort 優先度評估清單

### Phase 4 實測診斷成果紀錄
1. **PM 場景功能真空區深度盤點 (任務 4.1)**：
   - **ScrumClock 四大真空**：
     - **SC-V01 甘特圖/時序依賴視圖**：僅有看板與清單，無法視覺化 Epic/Story 時序依賴與關鍵路徑，需外部工具補償。
     - **SC-V02 自動化週/月報日誌匯出**：缺乏一鍵聚合當週完成任務、衝刺達成率與工時中斷率的匯出功能，每週需 30~45 分鐘手工複製整理。
     - **SC-V03 行事曆衝突預警**：啟動番茄鐘未檢查近端 Google Calendar 會議重疊，衝刺易遭突發會議打斷。
     - **SC-V04 團隊容量與燃盡圖**：缺少 Sprint 週期工時預算 (Capacity) 與燃盡曲線 (Burndown)。
   - **ActivityMonitor 四大真空**：
     - **AM-V01 工作 vs 休閒域名智慧分類**：僅有底層請求與安全性標籤，缺乏生產力/辦公協作/娛樂社交分類庫，需肉眼識別網址。
     - **AM-V02 專注度綜合評分演算法**：缺乏綜合「分頁切換頻率」、「休閒網站停留佔比」、「背景雜訊」的量化專注指標 (0~100 分)。
     - **AM-V03 衝刺關聯分頁快照 (Audit Reel)**：衝刺時段未自動聚合頂層導航工作網址作為任務證據鏈。
     - **AM-V04 隱私去敏與報告拋轉**：匯出日誌缺少 Query Parameter 與私有 IP 脫敏機制，無法作為外部審查憑證。
2. **Impact vs Effort 優先度評估矩陣 (任務 4.2)**：
   - 已於 [pm_workflow_friction_matrix.md](file:///c:/Users/G1/00.coding%20workspace/chrome%20plus%20project/0.doc_mg/docs/pm_workflow_friction_matrix.md) 繪製 Mermaid quadrantChart 象限圖與 16 項功能的詳細落地方案。
   - **P0 速贏 (Quick Wins)**：外部選取文字右鍵快速捕獲 (IF-01)、抽屜預估工時與 P0 屬性 (IF-03)、衝刺中斷原因收集 (SF-02)、行事曆衝突預警 (SC-V03)、工作/休閒域名分類庫 (AM-V01)、一鍵週報匯出 (SC-V02)、結構化 Worklog 匯出 (EF-03)、跨插件通訊契約落實 (SF-03)。
   - **P1 策略核心 (Major Projects)**：任務模型支援 Epic/Story/Task 樹狀結構 (IF-02)、語意化分頁停留時長追蹤 (EF-01)、工時自動對齊與任務外鍵 (EF-02)、Google 日曆雙向排程 (SF-01)、專注度評分模型 (AM-V02)。

## 4. 影響評估
- 本任務為體驗診斷與規格藍圖規劃，無原始碼破壞性修改。
- 診斷結果直接作為後續跨插件通訊合約與 Google 生態系對接之需求 SSOT。

## 5. 驗收標準
- [x] **流程體驗完整度**: 完整走訪 PM 排程、衝刺、審查與結算四大流程。
- [x] **斷點診斷詳盡性**: 產出包含輸入、同步、匯出三維度之具體摩擦點與時間耗損評估。
- [x] **功能真空區清晰度**: 列出 PM 場景下兩大插件的關鍵缺失功能與優先度建議。
- [x] **檔案編碼**: 確認所有產出文檔均為 UTF-8 (無 BOM)。
- [x] **SSOT 閉環**: 完成 Target SSOTs 宣告之文檔回寫與任務封存歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: abb958bf-8a04-4d80-b88c-060fcc532328 (Gate 1 Blueprint 初始化)
> - 2026-10-03 ID: 9938c35c-38a1-42b8-8805-ddbb2e652947 (Gate 2 Phase 1 & 2 執行完成)
> - 2026-10-03 ID: 319d5e72-5cdc-4764-9958-45f9d6b87dae (Gate 2 Phase 3 執行完成)
> - 2026-10-03 ID: c0f1ae83-45b6-42d1-976c-714c8fcf6932 (Gate 2 Phase 4 執行完成與 SSOT 結案封存)
>
> **任務生命週期狀態**: 本任務已結案歸檔至 `0.doc_mg/tasks/archive/global/task_20261003_global_pm_workflow_friction_analysis.md`。
