# 🍅 邊緣智慧賦能：Gemini Nano x ScrumClock 敏捷專案管理深度優化架構

> **核心定位**：打破傳統專案管理工具（Jira / Trello / Linear）「依賴手動維護、結構僵化、認知摩擦過重」的弊端，將 Chrome 內建之 **Gemini Nano (Web AI 矩陣)** 下沉為 `chrome_scrumclock` 專案管理看板（`ProjectManagementDemo.tsx` / `BoardView.tsx`）的**常駐背景副駕駛（Autonomous Co-Pilot）**。
> **設計原則**：零手動填表、零 API 帳單、100% 離線隱私、基於 GTD 與 WIP 限制的邊緣自主決策。

---

## 一、 現況痛點與 Gemini Nano 賦能定位

在知識工作者與研究員的日常專案流轉中，專案管理最常失敗的原因不是缺乏工具，而是**「維護工具的心智負擔過高」**：

```
┌────────────────────────────────────────────────────────────────────────┐
│                        專案管理三大核心損耗與 Nano 破局                │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. 碎片捕捉整理疲勞 │ 2. 任務顆粒度失衡 │ 3. 看板停滯與偽產能           │
│ (Triage Fatigue)  │ (Estimation Bias) │ (Kanban Rot & Fake Progress)   │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 痛點：Alt+Q 抓了 20 │ 痛點：目標太大拖延 │ 痛點：卡片丟在 In Progress 擺爛 │
│ 條靈感，收件匣堆積 │ (例: 寫量化回測)， │ 超過 3 天，WIP 限制淪為擺設。  │
│ 淪為數位垃圾場。   │ 不知如何切成 25m。│                                │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 💡 Nano 破局：     │ 💡 Nano 破局：     │ 💡 Nano 破局：                 │
│ 語意聚類自動分類   │ 專用 Writer 自動拆解│ 閒置狀態 (Idle API) 晨間巡檢   │
│ 標籤、狀態與優先級 │ 3-4 個明確 Checklist│ 「殭屍任務」自動降級或提醒     │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

## 二、 6 大核心場景優化藍圖 (Scenario Blueprints)

### 場景 1：收件匣「一鍵無感清空 (Zero-Friction Inbox Clarifier)」

* **現狀**：使用者按下 `Alt + Q` 從各網頁捕捉大量資訊，`inbox` 累積過多卡片後，使用者懶得逐張點開填寫情境標籤、預估番茄數。
* **Nano 落地作法**：
  * 在看板 `📥 收件匣` 頂部增設 **「✨ Nano 一鍵釐清 (Inbox Zero)」** 按鈕。
  * 呼叫 `WebAIGateway`，一次傳入所有未處理的 `inbox` 卡片標題與摘錄。
  * **Nano 結構化輸出**：
    1. **狀態判定**：是能立刻執行的行動 (`next-action`)、暫存想法 (`someday`)，還是過於龐大需拆解的大型任務？
    2. **情境標籤自動歸納**：根據文字內容自動貼上 `@Code`、`@Research`、`@Writing`、`@Admin`。
    3. **番茄鐘預估 (Estimate)**：評估複雜度，自動賦予 `1🍅` (25m)、`2🍅` (50m) 或 `4🍅`。
  * **HITL 預覽確認**：彈出 Diff 預覽對話框，使用者花 2 秒掃視按「全部套用」，瞬時完成 GTD 整理。

### 場景 2：宏觀任務「原子化敏捷拆解 (Atomic Task Decomposition)」

* **現狀**：使用者在週目標建立「重構 Chrome 擴充套件後端」或「撰寫美股降息研報」，因任務顆粒度太大，容易產生啟動阻力與拖延。
* **Nano 落地作法**：
  * 在任務卡片詳情抽屜（Task Detail Drawer）點擊 **「⚡ 拆解為番茄作戰計畫」**。
  * 調度 **`ai.writer`**（設定 `tone: 'formal'`, `format: 'markdown'`）：
    * 輸入抽象任務名稱與關聯網址上下文。
    * 嚴格規範輸出 3~5 項具備動詞開頭、能在 25 分鐘內落地的「原子步驟（Actionable Subtasks）」。
    * 每一子步驟自動標記預估番茄鐘（例：`[ ] 1. 梳理現有 API 端點清單 (1🍅)`、`[ ] 2. 實作 FastAPI 路由分發器 (2🍅)`）。
  * 點擊確認後，自動將 Checklist 寫入 `WeeklyMission.checklist`，並可將第一步直接推入今日焦點戰役。

### 場景 3：智慧 WIP 守護與「抗多工阻斷者 (Context-Switching Defender)」

* **現狀**：看板目前雖然有 WIP（在製品限制，預設 3 項）警告標籤，但無法阻止使用者主觀「偷渡」多個任務到 `In Progress`，導致注意力碎裂。
* **Nano 落地作法**：
  * 當使用者嘗試將第 4 張卡片拖入 `In Progress` 時，Nano 介入進行**語意阻斷對話**：
  * Nano 讀取目前正在進行的 3 張卡片以及新卡片：
    * *「你目前正在處理【Coinbase 研報精讀 (剩餘 2🍅)】，這張新任務【修改樣式 Bug】與當前心流領域完全衝突。建議將新任務暫存至 Next Actions，或先將進行中的任務歸檔至 Someday。是否確定切換？」*
  * 強制引導貫徹 **「Stop Starting, Start Finishing」**。

### 場景 4：衝刺結算「日終收割日誌自動生成器 (Focus Journey Reporter)」

* **現狀**：一天結束時，`EndOfDayReview` 需要使用者手動打字回顧今日 Highlight、Lesson 與 Next Action，疲憊時往往草草帶過。
* **Nano 落地作法**：
  * 點擊「日終回顧」時，系統自動將今日完成的任務（`dailyLogs.completedTasks`）、實耗番茄數、中途 Quick Capture 的雜念摘要組合為 Prompt。
  * 調度 **`ai.summarizer`** 執行 `type: 'key-points'` 提煉：
    * **今日戰功 (Highlight)**：*「今天共完成 8🍅 專注，核心產出為完成 Web AI 矩陣 4 大適配器，比預期提早 1🍅。」*
    * **潛在延宕提醒 (Bottleneck)**：*「【除錯 CORS 問題】原估 1🍅，實耗 3🍅，成為今日最大時間黑洞。」*
    * **明日第一優先 (Tomorrow's Battle)**：自動從 `next-action` 推薦優先級最高之項目。
  * 使用者可一鍵將此結構化報告匯出為 Markdown 存入 Obsidian 或同步至 Google Sheets。

### 場景 5：閒置期自動「看板巡檢與殭屍任務理牌 (Zombie Task Reaper)」

* **現狀**：看板中的卡片放了一週未動，過期的資訊混雜在新任務中，造成嚴重的視線雜訊。
* **Nano 落地作法**：
  * 結合 Chrome `chrome.idle.onStateChanged` API，在電腦閒置 15 分鐘時於背景觸發微決策：
  * 掃描 `next-action` 與 `in-progress` 中超過 5 天未更新工時的卡片。
  * Nano 分析卡片內容：
    * 若卡片是時效性資訊（如「關注某會議直播」），建議標註為「已失效，建議刪除」。
    * 若為重要但非急迫之構想，自動批次移至 `💡 Someday (日後也許)` 抽屜，保持看板清爽。
  * 重新開啟瀏覽器時，儀表板浮現簡短提示：*「✨ Nano 已自動將 3 則過期靈感移至 Someday，今日看板焦點清晰！」*

### 場景 6：跨模組智慧關聯（FinanceClipper / VideoSpeed ➔ PM 任務卡）

* **現狀**：從 FinanceClipper 匯入個股時，產生的任務名稱往往只是代碼或生硬標題，缺乏可執行細節。
* **Nano 落地作法**：
  * 當收到來自外部插件的 `CREATE_TASK` 契約通訊時，Background 呼叫 Nano 做**任務潤飾（Task Enrichment）**：
  * 將財經研報或 YouTube 時間戳字幕，轉譯為帶有驗收標準的專案卡片：
    * **任務標題**：從 `Coinbase 研報` ➔ `【研報精讀】驗證 COIN 2026 代幣化短債估值模型 (預估 2🍅)`。
    * **驗收條件 (Definition of Done)**：
      1. 梳理 4 大流動性滴灌機制
      2. 計算 38% 淨利率下的牛市 EPS 上限
      3. 產出雙語社群貼文初稿

---

## 三、 技術實作架構設計

為使上述場景落地，可在 `chrome_scrumclock/src/features/project-management/` 擴充專屬的智能調度模組：

```
chrome_scrumclock/src/features/project-management/
├── components/
│   ├── BoardView.tsx              # 看板主檢視（整合一鍵 Nano 整理按鈕）
│   ├── TaskDetailDrawer.tsx       # 任務詳情抽屜（整合 AI 任務拆解）
│   └── InboxTriageModal.tsx       # [新增] Nano 批次整理 Diff 確認視窗
├── services/
│   ├── taskAIEngine.ts            # [新增] 專案管理專屬 Nano 調度引擎
│   └── kanbanAuditor.ts           # [新增] 背景看板健康度與殭屍任務巡檢器
└── types.ts                       # GTD 狀態、卡片與 Checklist 型別定義
```

### 核心引擎代碼範例：`taskAIEngine.ts`

```typescript
/**
 * taskAIEngine.ts - 專案管理專屬 Web AI 邊緣智能服務
 */

