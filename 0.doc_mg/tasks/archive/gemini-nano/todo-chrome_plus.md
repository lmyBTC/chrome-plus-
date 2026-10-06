# 🌐 Chrome Plus - Pulse 社群分發整合規格書 (Social Dispatch Integration Spec)

> **目標**：在 `masonyang-blog.github.io/pulse.html` 或各研報頁面，利用 Chrome Plus 擴充功能中台，一鍵擷取卡片內容、生成 X (Twitter 英文) 與 Threads (繁體中文) 文案，並提供半自動（HITL）校對與一鍵直發。
> **適用架構**：Chrome Extension Manifest V3 / React + TypeScript (`chrome_scrumclock`)

---

## 一、 整合載體選型：為何選 ScrumClock Side Panel？

依據 `README.md` 的專案規範，**`chrome_scrumclock` 本身即是整個工作區的整合中樞 (Hub ID: `ahiihabnbjeoeneahcgbdcofncjoclcp`)**，且具備：
1. **Side Panel（常駐側邊欄）**：在瀏覽 `pulse.html` 時不干擾操作，保持視窗分割。
2. **內建雙軌 AI 引擎**：原生支援本地 `Chrome Gemini Nano` 與雲端 `Gemini API Key` 降級備援，**免額外配置後端伺服器**。
3. **現成工具箱擴充點**：在 `Toolbox Hub` 中原本就具備圖片擷取、字幕收集器，新增一個「📢 社群分發器 (Social Dispatcher)」子模組最符合架構原則。

---

## 二、 運作時序與流程 (Sequence Diagram)

```
[使用者瀏覽 pulse.html]
         │
         ▼ 點擊某則 Pulse 卡片上的「📢 轉發社群」按鈕 (或在側邊欄點「捕捉當前 Pulse」)
┌────────────────────────────────────────────────────────┐
│ 1. Content Script (pulse.html)                         │
│    - 提取標題、核心觀點 (Direct Answer)、數據與原文連結 │
└───────────────────────┬────────────────────────────────┘
                        │ chrome.runtime.sendMessage
                        ▼
┌────────────────────────────────────────────────────────┐
│ 2. ScrumClock 核心中樞 (Side Panel / AI 引擎)          │
│    - 載入 Prompt: blog-to-social-posts                 │
│    - 呼叫本地 Gemini Nano 或 Gemini API                │
│    - 輸出 JSON: { x_en: "...", threads_zh: "..." }     │
└───────────────────────┬────────────────────────────────┘
                        │ 雙欄渲染呈現
                        ▼
┌────────────────────────────────────────────────────────┐
│ 3. 側邊欄 HITL 審核介面 (Human-in-the-Loop)            │
│    - X (英文)：顯示字數計數器、Thread 切割預覽         │
│    - Threads (中文)：排版優化、在地口語校對            │
└───────────────┬───────────────────────┬────────────────┘
                │                       │
                ▼ [發布至 X]            ▼ [發布至 Threads]
┌─────────────────────────┐   ┌───────────────────────────┐
│ 透過 Web Intent 另開預填  │   │ 複製至剪貼簿 / 自動聚焦開啟  │
│ https://x.com/intent/   │   │ https://www.threads.net/  │
│ tweet?text=...          │   │ compose (或走 n8n Webhook)│
└─────────────────────────┘   └───────────────────────────┘
```

---

## 三、 跨插件/跨腳本通信契約擴充 (Contract Spec)

在 `0.doc_mg/docs/cross_plugin_contract.md` 擴充全新 Action：`DISPATCH_SOCIAL_POST`

```typescript
// 訊息通訊格式
interface DispatchSocialPostPayload {
  action: "DISPATCH_SOCIAL_POST";
  source: "pulse_page" | "manual_clip";
  data: {
    id?: string;
    title: string;
    summary: string;
    url: string;
    metrics?: Record<string, string | number>;
    tags?: string[];
  };
}
```

---

## 四、 具體實作 4 個步驟

