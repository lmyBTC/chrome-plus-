/**
 * popup-export.js - Finance Research Clipper 資料匯出與處理模組
 * 負責文字清理規則引擎、圖片壓縮、格式轉換 (Markdown/CSV) 與檔案下載
 */

/**
 * HTML 跳脫輔助函數 (XSS 防護)
 * @param {string} str 輸入字串
 * @returns {string} 跳脫後的字串
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 圖片等比例壓縮函式 (Canvas)
 * @param {string} base64Str 原始 base64 圖片
 * @param {number} maxWidth 最大寬度
 * @param {number} quality 壓縮品質 (0.1 ~ 1.0)
 * @returns {Promise<string>} 壓縮後的 base64 jpeg
 */
function compressImage(base64Str, maxWidth = 800, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
}

/**
 * 智能文字清理與提取規則引擎 (Rule Engine)
 */
const RuleEngine = {
  rules: [
    {
      name: "ruleDisclaimer",
      exec: (text) => {
        if (!text) return "";
        const disclaimers = [
          // 繁體中文免責聲明
          /投資有風險[，,詢]?[投資人]?應?審慎評估/g,
          /本[文分析報]僅供參考[，,]?不構成任何?投資建議/g,
          /我只是一個?AI[助機]?.*?。/g,
          /我無法提供個人化的投資建議.*?。/g,
          // 簡體中文免責聲明
          /投资有风险[，,]?[投资人]?应?审慎评估/g,
          /本[文分析报]仅供参考[，,]?不构成任何?投资建议/g,
          // 常見開場白
          /^(好的[，,]?以下是為您整理的.*?：|沒問題[，,]?以下是.*?：|以下是.*?：)/i
        ];
        let processed = text;
        disclaimers.forEach(p => processed = processed.replace(p, ''));
        return processed.trim();
      }
    },
    {
      name: "ruleTableizer",
      exec: (text) => {
        if (!text) return "";
        // 增強型表格轉換：自動將對話中「1. 項目：數據」或「- 項目 - 數據」轉換為 Markdown Table
        const lines = text.split('\n');
        let formatted = "";
        let tableRows = [];
        
        for (let line of lines) {
          const match = line.trim().match(/^(?:\d+\.|\*|-)\s+([^：:-]+)[：:-]\s*(.+)$/);
          if (match) {
            tableRows.push(`| ${match[1].trim()} | ${match[2].trim()} |`);
          } else {
            if (tableRows.length > 0) {
              formatted += `\n| 項目 | 數據 |\n| :--- | :--- |\n${tableRows.join('\n')}\n\n`;
              tableRows = [];
            }
            formatted += line + '\n';
          }
        }
        if (tableRows.length > 0) {
          formatted += `\n| 項目 | 數據 |\n| :--- | :--- |\n${tableRows.join('\n')}\n\n`;
        }
        return formatted.trim();
      }
    },
    {
      name: "ruleExtractor",
      extractTicker: (text) => {
        if (!text) return null;
        // 尋找 $AAPL 或 $aapl 格式
        let match = text.match(/\$([A-Z]{1,5})\b/i);
        if (match) return match[1].toUpperCase();

        // 尋找 2330.TW 或 2330.tw 格式
        match = text.match(/\b(\d{4})\.(?:TW|tw)\b/);
        if (match) return `${match[1]}.TW`;

        // 尋找對話中常提及的美股代號大寫字元字串 (AAPL, TSLA, NVDA 等)
        match = text.match(/\b(AAPL|MSFT|TSLA|NVDA|AMZN|GOOGL|GOOG|META|NFLX|AMD|INTC)\b/);
        if (match) return match[1];

        return null;
      },
      extractSentiment: (text) => {
        if (!text) return "中性";
        const bullishWords = ["看多", "看好", "優於預期", "強勁", "增長", "買進", "突破", "利多", "上行", "bullish"];
        const bearishWords = ["看空", "看淡", "低於預期", "疲弱", "衰退", "賣出", "跌破", "利空", "下行", "bearish"];
        
        let bullScore = 0;
        let bearScore = 0;
        
        bullishWords.forEach(w => {
          const matches = text.match(new RegExp(w, 'g'));
          if (matches) bullScore += matches.length;
        });
        
        bearishWords.forEach(w => {
          const matches = text.match(new RegExp(w, 'g'));
          if (matches) bearScore += matches.length;
        });
        
        if (bullScore > bearScore) return "看多";
        if (bearScore > bullScore) return "看空";
        return "中性";
      }
    }
  ],
  processText: (text, activeRules) => {
    let result = text;
    RuleEngine.rules.forEach(rule => {
      if (activeRules[rule.name] && typeof rule.exec === 'function') {
        result = rule.exec(result);
      }
    });
    return result;
  }
};

