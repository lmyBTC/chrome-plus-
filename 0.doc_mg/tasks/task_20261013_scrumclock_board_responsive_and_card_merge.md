---
title: "ScrumClock 看板筆電響應式 UI/UX 體驗與拖曳卡片合併功能"
plugin: "chrome_scrumclock"
status: "規劃中"
created: "2026-10-13"
deadline: "2026-10-14"
---

## 1. 目標
解決專案規劃看板在筆電小螢幕（1280px~1440px）環境下介面擁擠無法舒適使用的問題，並徹底優化卡片合併與甬道顯示體驗：
1. **看板甬道聚焦與收折 (Core Columns: Backlog & Doing)**：
   - 敏捷看板常態工作主要關注 **Backlog (Next Action) 與 Doing (In Progress)**。
   - 將 **Idea (Inbox / Someday)** 與 **Done** 改為「可收折/非強制常駐顯示」模式（提供頂部快速切換或欄位一鍵折疊條），預設聚焦 Backlog & Doing，大幅釋放筆電螢幕水平空間。
2. **筆電排版體驗重塑 (UI/UX)**：解放強制 4 欄擠壓，在欄位展開時引入自適應水平捲軸（設定最小寬度 `min-w-[320px]`），微調卡片 padding 與排版，打造高呼吸感與不擠壓的看板視野。
3. **直覺拖曳合併卡片 (Drag A onto B to Merge)**：支援將任務卡片 A 直接拖曳至卡片 B 釋放，自動捕捉拖放目標並彈出「合併任務編輯確認 Modal」，預設帶入雙方標題、筆記備註、預估番茄鐘與清單，經使用者檢視確認後完成合併並清理來源卡片。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `chrome_scrumclock/src/dashboard/components/BoardView.tsx`
- `chrome_scrumclock/src/dashboard/components/TaskCard.tsx`
- `chrome_scrumclock/src/dashboard/components/MergeTaskModal.tsx`
- `chrome_scrumclock/src/features/project-management/components/ProjectManagementDemo.tsx`
- `chrome_scrumclock/src/features/project-management/components/tabs/TaskPoolTab.tsx`

### 鎖定工具鏈 (Target Devtools)
- [ ] 探勘骨架/雷達: `py 1.devtools/tools/code_skeleton.py <目標檔案>` 或 `py 1.devtools/tools/repo_radar.py`
- [ ] 終端日誌脫水: `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` (或 `rtk`)
- [ ] 結案自動審計: `py 1.devtools/tools/audit_manifests.py` / `py 1.devtools/tools/doc_cross_ref.py`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (無元件增刪、無 Storage Schema 改動、無跨插件通訊變更)
- [ ] L1 專家技能：`.agents/skills/scrumclock-core/SKILL.md` (登錄 MergeTaskModal 元件職責)
- [ ] L2 插件導航：`chrome_scrumclock/SCRUMCLOCK_README.md` (更新看板元件清單與交互規格)
- [ ] L3 業務規格：`chrome_scrumclock/docs/kanban-spec.md` (若無獨立規格則併入 README)
- [ ] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 看板甬道聚焦（Backlog & Doing 主力）與筆電佈局優化 狀態：`[已完成]`
- [x] 任務 1.1: 甬道常駐切換與可收折機制 (Column Collapse / Focus Mode)
    - [x] [骨架提煉] 調用 `py 1.devtools/tools/code_skeleton.py chrome_scrumclock/src/dashboard/components/BoardView.tsx` 確認現有欄位列舉。
    - [x] [預設顯示控制] 引入欄位顯示偏好狀態（可持久化於 local storage），預設重點展開 `next-action` (Backlog) 與 `in-progress` (Doing)。
    - [x] [收折樣式] 將 `inbox` (Idea) 與 `done` 支援「一鍵收折為縱向緊湊導航條」（顯示徽章數量與展開按鈕），點擊快速展開，不佔滿筆電橫向版面。
- [x] 任務 1.2: 看板自適應水平滾動與卡片排版微調
    - [x] [自適應排版] 若全部欄位展開，提供平滑橫向滾動容器（每欄保證充足寬度 ≥ 300px），杜絕小螢幕擠扁。
    - [x] [卡片細節調校] 微調 `TaskCard.tsx` 的 padding、標籤大小與按鈕熱區。
    - [x] [外層調校] 檢視 `ProjectManagementDemo.tsx` 與 `TaskPoolTab.tsx` 外層 padding/gap，在 `< 1440px` 寬度釋放更多有效視野空間。
    - [x] [終端脫水] 執行 `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` 驗證 TypeScript 與樣式編譯無誤。

### Phase 2: 拖曳卡片合併交互與 MergeTaskModal 實作 狀態：`[待辦]`
- [ ] 任務 2.1: TaskCard 拖曳放置目標辨識 (Drag Over / Drop on Card)
    - [ ] [拖曳監聽] 在 `TaskCard.tsx` 新增 `onDragOver`, `onDragEnter`, `onDragLeave`, `onDropOnCard` 事件回調與 hover 高亮外框反饋（例如藍紫色外發光與「釋放以合併」微提示）。
    - [ ] [冒泡防護] 在卡片 drop 時執行 `e.stopPropagation()`，防止被外層看板欄位當成跨欄搬移。
