/**
 * Google Official Gemini Side Panel Bridge (Content Script)
 * 職責：監聽 gemini.google.com DOM 串流輸出，經過 800ms 防抖與雜訊過濾後，
 * 透過 chrome.runtime.sendMessage 廣播 GEMINI_OFFICIAL_SYNC 訊息至 PK+ (chrome_pk)。
 * 
 * 遵守規格書：0.doc_mg/docs/spec-official-gemini-bridge.md (v2.4.0)
 * 插件隔離：嚴禁引用或跨目錄 import chrome_pk 原始碼。
 */

// ==========================================
// 1. 常數與型別宣告
// ==========================================

export const PK_EXTENSION_ID = 'ahiihabnbjeoeneahcgbdcofncjoclcp';
export const DEBOUNCE_DELAY_MS = 800;
export const PROTOCOL_VERSION = 2;
export const SOURCE_TAG = 'OFFICIAL_GEMINI_SIDEPANEL';

export interface ReferencedTab {
  title: string;
  url: string;
}

export interface GeminiOfficialSyncPayload {
  sessionId: string;
  role: 'user' | 'model';
  text: string;
  modelName: string;
  source: string;
  referencedTabs?: ReferencedTab[];
  timestamp: number;
}

export interface GeminiOfficialSyncMessage {
  protocolVersion: number;
  type: 'GEMINI_OFFICIAL_SYNC';
  payload: GeminiOfficialSyncPayload;
}

export interface InjectToOfficialGeminiPayload {
  text: string;
  autoSubmit?: boolean;
  contextSource?: string;
  timestamp?: number;
}

export interface InjectToOfficialGeminiMessage {
  protocolVersion?: number;
  type: 'INJECT_TO_OFFICIAL_GEMINI';
  payload: InjectToOfficialGeminiPayload;
}

export interface InjectResponseReceipt {
  success: boolean;
  ack: boolean;
  injectedLength?: number;
  submitted?: boolean;
  error?: string;
  timestamp: number;
}

export type InputType = 'contenteditable' | 'textarea' | 'none';

export interface ProbeInputResult {
  type: InputType;
  element: HTMLElement | null;
}

// ==========================================
// 2. 工具函式：去重 Hash 與雜訊過濾
// ==========================================

/**
 * 簡易非加密 32-bit FNV-1a Hash 函式，用於快速比較字串變更去重
 */
export function quickHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * 過濾免責聲明與操作按鈕文字雜訊
 */
export function sanitizeText(rawText: string): string {
  if (!rawText) return '';

  let sanitized = rawText;

  // 常見免責聲明樣式過濾 (支援中英雙語)
  const disclaimerRegexes = [
    /Gemini (?:顯示的資訊可能不正確|可能會顯示不準確的資訊|may display inaccurate info).*?(?:請務必查證|double-check)/gi,
    /Gemini 顯示的資訊可能不正確，包括有關使用者的資訊，因此請務必查證其回答。/g,
    /Gemini may display inaccurate info, including about people, so double-check its responses\./gi,
  ];

  for (const reg of disclaimerRegexes) {
    sanitized = sanitized.replace(reg, '');
  }

  // 移除多餘空白與行首行尾雜訊
  return sanitized
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 從 DOM 節點提取乾淨文本（自動剔除 button、icon、action 等雜訊節點）
 */
export function extractCleanText(element: Element): string {
  try {
    const clone = element.cloneNode(true) as Element;

    // 移除常見的雜訊標籤與按鈕容器
    const noiseSelectors = [
      'button',
      '[role="button"]',
      'mat-icon',
      '.mat-icon',
      '.response-actions',
      '.action-buttons',
      '.disclaimer',
      '[aria-label*="複製"]',
      '[aria-label*="Copy"]',
      '[aria-label*="讚"]',
      '[aria-label*="Good response"]',
      '[aria-label*="Bad response"]',
      '[aria-label*="分享"]',
      '[aria-label*="Share"]',
      '[aria-label*="更多"]',
      '[aria-label*="More"]',
    ];

    noiseSelectors.forEach((selector) => {
      clone.querySelectorAll(selector).forEach((node) => node.remove());
    });

    const raw = (clone as HTMLElement).innerText || clone.textContent || '';
    return sanitizeText(raw);
  } catch {
    return sanitizeText((element as HTMLElement).innerText || element.textContent || '');
  }
}

/**
 * 提取參考引用來源或標籤頁
 */
export function extractReferencedTabs(container: Element): ReferencedTab[] {
  const tabs: ReferencedTab[] = [];
  try {
    const links = container.querySelectorAll<HTMLAnchorElement>('a[href^="http"]');
    links.forEach((a) => {
      const url = a.href;
      const title = a.innerText.trim() || a.title.trim() || url;
      // 避免重複加入相同網址
      if (url && !tabs.some((t) => t.url === url)) {
        tabs.push({ title, url });
      }
    });
  } catch (err) {
    console.warn('[GeminiOfficialBridge] Failed to extract referenced tabs:', err);
  }
  return tabs;
}

/**
 * 探勘當前會話 ID
 */
export function detectSessionId(): string {
  try {
    // 優先從網址讀取對話 ID (例如 https://gemini.google.com/app/1234567890abcdef)
    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `gemini-session-${match[1]}`;
    }
  } catch {
    // fallback
  }
  return `gemini-session-${Math.floor(Date.now() / 1000)}`;
}

