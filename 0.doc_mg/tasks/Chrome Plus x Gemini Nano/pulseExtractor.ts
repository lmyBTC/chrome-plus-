/**
 * Pulse Extractor - Content Script
 * 專為 masonyang-blog.github.io/pulse.html 與研報卡片設計的結構化 DOM 抽取器
 * 監聽來自 SidePanel 的 GET_ACTIVE_PULSE_ITEM 請求，並安全截斷正文至 1500 字元防範爆框
 *
 * @related ./chrome_plus_x_gemini_nano.md       (核心任務看板 Phase 2.1)
 * @related ../../docs/cross_plugin_contract.md   (契約: GET_ACTIVE_PULSE_ITEM)
 * @related ./SocialDispatcher.tsx                (下游: 擷取資料消費者)
 */

(function () {
  // 防止重複注入
  if ((window as any).__PULSE_EXTRACTOR_INITIALIZED__) {
    return;
  }
  (window as any).__PULSE_EXTRACTOR_INITIALIZED__ = true;

  /**
   * 探測並抽取目前畫面中最具代表性或被選取的 Pulse 卡片
   */
  function extractActivePulseData() {
    // 優先探測卡片容器
    const selectors = [
      '.pulse-card.active',
      '.pulse-card:hover',
      '.pulse-card',
      'article.pulse-item',
      'article',
      'main',
      '.post-content'
    ];

    let targetElement: Element | null = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        targetElement = el;
        break;
      }
    }

    if (!targetElement) {
      targetElement = document.body;
    }

    // 1. 標題抽取：優先自卡片內選取 h1/h2/h3，若無則降級選取網頁標題
    const titleEl = targetElement.querySelector('h1, h2, h3, .card-title, .title');
    const rawTitle = titleEl?.textContent || document.title || 'Untitled Pulse';
    const cleanTitle = rawTitle.replace(/\s+/g, ' ').trim();

    // 2. 正文抽取：排除按鈕、導航、腳註與腳本
    const clonedEl = targetElement.cloneNode(true) as HTMLElement;
    const junkSelectors = ['nav', 'header', 'footer', 'script', 'style', 'button', '.actions', '.share-bar'];
    junkSelectors.forEach((s) => {
      clonedEl.querySelectorAll(s).forEach((node) => node.remove());
    });

    const rawContent = clonedEl.textContent || '';
    // 嚴格控制在 1500 字元上限，保護 Gemini Nano 的上下文視窗
    const cleanContent = rawContent
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1500);

    // 3. 永久網址抽取：優先從 a 標籤提取 permalink，若無則使用當前 window.location
    const permalinkEl = targetElement.querySelector('a[href*="/news/"], a[rel="bookmark"], .card-link') as HTMLAnchorElement | null;
    const url = permalinkEl?.href || window.location.href;

    // 4. 標籤與指標抽取
    const tagElements = targetElement.querySelectorAll('.tag, .badge, [data-tag]');
    const tags: string[] = [];
    tagElements.forEach((el) => {
      const tagText = el.textContent?.trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    return {
      title: cleanTitle,
      summary: cleanContent,
      url: url,
      tags: tags,
      extractedAt: new Date().toISOString()
    };
  }

  // 監聽來自 SidePanel 或 Background 的提取呼叫
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === 'GET_ACTIVE_PULSE_ITEM') {
      try {
        const data = extractActivePulseData();
        sendResponse({ success: true, data });
      } catch (err: any) {
        sendResponse({ success: false, error: err?.message || '抽取卡片內容失敗' });
      }
    }
    return true; // 維持非同步連線
  });

  console.log('✅ [PulseExtractor] Content script loaded and listening for GET_ACTIVE_PULSE_ITEM.');
})();