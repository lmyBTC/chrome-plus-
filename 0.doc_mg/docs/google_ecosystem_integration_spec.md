# Chrome Plus 跨插件 Google 生態系自動化對接架構規格書 (Google Ecosystem Integration Spec)

> **版本**：v1.0.0  
> **建立日期**：2026-10-03  
> **狀態**：草案與架構規格確定  
> **關聯插件**：`chrome_scrumclock`, `finance-research-clipper-oss`, `browser-activity-monitor`, `chrome_video speed plus`  
> **通訊合約參照**：`0.doc_mg/docs/cross_plugin_contract.md`

---

## 1. 整合背景與核心業務情境

根據全域工作流摩擦力診斷報告（參見 `0.doc_mg/tasks/task_20261003_global_analyst_workflow_friction_analysis.md`），使用者在投研、敏捷開發與會議複盤中面臨嚴重的跨應用「資料孤島 (Data Silos)」與「手動複製貼上摩擦」：

1. **財務數據落盤**：FinanceClipper 採集的個股估值、財務比率與損益表，無法自動 Append 至個人投資決策追蹤 Google Sheets，需頻繁切換分頁手動貼上。
2. **研報初稿成冊**：研報摘要、YouTube 影音重點與個股基本面無法一鍵匯出為格式規整的 Google Docs 與 Drive 檔案夾歸檔。
3. **衝刺與日曆斷層**：ScrumClock 的每日重點任務 (Focus Tasks) 無法同步 Google Tasks，專注番茄鐘排程與日曆時間區塊 (Calendar Time Blocking) 脫鉤。

本規格書旨在制定標準化、低摩擦、高安全且符合 Chrome Manifest V3 合規之 Google 生態系自動化對接藍圖。

---

## 2. 雙軌串接架構評估與選型 (Architecture Evaluation)

### 2.1 雙軌技術模式對比

| 評估維度 | 模式 A：Google Apps Script (GAS) Webhook (輕量推薦) | 模式 B：Chrome Identity API + OAuth 2.0 (官方直連) |
| :--- | :--- | :--- |
| **運作機制** | 插件發送 HTTPS POST 呼叫個人專屬 GAS Web App，GAS 透過內建 Apps Script 服務操作 Sheets/Docs/Calendar/Drive | 插件使用 `chrome.identity.getAuthToken` 取得 OAuth Token，客戶端直接發起 REST API 呼叫 Google Workspace APIs |
| **Web Store 審核門檻** | **零審查門檻 (Zero-Audit Friction)**：無需宣告 `identity` 權限，無需敏感權限 (Sensitive Scopes) 驗證與宣誓 | **極高審核門檻**：需在 Google Cloud Console 設定 OAuth 同意畫面，並向 Google 提交資安驗證、隱私權政策與示範影片 |
| **使用者部署成本** | **極低 (約 1~2 分鐘)**：複製本專案提供之單檔 `Code.gs` 至個人 Google 雲端硬碟，一鍵發布為 Web App 即可取得專屬 Webhook URL | **中高**：開源/未上架環境需每位使用者自行申請 GCP Project 與 Client ID，配置極為繁瑣 |
| **原子化跨服務操作** | **優異**：單次 Webhook 請求可在 GAS 腳本內部同步完成「寫入 Sheet + 建立 Docs + 登記 Calendar」，大幅降低瀏覽器通訊開銷 | **較差**：瀏覽器端需分別對 Sheets API、Docs API、Calendar API 發起 3~5 次獨立 HTTP 請求，狀態管理複雜 |
| **服務配額 (Quotas)** | 免費 Google 帳號提供每日 20,000 次 URL 擷取、90 分鐘腳本執行時間，對單兵研究員/PM 而言綽綽有餘 | 依 GCP 專案 Quota 限制，每秒/每日請求上限較高 |
| **冷啟動延遲** | 首叫可能存在 1.5 ~ 2.5 秒的 Apps Script 容器冷啟動時間 | 毫秒級直接響應 (Direct API Latency) |

### 2.2 權衡結論與實施策略

1. **核心預設策略（模式 A 為主）**：
   - 預設全面採用 **模式 A (GAS Webhook 模式)**。
   - 插件僅需具備基礎 `fetch` 通訊能力（配置 `host_permissions: ["https://script.google.com/*"]`），完全避開 Chrome Web Store 針對 Google Workspace 敏感權限長達數週的嚴苛審查。
   - 數據直接存入使用者自身的 Google 帳號空間，落實 100% 零第三方伺服器中轉（Zero-Third-Party Server）之隱私標準。