### 步驟 1：建立 `pulse.html` 專屬的 Content Script 偵測器

在 `chrome_scrumclock/src/content/` (或原生 content script) 加入對 `masonyang-blog.github.io` 的監聽：

```javascript
// content_pulse.js
(() => {
  // 監聽來自 SidePanel 的擷取請求
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_ACTIVE_PULSE_ITEM") {
      // 依據 pulse.html 的 DOM 結構提取目前聚焦的卡片或最新卡片
      const latestCard = document.querySelector('.pulse-card, article') || document.body;
      const title = latestCard.querySelector('h1, h2, .card-title')?.innerText || document.title;
      const content = latestCard.querySelector('.card-content, .markdown-body, p')?.innerText || "";
      const permalink = window.location.href;

      sendResponse({
        success: true,
        data: {
          title: title.trim(),
          summary: content.slice(0, 1500).trim(),
          url: permalink
        }
      });
    }
    return true;
  });
})();
```

### 步驟 2：在 Side Panel 注入 System Prompt 轉譯管線

在調用 `aiEngine.generate()`（Gemini Nano 或 API）時，注入專屬的 Persona 規則：

```typescript
// socialPromptTemplate.ts
export const buildSocialPrompt = (title: string, summary: string, url: string) => `
You are a senior tech & quant researcher and social media strategist.
Analyze the following blog update/pulse:

Title: ${title}
Content: ${summary}
URL: ${url}

Generate platform-tailored posts strictly adhering to these rules:
1. X (Twitter) - English:
   - Sharp, analytical, high signal-to-noise ratio.
   - Core mechanism, surprising data point, or thesis upfront.
   - 3-5 concise bullets. Include the URL at the end.
2. Threads - 繁體中文 (Taiwanese authentic phrasing):
   - Conversational, reflective, no marketing hype.
   - Break down complex concepts into engaging narrative paragraphs.
   - End with a thought-provoking open question for community discussion. Include URL.

Output MUST be valid JSON only:
{
  "x_en": "...",
  "threads_zh": "..."
}
`;
```

### 步驟 3：在 ScrumClock 側邊欄建立「📢 社群分發」React 元件

在 `chrome_scrumclock/src/sidepanel/components/Toolbox/` 建立 `SocialDispatcher.tsx`：

* **UI 設計**：
  * **頂部按鈕**：`[擷取當前頁面 Pulse]`（自動打向 Content Script 取得內容並觸發 AI）。
  * **雙欄 Tab / 卡片**：
    * **X (Twitter)**：文字框（可直接編輯）+ 字數即時計算器。
    * **Threads**：繁體中文文字框（可直接編輯）+ 行數預覽。
  * **底部發布控制**：
    * `發布到 X`：觸發 `window.open('https://x.com/intent/tweet?text=' + encodeURIComponent(xText))`
    * `發布到 Threads`：一鍵複製並開啟 `https://www.threads.net/`，或打向本機 n8n Webhook。

### 步驟 4：Manifest 權限校驗與審計

確保 `chrome_scrumclock/manifest.json` 符合以下配置：

```json
{
  "host_permissions": [
    "https://masonyang-blog.github.io/*",
    "https://api.twitter.com/*",
    "https://graph.threads.net/*"
  ]
}
```
執行合規審計腳本確保無違規：
```bash
py 0.doc_mg/tools/audit_manifests.py
```

---

## 五、 立即可進行的第一步 (Action Items)

1. **確認 `pulse.html` 的 DOM 標籤**：打開瀏覽器開發者工具，確認該頁面每則快訊卡片的 CSS class 名稱（如 `.pulse-item`、`article`）。
2. **在 `chrome_scrumclock` 側邊欄工具箱註冊新 Tab**：仿照 `SubtitleCollector.tsx` 的架構，新增一個極簡的 `SocialDispatcher.tsx`。
3. **測試本機 Gemini Nano**：在側邊欄直接貼上剛剛那篇 Coinbase 文章的短摘，測試在瀏覽器本地 0 延遲生成雙語文案的流暢度。