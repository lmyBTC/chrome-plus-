# 🌐 Chrome Plus x Google 生態雙向自動化整合規格書 (Google Tasks & Google Sheets)

> **定位**：將 `chrome-plus-`（ScrumClock GTD 看板、FinanceClipper 研報、日終戰報）與使用者的個人 Google 雲端工作空間（Google Tasks 待辦事項、Google Sheets 產能與持股追蹤）打通，實現自動化雙向同步。
> **核心原則**：
> 1. **Zero-Friction 零摩擦**：採用 Google Apps Script (GAS) Web App 或本機 Python OAuth Service Account，免去 Chrome Extension 繁雜的 Web Store OAuth 審核。
> 2. **雙軌分工**：
>    - **Google Tasks**：承接「當日即時戰役（Next Actions）」與手機端推播提醒。
>    - **Google Sheets**：承接「長期戰績數據湖（Daily Analytics DB）」與「個股研報追蹤表（Finance Sandbox）」。

---

## 🗺️ 一、 系統拓撲與資料流 (System Architecture)

```
                            ┌──────────────────────────────────────────────┐
                            │     ScrumClock 前端中樞 (React + Gemini Nano)  │
                            └──────────────────────┬───────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼ (路徑 A：本機微服務橋接)                          ▼ (路徑 B：輕量免設定 Webhook)
         ┌───────────────────────────────┐                   ┌───────────────────────────────┐
         │  本機微服務 (127.0.0.1:8765)  │                   │ Google Apps Script (GAS) WebApp│
         │   (tools/google_sync_hub.py)  │                   │ (免起本機 Python，直連雲端)    │
         ├───────────────────────────────┤                   ├───────────────────────────────┤
         │ • Google OAuth 憑證池         │                   │ • 部署為簡易 Webhook URL       │
         │ • 支援完全離線快取與佇列重試 │                   │ • 一鍵將資料寫入 Tasks / Sheets│
         └───────────────┬───────────────┘                   └───────────────┬───────────────┘
                         │                                                   │
                         └─────────────────────────┬─────────────────────────┘
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │       Google Cloud Workspace          │
                               ├───────────────────┬───────────────────┤
                               │   Google Tasks    │   Google Sheets   │
                               │ (手機/手錶即時提醒)│ (多維報表/數據沉澱)│
                               └───────────────────┴───────────────────┘
```

---

## 🚀 二、 四大核心自動化落地場景 (Top 4 Automation Scenarios)

### 場景 1：ScrumClock 看板 ➔ Google Tasks 雙向推播（手機隨身帶走）
* **痛點**：桌機上的 Chrome 擴充功能關閉後，使用者離開電腦就無法收到今日焦點任務提醒。
* **作法**：
  1. 當使用者在 `BoardView.tsx` 將卡片推入 **`in-progress` (進行中)** 或 **`next-action`** 時，觸發通訊。
  2. 透過 GAS 或本機微服務，在 Google Tasks 的 `@ScrumClock-Today` 清單中建立或同步任務。
  3. 卡片在 Chrome 中被標記為完成（`done`）時，Google Tasks 自動同步勾選完成；反之亦然。
* **Google Tasks 欄位對齊**：
  - `title`：`[1🍅] 撰寫 Coinbase 代幣化研報`
  - `notes`：任務連結、DoD 驗收條件與標籤 (`@Research`)
  - `due`：今日截止時間（支援 Google Calendar 時間軸連動）

---

### 場景 2：日終戰報 ➔ Google Sheets 產能大數據儀表板（自動數據湖）
* **痛點**：目前的 `EndOfDayReview.tsx` 僅將日報落盤至 Obsidian 本地 Markdown，缺乏可量化、可繪製週/月趨勢的試算表結構。
* **作法**：
  1. 使用者在 `EndOfDayReview.tsx` 點擊「完成結算下班」時，除了儲存 Obsidian 外，並行發送一筆結構化 JSON 至 Google Sheets。
  2. **自動寫入欄位**：
     | 日期 (Date) | 完成番茄數 (🍅) | 完成任務數 | 專注時長 (mins) | 最大亮點 (Highlight) | 核心阻礙 (Lesson) | Nano AI 評語摘要 |
     | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
     | 2026-10-07 | 8 | 4 | 200 | 完成 Web AI 矩陣 | CORS 調試超時 | 高專注度，建議控制邊際探索 |
  3. Google Sheets 內建圖表自動即時更新：每週產能燃盡圖、標籤分佈圓餅圖。

---

