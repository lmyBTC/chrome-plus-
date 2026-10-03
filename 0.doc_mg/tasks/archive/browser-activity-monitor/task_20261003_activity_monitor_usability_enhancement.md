---
title: "[ActivityMonitor] 語意化停留時長統計與網域智慧分類標籤 (AM-01, AM-02)"
plugin: "browser-activity-monitor"
status: "已完成"
created: "2026-10-03"
deadline: "2026-10-03"
---

## 1. 目標
落實 PM 工作流摩擦矩陣 (AM-01, AM-02) 痛點改善：
1. **AM-01 (語意化活躍停留時長統計)**：解決過去僅記錄底層 `webRequest` 雜訊封包、無法直觀掌握分頁時間的問題。在背景監聽分頁焦點事件 (`chrome.tabs.onActivated`、`chrome.windows.onFocusChanged`)，精準記錄前台網頁有效停留時長（秒/分鐘）。
2. **AM-02 (網域智慧分類標籤與聚合)**：擴充常見 PM 協作與生產力工具網域字典（Notion、Jira、Docs、Linear 等），在側邊欄呈現鮮明的分類彩色 Badge（生產力 / 辦公通訊 / 休閒娛樂），並提供時長統計聚合與過濾能力。

## 2. 策略與鎖定檔案

### 核心實作策略
1. **常態零負載焦點追蹤器**：
   - 於 `background.js` 建立 `TabTimeTracker`，僅在分頁啟用且視窗聚焦時累積秒數。
   - 支援分頁切換、視窗失焦、URL 導航及關閉事件時自動結算上一個活動區間。
   - 結算紀錄寫入 IndexedDB 之 `time_spent_logs` 或擴充至 `activity_logs`，並具備定時匯總能力。
2. **智慧分類字典擴充與結構優化**：
   - 擴充 `scripts/domain-classifier.js`，補齊常見 PM 工具與開發平台。
   - 支援即時標籤解析與分類聚合（生產力時長、通訊時長、娛樂時長）。
3. **Sidepanel PM 活躍時間看板**：
   - 在側邊欄頂部或專屬區塊新增「今日停留時長 / 焦點分頁排行」摘要卡片。
   - 活動日誌列表與分頁列表中注入彩色類別 Badge，並支援類別即時過濾按鈕。

### 鎖定檔案 (Target Files)
- `./browser-activity-monitor/background.js`
- `./browser-activity-monitor/scripts/domain-classifier.js`
- `./browser-activity-monitor/scripts/storage-db.js`
- `./browser-activity-monitor/sidepanel/sidepanel.html`
- `./browser-activity-monitor/sidepanel/sidepanel.js`
- `./browser-activity-monitor/sidepanel/sidepanel.css`

### 鎖定 SSOT 回寫清單 (Target SSOTs)
- [x] L1 專家技能：`./.agents/skills/activity-monitor-core/SKILL.md` (同步焦點時長追蹤與分類模組職責)
- [x] L2 插件導航：`./browser-activity-monitor/ACTIVITY_MONITOR_README.md` (模組速查與停留時長架構說明)
- [x] [N/A] L3 業務規格 (無獨立規格檔，合併於 README)
- [x] L4 任務生命週期：`0.doc_mg/tasks/archive/browser-activity-monitor/` (結案後移動封存歸檔)

## 3. 任務拆解

### Phase 1: 前台分頁焦點與有效停留時長追蹤器 (AM-01 核心) 狀態：`[已完成]`
- [x] 任務 1.1: 在 `background.js` 實作 `TabTimeTracker` 焦點生命週期監聽
    - [x] 監聽 `chrome.tabs.onActivated`，紀錄前台分頁切換時間戳與結算前一個分頁
    - [x] 監聽 `chrome.windows.onFocusChanged`，當視窗最小化或切出時暫停累計，重新聚焦時恢復
    - [x] 監聽 `chrome.tabs.onUpdated`，當分頁導航到新 URL 時觸發分段結算
- [x] 任務 1.2: 於 `storage-db.js` 新增 `time_spent_logs` 儲存或擴充時長欄位
    - [x] 升級 IndexedDB 版本或於現有 Store 儲存停留時長記錄（`domain`, `url`, `title`, `durationSec`, `category`, `timestamp`）
    - [x] 提供查詢指定時間範圍內網域時長匯總之非同步 API
- [x] 任務 1.3: Background 與 Sidepanel Port 通訊協議對接
    - [x] 新增 `GET_TIME_STATS` 與 `TIME_STATS_UPDATED` 訊息通道，支援即時推送當日活躍統計

### Phase 2: 擴充智慧網域字典與分類聚合引擎 (AM-02 模組) 狀態：`[已完成]`
- [x] 任務 2.1: 擴充 `domain-classifier.js` 預設網域映射庫
    - [x] 補齊現代 PM 常用工具（Notion, Jira, Confluence, Linear, Asana, ClickUp, Trello, Google Docs/Sheets）
    - [x] 補齊常見辦公通訊（Slack, Discord, MS Teams, Lark, Google Meet）
    - [x] 補齊休閒娛樂與社群（YouTube, Bilibili, Netflix, Twitter/X, Facebook, Instagram, Reddit）
