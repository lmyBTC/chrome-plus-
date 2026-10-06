# Chrome 多插件工作區：跨插件通訊解耦與防禦性架構規範 (Cross-Plugin Decoupling & Defensive Contract)

> **核心願景**：各 Chrome 擴充功能保持「100% 獨立編譯、獨立發布、自治運行」。跨插件合作僅透過原生直連純資料通訊協議 (Pure Data Contract)，任一插件的單獨重構、新增欄位或版本不一致，絕不牽連其他插件的正常運作。

---

## 1. 獨立自治原則 (Zero-Coupling Autonomy)

1. **實體工程完全解耦**：
   - `chrome_scrumclock/`：TypeScript + React + Vite 打包型插件。
   - `finance-research-clipper-oss/`：原生 Vanilla JS 零構建插件。
   - **兩者在專案依賴與構建上為 0 依賴**：不允許任何跨專案的 `import / require`。
2. **運行期單向隔離 (Fault Sandbox)**：
   - 即使 FinanceClipper 未安裝或崩潰，ScrumClock 的番茄鐘、專注模式、側邊欄仍 100% 正常。
   - 即使 ScrumClock 未安裝或關閉，FinanceClipper 的爬蟲、損益表、分析師卡片、CSV/Markdown 匯出仍 100% 正常。

---

## 2. 寬容讀者模式 (Tolerant Reader Pattern)

當你在任一擴充功能內部進行快速迭代（例如新增測試欄位、重構 state 或增加私有標記）：

1. **發送端：資料防腐層 (Anticorruption Sanitizer)**
   - 在發送跨插件訊息前，透過白名單過濾進行資料消毒。
   - 只允許乾淨的規格欄位往外傳遞。
   - 所有自訂內部屬性（如 `__custom_state`、循環引用、DOM 物件）會在防腐層被直接剔除，絕不會污染跨插件協議。

2. **接收端：未知欄位自動忽略 (Ignore Unknown Fields)**
   - 接收端（ScrumClock Background Worker）只解析認識的白名單鍵值。
   - 收到任何非預期的額外欄位，直接靜默忽略，絕不拋出 `TypeError`。

3. **型別強制安全降級 (Defensive Fallback)**
   - 接收端對陣列與字串強制驗證（`Array.isArray(x) ? x : []`，`typeof s === 'string' ? s : String(s)`）。
   - 即使回傳空物件 `{}` 或無效資料，UI 端只會顯示預設兜底文案，絕不中斷前端流程。

---

## 3. 靜態金鑰與擴充功能 ID 恆定對照表 (Static Extension Keys)

為徹底消除開發與測試期「手動複製貼上 Extension ID」的使用者痛點，所有插件皆在 `manifest.json` 中配置固定公開金鑰（2048-bit RSA SPKI Public Key），使本地 Unpacked 與發布環境的 Extension ID 恆定不變：

| 插件代號 (Plugin) | 專案目錄 | 恆定 Extension ID | 角色定位 |
| :--- | :--- | :--- | :--- |
| **ScrumClock** | `chrome_scrumclock/` | `ahiihabnbjeoeneahcgbdcofncjoclcp` | 核心宿主與能力中樞 (Hub) |
| **FinanceClipper** | `finance-research-clipper-oss/` | `imnnkgiglcbjknfbkdfocdhoookkipji` | 財務投研採集子插件 (Spoke) |
| **VideoSpeedPlus** | `chrome_video speed plus/` | `dhdnogmjajghbdcgdccicpkfljmcoieg` | 影片倍速與字幕採集子插件 (Spoke) |
| **ActivityMonitor** | `browser-activity-monitor/` | `kjnoegggihncdaimlgfccccogghjapgn` | 瀏覽器行為監控子插件 (Spoke) |
| **GeminiNano** | `chrome_gemini_nano/` | `(選用直連/外部動態對接)` | 本機 AI 邊緣推論與社群分發子插件 (Spoke) |

