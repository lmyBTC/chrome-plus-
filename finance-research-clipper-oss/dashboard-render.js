/**
 * dashboard-render.js - Finance Research Clipper 儀表板視圖渲染模組
 * 負責所有 DOM 渲染、表格構建、分頁標籤 (Sheet Tabs) 與吐司提示
 */

(function () {
  'use strict';

  window.DashboardRender = {
    /**
     * 顯示吐司通知 (支援自訂停留時間與點擊動作)
     */
    showToast: function (message, duration = 3000, onClick = null) {
      const toastContainer = document.getElementById('toast-container');
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'toast' + (typeof onClick === 'function' ? ' toast-clickable' : '');
      toast.textContent = message;

      let timer = null;
      const dismiss = () => {
        if (timer) clearTimeout(timer);
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      };

      if (typeof onClick === 'function') {
        toast.addEventListener('click', (e) => {
          e.stopPropagation();
          dismiss();
          onClick();
        });
      }

      toastContainer.appendChild(toast);
      timer = setTimeout(dismiss, duration);
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

      // 4.1 市場主題與相關專題 (Market Topics)
      if (elements.marketTopicsTableWrap) {
        const topicsData = stock.marketTopics ? (stock.marketTopics.tables && stock.marketTopics.tables.length > 0 ? stock.marketTopics.tables : stock.marketTopics.table) : null;
        window.DashboardRender.renderMarketTopicsTable(topicsData, elements.marketTopicsTableWrap);
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
     * 格式化指標數值並將 arrow_upward / arrow_downward 替換為內嵌向量 SVG 圖示
     */
    formatStatValue: function (rawVal) {
      if (rawVal === undefined || rawVal === null) return '--';
      const strVal = String(rawVal).trim();
      if (!strVal) return '--';

      const upSvg = '<svg class="stat-trend-icon up" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-label="上升"><path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd"/></svg>';
      const downSvg = '<svg class="stat-trend-icon down" viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-label="下降"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd"/></svg>';

      if (strVal === 'arrow_upward') {
        return `${upSvg} <span>上升</span>`;
      }
      if (strVal === 'arrow_downward') {
        return `${downSvg} <span>下降</span>`;
      }

      let formatted = window.DashboardRender.escapeHtml(strVal);
      if (formatted.includes('arrow_upward')) {
        formatted = formatted.replace(/arrow_upward/g, upSvg);
      }
      if (formatted.includes('arrow_downward')) {
        formatted = formatted.replace(/arrow_downward/g, downSvg);
      }
      return formatted;
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
        val.innerHTML = window.DashboardRender.formatStatValue(value);

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
        p.textContent = '此標的未提供損益表數據';
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
     * 渲染市場主題與相關專題表格 (Market Topics)
     */
    renderMarketTopicsTable: function (table, container) {
      if (!container) return;
      container.textContent = '';

      if (!table || !Array.isArray(table) || table.length === 0) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-muted)';
        p.style.fontSize = '0.88rem';
        p.textContent = '此標的未提供市場主題數據';
        container.appendChild(p);
        return;
      }

      const buildSingleTable = (rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return null;
        const tbl = document.createElement('table');
        tbl.className = 'data-table';
        tbl.style.marginBottom = '12px';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        (rows[0] || []).forEach((col) => {
          const th = document.createElement('th');
          th.textContent = col;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        tbl.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let r = 1; r < rows.length; r++) {
          const tr = document.createElement('tr');
          (rows[r] || []).forEach((cell) => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        }
        tbl.appendChild(tbody);
        return tbl;
      };

      if (Array.isArray(table[0]) && Array.isArray(table[0][0])) {
        let hasTable = false;
        table.forEach((tblRows) => {
          const tbl = buildSingleTable(tblRows);
          if (tbl) {
            container.appendChild(tbl);
            hasTable = true;
          }
        });
        if (!hasTable) {
          const p = document.createElement('p');
          p.style.color = 'var(--text-muted)';
          p.style.fontSize = '0.88rem';
          p.textContent = '此標的未提供市場主題數據';
          container.appendChild(p);
        }
      } else {
        const tbl = buildSingleTable(table);
        if (tbl) {
          container.appendChild(tbl);
        } else {
          const p = document.createElement('p');
          p.style.color = 'var(--text-muted)';
          p.style.fontSize = '0.88rem';
          p.textContent = '此標的未提供市場主題數據';
          container.appendChild(p);
        }
      }
    },

    /**
     * 渲染左側歷史追蹤清單 (支援依當前族群過濾、歸屬切換與同業多選勾選)
     */
    renderHistoryList: function (filteredList, currentStock, container, categories, onSelect, onCategoryChange, peerSelectedTickers = [], onTogglePeer) {
      if (!container) return;
      container.textContent = '';

      if (!filteredList || filteredList.length === 0) {
        const p = document.createElement('p');
        p.style.color = 'var(--text-muted)';
        p.style.fontSize = '0.82rem';
        p.style.padding = '24px 12px';
        p.style.textAlign = 'center';
        p.textContent = '此族群尚無歷史標的';
        container.appendChild(p);
        return;
      }

      // 可分配的分類列表（排除全部標的）
      const assignableCats = (categories || []).filter((c) => c.id !== 'all');
      const peerSet = new Set((peerSelectedTickers || []).map((t) => String(t).toUpperCase()));

      filteredList.forEach((item) => {
        const card = document.createElement('div');
        const isActive = currentStock && currentStock.ticker === item.ticker;
        const isPeerSelected = peerSet.has(String(item.ticker).toUpperCase());
        card.className = `history-item ${isActive ? 'active' : ''} ${isPeerSelected ? 'peer-selected' : ''}`;
        card.dataset.ticker = item.ticker;

        // 多選 Checkbox (用於同業對比快速勾選)
        const checkWrap = document.createElement('div');
        checkWrap.className = 'history-item-checkbox-wrap';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'history-item-checkbox';
        checkbox.checked = isPeerSelected;
        checkbox.title = isPeerSelected ? '從同業對比中移除' : '加入同業對比 (上限 5 檔)';
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onTogglePeer === 'function') {
            onTogglePeer(item.ticker);
          }
        });
        checkWrap.appendChild(checkbox);
        card.appendChild(checkWrap);

        const left = document.createElement('div');
        left.className = 'history-item-left';

        const tickerEl = document.createElement('div');
        tickerEl.className = 'history-ticker';
        tickerEl.textContent = item.ticker;

        const timeEl = document.createElement('div');
        timeEl.className = 'history-time';
        timeEl.textContent = item.updatedAt ? item.updatedAt.split(' ')[0] : '';
        left.appendChild(tickerEl);
        left.appendChild(timeEl);

        const right = document.createElement('div');
        right.className = 'history-item-right';

        const priceEl = document.createElement('div');
        priceEl.className = 'history-price';
        priceEl.textContent = item.price || '--';
        right.appendChild(priceEl);

        // 族群選擇下拉選單
        if (assignableCats.length > 0) {
          const select = document.createElement('select');
          select.className = 'history-category-select';
          select.title = '移至其他族群';

          assignableCats.forEach((cat) => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            const currentCatId = item.categoryId || 'core';
            if (currentCatId === cat.id) {
              opt.selected = true;
            }
            select.appendChild(opt);
          });

          select.addEventListener('click', (e) => e.stopPropagation());
          select.addEventListener('change', (e) => {
            e.stopPropagation();
            const newCatId = e.target.value;
            if (typeof onCategoryChange === 'function') {
              onCategoryChange(item.ticker, newCatId);
            }
          });
          right.appendChild(select);
        }

        card.appendChild(left);
        card.appendChild(right);

        card.addEventListener('click', () => {
          if (typeof onSelect === 'function') onSelect(item);
        });

        container.appendChild(card);
      });
    },

    /**
     * 渲染同業對比 Chips 標籤列
     */
    renderPeerSelectorChips: function (selectedTickers, chipsContainer, countBadgeEl, countBadgeNavEl, onRemoveTicker) {
      const count = Array.isArray(selectedTickers) ? selectedTickers.length : 0;
      if (countBadgeEl) countBadgeEl.textContent = String(count);
      if (countBadgeNavEl) countBadgeNavEl.textContent = `${count}/5`;

      if (!chipsContainer) return;
      chipsContainer.textContent = '';

      if (count === 0) {
        const hint = document.createElement('span');
        hint.style.fontSize = '0.8rem';
        hint.style.color = 'var(--text-muted)';
        hint.textContent = '尚未選取標的（可於左側歷史清單打勾，或使用右側下拉選單加入）';
        chipsContainer.appendChild(hint);
        return;
      }

      selectedTickers.forEach((ticker) => {
        const chip = document.createElement('span');
        chip.className = 'peer-chip';
        chip.textContent = ticker;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'peer-chip-remove';
        removeBtn.textContent = '✕';
        removeBtn.title = `移除 ${ticker}`;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onRemoveTicker === 'function') onRemoveTicker(ticker);
        });

        chip.appendChild(removeBtn);
        chipsContainer.appendChild(chip);
      });
    },

    /**
     * 渲染同業對比快速新增下拉選單
     */
    renderPeerQuickAddSelect: function (historyList, selectedTickers, selectEl, onAddTicker) {
      if (!selectEl) return;
      selectEl.textContent = '';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '➕ 從歷史庫新增標的...';
      selectEl.appendChild(defaultOpt);

      const selSet = new Set((selectedTickers || []).map((t) => String(t).toUpperCase()));
      (historyList || []).forEach((item) => {
        if (item && item.ticker && !selSet.has(String(item.ticker).toUpperCase())) {
          const opt = document.createElement('option');
          opt.value = item.ticker;
          opt.textContent = `${item.ticker} (${item.price || '--'})`;
          selectEl.appendChild(opt);
        }
      });

      selectEl.onchange = (e) => {
        const val = e.target.value;
        if (val && typeof onAddTicker === 'function') {
          onAddTicker(val);
          e.target.value = '';
        }
      };
    },

    /**
     * 渲染估值沙盒基準標的下拉選單
     */
    renderSandboxTickerSelect: function (historyList, currentTicker, selectEl, onSelectTicker) {
      if (!selectEl) return;
      selectEl.textContent = '';

      if (!historyList || historyList.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '歷史庫尚無標的';
        selectEl.appendChild(opt);
        return;
      }

      const activeSym = currentTicker ? String(currentTicker).toUpperCase() : '';

      historyList.forEach((item) => {
        if (!item || !item.ticker) return;
        const opt = document.createElement('option');
        opt.value = item.ticker;
        opt.textContent = `${item.ticker} ${item.price ? '(' + item.price + ')' : ''}`;
        if (activeSym && String(item.ticker).toUpperCase() === activeSym) {
          opt.selected = true;
        }
        selectEl.appendChild(opt);
      });

      selectEl.onchange = (e) => {
        const val = e.target.value;
        if (val && typeof onSelectTicker === 'function') {
          onSelectTicker(val);
        }
      };
    },

    /**
     * 同步高亮選中的標的與族群分頁
     */
    highlightActiveHistoryItem: function (ticker, historyContainer, activeCategoryId, sheetContainer) {
      if (historyContainer && ticker) {
        const items = historyContainer.querySelectorAll('.history-item');
        items.forEach((it) => {
          if (it.dataset.ticker === ticker) {
            it.classList.add('active');
          } else {
            it.classList.remove('active');
          }
        });
      }

      if (sheetContainer && activeCategoryId) {
        const tabs = sheetContainer.querySelectorAll('.sheet-tab');
        tabs.forEach((tab) => {
          if (tab.dataset.categoryId === activeCategoryId) {
            tab.classList.add('active');
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          } else {
            tab.classList.remove('active');
          }
        });
      }
    }
  };
})();
