/**
 * dashboard.js - Finance Research Clipper 獨立分頁儀表板控制腳本
 * 負責渲染全螢幕儀表板、歷史庫切換、發起背景爬取與一鍵 Markdown/CSV/GAS 輸出。
 */

(function () {
  'use strict';

  // 狀態變數
  let currentStock = null;
  let historyList = [];

  // DOM 元素快取
  const searchInput = document.getElementById('dashboard-search-input');
  const btnCrawl = document.getElementById('btn-dashboard-crawl');
  const crawlSpinner = document.getElementById('crawl-spinner');
  const emptyState = document.getElementById('empty-state');
  const stockContentSection = document.getElementById('stock-content-section');
  const historyListContainer = document.getElementById('history-list-container');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // 底部類似 Google Sheets 分頁列元素
  const sheetTabContainer = document.getElementById('sheets-tab-container');
  const sheetTabCount = document.getElementById('sheet-tab-count');
  const btnTabPrev = document.getElementById('btn-tab-prev');
  const btnTabNext = document.getElementById('btn-tab-next');
  const btnTabAdd = document.getElementById('btn-tab-add');

  // Hero Section 元素
  const heroTicker = document.getElementById('hero-ticker');
  const heroPrice = document.getElementById('hero-price');
  const heroUpdated = document.getElementById('hero-updated');
  const heroMarketIndices = document.getElementById('hero-market-indices');
  const heroStatsGrid = document.getElementById('hero-stats-grid');

  // 分析師卡片元素
  const analystBadge = document.getElementById('analyst-badge');
  const targetLow = document.getElementById('target-low');
  const targetMedian = document.getElementById('target-median');
  const targetHigh = document.getElementById('target-high');
  const targetUpsideText = document.getElementById('target-upside-text');

  // 財報卡片元素
  const earningsEps = document.getElementById('earnings-eps');
  const earningsRevenue = document.getElementById('earnings-revenue');
  const earningsSummary = document.getElementById('earnings-summary');

  // 損益表與筆記
  const financialsTableWrap = document.getElementById('financials-table-wrap');
  const noteInput = document.getElementById('dashboard-note-input');

  // 輸出按鈕
  const btnAddToScrum = document.getElementById('btn-add-scrum-task');
  const btnCopyMarkdown = document.getElementById('btn-copy-markdown');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnSendGas = document.getElementById('btn-send-gas');
  const btnBatchSendGas = document.getElementById('btn-batch-send-gas');

  // 設定彈窗
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingGasUrl = document.getElementById('setting-gas-url');
  const settingGasSecret = document.getElementById('setting-gas-secret');
  const settingSheetsUrl = document.getElementById('setting-sheets-url');

  // AI 研報面板元素
  const btnGenerateAi = document.getElementById('btn-generate-ai');
  const btnRefreshAi = document.getElementById('btn-refresh-ai');
  const btnCopyAiMarkdown = document.getElementById('btn-copy-ai-markdown');
  const aiBtnSpinner = document.getElementById('ai-btn-spinner');
  const aiStatusIndicator = document.getElementById('ai-status-indicator');
  const aiLoadingContainer = document.getElementById('ai-loading-container');
  const aiIdleState = document.getElementById('ai-idle-state');
  const aiResultContainer = document.getElementById('ai-result-container');
  const aiQuickTakeList = document.getElementById('ai-quick-take-list');
  const aiBullCaseList = document.getElementById('ai-bull-case-list');
  const aiBearCaseList = document.getElementById('ai-bear-case-list');
  const aiFinancialHealthText = document.getElementById('ai-financial-health-text');
  const aiMetaTimestamp = document.getElementById('ai-meta-timestamp');
  const aiMetaSource = document.getElementById('ai-meta-source');
  const aiErrorNotice = document.getElementById('ai-error-notice');
  const aiErrorMessage = document.getElementById('ai-error-message');
  const btnOpenAiSettings = document.getElementById('btn-open-ai-settings');
  const settingScrumclockId = document.getElementById('setting-scrumclock-id');
  const btnTestAiConn = document.getElementById('btn-test-ai-conn');
  const scrumclockConnStatus = document.getElementById('scrumclock-conn-status');

  let currentAiSummary = null; // 當前標的的 AI 摘要快取

  // 吐司通知
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // 安全轉義函式 (防範 XSS)
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 初始化載入本地數據
  function init() {
    console.log('[FinanceClipper] 儀表板初始化中 (純本地模式優先)...');
    chrome.storage.local.get([
      'latestStockData', 'stockHistory', 
      'gasUrl', 'sheetsUrl', 'gasSecretToken',
      'appsScriptUrl', 'userSpreadsheetUrl', 
      'contextNote', 'scrumclock_ext_id'
    ], (res) => {
      const activeGasUrl = res.gasUrl || res.appsScriptUrl || '';
      const activeSheetsUrl = res.sheetsUrl || res.userSpreadsheetUrl || '';
      const activeGasSecret = res.gasSecretToken || '';

      if (activeGasUrl && settingGasUrl) settingGasUrl.value = activeGasUrl;
      if (activeGasSecret && settingGasSecret) settingGasSecret.value = activeGasSecret;
      if (activeSheetsUrl && settingSheetsUrl) settingSheetsUrl.value = activeSheetsUrl;
      if (res.contextNote) noteInput.value = res.contextNote;
      if (res.scrumclock_ext_id && settingScrumclockId) {
        settingScrumclockId.value = res.scrumclock_ext_id;
      }

      historyList = res.stockHistory || [];
      console.log(`[FinanceClipper] 本地已載入 ${historyList.length} 檔歷史標的。`);
      renderHistoryList();
      renderSheetTabs();

      // 檢查本機 AI 服務連線狀態
      checkAiStatus();

      if (res.latestStockData) {
        renderStock(res.latestStockData);
      } else if (historyList.length > 0) {
        renderStock(historyList[0]);
      } else {
        showEmptyState();
      }
    });

    bindEvents();
  }

  function showEmptyState() {
    emptyState.style.display = 'block';
    stockContentSection.style.display = 'none';
  }

  // 渲染個股完整儀表板
  function renderStock(stock) {
    if (!stock) {
      showEmptyState();
      return;
    }

    currentStock = stock;
    emptyState.style.display = 'none';
    stockContentSection.style.display = 'flex';

    // 1. Hero Section
    heroTicker.textContent = stock.ticker || 'UNKNOWN';
    heroPrice.textContent = stock.price || 'N/A';
    heroUpdated.textContent = `採集時間：${stock.updatedAt || new Date().toLocaleString()}`;

    // 大盤指數
    const sp500 = stock.stats && stock.stats['S&P 500'] ? `S&P 500: ${stock.stats['S&P 500']}` : '';
    const nasdaq = stock.stats && stock.stats['Nasdaq'] ? `Nasdaq: ${stock.stats['Nasdaq']}` : '';
    heroMarketIndices.textContent = [sp500, nasdaq].filter(Boolean).join(' | ');

    // 關鍵指標網格
    renderStatsGrid(stock.stats || {});

    // 2. 分析師評級與目標價
    const analyst = stock.analyst || {};
    analystBadge.textContent = analyst.consensus || 'N/A';
    if (analyst.consensus && analyst.consensus.toLowerCase().includes('buy')) {
      analystBadge.className = 'rating-badge rating-buy';
    } else {
      analystBadge.className = 'rating-badge rating-hold';
    }

    targetLow.textContent = analyst.targetLow || '--';
    targetMedian.textContent = analyst.targetMedian || '--';
    targetHigh.textContent = analyst.targetHigh || '--';

    // 計算潛在上漲空間
    if (analyst.targetMedian && stock.price) {
      const curPrice = parseFloat(stock.price.replace(/[^0-9.]/g, ''));
      const medPrice = parseFloat(analyst.targetMedian.replace(/[^0-9.]/g, ''));
      if (!isNaN(curPrice) && !isNaN(medPrice) && curPrice > 0) {
        const upside = (((medPrice - curPrice) / curPrice) * 100).toFixed(1);
        const sign = upside >= 0 ? '+' : '';
        targetUpsideText.textContent = `目標價中位數隱含潛在漲跌幅空間：${sign}${upside}%`;
      } else {
        targetUpsideText.textContent = '';
      }
    } else {
      targetUpsideText.textContent = '';
    }

    // 3. 財報表現 (Earnings)
    const earnings = stock.earnings || {};
    earningsEps.textContent = `${earnings.epsActual || '--'} / ${earnings.epsEstimate || '--'}`;
    earningsRevenue.textContent = `${earnings.revenueActual || '--'} / ${earnings.revenueEstimate || '--'}`;
    earningsSummary.textContent = earnings.table && earnings.table.length > 0 ? `歷史已爬取 ${earnings.table.length} 季表現` : '最新季度數據';

    // 4. 損益表矩陣 (Financials)
    renderFinancialsTable(stock.financials ? stock.financials.table : null);

    // 更新左側活躍樣式
    highlightActiveHistoryItem(stock.ticker);

    // 5. 載入並渲染 AI 智能研報
    loadStockAi(stock, false);
  }

  // 渲染 Key Stats 網格
  function renderStatsGrid(stats) {
    heroStatsGrid.textContent = '';
    const displayKeys = ['市值', 'Market cap', '本益比', 'P/E ratio', '當日範圍', 'Day range', '52 週範圍', '52-week range', '殖利率', 'Dividend yield'];

    let count = 0;
    for (const [key, value] of Object.entries(stats)) {
      if (key === 'S&P 500' || key === 'Nasdaq') continue;
      const box = document.createElement('div');
      box.className = 'stat-box';

      const label = document.createElement('div');
      label.className = 'stat-label';
      label.textContent = key;

      const val = document.createElement('div');
      val.className = 'stat-value';
      val.textContent = value;

      box.appendChild(label);
      box.appendChild(val);
      heroStatsGrid.appendChild(box);
      count++;
    }

    if (count === 0) {
      const fallbackBox = document.createElement('div');
      fallbackBox.className = 'stat-box';
      fallbackBox.textContent = '暫無詳細統計指標';
      heroStatsGrid.appendChild(fallbackBox);
    }
  }

  // 渲染損益表矩陣
  function renderFinancialsTable(table) {
    financialsTableWrap.textContent = '';

    if (!table || !Array.isArray(table) || table.length === 0) {
      const p = document.createElement('p');
      p.style.color = 'var(--text-muted)';
      p.style.fontSize = '0.88rem';
      p.textContent = '未擷取到損益表矩陣數據';
      financialsTableWrap.appendChild(p);
      return;
    }

    const tbl = document.createElement('table');
    tbl.className = 'data-table';

    // 表頭 (第 0 列)
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    (table[0] || []).forEach((col) => {
      const th = document.createElement('th');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    tbl.appendChild(thead);

    // 內容列 (第 1 列之後)
    const tbody = document.createElement('tbody');
    for (let r = 1; r < table.length; r++) {
      const tr = document.createElement('tr');
      (table[r] || []).forEach((cell) => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);

    financialsTableWrap.appendChild(tbl);
  }

  // 渲染左側歷史追蹤清單
  function renderHistoryList() {
    historyListContainer.textContent = '';

    if (!historyList || historyList.length === 0) {
      const p = document.createElement('p');
      p.style.color = 'var(--text-muted)';
      p.style.fontSize = '0.82rem';
      p.style.padding = '12px';
      p.textContent = '尚未有歷史採集紀錄';
      historyListContainer.appendChild(p);
      return;
    }

    historyList.forEach((item) => {
      const card = document.createElement('div');
      card.className = `history-item ${currentStock && currentStock.ticker === item.ticker ? 'active' : ''}`;
      card.dataset.ticker = item.ticker;

      const left = document.createElement('div');
      const tickerEl = document.createElement('div');
      tickerEl.className = 'history-ticker';
      tickerEl.textContent = item.ticker;

      const timeEl = document.createElement('div');
      timeEl.className = 'history-time';
      timeEl.textContent = item.updatedAt ? item.updatedAt.split(' ')[0] : '';
      left.appendChild(tickerEl);
      left.appendChild(timeEl);

      const right = document.createElement('div');
      const priceEl = document.createElement('div');
      priceEl.className = 'history-price';
      priceEl.textContent = item.price;
      right.appendChild(priceEl);

      card.appendChild(left);
      card.appendChild(right);

      card.addEventListener('click', () => {
        renderStock(item);
      });

      historyListContainer.appendChild(card);
    });
  }

  function highlightActiveHistoryItem(ticker) {
    // 1. 同步左側歷史清單高亮
    const items = historyListContainer.querySelectorAll('.history-item');
    items.forEach((it) => {
      if (it.dataset.ticker === ticker) {
        it.classList.add('active');
      } else {
        it.classList.remove('active');
      }
    });

    // 2. 同步底部分頁列 (Sheet Tabs) 高亮並平滑捲入視野
    if (sheetTabContainer) {
      const tabs = sheetTabContainer.querySelectorAll('.sheet-tab');
      tabs.forEach((tab) => {
        if (tab.dataset.ticker === ticker) {
          tab.classList.add('active');
          tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
          tab.classList.remove('active');
        }
      });
    }
  }

  // 渲染底部分頁列 (Google Sheets 風格)
  function renderSheetTabs() {
    if (!sheetTabContainer) return;
    sheetTabContainer.textContent = '';

    if (!historyList || historyList.length === 0) {
      const emptySpan = document.createElement('span');
      emptySpan.style.color = 'var(--text-muted)';
      emptySpan.style.fontSize = '0.75rem';
      emptySpan.style.padding = '6px 12px';
      emptySpan.textContent = '尚未暫存任何股票分頁';
      sheetTabContainer.appendChild(emptySpan);
      if (sheetTabCount) sheetTabCount.textContent = '0 檔標的分頁';
      return;
    }

    if (sheetTabCount) sheetTabCount.textContent = `${historyList.length} 檔標的分頁`;

    historyList.forEach((item) => {
      const tab = document.createElement('div');
      const isActive = currentStock && currentStock.ticker === item.ticker;
      tab.className = `sheet-tab ${isActive ? 'active' : ''}`;
      tab.dataset.ticker = item.ticker;

      const icon = document.createElement('span');
      icon.className = 'sheet-tab-icon';
      icon.textContent = '📊';

      const tickerSpan = document.createElement('span');
      tickerSpan.className = 'sheet-tab-ticker';
      tickerSpan.textContent = item.ticker;

      const priceSpan = document.createElement('span');
      priceSpan.className = 'sheet-tab-price';
      priceSpan.textContent = item.price;

      const closeBtn = document.createElement('span');
      closeBtn.className = 'sheet-tab-close';
      closeBtn.title = `關閉 ${item.ticker} 分頁`;
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSheetTab(item.ticker);
      });

      tab.appendChild(icon);
      tab.appendChild(tickerSpan);
      tab.appendChild(priceSpan);
      tab.appendChild(closeBtn);

      tab.addEventListener('click', () => {
        renderStock(item);
      });

      sheetTabContainer.appendChild(tab);
    });
  }

  // 關閉單一股票分頁 (移除暫存)
  function closeSheetTab(ticker) {
    historyList = historyList.filter((it) => it.ticker !== ticker);
    chrome.storage.local.set({ stockHistory: historyList }, () => {
      if (currentStock && currentStock.ticker === ticker) {
        if (historyList.length > 0) {
          renderStock(historyList[0]);
        } else {
          currentStock = null;
          chrome.storage.local.remove(['latestStockData']);
          showEmptyState();
        }
      }
      renderSheetTabs();
      renderHistoryList();
      showToast(`已關閉 [${ticker}] 分頁`);
    });
  }

  // 觸發背景採集
  function triggerCrawl(keyword) {
    if (!keyword || !keyword.trim()) {
      console.warn('[FinanceClipper] 請輸入有效的股票代號或名稱！');
      showToast('請輸入有效的股票代號或名稱！');
      return;
    }

    const cleanKeyword = keyword.trim().toUpperCase();
    console.log(`[FinanceClipper] 🚀 發起深度採集: [${cleanKeyword}]`);
    btnCrawl.disabled = true;
    crawlSpinner.style.display = 'inline-block';
    showToast(`⚡ 正在背景啟動 4合1 深度採集 [${cleanKeyword}]...`);

    // 防卡死前端保護：15 秒超時強制限流復原
    let hasResponded = false;
    const safetyTimer = setTimeout(() => {
      if (!hasResponded) {
        console.warn(`[FinanceClipper] ⚠️ 採集請求 [${cleanKeyword}] 等待逾時 (15s)，自動重設按鈕狀態。`);
        btnCrawl.disabled = false;
        crawlSpinner.style.display = 'none';
        showToast(`⚠️ 背景採集超時，請檢查網路或重試！`);
      }
    }, 15000);

    try {
      chrome.runtime.sendMessage({
        action: 'CRAWL_STOCK',
        keyword: cleanKeyword
      }, (res) => {
        hasResponded = true;
        clearTimeout(safetyTimer);
        btnCrawl.disabled = false;
        crawlSpinner.style.display = 'none';

        if (chrome.runtime.lastError) {
          console.error('[FinanceClipper] ❌ 背景通訊錯誤:', chrome.runtime.lastError.message);
          showToast(`❌ 通訊錯誤：${chrome.runtime.lastError.message}`);
          return;
        }

        console.log('[FinanceClipper] 📥 收到採集回應結果:', res);

        if (res && res.success && res.data) {
          console.log(`[FinanceClipper] ✅ [${res.data.ticker}] 採集成功:`, res.data);
          showToast(`✅ [${res.data.ticker}] 採集完成！`);
          // 重新讀取本地 storage 更新歷史清單
          chrome.storage.local.get(['stockHistory'], (storageRes) => {
            historyList = storageRes.stockHistory || [];
            renderHistoryList();
            renderSheetTabs();
            renderStock(res.data);
          });
        } else {
          const errMsg = res ? res.error : '未知錯誤';
          console.error(`[FinanceClipper] ❌ 採集失敗:`, errMsg);
          showToast(`❌ 採集失敗：${errMsg}`);
        }
      });
    } catch (e) {
      hasResponded = true;
      clearTimeout(safetyTimer);
      btnCrawl.disabled = false;
      crawlSpinner.style.display = 'none';
      console.error('[FinanceClipper] 發送訊息異常:', e);
      showToast(`❌ 發送請求失敗: ${e.message}`);
    }
  }

  // 匯出 Markdown
  function exportMarkdown() {
    if (!currentStock) return;
    const stock = currentStock;
    const note = noteInput.value.trim();

    let md = `# 投資研報：${stock.ticker} (${stock.price})\n\n`;
    md += `* **採集時間**：${stock.updatedAt || new Date().toLocaleString()}\n`;
    md += `* **即時價格**：${stock.price}\n\n`;

    // 關鍵指標
    md += `### 📊 核心財務指標\n\n`;
    md += `| 指標項目 | 數值 |\n| :--- | :--- |\n`;
    for (const [k, v] of Object.entries(stock.stats || {})) {
      md += `| ${k} | ${v} |\n`;
    }
    md += `\n`;

    // 分析師目標價
    const an = stock.analyst || {};
    md += `### 🎯 分析師共識與目標價\n\n`;
    md += `- **共識評級**：${an.consensus || 'N/A'}\n`;
    md += `- **最低目標價**：${an.targetLow || 'N/A'}\n`;
    md += `- **中位數目標價**：${an.targetMedian || 'N/A'}\n`;
    md += `- **最高目標價**：${an.targetHigh || 'N/A'}\n\n`;

    // 損益表矩陣
    const fin = stock.financials ? stock.financials.table : null;
    if (fin && Array.isArray(fin) && fin.length > 0) {
      md += `### 📑 損益表矩陣 (Income Statement)\n\n`;
      md += `| ` + fin[0].join(' | ') + ` |\n`;
      md += `| ` + fin[0].map(() => '---').join(' | ') + ` |\n`;
      for (let i = 1; i < fin.length; i++) {
        md += `| ` + fin[i].join(' | ') + ` |\n`;
      }
      md += `\n`;
    }

    if (note) {
      md += `### ✍️ 個人投資觀點與研報筆記\n\n${note}\n\n`;
    }

    // 🤖 Gemini Nano 智能研報整合輸出
    if (currentAiSummary && currentAiSummary.rawMarkdown) {
      md += `----------------------------------------\n\n${currentAiSummary.rawMarkdown}\n\n`;
    }

    navigator.clipboard.writeText(md).then(() => {
      showToast('📋 Markdown 研報已成功複製至剪貼簿！');
    }).catch(() => {
      showToast('複製失敗，請手動選取複製');
    });
  }

  // 匯出 CSV 檔案下載
  function exportCsv() {
    if (!currentStock) return;
    const stock = currentStock;

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += '類別,項目,數值\n';
    csvContent += `標的概況,Ticker,"${stock.ticker}"\n`;
    csvContent += `標的概況,Price,"${stock.price}"\n`;
    csvContent += `標的概況,採集時間,"${stock.updatedAt || ''}"\n`;

    for (const [k, v] of Object.entries(stock.stats || {})) {
      csvContent += `核心指標,"${k}","${v}"\n`;
    }

    const an = stock.analyst || {};
    csvContent += `分析師,共識評級,"${an.consensus || ''}"\n`;
    csvContent += `分析師,最低目標價,"${an.targetLow || ''}"\n`;
    csvContent += `分析師,中位數目標價,"${an.targetMedian || ''}"\n`;
    csvContent += `分析師,最高目標價,"${an.targetHigh || ''}"\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${stock.ticker}_finance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📥 [${stock.ticker}] CSV 試算表已開始下載！`);
  }

  // 送出至 Google Sheets (統一 GAS Webhook Envelope 規範)
  function sendToGas() {
    if (!currentStock) return;
    chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
      const gasUrl = res.gasUrl || res.appsScriptUrl;
      if (!gasUrl) {
        showToast('⚠️ 尚未設定 Google Apps Script URL，請先點選右上角齒輪設定！');
        settingsModal.style.display = 'flex';
        return;
      }

      btnSendGas.disabled = true;
      btnSendGas.textContent = '傳送中...';

      const payload = {
        protocolVersion: 1,
        action: 'finance_clip',
        secretToken: res.gasSecretToken || undefined,
        timestamp: Date.now(),
        data: {
          ticker: currentStock.ticker,
          name: currentStock.name || currentStock.companyName || currentStock.ticker,
          price: currentStock.price,
          sentiment: currentStock.sentiment || (currentStock.note ? analyzeClientSentiment(currentStock.note) : '😐 中性'),
          note: noteInput.value.trim(),
          pe: currentStock.stats ? (currentStock.stats['本益比'] || currentStock.stats['P/E ratio'] || '') : '',
          mktcap: currentStock.stats ? (currentStock.stats['市值'] || currentStock.stats['Market cap'] || '') : '',
          sp500: currentStock.stats ? (currentStock.stats['sp500'] || '') : '',
          nasdaq: currentStock.stats ? (currentStock.stats['nasdaq'] || '') : '',
          analystRating: currentStock.analyst ? (currentStock.analyst.consensus || '') : '',
          analystTargetPrice: currentStock.analyst ? (currentStock.analyst.targetMedian || '') : '',
          sourceUrl: currentStock.url || `https://www.google.com/finance/quote/${currentStock.ticker}`
        }
      };

      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'cors',
        redirect: 'follow'
      }).then((resp) => {
        btnSendGas.disabled = false;
        btnSendGas.textContent = '☁️ 發送至 Google Sheets (GAS)';
        if (resp.ok) {
          showToast(`🎉 成功同步 [${currentStock.ticker}] 至 Google Sheets！`);
        } else {
          showToast(`⚠️ 傳送失敗，HTTP 狀態碼: ${resp.status}`);
        }
      }).catch((err) => {
        btnSendGas.disabled = false;
        btnSendGas.textContent = '☁️ 發送至 Google Sheets (GAS)';
        showToast(`❌ 連線錯誤: ${err.message}`);
      });
    });
  }

  // 📦 批次同步全部歷史標的至 Google Sheets
  function batchSendToGas() {
    if (!historyList || historyList.length === 0) {
      showToast('⚠️ 歷史追蹤清單為空，無資料可同步');
      return;
    }

    chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
      const gasUrl = res.gasUrl || res.appsScriptUrl;
      if (!gasUrl) {
        showToast('⚠️ 尚未設定 Google Apps Script URL，請先點選右上角齒輪設定！');
        settingsModal.style.display = 'flex';
        return;
      }

      if (btnBatchSendGas) {
        btnBatchSendGas.disabled = true;
        btnBatchSendGas.textContent = `同步中 (${historyList.length} 筆)...`;
      }

      const items = historyList.map(stock => ({
        ticker: stock.ticker,
        name: stock.name || stock.companyName || stock.ticker,
        price: stock.price,
        sentiment: stock.sentiment || (stock.note ? analyzeClientSentiment(stock.note) : '😐 中性'),
        note: stock.note || '',
        pe: stock.stats ? (stock.stats['本益比'] || stock.stats['P/E ratio'] || '') : '',
        mktcap: stock.stats ? (stock.stats['市值'] || stock.stats['Market cap'] || '') : '',
        analystRating: stock.analyst ? (stock.analyst.consensus || '') : '',
        analystTargetPrice: stock.analyst ? (stock.analyst.targetMedian || '') : '',
        sourceUrl: stock.url || `https://www.google.com/finance/quote/${stock.ticker}`
      }));

      const payload = {
        protocolVersion: 1,
        action: 'batch_finance_clip',
        secretToken: res.gasSecretToken || undefined,
        timestamp: Date.now(),
        data: {
          items: items
        }
      };

      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'cors',
        redirect: 'follow'
      }).then((resp) => {
        if (btnBatchSendGas) {
          btnBatchSendGas.disabled = false;
          btnBatchSendGas.textContent = '📦 批次同步全部標的';
        }
        if (resp.ok) {
          showToast(`🎉 成功批次匯流 ${items.length} 檔個股至 Google Sheets！`);
        } else {
          showToast(`⚠️ 批次同步失敗，HTTP: ${resp.status}`);
        }
      }).catch((err) => {
        if (btnBatchSendGas) {
          btnBatchSendGas.disabled = false;
          btnBatchSendGas.textContent = '📦 批次同步全部標的';
        }
        showToast(`❌ 批次連線錯誤: ${err.message}`);
      });
    });
  }

  // 執行轉入 ScrumClock 任務
  async function addStockToScrumTask() {
    if (!currentStock) {
      showToast('⚠️ 請先選擇或採集個股標的');
      return;
    }

    if (!window.FinanceAIClient || !window.FinanceAIClient.createScrumTask) {
      showToast('⚠️ 跨插件客戶端模組尚未載入');
      return;
    }

    const stock = currentStock;
    const note = noteInput ? noteInput.value.trim() : '';

    // 格式化結構化 Markdown
    let md = `### 📌 標的概況：${stock.ticker} (${stock.price})\n\n`;
    md += `* **採集時間**：${stock.updatedAt || new Date().toLocaleString()}\n`;
    md += `* **即時價格**：${stock.price}\n\n`;

    const an = stock.analyst || {};
    md += `### 🎯 分析師評級與目標價\n`;
    md += `- 共識：${an.consensus || 'N/A'}\n`;
    md += `- 目標價：最低 ${an.targetLow || 'N/A'} / 中位 ${an.targetMedian || 'N/A'} / 最高 ${an.targetHigh || 'N/A'}\n\n`;

    if (note) {
      md += `### ✍️ 個人研究觀點\n${note}\n\n`;
    }

    if (currentAiSummary && currentAiSummary.rawMarkdown) {
      md += `### ✨ Gemini Nano 智能速讀\n${currentAiSummary.rawMarkdown}\n\n`;
    }

    const taskTitle = `研讀 $${stock.ticker} 財報與投資估值`;
    const tags = ['#投資研究', `$${stock.ticker}`];

    if (btnAddToScrum) {
      btnAddToScrum.disabled = true;
      btnAddToScrum.textContent = '⏳ 正在轉入任務...';
    }

    try {
      const res = await window.FinanceAIClient.createScrumTask({
        ticker: stock.ticker,
        title: taskTitle,
        notes: md,
        tags: tags,
        estimatedPomodoros: 2,
        url: window.location.href
      });

      if (btnAddToScrum) {
        btnAddToScrum.disabled = false;
        btnAddToScrum.textContent = '🎯 加入今日作戰戰役';
      }

      if (res && res.success) {
        if (res.duplicate) {
          showToast(`ℹ️ $${stock.ticker} 今日已在戰役中，已同步更新備忘！`);
        } else {
          showToast(`🎯 成功將 $${stock.ticker} 加入 ScrumClock 今日戰役！`);
        }
      } else {
        showToast(`⚠️ 建立任務失敗：${res ? res.error : '未知錯誤'}`);
      }
    } catch (err) {
      if (btnAddToScrum) {
        btnAddToScrum.disabled = false;
        btnAddToScrum.textContent = '🎯 加入今日作戰戰役';
      }
      showToast(`❌ 發生異常：${err.message}`);
    }
  }

  // ===========================================================================
  // 🤖 Gemini Nano AI 研報交互與狀態管理函式群
  // ===========================================================================

  // 檢查 AI 服務可用狀態並更新小圓點
  async function checkAiStatus() {
    if (!window.FinanceAIClient || !aiStatusIndicator) return;
    const res = await window.FinanceAIClient.checkAvailability();
    if (res.success && res.available) {
      aiStatusIndicator.className = 'ai-status-dot connected';
      aiStatusIndicator.title = `已連線: ${res.model || 'Gemini Nano'}`;
    } else {
      aiStatusIndicator.className = 'ai-status-dot';
      aiStatusIndicator.title = res.error || 'ScrumClock AI 服務未連線';
    }
  }

  // 切換 AI 載入狀態
  function showAiLoading(isLoading) {
    if (!aiLoadingContainer || !btnGenerateAi) return;
    if (isLoading) {
      aiLoadingContainer.style.display = 'flex';
      aiIdleState.style.display = 'none';
      aiResultContainer.style.display = 'none';
      aiErrorNotice.style.display = 'none';
      btnGenerateAi.disabled = true;
      btnGenerateAi.style.opacity = '0.7';
      if (aiBtnSpinner) aiBtnSpinner.style.display = 'inline';
    } else {
      aiLoadingContainer.style.display = 'none';
      btnGenerateAi.disabled = false;
      btnGenerateAi.style.opacity = '1';
      if (aiBtnSpinner) aiBtnSpinner.style.display = 'none';
    }
  }

  // 顯示 AI 錯誤或未開啟提醒
  function showAiError(errorMessage) {
    showAiLoading(false);
    if (aiErrorNotice && aiErrorMessage) {
      aiErrorNotice.style.display = 'block';
      aiErrorMessage.textContent = errorMessage;
      aiIdleState.style.display = 'none';
      aiResultContainer.style.display = 'none';
    }
  }

  // 渲染 AI 研報數據
  function renderAiSummary(summary) {
    currentAiSummary = summary;
    if (!summary || !aiResultContainer) return;

    // 1. 三句話速讀
    aiQuickTakeList.textContent = '';
    const quickTake = Array.isArray(summary.quickTake) ? summary.quickTake : [];
    quickTake.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiQuickTakeList.appendChild(li);
    });

    // 2. 多方核心看點
    aiBullCaseList.textContent = '';
    const bullCase = Array.isArray(summary.bullCase) ? summary.bullCase : [];
    bullCase.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiBullCaseList.appendChild(li);
    });

    // 3. 空方核心疑慮
    aiBearCaseList.textContent = '';
    const bearCase = Array.isArray(summary.bearCase) ? summary.bearCase : [];
    bearCase.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiBearCaseList.appendChild(li);
    });

    // 4. 財務健康評語
    aiFinancialHealthText.textContent = summary.financialHealth || '無財務健康特別評語。';

    // 5. 元數據
    if (aiMetaTimestamp) {
      aiMetaTimestamp.textContent = `生成時間：${summary.generatedAt || new Date().toLocaleTimeString()}`;
    }
    if (aiMetaSource && summary.model) {
      aiMetaSource.textContent = `推論核心：${summary.model}`;
    }

    // 顯隱控制
    aiIdleState.style.display = 'none';
    aiErrorNotice.style.display = 'none';
    aiResultContainer.style.display = 'flex';
    if (btnRefreshAi) btnRefreshAi.style.display = 'inline-flex';
    if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'inline-flex';
    if (btnGenerateAi) btnGenerateAi.style.display = 'none';
  }

  // 載入個股 AI 研報 (先檢查快取，若無則可手動或自動生成)
  async function loadStockAi(stock, forceRefresh = false) {
    if (!stock || !stock.ticker) return;

    // 隱藏錯誤提示，切換為檢查中
    aiErrorNotice.style.display = 'none';

    if (!forceRefresh) {
      // 1. 嘗試由本機快取讀取
      const cached = await window.FinanceAIClient?.getCachedSummary(stock.ticker);
      if (cached) {
        console.log(`[FinanceClipper] 載入 ${stock.ticker} 當日 AI 快取研報`);
        renderAiSummary(cached);
        return;
      }

      // 若無快取，呈現待觸發狀態
      currentAiSummary = null;
      aiIdleState.style.display = 'block';
      aiResultContainer.style.display = 'none';
      if (btnRefreshAi) btnRefreshAi.style.display = 'none';
      if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'none';
      if (btnGenerateAi) btnGenerateAi.style.display = 'inline-flex';
      return;
    }

    // 2. 使用者點擊「產生 AI 解讀」或「重新分析」
    showAiLoading(true);
    showToast(`🤖 正在為 ${stock.ticker} 調用本地 Gemini Nano 分析中...`);

    const result = await window.FinanceAIClient?.requestStockSummary(stock, true);
    showAiLoading(false);

    if (result && result.success && result.summary) {
      renderAiSummary(result.summary);
      showToast('✨ Gemini Nano 研報摘要已生成完畢！');
    } else {
      showAiError(result?.error || '無法取得 AI 分析結果，請確認 ScrumClock 是否運行且已啟用 Gemini Nano。');
      showToast('⚠️ AI 生成未完成，請檢視面板提示。');
    }
  }

  // 僅複製 AI 研報 Markdown
  function copyAiMarkdownOnly() {
    if (!currentAiSummary || !currentAiSummary.rawMarkdown) {
      showToast('⚠️ 目前尚未生成 AI 研報摘要');
      return;
    }
    navigator.clipboard.writeText(currentAiSummary.rawMarkdown).then(() => {
      showToast('📋 AI 研報摘要已複製至剪貼簿！');
    }).catch(() => {
      showToast('複製失敗，請手動選取');
    });
  }

  // 測試 AI 跨插件連線
  async function testAiConnection() {
    const extId = settingScrumclockId.value.trim();
    if (!extId) {
      scrumclockConnStatus.textContent = '請先填入 ScrumClock 插件 ID！';
      scrumclockConnStatus.style.color = 'var(--accent-red)';
      return;
    }

    scrumclockConnStatus.textContent = '連線測試中...';
    scrumclockConnStatus.style.color = 'var(--text-secondary)';

    const res = await window.FinanceAIClient.checkAvailability(extId);
    if (res.success && res.available) {
      scrumclockConnStatus.textContent = `✅ 連線成功！偵測到模型：${res.model}`;
      scrumclockConnStatus.style.color = 'var(--accent-green)';
      checkAiStatus();
    } else {
      scrumclockConnStatus.textContent = `❌ ${res.error || '連線失敗或 Gemini Nano 未就緒'}`;
      scrumclockConnStatus.style.color = 'var(--accent-red)';
    }
  }

  // 綁定所有事件
  function bindEvents() {
    // 搜尋與 Enter 觸發
    btnCrawl.addEventListener('click', () => triggerCrawl(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerCrawl(searchInput.value);
    });

    // 熱門標籤按鈕
    document.querySelectorAll('.pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const symbol = pill.dataset.symbol;
        searchInput.value = symbol;
        triggerCrawl(symbol);
      });
    });

    // 匯出功能
    btnCopyMarkdown.addEventListener('click', exportMarkdown);
    btnDownloadCsv.addEventListener('click', exportCsv);
    btnSendGas.addEventListener('click', sendToGas);
    if (btnBatchSendGas) btnBatchSendGas.addEventListener('click', batchSendToGas);
    if (btnAddToScrum) btnAddToScrum.addEventListener('click', addStockToScrumTask);

    // 清空歷史清單
    btnClearHistory.addEventListener('click', () => {
      if (confirm('確定要清空所有已記錄的歷史標的嗎？')) {
        chrome.storage.local.remove(['stockHistory', 'latestStockData'], () => {
          historyList = [];
          currentStock = null;
          renderHistoryList();
          renderSheetTabs();
          showEmptyState();
          showToast('歷史追蹤清單已清空');
        });
      }
    });

    // 底部 Google Sheets 分頁控制按鈕
    if (btnTabPrev && sheetTabContainer) {
      btnTabPrev.addEventListener('click', () => {
        sheetTabContainer.scrollBy({ left: -160, behavior: 'smooth' });
      });
    }

    if (btnTabNext && sheetTabContainer) {
      btnTabNext.addEventListener('click', () => {
        sheetTabContainer.scrollBy({ left: 160, behavior: 'smooth' });
      });
    }

    if (btnTabAdd) {
      btnTabAdd.addEventListener('click', () => {
        searchInput.focus();
        searchInput.select();
        showToast('請在上方搜尋列輸入股票代號並按下「深度採集」！');
      });
    }

    // AI 研報面板按鈕
    if (btnGenerateAi) {
      btnGenerateAi.addEventListener('click', () => {
        if (currentStock) loadStockAi(currentStock, true);
      });
    }
    if (btnRefreshAi) {
      btnRefreshAi.addEventListener('click', () => {
        if (currentStock) loadStockAi(currentStock, true);
      });
    }
    if (btnCopyAiMarkdown) {
      btnCopyAiMarkdown.addEventListener('click', copyAiMarkdownOnly);
    }
    if (btnOpenAiSettings) {
      btnOpenAiSettings.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
      });
    }
    if (btnTestAiConn) {
      btnTestAiConn.addEventListener('click', testAiConnection);
    }

    // 設定彈窗控制
    btnOpenSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
    // 點擊半透明遮罩背景時自動關閉
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
    btnSaveSettings.addEventListener('click', () => {
      const gasUrl = settingGasUrl.value.trim();
      const gasSecretToken = settingGasSecret ? settingGasSecret.value.trim() : '';
      const sheetsUrl = settingSheetsUrl.value.trim();
      const scId = settingScrumclockId ? settingScrumclockId.value.trim() : '';

      // 同步雙向儲存，確保 popup.js 與 dashboard.js 都能無縫讀取
      chrome.storage.local.set({ 
        gasUrl, 
        gasSecretToken,
        sheetsUrl,
        appsScriptUrl: gasUrl,
        userSpreadsheetUrl: sheetsUrl,
        scrumclock_ext_id: scId
      }, async () => {
        if (window.FinanceAIClient && scId) {
          await window.FinanceAIClient.setScrumClockId(scId);
          checkAiStatus();
        }
        settingsModal.style.display = 'none';
        console.log('[FinanceClipper] 儀表板設定已儲存');
        showToast('✅ 儀表板與 AI 連線設定已儲存！');
      });
    });

    // 監聽背景廣播的更新通知
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'STOCK_CRAWL_SUCCESS' && msg.data) {
        chrome.storage.local.get(['stockHistory'], (storageRes) => {
          historyList = storageRes.stockHistory || [];
          renderHistoryList();
          renderSheetTabs();
          renderStock(msg.data);
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