*金鑰定義檔集中管理於 `0.doc_mg/keys/manifest_keys.json`。*

---

## 4. 協議版本標記 (Protocol Versioning)

所有跨插件請求與回傳 Payload 均包含 `protocolVersion`（目前為 `2`）：
```json
{
  "protocolVersion": 2,
  "type": "CREATE_TASK",
  "payload": { ... }
}
```
- **向後相容**：若未來新增欄位，舊版插件自動忽視新欄位。
- **重大破壞性變更 (Breaking Change)**：若協議結構發生重大改變，升級版本號，接收端可透過版本號判斷並提供降級處理，不造成版本撞車。

---

## 5. 故障保險絲 (Circuit Breaker & Timeout)

- **通訊超時保險絲**：跨插件直連調用設定 5~6 秒超時限制。若對端未啟動或無回應，發送端立即捕捉錯誤並優雅反饋使用者（例如提示對端尚未啟動），不阻斷主線 UI 操作。
- **零背景輪詢 (Zero Outbox / Zero Alarms)**：全面廢除背景輪詢佇列與死信重試。發送失敗直接交由前端即時處置，徹底杜絕 Service Worker 被週期性喚醒或造成電力耗損。

---

## 6. 業務擴充協議規格 (Tasks & Focus Pomodoro Loop)

### 6.1 通用任務協定 (`CREATE_TASK` / `UniversalTaskPayload` v2.3)
- **發送端**：FinanceClipper (`aiClient.js`) 或其他 Spoke 子插件
- **接收端**：ScrumClock Background Worker (`background.ts` / `externalService.ts`)
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "CREATE_TASK",
  "payload": {
    "id": "task-v2-1727856000000",
    "ticker": "NVDA",
    "title": "深入研究 NVDA 財報與估值",
    "notes": "# 投資研報：NVDA ...",
    "tags": ["#投資研究", "#美股", "$NVDA", "@Focus"],
    "estimatedPomodoros": 2,
    "url": "https://www.google.com/finance/quote/NVDA:NASDAQ",
    "deepLinkUrl": "chrome-extension://.../dashboard.html?ticker=NVDA",
    "gtdContext": "@Focus",
    "priority": "P1",
    "sourcePlugin": "FINANCE_CLIPPER",
    "createdAt": 1727856000000
  }
}
```
- **欄位規範**：
  - `deepLinkUrl`（選填）：反向深層連結（如指向 FinanceClipper 儀表板個股快照或影音精準秒數播放）。
  - `gtdContext`（選填）：枚舉值，限 `@Focus`、`@Meeting`、`@Review`、`@Waiting-For`、`@Blocked`（預設 `@Focus`）。
  - `priority`（選填）：枚舉值，限 `P1`、`P2`、`P3`（預設 `P1`）。
  - `sourcePlugin`（選填）：來源插件標識字串（如 `FINANCE_CLIPPER`, `VIDEO_SPEED_PLUS`）。
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "taskId": "mission-1726567890123"
}
```

### 6.2 研究番茄鐘專注廣播協定 (`FOCUS_STARTED`)
- **發送端**：ScrumClock Background Worker (`background.ts`)
- **接收端**：FinanceClipper Background Worker (`background.js`)
- **廣播格式**：
```json
{
  "protocolVersion": 2,
  "type": "FOCUS_STARTED",
  "payload": {
    "ticker": "NVDA",
    "missionText": "深入研究 NVDA 財報",
    "tags": ["#投資研究"]
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "ticker": "NVDA",
  "prefetched": true
}
```

