---
title: "專案經理 (PM) 敏捷工作流摩擦力消除與體驗升級 (總綱索引)"
plugin: "global"
status: "已廢棄 (Over-engineering Cancelled)"
created: "2026-10-03"
deadline: "2026-10-08"
---

## 1. 目標
本任務為 PM 敏捷工作流摩擦力消除之 Master Epic 總綱。根據 0.doc_mg/docs/pm_workflow_friction_matrix.md 體檢成果，為消弭「輸入、同步、匯出」三級摩擦力與功能真空區，依據「多插件邊界防禦與契約協同」原則分拆為 3 個獨立子任務。透過原子化推進，打通「排程規劃 -> 專注衝刺 -> 軌跡審查 -> 工時結算」的敏捷飛輪。

## 2. 子任務拆解清單與執行導航

1. **子任務 1：ScrumClock 敏捷排程與專注體驗升級** `[規劃中]`
   - 任務檔案：0.doc_mg/tasks/task_20261003_scrumclock_pm_experience_enhancement.md
   - 涉及項目：IF-01 (右鍵快速捕獲), IF-03 (預估工時與 P0 Blocker), SF-02 (中斷記錄與原因), SC-V02 (一鍵週報匯出), SC-V03 (行事曆衝突預警)
   - 核心插件：chrome_scrumclock

2. **子任務 2：ActivityMonitor 專注語意化與域名智慧分析** `[規劃中]`
   - 任務檔案：0.doc_mg/tasks/task_20261003_activity_monitor_focus_semantics.md
   - 涉及項目：AM-V01 (工作 vs 休閒域名分類庫), EF-01 (分頁停留時長追蹤), AM-V02 (專注度綜合評分模型), AM-V04 (隱私脫敏過濾)
   - 核心插件：browser-activity-monitor

3. **子任務 3：跨插件衝刺通訊契約與工時結算自動化** `[規劃中]`
   - 任務檔案：0.doc_mg/tasks/task_20261003_cross_plugin_sprint_integration.md
   - 涉及項目：SF-03 (跨插件通訊廣播 SPRINT_SESSION_EVENT), EF-02 (工時自動對齊與任務外鍵注入), EF-03 (結構化 Worklog 匯出 Markdown/CSV/Jira)
   - 核心插件：chrome_scrumclock, browser-activity-monitor (依循 0.doc_mg/docs/cross_plugin_contract.md)

## 3. 執行進度總覽
- [ ] 子任務 1: ScrumClock 敏捷排程與專注體驗升級 (0.doc_mg/tasks/task_20261003_scrumclock_pm_experience_enhancement.md)
- [ ] 子任務 2: ActivityMonitor 專注語意化與域名智慧分析 (0.doc_mg/tasks/task_20261003_activity_monitor_focus_semantics.md)
- [ ] 子任務 3: 跨插件衝刺通訊契約與工時結算自動化 (0.doc_mg/tasks/task_20261003_cross_plugin_sprint_integration.md)

## 4. 驗收標準
- [ ] 三個子任務檔案均符合 `task_template_v2.md` 規範與四層 SSOT 回寫宣告。
- [ ] 每個子任務均包含適當大小之 Phase（每 Phase ≤ 2~3 個原子任務），杜絕單一 Task 負載過重。
- [ ] 各子任務執行時遵循三階段守門門禁（Gate 2 原子化執行與動態收斂）。
- [ ] 各子任務執行完畢後依封存協議歸檔至對應插件或全域目錄。

## 5. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 3247e8d8-8b01-4179-9266-9df9a4af9ad5 (建立 Master Epic 總綱與子任務規劃)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context，可按子任務順序執行：
> - 執行子任務 1：`載入 ./0.doc_mg/tasks/task_20261003_scrumclock_pm_experience_enhancement.md，開始執行 Phase 1`
> - 執行子任務 2：`載入 ./0.doc_mg/tasks/task_20261003_activity_monitor_focus_semantics.md，開始執行 Phase 1`
> - 執行子任務 3：`載入 ./0.doc_mg/tasks/task_20261003_cross_plugin_sprint_integration.md，開始執行 Phase 1`
