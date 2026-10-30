/**
 * 單元測試：OfficialGeminiConnector 寬容接收與 SHA-1 去重驗證
 */
import { OfficialGeminiConnector, computeSha1 } from '../src/core/ai/OfficialGeminiConnector';

// 模擬 chrome storage
const storageMap = new Map<string, any>();
(global as any).chrome = {
  storage: {
    local: {
      get: async (key: string) => {
        return { [key]: storageMap.get(key) || [] };
      },
      set: async (items: Record<string, any>) => {
        Object.entries(items).forEach(([k, v]) => storageMap.set(k, v));
      }
    }
  },
  runtime: {
    sendMessage: async () => ({})
  }
};

async function runTests() {
  console.log('🧪 開始測試 OfficialGeminiConnector...');

  const connector = OfficialGeminiConnector.getInstance();
  connector.resetCache();
  storageMap.clear();

  // 1. SHA-1 計算驗證
  const hash1 = await computeSha1('test');
  const hash2 = await computeSha1('test');
  if (hash1 !== hash2 || !hash1) {
    throw new Error('SHA-1 計算不一致或為空');
  }
  console.log('✅ SHA-1 計算正常:', hash1);

  // 2. 寬容接收測試 (缺少 referencedTabs 與 sessionId)
  const tolerantRes = await connector.handleSync({
    role: 'model',
    text: '這是第一則官方對話訊息'
  });
  if (!tolerantRes.success || !tolerantRes.ack || tolerantRes.deduped) {
    throw new Error('寬容接收模式失敗: ' + JSON.stringify(tolerantRes));
  }
  console.log('✅ 寬容接收通過');

  // 3. 連送相同文字 3 次去重驗證
  connector.resetCache();
  storageMap.clear();

  const syncPayload = {
    sessionId: 'session-repeat-test',
    role: 'model' as const,
    text: '這是重複的分析結論：台積電 2026 展望正向。',
    timestamp: Date.now()
  };

  const res1 = await connector.handleSync(syncPayload);
  const res2 = await connector.handleSync(syncPayload);
  const res3 = await connector.handleSync(syncPayload);

  if (!res1.success || res1.deduped) {
    throw new Error('第一次送訊應成功且不被去重');
  }
  if (!res2.success || !res2.deduped) {
    throw new Error('第二次送訊應標記為 deduped: true');
  }
  if (!res3.success || !res3.deduped) {
    throw new Error('第三次送訊應標記為 deduped: true');
  }

  // 檢查 storage 歷史對話池是否僅 1 筆訊息
  const convList = storageMap.get('geminiConversations') || [];
  if (convList.length !== 1) {
    throw new Error(`預期對話池長度為 1，實際為 ${convList.length}`);
  }
  if (convList[0].messages.length !== 1) {
    throw new Error(`預期對話中訊息數為 1，實際為 ${convList[0].messages.length}`);
  }
  console.log('✅ 連送 3 次重複訊息去重防腐通過 (對話池僅 1 筆)');

  // 4. 不同文字續接測試
  const res4 = await connector.handleSync({
    sessionId: 'session-repeat-test',
    role: 'user',
    text: '請問本益比區間？'
  });
  if (!res4.success || res4.deduped) {
    throw new Error('不同訊息不應被去重');
  }
  if (convList[0].messages.length !== 2) {
    throw new Error(`預期對話中訊息數累加為 2，實際為 ${convList[0].messages.length}`);
  }
  console.log('✅ 不同訊息正常累加續接通過 (對話池累積 2 筆)');

  // 5. withTimeout 熔斷測試
  const fastPromise = new Promise((resolve) => setTimeout(() => resolve('fast'), 50));
  const fastRes = await (await import('../src/core/ai/OfficialGeminiConnector')).withTimeout(fastPromise, 200);
  if (fastRes !== 'fast') {
    throw new Error('withTimeout 快速任務執行失敗');
  }

  let timeoutCaught = false;
  try {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('slow'), 300));
    await (await import('../src/core/ai/OfficialGeminiConnector')).withTimeout(slowPromise, 100, '熔斷測試超時');
  } catch (err: any) {
    if (err.message.includes('熔斷測試超時')) {
      timeoutCaught = true;
    }
  }
  if (!timeoutCaught) {
    throw new Error('withTimeout 未能於預期時間觸發熔斷');
  }
  console.log('✅ withTimeout 熔斷機制驗證通過');

  // 6. injectToOfficialGemini() 層 1 注入測試 (模擬官方 Tab 與 Bridge 響應)
  let bridgeReceivedMsg: any = null;
  (global as any).chrome.tabs = {
    query: async () => [{ id: 999, active: true, url: 'https://gemini.google.com/app' }],
    sendMessage: async (tabId: number, msg: any) => {
      bridgeReceivedMsg = msg;
      return {
        success: true,
        ack: true,
        injectedLength: msg.payload?.text?.length,
        submitted: true,
        timestamp: Date.now()
      };
    }
  };

  const injectRes1 = await connector.injectToOfficialGemini('【PK+ 估值結論】NVDA 潛在空間 +16.7%', true);
  if (!injectRes1.success || injectRes1.fallbackLevel !== 1 || !injectRes1.submitted) {
    throw new Error('層 1 Web 注入測試失敗: ' + JSON.stringify(injectRes1));
  }
  if (!bridgeReceivedMsg || bridgeReceivedMsg.type !== 'INJECT_TO_OFFICIAL_GEMINI') {
    throw new Error('Bridge 未收到正確的 INJECT_TO_OFFICIAL_GEMINI 訊息');
  }
  console.log('✅ 層 1 官方 Tab 注入成功通過 (Bridge 收到回拋指令)');

  // 7. injectToOfficialGemini() 層 3 降級保底測試 (無 Tab 且無微服務 ➔ 剪貼簿 + Notification)
  (global as any).chrome.tabs = {
    query: async () => [] // 無任何 gemini tab
  };
  let notificationCreated = false;
  let copiedText = '';
  (global as any).chrome.notifications = {
    create: (options: any) => {
      notificationCreated = true;
    }
  };
  const mockClipboard = {
    writeText: async (text: string) => {
      copiedText = text;
    }
  };
  try {
    Object.defineProperty(global.navigator, 'clipboard', {
      value: mockClipboard,
      configurable: true,
      writable: true
    });
  } catch {
    (global as any).navigator = { clipboard: mockClipboard };
  }

  const injectRes3 = await connector.injectToOfficialGemini('降級測試：NVDA 目標價 150', false);
  if (!injectRes3.success || injectRes3.fallbackLevel !== 3) {
    throw new Error('層 3 降級保底測試失敗: ' + JSON.stringify(injectRes3));
  }
  if (!notificationCreated) {
    throw new Error('層 3 降級未建立 Chrome 系統通知');
  }
  if (copiedText !== '降級測試：NVDA 目標價 150') {
    throw new Error(`剪貼簿內容不符: ${copiedText}`);
  }
  console.log('✅ 層 3 降級保底測試通過 (剪貼簿複製 + Chrome Notification 觸發)');

  console.log('🎉 所有 OfficialGeminiConnector 單元測試通過 (Exit 0)！');
}

runTests().catch((err) => {
  console.error('❌ 測試失敗:', err);
  process.exit(1);
});

