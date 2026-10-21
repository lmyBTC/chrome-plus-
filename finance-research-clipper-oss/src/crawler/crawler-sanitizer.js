/**
 * Finance Research Clipper - 數據清洗與 Miner Schema 正規化模組 (crawler-sanitizer.js)
 * 提供純數字清洗、單位轉換（$B/億/萬）、52週範圍格式化、目標價統計與符合 AI 礦企規範之 Miner Schema 轉換。
 * 本模組為純函數庫，零 DOM 依賴，可供 Content Script、Background Service Worker、Popup 與 Dashboard 跨環境共用。
 */

(function (global) {
  'use strict';

  /**
   * 清除字串中的貨幣符號、逗號、空格與單位標籤，轉為純浮點數
   * @param {string|number} val 
   * @returns {number} 純浮點數或 0
   */
  function cleanNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val || typeof val !== 'string') return 0;
    let str = val.trim();
    let isNegative = false;
    if (/^\(.*\)$/.test(str) || str.startsWith('-')) {
      isNegative = true;
    }
    const cleaned = str.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
  }

  /**
   * 市值換算為十億美元 ($B) 純浮點數
   * @param {string|number} val 
   * @returns {number} 以 $B 為單位的純浮點數
   */
  function cleanMarketCap(val) {
    if (typeof val === 'number') {
      if (val > 100000) return parseFloat((val / 1e9).toFixed(3));
      return val;
    }
    if (!val || typeof val !== 'string') return 0;
    const str = val.trim().toUpperCase();
    const rawNum = cleanNumber(str);
    if (str.includes('T')) {
      return parseFloat((rawNum * 1000).toFixed(3));
    }
    if (str.includes('B') || str.includes('十億') || str.includes('10億')) {
      return parseFloat(rawNum.toFixed(3));
    }
    if (str.includes('M') || str.includes('百萬')) {
      return parseFloat((rawNum / 1000).toFixed(3));
    }
    if (str.includes('K') || str.includes('千')) {
      return parseFloat((rawNum / 1e6).toFixed(3));
    }
    if (rawNum > 100000) {
      return parseFloat((rawNum / 1e9).toFixed(3));
    }
    return parseFloat(rawNum.toFixed(3));
  }

  /**
   * 52 週高低價範圍字串格式化為 "$最低 - $最高"
   * @param {string} rangeStr 原始範圍字串
   * @param {string|number} [low] 最低價 (選填)
   * @param {string|number} [high] 最高價 (選填)
   * @returns {string} "$最低 - $最高"
   */
  function cleanRange52w(rangeStr, low, high) {
    let lowNum = 0;
    let highNum = 0;

    if (rangeStr && typeof rangeStr === 'string') {
      const parts = rangeStr.split(/[-–—~至到]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        lowNum = cleanNumber(parts[0]);
        highNum = cleanNumber(parts[1]);
      }
    }

    if ((!lowNum || !highNum) && (low !== undefined || high !== undefined)) {
      if (low !== undefined) lowNum = cleanNumber(low);
      if (high !== undefined) highNum = cleanNumber(high);
    }

    if (lowNum > highNum && highNum > 0) {
      const temp = lowNum;
      lowNum = highNum;
      highNum = temp;
    }

    if (lowNum === 0 && highNum === 0) return '$0.00 - $0.00';
    return `$${lowNum.toFixed(2)} - $${highNum.toFixed(2)}`;
  }

  /**
   * 計算 EPS 驚喜率 ((Actual - Est) / |Est|) * 100
   * @param {string|number} actual 實際 EPS
   * @param {string|number} estimate 預估 EPS
   * @returns {number} 百分比純數字 (保留一位小數)
   */
  function calcEpsSurprise(actual, estimate) {
    const act = cleanNumber(actual);
    const est = cleanNumber(estimate);
    if (isNaN(act) || isNaN(est)) return 0;
    if (est === 0) {
      return act > 0 ? 100 : (act < 0 ? -100 : 0);
    }
    const surprise = ((act - est) / Math.abs(est)) * 100;
    return parseFloat(surprise.toFixed(1));
  }

  /**
   * 清洗成長率或百分比為純數字
   * @param {string|number} val 
   * @returns {number}
   */
  function cleanPercentage(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val || typeof val !== 'string') return 0;
    return cleanNumber(val);
  }

  /**
   * 目標價陣列解析器：從物件、陣列或字串中解析出所有有效的目標價數值陣列
   * @param {Array|Object|string|number} input 
   * @returns {number[]} 排序後的目標價陣列 (升序)
   */
  function parseTargetPrices(input) {
    if (!input) return [];
    const prices = [];

    const addValidNumber = (val) => {
      const num = cleanNumber(val);
      if (!isNaN(num) && num > 0) {
        prices.push(num);
      }
    };

    if (Array.isArray(input)) {
      input.forEach(addValidNumber);
    } else if (typeof input === 'object') {
      if (Array.isArray(input.prices)) input.prices.forEach(addValidNumber);
      else if (Array.isArray(input.targets)) input.targets.forEach(addValidNumber);
      else if (Array.isArray(input.items)) input.items.forEach(addValidNumber);

      if (input.low !== undefined && input.low !== '' && input.low !== '-') addValidNumber(input.low);
      if (input.median !== undefined && input.median !== '' && input.median !== '-') addValidNumber(input.median);
      if (input.high !== undefined && input.high !== '' && input.high !== '-') addValidNumber(input.high);
      if (input.targetPrice !== undefined && input.targetPrice !== input) {
        const nested = parseTargetPrices(input.targetPrice);
        nested.forEach(n => prices.push(n));
      }
    } else if (typeof input === 'string') {
      const matches = input.match(/\$?(\d{1,6}(?:\.\d{1,2})?)/g);
      if (matches && matches.length > 0) {
        matches.forEach(m => addValidNumber(m));
      } else {
        addValidNumber(input);
      }
    } else if (typeof input === 'number') {
      addValidNumber(input);
    }

    return prices.filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
  }

  /**
   * 目標價統計計算函式：計算平均值、中位數、最高/最低、現價上漲空間 (Upside %)、標準差與離散係數 (CV)
   * @param {Array|Object|string|number} targets 目標價輸入
   * @param {number|string} currentPrice 現價
   * @returns {Object} 包含 mean, median, high, low, count, upsidePercent, upsideMeanPercent, stdDev, cv 的統計物件
   */
  function calculateTargetPriceStats(targets, currentPrice) {
    const current = cleanNumber(currentPrice);
    const prices = parseTargetPrices(targets);
    const n = prices.length;

    if (n === 0) {
      return {
        count: 0,
        mean: 0,
        median: 0,
        high: 0,
        low: 0,
        upsidePercent: 0,
        upsideMeanPercent: 0,
        stdDev: 0,
        cv: 0
      };
    }

    const sum = prices.reduce((acc, p) => acc + p, 0);
    const mean = parseFloat((sum / n).toFixed(2));

    let median = 0;
    if (n % 2 !== 0) {
      median = prices[Math.floor(n / 2)];
    } else {
      median = (prices[n / 2 - 1] + prices[n / 2]) / 2;
    }
    median = parseFloat(median.toFixed(2));

    const high = parseFloat(prices[n - 1].toFixed(2));
    const low = parseFloat(prices[0].toFixed(2));

    const upsidePercent = (current > 0 && median > 0)
      ? parseFloat((((median - current) / current) * 100).toFixed(2))
      : 0;

    const upsideMeanPercent = (current > 0 && mean > 0)
      ? parseFloat((((mean - current) / current) * 100).toFixed(2))
      : 0;

    let stdDev = 0;
    if (n >= 2) {
      const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (n - 1);
      stdDev = parseFloat(Math.sqrt(variance).toFixed(2));
    }

    const cv = (mean > 0 && stdDev > 0)
      ? parseFloat((stdDev / mean).toFixed(4))
      : 0;

    return {
      count: n,
      mean,
      median,
      high,
      low,
      upsidePercent,
      upsideMeanPercent,
      stdDev,
      cv
    };
  }

  /**
   * 將原始抓取或彙整資料正規化為符合 AI 礦企規範 (SSOT Schema) 的純數字資料物件
   * @param {Object} input 原始物件 (支援 crawler rawData 或 stockItem 格式)
   * @returns {Object} 標準化物件
   */
  function sanitizeToMinerSchema(input) {
    if (!input || typeof input !== 'object') return {};

    // 1. Ticker
    let ticker = (input.ticker || input.symbol || (input.overview && input.overview.symbol) || '').toUpperCase().trim();
    if (ticker.includes(':')) {
      ticker = ticker.split(':').pop();
    }

    // 2. Price
    const rawPrice = input.price !== undefined ? input.price : (input.overview && input.overview.price);
    const price = cleanNumber(rawPrice);

    // 3. Stats 輔助查詢
    const stats = input.stats || (input.overview && input.overview.stats) || {};
    const findStat = (pattern) => {
      for (const key of Object.keys(stats)) {
        if (pattern.test(key)) return stats[key];
      }
      return '';
    };

    // 4. MarketCap ($B)
    const rawMktCap = input.marketCap || (input.overview && input.overview.marketCap) || findStat(/Market cap|市值/i);
    const marketCap = cleanMarketCap(rawMktCap);

    // 5. TargetPrice 與完整統計量
    const rawTarget = input.targetPrice ||
      (input.analyst && (input.analyst.targets || input.analyst.targetMedian)) ||
      (input.analysis && input.analysis.targetPrice && input.analysis.targetPrice.median) ||
      findStat(/Target price|Price target|目標價/i);

    const targetStats = calculateTargetPriceStats(
      (input.analysis && input.analysis.targetPrice) || input.targetPrice || input.analyst || rawTarget,
      price
    );
    const targetPrice = targetStats.median > 0 ? targetStats.median : cleanNumber(rawTarget);

    // 6. Beta
    const rawBeta = input.beta || (input.overview && input.overview.beta) || findStat(/Beta|貝他值/i);
    const beta = parseFloat(cleanNumber(rawBeta).toFixed(2));

    // 7. 52-week range / low / high
    const rawRange = input.range52w || (input.overview && input.overview.range52w) || findStat(/52-wk range|52-week range|52 週範圍|52週範圍/i);
    const rawLow = input.low52 || (input.overview && input.overview.low52) || findStat(/52-wk low|52-week low|52 週最低|52週最低/i);
    const rawHigh = input.high52 || (input.overview && input.overview.high52) || findStat(/52-wk high|52-week high|52 週最高|52週最高/i);
    
    const range52w = cleanRange52w(rawRange, rawLow, rawHigh);
    const rangeParts = range52w.split('-').map((s) => cleanNumber(s));
    const low52 = rangeParts[0] || 0;
    const high52 = rangeParts[1] || 0;

    // 8. EPS Actual & Est
    const rawEpsAct = input.latestEpsActual !== undefined
      ? input.latestEpsActual
      : ((input.earnings && (input.earnings.epsActual || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsActual))) || '');
    const rawEpsEst = input.latestEpsEst !== undefined
      ? input.latestEpsEst
      : ((input.earnings && (input.earnings.epsEstimate || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsEstimate))) || '');
    const latestEpsActual = cleanNumber(rawEpsAct);
    const latestEpsEst = cleanNumber(rawEpsEst);

    // 9. EPS Surprise
    let epsSurprise = 0;
    const rawSurprise = input.epsSurprise !== undefined
      ? input.epsSurprise
      : (input.earnings && (input.earnings.epsSurprise || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsSurprise)));
    if (rawSurprise !== undefined && rawSurprise !== '' && rawSurprise !== 'N/A') {
      epsSurprise = cleanPercentage(rawSurprise);
    } else if (rawEpsAct !== undefined && rawEpsEst !== undefined && (latestEpsActual !== 0 || latestEpsEst !== 0)) {
      epsSurprise = calcEpsSurprise(latestEpsActual, latestEpsEst);
    }

    // 10. YoY Revenue Growth
    const rawYoy = input.yoy !== undefined
      ? input.yoy
      : (input.earnings && (input.earnings.yoy || (input.earnings.latestQuarter && input.earnings.latestQuarter.yoy)));
    const yoy = cleanPercentage(rawYoy);

    return {
      ticker,
      price,
      marketCap,
      targetPrice,
      targetPriceStats: targetStats,
      targetMean: targetStats.mean,
      targetMedian: targetStats.median,
      targetHigh: targetStats.high,
      targetLow: targetStats.low,
      targetUpside: targetStats.upsidePercent,
      targetStdDev: targetStats.stdDev,
      targetCv: targetStats.cv,
      beta,
      range52w,
      low52,
      high52,
      latestEpsActual,
      latestEpsEst,
      epsSurprise,
      yoy
    };
  }

  // 匯出至全域命名空間與模組導出
  const exportTarget = {
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
    global.CrawlerSanitizer = exportTarget;
  }
  if (typeof window !== 'undefined') {
    window.CrawlerSanitizer = exportTarget;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportTarget;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
