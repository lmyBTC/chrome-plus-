# Chrome Plus - Google 官方 Gemini 側欄雙向橋接技術規格書 (Official Side Panel Bridge SSOT)

> **版本**：v2.4.0 (Bi-directional Live Sync Release)  
> **更新日期**：2026-10-30  
> **狀態**：正式架構規格確立 (SSOT)  
> **關聯插件**：`chrome_pk` (ScrumClock 中樞), `chrome_gemini_nano`, `0.doc_mg`  
> **對齊文件**：Google Support 官方文件《使用 Chrome 內建 Gemini (16283624)》  
> **基礎協議**：`0.doc_mg/docs/spec-cross-plugin-contract.md` (v2.4)

---

## 1. 核心需求背景與業務場景 (Problem Statement)

使用者在瀏覽器作業日常中面臨雙重工具割裂的痛點：
1. **官方原生優勢**：Google Chrome 官方內建 Gemini 側欄擁有極強的原生整合能力（包括原生 `@分頁` 多標籤感知、Flash-Lite / Pro 多模型切換、原生音訊影音解讀）。
2. **插件生態優勢**：`chrome-plus-` 的 `PK+ / ScrumClock` 具備極簡 GTD 看板、敏捷番茄鐘、投研估值沙盒、本機邊緣推論與 Python `:8765` 後端肌肉。

**本次需求核心目標**：
- **官方流入插件 (Ingress)**：即時監聽並提取官方側欄的問答流（Prompt、回答、參考分頁），自動同步流入 PK+ 側欄助理，支援一鍵將對話轉換為「今日戰役 (Daily Mission)」或 GTD 待辦任務。
- **插件回拋官方 (Egress)**：在 PK+ 討論完畢、估值完成或整理出研報精華後，可一鍵回填至官方側欄輸入框並模擬 Enter 自動發送，由官方 Gemini 接續執行多步操作或長文本處理。

---

## 2. 雙向同步拓撲架構 (System Topology)

```
┌─────────────────────────────────────────┐               ┌─────────────────────────────────────────┐
│        Google 官方 Gemini 側邊欄         │               │         Chrome Plus (PK+ 側邊欄)        │
│       (WebUI / gemini.google.com)       │               │        (chrome_pk / ScrumClock)         │
└────────────────────┬────────────────────┘               └────────────────────▲────────────────────┘
                     │                                                         │
      [1] 監聽輸出   │                                                         │ [2] 對話同步與任務沉澱
  (MutationObserver) │                                                         │ (OfficialGeminiConnector)
                     ▼                                                         │
         ┌──────────────────────┐                           ┌──────────────────┴──────────────────┐
         │ geminiOfficialBridge │ ── [GEMINI_OFFICIAL_SYNC] ──► │ PK+ Runtime ServiceWorker / Sidebar │
         │   (Content Script)   │ ◄─ [INJECT_TO_OFFICIAL] ──── │ (展示於歷史官方對話 / 一鍵匯入任務)    │
         └──────────────────────┘                           └─────────────────────────────────────┘
                     ▲                                                         │
                     │                 [3] 成果回拋與指令發送                  │
                     └─────────────────────────────────────────────────────────┘
                                     (模擬 Input & Enter 發送)
```

---

## 3. 雙向通訊契約規範 (Protocol Specification v2.4)

擴充 `spec-cross-plugin-contract.md` 定義，新增以下純資料契約：

### 3.1 官方對話同步協議 (`GEMINI_OFFICIAL_SYNC`)
- **發送端**：`geminiOfficialBridge.ts` / `geminiOfficialBridge.iife.js` (官方側欄注入端，`chrome_gemini_nano`)
- **接收端**：`chrome_pk` (`OfficialGeminiConnector.ts` / `background.ts`)
- **傳輸管道**：`chrome.runtime.sendMessage` 直連至 PK+ 恆定 Extension ID (`ahiihabnbjeoeneahcgbdcofncjoclcp`)
- **JSON 結構**：
```json
{
  "protocolVersion": 2,
  "type": "GEMINI_OFFICIAL_SYNC",
  "payload": {
    "sessionId": "gemini-session-1730260000",
    "role": "user | model",
    "text": "請幫我分析台積電最新一季法說會的核心財務指引...",
    "modelName": "Flash-Lite",
    "source": "OFFICIAL_GEMINI_SIDEPANEL",
    "referencedTabs": [
      { "title": "TSMC 2026Q3 財務報表", "url": "https://..." }
    ],
    "timestamp": 1730260005000
  }
}
```
- **接收端容錯機制**：
  - 遵守「寬容讀者模式 (Tolerant Reader)」：若缺少 `referencedTabs` 欄位或型別不符，自動降級為空陣列，不得拋出例外中斷 PK+ UI。
  - 防腐去重：接收端維護 SHA-1 `lastSyncedHash`（結合前 200 字比對），短時間內重複文字直接過濾，杜絕串流中重複寫入。

