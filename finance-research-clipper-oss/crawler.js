/**
 * Google Finance Beta SPA 4合1 數據爬取模組 (crawler.js)
 * 專為 Google Finance Beta 單頁應用 (SPA) 設計之動態走訪爬蟲。
 * 透過語意化選取器 (Semantic Text Matching) 與主動 Tab 點擊切換，
 * 克服混淆 CSS Class，擷取完整個股數據、分析師預期、歷年財報與財務報表。
 */

(function (global) {
  'use strict';

  // 輔助函式：延遲
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 輔助函式：等待條件成立或元素出現 (含超時防護)
  function waitForCondition(checkFn, timeout = 5000, interval = 200) {
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        try {
          const result = checkFn();
          if (result) {
            clearInterval(timer);
            resolve(result);
            return;
          }
        } catch (e) {
          // 忽略判斷期間之暫態錯誤
        }

        if (Date.now() - start > timeout) {
          clearInterval(timer);
          resolve(null); // 超時回傳 null，避免阻塞
        }
      }, interval);
    });
  }

  /**
   * 1. 抓取 Overview 總覽數據
   */
  function scrapeOverview() {
    const data = {
      tab: 'overview',
      symbol: '',
      price: '',
      stats: {},
      error: false
    };

    try {
      // 1. 標的代號提取 (嚴格排除「財經」等非股票標籤)
      const urlSymbolMatch = window.location.pathname.match(/\/quote\/([A-Z0-9_.:-]+)/i);
      let detectedSymbol = urlSymbolMatch ? urlSymbolMatch[1] : '';

      const symbolAttr = document.querySelector('[data-symbol]')?.getAttribute('data-symbol');
      const h1El = document.querySelector('h1');
      const h1Text = h1El?.innerText?.trim() || '';

      if (!detectedSymbol && symbolAttr) detectedSymbol = symbolAttr;
      if (!detectedSymbol && h1Text && !/^(財經|Google 財經|Google Finance|Search)$/i.test(h1Text)) {
        detectedSymbol = h1Text;
      }

      data.symbol = detectedSymbol || 'UNKNOWN';

      // 2. 即時價格 (優先檢驗有效格式)
      const priceContainer = document.querySelector('[data-last-price]');
      const priceCandidates = [
        priceContainer?.getAttribute('data-last-price'),
        document.querySelector('.N6SYTe')?.innerText?.trim(),
        document.querySelector('span[jsname="Pdsbrc"]')?.innerText?.trim(),
        document.querySelector('.YMlKvd')?.innerText?.trim(),
        document.querySelector('.fxKb7e')?.innerText?.trim(),
        document.querySelector('div[class*="price"], span[class*="price"]')?.innerText?.trim()
      ].filter(Boolean);

      // 挑選符合金額特徵的候選值 ($123.45, NT$123, 123.45 等)
      const validPrice = priceCandidates.find((p) => /[$€£¥NT]?[\d,]+(?:\.\d+)?/.test(p));
      data.price = validPrice || (priceCandidates[0] || 'N/A');

      // 3. 語意化擷取 Key Stats（支援中英雙語：市值、本益比、52週高低範圍、殖利率等）
      const allTextEls = Array.from(document.querySelectorAll('div, span'))
        .filter((el) => {
          return el.children.length === 0 &&
            /Market cap|P\/E ratio|Avg Volume|High|Low|52-wk|Dividend yield|Beta|市值|本益比|成交量|最高|最低|52 週|殖利率/i.test(el.innerText);
        });

      allTextEls.forEach((labelEl) => {
        const label = labelEl.innerText.trim();
        const parent = labelEl.parentElement;
        if (parent) {
          const valEl = Array.from(parent.children).find((c) => c !== labelEl && c.innerText.trim().length > 0);
          if (valEl && valEl.innerText.trim() && !data.stats[label]) {
            data.stats[label] = valEl.innerText.trim();
          }
        }
      });
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  /**
   * 2. 抓取 Analysis 分頁數據 (分析師評級與目標價)
   */
  function scrapeAnalysis() {
    const data = {
      tab: 'analysis',
      targetPrice: { high: '', median: '', low: '', current: '' },
      ratingsSummary: '',
      consensus: '',
      error: false
    };

    try {
      // 擷取所有非空區塊文字以進行語意分析
      const textBlocks = Array.from(document.querySelectorAll('div, section, article'))
        .map((el) => el.innerText?.trim() || '')
        .filter((t) => t.length > 0);

      // 目標價與分析師共識定位 (支援中英文)
      const targetSection = textBlocks.find((t) => /Target price|Price target|Analyst rating|Consensus|Buy|Hold|Sell|目標價|分析師評級|分析師|評級|買進|持有|賣出/i.test(t));
      if (targetSection) {
        data.ratingsSummary = targetSection.slice(0, 1500);

        // 提取共識字眼 (如 Strong Buy, Buy, Hold, 強力買進, 買進, 持有)
        const consensusMatch = targetSection.match(/(Strong Buy|Moderate Buy|Buy|Hold|Underperform|Sell|Strong Sell|強力買進|買進|加碼|持有|減碼|賣出)/i);
        if (consensusMatch) {
          data.consensus = consensusMatch[0];
        }

        // 提取高/中/低目標價數字模式 (如 $12.50, 15.00 等)
        const priceMatches = targetSection.match(/\$[\d,]+(?:\.\d{2})?/g);
        if (priceMatches && priceMatches.length >= 2) {
          data.targetPrice.median = priceMatches[0];
          data.targetPrice.high = priceMatches[1];
          if (priceMatches[2]) data.targetPrice.low = priceMatches[2];
        }
      }
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  /**
   * 3. 抓取 Earnings 分頁數據 (EPS 與 財報驚喜度)
   */
  function scrapeEarnings() {
    const data = {
      tab: 'earnings',
      latestQuarter: { period: 'N/A', epsActual: 'N/A', epsEstimate: 'N/A', revenueActual: 'N/A', revenueEstimate: 'N/A' },
      history: [],
      error: false
    };

    try {
      // 尋找財報表格
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach((table) => {
          const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((cell) => cell.innerText.trim())
          ).filter((row) => row.length > 0);
          if (rows.length > 0) {
            data.history.push(rows);
          }
        });
      }

      // 提取文字標註區塊（EPS / Revenue 實值與預期）
      const statContainers = Array.from(document.querySelectorAll('[role="region"], section, div'))
        .filter((c) => /EPS|Revenue|Surprise/i.test(c.innerText) && c.innerText.length < 500);

      statContainers.forEach((container) => {
        const text = container.innerText;
        const epsMatch = text.match(/EPS.*?([\d.-]+).*?(?:Est\.?|Estimate).*?([\d.-]+)/i);
        if (epsMatch) {
          data.latestQuarter.epsActual = epsMatch[1];
          data.latestQuarter.epsEstimate = epsMatch[2];
        }
        const revMatch = text.match(/(?:Revenue|營收).*?([\d.-]+[BMK]?).*?(?:Est\.?|Estimate).*?([\d.-]+[BMK]?)/i);
        if (revMatch) {
          data.latestQuarter.revenueActual = revMatch[1];
          data.latestQuarter.revenueEstimate = revMatch[2];
        }
      });
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  /**
   * 4. 抓取 Financials 分頁數據 (損益表 Income Statement)
   */
  function scrapeFinancials() {
    const data = {
      tab: 'financials',
      statements: [],
      error: false
    };

    try {
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach((tbl) => {
          const rows = Array.from(tbl.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((td) => td.innerText.trim())
          ).filter((row) => row.length > 0);
          if (rows.length > 0) {
            data.statements.push(rows);
          }
        });
      }
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  /**
   * 輕量切換指定 Tab (支援中英文 Tab，若存在才點擊，最長等待 600ms，絕不阻塞卡死)
   */
  async function tryNavigateToTab(tabName) {
    const tabPatterns = {
      financials: /^(財務|財務狀況|Financials)$/i,
      analysis: /^(分析|分析師評級|Analysis)$/i,
      earnings: /^(收益|財報|Earnings)$/i,
      overview: /^(總覽|Overview)$/i
    };

    const pattern = tabPatterns[tabName.toLowerCase()] || new RegExp(`^${tabName}$`, 'i');

    const tabButton = Array.from(document.querySelectorAll('[role="tab"], button, a'))
      .find((el) => {
        const text = el.innerText?.trim() || '';
        const href = el.getAttribute('href') || '';
        const ariaControls = el.getAttribute('aria-controls') || '';
        return (
          pattern.test(text) ||
          href.includes(`tab=${tabName}`) ||
          ariaControls.toLowerCase().includes(tabName)
        );
      });

    if (tabButton) {
      tabButton.click();
      await sleep(600);
    }
  }

  /**
   * 主調度器：單頁優先全面提取 + 輕量輔助探測
   */
  async function runFullStockScraper(onProgress) {
    const results = {
      timestamp: new Date().toISOString(),
      overview: null,
      analysis: null,
      earnings: null,
      financials: null
    };

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取行情概覽...');
    results.overview = scrapeOverview();

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取分析師評級與目標價...');
    results.analysis = scrapeAnalysis();

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取財報與損益表...');
    results.earnings = scrapeEarnings();
    results.financials = scrapeFinancials();

    // 若損益表未抓到表格且有財務分頁按鈕，做一次輕量嘗試
    if ((!results.financials.statements || results.financials.statements.length === 0)) {
      try {
        await tryNavigateToTab('financials');
        const secondaryFin = scrapeFinancials();
        if (secondaryFin.statements && secondaryFin.statements.length > 0) {
          results.financials = secondaryFin;
        }
      } catch (e) {
        // 忽略輕量嘗試錯誤
      }
    }

    if (typeof onProgress === 'function') onProgress('✅ 數據萃取完成！');
    return results;
  }

  // 導出至全域 (確保 navigateToTab 與 tryNavigateToTab 皆有定義)
  global.FinanceCrawler = {
    runFullStockScraper,
    scrapeOverview,
    scrapeAnalysis,
    scrapeEarnings,
    scrapeFinancials,
    navigateToTab: tryNavigateToTab,
    tryNavigateToTab
  };

})(typeof window !== 'undefined' ? window : this);
