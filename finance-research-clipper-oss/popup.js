/**
 * Chrome Extension V3: popup.js
 * 負責外掛彈出視窗與 Google Finance 網頁的通訊與 API 發送
 */

// Apps Script URL 將從 chrome.storage 中讀取
let APPS_SCRIPT_URL = "";

let currentMode = 'stock'; // 'stock' or 'ai'
let capturedAIDialogueArr = []; // 儲存對話陣列
let capturedKeyStats = {};
let capturedStockData = null; // 儲存完整的個股財報數據

// DOM_SELECTORS 定義於 popup-scraper.js 中

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status-bar');
  const submitBtn = document.getElementById('submit-btn');
  const noteEl = document.getElementById('note');
  const stockFields = document.getElementById('stock-fields');
  const aiFields = document.getElementById('ai-fields');
  const modeStockBtn = document.getElementById('mode-stock');
  const modeAIBtn = document.getElementById('mode-ai');
  const aiSelectorContainer = document.getElementById('ai-selector-container');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsUrl = document.getElementById('settings-url');
  const settingsSheetUrl = document.getElementById('settings-sheet-url');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const exportMdBtn = document.getElementById('export-md-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const copyPromptBtn = document.getElementById('copy-prompt-btn');
  const fullScrapeBtn = document.getElementById('full-scrape-btn');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  const btnGotoDashboard = document.getElementById('btn-goto-dashboard');
  const tickerInput = document.getElementById('ticker');

  // 廣播最新擷取標的至 chrome.storage.local
  const broadcastCapturedStock = (ticker, price = '', mode = currentMode) => {
    if (!ticker || ticker === 'UNKNOWN' || ticker === '讀取中...') return;
    const cleanTicker = ticker.trim().toUpperCase();
    if (!cleanTicker) return;
    const payload = {
      ticker: cleanTicker,
      price: price ? String(price).trim() : '',
      timestamp: Date.now(),
      mode: mode || 'stock'
    };
    chrome.storage.local.set({ lastCapturedStock: payload });
  };

  const handleOpenDashboard = () => {
    const ticker = tickerInput ? tickerInput.value.trim() : '';
    const validTicker = (ticker && ticker !== 'UNKNOWN' && ticker !== '讀取中...') ? ticker.toUpperCase() : '';

    if (validTicker) {
      chrome.tabs.create({ url: `dashboard.html?ticker=${encodeURIComponent(validTicker)}` });
    } else {
      chrome.tabs.create({ url: 'dashboard.html' });
    }
  };

  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }
  if (btnGotoDashboard) {
    btnGotoDashboard.addEventListener('click', handleOpenDashboard);
  }
  if (tickerInput) {
    tickerInput.addEventListener('change', (e) => {
      broadcastCapturedStock(e.target.value, document.getElementById('price')?.value || '', currentMode);
    });
  }

  // 0. 載入與設定 Storage 以及檢查右鍵暫存文字
  chrome.storage.local.get([
    'appsScriptUrl', 'gasUrl',
    'userSpreadsheetUrl', 'sheetsUrl',
    'contextNote', 'ruleDisclaimer', 'ruleTableizer', 'ruleExtractor'
  ], (result) => {
    if (result.contextNote) {
      noteEl.value = result.contextNote;
      chrome.storage.local.remove('contextNote');
    }
    const resolvedGasUrl = result.appsScriptUrl || result.gasUrl;
    if (resolvedGasUrl) {
      APPS_SCRIPT_URL = resolvedGasUrl;
      settingsUrl.value = APPS_SCRIPT_URL;
    } else {
      settingsPanel.style.display = 'block';
      updateStatus("請先設定 Google Apps Script URL", "orange");
      submitBtn.disabled = true;
    }
    const resolvedSheetsUrl = result.userSpreadsheetUrl || result.sheetsUrl;
    if (resolvedSheetsUrl) {
      settingsSheetUrl.value = resolvedSheetsUrl;
    }

    // 初始化規則開關狀態 (預設值皆為 true)
    document.getElementById('rule-disclaimer').checked = result.ruleDisclaimer !== false;
    document.getElementById('rule-tableizer').checked = result.ruleTableizer !== false;
    document.getElementById('rule-extractor').checked = result.ruleExtractor !== false;
  });

  // 實時監聽 Storage 設定變更（若從 Dashboard 修改能即時同步）
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.appsScriptUrl || changes.gasUrl) {
      const newGas = (changes.appsScriptUrl && changes.appsScriptUrl.newValue) || (changes.gasUrl && changes.gasUrl.newValue);
      if (newGas) {
        APPS_SCRIPT_URL = newGas;
        if (settingsUrl) settingsUrl.value = newGas;
        if (submitBtn) submitBtn.disabled = false;
      }
    }
    if (changes.userSpreadsheetUrl || changes.sheetsUrl) {
      const newSheets = (changes.userSpreadsheetUrl && changes.userSpreadsheetUrl.newValue) || (changes.sheetsUrl && changes.sheetsUrl.newValue);
      if (newSheets && settingsSheetUrl) {
        settingsSheetUrl.value = newSheets;
      }
    }
  });

  // 綁定規則開關變更事件，即時儲存至 chrome.storage.local
  ['rule-disclaimer', 'rule-tableizer', 'rule-extractor'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = e.target.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      chrome.storage.local.set({ [key]: e.target.checked });
    });
  });

  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
  });

  saveSettingsBtn.addEventListener('click', () => {
    const url = settingsUrl.value.trim();
    const sheetUrl = settingsSheetUrl.value.trim();
    if (!url.startsWith('https://script.google.com/')) {
      alert("請輸入有效的 Google Apps Script URL！");
      return;
    }
    chrome.storage.local.set({ 
      appsScriptUrl: url, 
      gasUrl: url,
      userSpreadsheetUrl: sheetUrl,
      sheetsUrl: sheetUrl 
    }, () => {
      APPS_SCRIPT_URL = url;
      settingsPanel.style.display = 'none';
      submitBtn.disabled = false;
      updateStatus("設定已儲存！", "green");
    });
  });

  // 全域快捷鍵：Ctrl+Enter 或 Cmd+Enter 送出表單
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (!submitBtn.disabled) submitBtn.click();
    }
  });

  // 採用本地預設 Selector，如需自訂請於 popup.js 的 DOM_SELECTORS 修改

  // 1. 模式切換邏輯
  modeStockBtn.addEventListener('click', () => switchMode('stock'));
  modeAIBtn.addEventListener('click', () => switchMode('ai'));

  function switchMode(mode) {
    currentMode = mode;
    if (mode === 'stock') {
      stockFields.style.display = 'block';
      aiFields.style.display = 'none';
      modeStockBtn.style.backgroundColor = 'var(--primary-color)';
      modeStockBtn.style.color = '#fff';
      modeAIBtn.style.backgroundColor = '#f1f3f4';
      modeAIBtn.style.color = 'var(--text-main)';
      fetchPageData(scrapeFinanceData);
    } else {
      stockFields.style.display = 'none';
      aiFields.style.display = 'block';
      modeAIBtn.style.backgroundColor = 'var(--primary-color)';
      modeAIBtn.style.color = '#fff';
      modeStockBtn.style.backgroundColor = '#f1f3f4';
      modeStockBtn.style.color = 'var(--text-main)';
      fetchPageData(scrapeAIDialogue);
    }
  }

  // 2. 查詢當前 active 的分頁
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url.includes("google.com/finance")) {
    fetchPageData(scrapeFinanceData);
  } else {
    updateStatus("請在 Google Finance 股票頁面啟動此工具。", "red");
    submitBtn.disabled = true;
    submitBtn.style.backgroundColor = "#dadce0";
  }

  async function fetchPageData(func) {
    updateStatus("正在擷取數據...", "orange");
    const activeRules = {
      ruleExtractor: document.getElementById('rule-extractor').checked
    };

    if (currentMode === 'stock') {
      try {
        const urlObj = new URL(tab.url);
        const baseURL = urlObj.origin + urlObj.pathname;

        updateStatus("⚡ 正在獲取進階財報數據...", "orange");

        const [overviewHtml, earningsHtml, financialsHtml] = await Promise.all([
          fetch(baseURL + "?tab=overview").then(r => r.text()),
          fetch(baseURL + "?tab=earnings").then(r => r.text()),
          fetch(baseURL + "?tab=financials").then(r => r.text())
        ]);

        const parser = new DOMParser();
        const overviewDoc = parser.parseFromString(overviewHtml, "text/html");
        const earningsDoc = parser.parseFromString(earningsHtml, "text/html");
        const financialsDoc = parser.parseFromString(financialsHtml, "text/html");

        // 執行 DOM 解析
        const overviewData = scrapeOverviewDOM(overviewDoc, DOM_SELECTORS);
        const earningsData = scrapeEarningsDOM(earningsDoc);
        const financialsData = scrapeFinancialsDOM(financialsDoc);

        // 合併數據
        capturedStockData = {
          ticker: overviewData.ticker || (baseURL.match(/\/quote\/([A-Z0-9_.:-]+)/i)?.[1] || "UNKNOWN").toUpperCase(),
          price: overviewData.price || "UNKNOWN",
          keyStats: overviewData.keyStats || {},
          earnings: earningsData,
          financialsTable: financialsData
        };

        // 回填至 UI 唯讀欄位
        document.getElementById('ticker').value = capturedStockData.ticker;
        document.getElementById('price').value = capturedStockData.price;
        capturedKeyStats = capturedStockData.keyStats;

        broadcastCapturedStock(capturedStockData.ticker, capturedStockData.price, 'stock');

        // 回填至進階財報與 AI 收益摺疊面板
        const previewEl = document.getElementById('financials-preview-content');
        renderStockPreviewBasic(previewEl, capturedStockData);

        updateStatus(overviewData.error ? "部分數據讀取失敗" : "數據與進階財報載入成功！", overviewData.error ? "orange" : "green");
      } catch (err) {
        console.error("Fetch/Scraping Multi-Tab Error:", err);
        updateStatus("擷取進階財報失敗，改用舊版 content script 擷取", "orange");
        // Fallback: 若 fetch 失敗，則回退到單頁 content script 抓取
        fallbackExecuteScript(func);
      }
    } else {
      // AI 模式維持原本 content script 抓取
      fallbackExecuteScript(func);
    }
  }

  function fallbackExecuteScript(func) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: func,
      args: [DOM_SELECTORS]
    }, (results) => {
      if (results && results[0] && results[0].result) {
        const data = results[0].result;
        if (currentMode === 'stock') {
          document.getElementById('ticker').value = data.ticker || "UNKNOWN";
          document.getElementById('price').value = data.price || "UNKNOWN";
          capturedKeyStats = data.keyStats || {};
          broadcastCapturedStock(data.ticker, data.price, 'stock');
          updateStatus(data.error ? "部分數據讀取失敗" : "數據載入成功！", data.error ? "orange" : "green");
        } else {
          capturedAIDialogueArr = data.dialogueArr || [];
          renderAISelector(capturedAIDialogueArr);
          
          if (capturedAIDialogueArr.length > 0) {
            let statusText = "AI 對話擷取成功！";
            const activeRules = {
              ruleExtractor: document.getElementById('rule-extractor').checked
            };
            if (activeRules.ruleExtractor) {
              const combinedText = capturedAIDialogueArr.map(item => item.text).join('\n');
              const extractor = RuleEngine.rules.find(r => r.name === 'ruleExtractor');
              const extractedTicker = extractor.extractTicker(combinedText);
              const extractedSentiment = extractor.extractSentiment(combinedText);
              
              if (extractedTicker) {
                statusText += ` (🧠 標的: ${extractedTicker} | 情緒: ${extractedSentiment})`;
                broadcastCapturedStock(extractedTicker, '', 'ai');
              } else {
                statusText += ` (🧠 情緒: ${extractedSentiment})`;
              }
            }
            updateStatus(statusText, "green");
          } else {
            updateStatus("請確認 AI 面板已開啟", "red");
          }
        }
      }
    });
  }

  // 3. SPA 4合1 動態走訪爬蟲調度
  async function executeFullStockCrawler() {
    if (!tab || !tab.id) {
      updateStatus("未偵測到分頁，請在 Google Finance 標的頁執行", "red");
      return;
    }

    if (fullScrapeBtn) {
      fullScrapeBtn.disabled = true;
      fullScrapeBtn.innerText = "⏳ 爬取中 (請勿關閉分頁)...";
    }
    updateStatus("⚡ 正在注入爬蟲模組並走訪 4 大分頁...", "orange");

    try {
      // 注入 crawler-sanitizer.js 與 crawler.js
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['crawler-sanitizer.js', 'crawler.js']
      });

      // 執行主調度器
      const resultsArr = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          if (!window.FinanceCrawler) {
            throw new Error("FinanceCrawler 未成功載入");
          }
          return await window.FinanceCrawler.runFullStockScraper();
        }
      });

      const fullData = resultsArr?.[0]?.result;
      if (!fullData) {
        throw new Error("未能取得爬取結果");
      }

      // 更新股票基本欄位
      if (fullData.overview) {
        if (fullData.overview.symbol) {
          document.getElementById('ticker').value = fullData.overview.symbol;
        }
        if (fullData.overview.price) {
          document.getElementById('price').value = fullData.overview.price;
        }
        if (fullData.overview.stats) {
          capturedKeyStats = { ...capturedKeyStats, ...fullData.overview.stats };
        }
      }

      // 合併完整數據
      capturedStockData = {
        ticker: document.getElementById('ticker').value || 'UNKNOWN',
        price: document.getElementById('price').value || 'UNKNOWN',
        keyStats: capturedKeyStats,
        analysis: fullData.analysis,
        earnings: fullData.earnings,
        financials: fullData.financials
      };

      broadcastCapturedStock(capturedStockData.ticker, capturedStockData.price, 'stock');

      // 渲染進階預覽面板
      const previewEl = document.getElementById('financials-preview-content');
      renderFullCrawlerPreview(previewEl, fullData);

      // 自動展開預覽折疊面板供使用者檢視
      const detailsEl = document.getElementById('financials-preview-details');
      if (detailsEl) detailsEl.open = true;

      updateStatus("🎉 4 大分頁數據擷取完成！", "green");
    } catch (err) {
      console.error("Execute Full Stock Crawler Error:", err);
      updateStatus(`❌ 爬取失敗: ${err.message}`, "red");
    } finally {
      if (fullScrapeBtn) {
        fullScrapeBtn.disabled = false;
        fullScrapeBtn.textContent = "";
        const iconSpan = document.createElement("span");
        iconSpan.textContent = "⚡";
        const textSpan = document.createElement("span");
        textSpan.textContent = " 一鍵完整抓取 (4合1 SPA)";
        fullScrapeBtn.append(iconSpan, textSpan);
      }
    }
  }

  function renderStockPreviewBasic(previewEl, stockData) {
    previewEl.textContent = "";
    let hasContent = false;

    if (stockData.earnings && stockData.earnings.period !== "N/A") {
      hasContent = true;
      const earningsBlock = document.createElement("div");

      const periodDiv = document.createElement("div");
      periodDiv.style.marginBottom = "8px";
      const periodB = document.createElement("b");
      periodB.textContent = "會計期間：";
      periodDiv.append(periodB, document.createTextNode(` ${stockData.earnings.period || ""}`));
      earningsBlock.appendChild(periodDiv);

      const epsDiv = document.createElement("div");
      epsDiv.style.marginBottom = "8px";
      const epsB = document.createElement("b");
      epsB.textContent = "EPS (實值 / 預期)：";
      epsDiv.append(epsB, document.createTextNode(` ${stockData.earnings.eps || ""}`));
      earningsBlock.appendChild(epsDiv);

      const revDiv = document.createElement("div");
      revDiv.style.marginBottom = "8px";
      const revB = document.createElement("b");
      revB.textContent = "營收 (實值 / 預期)：";
      revDiv.append(revB, document.createTextNode(` ${stockData.earnings.revenue || ""}`));
      earningsBlock.appendChild(revDiv);

      if (stockData.earnings.insights && stockData.earnings.insights.length > 0) {
        const insightsDiv = document.createElement("div");
        insightsDiv.style.marginBottom = "8px";
        const titleB = document.createElement("b");
        titleB.textContent = "💡 財報 AI 資訊一覽：";
        insightsDiv.append(titleB, document.createElement("br"));

        stockData.earnings.insights.forEach(item => {
          const rowDiv = document.createElement("div");
          rowDiv.style.cssText = "padding-left: 6px; margin-top: 4px; line-height: 1.3;";
          const match = item.match(/^- \*\*(.*?)\*\*：(.*)$/);
          if (match) {
            rowDiv.append(document.createTextNode("• "));
            const keyB = document.createElement("b");
            keyB.textContent = match[1];
            rowDiv.append(keyB, document.createTextNode(`: ${match[2]}`));
          } else {
            rowDiv.textContent = item;
          }
          insightsDiv.appendChild(rowDiv);
        });
        earningsBlock.appendChild(insightsDiv);
      }
      previewEl.appendChild(earningsBlock);
    }

    if (stockData.financialsTable && stockData.financialsTable !== "N/A") {
      hasContent = true;
      const finDiv = document.createElement("div");
      finDiv.style.cssText = "margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;";
      const titleB = document.createElement("b");
      titleB.textContent = "📊 損益表 (最近四季)：";
      const preEl = document.createElement("pre");
      preEl.style.cssText = "font-family: monospace; font-size: 9px; margin-top: 4px; overflow-x: auto; background: #f1f3f4; padding: 6px; border-radius: 4px; color: var(--text-main);";
      preEl.textContent = stockData.financialsTable;
      finDiv.append(titleB, document.createElement("br"), preEl);
      previewEl.appendChild(finDiv);
    }

    if (!hasContent) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.cssText = "padding: 4px; color: var(--text-sub);";
      emptyDiv.textContent = "未能抓取到相關的財報數據。";
      previewEl.appendChild(emptyDiv);
    }
  }

  function renderFullCrawlerPreview(previewEl, fullData) {
    previewEl.textContent = "";
    let hasContent = false;

    // 1. 分析師評級與目標價
    if (fullData.analysis && !fullData.analysis.error) {
      hasContent = true;
      const block = document.createElement("div");
      block.style.cssText = "margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;";

      const consensusB = document.createElement("b");
      consensusB.textContent = "🎯 分析師評級與共識：";
      block.append(consensusB, document.createTextNode(` ${fullData.analysis.consensus || '未提供'}`), document.createElement("br"));

      if (fullData.analysis.targetPrice?.median || fullData.analysis.targetPrice?.high) {
        const tpB = document.createElement("b");
        tpB.textContent = "🎯 目標價：";
        const median = fullData.analysis.targetPrice.median || '-';
        const high = fullData.analysis.targetPrice.high || '-';
        const low = fullData.analysis.targetPrice.low || '-';
        block.append(tpB, document.createTextNode(` 中位: ${median} | 最高: ${high} | 最低: ${low}`), document.createElement("br"));
      }

      if (fullData.analysis.ratingsSummary) {
        const summaryDiv = document.createElement("div");
        summaryDiv.style.cssText = "font-size: 10px; color: var(--text-sub); margin-top: 4px; max-height: 60px; overflow-y: auto;";
        summaryDiv.textContent = `${fullData.analysis.ratingsSummary.substring(0, 300)}...`;
        block.appendChild(summaryDiv);
      }
      previewEl.appendChild(block);
    }

    // 2. Earnings 表現
    if (fullData.earnings && !fullData.earnings.error) {
      const lq = fullData.earnings.latestQuarter;
      if (lq && (lq.epsActual !== 'N/A' || lq.revenueActual !== 'N/A')) {
        hasContent = true;
        const block = document.createElement("div");
        block.style.cssText = "margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;";

        const epsB = document.createElement("b");
        epsB.textContent = "📈 財報 EPS (實質 / 預期)：";
        block.append(epsB, document.createTextNode(` ${lq.epsActual} / ${lq.epsEstimate}`), document.createElement("br"));

        const revB = document.createElement("b");
        revB.textContent = "💰 營收 (實質 / 預期)：";
        block.append(revB, document.createTextNode(` ${lq.revenueActual} / ${lq.revenueEstimate}`), document.createElement("br"));

        previewEl.appendChild(block);
      }
    }

    // 3. Financials 報表表格
    if (fullData.financials?.statements?.length) {
      hasContent = true;
      const block = document.createElement("div");
      block.style.marginTop = "6px";
      const titleB = document.createElement("b");
      titleB.textContent = "📊 財務報表摘要：";
      block.append(titleB, document.createElement("br"));

      const pre = document.createElement("pre");
      pre.style.cssText = "font-family: monospace; font-size: 9px; margin-top: 4px; overflow-x: auto; background: #f1f3f4; padding: 6px; border-radius: 4px; color: var(--text-main);";

      let text = "";
      fullData.financials.statements.forEach((table) => {
        table.forEach((row) => {
          text += row.join(' | ') + '\n';
        });
        text += '\n';
      });
      pre.textContent = text;
      block.appendChild(pre);
      previewEl.appendChild(block);
    }

    if (!hasContent) {
      const emptyDiv = document.createElement("div");
      emptyDiv.style.cssText = "padding: 4px; color: var(--text-sub);";
      emptyDiv.textContent = "未能抓取到相關的財報數據。";
      previewEl.appendChild(emptyDiv);
    }
  }

  if (fullScrapeBtn) {
    fullScrapeBtn.addEventListener('click', executeFullStockCrawler);
  }

  function renderAISelector(arr) {
    aiSelectorContainer.textContent = '';
    if (arr.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.fontSize = '11px';
      emptyDiv.style.color = 'var(--text-sub)';
      emptyDiv.style.padding = '8px';
      emptyDiv.textContent = '尚未偵測到對話內容...';
      aiSelectorContainer.appendChild(emptyDiv);
      return;
    }
    arr.forEach((item, index) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 8px; padding: 6px; border-bottom: 1px solid #f1f3f4; align-items: flex-start;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'ai-item-check';
      checkbox.dataset.index = index;
      checkbox.checked = true;
      checkbox.style.marginTop = '2px';

      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'font-size: 11px; color: var(--text-main); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;';

      const strong = document.createElement('strong');
      strong.textContent = item.role === 'user' ? '👤 ' : '🤖 ';

      contentDiv.append(strong, document.createTextNode(`${item.text.substring(0, 60)}...`));

      div.append(checkbox, contentDiv);
      aiSelectorContainer.appendChild(div);
    });
  }

  async function buildPayload() {
    const note = noteEl.value.trim();
    const payload = {
      action: "create",
      mode: currentMode,
      timestamp: new Date().toLocaleString()
    };

    const activeRules = {
      ruleDisclaimer: document.getElementById('rule-disclaimer').checked,
      ruleTableizer: document.getElementById('rule-tableizer').checked,
      ruleExtractor: document.getElementById('rule-extractor').checked
    };

    if (currentMode === 'stock') {
      payload.ticker = document.getElementById('ticker').value;
      payload.price = document.getElementById('price').value;
      payload.sp500 = capturedKeyStats['S&P 500'] || capturedKeyStats['標普 500'] || "N/A";
      payload.nasdaq = capturedKeyStats['Nasdaq'] || capturedKeyStats['那斯達克'] || "N/A";
      payload.mktcap = capturedKeyStats['市值'] || "N/A";
      payload.pe = capturedKeyStats['本益比'] || "N/A";
      
      let extraNote = "";
      if (document.getElementById('check-mktcap').checked && capturedKeyStats['市值']) extraNote += `\n[市值: ${capturedKeyStats['市值']}]`;
      if (document.getElementById('check-pe').checked && capturedKeyStats['本益比']) extraNote += `\n[本益比: ${capturedKeyStats['本益比']}]`;
      if (document.getElementById('check-range').checked && (capturedKeyStats['高點'] || capturedKeyStats['低點'])) extraNote += `\n[當日範圍: ${capturedKeyStats['低點']} - ${capturedKeyStats['高點']}]`;
      if (document.getElementById('check-52w').checked && (capturedKeyStats['52 週高點'] || capturedKeyStats['52 週低點'])) extraNote += `\n[52週範圍: ${capturedKeyStats['52 週低點']} - ${capturedKeyStats['52 週高點']}]`;
      
      // 整合進階財報數據至 note
      let financeExtra = "";
      if (capturedStockData && capturedStockData.earnings && capturedStockData.earnings.period !== "N/A") {
        financeExtra += `\n\n### 季度財報與 AI 收益分析 (${capturedStockData.earnings.period})\n`;
        financeExtra += `- **EPS (實值 / 預期)**: ${capturedStockData.earnings.eps}\n`;
        financeExtra += `- **營收 (實值 / 預期)**: ${capturedStockData.earnings.revenue}\n`;
        if (capturedStockData.earnings.insights && capturedStockData.earnings.insights.length > 0) {
          financeExtra += `\n**💡 財報 AI 資訊一覽**:\n${capturedStockData.earnings.insights.join('\n')}\n`;
        }
        
        // 傳遞獨立屬性
        payload.earnings_period = capturedStockData.earnings.period;
        payload.earnings_eps = capturedStockData.earnings.eps;
        payload.earnings_revenue = capturedStockData.earnings.revenue;
        payload.earnings_insights = capturedStockData.earnings.insights.join('\n');
      }
      
      if (capturedStockData && capturedStockData.financialsTable && capturedStockData.financialsTable !== "N/A") {
        financeExtra += `\n**📊 損益表 (最近四季)**:\n\n${capturedStockData.financialsTable}\n`;
        payload.financials_table = capturedStockData.financialsTable;
      }

      // 整合分析師評級與目標價
      if (capturedStockData && capturedStockData.analysis && !capturedStockData.analysis.error) {
        const ana = capturedStockData.analysis;
        let analysisExtra = `\n\n### 🎯 分析師共識與目標價\n`;
        if (ana.consensus) analysisExtra += `- **共識評級**: ${ana.consensus}\n`;

        // 計算完整統計量 (均值、中位數、上漲空間、標準差、離散係數)
        const targetStats = typeof calculateTargetPriceStats === 'function'
          ? calculateTargetPriceStats(ana.targetPrice || [ana.targetPrice?.low, ana.targetPrice?.median, ana.targetPrice?.high], payload.price)
          : { count: 0, mean: 0, median: 0, high: 0, low: 0, upsidePercent: 0, stdDev: 0, cv: 0 };

        if (targetStats.count > 0 || ana.targetPrice?.median || ana.targetPrice?.high) {
          const medianVal = targetStats.median || ana.targetPrice?.median || '-';
          const meanVal = targetStats.mean || '-';
          const highVal = targetStats.high || ana.targetPrice?.high || '-';
          const lowVal = targetStats.low || ana.targetPrice?.low || '-';
          analysisExtra += `- **目標價統計**: 中位數 $${medianVal} (均值: $${meanVal}, 最高: $${highVal}, 最低: $${lowVal})\n`;
          if (targetStats.upsidePercent !== 0) {
            analysisExtra += `- **隱含現價上漲空間 (Upside %)**: ${targetStats.upsidePercent > 0 ? '+' : ''}${targetStats.upsidePercent}%\n`;
          }
          if (targetStats.stdDev > 0) {
            analysisExtra += `- **離散度指標**: 標準差 ±$${targetStats.stdDev} (變異係數 CV: ${(targetStats.cv * 100).toFixed(2)}%)\n`;
          }
        }
        if (ana.ratingsSummary) {
          analysisExtra += `\n**評級概況**:\n${ana.ratingsSummary.substring(0, 500)}\n`;
        }
        financeExtra = analysisExtra + financeExtra;

        payload.analyst_consensus = ana.consensus || "N/A";
        payload.target_price_median = targetStats.median || ana.targetPrice?.median || "N/A";
        payload.target_price_mean = targetStats.mean || "N/A";
        payload.target_price_high = targetStats.high || ana.targetPrice?.high || "N/A";
        payload.target_price_low = targetStats.low || ana.targetPrice?.low || "N/A";
        payload.target_price_upside = targetStats.upsidePercent !== undefined ? `${targetStats.upsidePercent}%` : "N/A";
        payload.target_price_stddev = targetStats.stdDev || 0;
        payload.target_price_cv = targetStats.cv || 0;
        payload.target_price_stats = targetStats;
      }

      // 整合 SPA 財報表格
      if (capturedStockData && capturedStockData.financials?.statements?.length) {
        let tableMd = "\n**📊 財務報表 (損益表)**:\n\n";
        capturedStockData.financials.statements.forEach((tbl) => {
          tbl.forEach((row, idx) => {
            tableMd += `| ${row.join(' | ')} |\n`;
            if (idx === 0) tableMd += `| ${row.map(() => '---').join(' | ')} |\n`;
          });
          tableMd += "\n";
        });
        financeExtra += tableMd;
      }

      const cleanNote = RuleEngine.processText(note, activeRules);
      payload.note = cleanNote + (extraNote ? `\n\n--- 關鍵統計 ---${extraNote}` : "") + financeExtra;

      // 智能情緒提取
      if (activeRules.ruleExtractor) {
        const extractor = RuleEngine.rules.find(r => r.name === 'ruleExtractor');
        payload.sentiment = extractor.extractSentiment(cleanNote);
      } else {
        payload.sentiment = "中性";
      }

      // 處理截圖 (僅限股票模式)
      if (document.getElementById('check-screenshot').checked) {
        updateStatus("📸 正在擷取與壓縮圖表...", "orange");
        try {
          const screenshotData = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 80 });
          payload.screenshot = await compressImage(screenshotData, 800, 0.6); // 寬度限縮至 800px，品質 0.6
        } catch (e) {
          console.error("Screenshot Error:", e);
        }
      }
    } else {
      const checks = document.querySelectorAll('.ai-item-check');
      const selectedDialogue = Array.from(checks)
        .filter(c => c.checked)
        .map(c => {
          const item = capturedAIDialogueArr[parseInt(c.dataset.index)];
          // 對單一對話段落做文字清理 (如過濾免責、自動表格化)
          const cleanText = RuleEngine.processText(item.text, activeRules);
          return `${item.role === 'user' ? '👤 **使用者問題**' : '🤖 **AI 研究分析**'}：\n${cleanText}`;
        })
        .join('\n\n---\n\n');

      if (!selectedDialogue) {
        throw new Error("請至少選擇一個對話段落！");
      }

      let suggestedTicker = "AI_RESEARCH";
      let sentimentValue = "中性";

      if (activeRules.ruleExtractor) {
        const extractor = RuleEngine.rules.find(r => r.name === 'ruleExtractor');
        const extractedTicker = extractor.extractTicker(selectedDialogue);
        if (extractedTicker) {
          suggestedTicker = `AI_RESEARCH:${extractedTicker}`;
        }
        sentimentValue = extractor.extractSentiment(selectedDialogue + "\n" + note);
      }

      payload.ticker = suggestedTicker;
      payload.price = "N/A";
      payload.sentiment = sentimentValue;

      const cleanUserNote = RuleEngine.processText(note, activeRules);
      payload.note = `### AI 研究精選紀錄\n\n${selectedDialogue}\n\n### 我的筆記\n${cleanUserNote}`;
    }
    return payload;
  }

  // 3. 送出事件監聽
  submitBtn.addEventListener('click', async () => {
    if (!APPS_SCRIPT_URL) {
      settingsPanel.style.display = 'block';
      updateStatus("❌ 尚未設定 API URL！", "red");
      return;
    }
    
    submitBtn.disabled = true;
    try {
      const payload = await buildPayload();
      updateStatus("⚡ 正在傳送至 Google Sheets...", "orange");

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        redirect: "follow"
      });
      const responseText = await response.text();
      const resData = JSON.parse(responseText);
      
      if (resData.status === "success") {
        statusEl.textContent = "🎉 同步成功！";
        const sheetUrl = settingsSheetUrl.value.trim();
        if (sheetUrl) {
          const link = document.createElement('a');
          link.href = sheetUrl;
          link.target = "_blank";
          link.style.color = "var(--primary-color)";
          link.style.textDecoration = "underline";
          link.style.marginLeft = "8px";
          link.textContent = "開啟試算表";
          statusEl.appendChild(link);
        }
        statusEl.style.color = "var(--success-color)";
        noteEl.value = "";
      } else {
        throw new Error(resData.message || "未知伺服器錯誤");
      }
    } catch (err) {
      updateStatus(`❌ ${err.message}`, "red");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // 4. 下載功能 (調用 popup-export.js 提供的函式)
  exportMdBtn.addEventListener('click', async () => {
    try {
      const p = await buildPayload();
      const mdContent = formatMarkdownContent(p);
      downloadFile(mdContent, `${p.ticker}_${Date.now()}.md`, 'text/markdown;charset=utf-8');
      updateStatus("✅ Markdown 下載成功", "green");
    } catch(err) {
      updateStatus(`❌ ${err.message}`, "red");
    }
  });

  exportCsvBtn.addEventListener('click', async () => {
    try {
      const p = await buildPayload();
      const csvContent = formatCsvContent(p);
      downloadFile(csvContent, `${p.ticker}_${Date.now()}.csv`, 'text/csv;charset=utf-8');
      updateStatus("✅ CSV 下載成功", "green");
    } catch(err) {
      updateStatus(`❌ ${err.message}`, "red");
    }
  });

  if (copyPromptBtn) {
    copyPromptBtn.addEventListener('click', async () => {
      try {
        const p = await buildPayload();
        if (!window.FinanceAIClient || typeof window.FinanceAIClient.buildInvestmentPrompt !== 'function') {
          throw new Error('FinanceAIClient 模組尚未就緒');
        }
        const promptText = window.FinanceAIClient.buildInvestmentPrompt(p);
        await navigator.clipboard.writeText(promptText);

        const originalText = copyPromptBtn.innerText;
        copyPromptBtn.innerText = "✅ 已複製！";
        copyPromptBtn.style.backgroundColor = "#e6f4ea";
        copyPromptBtn.style.color = "var(--success-color)";
        copyPromptBtn.style.borderColor = "var(--success-color)";
        updateStatus("📋 成功複製結構化 AI 投研 Prompt 至剪貼簿！", "green");

        setTimeout(() => {
          copyPromptBtn.innerText = originalText;
          copyPromptBtn.style.backgroundColor = "#e8f0fe";
          copyPromptBtn.style.color = "var(--primary-color)";
          copyPromptBtn.style.borderColor = "var(--primary-color)";
        }, 2000);
      } catch (err) {
        updateStatus(`❌ ${err.message}`, "red");
      }
    });
  }
});

/**
 * 狀態更新輔助函數
 */
function updateStatus(msg, color) {
  const statusEl = document.getElementById('status-bar');
  if (!statusEl) return;
  statusEl.innerText = msg;
  
  switch(color) {
    case "green":
      statusEl.style.color = "var(--success-color)";
      break;
    case "red":
      statusEl.style.color = "var(--error-color)";
      break;
    case "orange":
      statusEl.style.color = "var(--primary-color)";
      break;
    default:
      statusEl.style.color = "var(--text-sub)";
  }
}