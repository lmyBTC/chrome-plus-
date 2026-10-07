/**
 * googleSheetsExporter.js - Finance Research Clipper Google Sheets 估值沙盒同步器
 * 
 * 專案定位：
 * 負責將 FinanceClipper 採集之個股數據（代碼、名稱、現價、P/E、殖利率、目標價）
 * 與 Gemini Nano 萃取之核心/反常識論點，結構化同步至 Google Sheets ("Portfolio_Tracking")。
 * 
 * 符合規範：
 * 1. 零構建原生 Vanilla JS (ES6+)，相容瀏覽器全域物件與 CommonJS/Node 測試。
 * 2. 邊界防腐 (Sanitization)：嚴格白名單與防呆降級，杜絕跨插件髒資料。
 * 3. 逾時保險絲 (Circuit Breaker)：10 秒超時中斷，網路異常不卡死 UI。
 * 4. 冪等設計：支援代碼 (ticker) 智慧比對覆蓋更新或新增列。
 * 
 * @version 1.0.0
 * @date 2026-10-08
 */

(function (window) {
  'use strict';

  const DEFAULT_TIMEOUT_MS = 10000;

  /**
   * 數值防呆清洗器
   */
  function sanitizeString(val, maxLen = 500) {
    if (val === undefined || val === null) return '';
    return String(val).trim().slice(0, maxLen);
  }

  /**
   * 萃取殖利率字串 (支援多國語言與欄位名稱)
   */
  function extractYield(stock) {
    if (!stock) return '';
    if (stock.yield) return sanitizeString(stock.yield, 30);
    const stats = stock.stats || stock.keyStats || {};
    const yieldKeys = ['殖利率', '股息殖利率', '殖利率(%)', 'Dividend yield', 'Dividend yield (annualized)'];
    for (const k of yieldKeys) {
      if (stats[k]) return sanitizeString(stats[k], 30);
    }
    return '';
  }

  /**
   * 萃取本益比字串 (P/E ratio)
   */
  function extractPe(stock) {
    if (!stock) return '';
    if (stock.pe) return sanitizeString(stock.pe, 30);
    const stats = stock.stats || stock.keyStats || {};
    const peKeys = ['本益比', '本益比(PE)', 'P/E ratio', 'PE ratio', 'P/E'];
    for (const k of peKeys) {
      if (stats[k]) return sanitizeString(stats[k], 30);
    }
    return '';
  }

  /**
   * 萃取分析師目標價 (中位數或主要目標價)
   */
  function extractTargetPrice(stock) {
    if (!stock) return '';
    if (stock.targetPrice !== undefined && stock.targetPrice !== '') {
      return sanitizeString(stock.targetPrice, 30);
    }
    if (stock.target_price_median && stock.target_price_median !== 'N/A') {
      return sanitizeString(stock.target_price_median, 30);
    }
    if (stock.analyst) {
      const an = stock.analyst;
      if (an.targetMedian && an.targetMedian !== 'N/A') return sanitizeString(an.targetMedian, 30);
      if (an.targetPrice) {
        if (typeof an.targetPrice === 'object') {
          return sanitizeString(an.targetPrice.median || an.targetPrice.high || '', 30);
        }
        return sanitizeString(an.targetPrice, 30);
      }
    }
    if (stock.analystTargetPrice) return sanitizeString(stock.analystTargetPrice, 30);
    return '';
  }

  /**
   * 萃取 Gemini Nano 反常識論點與核心研報摘要
   */
  function extractCoreDigest(stock, userNote = '') {
    const parts = [];

    // 1. 若有自訂筆記，置於首位
    const cleanNote = sanitizeString(userNote, 2000);
    if (cleanNote) {
      parts.push(`【自訂觀點】${cleanNote}`);
    }

    // 2. 分析師評級
    if (stock.analyst && stock.analyst.consensus) {
      parts.push(`【共識評級】${stock.analyst.consensus}`);
    } else if (stock.analyst_consensus && stock.analyst_consensus !== 'N/A') {
      parts.push(`【共識評級】${stock.analyst_consensus}`);
    }

    // 3. 萃取 AI Summary (包含 Nano 反常識與多空觀點)
    const aiSummary = stock.aiSummary || stock.currentAiSummary;
    if (aiSummary) {
      if (typeof aiSummary === 'string') {
        parts.push(`【AI 摘要】${sanitizeString(aiSummary, 1000)}`);
      } else if (typeof aiSummary === 'object') {
        if (aiSummary.counterIntuitive) {
          parts.push(`【反常識論點】${sanitizeString(aiSummary.counterIntuitive, 500)}`);
        }
        if (aiSummary.bullCase) {
          parts.push(`【多方論點】${sanitizeString(aiSummary.bullCase, 500)}`);
        }
        if (aiSummary.bearCase) {
          parts.push(`【空方論點】${sanitizeString(aiSummary.bearCase, 500)}`);
        }
        if (aiSummary.rawMarkdown && !aiSummary.counterIntuitive && !aiSummary.bullCase) {
          parts.push(`【AI 研報精要】${sanitizeString(aiSummary.rawMarkdown, 800)}`);
        }
      }
    }

    // 4. 若無 AI Summary 但有 stock.note 且未被當成 userNote
    if (!cleanNote && stock.note && typeof stock.note === 'string') {
      parts.push(sanitizeString(stock.note, 1500));
    }

    return parts.join('\n\n');
  }

  /**
   * 建立結構化 Portfolio Payload (純函數資料防腐層)
   */
  function buildPortfolioPayload(stock, options = {}) {
    if (!stock || typeof stock !== 'object') {
      throw new Error('無效的個股數據物件 (stock is required)');
    }

    const ticker = String(stock.ticker || '').trim().toUpperCase();
    if (!ticker || ticker === 'UNKNOWN') {
      throw new Error('缺少有效的個股代碼 (ticker is required)');
    }

    const name = sanitizeString(stock.name || stock.companyName || ticker, 100);
    const price = sanitizeString(stock.price, 30);
    const pe = extractPe(stock);
    const yieldVal = extractYield(stock);
    const targetPrice = extractTargetPrice(stock);
    const digest = extractCoreDigest(stock, options.userNote || '');

    const coreData = {
      ticker: ticker,
      name: name,
      price: price,
      pe: pe,
      yield: yieldVal,
      targetPrice: targetPrice,
      notes: digest,
      aiDigest: digest
    };

    return {
      protocolVersion: 2,
      action: 'SYNC_PORTFOLIO',
      type: 'SYNC_PORTFOLIO',
      secretToken: options.secretToken || undefined,
      timestamp: Date.now(),
      payload: coreData,
      // 外層平鋪相容舊版直接讀取根欄位之腳本
      ...coreData
    };
  }

  /**
   * 取得已設定之 GAS Webhook URL 與 Secret Token
   */
  function getGasConfig() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['gasUrl', 'appsScriptUrl', 'gasSecretToken'], (res) => {
          resolve({
            gasUrl: res.gasUrl || res.appsScriptUrl || '',
            secretToken: res.gasSecretToken || ''
          });
        });
      } else {
        resolve({ gasUrl: '', secretToken: '' });
      }
    });
  }

  /**
   * 發送 POST 請求至 GAS Webhook (具備 10 秒超時與錯誤捕捉)
   */
  async function sendToGasWebhook(gasUrl, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (!gasUrl) {
      throw new Error('未配置 Google Apps Script Webhook URL');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP 錯誤: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let jsonRes;
      try {
        jsonRes = JSON.parse(text);
      } catch (parseErr) {
        return {
          success: true,
          status: 'ok',
          rawResponse: text
        };
      }

      return {
        success: jsonRes.status === 'success' || jsonRes.success === true,
        ...jsonRes
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error(`傳輸逾時 (${timeoutMs / 1000} 秒)，請檢查網路或 GAS 服務狀態`);
      }
      throw err;
    }
  }

  /**
   * 同步單一個股資料至 Google Sheets 估值沙盒 ("Portfolio_Tracking")
   */
  async function syncSingleStock(stock, options = {}) {
    let gasUrl = options.gasUrl;
    let secretToken = options.secretToken;

    if (!gasUrl) {
      const config = await getGasConfig();
      gasUrl = config.gasUrl;
      if (!secretToken) secretToken = config.secretToken;
    }

    if (!gasUrl) {
      return {
        success: false,
        error: 'MISSING_GAS_URL',
        message: '尚未設定 Google Apps Script Webhook URL，請先前往設定面板完成配置。'
      };
    }

    try {
      const payload = buildPortfolioPayload(stock, {
        secretToken: secretToken,
        userNote: options.userNote
      });

      const result = await sendToGasWebhook(gasUrl, payload, options.timeoutMs || DEFAULT_TIMEOUT_MS);
      return {
        success: result.success,
        ticker: payload.payload.ticker,
        mode: result.mode || 'upserted',
        row: result.row,
        message: `成功同步 [${payload.payload.ticker}] 至 Google Sheets 投研沙盒！`,
        details: result
      };
    } catch (err) {
      return {
        success: false,
        ticker: stock ? stock.ticker : 'UNKNOWN',
        error: 'NETWORK_OR_SERVER_ERROR',
        message: `同步失敗: ${err.message}`
      };
    }
  }

  /**
   * 批次同步多檔個股資料至 Google Sheets
   */
  async function syncBatchStocks(stocks, options = {}) {
    if (!Array.isArray(stocks) || stocks.length === 0) {
      return {
        success: false,
        total: 0,
        successCount: 0,
        failedCount: 0,
        message: '無個股資料可同步'
      };
    }

    const config = await getGasConfig();
    const gasUrl = options.gasUrl || config.gasUrl;
    const secretToken = options.secretToken || config.secretToken;

    if (!gasUrl) {
      return {
        success: false,
        error: 'MISSING_GAS_URL',
        message: '尚未設定 Google Apps Script Webhook URL'
      };
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const stock of stocks) {
      try {
        const res = await syncSingleStock(stock, {
          gasUrl: gasUrl,
          secretToken: secretToken,
          timeoutMs: options.timeoutMs || 8000
        });
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
        }
        results.push(res);
      } catch (err) {
        failedCount++;
        results.push({
          success: false,
          ticker: stock.ticker,
          message: err.message
        });
      }
    }

    return {
      success: successCount > 0,
      total: stocks.length,
      successCount: successCount,
      failedCount: failedCount,
      results: results,
      message: `批次同步完成：成功 ${successCount} 檔，失敗 ${failedCount} 檔。`
    };
  }

  const GoogleSheetsExporter = {
    buildPortfolioPayload,
    syncSingleStock,
    syncBatchStocks,
    extractPe,
    extractYield,
    extractTargetPrice,
    extractCoreDigest,
    sendToGasWebhook
  };

  // 全域掛載
  if (typeof window !== 'undefined') {
    window.GoogleSheetsExporter = GoogleSheetsExporter;
  }
  if (typeof self !== 'undefined') {
    self.GoogleSheetsExporter = GoogleSheetsExporter;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleSheetsExporter;
  }

})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
