import { storage } from '../chrome/storage';

export const geminiService = {
  /**
   * 呼叫 Gemini API 生成文本
   * @param prompt 使用者輸入的提示詞
   * @param systemInstruction 系統指令（可選）
   * @returns 生成的文本內容
   */
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const settings = await storage.getUserSettings();
    const apiKey = settings.geminiApiKey;

    if (!apiKey || !apiKey.trim()) {
      throw new Error('未設定 Gemini API Key。請點擊「全域設定」或敏捷番茄鐘內的「設定」填入 API Key 後再使用。');
    }

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [
          {
            text: systemInstruction
          }
        ]
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `HTTP 錯誤狀態碼: ${response.status}`;
        throw new Error(`Gemini API 呼叫失敗: ${errorMessage}`);
      }

      const responseData = await response.json();
      const textResult = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textResult) {
        throw new Error('Gemini API 未回傳有效內容。');
      }

      return textResult;
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
};