/**
 * 檔案下載輔助函式 (包含 UTF-8 BOM 防亂碼)
 * @param {string} content 檔案內容
 * @param {string} filename 存檔檔名
 * @param {string} mimeType 檔案類型 MIME
 */
function downloadFile(content, filename, mimeType) {
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 格式化輸出 Markdown 內容
 * @param {Object} p Payload 資料物件
 * @returns {string} Markdown 字串
 */
function formatMarkdownContent(p) {
  let mdContent = `# ${p.ticker} 投資筆記\n\n`;
  mdContent += `**現價**: ${p.price}\n`;
  mdContent += `**時間**: ${p.timestamp}\n\n`;
  mdContent += `## 核心筆記\n${p.note}\n`;
  return mdContent;
}

/**
 * 格式化輸出 CSV 內容
 * @param {Object} p Payload 資料物件
 * @returns {string} CSV 字串
 */
function formatCsvContent(p) {
  const sp500 = p.sp500 || "N/A";
  const nasdaq = p.nasdaq || "N/A";
  const mktcap = p.mktcap || "N/A";
  const pe = p.pe || "N/A";
  const consensus = p.analyst_consensus || "N/A";
  const targetPrice = p.target_price_median || "N/A";
  const cleanNote = (p.note || "").replace(/"/g, '""'); // CSV 內雙引號跳脫
  let csvContent = `Timestamp,Ticker,Price,Consensus,TargetPrice,Note,S&P500,Nasdaq,MarketCap,PE\n`;
  csvContent += `"${p.timestamp}","${p.ticker}","${p.price}","${consensus}","${targetPrice}","${cleanNote}","${sp500}","${nasdaq}","${mktcap}","${pe}"\n`;
  return csvContent;
}
/**
 * 純數字鐵律與 AI 礦企單位正規化函式 (SSOT Sanitizer)
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

function cleanMarketCap(val) {
  if (typeof val === 'number') {
    if (val > 100000) return parseFloat((val / 1e9).toFixed(3));
    return val;
  }
  if (!val || typeof val !== 'string') return 0;
  const str = val.trim().toUpperCase();
  const rawNum = cleanNumber(str);
  if (str.includes('T')) return parseFloat((rawNum * 1000).toFixed(3));
  if (str.includes('B') || str.includes('十億') || str.includes('10億')) return parseFloat(rawNum.toFixed(3));
  if (str.includes('M') || str.includes('百萬')) return parseFloat((rawNum / 1000).toFixed(3));
  if (str.includes('K') || str.includes('千')) return parseFloat((rawNum / 1e6).toFixed(3));
  if (rawNum > 100000) return parseFloat((rawNum / 1e9).toFixed(3));
  return parseFloat(rawNum.toFixed(3));
}

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

function calcEpsSurprise(actual, estimate) {
  const act = cleanNumber(actual);
  const est = cleanNumber(estimate);
  if (isNaN(act) || isNaN(est)) return 0;
  if (est === 0) return act > 0 ? 100 : (act < 0 ? -100 : 0);
  const surprise = ((act - est) / Math.abs(est)) * 100;
  return parseFloat(surprise.toFixed(1));
}

function cleanPercentage(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val || typeof val !== 'string') return 0;
  return cleanNumber(val);
}

function sanitizeToMinerSchema(input) {
  if (typeof FinanceCrawler !== 'undefined' && typeof FinanceCrawler.sanitizeToMinerSchema === 'function') {
    return FinanceCrawler.sanitizeToMinerSchema(input);
  }
  if (!input || typeof input !== 'object') return {};

  let ticker = (input.ticker || input.symbol || (input.overview && input.overview.symbol) || '').toUpperCase().trim();
  if (ticker.includes(':')) ticker = ticker.split(':').pop();

  const rawPrice = input.price !== undefined ? input.price : (input.overview && input.overview.price);
  const price = cleanNumber(rawPrice);

  const stats = input.stats || (input.overview && input.overview.stats) || {};
  const findStat = (pattern) => {
    for (const key of Object.keys(stats)) {
      if (pattern.test(key)) return stats[key];
    }
    return '';
  };

  const rawMktCap = input.marketCap || (input.overview && input.overview.marketCap) || findStat(/Market cap|市值/i);
  const marketCap = cleanMarketCap(rawMktCap);

  const rawTarget = input.targetPrice ||
    (input.analyst && input.analyst.targetMedian) ||
    (input.analysis && input.analysis.targetPrice && input.analysis.targetPrice.median) ||
    findStat(/Target price|Price target|目標價/i);
  const targetPrice = cleanNumber(rawTarget);

  const rawBeta = input.beta || (input.overview && input.overview.beta) || findStat(/Beta|貝他值/i);
  const beta = parseFloat(cleanNumber(rawBeta).toFixed(2));

  const rawRange = input.range52w || (input.overview && input.overview.range52w) || findStat(/52-wk range|52-week range|52 週範圍|52週範圍/i);
  const rawLow = input.low52 || (input.overview && input.overview.low52) || findStat(/52-wk low|52-week low|52 週最低|52週最低/i);
  const rawHigh = input.high52 || (input.overview && input.overview.high52) || findStat(/52-wk high|52-week high|52 週最高|52週最高/i);
  
  const range52w = cleanRange52w(rawRange, rawLow, rawHigh);
  const rangeParts = range52w.split('-').map((s) => cleanNumber(s));
  const low52 = rangeParts[0] || 0;
  const high52 = rangeParts[1] || 0;

  const rawEpsAct = input.latestEpsActual !== undefined
    ? input.latestEpsActual
    : ((input.earnings && (input.earnings.epsActual || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsActual))) || '');
  const rawEpsEst = input.latestEpsEst !== undefined
    ? input.latestEpsEst
    : ((input.earnings && (input.earnings.epsEstimate || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsEstimate))) || '');
  const latestEpsActual = cleanNumber(rawEpsAct);
  const latestEpsEst = cleanNumber(rawEpsEst);

  let epsSurprise = 0;
  const rawSurprise = input.epsSurprise !== undefined
    ? input.epsSurprise
    : (input.earnings && (input.earnings.epsSurprise || (input.earnings.latestQuarter && input.earnings.latestQuarter.epsSurprise)));
  if (rawSurprise !== undefined && rawSurprise !== '' && rawSurprise !== 'N/A') {
    epsSurprise = cleanPercentage(rawSurprise);
  } else if (rawEpsAct !== undefined && rawEpsEst !== undefined && (latestEpsActual !== 0 || latestEpsEst !== 0)) {
    epsSurprise = calcEpsSurprise(latestEpsActual, latestEpsEst);
  }

  const rawYoy = input.yoy !== undefined
    ? input.yoy
    : (input.earnings && (input.earnings.yoy || (input.earnings.latestQuarter && input.earnings.latestQuarter.yoy)));
  const yoy = cleanPercentage(rawYoy);

  return {
    ticker,
    price,
    marketCap,
    targetPrice,
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

if (typeof window !== 'undefined') {
  window.cleanNumber = cleanNumber;
  window.cleanMarketCap = cleanMarketCap;
  window.cleanRange52w = cleanRange52w;
  window.calcEpsSurprise = calcEpsSurprise;
  window.cleanPercentage = cleanPercentage;
  window.sanitizeToMinerSchema = sanitizeToMinerSchema;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    compressImage,
    RuleEngine,
    downloadFile,
    formatMarkdownContent,
    formatCsvContent,
    cleanNumber,
    cleanMarketCap,
    cleanRange52w,
    calcEpsSurprise,
    cleanPercentage,
    sanitizeToMinerSchema
  };
}
