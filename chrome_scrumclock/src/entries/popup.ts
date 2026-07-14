document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const openDashboardBtn = document.getElementById('openDashboard');
  const openOptionsBtn = document.getElementById('openOptions');

  if (!statusEl || !openDashboardBtn || !openOptionsBtn) {
    console.error('找不到必要的 DOM 元素');
    return;
  }

  // 載入當前狀態
  try {
    const result = await chrome.storage.local.get(['userSettings', 'dailyLogs']);
    const dailyLogs = result.dailyLogs || {};
    
    const today = new Date().toISOString().split('T')[0];
    const todayLog = dailyLogs[today];
    
    if (!todayLog || !todayLog.coreBattles || todayLog.coreBattles.length === 0) {
      statusEl.textContent = '今日尚未開始規劃';
    } else if (todayLog.review) {
      statusEl.textContent = '今日循環已完成';
    } else if (todayLog.sprintLogs && todayLog.sprintLogs.length > 0) {
      statusEl.textContent = `已完成 ${todayLog.sprintLogs.length} 個衝刺`;
    } else {
      statusEl.textContent = '已規劃，等待開始衝刺';
    }
  } catch (error) {
    statusEl.textContent = '載入狀態失敗';
    console.error('載入狀態失敗:', error);
  }

  // 打開儀表板
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://newtab' });
    window.close();
  });

  // 打開設定
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
});
