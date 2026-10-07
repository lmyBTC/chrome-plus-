/**
 * Browser Activity Monitor - Management Console 總覽儀表板模組 (dashboard.js)
 * 負責有效停留時長、生產力專注度得分、類別進度條、當前作用中分頁即時更新與 Top 5 排行榜渲染。
 */

import { classifyDomain, formatDuration as formatSeconds } from '../../scripts/domain-classifier.js';
import { sanitizeText, sanitizeTimeStats } from '../../scripts/privacy-sanitizer.js';
import { Toast } from './main.js';

let port = null;
let currentTimeStats = null;
let currentActiveTabSnapshot = null;
let pollingTimer = null;

// DOM 元素快取
const dom = {
  // 側邊欄分數
  sidebarDashboardFocus: document.getElementById('sidebarDashboardFocus'),

  // Header 狀態與操作
  dashFocusPill: document.getElementById('dashFocusPill'),
  dashFocusScore: document.getElementById('dashFocusScore'),
  btnDashRefresh: document.getElementById('btnDashRefresh'),
  btnDashExport: document.getElementById('btnDashExport'),
  btnDashClear: document.getElementById('btnDashClear'),

  // 核心時長 KPI
  dashKpiTotal: document.getElementById('dashKpiTotal'),
  dashKpiWork: document.getElementById('dashKpiWork'),
  dashKpiLeisure: document.getElementById('dashKpiLeisure'),
  dashKpiOther: document.getElementById('dashKpiOther'),

  // 進度條
  dashSegProd: document.getElementById('dashSegProd'),
  dashSegComm: document.getElementById('dashSegComm'),
  dashSegLeisure: document.getElementById('dashSegLeisure'),
  dashSegOther: document.getElementById('dashSegOther'),

  // 圖例
  dashLegendPctProd: document.getElementById('dashLegendPctProd'),
  dashLegendTimeProd: document.getElementById('dashLegendTimeProd'),
  dashLegendPctComm: document.getElementById('dashLegendPctComm'),
  dashLegendTimeComm: document.getElementById('dashLegendTimeComm'),
  dashLegendPctLeisure: document.getElementById('dashLegendPctLeisure'),
  dashLegendTimeLeisure: document.getElementById('dashLegendTimeLeisure'),
  dashLegendPctOther: document.getElementById('dashLegendPctOther'),
  dashLegendTimeOther: document.getElementById('dashLegendTimeOther'),

  // 當前活躍分頁即時卡片
  dashActiveTabBanner: document.getElementById('dashActiveTabBanner'),
  dashActiveTabDomain: document.getElementById('dashActiveTabDomain'),
  dashActiveTabDuration: document.getElementById('dashActiveTabDuration'),

  // 排行榜
  dashTopDomainsSubtitle: document.getElementById('dashTopDomainsSubtitle'),
  dashTopDomainsCount: document.getElementById('dashTopDomainsCount'),
  dashTopDomainsList: document.getElementById('dashTopDomainsList')
};

/**
 * 建立與 Background 之 Port 通訊
 */
function connectPort() {
  try {
    port = chrome.runtime.connect({ name: 'monitor-stream' });

    port.onMessage.addListener(handlePortMessage);

    port.onDisconnect.addListener(() => {
      port = null;
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
      setTimeout(connectPort, 2500);
    });

    // 連線成功後查詢停留時長
    requestTimeStats();
    startPolling();
  } catch (err) {
    console.warn('[BAM Management Dashboard] 連接 Background 失敗:', err);
    setTimeout(connectPort, 2500);
  }
}

/**
 * 發送停留時長查詢請求
 */
function requestTimeStats() {
  if (port) {
    port.postMessage({ type: 'GET_TIME_STATS' });
    port.postMessage({ type: 'GET_ACTIVE_TAB_TIME' });
  }
}

/**
 * 定期輪詢以保持活躍分頁時長跳動
 */
function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(() => {
    if (port && document.visibilityState === 'visible') {
      port.postMessage({ type: 'GET_ACTIVE_TAB_TIME' });
    }
  }, 3000);
}

/**
 * 處理來自 Background Port 的訊息
 */
function handlePortMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'TIME_STATS_RESULT':
      currentTimeStats = msg.stats;
      currentActiveTabSnapshot = msg.activeSnapshot;
      renderDashboardUI();
      break;

    case 'TIME_STATS_UPDATED':
      requestTimeStats();
      break;

    case 'ACTIVE_TAB_TIME_RESULT':
      currentActiveTabSnapshot = msg.activeSnapshot;
      renderDashboardUI();
      break;

    case 'ALL_TIME_LOGS_CLEARED':
      currentTimeStats = null;
      currentActiveTabSnapshot = null;
      renderDashboardUI();
      Toast.success('停留時長記錄已清空');
      break;

    default:
      break;
  }
}

/**
 * 渲染 Dashboard 完整視覺界面
 */
function renderDashboardUI() {
  const stats = currentTimeStats;
  const activeSnapshot = currentActiveTabSnapshot;

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

  // 1. 專注度得分大膠囊與側邊欄 Badge
  const score = metrics.focusScore || 0;
  if (dom.dashFocusScore) {
    dom.dashFocusScore.textContent = `${score}%`;
  }
  if (dom.sidebarDashboardFocus) {
    dom.sidebarDashboardFocus.textContent = `${score}%`;
  }
  if (dom.dashFocusPill) {
    dom.dashFocusPill.className = 'focus-pill-dashboard';
    if (score >= 70) {
      dom.dashFocusPill.classList.add('focus-high');
    } else if (score >= 40) {
      dom.dashFocusPill.classList.add('focus-med');
    } else {
      dom.dashFocusPill.classList.add('focus-low');
    }
  }

  // 2. 核心時長 KPI 四宮格
  if (dom.dashKpiTotal) dom.dashKpiTotal.textContent = formatSeconds(totalSec);
  if (dom.dashKpiWork) dom.dashKpiWork.textContent = formatSeconds(metrics.workDurationSec);
  if (dom.dashKpiLeisure) dom.dashKpiLeisure.textContent = formatSeconds(metrics.leisureSec);
  if (dom.dashKpiOther) dom.dashKpiOther.textContent = formatSeconds(metrics.otherSec + (metrics.staticSec || 0));

  // 3. 類別佔比多色進度條與圖例四宮格
  const ratios = metrics.ratios || { productivity: 0, communication: 0, leisure: 0, static: 0, other: 0 };
  const prodPct = ratios.productivity || 0;
  const commPct = ratios.communication || 0;
  const leisurePct = ratios.leisure || 0;
  const otherPct = Math.max(0, 100 - prodPct - commPct - leisurePct);

  if (dom.dashSegProd) {
    dom.dashSegProd.style.width = `${prodPct}%`;
    dom.dashSegProd.title = `生產力: ${prodPct}% (${formatSeconds(metrics.productivitySec)})`;
  }
  if (dom.dashSegComm) {
    dom.dashSegComm.style.width = `${commPct}%`;
    dom.dashSegComm.title = `辦公通訊: ${commPct}% (${formatSeconds(metrics.communicationSec)})`;
  }
  if (dom.dashSegLeisure) {
    dom.dashSegLeisure.style.width = `${leisurePct}%`;
    dom.dashSegLeisure.title = `休閒娛樂: ${leisurePct}% (${formatSeconds(metrics.leisureSec)})`;
  }
  if (dom.dashSegOther) {
    dom.dashSegOther.style.width = `${otherPct}%`;
    dom.dashSegOther.title = `其他: ${otherPct}% (${formatSeconds(metrics.otherSec + (metrics.staticSec || 0))})`;
  }

  if (dom.dashLegendPctProd) dom.dashLegendPctProd.textContent = `${prodPct}%`;
  if (dom.dashLegendTimeProd) dom.dashLegendTimeProd.textContent = formatSeconds(metrics.productivitySec);

  if (dom.dashLegendPctComm) dom.dashLegendPctComm.textContent = `${commPct}%`;
  if (dom.dashLegendTimeComm) dom.dashLegendTimeComm.textContent = formatSeconds(metrics.communicationSec);

  if (dom.dashLegendPctLeisure) dom.dashLegendPctLeisure.textContent = `${leisurePct}%`;
  if (dom.dashLegendTimeLeisure) dom.dashLegendTimeLeisure.textContent = formatSeconds(metrics.leisureSec);

  if (dom.dashLegendPctOther) dom.dashLegendPctOther.textContent = `${otherPct}%`;
  if (dom.dashLegendTimeOther) dom.dashLegendTimeOther.textContent = formatSeconds(metrics.otherSec + (metrics.staticSec || 0));

  // 4. 當前作用中分頁即時橫幅
  const activeDomain = activeSnapshot?.currentDomain || '';
  const activeDuration = activeSnapshot?.currentDurationSec || 0;
  if (dom.dashActiveTabDomain) {
    dom.dashActiveTabDomain.textContent = activeDomain ? sanitizeText(activeDomain) : '尚無活躍分頁';
    dom.dashActiveTabDomain.title = activeDomain || '';
  }
  if (dom.dashActiveTabDuration) {
    dom.dashActiveTabDuration.textContent = formatSeconds(activeDuration);
  }

  // 5. Top 5 停留網站排行榜
  if (dom.dashTopDomainsList) {
    dom.dashTopDomainsList.innerHTML = '';
    const topList = Array.isArray(stats?.topDomains) ? stats.topDomains.slice(0, 5) : [];

    if (dom.dashTopDomainsCount) {
      dom.dashTopDomainsCount.textContent = `${topList.length} 個網域`;
    }

    if (topList.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'domains-empty-hint';
      emptyHint.textContent = '今日尚無分頁停留記錄';
      dom.dashTopDomainsList.appendChild(emptyHint);
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

        // Favicon
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
        nameSpan.title = `${item.domain} (今日造訪 ${item.visitCount || 1} 次)`;
        nameWrap.appendChild(nameSpan);

        if (isCurrentActive) {
          const pulse = document.createElement('span');
          pulse.className = 'live-pulse-dot';
          pulse.title = '當前作用中分頁正在計時';
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
        dom.dashTopDomainsList.appendChild(row);
      });
    }
  }
}

