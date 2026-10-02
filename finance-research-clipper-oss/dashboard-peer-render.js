/**
 * dashboard-peer-render.js - Finance Research Clipper 同業矩陣視圖渲染模組
 * 負責同業橫向對比矩陣 (Peer Matrix) 之 DOM 建構、標的摘要卡片、關鍵財務與估值指標表格、視覺化長條圖
 */

(function () {
  'use strict';

  const PeerRender = {
    /**
     * 渲染同業橫向對比矩陣 (Peer Comparison Matrix)
     * @param {Object} peerData 經 DashboardActions.aggregatePeerMetrics 聚合之矩陣數據
     * @param {HTMLElement} container 渲染容器 (#peer-matrix-content)
     * @param {Object} callbacks { onSelectStock: (ticker) => void }
     */
    renderPeerMatrix: function (peerData, container, callbacks) {
      if (!container) return;
      container.textContent = '';

      if (!peerData || !peerData.items || peerData.items.length === 0) {
        return;
      }

      const { onSelectStock } = callbacks || {};
      const { items, extremes } = peerData;

      // ----------------------------------------------------
      // 1. 頂部標的摘要卡片網格 (Summary Cards)
      // ----------------------------------------------------
      const summaryGrid = document.createElement('div');
      summaryGrid.className = 'peer-summary-grid';

      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'peer-summary-card';
        card.title = `點擊查看 [${item.ticker}] 個股深度研報`;

        // 頂部代號與價格
        const header = document.createElement('div');
        header.className = 'peer-summary-header';

        const leftDiv = document.createElement('div');
        const tickerEl = document.createElement('div');
        tickerEl.className = 'peer-summary-ticker';
        tickerEl.textContent = item.ticker;

        const nameEl = document.createElement('div');
        nameEl.className = 'peer-summary-name';
        nameEl.textContent = item.name;
        leftDiv.appendChild(tickerEl);
        leftDiv.appendChild(nameEl);

        const rightDiv = document.createElement('div');
        const priceEl = document.createElement('div');
        priceEl.className = 'peer-summary-price';
        priceEl.textContent = item.priceDisplay;

        const subPriceEl = document.createElement('div');
        subPriceEl.className = 'peer-summary-subprice';
        if (typeof item.upsideVal === 'number') {
          subPriceEl.textContent = `空間 ${item.upsideVal > 0 ? '+' : ''}${item.upsideVal}%`;
          subPriceEl.style.color = item.upsideVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
        } else {
          subPriceEl.textContent = '目標價未評級';
        }
        rightDiv.appendChild(priceEl);
        rightDiv.appendChild(subPriceEl);

        header.appendChild(leftDiv);
        header.appendChild(rightDiv);
        card.appendChild(header);

        // 市值與 P/E 標記
        const rowMkt = document.createElement('div');
        rowMkt.className = 'peer-summary-meta-row';
        const lblMkt = document.createElement('span');
        lblMkt.className = 'peer-summary-meta-label';
        lblMkt.textContent = '市值規模';
        const valMkt = document.createElement('span');
        valMkt.className = 'peer-summary-meta-val';
        valMkt.textContent = item.marketCapDisplay;
        rowMkt.appendChild(lblMkt);
        rowMkt.appendChild(valMkt);
        card.appendChild(rowMkt);

        // 52週位階進度
        const row52 = document.createElement('div');
        row52.className = 'peer-summary-meta-row';
        const lbl52 = document.createElement('span');
        lbl52.className = 'peer-summary-meta-label';
        lbl52.textContent = '52週位階';
        const val52 = document.createElement('span');
        val52.className = 'peer-summary-meta-val';
        val52.textContent = typeof item.position52w === 'number' ? `${item.position52w}%` : '--';
        row52.appendChild(lbl52);
        row52.appendChild(val52);
        card.appendChild(row52);

        // 點擊卡片跳轉個股研報
        card.addEventListener('click', () => {
          if (typeof onSelectStock === 'function') {
            onSelectStock(item.ticker);
          }
        });

        summaryGrid.appendChild(card);
      });
      container.appendChild(summaryGrid);

      // ----------------------------------------------------
      // 2. 核心橫向對比矩陣表格 (Comparison Table)
      // ----------------------------------------------------
      const tableCard = document.createElement('div');
      tableCard.className = 'peer-matrix-table-card';

      const tableHeader = document.createElement('div');
      tableHeader.className = 'peer-matrix-table-header';
      const tableTitle = document.createElement('div');
      tableTitle.className = 'peer-matrix-table-title';
      tableTitle.textContent = '📊 多維度關鍵財務與估值指標對比表';
      const tableSub = document.createElement('div');
      tableSub.className = 'peer-matrix-table-subtitle';
      tableSub.textContent = '橫向極值已自動高亮標註';
      tableHeader.appendChild(tableTitle);
      tableHeader.appendChild(tableSub);
      tableCard.appendChild(tableHeader);

      const tableWrap = document.createElement('div');
      tableWrap.className = 'peer-matrix-table-wrap';

      const table = document.createElement('table');
      table.className = 'peer-matrix-table';

      // 建立表頭 Thead
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      const thMetric = document.createElement('th');
      thMetric.className = 'peer-matrix-th-metric';
      thMetric.textContent = '指標項目 (Metric)';
      headerRow.appendChild(thMetric);

      items.forEach((item) => {
        const th = document.createElement('th');
        th.className = 'peer-matrix-th-ticker';
        const badge = document.createElement('span');
        badge.className = 'peer-matrix-th-ticker-badge';
        badge.textContent = item.ticker;
        th.appendChild(badge);
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // 建立表身 Tbody（以指標為橫列，各標的為直欄）
      const tbody = document.createElement('tbody');

      // 定義所有比對維度列
      const metricRows = [
        {
          name: '公司名稱',
          getValue: (item) => item.name,
          renderCell: (td, item) => {
            td.textContent = item.name;
          }
        },
        {
          name: '即時價格',
          getValue: (item) => item.price,
          renderCell: (td, item) => {
            td.textContent = item.priceDisplay;
            td.style.fontWeight = '700';
          }
        },
        {
          name: '市值規模 (Market Cap)',
          getValue: (item) => item.marketCapVal,
          renderCell: (td, item) => {
            td.textContent = item.marketCapDisplay;
            if (extremes.marketCapVal.max && item.marketCapVal === extremes.marketCapVal.max && items.length > 1) {
              const tag = document.createElement('span');
              tag.className = 'peer-extreme-tag top-leader';
              tag.textContent = '👑 龍頭';
              td.appendChild(tag);
            }
          }
        },
        {
          name: '本益比 (P/E Ratio)',
          getValue: (item) => item.peVal,
          renderCell: (td, item) => {
            td.textContent = item.peVal ? `${item.peVal}x` : 'N/A';
            if (extremes.peVal.min && item.peVal === extremes.peVal.min && items.length > 1) {
              const tag = document.createElement('span');
              tag.className = 'peer-extreme-tag best';
              tag.textContent = '💎 最具性價比';
              td.appendChild(tag);
            } else if (extremes.peVal.max && item.peVal === extremes.peVal.max && items.length > 1) {
              const tag = document.createElement('span');
              tag.className = 'peer-extreme-tag high';
              tag.textContent = '倍數最高';
              td.appendChild(tag);
            }
          }
        },
        {
          name: '市銷率 (P/S Ratio)',
          getValue: (item) => item.psVal,
          renderCell: (td, item) => {
            td.textContent = item.psVal ? `${item.psVal}x` : 'N/A';
            if (extremes.psVal.min && item.psVal === extremes.psVal.min && items.length > 1) {
              const tag = document.createElement('span');
              tag.className = 'peer-extreme-tag best';
              tag.textContent = '最低';
              td.appendChild(tag);
            }
          }
        },
        {
          name: '每股盈餘 (EPS)',
          getValue: (item) => item.epsVal,
          renderCell: (td, item) => {
            td.textContent = item.epsVal !== null ? `$${item.epsVal.toFixed(2)}` : 'N/A';
            if (extremes.epsVal.max && item.epsVal === extremes.epsVal.max && items.length > 1) {
              const tag = document.createElement('span');
              tag.className = 'peer-extreme-tag best';
              tag.textContent = '獲利最強';
              td.appendChild(tag);
            }
          }
        },
        {
          name: '分析師中位目標價',
          getValue: (item) => item.targetMedian,
          renderCell: (td, item) => {
            td.textContent = item.targetMedian ? `$${item.targetMedian.toFixed(2)}` : 'N/A';
          }
        },
        {
          name: '隱含潛在上漲空間',
          getValue: (item) => item.upsideVal,
          renderCell: (td, item) => {
            if (typeof item.upsideVal === 'number') {
              td.textContent = `${item.upsideVal > 0 ? '+' : ''}${item.upsideVal}%`;
              td.style.color = item.upsideVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
              if (extremes.upsideVal.max && item.upsideVal === extremes.upsideVal.max && item.upsideVal > 0 && items.length > 1) {
                const tag = document.createElement('span');
                tag.className = 'peer-extreme-tag best';
                tag.textContent = '🚀 空間最大';
                td.appendChild(tag);
              }
            } else {
              td.textContent = 'N/A';
            }
          }
        },
        {
          name: '52週最高 / 最低區間',
          getValue: (item) => item.low52,
          renderCell: (td, item) => {
            if (item.low52 && item.high52) {
              td.textContent = `$${item.low52.toFixed(2)} ~ $${item.high52.toFixed(2)}`;
            } else {
              td.textContent = 'N/A';
            }
          }
        },
        {
          name: '52週價格位階',
          getValue: (item) => item.position52w,
          renderCell: (td, item) => {
            if (typeof item.position52w === 'number') {
              const wrap = document.createElement('div');
              wrap.className = 'peer-pos-progress-wrap';

              const track = document.createElement('div');
              track.className = 'peer-pos-progress-track';

              const fill = document.createElement('div');
              fill.className = 'peer-pos-progress-fill';
              fill.style.width = `${item.position52w}%`;

              const txt = document.createElement('span');
              txt.className = 'peer-pos-progress-text';
              const level = item.position52w >= 80 ? '接近高點' : item.position52w <= 25 ? '接近低點' : '區間震盪';
              txt.textContent = `${item.position52w}% (${level})`;

              track.appendChild(fill);
              wrap.appendChild(track);
              wrap.appendChild(txt);
              td.appendChild(wrap);
            } else {
              td.textContent = 'N/A';
            }
          }
        },
        {
          name: '數據採集時間',
          getValue: (item) => item.updatedAt,
          renderCell: (td, item) => {
            td.textContent = item.updatedAt || '未知';
            td.style.fontSize = '0.75rem';
            td.style.color = 'var(--text-muted)';
          }
        }
      ];

      metricRows.forEach((rowSpec) => {
        const tr = document.createElement('tr');
        const tdMetric = document.createElement('td');
        tdMetric.className = 'peer-matrix-td-metric';
        tdMetric.textContent = rowSpec.name;
        tr.appendChild(tdMetric);

        items.forEach((item) => {
          const tdVal = document.createElement('td');
          tdVal.className = 'peer-matrix-td-val';
          rowSpec.renderCell(tdVal, item);
          tr.appendChild(tdVal);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
      tableCard.appendChild(tableWrap);
      container.appendChild(tableCard);

      // ----------------------------------------------------
      // 3. 視覺化長條圖比對面板 (Bar Charts Grid)
      // ----------------------------------------------------
      const visualGrid = document.createElement('div');
      visualGrid.className = 'peer-visual-comparison-grid';

      // 輔助函數：建立圖表卡片
      function createBarCard(title, subtitle, itemsList, valExtractor, labelFormatter, fillClass) {
        const card = document.createElement('div');
        card.className = 'peer-visual-card';

        const head = document.createElement('div');
        head.className = 'peer-visual-card-title';
        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        const subSpan = document.createElement('span');
        subSpan.className = 'peer-visual-card-subtitle';
        subSpan.textContent = subtitle;
        head.appendChild(titleSpan);
        head.appendChild(subSpan);
        card.appendChild(head);

        const list = document.createElement('div');
        list.className = 'peer-bar-list';

        // 找出有效數值中的最大值作為 100% 基準
        const validValues = itemsList
          .map((i) => valExtractor(i))
          .filter((v) => typeof v === 'number' && !isNaN(v) && v > 0);
        const maxVal = validValues.length > 0 ? Math.max(...validValues) : 1;

        itemsList.forEach((item) => {
          const rawVal = valExtractor(item);
          const barItem = document.createElement('div');
          barItem.className = 'peer-bar-item';

          const meta = document.createElement('div');
          meta.className = 'peer-bar-meta';

          const tickerSpan = document.createElement('span');
          tickerSpan.className = 'peer-bar-ticker';
          tickerSpan.textContent = item.ticker;

          const valSpan = document.createElement('span');
          valSpan.className = 'peer-bar-val';
          valSpan.textContent = labelFormatter(rawVal, item);

          meta.appendChild(tickerSpan);
          meta.appendChild(valSpan);
          barItem.appendChild(meta);

          const track = document.createElement('div');
          track.className = 'peer-bar-track';

          const fill = document.createElement('div');
          fill.className = `peer-bar-fill ${fillClass}`;
          let pct = 0;
          if (typeof rawVal === 'number' && rawVal > 0) {
            pct = Math.min(100, Math.max(6, (rawVal / maxVal) * 100));
          }
          fill.style.width = `${pct}%`;

          track.appendChild(fill);
          barItem.appendChild(track);
          list.appendChild(barItem);
        });

        card.appendChild(list);
        return card;
      }

      // 卡片 1: 市值規模對比 (Market Cap)
      const mktCard = createBarCard(
        '🏢 市值規模對比 (Market Cap)',
        '單位：美元 (依比例)',
        items,
        (i) => i.marketCapVal,
        (val, i) => i.marketCapDisplay,
        'fill-blue'
      );
      visualGrid.appendChild(mktCard);

      // 卡片 2: 估值倍數 P/E 對比
      const peCard = createBarCard(
        '💎 本益比倍數 (P/E Ratio)',
        '倍數越低相對越便宜',
        items,
        (i) => i.peVal,
        (val) => (val ? `${val}x` : 'N/A'),
        'fill-purple'
      );
      visualGrid.appendChild(peCard);

      // 卡片 3: 分析師潛在上漲空間對比
      const upsideCard = (function () {
        const card = document.createElement('div');
        card.className = 'peer-visual-card';

        const head = document.createElement('div');
        head.className = 'peer-visual-card-title';
        const titleSpan = document.createElement('span');
        titleSpan.textContent = '🎯 分析師潛在空間 (Upside %)';
        const subSpan = document.createElement('span');
        subSpan.className = 'peer-visual-card-subtitle';
        subSpan.textContent = '中位數目標價試算';
        head.appendChild(titleSpan);
        head.appendChild(subSpan);
        card.appendChild(head);

        const list = document.createElement('div');
        list.className = 'peer-bar-list';

        const validUpsides = items
          .map((i) => (typeof i.upsideVal === 'number' ? Math.abs(i.upsideVal) : 0))
          .filter((v) => v > 0);
        const maxUpside = validUpsides.length > 0 ? Math.max(...validUpsides) : 10;

        items.forEach((item) => {
          const barItem = document.createElement('div');
          barItem.className = 'peer-bar-item';

          const meta = document.createElement('div');
          meta.className = 'peer-bar-meta';

          const tickerSpan = document.createElement('span');
          tickerSpan.className = 'peer-bar-ticker';
          tickerSpan.textContent = item.ticker;

          const valSpan = document.createElement('span');
          valSpan.className = 'peer-bar-val';
          if (typeof item.upsideVal === 'number') {
            valSpan.textContent = `${item.upsideVal > 0 ? '+' : ''}${item.upsideVal}%`;
            valSpan.style.color = item.upsideVal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
          } else {
            valSpan.textContent = 'N/A';
          }

          meta.appendChild(tickerSpan);
          meta.appendChild(valSpan);
          barItem.appendChild(meta);

          const track = document.createElement('div');
          track.className = 'peer-bar-track';

          const fill = document.createElement('div');
          const isPositive = typeof item.upsideVal === 'number' && item.upsideVal >= 0;
          fill.className = `peer-bar-fill ${isPositive ? 'fill-green' : 'fill-red'}`;
          let pct = 0;
          if (typeof item.upsideVal === 'number') {
            pct = Math.min(100, Math.max(6, (Math.abs(item.upsideVal) / maxUpside) * 100));
          }
          fill.style.width = `${pct}%`;

          track.appendChild(fill);
          barItem.appendChild(track);
          list.appendChild(barItem);
        });

        card.appendChild(list);
        return card;
      })();
      visualGrid.appendChild(upsideCard);

      container.appendChild(visualGrid);
    }
  };

  // 掛載至全域 DashboardRender 物件
  if (!window.DashboardRender) {
    window.DashboardRender = {};
  }
  Object.assign(window.DashboardRender, PeerRender);
})();
