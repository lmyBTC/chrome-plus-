/**
 * OfficialGeminiConnector.ts - PK+ (Power Kit) 官方 Gemini 側欄雙向橋接接收端
 * 
 * 核心職責：
 * 1. 寬容接收官方 Gemini 側欄廣播之對話事件 (GEMINI_OFFICIAL_SYNC)
 * 2. 實作 SHA-1 / 前 200 字 hash 比對防腐去重，杜絕串流重複寫入
 * 3. 維護與更新 chrome.storage.local 之 geminiConversations 歷史對話池
 * 4. 廣播對話變更事件至 PK+ Sidebar UI
 * 5. 提供回拋官方 Gemini 側欄之接口骨架 (Phase 4 深度實作)
 * 
 * 遵守規範：0.doc_mg/draft/gemini.md (v2.4.0) 與 3-Gate Protocol
 * 邊界隔離：嚴禁跨目錄直接 import chrome_gemini_nano 源碼
 */

// ==========================================
// 1. 契約型別宣告 (Protocol Types)
// ==========================================

export interface ReferencedTab {
  title: string;
  url: string;
}

export interface GeminiOfficialSyncPayload {
  sessionId: string;
  role: 'user' | 'model';
  text: string;
  modelName?: string;
  source?: string;
  referencedTabs?: ReferencedTab[];
  timestamp?: number;
}

export interface GeminiOfficialSyncMessage {
  protocolVersion?: number;
  type: 'GEMINI_OFFICIAL_SYNC';
  payload: GeminiOfficialSyncPayload;
}

export interface OfficialSyncResult {
  success: boolean;
  ack: boolean;
  deduped?: boolean;
  error?: string;
  sessionId?: string;
  messageCount?: number;
}

export interface StoredGeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface StoredGeminiConversation {
  id: string;
  title: string;
  messages: StoredGeminiMessage[];
  timestamp: number;
  source?: string;
  modelName?: string;
  referencedTabs?: ReferencedTab[];
}

export interface InjectToOfficialGeminiPayload {
  text: string;
  autoSubmit?: boolean;
  contextSource?: string;
  timestamp?: number;
}

export interface InjectToOfficialGeminiResponse {
  success: boolean;
  ack: boolean;
  injectedLength?: number;
  submitted?: boolean;
  error?: string;
  fallbackLevel?: number;
  message?: string;
  timestamp?: number;
}

// ==========================================
// 2. 工具函式：SHA-1 雜湊與降級計算
// ==========================================

/**
 * 具有超時熔斷保護的 Promise 包裝器
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 4000,
  timeoutMsg = '操作逾時'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${timeoutMsg} (${timeoutMs}ms)`));
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * 計算字串的 SHA-1 雜湊值 (若環境不支援 crypto.subtle 則降級為 FNV-1a)
 */
export async function computeSha1(text: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // 降級為 FNV-1a 輕量演算法
  }

  // FNV-1a 32-bit Fallback
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

// ==========================================
// 3. 核心類別：OfficialGeminiConnector
// ==========================================

export class OfficialGeminiConnector {
  private static instance: OfficialGeminiConnector | null = null;