- [x] 任務 2.2: 實作分類時長聚合函式
    - [x] 匯總指定日期之類別時長佔比（生產力 / 通訊 / 娛樂 / 靜態 / 其他）
    - [x] 計算今日工作總時長（生產力 + 辦公通訊）與專注度指標

### Phase 3: Sidepanel 介面視覺化升級 (AM-01 & AM-02 UI/UX) 狀態：`[已完成]`
- [x] 任務 3.1: 在 Sidepanel HTML 建立停留時長看板與分類卡片
    - [x] 新增「有效停留時間」總覽折疊面板，顯示今日工作總時長與分類佔比進度條
    - [x] 列表展示「Top 5 活躍網站與停留時間」
- [x] 任務 3.2: 升級活動日誌清單的彩色 Badge 與分類過濾列
    - [x] 在每筆日誌與分頁項目右側注入醒目彩色標籤（💼 生產力 / 💬 通訊 / ☕ 娛樂）
    - [x] 優化過濾按鈕列，支援依類別（全部、工作、娛樂、靜態）一鍵切換篩選
- [x] 任務 3.3: 視覺樣式與暗色主題微調
    - [x] 在 `sidepanel.css` 完善 Badge 與統計進度條之色彩體系與懸停效果

### Phase 4: 整合驗證、SSOT 閉環與結案封存 狀態：`[已完成]`
- [x] 任務 4.1: 功能端到端檢驗與除錯清理
    - [x] 驗證分頁切換、視窗切換時秒數累計精確度，無記憶體洩漏與無限循環
    - [x] 移除所有暫時性 `console.log`，確認符合 CSP 與 MV3 規範
- [x] 任務 4.2: SSOT 閉環回寫
    - [x] 回寫 L1：`.agents/skills/activity-monitor-core/SKILL.md`
    - [x] 回寫 L2：`browser-activity-monitor/ACTIVITY_MONITOR_README.md`
- [x] 任務 4.3: 任務歸檔
    - [x] 移動本任務檔案至 `0.doc_mg/tasks/archive/browser-activity-monitor/`

## 4. 影響評估
- **API 權限**: 既有 `manifest.json` 已具備 `tabs` 權限，無需額外新增高風險權限，完全符合最小權限原則。
- **效能負擔**: 分頁時間追蹤僅在事件觸發時進行微秒級記憶體計算，不採用常態輪詢，保持 0% 額外 CPU 佔用。
- **資料隔離**: 所有時間數據均儲存於本機 IndexedDB，零外部網路傳輸，符合隱私合規底線。

## 5. 驗收標準
- [x] **技術指標**: 前台切換分頁或切換視窗時，時間統計能精確計算至秒級，不漏算亦不虛報背景背景分頁時長。
- [x] **核心規範**: 符合 Chrome Extension Manifest V3 規範，Service Worker 具備休眠喚醒後狀態恢復能力。
- [x] **除錯清理**: 已確認移除或註解所有測試用的 `console.log()` 與除錯程式碼。
- [x] **檔案編碼**: 確認所有修改與新增的檔案皆以 UTF-8 (無 BOM) 編碼保存。
- [x] **SSOT 閉環**: 重大架構同步完成（已精準回寫 Target SSOTs 骨架，未貼入冗餘代碼）。
- [x] **L4 任務封存歸檔**: 任務完成後已依封存協議移動至 `0.doc_mg/tasks/archive/browser-activity-monitor/`。
- [x] **插件驗證**: 已在 Chrome 中重新載入插件，確認側邊欄各項功能及背景通訊正常無報錯。

## 6. AI 簽到區與會話接力
> [x] 我已閱讀並承諾遵守「task-protocol」技能中之「三階段守門門禁 (3-Gate Protocol)」、探勘硬窄化與動態狀態收斂規範。
> **參與對話 ID 紀錄**:
> - 2026-10-03 ID: 658492d3-bc2a-42b1-887b-e6a339e9a97f (Gate 1 初始化)
> - 2026-10-03 ID: 1f259df4-0f43-4a3f-9ffc-00fbb800e95b (Phase 1 完成：TabTimeTracker 與 IndexedDB 停留時長儲存層)
> - 2026-10-03 ID: 533e4652-a9a2-4ef5-961d-6e1dc200fd4b (Phase 2 完成：智慧網域映射庫擴充與分類聚合引擎運算模組)
> - 2026-10-03 ID: ae47ac03-81c7-4fd1-920a-19638222030a (Phase 3 完成：Sidepanel 停留時間看板、多色進度條與網域分類過濾列)
> - 2026-10-03 ID: 04ca5683-af4d-4f6f-987d-7a34992d57df (Phase 4 完成：端到端除錯清理、L1/L2 SSOT 閉環回寫與封存歸檔)
>
> **跨會話接力指令 (Session Handover)**:
> 本任務已結案歸檔。如需啟動新任務，請遵循 Gate 0 門禁。
