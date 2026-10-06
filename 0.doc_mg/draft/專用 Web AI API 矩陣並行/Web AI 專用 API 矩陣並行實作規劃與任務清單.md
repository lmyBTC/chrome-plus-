# 🧩 Chrome 130+ 專用 Web AI API 矩陣並行 (Task-Specific API Matrix) 開發手冊與任務清單

> **目標**：解耦通用 `ai.languageModel`（Prompt API）單點過載問題，全面接入 Chrome 原生專屬蒸餾小模型 API（`ai.summarizer`、`ai.writer`、`ai.rewriter`、`ai.translator`），構建多 API 路由閘道（Web AI Gateway），降低延遲 50%+ 並減少顯存佔用。
> **適用版本**：Chrome 130+ (Web AI 早期試驗與標準草案)
> **架構原則**：專用優先（Specialized First）、通用備援（Prompt API Fallback）、雲端降級（Cloud Cascade）。

---

## 🗺️ 一、 API 矩陣職責分工與調度架構 (Architecture Topology)

```
                              [使用者操作 / 分頁內容]
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │   Web AI Gateway (webAIGateway.ts)   │
                     │   - 能力探測 (Capabilities Check)      │
                     │   - 任務類型路由 (Task-Based Routing)   │
                     │   - 多 API 實體生命週期管理            │
                     └───────────────────┬───────────────────┘
                                         │
         ┌───────────────────┬───────────┴───────────┬───────────────────┐
         ▼                   ▼                       ▼                   ▼
┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
│  ai.summarizer  │ │    ai.writer    │     │   ai.rewriter   │ │  ai.translator  │
│  (專用摘要引擎) │ │  (專用撰寫引擎) │     │  (專用改寫引擎) │ │  (神經翻譯引擎) │
├─────────────────┤ ├─────────────────┤     ├─────────────────┤ ├─────────────────┤
│ • 研報 TL;DR     │ │ • X 貼文初稿    │     │ • 觀點銳化      │ │ • 美股研報雙語  │
│ • YouTube 字幕  │ │ • Threads 文案  │     │ • 壓線 280      │ │ • 財經名詞在地化│
│ • 每日脈動提取  │ │ • GTD 任務說明  │     │ • 在地去油      │ │ • 跨國快訊轉譯  │
└─────────────────┘ └─────────────────┘     └─────────────────┘ └─────────────────┘
         │                   │                       │                   │
         └───────────────────┴───────────┬───────────┴───────────────────┘
                                         ▼ (任一專用 API 不可用時)
                                ┌─────────────────┐
                                │ai.languageModel │ (通用 Prompt API 自動降級備援)
                                └─────────────────┘
```

---

## 📁 二、 開發檔案清單與代碼結構 (Target File Tree)

本階段需新增與重構的核心代碼檔案如下：

```
chrome_scrumclock/src/core/ai/
├── webAIGateway.ts                  # [新建立] 矩陣中樞：負責能力探測、會話池與降級分發
├── adapters/                        # [新建立] 各專用 Web AI API 封裝適配器
│   ├── summarizerAdapter.ts         # [新建立] ai.summarizer (type, format, length 配置)
│   ├── writerAdapter.ts             # [新建立] ai.writer (tone, format, length 配置)
│   ├── rewriterAdapter.ts           # [新建立] ai.rewriter (tone, context, length 算子重構)
│   └── translatorAdapter.ts         # [新建立] ai.translator (源語言/目標語言離線翻譯)
└── nanoService.ts                   # [修改維護] 保留 Prompt API，並作為 Gateway 的通用備援通道

chrome_scrumclock/src/features/toolbox/tools/social-dispatcher/
├── toneShifter.ts                   # [重構] 改為呼叫 rewriterAdapter，消除手工寫長 Prompt
└── SocialDispatcher.tsx             # [重構] 將摘要與文案生成分流至 Summarizer 與 Writer
```

---

## 📝 三、 各模組開發規格與原始需求 (Detailed Specifications)