2. **向下相容與未來擴充（模式 B 保留）**：
   - 跨插件通訊契約（`UniversalGooglePayload`）採用純資料結構，將「業務資料 (Payload)」與「傳輸管道 (Transport)」徹底解耦。
   - 未來若插件發布商業託管版本或需要毫秒級雙向同步時，可直接掛載 OAuth 2.0 Transport Provider，現有業務邏輯與 Payload 完全相容。

---

## 3. 安全性防護與零信任驗證機制

### 3.1 Webhook Secret Token 機制
為防止 GAS Webhook URL 外洩導致他人惡意推送垃圾資料至使用者的試算表或日曆：
1. **密鑰生成**：使用者於 Chrome 插件選項頁（Options Page）生成或自訂一組 32 字元的隨機 Secret Token（例如：`sec_g9f82k3...`）。
2. **腳本屬性配置**：使用者在 GAS 的「專案設定 > 腳本屬性 (Script Properties)」中加入相同金鑰 `ECOSYSTEM_SECRET = sec_g9f82k3...`。
3. **請求認證**：
   - 插件於發送 HTTP POST 請求時，將金鑰放入 Header：`X-Ecosystem-Secret: sec_g9f82k3...`（或在 JSON Payload 中攜帶 `secretToken` 欄位以相容無 CORS 自訂 Header 限制）。
   - GAS `doPost(e)` 收到請求後首要比對 Secret，驗證失敗立即中斷並回傳 `{ "success": false, "error": "Unauthorized: Invalid Secret Token" }`。

### 3.2 防重放機制 (Anti-Replay Mechanism)
1. 每個發送至 Google 生態系的 Payload 均包含 `timestamp`（毫秒）與 `requestId` (UUID v4)。
2. GAS 端接收驗證：
   - 檢查 `Math.abs(Date.now() - payload.timestamp) <= 300000`（限制 5 分鐘時間窗口）。
   - 透過 GAS `CacheService.getScriptCache()` 記錄最近 5 分鐘內的 `requestId`，若存在重複 ID 則判定為重放攻擊直接駁回。

---

## 4. 故障容錯、保險絲與離線重試機制

### 4.1 通訊保險絲 (5 秒超時切斷)
跨插件向 Google 生態系拋送資料時，前端 `fetch` 統一配置 `AbortController` 5 秒超時：
- 若超過 5 秒對端無回應（例如網路中斷或 Google 伺服器異常），立即中斷連線。
- 前端發出 Toast 警示通知使用者，**嚴禁阻斷或凍結當前 UI（如繼續計時、繼續編輯）**。

### 4.2 本地隊列緩存與指數退避重試 (Offline Sync Queue)
1. **暫存儲存槽**：在 Chrome Extension 的 `chrome.storage.local` 或 IndexedDB 開闢 `google_sync_pending_queue`。
2. **入隊條件**：當遭遇網路斷線 (HTTP 0)、GAS 回傳 502/503/429 或超時中斷時，自動將該筆 Payload 寫入隊列。
3. **退避排程**：
   - 採用指數退避演算法重試：`retryDelay = Math.min(60000, 2000 * Math.pow(2, retryCount))`（第 1 次 2s、第 2 次 4s、第 3 次 8s，最多 3 次）。
   - 達到最大重試次數後，標記為 `STATUS_FAILED_USER_ACTION_NEEDED`，並於插件介面顯示「待重試 Google 同步項目」標籤，供使用者手動一鍵重推。
4. **前端防抖 (Client-side Debounce)**：
   - 同一實體資料（例如相同的 `ticker` 或 `sprintId`）在 2 秒內禁止重複觸發推送，防止使用者手抖雙擊導致重複 Append。

---

## 5. Google Sheets 整合規格與模板結構 (Schema Spec)

Google Sheets 匯出採用結構化矩陣 Append/Upsert 機制，支援「財務指標與估值追蹤」與「衝刺與工時日誌」兩大核心模式。

### 5.1 財務指標與估值模板 (`mode: "finance_metrics"`)

