// 應用狀態
let currentState = 'briefing'; // briefing, sprint, review, completed
let timer = null;
let timeLeft = 25 * 60; // 25分鐘
let isTimerRunning = false;
let currentSprint = null;
let selectedMissions = [];
let weeklyMissions = [];
let todayLog = {
  coreBattles: [],
  sprintLogs: [],
  review: null
};
let pomodoroStatusInterval = null;

// DOM 元素
const sections = {
  briefing: document.getElementById('briefing-section'),
  sprint: document.getElementById('sprint-section'),
  result: document.getElementById('result-section'),
  review: document.getElementById('review-section'),
  'review-history': document.getElementById('review-history-section'),
  completed: document.getElementById('completed-section')
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  await checkCurrentState();
  setupEventListeners();
  renderCurrentState();
});

// 載入資料
async function loadData() {
  try {
    const result = await chrome.storage.local.get(['weeklyMissions', 'userSettings']);
    weeklyMissions = result.weeklyMissions || [
      { id: 'mission-1', text: '完成產品規格書', isCompleted: false },
      { id: 'mission-2', text: '學習 React Hooks', isCompleted: false },
      { id: 'mission-3', text: '設計資料庫結構', isCompleted: false }
    ];
    
    const today = new Date().toISOString().split('T')[0];
    const dailyLogs = await chrome.storage.local.get('dailyLogs');
    todayLog = dailyLogs.dailyLogs?.[today] || { coreBattles: [], sprintLogs: [] };
  } catch (error) {
    console.error('載入資料失敗:', error);
  }
}

// 檢查當前狀態
async function checkCurrentState() {
  if (todayLog.coreBattles.length === 0) {
    currentState = 'briefing';
  } else if (todayLog.review) {
    currentState = 'completed';
  } else {
    // 檢查是否到了回顧時間
    const userSettings = await chrome.storage.local.get('userSettings');
    const endTime = userSettings.userSettings?.endOfDayReviewTime || '21:00';
    const [hours, minutes] = endTime.split(':');
    const reviewTime = new Date();
    reviewTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (new Date() >= reviewTime) {
      currentState = 'review';
    } else {
      currentState = 'sprint';
    }
  }
}

// 設定事件監聽器
function setupEventListeners() {
  // 側邊欄導航
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = link.getAttribute('data-section');
      navigateToSection(targetSection);
    });
  });
  
  // 開始衝刺按鈕
  document.getElementById('start-sprint-btn').addEventListener('click', startSprintMode);
  
  // 計時器控制
  document.getElementById('start-timer-btn').addEventListener('click', startTimer);
  document.getElementById('pause-timer-btn').addEventListener('click', pauseTimer);
  document.getElementById('stop-timer-btn').addEventListener('click', stopTimer);
  document.getElementById('resume-timer-btn').addEventListener('click', resumeTimer);
  
  // 成果記錄
  document.getElementById('save-result-btn').addEventListener('click', saveResult);
  document.getElementById('cancel-result-btn').addEventListener('click', cancelResult);
  
  // 回顧
  document.getElementById('save-review-btn').addEventListener('click', saveReview);
  
  // 回顧紀錄
  document.getElementById('history-filter').addEventListener('change', filterHistory);
  document.getElementById('export-history-btn').addEventListener('click', exportHistory);
  
  // 重新開始
  document.getElementById('restart-btn').addEventListener('click', restart);
}

// 導航到指定區塊
function navigateToSection(sectionId) {
  // 更新側邊欄活動狀態
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-section') === sectionId) {
      link.classList.add('active');
    }
  });
  
  // 隱藏所有區塊
  Object.values(sections).forEach(section => {
    if (section) section.classList.add('hidden');
  });
  
  // 顯示目標區塊
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove('hidden');
  }
  
  // 根據區塊渲染內容
  switch (sectionId) {
    case 'briefing-section':
      renderBriefing();
      break;
    case 'sprint-section':
      renderSprint();
      break;
    case 'review-section':
      renderReview();
      break;
    case 'review-history-section':
      renderReviewHistory();
      break;
    case 'completed-section':
      renderCompleted();
      break;
  }
}