/**
 * 匯出停留時長報表 JSON
 */
function exportDashboardReport() {
  if (!currentTimeStats || (currentTimeStats.totalDurationSec === 0 && (!currentTimeStats.topDomains || currentTimeStats.topDomains.length === 0))) {
    Toast.info('目前尚無足夠的停留時長數據可供匯出');
    return;
  }

  try {
    const sanitizedData = sanitizeTimeStats(currentTimeStats);
    const filename = `bam_time_stats_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sanitizedData, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    Toast.success('停留時長報表已匯出');
  } catch (err) {
    console.error('[BAM Dashboard] 匯出失敗:', err);
    Toast.error('匯出報表失敗');
  }
}

/**
 * 清空停留記錄
 */
function clearDashboardLogs() {
  if (!confirm('確定要清空今日所有分頁有效停留時長記錄嗎？此操作無法撤銷。')) {
    return;
  }

  if (port) {
    port.postMessage({ type: 'CLEAR_ALL_TIME_LOGS' });
  }
}

/**
 * 初始化事件監聽
 */
function initEvents() {
  if (dom.btnDashRefresh) {
    dom.btnDashRefresh.addEventListener('click', () => {
      requestTimeStats();
      Toast.info('已重新整理時長數據');
    });
  }

  if (dom.btnDashExport) {
    dom.btnDashExport.addEventListener('click', exportDashboardReport);
  }

  if (dom.btnDashClear) {
    dom.btnDashClear.addEventListener('click', clearDashboardLogs);
  }

  // 視窗可見性改變時動態管理輪詢節省效能
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestTimeStats();
      startPolling();
    } else {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    }
  });

  // 分頁切換時主動更新當前作用中分頁狀態
  if (chrome.tabs) {
    chrome.tabs.onActivated.addListener(() => {
      if (port) port.postMessage({ type: 'GET_ACTIVE_TAB_TIME' });
    });

    chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
      if (changeInfo.status === 'complete' && port) {
        port.postMessage({ type: 'GET_ACTIVE_TAB_TIME' });
      }
    });
  }
}

export const DashboardModule = {
  init() {
    connectPort();
    initEvents();
  },
  refresh() {
    requestTimeStats();
  }
};
