---
title: "Chrome Plus V2 底座重構：靜態 Extension Key、跨插件握手總線與 Outbox 防丟佇列"
plugin: "global"
status: "已完成"
created: "2026-10-02"
deadline: "2026-10-16"
---

## 1. 目標
落實 Chrome Plus V2 (v2.3.0-RFC) 系統底座升級，消除手動配置 Extension ID 的斷層，實現零配置跨插件自動握手、防丟單 Outbox 佇列與 Universal Task Payload v2.3 傳輸協議升級。

## 2. 策略與鎖定檔案
1. 為各模組（ScrumClock、FinanceClipper、VideoSpeed、ActivityMonitor）生成並配置固定公開金鑰（Public Key），使本地開發與發布環境的 Extension ID 恆定不變。
2. 升級跨插件通訊契約（`0.doc_mg/docs/cross_plugin_contract.md`），引入 `PING_HUB` / `ACK` 能力握手機制與 Discovery Bus。
3. 實作 Service Worker 休眠防丟單機制：發送端遇錯誤或逾時寫入 `chrome.storage.local` 的 `outbox_queue`，透過 `chrome.alarms` 與 `tabs.onActivated` 定期重試。
4. 定義並導出 TypeScript/ES6 規範的 `UniversalTaskPayload` (v2.3)，支援 GTD 情境與 Google Workspace 同步元數據。

### 鎖定檔案 (Target Files)
- `./0.doc_mg/docs/cross_plugin_contract.md`
- `./chrome_scrumclock/public/manifest.json`
- `./chrome_video speed plus/manifest.json`
- `./finance-research-clipper-oss/manifest.json`
- `./browser-activity-monitor/manifest.json`
- `./chrome_scrumclock/src/shared/messaging/outboxQueue.ts`
- `./chrome_scrumclock/src/shared/types/taskContracts.ts`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/scrumclock-core/SKILL.md` (跨插件通訊規格與 Payload v2.3 介面)
- [x] L1 專家技能：`./.agents/skills/finance-clipper-core/SKILL.md` (跨插件通訊規格)
- [x] L2 插件導航：`./chrome_scrumclock/README.md` (更新 Extension ID 與握手通訊架構)
- [x] L3 業務規格：`./0.doc_mg/docs/cross_plugin_contract.md` (通訊總線與金鑰配置標準)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/global/` (結案後移動封存歸檔，必選)

## 3. 任務拆解

### Phase 1: 固定 Extension Key 與跨插件自動握手 (Zero-Config Handshake) 狀態：`[已完成]`
### Phase 2: 防丟單訊息佇列與 Dead-Letter 處理 (Outbox Queue) 狀態：`[已完成]`
### Phase 3: Universal Task Payload v2.3 資料結構升級 狀態：`[已完成]`

## 4. 影響評估
- 涉及所有插件之 `manifest.json` 金鑰調整，四大插件在 Chrome 重新載入後 Extension ID 恆定且與通訊合約完全匹配。
- 跨插件發送由原本的靜態配置升級為自動握手與 Outbox 休眠防丟重試，增強容錯與使用者體驗。

## 5. 驗收標準
- [x] **技術指標**: 跨插件發送任務成功率達 100%（在 Service Worker 休眠模擬下亦能透過 Outbox 自動重試成功）。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，無全域輪詢浪費資源，採 Alarms 與事件驅動。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成，已精準回寫 Target SSOTs 骨架。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/global/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認握手與跨模組通訊正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-02 ID: 406e4174-4fdd-4fce-990b-20db5c66e328 (初始化任務拆解)
> - 2026-10-02 ID: bcc9d20e-fa18-48da-8fb7-2b74dae7447f (完成 Phase 1: 固定金鑰與 PING_HUB 自動握手機制)
> - 2026-10-02 ID: 867402c8-7891-442e-9d2f-c35f33ed839d (完成 Phase 2: 防丟單訊息佇列與 Dead-Letter 處理)
> - 2026-10-02 ID: fea989c4-6a57-4479-b193-17ea588265da (完成 Phase 3: Universal Task Payload v2.3 升級、E2E 測試與 SSOT 閉環)
> - 2026-10-02 ID: 12d62ee6-b5dc-4345-b3c9-c8a91697bd1d (完成最終插件驗證、自動化測試確認與任務封存歸檔)