/**
 * 探勘當前模型名稱
 */
export function detectModelName(): string {
  try {
    // 檢查常見的模型標籤或切換器元素
    const modelPill = document.querySelector('[data-test-id*="model-picker"], [aria-label*="模型"], [aria-label*="Model"]');
    if (modelPill && modelPill.textContent) {
      const text = modelPill.textContent.trim();
      if (text.includes('Advanced') || text.includes('Pro')) return 'Gemini-Pro';
      if (text.includes('Flash-Lite') || text.includes('Flash')) return 'Flash-Lite';
    }
  } catch {
    // fallback
  }
  return 'Flash-Lite';
}

/**
 * 探測官方 Gemini 輸入框元素型態與節點
 */
export function probeInputType(root: Document | Element = document): ProbeInputResult {
  // 1. 探索富文字輸入區 contenteditable
  const richTextCandidates = [
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"]'
  ];
  for (const sel of richTextCandidates) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) {
      return { type: 'contenteditable', element: el };
    }
  }

  // 2. 探索 textarea 元素
  const textareaCandidates = [
    'textarea[aria-label]',
    'textarea[placeholder]',
    'textarea'
  ];
  for (const sel of textareaCandidates) {
    const el = root.querySelector<HTMLTextAreaElement>(sel);
    if (el) {
      return { type: 'textarea', element: el };
    }
  }

  return { type: 'none', element: null };
}

// ==========================================
// 3. 核心類別：GeminiOfficialBridge
// ==========================================

export class GeminiOfficialBridge {
  private lastSyncedHash: string = '';
  private debounceTimer: number | null = null;
  private observer: MutationObserver | null = null;
  private isObserving: boolean = false;
  private currentSessionId: string = detectSessionId();
  private messageListener: ((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean) | null = null;

  constructor() {
    this.initObserver();
    this.initMessageListener();
  }

  /**
   * 廣播訊息至 PK+ 插件
   */
  public async broadcastToPK(payload: GeminiOfficialSyncPayload): Promise<boolean> {
    const message: GeminiOfficialSyncMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'GEMINI_OFFICIAL_SYNC',
      payload,
    };

    return new Promise<boolean>((resolve) => {
      try {
        if (!chrome?.runtime?.sendMessage) {
          console.warn('[GeminiOfficialBridge] chrome.runtime.sendMessage is not available.');
          resolve(false);
          return;
        }

        chrome.runtime.sendMessage(PK_EXTENSION_ID, message, (response) => {
          if (chrome.runtime.lastError) {
            // PK+ 可能未安裝或未啟動，以 debug 級別記錄避免洗版
            console.debug('[GeminiOfficialBridge] Broadcast to PK+ skipped or failed:', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          console.log('[GeminiOfficialBridge] Broadcast GEMINI_OFFICIAL_SYNC success:', response);
          resolve(true);
        });
      } catch (err) {
        console.warn('[GeminiOfficialBridge] Unexpected error in broadcastToPK:', err);
        resolve(false);
      }
    });
  }

  /**
   * 防抖提取最新回覆並發送
   */
  private handleDOMMutation(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      this.extractAndSync();
    }, DEBOUNCE_DELAY_MS);
  }