### 6.3 影片筆記與字幕收集協定 (`COLLECT_NOTE`)
- **發送端**：VideoSpeedPlus (`content.js` / `popup.js`) 或其他多媒體採集插件
- **接收端**：ScrumClock Background Worker (`externalService.ts`)
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "COLLECT_NOTE",
  "payload": {
    "source": "video_speed_plus",
    "title": "影片標題名稱",
    "url": "https://www.youtube.com/watch?v=xxxx&t=120s",
    "currentTime": "02:00",
    "text": "當前擷取到的字幕逐字稿或重點文字片段...",
    "tags": ["#影片學習", "#YouTube"],
    "type": "subtitle"
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "noteId": "note-1726567890123",
  "message": "已成功收集字幕至 ScrumClock"
}
```

### 6.4 結構化試算表匯出協定 (`EXPORT_TO_SHEETS`)
- **發送端**：FinanceClipper（財務指標/估值分析）、ScrumClock（工時日誌/衝刺看板）或 ActivityMonitor（行為審計）
- **接收端**：Google Apps Script Webhook 轉發器 或 ScrumClock Hub 對接模組
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "EXPORT_TO_SHEETS",
  "payload": {
    "mode": "finance_metrics",
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    "targetSheetName": "個股估值追蹤",
    "appendMode": "UPSERT_BY_KEY",
    "keyField": "ticker",
    "headers": ["代號", "公司名稱", "現價", "目標價中位數", "潛在空間", "本益比", "ROE", "更新時間"],
    "rows": [
      {
        "ticker": "NVDA",
        "companyName": "NVIDIA Corporation",
        "currentPrice": 128.5,
        "targetPriceMedian": 150.0,
        "upsidePotential": "+16.7%",
        "peRatio": 42.1,
        "roe": "55.8%",
        "updatedAt": "2026-10-03 09:30:00"
      }
    ],
    "metadata": {
      "sourcePlugin": "FINANCE_CLIPPER",
      "operator": "Analyst-G1",
      "timestamp": 1727919000000
    }
  }
}
```
- **工時日誌模式範例 (`mode: "sprint_timesheet"`)**：
```json
{
  "protocolVersion": 2,
  "type": "EXPORT_TO_SHEETS",
  "payload": {
    "mode": "sprint_timesheet",
    "targetSheetName": "工時與衝刺日誌",
    "appendMode": "APPEND_ROW",
    "headers": ["任務ID", "標題", "標籤", "GTD分類", "預估番茄", "實際番茄", "狀態", "完成時間"],
    "rows": [
      {
        "taskId": "task-v2-1727856000000",
        "title": "深入研究 NVDA 財報與估值",
        "tags": "#投資研究, #美股",
        "gtdContext": "@Focus",
        "estimatedPomodoros": 2,
        "actualPomodoros": 3,
        "status": "COMPLETED",
        "completedAt": "2026-10-03 10:15:00"
      }
    ]
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
  "insertedRows": 1,
  "updatedRows": 0,
  "updatedAt": 1727919005000
}
```