  // 用於去重比對的雜湊快取：key 為 sessionId, value 為前次比對的 SHA-1 hash
  private lastSyncedHashMap: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): OfficialGeminiConnector {
    if (!OfficialGeminiConnector.instance) {
      OfficialGeminiConnector.instance = new OfficialGeminiConnector();
    }
    return OfficialGeminiConnector.instance;
  }

  /**
   * 清除內部去重快取 (供單元測試或特定重置情境)
   */
  public resetCache(): void {
    this.lastSyncedHashMap.clear();
  }

  /**
   * 核心接收處理：寬容讀者模式 + 去重防腐 + 歷史對話池更新
   */
  public async handleSync(rawPayload: any): Promise<OfficialSyncResult> {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return {
        success: false,
        ack: false,
        error: '無效的載荷資料 (Payload 必須為物件)'
      };
    }

    // 寬容讀者 (Tolerant Reader)：嚴格防禦性提取欄位與預設值
    const rawText = typeof rawPayload.text === 'string' ? rawPayload.text.trim() : '';
    if (!rawText) {
      return {
        success: false,
        ack: false,
        error: '對話文字不可為空'
      };
    }

    const sessionId = typeof rawPayload.sessionId === 'string' && rawPayload.sessionId.trim()
      ? rawPayload.sessionId.trim()
      : `gemini-session-${Math.floor(Date.now() / 1000)}`;

    const role: 'user' | 'model' = rawPayload.role === 'user' ? 'user' : 'model';
    const modelName = typeof rawPayload.modelName === 'string' ? rawPayload.modelName : 'Gemini';
    const source = typeof rawPayload.source === 'string' ? rawPayload.source : 'OFFICIAL_GEMINI_SIDEPANEL';
    const timestamp = typeof rawPayload.timestamp === 'number' && !isNaN(rawPayload.timestamp)
      ? rawPayload.timestamp
      : Date.now();

    // 寬容解析 referencedTabs：若缺失或非陣列自動降級為 []
    const referencedTabs: ReferencedTab[] = [];
    if (Array.isArray(rawPayload.referencedTabs)) {
      rawPayload.referencedTabs.forEach((tab: any) => {
        if (tab && typeof tab.url === 'string' && tab.url.trim()) {
          referencedTabs.push({
            title: typeof tab.title === 'string' && tab.title.trim() ? tab.title.trim() : tab.url.trim(),
            url: tab.url.trim()
          });
        }
      });
    }

    // ── 去重防腐檢驗 (SHA-1 over role + text 前 200 字) ──
    const prefixText = rawText.slice(0, 200);
    const hashTarget = `${role}:${prefixText}`;
    const currentHash = await computeSha1(hashTarget);

    const previousHash = this.lastSyncedHashMap.get(sessionId);
    if (previousHash === currentHash) {
      // 偵測到相同內容連發，寬容認可並去重略過，不重複寫入歷史對話池
      return {
        success: true,
        ack: true,
        deduped: true,
        sessionId
      };
    }

    // 更新去重快取 (維護容量上限 200 筆，避免長時間運行記憶體洩漏)
    if (this.lastSyncedHashMap.size > 200) {
      const oldestKey = this.lastSyncedHashMap.keys().next().value;
      if (oldestKey) this.lastSyncedHashMap.delete(oldestKey);
    }
    this.lastSyncedHashMap.set(sessionId, currentHash);

    // ── 寫入與更新 chrome.storage.local geminiConversations ──
    let totalMessages = 0;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const storageData = await chrome.storage.local.get('geminiConversations');
        const list: StoredGeminiConversation[] = Array.isArray(storageData.geminiConversations)
          ? storageData.geminiConversations
          : [];

        const targetIndex = list.findIndex((c) => c.id === sessionId);
        if (targetIndex > -1) {
          const conv = list[targetIndex];
          const lastMsg = conv.messages[conv.messages.length - 1];

          // 若最後一則訊息 role 相同且內容為前綴（串流累進），則直接更新該訊息
          if (lastMsg && lastMsg.role === role && rawText.startsWith(lastMsg.content)) {
            lastMsg.content = rawText;
          } else if (!lastMsg || lastMsg.role !== role || lastMsg.content !== rawText) {
            conv.messages.push({
              role,
              content: rawText
            });
          }

          conv.timestamp = timestamp;
          conv.modelName = modelName;
          if (referencedTabs.length > 0) {
            conv.referencedTabs = referencedTabs;
          }

          // 重新排序至首位
          list.splice(targetIndex, 1);
          list.unshift(conv);
          totalMessages = conv.messages.length;
        } else {
          // 新增對話
          const firstLine = rawText.split('\n')[0].trim();
          const title = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine || '官方 Gemini 對話';

          const newConv: StoredGeminiConversation = {
            id: sessionId,
            title,
            messages: [{ role, content: rawText }],
            timestamp,
            source,
            modelName,
            referencedTabs
          };

          list.unshift(newConv);
          totalMessages = 1;
        }

        // 維護對話池最大上限 50 筆
        if (list.length > 50) {
          list.pop();
        }

        await chrome.storage.local.set({ geminiConversations: list });

        // 廣播對話更新事件給開啟中的 UI (Sidebar / Popup)
        try {
          chrome.runtime.sendMessage({
            type: 'GEMINI_CONVERSATION_UPDATED',
            payload: {
              sessionId,
              role,
              text: rawText,
              messageCount: totalMessages,
              timestamp
            }
          }).catch(() => {
            // 若無前端頁面監聽則靜默略過
          });
        } catch {
          // 忽略無監聽者例外
        }
      }
    } catch (err: any) {
      console.error('[OfficialGeminiConnector] 儲存對話失敗:', err);
      return {
        success: false,
        ack: false,
        error: err?.message || '儲存對話時發生例外'
      };
    }

    return {
      success: true,
      ack: true,
      deduped: false,
      sessionId,
      messageCount: totalMessages
    };
  }

  /**
   * 回拋注入內容至官方 Gemini 側欄，具備三層降級保底機制：
   * 層級 1：向 gemini.google.com Tab 發送 INJECT_TO_OFFICIAL_GEMINI 訊息進行 DOM 原生注入 (帶 4000ms 熔斷)
   * 層級 2：本機微服務 (:8765) REST API 轉發
   * 層級 3：寫入系統剪貼簿 + 彈出 Chrome Notification 系統通知引導使用者手動貼上
   */
  public async injectToOfficialGemini(
    text: string,
    autoSubmit = true
  ): Promise<InjectToOfficialGeminiResponse> {
    if (!text || !text.trim()) {
      return {
        success: false,
        ack: false,
        error: '回拋內容不可為空'
      };
    }

    const trimmedText = text.trim();

    // ── 層級 1：向官方 Gemini / Workspace 側欄 Tab 發送 INJECT_TO_OFFICIAL_GEMINI ──
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        // 同時查詢 gemini.google.com 及包含 Workspace Ask Gemini 側欄的 Google 應用分頁
        const geminiTabs = await chrome.tabs.query({ url: '*://gemini.google.com/*' });
        const workspaceTabs = await chrome.tabs.query({ url: ['*://mail.google.com/*', '*://docs.google.com/*', '*://drive.google.com/*'] });
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });

        // 候選優先順序：使用中的 Active Tab (若在 Google 域名) > gemini.google.com > Workspace 標籤頁
        const candidateTabs: chrome.tabs.Tab[] = [];
        if (activeTabs.length > 0 && activeTabs[0].url && /google\.com/i.test(activeTabs[0].url)) {
          candidateTabs.push(activeTabs[0]);
        }
        geminiTabs.forEach(t => { if (!candidateTabs.some(c => c.id === t.id)) candidateTabs.push(t); });
        workspaceTabs.forEach(t => { if (!candidateTabs.some(c => c.id === t.id)) candidateTabs.push(t); });

        for (const targetTab of candidateTabs) {
          if (targetTab.id) {
            try {
              const sendPromise = chrome.tabs.sendMessage(targetTab.id, {
                protocolVersion: 2,
                type: 'INJECT_TO_OFFICIAL_GEMINI',
                payload: {
                  text: trimmedText,
                  autoSubmit,
                  contextSource: 'PK_PLUS',
                  timestamp: Date.now()
                }
              });

              const bridgeRes: any = await withTimeout(
                sendPromise,
                3000,
                '官方 Gemini 側欄 Content Script 回應超時'
              );

              if (bridgeRes && bridgeRes.success) {
                return {
                  success: true,
                  ack: true,
                  injectedLength: bridgeRes.injectedLength ?? trimmedText.length,
                  submitted: bridgeRes.submitted ?? autoSubmit,
                  fallbackLevel: 1,
                  timestamp: bridgeRes.timestamp ?? Date.now()
                };
              }
            } catch {
              // 該 tab 未注入或無回應，嘗試下一候選分頁
              continue;
            }
          }
        }
      }
    } catch (lvl1Err: any) {
      console.warn('[OfficialGeminiConnector] 層級 1 Web 注入失敗，準備進入層級 2 降級:', lvl1Err?.message);
    }

    // ── 層級 2：本機微服務 (:8765) REST API 轉發 ──
    try {
      if (typeof fetch !== 'undefined') {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 2000);

        const fetchPromise = fetch('http://127.0.0.1:8765/api/v1/gemini/inject', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmedText,
            autoSubmit,
            contextSource: 'PK_PLUS',
            timestamp: Date.now()
          }),
          signal: controller.signal
        }).then(async (res) => {
          clearTimeout(fetchTimeout);
          if (res.ok) {
            const data = await res.json();
            return { ok: true, data };
          }
          throw new Error(`微服務回應錯誤 HTTP ${res.status}`);
        }).catch(async () => {
          // 若 /api/v1 未開通，嘗試 /exec tool hub
          const execRes = await fetch('http://127.0.0.1:8765/exec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tool_name: 'gemini_inject',
              payload: { text: trimmedText, autoSubmit }
            }),
            signal: controller.signal
          });
          clearTimeout(fetchTimeout);
          if (execRes.ok) {
            const data = await execRes.json();
            return { ok: true, data };
          }
          throw new Error('微服務 /exec 未回應');
        });

        const lvl2Res = await withTimeout(fetchPromise, 2500, '本機微服務 (:8765) 超時');
        if (lvl2Res && lvl2Res.ok) {
          return {
            success: true,
            ack: true,
            injectedLength: trimmedText.length,
            submitted: false,
            fallbackLevel: 2,
            message: '已透過本機 :8765 微服務轉發成功',
            timestamp: Date.now()
          };
        }
      }
    } catch (lvl2Err: any) {
      console.warn('[OfficialGeminiConnector] 層級 2 微服務轉發失敗，進入層級 3 剪貼簿兜底:', lvl2Err?.message);
    }

    // ── 層級 3：剪貼簿與 Chrome Notification 兜底安全防線 ──
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmedText);
      }
    } catch (clipErr) {
      console.warn('[OfficialGeminiConnector] 寫入剪貼簿警示:', clipErr);
    }

    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '📋 已複製回拋內容至剪貼簿',
          message: '官方側欄目前無法直接注入，已將內容複製至剪貼簿，可直接在官方側欄按 Ctrl+V 貼上。'
        });
      } catch (notifErr) {
        console.warn('[OfficialGeminiConnector] 彈出通知警示:', notifErr);
      }
    }

    return {
      success: true,
      ack: true,
      injectedLength: trimmedText.length,
      submitted: false,
      fallbackLevel: 3,
      message: '已觸發層 3 降級：內容已複製至剪貼簿並彈出系統通知',
      timestamp: Date.now()
    };
  }

  /**
   * 取得儲存之官方對話歷史列表
   */
  public async getStoredConversations(): Promise<StoredGeminiConversation[]> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const data = await chrome.storage.local.get('geminiConversations');
        return Array.isArray(data.geminiConversations) ? data.geminiConversations : [];
      } catch (err) {
        console.warn('[OfficialGeminiConnector] 讀取官方對話失敗:', err);
      }
    }
    return [];
  }

  /**
   * 移除單筆官方對話
   */
  public async removeConversation(sessionId: string): Promise<boolean> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const list = await this.getStoredConversations();
        const filtered = list.filter((c) => c.id !== sessionId);
        await chrome.storage.local.set({ geminiConversations: filtered });
        return true;
      } catch (err) {
        console.warn('[OfficialGeminiConnector] 刪除官方對話失敗:', err);
      }
    }
    return false;
  }

  /**
   * 清空所有官方對話池
   */
  public async clearConversations(): Promise<boolean> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({ geminiConversations: [] });
        return true;
      } catch (err) {
        console.warn('[OfficialGeminiConnector] 清空官方對話失敗:', err);
      }
    }
    return false;
  }
}

