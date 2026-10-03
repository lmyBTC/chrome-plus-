// YouTube Speed Plus Content Script
// 這個腳本會在 YouTube 頁面中執行，控制影片播放速度

let currentSpeed = 1;
let videoElement = null;
let speedObserver = null;

// 循環播放狀態
let isLooping = false;
let loopStart = null;
let loopEnd = null;
let maxLoopCount = 0;
let currentLoopCount = 0;

// 標題快捷按鈕與 Shadow DOM 控制面板變數
let titleObserver = null;
let injectTimer = null;
let shadowHost = null;
let shadowRoot = null;

// 初始化函數
function initialize() {
  console.log('YouTube Speed Plus 已載入');
  
  // 尋找影片元素
  findVideoElement();
  
  // 監聽影片標題以注入快捷按鈕
  observeTitleAndInject();
  
  // 監聽頁面變化（YouTube 是 SPA，需要監聽路由變化）
  observePageChanges();
  
  // 監聽來自 popup 的訊息
  chrome.runtime.onMessage.addListener(handleMessage);
}

// 尋找影片元素
function findVideoElement() {
  // 嘗試多種選擇器來找到影片元素
  const selectors = [
    'video',
    '#movie_player video',
    '.html5-video-player video',
    'video[src]'
  ];
  
  for (const selector of selectors) {
    const video = document.querySelector(selector);
    if (video) {
      videoElement = video;
      console.log('找到影片元素:', videoElement);
      
      // 監聽影片載入事件
      videoElement.addEventListener('loadedmetadata', function() {
        console.log('影片已載入，當前速度:', videoElement.playbackRate);
        currentSpeed = videoElement.playbackRate;
      });
      
      // 監聽速度變化
      videoElement.addEventListener('ratechange', function() {
        currentSpeed = videoElement.playbackRate;
        console.log('速度已變更為:', currentSpeed);
      });
      
      // 監聽時間更新以處理循環
      videoElement.addEventListener('timeupdate', handleTimeUpdate);
      
      break;
    }
  }
  
  // 如果沒找到，使用 MutationObserver 監聽 DOM 變化
  if (!videoElement) {
    console.log('未找到影片元素，開始監聽 DOM 變化');
    observeVideoElement();
  }
}

// 監聽影片元素出現
function observeVideoElement() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        const video = document.querySelector('video');
        if (video && video !== videoElement) {
          videoElement = video;
          console.log('新影片元素已找到:', videoElement);
          
          // 設定之前的速度
          if (currentSpeed !== 1) {
            setVideoSpeed(currentSpeed);
          }
          
          observer.disconnect();
        }
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 監聽頁面變化
function observePageChanges() {
  // 監聽 URL 變化
  let currentUrl = window.location.href;
  
  const urlObserver = new MutationObserver(function() {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      console.log('頁面 URL 已變更:', currentUrl);
      
      // 移除舊的按鈕與面板
      removeButtonAndPanel();
      
      // 延遲一下再尋找新的影片元素與重新注入按鈕
      setTimeout(() => {
        videoElement = null;
        findVideoElement();
        tryInjectAllButtons();
      }, 1000);
    }
  });
  
  urlObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 設定影片速度
function setVideoSpeed(speed) {
  if (!videoElement) {
    console.log('影片元素不存在，嘗試重新尋找');
    findVideoElement();
    return false;
  }
  
  try {
    // 檢查速度範圍
    if (speed < 0.1 || speed > 16) {
      console.warn('速度值超出範圍 (0.1-16):', speed);
      return false;
    }
    
    // 設定播放速度
    videoElement.playbackRate = speed;
    currentSpeed = speed;
    
    console.log('影片速度已設定為:', speed + 'x');
    
    // 顯示速度提示
    showSpeedNotification(speed);
    
    // 同步更新 Shadow 面板 UI
    updateShadowPanelUI();
    
    return true;
  } catch (error) {
    console.error('設定影片速度時發生錯誤:', error);
    return false;
  }
}

// 處理循環邏輯
function handleTimeUpdate() {
  if (!isLooping || !videoElement) return;

  const currentTime = videoElement.currentTime;
  const duration = videoElement.duration;
  
  if (!duration) return;
  
  // 決定終點（如果未設定則為影片總長減去 0.5 秒以避免觸發預設結束行為）
  const end = loopEnd !== null ? loopEnd : (duration > 0.5 ? duration - 0.5 : duration);
  
  if (currentTime >= end) {
    if (maxLoopCount === 0 || currentLoopCount < maxLoopCount - 1) {
      // 觸發循環
      const start = loopStart !== null ? loopStart : 0;
      videoElement.currentTime = start;
      currentLoopCount++;
      
      const countMsg = maxLoopCount > 0 ? `${currentLoopCount}/${maxLoopCount}` : currentLoopCount;
      console.log(`循環播放次數: ${countMsg}`);
      showNotification(`循環播放次數: ${countMsg}`);
    } else {
      // 結束循環
      isLooping = false;
      console.log('循環播放結束');
      showNotification('循環播放結束');
      
      // 同步更新 Shadow 面板 UI
      updateShadowPanelUI();
    }
  }
}

// 步進微調影片速度 (支援 0.25x 連續步進，範圍 0.1x ~ 16.0x)
function adjustSpeedStep(delta) {
  if (!videoElement) {
    findVideoElement();
  }
  const baseSpeed = (videoElement && typeof videoElement.playbackRate === 'number') 
    ? videoElement.playbackRate 
    : currentSpeed;
  let newSpeed = Math.round((baseSpeed + delta) * 100) / 100;
  if (newSpeed < 0.1) newSpeed = 0.1;
  if (newSpeed > 16.0) newSpeed = 16.0;
  setVideoSpeed(newSpeed);
}

// 顯示速度提示
function showSpeedNotification(speed) {
  const displaySpeed = Number(Number(speed).toFixed(2)).toString();
  showNotification(`⚡ 播放速度: ${displaySpeed}x`);
}

// 顯示通用提示 (支援全螢幕 OSD 與視窗模式)
function showNotification(message) {
  // 移除舊的提示
  const oldNotifications = document.querySelectorAll('#yt-speed-notification');
  oldNotifications.forEach(el => el.remove());
  
  // 注入全域樣式（單例，避免重複插入 style）
  if (!document.getElementById('yt-speed-notification-style')) {
    const style = document.createElement('style');
    style.id = 'yt-speed-notification-style';
    style.textContent = `
      @keyframes vspSlideIn {
        from {
          transform: translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes vspSlideOut {
        from {
          transform: translateY(0);
          opacity: 1;
        }
        to {
          transform: translateY(-20px);
          opacity: 0;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }
  
  // 建立新的提示
  const notification = document.createElement('div');
  notification.id = 'yt-speed-notification';
  notification.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(79, 70, 229, 0.95) 100%);
    border: 1px solid rgba(165, 180, 252, 0.4);
    color: #ffffff;
    padding: 10px 18px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.3px;
    z-index: 2147483647;
    pointer-events: none;
    user-select: none;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: vspSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  `;
  
  notification.textContent = message;
  
  // 掛載容器：若全螢幕則掛載至全螢幕容器，否則掛載至 body
  const container = document.fullscreenElement || document.body || document.documentElement;
  container.appendChild(notification);
  
  // 2.2 秒後自動移除（含退場動畫）
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'vspSlideOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 250);
    }
  }, 2200);
}

