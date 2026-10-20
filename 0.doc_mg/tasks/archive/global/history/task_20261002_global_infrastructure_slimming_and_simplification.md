---
title: "Chrome Plus 跨插件底座精簡與極致瘦身：拔除 Outbox 冗餘輪詢、清除空轉握手與收斂通訊 Router"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-09"
archived_to: "0.doc_mg/tasks/archive/global/task_20261002_global_infrastructure_slimming_and_simplification.md"
---

## 1. 目標
落實極簡主義與反過度工程（Anti-Overengineering），全面剷除跨插件通訊中「疊床架屋」與「效能浪費」的模組：
1. **剷除 Outbox 佇列與死信系統**：刪除背景 `chrome.alarms`（每 30 秒輪詢）與 `chrome.tabs.onActivated` 頻繁喚醒機制，回歸 Chrome Extension MV3 零耗電、事件驅動標準。
2. **清除空轉握手總線 (`PING_HUB`)**：既然四大插件皆已透過 RSA Public Key 固定 Extension ID，徹底移除無業務端消費的假性 Discovery 握手。
3. **收斂通訊入口 Router**：精簡 `externalService.ts`，移除早產的 Workspace 同步校驗與多層轉發，改為極簡、透明的直連分發。
4. **精簡 SSOT 合約文檔**：大幅瘦身 `0.doc_mg/docs/cross_plugin_contract.md`，聚焦於真正有實質資料交換的業務 Action。

## 2. 策略與鎖定檔案
1. **廢除 Outbox 佇列**：將發送端全面回歸 Chrome 原生 `chrome.runtime.sendMessage` 直連調用；若失敗由前端 UI 立即通知使用者（例如「接收端未啟動」），不寫入本地 Storage，不積壓死信，完全杜絕後台偷跑輪詢。
2. **清理 Service Worker 常駐監聽**：從 ScrumClock 背景入口解綁 `initOutboxScheduler`，使 Service Worker 能在閒置 30 秒後依 Chrome 原生機制自然休眠。
3. **收斂 `externalService.ts`**：精簡為僅處理實際存在的外部請求（如 `CREATE_TASK`、`COLLECT_NOTE`），刪除 `PING_HUB`、`AI_PING` 等未消費 Action。
4. **瘦身規格與型別定義**：精簡 `taskContracts.ts` 與 `cross_plugin_contract.md`，移除未落地的早產欄位。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/docs/cross_plugin_contract.md`
- `./chrome_scrumclock/src/shared/messaging/outboxQueue.ts`
- `./chrome_scrumclock/src/shared/types/taskContracts.ts`
- `./chrome_scrumclock/src/background/externalService.ts`
- `./chrome_scrumclock/src/background.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (同步更新極簡直連通訊架構)
- [x] L2 插件導航：`./chrome_scrumclock/README.md` (更新跨插件通訊說明，移除 Outbox 與 PING_HUB)
- [x] L3 業務規格：`./0.doc_mg/docs/cross_plugin_contract.md` (精簡合約 SSOT)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 拔除 Outbox 背景輪詢排程與死信佇列 狀態：`[已完成]`
- [x] 任務 1.1: 解除 Service Worker 背景喚醒
    - [x] 於 `./chrome_scrumclock/src/background.ts` 移除 `initOutboxScheduler()` 調用與對應 Alarm 監聽。
    - [x] 移除 `tabs.onActivated` 頻繁觸發的重試監聽。
- [x] 任務 1.2: 拔除或清空 `outboxQueue.ts`
    - [x] 替換 `sendMessageWithOutbox` 為原生簡潔的 `sendDirectMessage`。
    - [x] 移除 `outbox_queue` 與 `dead_letter_queue` 的本地 Storage 讀寫與死信通知。

### Phase 2: 清除 `PING_HUB` 空轉握手與精簡通訊入口 狀態：`[已完成]`
- [x] 任務 2.1: 清理 `externalService.ts` 冗餘分支
    - [x] 移除 `PING_HUB`、`AI_PING`、`AI_CAPABILITIES` 等無實際消費端的空轉處理。
    - [x] 簡化 `handleCreateTaskExternal` 與 `handleCollectNoteExternal`，移除早產的 `workspaceSync` 等複雜校驗。
    - [x] 簡化 `broadcastFocusToFinanceClipper`，使用原生直連發送。
- [x] 任務 2.2: 精簡型別與契約定義
    - [x] 於 `./chrome_scrumclock/src/shared/types/taskContracts.ts` 移除 `OutboxItem`、`DeadLetterItem`、`OutboxSendResponse` 等死代碼型別。
    - [x] 保持 `UniversalTaskPayload` 最簡必要欄位。

### Phase 3: 合約文檔瘦身與 SSOT 閉環驗收 狀態：`[已完成]`
- [x] 任務 3.1: 瘦身 `cross_plugin_contract.md`
    - [x] 刪除整段「自動握手總線協議 (PING_HUB)」與「Outbox 佇列規範」。
    - [x] 保留「靜態金鑰對照表」與「原生直連白名單過濾（防腐層）」。
- [x] 任務 3.2: 驗證建置與閉環歸檔
    - [x] 執行 Vite Build 確認 ScrumClock 無編譯錯誤。
    - [x] 回寫 Target SSOTs 骨架並移動任務檔至 `0.doc_mg/tasks/archive/global/`。

## 4. 影響評估
- **效能影響**：完全解除背景輪詢警報，大幅改善 Service Worker 休眠生命週期，符合 Google Chrome Extension MV3 官方極致節能標準。
- **功能相容**：外部插件（FinanceClipper、VideoSpeed）原本發送資料至 ScrumClock 即是直連模式，因此直連功能 100% 保持相容，不受任何負面影響。

## 5. 驗收標準
- [x] **技術指標**: 完全拔除 `outbox_queue` 輪詢，Service Worker 在完成訊息處理後 30 秒能正常進入 Inactive 休眠。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無任何週期性未受控 Alarms 或分頁切換頻繁喚醒。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認跨模組直連接收正常。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 5f901be3-3697-41ff-abcd-ebe2d863142a (初始化極簡瘦身任務藍圖)
> - 2026-10-02 ID: 1980ceeb-e03d-4594-8fac-916d89660a63 (完成 Phase 1: 拔除 Outbox 背景輪詢排程與死信佇列)
> - 2026-10-02 ID: 982ada64-7b21-4223-8941-5374ba942c83 (完成 Phase 2: 清除 PING_HUB 空轉握手與精簡通訊入口)
> - 2026-10-02 ID: dd789f1e-7385-439e-a785-a343caf5e0ef (完成 Phase 3: 合約文檔瘦身、Vite 建置驗證與 SSOT 閉環封存)
