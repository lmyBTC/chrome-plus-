---
title: "BAM 效能優化：隨選健檢與手動檢測記錄模式 (On-Demand & Continuous Session Profiler)"
plugin: "browser-activity-monitor"
status: "已結案"
created: "2026-10-02"
deadline: "2026-10-03"
---

## 1. 目標
依第一性原理徹底消除「觀察者效應」（監控插件本身 24/7 常態監聽與高頻磁碟 I/O 所引發的耗能）：
1. **常態零耗能待命 (Zero Standby Overhead)**：平時 Service Worker 處於深度休眠，完全不掛載 `webRequest` 網路攔截器、不進行背景磁碟寫入。
2. **雙軌隨選監測機制 (Dual Profiling Modes)**：
   - **軌道 A：快速定時健檢 (Quick Audit - 60s)**：一鍵啟動 60 秒採樣，倒數結束自動結算並卸載監聽。
   - **軌道 B：持續檢測記錄模式 (Continuous Session Mode)**：使用者點擊「開始檢測記錄」後啟動動態監聽，持續收集直到使用者手動停止、關閉面板（Sidepanel Disconnect）或關閉瀏覽器（SW Suspend），即刻自動結算統計並持久化儲存「階段檢測報告」，隨後完全卸載監聽恢復零耗能。
3. **消除 DOM 節點膨脹**：Side Panel 轉為展示「檢測報告卡 (Session Reports)」與採樣期間的「記憶體環形緩衝區 (Ring Buffer，上限 30~50 筆)」，將 DOM 節點嚴格控制在 100 以內，根除節點過載警告。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `browser-activity-monitor/background.js`
- `browser-activity-monitor/scripts/storage-db.js`
- `browser-activity-monitor/sidepanel/sidepanel.js`
- `browser-activity-monitor/sidepanel/sidepanel.html`
- `browser-activity-monitor/sidepanel/sidepanel.css`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`.agents/skills/activity-monitor-core/SKILL.md` (已更新按需隨選與 Session 動態生命週期架構)
- [x] L2 插件導航：`browser-activity-monitor/ACTIVITY_MONITOR_README.md` (已更新檢測模式操作與效能指標)
- [x] [N/A] L3 業務規格 (無獨立 spec 文檔)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 網路監聽動態生命週期管理與儲存層改造 狀態：`[已完成]`
- [x] 任務 1.1: `background.js` 改造為動態掛載與卸載架構
    - 移除頂層常駐 `chrome.webRequest.onBeforeRequest.addListener`。
    - 實作 Session 生命週期狀態機 (`IDLE` | `RUNNING_TIMED` | `RUNNING_CONTINUOUS`)。
    - 提供 `START_SESSION(mode, duration)` 與 `STOP_SESSION` 控制介面，動態掛載與完全卸載 `webRequest` 監聽。
    - 生命週期防護：監聽 `port.onDisconnect` 與 `chrome.runtime.onSuspend`，當面板關閉或瀏覽器休眠時自動安全結算報告並卸載監聽器。
- [x] 任務 1.2: 停用常態單筆 IndexedDB 寫入，改為階段檢測報告儲存
    - 拔除 `broadcast()` 內對每筆網路請求寫入 `db.insertLog()` 的高頻 Transaction。
    - 在 `storage-db.js` 新增 `health_reports` 儲存集合，僅在每次 Session 結算時寫入 1 筆結構化報告（包含統計指標、耗能排行與優化建議）。

### Phase 2: Session 彙總分析引擎與噪音過濾 (Session Profiler Engine) 狀態：`[已完成]`
- [x] 任務 2.1: 記憶體輕量彙總統計器 (`ProfilerSession`)
    - 採樣期間於記憶體內依分頁 (Tab) 與網域 (Domain) 統計：請求總次數、高頻遙測/心跳比例、串流分塊比例（如 `googlevideo.com`）、預估負載等級。
    - 實作 Noise Gate：區分有效業務請求與常態遙測心跳。
- [x] 任務 2.2: 結構化報告生成器 (Actionable Recommendations)
    - Session 結束結算時產出：
      1. TOP 耗能分頁/來源網域排行。
      2. 資源異常警示（如某分頁頻率大於 5 req/s）。
      3. 具體可操作建議（如「建議關閉或休眠分頁 X，已產生 450 次背景遙測」）。