// 處理來自 popup 的訊息
function handleMessage(request, sender, sendResponse) {
  console.log('收到訊息:', request);
  
  switch (request.action) {
    case 'setSpeed':
      const success = setVideoSpeed(request.speed);
      sendResponse({success: success, speed: request.speed});
      break;
      
    case 'getCurrentSpeed':
      sendResponse({speed: currentSpeed});
      break;
      
    case 'startLoop':
      isLooping = true;
      maxLoopCount = request.loopCount || 0;
      loopStart = request.loopStart;
      loopEnd = request.loopEnd;
      currentLoopCount = 0;
      
      const startMsg = loopStart !== null ? Math.floor(loopStart) : 0;
      const endMsg = loopEnd !== null ? Math.floor(loopEnd) : '結尾';
      showNotification(`開始循環: ${startMsg}s - ${endMsg}s`);
      
      // 同步更新 Shadow 面板 UI
      updateShadowPanelUI();
      
      sendResponse({success: true});
      break;
      
    case 'stopLoop':
      isLooping = false;
      showNotification('停止循環');
      
      // 同步更新 Shadow 面板 UI
      updateShadowPanelUI();
      
      sendResponse({success: true});
      break;
      
    case 'getCurrentTime':
      if (videoElement) {
        sendResponse({currentTime: videoElement.currentTime});
      } else {
        sendResponse({currentTime: 0});
      }
      break;
      
    case 'getLoopStatus':
      sendResponse({
        isLooping: isLooping,
        loopCount: maxLoopCount,
        loopStart: loopStart,
        loopEnd: loopEnd
      });
      break;

    case 'extractContent':
      sendResponse(extractVideoContentForCollector());
      break;

    case 'collectToScrumClock':
      sendNoteToScrumClock().then(res => sendResponse(res));
      return true;

    case 'openBookmarkModal':
      openBookmarkModal();
      sendResponse({ success: true });
      break;

    case 'seekToTime':
      if (videoElement && typeof request.timeSeconds === 'number') {
        videoElement.currentTime = request.timeSeconds;
        sendResponse({ success: true, currentTime: videoElement.currentTime });
      } else {
        sendResponse({ success: false, error: 'Video element not found or invalid time' });
      }
      break;

    case 'saveBookmark':
      saveBookmark(request.note, request.timeSeconds).then(res => sendResponse(res));
      return true;

    case 'getBookmarks':
      getStoredBookmarks(request.videoId).then(res => sendResponse({ success: true, bookmarks: res }));
      return true;

    case 'deleteBookmark':
      deleteBookmark(request.id).then(res => sendResponse(res));
      return true;

    case 'clearBookmarks':
      clearBookmarksForVideo(request.videoId).then(res => sendResponse(res));
      return true;

    case 'exportMarkdown':
      getStoredBookmarks(request.videoId).then(bms => {
        const meta = getVideoMetadata();
        const vId = request.videoId || getVideoId(meta.url);
        chrome.storage.local.get(`vsp_ticker_${vId}`, (store) => {
          const ticker = (store && store[`vsp_ticker_${vId}`]) || request.ticker || '';
          const md = generateMarkdownNotes(bms, meta.title, meta.url, ticker);
          sendResponse({ success: true, markdown: md, title: meta.title, count: bms.length, ticker: ticker });
        });
      });
      return true;

    case 'packageSessionToScrumClock':
      packageSessionToScrumClock(request.options || {}).then(res => sendResponse(res));
      return true;

    case 'getDraftTicker':
      {
        const vId = request.videoId || getVideoId();
        chrome.storage.local.get(`vsp_ticker_${vId}`, (store) => {
          sendResponse({ success: true, ticker: (store && store[`vsp_ticker_${vId}`]) || '' });
        });
      }
      return true;

    case 'setDraftTicker':
      {
        const vId = request.videoId || getVideoId();
        const ticker = (request.ticker || '').trim().toUpperCase();
        chrome.storage.local.set({ [`vsp_ticker_${vId}`]: ticker }, () => {
          sendResponse({ success: true, ticker: ticker });
        });
      }
      return true;
      
    default:
      sendResponse({error: '未知的動作'});
  }
  
  return true; // 保持訊息通道開啟
}

// 鍵盤快捷鍵支援
document.addEventListener('keydown', function(event) {
  // 只在 YouTube 頁面啟用快捷鍵
  if (!window.location.href.includes('youtube.com')) return;
  
  // 若焦點在輸入框或可編輯區塊中，不觸發快捷鍵，避免干擾使用者輸入留言或搜尋
  const activeEl = document.activeElement;
  if (activeEl) {
    const tagName = activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
    if (tagName === 'input' || tagName === 'textarea' || activeEl.isContentEditable) {
      return;
    }
  }

  // Alt + [ ：全螢幕步進微調減速 0.25x (範圍 0.1x ~ 16.0x)
  const isBracketLeft = event.altKey && !event.ctrlKey && !event.metaKey && (event.key === '[' || event.code === 'BracketLeft');
  if (isBracketLeft) {
    event.preventDefault();
    adjustSpeedStep(-0.25);
    return;
  }

  // Alt + ] ：全螢幕步進微調加速 0.25x (範圍 0.1x ~ 16.0x)
  const isBracketRight = event.altKey && !event.ctrlKey && !event.metaKey && (event.key === ']' || event.code === 'BracketRight');
  if (isBracketRight) {
    event.preventDefault();
    adjustSpeedStep(0.25);
    return;
  }

  // Alt + M ：全螢幕快捷精華標記鍵 (無需喚出 Popup，一鍵自動打點記錄當前秒數與標題)
  const isAltM = event.altKey && !event.ctrlKey && !event.metaKey && (event.key === 'm' || event.key === 'M' || event.code === 'KeyM');
  if (isAltM) {
    event.preventDefault();
    console.log('[VideoSpeedPlus] 快捷鍵觸發：全螢幕快速標記書籤 (Alt+M)');
    quickBookmarkCurrentTime();
    return;
  }

  // Alt + S 或 Ctrl + Shift + S：一鍵收集當前時間戳字幕與筆記至 ScrumClock
  const isAltS = event.altKey && (event.key === 's' || event.key === 'S' || event.code === 'KeyS');
  const isCtrlShiftS = event.ctrlKey && event.shiftKey && (event.key === 's' || event.key === 'S' || event.code === 'KeyS');
  if (isAltS || isCtrlShiftS) {
    event.preventDefault();
    console.log('[VideoSpeedPlus] 快捷鍵觸發：收集字幕與筆記至 ScrumClock');
    sendNoteToScrumClock();
    return;
  }

  // Alt + B 或 Ctrl + Shift + B：記錄當前時間戳記重點摘要 (Bookmark Modal)
  const isAltB = event.altKey && (event.key === 'b' || event.key === 'B' || event.code === 'KeyB');
  const isCtrlShiftB = event.ctrlKey && event.shiftKey && (event.key === 'b' || event.key === 'B' || event.code === 'KeyB');
  if (isAltB || isCtrlShiftB) {
    event.preventDefault();
    console.log('[VideoSpeedPlus] 快捷鍵觸發：開啟時間標記記錄視窗');
    openBookmarkModal();
    return;
  }

  // Ctrl + Shift + 數字鍵來設定速度
  if (event.ctrlKey && event.shiftKey) {
    let speed = 1;
    
    switch (event.key) {
      case '1':
        speed = 1;
        break;
      case '2':
        speed = 2;
        break;
      case '3':
        speed = 3;
        break;
      case '4':
        speed = 4;
        break;
      case '5':
        speed = 5;
        break;
      default:
        return;
    }
    
    event.preventDefault();
    setVideoSpeed(speed);
  }
});

// 全螢幕快速標記書籤 (無需彈窗，一鍵自動抓取當前秒數、影片標題與時間戳 URL 並寫入儲存)
async function quickBookmarkCurrentTime() {
  if (!videoElement) {
    findVideoElement();
  }
  const meta = getVideoMetadata();
  const timeFormatted = meta.currentTime || formatTimeDisplay(meta.seconds);
  const defaultNote = `📌 [${timeFormatted}] 快篩精華打點`;
  const result = await saveBookmark(defaultNote, meta.seconds);
  if (result && result.success) {
    showNotification(`📌 已快速標記 [${timeFormatted}] 精華重點`);
  } else {
    showNotification(`⚠️ 書籤標記失敗: ${result?.error || '未知錯誤'}`);
  }
}

// 點擊頁面其他地方時隱藏面板
document.addEventListener('click', function() {
  if (shadowRoot) {
    const panel = shadowRoot.querySelector('.yt-speed-plus-floating-panel');
    if (panel && panel.style.display === 'block') {
      panel.style.display = 'none';
    }
  }
});

