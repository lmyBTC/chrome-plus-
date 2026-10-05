/**
 * Browser Activity Monitor - MAIN World Interceptor (AM-04)
 * 運行於目標頁面主環境 (MAIN)，在 document_start 覆寫原生 window.open API，
 * 阻斷黑名單目標與來源的彈窗調用，並透過 window.postMessage 向 ISOLATED 環境通知攔截事件。
 */
(() => {
  // 防重複注入保護
  if (window.__BAM_INTERCEPTOR_MAIN_INSTALLED__) {
    return;
  }
  window.__BAM_INTERCEPTOR_MAIN_INSTALLED__ = true;

  // 記憶體快取配置與黑名單規則集
  let config = {
    enabled: true,
    blockOpenerTabs: true
  };
  let rules = [];

  /**
   * 自 URL 提取 hostname (轉小寫並去除 port 與路徑)
   * @param {string} input
   * @returns {string}
   */
  function extractHostname(input) {
    if (!input || typeof input !== 'string') return '';
    try {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const url = new URL(input);
        return url.hostname.toLowerCase();
      }
      return input.split('/')[0].split(':')[0].trim().toLowerCase();
    } catch {
      return String(input).toLowerCase();
    }
  }

  /**
   * 比對單一規則演算法 (萬用字元與完全匹配)
   * @param {string} hostname
   * @param {Object} rule
   * @returns {boolean}
   */
  function testRuleMatch(hostname, rule) {
    if (!rule || !rule.domain) return false;
    const rawPattern = rule.domain.trim().toLowerCase();
    const mode = rule.matchMode || 'wildcard';

    if (mode === 'exact') {
      return hostname === rawPattern;
    }

    if (rawPattern.startsWith('*.')) {
      const baseDomain = rawPattern.slice(2);
      return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
    }

    if (rawPattern.includes('*')) {
      try {
        const regexStr = '^' + rawPattern
          .split('*')
          .map((part) => part.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'))
          .join('.*') + '$';
        return new RegExp(regexStr).test(hostname);
      } catch {
        return hostname === rawPattern;
      }
    }

    return hostname === rawPattern || hostname.endsWith('.' + rawPattern);
  }

  /**
   * 檢查指定 URL 是否命中黑名單
   * @param {string} url
   * @returns {{ matched: boolean, rule: Object|null }}
   */
  function matchUrl(url) {
    if (!url || typeof url !== 'string') {
      return { matched: false, rule: null };
    }

    // 排除瀏覽器內部專用通訊協定
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('devtools://') ||
      url.startsWith('about:') ||
      url.startsWith('data:')
    ) {
      return { matched: false, rule: null };
    }

    const hostname = extractHostname(url);
    if (!hostname) return { matched: false, rule: null };

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (testRuleMatch(hostname, rule)) {
        return { matched: true, rule };
      }
    }

    return { matched: false, rule: null };
  }

  /**
   * 發送攔截事件至同視窗 ISOLATED 中繼層
   * @param {string} targetUrl 目標網址
   * @param {string} openerUrl 來源網址
   * @param {string} matchedRule 命中的規則
   * @param {string} action 攔截動作標記
   */
  function notifyBlocked(targetUrl, openerUrl, matchedRule, action) {
    try {
      window.postMessage(
        {
          source: '__BAM_INTERCEPTOR_MAIN__',
          type: 'WINDOW_OPEN_BLOCKED',
          targetUrl,
          openerUrl,
          matchedRule,
          action,
          timestamp: Date.now()
        },
        '*'
      );
    } catch {
      // 靜默防護
    }
  }

  // 1. 覆寫原生 window.open
  const originalOpen = window.open;
  window.open = function (url, target, features) {
    if (!config.enabled) {
      return originalOpen.apply(this, arguments);
    }

    const targetUrl = url != null ? String(url).trim() : '';
    const currentUrl = window.location.href;

    // 檢查 A: 當前來源網頁是否命中黑名單 (來源黑名單嚴禁彈窗)
    const currentMatch = matchUrl(currentUrl);
    if (currentMatch.matched && config.blockOpenerTabs) {
      console.warn(`[BAM Interceptor] 已阻斷黑名單來源頁面之 window.open (目標: ${targetUrl || 'about:blank'}, 規則: ${currentMatch.rule.domain})`);
      notifyBlocked(targetUrl || 'about:blank', currentUrl, currentMatch.rule.domain, 'WINDOW_OPEN_OPENER_BLOCKED');
      return null;
    }

    // 檢查 B: 目標網址是否命中黑名單
    if (targetUrl) {
      const targetMatch = matchUrl(targetUrl);
      if (targetMatch.matched) {
        console.warn(`[BAM Interceptor] 已阻斷導向黑名單網域之 window.open (目標: ${targetUrl}, 規則: ${targetMatch.rule.domain})`);
        notifyBlocked(targetUrl, currentUrl, targetMatch.rule.domain, 'WINDOW_OPEN_TARGET_BLOCKED');
        return null;
      }
    }

    // 未命中黑名單：放行原生調用
    return originalOpen.apply(this, arguments);
  };

  // 2. 監聽來自 ISOLATED 隔離環境的規則同步
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    if (event.data.source === '__BAM_INTERCEPTOR_ISOLATED__' && event.data.type === 'SYNC_RULES') {
      if (Array.isArray(event.data.rules)) {
        rules = event.data.rules;
      }
      if (event.data.config && typeof event.data.config === 'object') {
        config = { ...config, ...event.data.config };
      }
    }
  });

  // 3. 初始主動請求 ISOLATED 同步規則
  try {
    window.postMessage(
      {
        source: '__BAM_INTERCEPTOR_MAIN__',
        type: 'REQUEST_RULES'
      },
      '*'
    );
  } catch {
    // 容錯防護
  }
})();
