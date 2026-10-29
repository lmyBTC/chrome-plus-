<!-- cross-ref:auto ─────────────────────
  本檔: cross_plugin_contract.md
  交叉引用:
    - ./analyst_workflow_friction_matrix.md  [CREATE_TASK]
───────────────────── cross-ref:end -->
# Chrome 多插件工作區：跨插件通訊解耦與防禦性架構規範 (Cross-Plugin Decoupling & Defensive Contract)

> **核心願景**：各 Chrome 擴充功能保持「100% 獨立編譯、獨立發布、自治運行」。跨插件合作僅透過原生直連純資料通訊協議 (Pure Data Contract)，任一插件的單獨重構、新增欄位或版本不一致，絕不牽連其他插件。

---

## 1. 獨立自治原則 (Zero-Coupling Autonomy)

1. **實體工程完全解耦**：
   - `chrome_scrumclock/`：TypeScript + React + Vite。
   - `finance-research-clipper-oss/`：原生 Vanilla JS 零構建。
   - **0 依賴**：嚴禁跨專案 `import / require`。
2. **運行期單向隔離 (Fault Sandbox)**：
   - 任一插件未安裝或崩潰，其他插件之核心功能仍 100% 正常運作。

---

## 2. 寬容讀者模式 (Tolerant Reader Pattern)

1. **發送端：資料防腐層 (Anticorruption Sanitizer)**：發送前白名單消毒，過濾私有屬性（如 `__custom_state`、DOM 節點、未序列化物件）。
2. **接收端：未知欄位自動忽略 (Ignore Unknown Fields)**：只解析白名單欄位，收到額外欄位靜默忽略，絕不拋出 `TypeError`。
3. **型別安全降級 (Defensive Fallback)**：對陣列與字串強制驗證 (`Array.isArray` / `typeof === 'string'`)，資料缺失時兜底降級，不中斷 UI。

---

## 3. 靜態金鑰與擴充功能 ID 恆定對照表 (Static Extension Keys)

所有插件於 `manifest.json` 配置 2048-bit RSA SPKI 公開金鑰，使本地與發布環境 Extension ID 恆定：

| 插件代號 (Plugin) | 專案目錄 | 恆定 Extension ID | 角色定位 |
| :--- | :--- | :--- | :--- |
| **ScrumClock** | `chrome_scrumclock/` | `ahiihabnbjeoeneahcgbdcofncjoclcp` | 核心宿主與能力中樞 (Hub) |
| **FinanceClipper** | `finance-research-clipper-oss/` | `imnnkgiglcbjknfbkdfocdhoookkipji` | 財務投研採集子插件 (Spoke) |
| **VideoSpeedPlus** | `chrome_video speed plus/` | `dhdnogmjajghbdcgdccicpkfljmcoieg` | 影片倍速與字幕採集子插件 (Spoke) |
| **ActivityMonitor** | `browser-activity-monitor/` | `kjnoegggihncdaimlgfccccogghjapgn` | 瀏覽器行為監控子插件 (Spoke) |
| **GeminiNano** | `chrome_gemini_nano/` | `(選用直連/外部動態對接)` | 本機 AI 邊緣推論子插件 (Spoke) |

*金鑰定義檔集中於 `1.devtools/keys/manifest_keys.json`。*

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
- **向後相容**：舊版接收端自動忽略新增未知欄位。
- **破壞性變更**：升級版本號，接收端按版本號提供降級。

---

## 5. 故障保險絲 (Circuit Breaker & Timeout)

- **通訊超時保險絲**：直連調用限 5~6 秒超時，對端無回應時優雅反饋使用者，不阻斷 UI。
- **零背景輪詢 (Zero Outbox / Zero Alarms)**：廢除背景輪詢佇列，失敗即時反饋，杜絕 Service Worker 週期喚醒與電量消耗。

---

## 6. 業務擴充協議規格 (Tasks & Focus Pomodoro Loop)

