/**
 * dashboard-peer-actions.js - Finance Research Clipper 同業矩陣動作模組
 * 負責同業標的多選狀態管理、跨標的指標聚合、Markdown 表格複製與 Google Sheets (GAS) 同步
 */

(function () {
  'use strict';

  function showToast(msg) {
    if (window.DashboardRender && window.DashboardRender.showToast) {
      window.DashboardRender.showToast(msg);
    }
  }

  function getParseNum() {
    return (window.DashboardActions && window.DashboardActions.parseNumeric) || function (val) {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (!val || typeof val !== 'string') return 0;
      const clean = val.replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };
  }

  function getParseMktCap() {
    return (window.DashboardActions && window.DashboardActions.parseMarketCapValue) || function (val) {
      if (typeof val === 'number') {
        if (val > 100000) return parseFloat((val / 1e9).toFixed(3));
        return parseFloat(val.toFixed(3));
      }
      if (!val || typeof val !== 'string') return 0;
      const s = val.trim().toUpperCase();
      const clean = s.replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      if (isNaN(num)) return 0;
      if (s.includes('T')) return parseFloat((num * 1000).toFixed(3));
      if (s.includes('B') || s.includes('十億')) return parseFloat(num.toFixed(3));
      if (s.includes('M') || s.includes('百萬')) return parseFloat((num / 1000).toFixed(3));
      if (num > 100000) return parseFloat((num / 1e9).toFixed(3));
      return parseFloat(num.toFixed(3));
    };
  }

  function getFormatMktCap() {
    return (window.DashboardActions && window.DashboardActions.formatMarketCapDisplay) || function (valB) {
      if (!valB || isNaN(valB) || valB <= 0) return 'N/A';
      if (valB >= 1000) {
        return `$${(valB / 1000).toFixed(2)}T`;
      }
      return `$${valB.toFixed(2)}B`;
    };
  }

  const PeerActions = {
    /**
     * 同業標的多選狀態管理器 (支援 2~5 檔標的)
     */
    peerSelection: {
      _selected: [],

      getSelectedTickers() {
        return [...this._selected];
      },

      hasTicker(ticker) {
        if (!ticker) return false;
        return this._selected.includes(String(ticker).trim().toUpperCase());
      },

      toggleTicker(ticker, maxLimit = 5) {
        if (!ticker) return { success: false, error: '股票代號無效' };
        const sym = String(ticker).trim().toUpperCase();
        const idx = this._selected.indexOf(sym);
        if (idx >= 0) {
          this._selected.splice(idx, 1);
          return { success: true, action: 'removed', ticker: sym, selected: [...this._selected] };
        } else {
          if (this._selected.length >= maxLimit) {
            return {
              success: false,
              action: 'limit_exceeded',
              error: `最多只能同時選擇 ${maxLimit} 檔標的進行橫向對比`,
              selected: [...this._selected]
            };
          }
          this._selected.push(sym);
          return { success: true, action: 'added', ticker: sym, selected: [...this._selected] };
        }
      },

      addTicker(ticker, maxLimit = 5) {
        if (!ticker) return { success: false, error: '股票代號無效' };
        const sym = String(ticker).trim().toUpperCase();
        if (this._selected.includes(sym)) {
          return { success: true, action: 'exists', ticker: sym, selected: [...this._selected] };
        }
        if (this._selected.length >= maxLimit) {
          return {
            success: false,
            action: 'limit_exceeded',
            error: `最多只能同時選擇 ${maxLimit} 檔標的進行橫向對比`,
            selected: [...this._selected]
          };
        }
        this._selected.push(sym);
        return { success: true, action: 'added', ticker: sym, selected: [...this._selected] };
      },

      removeTicker(ticker) {
        if (!ticker) return [...this._selected];
        const sym = String(ticker).trim().toUpperCase();
        this._selected = this._selected.filter((t) => t !== sym);
        return [...this._selected];
      },

      clearTickers() {
        this._selected = [];
        return [];
      },

      selectCategoryTickers(catId, historyList, limit = 5) {
        if (!Array.isArray(historyList)) return [];
        const filtered = historyList.filter((item) => {
          if (!item || !item.ticker) return false;
          if (catId === 'all') return true;
          const c = item.categoryId || 'core';
          return c === catId;
        });
        const topTickers = filtered.slice(0, limit).map((item) => String(item.ticker).trim().toUpperCase());
        this._selected = topTickers;
        return [...this._selected];
      }
    },

    /**
     * 聚合多檔標的之對比數據 (含指標極值計算)
     * @param {string[]} tickers 標的代號清單 (2~5 檔)
     * @param {Array} historyList 本地歷史庫陣列
     * @returns {Object} { tickers, items, extremes, count, timestamp }
     */
    aggregatePeerData: function (tickers, historyList = []) {
      const syms = Array.isArray(tickers) ? tickers : [];
      const stockMap = new Map();
      (historyList || []).forEach((item) => {
        if (item && item.ticker) {
          stockMap.set(String(item.ticker).trim().toUpperCase(), item);
        }
      });

      const parseNum = getParseNum();
      const parseMktCap = getParseMktCap();
      const formatMktCap = getFormatMktCap();

      const items = syms.map((rawSym) => {
        const sym = String(rawSym).trim().toUpperCase();
        const s = stockMap.get(sym) || { ticker: sym };

        const priceNum = parseNum(s.price);
        const mktCapVal = parseMktCap(s.marketCap || (s.stats && (s.stats['市值'] || s.stats['Market cap'])));

        // 本益比 P/E
        let peVal = parseNum(s.pe || s.peRatio || (s.stats && (s.stats['本益比'] || s.stats['P/E ratio'] || s.stats['PE'])));

        // 市銷率 P/S
        let psVal = parseNum(s.ps || s.psRatio || (s.stats && (s.stats['市銷率'] || s.stats['P/S ratio'] || s.stats['PS'])));

        // 每股盈餘 EPS
        let epsVal = parseNum(s.latestEpsActual || s.eps || (s.earnings && s.earnings.latestEps) || (s.stats && s.stats['每股盈餘']));

        // 分析師目標價中位數與上漲空間
        const targetMedianVal = parseNum((s.analyst && s.analyst.targetMedian) || s.target_price_median || (s.targetPriceStats && s.targetPriceStats.median));
        let upsideVal = 0;
        if (priceNum > 0 && targetMedianVal > 0) {
          upsideVal = parseFloat((((targetMedianVal - priceNum) / priceNum) * 100).toFixed(2));
        } else if (s.targetPriceStats && typeof s.targetPriceStats.upsidePercent === 'number') {
          upsideVal = s.targetPriceStats.upsidePercent;
        }

        // 52 週高低價與位階
        let low52 = parseNum(s.low52);
        let high52 = parseNum(s.high52);
        if ((!low52 || !high52) && (s.range52w || (s.stats && s.stats['52週範圍']))) {
          const rStr = s.range52w || s.stats['52週範圍'];
          const parts = String(rStr).split('-').map((p) => parseNum(p));
          if (parts.length === 2) {
            low52 = low52 || parts[0];
            high52 = high52 || parts[1];
          }
        }

        let position52w = null;
        if (high52 > low52 && priceNum >= low52) {
          position52w = parseFloat((((priceNum - low52) / (high52 - low52)) * 100).toFixed(1));
          position52w = Math.min(100, Math.max(0, position52w));
        }

        return {
          raw: s,
          ticker: s.ticker || sym,
          name: s.name || s.companyName || s.ticker || sym,
          price: priceNum,
          priceDisplay: s.price ? (typeof s.price === 'number' ? `$${s.price.toFixed(2)}` : String(s.price)) : '--',
          marketCapVal: mktCapVal,
          marketCapDisplay: formatMktCap(mktCapVal),
          peVal: peVal > 0 ? peVal : null,
          psVal: psVal > 0 ? psVal : null,
          epsVal: epsVal !== 0 ? epsVal : null,
          targetMedian: targetMedianVal > 0 ? targetMedianVal : null,
          upsideVal: upsideVal,
          low52: low52 > 0 ? low52 : null,
          high52: high52 > 0 ? high52 : null,
          position52w: position52w,
          updatedAt: s.updatedAt || s.timestamp || '未知'
        };
      });

      function getExtremes(list, key) {
        if (!list || list.length === 0) return { min: null, max: null };
        let min = Infinity;
        let max = -Infinity;
        list.forEach((item) => {
          const val = item[key];
          if (typeof val === 'number' && !isNaN(val)) {
            if (val < min) min = val;
            if (val > max) max = val;
          }
        });
        return {
          min: min === Infinity ? null : min,
          max: max === -Infinity ? null : max
        };
      }

      const extremes = {
        price: getExtremes(items.filter((i) => i.price > 0), 'price'),
        marketCapVal: getExtremes(items.filter((i) => i.marketCapVal > 0), 'marketCapVal'),
        peVal: getExtremes(items.filter((i) => i.peVal !== null), 'peVal'),
        psVal: getExtremes(items.filter((i) => i.psVal !== null), 'psVal'),
        epsVal: getExtremes(items.filter((i) => i.epsVal !== null), 'epsVal'),
        upsideVal: getExtremes(items, 'upsideVal'),
        position52w: getExtremes(items.filter((i) => i.position52w !== null), 'position52w')
      };

      return {
        tickers: syms,
        items,
        extremes,
        count: items.length,
        timestamp: new Date().toISOString()
      };
    },

    /**
     * 聚合別名相容性轉發
     */
    aggregatePeerMetrics: function (tickers, historyList) {
      return this.aggregatePeerData(tickers, historyList);
    },

    /**
     * 複製同業橫向對比矩陣至 Markdown 表格
     */
    copyPeerMatrixMarkdown: function (peerData) {
      if (!peerData || !peerData.items || peerData.items.length === 0) {
        showToast('⚠️ 無可複製之同業對比數據');
        return;
      }

      let md = `# 同業橫向對比矩陣 (Peer Comparison Matrix)\n\n`;
      md += `* **對比標的**：${peerData.tickers.join(', ')}\n`;
      md += `* **產生時間**：${new Date().toLocaleString()}\n`;
      md += `* **標的檔數**：${peerData.count} 檔\n\n`;

      md += `| 標的代號 | 公司名稱 | 現價 | 市值 | P/E (本益比) | P/S (市銷率) | EPS | 目標價 (中位數) | 潛在空間 | 52週區間 | 52週位階 |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

      peerData.items.forEach((item) => {
        const peStr = item.peVal ? `${item.peVal}x` : 'N/A';
        const psStr = item.psVal ? `${item.psVal}x` : 'N/A';
        const epsStr = item.epsVal !== null ? `$${item.epsVal.toFixed(2)}` : 'N/A';
        const targetStr = item.targetMedian ? `$${item.targetMedian.toFixed(2)}` : 'N/A';
        const upsideStr = typeof item.upsideVal === 'number' ? `${item.upsideVal > 0 ? '+' : ''}${item.upsideVal}%` : 'N/A';
        const range52Str = (item.low52 && item.high52) ? `$${item.low52.toFixed(2)} - $${item.high52.toFixed(2)}` : 'N/A';
        const pos52Str = typeof item.position52w === 'number' ? `${item.position52w}%` : 'N/A';

        md += `| **${item.ticker}** | ${item.name} | ${item.priceDisplay} | ${item.marketCapDisplay} | ${peStr} | ${psStr} | ${epsStr} | ${targetStr} | ${upsideStr} | ${range52Str} | ${pos52Str} |\n`;
      });

      md += `\n> 數據來源：Finance Research Clipper OSS 自動化研報採集快取\n`;

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(md).then(() => {
          showToast(`📋 已複製 ${peerData.count} 檔標的之對比 Markdown 表格！`);
        }).catch(() => {
          showToast('複製失敗，請手動複製');
        });
      } else {
        showToast(`📋 對比表格已生成，環境不支援剪貼簿自動寫入`);
      }
    },

    /**
     * 送出同業對比矩陣至 Google Sheets (GAS)
     */
    sendPeerMatrixToGas: function (peerData, btnSendGas, settingsModal) {
      if (!peerData || !peerData.items || peerData.items.length === 0) {
        showToast('⚠️ 無對比資料可同步');
        return;
      }

      chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
        const gasUrl = res.gasUrl || res.appsScriptUrl;
        if (!gasUrl) {
          showToast('⚠️ 尚未設定 Google Apps Script URL，請先至設定面板配置！');
          if (settingsModal) settingsModal.style.display = 'flex';
          return;
        }

        const originalText = btnSendGas ? btnSendGas.textContent : '';
        if (btnSendGas) {
          btnSendGas.disabled = true;
          btnSendGas.textContent = '矩陣同步中...';
        }

        const payload = {
          protocolVersion: 1,
          action: 'peer_matrix_sync',
          secretToken: res.gasSecretToken || undefined,
          timestamp: Date.now(),
          tickers: peerData.tickers,
          data: peerData.items.map((item) => ({
            ticker: item.ticker,
            name: item.name,
            price: item.price,
            marketCap: item.marketCapDisplay,
            marketCapVal: item.marketCapVal,
            pe: item.peVal,
            ps: item.psVal,
            eps: item.epsVal,
            targetMedian: item.targetMedian,
            upsideVal: item.upsideVal,
            low52: item.low52,
            high52: item.high52,
            position52w: item.position52w,
            updatedAt: item.updatedAt
          }))
        };

        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'cors',
          redirect: 'follow'
        }).then((resp) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = originalText;
          }
          if (resp.ok) {
            showToast(`🎉 成功同步 ${peerData.count} 檔標的對比矩陣至 Google Sheets！`);
          } else {
            showToast(`⚠️ 傳送失敗，HTTP 狀態碼: ${resp.status}`);
          }
        }).catch((err) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = originalText;
          }
          showToast(`❌ 連線錯誤: ${err.message}`);
        });
      });
    },

    /**
     * 匯出同業對比矩陣為 Clean TSV (直貼 Excel / Google Sheets)
     * @param {Object} peerData 經 aggregatePeerMetrics 聚合之資料
     */
    copyPeerMatrixTsv: function (peerData) {
      if (!peerData || !peerData.items || peerData.items.length === 0) {
        showToast('⚠️ 無對比資料可複製');
        return;
      }

      const cleanCell = (window.DashboardActions && window.DashboardActions.cleanTsvCell) || ((v) => String(v || '').trim());

      // 構建與「多維度關鍵財務與估值指標對比表」相應的二維陣列
      const headerRow = ['指標項目 (Metric)', ...peerData.items.map((i) => i.ticker)];

      const metricDefinitions = [
        { label: '公司名稱', fn: (i) => i.name },
        { label: '即時價格', fn: (i) => i.priceDisplay || i.price },
        { label: '目標價預期空間', fn: (i) => typeof i.upsideVal === 'number' ? `${i.upsideVal}%` : '' },
        { label: '市值規模 (Market Cap)', fn: (i) => i.marketCapDisplay || i.marketCapVal },
        { label: '本益比 (P/E Ratio)', fn: (i) => i.peVal !== null && i.peVal !== undefined ? i.peVal : '' },
        { label: '市銷率 (P/S Ratio)', fn: (i) => i.psVal !== null && i.psVal !== undefined ? i.psVal : '' },
        { label: '每股盈餘 (EPS)', fn: (i) => i.epsVal !== null && i.epsVal !== undefined ? i.epsVal : '' },
        { label: '52週最低價', fn: (i) => i.low52 || '' },
        { label: '52週最高價', fn: (i) => i.high52 || '' },
        { label: '52週位階', fn: (i) => typeof i.position52w === 'number' ? `${i.position52w}%` : '' }
      ];

      const rows = [headerRow];
      metricDefinitions.forEach((m) => {
        const row = [m.label];
        peerData.items.forEach((item) => {
          row.push(cleanCell(m.fn(item)));
        });
        rows.push(row);
      });

      const tsv = rows.map((r) => r.join('\t')).join('\n');

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(tsv).then(() => {
          showToast(`📋 已複製 ${peerData.count} 檔標的之同業對比 Clean TSV！`);
        }).catch(() => {
          showToast('複製失敗，請手動複製');
        });
      } else {
        showToast('⚠️ 當前環境不支援剪貼簿自動寫入');
      }
    }
  };

  // 掛載至全域物件 (相容 DashboardActions 與 DashboardPeerActions)
  if (!window.DashboardActions) {
    window.DashboardActions = {};
  }
  Object.assign(window.DashboardActions, PeerActions);
  window.DashboardPeerActions = PeerActions;
})();

