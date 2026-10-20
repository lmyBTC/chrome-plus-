// 專注模式狀態
let focusModeActive = false;
let distractionSites = [];

// ====== 番茄鐘全域計時邏輯 ======
let pomodoroTimer = null;
let pomodoroTimeLeft = 0; // 單位：秒
let pomodoroState = 'idle'; // idle, running, paused
let pomodoroMissionId = null;

function clearPomodoroTimer() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
}

function startPomodoro(durationSec, missionId) {
  console.log('background 啟動番茄鐘', durationSec, missionId);
  clearPomodoroTimer();
  pomodoroTimeLeft = durationSec;
  pomodoroState = 'running';
  pomodoroMissionId = missionId;
  pomodoroTimer = setInterval(() => {
    pomodoroTimeLeft--;
    console.log('background 倒數', pomodoroTimeLeft); // debug log
    if (pomodoroTimeLeft <= 0) {
      clearPomodoroTimer();
      pomodoroState = 'idle';
      pomodoroTimeLeft = 0;
      // 可在此發送通知或 message 給前端
      chrome.runtime.sendMessage({ type: 'POMODORO_FINISHED' });
    }
  }, 1000);
}

function pausePomodoro() {
  if (pomodoroState === 'running') {
    clearPomodoroTimer();
    pomodoroState = 'paused';
  }
}

function resumePomodoro() {
  if (pomodoroState === 'paused') {
    pomodoroState = 'running';
    pomodoroTimer = setInterval(() => {
      pomodoroTimeLeft--;
      if (pomodoroTimeLeft <= 0) {
        clearPomodoroTimer();
        pomodoroState = 'idle';
        pomodoroTimeLeft = 0;
        chrome.runtime.sendMessage({ type: 'POMODORO_FINISHED' });
      }
    }, 1000);
  }
}

function stopPomodoro() {
  clearPomodoroTimer();
  pomodoroState = 'idle';
  pomodoroTimeLeft = 0;
  pomodoroMissionId = null;
}

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('每日循環儀表板已安裝');
  
  // 設定每日回顧鬧鐘
  const userSettings = await getUserSettings();
  const [hours, minutes] = userSettings.endOfDayReviewTime.split(':');
  
  chrome.alarms.create('dailyReview', {
    when: getNextReviewTime(parseInt(hours), parseInt(minutes)),
    periodInMinutes: 24 * 60 // 每24小時重複
  });
});

// 監聽消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_FOCUS_MODE':
      startFocusMode();
      break;
    case 'STOP_FOCUS_MODE':
      stopFocusMode();
      break;
    // ====== 番茄鐘相關 ======
    case 'POMODORO_START': {
      // message: { durationSec, missionId }
      startPomodoro(message.durationSec, message.missionId);
      sendResponse({ success: true });
      break;
    }
    case 'POMODORO_PAUSE': {
      pausePomodoro();
      sendResponse({ success: true });
      break;
    }
    case 'POMODORO_RESUME': {
      resumePomodoro();
      sendResponse({ success: true });
      break;
    }
    case 'POMODORO_STOP': {
      stopPomodoro();
      sendResponse({ success: true });
      break;
    }
    case 'POMODORO_STATUS': {
      sendResponse({
        state: pomodoroState,
        timeLeft: pomodoroTimeLeft,
        missionId: pomodoroMissionId
      });
      break;
    }
  }
});

// 監聽分頁更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && focusModeActive) {
    checkAndBlockSite(tabId, tab.url);
  }
});

// 監聽鬧鐘
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReview') {
    showReviewNotification();
  }
});

// 獲取使用者設定
async function getUserSettings() {
  const result = await chrome.storage.local.get('userSettings');
  return result.userSettings || {
    endOfDayReviewTime: '21:00',
    distractionSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com']
  };
}

// 計算下次回顧時間
function getNextReviewTime(hours, minutes) {
  const now = new Date();
  const reviewTime = new Date();
  reviewTime.setHours(hours, minutes, 0, 0);
  
  if (reviewTime <= now) {
    reviewTime.setDate(reviewTime.getDate() + 1);
  }
  
  return reviewTime.getTime();
}

// 開始專注模式
async function startFocusMode() {
  const settings = await getUserSettings();
  distractionSites = settings.distractionSites;
  focusModeActive = true;
  
  // 檢查當前所有分頁
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => {
    if (tab.url) {
      checkAndBlockSite(tab.tabId, tab.url);
    }
  });
}

// 停止專注模式
function stopFocusMode() {
  focusModeActive = false;
  
  // 移除所有阻擋覆蓋
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: removeFocusOverlay
      }).catch(() => {
        // 忽略錯誤（例如無法在特殊頁面執行腳本）
      });
    });
  });
}

// 檢查並阻擋網站
function checkAndBlockSite(tabId, url) {
  if (!focusModeActive || !url) return;
  
  const isDistracting = distractionSites.some(site => url.includes(site));
  
  if (isDistracting) {
    chrome.scripting.executeScript({
      target: { tabId },
      func: addFocusOverlay
    }).catch(() => {
      // 忽略錯誤（例如無法在特殊頁面執行腳本）
    });
  }
}

// 添加專注覆蓋（在頁面中執行）
function addFocusOverlay() {
  if (document.getElementById('focus-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'focus-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-family: Arial, sans-serif;
    text-align: center;
  `;
  
  overlay.innerHTML = `
    <div>
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚀 正在衝刺中</h1>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">保持專注，完成你的核心戰役！</p>
      <p style="font-size: 1rem; opacity: 0.8;">衝刺結束後即可正常瀏覽</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// 移除專注覆蓋（在頁面中執行）
function removeFocusOverlay() {
  const overlay = document.getElementById('focus-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// 顯示回顧通知
function showReviewNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon128.png',
    title: '每日循環儀表板',
    message: '該進行日終回顧了！打開新分頁開始回顧今天的成果。'
  });
} 