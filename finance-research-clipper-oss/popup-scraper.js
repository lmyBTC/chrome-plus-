/**
 * popup-scraper.js - Finance Research Clipper DOM 資料擷取核心模組
 * 負責從 Google Finance 與 AI 對話頁面擷取結構化資訊 (Overview, Earnings, Financials, AI Dialogue)
 */

// 預設 DOM 選擇器常數
const DOM_SELECTORS = {
  price: ['.N6SYTe', 'span[jsname="Pdsbrc"]', '.YMlKvd', '.fxKb7e'],
  aiUser: '[jsname="Ldp1ib"]',
  aiSys: '[jsname="lKYlId"]'
};

/**
 * AI 對話擷取邏輯 (針對 Beta 版研究面板)
 * @param {Object} selectors 選擇器定義
 * @returns {Object} 包含 dialogueArr 的物件
 */
function scrapeAIDialogue(selectors) {
  let dialogueArr = [];
  try {
    const panel = document.querySelector('[aria-label="研究面板"]');
    if (panel) {
      const items = Array.from(panel.querySelectorAll(`${selectors.aiUser}, ${selectors.aiSys}`));
      
      dialogueArr = items.map(el => {
        const isUser = el.matches(selectors.aiUser);
        let text = el.innerText.trim();
        if (isUser) {
          text = text.replace(/\d{1,2}:\d{2}\s?(?:AM|PM)$|May\s\d{1,2}.*$/i, '').trim();
        } else {
          // 智能表格轉換
          const lines = text.split('\n');
          let formatted = "";
          let tableRows = [];
          for (let line of lines) {
            const match = line.match(/^\d+\.\s+([^：:]+)[：:](.+)$/);
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
          text = formatted.trim();
        }
        return { role: isUser ? 'user' : 'ai', text: text };
      });
    }
  } catch (e) {
    console.error("AI Scraper Error:", e);
  }
  return { dialogueArr: dialogueArr };
}

/**
 * 股票行情數據擷取邏輯 (當前頁面簡易行情)
 * @param {Object} selectors 選擇器定義
 * @returns {Object} { ticker, price, keyStats, error }
 */
function scrapeFinanceData(selectors) {
  let ticker = "";
  let price = "";
  let keyStats = {};
  let error = false;

  try {
    // 1. Ticker & Price
    const tickerAttr = document.querySelector('[data-ticker-id]');
    ticker = tickerAttr ? tickerAttr.getAttribute('data-ticker-id') : (window.location.pathname.match(/\/quote\/([A-Z0-9_.:-]+)/i)?.[1] || "");
    
    const priceSelectors = selectors.price;
    for (const s of priceSelectors) {
      const el = document.querySelector(s);
      if (el && el.innerText) {
        price = el.innerText.replace(/[^0-9.,$¥€]/g, '').trim();
        if (price) break;
      }
    }

    // 2. 智能標籤掃描 (針對進階數據，過濾 arrow_upward 等圖示干擾)
    document.querySelectorAll('div').forEach(el => {
      if (el.innerText && el.innerText.includes('\n') && el.children.length >= 2) {
        const lines = el.innerText.split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !/^(arrow_upward|arrow_downward|arrow_drop_up|arrow_drop_down|info|help)$/i.test(s));
        if (lines.length === 2 && lines[1].match(/[0-9]/)) {
          keyStats[lines[0]] = lines[1];
        }
      }
    });

  } catch (e) {
    console.error("DOM Scraper Error:", e);
    error = true;
  }

  return {
    ticker: (ticker || "未知標的").toUpperCase(),
    price: price || "未知價格",
    keyStats: keyStats,
    error: error || (!ticker || !price)
  };
}

/**
 * 從 Overview 頁面 DOM 解析基本面與股價
 * @param {Document} doc DOM 物件
 * @param {Object} selectors 選擇器定義
 * @returns {Object} { ticker, price, keyStats, error }
 */
function scrapeOverviewDOM(doc, selectors) {
  let ticker = "";
  let price = "";
  let keyStats = {};
  let error = false;

  try {
    const tickerAttr = doc.querySelector('[data-ticker-id]');
    if (tickerAttr) {
      ticker = tickerAttr.getAttribute('data-ticker-id');
    }
    
    const priceSelectors = selectors.price;
    for (const s of priceSelectors) {
      const el = doc.querySelector(s);
      if (el && el.innerText) {
        price = el.innerText.replace(/[^0-9.,$¥€]/g, '').trim();
        if (price) break;
      }
    }

    doc.querySelectorAll('div').forEach(el => {
      if (el.innerText && el.innerText.includes('\n') && el.children.length >= 2) {
        const lines = el.innerText.split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !/^(arrow_upward|arrow_downward|arrow_drop_up|arrow_drop_down|info|help)$/i.test(s));
        if (lines.length === 2 && lines[1].match(/[0-9]/)) {
          keyStats[lines[0]] = lines[1];
        }
      }
    });
  } catch (e) {
    console.error("Overview DOM Scraper Error:", e);
    error = true;
  }

  return {
    ticker: ticker ? ticker.toUpperCase() : "",
    price: price || "",
    keyStats: keyStats,
    error: error
  };
}

/**
 * 從 Earnings 頁面 DOM 解析會計期間、EPS/營收數據與 AI 資訊一覽
 * @param {Document} doc DOM 物件
 * @returns {Object} { period, eps, revenue, insights }
 */