### 6.1 通用任務協定 (`CREATE_TASK` / `UniversalTaskPayload` v2.3)
- **發送端**：FinanceClipper (`aiClient.js`) 等 Spoke 子插件 ➔ **接收端**：ScrumClock (`background.ts`)
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
- **規範**：`gtdContext` 限 `@Focus` / `@Meeting` / `@Review` / `@Waiting-For` / `@Blocked`；`priority` 限 `P1` / `P2` / `P3`。
- **響應格式**：`{ "success": true, "ack": true, "taskId": "mission-1726567890123" }`

### 6.2 研究番茄鐘專注廣播協定 (`FOCUS_STARTED`)
- **發送端**：ScrumClock (`background.ts`) ➔ **接收端**：FinanceClipper (`background.js`)
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
- **響應格式**：`{ "success": true, "ack": true, "ticker": "NVDA", "prefetched": true }`

### 6.3 影片筆記與字幕收集協定 (`COLLECT_NOTE`)
- **發送端**：VideoSpeedPlus ➔ **接收端**：ScrumClock (`externalService.ts`)
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
    "text": "擷取之字幕或筆記片段...",
    "tags": ["#影片學習", "#YouTube"],
    "type": "subtitle"
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "noteId": "note-1726567890123", "message": "成功" }`

### 6.4 結構化試算表匯出協定 (`EXPORT_TO_SHEETS`)
- **發送端**：FinanceClipper / ScrumClock / ActivityMonitor ➔ **接收端**：GAS Webhook / ScrumClock Hub
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
    "headers": ["代號", "公司名稱", "現價", "目標價", "潛在空間"],
    "rows": [
      { "ticker": "NVDA", "companyName": "NVIDIA", "currentPrice": 128.5, "targetPrice": 150.0, "upside": "+16.7%" }
    ],
    "metadata": { "sourcePlugin": "FINANCE_CLIPPER", "timestamp": 1727919000000 }
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "spreadsheetUrl": "https://docs.google.com/...", "insertedRows": 1 }`

### 6.5 研報與多媒體文件生成協定 (`CREATE_DOC_REPORT`)
- **發送端**：FinanceClipper / VideoSpeedPlus / ScrumClock ➔ **接收端**：GAS Webhook / Docs API
- **請求格式**：
```json
{
  "protocolVersion": 2,
  "type": "CREATE_DOC_REPORT",
  "payload": {
    "templateType": "INVESTMENT_RESEARCH",
    "title": "NVDA 深度投研報告",
    "sections": [
      { "heading": "一、投資觀點", "level": 1, "contentType": "markdown", "content": "**評級：強力買進**" },
      { "heading": "二、關鍵指標", "level": 1, "contentType": "table", "content": { "headers": ["指標", "數值"], "rows": [["PE", "42.1"]] } }
    ],
    "sourcePlugins": ["FINANCE_CLIPPER", "VIDEO_SPEED_PLUS"]
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "documentId": "doc_id_123", "documentUrl": "https://docs.google.com/..." }`