// 渲染當前狀態
function renderCurrentState() {
  // 更新側邊欄活動狀態
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    const sectionId = link.getAttribute('data-section');
    if (sectionId === `${currentState}-section`) {
      link.classList.add('active');
    }
  });
  
  // 隱藏所有區塊
  Object.values(sections).forEach(section => {
    if (section) section.classList.add('hidden');
  });
  
  // 顯示當前區塊
  if (sections[currentState]) {
    sections[currentState].classList.remove('hidden');
  }
  
  // 根據狀態渲染內容
  switch (currentState) {
    case 'briefing':
      renderBriefing();
      break;
    case 'sprint':
      renderSprint();
      break;
    case 'review':
      renderReview();
      break;
    case 'completed':
      renderCompleted();
      break;
  }
}

// 渲染任務簡報
function renderBriefing() {
  const missionsList = document.getElementById('missions-list');
  missionsList.innerHTML = '';
  
  weeklyMissions.forEach(mission => {
    const missionItem = document.createElement('div');
    missionItem.className = 'mission-item';
    missionItem.innerHTML = `
      <input type="checkbox" id="${mission.id}" value="${mission.id}">
      <label for="${mission.id}">${mission.text}</label>
      <input type="text" class="time-input" placeholder="09:00-11:00" data-mission="${mission.id}">
    `;
    missionsList.appendChild(missionItem);
  });
  
  // 設定選取事件
  const checkboxes = missionsList.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updateSelectedMissions);
  });
}

// 更新選取的任務
function updateSelectedMissions() {
  selectedMissions = [];
  const checkboxes = document.querySelectorAll('#missions-list input[type="checkbox"]:checked');
  checkboxes.forEach(checkbox => {
    const missionId = checkbox.value;
    const timeInput = document.querySelector(`input[data-mission="${missionId}"]`);
    selectedMissions.push({
      missionId,
      committedTime: timeInput.value || '09:00-11:00'
    });
  });
}

// 開始衝刺模式
async function startSprintMode() {
  if (selectedMissions.length === 0) {
    alert('請至少選擇一個核心戰役');
    return;
  }
  
  // 儲存核心戰役
  todayLog.coreBattles = selectedMissions;
  await saveTodayLog();
  
  currentState = 'sprint';
  renderCurrentState();
}

// 渲染衝刺模式
function renderSprint() {
  const missionSelect = document.createElement('select');
  missionSelect.id = 'mission-select';
  missionSelect.innerHTML = '<option value="">選擇任務開始衝刺</option>';
  
  todayLog.coreBattles.forEach(battle => {
    const mission = weeklyMissions.find(m => m.id === battle.missionId);
    if (mission) {
      missionSelect.innerHTML += `<option value="${battle.missionId}">${mission.text} (${battle.committedTime})</option>`;
    }
  });
  
  const currentMission = document.getElementById('current-mission');
  currentMission.innerHTML = '<h3>當前任務</h3>';
  currentMission.appendChild(missionSelect);
  
  // 預設選中第一個任務並顯示文字
  if (missionSelect.options.length > 1) {
    missionSelect.selectedIndex = 1;
    const missionId = missionSelect.value;
    if (missionId) {
      const mission = weeklyMissions.find(m => m.id === missionId);
      document.getElementById('mission-text').textContent = mission.text;
    }
  }

  // 設定任務選擇事件
  missionSelect.addEventListener('change', (e) => {
    const missionId = e.target.value;
    if (missionId) {
      const mission = weeklyMissions.find(m => m.id === missionId);
      document.getElementById('mission-text').textContent = mission.text;
    }
  });

  // 在 renderCurrentState 或切換到 sprint 畫面時，查詢一次狀態
  chrome.runtime.sendMessage({ type: 'POMODORO_STATUS' }, (res) => {
    if (res && typeof res.timeLeft === 'number') {
      timeLeft = res.timeLeft;
      updateTimerDisplay();
      if (res.state === 'running') {
        isTimerRunning = true;
        startPomodoroStatusInterval();
      } else {
        isTimerRunning = false;
        stopPomodoroStatusInterval();
      }
    }
  });
}