### 6.5 研報與多媒體文件生成協定 (`CREATE_DOC_REPORT`)
- **發送端**：FinanceClipper、VideoSpeedPlus、ScrumClock（可聚合多插件資料發起）
- **接收端**：Google Apps Script Webhook 轉發器 或 Google Docs API 服務
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "CREATE_DOC_REPORT",
  "payload": {
    "templateType": "INVESTMENT_RESEARCH",
    "title": "NVDA 深度投研與估值評估報告 (2026Q3)",
    "folderId": "root_or_drive_folder_id",
    "sections": [
      {
        "heading": "一、核心投資觀點與評級",
        "level": 1,
        "contentType": "markdown",
        "content": "**評級：強力買進 (Strong Buy)**\n- 受惠於 Blackwell 架構全面放量，營收年增預期維持 40%+。\n- 雲端 CSP 資本支出維持雙位數成長，算力需求依舊緊繃。"
      },
      {
        "heading": "二、財務關鍵指標與共識預測",
        "level": 1,
        "contentType": "table",
        "content": {
          "headers": ["指標", "2025A", "2026E", "2027E"],
          "rows": [
            ["營收 (Billion $)", "60.9", "112.5", "148.0"],
            ["EPS ($)", "1.30", "2.85", "3.90"],
            ["毛利率 (%)", "72.7%", "75.5%", "76.0%"]
          ]
        }
      },
      {
        "heading": "三、法人說明會與專家影音精華 (由 VideoSpeedPlus 採集)",
        "level": 1,
        "contentType": "bullet_list",
        "content": [
          "[05:12] CEO 提及液冷散熱模組供應瓶頸已獲顯著緩解",
          "[18:40] 針對推論端晶片佔比提高至整體營收 40% 的戰略說明"
        ]
      },
      {
        "heading": "四、待辦事項與後續追蹤",
        "level": 1,
        "contentType": "action_items",
        "content": [
          {"task": "比對台積電 CoWoS 產能交期更新", "deadline": "2026-10-10"},
          {"task": "追蹤 Hyperscalers Q3 財報電話會議", "deadline": "2026-10-25"}
        ]
      }
    ],
    "sourcePlugins": ["FINANCE_CLIPPER", "VIDEO_SPEED_PLUS", "SCRUMCLOCK"]
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "documentId": "195ZSbTLBPjiwaq1rdfhyG8yM4SEVn_E",
  "documentUrl": "https://docs.google.com/document/d/195ZSbTLBPjiwaq1rdfhyG8yM4SEVn_E/edit",
  "createdAt": 1727919010000
}
```

### 6.6 日曆排程與待辦雙向同步協定 (`SYNC_CALENDAR_EVENT`)
- **發送端**：ScrumClock（番茄鐘排程、Focus Task 排定）
- **接收端**：Google Calendar / Google Tasks 對接服務
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "SYNC_CALENDAR_EVENT",
  "payload": {
    "action": "CREATE_EVENT",
    "target": "GOOGLE_CALENDAR",
    "item": {
      "id": "task-v2-1727856000000",
      "externalId": "",
      "summary": "🍅 [Focus] 深入研究 NVDA 財報與估值",
      "description": "關聯研報：https://www.google.com/finance/quote/NVDA:NASDAQ\n標籤：#投資研究 #美股\n來源插件：FinanceClipper -> ScrumClock",
      "startTime": "2026-10-03T14:00:00+08:00",
      "endTime": "2026-10-03T15:30:00+08:00",
      "colorId": "11",
      "reminders": {
        "useDefault": false,
        "overrides": [
          {"method": "popup", "minutes": 10}
        ]
      },
      "gtdContext": "@Focus"
    },
    "sourcePlugin": "SCRUMCLOCK"
  }
}
```
- **建立 Google Tasks 待辦模式範例 (`target: "GOOGLE_TASKS"`)**：
```json
{
  "protocolVersion": 2,
  "type": "SYNC_CALENDAR_EVENT",
  "payload": {
    "action": "CREATE_TASK",
    "target": "GOOGLE_TASKS",
    "item": {
      "id": "task-v2-1727856000000",
      "summary": "【今日戰役】深入研究 NVDA 財報與估值",
      "description": "預計消耗 2 番茄鐘；GTD: @Focus",
      "due": "2026-10-03T18:00:00Z"
    },
    "sourcePlugin": "SCRUMCLOCK"
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "externalId": "google_cal_ev_8492048102948",
  "htmlLink": "https://www.google.com/calendar/event?eid=Z29vZ2xlX2NhbF9ldl84NDkyMDQ4MTAyOTQ4",
  "status": "confirmed",
  "syncedAt": 1727919015000
}
```