### Phase 3: Side Panel 雙軌控制 UI 與節點瘦身 (UI Refactor) 狀態：`[已完成]`
- [x] 任務 3.1: 介面新增「開始檢測記錄」開關與「60s 快速健檢」按鈕
    - 具備清楚的狀態指示燈（待命中、檢測記錄中、結算報告）。
    - 「持續檢測記錄模式」下顯示已記錄時長（Timer）與即時事件計數，並提供「停止並結算報告」按鈕。
- [x] 任務 3.2: 採樣日誌環形緩衝區 (Ring Buffer)
    - 採樣過程中只在前端記憶體保留最新 30~50 筆動態，DOM 節點數嚴格控制在 100 以內。
- [x] 任務 3.3: 呈現結構化「階段檢測報告卡 (Session Report Card)」
    - 結束後呈現清晰易讀的報告卡，支援切換歷史報告列表與清除歷史。

### Phase 4: 資源指標驗證與 SSOT 閉環歸檔 狀態：`[已完成]`
- [x] 任務 4.1: 指標驗證
    - 驗證待命 (Idle) 狀態下完全無 `webRequest` 攔截，Service Worker CPU/IO 為 0。
    - 驗證「持續檢測模式」手動開啟、手動關閉或關閉面板時均能正常結算並卸載監聽。
    - 驗證 DOM 節點總量恆定低於 120，消弭「節點過多」警示。
    - 驗證 IndexedDB 磁碟 I/O 寫入頻次僅在 Session 結算時觸發 1 次。
- [x] 任務 4.2: SSOT 閉環更新與結案歸檔
    - 更新 L1 專家技能 `.agents/skills/activity-monitor-core/SKILL.md`。
    - 更新 L2 導航 `browser-activity-monitor/ACTIVITY_MONITOR_README.md`。
    - 執行 L4 封存歸檔，將本任務檔移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。

## 4. 影響評估
- **擴充功能權限**：維持既有權限，不需新增權限。
- **背景效能**：待命狀態下零攔截、零磁碟寫入，徹底消除觀察者效應。
- **使用體驗**：既可一鍵 60 秒快篩，亦可開啟「持續檢測記錄」供使用者在特定工作情境下完整監控並於結束時獲取報告。

## 5. 驗收標準
- [x] **常態零耗能**: 待命狀態下無 `webRequest` 攔截，無背景日誌入庫。
- [x] **持續檢測模式**: 手動開啟後開始監聽，手動關閉、面板關閉或瀏覽器休眠時自動安全結算並產出報告，且監聽完全卸載。
- [x] **DOM 節點健康**: 運行與呈現時 DOM 節點總數小於 120。
- [x] **報告可操作性**: 能精準標示出高頻請求分頁/網域並提供優化建議。
- [x] **除錯清理與編碼**: 移除除錯 `console.log()`，UTF-8 無 BOM。
- [x] **SSOT 閉環與歸檔**: 完成 L1、L2 同步更新，並移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: a7c19173-d989-4a4b-a8cd-0f5bd656563a (Gate 1 初始化)
> - 2026-10-02 ID: d4ee1255-51c0-4110-bec6-d223acb923ab (第一性原理重構為雙軌健檢與檢測記錄模式)
> - 2026-10-02 ID: 04a289b4-127b-425f-b97e-cb46422e2dfe (Phase 1 網路監聽動態生命週期管理與儲存層改造)
> - 2026-10-02 ID: a4699ce4-56d9-4bca-ac47-b4ef312f68f0 (Phase 2 Session 彙總分析引擎與噪音過濾實作)
> - 2026-10-02 ID: 899dc1f4-c2b9-4b12-90cb-6cfc5a813272 (Phase 3 Side Panel 雙軌控制 UI 與節點瘦身實作)
> - 2026-10-02 ID: b6e9f2f0-a237-407b-ac0a-55e74980c69e (Phase 4 資源指標驗證、SSOT 閉環與結案封存)
>
> **全案結案狀態**: 本任務所有 Phase 1 ~ 4 均已驗證完成，全數打勾，並已封存歸檔至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。
