# Scrumclock 瑞士刀未來藍圖：體驗優先與免權限的 AI 整合功能提案 (RFC)

為貫徹 **「技術極簡、隱私安全、無敏感權限」** 且 **「對高效工作者最直覺好用」** 的原則，我們為 Scrumclock 規劃了以下 4 大極簡但具備強大生產力提升效果的整合附加功能。這些功能均不需要申請 Chrome 敏感的主機權限 (Host Permissions)，且能在 Client 端完美運行。

---

## 💡 提案一：智慧文獻與靈感收集箱 (Smart Scratchpad)

### 1. 痛點與背景 (Problem & Context)
Max 在網路查閱文獻、撰寫規劃書或閱讀 API 文件時，靈感與碎料資料極其零散。若要跨網頁收集，必須頻繁地在不同的視窗間複製貼上。這不僅會洗掉原本剪貼簿中的 Google Docs 內容，更會不斷地打斷寫作心流 (Flow)。

### 2. 使用者體驗流程 (User Flow)
1.  使用者在瀏覽任意網頁（如技術部落格、Jira 任務頁或 API 說明書）時，直接選取一段有價值的文字，點擊右鍵。
2.  在瀏覽器右鍵選單中，點選 **「📥 收集至 Scrumclock 暫存區」** (或按下快捷鍵 `Alt + Shift + A`)。
3.  該段文字會以 Markdown 的 `> 引用` 格式，安靜地自動追加到擴充功能右側側邊欄的 **「臨時靈感草稿區 (Scratchpad)」**，完全不佔用或修改系統剪貼簿。
4.  當使用者回到寫作主畫面，開啟 AI 側邊欄即可直接看到剛才收集的所有碎料，並能一鍵命令 Gemini：「*幫我將這些收集到的草稿素材，融合成一篇 200 字的工作規格書大綱*」。

### 3. 技術架構與實現 (Technical Architecture)
*   在 `background.ts` 中註冊 `chrome.contextMenus` 監聽器。
*   當觸發點擊事件時，透過 `info.selectionText` 獲取選取文字，並附加當前頁面的 URL 作為文獻來源標記。
*   將內容寫入並追加至本地 `chrome.storage.local` 中的 `scratchpadText` 欄位。
*   前端 `AISidebar` 透過 `chrome.storage.onChanged` 實時監聽該欄位，自動渲染出 Markdown 區塊。

### 4. 權限安全與隱私防護評估 (Permissions & Security Assessment)
*   **權限需求**：僅需 `contextMenus` 權限（此權限屬於 Chrome Web Store 非敏感權限，審查秒過）。
*   **安全性**：所有的資料追加與儲存行為完全在 Client 端的 Chrome Storage 中進行，不涉及任何外部伺服器的同步，保證極致的隱私防護。

---

## 💡 提案二：一鍵網頁內容注入與總結 (Web Context Summarizer)

### 1. 痛點與背景 (Problem & Context)
當使用者要求 AI 幫忙撰寫代碼、修改文章、或總結某個 GitHub PR/Issue 時，必須人工將整個網頁的內容全選、複製，然後拉到側邊欄貼給 AI。此流程繁雜，且容易因為網頁結構紊亂而拷貝到多餘的廣告與導覽列。

### 2. 使用者體驗流程 (User Flow)
1.  使用者在瀏覽任意網頁（如：GitHub Pull Request 頁面、Stack Overflow 解決方案或 API 文件）時，展開右側 AI 側邊欄。
2.  側邊欄輸入框上方會顯示一個 **「📥 載入當前網頁內容」** 的膠囊按鈕。
3.  點選該按鈕後，側邊欄會自動抓取當前網頁的標題與主要文字，將其包裹成 Prompt 的背景 Context 存於輸入框上方（例如顯示 `已載入當前網頁 (約 1,200 字)`）。
4.  使用者可以直接在對話框中輸入簡短提問，例如：「*這個 PR 的核心改動是什麼？*」或「*幫我用這個 API 寫一段 TS 的實作範例*」。

### 3. 技術架構與實現 (Technical Architecture)
*   利用 `chrome.tabs.query` 取得當前活動分頁 (Active Tab) 的 `tabId`。
*   調用 `chrome.scripting.executeScript` 向該頁面動態注入一段輕量級的 content script，讀取 `document.body.innerText`。
*   在前端進行文字過濾與截斷（限制前 3,000 字），防止長文耗盡 Gemini 的 Token，隨後將過濾後的乾淨 Text 作為 System Instruction 的 Context 傳送至 Gemini API。