  /**
   * 提取最新模型回覆並廣播
   */
  public extractAndSync(): void {
    try {
      // 尋找對話中所有模型回覆節點
      // gemini.google.com 常見選擇器：message-content, model-response, [data-message-author-role="model"], .model-response-text
      const candidateSelectors = [
        '[data-message-author-role="model"]',
        'message-content.model-content',
        'model-response',
        '.model-response-text',
        '.response-content',
        'main [role="article"]',
      ];

      let modelNodes: Element[] = [];
      for (const selector of candidateSelectors) {
        const nodes = Array.from(document.querySelectorAll(selector));
        if (nodes.length > 0) {
          modelNodes = nodes;
          break;
        }
      }

      // 如果特定選擇器未命中，尋找包含對話內容的主容器
      if (modelNodes.length === 0) {
        const articles = Array.from(document.querySelectorAll('main div[role="presentation"], main article'));
        if (articles.length > 0) {
          modelNodes = articles;
        }
      }

      if (modelNodes.length === 0) {
        return;
      }

      // 取最後一個（最新的一個）回覆節點
      const latestNode = modelNodes[modelNodes.length - 1];
      const cleanText = extractCleanText(latestNode);

      if (!cleanText || cleanText.length < 2) {
        return;
      }

      // 計算雜湊值以避免重複同步
      const contentHash = quickHash(cleanText);
      if (contentHash === this.lastSyncedHash) {
        return;
      }

      this.lastSyncedHash = contentHash;
      const referencedTabs = extractReferencedTabs(latestNode);
      const modelName = detectModelName();
      const sessionId = detectSessionId();

      const payload: GeminiOfficialSyncPayload = {
        sessionId: sessionId || this.currentSessionId,
        role: 'model',
        text: cleanText,
        modelName,
        source: SOURCE_TAG,
        referencedTabs,
        timestamp: Date.now(),
      };

      console.log('[GeminiOfficialBridge] Extracted new model response, broadcasting to PK+...');
      this.broadcastToPK(payload);
    } catch (err) {
      console.error('[GeminiOfficialBridge] Error during extractAndSync:', err);
    }
  }

