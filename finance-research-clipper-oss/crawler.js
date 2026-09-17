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
   * 1. 抓取 Overview 分頁數據
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
      // 標的名稱與代號
      const symbolAttr = document.querySelector('[data-symbol]')?.getAttribute('data-symbol');
      const h1Text = document.querySelector('h1')?.innerText?.trim();
      const urlSymbolMatch = window.location.pathname.match(/\/quote\/([A-Z0-9_.:-]+)/i);
      data.symbol = symbolAttr || h1Text || (urlSymbolMatch ? urlSymbolMatch[1] : 'UNKNOWN');

      // 即時價格
      const priceContainer = document.querySelector('[data-last-price]');
      const priceEl = priceContainer || document.querySelector('div[class*="price"], span[class*="price"], .YMlKvd, .fxKb7e, .N6SYTe');
      data.price = priceContainer ? priceContainer.getAttribute('data-last-price') : (priceEl?.innerText?.trim() || 'N/A');

      // 語意化擷取 Key Stats（市值、本益比、52週高低範圍等）
      const allTextEls = Array.from(document.querySelectorAll('div, span'))
        .filter((el) => {
          return el.children.length === 0 &&
            /Market cap|P\/E ratio|Avg Volume|High|Low|52-wk|Dividend yield|CDI/i.test(el.innerText);
        });

      allTextEls.forEach((labelEl) => {
        const label = labelEl.innerText.trim();
        const parent = labelEl.parentElement;
        if (parent) {
          const valEl = Array.from(parent.children).find((c) => c !== labelEl && c.innerText.trim().length > 0);
          if (valEl) {
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

      // 目標價與分析師共識定位
      const targetSection = textBlocks.find((t) => /Target price|Price target|Analyst rating|Consensus|Buy|Hold|Sell/i.test(t));
      if (targetSection) {
        data.ratingsSummary = targetSection.slice(0, 1500);

        // 提取共識字眼 (如 Strong Buy, Buy, Hold, Underperform, Sell)
        const consensusMatch = targetSection.match(/(Strong Buy|Moderate Buy|Buy|Hold|Underperform|Sell|Strong Sell)/i);
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
   * 切換指定 Tab 並等待內容渲染
   */
  async function navigateToTab(tabName) {
    // 1. 尋找對應的頁籤按鈕 (優先尋找包含 tab=xxx 的連結或 role="tab")
    const tabButton = Array.from(document.querySelectorAll('[role="tab"], button, a'))
      .find((el) => {
        const text = el.innerText?.trim() || '';
        const href = el.getAttribute('href') || '';
        const ariaControls = el.getAttribute('aria-controls') || '';
        return (
          new RegExp(`^${tabName}$`, 'i').test(text) ||
          href.includes(`tab=${tabName}`) ||
          ariaControls.toLowerCase().includes(tabName)
        );
      });

    if (tabButton) {
      tabButton.click();
    } else {
      // 備案：利用 SPA History API 或 Query 觸發
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', tabName);
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    // 2. 智慧等待 DOM 水合完成
    await waitForCondition(() => {
      // 判斷 URL 是否已切換，或是該分頁特有的內容是否出現在畫面
      const currentTab = new URL(window.location.href).searchParams.get('tab') || 'overview';
      return currentTab.toLowerCase() === tabName.toLowerCase() || document.readyState === 'complete';
    }, 3000);

    // 額外給予微量時間讓 client-side virtual dom 完成掛載
    await sleep(800);
  }

  /**
   * 主調度器：依序切換 Tab 並收集全部數據
   * @param {Function} onProgress 進度通知回呼函式
   */
  async function runFullStockScraper(onProgress) {
    const results = {
      timestamp: new Date().toISOString(),
      overview: null,
      analysis: null,
      earnings: null,
      financials: null
    };

    const tabs = [
      { name: 'overview', fn: scrapeOverview, title: 'Overview 總覽' },
      { name: 'analysis', fn: scrapeAnalysis, title: 'Analysis 分析師評級' },
      { name: 'earnings', fn: scrapeEarnings, title: 'Earnings 財報表現' },
      { name: 'financials', fn: scrapeFinancials, title: 'Financials 財務報表' }
    ];

    for (const tab of tabs) {
      if (typeof onProgress === 'function') {
        onProgress(`⚡ 正在切換並擷取 ${tab.title}...`);
      }

      try {
        await navigateToTab(tab.name);
        results[tab.name] = tab.fn();
      } catch (tabErr) {
        results[tab.name] = { tab: tab.name, error: true };
      }
    }

    if (typeof onProgress === 'function') {
      onProgress('✅ 4 大分頁數據擷取完成！');
    }

    return results;
  }

  // 導出至全域
  global.FinanceCrawler = {
    runFullStockScraper,
    scrapeOverview,
    scrapeAnalysis,
    scrapeEarnings,
    scrapeFinancials,
    navigateToTab
  };

})(typeof window !== 'undefined' ? window : this);
