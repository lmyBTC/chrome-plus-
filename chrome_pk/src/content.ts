(function () {
  // 左側停靠抽屜 (In-Page Left-Docked Sidebar) 控制器
  class InPageSidebar {
    private host: HTMLElement | null = null;
    private shadow: ShadowRoot | null = null;
    private drawer: HTMLElement | null = null;
    private toggleBtn: HTMLElement | null = null;
    private isOpen: boolean = false;
    private originalHtmlMargin: string = '';
    private originalHtmlWidth: string = '';
    private originalHtmlTransition: string = '';
    private width: number = 380;

    constructor() {
      this.init();
    }

    private init() {
      if (document.getElementById('pk-inpage-sidebar-host')) return;

      this.host = document.createElement('div');
      this.host.id = 'pk-inpage-sidebar-host';
      this.host.style.all = 'initial';
      this.host.style.position = 'fixed';
      this.host.style.top = '0';
      this.host.style.left = '0';
      this.host.style.width = '0';
      this.host.style.height = '100vh';
      this.host.style.zIndex = '2147483646';
      this.host.style.pointerEvents = 'none';

      this.shadow = this.host.attachShadow({ mode: 'open' });

      // Shadow DOM 內部隔離樣式
      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
        }
        .pk-drawer {
          position: fixed;
          top: 0;
          left: -${this.width}px;
          width: ${this.width}px;
          height: 100vh;
          background: #ffffff;
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          box-sizing: border-box;
          z-index: 2147483646;
        }
        .pk-drawer.open {
          transform: translateX(${this.width}px);
        }
        .pk-iframe {
          width: 100%;
          height: 100%;
          border: none;
          flex: 1;
          background: #ffffff;
        }
        .pk-handle {
          position: absolute;
          top: 48%;
          right: -24px;
          width: 24px;
          height: 52px;
          background: #3b82f6;
          color: #ffffff;
          border-radius: 0 8px 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 3px 0 8px rgba(0, 0, 0, 0.15);
          user-select: none;
          pointer-events: auto;
          transition: background 0.2s, transform 0.2s;
        }
        .pk-handle:hover {
          background: #2563eb;
          transform: scale(1.05);
        }
        .pk-handle svg {
          width: 14px;
          height: 14px;
          transition: transform 0.28s ease;
          fill: currentColor;
        }
        .pk-handle.open svg {
          transform: rotate(180deg);
        }
      `;

      // 抽屜容器
      this.drawer = document.createElement('div');
      this.drawer.className = 'pk-drawer';

      // 把手按鈕 (安全 DOM 建構，無 innerHTML)
      this.toggleBtn = document.createElement('div');
      this.toggleBtn.className = 'pk-handle';
      this.toggleBtn.title = '切換 PK+ 工作側欄 (左側)';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z');
      svg.appendChild(path);
      this.toggleBtn.appendChild(svg);

      this.toggleBtn.addEventListener('click', () => {
        this.toggle();
      });

      // iframe 載入 PK+ 側欄
      const iframe = document.createElement('iframe');
      iframe.className = 'pk-iframe';
      iframe.src = chrome.runtime.getURL('src/entries/sidebar/index.html');
      iframe.allow = 'clipboard-read; clipboard-write';

      this.drawer.appendChild(this.toggleBtn);
      this.drawer.appendChild(iframe);

      this.shadow.appendChild(style);
      this.shadow.appendChild(this.drawer);

      const mount = () => {
        if (document.body) {
          document.body.appendChild(this.host!);
        } else if (document.documentElement) {
          document.documentElement.appendChild(this.host!);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
      } else {
        mount();
      }

      // 監聽 iframe 內部通知 (如使用者點擊側欄內關閉)
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'PK_INPAGE_SIDEBAR_CLOSE') {
          this.close();
        }
      });
    }

    public open() {
      if (this.isOpen) return;
      this.isOpen = true;
      if (this.drawer) this.drawer.classList.add('open');
      if (this.toggleBtn) this.toggleBtn.classList.add('open');

      // 網頁推擠自適應 (Push Page Margin & Width)
      const docEl = document.documentElement;
      this.originalHtmlMargin = docEl.style.marginLeft || '';
      this.originalHtmlWidth = docEl.style.width || '';
      this.originalHtmlTransition = docEl.style.transition || '';

      docEl.style.transition = 'margin-left 0.28s cubic-bezier(0.16, 1, 0.3, 1), width 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
      docEl.style.marginLeft = `${this.width}px`;
      docEl.style.width = `calc(100% - ${this.width}px)`;
    }

    public close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      if (this.drawer) this.drawer.classList.remove('open');
      if (this.toggleBtn) this.toggleBtn.classList.remove('open');

      const docEl = document.documentElement;
      docEl.style.marginLeft = this.originalHtmlMargin;
      docEl.style.width = this.originalHtmlWidth;

      setTimeout(() => {
        if (!this.isOpen) {
          docEl.style.transition = this.originalHtmlTransition;
        }
      }, 300);
    }

    public toggle(): boolean {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
      return this.isOpen;
    }

    public getStatus(): boolean {
      return this.isOpen;
    }
  }

  // 初始化單例
  const inPageSidebar = new InPageSidebar();

  // 監聽來自 background script 或側邊欄的消息
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (message.type === 'TOGGLE_PK_INPAGE_SIDEBAR' || message.action === 'TOGGLE_PK_INPAGE_SIDEBAR') {
      const isOpen = inPageSidebar.toggle();
      sendResponse({ success: true, isOpen });
      return true;
    } else if (message.type === 'OPEN_PK_INPAGE_SIDEBAR' || message.action === 'OPEN_PK_INPAGE_SIDEBAR') {
      inPageSidebar.open();
      sendResponse({ success: true, isOpen: true });
      return true;
    } else if (message.type === 'CLOSE_PK_INPAGE_SIDEBAR' || message.action === 'CLOSE_PK_INPAGE_SIDEBAR') {
      inPageSidebar.close();
      sendResponse({ success: true, isOpen: false });
      return true;
    } else if (message.type === 'GET_PK_SIDEBAR_STATUS' || message.action === 'GET_PK_SIDEBAR_STATUS') {
      sendResponse({ success: true, isOpen: inPageSidebar.getStatus() });
      return true;
    } else if (message.type === 'ADD_FOCUS_OVERLAY') {
      addFocusOverlay();
      sendResponse({ success: true });
    } else if (message.type === 'REMOVE_FOCUS_OVERLAY') {
      removeFocusOverlay();
      sendResponse({ success: true });
    } else if (message.action === 'GET_CURRENT_TASKS') {
      const selectedText = window.getSelection()?.toString().trim() || '';
      sendResponse({
        title: document.title,
        selectedText: selectedText,
        url: window.location.href
      });
    }
  });

  // 添加專注覆蓋
  function addFocusOverlay() {
    if (document.getElementById('focus-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'focus-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    
    const contentBox = document.createElement('div');
    
    const title = document.createElement('h1');
    title.style.cssText = 'font-size: 2rem; margin-bottom: 1rem;';
    title.textContent = '🚀 正在衝刺中';

    const p1 = document.createElement('p');
    p1.style.cssText = 'font-size: 1.2rem; margin-bottom: 1rem;';
    p1.textContent = '保持專注，完成你的核心戰役！';

    const p2 = document.createElement('p');
    p2.style.cssText = 'font-size: 1rem; opacity: 0.8;';
    p2.textContent = '衝刺結束後即可正常瀏覽';

    contentBox.appendChild(title);
    contentBox.appendChild(p1);
    contentBox.appendChild(p2);
    overlay.appendChild(contentBox);
    
    document.body.appendChild(overlay);
  }

  // 移除專注覆蓋
  function removeFocusOverlay() {
    const overlay = document.getElementById('focus-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
})();
