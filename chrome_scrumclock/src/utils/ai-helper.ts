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
