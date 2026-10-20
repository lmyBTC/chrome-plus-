document.addEventListener('DOMContentLoaded', async () => {
  const userNameEl = document.getElementById('userName');
  const pomodoroDurationEl = document.getElementById('pomodoroDuration');
  const breakDurationEl = document.getElementById('breakDuration');
  const endOfDayReviewTimeEl = document.getElementById('endOfDayReviewTime');
  const northStarGoalEl = document.getElementById('northStarGoal');
  const weeklyMissionsEl = document.getElementById('weeklyMissions');
  const distractionSitesEl = document.getElementById('distractionSites');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const messageEl = document.getElementById('message');

  // 載入現有設定
  try {
    const result = await chrome.storage.local.get([
      'userSettings',
      'northStarGoal',
      'weeklyMissions'
    ]);

    const userSettings = result.userSettings || {};
    const northStarGoal = result.northStarGoal || {};
    const weeklyMissions = result.weeklyMissions || [];

    // 填入表單
    userNameEl.value = userSettings.userName || '';
    pomodoroDurationEl.value = userSettings.pomodoroDuration || 25;
    breakDurationEl.value = userSettings.breakDuration || 5;
    endOfDayReviewTimeEl.value = userSettings.endOfDayReviewTime || '21:00';
    northStarGoalEl.value = northStarGoal.text || '';
    weeklyMissionsEl.value = weeklyMissions.map(m => m.text).join('\n');
    distractionSitesEl.value = (userSettings.distractionSites || []).join('\n');
  } catch (error) {
    console.error('載入設定失敗:', error);
    showMessage('載入設定失敗', 'error');
  }

  // 儲存設定
  saveSettingsBtn.addEventListener('click', async () => {
    try {
      saveSettingsBtn.disabled = true;
      saveSettingsBtn.textContent = '儲存中...';

      // 解析週任務
      const weeklyMissionsText = weeklyMissionsEl.value.trim();
      const weeklyMissions = weeklyMissionsText
        ? weeklyMissionsText.split('\n')
            .filter(text => text.trim())
            .map((text, index) => ({
              id: `mission-${Date.now()}-${index}`,
              text: text.trim(),
              isCompleted: false
            }))
        : [];

      // 解析干擾網站
      const distractionSitesText = distractionSitesEl.value.trim();
      const distractionSites = distractionSitesText
        ? distractionSitesText.split('\n')
            .filter(site => site.trim())
            .map(site => site.trim())
        : [];

      // 準備儲存資料
      const userSettings = {
        userName: userNameEl.value.trim(),
        pomodoroDuration: parseInt(pomodoroDurationEl.value) || 25,
        breakDuration: parseInt(breakDurationEl.value) || 5,
        endOfDayReviewTime: endOfDayReviewTimeEl.value || '21:00',
        distractionSites
      };

      const northStarGoal = {
        id: 'north-star-goal',
        text: northStarGoalEl.value.trim()
      };

      // 儲存到 Chrome 儲存
      await chrome.storage.local.set({
        userSettings,
        northStarGoal,
        weeklyMissions
      });

      showMessage('設定已儲存', 'success');

      // 重新設定鬧鐘
      const [hours, minutes] = userSettings.endOfDayReviewTime.split(':');
      const reviewTime = new Date();
      reviewTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (reviewTime <= new Date()) {
        reviewTime.setDate(reviewTime.getDate() + 1);
      }

      await chrome.alarms.clear('dailyReview');
      await chrome.alarms.create('dailyReview', {
        when: reviewTime.getTime(),
        periodInMinutes: 24 * 60
      });

    } catch (error) {
      console.error('儲存設定失敗:', error);
      showMessage('儲存設定失敗', 'error');
    } finally {
      saveSettingsBtn.disabled = false;
      saveSettingsBtn.textContent = '儲存設定';
    }
  });

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = type;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 3000);
  }
}); 