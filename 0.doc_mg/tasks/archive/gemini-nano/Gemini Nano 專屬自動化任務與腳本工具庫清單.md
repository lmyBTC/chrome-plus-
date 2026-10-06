# 🛠️ Gemini Nano 專屬自動化任務、腳本庫與調度流程清單

> **核心原則**：Gemini Nano 是「輕量、高速、低延遲的意圖判定與文字抽取大腦」；本機腳本（Python / GAS / Extension Background）是「執行檔案讀寫、系統呼叫與網路 I/O 的肌肉」。
> 兩者結合的黃金場景：**輸入字數在 500~2,500 字以內、意圖明確、需要結構化參數分發或本地端資料落地的任務**。

---

## 一、 適合 Nano 驅動的四大任務矩陣 (Task Matrix)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Gemini Nano 適配任務象限                        │
├───────────────────────────────────┬────────────────────────────────────┤
│ [高頻即時] 邊緣文字管線           │ [系統調度] 自然語言轉結構化指令     │
│ 1. 社群文案壓縮與去油 (Fit 280)    │ 5. 口語萬能啟動番茄鐘與白名單      │
│ 2. 萬字長文「反常識數據萃取」     │ 6. 跨插件收集品一鍵分派與排程      │
├───────────────────────────────────┼────────────────────────────────────┤
│ [本地落盤] Python / 系統檔案維護  │ [知識管理] GTD 看板與筆記梳理      │
│ 3. 靜態 RSS Feed 自動追加更新     │ 7. 收件匣碎片靈感結構化 (Inbox 0)  │
│ 4. 歷史發文語意防重比對 (Dedup)   │ 8. YouTube 口語字幕轉 Actionable   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 二、 8 大高價值任務、專屬腳本與資料流程詳解

### 類別 A：內容發布與部落格生態維護（Content & RSS Engine）

#### 任務 1：部落格快訊一鍵追加維護 RSS (`rss_generator.py`)
* **痛點**：每次在 `pulse.html` 或部落格發布新觀點，手動編輯 `feed.xml` 格式極易出錯且繁瑣。
* **Nano 職責**：
  * 從當前卡片中抽取標題、300 字核心摘要、分類標籤（`#Macro`、`#Tech`）。
  * 輸出乾淨 JSON：`{ title, summary, link, category }`。
* **腳本實作**：`0.doc_mg/tools/rss_generator.py`（使用 Python `xml.etree.ElementTree` 解析現有 XML、插入最新項目、自動修剪保留最新 30 則並存檔）。
* **執行流程**：
  ```
  [網頁 pulse.html] 
     ➔ Nano 抽取 XML 欄位 JSON 
     ➔ Extension POST http://127.0.0.1:8765/exec (tool: append_rss)
     ➔ Python 本地更新 dist/feed.xml
     ➔ 側邊欄顯示「✅ RSS 已更新」
  ```

#### 任務 2：社群文案發布前防重與查重器 (`local_dedup.py`)
* **痛點**：高頻發推或發 Threads 時，容易在數天內重複聊類似觀點或使用雷同的開頭句式。
* **Nano 職責**：
  * 將即將發送的草稿壓縮為「核心論點一句話（Core Thesis Statement）」。
* **腳本實作**：`0.doc_mg/tools/local_dedup.py`（讀取本地 `data/social_history.json`，計算 Levenshtein 距離或 TF-IDF Cosine Similarity）。
* **執行流程**：
  ```
  [側邊欄草稿] 
     ➔ Nano 提煉核心論點 
     ➔ Python 計算比對近 50 篇歷史紀錄 
     ➔ 若相似度 > 65%，側欄紅字警示：「⚠️ 3 天前已有類似觀點」
  ```

#### 任務 3：社群平台官方 API 直發代行者 (`social_publisher.py`)
* **痛點**：在瀏覽器內跳轉 Web Intent 仍需手動點擊確認，若多帳號管理更顯凌亂。
* **Nano 職責**：
  * 執行「最後 10 秒文字拋光」：將英文精確壓縮在 240~270 字元之間，繁中去除中國用語。
* **腳本實作**：`0.doc_mg/tools/social_publisher.py`（持有本機 `.env` 中的 X API Key 與 Threads Graph API Token，接收 JSON 後背景打 API）。
* **執行流程**：
  ```
  [側邊欄確認按鈕] 
     ➔ Nano 完成格式化校驗 
     ➔ POST http://127.0.0.1:8765/exec (tool: publish_social) 
     ➔ Python 完成 OAuth/Token 發布並回傳 Post ID
  ```

---

### 類別 B：敏捷專注與自然語言系統調度（Productivity Driver）

#### 任務 4：全域口語指令萬能路由器 (`local_system_driver.py`)
* **痛點**：目前命令列（`Cmd+K`）只能輸入制式代碼，無法理解複合意圖（例如「專注 45 分鐘，擋掉社群，順便放音樂」）。
* **Nano 職責**：
  * 負責將口語拆解為一個或多個標準行動 JSON（Composite Action Array）。
