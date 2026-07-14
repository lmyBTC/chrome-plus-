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
        tryInjectButton();
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
      
    default:
      sendResponse({error: '未知的動作'});
  }
  
  return true; // 保持訊息通道開啟
}

// 鍵盤快捷鍵支援
document.addEventListener('keydown', function(event) {
  // 只在 YouTube 頁面啟用快捷鍵
  if (!window.location.href.includes('youtube.com')) return;
  
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
  
  // 先嘗試直接注入一次
  tryInjectButton();
  
  // 監聽 DOM 變化以防延遲載入或路由切換
  titleObserver = new MutationObserver(function() {
    tryInjectButton();
  });
  
  titleObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function tryInjectButton() {
  // 檢查是否在影片播放頁面
  if (!window.location.href.includes('watch')) {
    removeButtonAndPanel();
    return;
  }
  
  // 如果已經有按鈕了，就不重複注入
  if (document.getElementById('yt-speed-plus-title-btn')) {
    return;
  }
  
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
  
  if (titleEl) {
    console.log('找到標題元素，準備注入快捷按鈕:', titleEl);
    injectButton(titleEl);
  }
}

function injectButton(titleEl) {
  const btn = document.createElement('button');
  btn.id = 'yt-speed-plus-title-btn';
  btn.setAttribute('title', 'YouTube Speed Plus 控制面板');
  
  // 使用火箭與速度計意象的 SVG 圖示
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 4px; vertical-align: middle;">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
    </svg>
    <span>Speed Plus 🚀</span>
  `;
  
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
  console.log('快捷按鈕注入成功！');
}

function removeButtonAndPanel() {
  const btn = document.getElementById('yt-speed-plus-title-btn');
  if (btn) {
    btn.remove();
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
    
    const panelHeight = 350;
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
  `;
  shadowRoot.appendChild(style);
  
  const panel = document.createElement('div');
  panel.className = 'yt-speed-plus-floating-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h3 class="panel-title">🎬 YouTube Speed Plus</h3>
      <button class="panel-close-btn">&times;</button>
    </div>
    
    <div class="speed-controls">
      <button class="speed-btn" data-speed="0.25">0.25x</button>
      <button class="speed-btn" data-speed="0.5">0.5x</button>
      <button class="speed-btn" data-speed="0.75">0.75x</button>
      <button class="speed-btn" data-speed="1">1x</button>
      <button class="speed-btn" data-speed="1.5">1.5x</button>
      <button class="speed-btn" data-speed="2">2x</button>
      <button class="speed-btn" data-speed="3">3x</button>
    </div>
    
    <div class="custom-speed">
      <input type="number" class="custom-speed-input" min="0.1" max="16" step="0.1" value="3" placeholder="自訂">
      <button class="custom-speed-btn">設定</button>
    </div>
    
    <div class="status-display">
      目前速度: 1x
    </div>
    
    <div class="loop-controls">
      <div class="loop-row">
        <label>循環次數 (0無限制)</label>
        <input type="number" class="loop-count-input" min="0" value="0">
      </div>
      <div class="loop-row">
        <label>起點 (秒)</label>
        <input type="number" class="loop-start-input" min="0" step="1" placeholder="留空從頭">
      </div>
      <div class="loop-row">
        <label>終點 (秒)</label>
        <input type="number" class="loop-end-input" min="0" step="1" placeholder="留空到尾">
      </div>
      <div class="loop-btn-group">
        <button class="loop-btn cap-start-btn">擷取為起點</button>
        <button class="loop-btn cap-end-btn">擷取為終點</button>
      </div>
      <div class="loop-btn-group">
        <button class="loop-btn start-loop-btn">開始循環</button>
        <button class="loop-btn stop-loop-btn">停止循環</button>
      </div>
    </div>
  `;
  
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

// 頁面載入完成後初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
} 