/**
 * Browser Activity Monitor - MAIN World Probe
 * 運行於目標頁面主環境 (MAIN)，執行原生敏感 API Monkey Patching，
 * 透過 window.postMessage 向 ISOLATED 環境安全傳遞探針事件。
 */
(() => {
  // 防重複注入保護
  if (window.__BAM_MAIN_PROBE_INSTALLED__) {
    return;
  }
  window.__BAM_MAIN_PROBE_INSTALLED__ = true;

  /**
   * 發送探針事件至同源/同視窗中繼層
   * @param {string} api API 名稱
   * @param {Object} detail 調用細節
   */
  function emitProbeEvent(api, detail = {}) {
    try {
      window.postMessage(
        {
          source: '__PROBE_MAIN__',
          api,
          detail,
          timestamp: Date.now()
        },
        '*'
      );
    } catch {
      // 靜默防護，避免影響宿主頁面執行
    }
  }

  // 1. 掛鉤 navigator.mediaDevices.getUserMedia (攝影機 / 麥克風)
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (constraints) {
      emitProbeEvent('navigator.mediaDevices.getUserMedia', {
        audio: Boolean(constraints && constraints.audio),
        video: Boolean(constraints && constraints.video),
        constraints: typeof constraints === 'object' ? JSON.parse(JSON.stringify(constraints)) : constraints
      });
      return originalGetUserMedia(constraints);
    };
  }

  // 2. 掛鉤 navigator.geolocation.getCurrentPosition (地理定位)
  if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function') {
    const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    navigator.geolocation.getCurrentPosition = function (successCallback, errorCallback, options) {
      emitProbeEvent('navigator.geolocation.getCurrentPosition', {
        options: typeof options === 'object' ? JSON.parse(JSON.stringify(options)) : options
      });
      return originalGetCurrentPosition(successCallback, errorCallback, options);
    };
  }

  // 3. 掛鉤 navigator.clipboard.readText (剪貼簿讀取)
  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    const originalReadText = navigator.clipboard.readText.bind(navigator.clipboard);
    navigator.clipboard.readText = function () {
      emitProbeEvent('navigator.clipboard.readText', {
        action: 'readText'
      });
      return originalReadText();
    };
  }

  // 4. 掛鉤 navigator.clipboard.read (剪貼簿複合讀取)
  if (navigator.clipboard && typeof navigator.clipboard.read === 'function') {
    const originalRead = navigator.clipboard.read.bind(navigator.clipboard);
    navigator.clipboard.read = function () {
      emitProbeEvent('navigator.clipboard.read', {
        action: 'read'
      });
      return originalRead();
    };
  }
})();
