import { profiler } from '../scripts/resource-profiler.js';
import {
  classifyDomain,
  isWorkDomain,
  isStaticDomain,
  formatDuration as formatSeconds,
  CATEGORY_TYPES,
  CATEGORY_META
} from '../scripts/domain-classifier.js';
import {
  sanitizeUrl,
  sanitizeText,
  sanitizeLogItem,
  sanitizeLogs,
  sanitizeTimeStats,
  sanitizeData
} from '../scripts/privacy-sanitizer.js';

/**
 * Browser Activity Monitor - Side Panel 控制腳本
 * 管理活動串流即時展示 (30筆環形緩衝區)、雙軌隨選檢測控制台、結構化檢測報告卡、網站原生權限審查與停留時長看板。
 */

// 常數設定
const MAX_RING_BUFFER = 30; // 環形緩衝區上限，嚴格將前端 DOM 節點數控制在 100 以內

// 狀態管理
let port = null;
let currentTab = null;
let logs = [];
let currentFilter = 'all';
let currentCatFilter = 'all'; // 'all' | 'work' | 'leisure' | 'static' (AM-02)
let autoScroll = true;
let isInspectorActive = false;

// 智慧網域過濾狀態 (AM-V01) 與跨插件衝刺狀態 (SF-03)
let onlyWorkFilter = false;
let hideStaticFilter = false;
let currentSprintState = null;

// 雙軌 Session 狀態管理
let currentSessionState = {
  status: 'IDLE',
  mode: null,
  startTime: null,
  durationMs: null,
  eventCount: 0
};
let sessionTimerInterval = null;
let currentView = 'stream'; // 'stream' | 'reports'
let recentReports = [];
let activeReport = null;

// 停留時長看板狀態 (AM-01 & AM-02)
let isTimeTrackerExpanded = true;
let currentTimeStats = null;
let currentActiveTabSnapshot = null;
let timeStatsPollingTimer = null;

// 資源監視器狀態
let isProfilerExpanded = false;
let profilerUpdateTimer = null;
let latestBackgroundSummary = null;

