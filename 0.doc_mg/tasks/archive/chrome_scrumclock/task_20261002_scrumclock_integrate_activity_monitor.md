---
title: "整合 browser-activity-monitor 至 chrome_scrumclock 架構"
plugin: "chrome_scrumclock"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-02"
---

## 1. 目標
將原獨立插件 `browser-activity-monitor` 的瀏覽器活動監控、動態探針、權限審查與 IndexedDB 記錄核心能力，完整重構整併至 `chrome_scrumclock`（Power Kit）的模組化架構（`chrome_scrumclock/src/features/activity-monitor/`）中，達成單一 Vite 建置管線、單一 Manifest V3 權限體系與共享 React UI 元件庫。

## 2. 策略與鎖定檔案

### 核心架構策略
1. **模組化封裝**：於 `chrome_scrumclock/src/features/activity-monitor/` 建立高內聚之監控模組，包含 Storage/IndexedDB、背景監聽服務、動態探針與 React 視覺化面板。
2. **Background 整合**：由 `chrome_scrumclock/src/background.ts` 集中載入與初始化監控事件（tabs, webRequest, downloads, alarms），避免多 worker 衝突。
3. **Manifest 整合**：審核並整併 `permissions`（新增 `contentSettings`、`webRequest` 等必要項目），遵循最小權限與安全標準。
4. **UIUX 融合**：將原純 HTML/JS 的 sidepanel 介面升級或整合為 ScrumClock 內部之 React 功能頁籤/面板。

### 鎖定檔案 (Target Files)
- `browser-activity-monitor/background.js` (來源參照)
- `browser-activity-monitor/scripts/storage-db.js` (來源參照)
- `browser-activity-monitor/scripts/probe-isolated.js` (來源參照)
- `browser-activity-monitor/scripts/probe-main.js` (來源參照)
- `chrome_scrumclock/public/manifest.json` (權限與資源宣告)
- `chrome_scrumclock/src/background.ts` (背景監聽掛載)
- `chrome_scrumclock/src/features/activity-monitor/` (新增模組目錄)
- `chrome_scrumclock/src/features/activity-monitor/storage/activityDb.ts` (IndexedDB 儲存層)
- `chrome_scrumclock/src/features/activity-monitor/services/monitorService.ts` (監控事件業務邏輯)
- `chrome_scrumclock/src/features/activity-monitor/components/ActivityMonitorView.tsx` (React 介面)
- `chrome_scrumclock/src/entries/sidebar/SidebarApp.tsx` 或對應主入口 (面板路由掛載)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/scrumclock-core/SKILL.md` (新增 activity-monitor 模組索引與職責)
- [x] L1 專家技能：`.agents/skills/activity-monitor-core/SKILL.md` (標註已整合至 chrome_scrumclock 及其新路徑)
- [x] L2 插件導航：`chrome_scrumclock/SCRUMCLOCK_README.md` (更新模組矩陣、Manifest 權限與架構說明)
- [x] L3 業務規格：`chrome_scrumclock/docs/activity-monitor-spec.md` (整合後之監控與儲存規格)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/chrome_scrumclock/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 監控核心與儲存層遷移 (Activity Core & Storage Migration) 狀態：`[已完成]`

### Phase 2: Background 監控服務與 Manifest 權限整併 狀態：`[已完成]`
- [x] 任務 2.1: 實作 `monitorService.ts`。
    - [x] 抽取 `browser-activity-monitor/background.js` 中之監聽器（tabs, webRequest, downloads, contentSettings）。
    - [x] 封裝生命週期控制（啟動/暫停監控、定時清理日誌）。
- [x] 任務 2.2: 整合至 `chrome_scrumclock/src/background.ts`。
    - [x] 掛載 `monitorService` 初始化與 runtime 訊息轉發。
- [x] 任務 2.3: 更新 `chrome_scrumclock/public/manifest.json`。
    - [x] 補齊必要之 permissions (`webRequest`, `contentSettings` 等) 與 web_accessible_resources。

### Phase 3: UI 介面現代化整合至 ScrumClock 狀態：`[已完成]`
- [x] 任務 3.1: 建立 React 版活動監控介面 `ActivityMonitorView.tsx`。
    - [x] 移植原 sidepanel 中的即時活動日誌串流、分類過濾與統計圖表。
    - [x] 套用 ScrumClock (Tailwind / 現有設計系統) 樣式，確保視覺風格一致。
- [x] 任務 3.2: 整合至 ScrumClock 導航/面板入口。
    - [x] 在 Sidebar 或主介面提供「活動監控」切換分頁或工具箱入口。

### Phase 4: 建置驗證、SSOT 閉環與封存歸檔 狀態：`[已完成]`
- [x] 任務 4.1: 建置與合規驗證。
    - [x] 執行 `npm run build` 確認 TypeScript 編譯無誤、Bundle 無衝突。
    - [x] 驗證 MV3 CSP 與權限合規性。
- [x] 任務 4.2: 四層 SSOT 閉環回寫。
    - [x] 回寫 L1: `scrumclock-core/SKILL.md` 與 `activity-monitor-core/SKILL.md`。
    - [x] 回寫 L2: `chrome_scrumclock/SCRUMCLOCK_README.md`。
    - [x] 產出 L3: `chrome_scrumclock/docs/activity-monitor-spec.md`。
- [x] 任務 4.3: 封存歸檔。
    - [x] 移動任務文檔至 `0.doc_mg/tasks/archive/chrome_scrumclock/` 結案。

## 4. 影響評估
- **權限變更**: ScrumClock 的 `manifest.json` 將新增 `webRequest`、`contentSettings` 等權限，Chrome Web Store 審查可能需額外填寫使用聲明。
- **效能影響**: 背景常駐監控（webRequest / tabs）需確保非同步寫入 IndexedDB 不造成主執行緒卡頓與背景 worker 頻繁崩潰。
- **儲存獨立性**: 監控資料庫使用獨立之 IndexedDB 名稱（`activity_monitor_db`），不影響原 ScrumClock 任務看板與番茄鐘之 Chrome Storage 資料。

## 5. 驗收標準
- [x] **技術指標**: 若涉及動態探針或 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範（背景服務 worker 非持續性、訊息傳遞安全）。
- [x] **除錯清理**: 移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/chrome_scrumclock/`。
- [x] **插件驗證**: 執行 Vite `npm run build` 確認打包成功，載入 `dist/` 後各項功能及背景監控通訊皆正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 7d36db85-b9e4-4417-8857-45bfe5e56b39 (Gate 1 任務初始化 & Phase 1)
> - 2026-10-02 ID: 8ab04afe-0cc3-4e5b-a673-069b13f5b975 (Phase 2 執行)
> - 2026-10-02 ID: acf0ca40-d8e5-4086-b6a3-f92b067e452b (Phase 3 執行)
> - 2026-10-02 ID: d205d767-260f-4c01-8d61-9a2b8243c2c3 (Phase 4 執行)
>
> **跨會話接力指令 (Session Handover)**:
> 若需開新視窗以徹底釋放 Gate 1 探勘佔用之 Context（節省 70%~90% 輸入 Token），請複製以下指令至新對話：
> ```markdown
> 載入 ./0.doc_mg/tasks/task_20261002_scrumclock_integrate_activity_monitor.md，開始執行 Phase 4
> ```
