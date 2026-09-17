/**
 * 取得當前環境下相容性最高的 Chrome AI LanguageModel API
 */
export function getAICore(): any {
  if (typeof self !== 'undefined' && (self as any).ai?.languageModel) {
    return (self as any).ai.languageModel;
  }
  if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
    return (window as any).ai.languageModel;
  }
  if (typeof chrome !== 'undefined' && (chrome as any).aiLanguageModel) {
    return (chrome as any).aiLanguageModel;
  }
  if (typeof (self as any).LanguageModel !== 'undefined') {
    return (self as any).LanguageModel;
  }
  return null;
}

/**
 * 安全檢測 AI 是否可用
 */
export async function checkAiCapabilities(aiAPI: any): Promise<boolean> {
  if (!aiAPI) {
    return false;
  }
  
  // 降級處理：如果沒有 capabilities 方法但有 create 方法 (例如舊版 LanguageModel)，
  // 說明模型依然可以直接建立 session，因此視為可用。
  if (typeof aiAPI.capabilities !== 'function') {
    return typeof aiAPI.create === 'function';
  }

  try {
    const caps = await aiAPI.capabilities();
    return caps.available !== 'no';
  } catch (e) {
    try {
      const caps = await aiAPI.capabilities({
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      });
      return caps.available !== 'no';
    } catch (err) {
      console.warn('執行 capabilities 檢測失敗，改為直接依據 create 方法判斷:', err);
      return typeof aiAPI.create === 'function';
    }
  }
}

/**
 * 安全提取並解析 JSON (防止 AI 回覆廢話或 markdown 標記)
 */
export function safeExtractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('未在 AI 回應中找到 JSON 結構。');
  }
  return JSON.parse(match[0]);
}

/**
 * 財務研報結構化安全抽取函式（支援 JSON 與 Markdown 降級容錯）
 */
export function parseFinanceSummary(rawText: string, ticker = ''): {
  quickTake: string[];
  bullCase: string[];
  bearCase: string[];
  financialHealth: string;
  rawMarkdown: string;
} {
  let quickTake: string[] = [];
  let bullCase: string[] = [];
  let bearCase: string[] = [];
  let financialHealth = '';

  try {
    const json = safeExtractJSON(rawText);
    if (Array.isArray(json.quickTake)) quickTake = json.quickTake.map(String);
    if (Array.isArray(json.bullCase)) bullCase = json.bullCase.map(String);
    if (Array.isArray(json.bearCase)) bearCase = json.bearCase.map(String);
    if (json.financialHealth) financialHealth = String(json.financialHealth);
  } catch (err) {
    // 降級解析：若模型未嚴格回傳 JSON，採用行匹配方式安全解析
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    let section: 'quick' | 'bull' | 'bear' | 'health' | null = null;

    for (const line of lines) {
      if (/速讀|重點|quick/i.test(line)) { section = 'quick'; continue; }
      if (/多方|利多|看好|bull/i.test(line)) { section = 'bull'; continue; }
      if (/空方|隱憂|風險|bear/i.test(line)) { section = 'bear'; continue; }
      if (/健康|財務|評語|health/i.test(line)) { section = 'health'; continue; }

      const cleaned = line.replace(/^[-*•\d.]+\s*/, '');
      if (!cleaned) continue;

      if (section === 'quick' && quickTake.length < 3) quickTake.push(cleaned);
      else if (section === 'bull' && bullCase.length < 3) bullCase.push(cleaned);
      else if (section === 'bear' && bearCase.length < 3) bearCase.push(cleaned);
      else if (section === 'health' && !financialHealth) financialHealth = cleaned;
    }
  }

  // 兜底預設值防護
  if (quickTake.length === 0) {
    quickTake = [
      rawText.slice(0, 120).trim() || `${ticker} 當前估值與市場波動需持續追蹤。`
    ];
  }
  if (bullCase.length === 0) {
    bullCase = ['基本面維持穩定營運動能，具備長期市場競爭力。'];
  }
  if (bearCase.length === 0) {
    bearCase = ['需留意總體經濟環境變化與產業景氣循環估值修正風險。'];
  }
  if (!financialHealth) {
    financialHealth = '資產負債結構符合產業標準，建議密切觀察最新季度利潤率表現。';
  }

  // 組合標準化 Markdown
  const mdParts: string[] = [];
  mdParts.push(`### 🤖 ${ticker} Gemini Nano 智能研報摘要\n`);
  mdParts.push(`#### 📌 三句話精準速讀\n` + quickTake.map((item, i) => `${i + 1}. ${item}`).join('\n'));
  mdParts.push(`\n#### 🟢 多方核心看點\n` + bullCase.map(item => `- ${item}`).join('\n'));
  mdParts.push(`\n#### 🔴 空方核心疑慮\n` + bearCase.map(item => `- ${item}`).join('\n'));
  mdParts.push(`\n#### 💡 財務健康與估值評語\n${financialHealth}`);

  return {
    quickTake,
    bullCase,
    bearCase,
    financialHealth,
    rawMarkdown: mdParts.join('\n')
  };
}

/**
 * 執行本地 Gemini Nano 推論 (附帶超時控制與 session 生命週期管理)
 */
export async function executeNanoInference(
  prompt: string,
  systemPrompt?: string,
  timeoutMs = 30000
): Promise<string> {
  const aiCore = getAICore();
  if (!aiCore) {
    throw new Error('當前環境未偵測到 Chrome 內建 AI (Gemini Nano) API。請在 chrome://flags 中開啟 Optimization Guide On Device Model 與 Prompt API。');
  }

  const isAvailable = await checkAiCapabilities(aiCore);
  if (!isAvailable) {
    throw new Error('Chrome Gemini Nano 模型尚未就緒或正在下載中，請稍候重試。');
  }

  const sessionOptions: any = {};
  if (systemPrompt) {
    sessionOptions.systemPrompt = systemPrompt;
  }

  let session: any = null;
  try {
    session = await aiCore.create(sessionOptions);

    const inferencePromise = (async () => {
      if (typeof session.prompt === 'function') {
        return await session.prompt(prompt);
      }
      throw new Error('AI Session 不支援 prompt 方法。');
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI 推論逾時 (${Math.round(timeoutMs / 1000)} 秒)`)), timeoutMs);
    });

    return await Promise.race([inferencePromise, timeoutPromise]);
  } finally {
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
      } catch (e) {
        // 忽略 session 銷毀時的非致命錯誤
      }
    }
  }
}