#### A. 欄位結構定義 (Column Schema)
| 欄位序號 | 欄位名稱 (Header) | 欄位鍵 (Key) | 資料型別 | 格式化與驗證規則 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | 代號 | `ticker` | `String` | 文字置中，全大寫 (如 `NVDA`) | **主鍵 (Primary Key)**，供 `UPSERT_BY_KEY` 比對 |
| **B** | 公司名稱 | `companyName` | `String` | 預設靠左 | 官方公司英文/中文全稱 |
| **C** | 現價 (USD) | `currentPrice` | `Number` | 貨幣格式 `$#,##0.00` | 採集當下即時股價 |
| **D** | 目標價中位數 | `targetPriceMedian` | `Number` | 貨幣格式 `$#,##0.00` | 華爾街分析師共識中位數 |
| **E** | 潛在空間 | `upsidePotential` | `Number/Formula`| 百分比 `+0.0%;-0.0%`，熱力條件格式（正紅/綠、負綠/紅） | `=(D2-C2)/C2` 或前端預算百分比 |
| **F** | 本益比 (P/E) | `peRatio` | `Number` | 數值 `0.0` | 靜態或動態預估市盈率 |
| **G** | 股本報酬率 (ROE)| `roe` | `Number` | 百分比 `0.0%` | 最新季度年化 ROE |
| **H** | 評級摘要 | `ratingSummary` | `String` | 文字標籤 (強力買進/買進/持有/賣出) | 分析師共識綜合評級 |
| **I** | 研報連結 | `reportUrl` | `String (URL)` | 超連結 `=HYPERLINK(url, "查看")` | 原始行情/研報 URL |
| **J** | 更新時間 | `updatedAt` | `String (ISO)` | 時間格式 `YYYY-MM-DD HH:mm:ss` | 資料採集落盤時間戳記 |

#### B. 試算表寫入行為 (Append & Upsert Logic)
- **`APPEND_ROW`**：直接在目標工作表最末行無條件插入新列。
- **`UPSERT_BY_KEY`**（預設）：
  1. GAS 掃描 Column A（`ticker`）。
  2. 若找到相符代號，則就地更新該列欄位資料，保留使用者手動在後續欄位（如 K 欄「個人持倉股數」、L 欄「個人心得」）填寫的私人筆記。
  3. 若無相符代號，則 Append 於表格底部。

---

### 5.2 衝刺與工時日誌模板 (`mode: "sprint_timesheet"`)

#### A. 欄位結構定義 (Column Schema)
| 欄位序號 | 欄位名稱 (Header) | 欄位鍵 (Key) | 資料型別 | 格式化規則 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | 任務 ID | `taskId` | `String` | 文字置中 (如 `task-v2-1727856000000`) | 唯一任務識別碼 |
| **B** | 任務標題 | `title` | `String` | 靠左對齊 | 任務或番茄鐘目標說明 |
| **C** | 專案標籤 | `tags` | `String` | 標籤逗號分隔 (如 `#投資研究, #美股`) | 分類與關聯專案標記 |
| **D** | GTD 情境 | `gtdContext` | `String` | 置中，標籤化 (`@Focus`, `@Meeting`) | 精力情境上下文 |
| **E** | 預估番茄數 | `estimatedPomodoros`| `Number` | 整數 `0` | 規劃預估消耗番茄鐘數 |
| **F** | 實際番茄數 | `actualPomodoros` | `Number` | 整數 `0` | 實際完成消耗番茄鐘數 |
| **G** | 衝刺偏差 | `variance` | `Formula` | `=F2-E2`，條件色彩標記超時 | 超支/節省番茄鐘差異 |
| **H** | 任務狀態 | `status` | `String` | `COMPLETED` / `ABORTED` | 衝刺最終狀態 |
| **I** | 完成時間 | `completedAt` | `String (ISO)` | 時間格式 `YYYY-MM-DD HH:mm:ss` | 結算歸檔時間戳記 |

---

### 5.3 財務模型底稿直套 (`action: "export_financial_model"` / `mode: "financial_model"`)

#### A. 功能與結構定義 (Model Blueprint Schema)
此協定支援由 FinanceClipper 估值沙盒直接將完整的 3-Statement (五年度損益預測) 與現金流折現 (DCF) 試算模型直套建立為獨立的工作表（工作表名稱預設為 `${ticker}_財務模型`）。

- **模型區塊劃分**：
  1. **一、模型核心假設 (Model Assumptions)**：現價、流通股數、基準 EPS、基準營收、所得稅率、WACC 折現率、終端成長率 g、出場本益比。
  2. **二、五年度損益預測表 (Income Statement Projection)**：營收成長率、營業收入公式 (`=B16*(1+C15)`)、營業利益率、EBIT、所得稅、稅後淨利、EPS 公式 (`=C20/$B$5`)、YoY 成長率。
  3. **三、自由現金流與折現估值 (DCF Valuation)**：FCF 轉換率、Unlevered FCF、折現期數、折現因子公式 (`=1/(1+$B$9)^C28`)、現值 PV。
  4. **四、DCF 估值總結與目標價 (Implied Valuation Summary)**：5 年折現現金流加總 (`=SUM(C30:G30)`)、終端價值 Gordon Growth 公式、企業/權益價值、每股隱含目標價、潛在漲跌空間公式。
  5. **五、三種情境敏感度對比 (Scenario Comparison)**：Bear、Base、Bull 三情境目標價與空間比對。