import { WebAIGateway } from '@/core/ai/webAIGateway';
import { WeeklyMission, GTDStatus } from '../types';

export interface TaskTriageProposal {
  id: string;
  recommendedStatus: GTDStatus;
  recommendedPomodoros: number;
  tags: string[];
  reason: string;
}

export class TaskAIEngine {
  private static instance: TaskAIEngine;
  private gateway = WebAIGateway.getInstance();

  private constructor() {}

  public static getInstance(): TaskAIEngine {
    if (!TaskAIEngine.instance) {
      TaskAIEngine.instance = new TaskAIEngine();
    }
    return TaskAIEngine.instance;
  }

  /**
   * 1. 收件匣批次語意釐清 (Inbox Triage)
   */
  public async triageInboxItems(items: WeeklyMission[]): Promise<TaskTriageProposal[]> {
    if (items.length === 0) return [];

    const simplifiedItems = items.map((i) => ({
      id: i.id,
      title: i.title,
      notes: (i.notes || '').slice(0, 100)
    }));

    const prompt = `
Analyze these inbox tasks for a GTD productivity board. Return strictly valid JSON array matching schema:
[
  {
    "id": "task_id_string",
    "recommendedStatus": "next-action" | "someday",
    "recommendedPomodoros": 1 | 2 | 4,
    "tags": ["@Code" | "@Research" | "@Admin" | "@Writing"],
    "reason": "Brief Chinese explanation"
  }
]
Tasks to evaluate:
${JSON.stringify(simplifiedItems)}
`;

    // 優先使用專用 Writer 或降級至 Prompt
    const rawResult = await this.gateway.writeDraft(prompt, {
      tone: 'formal',
      format: 'plain-text'
    });

    try {
      const match = rawResult.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法萃取 JSON 陣列');
      return JSON.parse(match[0]) as TaskTriageProposal[];
    } catch (e) {
      console.warn('[TaskAIEngine] 收件匣批次釐清解析失敗:', e);
      return [];
    }
  }

