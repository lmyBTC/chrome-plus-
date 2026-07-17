// 當彈出視窗載入時執行
document.addEventListener('DOMContentLoaded', function() {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const customSpeedInput = document.getElementById('customSpeed');
  const setCustomSpeedBtn = document.getElementById('setCustomSpeed');
  const statusDiv = document.getElementById('status');
  
  // 循環控制元素
  const loopCountInput = document.getElementById('loopCount');
  const loopStartInput = document.getElementById('loopStart');
  const loopEndInput = document.getElementById('loopEnd');
  const btnSetStart = document.getElementById('btnSetStart');
  const btnSetEnd = document.getElementById('btnSetEnd');
  const btnStartLoop = document.getElementById('btnStartLoop');
  const btnStopLoop = document.getElementById('btnStopLoop');
  
  // 輔助函數：發送訊息到 content script (具備 runtime.lastError 防禦性檢測)
  function sendMessageToContent(message, callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.warn("YouTube Speed Plus: 無法與影片頁面建立連線 (Content script 尚未載入)", chrome.runtime.lastError.message);
            if (callback) callback(null);
            return;
          }
          if (callback) callback(response);
        });
      }
    });
  }
  
  // 為每個速度按鈕添加點擊事件
  speedButtons.forEach(button => {
    button.addEventListener('click', function() {
      const speed = parseFloat(this.dataset.speed);
      setVideoSpeed(speed);
      
      // 更新按鈕狀態
      speedButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // 更新狀態顯示
      statusDiv.textContent = `目前速度: ${speed}x`;
    });
  });
  
  // 自訂速度設定
  setCustomSpeedBtn.addEventListener('click', function() {
    const customSpeed = parseFloat(customSpeedInput.value);
    if (customSpeed >= 0.1 && customSpeed <= 16) {
      setVideoSpeed(customSpeed);
      
      // 更新按鈕狀態
      speedButtons.forEach(btn => btn.classList.remove('active'));
      
      // 更新狀態顯示
      statusDiv.textContent = `目前速度: ${customSpeed}x`;
    } else {
      alert('請輸入 0.1 到 16 之間的速度值');
    }
  });
  
  // 設定影片速度的函數
  function setVideoSpeed(speed) {
    sendMessageToContent({
      action: 'setSpeed',
      speed: speed
    });
  }
  
  // 循環控制事件
  btnSetStart.addEventListener('click', function() {
    sendMessageToContent({ action: 'getCurrentTime' }, function(response) {
      if (response && response.currentTime !== undefined) {
        loopStartInput.value = Math.floor(response.currentTime);
      }
    });
  });

  btnSetEnd.addEventListener('click', function() {
    sendMessageToContent({ action: 'getCurrentTime' }, function(response) {
      if (response && response.currentTime !== undefined) {
        loopEndInput.value = Math.floor(response.currentTime);
      }
    });
  });

  btnStartLoop.addEventListener('click', function() {
    const loopCount = parseInt(loopCountInput.value) || 0;
    const loopStart = loopStartInput.value !== '' ? parseFloat(loopStartInput.value) : null;
    const loopEnd = loopEndInput.value !== '' ? parseFloat(loopEndInput.value) : null;
    
    if (loopStart !== null && loopEnd !== null && loopStart >= loopEnd) {
      alert('起點時間必須小於終點時間');
      return;
    }
    
    sendMessageToContent({
      action: 'startLoop',
      loopCount: loopCount,
      loopStart: loopStart,
      loopEnd: loopEnd
    }, function(response) {
      if (response && response.success) {
        btnStartLoop.classList.add('active');
        btnStopLoop.classList.remove('active');
      }
    });
  });

  btnStopLoop.addEventListener('click', function() {
    sendMessageToContent({ action: 'stopLoop' }, function(response) {
      if (response && response.success) {
        btnStartLoop.classList.remove('active');
        btnStopLoop.classList.add('active');
        setTimeout(() => btnStopLoop.classList.remove('active'), 1000);
      }
    });
  });
  
  // 檢查當前頁面是否為 YouTube
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0 && tabs[0].url) {
      const currentUrl = tabs[0].url;
      if (!currentUrl.includes('youtube.com')) {
        statusDiv.textContent = '請在 YouTube 頁面使用此擴充功能';
        speedButtons.forEach(btn => btn.disabled = true);
        setCustomSpeedBtn.disabled = true;
      } else {
        // 獲取當前影片速度
        sendMessageToContent({
          action: 'getCurrentSpeed'
        }, function(response) {
          if (response && response.speed) {
            statusDiv.textContent = `目前速度: ${response.speed}x`;
            
            // 高亮對應的按鈕
            speedButtons.forEach(btn => {
              if (parseFloat(btn.dataset.speed) === response.speed) {
                btn.classList.add('active');
              }
            });
          }
        });
        
        // 獲取當前循環狀態
        sendMessageToContent({
          action: 'getLoopStatus'
        }, function(response) {
          if (response && response.isLooping) {
            btnStartLoop.classList.add('active');
            if (response.loopCount !== null) loopCountInput.value = response.loopCount;
            if (response.loopStart !== null) loopStartInput.value = response.loopStart;
            if (response.loopEnd !== null) loopEndInput.value = response.loopEnd;
          }
        });
      }
    }
  });
}); 