// 監聽影片標題以注入快捷按鈕
function observeTitleAndInject() {
  if (titleObserver) {
    titleObserver.disconnect();
  }
  if (injectTimer) {
    clearInterval(injectTimer);
  }
  
  // 先嘗試直接注入
  tryInjectAllButtons();
  
  // 監聽 DOM 變化以防延遲載入或路由切換
  titleObserver = new MutationObserver(function() {
    tryInjectAllButtons();
  });
  
  titleObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 每 1.5 秒定時輪詢，確保在 YouTube SPA 異步渲染下兩側按鈕均穩定存在
  injectTimer = setInterval(() => {
    tryInjectAllButtons();
  }, 1500);
}

function tryInjectAllButtons() {
  // 檢查是否在影片播放頁面
  if (!window.location.href.includes('watch')) {
    removeButtonAndPanel();
    return;
  }
  
  tryInjectTitleButton();
  tryInjectLikeButton();
}

// 1. 標題快捷按鈕的注入與管理
function tryInjectTitleButton() {
  const existingTitleBtn = document.getElementById('yt-speed-plus-title-btn');
  
  // 尋找標題元素
  const titleSelectors = [
    'ytd-watch-metadata #title h1',
    'ytd-video-primary-info-renderer h1.title',
    'h1.ytd-watch-metadata',
    '#container > h1.title'
  ];
  
  let titleEl = null;
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      titleEl = el;
      break;
    }
  }
  
  if (!titleEl) {
    if (existingTitleBtn) {
      existingTitleBtn.remove();
    }
    return;
  }
  
  if (existingTitleBtn) {
    if (existingTitleBtn.parentNode !== titleEl) {
      console.log('標題按鈕父節點已變更，移除舊按鈕以利重新注入');
      existingTitleBtn.remove();
    } else {
      return;
    }
  }
  
  console.log('找到標題元素，準備注入快捷按鈕:', titleEl);
  injectTitleButton(titleEl);
}

function createSpeedPlusButtonContent(marginRight = '4px') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.style.marginRight = marginRight;
  svg.style.verticalAlign = 'middle';
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z');
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);

  const span = document.createElement('span');
  span.textContent = 'Speed Plus 🚀';
  return [svg, span];
}

function injectTitleButton(titleEl) {
  const btn = document.createElement('button');
  btn.id = 'yt-speed-plus-title-btn';
  btn.setAttribute('title', 'YouTube Speed Plus 控制面板');
  
  btn.append(...createSpeedPlusButtonContent('4px'));

  
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 12px;
    padding: 4px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--yt-spec-text-primary, #ffffff);
    background-color: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1));
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    cursor: pointer;
    vertical-align: middle;
    transition: all 0.2s ease;
    outline: none;
    user-select: none;
  `;
  
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = 'var(--yt-spec-button-chip-background-hover, rgba(255, 255, 255, 0.2))';
    btn.style.transform = 'translateY(-1px)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = 'var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1))';
    btn.style.transform = 'translateY(0)';
  });
  
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleShadowPanel(btn);
  });
  
  titleEl.appendChild(btn);
  console.log('標題快捷按鈕注入成功！');
}

// 2. LIKE 左側快捷按鈕的注入與管理
function tryInjectLikeButton() {
  const existingLikeBtn = document.getElementById('yt-speed-plus-like-btn');
  
  // 尋找 LIKE / DISLIKE 按鈕的容器以注入在其左側
  const targetSelectors = [
    'ytd-segmented-like-dislike-button-renderer',
    '#segmented-like-button',
    '#top-level-buttons-computed ytd-toggle-button-renderer',
    'button[aria-label^="like this video"]',
    'button[aria-label^="喜歡這部影片"]'
  ];
  
  let targetEl = null;
  for (const selector of targetSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      targetEl = el;
      break;
    }
  }
  
  if (!targetEl) {
    if (existingLikeBtn) {
      console.log('找不到 LIKE 容器，移除舊 LIKE 側按鈕');
      existingLikeBtn.remove();
    }
    return;
  }
  
  if (existingLikeBtn) {
    if (existingLikeBtn.parentNode !== targetEl.parentNode) {
      console.log('LIKE 側按鈕父節點已變更，移除舊按鈕以利重新注入');
      existingLikeBtn.remove();
    } else {
      return;
    }
  }
  
  console.log('找到 LIKE 相關元素，準備注入快捷按鈕:', targetEl);
  injectLikeButton(targetEl);
}

function injectLikeButton(targetEl) {
  const btn = document.createElement('button');
  btn.id = 'yt-speed-plus-like-btn';
  btn.setAttribute('title', 'YouTube Speed Plus 控制面板');
  
  btn.append(...createSpeedPlusButtonContent('6px'));
  
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 8px;
    padding: 0 16px;
    height: 36px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--yt-spec-text-primary, #ffffff);
    background-color: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1));
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 18px;
    cursor: pointer;
    vertical-align: middle;
    transition: all 0.2s ease;
    outline: none;
    user-select: none;
  `;
  
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = 'var(--yt-spec-button-chip-background-hover, rgba(255, 255, 255, 0.2))';
    btn.style.transform = 'translateY(-1px)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = 'var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1))';
    btn.style.transform = 'translateY(0)';
  });
  
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleShadowPanel(btn);
  });
  
  if (targetEl && targetEl.parentNode) {
    targetEl.parentNode.insertBefore(btn, targetEl);
    console.log('LIKE 側快捷按鈕注入成功！');
  } else {
    console.warn('無法注入 LIKE 側快捷按鈕：目標元素無父節點');
  }
}

function removeButtonAndPanel() {
  const titleBtn = document.getElementById('yt-speed-plus-title-btn');
  if (titleBtn) {
    titleBtn.remove();
  }
  const likeBtn = document.getElementById('yt-speed-plus-like-btn');
  if (likeBtn) {
    likeBtn.remove();
  }
  const host = document.getElementById('yt-speed-plus-shadow-host');
  if (host) {
    host.remove();
    shadowHost = null;
    shadowRoot = null;
  }
}

function toggleShadowPanel(btn) {
  if (!shadowHost) {
    createShadowControlPanel();
  }
  
  const panel = shadowRoot.querySelector('.yt-speed-plus-floating-panel');
  if (!panel) return;
  
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'block';
    
    const rect = btn.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    let top = rect.bottom + scrollTop + 8;
    let left = rect.left + scrollLeft;
    
    const panelWidth = 300;
    if (left + panelWidth > window.innerWidth) {
      left = window.innerWidth - panelWidth - 20;
    }
    
    const panelHeight = 440;
    if (top + panelHeight > window.innerHeight + scrollTop) {
      top = rect.top + scrollTop - panelHeight - 8;
    }
    
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    
    updateShadowPanelUI();
  } else {
    panel.style.display = 'none';
  }
}

