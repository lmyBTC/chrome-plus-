/**
 * Google Finance Beta SPA 4合1 數據爬取模組 (crawler.js)
 * 專為 Google Finance Beta 單頁應用 (SPA) 設計之動態走訪爬蟲。
 * 透過語意化選取器 (Semantic Text Matching) 與主動 Tab 點擊切換，
 * 克服混淆 CSS Class，擷取完整個股數據、分析師預期、歷年財報與財務報表。
 * 同時提供標準化數值清洗 Sanitizer (sanitizeToMinerSchema)，確保輸出符合純數字鐵律。
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

  // ==========================================
  // 純數字規範與單位換算 Sanitizer 引用 (解耦至 crawler-sanitizer.js)
  // ==========================================
  const Sanitizer = (typeof window !== 'undefined' && window.CrawlerSanitizer) ||
                    (typeof global !== 'undefined' && global.CrawlerSanitizer) ||
                    (typeof require === 'function' ? (function () { try { return require('./crawler-sanitizer.js'); } catch (e) { return {}; } })() : {});

  const cleanNumber = Sanitizer.cleanNumber || function (val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val || typeof val !== 'string') return 0;
    const str = val.trim();
    const isNeg = /^\(.*\)$/.test(str) || str.startsWith('-');
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : (isNeg ? -num : num);
  };
  const cleanMarketCap = Sanitizer.cleanMarketCap || function () { return 0; };
  const cleanRange52w = Sanitizer.cleanRange52w || function () { return '.00 - .00'; };
  const calcEpsSurprise = Sanitizer.calcEpsSurprise || function () { return 0; };
  const cleanPercentage = Sanitizer.cleanPercentage || cleanNumber;
  const parseTargetPrices = Sanitizer.parseTargetPrices || function () { return []; };
  const calculateTargetPriceStats = Sanitizer.calculateTargetPriceStats || function () { return { count: 0, mean: 0, median: 0, high: 0, low: 0, upsidePercent: 0, upsideMeanPercent: 0, stdDev: 0, cv: 0 }; };
  const sanitizeToMinerSchema = Sanitizer.sanitizeToMinerSchema || function (input) { return input || {}; };

  // ==========================================
  // DOM 爬蟲核心實作
  // ==========================================

  /**
   * 1. 抓取 Overview 總覽數據
   */
  function scrapeOverview() {
    const data = {
      tab: 'overview',
      symbol: '',
      price: '',
      low52: '',
      high52: '',
      range52w: '',
      marketCap: '',
      beta: '',
      pe: '',
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
          const candidates = Array.from(parent.children).filter((c) => c !== labelEl && c.innerText.trim().length > 0);
          // 優先挑選非純圖示名稱的元素 (排除 arrow_upward, arrow_downward 等 Material Symbols 連字字串)
          let valEl = candidates.find((c) => 
            !/^(arrow_upward|arrow_downward|arrow_drop_up|arrow_drop_down|expand_less|expand_more|info|help)$/i.test(c.innerText.trim())
          ) || candidates[0];

          if (valEl && valEl.innerText.trim() && !data.stats[label]) {
            let cleanVal = valEl.innerText.trim();
            // 若含有圖示字串且有具體數值，清理圖示前綴保留純淨數據
            cleanVal = cleanVal.replace(/^(arrow_upward|arrow_downward|arrow_drop_up|arrow_drop_down)\s*/i, '').trim();
            if (cleanVal) {
              data.stats[label] = cleanVal;
            }
          }
        }
      });

      // 結構化衍生屬性
      for (const [key, val] of Object.entries(data.stats)) {
        if (/Market cap|市值/i.test(key)) data.marketCap = val;
        else if (/P\/E ratio|本益比/i.test(key)) data.pe = val;
        else if (/Beta|貝他值/i.test(key)) data.beta = val;
        else if (/52-wk high|52-week high|52 週最高|52週最高/i.test(key)) data.high52 = val;
        else if (/52-wk low|52-week low|52 週最低|52週最低/i.test(key)) data.low52 = val;
        else if (/52-wk range|52-week range|52 週範圍|52週範圍/i.test(key)) data.range52w = val;
      }

      if (data.range52w && (!data.low52 || !data.high52)) {
        const parts = data.range52w.split(/[-–—~至到]/).map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          if (!data.low52) data.low52 = parts[0];
          if (!data.high52) data.high52 = parts[1];
        }
      } else if (!data.range52w && (data.low52 || data.high52)) {
        data.range52w = `${data.low52 || '0'} - ${data.high52 || '0'}`;
      }

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
      targetPriceMedian: '',
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
        const priceMatches = targetSection.match(/\$[\d,]+(?:\.\d{1,2})?/g);
        if (priceMatches && priceMatches.length > 0) {
          data.targetPrice.median = priceMatches[0];
          if (priceMatches.length > 1) data.targetPrice.high = priceMatches[1];
          if (priceMatches.length > 2) data.targetPrice.low = priceMatches[2];
        } else {
          // 若無帶 $ 符號，嘗試匹配數值
          const numMatch = targetSection.match(/(?:目標價|Target price|Price target)[\s:：]*\$?([\d,]+(?:\.\d+)?)/i);
          if (numMatch) {
            data.targetPrice.median = numMatch[1];
          }
        }
      }

      data.targetPriceMedian = data.targetPrice.median || '';
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
      latestQuarter: {
        period: 'N/A',
        epsActual: 'N/A',
        epsEstimate: 'N/A',
        revenueActual: 'N/A',
        revenueEstimate: 'N/A',
        yoy: 'N/A',
        epsSurprise: 'N/A'
      },
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
        .filter((c) => /EPS|Revenue|Surprise|每股盈餘|每股盈余|營收|收益/i.test(c.innerText) && c.innerText.length < 500);

      statContainers.forEach((container) => {
        const text = container.innerText;
        // 支援中英雙語 EPS 實質與預估 (支援負數)
        const epsMatch = text.match(/(?:EPS|每股盈餘|每股盈余).*?([+-]?[\d.-]+(?:\s*[A-Z]{3})?).*?(?:Est\.?|Estimate|預估值|預估).*?([+-]?[\d.-]+(?:\s*[A-Z]{3})?)/i);
        if (epsMatch) {
          data.latestQuarter.epsActual = epsMatch[1].trim();
          data.latestQuarter.epsEstimate = epsMatch[2].trim();
        }

        // 支援中英雙語營收/收益
        const revMatch = text.match(/(?:Revenue|營收|收益).*?([\d.-]+[BMK]?).*?(?:Est\.?|Estimate|預估值|預估).*?([\d.-]+[BMK]?)/i);
        if (revMatch) {
          data.latestQuarter.revenueActual = revMatch[1].trim();
          data.latestQuarter.revenueEstimate = revMatch[2].trim();
        }

        // 提取 YoY 年增率
        const yoyMatch = text.match(/(?:YoY|同比|年增率|年增|成長率|成長).*?([+-]?\d+(?:\.\d+)?)\s*%/i) ||
                         text.match(/([+-]?\d+(?:\.\d+)?)\s*%.*?(?:YoY|同比|年增)/i);
        if (yoyMatch && data.latestQuarter.yoy === 'N/A') {
          data.latestQuarter.yoy = yoyMatch[1].trim() + '%';
        }

        // 提取驚喜率
        const surpriseMatch = text.match(/(?:Surprise|驚喜度|驚喜率).*?([+-]?\d+(?:\.\d+)?)\s*%/i);
        if (surpriseMatch && data.latestQuarter.epsSurprise === 'N/A') {
          data.latestQuarter.epsSurprise = surpriseMatch[1].trim() + '%';
        }
      });
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  /**
   * 4. 抓取 Overview 分頁中的市場主題、趨勢與相關專題表格 (Market Topics)
   */
  function scrapeMarketTopics() {
    const data = {
      tab: 'marketTopics',
      topics: [],
      error: false
    };

    try {
      const tables = document.querySelectorAll('table');
      if (tables.length > 0) {
        tables.forEach((tbl) => {
          const rows = Array.from(tbl.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((td) => td.innerText.trim())
          ).filter((row) => row.length > 0);

          if (rows.length === 0) return;

          // 排除具備財報特徵之表格，確保僅萃取市場主題/趨勢
          if (!isFinancialStatementTable(rows)) {
            data.topics.push(rows);
          }
        });
      }
    } catch (err) {
      data.error = true;
    }

    return data;
  }

  // 財報語意關鍵字白名單 (中英文對照)，用以排除市場趨勢、熱門標的等非財報表格
  const FINANCIAL_STATEMENT_KEYWORDS = [
    'revenue', 'net income', 'operating income', 'cost of revenue', 'gross profit',
    'diluted eps', 'eps', 'ebitda', 'cash and cash equivalents', 'total assets',
    'total liabilities', 'operating cash flow', 'capital expenditure', 'free cash flow',
    'balance sheet', 'cash flow', 'income statement',
    '營收', '收益', '營業額', '淨利', '淨收入', '營業利益', '營業收入', '毛利', '毛利率',
    '稀釋後每股盈餘', '每股盈餘', '資產總額', '負債總額', '現金及約當現金', '營運現金流',
    '自由現金流', '損益表', '資產負債表', '現金流量表'
  ];

  /**
   * 輔助函式：校驗表格列資料是否符合財報語意白名單
   * @param {Array<Array<string>>} rows 
   * @returns {boolean}
   */
  function isFinancialStatementTable(rows) {
    if (!rows || rows.length === 0) return false;
    const combinedText = rows.map((r) => r.join(' ')).join(' ').toLowerCase();
    return FINANCIAL_STATEMENT_KEYWORDS.some((kw) => combinedText.includes(kw.toLowerCase()));
  }

  /**
   * 5. 抓取 Financials 分頁數據 (損益表 Income Statement)
   * 具備財報關鍵字白名單驗證，嚴格過濾非財報之全域表格
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
          
          // 嚴格比對白名單：僅納入真正的財務報表矩陣
          if (rows.length > 0 && isFinancialStatementTable(rows)) {
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
      financials: /^(財務|財務狀況|財務報表|Financials)$/i,
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
   * 主調度器：多分頁走訪萃取 + 語意校驗與獨立主題提取
   */
  async function runFullStockScraper(onProgress) {
    const results = {
      timestamp: new Date().toISOString(),
      overview: null,
      marketTopics: null,
      analysis: null,
      earnings: null,
      financials: null,
      minerMetrics: null
    };

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取行情概覽與市場主題...');
    results.overview = scrapeOverview();
    results.marketTopics = scrapeMarketTopics();

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取分析師評級與目標價...');
    results.analysis = scrapeAnalysis();

    if (typeof onProgress === 'function') onProgress('⚡ 正在萃取財報盈餘...');
    results.earnings = scrapeEarnings();

    // 針對損益表：主動導航至 financials 分頁萃取真實報表
    if (typeof onProgress === 'function') onProgress('⚡ 正在導航至財務分頁以萃取損益表...');
    try {
      await tryNavigateToTab('financials');
      // 等候財務表格渲染（超時防護 1500ms）
      await waitForCondition(() => {
        const tables = document.querySelectorAll('table');
        for (const tbl of tables) {
          const rows = Array.from(tbl.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((td) => td.innerText.trim())
          ).filter((row) => row.length > 0);
          if (isFinancialStatementTable(rows)) return true;
        }
        return false;
      }, 1500, 200);
    } catch (e) {
      // 導航失敗則容錯繼續
    }

    results.financials = scrapeFinancials();

    // 自動整合標準化純數字指標
    try {
      results.minerMetrics = sanitizeToMinerSchema(results);
    } catch (e) {
      results.minerMetrics = null;
    }

    if (typeof onProgress === 'function') onProgress('✅ 數據萃取完成！');
    return results;
  }

  // 導出至全域 (Universal 支援 window / global / CommonJS)
  const exportTarget = {
    runFullStockScraper,
    scrapeOverview,
    scrapeMarketTopics,
    scrapeAnalysis,
    scrapeEarnings,
    scrapeFinancials,
    navigateToTab: tryNavigateToTab,
    tryNavigateToTab,
    cleanNumber,
    cleanMarketCap,
    cleanRange52w,
    calcEpsSurprise,
    cleanPercentage,
    parseTargetPrices,
    calculateTargetPriceStats,
    sanitizeToMinerSchema
  };

  if (typeof global !== 'undefined') {
    global.FinanceCrawler = exportTarget;
  }
  if (typeof window !== 'undefined') {
    window.FinanceCrawler = exportTarget;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportTarget;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
