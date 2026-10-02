import { profiler } from '../scripts/resource-profiler.js';

/**
 * Browser Activity Monitor - Side Panel 控制腳本
 * 管理活動串流即時展示、網站原生權限審查、深度動態探針調度與組件資源監視診斷。
 */

// 狀態管理
let port = null;
let currentTab = null;
let logs = [];
const MAX_LOGS = 500;
let currentFilter = 'all';
let autoScroll = true;
let isInspectorActive = false;

// 資源監視器狀態
let isProfilerExpanded = false;
let profilerUpdateTimer = null;
let latestBackgroundSummary = null;

// DOM 元素快取
const dom = {
  connectionStatus: document.getElementById('connection-status'),
  currentOrigin: document.getElementById('current-origin'),
  currentTabId: document.getElementById('current-tab-id'),
  btnRefreshPermissions: document.getElementById('btn-refresh-permissions'),
  permissionsContainer: document.getElementById('permissions-container'),
  btnToggleInspector: document.getElementById('btn-toggle-inspector'),
  inspectorBtnText: document.getElementById('inspector-btn-text'),
  inspectorSpinner: document.getElementById('inspector-spinner'),
  inspectorStatusBadge: document.getElementById('inspector-status-badge'),
  inspectorStatusText: document.getElementById('inspector-status-text'),
  streamContainer: document.getElementById('stream-container'),
  streamList: document.getElementById('stream-list'),
  emptyState: document.getElementById('empty-state'),
  countAll: document.getElementById('count-all'),
  countProbe: document.getElementById('count-probe'),
  countNetwork: document.getElementById('count-network'),
  countDownload: document.getElementById('count-download'),
  filterBtns: document.querySelectorAll('.filter-btn'),
  btnExportLogs: document.getElementById('btn-export-logs'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  footerLogCount: document.getElementById('footer-log-count'),
  autoScrollCheckbox: document.getElementById('auto-scroll-checkbox'),

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
      // 延遲嘗試重連
      setTimeout(connectPort, 2000);
    });

    // 連線成功後請求取得近期歷史日誌
    port.postMessage({ type: 'GET_RECENT_LOGS', limit: 100 });
  } catch (err) {
    console.warn('[BAM Sidepanel] 連接 Background 失敗:', err);
    dom.connectionStatus.classList.add('offline');
    setTimeout(connectPort, 2000);
  }
}

// 處理來自 Background Port 的廣播訊息
function handlePortMessage(msg) {
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'ACTIVITY_LOG':
      appendLog(msg.log);
      break;

    case 'RECENT_LOGS_RESULT':
      if (Array.isArray(msg.logs)) {
        // 由舊至新排序載入
        const sorted = [...msg.logs].reverse();
        sorted.forEach((item) => appendLog(item, false));
        renderList();
      }
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

    default:
      break;
  }
}

