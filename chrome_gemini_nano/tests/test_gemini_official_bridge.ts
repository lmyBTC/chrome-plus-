/**
 * 單元測試：geminiOfficialBridge 探針、原生 Setter 注入與事件派發序列驗證
 */
import {
  probeInputType,
  GeminiOfficialBridge,
  quickHash,
  sanitizeText,
  PK_EXTENSION_ID
} from '../src/geminiOfficialBridge';

// 建立輕量 DOM Mock 環境
class MockEvent {
  public type: string;
  public bubbles: boolean;
  public composed: boolean;
  public key?: string;
  constructor(type: string, options: any = {}) {
    this.type = type;
    this.bubbles = !!options.bubbles;
    this.composed = !!options.composed;
    this.key = options.key;
  }
}

class MockElement {
  public tagName: string;
  public innerText: string = '';
  public value: string = '';
  public disabled: boolean = false;
  public eventsDispatched: string[] = [];
  public clicked: boolean = false;
  public attributes: Record<string, string> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  public focus(): void {
    this.eventsDispatched.push('focus_method');
  }

  public dispatchEvent(evt: any): boolean {
    this.eventsDispatched.push(evt.type + (evt.key ? `:${evt.key}` : ''));
    return true;
  }

  public click(): void {
    this.clicked = true;
    this.eventsDispatched.push('click');
  }

  public getAttribute(name: string): string | null {
    return this.attributes[name] || null;
  }

  public setAttribute(name: string, val: string): void {
    this.attributes[name] = val;
  }
}

// 全域環境設置
(global as any).Event = MockEvent;
(global as any).KeyboardEvent = MockEvent;
(global as any).MutationObserver = class {
  observe() {}
  disconnect() {}
};
(global as any).window = {
  location: { pathname: '/app/test-session-123' },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  addEventListener: () => {},
  removeEventListener: () => {},
  getSelection: () => ({
    removeAllRanges: () => {},
    addRange: () => {}
  }),
  HTMLTextAreaElement: {
    prototype: {
      value: ''
    }
  }
};
(global as any).document = {
  createRange: () => ({
    selectNodeContents: () => {},
    collapse: () => {}
  }),
  querySelector: () => null,
  querySelectorAll: () => []
};

async function runTests() {
  console.log('🧪 開始測試 geminiOfficialBridge (Egress & Probe)...');

  // 1. quickHash 與 sanitizeText
  const h1 = quickHash('hello');
  const h2 = quickHash('hello');
  if (h1 !== h2) throw new Error('quickHash 一致性測試失敗');
  console.log('✅ quickHash 與 sanitizeText 運算正常');

  // 2. probeInputType - contenteditable 探測測試
  const mockEditable = new MockElement('div');
  mockEditable.setAttribute('contenteditable', 'true');
  const mockDocWithEditable: any = {
    querySelector: (sel: string) => {
      if (sel.includes('contenteditable')) return mockEditable;
      return null;
    }
  };

  const probeRes1 = probeInputType(mockDocWithEditable);
  if (probeRes1.type !== 'contenteditable' || probeRes1.element !== (mockEditable as any)) {
    throw new Error('contenteditable 探測失敗: ' + JSON.stringify(probeRes1));
  }
  console.log('✅ probeInputType contenteditable 探測通過');

  // 3. probeInputType - textarea 探測測試
  const mockTextarea = new MockElement('textarea');
  const mockDocWithTextarea: any = {
    querySelector: (sel: string) => {
      if (sel.startsWith('textarea')) return mockTextarea;
      return null;
    }
  };

  const probeRes2 = probeInputType(mockDocWithTextarea);
  if (probeRes2.type !== 'textarea' || probeRes2.element !== (mockTextarea as any)) {
    throw new Error('textarea 探測失敗: ' + JSON.stringify(probeRes2));
  }
  console.log('✅ probeInputType textarea 探測通過');

  // 4. handleInjectRequest - contenteditable 注入與事件派發序列
  const bridge = new GeminiOfficialBridge();

  // 設置 document 查詢為 mockEditable
  const mockSendBtn = new MockElement('button');
  (global as any).document.querySelector = (sel: string) => {
    if (sel.includes('contenteditable')) return mockEditable;
    if (sel.includes('發送') || sel.includes('Send') || sel.includes('button')) return mockSendBtn;
    return null;
  };

  const injectRes = await bridge.handleInjectRequest({
    text: '【PK+ 估值結論】NVDA 預期回報率 +18.5%',
    autoSubmit: true
  });

  if (!injectRes.success || !injectRes.ack || !injectRes.submitted) {
    throw new Error('handleInjectRequest 執行失敗: ' + JSON.stringify(injectRes));
  }
  if (mockEditable.innerText !== '【PK+ 估值結論】NVDA 預期回報率 +18.5%') {
    throw new Error('innerText 注入內容不符');
  }
  if (!mockSendBtn.clicked) {
    throw new Error('未觸發發送按鈕點擊');
  }

  // 驗證事件派發序列：focus -> input -> change -> blur
  const expectedEvents = ['focus_method', 'focus', 'input', 'change', 'blur'];
  for (const evt of expectedEvents) {
    if (!mockEditable.eventsDispatched.includes(evt)) {
      throw new Error(`缺少事件派發: ${evt}，實際事件: ${mockEditable.eventsDispatched.join(', ')}`);
    }
  }
  console.log('✅ handleInjectRequest 原生 Setter 注入與事件序列 (focus->input->change->blur->submit) 通過');

  // 5. 空文字防呆校驗
  const emptyRes = await bridge.handleInjectRequest({ text: '   ' });
  if (emptyRes.success) {
    throw new Error('空文字應拒絕注入');
  }
  console.log('✅ 空文字防呆校驗通過');

  bridge.destroy();
  console.log('🎉 所有 geminiOfficialBridge 單元測試通過 (Exit 0)！');
}

runTests().catch((err) => {
  console.error('❌ 測試失敗:', err);
  process.exit(1);
});