// DOM 元素快取
const dom = {
  connectionStatus: document.getElementById('connection-status'),
  currentOrigin: document.getElementById('current-origin'),
  currentTabId: document.getElementById('current-tab-id'),

  // AM-01 & AM-02 有效停留時間看板 DOM
  timeTrackerSection: document.getElementById('time-tracker-section'),
  btnToggleTimeTracker: document.getElementById('btn-toggle-time-tracker'),
  timeTrackerCollapseIcon: document.getElementById('time-tracker-collapse-icon'),
  timeTrackerFocusPill: document.getElementById('time-tracker-focus-pill'),
  btnRefreshTimeStats: document.getElementById('btn-refresh-time-stats'),
  btnExportTimeStats: document.getElementById('btn-export-time-stats'),
  btnClearTimeLogs: document.getElementById('btn-clear-time-logs'),
  timeTrackerBody: document.getElementById('time-tracker-body'),
  timeKpiTotal: document.getElementById('time-kpi-total'),
  timeKpiWork: document.getElementById('time-kpi-work'),
  timeKpiLeisure: document.getElementById('time-kpi-leisure'),
  timeKpiOther: document.getElementById('time-kpi-other'),
  segProd: document.getElementById('seg-prod'),
  segComm: document.getElementById('seg-comm'),
  segLeisure: document.getElementById('seg-leisure'),
  segOther: document.getElementById('seg-other'),
  legendPctProd: document.getElementById('legend-pct-prod'),
  legendPctComm: document.getElementById('legend-pct-comm'),
  legendPctLeisure: document.getElementById('legend-pct-leisure'),
  legendPctOther: document.getElementById('legend-pct-other'),
  topDomainsCount: document.getElementById('top-domains-count'),
  topDomainsList: document.getElementById('top-domains-list'),
  filterCatBtns: document.querySelectorAll('.filter-cat-btn'),

  // 雙軌隨選檢測控制台 DOM
  sessionCard: document.getElementById('session-card'),
  sessionIndicator: document.getElementById('session-indicator'),
  sessionStatusTitle: document.getElementById('session-status-title'),
  sessionStatusSub: document.getElementById('session-status-sub'),
  sessionMetricBadge: document.getElementById('session-metric-badge'),
  sessionMetricTimer: document.getElementById('session-metric-timer'),
  sessionMetricEvents: document.getElementById('session-metric-events'),
  sessionIdleActions: document.getElementById('session-idle-actions'),
  sessionRunningActions: document.getElementById('session-running-actions'),
  btnStartTimed: document.getElementById('btn-start-timed'),
  btnStartContinuous: document.getElementById('btn-start-continuous'),
  btnStopSession: document.getElementById('btn-stop-session'),
  sessionRunningModeText: document.getElementById('session-running-mode-text'),

  // 原生權限審查 DOM
  btnRefreshPermissions: document.getElementById('btn-refresh-permissions'),
  permissionsContainer: document.getElementById('permissions-container'),

  // 深度動態探針 DOM
  btnToggleInspector: document.getElementById('btn-toggle-inspector'),
  inspectorBtnText: document.getElementById('inspector-btn-text'),
  inspectorSpinner: document.getElementById('inspector-spinner'),
  inspectorStatusBadge: document.getElementById('inspector-status-badge'),
  inspectorStatusText: document.getElementById('inspector-status-text'),

  // 視圖切換標籤 DOM
  tabBtnStream: document.getElementById('tab-btn-stream'),
  tabBtnReports: document.getElementById('tab-btn-reports'),
  badgeStreamBuffer: document.getElementById('badge-stream-buffer'),
  badgeReportsCount: document.getElementById('badge-reports-count'),
  viewSectionStream: document.getElementById('view-section-stream'),
  viewSectionReports: document.getElementById('view-section-reports'),

  // 即時串流視圖 DOM
  streamContainer: document.getElementById('stream-container'),
  streamList: document.getElementById('stream-list'),
  emptyState: document.getElementById('empty-state'),
  countAll: document.getElementById('count-all'),
  countProbe: document.getElementById('count-probe'),
  countNetwork: document.getElementById('count-network'),
  countDownload: document.getElementById('count-download'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  btnFilterWork: document.getElementById('btn-filter-work'),
  btnFilterHideStatic: document.getElementById('btn-filter-hide-static'),
  sprintReviewBanner: document.getElementById('sprint-review-banner'),
  sprintBannerMissionTitle: document.getElementById('sprint-banner-mission-title'),
  sprintBannerDuration: document.getElementById('sprint-banner-duration'),
  sprintBannerTimeStart: document.getElementById('sprint-banner-time-start'),
  sanitizeCheckbox: document.getElementById('sanitize-checkbox'),
  btnExportLogs: document.getElementById('btn-export-logs'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  footerLogCount: document.getElementById('footer-log-count'),
  autoScrollCheckbox: document.getElementById('auto-scroll-checkbox'),

  // 階段檢測報告視圖 DOM
  reportViewContainer: document.getElementById('report-view-container'),
  reportsEmptyState: document.getElementById('reports-empty-state'),
  reportContent: document.getElementById('report-content'),
  reportHistoryList: document.getElementById('report-history-list'),
  btnClearReports: document.getElementById('btn-clear-reports'),

  // 資源監視器相關 DOM
  resourceMonitorSection: document.getElementById('resource-monitor-section'),
  btnToggleProfiler: document.getElementById('btn-toggle-profiler'),
  profilerCollapseIcon: document.getElementById('profiler-collapse-icon'),
  profilerHealthBadge: document.getElementById('profiler-health-badge'),
  btnRefreshProfiler: document.getElementById('btn-refresh-profiler'),
  btnResetProfiler: document.getElementById('btn-reset-profiler'),
  profilerBody: document.getElementById('profiler-body'),
  kpiDomCount: document.getElementById('kpi-dom-count'),
  kpiMemoryVal: document.getElementById('kpi-memory-val'),
  kpiQueueCount: document.getElementById('kpi-queue-count'),
  kpiAvgLatency: document.getElementById('kpi-avg-latency'),
  profilerTotalTime: document.getElementById('profiler-total-time'),
  profilerModulesList: document.getElementById('profiler-modules-list'),
  profilerRecBadge: document.getElementById('profiler-rec-badge'),
  profilerRecommendationsList: document.getElementById('profiler-recommendations-list')
};

// 格式化工具函數
function formatTime(timestamp) {
  const d = new Date(timestamp);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

function formatFullDateTime(timestamp) {
  const d = new Date(timestamp);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDuration(ms) {
  if (ms == null || isNaN(ms)) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}s`;
}

function getOriginFromUrl(url) {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url;
  }
}

// 建立或重新建立 Background Port 長連接
function connectPort() {
  if (port) {
    try {
      port.disconnect();
    } catch {
      // 忽略已斷線錯誤
    }
  }

  try {
    port = chrome.runtime.connect({ name: 'monitor-stream' });
    dom.connectionStatus.classList.remove('offline');
    dom.connectionStatus.title = '背景服務連接正常';

    port.onMessage.addListener(handlePortMessage);

    port.onDisconnect.addListener(() => {
      dom.connectionStatus.classList.add('offline');
      dom.connectionStatus.title = '背景服務連線中斷，正在嘗試重新連接...';
      port = null;
      if (timeStatsPollingTimer) {
        clearInterval(timeStatsPollingTimer);
        timeStatsPollingTimer = null;
      }
      setTimeout(connectPort, 2000);
    });

    // 連線成功後查詢當前 Session 狀態、歷史報告與停留時長
    port.postMessage({ type: 'GET_SESSION_STATUS' });
    port.postMessage({ type: 'GET_RECENT_REPORTS', limit: 20 });
    requestTimeStats();
    startTimeStatsPolling();
  } catch (err) {
    console.warn('[BAM Sidepanel] 連接 Background 失敗:', err);
    dom.connectionStatus.classList.add('offline');
    setTimeout(connectPort, 2000);
  }
}

// 發送停留時長查詢請求 (AM-01)
function requestTimeStats() {
  if (port) {
    port.postMessage({ type: 'GET_TIME_STATS' });
  }
}

// 定期輪詢活躍分頁即時時長以保持看板秒數脈動
function startTimeStatsPolling() {
  if (timeStatsPollingTimer) clearInterval(timeStatsPollingTimer);
  timeStatsPollingTimer = setInterval(() => {
    if (port) {
      port.postMessage({ type: 'GET_ACTIVE_TAB_TIME' });
    }
  }, 4000);
}

// 處理來自 Background Port 的廣播訊息
function handlePortMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'ACTIVITY_LOG':
      appendLog(msg.log);
      break;

    case 'SPRINT_SESSION_CHANGED':
      updateSprintUI(msg.sprint);
      break;

    case 'SESSION_STATE_CHANGED':
      updateSessionUI(msg.session);
      break;

    case 'SESSION_STATUS_RESULT':
      updateSessionUI(msg.session);
      break;

    case 'SESSION_REPORT_CREATED':
      activeReport = msg.report;
      renderReportCard(msg.report);
      switchView('reports');
      if (port) {
        port.postMessage({ type: 'GET_RECENT_REPORTS', limit: 20 });
      }
      break;

    case 'RECENT_REPORTS_RESULT':
      if (Array.isArray(msg.reports)) {
        recentReports = msg.reports;
        renderHistoryList(recentReports);
        dom.badgeReportsCount.textContent = recentReports.length;
        if (!activeReport && recentReports.length > 0) {
          activeReport = recentReports[0];
          renderReportCard(activeReport);
        }
      }
      break;

    case 'ALL_REPORTS_CLEARED':
      recentReports = [];
      activeReport = null;
      renderHistoryList([]);
      dom.badgeReportsCount.textContent = '0';
      dom.reportsEmptyState.style.display = 'flex';
      dom.reportContent.style.display = 'none';
      break;

    case 'AUDIT_RESULT':
      if (currentTab && msg.origin === currentTab.origin) {
        renderPermissions(msg.settings);
      }
      break;

    case 'INSPECT_INSPECTOR_RESULT':
    case 'INSPECTOR_STATUS_RESULT':
    case 'INSPECTOR_STATUS_CHANGED':
      if (currentTab && msg.tabId === currentTab.id) {
        updateInspectorState(Boolean(msg.active));
      }
      break;

    case 'ALL_LOGS_CLEARED':
      logs = [];
      renderList();
      updateCounters();
      break;

    case 'BACKGROUND_PROFILER_METRICS_RESULT':
      latestBackgroundSummary = msg.summary;
      renderProfilerPanel();
      break;

    case 'BACKGROUND_PROFILER_RESET_COMPLETED':
      latestBackgroundSummary = null;
      renderProfilerPanel();
      break;

    // AM-01 & AM-02 停留時長統計與即時更新
    case 'TIME_STATS_RESULT':
      currentTimeStats = msg.stats;
      currentActiveTabSnapshot = msg.activeSnapshot;
      renderTimeTrackerUI(msg.stats, msg.activeSnapshot);
      break;

    case 'TIME_STATS_UPDATED':
      requestTimeStats();
      break;

    case 'ACTIVE_TAB_TIME_RESULT':
      currentActiveTabSnapshot = msg.activeSnapshot;
      renderTimeTrackerUI(currentTimeStats, msg.activeSnapshot);
      break;

    case 'ALL_TIME_LOGS_CLEARED':
      currentTimeStats = null;
      currentActiveTabSnapshot = null;
      renderTimeTrackerUI(null, null);
      break;

    default:
      break;
  }
}

// 判定日誌是否符合過濾條件 (AM-01 & AM-02)
function isLogItemMatched(item) {
  if (!item) return false;
  if (currentFilter !== 'all' && item.category !== currentFilter) {
    return false;
  }
  const info = classifyDomain(item.url || item.origin);
  if (onlyWorkFilter && !isWorkDomain(info.category)) {
    return false;
  }
  if (hideStaticFilter && isStaticDomain(info.category)) {
    return false;
  }
  // AM-02: 依分類標籤一鍵過濾 (全部、工作、娛樂、靜態)
  if (currentCatFilter === 'work' && !isWorkDomain(info.category)) {
    return false;
  }
  if (currentCatFilter === 'leisure' && info.category !== CATEGORY_TYPES.LEISURE) {
    return false;
  }
  if (currentCatFilter === 'static' && !isStaticDomain(info.category)) {
    return false;
  }
  return true;
}

// 更新衝刺審查橫幅與模式 (SF-03)
function updateSprintUI(sprint) {
  currentSprintState = sprint;
  if (!dom.sprintReviewBanner) return;

  if (sprint) {
    dom.sprintReviewBanner.style.display = 'flex';
    dom.sprintBannerMissionTitle.textContent = sprint.title || sprint.missionId || '衝刺任務進行中';
    dom.sprintBannerDuration.textContent = `衝刺時間箱: ${sprint.duration || 25} 分鐘`;
    const startTimeStr = formatTime(sprint.startTime || Date.now());
    dom.sprintBannerTimeStart.textContent = `啟動: ${startTimeStr}`;

    // 啟動衝刺審查模式時，預設開啟隱藏靜態 CDN 降噪
    if (!hideStaticFilter) {
      hideStaticFilter = true;
      if (dom.btnFilterHideStatic) dom.btnFilterHideStatic.classList.add('active');
      renderList();
    }
  } else {
    dom.sprintReviewBanner.style.display = 'none';
  }
}

// 追加日誌記錄 (環形緩衝區 30 筆上限)
function appendLog(logItem, shouldRender = true) {
  if (!logItem || !logItem.id) return;
  if (logs.some((l) => l.id === logItem.id)) return;

  logs.push(logItem);

  // 當前 Session 累積事件計數
  if (currentSessionState && currentSessionState.status !== 'IDLE') {
    currentSessionState.eventCount = (currentSessionState.eventCount || 0) + 1;
    dom.sessionMetricEvents.textContent = `${currentSessionState.eventCount} 筆`;
  }

  // 環形緩衝區機制：超過 MAX_RING_BUFFER 則由前端與 DOM 同步移出最舊一筆
  if (logs.length > MAX_RING_BUFFER) {
    logs.shift();
    if (dom.streamList && dom.streamList.firstElementChild) {
      dom.streamList.firstElementChild.remove();
    }
  }

  updateCounters();

  if (shouldRender) {
    if (isLogItemMatched(logItem)) {
      const startTime = performance.now();
      dom.emptyState.style.display = 'none';
      const node = createLogItemElement(logItem);
      dom.streamList.appendChild(node);

      if (autoScroll) {
        dom.streamContainer.scrollTop = dom.streamContainer.scrollHeight;
      }
      profiler.recordDuration('DOM 單筆追加 (appendLog)', performance.now() - startTime);
    }
  }
}

// 創建單筆日誌 DOM 元素
function createLogItemElement(item) {
  const div = document.createElement('div');
  div.className = `log-item log-${item.category || 'other'}`;
  div.dataset.category = item.category;

  const header = document.createElement('div');
  header.className = 'log-item-header';

  const tags = document.createElement('div');
  tags.className = 'log-tags';

  const catTag = document.createElement('span');
  catTag.className = `log-tag log-tag-${item.category}`;
  catTag.textContent = (item.category || 'EVENT').toUpperCase();
  tags.appendChild(catTag);

  if (item.method) {
    const methodTag = document.createElement('span');
    methodTag.className = 'log-method';
    methodTag.textContent = item.method;
    tags.appendChild(methodTag);
  }

  if (item.api) {
    const apiTag = document.createElement('span');
    apiTag.className = 'log-method';
    apiTag.textContent = item.api;
    tags.appendChild(apiTag);
  }

  // 網域智慧分類徽章 (AM-V01)
  if (item.url || item.origin) {
    const domainInfo = classifyDomain(item.url || item.origin);
    const domainTag = document.createElement('span');
    domainTag.className = `domain-badge ${domainInfo.badgeClass}`;
    domainTag.textContent = `${domainInfo.icon} ${domainInfo.name}`;
    domainTag.title = `網域: ${domainInfo.hostname} (${domainInfo.name})`;
    tags.appendChild(domainTag);
  }

  // 敏捷衝刺會話標記 (SF-03)
  if (item.isSprintFocus || item.sprintSessionId) {
    const sprintTag = document.createElement('span');
    sprintTag.className = 'domain-badge badge-prod';
    sprintTag.textContent = '🔥 衝刺';
    sprintTag.title = `所屬衝刺會話: ${item.sprintSessionId || '進行中'}`;
    tags.appendChild(sprintTag);
  }

  // 日誌右側操作列 (時間戳記與 AM-03 脫敏複製按鈕)
  const headerActions = document.createElement('div');
  headerActions.className = 'log-item-actions';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-copy-log';
  copyBtn.title = '複製此紀錄 (遵循脫敏開關)';
  copyBtn.textContent = '📋';
  copyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const isSanitize = dom.sanitizeCheckbox ? dom.sanitizeCheckbox.checked : true;
      const dataToCopy = isSanitize ? sanitizeLogItem(item) : item;
      const textToCopy = (item.category === 'network' && dataToCopy.url) 
        ? dataToCopy.url 
        : JSON.stringify(dataToCopy, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      copyBtn.textContent = '✓';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '📋';
        copyBtn.classList.remove('copied');
      }, 1500);
    } catch {
      // 剪貼簿存取降級容錯
    }
  });

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = formatTime(item.timestamp || Date.now());

  headerActions.appendChild(copyBtn);
  headerActions.appendChild(timeSpan);

  header.appendChild(tags);
  header.appendChild(headerActions);
  div.appendChild(header);

  // 主要內容
  const content = document.createElement('div');
  content.className = 'log-item-content';

  if (item.category === 'network') {
    content.textContent = item.url || '';
  } else if (item.category === 'download') {
    content.textContent = `檔案: ${item.filename || '未知'} (${item.mime || 'unknown'})`;
  } else if (item.category === 'probe') {
    content.textContent = `調用: ${item.api}`;
  } else {
    content.textContent = JSON.stringify(item);
  }
  div.appendChild(content);

  // 詳細補充資訊
  if (item.category === 'probe' && item.detail) {
    const detail = document.createElement('div');
    detail.className = 'log-item-detail';
    detail.textContent = `細節: ${JSON.stringify(item.detail)}`;
    div.appendChild(detail);
  } else if (item.category === 'download' && item.url) {
    const detail = document.createElement('div');
    detail.className = 'log-item-detail';
    detail.textContent = `來源: ${item.url}`;
    div.appendChild(detail);
  }

  return div;
}

// 渲染當前過濾器之日誌 (配合緩衝區上限)
function renderList() {
  const startTime = performance.now();
  dom.streamList.innerHTML = '';
  const filtered = logs.filter(isLogItemMatched);

  if (filtered.length === 0) {
    dom.emptyState.style.display = 'flex';
  } else {
    dom.emptyState.style.display = 'none';
    const fragment = document.createDocumentFragment();
    for (const item of filtered) {
      fragment.appendChild(createLogItemElement(item));
    }
    dom.streamList.appendChild(fragment);

    if (autoScroll) {
      dom.streamContainer.scrollTop = dom.streamContainer.scrollHeight;
    }
  }
  profiler.recordDuration('DOM 完整渲染 (renderList)', performance.now() - startTime);
}

// 更新計數器
function updateCounters() {
  let countProbe = 0;
  let countNetwork = 0;
  let countDownload = 0;

  for (const l of logs) {
    if (l.category === 'probe') countProbe++;
    else if (l.category === 'network') countNetwork++;
    else if (l.category === 'download') countDownload++;
  }

  dom.countAll.textContent = logs.length;
  dom.countProbe.textContent = countProbe;
  dom.countNetwork.textContent = countNetwork;
  dom.countDownload.textContent = countDownload;
  dom.badgeStreamBuffer.textContent = `${logs.length}/${MAX_RING_BUFFER}`;
  dom.footerLogCount.textContent = `緩衝區: ${logs.length}/${MAX_RING_BUFFER} 筆`;
}

// ==========================================================================
// 有效停留時間看板與分類統計視覺化 (AM-01 & AM-02)
// ==========================================================================

function toggleTimeTrackerExpand() {
  isTimeTrackerExpanded = !isTimeTrackerExpanded;
  if (!dom.timeTrackerBody || !dom.timeTrackerCollapseIcon) return;

  if (isTimeTrackerExpanded) {
    dom.timeTrackerBody.style.display = 'flex';
    dom.timeTrackerCollapseIcon.textContent = '▼';
  } else {
    dom.timeTrackerBody.style.display = 'none';
    dom.timeTrackerCollapseIcon.textContent = '▶';
  }
}

function renderTimeTrackerUI(stats, activeSnapshot) {
  if (!dom.timeTrackerSection) return;

  // 若無統計資料，給予安全預設值
  const totalSec = stats?.totalDurationSec || 0;
  const metrics = stats?.metrics || {
    workDurationSec: 0,
    productivitySec: 0,
    communicationSec: 0,
    leisureSec: 0,
    otherSec: 0,
    staticSec: 0,
    ratios: { productivity: 0, communication: 0, leisure: 0, static: 0, other: 0 },
    focusScore: 0
  };

  // 1. 專注度得分膠囊 (Focus Score Pill)
  if (dom.timeTrackerFocusPill) {
    const score = metrics.focusScore || 0;
    dom.timeTrackerFocusPill.textContent = `專注度 ${score}%`;
    dom.timeTrackerFocusPill.className = 'focus-pill';
    if (score >= 70) {
      dom.timeTrackerFocusPill.classList.add('focus-high');
    } else if (score >= 40) {
      dom.timeTrackerFocusPill.classList.add('focus-med');
    } else {
      dom.timeTrackerFocusPill.classList.add('focus-low');
    }
  }

  // 2. 核心 KPI 四宮格
  if (dom.timeKpiTotal) dom.timeKpiTotal.textContent = formatSeconds(totalSec);
  if (dom.timeKpiWork) dom.timeKpiWork.textContent = formatSeconds(metrics.workDurationSec);
  if (dom.timeKpiLeisure) dom.timeKpiLeisure.textContent = formatSeconds(metrics.leisureSec);
  if (dom.timeKpiOther) dom.timeKpiOther.textContent = formatSeconds(metrics.otherSec + (metrics.staticSec || 0));

  // 3. 類別佔比多色進度條與圖例
  const ratios = metrics.ratios || { productivity: 0, communication: 0, leisure: 0, static: 0, other: 0 };
  const prodPct = ratios.productivity || 0;
  const commPct = ratios.communication || 0;
  const leisurePct = ratios.leisure || 0;
  const otherPct = Math.max(0, 100 - prodPct - commPct - leisurePct);

  if (dom.segProd) {
    dom.segProd.style.width = `${prodPct}%`;
    dom.segProd.title = `生產力: ${prodPct}% (${formatSeconds(metrics.productivitySec)})`;
  }
  if (dom.segComm) {
    dom.segComm.style.width = `${commPct}%`;
    dom.segComm.title = `辦公通訊: ${commPct}% (${formatSeconds(metrics.communicationSec)})`;
  }
  if (dom.segLeisure) {
    dom.segLeisure.style.width = `${leisurePct}%`;
    dom.segLeisure.title = `休閒娛樂: ${leisurePct}% (${formatSeconds(metrics.leisureSec)})`;
  }
  if (dom.segOther) {
    dom.segOther.style.width = `${otherPct}%`;
    dom.segOther.title = `其他: ${otherPct}% (${formatSeconds(metrics.otherSec + (metrics.staticSec || 0))})`;
  }

  if (dom.legendPctProd) dom.legendPctProd.textContent = `${prodPct}%`;
  if (dom.legendPctComm) dom.legendPctComm.textContent = `${commPct}%`;
  if (dom.legendPctLeisure) dom.legendPctLeisure.textContent = `${leisurePct}%`;
  if (dom.legendPctOther) dom.legendPctOther.textContent = `${otherPct}%`;

  // 4. Top 5 停留網站排行榜
  if (dom.topDomainsList) {
    dom.topDomainsList.innerHTML = '';
    const topList = Array.isArray(stats?.topDomains) ? stats.topDomains.slice(0, 5) : [];
    const activeDomain = activeSnapshot?.currentDomain || '';

    if (dom.topDomainsCount) {
      dom.topDomainsCount.textContent = `${topList.length} 個網域`;
    }

    if (topList.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'domains-empty-hint';
      emptyHint.textContent = '今日尚無分頁停留記錄';
      dom.topDomainsList.appendChild(emptyHint);
    } else {
      topList.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'top-domain-item';

        const isCurrentActive = Boolean(activeDomain && item.domain.toLowerCase() === activeDomain.toLowerCase());
        if (isCurrentActive) {
          row.classList.add('is-active-tab');
        }

        const left = document.createElement('div');
        left.className = 'domain-left';

        // 排名序號
        const rank = document.createElement('span');
        rank.className = 'domain-rank';
        rank.textContent = `#${index + 1}`;
        left.appendChild(rank);

        // 圖示
        if (item.favIconUrl && item.favIconUrl.startsWith('http')) {
          const img = document.createElement('img');
          img.className = 'domain-fav';
          img.src = item.favIconUrl;
          img.alt = item.domain;
          img.onerror = () => {
            img.style.display = 'none';
            if (fallback) fallback.style.display = 'flex';
          };
          const fallback = document.createElement('span');
          fallback.className = 'domain-fav-fallback';
          fallback.style.display = 'none';
          fallback.textContent = item.domain.slice(0, 1).toUpperCase();
          left.appendChild(img);
          left.appendChild(fallback);
        } else {
          const fallback = document.createElement('span');
          fallback.className = 'domain-fav-fallback';
          fallback.textContent = item.domain.slice(0, 1).toUpperCase();
          left.appendChild(fallback);
        }

        // 網域名稱與活躍脈衝
        const nameWrap = document.createElement('div');
        nameWrap.className = 'domain-name-wrap';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'domain-name';
        nameSpan.textContent = item.title || item.domain;
        nameSpan.title = `${item.domain} (造訪 ${item.visitCount || 1} 次)`;
        nameWrap.appendChild(nameSpan);

        if (isCurrentActive) {
          const pulse = document.createElement('span');
          pulse.className = 'live-pulse-dot';
          pulse.title = '當前活躍分頁';
          nameWrap.appendChild(pulse);
        }
        left.appendChild(nameWrap);
        row.appendChild(left);

        // 右側：分類徽章與時長標籤
        const right = document.createElement('div');
        right.className = 'domain-right';

        const catInfo = classifyDomain(item.domain);
        const catBadge = document.createElement('span');
        catBadge.className = `domain-badge ${catInfo.badgeClass}`;
        catBadge.textContent = `${catInfo.icon} ${catInfo.name}`;
        right.appendChild(catBadge);

        const durTag = document.createElement('span');
        durTag.className = 'domain-duration-tag';
        durTag.textContent = formatSeconds(item.durationSec);
        right.appendChild(durTag);

        row.appendChild(right);
        dom.topDomainsList.appendChild(row);
      });
    }
  }
}

