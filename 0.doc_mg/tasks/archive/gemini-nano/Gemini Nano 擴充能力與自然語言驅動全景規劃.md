# 🧠 Gemini Nano 潛能全釋放：Chrome Plus 自然語言與一鍵自動化功能擴充規劃

> **定位**：為 `chrome_scrumclock` 與整體 Chrome Plus 生態系規劃一套以「本地 Gemini Nano (Prompt API)」為大腦的自然語言萬能路由器、跨插件智能助理與一鍵工作流擴充藍圖。
> **核心優勢**：0 API 成本、0 網路延遲、100% 本地隱私、斷網可用、無 Rate Limit 壓力。

---

## 一、 核心設計原則：Edge Copilot 的最佳生態位

在擴充功能中調用 Gemini Nano，應發揮其**「本地即時性、無感輕量、多模態微決策」**的強項，避免讓它負擔過長的長篇寫作。將 Nano 定位為四種角色：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Gemini Nano 邊緣四大角色                        │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. 意圖路由大腦   │ 2. 跨插件膠水     │ 3. 內容打磨獵犬  │ 4. 本地系統指揮官 │
│ (Natural Intent)  │ (Glue Agent)      │ (Text Refiner)   │ (System Driver)  │
│ 一句話拆解分發     │ 自動串接 4 大插件 │ 去油、銳化、防重 │ 驅動 Python / GAS│
└───────────────────┴───────────────────┴──────────────────┴──────────────────┘
```

---

## 二、 5 大高價值擴充功能規劃與落地場景

### 1. 全域命令列 (Command Palette `Cmd+K`) 自然語言萬能路由器

* **痛點**：目前命令列需記憶固定語法（如 `> sprint 25`、`> block [url]`），跨模組操作需要手動切換不同介面。
* **Nano 解決方案**：在 `Cmd+K` 輸入任意口語，Nano 在 150ms 內完成意圖分類與參數抽取，直接呼叫對應 Chrome API 或內部 Store。
* **自然語言輸入範例**：
  * *「幫我開個 40 分鐘的深度專注，把 YouTube 跟 Twitter 擋掉」*
    $\rightarrow$ 輸出：`{ action: "START_POMODORO", minutes: 40, dnr_block: true }`
  * *「把這頁 Google Finance 股票存入自選，排定明天早上的研報精讀」*
    $\rightarrow$ 輸出：`{ action: "CLIP_STOCK_AND_SCHEDULE", target: "CURRENT_TAB", time: "tomorrow_morning" }`
  * *「把目前收件匣裡面超過 3 天的雜念全部移去 Someday」*
    $\rightarrow$ 輸出：`{ action: "GTD_TRIAGE_OLD_INBOX", threshold_days: 3, to_status: "someday" }`

---

### 2. 敏捷看板「一鍵收件匣智能釐清 (One-Click Inbox Clarifier)」

* **痛點**：透過 `Alt + Q` 快速捕捉（Omni-Capture）了大量未整理的文字碎片，收件匣（Inbox）堆積後容易產生整理疲勞。
* **Nano 解決方案**：在 Inbox 頂部提供按鈕 **「✨ Nano 一鍵釐清 (Inbox Zero)」**：
  * Nano 一次讀取所有狀態為 `inbox` 的未整理卡片。
  * 自動判斷**行動類型**：是「具體行動（Next Action）」、「大型專案（需拆解）」還是「遠期概念（Someday）」？
  * 自動估算 **番茄鐘預估數**（1🍅 / 2🍅 / 4🍅）並貼上標籤（`@Code`、`@Research`、`@Admin`）。
  * 轉換前後提供 Diff 視圖，一鍵 Confirm 即完成整個 Kanban 整理。

---

### 3. 研報與網頁「反常識洞察獵犬 (Insight & Thesis Hunter)」

* **痛點**：長達萬字的研究報告、SEC 10-K 財報或法說會逐字稿，核心洞察常被埋在大量公關話術與背景說明中。
* **Nano 解決方案**：側邊欄常駐按鈕 **「🎯 萃取核心反常識觀點 (Extract Thesis)」**：
  * Content Script 提取當前頁面核心段落（每批次約 2,000 字元）。
  * Nano 的專用 Prompt 專注於尋找：
    1. **與市場共識衝突的數據或趨勢**。
    2. **最致命的下檔風險因子（Downside Tail Risk）**。
    3. **經營層未明說的潛在瓶頸（Red Flags）**。
  * 生成 3 點極致信噪比的 High-Signal 摘要，自動附加到 FinanceClipper 或 ScrumClock 的研報筆記中。

---

### 4. 影音字幕「一鍵轉行動項目 (Video Subtitle $\rightarrow$ Actionable Tasks)」

* **痛點**：使用 `chrome_video speed plus` 在 YouTube 按 `Alt + S` 收集逐字稿字幕後，收集到的往往是鬆散的口語逐字稿，不具備可執行性。
* **Nano 解決方案**：在收集字幕的瞬間，Nano 在背景平行處理：
  * 將口語逐字稿（Transcript）轉換為 **3 條清晰的實作步驟（Checklist）**。
  * 自動辨識講者提到的工具或開源專案名稱，列為參考資源。
  * 直接以 `CREATE_TASK` 協定推送到 ScrumClock 的焦點任務池中。

---

### 5. 側邊欄「社群文案一鍵動態調音器 (Tone Shifter & Polisher)」

* **痛點**：生成的貼文有時太生硬，或在特定平台需要切換風格（例如嚴肅總經、輕鬆日常、犀利銳評）。
* **Nano 解決方案**：在 `SocialDispatcher` 輸入框下方提供 4 個極速調音按鈕：
  * 🪄 **「觀點銳化 (Sharpen)」**：刪除贅字、將被動語態改為主動、直接把最強結論移到第一句。
  * ✂️ **「字數壓線 (Fit 280)」**：精確縮減至 240~270 字元，保留原始數字與 URL。
  * 🇹🇼 **「在地去油 (De-jargon)」**：過濾簡中行銷話術（如「抓手、賦能、閉環」），轉換為台灣在地科技與創投圈口語。
  * 🧵 **「長文切 Thread (Split 1/N)」**：自動將長文切割成帶有編號的 3 則連鎖推文。

---

## 三、 自然語言命令解析器實作架構

以下為可直接整合至 `chrome_scrumclock/src/core/ai/` 的萬能意圖路由器實作：

```typescript:NanoIntentRouter:src/core/ai/nanoIntentRouter.ts
/**
 * NanoIntentRouter: 利用本地 Gemini Nano 進行自然語言意圖分類與參數解析
 */