  /**
   * 2. 原子任務拆解 (Subtask Decomposition)
   */
  public async decomposeTask(taskTitle: string, context?: string): Promise<Array<{ title: string; estimatedPomodoros: number }>> {
    const prompt = `
Break down this project goal into 3 to 4 concrete, actionable subtasks for a Pomodoro sprint.
Goal: "${taskTitle}"
${context ? `Context: ${context}` : ''}

Output strictly valid JSON array:
[
  { "title": "Specific action verb + outcome", "estimatedPomodoros": 1 }
]
`;

    const raw = await this.gateway.writeDraft(prompt, { tone: 'formal', format: 'plain-text' });
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('無法萃取 JSON 陣列');
      return JSON.parse(match[0]);
    } catch (e) {
      console.warn('[TaskAIEngine] 任務拆解失敗:', e);
      return [
        { title: `初步研讀與梳理: ${taskTitle}`, estimatedPomodoros: 1 },
        { title: `實作與驗收: ${taskTitle}`, estimatedPomodoros: 2 }
      ];
    }
  }

  /**
   * 3. 日終成果彙總 (Daily Review Digest)
   */
  public async generateDailyReviewSummary(completedTasks: WeeklyMission[], spentPomodoros: number): Promise<string> {
    const taskSummary = completedTasks.map((t) => `- ${t.title} (${t.spentPomodoros || 1}🍅)`).join('\n');
    const textToSummarize = `Today total focused: ${spentPomodoros} Pomodoros.\nCompleted Missions:\n${taskSummary}`;

    return await this.gateway.summarizeText(textToSummarize, {
      type: 'key-points',
      format: 'markdown',
      length: 'short'
    }, 'Provide a motivating and sharp daily productivity summary in Traditional Chinese.');
  }
}
```

---

## 四、 階段性落地優先級矩陣 (Action Roadmap)

| 優先序 | 功能模組 | 技術切入點 | 收益亮點 | 預估工時 |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | **收件匣一鍵智慧釐清 (Inbox Triage)** | 在 `BoardView.tsx` 新增按鈕，調用 `TaskAIEngine.triageInboxItems` 彈出 Diff 視窗 | 徹底消除 GTD 最繁瑣的分類填表摩擦，維持收件匣零堆積 | 0.5 天 |
| **P1** | **巨型任務原子拆解 (Task Decomposition)** | 在 `TaskDetailDrawer.tsx` 加入「一鍵拆解」，生成帶有 🍅 預算的 Checklist | 破除大任務拖延症，秒級產生可立即專注的衝刺清單 | 0.5 天 |
| **P2** | **日終反思日誌生成 (Daily Review)** | 串接 `EndOfDayReview.tsx` 與 `ai.summarizer` | 一鍵生成高信噪比日報，自動沉澱成就與教訓 | 0.5 天 |
| **P3** | **背景殭屍任務巡檢 (Kanban Auditor)** | 結合 `chrome.idle` 與背景 Service Worker | 自動維持看板健康度，防範 WIP 限制失真 | 1 天 |