// 開始計時器
function startTimer() {
  const missionSelect = document.getElementById('mission-select');
  if (!missionSelect.value) {
    alert('請先選擇一個任務');
    return;
  }
  // debug log
  console.log('啟動番茄鐘', missionSelect.value);
  isTimerRunning = true;
  currentSprint = {
    missionId: missionSelect.value,
    startTime: Date.now()
  };

  // 通知 background script 啟用專注模式
  chrome.runtime.sendMessage({
    type: 'START_FOCUS_MODE',
    payload: { missionId: missionSelect.value }
  });

  // 通知 background script 開始番茄鐘
  chrome.storage.local.get('userSettings', (result) => {
    const duration = (result.userSettings?.pomodoroDuration || 25) * 60;
    chrome.runtime.sendMessage({
      type: 'POMODORO_START',
      durationSec: duration,
      missionId: missionSelect.value
    }, () => {
      // 啟動狀態輪詢
      startPomodoroStatusInterval();
    });
  });

  // 更新按鈕狀態
  document.getElementById('start-timer-btn').classList.add('hidden');
  document.getElementById('pause-timer-btn').classList.remove('hidden');
}

// 暫停計時器
function pauseTimer() {
  chrome.runtime.sendMessage({ type: 'POMODORO_PAUSE' }, () => {
    isTimerRunning = false;
    document.getElementById('start-timer-btn').classList.add('hidden');
    document.getElementById('pause-timer-btn').classList.add('hidden');
    document.getElementById('resume-timer-btn').classList.remove('hidden');
  });
}

// 繼續計時器
function resumeTimer() {
  chrome.runtime.sendMessage({ type: 'POMODORO_RESUME' }, () => {
    isTimerRunning = true;
    document.getElementById('resume-timer-btn').classList.add('hidden');
    document.getElementById('pause-timer-btn').classList.remove('hidden');
    document.getElementById('start-timer-btn').classList.add('hidden');
    startPomodoroStatusInterval();
  });
}

// 停止計時器
function stopTimer() {
  chrome.runtime.sendMessage({ type: 'POMODORO_STOP' }, () => {
    isTimerRunning = false;
    timeLeft = 25 * 60;
    updateTimerDisplay();
    document.getElementById('start-timer-btn').classList.remove('hidden');
    document.getElementById('pause-timer-btn').classList.add('hidden');
    stopPomodoroStatusInterval();
    // 通知 background script 停用專注模式
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS_MODE' });
  });
}

// 更新計時器顯示
function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  document.getElementById('timer').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 顯示成果記錄區塊
function showResultSection() {
  currentState = 'result';
  renderCurrentState();
}

// 儲存成果
async function saveResult() {
  const result = document.getElementById('result-input').value.trim();
  if (!result) {
    alert('請輸入本次衝刺的具體產出成果');
    return;
  }
  
  if (currentSprint) {
    currentSprint.endTime = Date.now();
    currentSprint.result = result;
    todayLog.sprintLogs.push(currentSprint);
    await saveTodayLog();
  }
  
  // 重置計時器
  timeLeft = 25 * 60;
  updateTimerDisplay();
  currentSprint = null;
  
  // 通知 background script 停用專注模式
  chrome.runtime.sendMessage({ type: 'STOP_FOCUS_MODE' });
  
  // 回到衝刺模式
  currentState = 'sprint';
  renderCurrentState();
  
  // 清空輸入
  document.getElementById('result-input').value = '';
}

// 取消成果記錄
function cancelResult() {
  currentState = 'sprint';
  renderCurrentState();
  document.getElementById('result-input').value = '';
}

// 渲染回顧
function renderReview() {
  const sprintLogs = document.getElementById('sprint-logs');
  sprintLogs.innerHTML = '';
  
  if (todayLog.sprintLogs.length === 0) {
    sprintLogs.innerHTML = '<p>今日尚未完成任何衝刺</p>';
    return;
  }
  
  todayLog.sprintLogs.forEach((sprint, index) => {
    const mission = weeklyMissions.find(m => m.id === sprint.missionId);
    const startTime = new Date(sprint.startTime).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = new Date(sprint.endTime).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const logDiv = document.createElement('div');
    logDiv.className = 'sprint-log';
    logDiv.innerHTML = `
      <h4>衝刺 ${index + 1}: ${mission?.text || '未知任務'}</h4>
      <p>時間: ${startTime} - ${endTime}</p>
      <div class="result">成果: ${sprint.result}</div>
    `;
    sprintLogs.appendChild(logDiv);
  });
}