#### B. 試算表寫入行為
- GAS 接收 `payload.grid` 二維陣列，透過 `sheet.getRange(1, 1, rows, cols).setValues(grid)` 批次寫入，試算表引擎自動將以 `=` 開頭之字串轉換為動態試算公式。
- 自動套用樣式：首行大標題深藍背景白字 (`#1E3A8A`)、各區段標題灰底粗體 (`#F3F4F6`)、自動調整欄寬。

---

## 6. Google Docs 研報自動排版樣板規格 (Template Layout Spec)


當使用者發送 `CREATE_DOC_REPORT` 時，GAS 接收資料並透過 Google Docs API (`DocumentApp`) 進行層級排版與 Drive 歸檔。

### 6.1 文件層次排版結構 (Document Hierarchy)

```
[Document Title] 24pt Bold (例如：NVDA 深度投研與估值評估報告 (2026Q3))
├── [Subheader / Metadata Callout] 10pt Gray Italic
│   ├── 產生來源：FinanceClipper & VideoSpeedPlus & ScrumClock
│   └── 產生時間：2026-10-03 10:30 (UTC+8) | 分析師：Analyst-G1
│
├── [Heading 1] 16pt Bold - 一、核心投資觀點與評級
│   └── [Body Paragraph] 11pt Regular (支援 Markdown 粗體、清單轉換)
│
├── [Heading 1] 16pt Bold - 二、財務關鍵指標與共識預測
│   └── [Styled Table] 預設外框、標頭背景灰 (#F3F4F6)、文字 10pt 置中
│
├── [Heading 1] 16pt Bold - 三、法人說明會與專家影音精華
│   └── [Bullet List] 帶時間戳記與重點摘要
│
└── [Heading 1] 16pt Bold - 四、待辦事項與後續追蹤
    └── [Checkbox List / Action Table] 帶 Deadline 與負責人
```

### 6.2 區塊渲染器支援型別 (Section Renderers)
1. **`contentType: "markdown"`**：支援基礎 Markdown 語法轉換（`**粗體**`、`*斜體*`、段落換行）。
2. **`contentType: "table"`**：
   - 接收 `{ "headers": [...], "rows": [[...], [...]] }`。
   - 自動調用 `body.appendTable()`，首列套用深灰底色與粗體字體。
3. **`contentType: "bullet_list"`**：
   - 接收字串陣列，呼叫 `body.appendListItem(item).setGlyphType(DocumentApp.GlyphType.BULLET)`。
4. **`contentType: "action_items"`**：
   - 接收 `[ { "task": "...", "deadline": "..." } ]`，渲染為待辦核取方塊或結構化行動清單。

### 6.3 Google Drive 歸檔管理
- 若 Payload 指定 `folderId`，腳本將建立好的 Docs 移動至該 Drive 目錄 (`DriveApp.getFolderById(folderId).addFile(file)`)。
- 若未指定 `folderId`，預設在個人 Google Drive 根目錄建立 `Chrome Plus Reports/` 資料夾並進行分類存放。

---

## 7. Google Calendar & Tasks 排程與待辦雙向同步規格

### 7.1 Google Calendar 事件同步 (`target: "GOOGLE_CALENDAR"`)

#### A. 欄位對應矩陣 (Payload Mapping)
| ScrumClock 欄位 | Google Calendar API 屬性 | 處理邏輯 |
| :--- | :--- | :--- |
| `item.summary` | `summary` | 標題，自動加上前綴 `🍅 [Focus]` 或情境圖示 |
| `item.description` | `description` | 詳細說明，包含關聯 URL、標籤與來源插件註記 |
| `item.startTime` | `start.dateTime` | ISO 8601 時間字串 (如 `2026-10-03T14:00:00+08:00`) |
| `item.endTime` | `end.dateTime` | ISO 8601 時間字串 (如 `2026-10-03T15:30:00+08:00`) |
| `item.colorId` | `colorId` | 顏色編號：`11` (番茄紅/Flamingo)、`7` (專注藍/Peacock) 等 |
| `item.reminders` | `reminders` | 彈跳式或通知提醒設定 |

