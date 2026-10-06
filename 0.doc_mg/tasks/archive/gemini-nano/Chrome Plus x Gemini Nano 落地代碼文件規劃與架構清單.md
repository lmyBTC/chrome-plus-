# 🗺️ Chrome Plus x Gemini Nano 落地代碼文件規劃與架構清單

> **專案目標**：將 `masonyang-blog.github.io/pulse.html` 與深度研報內容，透過 Chrome 內建「Gemini Nano (Prompt API)」做邊緣推理與調度，並藉由本機 Python 執行微服務，完成「社群雙語分發（X/Threads）」、「RSS 靜態維護」、「本地筆記歸檔」與「GTD 智能流轉」的自動化閉環。
> **架構原則**：
> 1. **大腦在前端**：Chrome Extension + Gemini Nano 負責意圖辨識、文字打磨、字數壓線與參數結構化。
> 2. **肌肉在後端**：Python 輕量腳本庫負責硬碟檔案 I/O、簽名 API 調用與相似度去重計算。
> 3. **通訊零摩擦**：Extension 與本機 Python 透過 `http://127.0.0.1:8765/exec` 快速回環通訊（延遲 < 5ms）。

---

## 一、 代碼文件樹狀圖全景 (File Tree)

```text
workspace_root/
├── chrome_scrumclock/                         # [前端中台] Chrome 擴充功能中樞 (React + TS)
│   └── src/
│       ├── core/
│       │   └── ai/
│       │       ├── nanoService.ts             # [新建立] Gemini Nano 核心適配與會話生命週期管理
│       │       └── nanoIntentRouter.ts        # [新建立] 全域命令列自然語言萬能路由器
│       ├── features/
│       │   └── toolbox/
│       │       └── tools/
│       │           └── social-dispatcher/     # [新建立] 社群分發與調音子模組
│       │               ├── SocialDispatcher.tsx # [新建立] 側邊欄 HITL 雙欄發布介面
│       │               ├── toneShifter.ts     # [新建立] 4 大調音算子 (銳化/壓線/去油/切Thread)
│       │               ├── index.ts           # [新建立] 模組門面匯出 (Barrel Export)
│       │               └── types.ts           # [新建立] 社群草稿與調音狀態型別宣告
│       └── content/
│           └── pulseExtractor.ts              # [新建立] pulse.html DOM 深度解析與結構化提取器
│
├── 0.doc_mg/                                  # [專案管理與本地工具庫]
│   ├── tools/                                 # 本地 Python 工具腳本庫 (執行肌肉)
│   │   ├── main_dispatcher.py                 # [新建立] 本地 HTTP 路由閘道 (FastAPI 輕量服務)
│   │   ├── rss_generator.py                   # [新建立] 部落格 feed.xml 自動追加與滾動維護器
│   │   ├── local_dedup.py                     # [新建立] 歷史貼文 Levenshtein/TF-IDF 相似度防重器
│   │   ├── social_publisher.py                # [新建立] X API v2 與 Threads Graph API 直發代理
│   │   └── markdown_archiver.py               # [新建立] 本地 Obsidian / Markdown 帶 Frontmatter 歸檔器
│   │
│   └── docs/                                  # 契約與規格同步
│       └── cross_plugin_contract.md           # [待擴充] 補充 DISPATCH_SOCIAL_POST 跨插件契約
```

---

## 二、 核心代碼文件詳解：原始需求、目標與規格

### 模組 1：前端 AI 核心與通訊層 (`chrome_scrumclock/src/core/ai/`)

#### 1. `nanoService.ts`
* **原始需求**：
  * 在瀏覽器內零成本、低延遲調用本地 Gemini Nano（Prompt API），免申請外部付費 API Key。
* **開發目標**：
  * 封裝 Chrome Prompt API 的命名空間適配、模型下載狀態監聽、單例模式（Singleton）管理，以及防止顯卡 VRAM 記憶體洩漏。