### 場景 3：FinanceClipper 個股研報 ➔ Google Sheets 估值沙盒自動建檔
* **痛點**：在 FinanceClipper 爬取 Yahoo Finance / Goodinfo 的本益比、殖利率與目標價後，手動輸入 Excel 計算容易打錯字。
* **作法**：
  1. 在 FinanceClipper 儀表板點擊「📊 匯入個人持股追蹤表」。
  2. 系統自動在你的 `Personal_Portfolio_Tracking` 試算表中尋找對應代碼（如 `COIN`, `NVDA` 或 `2330.TW`）：
     - 若代碼存在：自動更新最新股價、P/E、EPS 預估值。
     - 若代碼不存在：自動新增一列，並在備註填入 Nano 萃取的 3 點反常識論點。

---

### 場景 4：Google Tasks 逆向導入看板收件匣（跨端語音靈感捕捉）
* **痛點**：走在路上用 Android / iPhone 語音助理或手錶說「*提醒我明天看 FastMCP 文件*」，這則任務只留在手機的 Google Tasks，沒有進到 Chrome Plus。
* **作法**：
  1. 擴充 `chrome.idle` 巡檢或開啟瀏覽器時，ScrumClock 背景向 Google Tasks API 抓取未完成的 Inbox 待辦。
  2. 透過 `TaskAIEngine.triageInboxItems` 進行語意釐清，直接轉化為看板上的卡片，打通「手機隨手記 ➔ 電腦自動進 GTD 看板」的閉環。

---

## 🛠️ 三、 極速實作方式：免審核的 Google Apps Script (GAS) 方案

在 Chrome Extension 中直接走官方 Google OAuth 需要在 Google Cloud Console 配置 Client ID、在 Manifest 宣告 `identity` 權限，發布時還需經過漫長審核。  
**最優解是「GAS Web App 轉發機制（零配置、免審核、全私人）」**：

### 1. 部署 Google Apps Script 代碼（使用者只需貼上並部署一次）

```javascript
// Google Apps Script 伺服端代碼 (Code.gs)
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;

    if (action === "SYNC_DAILY_LOG") {
      // 1. 寫入 Google Sheets 每日戰報
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DailyLogs") 
                    || SpreadsheetApp.getActiveSpreadsheet().insertSheet("DailyLogs");
      
      // 若為全新工作表，寫入表頭
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["日期", "番茄數", "任務數", "專注分鐘", "核心亮點", "教訓反思", "AI摘要", "時間戳記"]);
      }

      sheet.appendRow([
        payload.date,
        payload.spentPomodoros,
        payload.completedTasksCount,
        payload.spentPomodoros * 25,
        payload.highlights,
        payload.lessons,
        payload.aiDigest,
        new Date()
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", target: "sheets" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "CREATE_GOOGLE_TASK") {
      // 2. 建立 Google Tasks 任務
      const taskList = Tasks.Tasklists.list().items[0]; // 預設清單
      const newTask = {
        title: payload.title,
        notes: payload.notes || "",
        due: payload.dueDate ? new Date(payload.dueDate).toISOString() : undefined
      };
      const created = Tasks.Tasks.insert(newTask, taskList.id);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", taskId: created.id }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "未知 action" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2. 整合至本地微服務 `main_dispatcher.py`

在現有的 `0.doc_mg/tools/main_dispatcher.py` 中擴充 `google_sync` 工具：

```python
# 擴充至 main_dispatcher.py 的 execute_tool:
elif name == "sync_google":
    import requests
    gas_url = data.get("gas_webhook_url") # 讀取使用者設定檔中的 GAS 部署網址
    if not gas_url:
        return {"status": "error", "message": "未配置 GAS Webhook URL"}
    
    response = requests.post(gas_url, json={
        "action": data.get("action"),
        "payload": data.get("payload")
    }, timeout=10)
    return response.json()
```

---

## 📋 四、 推進優先級建議 (Action Roadmap)

| 優先序 | 功能模組 | 技術實現點 | 預期收益 |
| :--- | :--- | :--- | :--- |
| **P0** | **日終戰報 Google Sheets 自動匯出** | 在 `EndOfDayReview.tsx` 新增「📊 同步 Sheets」按鈕 | 零成本打造個人可視化產能儀表板，數據不再孤島化 |
| **P1** | **進行中戰役 ➔ Google Tasks 同步** | `BoardView.tsx` 拖曳到 In-Progress 時自動推播 | 手機與手錶即時接收當前衝刺焦點，防打斷 |
| **P2** | **FinanceClipper 個股追蹤表同步** | 在 Dashboard 整合「匯出至投資追蹤試算表」 | 自動化投研數據庫維護，免手動維護 Excel |
| **P3** | **Google Tasks 逆向匯入收件匣** | 背景巡檢同步未整理任務至 ScrumClock Inbox | 解決跨裝置（行動端 $\rightarrow$ 桌面端）碎片靈感斷層 |