// ==========================================================================
// 雙軌隨選健檢狀態機與計時控制 (Session State Management)
// ==========================================================================

function updateSessionUI(session) {
  if (!session) return;
  currentSessionState = { ...currentSessionState, ...session };

  if (session.status === 'RUNNING_TIMED') {
    dom.sessionIndicator.className = 'session-indicator status-timed';
    dom.sessionStatusTitle.textContent = '60s 快速健檢中...';
    dom.sessionStatusSub.textContent = '正在動態攔截並採樣網路請求與遙測事件';
    dom.sessionIdleActions.style.display = 'none';
    dom.sessionRunningActions.style.display = 'flex';
    dom.sessionRunningModeText.textContent = '快速健檢採樣中...';
    dom.sessionMetricBadge.style.display = 'flex';
    startSessionTimer('TIMED', session.startTime || Date.now(), session.durationMs || 60000);
  } else if (session.status === 'RUNNING_CONTINUOUS') {
    dom.sessionIndicator.className = 'session-indicator status-continuous';
    dom.sessionStatusTitle.textContent = '持續檢測記錄中...';
    dom.sessionStatusSub.textContent = '持續收集活動，手動停止或關閉面板時結算報告';
    dom.sessionIdleActions.style.display = 'none';
    dom.sessionRunningActions.style.display = 'flex';
    dom.sessionRunningModeText.textContent = '持續檢測記錄中...';
    dom.sessionMetricBadge.style.display = 'flex';
    startSessionTimer('CONTINUOUS', session.startTime || Date.now());
  } else {
    // 待命狀態 (IDLE)
    dom.sessionIndicator.className = 'session-indicator status-idle';
    dom.sessionStatusTitle.textContent = '待命狀態 (零常態耗能)';
    dom.sessionStatusSub.textContent = 'Service Worker 休眠中，零網路攔截與磁碟 I/O';
    dom.sessionIdleActions.style.display = 'grid';
    dom.sessionRunningActions.style.display = 'none';
    dom.sessionMetricBadge.style.display = 'none';
    stopSessionTimer();
  }
}

