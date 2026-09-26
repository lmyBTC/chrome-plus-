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

// 顯示速度提示
function showSpeedNotification(speed) {
  showNotification(`播放速度: ${speed}x`);
}

// 顯示通用提示
function showNotification(message) {
  // 移除舊的提示
  const existingNotification = document.getElementById('yt-speed-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // 建立新的提示
  const notification = document.createElement('div');
  notification.id = 'yt-speed-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 25px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    font-weight: bold;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.textContent = message;
  
  // 添加動畫樣式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // 3 秒後自動移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
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

  // Alt + S 或 Ctrl + Shift + S：一鍵收集當前時間戳字幕與筆記至 ScrumClock
  const isAltS = event.altKey && (event.key === 's' || event.key === 'S' || event.code === 'KeyS');
  const isCtrlShiftS = event.ctrlKey && event.shiftKey && (event.key === 's' || event.key === 'S' || event.code === 'KeyS');
  if (isAltS || isCtrlShiftS) {
    event.preventDefault();
    console.log('[VideoSpeedPlus] 快捷鍵觸發：收集字幕與筆記至 ScrumClock');
    sendNoteToScrumClock();
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

  panel.append(header, speedControls, customSpeed, statusDisplay, loopControls, collectorSection);
  
  shadowRoot.appendChild(panel);
  
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

async function getScrumClockExtensionId() {
  try {
    const data = await chrome.storage.local.get('scrumclockExtensionId');
    if (data && data.scrumclockExtensionId && data.scrumclockExtensionId.trim()) {
      return data.scrumclockExtensionId.trim();
    }
  } catch (_) {}
  return null;
}

function sanitizeCollectorPayload(rawPayload) {
  const safeTitle = typeof rawPayload.title === 'string' ? rawPayload.title.trim().slice(0, 200) : 'YouTube 影片筆記';
  const safeUrl = typeof rawPayload.url === 'string' ? rawPayload.url.slice(0, 500) : '';
  const safeCurrentTime = typeof rawPayload.currentTime === 'string' ? rawPayload.currentTime.slice(0, 30) : '';
  const safeText = typeof rawPayload.text === 'string' ? rawPayload.text.trim().slice(0, 20000) : '';
  const safeType = typeof rawPayload.type === 'string' ? rawPayload.type.slice(0, 30) : 'subtitle';

  return {
    source: 'video_speed_plus',
    title: safeTitle,
    url: safeUrl,
    currentTime: safeCurrentTime,
    text: safeText,
    tags: ['#影片學習', '#YouTube'],
    type: safeType
  };
}

async function sendNoteToScrumClock(customPayload) {
  const extracted = customPayload || extractVideoContentForCollector();
  const payload = sanitizeCollectorPayload({
    title: extracted.meta ? extracted.meta.title : extracted.title,
    url: extracted.meta ? extracted.meta.url : extracted.url,
    currentTime: extracted.meta ? extracted.meta.currentTime : extracted.currentTime,
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

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 