function createShadowControlPanel() {
  if (document.getElementById('yt-speed-plus-shadow-host')) {
    return;
  }
  
  shadowHost = document.createElement('div');
  shadowHost.id = 'yt-speed-plus-shadow-host';
  document.body.appendChild(shadowHost);
  
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = `
    .yt-speed-plus-floating-panel {
      position: absolute;
      width: 300px;
      padding: 20px;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: rgba(28, 28, 30, 0.85);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      color: #ffffff;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
      z-index: 99999;
      display: none;
      box-sizing: border-box;
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    
    .panel-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(135deg, #a5b4fc 0%, #c084fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
    }
    
    .panel-close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      line-height: 1;
      transition: color 0.2s ease;
    }
    
    .panel-close-btn:hover {
      color: #ffffff;
    }
    
    .speed-controls {
      margin-bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }
    
    .speed-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e5e7eb;
      padding: 6px 12px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
      font-weight: 500;
    }
    
    .speed-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
    }
    
    .speed-btn.active {
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .custom-speed {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
    }
    
    .custom-speed input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      text-align: center;
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
      outline: none;
      font-size: 13px;
      transition: border-color 0.2s ease;
    }
    
    .custom-speed input:focus {
      border-color: #818cf8;
    }
    
    .custom-speed button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .custom-speed button:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    .status-display {
      margin-bottom: 18px;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      font-size: 13px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
    }
    
    .loop-controls {
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .loop-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .loop-row label {
      font-size: 13px;
      color: #94a3b8;
    }
    
    .loop-row input {
      width: 80px;
      padding: 6px 10px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      text-align: center;
      background: rgba(255, 255, 255, 0.06);
      color: #ffffff;
      outline: none;
      font-size: 12px;
    }
    
    .loop-row input:focus {
      border-color: #818cf8;
    }
    
    .loop-btn-group {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 10px;
    }
    
    .loop-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e5e7eb;
      padding: 8px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
      font-weight: 500;
    }
    
    .loop-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      border-color: rgba(255, 255, 255, 0.25);
    }
    
    .loop-btn.active-run {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .loop-btn.active-stop {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-color: transparent;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .collector-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .collector-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .collector-title {
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .collector-shortcut-badge {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #94a3b8;
    }
    
    .collector-btn {
      width: 100%;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
      box-sizing: border-box;
    }
    
    .collector-btn:hover {
      background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
      transform: translateY(-1px);
    }

    .collector-btn:active {
      transform: translateY(0);
    }

    .collector-btn.loading {
      opacity: 0.8;
      cursor: wait;
    }

    .collector-btn.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .collector-btn.error {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .bookmark-panel-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .bookmark-btn-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bookmark-copy-md-btn {
      width: 100%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #cbd5e1;
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-sizing: border-box;
    }

    .bookmark-copy-md-btn:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      transform: translateY(-1px);
    }

    .bookmark-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      animation: bookmarkFadeIn 0.2s ease-out;
      box-sizing: border-box;
    }

    @keyframes bookmarkFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .bookmark-modal-card {
      width: 440px;
      max-width: 92vw;
      background: rgba(24, 24, 27, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6);
      color: #ffffff;
      font-family: inherit;
      box-sizing: border-box;
    }

    .bookmark-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .bookmark-modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #e0e7ff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bookmark-timestamp-tag {
      background: rgba(99, 102, 241, 0.3);
      border: 1px solid rgba(129, 140, 248, 0.5);
      color: #a5b4fc;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .bookmark-input-textarea {
      width: 100%;
      height: 85px;
      box-sizing: border-box;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 10px;
      padding: 10px 12px;
      color: #ffffff;
      font-size: 13px;
      font-family: inherit;
      resize: vertical;
      outline: none;
      margin-bottom: 14px;
      line-height: 1.5;
      transition: border-color 0.2s ease;
    }

    .bookmark-input-textarea:focus {
      border-color: #818cf8;
      background: rgba(255, 255, 255, 0.09);
    }

    .bookmark-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .bookmark-modal-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .bookmark-btn-cancel {
      background: rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .bookmark-btn-cancel:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .bookmark-btn-save {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
    }

    .bookmark-btn-save:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      transform: translateY(-1px);
    }
  `;
  shadowRoot.appendChild(style);
  
  const panel = document.createElement('div');
  panel.className = 'yt-speed-plus-floating-panel';

  const header = document.createElement('div');
  header.className = 'panel-header';
  const h3 = document.createElement('h3');
  h3.className = 'panel-title';
  h3.textContent = '🎬 YouTube Speed Plus';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'panel-close-btn';
  closeBtn.textContent = '×';
  header.append(h3, closeBtn);

  const speedControls = document.createElement('div');
  speedControls.className = 'speed-controls';
  ['0.25', '0.5', '0.75', '1', '1.5', '2', '3'].forEach(spd => {
    const sBtn = document.createElement('button');
    sBtn.className = 'speed-btn';
    sBtn.dataset.speed = spd;
    sBtn.textContent = `${spd}x`;
    speedControls.appendChild(sBtn);
  });

  const customSpeed = document.createElement('div');
  customSpeed.className = 'custom-speed';
  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.className = 'custom-speed-input';
  customInput.min = '0.1';
  customInput.max = '16';
  customInput.step = '0.1';
  customInput.value = '3';
  customInput.placeholder = '自訂';
  const customBtn = document.createElement('button');
  customBtn.className = 'custom-speed-btn';
  customBtn.textContent = '設定';
  customSpeed.append(customInput, customBtn);

  const statusDisplay = document.createElement('div');
  statusDisplay.className = 'status-display';
  statusDisplay.textContent = '目前速度: 1x';

  const loopControls = document.createElement('div');
  loopControls.className = 'loop-controls';

  function createLoopRow(labelText, className, min, value, step, placeholder) {
    const row = document.createElement('div');
    row.className = 'loop-row';
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement('input');
    input.type = 'number';
    input.className = className;
    if (min !== undefined) input.min = min;
    if (value !== undefined) input.value = value;
    if (step !== undefined) input.step = step;
    if (placeholder !== undefined) input.placeholder = placeholder;
    row.append(label, input);
    return row;
  }

  const loopRow1 = createLoopRow('循環次數 (0無限制)', 'loop-count-input', '0', '0');
  const loopRow2 = createLoopRow('起點 (秒)', 'loop-start-input', '0', undefined, '1', '留空從頭');
  const loopRow3 = createLoopRow('終點 (秒)', 'loop-end-input', '0', undefined, '1', '留空到尾');

  const loopBtnGroup1 = document.createElement('div');
  loopBtnGroup1.className = 'loop-btn-group';
  const capStartBtn = document.createElement('button');
  capStartBtn.className = 'loop-btn cap-start-btn';
  capStartBtn.textContent = '擷取為起點';
  const capEndBtn = document.createElement('button');
  capEndBtn.className = 'loop-btn cap-end-btn';
  capEndBtn.textContent = '擷取為終點';
  loopBtnGroup1.append(capStartBtn, capEndBtn);

  const loopBtnGroup2 = document.createElement('div');
  loopBtnGroup2.className = 'loop-btn-group';
  const startLoopBtn = document.createElement('button');
  startLoopBtn.className = 'loop-btn start-loop-btn';
  startLoopBtn.textContent = '開始循環';
  const stopLoopBtn = document.createElement('button');
  stopLoopBtn.className = 'loop-btn stop-loop-btn';
  stopLoopBtn.textContent = '停止循環';
  loopBtnGroup2.append(startLoopBtn, stopLoopBtn);

  loopControls.append(loopRow1, loopRow2, loopRow3, loopBtnGroup1, loopBtnGroup2);

  const collectorSection = document.createElement('div');
  collectorSection.className = 'collector-section';
  const collectorHeader = document.createElement('div');
  collectorHeader.className = 'collector-header';
  const collectorTitle = document.createElement('span');
  collectorTitle.className = 'collector-title';
  collectorTitle.textContent = '📥 ScrumClock 收集器';
  const collectorBadge = document.createElement('span');
  collectorBadge.className = 'collector-shortcut-badge';
  collectorBadge.textContent = 'Alt + S';
  collectorHeader.append(collectorTitle, collectorBadge);

  const sendToScrumBtn = document.createElement('button');
  sendToScrumBtn.className = 'collector-btn send-to-scrum-btn';
  const sendToScrumSpan = document.createElement('span');
  sendToScrumSpan.textContent = '📥 收集當前字幕至 ScrumClock';
  sendToScrumBtn.appendChild(sendToScrumSpan);

  collectorSection.append(collectorHeader, sendToScrumBtn);

  // 法說會/影音筆記打點區塊
  const bookmarkSection = document.createElement('div');
  bookmarkSection.className = 'bookmark-panel-section';
  const bookmarkHeader = document.createElement('div');
  bookmarkHeader.className = 'collector-header';
  const bookmarkTitle = document.createElement('span');
  bookmarkTitle.className = 'collector-title';
  bookmarkTitle.textContent = '⏱️ 法說會/影音筆記打點';
  const bookmarkBadge = document.createElement('span');
  bookmarkBadge.className = 'collector-shortcut-badge';
  bookmarkBadge.textContent = 'Alt + B';
  bookmarkHeader.append(bookmarkTitle, bookmarkBadge);

  const bookmarkBtnRow = document.createElement('div');
  bookmarkBtnRow.className = 'bookmark-btn-row';

  const batchSessionBtn = document.createElement('button');
  batchSessionBtn.className = 'collector-btn batch-to-scrum-panel-btn';
  batchSessionBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
  const batchSpan = document.createElement('span');
  batchSpan.textContent = '📦 打包草稿箱至 ScrumClock';
  batchSessionBtn.appendChild(batchSpan);

  const addBookmarkBtn = document.createElement('button');
  addBookmarkBtn.className = 'collector-btn add-bookmark-panel-btn';
  const addBookmarkSpan = document.createElement('span');
  addBookmarkSpan.textContent = '⏱️ 記錄時間標記 (Alt + B)';
  addBookmarkBtn.appendChild(addBookmarkSpan);

  const copyMdBtn = document.createElement('button');
  copyMdBtn.className = 'bookmark-copy-md-btn copy-markdown-panel-btn';
  copyMdBtn.textContent = '📋 複製本片 Markdown 筆記';

  bookmarkBtnRow.append(batchSessionBtn, addBookmarkBtn, copyMdBtn);
  bookmarkSection.append(bookmarkHeader, bookmarkBtnRow);

  panel.append(header, speedControls, customSpeed, statusDisplay, loopControls, collectorSection, bookmarkSection);
  
  // 建立法說會/影音時間戳記筆記記錄對話框 (Modal)
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'yt-speed-plus-bookmark-modal';
  modalOverlay.className = 'bookmark-modal-overlay';
  modalOverlay.style.display = 'none';

  const modalContent = document.createElement('div');
  modalContent.className = 'bookmark-modal-card';

  const modalHeader = document.createElement('div');
  modalHeader.className = 'bookmark-modal-header';

  const modalTitle = document.createElement('div');
  modalTitle.className = 'bookmark-modal-title';
  const titleSpan = document.createElement('span');
  titleSpan.textContent = '⏱️ 記錄法說會/影音重點';
  const timeTag = document.createElement('span');
  timeTag.className = 'bookmark-timestamp-tag';
  timeTag.id = 'bookmarkModalTimeTag';
  timeTag.textContent = '00:00';
  modalTitle.append(titleSpan, timeTag);

  const modalClose = document.createElement('button');
  modalClose.className = 'panel-close-btn';
  modalClose.textContent = '×';
  modalClose.id = 'bookmarkModalCloseBtn';

  modalHeader.append(modalTitle, modalClose);

  const modalTextarea = document.createElement('textarea');
  modalTextarea.id = 'bookmarkModalTextarea';
  modalTextarea.className = 'bookmark-input-textarea';
  modalTextarea.placeholder = '請輸入重點摘要 (Key Takeaway)，Enter 儲存 / Esc 取消...';

  const modalActions = document.createElement('div');
  modalActions.className = 'bookmark-modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'bookmarkModalCancelBtn';
  cancelBtn.className = 'bookmark-modal-btn bookmark-btn-cancel';
  cancelBtn.textContent = '取消 (Esc)';

  const saveBtn = document.createElement('button');
  saveBtn.id = 'bookmarkModalSaveBtn';
  saveBtn.className = 'bookmark-modal-btn bookmark-btn-save';
  saveBtn.textContent = '儲存重點 (Enter)';

  modalActions.append(cancelBtn, saveBtn);
  modalContent.append(modalHeader, modalTextarea, modalActions);
  modalOverlay.appendChild(modalContent);

  shadowRoot.append(panel, modalOverlay);
  
  shadowRoot.querySelector('.panel-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = 'none';
  });
  
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  bindShadowPanelEvents();
}

