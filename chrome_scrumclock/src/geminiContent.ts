import { GeminiMessage, GeminiConversation, GeminiWidgetState } from './features/gemini-exporter';


(function () {
  // 狀態管理
  const widgetState: GeminiWidgetState = {
    title: '未偵測到對話',
    messageCount: 0,
    status: 'idle',
    lastSyncTime: null,
    activeConversation: null
  };


  let debounceTimer: NodeJS.Timeout | null = null;
  let hostDiv: HTMLDivElement | null = null;
  let shadow: ShadowRoot | null = null;

  // 檢查擴充功能上下文是否有效 (防止 Extension context invalidated)
  function isExtensionValid(): boolean {
    try {
      return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
    } catch {
      return false;
    }
  }

  // 防抖抓取
  function debounceExtract() {
    if (!isExtensionValid()) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      extractAndSave(true); // 自動擷取時使用靜默模式
    }, 1500);
  }

  // 安全消毒 HTML，防止 XSS 攻擊與惡意腳本注入
  function getSanitizedHtml(el: Element): string {
    const clone = el.cloneNode(true) as HTMLElement;
    const dangerousElements = clone.querySelectorAll('script, iframe, object, embed, link, meta, style');
    dangerousElements.forEach(node => node.remove());

    const allElements = clone.querySelectorAll('*');
    allElements.forEach(element => {
      const attrs = Array.from(element.attributes);
      for (const attr of attrs) {
        if (attr.name.toLowerCase().startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
          element.removeAttribute(attr.name);
        }
      }
    });

    return clone.innerHTML.trim();
  }

  // 解析與擷取
  function extractAndSave(silent = false): boolean {
    if (!isExtensionValid()) return false;
    if (!silent) {
      widgetState.status = 'syncing';
      updateWidgetUI();
    }

    const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
    const conversationId = match ? match[1] : 'current_session';

    const elements = document.querySelectorAll('.query-content, message-content');
    if (elements.length === 0) {
      if (!silent) {
        widgetState.status = 'error';
        updateWidgetUI();
        setTimeout(() => {
          widgetState.status = 'idle';
          updateWidgetUI();
        }, 1500);
      }
      return false;
    }

    const messages: GeminiMessage[] = [];
    elements.forEach((el) => {
      const isUser = el.classList.contains('query-content') || el.closest('.query-content') !== null;
      const content = getSanitizedHtml(el); // 經安全消毒後保留排版結構
      
      if (content) {
        messages.push({
          role: isUser ? 'user' : 'model',
          content: content
        });
      }
    });

    if (messages.length === 0) {
      if (!silent) {
        widgetState.status = 'error';
        updateWidgetUI();
        setTimeout(() => {
          widgetState.status = 'idle';
          updateWidgetUI();
        }, 1500);
      }
      return false;
    }

    // 尋找第一個使用者問題的純文字作為標題，防禦 HTML 標籤污染標題
    const firstUserEl = Array.from(elements).find(el => el.classList.contains('query-content') || el.closest('.query-content') !== null);
    const firstUserText = firstUserEl?.textContent?.trim() || '';
    const title = firstUserText.length > 25 
      ? firstUserText.substring(0, 25) + '...' 
      : firstUserText || '未命名對話';

    const conversationData: GeminiConversation = {
      id: conversationId,
      title: title,
      messages: messages,
      timestamp: Date.now()
    };

    // 更新局部狀態
    widgetState.title = title;
    widgetState.messageCount = messages.length;
    widgetState.lastSyncTime = conversationData.timestamp;
    widgetState.activeConversation = conversationData;
    widgetState.status = 'success';
    updateWidgetUI();

    if (!silent) {
      setTimeout(() => {
        widgetState.status = 'idle';
        updateWidgetUI();
      }, 1500);
    }

    // 同步至 background
    if (isExtensionValid() && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          type: 'UPDATE_GEMINI_CHAT',
          payload: conversationData
        }).catch(() => {
          // 忽略錯誤
        });
      } catch {
        // 忽略擴充功能上下文失效錯誤
      }
    }

    return true;
  }

  // 建立 Widget
  function createWidget() {
    if (!isExtensionValid()) return;
    if (document.getElementById('scrumclock-widget-root')) return;

    hostDiv = document.createElement('div');
    hostDiv.id = 'scrumclock-widget-root';
    
    // 基礎樣式 (Host 屬性固定在 global 層)
    hostDiv.style.position = 'fixed';
    hostDiv.style.bottom = '90px';
    hostDiv.style.right = '24px';
    hostDiv.style.zIndex = '2147483647';
    hostDiv.style.userSelect = 'none';
    document.body.appendChild(hostDiv);

    // 讀取歷史拖曳位置 (加入安全防禦)
    if (isExtensionValid() && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.get('widgetPosition', (result) => {
          if (!isExtensionValid()) return;
          if (result && result.widgetPosition && hostDiv) {
            hostDiv.style.right = 'auto';
            hostDiv.style.bottom = 'auto';
            hostDiv.style.left = `${result.widgetPosition.left}px`;
            hostDiv.style.top = `${result.widgetPosition.top}px`;
          }
        });
      } catch {
        // 忽略失效錯誤
      }
    }

    shadow = hostDiv.attachShadow({ mode: 'open' });

    // 注入獨立 CSS
    const style = document.createElement('style');
    style.textContent = `
      :host {
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      /* 懸浮按鈕 (FAB) */
      .fab {
        width: 48px;
        height: 48px;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(59, 130, 246, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        position: relative;
      }
      
      .fab:active {
        cursor: grabbing;
        transform: scale(0.95);
      }
      
      .fab:hover {
        border-color: rgba(59, 130, 246, 0.8);
        box-shadow: 0 0 12px rgba(59, 130, 246, 0.4), 0 4px 16px rgba(0, 0, 0, 0.5);
        transform: scale(1.05);
      }
      
      .fab svg {
        width: 24px;
        height: 24px;
        fill: none;
        stroke: #3b82f6;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      /* 綠色同步小圓點 */
      .indicator {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 4px;
        border: 1.5px solid rgba(15, 23, 42, 0.9);
        box-shadow: 0 0 6px #10b981;
      }

      /* 快捷選單面板 */
      .panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 260px;
        background: rgba(15, 23, 42, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        transform: scale(0.9) translateY(10px);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s;
        transform-origin: bottom right;
      }
      
      .panel.open {
        transform: scale(1) translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      
      /* 面板 Header */
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 8px;
      }
      
      .header h4 {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      /* 狀態區域 */
      .status-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .status-title {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .status-meta {
        font-size: 10px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
      }
      
      /* 按鈕清單 */
      .menu {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .btn {
        width: 100%;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        color: #cbd5e1;
        font-size: 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        text-align: left;
      }
      
      .btn:hover {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.3);
        color: #60a5fa;
      }
      
      .btn-primary {
        background: rgba(59, 130, 246, 0.8);
        border-color: rgba(59, 130, 246, 0.9);
        color: #ffffff;
        font-weight: 600;
      }
      
      .btn-primary:hover {
        background: #3b82f6;
        color: #ffffff;
      }
      
      .btn-loading {
        opacity: 0.7;
        pointer-events: none;
      }
      
      /* 腳部資訊 */
      .footer {
        font-size: 9px;
        color: #475569;
        text-align: center;
        margin-top: 4px;
      }
    `;
    shadow.appendChild(style);

    // 注入 DOM 結構 (以安全原生 DOM API 建立，杜絕 XSS 風險)
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'scrumclock-widget-container';

    // 1. 懸浮面板
    const panel = document.createElement('div');
    panel.id = 'scrumclock-panel';
    panel.className = 'panel open';

    // Header
    const header = document.createElement('div');
    header.className = 'header';
    const h4 = document.createElement('h4');
    const robotSpan = document.createElement('span');
    robotSpan.textContent = '🤖';
    h4.appendChild(robotSpan);
    h4.appendChild(document.createTextNode(' PK+ 助手'));
    const headerIndicator = document.createElement('span');
    headerIndicator.className = 'indicator';
    header.appendChild(h4);
    header.appendChild(headerIndicator);

    // Status Box
    const statusBox = document.createElement('div');
    statusBox.className = 'status-box';
    const statusTitle = document.createElement('div');
    statusTitle.id = 'scrumclock-status-title';
    statusTitle.className = 'status-title';
    statusTitle.textContent = '未偵測到對話';

    const statusMeta = document.createElement('div');
    statusMeta.className = 'status-meta';
    const statusCount = document.createElement('span');
    statusCount.id = 'scrumclock-status-count';
    statusCount.textContent = '0 條訊息';
    const statusTime = document.createElement('span');
    statusTime.id = 'scrumclock-status-time';
    statusTime.textContent = '無同步記錄';
    statusMeta.appendChild(statusCount);
    statusMeta.appendChild(statusTime);

    statusBox.appendChild(statusTitle);
    statusBox.appendChild(statusMeta);

    // Menu
    const menu = document.createElement('div');
    menu.className = 'menu';
    const btnManual = document.createElement('button');
    btnManual.id = 'btn-manual';
    btnManual.className = 'btn';
    btnManual.textContent = '📥 立即手動擷取';

    const btnExport = document.createElement('button');
    btnExport.id = 'btn-export';
    btnExport.className = 'btn';
    btnExport.textContent = '📄 快速導出 Markdown';

    const btnDashboard = document.createElement('button');
    btnDashboard.id = 'btn-dashboard';
    btnDashboard.className = 'btn btn-primary';
    btnDashboard.textContent = '🍅 打開 Power Kit 儀表板';

    menu.appendChild(btnManual);
    menu.appendChild(btnExport);
    menu.appendChild(btnDashboard);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.textContent = 'PK+ Helper v1.0.0';

    panel.appendChild(header);
    panel.appendChild(statusBox);
    panel.appendChild(menu);
    panel.appendChild(footer);

    // 2. FAB 按鈕
    const fab = document.createElement('div');
    fab.id = 'scrumclock-fab';
    fab.className = 'fab';
    fab.title = 'PK+ 快捷選單 (可拖曳)';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');

    const polyline = document.createElementNS(svgNS, 'polyline');
    polyline.setAttribute('points', '12 6 12 12 16 14');

    svg.appendChild(circle);
    svg.appendChild(polyline);

    const fabIndicator = document.createElement('div');
    fabIndicator.className = 'indicator';

    fab.appendChild(svg);
    fab.appendChild(fabIndicator);

    widgetContainer.appendChild(panel);
    widgetContainer.appendChild(fab);
    shadow.appendChild(widgetContainer);

    setupWidgetEvents();
  }

  // 註冊 Widget 事件 (包含拖曳與功能)
  function setupWidgetEvents() {
    if (!shadow || !hostDiv) return;

    const fab = shadow.getElementById('scrumclock-fab');
    const panel = shadow.getElementById('scrumclock-panel');
    const btnManual = shadow.getElementById('btn-manual') as HTMLButtonElement;
    const btnExport = shadow.getElementById('btn-export') as HTMLButtonElement;
    const btnDashboard = shadow.getElementById('btn-dashboard') as HTMLButtonElement;

    if (!fab || !panel || !btnManual || !btnExport || !btnDashboard) return;

    // 拖曳機制
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    fab.addEventListener('mousedown', (e) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      
      // 取得當前的 left, top
      const rect = hostDiv!.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
          
          // 更新 host 位置
          const newLeft = initialLeft + dx;
          const newTop = initialTop + dy;
          
          hostDiv!.style.right = 'auto';
          hostDiv!.style.bottom = 'auto';
          hostDiv!.style.left = `${newLeft}px`;
          hostDiv!.style.top = `${newTop}px`;
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        if (isDragging && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          // 保存位置到 Chrome Storage
          const rect = hostDiv!.getBoundingClientRect();
          chrome.storage.local.set({
            widgetPosition: { left: rect.left, top: rect.top }
          });
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    // FAB 點擊開關面板
    fab.addEventListener('click', (e) => {
      if (isDragging) return; // 拖曳中不觸發點擊
      panel.classList.toggle('open');
    });

    // 手動擷取 (加入防抖與非同步 Loading 顯示)
    btnManual.addEventListener('click', () => {
      btnManual.textContent = '⚡ 同步中...';
      btnManual.classList.add('btn-loading');

      setTimeout(() => {
        const success = extractAndSave(true); // 靜默擷取以防覆蓋 loading 狀態
        
        setTimeout(() => {
          if (success) {
            btnManual.textContent = '✓ 同步成功！';
            setTimeout(() => {
              btnManual.textContent = '📥 立即手動擷取';
              btnManual.classList.remove('btn-loading');
            }, 1500);
          } else {
            btnManual.textContent = '✗ 無對話資料';
            setTimeout(() => {
              btnManual.textContent = '📥 立即手動擷取';
              btnManual.classList.remove('btn-loading');
            }, 1500);
          }
        }, 600); // 模擬短暫的同步處理感
      }, 50);
    });

    // 快速導出
    btnExport.addEventListener('click', () => {
      // 確保有先抓到資料
      extractAndSave(true);
      if (!widgetState.activeConversation || widgetState.activeConversation.messages.length === 0) {
        alert('請先在此對話中發送訊息，才能進行導出！');
        return;
      }

      btnExport.textContent = '⚡ 導出中...';
      btnExport.classList.add('btn-loading');

      setTimeout(() => {
        try {
          const conv = widgetState.activeConversation!;
          let md = `# ${conv.title}\n\n`;
          md += `* 擷取時間: ${new Date(conv.timestamp).toLocaleString()}\n`;
          md += `* 來源連結: [Gemini App](https://gemini.google.com/app/${conv.id})\n\n`;
          md += `---\n\n`;

          conv.messages.forEach((msg) => {
            if (msg.role === 'user') {
              md += `### 👤 User\n\n${msg.content}\n\n`;
            } else {
              md += `### 🤖 Gemini\n\n${msg.content}\n\n`;
            }
            md += `---\n\n`;
          });

          const blob = new Blob([md], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const dateStr = new Date(conv.timestamp).toISOString().split('T')[0];
          const safeTitle = conv.title.replace(/[\\/:*?"<>|]/g, '_');
          a.download = `gemini_${safeTitle}_${dateStr}.md`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error(err);
        } finally {
          btnExport.textContent = '📄 快速導出 Markdown';
          btnExport.classList.remove('btn-loading');
        }
      }, 500);
    });

    // 跳轉儀表板 (加入安全防禦)
    btnDashboard.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      } else {
        window.open('/index.html', '_blank'); // 網頁端測試退路
      }
    });

    // 點擊面板外部時自動收起面板
    document.addEventListener('click', (e) => {
      const path = e.composedPath();
      if (hostDiv && !path.includes(hostDiv)) {
        panel.classList.remove('open');
      }
    });
  }

  // 更新 Widget UI 渲染
  function updateWidgetUI() {
    if (!shadow) return;

    const elTitle = shadow.getElementById('scrumclock-status-title');
    const elCount = shadow.getElementById('scrumclock-status-count');
    const elTime = shadow.getElementById('scrumclock-status-time');
    const btnManual = shadow.getElementById('btn-manual');

    if (elTitle) elTitle.textContent = widgetState.title;
    if (elCount) elCount.textContent = `${widgetState.messageCount} 條訊息`;
    if (elTime) {
      elTime.textContent = widgetState.lastSyncTime 
        ? new Date(widgetState.lastSyncTime).toLocaleTimeString() 
        : '無同步記錄';
    }

    // 自動擷取成功時同步更新手動按鈕文字
    if (btnManual && widgetState.status === 'idle') {
      btnManual.textContent = '📥 立即手動擷取';
      btnManual.classList.remove('btn-loading');
    }
  }

  // 監聽 DOM 變動
  const observer = new MutationObserver((mutations) => {
    if (!isExtensionValid()) {
      observer.disconnect();
      return;
    }
    let hasChange = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        hasChange = true;
        break;
      } else if (mutation.type === 'characterData') {
        hasChange = true;
        break;
      }
    }

    if (hasChange) {
      debounceExtract();
    }
  });

  // 初始化
  function init() {
    if (!isExtensionValid()) return;
    const container = document.body;
    if (container) {
      createWidget();
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log("Gemini Exporter: 開始監聽網頁對話變動");
      
      // 初始化時，進行一次靜默擷取以讀取當前對話
      extractAndSave(true);
    } else {
      setTimeout(init, 1000);
    }
  }

  init();

  // 當網址改變時（例如切換對話），也觸發擷取
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    if (!isExtensionValid()) {
      urlObserver.disconnect();
      return;
    }
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log("Gemini Exporter: 偵測到網址切換，重新擷取...");
      debounceExtract();
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });
})();
