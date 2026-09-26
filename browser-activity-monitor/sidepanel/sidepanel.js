/**
 * Browser Activity Monitor - Side Panel 控制腳本
 * 管理活動串流即時展示、網站原生權限審查與深度動態探針調度。
 */

// 狀態管理
let port = null;
let currentTab = null;
let logs = [];
const MAX_LOGS = 500;
let currentFilter = 'all';
let autoScroll = true;
let isInspectorActive = false;

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
  autoScrollCheckbox: document.getElementById('auto-scroll-checkbox')
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
      dom.emptyState.style.display = 'none';
      const node = createLogItemElement(logItem);
      dom.streamList.appendChild(node);

      if (autoScroll) {
        dom.streamContainer.scrollTop = dom.streamContainer.scrollHeight;
      }
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
}

// 主初始化常式
function init() {
  connectPort();
  syncActiveTab();
  initEvents();
}

document.addEventListener('DOMContentLoaded', init);
