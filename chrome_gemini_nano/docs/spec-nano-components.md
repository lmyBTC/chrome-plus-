# Gemini Nano 本機推論引擎組成元件規格字典

> 文件路徑：`chrome_gemini_nano/docs/spec-nano-components.md`  
> 模組代號：`nano`  
> 架構規範：Manifest V3、TypeScript + React + Vite、Chrome 內建 Prompt API / Web AI

---

## 1. 架構概述與設計原則

Gemini Nano 插件專注於提供純本機、零網路外洩的邊緣 AI 推論能力：
* **邊緣本地推論 (Edge Privacy)**：直接呼叫 Chrome 原生 `window.ai` / `ai.languageModel` (Gemini Nano)，保護金融資料與研報隱私。
* **分層適配器架構 (Adapter Architecture)**：針對 Chrome 官方逐步推出的 Task APIs（Summarizer, Rewriter, Writer, Translator），實作標準化 Adapter 統一抽象。
* **意圖驅動管線 (Intent Pipeline)**：由 Intent Router 依據分析目標自動選擇最適管線（如 Pulse Extraction 或 Tone Shifting），並具備自動回退與錯誤隔離能力。

---

## 2. 組成元件清單 (Component Inventory)

### 2.1 UI 視圖與容器元件 (View Containers)
* **`SidepanelApp` (`src/sidepanel.tsx`)**
  * 職責：Chrome Sidepanel 側邊欄核心介面，負責整體應用程式狀態初始化、推論狀態管理 (Idle / Processing / Error)、結果展示與複製。
  * 狀態管理：管理當前 Nano 模型的就緒狀態 (`readiness`)、下載進度指示器與對話歷史。
* **`SocialDispatcher` (`src/components/SocialDispatcher.tsx`)**
  * 職責：將 Nano 生成之重點摘要或分析報告，依格式快速派發、複製或轉發至指定管道。

### 2.2 核心服務層 (Core Services)
* **`NanoService` (`src/services/nanoService.ts`)**
  * 職責：Nano 核心生命週期與 Session 管理者。
  * 核心方法：
    * `checkCapabilities()`: 探測 `ai.languageModel.capabilities()`（可為 `readily`, `after-download`, 或 `no`）。
    * `createSession(options)`: 初始化模型推論 Session，管理 `temperature` 與 `topK`。
    * `prompt(text)` / `promptStreaming(text)`: 執行推論與流式輸出。
* **`WebAIGateway` (`src/services/webAIGateway.ts`)**
  * 職責：對 Chrome Web AI API 進行底層攔截與相容性檢查，處理版本前綴差（如 `chrome.aiOriginTrial` vs `window.ai`）。
* **`NanoIntentRouter` (`src/services/nanoIntentRouter.ts`)**
  * 職責：意圖路由分發器，分析使用者輸入文本特徵，動態匹配至「摘要 (Summarize)」、「脈動提煉 (Pulse)」、「重寫 (Rewrite)」或「客製問答 (Q&A)」管線。
* **`PulseExtractor` (`src/services/pulseExtractor.ts`)**
  * 職責：金融研報脈動提煉模組，專精於提取數字指標、營收變化、評等調整與核心風險點。
* **`ToneShifter` (`src/services/toneShifter.ts`)**
  * 職責：語氣風格轉換器，提供專業研報風、簡報條列風、社交傳播風等語意轉換。
* **`GeminiOfficialBridge` (`src/geminiOfficialBridge.ts`)**
  * 職責：封裝 Chrome 官方標準 AI 訊息傳遞管道，處理非同步通訊與大型上下文串流。

### 2.3 官方適配器模組 (Official Adapters Matrix)
* **`RewriterAdapter` (`src/services/adapters/rewriterAdapter.ts`)**
  * 適配目標：Chrome `ai.rewriter` API，支援長度調整、語氣設定與格式重整。
* **`SummarizerAdapter` (`src/services/adapters/summarizerAdapter.ts`)**
  * 適配目標：Chrome `ai.summarizer` API，支援 key-points, tl;dr, teaser 與 headline 格式。
* **`TranslatorAdapter` (`src/services/adapters/translatorAdapter.ts`)**
  * 適配目標：Chrome `ai.translator` API，提供多語系極速本機翻譯。
* **`WriterAdapter` (`src/services/adapters/writerAdapter.ts`)**
  * 適配目標：Chrome `ai.writer` API，負責根據大綱生成完整短文。
* **`AdapterTypes` (`src/services/adapters/types.ts`)**
  * 介面宣告：定義所有適配器的統一輸入輸出規範與錯誤代碼。

---

## 3. 資料與配置模型 (Data Model & Schema)

### 3.1 推論配置模型 (Inference Config)
```typescript
interface NanoConfig {
  temperature: number; // 預設 0.2 ~ 0.7
  topK: number;        // 預設 3
  systemPrompt?: string;
  streaming: boolean;
}
```

### 3.2 跨插件通訊介面 (Cross-Plugin Messaging)
* **`NANO_QUERY`**: 接收來自 `finance-research-clipper-oss` 或 `chrome_pk` 的分析請求。
  * 入參：`{ task: "summarize" | "pulse" | "rewrite", content: string, options?: NanoConfig }`
  * 出參：`{ success: boolean, result: string, durationMs: number }`
* **`NANO_STATUS_CHECK`**: 回應當前本機模型是否已就緒與可用記憶體配額。