* **腳本實作**：Chrome Extension Background Worker + Python System Driver（可透過 Python 調用本機 Spotify AppleScript、啟動環境等）。
* **典型輸入與輸出**：
  * **輸入**：*「開始 30 分鐘比特幣研報專注，打開我的研究表格」*
  * **Nano 輸出**：
    ```json
    {
      "actions": [
        { "type": "START_TIMER", "minutes": 30, "tag": "@Crypto" },
        { "type": "ENABLE_DNR_BLOCK", "targets": ["youtube.com", "x.com"] },
        { "type": "OPEN_URL", "url": "https://docs.google.com/spreadsheets/..." }
      ]
    }
    ```
  * **執行流程**：Extension Background 接收後，並行呼叫 Alarms API、DNR API 與分頁建立。

#### 任務 5：收件匣碎片靈感一鍵分類與評估 (`inbox_triage.py`)
* **痛點**：透過快捷鍵 `Alt + Q` 收集了大量未整理的文字碎片，收件匣堆積如山。
* **Nano 職責**：
  * 遍歷 `inbox` 陣列，批次分析文字語意，自動判定：
    1. **行動性**：是具體行動（Next Action）還是暫存靈感（Someday）？
    2. **番茄預算**：預估需要 1🍅 (25m)、2🍅 (50m) 還是需進一步拆解？
    3. **標籤歸類**：`@Code`、`@Research`、`@Admin`。
* **執行流程**：
  ```
  [點擊「✨ Nano 一鍵釐清」] 
     ➔ 讀取 storage.local.weeklyMissions (狀態為 inbox) 
     ➔ Nano 輸出批次更新結構 
     ➔ 前端彈出 Diff 預覽視窗 
     ➔ 點擊確認，一次性寫入看板各欄位
  ```

---

### 類別 C：研報分析與知識萃取（Research & Knowledge Pipeline）

#### 任務 6：萬字研報反常識觀點與陷阱獵犬 (`extract_thesis.py`)
* **痛點**：財經研報與 10-K 篇幅龐大，多數內容為無意義的公關說明與歷史背景。
* **Nano 職責**：
  * 由 Content Script 擷取重要章節（每次切片 1,500 字）。
  * 專用 Prompt 針對以下三項進行負向獵取：
    1. **與市場共識相反的數據**。
    2. **最致命的下檔風險因子（Tail Risk）**。
    3. **管理層迴避說明的警訊（Red Flags）**。
* **執行流程**：
  ```
  [瀏覽財經報告分頁] 
     ➔ 點擊 Side Panel「🎯 萃取核心 Thesis」 
     ➔ Nano 分段並行提煉 3 點極致信噪比摘要 
     ➔ 自動推送到 FinanceClipper 或 ScrumClock 當前任務筆記
  ```

#### 任務 7：YouTube 口語字幕轉 Actionable 清單 (`transcript_to_tasks.py`)
* **痛點**：`chrome_video speed plus` 按 `Alt + S` 收集到的字幕是零碎口語，難以直接執行。
* **Nano 職責**：
  * 將「口語逐字稿」重構成「條列式實作步驟（Checklist）」。
  * 自動過濾「那、然後、基本上」等口頭贅字。
  * 提取講者提到的 GitHub Repo 或工具名稱。
* **執行流程**：
  ```
  [YouTube 按 Alt + S] 
     ➔ Content Script 提取字幕文字 
     ➔ Nano 自動轉化為 3 點待辦事項 
     ➔ 透過跨插件通訊 CREATE_TASK 自動推入 ScrumClock 待辦池
  ```

#### 任務 8：本地 Markdown / Obsidian 筆記自動歸檔 (`markdown_archiver.py`)
* **痛點**：網頁收集下來的內容需要手動存成 `.md` 檔案放進個人知識庫。
* **Nano 職責**：
  * 為內容自動生成 YAML Frontmatter（包含 tags、date、source_url、core_concept）。
* **腳本實作**：`0.doc_mg/tools/markdown_archiver.py`（寫入本地指定目錄，例如 `~/Documents/Obsidian/Vault/Clippings/`）。
* **執行流程**：
  ```
  [側邊欄點擊「歸檔到 Obsidian」] 
     ➔ Nano 自動產生 YAML 與標準 Markdown 
     ➔ POST http://127.0.0.1:8765/exec (tool: save_markdown) 
     ➔ Python 在本地硬碟直接落盤建立 .md 檔案
  ```

---

## 三、 開發推薦路線圖與配置建議

| 順序 | 任務模組 | 涉及腳本 | 難易度 | 核心價值 |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | **RSS Feed 自動維護** | `tools/rss_generator.py` | 🟢 簡易 | 徹底打通 `pulse.html` 到 RSS 的自動化閉環 |
| **Step 2** | **社群草稿調音與字數壓線** | 純前端 Nano Prompt | 🟢 簡易 | 0 依賴，大幅加速 X / Threads 發布效率 |
| **Step 3** | **萬能意圖路由器 (`Cmd+K`)** | `nanoIntentRouter.ts` | 🟡 中等 | 擺脫固定語法，用語意啟動專注與任務 |
| **Step 4** | **歷史發文去重器** | `tools/local_dedup.py` | 🟡 中等 | 確保社群發文信噪比，避免自己抄自己 |
| **Step 5** | **Obsidian 本地硬碟歸檔** | `tools/markdown_archiver.py` | 🟢 簡易 | 零手動複製，研報隨手一按直接落地硬碟 |