// 追加日誌記錄
function appendLog(logItem, shouldRender = true) {
  if (!logItem || !logItem.id) return;

  // 避免重複加入
  if (logs.some((l) => l.id === logItem.id)) return;

  logs.push(logItem);
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  updateCounters();

  if (shouldRender) {
    if (currentFilter === 'all' || currentFilter === logItem.category) {
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

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = formatTime(item.timestamp || Date.now());

  header.appendChild(tags);
  header.appendChild(timeSpan);
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

  // 詳細補充資訊 (如 probe detail 或 download url)
  if (item.category === 'probe' && item.detail) {
    const detail = document.createElement('div');
    detail.className = 'log-item-detail';
    detail.textContent = `參數/細節: ${JSON.stringify(item.detail, null, 2)}`;
    div.appendChild(detail);
  } else if (item.category === 'download' && item.url) {
    const detail = document.createElement('div');
    detail.className = 'log-item-detail';
    detail.textContent = `來源: ${item.url}`;
    div.appendChild(detail);
  }

  return div;
}

// 渲染當前過濾器之所有日誌
function renderList() {
  const startTime = performance.now();
  dom.streamList.innerHTML = '';
  const filtered = currentFilter === 'all'
    ? logs
    : logs.filter((l) => l.category === currentFilter);

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
  dom.footerLogCount.textContent = `已記錄 ${logs.length} 筆事件`;
}

// 渲染權限卡片 Badge
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

// 重設權限卡片為查詢中
function resetPermissionsToPending() {
  const badges = dom.permissionsContainer.querySelectorAll('.perm-badge');
  badges.forEach((b) => {
    b.className = 'perm-badge badge-pending';
    b.textContent = '查詢中';
  });
}

// 更新動態探針按鈕與狀態指示
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

// 同步與更新當前活動分頁資訊
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

    // 向背景查詢當前 Origin 權限與探針注入狀態
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

// 綁定事件監聽
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
      // 探針已啟動，提示使用者探針將於分頁刷新後重置
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

  // 清除日誌按鈕
  dom.btnClearLogs.addEventListener('click', () => {
    if (confirm('確定要清空所有活動日誌嗎？此操作將同步清除本機儲存紀錄。')) {
      if (port) {
        port.postMessage({ type: 'CLEAR_ALL_LOGS' });
      } else {
        logs = [];
        renderList();
        updateCounters();
      }
    }
  });

  // 匯出日誌 JSON
  dom.btnExportLogs.addEventListener('click', () => {
    if (logs.length === 0) {
      alert('目前無可匯出的日誌。');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `bam_audit_logs_${Date.now()}.json`);
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

  // 資源監視器刷新按鈕
  if (dom.btnRefreshProfiler) {
    dom.btnRefreshProfiler.addEventListener('click', (e) => {
      e.stopPropagation();
      requestProfilerUpdate();
    });
  }

  // 資源監視器重置統計按鈕
  if (dom.btnResetProfiler) {
    dom.btnResetProfiler.addEventListener('click', (e) => {
      e.stopPropagation();
      resetProfilerStats();
    });
  }
}

// 請求更新資源監視器數據
function requestProfilerUpdate() {
  if (port) {
    port.postMessage({ type: 'GET_BACKGROUND_PROFILER_METRICS' });
  }
  renderProfilerPanel();
}

// 切換資源監視器折疊/展開狀態
function toggleProfilerExpand() {
  isProfilerExpanded = !isProfilerExpanded;

  if (isProfilerExpanded) {
    dom.resourceMonitorSection?.classList.add('expanded');
    if (dom.profilerBody) dom.profilerBody.style.display = 'flex';
    if (dom.profilerCollapseIcon) dom.profilerCollapseIcon.textContent = '▼';
    requestProfilerUpdate();

    // 展開狀態下定期更新 (每 3 秒一次)
    if (!profilerUpdateTimer) {
      profilerUpdateTimer = setInterval(requestProfilerUpdate, 3000);
    }
  } else {
    dom.resourceMonitorSection?.classList.remove('expanded');
    if (dom.profilerBody) dom.profilerBody.style.display = 'none';
    if (dom.profilerCollapseIcon) dom.profilerCollapseIcon.textContent = '▶';

    // 收合時立即停止輪詢，落實零常駐開銷
    if (profilerUpdateTimer) {
      clearInterval(profilerUpdateTimer);
      profilerUpdateTimer = null;
    }
  }
}

// 重置資源監視器所有數據
function resetProfilerStats() {
  profiler.reset();
  latestBackgroundSummary = null;
  if (port) {
    port.postMessage({ type: 'RESET_BACKGROUND_PROFILER' });
  }
  renderProfilerPanel();
}

// 渲染組件資源監視器面板
function renderProfilerPanel() {
  if (!isProfilerExpanded) return;

  const clientSummary = profiler.getSummary();
  const bgSummary = latestBackgroundSummary;

  // 1. 合併模組指標
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

  // 2. 佇列積壓統計
  let totalQueueCount = 0;
  if (clientSummary.queues) {
    totalQueueCount += clientSummary.queues.reduce((sum, q) => sum + (q.current || 0), 0);
  }
  if (bgSummary && bgSummary.queues) {
    totalQueueCount += bgSummary.queues.reduce((sum, q) => sum + (q.current || 0), 0);
  }

  // 3. DOM 節點統計
  const domMetrics = clientSummary.dom || profiler.getDomMetrics();
  const domCount = domMetrics ? domMetrics.totalElements : document.querySelectorAll('*').length;

  // 4. JS 記憶體
  const mem = clientSummary.memory || (bgSummary ? bgSummary.memory : null);
  const memoryText = mem ? `${mem.usedMB} MB` : '良好';

  // 更新 KPI 數字
  if (dom.kpiDomCount) dom.kpiDomCount.textContent = domCount;
  if (dom.kpiMemoryVal) dom.kpiMemoryVal.textContent = memoryText;
  if (dom.kpiQueueCount) dom.kpiQueueCount.textContent = totalQueueCount;
  if (dom.kpiAvgLatency) dom.kpiAvgLatency.textContent = `${avgLatency.toFixed(1)}ms`;
  if (dom.profilerTotalTime) dom.profilerTotalTime.textContent = `總計 ${totalElapsed.toFixed(1)}ms`;

  // 5. 渲染模組耗時排行榜
  if (dom.profilerModulesList) {
    if (combinedMetrics.length === 0) {
      dom.profilerModulesList.innerHTML = '<div class="profiler-empty-hint">尚無效能採集資料</div>';
    } else {
      const maxTime = Math.max(...combinedMetrics.map((m) => m.totalTime), 1);
      dom.profilerModulesList.innerHTML = combinedMetrics.slice(0, 10).map((m) => {
        const pct = Math.max(4, Math.round((m.totalTime / maxTime) * 100));
        let barClass = '';
        if (m.avgTime > 40) {
          barClass = 'bar-critical';
        } else if (m.avgTime > 16) {
          barClass = 'bar-warning';
        }

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

  // 6. 彙整優化診斷建議
  const recommendations = [];
  if (clientSummary.recommendations) {
    recommendations.push(...clientSummary.recommendations);
  }
  if (bgSummary && bgSummary.recommendations) {
    for (const rec of bgSummary.recommendations) {
      if (!recommendations.some((r) => r.id === rec.id)) {
        recommendations.push(rec);
      }
    }
  }

  // 排除預設良好項目 (若已有其他警示)
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

  if (dom.profilerRecBadge) {
    dom.profilerRecBadge.textContent = `${filteredRecs.length} 項建議`;
  }

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

// 主初始化常式
function init() {
  connectPort();
  syncActiveTab();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);
