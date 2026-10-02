---
title: "Browser Activity Monitor 資源監視器與組件效能診斷面板"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-03"
---

## 1. 目標
為了防止插件過於肥大或過度消耗系統資源，在 Browser Activity Monitor 內建輕量級「組件資源監視器 (Resource Profiler)」，提供透明的效能指標面板，協助開發者與使用者精準辨識值得優化的組件與效能瓶頸：
1. **模組級耗時統計**：監控原生權限審查 (Native Audit)、IndexedDB 寫入延遲、深度探針 (Dynamic Probe) 訊息吞吐量等核心模組之執行延遲。
2. **記憶體與佇列診斷**：監控 Side Panel 串流 DOM 數量、JS Heap 粗估（若瀏覽器支援）及 IndexedDB 佇列積壓狀況。
3. **智慧優化建議引擎**：根據延遲與資源開銷自動評分，標記「值得優化」之熱點項目（如過多 DOM 節點、未批次化之寫入操作）。

## 2. 策略與鎖定檔案

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/scripts/resource-profiler.js` (新建：輕量效能採集與診斷統計模組)
- `./browser-activity-monitor/sidepanel/sidepanel.html` (修改：新增資源監視卡片與指標圖表結構)
- `./browser-activity-monitor/sidepanel/sidepanel.css` (修改：加入資源監視器專屬樣式、計量條與警告標籤)
- `./browser-activity-monitor/sidepanel/sidepanel.js` (修改：整合 profiler，監控 DOM 與渲染開銷)
- `./browser-activity-monitor/background.js` (修改：在 DB 寫入與通訊分發處注入效能計時)

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (補上 resource-profiler 模組與職責)
- [x] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (模組速查矩陣、資源監視功能說明)
- [x] [N/A] L3 業務規格：無獨立外部業務規格
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 建立核心效能採集器 `resource-profiler.js` 狀態：`[已完成]`

### Phase 2: Side Panel UI 介面整合 狀態：`[已完成]`

### Phase 3: 模組效能探針注入與資料驅動 狀態：`[已完成]`

### Phase 4: 驗收測試與 SSOT 閉環回寫 狀態：`[已完成]`

## 4. 影響評估
- **權限衝擊**：完全使用 Web 原生 Performance API，不額外索取 `system.cpu` 或 `system.memory`，Manifest 無需更動權限。
- **效能開銷**：採集器採純記憶體輕量環形統計，開銷 < 0.1ms，不產生額外常駐輪詢，關閉折疊面板時不驅動 UI 渲染。

## 5. 驗收標準
- [x] **技術指標**: 若涉及 Content Script 注入，完全符合 Shadow DOM 封裝，無 CSS 洩漏或污染宿主網頁。
- [x] **核心規範**: 已確認修改符合 Chrome Extension Manifest V3 規範（包括背景服務 worker 非持續性、訊息傳遞安全、移除 HTML inline onclick 恪守 CSP）。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認資源監視器正常採集組件開銷並給出優化診斷。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 31eee199-2ca1-4176-976e-5e5e74402fbe (初始化任務藍圖)
> - 2026-10-02 ID: ef13c8c3-b170-43cf-b5bf-88e679d3f302 (執行完成 Phase 1: 實作 ResourceProfiler 核心)
> - 2026-10-02 ID: d2f83f67-3a61-41c7-a719-f4ba7c492d93 (執行完成 Phase 2: Side Panel UI 介面整合)
> - 2026-10-02 ID: 6ddc909f-d952-4bab-9070-f07000907889 (執行完成 Phase 3: 模組效能探針注入與資料驅動)
> - 2026-10-02 ID: ac25a529-875d-4b9b-8091-354a5f7d8d8d (執行完成 Phase 4: 驗收測試、CSP 修復、SSOT 閉環與封存歸檔)
>
> **任務狀態**: `已結案歸檔`

