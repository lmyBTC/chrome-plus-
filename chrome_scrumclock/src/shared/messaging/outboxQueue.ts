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
 * 原生直連發送器 (sendDirectMessage)
 * 帶有逾時保護與錯誤攔截，直接通知呼叫端結果，不寫入本地 Storage，不背景輪詢。
 */
export function sendDirectMessage(
  targetExtensionId: string,
  message: { type: string; payload?: any; protocolVersion?: number },
  options?: { timeoutMs?: number; [key: string]: any }
): Promise<DirectSendResponse> {
  const timeoutMs = options?.timeoutMs ?? 4000;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
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
            resolve({
              success: false,
              ack: false,
              error: chrome.runtime.lastError.message || '接收端擴充功能未啟用或連線被拒'
            });
            return;
          }

          if (response && (response.success === true || response.ack === true)) {
            resolve({
              success: true,
              ack: true,
              data: response
            });
          } else {
            resolve({
              success: false,
              ack: false,
              error: response?.error || '接收端回傳失敗或未包含有效 ACK'
            });
          }
        }
      );
    } catch (e: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
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
 * 向下相容別名，內部直接調用 sendDirectMessage
 */
export const sendMessageWithOutbox = sendDirectMessage;
