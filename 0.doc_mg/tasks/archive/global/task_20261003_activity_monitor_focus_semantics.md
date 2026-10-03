---
title: "ActivityMonitor 專注語意化與域名智慧分析"
plugin: "browser-activity-monitor"
status: "規劃中"
created: "2026-10-03"
deadline: "2026-10-07"
---

## 1. 目標
消除 ActivityMonitor 面向 PM 審查時的「封包級噪音與語意脫節」。建立內建工作與休閒常見網域分類庫 (AM-V01)、實作分頁啟用停留時長統計 (EF-01)、專注度綜合評分演算法與儀表板 (AM-V02)，以及日誌匯出時的敏感 Token / 參數去敏過濾 (AM-V04)。

## 2. 策略與鎖定檔案

### 核心策略
1. **網域智慧分類引擎**：建立輕量網域標籤規則字典（生產力、通訊、分心休閒），支援即時標籤渲染與快速篩選切換。
2. **語意化時長聚合**：監聽 `chrome.tabs.onActivated` 與視窗失焦事件，在記憶體計算網域等級的有效停留秒數，而非僅記錄底層 HTTP 封包。
3. **專注度評分模型**：設計加權公式（工作網域佔比、切換頻率、有效衝刺時間），於 Side Panel 呈現 0~100 專注健康指數。
4. **脫敏管線**：在導出日誌時對 URL Query String、內部 IP 及 Token 進行正規化遮蔽。

### 鎖定檔案 (Target Files)
- `browser-activity-monitor/src/types/index.ts`
- `browser-activity-monitor/src/background/index.ts`
- `browser-activity-monitor/src/services/domainClassifier.ts` (新增)
- `browser-activity-monitor/src/services/focusScoreEngine.ts` (新增)
- `browser-activity-monitor/src/services/tabActivityTracker.ts` (新增)
- `browser-activity-monitor/src/sidepanel/components/FocusScoreCard.tsx` (新增)
- `browser-activity-monitor/src/sidepanel/components/ActivityReportModal.tsx`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免
- [ ] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (更新專注度模型與網域分類字典)
- [ ] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (更新專注語意架構與模組矩陣)
- [ ] L3 業務規格：`./0.doc_mg/docs/pm_workflow_friction_matrix.md` (同步落實進度)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 網域智慧分類庫與標籤過濾 狀態：`[待辦]`
- [ ] 任務 1.1: 建立內建工作 vs 休閒域名分類字典 (AM-V01)
    - [ ] 實作 `domainClassifier.ts`，涵蓋常見開發 (GitHub/GitLab)、辦公 (Google/Figma/Notion)、通訊 (Slack/Teams) 與娛樂分心網域。
- [ ] 任務 1.2: 介面標籤渲染與分類過濾開關 (AM-V01)
    - [ ] 於側邊欄即時日誌與報告中標註色彩標籤，提供「僅顯示工作/僅顯示分心」快速過濾。

### Phase 2: 語意化分頁停留時長追蹤 狀態：`[待辦]`
- [ ] 任務 2.1: 監聽分頁啟用與閒置切換 (EF-01)
    - [ ] 監聽 `chrome.tabs.onActivated` 與 `chrome.idle`，追蹤分頁前台停留時長，杜絕單純封包數量誤導。
- [ ] 任務 2.2: 記憶體停留時長聚合與報告整合 (EF-01)
    - [ ] 結算 Session 時輸出以網域為單位的「停留時間分佈圖」，取代底層網路請求列表。

### Phase 3: 專注度綜合評分與隱私去敏拋轉 狀態：`[待辦]`
- [ ] 任務 3.1: 實作專注度評分模型與視覺化儀表板 (AM-V02)
    - [ ] 實作 `focusScoreEngine.ts` 計算 0~100 專注分數，並在側邊欄呈現 `FocusScoreCard`。
- [ ] 任務 3.2: 實作日誌匯出隱私脫敏管線 (AM-V04)
    - [ ] 導出日誌時正規化遮蔽 Query 參數與敏感 Token，產出安全的分享報告。

## 4. 影響評估
- 效能考量: 停留時長追蹤僅在「隨選健檢」或「衝刺模式」下激活，平時維持零開銷待命。
- 權限規範: 依賴現有 `tabs` 與 `idle` 權限，符合 MV3 最小權限要求。

## 5. 驗收標準
- [ ] **分類驗證**: 常見網域能正確識別為工作、辦公或娛樂，並在 UI 上清晰標示。
- [ ] **時長驗證**: 分頁前台停留時長統計準確，切換分頁能正確切分時間。
- [ ] **評分與脫敏**: 專注分數計算符合預期；匯出資料無外洩私有 Token 與查詢字串。
- [ ] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無常駐記憶體洩漏。
- [ ] **代碼清理**: 移除所有除錯用的 `console.log`。
- [ ] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [ ] **SSOT 閉環**: 完成 L1~L4 骨架同步回寫與任務歸檔。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 3247e8d8-8b01-4179-9266-9df9a4af9ad5 (建立子任務 2 規劃)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261003_activity_monitor_focus_semantics.md，開始執行 Phase 1
> ```
