/**
 * background.ts - Chrome Plus ScrumClock 核心背景服務工作線程 (Service Worker)
 * 職責：
 * 1. 番茄鐘精準定時守護 (Chrome Alarms API)
 * 2. 網路層防分心網站阻擋 (Declarative Net Request API)
 * 3. 跨插件黑盒訊息分發 (EXECUTE_ROUTER_ACTION, CREATE_TASK)
 * 4. 閒置期自動看板巡檢守護 (chrome.idle.onStateChanged + KanbanAuditor)
 */

import { KanbanAuditor } from '@/features/project-management/services/kanbanAuditor';
import { WeeklyMission } from '@/features/project-management/types';

const IDLE_DETECTION_SECONDS = 900; // 15 分鐘無操作進入閒置狀態
const AUDITOR = KanbanAuditor.getInstance();

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] ScrumClock Service Worker 已成功初始化安裝');
  // 配置閒置偵測間隔 (最低支援 60 秒)
  if (chrome.idle && typeof chrome.idle.setDetectionInterval === 'function') {
    chrome.idle.setDetectionInterval(IDLE_DETECTION_SECONDS);
  }
});

/**
 * 監聽使用者閒置狀態變更
 * 當進入 idle 且由鎖定/閒置喚醒為 active 時，執行無感看板理牌與通知
 */
if (chrome.idle && chrome.idle.onStateChanged) {
  chrome.idle.onStateChanged.addListener(async (newState) => {
    console.log(`[Background] 系統閒置狀態變更: ${newState}`);

    if (newState === 'idle' || newState === 'locked') {
      try {
        await executeBackgroundKanbanAudit();
      } catch (err) {
        console.warn('[Background] 背景閒置巡檢執行異常:', err);
      }
    } else if (newState === 'active') {
      // 喚醒時檢查是否有待確認的晨間/閒置後理牌通知
      await checkAndNotifyAuditResults();
    }
  });
}

/**
 * 在背景執行看板健康度評估與殭屍卡片自動檢索
 */
async function executeBackgroundKanbanAudit(): Promise<void> {
  const data = await chrome.storage.local.get(['weeklyMissions', 'lastAuditTimestamp']);
  const missions: WeeklyMission[] = data.weeklyMissions || [];
  if (missions.length === 0) return;

  const now = Date.now();
  const lastAudit = data.lastAuditTimestamp || 0;
  // 避免短時間重複掃描 (每 4 小時至多執行一次深度審計)
  if (now - lastAudit < 4 * 60 * 60 * 1000) {
    return;
  }

  const report = AUDITOR.auditBoard(missions, 3, 5);
  const downgradePlan = AUDITOR.generateZombieDowngradePlan(missions);

  await chrome.storage.local.set({
    lastAuditTimestamp: now,
    kanbanHealthReport: report,
    pendingZombieDowngrades: downgradePlan,
    hasUnreadAuditAlert: downgradePlan.length > 0 || report.isWipExceeded,
  });

  console.log(`[Background] 看板閒置巡檢完成: 健康度 ${report.healthScore}分, 停滯卡片 ${report.stalledCount} 項`);
}

/**
 * 當使用者重新回到電腦前 (active)，若有嚴重停滯或 WIP 超限則發布提示
 */
async function checkAndNotifyAuditResults(): Promise<void> {
  const data = await chrome.storage.local.get([
    'hasUnreadAuditAlert',
    'kanbanHealthReport',
    'pendingZombieDowngrades',
  ]);

  if (!data.hasUnreadAuditAlert || !data.kanbanHealthReport) return;

  const report = data.kanbanHealthReport;
  const zombieCount = (data.pendingZombieDowngrades || []).length;

  if (zombieCount > 0) {
    if (chrome.notifications) {
      chrome.notifications.create('scrumclock-zombie-alert', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🧹 ScrumClock 敏捷晨間理牌提醒',
        message: `偵測到 ${zombieCount} 張卡片已超過 5 天未推進。點擊開啟看板進行一鍵理牌與心流釋放！`,
        priority: 1,
      });
    }
  }

  // 標記為已通知
  await chrome.storage.local.set({ hasUnreadAuditAlert: false });
}

/**
 * 跨插件通訊與萬能路由器指令派發核心 (cross_plugin_contract v2.2)
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.action) return false;

  switch (message.action) {
    case 'EXECUTE_ROUTER_ACTION': {
      handleRouterAction(message.payload)
        .then((res) => sendResponse({ success: true, result: res }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // 保持非同步回應通道
    }

    case 'TRIGGER_MANUAL_KANBAN_AUDIT': {
      executeBackgroundKanbanAudit()
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    case 'CREATE_TASK': {
      handleDirectTaskCreation(message.payload)
        .then(() => sendResponse({ success: true }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    default:
      return false;
  }
});

/**
 * 處理來自 NanoIntentRouter 的具體動作指令
 */
async function handleRouterAction(payload: any): Promise<any> {
  if (!payload || !payload.type) {
    throw new Error('無效的 Router Action 格式');
  }

  const { type, params = {} } = payload;
  console.log(`[Background] 執行萬能路由動作: ${type}`, params);

  switch (type) {
    case 'START_TIMER': {
      const minutes = params.durationMinutes || 25;
      const title = params.taskTitle || '深度專注衝刺';
      // 設定計時器儲存狀態
      await chrome.storage.local.set({
        activeTimer: {
          isRunning: true,
          mode: 'sprint',
          durationMinutes: minutes,
          remainingSeconds: minutes * 60,
          currentTaskTitle: title,
          startedAt: Date.now(),
        },
      });
      // 註冊 Chrome 定時鬧鐘
      chrome.alarms.create('sprintFinished', { delayInMinutes: minutes });
      return { status: 'timer_started', minutes, title };
    }

    case 'STOP_TIMER': {
      chrome.alarms.clear('sprintFinished');
      await chrome.storage.local.set({
        activeTimer: { isRunning: false, remainingSeconds: 0 },
      });
      return { status: 'timer_stopped' };
    }

    case 'CREATE_TASK': {
      return await handleDirectTaskCreation(params);
    }

    case 'GTD_INBOX_TRIAGE': {
      // 廣播給側邊欄或看板直接開啟 Inbox Triage 對話框
      return { status: 'triage_requested' };
    }

    default:
      console.warn(`[Background] 未受支援的 Action Type: ${type}`);
      return { status: 'unhandled_action', type };
  }
}

/**
 * 建立任務卡片並安全寫入 Storage
 */
async function handleDirectTaskCreation(params: any): Promise<any> {
  const store = await chrome.storage.local.get(['weeklyMissions']);
  const missions: WeeklyMission[] = store.weeklyMissions || [];

  const newTask: WeeklyMission = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: params.title || params.taskTitle || '未命名戰役',
    status: params.status || 'inbox',
    estimatedPomodoros: params.estimatedPomodoros || 1,
    spentPomodoros: 0,
    tags: params.tag ? [params.tag] : ['@QuickCapture'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as any;

  missions.unshift(newTask);
  await chrome.storage.local.set({ weeklyMissions: missions });
  return { status: 'task_created', task: newTask };
}