function scrapeEarningsDOM(doc) {
  let period = "N/A";
  let epsStr = "N/A";
  let revStr = "N/A";
  let insights = [];

  try {
    // 1. 會計期間
    doc.querySelectorAll('div').forEach(el => {
      if (el.innerText && el.innerText.includes('會計期間') && el.innerText.includes('\n')) {
        const lines = el.innerText.split('\n');
        const idx = lines.indexOf('會計期間');
        if (idx !== -1 && lines[idx + 1]) {
          period = lines[idx + 1].trim();
        }
      }
    });

    // 2. EPS (實值 vs 預估)
    doc.querySelectorAll('div').forEach(el => {
      if (el.innerText && (el.innerText.includes('每股盈餘/預估值') || el.innerText.includes('每股盈余/预估值')) && el.innerText.includes('\n')) {
        const lines = el.innerText.split('\n');
        const idx = lines.findIndex(l => l.includes('每股盈餘/預估值') || l.includes('每股盈余/预估值'));
        if (idx !== -1) {
          const valLine = lines[idx + 1] || "";
          const diffLine = lines[idx + 2] || "";
          epsStr = `${valLine.trim()} (${diffLine.trim()})`.replace(/\s+/g, ' ');
        }
      }
    });

    // 3. 收益 (實值 vs 預估)
    doc.querySelectorAll('div').forEach(el => {
      if (el.innerText && el.innerText.includes('收益/預估值') && el.innerText.includes('\n')) {
        const lines = el.innerText.split('\n');
        const idx = lines.findIndex(l => l.includes('收益/預估值'));
        if (idx !== -1) {
          const valLine = lines[idx + 1] || "";
          const diffLine = lines[idx + 2] || "";
          revStr = `${valLine.trim()} (${diffLine.trim()})`.replace(/\s+/g, ' ');
        }
      }
    });

    // 4. 資訊一覽 (AI Insights)
    let hasInsightsHeader = false;
    doc.querySelectorAll('div, h2, h3').forEach(el => {
      if (el.innerText && (el.innerText.trim() === '資訊一覽' || el.innerText.trim() === '资讯一览')) {
        hasInsightsHeader = true;
      }
    });

    doc.querySelectorAll('div').forEach(el => {
      if (el.children.length === 2 && el.children[0].tagName === 'DIV' && el.children[1].tagName === 'DIV') {
        const title = el.children[0].innerText.trim();
        const desc = el.children[1].innerText.trim();
        if (title.length > 3 && title.length < 40 && desc.length > 15 && desc.length < 500) {
          if (desc.includes('美金') || desc.includes('美元') || desc.includes('億') || desc.includes('%') || desc.includes('增') || desc.includes('營收') || desc.includes('預估') || desc.includes('季度')) {
            const itemStr = `- **${title}**：${desc}`;
            if (!insights.includes(itemStr)) {
              insights.push(itemStr);
            }
          }
        }
      }
    });
  } catch (e) {
    console.error("Earnings DOM Scraper Error:", e);
  }

  return {
    period: period,
    eps: epsStr,
    revenue: revStr,
    insights: insights.slice(0, 8)
  };
}

/**
 * 從 Financials 損益表頁面解析最近四季數據，轉成 Markdown 表格
 * @param {Document} doc DOM 物件
 * @returns {string} Markdown 表格字串
 */
function scrapeFinancialsDOM(doc) {
  let markdownTable = "N/A";
  try {
    const tableEl = doc.querySelector('table');
    if (tableEl) {
      const rows = Array.from(tableEl.querySelectorAll('tr'));
      if (rows.length > 0) {
        let headers = [];
        let dataRows = [];
        
        const firstRowCells = Array.from(rows[0].querySelectorAll('th, td'));
        headers = firstRowCells.map(c => c.innerText.trim().replace(/\n/g, ' ')).filter(Boolean);
        
        if (headers.length > 0) {
          if (headers.length === firstRowCells.length - 1) {
            headers.unshift("財務項目");
          }
          
          for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('td, th')).map(c => c.innerText.trim().replace(/\n/g, ' '));
            if (cells.length > 0 && cells[0]) {
              dataRows.push(cells);
            }
          }
          
          if (dataRows.length > 0) {
            let md = "";
            md += `| ${headers.join(' | ')} |\n`;
            md += `| ${headers.map(() => ':---').join(' | ')} |\n`;
            dataRows.forEach(row => {
              const rowCells = [...row];
              while (rowCells.length < headers.length) rowCells.push("-");
              md += `| ${rowCells.slice(0, headers.length).join(' | ')} |\n`;
            });
            markdownTable = md.trim();
          }
        }
      }
    }
    
    // Fallback 對於 div/role 表格的處理
    if (markdownTable === "N/A") {
      const flexTable = doc.querySelector('[role="table"]');
      if (flexTable) {
        const rows = Array.from(flexTable.querySelectorAll('[role="row"]'));
        if (rows.length > 0) {
          let headers = [];
          let dataRows = [];
          
          const firstRowCells = Array.from(rows[0].querySelectorAll('[role="columnheader"], [role="cell"]'));
          headers = firstRowCells.map(c => c.innerText.trim().replace(/\n/g, ' ')).filter(Boolean);
          
          if (headers.length === firstRowCells.length - 1) {
            headers.unshift("財務項目");
          }

          for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].querySelectorAll('[role="cell"]')).map(c => c.innerText.trim().replace(/\n/g, ' '));
            if (cells.length > 0 && cells[0]) {
              dataRows.push(cells);
            }
          }
          
          if (headers.length > 0 && dataRows.length > 0) {
            let md = "";
            md += `| ${headers.join(' | ')} |\n`;
            md += `| ${headers.map(() => ':---').join(' | ')} |\n`;
            dataRows.forEach(row => {
              const rowCells = [...row];
              while (rowCells.length < headers.length) rowCells.push("-");
              md += `| ${rowCells.slice(0, headers.length).join(' | ')} |\n`;
            });
            markdownTable = md.trim();
          }
        }
      }
    }
  } catch (e) {
    console.error("Financials DOM Scraper Error:", e);
  }
  return markdownTable;
}
