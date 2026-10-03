---
title: "[ActivityMonitor] 語意化停留時長統計、網域智慧分類與日誌隱私脫敏匯出 (AM-01, AM-02, AM-03)"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-03"
---

## 1. 目標
落實 PM 工作流摩擦矩陣 (AM-01, AM-02, AM-03) 痛點改善：
1. **AM-01 (語意化活躍停留時長統計)**：解決過去僅記錄底層 `webRequest` 雜訊封包、無法直觀掌握分頁時間的問題。在背景監聽分頁焦點事件 (`chrome.tabs.onActivated`、`chrome.windows.onFocusChanged`)，精準記錄前台網頁有效停留時長（秒/分鐘）。
2. **AM-02 (網域智慧分類標籤與聚合)**：擴充常見 PM 協作與生產力工具網域字典（Notion、Jira、Docs、Linear 等），在側邊欄呈現鮮明的分類彩色 Badge（生產力 / 辦公通訊 / 休閒娛樂），並提供時長統計聚合與過濾能力。
3. **AM-03 (日誌隱私脫敏匯出與遮蔽開關)**：欲截圖或匯出活動紀錄時，URL 常帶有私人 Token、機密參數或內網 IP。建立前端脫敏模組與 Sidepanel 遮蔽開關，提供一鍵遮蔽 Query String 與私有 IP 的安全匯出能力。

## 2. 策略與鎖定檔案

### 核心實作策略
1. **常態零負載焦點追蹤器**：
   - 於 `background.js` 與 `scripts/tab-time-tracker.js` 建立 `TabTimeTracker`，僅在分頁啟用且視窗聚焦時累積秒數。
   - 結算紀錄寫入 IndexedDB 之 `time_spent_logs`，並具備定時匯總能力。
2. **智慧分類字典擴充與結構優化**：
   - 擴充 `scripts/domain-classifier.js`，補齊常見 PM 工具與開發平台。
   - 支援即時標籤解析與分類聚合（生產力時長、通訊時長、娛樂時長）。
3. **Sidepanel PM 活躍時間看板**：
   - 在側邊欄頂部新增「今日停留時長 / 焦點分頁排行」摘要卡片。
   - 活動日誌列表與分頁列表中注入彩色類別 Badge，並支援類別即時過濾按鈕。
