/**
 * nano-mock-eval.ts
 * Chrome Gemini Nano (Prompt API) Mock Runtime 測試工模
 * 驗證 ScrumClock 之 ai-helper.ts 在 readily / after-download / no / timeout 情境下的降級與生命週期釋放
 */

import {
  getAICore,
  checkAiCapabilities,
  executeNanoInference,
  safeExtractJSON,
  parseFinanceSummary
} from '../src/utils/ai-helper';

interface MockSession {
  destroyed: boolean;
  systemPrompt?: string;
  prompt: (text: string) => Promise<string>;
  destroy: () => void;
}

// 建立模擬的 LanguageModel API
function createMockAiCore(options: {
  availability: 'readily' | 'after-download' | 'no';
  promptDelayMs?: number;
  mockResponse?: string;
  failPrompt?: boolean;
}) {
  const sessions: MockSession[] = [];

  const mockCore = {
    capabilities: async () => ({
      available: options.availability
    }),
    create: async (sessionOptions?: any) => {
      const session: MockSession = {
        destroyed: false,
        systemPrompt: sessionOptions?.systemPrompt,
        prompt: async (text: string) => {
          if (options.promptDelayMs) {
            await new Promise((resolve) => setTimeout(resolve, options.promptDelayMs));
          }
          if (options.failPrompt) {
            throw new Error('Mock 推論執行失敗');
          }
          return options.mockResponse || `Mock 回應: ${text}`;
        },
        destroy: () => {
          session.destroyed = true;
        }
      };
      sessions.push(session);
      return session;
    },
    _getSessions: () => sessions
  };

  return mockCore;
}