* **技術規格**：
  * **命名空間遞補**：優先探測 `self.ai.languageModel` $\rightarrow$ `window.ai.languageModel` $\rightarrow$ `chrome.aiLanguageModel` $\rightarrow$ `self.LanguageModel`。
  * **生命週期防禦**：實作 `destroySession()`，當 React 元件 unmount 時主動釋放顯存，防止反覆開啟造成崩潰。
  * **防禦性解析**：內建 `safeExtractJSON<T>()` 正則過濾器，強制剝離 Markdown 代碼塊（` ```json `）並萃取純 JSON。
  * **輸出能力**：支援 `prompt()`（阻塞式）與 `promptStreaming()`（打字機效果）兩種呼叫模式。

#### 2. `nanoIntentRouter.ts`
* **原始需求**：
  * 原有命令列（`Cmd+K`）僅支援生硬的指令代碼（如 `> sprint 25`），無法理解口語複合意圖。
* **開發目標**：
  * 讓使用者能用一段自然口語（如：「專注 45 分鐘比特幣研報，擋掉社群，順便放音樂」），自動拆解為標準 Action 陣列。
* **技術規格**：
  * **推論參數**：`temperature: 0.1`（極低溫維持固定語法結構）。
  * **輸出 JSON Schema**：
    ```typescript
    interface ParsedCommand {
      intent: 'START_TIMER' | 'STOP_TIMER' | 'CREATE_TASK' | 'GTD_INBOX_TRIAGE' | 'DISPATCH_SOCIAL' | 'UNKNOWN';
      actions: Array<{ type: string; params: Record<string, any> }>;
      confidence: number;
    }
    ```
  * **降級機制**：若 Nano 無法識別意圖，回傳 `UNKNOWN` 並保留原始文字傳送給一般搜尋或 GTD 收件匣。

---

### 模組 2：社群分發與調音模組 (`chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/`)

#### 3. `SocialDispatcher.tsx`
* **原始需求**：
  * 解決在 `pulse.html` 或各研報頁面需要手動反覆複製貼上、在 X 與 Threads 之間切換視窗的繁瑣痛點。
* **開發目標**：
  * 打造內嵌於 ScrumClock 側邊欄（Side Panel）的雙欄 Human-in-the-Loop (HITL) 審核與直發介面。
* **技術規格**：
  * **狀態指示燈**：即時顯示 Nano 就緒狀態（🟢 `readily` / 🟡 `after-download` / 🔴 `unsupported`）與下載進度條。
  * **一鍵採集按鈕**：向 Content Script 發送 `GET_ACTIVE_PULSE_ITEM`，取得標題、正文與 URL。
  * **雙欄編輯視窗**：
    * **左/上**：X (Twitter) 英文文字框，帶即時字數計數器（超過 280 字標紅警告）。
    * **右/下**：Threads 繁體中文文字框，自動去除贅字並提供段落換行排版。
  * **發布動作控制**：
    * 支援「一鍵帶入 Web Intent」（免 API Key 模式）。
    * 支援「呼叫本地 Python 直發」（全自動模式）。

#### 4. `toneShifter.ts`
* **原始需求**：
  * 產出的社群文案往往太生硬、超過字數限制，或夾帶非台灣在地的行銷用語。
* **開發目標**：
  * 提供 4 個專屬 Nano 算子，在側邊欄對草稿進行秒級局部調整。
* **技術規格**：
  * **`sharpen(text)`（觀點銳化）**：刪除被動語態，直接把最強烈的反常識結論或數據移至首句。
  * **`fit280(text)`（字數壓線）**：嚴格在 240~270 字元內重新壓縮英文，且 100% 保留原始數字與 URL。
  * **`dejargon(text)`（在地去油）**：消除「賦能、閉環、抓手」等簡中用語，轉化為台灣在地科技與創投口語。
  * **`splitThread(text)`（連鎖推文）**：將超過 280 字的長文切割為標註 `1/N`、`2/N` 的緊湊 Thread。

#### 5. `types.ts` & `index.ts`
* **原始需求**：
  * 遵循 Chrome Plus 專案的垂直切片架構（Vertical Slice Architecture）與門面匯出規範（Barrel Export）。
* **技術規格**：
  * 定義 `SocialPostDraft`、`ToneShiftMode`、`DispatchPayload` 等型別。
  * `index.ts` 僅對外暴露 `SocialDispatcher` 主元件與核心呼叫介面，嚴禁外部跨層引入私有實作。

---

### 模組 3：頁面內容爬取與解析 (`chrome_scrumclock/src/content/`)

#### 6. `pulseExtractor.ts`
* **原始需求**：
  * `pulse.html` 包含大量的卡片式快訊，需要精準提取目前聚焦或最新的卡片內容，且不可抓入導航與頁尾。
* **開發目標**：
  * 作為 Content Script 注入至 `masonyang-blog.github.io`，精確鎖定快訊 DOM 結構。
* **技術規格**：
  * **DOM 選擇器清單**：優先偵測 `.pulse-card`、`.pulse-item`、`article`，若無則降級選取 `main`。
  * **文字切片**：強制對正文執行 `content.slice(0, 1500).trim()`，避免輸入超過 Nano 的 Context Window 上限。
  * **跨腳本通訊**：監聽 `chrome.runtime.onMessage` 的 `GET_ACTIVE_PULSE_ITEM` 請求，並回傳結構化資料：
    ```json
    {
      "title": "Coinbase 2026 估值重估",
      "summary": "100% 短債吸水海綿與即時滴灌機制...",
      "url": "https://masonyang-blog.github.io/news/..."
    }
    ```

---

### 模組 4：本地 Python 執行微服務 (`0.doc_mg/tools/`)

#### 7. `main_dispatcher.py`
* **原始需求**：
  * 瀏覽器沙盒內的 Nano 無法讀寫本機硬碟與執行系統指令，需要一條低延遲的通道與本機環境溝通。
* **開發目標**：
  * 基於 FastAPI / Uvicorn 打造常駐於 `127.0.0.1:8765` 的本地輕量工具調度中樞。
* **技術規格**：
  * **CORS 配置**：允許 `chrome-extension://*` 跨域請求。
  * **路由端點**：`POST /exec`，接收 `{ "tool_name": string, "payload": dict }`。
  * **工具分發表**：
    * `append_rss` $\rightarrow$ 派發給 `rss_generator.py`
    * `check_dedup` $\rightarrow$ 派發給 `local_dedup.py`
    * `publish_x` / `publish_threads` $\rightarrow$ 派發給 `social_publisher.py`
    * `save_markdown` $\rightarrow$ 派發給 `markdown_archiver.py`

