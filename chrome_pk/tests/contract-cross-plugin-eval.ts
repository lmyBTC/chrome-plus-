/**
 * contract-cross-plugin-eval.ts
 * 跨插件黑盒訊息契約與容錯機制自動化驗證工模
 * 
 * 測試範圍：
 * 1. DISPATCH_SOCIAL_POST 發送端防腐層過濾 (Anticorruption Sanitizer)
 * 2. DISPATCH_SOCIAL_POST 接收端容錯解析、Storage 存儲與 ACK 回執
 * 3. 接收端未安裝 (chrome.runtime.lastError) 之靜默降級驗證
 * 4. 連線逾時保護 (Timeout Guard / Circuit Breaker)
 * 5. 寬容讀者模式 (Tolerant Reader Pattern) 未知欄位容錯
 * 6. AI_GENERATE_FINANCE_SUMMARY 研報轉發與 Nano 推論異常防禦
 * 7. 通訊交握日誌標準化 (僅 Dev 模式輸出，Production 靜默)
 */

import {
  sendDirectMessage,
  sanitizeSocialPostPayload,
  dispatchSocialPostExternal,
  logContractDebug,
  isDevMode
} from '../src/shared/messaging/outboxQueue';

import {
  handleExternalMessage,
  handleDispatchSocialPostExternal
} from '../src/background/externalService';

// 建立可自訂的 Chrome Mock 環境
class MockChromeEnvironment {
  public storageState: Record<string, any> = {};
  public lastError: { message: string } | null = null;
  public messageDelayMs = 0;
  public mockReceiverResponse: any = null;
  public mockReceiverHang = false;
  public notifications: Array<{ title: string; message: string }> = [];

  public reset() {
    this.storageState = {};
    this.lastError = null;
    this.messageDelayMs = 0;
    this.mockReceiverResponse = null;
    this.mockReceiverHang = false;
    this.notifications = [];
  }

  public getChromeMock(): any {
    const self = this;
    return {
      runtime: {
        get lastError() {
          return self.lastError;
        },
        sendMessage: (targetId: string, message: any, callback?: (response: any) => void) => {
          if (self.mockReceiverHang) {
            // 模擬對端無回應 / 卡死
            return;
          }

          const execute = () => {
            if (callback) {
              callback(self.mockReceiverResponse);
            }
          };

          if (self.messageDelayMs > 0) {
            setTimeout(execute, self.messageDelayMs);
          } else {
            execute();
          }
        }
      },
      storage: {
        local: {
          get: async (keys: string | string[]) => {
            const keyList = Array.isArray(keys) ? keys : [keys];
            const result: Record<string, any> = {};
            for (const k of keyList) {
              if (k in self.storageState) {
                result[k] = self.storageState[k];
              }
            }
            return result;
          },
          set: async (items: Record<string, any>) => {
            Object.assign(self.storageState, items);
          }
        }
      },
      notifications: {
        create: (options: { title: string; message: string }) => {
          self.notifications.push({ title: options.title, message: options.message });
        }
      }
    };
  }
}