### 6.7 通訊轉發與回執結構 (Forwarding, Dispatch & Error Handling)
1. **雙軌拓撲轉發 (Dual Topology Forwarding)**：
   - **分散直連 (Decentralized Direct)**：各插件（如 FinanceClipper）可於本地儲存自己的 GAS Webhook URL，在需要匯出時直接調用 `fetch(gasWebhookUrl, { method: 'POST', body: ... })`，不經由 ScrumClock。
   - **中樞匯聚 (Hub Aggregation)**：若使用者在 ScrumClock 統一配置 Google OAuth 憑證或通用 Webhook，各 Spoke 插件透過 `chrome.runtime.sendMessage(SCRUMCLOCK_ID, ...)` 傳送 `EXPORT_TO_SHEETS` / `CREATE_DOC_REPORT`，由 ScrumClock 代理轉發並回傳結果。
2. **標準化回執結構 (Standardized Response Envelope)**：
   ```typescript
   interface CrossPluginGoogleResponse {
     success: boolean;
     ack: boolean;
     externalId?: string;
     resourceUrl?: string;
     errorCode?: "TIMEOUT_FALLBACK" | "UNAUTHORIZED" | "INVALID_PAYLOAD" | "NETWORK_ERROR";
     errorMessage?: string;
     syncedAt: number;
   }
   ```
3. **超時與降級熔斷 (Circuit Breaker & Fallback)**：
   - 跨插件請求與對外 Google 呼叫均受嚴格 6 秒超時保護。
   - 若發生逾時或網路中斷，發送端立即捕獲並返回 `TIMEOUT_FALLBACK`，並自動將匯出內容降級儲存為本地 JSON/CSV 快照，保證使用者資料零遺失、前端介面零卡頓。