function bindShadowPanelEvents() {
  const speedBtns = shadowRoot.querySelectorAll('.speed-btn');
  speedBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const speed = parseFloat(this.dataset.speed);
      setVideoSpeed(speed);
    });
  });
  
  const customInput = shadowRoot.querySelector('.custom-speed-input');
  const customBtn = shadowRoot.querySelector('.custom-speed-btn');
  customBtn.addEventListener('click', function() {
    const speed = parseFloat(customInput.value);
    if (speed >= 0.1 && speed <= 16) {
      setVideoSpeed(speed);
    } else {
      alert('請輸入 0.1 到 16 之間的速度值');
    }
  });
  
  const startInput = shadowRoot.querySelector('.loop-start-input');
  const endInput = shadowRoot.querySelector('.loop-end-input');
  
  shadowRoot.querySelector('.cap-start-btn').addEventListener('click', function() {
    if (videoElement) {
      startInput.value = Math.floor(videoElement.currentTime);
    }
  });
  
  shadowRoot.querySelector('.cap-end-btn').addEventListener('click', function() {
    if (videoElement) {
      endInput.value = Math.floor(videoElement.currentTime);
    }
  });
  
  const countInput = shadowRoot.querySelector('.loop-count-input');
  const startLoopBtn = shadowRoot.querySelector('.start-loop-btn');
  const stopLoopBtn = shadowRoot.querySelector('.stop-loop-btn');
  
  startLoopBtn.addEventListener('click', function() {
    const loopCount = parseInt(countInput.value) || 0;
    const startVal = startInput.value !== '' ? parseFloat(startInput.value) : null;
    const endVal = endInput.value !== '' ? parseFloat(endInput.value) : null;
    
    if (startVal !== null && endVal !== null && startVal >= endVal) {
      alert('起點時間必須小於終點時間');
      return;
    }
    
    isLooping = true;
    maxLoopCount = loopCount;
    loopStart = startVal;
    loopEnd = endVal;
    currentLoopCount = 0;
    
    const startMsg = loopStart !== null ? Math.floor(loopStart) : 0;
    const endMsg = loopEnd !== null ? Math.floor(loopEnd) : '結尾';
    showNotification(`開始循環: ${startMsg}s - ${endMsg}s`);
    
    updateShadowPanelUI();
  });
  
  stopLoopBtn.addEventListener('click', function() {
    isLooping = false;
    showNotification('停止循環');
    updateShadowPanelUI();
  });

  const sendToScrumBtn = shadowRoot.querySelector('.send-to-scrum-btn');
  if (sendToScrumBtn) {
    const updateBtnText = (btn, text) => {
      btn.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      btn.appendChild(span);
    };

    sendToScrumBtn.addEventListener('click', async function() {
      if (sendToScrumBtn.classList.contains('loading')) return;
      
      const defaultText = '📥 收集當前字幕至 ScrumClock';
      sendToScrumBtn.classList.add('loading');
      updateBtnText(sendToScrumBtn, '⏳ 正在傳送至 ScrumClock...');
      
      try {
        const result = await sendNoteToScrumClock();
        sendToScrumBtn.classList.remove('loading');
        
        if (result && result.success) {
          sendToScrumBtn.classList.add('success');
          updateBtnText(sendToScrumBtn, '✅ 已收集至 ScrumClock！');
          setTimeout(() => {
            sendToScrumBtn.classList.remove('success');
            updateBtnText(sendToScrumBtn, defaultText);
          }, 2000);
        } else {
          sendToScrumBtn.classList.add('error');
          updateBtnText(sendToScrumBtn, '⚠️ 收集失敗');
          setTimeout(() => {
            sendToScrumBtn.classList.remove('error');
            updateBtnText(sendToScrumBtn, defaultText);
          }, 2500);
        }
      } catch (err) {
        sendToScrumBtn.classList.remove('loading');
        sendToScrumBtn.classList.add('error');
        updateBtnText(sendToScrumBtn, '⚠️ 發送異常');
        setTimeout(() => {
          sendToScrumBtn.classList.remove('error');
          updateBtnText(sendToScrumBtn, defaultText);
        }, 2500);
      }
    });
  }

  // 法說會草稿箱浮動面板與對話框事件
  const batchToScrumPanelBtn = shadowRoot.querySelector('.batch-to-scrum-panel-btn');
  if (batchToScrumPanelBtn) {
    batchToScrumPanelBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const defaultText = '📦 打包草稿箱至 ScrumClock';
      batchToScrumPanelBtn.textContent = '⏳ 打包傳送中...';
      const res = await packageSessionToScrumClock();
      if (res && res.success) {
        batchToScrumPanelBtn.textContent = '✅ 已成功整包匯出！';
      } else {
        batchToScrumPanelBtn.textContent = '⚠️ 打包未完成';
      }
      setTimeout(() => {
        batchToScrumPanelBtn.textContent = defaultText;
      }, 2500);
    });
  }

  const addBookmarkPanelBtn = shadowRoot.querySelector('.add-bookmark-panel-btn');
  if (addBookmarkPanelBtn) {
    addBookmarkPanelBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      openBookmarkModal();
    });
  }

  const copyMarkdownPanelBtn = shadowRoot.querySelector('.copy-markdown-panel-btn');
  if (copyMarkdownPanelBtn) {
    copyMarkdownPanelBtn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const meta = getVideoMetadata();
      const vId = getVideoId(meta.url);
      const bookmarks = await getStoredBookmarks(vId);
      if (!bookmarks || bookmarks.length === 0) {
        showNotification('⚠️ 本影片草稿箱尚無打點記錄，請先按 Alt + B 記錄');
        return;
      }
      chrome.storage.local.get(`vsp_ticker_${vId}`, async (store) => {
        const ticker = (store && store[`vsp_ticker_${vId}`]) || '';
        const md = generateMarkdownNotes(bookmarks, meta.title, meta.url, ticker);
        try {
          await navigator.clipboard.writeText(md);
          showNotification(`📋 已複製 ${bookmarks.length} 則聚合草稿 Markdown！`);
        } catch (_) {
          showNotification('⚠️ 剪貼簿存取受限，請改用擴充功能 Popup 匯出');
        }
      });
    });
  }

  // Bookmark Modal 互動邏輯
  const modal = shadowRoot.getElementById('yt-speed-plus-bookmark-modal');
  const textarea = shadowRoot.getElementById('bookmarkModalTextarea');
  const closeBtnModal = shadowRoot.getElementById('bookmarkModalCloseBtn');
  const cancelBtnModal = shadowRoot.getElementById('bookmarkModalCancelBtn');
  const saveBtnModal = shadowRoot.getElementById('bookmarkModalSaveBtn');

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
  };

  const handleSave = async () => {
    const text = textarea ? textarea.value.trim() : '';
    const sec = modal ? parseFloat(modal.dataset.seconds || '0') : 0;
    const timeStr = modal ? modal.dataset.timeFormatted || '00:00' : '00:00';
    closeModal();
    const res = await saveBookmark(text, sec);
    if (res.success) {
      showNotification(`📌 已儲存時間標記 [${timeStr}]`);
    } else {
      showNotification(`⚠️ 儲存失敗: ${res.error || '未知錯誤'}`);
    }
  };

  if (closeBtnModal) closeBtnModal.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
  if (cancelBtnModal) cancelBtnModal.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
  if (saveBtnModal) saveBtnModal.addEventListener('click', (e) => { e.stopPropagation(); handleSave(); });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });
  }
}