- [ ] 任務 2.2: 建立 MergeTaskModal 元件與合併預設邏輯
    - [ ] [元件實作] 建立 `MergeTaskModal.tsx`，接收 `sourceTask` (拖曳卡片 A) 與 `targetTask` (目標卡片 B)。
    - [ ] [預設資料組裝]
        - 標題：預設保留目標卡片標題，並提供快捷按鈕拼接雙方標題。
        - 內容筆記：自動合併兩者 notes，清晰分隔標記。
        - 預估與已耗費番茄鐘：累加 `estimatedPomodoros` 與 `spentPomodoros`。
        - 檢查清單 (Checklist)：自動匯整雙方 checklist 項目。
    - [ ] [確認與執行] 使用者可直接編輯微調，點擊「確認合併」後更新目標任務並刪除來源任務。
- [ ] 任務 2.3: 看板狀態與資料流串接
    - [ ] [整合] 在 `BoardView.tsx` / `TaskPoolTab.tsx` 整合 `MergeTaskModal`，串接 `onUpdateTitle`, `onUpdateNotes`, `onDeleteTask` 等既有 API。
    - [ ] [終端脫水] 執行 `npm run build 2>&1 | py 1.devtools/tools/compact_log.py` 驗證建置。

### Phase Final: 自動化審計與 SSOT 閉環 狀態：`[待辦]`
- [ ] 任務 F.1: 自動化工具合規審計
    - [ ] [Manifest 審計] 執行 `py 1.devtools/tools/audit_manifests.py` 驗證權限與 CSP 合規。
    - [ ] [文檔交叉引用] 執行 `py 1.devtools/tools/doc_cross_ref.py` 驗證 SSOT 鏈條無死連結。
- [ ] 任務 F.2: SSOT 實體回寫與任務歸檔
    - [ ] [SSOT 回寫] 依 Target SSOTs 回寫 L1 專家技能與 L2 插件導航。
    - [ ] [實體歸檔] 任務完成後依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。

## 4. 影響評估
- **權限與 API**: 本次為純前端 UI/UX 排版與現有任務狀態更新整合，不涉及額外 Chrome 權限變更。
- **儲存相容性**: 使用現有 `WeeklyMission` 介面結構，完全向後相容。
- **使用者體驗**: 大幅改善筆電小螢幕用戶的操作流暢度，聚焦主力工作甬道（Backlog & Doing），並大幅提升多卡片整理歸納的工作效率。

## 5. 驗收標準
- [x] **看板甬道聚焦模式**:
    - [x] 看板預設重點聚焦展開 **Backlog (`next-action`)** 與 **Doing (`in-progress`)** 兩大主力甬道。
    - [x] **Idea (`inbox`/`someday`)** 與 **Done (`done`)** 甬道支援一鍵折疊/收合為極簡縱向欄條，並可隨時點擊展開。
- [x] **筆電螢幕適應**: 在 1280px ~ 1440px 視窗寬度下，主力甬道擁有充足寬度，即便展開所有欄位亦具備橫向平滑捲動，卡片文字排版呼吸感良好。
- [ ] **拖曳合併體驗**:
    - [ ] 將卡片 A 拖曳至卡片 B 上時，目標卡片有明確的高亮視覺提示。
    - [ ] 釋放拖曳後正確彈出合併確認視窗，不會誤觸欄位搬移。
    - [ ] 合併視窗預設彙整兩者的標題、筆記、番茄鐘與清單，可自由編輯。
    - [ ] 點擊「確認合併」後，目標卡片更新為合併內容，來源卡片正確被清理。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無錯誤。
- [ ] **工具鏈合規審查 (Devtools Audit)**:
    - [x] 探勘階段已優先調用骨架工具提煉結構。
    - [x] 建置輸出已串接日誌脫水過濾 (`compact_log.py`)。
    - [ ] 結案前已執行 `audit_manifests.py` / `doc_cross_ref.py` 自動驗證。
- [ ] **除錯清理**: 移除所有除錯用的 `console.log()`。
- [ ] **檔案編碼**: UTF-8 (無 BOM) 編碼。
- [ ] **SSOT 閉環**: L1/L2 回寫完成，並移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/` 結案。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> [x] 探勘逾 100 行代碼時，已強制優先調用骨架/雷達工具提取結構，未直接盲讀原始碼。
> [x] 終端建置日誌長篇輸出已串接 `compact_log.py` 或 `rtk` 進行脫水過濾。
> [ ] 結案前已執行 `audit_manifests.py` / `doc_cross_ref.py` 完成自動化驗證。
>
> **Devtools 工具調用紀錄 (工具名稱 / 目標 / 節省效益)**:
> - `code_skeleton.py`: 提煉 BoardView.tsx (858行➔40行, -95%)、TaskCard.tsx (373行➔17行, -95%)、TaskPoolTab.tsx (848行➔6行, -99%)、ProjectManagementDemo.tsx (249行➔34行, -86%)
> - `compact_log.py`: 建置日誌脫水 (3140 字元 ➔ 80 字元, -97.5%)
> - `audit_manifests.py`: 預備用於結案合規審計
>
> **參與對話 ID 紀錄**:
> - 2026-10-13 ID: aedf7a44-e836-43bd-a28b-a632100d98dc (初始化 Gate 1 藍圖並納入甬道聚焦需求)
> - 2026-10-13 ID: 442bc1bc-b1eb-4ef8-a0d7-0b667a9b8bbd (執行 Phase 1 看板甬道聚焦與筆電自適應排版)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261013_scrumclock_board_responsive_and_card_merge.md，開始執行 Phase 2
> ```
