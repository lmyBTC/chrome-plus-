---
title: "跨插件衝刺通訊契約與工時結算自動化"
plugin: "global"
status: "規劃中"
created: "2026-10-03"
deadline: "2026-10-08"
---

## 1. 目標
打破 ScrumClock 與 ActivityMonitor 之間的「資料孤島與語意斷層」。落實 0.doc_mg/docs/cross_plugin_contract.md 中定義的 `EVENT_SPRINT_START` / `EVENT_SPRINT_END` 廣播事件 (SF-03)，於活動日誌中注入 `missionId` 實現工時軌跡自動對齊 (EF-02)，並提供一鍵結構化拋轉為 Markdown / CSV / Jira Worklog 格式 (EF-03)，徹底消滅手動肉眼比對。

## 2. 策略與鎖定檔案

### 核心策略
1. **外部通訊廣播管線**：ScrumClock 啟動/停止番茄鐘時，透過 `chrome.runtime.sendMessage(EXTENSION_ID)` 或全域 LocalStorage 廣播衝刺起訖事件。
2. **衝刺會話標記**：ActivityMonitor 接收事件後，自動啟動「衝刺伴隨追蹤」，並將 `sprintSessionId` 與 `missionId` 注入活動日誌。
3. **自動對齊結算**：衝刺結束時，ActivityMonitor 自動生成該次衝刺專屬的「任務關聯分頁快照與時長簡報」，回傳或呈現給 PM。
4. **結構化拋轉管線**：在衝刺結算彈窗提供一鍵複製為標準 CSV 與 Jira Worklog JSON/Markdown。

### 鎖定檔案 (Target Files)
- `0.doc_mg/docs/cross_plugin_contract.md`
- `chrome_scrumclock/src/features/scrumclock/contexts/TimerContext.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/SprintResultModal.tsx`
- `browser-activity-monitor/src/background/index.ts`
- `browser-activity-monitor/src/services/crossPluginReceiver.ts` (新增)
- `chrome_scrumclock/src/services/worklogExporter.ts` (新增)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [ ] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md`、`./.agents/skills/activity-monitor-core/SKILL.md` (更新跨插件通訊架構與外鍵約定)
- [ ] L2 插件導航：`./chrome_scrumclock/SCRUMCLOCK_README.md`、`./browser-activity-monitor/ACTIVITY_MONITOR_README.md`
- [ ] L3 業務規格：`./0.doc_mg/docs/cross_plugin_contract.md` (確認通訊 Payload 最終定義)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 跨插件衝刺通訊契約落實 (SF-03) 狀態：`[待辦]`
- [ ] 任務 1.1: ScrumClock 衝刺起訖事件廣播發布
    - [ ] 於 `TimerContext.tsx` 在衝刺開始與結束時，發布包含 `missionId`、`title`、`duration` 之契約事件。
- [ ] 任務 1.2: ActivityMonitor 接收事件與模式聯動
    - [ ] 於 `crossPluginReceiver.ts` 監聽廣播，衝刺開始時自動切換至「衝刺專注審查模式」，衝刺結束時自動結算。

### Phase 2: 活動日誌任務外鍵與工時自動對齊 (EF-02) 狀態：`[待辦]`
- [ ] 任務 2.1: 日誌注入 `missionId` 外鍵與分頁快照 (AM-V03)
    - [ ] ActivityMonitor 於衝刺期間收集的頂層網頁存入該 `sprintSessionId`，形成任務關聯證據鏈。
- [ ] 任務 2.2: 衝刺結算自動對帳視圖
    - [ ] 於衝刺結束彈窗 (`SprintResultModal`) 中直接帶出本次衝刺所訪問的關鍵工作網域與耗時，免去肉眼比對。

### Phase 3: 結構化工時拋轉與報告導出 (EF-03) 狀態：`[待辦]`
- [ ] 任務 3.1: 實作 Worklog 匯出轉換器 (`worklogExporter.ts`)
    - [ ] 支援一鍵將「任務名稱 + 消耗番茄鐘 + 分頁軌跡 + 耗時」輸出為 Markdown 摘要與 CSV 檔案。
- [ ] 任務 3.2: 支援 Jira Worklog 格式快速複製
    - [ ] 提供符合 Jira 工時登記格式 (`/rest/api/2/issue/{id}/worklog`) 的文字快速複製按鈕。

## 4. 影響評估
- 跨插件隔離性: 兩插件仍保持 100% 獨立運行；若任一插件未安裝，透過可選連線 (Optional Messaging) 降級為本機模式，完全不報錯。
- 通訊安全性: 依循 `cross_plugin_contract.md` 嚴格檢查 `sender.id` 或來源結構。

## 5. 驗收標準
- [ ] **廣播通訊**: ScrumClock 啟動衝刺時，ActivityMonitor 成功接收並記錄 `sprintSessionId`。
- [ ] **工時對齊**: 衝刺結束時能準確顯示當次衝刺的網頁停留軌跡與 `missionId` 關聯。
- [ ] **拋轉導出**: 一鍵複製 Markdown、CSV 與 Jira 格式正確無誤。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無跨插件未捕捉錯誤。
- [ ] **代碼清理**: 移除所有除錯用的 `console.log`。
- [ ] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 閉環**: 完成 L1~L4 骨架同步回寫與任務歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 3247e8d8-8b01-4179-9266-9df9a4af9ad5 (建立子任務 3 規劃)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261003_cross_plugin_sprint_integration.md，開始執行 Phase 1
> ```