function updateShadowPanelUI() {
  if (!shadowRoot) return;
  
  const panel = shadowRoot.querySelector('.yt-speed-plus-floating-panel');
  if (!panel || panel.style.display !== 'block') return;
  
  const speedBtns = shadowRoot.querySelectorAll('.speed-btn');
  speedBtns.forEach(btn => {
    if (parseFloat(btn.dataset.speed) === currentSpeed) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  const statusDisp = shadowRoot.querySelector('.status-display');
  if (statusDisp) {
    statusDisp.textContent = `目前速度: ${currentSpeed}x`;
  }
  
  const countInput = shadowRoot.querySelector('.loop-count-input');
  const startInput = shadowRoot.querySelector('.loop-start-input');
  const endInput = shadowRoot.querySelector('.loop-end-input');
  
  if (countInput) countInput.value = maxLoopCount;
  if (startInput) startInput.value = loopStart !== null ? loopStart : '';
  if (endInput) endInput.value = loopEnd !== null ? loopEnd : '';
  
  const startLoopBtn = shadowRoot.querySelector('.start-loop-btn');
  const stopLoopBtn = shadowRoot.querySelector('.stop-loop-btn');
  
  if (startLoopBtn && stopLoopBtn) {
    if (isLooping) {
      startLoopBtn.classList.add('active-run');
      stopLoopBtn.classList.remove('active-stop');
    } else {
      startLoopBtn.classList.remove('active-run');
      stopLoopBtn.classList.add('active-stop');
      setTimeout(() => {
        stopLoopBtn.classList.remove('active-stop');
      }, 1000);
    }
  }
}

// ============================================================================
// 影片字幕與內容萃取模組 (Subtitle & Video Content Extractor)
// ============================================================================

function formatTimeDisplay(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

function getVideoMetadata() {
  let title = '';
  const titleSelectors = [
    'ytd-watch-metadata #title h1',
    'ytd-video-primary-info-renderer h1.title',
    'h1.ytd-watch-metadata',
    '#container > h1.title'
  ];
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText && el.innerText.trim()) {
      title = el.innerText.trim();
      break;
    }
  }
  if (!title) {
    title = (document.title || '').replace(' - YouTube', '').trim() || 'YouTube 影片';
  }

  const currentTime = videoElement ? videoElement.currentTime : 0;
  const formattedTime = formatTimeDisplay(currentTime);

  let url = window.location.href;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('t', `${Math.floor(currentTime)}s`);
    url = urlObj.toString();
  } catch (_) {}

  return {
    title: title,
    url: url,
    currentTime: formattedTime,
    seconds: Math.floor(currentTime)
  };
}

// 擷取當前播放畫面上的字幕片段
function extractCurrentSubtitles() {
  const segments = document.querySelectorAll('.ytp-caption-segment');
  if (segments && segments.length > 0) {
    const textArr = [];
    segments.forEach(seg => {
      const t = seg.innerText ? seg.innerText.trim() : '';
      if (t && !textArr.includes(t)) {
        textArr.push(t);
      }
    });
    if (textArr.length > 0) {
      return textArr.join(' ');
    }
  }

  // HTML5 標準 <track> 元素兜底
  if (videoElement && videoElement.textTracks && videoElement.textTracks.length > 0) {
    for (let i = 0; i < videoElement.textTracks.length; i++) {
      const track = videoElement.textTracks[i];
      if (track.mode === 'showing' && track.activeCues && track.activeCues.length > 0) {
        const cuesText = [];
        for (let j = 0; j < track.activeCues.length; j++) {
          if (track.activeCues[j].text) {
            cuesText.push(track.activeCues[j].text);
          }
        }
        if (cuesText.length > 0) return cuesText.join(' ');
      }
    }
  }

  return '';
}

// 擷取 YouTube 逐字稿 (Transcript) 面板段落
function extractTranscriptSnippet(currentSeconds) {
  const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
  if (!transcriptSegments || transcriptSegments.length === 0) {
    return null;
  }

  const items = [];
  transcriptSegments.forEach(seg => {
    const timeEl = seg.querySelector('.segment-timestamp, .segment-start-offset');
    const textEl = seg.querySelector('.segment-text');
    if (textEl && textEl.innerText) {
      items.push({
        timeStr: timeEl ? timeEl.innerText.trim() : '',
        text: textEl.innerText.trim()
      });
    }
  });

  if (items.length === 0) return null;

  const parseSeconds = (tStr) => {
    const parts = tStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  let closestIndex = 0;
  let minDiff = Infinity;
  items.forEach((item, idx) => {
    const sec = parseSeconds(item.timeStr);
    const diff = Math.abs(sec - currentSeconds);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = idx;
    }
  });

  const startIdx = Math.max(0, closestIndex - 2);
  const endIdx = Math.min(items.length, closestIndex + 3);
  return items.slice(startIdx, endIdx).map(it => `[${it.timeStr}] ${it.text}`).join('\n');
}

// 綜合萃取函式
function extractVideoContentForCollector() {
  const meta = getVideoMetadata();
  const transcript = extractTranscriptSnippet(meta.seconds);
  const currentSub = extractCurrentSubtitles();

  let finalText = '';
  let noteType = 'subtitle';

  if (transcript) {
    finalText = transcript;
    noteType = 'transcript';
  } else if (currentSub) {
    finalText = currentSub;
    noteType = 'subtitle';
  } else {
    finalText = `影片時間戳記 [${meta.currentTime}]：${meta.title}`;
    noteType = 'video_timestamp';
  }

  return {
    meta: meta,
    text: finalText,
    type: noteType
  };
}