### 3.2 插件回拋官方協議 (`INJECT_TO_OFFICIAL_GEMINI`)
- **發送端**：`chrome_pk` (助理介面或投研沙盒)
- **接收端**：`geminiOfficialBridge.ts` (Content Script)
- **JSON 結構**：
```json
{
  "protocolVersion": 2,
  "type": "INJECT_TO_OFFICIAL_GEMINI",
  "payload": {
    "text": "【PK+ 估值結論】NVDA 潛在空間 +16.7%，WACC 設為 9.2%。請以此為依據撰寫 500 字法人評析報告。",
    "autoSubmit": true,
    "contextSource": "FINANCE_CLIPPER",
    "timestamp": 1730260020000
  }
}
```
- **響應回執**：
```json
{
  "success": true,
  "ack": true,
  "injectedLength": 56,
  "submitted": true,
  "timestamp": 1730260020250
}
```

---

## 4. DOM 提取防抖與框架事件合成技術標準

### 4.1 官方串流輸出的防抖提取 (Stream Debounce)
官方側欄對話採用流式傳輸（Token by Token 輸出），若每產生一個字即發送通訊將造成效能災難：
1. **MutationObserver 範圍**：監聽 DOM `childList`、`subtree` 與 `characterData`。
2. **800ms 防抖守護**：最後一次 DOM 異動後靜默達 800ms，判定該輪回覆已生成完畢，此時才調用文字脫水函式並廣播。
3. **雜訊過濾**：自動剔除免責聲明節點（如「我們可能會查看...」）與操作按鈕（複製、分享按鈕等標籤文本）。

### 4.2 框架雙向綁定突破 (Synthetic Event Simulation)
現代 Web 框架（Angular / Lit / React）底層攔截了原生屬性 setter。直接賦值 `input.value = text` 會被虛擬 DOM 判定為無效輸入：
1. **元素型態探針**：
   - 若為 `contenteditable="true"`：寫入 `innerText`，並調用 `Selection` API 將光標移至末尾。
   - 若為 `HTMLTextAreaElement`：執行原生 Prototype Setter 注入：
     ```javascript
     const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
     nativeSetter.call(inputEl, text);
     ```
2. **事件派發序列 (Event Dispatch Sequence)**：
   依序派發 `focus` ➔ `input` (bubbles: true) ➔ `change` ➔ `blur`。
3. **安全延遲發送**：
   等待 150ms ~ 200ms 讓框架內部 State 更新就緒後，再觸發 `submitButton.click()` 或合成 `KeyboardEvent('Enter')`。

---

## 5. 跨環境安全邊界與三層降級矩陣

依據 Chromium 安全模型，對於不同載體型態實施階梯式降級：

```
                    ┌──────────────────────────────┐
                    │     觸發對話監聽 / 回拋請求   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                   ┌────────────────────────────────┐
                   │  層級 1：WebUI / 分頁注入探針  │
                   │ (gemini.google.com / 標籤頁)   │
                   └───────┬────────────────┬───────┘
                     成功  │                │ 失敗 (受限於 chrome-untrusted://)
                           ▼                ▼
                     ┌───────────┐   ┌────────────────────────────────┐
                     │ 正常雙向  │   │  層級 2：本機微服務橋接 (:8765) │
                     │ DOM 聯動  │   │ (透過 Python 轉發與本機資料庫) │
                     └───────────┘   └───────┬────────────────┬───────┘
                                       成功  │                │ 失敗 (本機服務未啟動)
                                             ▼                ▼
                                       ┌───────────┐   ┌────────────────────────────────┐
                                       │ 共享本機  │   │  層級 3：剪貼簿與通知兜底降級   │
                                       │ Session   │   │ (複製文字 + 引導手動貼上)      │
                                       └───────────┘   └────────────────────────────────┘
```

1. **第一層（標準 Web 注入）**：在使用者開啟的 `gemini.google.com` 頁面或 WebUI 側邊欄注入 Content Script 進行全自動 DOM 讀寫。
2. **第二層（本機微服務轉發）**：若使用者處於特權隔離的純原生側欄，透過本機 FastAPI `:8765` 微服務維護共用 Context，以 REST API 與雲端 Session 同步。
3. **第三層（兜底安全防線）**：通訊逾時（超過 4 秒）或無回應時，將欲回拋文字寫入系統剪貼簿（Clipboard），並透過 Chrome Notification 溫和提示使用者：「已將內容複製至剪貼簿，可直接在官方側欄按 Ctrl+V 貼上」。

---

## 6. 模組交付清單與驗證標準

| 檔案路徑 | 職責與改動 | 驗收標準 |
| :--- | :--- | :--- |
| `0.doc_mg/docs/spec-official-gemini-bridge.md` | 本文件，官方雙向橋接之全域 SSOT 規格 | 涵蓋流入、回拋、契約定義與 3 層降級 |
| `chrome_gemini_nano/src/geminiOfficialBridge.ts` | 官方側欄 Content Script 監聽與回拋注入核心 | 800ms 防抖成功、模擬發送事件正確觸發 |
| `chrome_pk/src/core/ai/OfficialGeminiConnector.ts` | PK+ 側中樞端接收、廣播與任務轉換服務 | 成功接收訊息、提供 `injectToOfficialGemini` 接口 |
| `0.doc_mg/docs/spec-cross-plugin-contract.md` | 追加 `GEMINI_OFFICIAL_SYNC` 與 `INJECT_TO_OFFICIAL_GEMINI` | 通過 `audit_suite.py` 契約審查 |