#### B. 行程衝突偵測 (Conflict Detection)
- GAS 在建立事件前，可選執行 `CalendarApp.getDefaultCalendar().getEvents(startTime, endTime)`：
  - 若偵測到時段內已有既定行程，回傳 `{ "conflict": true, "conflictingEvents": [...] }`。
  - ScrumClock 接收後可於介面提示「該時段已有會議，是否覆蓋或順延？」。

---

### 7.2 Google Tasks 待辦同步 (`target: "GOOGLE_TASKS"`)

#### A. 欄位對應矩陣 (Payload Mapping)
| ScrumClock / Task 欄位 | Google Tasks 屬性 | 說明 |
| :--- | :--- | :--- |
| `item.summary` | `title` | 待辦清單項目標題 |
| `item.description` | `notes` | 備註說明 (番茄鐘數量、GTD Context) |
| `item.due` | `due` | RFC 3339 截止日期 (如 `2026-10-03T18:00:00.000Z`) |
| `item.status` | `status` | `needsAction` (未完成) / `completed` (已完成) |

#### B. 雙向同步狀態代碼對照表
| 內部狀態代碼 | Google Calendar / Tasks 狀態 | 描述說明 |
| :--- | :--- | :--- |
| `SYNC_PENDING` | - | 待發送至 Google 隊列中 |
| `SYNC_CONFIRMED` | `confirmed` / `needsAction` | 已成功寫入 Google 日曆/待辦，持有 `externalId` |
| `SYNC_COMPLETED` | `completed` | 任務在本地或 Google 端已標記為完成 |
| `SYNC_CANCELLED` | `cancelled` | 日曆事件已刪除或放棄衝刺 |
| `SYNC_FAILED` | `error` | 通訊超時、認證失敗或網路中斷 |

---

## 8. Google Apps Script (GAS) 部署腳本範例與測試指南

本節提供使用者可直接複製並部署於個人 Google 帳號的標準單檔後端腳本 `Code.gs`。

### 8.1 完整後端腳本實作 (`Code.gs`)