### 6.6 日曆排程與待辦雙向同步協定 (`SYNC_CALENDAR_EVENT`)
- **發送端**：ScrumClock ➔ **接收端**：Google Calendar / Google Tasks 對接服務
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
      "summary": "🍅 [Focus] 深入研究 NVDA 財報與估值",
      "startTime": "2026-10-03T14:00:00+08:00",
      "endTime": "2026-10-03T15:30:00+08:00",
      "gtdContext": "@Focus"
    },
    "sourcePlugin": "SCRUMCLOCK"
  }
}
```
- **響應格式**：`{ "success": true, "ack": true, "externalId": "cal_ev_123", "status": "confirmed" }`

### 6.7 通訊轉發與回執結構 (Forwarding, Dispatch & Error Handling)
1. **雙軌拓撲**：分散直連（各插件直調本地 GAS URL）或中樞匯聚（經由 ScrumClock 代理轉發）。
2. **標準化回執**：
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
3. **超時與熔斷**：請求受 6 秒超時保護，逾時自動返回 `TIMEOUT_FALLBACK` 並降級暫存本地快照。

### 6.8 社群分發與研報轉發協定 (`DISPATCH_SOCIAL_POST` / `UniversalSocialDraftPayload` v2.0)
- **發送端**：子插件 ➔ **接收端**：GeminiNano / ScrumClock Hub
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
- **規範**：`originalTitle` 必填 (≤ 200 字)；發送前消毒 `__*` 私有欄位；對端未安裝時靜默降級。
- **響應格式**：`{ "success": true, "ack": true, "draftId": "draft-123", "message": "成功接收" }`

### 6.9 Web AI 原生專用小模型矩陣調度與降級規範 (Web AI Matrix Routing & Fallback v2.0)
1. **專用優先**：摘要用 `ai.summarizer`，擴寫用 `ai.writer`，調音用 `ai.rewriter`，翻譯用 `translation`。
2. **透明降級**：專用 API 不可用時自動回退至通用 Prompt API (`ai.languageModel`)。
3. **顯存防護**：`WebAIGateway` 統一調度，提供 `destroyAll()` 集中釋放底層會話資源。

### 6.10 Google 生態雙軌同步標準 Webhook 合約 (GAS Web App & Local Hub v1.0)
1. **呼叫方式**：HTTP POST JSON 至 Apps Script Web App URL，封裝 `{ action, payload }`。
2. **四大標準 Action**：
   - `SYNC_DAILY_LOG`: 日終戰報寫入 Google Sheets (`DailyLogs`)，同日冪等覆蓋。
   - `CREATE_GOOGLE_TASK`: 焦點戰役推播至 Google Tasks (`@ScrumClock-Today`)。
   - `SYNC_PORTFOLIO`: 個股估值與目標價寫入 Google Sheets (`Portfolio_Tracking`)。
   - `FETCH_INBOX_TASKS`: 逆向拉取 Google Tasks 未完成項目至看板。
3. **超時底線**：全端 10 秒超時控制，失敗降級至本機微服務 `127.0.0.1:8765/sync_google` 離線佇列。

---

## 7. AI 輔助開發視野邊界守則 (AI Context Boundary Protection)

1. **單一插件專注**：開發指定插件時，**嚴禁跨目錄讀取其他插件內部源碼**。
2. **黑盒契約**：跨插件協同**只能且必須依據本契約規範**編寫程式，將對端完全視為外部第三方程式。
3. **防資料庫跨域幻覺**：不得預設對端知曉內部資料結構，通訊一律經防腐層過濾。

---

## 8. 自動化合約驗證與多格式轉譯工具鏈 (CLI Tooling)

### 8.1 合約與快照 JSON Schema 校驗器 (`validate_contract.py`)
- **檔案**：`1.devtools/tools/validate_contract.py`
- **指令**：
  ```bash
  py 1.devtools/tools/validate_contract.py snapshot.json
  py 1.devtools/tools/validate_contract.py --dir 1.devtools/contracts/snapshots/
  py 1.devtools/tools/validate_contract.py snapshot.json --strict
  ```

### 8.2 投研快照多格式匯出轉譯器 (`export_converter.py`)
- **檔案**：`finance-research-clipper-oss/tools/export_converter.py`
- **指令**：
  ```bash
  py finance-research-clipper-oss/tools/export_converter.py snapshot.json --format all
  py finance-research-clipper-oss/tools/export_converter.py snapshot.json --format markdown
  py finance-research-clipper-oss/tools/export_converter.py path/to/snapshots/ --combine-csv -o master.csv
  ```

### 8.3 自動化回歸測試
- **檔案**：`1.devtools/tests/run_tests.py`
- **指令**：`py 1.devtools/tests/run_tests.py`

---

## 9. 常見開發疑問解答 (FAQ)

### Q: 我在 Finance 功能裡新增奇怪的變數或功能，會不會把 ScrumClock 弄壞？
**不會**。Finance 變數僅存在其沙盒上下文，跨插件發送前經防腐層過濾，ScrumClock 接收端亦具未知欄位忽略機制。

### Q: 我單獨開發 FinanceClipper 時，一定要開著 ScrumClock 嗎？
**完全不需要**。FinanceClipper 具備自動探測機制，未連線時自動優雅降級，所有本地投研功能 100% 獨立運行。
