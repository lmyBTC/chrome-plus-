/**
 * nanoPromptGuard.ts - 端側小模型 (Gemini Nano 1.8B~3B) 預定路線防崩潰與制式化回應引擎
 * 核心解決痛點：
 * 1. 輸入饑餓 (Input Starvation)：輸入字數過少 (< 25 字) 時，機率坍縮只回「。」或「🥰」。
 * 2. 輸出退化 (Output Degradation)：小模型未依規範輸出條列式，反而噴出單字符號或 Emoji。
 * 3. 繁中能力受限：透過「英文 System Prompt 骨架 + 繁中 Few-shot 錨定」大幅提升穩定度。
 */

export type TaskScenario = 
  | 'TASK_DECOMPOSITION'    // 任務原子拆解
  | 'PROGRESS_SUMMARY'      // 進度/日終總結
  | 'INBOX_TRIAGE'          // 收件匣快速分類
  | 'TONE_POLISH'           // 社群/文字調音
  | 'QUICK_CAPTURE_ENRICH'  // 碎片靈感潤飾與動作化 (新增)
  | 'THESIS_EXTRACT'        // 研報核心論點與風險獵犬 (新增)
  | 'TRANSCRIPT_TO_ACTIONS' // 影音逐字稿轉行動清單 (新增)
  | 'WIP_CONFLICT_CHECK';   // 心流上下文衝突審查 (新增)

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
   * 1. 檢測輸入是否過短（輸入饑餓警戒線：20 字元）
   */
  public isInputStarved(text: string): boolean {
    const clean = text.replace(/[\s\p{P}]/gu, '');
    return clean.length < 20;
  }

  /**
   * 2. 核心路由構造器：根據場景產出「制式化 Few-shot 路線 Prompt」
   */
  public buildGuardedRoute(config: GuardedPromptConfig): PromptRoute {
    const { scenario, rawInput, contextText } = config;
    const cleanInput = rawInput.trim();
    const isStarved = this.isInputStarved(cleanInput);

    switch (scenario) {
      case 'TASK_DECOMPOSITION':
        return this.buildDecompositionRoute(cleanInput, isStarved, contextText);
      case 'PROGRESS_SUMMARY':
        return this.buildSummaryRoute(cleanInput, isStarved, contextText);
      case 'INBOX_TRIAGE':
        return this.buildTriageRoute(cleanInput, isStarved);
      case 'TONE_POLISH':
        return this.buildToneRoute(cleanInput, isStarved);
      case 'QUICK_CAPTURE_ENRICH':
        return this.buildQuickCaptureRoute(cleanInput, isStarved);
      case 'THESIS_EXTRACT':
        return this.buildThesisExtractRoute(cleanInput, isStarved, contextText);
      case 'TRANSCRIPT_TO_ACTIONS':
        return this.buildTranscriptRoute(cleanInput, isStarved);
      case 'WIP_CONFLICT_CHECK':
      default:
        return this.buildWipConflictRoute(cleanInput, isStarved, contextText);
    }
  }

  // ... existing code ... [buildDecompositionRoute, buildSummaryRoute, buildTriageRoute, buildToneRoute] ...

  /**
   * 路線 E：碎片靈感語意化與動作化 (Quick Capture Enrichment)
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
   * 路線 F：研報與長文反常識觀點獵犬 (Thesis & Contrarian Hunting)
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
   * 路線 G：影音字幕/逐字稿轉作戰清單 (Transcript to Actions)
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

  /**
   * 路線 H：心流上下文衝突審查 (WIP Context Friction Defender)
   */
  private buildWipConflictRoute(input: string, _isStarved: boolean, context?: string): PromptRoute {
    const systemPrompt = `Assess context-switching friction between tasks.
Strictly output valid JSON:
{"hasConflict": boolean, "warningMessage": "Traditional Chinese sentence under 20 words", "suggestedAction": "proceed" | "defer-to-next" | "shelve-to-someday"}`;

    const fewShot = `【範例 1】
輸入：正在進行：[Coinbase 研報精讀 (2🍅)]。欲新增：修改前端 CSS 按鈕顏色。
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

  // ... existing code ... [isOutputDegraded, executeSafeInference]