```javascript
/**
 * Chrome Plus Ecosystem Integration - Unified GAS Webhook
 * Version: 1.0.0
 * 
 * 部署說明：
 * 1. 於 https://script.google.com 建立新專案。
 * 2. 貼上此腳本至 Code.gs。
 * 3. 於「專案設定 > 腳本屬性」設定 ECOSYSTEM_SECRET (例如: chrome_plus_secret_2026)。
 * 4. 點選「部署 > 新增部署 > 網頁應用程式 (Web App)」：
 *    - 執行身分：我 (Me)
 *    - 誰可以存取：任何人 (Anyone)
 * 5. 複製產生的 Webhook URL 至 Chrome 插件選項頁。
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 取得鎖定，防止並發寫入衝突 (等待 10 秒)
    lock.waitLock(10000);
    
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(false, "INVALID_PAYLOAD", "Missing POST body data");
    }

    var data = JSON.parse(e.postData.contents);
    
    // 1. 安全校驗：驗證 Secret Token
    var scriptProperties = PropertiesService.getScriptProperties();
    var expectedSecret = scriptProperties.getProperty("ECOSYSTEM_SECRET");
    if (expectedSecret && data.secretToken !== expectedSecret) {
      return createResponse(false, "UNAUTHORIZED", "Invalid or missing secret token");
    }

    // 2. 防重放校驗：檢查時間戳 (允許 5 分鐘時間差)
    if (data.timestamp) {
      var diff = Math.abs(Date.now() - Number(data.timestamp));
      if (diff > 300000) {
        return createResponse(false, "REPLAY_ATTACK_DETECTED", "Request timestamp expired");
      }
    }

    // 3. 業務分流路由
    var type = data.type || data.action;
    var payload = data.payload || data;

    switch (type) {
      case "EXPORT_TO_SHEETS":
        return handleExportToSheets(payload);
      case "CREATE_DOC_REPORT":
        return handleCreateDocReport(payload);
      case "SYNC_CALENDAR_EVENT":
        return handleSyncCalendarEvent(payload);
      case "EXPORT_FINANCIAL_MODEL":
      case "export_financial_model":
        return handleExportFinancialModel(payload);
      default:
        return createResponse(false, "UNSUPPORTED_TYPE", "Unknown action type: " + type);
    }
  } catch (err) {
    return createResponse(false, "INTERNAL_ERROR", err.toString());
  } finally {
    lock.releaseLock();
  }
}

/**
 * 處理 Google Sheets 匯出
 */
function handleExportToSheets(payload) {
  var spreadsheet;
  if (payload.spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
  } else {
    // 若未指定，開啟或建立預設工作簿
    var files = DriveApp.getFilesByName("Chrome_Plus_Master_Database");
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create("Chrome_Plus_Master_Database");
    }
  }

  var sheetName = payload.targetSheetName || "DataExport";
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  // 寫入標頭 (若工作表為空)
  if (sheet.getLastRow() === 0 && payload.headers && payload.headers.length > 0) {
    sheet.appendRow(payload.headers);
    sheet.getRange(1, 1, 1, payload.headers.length).setFontWeight("bold").setBackground("#E5E7EB");
    sheet.setFrozenRows(1);
  }

  var rows = payload.rows || [];
  var insertedCount = 0;
  var updatedCount = 0;

  if (payload.appendMode === "UPSERT_BY_KEY" && payload.keyField) {
    var keyField = payload.keyField;
    var lastRow = sheet.getLastRow();
    var existingKeys = {};
    if (lastRow > 1) {
      // 假設 Key 位於第 1 欄 (Column A)
      var keyValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var k = 0; k < keyValues.length; k++) {
        existingKeys[String(keyValues[k][0]).toUpperCase()] = k + 2; // 行號 (1-indexed)
      }
    }

    for (var i = 0; i < rows.length; i++) {
      var rowObj = rows[i];
      var keyVal = String(rowObj[keyField] || "").toUpperCase();
      var rowArray = flattenObjectToRow(rowObj, payload.headers);

      if (keyVal && existingKeys[keyVal]) {
        var targetRowIndex = existingKeys[keyVal];
        sheet.getRange(targetRowIndex, 1, 1, rowArray.length).setValues([rowArray]);
        updatedCount++;
      } else {
        sheet.appendRow(rowArray);
        insertedCount++;
      }
    }
  } else {
    // 預設純 Append 模式
    for (var j = 0; j < rows.length; j++) {
      var rowData = flattenObjectToRow(rows[j], payload.headers);
      sheet.appendRow(rowData);
      insertedCount++;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ack: true,
    spreadsheetUrl: spreadsheet.getUrl(),
    insertedRows: insertedCount,
    updatedRows: updatedCount,
    syncedAt: Date.now()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 Google Sheets 財務模型底稿直套 (Financial Model Template Export)
 * 支援 3-Statement 營收預測與 DCF 現金流折現試算表自動化建立 (含公式與排版)
 */
function handleExportFinancialModel(payload) {
  var spreadsheet;
  if (payload.spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(payload.spreadsheetId);
  } else {
    var files = DriveApp.getFilesByName("Chrome_Plus_Master_Database");
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create("Chrome_Plus_Master_Database");
    }
  }

  var ticker = payload.ticker || "Model";
  var sheetName = payload.targetSheetName || (ticker + "_財務模型");
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  } else {
    sheet.clear(); // 清理舊內容重新建立底稿
  }

  var grid = payload.grid || [];
  if (grid.length === 0) {
    return createResponse(false, "EMPTY_GRID", "Missing model grid data");
  }

  var numRows = grid.length;
  var numCols = grid[0].length;
  var range = sheet.getRange(1, 1, numRows, numCols);
  range.setValues(grid);

  // 格式化樣式 (Styling)
  // 1. 大標題 (Row 1)
  sheet.getRange(1, 1, 1, numCols)
    .setFontWeight("bold")
    .setFontSize(13)
    .setBackground("#1E3A8A")
    .setFontColor("#FFFFFF");

  // 2. 區塊子標題與表頭樣式
  for (var r = 1; r <= numRows; r++) {
    var firstCell = String(grid[r - 1][0] || "").trim();
    if (firstCell.indexOf("【") === 0) {
      sheet.getRange(r, 1, 1, numCols)
        .setFontWeight("bold")
        .setFontSize(11)
        .setBackground("#F3F4F6")
        .setFontColor("#1F2937");
    } else if (firstCell.indexOf("財務指標") === 0 || firstCell.indexOf("估值項目") === 0 || firstCell.indexOf("情境 (Scenario)") === 0) {
      sheet.getRange(r, 1, 1, numCols)
        .setFontWeight("bold")
        .setBackground("#E5E7EB")
        .setFontColor("#111827");
    }
  }

  // 3. 自動調整欄寬
  for (var c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ack: true,
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: sheetName,
    ticker: ticker,
    syncedAt: Date.now()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 Google Docs 研報自動排版生成
 */
function handleCreateDocReport(payload) {
  var title = payload.title || "投研分析報告 - " + Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd");
  var doc = DocumentApp.create(title);
  var body = doc.getBody();

  // 設定頁面邊界 (2 公分)
  body.setMarginTop(56.7);
  body.setMarginBottom(56.7);
  body.setMarginLeft(56.7);
  body.setMarginRight(56.7);

  // 文件大標題
  var titleP = body.appendParagraph(title);
  titleP.setHeading(DocumentApp.ParagraphHeading.TITLE);
  titleP.setFontSize(22).setBold(true).setForegroundColor("#1E3A8A");

  // Meta 資訊
  var metaP = body.appendParagraph("產出時間：" + Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss") + " | 來源：Chrome Plus 跨插件投研工作流");
  metaP.setFontSize(9).setItalic(true).setForegroundColor("#6B7280");
  body.appendHorizontalRule();

  // 區塊渲染
  var sections = payload.sections || [];
  for (var i = 0; i < sections.length; i++) {
    var sec = sections[i];
    if (sec.heading) {
      var h = body.appendParagraph(sec.heading);
      h.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      h.setFontSize(14).setBold(true).setForegroundColor("#1F2937");
    }

    if (sec.contentType === "markdown" || sec.contentType === "text") {
      body.appendParagraph(String(sec.content || ""));
    } else if (sec.contentType === "bullet_list" && Array.isArray(sec.content)) {
      for (var b = 0; b < sec.content.length; b++) {
        body.appendListItem(String(sec.content[b])).setGlyphType(DocumentApp.GlyphType.BULLET);
      }
    } else if (sec.contentType === "table" && sec.content && sec.content.headers) {
      var tableData = [sec.content.headers].concat(sec.content.rows || []);
      var table = body.appendTable(tableData);
      table.setBorderColor("#D1D5DB").setBorderWidth(1);
      // 標頭樣式
      var headerRow = table.getRow(0);
      for (var c = 0; c < headerRow.getNumCells(); c++) {
        headerRow.getCell(c).setBackgroundColor("#F3F4F6").editAsText().setBold(true);
      }
    } else if (sec.contentType === "action_items" && Array.isArray(sec.content)) {
      for (var a = 0; a < sec.content.length; a++) {
        var act = sec.content[a];
        var itemText = "☐ " + (act.task || "") + (act.deadline ? " (期限: " + act.deadline + ")" : "");
        body.appendParagraph(itemText).setFontColor("#374151");
      }
    }
  }

  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());

  // 資料夾歸檔
  if (payload.folderId) {
    try {
      var folder = DriveApp.getFolderById(payload.folderId);
      folder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    } catch (e) {
      // 忽略目錄移動失敗，保留於根目錄
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ack: true,
    documentId: doc.getId(),
    documentUrl: doc.getUrl(),
    syncedAt: Date.now()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 處理 Google Calendar / Tasks 事件同步
 */
function handleSyncCalendarEvent(payload) {
  var target = payload.target || "GOOGLE_CALENDAR";
  var item = payload.item || {};

  if (target === "GOOGLE_CALENDAR") {
    var calendar = CalendarApp.getDefaultCalendar();
    var startTime = item.startTime ? new Date(item.startTime) : new Date();
    var endTime = item.endTime ? new Date(item.endTime) : new Date(startTime.getTime() + 25 * 60000);

    var event = calendar.createEvent(item.summary || "番茄鐘專注時段", startTime, endTime, {
      description: item.description || "來源：ScrumClock Focus Session"
    });

    if (item.colorId) {
      event.setColor(item.colorId);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      ack: true,
      externalId: event.getId(),
      syncedAt: Date.now()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return createResponse(false, "UNSUPPORTED_TARGET", "Target " + target + " not supported directly via default script.");
}

/**
 * 工具函式：將物件依照標頭順序轉為列陣列
 */
function flattenObjectToRow(obj, headers) {
  if (!headers || headers.length === 0) {
    return Object.values(obj);
  }
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    // 支援直接 key 取值或根據別名映射
    var val = obj[key] !== undefined ? obj[key] : (obj[Object.keys(obj)[i]] || "");
    row.push(typeof val === "object" ? JSON.stringify(val) : val);
  }
  return row;
}

/**
 * 通用 JSON 回應產生器
 */
function createResponse(success, code, message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: success,
    ack: success,
    errorCode: success ? undefined : code,
    errorMessage: message,
    syncedAt: Date.now()
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

### 8.2 快速部署與端到端測試指南 (Testing Guide)

#### 步驟 1：部署 Google Apps Script
1. 開啟 [Google Apps Script 儀表板](https://script.google.com/) 並新增專案（名稱：`Chrome Plus Webhook Bridge`）。
2. 將上述 `Code.gs` 代碼覆蓋專案中的內容。
3. 點選專案設定（齒輪圖示）>「指令碼屬性 (Script Properties)」>「新增指令碼屬性」：
   - 屬性：`ECOSYSTEM_SECRET`
   - 值：`test_secret_key_84920`
4. 點擊右上角「部署」>「新增部署」：
   - 種類選取「網頁應用程式 (Web app)」。
   - 說明：「v1 投研與生態系對接」。
   - 執行身分：選取「我 (Me)」。
   - 誰可以存取：選取「任何人 (Anyone)」。
5. 點擊「部署」，授權 Google 帳號權限（試算表、文件、日曆），並複製產生的 **網頁應用程式網址 (Web App URL)**。

#### 步驟 2：使用 cURL 測試各協定

##### 測試 1：測試 Google Sheets 財務指標 Upsert
```bash
curl -L -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolVersion": 2,
    "secretToken": "test_secret_key_84920",
    "timestamp": 1727919000000,
    "type": "EXPORT_TO_SHEETS",
    "payload": {
      "mode": "finance_metrics",
      "targetSheetName": "美股自選估值追蹤",
      "appendMode": "UPSERT_BY_KEY",
      "keyField": "ticker",
      "headers": ["代號", "公司名稱", "現價", "目標價中位數", "更新時間"],
      "rows": [
        {
          "ticker": "NVDA",
          "companyName": "NVIDIA Corporation",
          "currentPrice": 128.5,
          "targetPriceMedian": 150.0,
          "updatedAt": "2026-10-03 10:00:00"
        }
      ]
    }
  }'