async function runTests() {
  console.log('🧪 開始執行 Chrome Gemini Nano Mock Runtime 驗證工模...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
    }
  }

  // 備份全域環境
  const originalSelfAi = (globalThis as any).ai;
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = globalThis;

  try {
    // -------------------------------------------------------------
    // 測試情境 1: 模型就緒 (readily) 正常推論與 Session 銷毀
    // -------------------------------------------------------------
    console.log('📌 情境 1: 模型狀態 readily - 正常推論與 Session 生命週期釋放');
    const mockCore1 = createMockAiCore({
      availability: 'readily',
      mockResponse: '這是 Gemini Nano 的敏捷任務拆解結果'
    });
    (globalThis as any).ai = { languageModel: mockCore1 };

    const aiCore1 = getAICore();
    assert(aiCore1 !== null, '成功取得 AICore 實例');

    const isAvailable1 = await checkAiCapabilities(aiCore1);
    assert(isAvailable1 === true, 'checkAiCapabilities 回傳 true');

    const result1 = await executeNanoInference(
      '請拆解任務',
      '你是一個敏捷專家',
      2000
    );
    assert(result1 === '這是 Gemini Nano 的敏捷任務拆解結果', '推論輸出與預期一致');

    const sessions1 = mockCore1._getSessions();
    assert(sessions1.length === 1, '已建立 1 個 AI Session');
    assert(sessions1[0].destroyed === true, '推論完成後 session.destroy() 確實被調用 (資源已釋放)');

    // -------------------------------------------------------------
    // 測試情境 2: 模型下載中 (after-download)
    // -------------------------------------------------------------
    console.log('\n📌 情境 2: 模型狀態 after-download - 下載中或需準備');
    const mockCore2 = createMockAiCore({
      availability: 'after-download',
      mockResponse: '模型準備完成後的回應'
    });
    (globalThis as any).ai = { languageModel: mockCore2 };

    const isAvailable2 = await checkAiCapabilities(getAICore());
    assert(isAvailable2 === true, 'checkAiCapabilities 對 after-download 視為可用 (Chrome 規範 available !== "no")');

    // -------------------------------------------------------------
    // 測試情境 3: 模型不支援 (no) 友善攔截
    // -------------------------------------------------------------
    console.log('\n📌 情境 3: 模型狀態 no - 環境不支援與友善錯誤提示');
    const mockCore3 = createMockAiCore({
      availability: 'no'
    });
    (globalThis as any).ai = { languageModel: mockCore3 };

    const isAvailable3 = await checkAiCapabilities(getAICore());
    assert(isAvailable3 === false, 'checkAiCapabilities 回傳 false');

    let threwExpectedError3 = false;
    try {
      await executeNanoInference('測試', undefined, 1000);
    } catch (err: any) {
      threwExpectedError3 = err.message.includes('尚未就緒') || err.message.includes('下載中');
    }
    assert(threwExpectedError3, 'executeNanoInference 正確攔截並拋出友善提示');

    // -------------------------------------------------------------
    // 測試情境 4: 推論逾時防護 (Timeout Guard) 與強制釋放 Session
    // -------------------------------------------------------------
    console.log('\n📌 情境 4: 推論逾時控制 (Timeout Guard)');
    const mockCore4 = createMockAiCore({
      availability: 'readily',
      promptDelayMs: 500 // 延遲 500ms
    });
    (globalThis as any).ai = { languageModel: mockCore4 };

    let threwTimeout = false;
    try {
      // 設定 timeoutMs = 100ms
      await executeNanoInference('逾時測試', '系統提示詞', 100);
    } catch (err: any) {
      threwTimeout = err.message.includes('逾時');
    }
    assert(threwTimeout, '超過 timeoutMs 正確拋出推論逾時異常');
    const sessions4 = mockCore4._getSessions();
    assert(sessions4[0]?.destroyed === true, '逾時拋出異常後，finally 仍確保 session.destroy() 被調用');

    // -------------------------------------------------------------
    // 測試情境 5: 異常發生時之 Session 強制釋放
    // -------------------------------------------------------------
    console.log('\n📌 情境 5: 推論過程拋出非預期異常時的 Session 釋放');
    const mockCore5 = createMockAiCore({
      availability: 'readily',
      failPrompt: true
    });
    (globalThis as any).ai = { languageModel: mockCore5 };

    let threwPromptFail = false;
    try {
      await executeNanoInference('失敗測試', undefined, 2000);
    } catch (err: any) {
      threwPromptFail = err.message.includes('Mock 推論執行失敗');
    }
    assert(threwPromptFail, '正確捕獲推論執行階段異常');
    const sessions5 = mockCore5._getSessions();
    assert(sessions5[0]?.destroyed === true, '即使推論失敗，session.destroy() 仍 100% 執行');

    // -------------------------------------------------------------
    // 測試情境 6: 結構化輸出解析容錯 (JSON / Markdown 降級)
    // -------------------------------------------------------------
    console.log('\n📌 情境 6: safeExtractJSON 與 parseFinanceSummary 防禦性解析');
    
    // 正常的 JSON
    const jsonStr = '```json\n{"quickTake":["重點1","重點2"],"financialHealth":"健全"}\n```';
    const extracted = safeExtractJSON(jsonStr);
    assert(extracted.quickTake?.length === 2, 'safeExtractJSON 能穿透 Markdown 程式碼區塊提取 JSON');

    // 非 JSON 回應降級解析
    const nonJsonMarkdown = `
    重點速讀：
    1. 營收創新高
    2. 客戶黏著度提升
    多方看點：
    - 產品競爭力強
    空方疑慮：
    - 毛利率可能受壓
    財務健康：
    - 現金流極為穩健
    `;
    const parsedSummary = parseFinanceSummary(nonJsonMarkdown, 'AAPL');
    assert(parsedSummary.quickTake.length > 0, '非 JSON 回應自動行匹配解析 quickTake 成功');
    assert(parsedSummary.bullCase.length > 0, '非 JSON 回應自動行匹配解析 bullCase 成功');
    assert(parsedSummary.financialHealth.length > 0, '非 JSON 回應自動行匹配解析 financialHealth 成功');
    assert(parsedSummary.rawMarkdown.includes('AAPL'), '組裝標準 Markdown 包含個股代號');

    // -------------------------------------------------------------
    // 測試情境 7: 降級備援連鎖模擬 (Fallback Chain)
    // -------------------------------------------------------------
    console.log('\n📌 情境 7: 降級備援連鎖 (Nano -> Cloud API -> Webhook)');
    // 模擬 BriefingMissionSelector.tsx 的降級連鎖
    async function simulateBreakdownChain(
      mockAi: any,
      cloudApiKey: string | null,
      syncFallbackAvailable: boolean
    ): Promise<string> {
      // 1. 優先 Nano
      try {
        if (mockAi) {
          const isAvail = await checkAiCapabilities(mockAi);
          if (isAvail) {
            const sess = await mockAi.create();
            const res = await sess.prompt('拆解');
            sess.destroy();
            if (res) return 'Nano拆解成功';
          }
        }
      } catch (e) {
        // Nano 失敗
      }

      // 2. 備援 Cloud API
      if (cloudApiKey) {
        return 'CloudAPI拆解成功';
      }

      // 3. 備援 Webhook
      if (syncFallbackAvailable) {
        return 'Webhook拆解成功';
      }

      throw new Error('所有備援途徑皆不可用');
    }

    const resNano = await simulateBreakdownChain(mockCore1, 'key-123', true);
    assert(resNano === 'Nano拆解成功', '本地 Nano 可用時，優先使用 Nano，不消耗 Cloud Token');

    const resCloud = await simulateBreakdownChain(mockCore3, 'key-123', true);
    assert(resCloud === 'CloudAPI拆解成功', '本地 Nano 不可用時，平順降級至 Cloud API');

    const resWebhook = await simulateBreakdownChain(mockCore3, null, true);
    assert(resWebhook === 'Webhook拆解成功', 'Nano 與 Cloud 皆無時，平順降級至 Webhook');

  } finally {
    // 還原全域環境
    (globalThis as any).ai = originalSelfAi;
    (globalThis as any).window = originalWindow;
  }

  console.log(`\n======================================`);
  console.log(`📊 測試完成: ${passed} / ${total} 通過 (${Math.round((passed / total) * 100)}%)`);
  console.log(`======================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('測試執行發生嚴重錯誤:', err);
  process.exit(1);
});