// ============================================================================
// 跨插件防腐發送客戶端 (Cross-Plugin Client)
// ============================================================================

const DEFAULT_SCRUMCLOCK_ID = 'ahiihabnbjeoeneahcgbdcofncjoclcp';

async function getScrumClockExtensionId() {
  try {
    const data = await chrome.storage.local.get('scrumclockExtensionId');
    if (data && data.scrumclockExtensionId && data.scrumclockExtensionId.trim()) {
      return data.scrumclockExtensionId.trim();
    }
  } catch (_) {}
  return DEFAULT_SCRUMCLOCK_ID;
}

function sanitizeCollectorPayload(rawPayload) {
  const safeTitle = typeof rawPayload.title === 'string' ? rawPayload.title.trim().slice(0, 200) : 'YouTube 影片筆記';
  let safeUrl = typeof rawPayload.url === 'string' ? rawPayload.url.slice(0, 500) : '';
  const safeCurrentTime = typeof rawPayload.currentTime === 'string' ? rawPayload.currentTime.slice(0, 30) : '';
  let safeText = typeof rawPayload.text === 'string' ? rawPayload.text.trim().slice(0, 20000) : '';
  const safeType = typeof rawPayload.type === 'string' ? rawPayload.type.slice(0, 30) : 'subtitle';

  // 1. 保證攜帶標準 &t={seconds}s 參數
  if (safeUrl) {
    try {
      const u = new URL(safeUrl);
      if (!u.searchParams.has('t')) {
        let sec = 0;
        if (typeof rawPayload.seconds === 'number' && rawPayload.seconds > 0) {
          sec = Math.floor(rawPayload.seconds);
        } else if (safeCurrentTime) {
          const parts = safeCurrentTime.split(':').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            sec = parts[0] * 60 + parts[1];
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }
        if (sec > 0) {
          u.searchParams.set('t', `${sec}s`);
          safeUrl = u.toString();
        }
      }
    } catch (_) {}
  }

  // 2. 確保說明中含有可點擊的時間戳記導航 (若 safeText 尚未帶有超連結)
  if (safeUrl && safeCurrentTime && !safeText.includes(safeUrl)) {
    const timeNav = `\n\n⏱️ 時間戳記導航：[${safeCurrentTime}](${safeUrl})`;
    if (!safeText.includes(timeNav.trim())) {
      safeText += timeNav;
    }
  }

  const tags = ['#影片學習', '#YouTube'];
  if (safeCurrentTime) {
    tags.push(`#${safeCurrentTime}`);
  }

  let safeChecklist = undefined;
  if (Array.isArray(rawPayload.checklist)) {
    safeChecklist = rawPayload.checklist.map((item, idx) => ({
      id: String(item.id || `ck_${Date.now()}_${idx}`),
      text: String(item.text || '').trim().slice(0, 300),
      completed: Boolean(item.completed)
    }));
  }

  return {
    source: 'video_speed_plus',
    title: safeTitle,
    url: safeUrl,
    currentTime: safeCurrentTime,
    text: safeText,
    tags: tags,
    type: safeType,
    checklist: safeChecklist
  };
}

async function sendNoteToScrumClock(customPayload) {
  const extracted = customPayload || extractVideoContentForCollector();
  const payload = sanitizeCollectorPayload({
    title: extracted.meta ? extracted.meta.title : extracted.title,
    url: extracted.meta ? extracted.meta.url : extracted.url,
    currentTime: extracted.meta ? extracted.meta.currentTime : extracted.currentTime,
    seconds: extracted.meta ? extracted.meta.seconds : extracted.seconds,
    text: extracted.text,
    type: extracted.type
  });

  const message = {
    protocolVersion: 1,
    type: 'COLLECT_NOTE',
    payload: payload
  };

  const extId = await getScrumClockExtensionId();
  if (!extId) {
    console.warn('[VideoSpeedPlus] 尚未設定 ScrumClock 擴充功能 ID');
    showNotification('⚠️ 請先在 Speed Plus Popup 設定中填寫 ScrumClock Extension ID');
    return { success: false, error: 'NO_EXT_ID' };
  }

  return new Promise((resolve) => {
    let responded = false;
    const timer = setTimeout(() => {
      if (!responded) {
        responded = true;
        showNotification('⏱️ 連線 ScrumClock 超時，請確認 ScrumClock 已啟動');
        resolve({ success: false, error: 'TIMEOUT' });
      }
    }, 6000);

    try {
      chrome.runtime.sendMessage(extId, message, (response) => {
        if (responded) return;
        clearTimeout(timer);
        responded = true;

        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          console.warn('[VideoSpeedPlus] 傳送至 ScrumClock 失敗:', errMsg);
          showNotification('⚠️ 無法連線至 ScrumClock，請檢查 Extension ID 或重新載入');
          resolve({ success: false, error: errMsg });
          return;
        }

        if (response && response.success) {
          showNotification(`📥 已成功收集到 ScrumClock！[${payload.currentTime}]`);
          resolve({ success: true, noteId: response.noteId });
        } else {
          showNotification(`⚠️ 收集失敗: ${response?.error || '未知錯誤'}`);
          resolve({ success: false, error: response?.error });
        }
      });
    } catch (err) {
      if (!responded) {
        clearTimeout(timer);
        responded = true;
        showNotification('⚠️ 發送異常，請確認 ScrumClock 是否已啟用');
        resolve({ success: false, error: err.message });
      }
    }
  });
}

// ============================================================================
// 法說會影音時間戳打點與 Markdown 導出模組 (Timestamp Bookmarks & Markdown Export)
// ============================================================================

function getVideoId(urlStr) {
  try {
    const u = new URL(urlStr || window.location.href);
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || '';
    }
  } catch (_) {}
  return '';
}

async function getStoredBookmarks(videoId = null) {
  try {
    const data = await chrome.storage.local.get('vsp_bookmarks');
    const allBookmarks = Array.isArray(data.vsp_bookmarks) ? data.vsp_bookmarks : [];
    if (videoId) {
      return allBookmarks.filter(b => b.videoId === videoId);
    }
    return allBookmarks;
  } catch (_) {
    return [];
  }
}

