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
  const btnCopyMarkdown = document.getElementById('btn-copy-markdown');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnSendGas = document.getElementById('btn-send-gas');

  // 設定彈窗
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingGasUrl = document.getElementById('setting-gas-url');
  const settingSheetsUrl = document.getElementById('setting-sheets-url');

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
    chrome.storage.local.get(['latestStockData', 'stockHistory', 'gasUrl', 'sheetsUrl', 'contextNote'], (res) => {
      if (res.gasUrl) settingGasUrl.value = res.gasUrl;
      if (res.sheetsUrl) settingSheetsUrl.value = res.sheetsUrl;
      if (res.contextNote) noteInput.value = res.contextNote;

      historyList = res.stockHistory || [];
      renderHistoryList();
      renderSheetTabs();

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
      showToast('請輸入有效的股票代號或名稱！');
      return;
    }

    const cleanKeyword = keyword.trim();
    btnCrawl.disabled = true;
    crawlSpinner.style.display = 'inline-block';
    showToast(`⚡ 正在背景啟動 4合1 深度採集 [${cleanKeyword}]...`);

    chrome.runtime.sendMessage({
      action: 'CRAWL_STOCK',
      keyword: cleanKeyword
    }, (res) => {
      btnCrawl.disabled = false;
      crawlSpinner.style.display = 'none';

      if (res && res.success && res.data) {
        showToast(`✅ [${res.data.ticker}] 採集完成！`);
        // 重新讀取本地 storage 更新歷史清單
        chrome.storage.local.get(['stockHistory'], (storageRes) => {
          historyList = storageRes.stockHistory || [];
          renderHistoryList();
          renderSheetTabs();
          renderStock(res.data);
        });
      } else {
        showToast(`❌ 採集失敗：${res ? res.error : '未知錯誤'}`);
      }
    });
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
      md += `### ✍️ 個人投資觀點與研報筆記\n\n${note}\n`;
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

  // 送出至 Google Sheets (GAS Webhook)
  function sendToGas() {
    if (!currentStock) return;
    chrome.storage.local.get(['gasUrl'], (res) => {
      const gasUrl = res.gasUrl;
      if (!gasUrl) {
        showToast('⚠️ 尚未設定 Google Apps Script URL，請先點選右上角齒輪設定！');
        settingsModal.style.display = 'flex';
        return;
      }

      btnSendGas.disabled = true;
      btnSendGas.textContent = '傳送中...';

      const payload = {
        timestamp: new Date().toISOString(),
        mode: 'stock',
        ticker: currentStock.ticker,
        price: currentStock.price,
        mktcap: currentStock.stats ? currentStock.stats['市值'] || currentStock.stats['Market cap'] : '',
        pe: currentStock.stats ? currentStock.stats['本益比'] || currentStock.stats['P/E ratio'] : '',
        analyst_consensus: currentStock.analyst ? currentStock.analyst.consensus : '',
        target_price_median: currentStock.analyst ? currentStock.analyst.targetMedian : '',
        target_price_high: currentStock.analyst ? currentStock.analyst.targetHigh : '',
        target_price_low: currentStock.analyst ? currentStock.analyst.targetLow : '',
        note: noteInput.value.trim()
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
          showToast('🎉 成功同步至 Google Sheets 試算表！');
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

    // 設定彈窗控制
    btnOpenSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
    btnSaveSettings.addEventListener('click', () => {
      const gasUrl = settingGasUrl.value.trim();
      const sheetsUrl = settingSheetsUrl.value.trim();
      chrome.storage.local.set({ gasUrl, sheetsUrl }, () => {
        settingsModal.style.display = 'none';
        showToast('✅ 雲端同步設定已儲存！');
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