// 儲存回顧
async function saveReview() {
  const highlight = document.getElementById('highlight-input').value.trim();
  const lesson = document.getElementById('lesson-input').value.trim();
  const nextAction = document.getElementById('next-action-input').value.trim();
  
  if (!highlight || !lesson || !nextAction) {
    alert('請填寫所有回顧問題');
    return;
  }
  
  todayLog.review = { highlight, lesson, nextAction };
  await saveTodayLog();
  
  currentState = 'completed';
  renderCurrentState();
}

// 渲染完成狀態
function renderCompleted() {
  // 顯示今日完成的統計
  const completedSection = document.getElementById('completed-section');
  
  // 移除舊的統計資訊
  const oldStats = completedSection.querySelector('.stats');
  if (oldStats) {
    oldStats.remove();
  }
  
  const stats = document.createElement('div');
  stats.className = 'stats';
  stats.innerHTML = `
    <div style="text-align: center; margin: 20px 0;">
      <h3>今日完成統計</h3>
      <p>核心戰役：${todayLog.coreBattles.length} 個</p>
      <p>衝刺次數：${todayLog.sprintLogs.length} 次</p>
      <p>總專注時間：${todayLog.sprintLogs.length * 25} 分鐘</p>
    </div>
  `;
  
  // 插入到完成按鈕之前
  const restartBtn = completedSection.querySelector('#restart-btn');
  completedSection.insertBefore(stats, restartBtn.parentNode);
}

// 重新開始
function restart() {
  // 清除今日資料
  todayLog = { coreBattles: [], sprintLogs: [] };
  saveTodayLog();
  
  currentState = 'briefing';
  renderCurrentState();
}

// 渲染回顧紀錄
async function renderReviewHistory() {
  const historyList = document.getElementById('review-history-list');
  const noHistory = document.getElementById('no-history');
  
  try {
    const result = await chrome.storage.local.get('dailyLogs');
    const dailyLogs = result.dailyLogs || {};
    
    // 過濾有回顧記錄的日期
    const reviewDates = Object.keys(dailyLogs).filter(date => 
      dailyLogs[date].review && dailyLogs[date].review.highlight
    ).sort((a, b) => new Date(b) - new Date(a));
    
    if (reviewDates.length === 0) {
      historyList.innerHTML = '';
      noHistory.classList.remove('hidden');
      return;
    }
    
    noHistory.classList.add('hidden');
    historyList.innerHTML = '';
    
    // 應用過濾器
    const filter = document.getElementById('history-filter').value;
    const filteredDates = filterHistoryByDate(reviewDates, filter);
    
    filteredDates.forEach(date => {
      const log = dailyLogs[date];
      const historyItem = createHistoryItem(date, log);
      historyList.appendChild(historyItem);
    });
  } catch (error) {
    console.error('載入回顧紀錄失敗:', error);
    historyList.innerHTML = '<p style="color: #ef4444;">載入紀錄失敗</p>';
  }
}

// 建立歷史記錄項目
function createHistoryItem(date, log) {
  const historyItem = document.createElement('div');
  historyItem.className = 'history-item';
  
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  const stats = log.sprintLogs ? log.sprintLogs.length : 0;
  const totalTime = stats * 25;
  
  historyItem.innerHTML = `
    <div class="history-header">
      <div class="history-date">${formattedDate}</div>
      <div class="history-stats">
        <span>核心戰役: ${log.coreBattles ? log.coreBattles.length : 0} 個</span>
        <span>衝刺次數: ${stats} 次</span>
        <span>專注時間: ${totalTime} 分鐘</span>
      </div>
    </div>
    <div class="history-content">
      <div class="history-section">
        <h4>今日高光時刻</h4>
        <p>${log.review.highlight}</p>
      </div>
      <div class="history-section">
        <h4>最大教訓</h4>
        <p>${log.review.lesson}</p>
      </div>
      <div class="history-section">
        <h4>明日關鍵行動</h4>
        <p>${log.review.nextAction}</p>
      </div>
    </div>
  `;
  
  return historyItem;
}

// 根據日期過濾歷史記錄
function filterHistoryByDate(dates, filter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filter) {
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return dates.filter(date => new Date(date) >= weekAgo);
    case 'month':
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return dates.filter(date => new Date(date) >= monthAgo);
    case 'quarter':
      const quarterAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      return dates.filter(date => new Date(date) >= quarterAgo);
    default:
      return dates;
  }
}

// 過濾歷史記錄
function filterHistory() {
  renderReviewHistory();
}