async function saveBookmark(noteText, customTime = null) {
  const meta = getVideoMetadata();
  const vId = getVideoId(meta.url) || 'general_video';
  const sec = typeof customTime === 'number' ? customTime : meta.seconds;
  const timeFormatted = formatTimeDisplay(sec);

  let targetUrl = meta.url;
  try {
    const u = new URL(meta.url);
    u.searchParams.set('t', `${sec}s`);
    targetUrl = u.toString();
  } catch (_) {}

  const cleanNote = typeof noteText === 'string' ? noteText.trim().slice(0, 1000) : '';
  const newBookmark = {
    id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    videoId: vId,
    videoTitle: meta.title,
    url: targetUrl,
    timeSeconds: sec,
    timeFormatted: timeFormatted,
    note: cleanNote || `時間點 [${timeFormatted}] 重點標記`,
    createdAt: Date.now()
  };

  try {
    const all = await getStoredBookmarks();
    all.push(newBookmark);
    all.sort((a, b) => {
      if (a.videoId === b.videoId) {
        return a.timeSeconds - b.timeSeconds;
      }
      return b.createdAt - a.createdAt;
    });
    await chrome.storage.local.set({ vsp_bookmarks: all });
    return { success: true, bookmark: newBookmark };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteBookmark(bookmarkId) {
  try {
    const all = await getStoredBookmarks();
    const filtered = all.filter(b => b.id !== bookmarkId);
    await chrome.storage.local.set({ vsp_bookmarks: filtered });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function clearBookmarksForVideo(videoId) {
  try {
    const all = await getStoredBookmarks();
    const remaining = videoId ? all.filter(b => b.videoId !== videoId) : [];
    await chrome.storage.local.set({ vsp_bookmarks: remaining });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function generateMarkdownNotes(bookmarks, videoTitle, videoUrl, ticker = '') {
  const cleanTicker = (ticker || '').trim().toUpperCase();
  const rawTitle = videoTitle || '法說會/影音筆記';
  const title = cleanTicker ? `[${cleanTicker}] ${rawTitle}` : rawTitle;
  const cleanUrl = videoUrl ? videoUrl.split('&t=')[0] : '';
  const nowStr = new Date().toISOString().split('T')[0];

  const tagList = ['投研筆記', '法說會', '影音打點'];
  if (cleanTicker) {
    tagList.push(`$${cleanTicker}`);
  }
  const yamlTags = tagList.map(t => `  - ${t}`).join('\n');

  let md = `---
title: "法說會/影音筆記：${title}"
source_url: "${cleanUrl}"
ticker: "${cleanTicker}"
created: "${nowStr}"
tags:
${yamlTags}
---

# 🎬 法說會/影音投研筆記：${title}

- **影片來源**：[${rawTitle}](${cleanUrl})
- **研究標的**：${cleanTicker || '未指定'}
- **筆記總數**：${bookmarks.length} 個重點打點
- **匯出日期**：${new Date().toLocaleString('zh-TW')}

---

## 📌 時間戳記與重點摘要 (Key Takeaways)

| 時間戳 | 重點內容摘要 | 影音跳轉 |
| :--- | :--- | :--- |
`;

  bookmarks.forEach(bm => {
    const safeNote = bm.note.replace(/\|/g, '\\|');
    md += `| [${bm.timeFormatted}] | ${safeNote} | [${bm.timeFormatted} 跳轉](${bm.url}) |\n`;
  });

  md += `\n---

## 📋 追蹤核對清單 (Action Items / Checklist)

`;

  bookmarks.forEach(bm => {
    md += `- [ ] [${bm.timeFormatted}](${bm.url}) 複核重點：${bm.note}\n`;
  });

  md += `\n---

## 📝 逐點筆記清單

`;

  bookmarks.forEach(bm => {
    md += `- [${bm.timeFormatted}](${bm.url}) **重點**：${bm.note}\n`;
  });

  return md;
}

// 法說會草稿箱整包匯出至 ScrumClock 任務卡 (Session Draft Box Aggregator)
async function packageSessionToScrumClock(customOptions = {}) {
  const meta = getVideoMetadata();
  const vId = getVideoId(meta.url) || 'general_video';
  const bookmarks = await getStoredBookmarks(vId);
  
  if (!bookmarks || bookmarks.length === 0) {
    showNotification('⚠️ 草稿箱尚無記錄，請先新增時間戳重點');
    return { success: false, error: 'NO_BOOKMARKS' };
  }

  // 取得標的代號 (優先使用傳入參數，次之 storage)
  let ticker = (customOptions.ticker || '').trim().toUpperCase();
  if (!ticker) {
    try {
      const stored = await chrome.storage.local.get(`vsp_ticker_${vId}`);
      ticker = (stored && stored[`vsp_ticker_${vId}`]) ? stored[`vsp_ticker_${vId}`].trim().toUpperCase() : '';
    } catch (_) {}
  }

  const notesMd = generateMarkdownNotes(bookmarks, meta.title, meta.url, ticker);
  const prefix = ticker ? `【法說會/調研 $${ticker}】` : '【法說會/調研】';
  const safeTitle = `${prefix}${meta.title.slice(0, 60)} (${bookmarks.length} 個要點)`;

  const tags = ['#法說會', '#影音調研', '@Focus'];
  if (ticker) {
    tags.push(`$${ticker}`);
  }

  const checklistItems = bookmarks.map((bm, idx) => ({
    id: `ck_${bm.id || (Date.now() + '_' + idx)}`,
    text: `[${bm.timeFormatted}] ${bm.note}`,
    completed: false
  }));

  const taskPayload = {
    title: safeTitle,
    ticker: ticker,
    notes: notesMd,
    tags: tags,
    estimatedPomodoros: Math.max(1, Math.min(8, Math.ceil(bookmarks.length / 3))),
    url: meta.url,
    deepLinkUrl: bookmarks.length > 0 ? bookmarks[0].url : meta.url,
    gtdContext: '@Focus',
    priority: 'P1',
    sourcePlugin: 'VIDEO_SPEED_PLUS',
    checklist: checklistItems,
    createdAt: Date.now()
  };

  const extId = await getScrumClockExtensionId();
  if (!extId) {
    showNotification('⚠️ 請先在設定中配置 ScrumClock Extension ID');
    return { success: false, error: 'NO_EXT_ID' };
  }

  return new Promise((resolve) => {
    let responded = false;
    const timeoutTimer = setTimeout(() => {
      if (!responded) {
        responded = true;
        showNotification('⏱️ 打包拋送超時，請確認 ScrumClock 已啟動');
        resolve({ success: false, error: 'TIMEOUT' });
      }
    }, 6000);

    // 1. 優先嘗試發送 CREATE_TASK 建立結構化任務
    const messageTask = {
      protocolVersion: 2,
      type: 'CREATE_TASK',
      payload: taskPayload
    };

    try {
      chrome.runtime.sendMessage(extId, messageTask, (response) => {
        if (responded) return;

        if (!chrome.runtime.lastError && response && response.success) {
          clearTimeout(timeoutTimer);
          responded = true;
          showNotification(`📦 已成功將 ${bookmarks.length} 條草稿打包建立 ScrumClock 任務卡！`);
          resolve({ success: true, mode: 'CREATE_TASK', taskId: response.taskId, count: bookmarks.length });
          return;
        }

        // 2. 降級嘗試 COLLECT_NOTE (支援未知欄位忽略，text 完整包含 Checklist 條列)
        console.warn('[VideoSpeedPlus] CREATE_TASK 響應異常，降級嘗試 COLLECT_NOTE:', chrome.runtime.lastError?.message || response?.error);
        const notePayload = sanitizeCollectorPayload({
          title: safeTitle,
          url: meta.url,
          currentTime: bookmarks[0] ? bookmarks[0].timeFormatted : '00:00',
          seconds: bookmarks[0] ? bookmarks[0].timeSeconds : 0,
          text: notesMd,
          tags: tags,
          type: 'session_draft',
          checklist: checklistItems
        });

        chrome.runtime.sendMessage(extId, { protocolVersion: 2, type: 'COLLECT_NOTE', payload: notePayload }, (noteRes) => {
          if (responded) return;
          clearTimeout(timeoutTimer);
          responded = true;

          if (chrome.runtime.lastError) {
            showNotification('⚠️ 打包發送失敗: 無法連線至 ScrumClock');
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }

          if (noteRes && noteRes.success) {
            showNotification(`📦 已成功將 ${bookmarks.length} 條草稿收集至 ScrumClock！`);
            resolve({ success: true, mode: 'COLLECT_NOTE', noteId: noteRes.noteId, count: bookmarks.length });
          } else {
            showNotification(`⚠️ 打包失敗: ${noteRes?.error || '未知錯誤'}`);
            resolve({ success: false, error: noteRes?.error });
          }
        });
      });
    } catch (err) {
      if (!responded) {
        clearTimeout(timeoutTimer);
        responded = true;
        showNotification('⚠️ 打包異常: ' + err.message);
        resolve({ success: false, error: err.message });
      }
    }
  });
}

function openBookmarkModal() {
  if (!shadowHost) {
    createShadowControlPanel();
  }
  const modal = shadowRoot.getElementById('yt-speed-plus-bookmark-modal');
  const textarea = shadowRoot.getElementById('bookmarkModalTextarea');
  const timeTag = shadowRoot.getElementById('bookmarkModalTimeTag');
  if (!modal) return;

  const meta = getVideoMetadata();
  if (timeTag) timeTag.textContent = meta.currentTime;
  modal.dataset.seconds = meta.seconds;
  modal.dataset.timeFormatted = meta.currentTime;
  if (textarea) textarea.value = '';

  modal.style.display = 'flex';
  setTimeout(() => {
    if (textarea) textarea.focus();
  }, 50);
}

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 