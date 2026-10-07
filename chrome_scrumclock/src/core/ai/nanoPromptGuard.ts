/**
 * nanoPromptGuard.ts - 端側小模型 (Gemini Nano 1.8B~3B) 預定路線防崩潰與制式化回應引擎
 *
 * 核心解決痛點：
 * 1. 輸入饑餓 (Input Starvation)：輸入字數過少 (< 20 字) 時，機率坍縮只回「。」或「🥰」。
 * 2. 輸出退化 (Output Degradation)：小模型未依規範輸出條列式或結構化格式，噴出單字符號或 Emoji。
 * 3. 繁中能力受限：透過「英文 System Prompt 骨架 + 繁中 Few-shot 錨定」大幅提升遵循度與穩定度。
 * 4. 零延遲 Fallback：一旦偵測到輸出異常，立即無縫套用預定業務模板，保障 UI 永不崩潰。
 */

export type TaskScenario =
  | 'TASK_DECOMPOSITION'    // 任務原子拆解
  | 'PROGRESS_SUMMARY'      // 進度/日終總結
  | 'INBOX_TRIAGE'          // 收件匣快速分類
  | 'WIP_CONFLICT_CHECK'    // 心流上下文衝突審查
  | 'TONE_POLISH'           // 社群/文字調音
  | 'QUICK_CAPTURE_ENRICH'  // 碎片靈感潤飾與動作化
  | 'THESIS_EXTRACT'        // 研報核心論點與風險獵犬
  | 'TRANSCRIPT_TO_ACTIONS';// 影音逐字稿轉行動清單

export interface GuardedPromptConfig {
  scenario: TaskScenario;
  rawInput: string;
  contextText?: string;
}

export interface PromptRoute {
  sanitizedInput: string;
  systemPrompt: string;
  userPrompt: string;
  fallbackTemplate: string;
}

export interface SafeInferenceResult {
  text: string;
  isFallback: boolean;
  degradedReason?: string;
}

export class NanoPromptGuard {
  private static instance: NanoPromptGuard;

  private constructor() {}

  public static getInstance(): NanoPromptGuard {
    if (!NanoPromptGuard.instance) {
      NanoPromptGuard.instance = new NanoPromptGuard();
    }
    return NanoPromptGuard.instance;
  }

  /**
   * 1. 饑餓偵測層 (Starvation Detector)
   * 檢測輸入是否過短（警戒線：20 個非標點與空白字元）
   */
  public isInputStarved(text: string): boolean {
    if (!text) return true;
    const clean = text.replace(/[\s\p{P}]/gu, '');
    return clean.length < 20;
  }

  /**
   * 2. 輸出退化審查防線 (Output Degradation Detector)
   * 檢測回傳字串是否長度過短、純標點/符號/Emoji、或無意義文字
   */
  public isOutputDegraded(output: string): boolean {
    if (!output || typeof output !== 'string') return true;
    const trimmed = output.trim();
    if (trimmed.length <= 3) return true;

    // 剔除所有空白、標點符號 (P) 與符號/Emoji (S)
    const stripped = trimmed.replace(/[\s\p{P}\p{S}]/gu, '');
    if (stripped.length === 0) return true;

    // 常見異常值比對
    const lower = trimmed.toLowerCase();
    if (lower === 'undefined' || lower === 'null' || lower === '[object object]' || lower === 'nan') {
      return true;
    }

    return false;
  }

  /**
   * 3. 核心路由構造器：根據場景產出「制式化 Few-shot 路線 Prompt」
   */
  public buildGuardedRoute(config: GuardedPromptConfig): PromptRoute {
    const { scenario, rawInput, contextText } = config;
    const cleanInput = (rawInput || '').trim();
    const isStarved = this.isInputStarved(cleanInput);

    switch (scenario) {
      case 'TASK_DECOMPOSITION':
        return this.buildDecompositionRoute(cleanInput, isStarved, contextText);
      case 'PROGRESS_SUMMARY':
        return this.buildSummaryRoute(cleanInput, isStarved, contextText);
      case 'INBOX_TRIAGE':
        return this.buildTriageRoute(cleanInput, isStarved);
      case 'WIP_CONFLICT_CHECK':
        return this.buildWipConflictRoute(cleanInput, isStarved, contextText);
      case 'TONE_POLISH':
        return this.buildToneRoute(cleanInput, isStarved);
      case 'QUICK_CAPTURE_ENRICH':
        return this.buildQuickCaptureRoute(cleanInput, isStarved);
      case 'THESIS_EXTRACT':
        return this.buildThesisExtractRoute(cleanInput, isStarved, contextText);
      case 'TRANSCRIPT_TO_ACTIONS':
        return this.buildTranscriptRoute(cleanInput, isStarved);
      default:
        return this.buildDecompositionRoute(cleanInput, isStarved, contextText);
    }
  }

