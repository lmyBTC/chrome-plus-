/**
 * dashboard-render.js - Finance Research Clipper 儀表板視圖渲染模組
 * 負責所有 DOM 渲染、表格構建、分頁標籤 (Sheet Tabs) 與吐司提示
 */

(function () {
  'use strict';

  window.DashboardRender = {
    /**
     * 顯示吐司通知
     */
    showToast: function (message, duration = 3000) {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    },

    /**
     * 安全轉義字串 (防範 XSS)
     */
    escapeHtml: function (str) {
      if (!str && str !== 0) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    },

    /**
     * 顯示空狀態頁面
     */
    showEmptyState: function (emptyStateEl, contentSectionEl) {
      if (emptyStateEl) emptyStateEl.style.display = 'block';
      if (contentSectionEl) contentSectionEl.style.display = 'none';
    },

    /**
     * 渲染個股完整儀表板
     */
    renderStock: function (stock, elements, callbacks) {
      if (!stock) {
        window.DashboardRender.showEmptyState(elements.emptyState, elements.stockContentSection);
        return;
      }

      if (elements.emptyState) elements.emptyState.style.display = 'none';
      if (elements.stockContentSection) elements.stockContentSection.style.display = 'flex';

      // 1. Hero Section
      if (elements.heroTicker) elements.heroTicker.textContent = stock.ticker || 'UNKNOWN';
      if (elements.heroPrice) elements.heroPrice.textContent = stock.price || 'N/A';
      if (elements.heroUpdated) {
        elements.heroUpdated.textContent = `採集時間：${stock.updatedAt || new Date().toLocaleString()}`;
      }

      // 大盤指數
      if (elements.heroMarketIndices) {
        const sp500 = stock.stats && stock.stats['S&P 500'] ? `S&P 500: ${stock.stats['S&P 500']}` : '';
        const nasdaq = stock.stats && stock.stats['Nasdaq'] ? `Nasdaq: ${stock.stats['Nasdaq']}` : '';
        elements.heroMarketIndices.textContent = [sp500, nasdaq].filter(Boolean).join(' | ');
      }

      // 關鍵指標網格
      if (elements.heroStatsGrid) {
        window.DashboardRender.renderStatsGrid(stock.stats || {}, elements.heroStatsGrid);
      }

      // 2. 分析師評級與目標價
      const analyst = stock.analyst || {};
      if (elements.analystBadge) {
        elements.analystBadge.textContent = analyst.consensus || 'N/A';
        if (analyst.consensus && analyst.consensus.toLowerCase().includes('buy')) {
          elements.analystBadge.className = 'rating-badge rating-buy';
        } else {
          elements.analystBadge.className = 'rating-badge rating-hold';
        }
      }

      if (elements.targetLow) elements.targetLow.textContent = analyst.targetLow || '--';
      if (elements.targetMedian) elements.targetMedian.textContent = analyst.targetMedian || '--';
      if (elements.targetHigh) elements.targetHigh.textContent = analyst.targetHigh || '--';

      // 計算潛在上漲空間
      if (elements.targetUpsideText) {
        if (analyst.targetMedian && stock.price) {
          const curPrice = parseFloat(stock.price.replace(/[^0-9.]/g, ''));
          const medPrice = parseFloat(analyst.targetMedian.replace(/[^0-9.]/g, ''));
          if (!isNaN(curPrice) && !isNaN(medPrice) && curPrice > 0) {
            const upside = (((medPrice - curPrice) / curPrice) * 100).toFixed(1);
            const sign = upside >= 0 ? '+' : '';
            elements.targetUpsideText.textContent = `目標價中位數隱含潛在漲跌幅空間：${sign}${upside}%`;
          } else {
            elements.targetUpsideText.textContent = '';
          }
        } else {
          elements.targetUpsideText.textContent = '';
        }
      }

      // 3. 財報表現 (Earnings)
      const earnings = stock.earnings || {};
      if (elements.earningsEps) {
        elements.earningsEps.textContent = `${earnings.epsActual || '--'} / ${earnings.epsEstimate || '--'}`;
      }
      if (elements.earningsRevenue) {
        elements.earningsRevenue.textContent = `${earnings.revenueActual || '--'} / ${earnings.revenueEstimate || '--'}`;
      }
      if (elements.earningsSummary) {
        elements.earningsSummary.textContent = earnings.table && earnings.table.length > 0 
          ? `歷史已爬取 ${earnings.table.length} 季表現` 
          : '最新季度數據';
      }

      // 4. 損益表矩陣 (Financials)
      if (elements.financialsTableWrap) {
        window.DashboardRender.renderFinancialsTable(stock.financials ? stock.financials.table : null, elements.financialsTableWrap);
      }

      // 5. 更新清單活躍標記
      if (elements.historyListContainer && elements.sheetTabContainer) {
        window.DashboardRender.highlightActiveHistoryItem(stock.ticker, elements.historyListContainer, elements.sheetTabContainer);
      }

      // 6. 回調載入 AI 研報
      if (callbacks && typeof callbacks.onStockRendered === 'function') {
        callbacks.onStockRendered(stock);
      }
    },

    /**
     * 渲染 Key Stats 網格
     */
    renderStatsGrid: function (stats, container) {
      if (!container) return;
      container.textContent = '';

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
        container.appendChild(box);
        count++;
      }

      if (count === 0) {
        const fallbackBox = document.createElement('div');
        fallbackBox.className = 'stat-box';
        fallbackBox.textContent = '暫無詳細統計指標';
        container.appendChild(fallbackBox);
      }
    },

    /**
     * 渲染損益表矩陣
     */
    renderFinancialsTable: function (table, container) {
      if (!container) return;
      container.textContent = '';

      if (!table || !Array.isArray(table) || table.length === 0) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-muted)';
        p.style.fontSize = '0.88rem';
        p.textContent = '未擷取到損益表矩陣數據';
        container.appendChild(p);
        return;
      }

      const tbl = document.createElement('table');
      tbl.className = 'data-table';

      // 表頭
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      (table[0] || []).forEach((col) => {
        const th = document.createElement('th');
        th.textContent = col;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      tbl.appendChild(thead);

      // 內容列
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

      container.appendChild(tbl);
    },

    /**
     * 渲染左側歷史追蹤清單
     */
    renderHistoryList: function (historyList, currentStock, container, onSelect) {
      if (!container) return;
      container.textContent = '';

      if (!historyList || historyList.length === 0) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-muted)';
        p.style.fontSize = '0.82rem';
        p.style.padding = '12px';
        p.textContent = '尚未有歷史採集紀錄';
        container.appendChild(p);
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
          if (typeof onSelect === 'function') onSelect(item);
        });

        container.appendChild(card);
      });
    },

    /**
     * 同步高亮選中的標的
     */
    highlightActiveHistoryItem: function (ticker, historyContainer, sheetContainer) {
      if (historyContainer) {
        const items = historyContainer.querySelectorAll('.history-item');
        items.forEach((it) => {
          if (it.dataset.ticker === ticker) {
            it.classList.add('active');
          } else {
            it.classList.remove('active');
          }
        });
      }

      if (sheetContainer) {
        const tabs = sheetContainer.querySelectorAll('.sheet-tab');
        tabs.forEach((tab) => {
          if (tab.dataset.ticker === ticker) {
            tab.classList.add('active');
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          } else {
            tab.classList.remove('active');
          }
        });
      }
    },

    /**
     * 渲染底部分頁列 (Google Sheets 風格)
     */
    renderSheetTabs: function (historyList, currentStock, container, countEl, onSelect, onClose) {
      if (!container) return;
      container.textContent = '';

      if (!historyList || historyList.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.style.color = 'var(--text-muted)';
        emptySpan.style.fontSize = '0.75rem';
        emptySpan.style.padding = '6px 12px';
        emptySpan.textContent = '尚未暫存任何股票分頁';
        container.appendChild(emptySpan);
        if (countEl) countEl.textContent = '0 檔標的分頁';
        return;
      }

      if (countEl) countEl.textContent = `${historyList.length} 檔標的分頁`;

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
          if (typeof onClose === 'function') onClose(item.ticker);
        });

        tab.appendChild(icon);
        tab.appendChild(tickerSpan);
        tab.appendChild(priceSpan);
        tab.appendChild(closeBtn);

        tab.addEventListener('click', () => {
          if (typeof onSelect === 'function') onSelect(item);
        });

        container.appendChild(tab);
      });
    }
  };
})();
