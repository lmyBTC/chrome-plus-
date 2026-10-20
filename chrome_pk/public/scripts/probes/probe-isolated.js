/**
 * Browser Activity Monitor - ISOLATED World Relay Probe
 * 運行於 Extension 隔離環境 (ISOLATED)，監聽 window.postMessage 中來自 MAIN 探針的事件，
 * 並透過 chrome.runtime.sendMessage 安全中繼轉發至 Background Service Worker。
 */
(() => {
  // 防重複監聽保護
  if (window.__BAM_ISOLATED_PROBE_INSTALLED__) {
    return;
  }
  window.__BAM_ISOLATED_PROBE_INSTALLED__ = true;

  // 監聽來自同視窗 MAIN 環境的探針訊息
  window.addEventListener('message', (event) => {
    // 嚴格來源校驗：必須來自當前同視窗，且具備專屬探針標記
    if (event.source !== window || !event.data || typeof event.data !== 'object') {
      return;
    }

    if (event.data.source !== '__PROBE_MAIN__') {
      return;
    }

    const { api, detail, timestamp } = event.data;

    try {
      chrome.runtime.sendMessage({
        type: 'PROBE_EVENT',
        api,
        detail,
        timestamp: timestamp || Date.now()
      }).catch(() => {
        // Service Worker 休眠或未準備好時靜默吸收
      });
    } catch {
      // 容錯防護
    }
  });
})();
