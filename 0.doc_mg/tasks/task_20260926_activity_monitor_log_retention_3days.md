---
title: "調整瀏覽器活動日誌自動清理週期為 3 天"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-09-26"
deadline: "2026-09-26"
---

## 1. 目標
將 `browser-activity-monitor` 的歷史日誌生命週期從原本的 7 天調整為 3 天，以防止本機 IndexedDB Storage 膨脹過快，並同步更新相關後台服務與 SSOT 說明文件。

## 2. 策略與鎖定檔案
- 修改 `storage-db.js` 中的 `purgeExpiredLogs` 預設過期天數為 3 天。
- 修改 `background.js` 中 `chrome.alarms` 監聽函式傳入的過期清理天數為 3 天。
- 同步修正 `browser-activity-monitor/README.md` 的功能說明與架構速查表。

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/scripts/storage-db.js`
- `./browser-activity-monitor/background.js`
- `./browser-activity-monitor/README.md`

## 3. 任務拆解

### Phase 1: 核心常數與背景排程調整 狀態：`[已完成]`
- [x] 任務 1.1: 更新 IndexedDB 儲存層清理預設值
    - [x] 將 `scripts/storage-db.js` 的 `purgeExpiredLogs(retentionDays = 3)` 預設值與 JSDoc 修正為 3 天
- [x] 任務 1.2: 更新 Service Worker 定期排程參數
    - [x] 將 `background.js` 的 Alarm 觸發時調用 `db.purgeExpiredLogs(3)` 與註解更新為 3 天

### Phase 2: SSOT 文檔同步 狀態：`[已完成]`
- [x] 任務 2.1: 更新插件說明文件
    - [x] 修改 `browser-activity-monitor/README.md` 第 27 行與第 41 行，將 7 天過期清理描述變更為 3 天

## 4. 影響評估
- **Storage 影響**：儲存空間回收頻率提高，降低 IndexedDB 空間耗用。
- **使用者體驗**：歷史活動面板中可檢視的最長日誌保留週期變更為 3 天以內。
- **API 與權限**：既有 `chrome.alarms` 排程機制不變，無需申請額外權限。

## 5. 驗收標準
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，Service Worker 無報錯。
- [x] **邏輯驗證**: `db.purgeExpiredLogs` 正確計算 3 天前（`Date.now() - 3 * 24 * 60 * 60 * 1000`）時間戳記。
- [x] **除錯清理**: 確認無殘留測試程式碼。
- [x] **檔案編碼**: 確認所有修改的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 文件同步**: `browser-activity-monitor/README.md` 已物理更新對應描述。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-09-26 ID: 0c31b1f6-358e-49d8-af82-524119f0a04f (初始化)
> - 2026-09-26 ID: d440fb8f-6680-4879-a375-aa6d2bd426a5 (Phase 1 執行 & Phase 2 完工結案)
>
> **任務狀態**: 全案已圓滿完成，所有驗收標準均已通過。