### 1. `webAIGateway.ts` (中樞路由閘道)
* **原始需求**：現行架構將「摘要、寫作、改寫、翻譯」全部塞給通用 `ai.languageModel`，導致 Prompt 冗長且容易遺失格式（如 Markdown 雜訊）。
* **核心職責**：
  1. 探測 Chrome 130+ 專屬 API 掛載點（`self.ai.summarizer` 等）。
  2. 若專屬 API 狀態為 `'readily'`，優先分派給專屬 Adapter。
  3. 若專屬 API 不支援（`'no'` 或未定義），自動透明降級回 `NanoService`（Prompt API），呼叫端零感知。

### 2. `summarizerAdapter.ts` (專用摘要引擎)
* **API 規格**：
  ```typescript
  const summarizer = await (self as any).ai.summarizer.create({
    type: 'key-points' | 'tl-dr' | 'teaser' | 'headline',
    format: 'markdown' | 'plain-text',
    length: 'short' | 'medium' | 'long'
  });
  ```
* **落地場景**：
  - `pulseExtractor.ts` 抓取文章後，以 `type: 'key-points', length: 'short'` 快速提煉 3 點骨幹。
  - YouTube 字幕壓縮：以 `type: 'tl-dr'` 剔除語音贅字。

### 3. `writerAdapter.ts` & `rewriterAdapter.ts` (文案與調音重構)
* **API 規格**：
  ```typescript
  const rewriter = await (self as any).ai.rewriter.create({
    tone: 'as-is' | 'more-formal' | 'more-casual',
    format: 'as-is' | 'plain-text' | 'markdown',
    length: 'as-is' | 'shorter' | 'longer'
  });
  ```
* **重構收益**：
  - **壓線 280**：直接設定 `length: 'shorter'`，毋須寫 Prompt 嚴令「禁止輸出超過 270 字元」。
  - **在地去油**：設定 `tone: 'more-casual'` 搭配 Context 注入台灣科技用語規範。

### 4. `translatorAdapter.ts` (神經翻譯引擎)
* **API 規格**：
  ```typescript
  const translator = await (self as any).translation.createTranslator({
    sourceLanguage: 'en',
    targetLanguage: 'zh-Hant'
  });
  ```
* **重構收益**：
  - 美股研報與英文推文轉繁體中文時，免去大模型在翻譯過程中「擅自解讀或格式跑版」的頑疾。

---

## 📋 四、 開發任務清單與實作工期看板 (Execution Task Tracker)

- [ ] **Phase 1: 基礎適配層與能力檢測 (Gateway Foundation)**
  - [ ] **Task 1.1**：建立 `webAIGateway.ts`，完成 `summarizer`、`writer`、`rewriter`、`translation` 4 大 API 的 Namespace 探測與狀態監聽。
  - [ ] **Task 1.2**：定義統一的任務介面與 Fallback 策略（若特定 API 未就緒則導向 `NanoService`）。

- [ ] **Phase 2: 專用適配器實作 (Adapter Implementations)**
  - [ ] **Task 2.1**：實作 `summarizerAdapter.ts`（支援 Key-points 與 TL;DR 雙模式）。
  - [ ] **Task 2.2**：實作 `writerAdapter.ts`（支援社群貼文初稿生成）。
  - [ ] **Task 2.3**：實作 `rewriterAdapter.ts`（將現有 `toneShifter.ts` 4 大算子解耦為原生 Rewriter 參數調度）。
  - [ ] **Task 2.4**：實作 `translatorAdapter.ts`（支援美股英中對照與雙向轉譯）。

- [ ] **Phase 3: 既有業務模組升級與整合 (Feature Integration)**
  - [ ] **Task 3.1**：重構 `toneShifter.ts`，將手工 Prompt 替換為 `rewriterAdapter`。
  - [ ] **Task 3.2**：更新 `SocialDispatcher.tsx`，改由 Gateway 統一分發摘要與草稿生成。
  - [ ] **Task 3.3**：更新 `0.doc_mg/docs/cross_plugin_contract.md` 註明 API 矩陣適配。