  /**
   * 4. 安全推論包裝器：執行推論，自動通過審查防線與瞬時 Fallback 兜底
   */
  public async executeSafeInference(
    runner: (systemPrompt: string, userPrompt: string) => Promise<string>,
    config: GuardedPromptConfig
  ): Promise<SafeInferenceResult> {
    const route = this.buildGuardedRoute(config);
    try {
      const rawOutput = await runner(route.systemPrompt, route.userPrompt);
      if (!this.isOutputDegraded(rawOutput)) {
        return {
          text: rawOutput.trim(),
          isFallback: false,
        };
      }
      return {
        text: route.fallbackTemplate,
        isFallback: true,
        degradedReason: 'OUTPUT_DEGRADED',
      };
    } catch {
      return {
        text: route.fallbackTemplate,
        isFallback: true,
        degradedReason: 'INFERENCE_ERROR',
      };
    }
  }

  // ─── 私有路線構造器 ────────────────────────────────────────────────────────

  /**
   * 路線 A：任務原子拆解 (Task Decomposition)
   */
  private buildDecompositionRoute(input: string, isStarved: boolean, context?: string): PromptRoute {
    const systemPrompt = `You are an agile project coach. Break down the user's project goal into 3 concrete, actionable subtasks for a Pomodoro sprint.
Rules:
- Each line must start with "- " and use a strong Traditional Chinese action verb (梳理 / 實作 / 驗證 / 撰寫 / 整合).
- Each item must include estimated pomodoros like (1🍅) or (2🍅).
- Output strictly bullet points. NEVER answer with single punctuation, greetings, or emoji alone.`;

    const fewShot = `【範例 1】
輸入：串接 Chrome AI Prompt API
輸出：
- 梳理 Chrome Prompt API 規格與生命週期 (1🍅)
- 實作 ai.languageModel 呼叫封裝與異常捕捉 (2🍅)
- 驗證端側推論響應並完成單元測試 (1🍅)

【範例 2】
輸入：製作設定頁面深色模式切換
輸出：
- 梳理深色主題配色變數與 CSS Tokens (1🍅)
- 實作 ThemeProvider 狀態保存與切換開關元件 (2🍅)
- 驗證各視圖介面對比度與切換流暢度 (1🍅)`;

    const inputInjection = isStarved
      ? `【目標任務】："${input}"\n（補充說明：因目標簡短，請根據工程最佳實踐，為該主題提供核心規劃、實作驗證、產出歸檔 3 大步驟）`
      : `【目標任務】："${input}"${context ? `\n補充背景：${context}` : ''}`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = `- 梳理需求與環境確認：${input} (1🍅)\n- 核心實作與邏輯驗證：${input} (2🍅)\n- 測試、驗收與產出歸檔：${input} (1🍅)`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 B：日終成果彙總 (Progress & Daily Summary)
   */
  private buildSummaryRoute(input: string, isStarved: boolean, context?: string): PromptRoute {
    const systemPrompt = `You are an agile engineering lead. Summarize achievements into high-signal key points in Traditional Chinese (繁體中文).
Structure strictly:
- 🎯 今日戰功：[1-2 bullet points]
- ⚡ 專注洞察：[1 bullet point]
- 🚀 明日優先：[1 bullet point]
NEVER output conversational filler or single punctuation alone.`;

    const fewShot = `【範例】
輸入：總專注時間: 6 顆番茄 (150 分鐘)
完成戰役清單:
- 完成 NanoPromptGuard 核心架構 (3🍅)
- 修復 Service Worker 喚醒延遲 (2🍅)
輸出：
- 🎯 今日戰功：完成防崩潰腳本引擎架構與 Service Worker 延遲修復
- ⚡ 專注洞察：深層工程心流維持良好，番茄達成率 100%
- 🚀 明日優先：完成端到端整合驗證與 SSOT 閉環文檔`;

    const inputInjection = isStarved
      ? `【投入紀錄】："${input}"\n（注意：數據精簡，請推論具體且激勵的日終回顧）`
      : `【投入紀錄】："${input}"${context ? `\n補充備註：${context}` : ''}`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = `- 🎯 今日戰功：穩定推進主要目標清單\n- ⚡ 專注洞察：維持專注節奏，順利交付核心進度\n- 🚀 明日優先：延續今日成果，優先處理待辦焦點`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 C：收件匣批次釐清 (Inbox Triage)
   */
  private buildTriageRoute(input: string, _isStarved: boolean): PromptRoute {
    const systemPrompt = `You are an agile GTD productivity coach. Classify inbox tasks and return strictly a valid JSON array matching schema:
[
  {
    "id": "task_id_string",
    "recommendedStatus": "next-action" | "someday",
    "recommendedPomodoros": 1 | 2 | 4,
    "tags": ["@Code" | "@Research" | "@Admin" | "@Writing" | "@Focus"],
    "reason": "Brief Traditional Chinese explanation under 15 words"
  }
]
NEVER output conversational text, markdown code blocks, or single punctuation alone.`;

    const fewShot = `【範例】
輸入：[{"id":"1","title":"研究 Vite 插件架構","notes":""},{"id":"2","title":"整理收據報銷","notes":""}]
輸出：[{"id":"1","recommendedStatus":"next-action","recommendedPomodoros":2,"tags":["@Research"],"reason":"技術調研明確可轉化為行動"},{"id":"2","recommendedStatus":"someday","recommendedPomodoros":1,"tags":["@Admin"],"reason":"例行行政事務可排定零碎時間處理"}]`;

    const userPrompt = `${fewShot}\n\n輸入：${input}\n輸出：`;
    const fallbackTemplate = `[{"id":"fallback","recommendedStatus":"next-action","recommendedPomodoros":1,"tags":["@Focus"],"reason":"系統預設推薦為下一步行動"}]`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 D：心流上下文衝突審查 (WIP Context Friction Defender)
   */
  private buildWipConflictRoute(input: string, _isStarved: boolean, context?: string): PromptRoute {
    const systemPrompt = `Assess context-switching friction between tasks.
Strictly output valid JSON:
{"hasConflict": boolean, "warningMessage": "Traditional Chinese sentence under 20 words", "suggestedAction": "proceed" | "defer-to-next" | "shelve-to-someday"}
NEVER output single punctuation, apologies, or markdown code blocks.`;

    const fewShot = `【範例 1】
輸入：正在進行：[研報精讀 (2🍅)]。欲新增：修改前端 CSS 按鈕顏色。
輸出：{"hasConflict": true, "warningMessage": "研報精讀屬於深度心流，切換至零碎排版會嚴重損耗專注力。", "suggestedAction": "defer-to-next"}

【範例 2】
輸入：正在進行：[修復 Token 續期 Bug]。欲新增：單元測試 Token 過期。
輸出：{"hasConflict": false, "warningMessage": "兩者屬於同一技術領域，具備協同增益效果。", "suggestedAction": "proceed"}`;

    const query = `正在進行：[${context || '核心專注任務'}]。欲新增：${input}。`;
    const userPrompt = `${fewShot}\n\n輸入：${query}\n輸出：`;
    const fallbackTemplate = `{"hasConflict": true, "warningMessage": "目前正在衝刺核心焦點，建議先完成進行中任務。", "suggestedAction": "defer-to-next"}`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 E：社群與文字調音 (Tone Polish)
   */
  private buildToneRoute(input: string, isStarved: boolean): PromptRoute {
    const systemPrompt = `You are a professional editor. Rewrite the text to sound clear, polished, and assertive in Traditional Chinese (繁體中文).
NEVER output greetings, apologies, or single punctuation alone.`;

    const fewShot = `【範例】
輸入：我大概覺得這個東西可以試試看吧
輸出：此方案具備高度可行性，建議納入本次迭代進行概念驗證。`;

    const inputInjection = isStarved
      ? `【草稿】："${input}"\n（說明：因文字極短，請轉化為肯定且具建設性的專業表述）`
      : `【草稿】："${input}"`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = input;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 F：碎片靈感語意化與動作化 (Quick Capture Enrichment)
   */
  private buildQuickCaptureRoute(input: string, isStarved: boolean): PromptRoute {
    const systemPrompt = `You are an agile GTD task formatter.
Convert vague thoughts into an actionable task strictly matching:
- 具體行動：[Strong Action Verb] + [Clear Target]
- 驗收條件 (DoD)：[Measurable Criteria]
- 建議標籤：[@Code | @Research | @Admin | @Writing]
NEVER answer with single punctuation, greetings, or emoji alone.`;

    const fewShot = `【範例 1】
輸入：看美債ETF
輸出：
- 具體行動：梳理 TLT 與短債 ETF 利差走勢並記錄核心折溢價
- 驗收條件 (DoD)：完成 3 年期久期風險比對筆記
- 建議標籤：@Research

【範例 2】
輸入：重構 auth
輸出：
- 具體行動：重構 OAuth Token 重新整理流程與中介層攔截器
- 驗收條件 (DoD)：通過 401 錯誤自動續期之整合測試
- 建議標籤：@Code`;

    const inputInjection = isStarved
      ? `【簡短靈感】："${input}"\n（說明：因內容極簡，請推論具體且專業的標準工程/研究行動項目）`
      : `【簡短靈感】："${input}"`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = `- 具體行動：推進「${input}」具體執行計畫\n- 驗收條件 (DoD)：產出可驗收成果並歸檔於看板\n- 建議標籤：@Focus`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 G：研報與長文反常識觀點獵犬 (Thesis & Contrarian Hunting)
   */
  private buildThesisExtractRoute(input: string, isStarved: boolean, context?: string): PromptRoute {
    const systemPrompt = `You are a contrarian equity & tech researcher.
Extract high-signal insights strictly into 3 structured bullet points in Traditional Chinese (繁體中文):
1. 💡 反常識核心論點 (Contrarian Thesis)
2. 📊 關鍵硬核數據 (Core Metric / Data Point)
3. ⚠️ 下檔致命風險 (Tail Risk / Red Flag)
NEVER output generic summaries, introductions, or single punctuation.`;

    const fewShot = `【範例】
輸入：Coinbase 推出代幣化資產平台，管理層表示將專注合規，但市場擔憂手續費率下滑與監管訴訟
輸出：
1. 💡 反常識核心論點：合規平台並非防守姿態，而是旨在作為美債美元離岸吸水海綿，打造非手續費收入護城河。
2. 📊 關鍵硬核數據：手續費佔比需降至 45% 以下，且代幣化短債規模需突破 100 億美元方能穩定獲利。
3. ⚠️ 下檔致命風險：SEC 對收益型穩定幣之證券性質認定若逆轉，將面臨單日流動性擠兌。`;

    const inputInjection = isStarved
      ? `【研報片斷】："${input}"\n（注意：內文精煉，請鎖定最硬核的實質觀點、數據與風險）`
      : `【研報片斷】："${input}"${context ? `\n補充上下文：${context}` : ''}`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = `1. 💡 反常識核心論點：聚焦「${input}」核心競爭優勢與底層邏輯重構。\n2. 📊 關鍵硬核數據：需持續追蹤單位經濟效益與轉換率變化。\n3. ⚠️ 下檔致命風險：需防範外部環境變動與依賴單一通道之脆弱性。`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }

  /**
   * 路線 H：影音字幕/逐字稿轉作戰清單 (Transcript to Actions)
   */
  private buildTranscriptRoute(input: string, isStarved: boolean): PromptRoute {
    const systemPrompt = `Filter out spoken fillers (um, like, 基本上, 然後) and convert spoken transcript into strictly 2-3 actionable checklist items in Traditional Chinese (繁體中文).
Format: "- [ ] [Action verb] [Specific Tool or Method]"
NEVER output chit-chat or single punctuation.`;

    const fewShot = `【範例】
輸入：那我們今天基本上就是要跟大家介紹這個 FastMCP，然後你可以用 Python 寫，接著把它掛到 Claude 裡面去做測試
輸出：
- [ ] 安裝與初始化 FastMCP Python 執行環境
- [ ] 撰寫範例 Tool 端點並驗證輸入參數型別
- [ ] 配置 Claude Desktop 設定檔並掛載本機 MCP 伺服器`;

    const inputInjection = isStarved
      ? `【口語字幕】："${input}"\n（注意：口語極短，請推論具體之實作步驟）`
      : `【口語字幕】："${input}"`;

    const userPrompt = `${fewShot}\n\n${inputInjection}\n輸出：`;
    const fallbackTemplate = `- [ ] 梳理「${input}」講述之核心概念與技術架構\n- [ ] 實作驗證相關工具並記錄踩坑筆記`;

    return {
      sanitizedInput: input,
      systemPrompt,
      userPrompt,
      fallbackTemplate,
    };
  }
}