### 6.8 社群分發與研報轉發協定 (`DISPATCH_SOCIAL_POST` / `UniversalSocialDraftPayload` v2.0)
- **發送端**：ScrumClock、FinanceClipper 或 VideoSpeedPlus 等子插件
- **接收端**：GeminiNano 插件或 ScrumClock Hub 轉發代理
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "DISPATCH_SOCIAL_POST",
  "payload": {
    "x_en": "Concise post for X (max 280 chars)...",
    "threads_zh": "Threads 繁體中文分享內容...",
    "originalTitle": "NVDA 深度投研與估值評估報告",
    "originalSummary": "核心論點與財務數據摘要...",
    "sourceUrl": "https://finance.yahoo.com/...",
    "ticker": "NVDA",
    "tags": ["#投資研究", "#美股", "$NVDA"],
    "sourcePlugin": "FINANCE_CLIPPER",
    "createdAt": 1727856000000
  }
}
```
- **欄位規範**：
  - `x_en`（選填）：X 英文貼文草稿，上限 280 字元或 Thread 鏈。
  - `threads_zh`（選填）：Threads 繁中貼文草稿。
  - `originalTitle`（必填）：原始來源標題（上限 200 字元）。
  - `originalSummary`（選填）：原始內容或摘要（上限 1500 字元）。
  - `sourceUrl`（選填）：來源 URL（上限 500 字元）。
  - `ticker`（選填）：關聯股票代碼（上限 20 字元）。
  - `tags`（選填）：標籤字串陣列（最多 10 個）。
  - `sourcePlugin`（選填）：發起來源插件代號（如 `FINANCE_CLIPPER`, `SCRUMCLOCK`）。
- **響應格式**：
```json
{
  "success": true,
  "ack": true,
  "draftId": "draft-1726567890123",
  "message": "社群貼文草稿已成功接收並寫入待發布佇列"
}
```
- **防腐層 (Anticorruption Sanitizer) 與容錯保護**：
  - 發送前過濾所有內部私有欄位（`__*`、DOM 節點、未序列化函數）。
  - 對端未安裝（`chrome.runtime.lastError`）時自動靜默降級，回傳 `{ success: false, ack: false, error: ... }`，不中斷操作。
  - 雙向交握標準化日誌：僅在開發模式（非 Production）輸出結構化日誌 `[Contract Debug][DISPATCH_SOCIAL_POST]`。

---

## 7. AI 輔助開發視野邊界守則 (AI Context Boundary Protection)

為徹底落實「分開開發、互不干擾、避免資料與上下文污染」：
1. **單一插件專注原則**：
   - 當任務目標為 `finance-research-clipper-oss` 時，AI Agent 僅能讀寫該專案內的原始碼，**嚴禁跨目錄讀取 `chrome_scrumclock/` 內部檔案**。
   - 當任務目標為 `chrome_scrumclock` 時，AI Agent 僅能讀寫該專案內的原始碼，**嚴禁跨目錄讀取 `finance-research-clipper-oss/` 內部檔案**。
2. **通訊視為黑盒子遠端 API**：
   - AI 若需要實作跨插件通訊，**只能且必須依據本契約文件**（`0.doc_mg/docs/cross_plugin_contract.md`）中的 Request / Response 規範編寫程式，將對端完全視為外部第三方程式。
3. **防止資料庫跨域幻覺**：
   - 任何插件的資料結構變更，均不得預設對端會自動知曉；跨插件通訊一律透過 Sanitizer 防腐過濾。

---

## 8. 0.doc_mg 自動化合約驗證與多格式轉譯工具鏈 (CLI Tooling)

工作區於 `0.doc_mg/tools/` 提供無外部依賴之 Python 自動化管線工具：

### 8.1 合約與快照 JSON Schema 校驗器 (`validate_contract.py`)
- **檔案路徑**：`0.doc_mg/tools/validate_contract.py`
- **使用指令**：
  ```bash
  # 校驗單一快照或合約 JSON
  python 0.doc_mg/tools/validate_contract.py snapshot.json

  # 批次校驗目錄內所有 JSON
  python 0.doc_mg/tools/validate_contract.py --dir path/to/dir/

  # 啟用嚴格欄位檢查
  python 0.doc_mg/tools/validate_contract.py snapshot.json --strict
  ```

### 8.2 投研快照多格式匯出轉譯器 (`export_converter.py`)
- **檔案路徑**：`0.doc_mg/tools/export_converter.py`
- **功能**：
  1. **Obsidian Markdown**：自動解析快照生成相容 YAML Frontmatter、Dataview 與完整估值/獲利分析表格之筆記。
  2. **量化 CSV**：扁平化匯出包含現價、共識目標價、離散係數 (CV)、Beta、EPS 與 YoY 之數值分析表。
- **使用指令**：
  ```bash
  # 同步轉譯為 Obsidian Markdown 與 CSV
  python 0.doc_mg/tools/export_converter.py snapshot.json --format all

  # 僅轉譯為 Obsidian Markdown 筆記
  python 0.doc_mg/tools/export_converter.py snapshot.json --format markdown

  # 批次將目錄內多份快照合併為單一彙總量化 CSV
  python 0.doc_mg/tools/export_converter.py path/to/snapshots/ --combine-csv -o master_metrics.csv
  ```

### 8.3 自動化回歸測試
- **檔案路徑**：`0.doc_mg/tests/run_tests.py`
- **執行指令**：`python 0.doc_mg/tests/run_tests.py`

---

## 9. 常見開發疑問解答 (FAQ)

### Q: 我在 Finance 功能裡新增奇怪的變數或功能，會不會把 ScrumClock 弄壞？
**不會**。因為 Finance 的變數只存在於 FinanceClipper 的執行上下文中（Content Script、Dashboard 頁面），與 ScrumClock 完全隔離。只有透過 `aiClient.js` 發出的請求會到達 ScrumClock，而發送前會被「防腐層 (Sanitizer)」嚴格過濾。

### Q: 我單獨開發 FinanceClipper 時，一定要開著 ScrumClock 嗎？
**完全不需要**。FinanceClipper 的儀表板具備自動探測機制，若未連線到 ScrumClock，只會在 AI 面板顯示「尚未連線」與手動指引，所有股票查詢、深度採集、財報分析、自訂筆記、CSV 與 Markdown 匯出功能均能 100% 獨立運行！