### 4. 權限安全與隱私防護評估 (Permissions & Security Assessment)
*   **權限需求**：僅需 `tabs` 與 `scripting` 權限。此兩者已在 Scrumclock 現有的 `manifest.json` 中配置，**無須新增任何額外權限**，可直接複用。
*   **安全性**：Content Script 僅在使用者主動點擊按鈕時觸發一次性的文字讀取，並不在背景持續監控網頁。這遵循了「最小權限原則」，極大化確保使用者的網頁瀏覽安全。

---

## 💡 提案三：會議語音結論聽寫與 AI 派發 (Voice Meeting Extractor)

### 1. 痛點與背景 (Problem & Context)
在參加線上會議、聽取線上影片或與團隊進行腦力激盪時，Max 需要手忙腳亂地打字記錄結論與待辦事項 (TODO)，這極易讓人分心並遺漏關鍵細節。

### 2. 使用者體驗流程 (User Flow)
1.  側邊欄控制面板提供一個 **「🎙️ 語音結論聽寫」** 按鈕。
2.  會議開始時點擊啟動，側邊欄會即時調用瀏覽器語音辨識，將麥克風接收到的聲音轉為繁體中文文本。
3.  會議結束時點擊結束，Gemini 1.5 Flash 會自動對此長篇口語逐字稿進行萃取與精煉，生成：
    *   會議核心結論摘要。
    *   **Action Items (具體行動清單)**。
4.  每條行動方案旁會出現一個 **`[➕ 匯入 Tasks]`** 的圖示，點擊後即可透過 `ITaskAdapter` 自動寫入 Google Tasks 或 Notion，完成生產力閉環。

### 3. 技術架構與實現 (Technical Architecture)
*   直接調用 Chrome 內建且免費的 **Web Speech API (SpeechRecognition)**。
*   在 Client 端完成實時的語音轉文字 (Speech-to-Text)，無需依賴 Google Cloud Speech-to-Text 或 Open AI Whisper 等付費且需金鑰的第三方 API。
*   轉換後的文字陣列傳送給 `geminiService`，使用結構化 Prompt 提取 Action Items 並渲染為可交互列表。

### 4. 權限安全與隱私防護評估 (Permissions & Security Assessment)
*   **權限需求**：需要取得瀏覽器的麥克風存取權限。
*   **安全性**：
    *   擴充功能不需要在 `manifest.json` 中聲明敏感的主機權限，僅在前端透過標準的 `navigator.mediaDevices.getUserMedia` 請求授權。
    *   Chrome 的 Web Speech API 在本地端或由瀏覽器內核處理，資料傳輸具有強大的沙箱隔離保護，確保會議機密性。

---

## 💡 提案四：AI 工作日報與週報自動生成器 (Focus Journey Reporter)

### 1. 痛點與背景 (Problem & Context)
高效工作者在一天的衝刺結束後，往往會忘記自己具體把時間花在了哪些任務上。為了向主管或團隊匯報，必須花費 15 - 30 分鐘去翻找 Commit 紀錄、日曆與筆記，重新拼湊日報或週報。

### 2. 使用者體驗流程 (User Flow)
1.  在數據統計 (Analytics) 面板的上方，新增一個 **「🤖 生成工作日報」** 的按鈕。
2.  點擊後，AI 會自動讀取並關聯今日的：
    *   已完成的番茄鐘衝刺任務名稱與時長。
    *   預定時段與實質耗時的比對 (`committedTime` vs `actualTime`)。
    *   每個番茄鐘結束時，使用者隨手記錄的 **「成果反思 (Logging Result)」** 與臨時筆記。
3.  自動產出一份格式精美、排版專業的 Markdown 格式 **「今日個人生產力成果日報」**（包含高光產出、時間花費比例、阻礙排查與明日規劃），並提供 `[一鍵複製]` 按鈕，方便快速貼至 Slack、Teams 或 Notion 週報頁面。

### 3. 技術架構與實現 (Technical Architecture)
*   從本地 `chrome.storage.local` 中序列化讀取今日的 `dailyLogs` 陣列（包含當日所有 `sprintLogs` 與 `coreBattles` 狀態）。
*   將該 JSON 數據與專門設計的「日報範本 Prompt」融合，發送給本地 API 的 `geminiService` 進行內容生成。
*   前端使用輕量級的 Markdown 渲染器將結果輸出至 UI，並調用 `navigator.clipboard.writeText` 實現一鍵複製。

### 4. 權限安全與隱私防護評估 (Permissions & Security Assessment)
*   **權限需求**：**無任何新增權限**。
*   **安全性**：所有數據皆讀取自本地已有的 `chrome.storage` 記錄，不呼叫任何瀏覽器敏感 API，隱私安全性為最高級別。
