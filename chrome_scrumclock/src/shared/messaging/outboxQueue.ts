/**
 * outboxQueue.ts - Chrome Plus 極簡直連通訊器 (Direct Messenger)
 * 
 * 遵循極簡主義與反過度工程原則，徹底廢除 Outbox 本地 Storage 佇列與死信輪詢，
 * 全面回歸 Chrome 原生 chrome.runtime.sendMessage 直連與事件驅動架構。
 */

export interface DirectSendResponse {
  success: boolean;
  ack?: boolean;
  data?: any;
  error?: string;
  queued?: boolean;
}

/**
 * 環境判定：非生產環境啟用契約交握日誌
 */
export function isDevMode(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return false;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD) return false;
  return true;
}

/**
 * 跨插件通訊交握標準化日誌 (僅於 Dev 模式輸出)
 */
export function logContractDebug(
  direction: 'SEND' | 'RECV' | 'FALLBACK' | 'ACK',
  type: string,
  targetOrSender: string,
  data?: any
): void {
  if (!isDevMode()) return;
  const time = new Date().toISOString().substring(11, 19);
  const snippet = data ? (typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 200) : '';
  console.log(`[Contract Debug][${time}][${direction}] ${type} -> ${targetOrSender} ${snippet}`);
}

/**
 * 社群貼文草稿資料防腐層 (Anticorruption Sanitizer)
 * 剔除自訂未知屬性、循環引用與 DOM 物件，確保符合 cross_plugin_contract.md 規範
 */
export function sanitizeSocialPostPayload(payload: any): Record<string, any> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload 必須為非空物件');
  }

  const clean: Record<string, any> = {};

  if (typeof payload.x_en === 'string') {
    clean.x_en = payload.x_en.slice(0, 1000);
  }
  if (typeof payload.threads_zh === 'string') {
    clean.threads_zh = payload.threads_zh.slice(0, 2000);
  }

  const rawTitle = typeof payload.originalTitle === 'string' ? payload.originalTitle.trim() : '';
  clean.originalTitle = rawTitle.slice(0, 200) || '未命名社群草稿';

  if (typeof payload.originalSummary === 'string') {
    clean.originalSummary = payload.originalSummary.slice(0, 1500);
  }
  if (typeof payload.sourceUrl === 'string') {
    clean.sourceUrl = payload.sourceUrl.slice(0, 500);
  }
  if (typeof payload.ticker === 'string' && payload.ticker.trim()) {
    clean.ticker = payload.ticker.trim().toUpperCase().slice(0, 20);
  }
  if (Array.isArray(payload.tags)) {
    clean.tags = payload.tags
      .filter((t: any) => typeof t === 'string' && t.trim())
      .map((t: string) => t.trim().slice(0, 50))
      .slice(0, 10);
  }
  clean.sourcePlugin = typeof payload.sourcePlugin === 'string' && payload.sourcePlugin.trim()
    ? payload.sourcePlugin.trim().slice(0, 50)
    : 'SCRUMCLOCK';

  clean.createdAt = typeof payload.createdAt === 'number' && Number.isFinite(payload.createdAt)
    ? payload.createdAt
    : Date.now();

  return clean;
}

/**
 * 原生直連發送器 (sendDirectMessage)
 * 帶有逾時保護與錯誤攔截，直接通知呼叫端結果，不寫入本地 Storage，不背景輪詢。
 */
export function sendDirectMessage(
  targetExtensionId: string,
  message: { type: string; payload?: any; protocolVersion?: number },
  options?: { timeoutMs?: number; [key: string]: any }
): Promise<DirectSendResponse> {
  const timeoutMs = options?.timeoutMs ?? 4000;
  logContractDebug('SEND', message.type, targetExtensionId, message.payload);

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logContractDebug('FALLBACK', message.type, targetExtensionId, `連線逾時 (${timeoutMs}ms)`);
        resolve({
          success: false,
          ack: false,
          error: `連線逾時 (${timeoutMs}ms)`
        });
      }
    }, timeoutMs);

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          logContractDebug('FALLBACK', message.type, targetExtensionId, '環境不支援 chrome.runtime.sendMessage');
          resolve({
            success: false,
            ack: false,
            error: '環境不支援 chrome.runtime.sendMessage'
          });
        }
        return;
      }

      chrome.runtime.sendMessage(
        targetExtensionId,
        {
          ...message,
          protocolVersion: message.protocolVersion || 2,
          timestamp: Date.now()
        },
        (response) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);

          if (chrome.runtime.lastError) {
            const lastErrMsg = chrome.runtime.lastError.message || '接收端擴充功能未啟用或連線被拒';
            logContractDebug('FALLBACK', message.type, targetExtensionId, lastErrMsg);
            resolve({
              success: false,
              ack: false,
              error: lastErrMsg
            });
            return;
          }

          if (response && (response.success === true || response.ack === true)) {
            logContractDebug('ACK', message.type, targetExtensionId, response);
            resolve({
              success: true,
              ack: true,
              data: response
            });
          } else {
            const err = response?.error || '接收端回傳失敗或未包含有效 ACK';
            logContractDebug('FALLBACK', message.type, targetExtensionId, err);
            resolve({
              success: false,
              ack: false,
              error: err
            });
          }
        }
      );
    } catch (e: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        logContractDebug('FALLBACK', message.type, targetExtensionId, e?.message || '發送異常');
        resolve({
          success: false,
          ack: false,
          error: e?.message || '發送異常'
        });
      }
    }
  });
}

/**
 * 透過黑盒契約發送社群貼文草稿至外部插件（如 Gemini Nano 插件）
 * 發送前執行資料防腐消毒，確保安全不拋錯
 */
export async function dispatchSocialPostExternal(
  targetExtensionId: string,
  rawPayload: any,
  options?: { timeoutMs?: number }
): Promise<DirectSendResponse> {
  try {
    const cleanPayload = sanitizeSocialPostPayload(rawPayload);
    return await sendDirectMessage(
      targetExtensionId,
      {
        protocolVersion: 2,
        type: 'DISPATCH_SOCIAL_POST',
        payload: cleanPayload
      },
      options
    );
  } catch (err: any) {
    return {
      success: false,
      ack: false,
      error: `防腐層校驗失敗: ${err?.message || '未知格式異常'}`
    };
  }
}

/**
 * 向下相容別名，內部直接調用 sendDirectMessage
 */
export const sendMessageWithOutbox = sendDirectMessage;
