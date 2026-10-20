---
title: "ScrumClock DailyMissionBriefing 作戰簡報視圖解耦與精簡"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-09-26"
deadline: "2026-10-03"
---

## 1. 目標
將 `chrome_scrumclock/src/features/scrumclock/components/DailyMissionBriefing.tsx` (700 行) 進行模組化解耦。
抽離其內部包含的「日曆行程整合視圖」、「每週任務選取器」、「分心網站設定」與「AI 每日目標建議面板」，降低單一組件複雜度。

## 2. 策略與鎖定檔案
仿照 `SprintPomodoro` 抽離 `components/sprint/` 的架構模式，在 `src/features/scrumclock/components/briefing/` 下建立模組化子元件。

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/features/scrumclock/components/DailyMissionBriefing.tsx`
- `chrome_scrumclock/src/features/scrumclock/components/briefing/BriefingMissionSelector.tsx` (新增)
- `chrome_scrumclock/src/features/scrumclock/components/briefing/BriefingCalendarSchedule.tsx` (新增)
- `chrome_scrumclock/src/features/scrumclock/components/briefing/BriefingSettingsDrawer.tsx` (新增)
- `chrome_scrumclock/SCRUMCLOCK_README.md` (SSOT 文檔維護)

## 3. 任務拆解

### Phase 1: 任務選擇與排程元件拆解 狀態：`[已完成]`

### Phase 2: 設定抽屜與主視圖重組 狀態：`[已完成]`

### Phase 3: 驗證與 SSOT 更新 狀態：`[已完成]`

## 4. 影響評估
- 僅涉及 New Tab 啟動時每日作戰簡報介面之結構優化，不影響衝刺資料存儲。

## 5. 驗收標準
- [x] **技術指標**: 主元件 `DailyMissionBriefing.tsx` 行數降至 250 行以內 (實測 194 行)。
- [x] **核心規範**: 符合 Chrome Extension MV3 與 React 組件解耦原則。
- [x] **除錯清理**: 移除所有測試用 `console.log`。
- [x] **檔案編碼**: 確認所有檔案皆以 UTF-8 (無 BOM) 保存。
- [x] **SSOT 文件同步**: 更新 `SCRUMCLOCK_README.md` 與 `scrumclock-core/SKILL.md` 索引清單。
- [x] **插件驗證**: `npm run build` 通過，且在新分頁進入作戰簡報流暢無卡頓。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 2ddf9c50-f3a8-445e-8ada-c5bf528b994c (初始化)
> - 2026-09-27 ID: bdbb3fdc-b3b4-4d0a-8875-1057c055dbb7 (Phase 1, 2, 3 執行完成並結案)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20260926_scrumclock_refactor_daily_briefing.md，開始執行 Phase 1
> ```