async function runContractTests() {
  console.log('🧪 開始執行跨插件黑盒訊息契約與容錯機制驗證 (Phase 2)...\n');

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

  const mockEnv = new MockChromeEnvironment();
  const originalChrome = (globalThis as any).chrome;
  (globalThis as any).chrome = mockEnv.getChromeMock();

  try {
    // -------------------------------------------------------------------------
    // 測試 1: 發送端防腐層過濾 (sanitizeSocialPostPayload)
    // -------------------------------------------------------------------------
    console.log('📌 測試 1: DISPATCH_SOCIAL_POST 發送端資料防腐層 (Anticorruption Sanitizer)');
    const dirtyPayload = {
      x_en: 'A'.repeat(1200), // 超長字串
      threads_zh: '繁中內容',
      originalTitle: '  台積電最新 CoWoS 產能估算報告  ',
      originalSummary: 'S'.repeat(2000), // 超長摘要
      sourceUrl: 'https://example.com/report',
      ticker: '  2330.tw  ',
      tags: ['#半導體', 12345, '  #AI晶片  ', null, undefined], // 包含髒資料型別
      sourcePlugin: 'FINANCE_CLIPPER',
      __internalState: { secret: 'do-not-leak' }, // 私有屬性
      domNode: { tagName: 'DIV' } // 不應傳遞的物件
    };

    const clean = sanitizeSocialPostPayload(dirtyPayload);
    assert(clean.x_en.length === 1000, 'x_en 成功被防腐層截斷至最大 1000 字元');
    assert(clean.originalSummary.length === 1500, 'originalSummary 成功截斷至最大 1500 字元');
    assert(clean.originalTitle === '台積電最新 CoWoS 產能估算報告', 'originalTitle 成功 trim 去除多餘空白');
    assert(clean.ticker === '2330.TW', 'ticker 自動轉大寫並 trim');
    assert(clean.tags.length === 2 && clean.tags.includes('#半導體') && clean.tags.includes('#AI晶片'), 'tags 過濾非字串並 trim 保留合法標籤');
    assert(!('__internalState' in clean), '私有屬性 __internalState 成功在防腐層剔除');
    assert(!('domNode' in clean), '非通訊屬性 domNode 成功剔除');
    assert(typeof clean.createdAt === 'number', '自動附帶合法 createdAt 時間戳');

    // -------------------------------------------------------------------------
    // 測試 2: 接收端未安裝插件 (lastError) 之靜默降級
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 2: 對端擴充功能未啟用或未安裝時之靜默降級 (Fault Sandbox)');
    mockEnv.reset();
    mockEnv.lastError = { message: 'Could not establish connection. Receiving end does not exist.' };

    const directResult = await sendDirectMessage(
      'non-existent-plugin-id',
      { type: 'DISPATCH_SOCIAL_POST', payload: clean },
      { timeoutMs: 1000 }
    );

    assert(directResult.success === false, '發送結果為 false');
    assert(directResult.ack === false, 'ack 為 false');
    assert(directResult.error?.includes('Receiving end does not exist'), '完整捕獲 lastError 錯誤訊息');

    // -------------------------------------------------------------------------
    // 測試 3: 發送逾時保險絲 (Timeout Guard / Circuit Breaker)
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 3: 通訊超時保險絲 (Timeout Guard 熔斷機制)');
    mockEnv.reset();
    mockEnv.mockReceiverHang = true; // 模擬對端掛起

    const startTime = Date.now();
    const timeoutResult = await sendDirectMessage(
      'hanging-extension-id',
      { type: 'DISPATCH_SOCIAL_POST', payload: clean },
      { timeoutMs: 300 }
    );
    const elapsed = Date.now() - startTime;

    assert(timeoutResult.success === false, '逾時回傳 success: false');
    assert(timeoutResult.error?.includes('連線逾時'), '錯誤包含連線逾時提示');
    assert(elapsed >= 280 && elapsed < 1000, `在指定時間 (約 300ms) 準確觸發熔斷 (實際歷時 ${elapsed}ms)`);

    // -------------------------------------------------------------------------
    // 測試 4: 接收端 DISPATCH_SOCIAL_POST 處理與寫入 Storage
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 4: 接收端 handleDispatchSocialPostExternal 契約解析與存儲');
    mockEnv.reset();

    const dispatchRes = await handleDispatchSocialPostExternal(clean, 'test-sender-plugin');
    assert(dispatchRes.success === true, '接收端回傳 success: true');
    assert(dispatchRes.ack === true, '接收端回傳 ack: true');
    assert(typeof dispatchRes.draftId === 'string' && dispatchRes.draftId.startsWith('draft-'), '生成標準 draftId');

    const draftsInStorage = mockEnv.storageState.socialDrafts;
    assert(Array.isArray(draftsInStorage) && draftsInStorage.length === 1, '成功寫入 chrome.storage.local 的 socialDrafts 清單');
    assert(draftsInStorage[0].ticker === '2330.TW', '儲存的草稿個股代號正確');
    assert(mockEnv.storageState.pendingSocialDraft?.id === dispatchRes.draftId, '同時更新 pendingSocialDraft 供側欄即時載入');
    assert(mockEnv.notifications.length === 1, '成功觸發系統桌面通知');

    // -------------------------------------------------------------------------
    // 測試 5: 寬容讀者模式 (Tolerant Reader Pattern) 未知欄位與缺漏容錯
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 5: 接收端寬容讀者模式 (未知欄位忽略 / 空欄位降級)');
    mockEnv.reset();

    const minimalPayload = {
      randomUnexpectedField: 'ignored',
      nestedUnknownObject: { a: 1 }
      // 沒有 title, 沒有 ticker, 沒有 summary
    };

    const tolerantRes = await handleDispatchSocialPostExternal(minimalPayload, 'unknown-sender');
    assert(tolerantRes.success === true, '缺漏或未知欄位時不拋錯，回傳 success: true');
    assert(mockEnv.storageState.socialDrafts[0].title === '未命名社群草稿', '缺漏標題自動兜底預設文字');

    // -------------------------------------------------------------------------
    // 測試 6: handleExternalMessage 整合分發測試
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 6: handleExternalMessage 整合分發 (PING / DISPATCH_SOCIAL_POST)');
    mockEnv.reset();

    let pingResponseData: any = null;
    const handledPing = handleExternalMessage(
      { type: 'PING' },
      { id: 'caller-plugin' } as any,
      (res) => { pingResponseData = res; }
    );
    assert(handledPing === false, 'PING 為同步回覆，回傳 false');
    assert(pingResponseData?.ack === true && pingResponseData?.available === true, 'PING 正確回傳 ACK');

    let dispatchResponseData: any = null;
    const handledDispatch = handleExternalMessage(
      { type: 'DISPATCH_SOCIAL_POST', payload: clean },
      { id: 'caller-plugin' } as any,
      (res) => { dispatchResponseData = res; }
    );
    assert(handledDispatch === true, 'DISPATCH_SOCIAL_POST 為非同步回覆，回傳 true 保持消息通道開放');

    // 等待非同步微任務完成
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert(dispatchResponseData?.success === true && dispatchResponseData?.ack === true, '非同步回覆成功收到 ACK');

    // -------------------------------------------------------------------------
    // 測試 7: AI_GENERATE_FINANCE_SUMMARY 缺少必要欄位防禦
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 7: AI_GENERATE_FINANCE_SUMMARY 缺少 ticker 時之防禦');
    let summaryFailResponse: any = null;
    handleExternalMessage(
      { type: 'AI_GENERATE_FINANCE_SUMMARY', payload: {} }, // 缺少 ticker
      { id: 'finance-clipper' } as any,
      (res) => { summaryFailResponse = res; }
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert(summaryFailResponse?.success === false, '缺少 ticker 時正確拒絕');
    assert(summaryFailResponse?.error?.includes('缺少必要的個股資料'), '包含明確友善錯誤提示');

    // -------------------------------------------------------------------------
    // 測試 8: 通訊交握日誌標準化 (isDevMode / 格式檢查)
    // -------------------------------------------------------------------------
    console.log('\n📌 測試 8: 通訊交握日誌標準化 (僅 Dev 模式輸出)');
    assert(typeof isDevMode === 'function', 'isDevMode 函式存在');
    // 攔截 console.log 驗證日誌格式
    const originalLog = console.log;
    let loggedMessage = '';
    console.log = (msg: any, ...args: any[]) => {
      loggedMessage = [msg, ...args].join(' ');
    };

    logContractDebug('SEND', 'DISPATCH_SOCIAL_POST', 'target-ext-id', { test: 123 });
    console.log = originalLog;

    assert(loggedMessage.includes('[Contract Debug]'), '日誌包含 [Contract Debug] 標籤');
    assert(loggedMessage.includes('[SEND]'), '日誌包含 [SEND] 通訊方向');
    assert(loggedMessage.includes('DISPATCH_SOCIAL_POST'), '日誌包含協定類型');

  } finally {
    (globalThis as any).chrome = originalChrome;
  }

  console.log(`\n======================================`);
  console.log(`📊 契約驗證完成: ${passed} / ${total} 通過 (${Math.round((passed / total) * 100)}%)`);
  console.log(`======================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runContractTests().catch((err) => {
  console.error('契約測試執行發生嚴重錯誤:', err);
  process.exit(1);
});
