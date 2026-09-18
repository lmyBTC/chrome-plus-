// 獲取使用者設定
export async function getUserSettings() {
  const result = await chrome.storage.local.get('userSettings');
  return result.userSettings || {
    endOfDayReviewTime: '21:00',
    distractionSites: ['facebook.com', 'youtube.com', 'twitter.com', 'instagram.com']
  };
}

// 計算下次回顧時間
export function getNextReviewTime(hours: number, minutes: number): number {
  const now = new Date();
  const reviewTime = new Date();
  reviewTime.setHours(hours, minutes, 0, 0);
  
  if (reviewTime <= now) {
    reviewTime.setDate(reviewTime.getDate() + 1);
  }
  
  return reviewTime.getTime();
}

// 開始專注模式 (使用 Declarative Net Request 網路層攔截)
export async function startFocusMode() {
  const settings = await getUserSettings();
  const sites: string[] = settings.distractionSites;
  
  if (!sites || sites.length === 0) return;

  const rules: any[] = sites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { 
      type: "redirect" as const, 
      redirect: { extensionPath: "/blocked.html" } 
    },
    condition: { 
      urlFilter: site, 
      resourceTypes: ["main_frame"] 
    }
  }));

  chrome.declarativeNetRequest.getDynamicRules((oldRules: any[]) => {
    const oldRuleIds = oldRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds,
      addRules: rules
    });
  });
}

// 停止專注模式
export function stopFocusMode() {
  chrome.declarativeNetRequest.getDynamicRules((oldRules: any[]) => {
    const oldRuleIds = oldRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldRuleIds
    });
  });
}

// 顯示回顧通知
export function showReviewNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Power Kit',
    message: '該進行日終回顧了！打開新分頁開始回顧今天的成果。'
  });
}

export function showSprintFinishedNotification() {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '衝刺結束',
    message: '太棒了！你的番茄鐘衝刺已經結束，快來記錄你的成果吧！'
  });
}

export function handleAlarm(alarm: chrome.alarms.Alarm) {
  if (alarm.name === 'dailyReview') {
    showReviewNotification();
  } else if (alarm.name === 'sprintFinished') {
    showSprintFinishedNotification();
  }
}
