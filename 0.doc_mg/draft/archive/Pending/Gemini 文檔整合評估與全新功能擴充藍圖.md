# 📑 Gemini 文檔整合評估與 Chrome Plus 核心功能擴充藍圖

> **專案儲存庫**：`https://github.com/lmyBTC/chrome-plus-`  
> **評估目標**：
> 1. `chrome_scrumclock/docs/gemini-nano-tool.md` 與 `gemini-content-spec.md` 的定位分析與整合必要性。
> 2. 跨端（本地端側 Nano vs. 雲端 Gemini Web App）協同架構設計。
> 3. 次世代高信噪比、低 Token 的功能擴充與整合方向推薦。

---

## 🧭 一、 兩份文檔是否需要整合？深度剖析與決策

### 1. 現狀兩檔的職責定位差異

| 檔案 | 核心領域 | 載體與技術棧 | 互動對象 |
| :--- | :--- | :--- | :--- |
| **`gemini-nano-tool.md`** | **本地端側 AI (Edge AI)** | Chrome 130+ Prompt API / Web AI 矩陣、TypeScript、本地微服務 | 側邊欄（SidePanel）、GTD 看板、本地 Python 工具 |
| **`gemini-content-spec.md`** | **外部雲端 Web 注入 (Cloud Web Injection)** | Content Script (`geminiContent.ts`)、DOM MutationObserver | 官方 `gemini.google.com` 網頁介面、懸浮 Widget、外部大模型 |

### 2. 評估結論：**「強烈建議整合，採雙軌架構（Dual-Track）規格書」**

* **痛點 1：文檔分散破壞 SSOT 原則**  
  目前核心架構文檔均收斂在 `0.doc_mg/docs/`，而 `chrome_scrumclock/docs/` 下殘留分散文檔，會導致開發者與 AI Agent（Cursor、Claude Code）在檢索時產生認知混淆與 Token 浪費。
* **痛點 2：割裂「本地小模型」與「雲端大模型」的協同潛力**  
  現有設計中，本地 Nano 與 Google Gemini 官方網頁是各自為政的兩套邏輯。實際上，**「本地端側負責極速過濾與結構化，雲端網頁負責萬字長文深度推演」**，兩者是互補共生的關係。
* **整合解法**：  
  將兩者合併並升格為 **`0.doc_mg/docs/gemini_dual_engine_integration_spec.md`（Gemini 雙軌智能生態規格書）**，將「端側 Nano 邊緣推論」與「Gemini 官方網頁注入橋接」統一於單一調度體系。

---

## 🧬 二、 雙軌架構整合方案 (Dual-Engine Architecture)

```
                            ┌──────────────────────────────────────────────┐
                            │      ScrumClock 智能中樞 (WebAIGateway)      │
                            └──────────────────────┬───────────────────────┘
                                                   │
                         ┌─────────────────────────┴─────────────────────────┐
                         ▼                                                   ▼
         ┌───────────────────────────────┐                   ┌───────────────────────────────┐
         │     軌道 A：本地端側 Nano     │                   │   軌道 B：雲端 Gemini 網頁    │
         │   (gemini-nano-tool.md)       │                   │   (gemini-content-spec.md)    │
         ├───────────────────────────────┤                   ├───────────────────────────────┤
         │ • 0 延遲、0 成本、100% 離線   │                   │ • 具備百萬級上下文 (Gemini Pro)│
         │ • 適合：卡片拆解、GTD 釐清、  │                   │ • 適合：整本財報、跨長文對比、│
         │   社群調音、指令萬能路由      │                   │   複雜代碼重構、投研深度問答  │
         └───────────────┬───────────────┘                   └───────────────┬───────────────┘
                         │                                                   │
                         └─────────────────────────┬─────────────────────────┘
                                                   ▼
                               ┌───────────────────────────────────────┐
                               │     雙向無感接力 (Hybrid Relay)       │
                               │ 超過 2000 字或 Nano 判定難度過高時，  │
                               │ 一鍵彈射（Eject）至背景分頁注入推論；  │
                               │ 雲端產出結論後自動回填看板卡片        │
                               └───────────────────────────────────────┘
```

---

## 🚀 三、 推薦整合與新開發功能 (Top 5 Roadmap)