#### 8. `rss_generator.py`
* **原始需求**：
  * 部落格發布新觀點後，手動編輯 `feed.xml` 格式容易出錯且重複勞動。
* **開發目標**：
  * 接收 Nano 產出的標準結構，自動增修部落格根目錄的靜態 RSS 檔案。
* **技術規格**：
  * 使用 Python 內建 `xml.etree.ElementTree`。
  * 若 `dist/feed.xml` 不存在則自動建立標準 RSS 2.0 框架。
  * 新項目插入於最頂部（保持最新排序），並自動將舊項目修剪限制在最新 30 則以內。
  * 時間格式採用標準 RFC-822（`datetime.utcnow().strftime(...)`）。

#### 9. `local_dedup.py`
* **原始需求**：
  * 高頻發布社群貼文時，容易在數天內重複聊類似觀點或使用雷同開頭。
* **開發目標**：
  * 本地端零成本文字相似度防重比對，發布前即時紅字預警。
* **技術規格**：
  * 讀取本機 `data/social_history.json`（保留近 50 篇發文紀錄）。
  * 算法：使用 Python `difflib.SequenceMatcher` 計算文字重合度（或 TF-IDF Cosine Similarity）。
  * 門檻：當相似度 $\ge 0.65$ 時判定為重複，回傳匹配到的歷史片段供前端側欄告警。

#### 10. `social_publisher.py`
* **原始需求**：
  * 擺脫手動點擊網頁發布，實現側邊欄點擊按鈕後的背景 API 直發。
* **開發目標**：
  * 處理帶有簽名機制的 X API v2 與 Meta Threads Graph API 發布管線。
* **技術規格**：
  * **憑證管理**：自本機 `.env` 檔案載入 `TWITTER_BEARER_TOKEN` 與 `THREADS_ACCESS_TOKEN`。
  * **Dry-Run 模式**：若未配置 Token，自動降級為 Dry-run 模擬回傳，不拋出崩潰。
  * **Threads 兩階段發布**：嚴格依循 Meta 官方規範（1. 建立 Media Container $\rightarrow$ 2. 發布 Container 並取得 Post ID）。

#### 11. `markdown_archiver.py`
* **原始需求**：
  * 網頁收集到的精華需要手動複製貼上才能存入個人 Obsidian 筆記庫。
* **開發目標**：
  * 接收 Nano 產出的 YAML Frontmatter 與正文，直接落地為本機硬碟的 `.md` 檔案。
* **技術規格**：
  * 接收參數：`title`, `url`, `tags`, `content`。
  * 自動生成標準 Frontmatter（包含建立日期、來源連結與標籤陣列）。
  * 寫入指定目錄（例如：`~/Documents/Obsidian/Vault/Clippings/`），檔名自動替換非法字元。

---

## 三、 開發順序與依賴推進矩陣

```
[Phase 1: 基礎通道與 AI 服務]
  ├─ 1. nanoService.ts (Chrome 側邊欄 AI 基礎設施)
  └─ 2. main_dispatcher.py (本地 Python 輕量服務)
           │
           ▼
[Phase 2: 核心功能落地 - 社群與 RSS 閉環]
  ├─ 3. pulseExtractor.ts (網頁卡片資料抓取)
  ├─ 4. SocialDispatcher.tsx + toneShifter.ts (側欄 UI 與文案打磨)
  ├─ 5. rss_generator.py (RSS 自動維護)
  └─ 6. local_dedup.py (歷史防重)
           │
           ▼
[Phase 3: 系統級指令與 API 直發]
  ├─ 7. social_publisher.py (X & Threads 官方直發)
  └─ 8. nanoIntentRouter.ts (Cmd+K 自然語言萬能路由器)
```

這份清單明確拆解了「前端大腦」與「後端肌肉」的每一份代碼職責與介面規格。