// 匯出歷史記錄
async function exportHistory() {
  try {
    const result = await chrome.storage.local.get('dailyLogs');
    const dailyLogs = result.dailyLogs || {};
    
    // 過濾有回顧記錄的日期
    const reviewDates = Object.keys(dailyLogs).filter(date => 
      dailyLogs[date].review && dailyLogs[date].review.highlight
    ).sort((a, b) => new Date(b) - new Date(a));
    
    if (reviewDates.length === 0) {
      alert('尚無回顧記錄可匯出');
      return;
    }
    
    // 建立 CSV 內容
    let csvContent = '日期,核心戰役數,衝刺次數,專注時間(分鐘),高光時刻,最大教訓,明日關鍵行動\n';
    
    reviewDates.forEach(date => {
      const log = dailyLogs[date];
      const stats = log.sprintLogs ? log.sprintLogs.length : 0;
      const totalTime = stats * 25;
      const coreBattles = log.coreBattles ? log.coreBattles.length : 0;
      
      csvContent += `"${date}","${coreBattles}","${stats}","${totalTime}","${log.review.highlight.replaceAll('"', '""')}","${log.review.lesson.replaceAll('"', '""')}","${log.review.nextAction.replaceAll('"', '""')}"\n`;
    });
    
    // 下載 CSV 檔案
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `回顧紀錄_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('回顧紀錄已匯出！');
  } catch (error) {
    console.error('匯出失敗:', error);
    alert('匯出失敗，請稍後再試');
  }
}

// 儲存今日日誌
async function saveTodayLog() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await chrome.storage.local.get('dailyLogs');
    const dailyLogs = result.dailyLogs || {};
    dailyLogs[today] = todayLog;
    await chrome.storage.local.set({ dailyLogs });
  } catch (error) {
    console.error('儲存日誌失敗:', error);
  }
}

// ===== 新增：番茄鐘結束通知 =====
function showPomodoroNotification() {
  // Chrome 通知
  if (chrome && chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: '番茄鐘結束',
      message: '恭喜你完成一輪專注！請記錄本次成果。'
    });
  }
  // 系統/瀏覽器通知
  if (window.Notification) {
    if (Notification.permission === 'granted') {
      new Notification('番茄鐘結束', {
        body: '恭喜你完成一輪專注！請記錄本次成果。',
        icon: 'icon128.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('番茄鐘結束', {
            body: '恭喜你完成一輪專注！請記錄本次成果。',
            icon: 'icon128.png'
          });
        }
      });
    }
  }
} 

// 處理 background.js 發來的倒數結束通知
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POMODORO_FINISHED') {
    isTimerRunning = false;
    stopPomodoroStatusInterval();
    showPomodoroNotification();
    showResultSection();
  }
}); 

// 開始番茄鐘狀態輪詢
function startPomodoroStatusInterval() {
  stopPomodoroStatusInterval();
  pomodoroStatusInterval = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'POMODORO_STATUS' }, (res) => {
      console.log('輪詢 POMODORO_STATUS', res); // debug log
      if (res && typeof res.timeLeft === 'number') {
        timeLeft = res.timeLeft;
        updateTimerDisplay();
        // 狀態切換按鈕顯示
        if (res.state === 'paused') {
          document.getElementById('pause-timer-btn').classList.add('hidden');
          document.getElementById('resume-timer-btn').classList.remove('hidden');
          document.getElementById('start-timer-btn').classList.add('hidden');
        } else if (res.state === 'running') {
          document.getElementById('pause-timer-btn').classList.remove('hidden');
          document.getElementById('resume-timer-btn').classList.add('hidden');
          document.getElementById('start-timer-btn').classList.add('hidden');
        } else if (res.state === 'idle') {
          document.getElementById('pause-timer-btn').classList.add('hidden');
          document.getElementById('resume-timer-btn').classList.add('hidden');
          document.getElementById('start-timer-btn').classList.remove('hidden');
        }
        if (res.state === 'idle' && isTimerRunning) {
          isTimerRunning = false;
          stopPomodoroStatusInterval();
          showPomodoroNotification();
          showResultSection();
        }
      }
    });
  }, 1000);
}

// 停止番茄鐘狀態輪詢
function stopPomodoroStatusInterval() {
  if (pomodoroStatusInterval) {
    clearInterval(pomodoroStatusInterval);
    pomodoroStatusInterval = null;
  }
} 