結合目前專案架構（ScrumClock + FinanceClipper + VideoSpeed + ActivityMonitor），以下為五大最具價值的新功能擴充方案：

### 1. 雲端-端側雙向彈射橋接 (Cloud-Edge Hybrid Relay) ⭐⭐⭐⭐⭐
* **概念**：
  在側邊欄或看板遇到超長研報時，Nano 前哨判斷「Context 超限」或使用者點擊「🚀 雲端精析」，系統自動在背景開啟/聚焦 `gemini.google.com`。
* **實作流程**：
  1. Content Script (`geminiContent.ts`) 自動將當前研報文字與分析 Prompt 填入官方 Gemini 輸入框並自動送出。
  2. 監聽回覆完成事件（DOM Observer），萃取結構化結論。
  3. 透過 `chrome.runtime.sendMessage` 發送 `CREATE_TASK` 或回填卡片筆記，**完全免消耗付費 API Key**。

---

### 2. 網頁即時圈選 AI 標註懸浮膠囊 (In-Page Floating AI Pill) ⭐⭐⭐⭐⭐
* **概念**：
  使用者在任何網頁（Bloomberg、Yahoo Finance、GitHub、Medium）反白文字時，游標旁直接浮現極簡懸浮按鈕：
  - `[🍅 拆為任務]`：調用 `NanoPromptGuard` 產出 3 點 Checklist，直推今日看板。
  - `[💡 核心反常識]`：抽取論點與風險數據。
  - `[📢 轉發社群]`：開啟側邊欄 Social Dispatcher 帶入草稿。
* **價值**：徹底省去複製、開啟外掛、貼上的三步驟繁瑣動作。

---

### 3. 本機 MCP (Model Context Protocol) 服務端點 ⭐⭐⭐⭐
* **概念**：
  在現現有的 `0.doc_mg/tools/main_dispatcher.py` 擴充標準 **FastMCP** 協定端點。
* **價值**：
  讓外部主流 AI 開發環境（如 Claude Desktop、Cursor、Cline）直接具備呼叫 Chrome Plus 生態系的能力：
  - `mcp://scrumclock/get_today_tasks`（讀取今日進行中番茄鐘戰役）
  - `mcp://scrumclock/create_task`（AI 討論完自動在使用者瀏覽器開卡）
  - `mcp://repo_radar/search`（零 Token 查閱專案定義）

---

### 4. 本地守護進程與系統匣常駐 (Daemon & System Tray) ⭐⭐⭐⭐
* **概念**：
  目前 `main_dispatcher.py` 需在終端機手動啟動，關閉視窗後擴充功能會斷連。
* **實作方案**：
  - 撰寫 `0.doc_mg/tools/daemon_manager.py`（跨平台 Windows VBS/Startup、macOS Launchd）。
  - 在 Chrome 擴充功能側邊欄頂部加上 **本機微服務連線心跳燈號（🟢 Online / 🔴 Offline - 一鍵啟動）**。

---

### 5. 語音閃電捕捉與番茄語音陪伴 (Voice Sprint & Quick-Capture) ⭐⭐⭐
* **概念**：
  利用瀏覽器原生離線 `webkitSpeechRecognition`，支援按下快捷鍵（如 `Ctrl + Shift + V`）直接口述：
  - *「剛剛發現一個跨域通訊的 bug，預估花 1 個番茄鐘修復」*
* **價值**：Nano 150ms 內解析為 `@BugFix` 標籤與 1🍅 卡片推入收件匣，維持打字心流不中斷。

---

## 📋 四、 推薦推進步驟 (Action Plan)

1. **Step 1 (文檔整理)**：
   將 `chrome_scrumclock/docs/gemini-nano-tool.md` 與 `gemini-content-spec.md` 的技術細節提煉合併至 `0.doc_mg/docs/gemini_dual_engine_integration_spec.md`，並將舊檔標註為 Deprecated。
2. **Step 2 (實作雙軌橋接)**：
   擴充 `geminiContent.ts` 與 `webAIGateway.ts`，打通「本地 Nano $\rightarrow$ 雲端 Gemini Web UI」的無感轉移協定。
3. **Step 3 (落地懸浮膠囊)**：
   開發輕量級 Content Script，在全網頁提供圈選即拆解、圈選即入庫的沉浸體驗。