4. **前端零負擔隱私脫敏管線 (AM-03)**：
   - 建立 `scripts/privacy-sanitizer.js`，提供敏感 Query 參數（token, secret, auth, key 等）遮罩與私有 IP（`10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`, `localhost`）脫敏處理。
   - 在 Sidepanel 匯出工具列新增「🔒 隱私脫敏」切換開關，匯出 JSON 或複製時依開關狀態自動純化，不污染底層 IndexedDB 原始除錯數據。

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/background.js`
- `./browser-activity-monitor/scripts/tab-time-tracker.js`
- `./browser-activity-monitor/scripts/domain-classifier.js`
- `./browser-activity-monitor/scripts/privacy-sanitizer.js` (新增)
- `./browser-activity-monitor/scripts/storage-db.js`
- `./browser-activity-monitor/sidepanel/sidepanel.html`
- `./browser-activity-monitor/sidepanel/sidepanel.js`
- `./browser-activity-monitor/sidepanel/sidepanel.css`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (同步脫敏模組職責)
- [x] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (更新檔案速查與 AM-03 規格)
- [x] [N/A] L3 業務規格 (無獨立規格檔，合併於 README)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 前台分頁焦點與有效停留時長追蹤器 (AM-01 核心) 狀態：`[已完成]`
- [x] 任務 1.1: 在 `background.js` 實作 `TabTimeTracker` 焦點生命週期監聽
- [x] 任務 1.2: 於 `storage-db.js` 新增 `time_spent_logs` 儲存或擴充時長欄位
- [x] 任務 1.3: Background 與 Sidepanel Port 通訊協議對接

### Phase 2: 擴充智慧網域字典與分類聚合引擎 (AM-02 模組) 狀態：`[已完成]`
- [x] 任務 2.1: 擴充 `domain-classifier.js` 預設網域映射庫
- [x] 任務 2.2: 實作分類時長聚合函式

### Phase 3: Sidepanel 介面視覺化升級 (AM-01 & AM-02 UI/UX) 狀態：`[已完成]`
- [x] 任務 3.1: 在 Sidepanel HTML 建立停留時長看板與分類卡片
- [x] 任務 3.2: 升級活動日誌清單的彩色 Badge 與分類過濾列
- [x] 任務 3.3: 視覺樣式與暗色主題微調

### Phase 4: AM-01/AM-02 驗證與階段閉環 狀態：`[已完成]`
- [x] 任務 4.1: 功能端到端檢驗與除錯清理
- [x] 任務 4.2: SSOT 閉環回寫 (L1/L2)
- [x] 任務 4.3: 摩擦矩陣進度同步

### Phase 5: 日誌隱私脫敏匯出與遮蔽開關 (AM-03 核心) 狀態：`[已完成]`
- [x] 任務 5.1: 建立前端脫敏模組 `scripts/privacy-sanitizer.js`
    - [x] 支援常見機密 Query 參數遮蔽 (`token`, `auth`, `key`, `secret`, `password`, `code`, `session`)
    - [x] 支援完全清除 Query String 模式 (`stripQuery: true`)
    - [x] 支援私有 IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `localhost`) 遮蔽替換
    - [x] 支援活動日誌與停留時長紀錄的批次脫敏函式 (`sanitizeLogs`, `sanitizeTimeStats`)
- [x] 任務 5.2: Sidepanel 介面整合脫敏開關與匯出流程
    - [x] 在 `sidepanel.html` 匯出按鈕旁新增「🔒 隱私脫敏」核取方塊或切換按鈕，預設勾選
    - [x] 在 `sidepanel.js` 整合脫敏函式，當勾選時匯出脫敏後的 JSON 資料並在檔名追加 `_sanitized`
    - [x] 支援在複製特定活動項目至剪貼簿時亦遵循脫敏邏輯
- [x] 任務 5.3: 樣式修飾與端到端驗證
    - [x] 在 `sidepanel.css` 微調脫敏開關按鈕樣式與 tooltip 說明
    - [x] 驗證帶有敏感 token 與私有 IP 的 URL 匯出結果，確認底層 IndexedDB 保持原樣不受破壞
- [x] 任務 5.4: SSOT 閉環、摩擦矩陣同步與封存歸檔
    - [x] 回寫 L1：`.agents/skills/activity-monitor-core/SKILL.md`
    - [x] 回寫 L2：`browser-activity-monitor/ACTIVITY_MONITOR_README.md`
    - [x] 回寫摩擦矩陣：`0.doc_mg/docs/pm_workflow_friction_matrix.md` (標記 AM-03 已完成)
    - [x] 移動任務檔案至 `0.doc_mg/tasks/archive/browser-activity-monitor/`

## 4. 影響評估
- **API 權限**: 純前端資料字串純化處理，無需新增任何 Chrome 權限，符合最小權限底線。
- **效能負擔**: 僅在使用者觸發「匯出」或「複製」時進行正則替換，平時執行 0% CPU 負擔。
- **資料隔離**: 脫敏僅在匯出管道生效，底層 IndexedDB 依然保持完整診斷數據，安全與實用兼得。

## 5. 驗收標準
- [x] **脫敏完整性**: 匯出帶有 `token=xyz&api_key=123` 或 `192.168.1.1` 的網址時，敏感字元均被正確遮罩或替換。
- [x] **開關自由度**: 使用者取消勾選「隱私脫敏」時，能匯出完整原始資料供內部排錯。
- [x] **除錯清理**: 移除所有暫時性 `console.log()` 與除錯程式碼。
- [x] **SSOT 閉環**: 完成 L1/L2 SSOT 回寫，並更新摩擦矩陣 AM-03 為已完成。
- [x] **L4 封存歸檔**: 任務完成後移動至封存目錄。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 658492d3-bc2a-42b1-887b-e6a339e9a97f (Gate 1 初始化)
> - 2026-10-03 ID: 1f259df4-0f43-4a3f-9ffc-00fbb800e95b (Phase 1 完成：TabTimeTracker 與 IndexedDB 停留時長儲存層)
> - 2026-10-03 ID: 533e4652-a9a2-4ef5-961d-6e1dc200fd4b (Phase 2 完成：智慧網域映射庫擴充與分類聚合引擎運算模組)
> - 2026-10-03 ID: ae47ac03-81c7-4fd1-920a-19638222030a (Phase 3 完成：Sidepanel 停留時間看板、多色進度條與網域分類過濾列)
> - 2026-10-03 ID: 04ca5683-af4d-4f6f-987d-7a34992d57df (Phase 4 完成：AM-01/AM-02 階段驗證閉環；Gate 1 擴充 AM-03 Phase 5)
> - 2026-10-03 ID: 8d88b9d1-6b05-4668-9692-d57beee56c79 (Phase 5 完成：日誌隱私脫敏匯出、脫敏開關、複製純化與全閉環封存)