function startSessionTimer(mode, startTime, durationMs = 60000) {
  stopSessionTimer();

  const updateTimer = () => {
    const elapsed = Date.now() - startTime;

    if (mode === 'TIMED') {
      const remainingMs = Math.max(0, durationMs - elapsed);
      const remainingSec = Math.ceil(remainingMs / 1000);
      dom.sessionMetricTimer.textContent = `剩餘 ${remainingSec}s`;
      if (remainingMs <= 0) {
        stopSessionTimer();
      }
    } else {
      const totalSec = Math.floor(elapsed / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      dom.sessionMetricTimer.textContent = `${mins}:${secs}`;
    }

    dom.sessionMetricEvents.textContent = `${currentSessionState.eventCount || logs.length} 筆`;
  };

  updateTimer();
  sessionTimerInterval = setInterval(updateTimer, 500);
}

function stopSessionTimer() {
  if (sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }
}

// 啟動 60 秒快速健檢
function startTimedAudit() {
  if (!port) return;
  // 清空當前環形緩衝區，專注本次採樣
  logs = [];
  renderList();
  currentSessionState.eventCount = 0;
  port.postMessage({
    type: 'START_SESSION',
    mode: 'TIMED',
    durationMs: 60000
  });
  switchView('stream');
}

// 啟動持續檢測記錄模式
function startContinuousSession() {
  if (!port) return;
  logs = [];
  renderList();
  currentSessionState.eventCount = 0;
  port.postMessage({
    type: 'START_SESSION',
    mode: 'CONTINUOUS'
  });
  switchView('stream');
}

// 停止檢測並結算報告
function stopSession() {
  if (!port) return;
  dom.btnStopSession.disabled = true;
  dom.btnStopSession.textContent = '結算報告中...';
  port.postMessage({ type: 'STOP_SESSION' });

  setTimeout(() => {
    dom.btnStopSession.disabled = false;
    dom.btnStopSession.innerHTML = '<span class="btn-icon">⏹️</span> 停止並結算報告';
  }, 1000);
}

// ==========================================================================
// 階段檢測報告卡渲染 (Session Report Card Renderer)
// ==========================================================================

function renderReportCard(report) {
  if (!report || !report.summary) {
    dom.reportsEmptyState.style.display = 'flex';
    dom.reportContent.style.display = 'none';
    return;
  }

  dom.reportsEmptyState.style.display = 'none';
  dom.reportContent.style.display = 'flex';

  const summary = report.summary;
  const isGood = summary.healthStatus === 'GOOD';
  const isCritical = summary.healthStatus === 'CRITICAL';

  let healthBadgeClass = 'badge-allow';
  let healthText = '良好';
  if (isCritical) {
    healthBadgeClass = 'badge-block';
    healthText = '嚴重負載';
  } else if (!isGood) {
    healthBadgeClass = 'badge-ask';
    healthText = '需注意';
  }

  const modeText = report.mode === 'TIMED' ? '60s 快速健檢' : '持續檢測模式';
  const stopReasonMap = {
    MANUAL: '手動結算',
    TIMED_OUT: '倒數結束',
    PANEL_DISCONNECT: '面板關閉結算',
    SW_SUSPEND: '瀏覽器休眠結算',
    SUPERSEDED: '新任務覆蓋'
  };
  const reasonText = stopReasonMap[report.stopReason] || report.stopReason || '正常結束';

  // 1. 產生 Top 來源網域/分頁清單 HTML
  let topListHtml = '';
  if (report.topTabs && report.topTabs.length > 0) {
    const maxReq = Math.max(...report.topTabs.map((t) => t.requests), 1);
    topListHtml = report.topTabs.map((tab) => {
      const pct = Math.max(5, Math.round((tab.requests / maxReq) * 100));
      const isHeavy = tab.requests > 30;
      const domainInfo = classifyDomain(tab.url || tab.title);
      return `
        <div class="report-top-row">
          <div class="report-top-info">
            <span class="report-top-name" title="${tab.url || tab.title}">
              ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" width="12" height="12" style="border-radius:2px;" onerror="this.style.display='none'">` : '🌐'}
              ${tab.title || `分頁 #${tab.tabId}`}
              <span class="domain-badge ${domainInfo.badgeClass}" style="margin-left:4px;">${domainInfo.icon} ${domainInfo.name}</span>
            </span>
            <span class="report-top-metrics">${tab.requests} 次 (${tab.percentage}%)</span>
          </div>
          <div class="report-bar-wrap">
            <div class="report-bar-fill ${isHeavy ? 'bar-heavy' : ''}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  } else if (report.topDomains && report.topDomains.length > 0) {
    const maxReq = Math.max(...report.topDomains.map((d) => d.requests), 1);
    topListHtml = report.topDomains.map((domItem) => {
      const pct = Math.max(5, Math.round((domItem.requests / maxReq) * 100));
      const domainInfo = classifyDomain(domItem.domain);
      return `
        <div class="report-top-row">
          <div class="report-top-info">
            <span class="report-top-name" title="${domItem.domain}">
              🌐 ${domItem.domain}
              <span class="domain-badge ${domainInfo.badgeClass}" style="margin-left:4px;">${domainInfo.icon} ${domainInfo.name}</span>
            </span>
            <span class="report-top-metrics">${domItem.requests} 次 (${domItem.percentage}%)</span>
          </div>
          <div class="report-bar-wrap">
            <div class="report-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    topListHtml = '<div class="profiler-empty-hint">採樣期間未捕獲網路活動</div>';
  }

  // 2. 智慧優化建議 HTML
  let recsHtml = '';
  if (report.recommendations && report.recommendations.length > 0) {
    recsHtml = report.recommendations.map((rec) => `
      <div class="recommendation-item rec-${rec.level || 'info'}">
        <div class="rec-title">${rec.title}</div>
        <div class="rec-desc">${rec.message}</div>
        ${rec.action ? `<div class="rec-sugg">${rec.action}</div>` : ''}
      </div>
    `).join('');
  } else {
    recsHtml = `
      <div class="recommendation-item rec-good">
        <div class="rec-title">分頁活動正常</div>
        <div class="rec-desc">採樣期間未偵測到高頻心跳遙測或異常網路請求風暴。</div>
      </div>
    `;
  }

  dom.reportContent.innerHTML = `
    <div class="report-card">
      <div class="report-header-banner">
        <div class="report-title-group">
          <div class="report-main-title">
            <span>階段檢測報告</span>
            <span class="badge ${healthBadgeClass}">${healthText}</span>
          </div>
          <div class="report-meta-text">模式: ${modeText} | 結算: ${reasonText} | 時間: ${formatFullDateTime(report.timestamp)}</div>
        </div>
      </div>

      <!-- KPI 指標 -->
      <div class="report-kpi-grid">
        <div class="report-kpi-item">
          <span class="report-kpi-label">採樣時長</span>
          <span class="report-kpi-val">${formatDuration(summary.durationMs)}</span>
        </div>
        <div class="report-kpi-item">
          <span class="report-kpi-label">請求總量</span>
          <span class="report-kpi-val">${summary.totalRequests}</span>
        </div>
        <div class="report-kpi-item">
          <span class="report-kpi-label">每秒頻率</span>
          <span class="report-kpi-val">${summary.requestsPerSecond}/s</span>
        </div>
        <div class="report-kpi-item">
          <span class="report-kpi-label">遙測/心跳</span>
          <span class="report-kpi-val">${summary.noisePercentage}%</span>
        </div>
      </div>

      <!-- Top 排行 -->
      <div>
        <div class="report-section-title">
          <span>TOP 耗能來源排行</span>
          <span style="font-size:10px; color:var(--text-dim); text-transform:none;">依請求總量排序</span>
        </div>
        <div class="report-top-list">${topListHtml}</div>
      </div>

      <!-- 優化診斷建議 -->
      <div>
        <div class="report-section-title">
          <span>智慧優化建議 (${report.recommendations ? report.recommendations.length : 0})</span>
        </div>
        <div class="profiler-recommendations-list">${recsHtml}</div>
      </div>
    </div>
  `;
}

// 渲染歷史檢測報告列表
function renderHistoryList(reports) {
  if (!dom.reportHistoryList) return;

  if (!reports || reports.length === 0) {
    dom.reportHistoryList.innerHTML = '<div class="history-empty-hint">暫無歷史報告</div>';
    return;
  }

  dom.reportHistoryList.innerHTML = reports.map((r) => {
    const isSelected = activeReport && activeReport.id === r.id;
    const modeTag = r.mode === 'TIMED' ? '60s' : '持續';
    const reqCount = r.summary?.totalRequests || 0;
    const durSec = Math.round((r.summary?.durationMs || 0) / 1000);

    return `
      <div class="history-item ${isSelected ? 'active' : ''}" data-report-id="${r.id}">
        <div class="history-info-group">
          <span class="history-mode-tag">${modeTag}</span>
          <span class="history-time">${formatTime(r.timestamp)}</span>
        </div>
        <div class="history-metrics">${durSec}s | ${reqCount} 筆</div>
      </div>
    `;
  }).join('');

  // 綁定點擊切換事件
  dom.reportHistoryList.querySelectorAll('.history-item').forEach((item) => {
    item.addEventListener('click', () => {
      const reportId = item.dataset.reportId;
      const target = reports.find((r) => r.id === reportId);
      if (target) {
        activeReport = target;
        renderReportCard(target);
        renderHistoryList(reports);
      }
    });
  });
}

// 切換主視圖 (即時動態 vs 檢測報告)
function switchView(viewName) {
  currentView = viewName;
  if (viewName === 'stream') {
    dom.tabBtnStream.classList.add('active');
    dom.tabBtnReports.classList.remove('active');
    dom.viewSectionStream.style.display = 'flex';
    dom.viewSectionReports.style.display = 'none';
  } else {
    dom.tabBtnReports.classList.add('active');
    dom.tabBtnStream.classList.remove('active');
    dom.viewSectionReports.style.display = 'flex';
    dom.viewSectionStream.style.display = 'none';
  }
}

// ==========================================================================
// 網站原生權限與動態探針控制
// ==========================================================================

function renderPermissions(settings) {
  if (!settings || typeof settings !== 'object') return;
  const startTime = performance.now();

  const items = dom.permissionsContainer.querySelectorAll('.permission-item');
  items.forEach((item) => {
    const permKey = item.dataset.perm;
    const badge = item.querySelector('.perm-badge');
    const val = settings[permKey];

    badge.className = 'perm-badge';
    if (val === 'allow') {
      badge.classList.add('badge-allow');
      badge.textContent = '允許';
    } else if (val === 'block') {
      badge.classList.add('badge-block');
      badge.textContent = '封鎖';
    } else if (val === 'ask') {
      badge.classList.add('badge-ask');
      badge.textContent = '詢問';
    } else if (val === 'unsupported') {
      badge.classList.add('badge-unsupported');
      badge.textContent = '不支援';
    } else {
      badge.classList.add('badge-unknown');
      badge.textContent = val || '未知';
    }
  });

  profiler.recordDuration('權限面板渲染 (Permissions UI)', performance.now() - startTime);
}

function resetPermissionsToPending() {
  const badges = dom.permissionsContainer.querySelectorAll('.perm-badge');
  badges.forEach((b) => {
    b.className = 'perm-badge badge-pending';
    b.textContent = '查詢中';
  });
}

function updateInspectorState(active) {
  isInspectorActive = active;
  dom.inspectorSpinner.style.display = 'none';

  if (active) {
    dom.inspectorBtnText.textContent = '深度探針運作中';
    dom.btnToggleInspector.classList.add('btn-active-probe');
    dom.inspectorStatusBadge.classList.add('active');
    dom.inspectorStatusText.textContent = '探針已注入 (正在攔截敏感 API)';
  } else {
    dom.inspectorBtnText.textContent = '注入深度探針';
    dom.btnToggleInspector.classList.remove('btn-active-probe');
    dom.inspectorStatusBadge.classList.remove('active');
    dom.inspectorStatusText.textContent = '探針未注入 (隨選待命中)';
  }
}

async function syncActiveTab() {
  const startTime = performance.now();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    currentTab = {
      id: tab.id,
      url: tab.url,
      origin: getOriginFromUrl(tab.url)
    };

    dom.currentOrigin.textContent = currentTab.origin;
    dom.currentOrigin.title = currentTab.url;
    dom.currentTabId.textContent = `Tab #${currentTab.id}`;

    if (port) {
      resetPermissionsToPending();
      port.postMessage({ type: 'AUDIT_ORIGIN', origin: currentTab.origin });
      port.postMessage({ type: 'CHECK_INSPECTOR_STATUS', tabId: currentTab.id });
    }
  } catch (err) {
    console.warn('[BAM Sidepanel] 取得分頁資訊失敗:', err);
  } finally {
    profiler.recordDuration('分頁狀態同步 (Sync Tab)', performance.now() - startTime);
  }
}

// ==========================================================================
// 組件資源監視器 (Resource Profiler)
// ==========================================================================

function requestProfilerUpdate() {
  if (port) {
    port.postMessage({ type: 'GET_BACKGROUND_PROFILER_METRICS' });
  }
  renderProfilerPanel();
}

function toggleProfilerExpand() {
  isProfilerExpanded = !isProfilerExpanded;

  if (isProfilerExpanded) {
    dom.resourceMonitorSection?.classList.add('expanded');
    if (dom.profilerBody) dom.profilerBody.style.display = 'flex';
    if (dom.profilerCollapseIcon) dom.profilerCollapseIcon.textContent = '▼';
    requestProfilerUpdate();

    if (!profilerUpdateTimer) {
      profilerUpdateTimer = setInterval(requestProfilerUpdate, 3000);
    }
  } else {
    dom.resourceMonitorSection?.classList.remove('expanded');
    if (dom.profilerBody) dom.profilerBody.style.display = 'none';
    if (dom.profilerCollapseIcon) dom.profilerCollapseIcon.textContent = '▶';

    if (profilerUpdateTimer) {
      clearInterval(profilerUpdateTimer);
      profilerUpdateTimer = null;
    }
  }
}

function resetProfilerStats() {
  profiler.reset();
  latestBackgroundSummary = null;
  if (port) {
    port.postMessage({ type: 'RESET_BACKGROUND_PROFILER' });
  }
  renderProfilerPanel();
}

function renderProfilerPanel() {
  if (!isProfilerExpanded) return;

  const clientSummary = profiler.getSummary();
  const bgSummary = latestBackgroundSummary;

  const metricMap = new Map();
  if (clientSummary.metrics) {
    for (const m of clientSummary.metrics) {
      metricMap.set(m.label, { ...m });
    }
  }
  if (bgSummary && bgSummary.metrics) {
    for (const m of bgSummary.metrics) {
      if (metricMap.has(m.label)) {
        const existing = metricMap.get(m.label);
        existing.calls += m.calls;
        existing.totalTime += m.totalTime;
        existing.avgTime = Number((existing.totalTime / existing.calls).toFixed(2));
        existing.maxTime = Math.max(existing.maxTime, m.maxTime);
      } else {
        metricMap.set(m.label, { ...m });
      }
    }
  }

  const combinedMetrics = Array.from(metricMap.values()).sort((a, b) => b.totalTime - a.totalTime);
  const totalCalls = combinedMetrics.reduce((sum, m) => sum + m.calls, 0);
  const totalElapsed = combinedMetrics.reduce((sum, m) => sum + m.totalTime, 0);
  const avgLatency = totalCalls > 0 ? (totalElapsed / totalCalls) : 0;

  let totalQueueCount = 0;
  if (clientSummary.queues) {
    totalQueueCount += clientSummary.queues.reduce((sum, q) => sum + (q.current || 0), 0);
  }
  if (bgSummary && bgSummary.queues) {
    totalQueueCount += bgSummary.queues.reduce((sum, q) => sum + (q.current || 0), 0);
  }

  const domMetrics = clientSummary.dom || profiler.getDomMetrics();
  const domCount = domMetrics ? domMetrics.totalElements : document.querySelectorAll('*').length;

  const mem = clientSummary.memory || (bgSummary ? bgSummary.memory : null);
  const memoryText = mem ? `${mem.usedMB} MB` : '良好';

  if (dom.kpiDomCount) dom.kpiDomCount.textContent = domCount;
  if (dom.kpiMemoryVal) dom.kpiMemoryVal.textContent = memoryText;
  if (dom.kpiQueueCount) dom.kpiQueueCount.textContent = totalQueueCount;
  if (dom.kpiAvgLatency) dom.kpiAvgLatency.textContent = `${avgLatency.toFixed(1)}ms`;
  if (dom.profilerTotalTime) dom.profilerTotalTime.textContent = `總計 ${totalElapsed.toFixed(1)}ms`;

  if (dom.profilerModulesList) {
    if (combinedMetrics.length === 0) {
      dom.profilerModulesList.innerHTML = '<div class="profiler-empty-hint">尚無效能採集資料</div>';
    } else {
      const maxTime = Math.max(...combinedMetrics.map((m) => m.totalTime), 1);
      dom.profilerModulesList.innerHTML = combinedMetrics.slice(0, 10).map((m) => {
        const pct = Math.max(4, Math.round((m.totalTime / maxTime) * 100));
        let barClass = '';
        if (m.avgTime > 40) barClass = 'bar-critical';
        else if (m.avgTime > 16) barClass = 'bar-warning';

        return `
          <div class="module-stat-row">
            <div class="module-stat-info">
              <span class="module-stat-name" title="${m.label}">${m.label}</span>
              <div class="module-stat-metrics">
                <span>${m.avgTime.toFixed(1)}ms/次</span>
                <span>(${m.calls}次, 共 ${m.totalTime.toFixed(1)}ms)</span>
              </div>
            </div>
            <div class="module-bar-wrap">
              <div class="module-bar-fill ${barClass}" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const recommendations = [];
  if (clientSummary.recommendations) recommendations.push(...clientSummary.recommendations);
  if (bgSummary && bgSummary.recommendations) {
    for (const rec of bgSummary.recommendations) {
      if (!recommendations.some((r) => r.id === rec.id)) {
        recommendations.push(rec);
      }
    }
  }

  const filteredRecs = recommendations.filter((r) => {
    if (r.id === 'health-all-good' && recommendations.length > 1) return false;
    return true;
  });

  const hasCrit = filteredRecs.some((r) => r.level === 'critical');
  const hasWarn = filteredRecs.some((r) => r.level === 'warning');

  if (dom.profilerHealthBadge) {
    dom.profilerHealthBadge.className = 'health-pill';
    if (hasCrit) {
      dom.profilerHealthBadge.classList.add('health-critical');
      dom.profilerHealthBadge.textContent = '需優化';
    } else if (hasWarn) {
      dom.profilerHealthBadge.classList.add('health-warning');
      dom.profilerHealthBadge.textContent = '注意事項';
    } else {
      dom.profilerHealthBadge.classList.add('health-good');
      dom.profilerHealthBadge.textContent = '良好';
    }
  }

  if (dom.profilerRecBadge) dom.profilerRecBadge.textContent = `${filteredRecs.length} 項建議`;

  if (dom.profilerRecommendationsList) {
    if (filteredRecs.length === 0) {
      dom.profilerRecommendationsList.innerHTML = `
        <div class="recommendation-item rec-good">
          <div class="rec-title">組件運作流暢</div>
          <div class="rec-desc">目前各模組執行延遲均低於閾值，無顯著效能瓶頸。</div>
        </div>
      `;
    } else {
      dom.profilerRecommendationsList.innerHTML = filteredRecs.map((rec) => `
        <div class="recommendation-item rec-${rec.level}">
          <div class="rec-title">${rec.title}</div>
          <div class="rec-desc">${rec.message}</div>
          ${rec.suggestion ? `<div class="rec-sugg">${rec.suggestion}</div>` : ''}
        </div>
      `).join('');
    }
  }
}

// 初始化事件綁定
function initEvents() {
  // 分頁切換與更新
  chrome.tabs.onActivated.addListener(() => {
    syncActiveTab();
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (currentTab && tabId === currentTab.id && changeInfo.status === 'complete') {
      syncActiveTab();
    }
  });

  // 雙軌檢測按鈕綁定
  dom.btnStartTimed.addEventListener('click', startTimedAudit);
  dom.btnStartContinuous.addEventListener('click', startContinuousSession);
  dom.btnStopSession.addEventListener('click', stopSession);

  // 視圖切換標籤綁定
  dom.tabBtnStream.addEventListener('click', () => switchView('stream'));
  dom.tabBtnReports.addEventListener('click', () => switchView('reports'));

  // 清空歷史報告按鈕
  dom.btnClearReports.addEventListener('click', () => {
    if (confirm('確定要清空所有歷史檢測報告嗎？此操作將刪除本機 IndexedDB 的所有報告紀錄。')) {
      if (port) {
        port.postMessage({ type: 'CLEAR_ALL_REPORTS' });
      }
    }
  });

  // 重新整理權限按鈕
  dom.btnRefreshPermissions.addEventListener('click', () => {
    if (currentTab && port) {
      resetPermissionsToPending();
      port.postMessage({ type: 'AUDIT_ORIGIN', origin: currentTab.origin });
    }
  });

  // 深度探針按鈕點擊
  dom.btnToggleInspector.addEventListener('click', () => {
    if (!currentTab || !port) return;

    if (isInspectorActive) {
      alert('動態探針已在當前分頁中運作。如需重置，請重新載入該網頁。');
      return;
    }

    dom.inspectorSpinner.style.display = 'inline-block';
    dom.inspectorBtnText.textContent = '正在注入...';

    port.postMessage({
      type: 'INJECT_INSPECTOR',
      tabId: currentTab.id
    });
  });

  // 篩選 Tabs 切換
  dom.filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      dom.filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderList();
    });
  });

  // 僅看工作網域切換開關 (AM-V01)
  if (dom.btnFilterWork) {
    dom.btnFilterWork.addEventListener('click', () => {
      onlyWorkFilter = !onlyWorkFilter;
      dom.btnFilterWork.classList.toggle('active', onlyWorkFilter);
      renderList();
    });
  }

  // 隱藏靜態 CDN 切換開關 (AM-V01)
  if (dom.btnFilterHideStatic) {
    dom.btnFilterHideStatic.addEventListener('click', () => {
      hideStaticFilter = !hideStaticFilter;
      dom.btnFilterHideStatic.classList.toggle('active', hideStaticFilter);
      renderList();
    });
  }

  // AM-02: 分類過濾列按鈕群點擊切換 (全部、工作、娛樂、靜態)
  if (dom.filterCatBtns && dom.filterCatBtns.length > 0) {
    dom.filterCatBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.filterCatBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentCatFilter = btn.dataset.catFilter || 'all';
        renderList();
      });
    });
  }

  // AM-01: 停留時長看板折疊切換
  if (dom.btnToggleTimeTracker) {
    dom.btnToggleTimeTracker.addEventListener('click', toggleTimeTrackerExpand);
  }

  // AM-01: 停留時長手動刷新按鈕
  if (dom.btnRefreshTimeStats) {
    dom.btnRefreshTimeStats.addEventListener('click', (e) => {
      e.stopPropagation();
      requestTimeStats();
    });
  }

  // AM-01/AM-02: 匯出今日停留時長與網域排行 JSON (AM-03 脫敏整合)
  if (dom.btnExportTimeStats) {
    dom.btnExportTimeStats.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!currentTimeStats) {
        alert('尚無今日停留時長紀錄可匯出。');
        return;
      }
      const isSanitize = dom.sanitizeCheckbox ? dom.sanitizeCheckbox.checked : true;
      const exportStats = isSanitize ? sanitizeTimeStats(currentTimeStats) : currentTimeStats;
      const filename = isSanitize
        ? `bam_timestats_${Date.now()}_sanitized.json`
        : `bam_timestats_${Date.now()}.json`;

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportStats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // AM-01: 清空今日停留時長記錄
  if (dom.btnClearTimeLogs) {
    dom.btnClearTimeLogs.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('確定要清空今日所有分頁停留時長記錄嗎？')) {
        if (port) {
          port.postMessage({ type: 'CLEAR_ALL_TIME_LOGS' });
        }
      }
    });
  }

  // 清空緩衝區按鈕
  dom.btnClearLogs.addEventListener('click', () => {
    logs = [];
    renderList();
    updateCounters();
  });

  // 匯出緩衝區日誌 JSON (AM-03 脫敏整合)
  dom.btnExportLogs.addEventListener('click', () => {
    if (logs.length === 0) {
      alert('目前緩衝區內無活動日誌。');
      return;
    }
    const isSanitize = dom.sanitizeCheckbox ? dom.sanitizeCheckbox.checked : true;
    const exportData = isSanitize ? sanitizeLogs(logs) : logs;
    const filename = isSanitize 
      ? `bam_logs_${Date.now()}_sanitized.json` 
      : `bam_logs_${Date.now()}.json`;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // 自動滾動勾選框
  dom.autoScrollCheckbox.addEventListener('change', (e) => {
    autoScroll = e.target.checked;
  });

  // 資源監視器折疊展開
  if (dom.btnToggleProfiler) {
    dom.btnToggleProfiler.addEventListener('click', toggleProfilerExpand);
  }

  if (dom.btnRefreshProfiler) {
    dom.btnRefreshProfiler.addEventListener('click', (e) => {
      e.stopPropagation();
      requestProfilerUpdate();
    });
  }

  if (dom.btnResetProfiler) {
    dom.btnResetProfiler.addEventListener('click', (e) => {
      e.stopPropagation();
      resetProfilerStats();
    });
  }
}

// 主初始化常式
function init() {
  connectPort();
  syncActiveTab();
  initEvents();
  updateCounters();
}

document.addEventListener('DOMContentLoaded', init);
