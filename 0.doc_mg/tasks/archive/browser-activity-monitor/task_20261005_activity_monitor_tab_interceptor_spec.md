---
title: "ActivityMonitor 自動跳窗分頁攔截（AM-04）- 網域黑名單硬封殺機制開發"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-05"
deadline: "2026-10-06"
---

## 1. 目標
基於 AM-04 規格，開發「自動跳出新開分頁攔截器」第一階段核心功能——**網域黑名單（Domain Blacklist）硬封殺機制**：
1. **規則模型與比對引擎**：建立黑名單規則集儲存於 `chrome.storage.local`，支援完全匹配與萬用字元（Wildcard，如 `*.popunder.com`）比對。
2. **前後端雙層硬封殺攔截**：
   - 後端：Service Worker 透過 `chrome.tabs.onCreated` 針對命中黑名單來源（Opener Tab）或目標 URL 的跳出分頁實施毫秒級秒關（`chrome.tabs.remove`）與審計日誌記錄。
   - 前端：Content Script 於命中黑名單頁面攔截 `window.open` 與惡意 `target="_blank"` 點擊事件。
3. **Sidepanel 管理介面**：在活動監控面板提供黑名單規則之檢視、手動新增、編輯、刪除、開關切換與即時攔截計數。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `browser-activity-monitor/manifest.json` (加入 `"storage"` 權限與 Content Script 註冊)
- `browser-activity-monitor/scripts/tab-interceptor.js` (新增：黑名單核心比對邏輯與規則儲存管理)
- `browser-activity-monitor/scripts/interceptor-content.js` (新增：頁面端 `window.open` 覆寫與攔截通知)
- `browser-activity-monitor/background.js` (整合 `tab-interceptor`，監聽 `tabs.onCreated` 與事件通訊)
- `browser-activity-monitor/sidepanel/sidepanel.html` (新增分頁攔截與黑名單規則管理面板)
- `browser-activity-monitor/sidepanel/sidepanel.js` (黑名單 UI 互動、規則 CRUD 與統計呈現)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [ ] [N/A] 輕量任務豁免 (此任務包含 Storage 模型改動與新元件新增，需落實閉環)
- [x] L1 專家技能：`.agents/skills/activity-monitor-core/SKILL.md` (同步更新模組結構與 AM-04 能力)
- [x] L2 插件導航：`browser-activity-monitor/ACTIVITY_MONITOR_README.md` (同步更新實作狀態與架構說明)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 規則引擎與 Background 硬封殺攔截 狀態：`[已完成]`
- [x] 任務 1.1: 審查並更新 `manifest.json`，補齊 `"storage"` 權限。
- [x] 任務 1.2: 新增 `browser-activity-monitor/scripts/tab-interceptor.js`，定義黑名單資料結構（`domain`, `enabled`, `createdAt`, `matchMode`）與高效比對演算法。
- [x] 任務 1.3: 於 `background.js` 掛載 `chrome.tabs.onCreated` 攔截監聽器，透過 `openerTabId` 或目標 URL 匹配黑名單，執行強制秒關與日誌計數紀錄。

### Phase 2: 前端 DOM 覆寫與 Content Script 防禦 狀態：`[已完成]`
- [x] 任務 2.1: 建立 `browser-activity-monitor/scripts/interceptor-content.js` 與 `interceptor-main.js`，在 `document_start` 覆寫原生 `window.open`，阻斷無效彈窗並發送訊息至 Background。
- [x] 任務 2.2: 攔截黑名單網域中未授權觸發之 `target="_blank"` 超連結跳轉。

### Phase 3: Sidepanel 黑名單規則管理介面 狀態：`[已完成]`
- [x] 任務 3.1: 於 `sidepanel.html` 設計「分頁攔截 (Tab Trap)」專區，包含狀態摘要、黑名單列表容器與新增輸入表單。
- [x] 任務 3.2: 於 `sidepanel.js` 實作黑名單 CRUD 互動（新增、啟用/停用切換、刪除），並與 `chrome.storage.local` 即時雙向同步。
- [x] 任務 3.3: 實作攔截即時統計（今日攔截次數、最近攔截目標網址列表）。

### Phase 4: 測試驗證、SSOT 閉環與封存 狀態：`[已完成]`
- [x] 任務 4.1: 本地測試黑名單完全匹配與萬用字元匹配（驗證 `window.open` 與非同步開窗皆能硬封殺）。
- [x] 任務 4.2: 回寫 SSOT（更新 `activity-monitor-core/SKILL.md` 與 `ACTIVITY_MONITOR_README.md`）。
- [x] 任務 4.3: 執行安全合規與代碼清理，完成任務驗收並歸檔至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。

## 4. 影響評估
- **效能影響**：規則比對採記憶體快取 + Storage 增量更新架構，`tabs.onCreated` 僅在事件觸發時計時比對，無常駐計時器負載。
- **相容性與隔離性**：遵循多插件隔離，所有代碼均在 `browser-activity-monitor/` 內部；黑名單比對僅針對符合條件之網域，不干擾一般合法瀏覽。
- **權限變更**：新增 `"storage"` 權限以保存使用者黑名單規則集，符合 Chrome 擴充功能最小權限原則。

## 5. 驗收標準
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**:
  - [x] 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）
- [x] **除錯清理**: 已確認無除錯雜訊或註解殘留。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - [2026-10-05] ID: 8220683f-8038-4f36-95d8-cf61bda7bc9a (初始化任務藍圖)
> - [2026-10-05] ID: 760b1efb-fff3-4bd7-8554-bfc09c1df9ad (完成 Phase 1 規格撰寫)
> - [2026-10-05] ID: cbaea621-ebe9-452e-8df9-b38fed10178e (轉化為 AM-04 網域黑名單開發任務藍圖)
> - [2026-10-05] ID: 6dbdf630-34e9-4ca1-a809-8cd88a043d96 (完成 Phase 1 規則引擎與 Background 硬封殺攔截)
> - [2026-10-05] ID: 7452c18c-84d6-44ed-b934-729cbe658f74 (完成 Phase 2 前端 DOM 覆寫與 Content Script 防禦)
> - [2026-10-05] ID: e98a1287-a411-43eb-b25b-746cbd27c63d (完成 Phase 3 Sidepanel 黑名單規則管理介面與即時統計)
> - [2026-10-05] ID: 1a0f9705-efdb-4349-9788-b1a958ca011c (完成 Phase 4 測試驗證、SSOT 閉環與封存)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261005_activity_monitor_tab_interceptor_spec.md，開始執行 Phase 4
> ```