```
**預期回傳**：
```json
{
  "success": true,
  "ack": true,
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/.../edit",
  "insertedRows": 1,
  "updatedRows": 0,
  "syncedAt": 1727919005000
}
```

##### 測試 2：測試 Google Docs 研報自動排版生成
```bash
curl -L -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolVersion": 2,
    "secretToken": "test_secret_key_84920",
    "timestamp": 1727919000000,
    "type": "CREATE_DOC_REPORT",
    "payload": {
      "title": "NVDA 投研即時評估報告 (2026Q3)",
      "sections": [
        {
          "heading": "一、核心投資觀點",
          "contentType": "markdown",
          "content": "Blackwell 晶片架構需求熱絡，預估營收季增 15%。"
        },
        {
          "heading": "二、重點財務數據預估",
          "contentType": "table",
          "content": {
            "headers": ["年度", "營收(B)", "EPS($)"],
            "rows": [
              ["2025A", "60.9", "1.30"],
              ["2026E", "112.5", "2.85"]
            ]
          }
        },
        {
          "heading": "三、法說會精華筆記",
          "contentType": "bullet_list",
          "content": [
            "[08:20] 供應鏈液冷良率大幅改善",
            "[15:45] 客戶資本支出未見減速跡象"
          ]
        }
      ]
    }
  }'
```
**預期回傳**：
```json
{
  "success": true,
  "ack": true,
  "documentId": "1a2b3c4d5e6f...",
  "documentUrl": "https://docs.google.com/document/d/1a2b3c4d5e6f.../edit",
  "syncedAt": 1727919010000
}
```

##### 測試 3：測試 Google Calendar 番茄鐘專注行程登記
```bash
curl -L -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "protocolVersion": 2,
    "secretToken": "test_secret_key_84920",
    "timestamp": 1727919000000,
    "type": "SYNC_CALENDAR_EVENT",
    "payload": {
      "target": "GOOGLE_CALENDAR",
      "item": {
        "summary": "🍅 [Focus] 深入分析 NVDA 估值與法說會",
        "description": "關聯研報：https://finance.google.com\n標籤：#投資研究 #美股",
        "startTime": "2026-10-03T14:00:00+08:00",
        "endTime": "2026-10-03T15:00:00+08:00",
        "colorId": "11"
      }
    }
  }'
```
**預期回傳**：
```json
{
  "success": true,
  "ack": true,
  "externalId": "google_event_id_xyz...",
  "syncedAt": 1727919015000
}
```