  /**
   * 初始化 DOM 監聽器 (MutationObserver)
   */
  public initObserver(): void {
    if (this.isObserving) return;
    if (typeof MutationObserver === 'undefined') return;

    this.observer = new MutationObserver((mutations) => {
      // 快速過濾純 class/attribute 小異動，專注於 childList 或文字變化
      let hasRelevantChange = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          hasRelevantChange = true;
          break;
        }
      }

      if (hasRelevantChange) {
        this.handleDOMMutation();
      }
    });

    const targetNode = document.querySelector('main') || document.body;
    if (targetNode) {
      this.observer.observe(targetNode, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      this.isObserving = true;
      console.log('[GeminiOfficialBridge] Observer attached to', targetNode.tagName);
    } else if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      // 若尚未載入完成，等待 DOMContentLoaded
      window.addEventListener(
        'DOMContentLoaded',
        () => {
          this.initObserver();
        },
        { once: true }
      );
    }
  }

  /**
   * 初始化外部注入訊息監聽 (chrome.runtime.onMessage)
   */
  public initMessageListener(): void {
    if (this.messageListener !== null) return;

    if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
      this.messageListener = (message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        if (message && message.type === 'INJECT_TO_OFFICIAL_GEMINI') {
          console.log('[GeminiOfficialBridge] 收到注入請求:', message);
          this.handleInjectRequest(message.payload)
            .then((res) => sendResponse(res))
            .catch((err) =>
              sendResponse({
                success: false,
                ack: true,
                error: err?.message || '注入過程發生例外',
                timestamp: Date.now()
              })
            );
          return true; // 非同步響應
        }
        return false;
      };

      chrome.runtime.onMessage.addListener(this.messageListener);
      console.log('[GeminiOfficialBridge] Runtime message listener registered.');
    }
  }

  /**
   * 處理來自外部或中樞的注入請求 (INJECT_TO_OFFICIAL_GEMINI)
   * 遵循三步：探針識別 ➔ 原生 Setter 注入與事件派發序列 ➔ 安全延遲發送
   */
  public async handleInjectRequest(payload: InjectToOfficialGeminiPayload): Promise<InjectResponseReceipt> {
    if (!payload || !payload.text || !payload.text.trim()) {
      return {
        success: false,
        ack: true,
        error: '回拋內容不可為空',
        timestamp: Date.now()
      };
    }

    const { type, element } = probeInputType();
    if (type === 'none' || !element) {
      console.warn('[GeminiOfficialBridge] 未找到官方 Gemini 輸入框節點');
      return {
        success: false,
        ack: true,
        error: '未找到官方 Gemini 輸入框節點',
        timestamp: Date.now()
      };
    }

    try {
      const injectText = payload.text;
      element.focus();

      if (type === 'contenteditable') {
        const ceEl = element as HTMLElement;
        ceEl.innerText = injectText;

        // 將光標移至文本末尾
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(ceEl);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (selErr) {
          console.warn('[GeminiOfficialBridge] 光標定位警告:', selErr);
        }
      } else if (type === 'textarea') {
        const taEl = element as HTMLTextAreaElement;
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(taEl, injectText);
        } else {
          taEl.value = injectText;
        }
      }

      // 事件派發序列 (Event Dispatch Sequence)
      element.dispatchEvent(new Event('focus', { bubbles: true }));
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      let submitted = false;
      const shouldAutoSubmit = payload.autoSubmit !== false;

      if (shouldAutoSubmit) {
        // 安全延遲發送 (等待框架狀態同步就緒)
        await new Promise((resolve) => setTimeout(resolve, 160));

        const sendButtonCandidates = [
          'button[aria-label*="發送"]',
          'button[aria-label*="傳送"]',
          'button[aria-label*="Send"]',
          'button[aria-label*="Submit"]',
          'button.send-button',
          'rich-textarea ~ button',
          'button[type="submit"]'
        ];

        for (const sel of sendButtonCandidates) {
          const btn = document.querySelector<HTMLButtonElement>(sel);
          if (btn && !btn.disabled) {
            btn.click();
            submitted = true;
            break;
          }
        }

        if (!submitted) {
          // 回退派發 Enter 鍵
          element.focus();
          const enterKeyDown = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          element.dispatchEvent(enterKeyDown);
          const enterKeyUp = new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true
          });
          element.dispatchEvent(enterKeyUp);
          submitted = true;
        }
      }

      console.log(`[GeminiOfficialBridge] 成功注入文字 (${injectText.length} 字)，autoSubmit=${shouldAutoSubmit}`);

      return {
        success: true,
        ack: true,
        injectedLength: injectText.length,
        submitted,
        timestamp: Date.now()
      };
    } catch (err: any) {
      console.error('[GeminiOfficialBridge] 注入過程發生例外:', err);
      return {
        success: false,
        ack: true,
        error: err?.message || '注入過程發生例外',
        timestamp: Date.now()
      };
    }
  }

  /**
   * 釋放資源與卸載監聽
   */
  public destroy(): void {
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.messageListener && typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    this.isObserving = false;
    console.log('[GeminiOfficialBridge] Destroyed.');
  }
}

// ==========================================
// 4. Content Script 自啟動與單例防護
// ==========================================

declare global {
  interface Window {
    __gemini_official_bridge_instance__?: GeminiOfficialBridge;
  }
}

export function startBridge(): GeminiOfficialBridge {
  if (window.__gemini_official_bridge_instance__) {
    console.log('[GeminiOfficialBridge] Instance already exists, skipping initialization.');
    return window.__gemini_official_bridge_instance__;
  }

  const bridge = new GeminiOfficialBridge();
  window.__gemini_official_bridge_instance__ = bridge;
  return bridge;
}

// 僅在瀏覽器環境自動自啟動
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  startBridge();
}
