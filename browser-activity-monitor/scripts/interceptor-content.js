/**
 * Browser Activity Monitor - Content Script Interceptor (AM-04)
 * 運行於 Extension 隔離環境 (ISOLATED World, document_start)。
 * 職責：
 * 1. 管理規則集快取，並透過 window.postMessage 即時同步至 MAIN World (interceptor-main.js)。
 * 2. 接收來自 MAIN World 的 window.open 攔截事件，透過 chrome.runtime.sendMessage 通報 Background。
 * 3. 在 Capture 階段監聽全局 DOM click 事件，攔截黑名單來源或目標的 target="_blank" 超連結跳轉。
 */
(() => {
  // 防重複注入保護
  if (window.__BAM_INTERCEPTOR_CONTENT_INSTALLED__) {
    return;
  }
  window.__BAM_INTERCEPTOR_CONTENT_INSTALLED__ = true;

  const STORAGE_KEYS = {
    RULES: 'bam_tab_blacklist_rules',
    CONFIG: 'bam_tab_interceptor_config'
  };

  let config = {
    enabled: true,
    blockOpenerTabs: true
  };
  let rules = [];

  /**
   * 自 URL 提取 hostname (小寫並去除 port 與路徑)
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
   * 發送規則與設定同步給同視窗 MAIN World
   */
  function syncRulesToMain() {
    try {
      window.postMessage(
        {
          source: '__BAM_INTERCEPTOR_ISOLATED__',
          type: 'SYNC_RULES',
          rules,
          config
        },
        '*'
      );
    } catch {
      // 靜默防護
    }
  }

  /**
   * 向 Background Service Worker 通報攔截事件
   * @param {string} targetUrl 目標網址
   * @param {string} openerUrl 來源網址
   * @param {string} matchedRule 命中規則
   * @param {string} action 動作標記
   */
  function reportBlockedToBackground(targetUrl, openerUrl, matchedRule, action) {
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'INTERCEPTOR_CONTENT_BLOCKED',
          targetUrl,
          openerUrl: openerUrl || window.location.href,
          matchedRule: matchedRule || 'DOMAIN_MATCH',
          action: action || 'CONTENT_PREVENTED'
        }).catch(() => {
          // SW 休眠時靜默吸收
        });
      }
    } catch {
      // 容錯防護
    }
  }

  // 1. 初始化讀取 Storage 規則並同步至 MAIN
  function loadAndSyncStorage() {
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get([STORAGE_KEYS.CONFIG, STORAGE_KEYS.RULES], (data) => {
      if (chrome.runtime.lastError) return;

      if (data[STORAGE_KEYS.CONFIG]) {
        config = { ...config, ...data[STORAGE_KEYS.CONFIG] };
      }
      if (Array.isArray(data[STORAGE_KEYS.RULES])) {
        rules = data[STORAGE_KEYS.RULES];
      }
      syncRulesToMain();
    });
  }

  // 2. 監聽 Storage 變化以即時同步變更
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      let changed = false;
      if (changes[STORAGE_KEYS.CONFIG]) {
        config = { ...config, ...(changes[STORAGE_KEYS.CONFIG].newValue || {}) };
        changed = true;
      }
      if (changes[STORAGE_KEYS.RULES]) {
        rules = Array.isArray(changes[STORAGE_KEYS.RULES].newValue)
          ? changes[STORAGE_KEYS.RULES].newValue
          : [];
        changed = true;
      }
      if (changed) {
        syncRulesToMain();
      }
    });
  }

  // 3. 監聽來自同視窗 MAIN World 的訊息 (請求規則或通報攔截)
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    // 處理 MAIN World 主動請求規則
    if (event.data.source === '__BAM_INTERCEPTOR_MAIN__' && event.data.type === 'REQUEST_RULES') {
      syncRulesToMain();
      return;
    }

    // 處理 MAIN World 回傳的 window.open 攔截通知
    if (event.data.source === '__BAM_INTERCEPTOR_MAIN__' && event.data.type === 'WINDOW_OPEN_BLOCKED') {
      const { targetUrl, openerUrl, matchedRule, action } = event.data;
      reportBlockedToBackground(targetUrl, openerUrl, matchedRule, action || 'WINDOW_OPEN_PREVENTED');
    }
  });

  // 4. 全局 Capture 階段監聽點擊事件，攔截惡意 target="_blank" 跳轉 (任務 2.2)
  document.addEventListener('click', (event) => {
    if (!config.enabled) return;

    // 檢查點擊目標是否為或包含於超連結元素 <a>
    const anchor = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('a')
      : null;

    if (!anchor || !anchor.href) return;

    const rawHref = anchor.getAttribute('href') || '';
    if (!rawHref || rawHref === '#' || rawHref.startsWith('javascript:')) {
      return;
    }

    const fullHref = anchor.href;
    const targetAttr = (anchor.getAttribute('target') || '').toLowerCase();
    const isNewTabIntent = targetAttr === '_blank' || targetAttr === '_new' || event.ctrlKey || event.metaKey;

    const currentUrl = window.location.href;

    // 檢查 A: 當前頁面來源是否命中黑名單，且此點擊意圖開啟新分頁
    const currentMatch = matchUrl(currentUrl);
    if (currentMatch.matched && isNewTabIntent && config.blockOpenerTabs) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      console.warn(`[BAM Interceptor] 已攔截黑名單來源頁面之 target="_blank" 點擊 (目標: ${fullHref}, 規則: ${currentMatch.rule.domain})`);
      reportBlockedToBackground(fullHref, currentUrl, currentMatch.rule.domain, 'LINK_OPENER_BLOCKED');
      return;
    }

    // 檢查 B: 目標連結網址是否命中黑名單
    const targetMatch = matchUrl(fullHref);
    if (targetMatch.matched) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      console.warn(`[BAM Interceptor] 已攔截導向黑名單網域之超連結點擊 (目標: ${fullHref}, 規則: ${targetMatch.rule.domain})`);
      reportBlockedToBackground(fullHref, currentUrl, targetMatch.rule.domain, 'LINK_TARGET_BLOCKED');
    }
  }, true); // Capture 階段搶先執行攔截

  // 啟動立即載入設定與規則
  loadAndSyncStorage();
})();
