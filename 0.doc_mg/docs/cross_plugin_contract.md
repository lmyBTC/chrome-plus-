# Chrome 多插件工作區：跨插件通訊解耦與防禦性架構規範 (Cross-Plugin Decoupling & Defensive Contract)

> **核心願景**：各 Chrome 擴充功能保持「100% 獨立編譯、獨立發布、自治運行」。跨插件合作僅透過純資料通訊協議 (Pure Data Contract)，任一插件的單獨重構、新增欄位或版本不一致，絕不牽連其他插件的正常運作。

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

當你在任一擴充功能內部進行快速迭代（例如新增 `__$%^&*` 測試欄位、重構 state 或增加私有標記）：

1. **發送端：資料防腐層 (Anticorruption Sanitizer)**
   - 在 `aiClient.js` 發送跨插件訊息前，透過 `sanitizeFinancePayload()` 進行**白名單過濾**。
   - 只允許乾淨的規格欄位（`ticker`, `name`, `price`, `stats`, `analyst`, `earnings`, `note`）往外傳遞。
   - 所有自訂內部屬性（如 `__custom_state`、循環引用、DOM 物件）會在防腐層被直接剔除，絕不會污染跨插件協議。

2. **接收端：未知欄位自動忽略 (Ignore Unknown Fields)**
   - 接收端（ScrumClock Background Worker）只解析認識的白名單鍵值。
   - 收到任何非預期的額外欄位，直接靜默忽略，絕不拋出 `TypeError`。

3. **型別強制安全降級 (Defensive Fallback)**
   - 接收端對陣列與字串強制驗證（`Array.isArray(x) ? x : []`，`typeof s === 'string' ? s : String(s)`）。
   - 即使回傳空物件 `{}` 或惡意無效資料，UI 端只會顯示預設兜底文案，絕不中斷前端流程。

---

## 3. 協議版本標記 (Protocol Versioning)

所有跨插件請求與回傳 Payload 均包含 `protocolVersion`（目前為 `v1`）：
```json
{
  "protocolVersion": 1,
  "type": "AI_GENERATE_FINANCE_SUMMARY",
  "payload": { ... }
}
```
- **向後相容**：若未來新增欄位，舊版插件自動忽視新欄位。
- **重大破壞性變更 (Breaking Change)**：若協議結構發生翻天覆地改變，升級為 `protocolVersion: 2`，接收端可透過版本號判斷並提供降級處理，不造成版本撞車。

---

## 4. 故障保險絲 (Circuit Breaker & Timeout)

- **通訊超時保險絲**：跨插件調用設定 35 秒絕對超時限制（任務建立則設為 6 秒）。若對端無回應或當機，立即 `resolve` 失敗狀態，釋放等待鎖定。
- **本地獨立快取**：AI 生成之研報儲存於自身插件的 `chrome.storage.local`，不依賴對端儲存空間。

---

## 5. Phase 3 擴充協議規格 (Tasks & Focus Pomodoro Loop)

### 5.1 研報轉任務協定 (`CREATE_TASK`)
- **發送端**：FinanceClipper (`aiClient.js`)
- **接收端**：ScrumClock Background Worker (`background.ts`)
- **請求格式**：
```json
{
  "protocolVersion": 1,
  "type": "CREATE_TASK",
  "payload": {
    "ticker": "NVDA",
    "title": "深入研究 NVDA 財報與估值",
    "notes": "# 投資研報：NVDA ...",
    "tags": ["#投資研究", "#美股"],
    "estimatedPomodoros": 2,
    "url": "https://www.google.com/finance/quote/NVDA:NASDAQ"
  }
}
```
- **響應格式**：
```json
{
  "success": true,
  "taskId": "mission-1726567890123",
  "duplicate": false,
  "error": ""
}
```

### 5.2 研究番茄鐘專注廣播協定 (`FOCUS_STARTED`)
- **發送端**：ScrumClock Background Worker (`background.ts`)
- **接收端**：FinanceClipper Background Worker (`background.js`)
- **廣播格式**：
```json
{
  "protocolVersion": 1,
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
  "ticker": "NVDA",
  "prefetched": true
}
```

### 5.3 影片筆記與字幕收集協定 (`COLLECT_NOTE`)
- **發送端**：VideoSpeedPlus (`content.js` / `popup.js`) 或其他多媒體採集插件
- **接收端**：ScrumClock Background Worker (`externalService.ts`)
- **請求格式**：
```json
{
  "protocolVersion": 1,
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
  "noteId": "note-1726567890123",
  "message": "已成功收集字幕至 ScrumClock"
}
```

---

## 6. AI 輔助開發視野邊界守則 (AI Context Boundary Protection)

為徹底落實「分開開發、互不干擾、避免資料與上下文污染」：
1. **單一插件專注原則**：
   - 當任務目標為 `finance-research-clipper-oss` 時，AI Agent 僅能讀寫該專案內的原始碼，**嚴禁跨目錄讀取 `chrome_scrumclock/` 內部檔案**。
   - 當任務目標為 `chrome_scrumclock` 時，AI Agent 僅能讀寫該專案內的原始碼，**嚴禁跨目錄讀取 `finance-research-clipper-oss/` 內部檔案**。
2. **通訊視為黑盒子遠端 API**：
   - AI 若需要實作跨插件通訊，**只能且必須依據本契約文件**（`0.doc_mg/docs/cross_plugin_contract.md`）中的 Request / Response 規範編寫程式，將對端完全視為外部第三方程式。
3. **防止資料庫跨域幻覺**：
   - 任何插件的資料結構變更，均不得預設對端會自動知曉；跨插件通訊一律透過 Sanitizer 防腐過濾。

---

## 7. 0.doc_mg 自動化合約驗證與多格式轉譯工具鏈 (CLI Tooling)

工作區於 `0.doc_mg/tools/` 提供無外部依賴之 Python 自動化管線工具：

### 7.1 合約與快照 JSON Schema 校驗器 (`validate_contract.py`)
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

### 7.2 投研快照多格式匯出轉譯器 (`export_converter.py`)
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

### 7.3 自動化回歸測試
- **檔案路徑**：`0.doc_mg/tests/run_tests.py`
- **執行指令**：`python 0.doc_mg/tests/run_tests.py`

---

## 8. 常見開發疑問解答 (FAQ)

### Q: 我在 Finance 功能裡新增奇怪的變數或功能，會不會把 ScrumClock 弄壞？
**不會**。因為 Finance 的變數只存在於 FinanceClipper 的執行上下文中（Content Script、Dashboard 頁面），與 ScrumClock 完全隔離。只有透過 `aiClient.js` 發出的請求會到達 ScrumClock，而發送前會被「防腐層 (Sanitizer)」嚴格過濾。

### Q: 我單獨開發 FinanceClipper 時，一定要開著 ScrumClock 嗎？
**完全不需要**。FinanceClipper 的儀表板具備自動探測機制，若未連線到 ScrumClock，只會在 AI 面板顯示「尚未連線」與手動指引，所有股票查詢、深度採集、財報分析、自訂筆記、CSV 與 Markdown 匯出功能均能 100% 獨立運行！
