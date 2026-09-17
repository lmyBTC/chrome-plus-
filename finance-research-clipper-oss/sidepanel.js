/**
 * sidepanel.js - Finance Research Clipper 側邊欄控制腳本
 * 提供快速輸入、背景爬取、左下角工具箱快捷跳轉至獨立儀表板。
 */

(function () {
  'use strict';

  // DOM 元素
  const searchInput = document.getElementById('side-search-input');
  const btnCrawl = document.getElementById('btn-side-crawl');
  const statusBox = document.getElementById('side-status-box');
  const statusText = document.getElementById('side-status-text');
  const statusIcon = document.getElementById('side-status-icon');

  // 摘要卡片元素
  const summaryTicker = document.getElementById('side-summary-ticker');
  const summaryPrice = document.getElementById('side-summary-price');
  const summaryTime = document.getElementById('side-summary-time');
  const statConsensus = document.getElementById('side-stat-consensus');
  const statTarget = document.getElementById('side-stat-target');
  const statMktcap = document.getElementById('side-stat-mktcap');
  const statPe = document.getElementById('side-stat-pe');
  const btnCopySummary = document.getElementById('btn-side-copy-summary');
  const btnCreateTask = document.getElementById('btn-side-create-task');
  const recentList = document.getElementById('side-recent-list');

  // 左下角工具箱組合元素
  const btnOpenDashboard = document.getElementById('btn-side-open-dashboard');
  const btnPasteCrawl = document.getElementById('btn-side-paste-crawl');
  const btnCrawlActive = document.getElementById('btn-side-crawl-active');
  const btnSettings = document.getElementById('btn-side-settings');

  let currentStock = null;

  function init() {
    // 讀取最新狀態與歷史
    loadLatestData();
    bindEvents();
  }

  function loadLatestData() {
    chrome.storage.local.get(['latestStockData', 'stockHistory'], (res) => {
      if (res.latestStockData) {
        renderSummary(res.latestStockData);
      }
      renderRecentHistory(res.stockHistory || []);
    });
  }

  function showStatus(text, icon = '⏳', isError = false) {
    statusBox.style.display = 'flex';
    statusText.textContent = text;
    statusIcon.textContent = icon;
    if (isError) {
      statusBox.style.color = '#ef4444';
      statusBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      statusBox.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    } else {
      statusBox.style.color = '#3b82f6';
      statusBox.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      statusBox.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
  }

  function hideStatus() {
    statusBox.style.display = 'none';
  }

  function renderSummary(stock) {
    if (!stock) return;
    currentStock = stock;

    summaryTicker.textContent = stock.ticker || 'UNKNOWN';
    summaryPrice.textContent = stock.price || 'N/A';
    summaryTime.textContent = `採集時間：${stock.updatedAt || new Date().toLocaleTimeString()}`;

    const an = stock.analyst || {};
    statConsensus.textContent = an.consensus || 'N/A';
    statTarget.textContent = an.targetMedian || 'N/A';

    const st = stock.stats || {};
    statMktcap.textContent = st['市值'] || st['Market cap'] || 'N/A';
    statPe.textContent = st['本益比'] || st['P/E ratio'] || 'N/A';
  }

  function renderRecentHistory(list) {
    recentList.textContent = '';
    const slice = list.slice(0, 5);

    if (slice.length === 0) {
      const p = document.createElement('div');
      p.style.color = 'var(--text-muted)';
      p.style.fontSize = '0.72rem';
      p.textContent = '暫無紀錄';
      recentList.appendChild(p);
      return;
    }

    slice.forEach((item) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.padding = '6px 8px';
      row.style.backgroundColor = 'var(--bg-card)';
      row.style.borderRadius = 'var(--radius-sm)';
      row.style.border = '1px solid var(--border-color)';
      row.style.cursor = 'pointer';
      row.style.fontSize = '0.75rem';

      const left = document.createElement('span');
      left.style.fontWeight = '700';
      left.textContent = item.ticker;

      const right = document.createElement('span');
      right.style.color = 'var(--accent-green)';
      right.textContent = item.price;

      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener('click', () => {
        renderSummary(item);
      });

      recentList.appendChild(row);
    });
  }

  function triggerCrawl(keyword) {
    if (!keyword || !keyword.trim()) return;
    const cleanQuery = keyword.trim();

    btnCrawl.disabled = true;
    showStatus(`⚡ 背景爬取中 [${cleanQuery}]...`);

    chrome.runtime.sendMessage({
      action: 'CRAWL_STOCK',
      keyword: cleanQuery
    }, (res) => {
      btnCrawl.disabled = false;
      if (res && res.success && res.data) {
        showStatus(`✅ [${res.data.ticker}] 採集成功！`, '✅');
        renderSummary(res.data);
        chrome.storage.local.get(['stockHistory'], (sRes) => {
          renderRecentHistory(sRes.stockHistory || []);
        });
        setTimeout(hideStatus, 3500);
      } else {
        showStatus(`❌ 失敗：${res ? res.error : '未知錯誤'}`, '❌', true);
        setTimeout(hideStatus, 4000);
      }
    });
  }

  function bindEvents() {
    // 爬取按鈕與輸入框
    btnCrawl.addEventListener('click', () => triggerCrawl(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerCrawl(searchInput.value);
    });

    // 快捷標籤
    document.querySelectorAll('.quick-tag').forEach((tag) => {
      tag.addEventListener('click', () => {
        const symbol = tag.dataset.symbol;
        searchInput.value = symbol;
        triggerCrawl(symbol);
      });
    });

    // 複製摘要 Markdown
    btnCopySummary.addEventListener('click', () => {
      if (!currentStock) return;
      const s = currentStock;
      const an = s.analyst || {};
      const md = `**${s.ticker}** (${s.price})\n* 共識評級: ${an.consensus || 'N/A'}\n* 目標價中位數: ${an.targetMedian || 'N/A'}\n* 市值: ${s.stats ? (s.stats['市值'] || s.stats['Market cap'] || 'N/A') : 'N/A'}\n* 本益比: ${s.stats ? (s.stats['本益比'] || s.stats['P/E ratio'] || 'N/A') : 'N/A'}`;
      navigator.clipboard.writeText(md).then(() => {
        showStatus('📋 摘要已複製至剪貼簿', '✅');
        setTimeout(hideStatus, 2000);
      });
    });

    // 🎯 一鍵轉為 ScrumClock 研究任務 (Phase 3.1)
    if (btnCreateTask) {
      btnCreateTask.addEventListener('click', async () => {
        if (!currentStock) {
          showStatus('⚠️ 請先爬取或選擇標的', '⚠️', true);
          setTimeout(hideStatus, 2000);
          return;
        }

        if (!window.FinanceAIClient || !window.FinanceAIClient.createScrumTask) {
          showStatus('⚠️ 客戶端尚未載入', '⚠️', true);
          setTimeout(hideStatus, 2000);
          return;
        }

        const s = currentStock;
        const an = s.analyst || {};
        let md = `### 📌 標的概況：${s.ticker} (${s.price})\n\n`;
        md += `* **採集時間**：${s.updatedAt || new Date().toLocaleString()}\n`;
        md += `* **即時價格**：${s.price}\n\n`;
        md += `### 🎯 分析師評級與目標價\n`;
        md += `- 共識：${an.consensus || 'N/A'}\n`;
        md += `- 目標價中位數：${an.targetMedian || 'N/A'}\n\n`;
        if (s.stats) {
          md += `* 市值: ${s.stats['市值'] || s.stats['Market cap'] || 'N/A'}\n`;
          md += `* 本益比: ${s.stats['本益比'] || s.stats['P/E ratio'] || 'N/A'}\n\n`;
        }

        btnCreateTask.disabled = true;
        showStatus(`🎯 正在轉入任務...`);

        try {
          const res = await window.FinanceAIClient.createScrumTask({
            ticker: s.ticker,
            title: `研讀 $${s.ticker} 財報與投資估值`,
            notes: md,
            tags: ['#投資研究', `$${s.ticker}`],
            estimatedPomodoros: 2
          });

          btnCreateTask.disabled = false;
          if (res && res.success) {
            if (res.duplicate) {
              showStatus(`ℹ️ $${s.ticker} 今日已在戰役中！`, '✅');
            } else {
              showStatus(`✅ 已成功加入今日戰役！`, '🎯');
            }
          } else {
            showStatus(`⚠️ 建立失敗：${res ? res.error : '未知錯誤'}`, '⚠️', true);
          }
          setTimeout(hideStatus, 3000);
        } catch (err) {
          btnCreateTask.disabled = false;
          showStatus(`❌ 錯誤：${err.message}`, '❌', true);
          setTimeout(hideStatus, 3000);
        }
      });
    }

    // 左下角按鈕 1：開啟獨立分頁儀表板
    btnOpenDashboard.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
    });

    // 左下角按鈕 2：剪貼簿貼入並爬取
    btnPasteCrawl.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          searchInput.value = text.trim();
          triggerCrawl(text.trim());
        } else {
          showStatus('剪貼簿無文字內容', '⚠️', true);
          setTimeout(hideStatus, 2000);
        }
      } catch (err) {
        showStatus('無法存取剪貼簿', '⚠️', true);
        setTimeout(hideStatus, 2000);
      }
    });

    // 左下角按鈕 3：抓取當前瀏覽分頁
    btnCrawlActive.addEventListener('click', async () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].url) {
          showStatus('無法讀取目前分頁', '⚠️', true);
          setTimeout(hideStatus, 2000);
          return;
        }

        const tab = tabs[0];
        const match = tab.url.match(/google\.com\/finance\/quote\/([A-Z0-9_.:-]+)/i);
        if (match && match[1]) {
          const symbol = match[1].split(':')[0];
          searchInput.value = symbol;
          triggerCrawl(symbol);
        } else if (tab.url.includes('google.com/finance')) {
          showStatus('正在偵測當前 Google Finance 標的...', '🔍');
          triggerCrawl('finance');
        } else {
          showStatus('當前分頁不是 Google Finance', '⚠️', true);
          setTimeout(hideStatus, 2500);
        }
      });
    });

    // 左下角按鈕 4：設定
    btnSettings.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
    });

    // 監聽背景廣播的更新通知
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'STOCK_CRAWL_SUCCESS' && msg.data) {
        renderSummary(msg.data);
        chrome.storage.local.get(['stockHistory'], (sRes) => {
          renderRecentHistory(sRes.stockHistory || []);
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
