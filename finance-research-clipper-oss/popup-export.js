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