export interface ParsedCommand {
  intent: 
    | 'START_TIMER'
    | 'STOP_TIMER'
    | 'CREATE_TASK'
    | 'GTD_INBOX_TRIAGE'
    | 'DISPATCH_SOCIAL'
    | 'RESEARCH_STOCK'
    | 'UNKNOWN';
  params: Record<string, any>;
  confidence: number;
}

export class NanoIntentRouter {
  private static instance: NanoIntentRouter;
  private session: any = null;

  private constructor() {}

  public static getInstance(): NanoIntentRouter {
    if (!NanoIntentRouter.instance) {
      NanoIntentRouter.instance = new NanoIntentRouter();
    }
    return NanoIntentRouter.instance;
  }

  private async getSession(): Promise<any> {
    if (this.session) return this.session;

    const aiCore = (self as any).ai?.languageModel || (window as any).ai?.languageModel;
    if (!aiCore) throw new Error('Gemini Nano 不可用');

    const systemPrompt = `
You are a precise command parser for the ScrumClock productivity extension.
Analyze user input and extract intent strictly into valid JSON matching this schema:
{
  "intent": "START_TIMER" | "STOP_TIMER" | "CREATE_TASK" | "GTD_INBOX_TRIAGE" | "DISPATCH_SOCIAL" | "RESEARCH_STOCK" | "UNKNOWN",
  "params": {
    "durationMinutes": number (optional),
    "taskTitle": string (optional),
    "stockTicker": string (optional),
    "blockDistraction": boolean (optional)
  }
}
Output raw JSON only.
`;

    this.session = await aiCore.create({
      systemPrompt,
      temperature: 0.1, // 極低溫維持結構輸出穩定
    });
    return this.session;
  }

  public async parseNaturalCommand(userInput: string): Promise<ParsedCommand> {
    try {
      const session = await this.getSession();
      const raw = await session.prompt(userInput);
      
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { intent: 'UNKNOWN', params: { raw: userInput }, confidence: 0 };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || 'UNKNOWN',
        params: parsed.params || {},
        confidence: 0.95,
      };
    } catch (e) {
      console.error('[NanoIntentRouter] 解析失敗:', e);
      return { intent: 'UNKNOWN', params: { error: (e as Error).message }, confidence: 0 };
    }
  }

  public destroy(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
```

---

## 四、 跨插件協同：自然語言調度流程

```
[使用者於任一分頁按下 Cmd+K 或在側邊欄輸入：]
"把這篇研報重點做成 X 貼文，並在日曆排定 25 分鐘覆盤"
                           │
                           ▼
             [NanoIntentRouter.parseNaturalCommand]
                           │
                           ▼
          {
            "intent": "COMPOSITE_WORKFLOW",
            "steps": [
              { "tool": "EXTRACT_AND_DISPATCH_SOCIAL" },
              { "tool": "START_TIMER", "minutes": 25 },
              { "tool": "SCHEDULE_CALENDAR", "title": "研報覆盤" }
            ]
          }
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
 [1. SocialDispatcher]              [2. ScrumClock Core]
 生成 X 英文草稿至側欄              啟動 25m 番茄鐘並建立日曆時間箱
```

---

## 五、 開發實作優先順序推薦 (Implementation Roadmap)

| 優先級 | 功能項目 | 價值點 | 預估工時 |
| :--- | :--- | :--- | :--- |
| **P0** | **社群文案一鍵調音器 (Tone Shifter)** | 增強既有 `SocialDispatcher`，秒級銳化與字數修剪 | 0.5 天 |
| **P1** | **自然語言意圖路由器 (`Cmd+K` 擴充)** | 擺脫死板語法，用一句話啟動番茄鐘與任務建立 | 1 天 |
| **P2** | **一鍵收件匣智能整理 (Inbox Zero)** | 大幅降低每日 GTD 整理阻力，自動標記番茄鐘數 | 1 天 |
| **P3** | **YouTube 字幕自動轉 Checklist** | 打通 VideoSpeed 與 ScrumClock 的智慧深層整合 | 1 天 |