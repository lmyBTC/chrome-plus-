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
  const fullScrapeBtn = document.getElementById('full-scrape-btn');
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  const btnGotoDashboard = document.getElementById('btn-goto-dashboard');

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: 'dashboard.html' });
  };

  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }
  if (btnGotoDashboard) {
    btnGotoDashboard.addEventListener('click', handleOpenDashboard);
  }

  // 0. 載入與設定 Storage 以及檢查右鍵暫存文字
  chrome.storage.local.get(['appsScriptUrl', 'userSpreadsheetUrl', 'contextNote', 'ruleDisclaimer', 'ruleTableizer', 'ruleExtractor'], (result) => {
    if (result.contextNote) {
      noteEl.value = result.contextNote;
      chrome.storage.local.remove('contextNote');
    }
    if (result.appsScriptUrl) {
      APPS_SCRIPT_URL = result.appsScriptUrl;
      settingsUrl.value = APPS_SCRIPT_URL;
    } else {
      settingsPanel.style.display = 'block';
      updateStatus("請先設定 Google Apps Script URL", "orange");
      submitBtn.disabled = true;
    }
    if (result.userSpreadsheetUrl) {
      settingsSheetUrl.value = result.userSpreadsheetUrl;
    }

    // 初始化規則開關狀態 (預設值皆為 true)
    document.getElementById('rule-disclaimer').checked = result.ruleDisclaimer !== false;
    document.getElementById('rule-tableizer').checked = result.ruleTableizer !== false;
    document.getElementById('rule-extractor').checked = result.ruleExtractor !== false;
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
    chrome.storage.local.set({ appsScriptUrl: url, userSpreadsheetUrl: sheetUrl }, () => {
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

        // 回填至進階財報與 AI 收益摺疊面板
        const previewEl = document.getElementById('financials-preview-content');
        let previewHtml = "";
        
        if (capturedStockData.earnings && capturedStockData.earnings.period !== "N/A") {
          previewHtml += `<div style="margin-bottom: 8px;"><b>會計期間：</b> ${capturedStockData.earnings.period}</div>`;
          previewHtml += `<div style="margin-bottom: 8px;"><b>EPS (實值 / 預期)：</b> ${capturedStockData.earnings.eps}</div>`;
          previewHtml += `<div style="margin-bottom: 8px;"><b>營收 (實值 / 預期)：</b> ${capturedStockData.earnings.revenue}</div>`;
          
          if (capturedStockData.earnings.insights && capturedStockData.earnings.insights.length > 0) {
            previewHtml += `<div style="margin-bottom: 8px;"><b>💡 財報 AI 資訊一覽：</b><br>`;
            capturedStockData.earnings.insights.forEach(item => {
              const formatted = item.replace(/^- \*\*(.*?)\*\*：(.*)$/, '• <b>$1</b>: $2');
              previewHtml += `<div style="padding-left: 6px; margin-top: 4px; line-height: 1.3;">${formatted}</div>`;
            });
            previewHtml += `</div>`;
          }
        }

        if (capturedStockData.financialsTable && capturedStockData.financialsTable !== "N/A") {
          previewHtml += `<div style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 8px;">`;
          previewHtml += `<b>📊 損益表 (最近四季)：</b><br>`;
          previewHtml += `<pre style="font-family: monospace; font-size: 9px; margin-top: 4px; overflow-x: auto; background: #f1f3f4; padding: 6px; border-radius: 4px; color: var(--text-main);">${capturedStockData.financialsTable}</pre>`;
          previewHtml += `</div>`;
        }

        if (!previewHtml) {
          previewHtml = `<div style="padding: 4px; color: var(--text-sub);">未能抓取到相關的財報數據。</div>`;
        }
        previewEl.innerHTML = previewHtml;

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
      // 注入 crawler.js
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['crawler.js']
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

      // 渲染進階預覽面板
      const previewEl = document.getElementById('financials-preview-content');
      let previewHtml = "";

      // 1. 分析師評級與目標價
      if (fullData.analysis && !fullData.analysis.error) {
        previewHtml += `<div style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">`;
        previewHtml += `<b>🎯 分析師評級與共識：</b> ${escapeHtml(fullData.analysis.consensus || '未提供')}<br>`;
        if (fullData.analysis.targetPrice?.median || fullData.analysis.targetPrice?.high) {
          previewHtml += `<b>🎯 目標價：</b> 中位: ${escapeHtml(fullData.analysis.targetPrice.median || '-')} | 最高: ${escapeHtml(fullData.analysis.targetPrice.high || '-')} | 最低: ${escapeHtml(fullData.analysis.targetPrice.low || '-')}<br>`;
        }
        if (fullData.analysis.ratingsSummary) {
          previewHtml += `<div style="font-size: 10px; color: var(--text-sub); margin-top: 4px; max-height: 60px; overflow-y: auto;">${escapeHtml(fullData.analysis.ratingsSummary.substring(0, 300))}...</div>`;
        }
        previewHtml += `</div>`;
      }

      // 2. Earnings 表現
      if (fullData.earnings && !fullData.earnings.error) {
        const lq = fullData.earnings.latestQuarter;
        if (lq && (lq.epsActual !== 'N/A' || lq.revenueActual !== 'N/A')) {
          previewHtml += `<div style="margin-bottom: 8px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">`;
          previewHtml += `<b>📈 財報 EPS (實質 / 預期)：</b> ${escapeHtml(lq.epsActual)} / ${escapeHtml(lq.epsEstimate)}<br>`;
          previewHtml += `<b>💰 營收 (實質 / 預期)：</b> ${escapeHtml(lq.revenueActual)} / ${escapeHtml(lq.revenueEstimate)}<br>`;
          previewHtml += `</div>`;
        }
      }

      // 3. Financials 報表表格
      if (fullData.financials?.statements?.length) {
        previewHtml += `<div style="margin-top: 6px;"><b>📊 財務報表摘要：</b><br>`;
        previewHtml += `<pre style="font-family: monospace; font-size: 9px; margin-top: 4px; overflow-x: auto; background: #f1f3f4; padding: 6px; border-radius: 4px; color: var(--text-main);">`;
        fullData.financials.statements.forEach((table) => {
          table.forEach((row) => {
            previewHtml += escapeHtml(row.join(' | ')) + '\n';
          });
          previewHtml += '\n';
        });
        previewHtml += `</pre></div>`;
      }

      if (!previewHtml) {
        previewHtml = `<div style="padding: 4px; color: var(--text-sub);">未能抓取到相關的財報數據。</div>`;
      }
      previewEl.innerHTML = previewHtml;

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
        fullScrapeBtn.innerHTML = "<span>⚡</span> <span>一鍵完整抓取 (4合1 SPA)</span>";
      }
    }
  }

  if (fullScrapeBtn) {
    fullScrapeBtn.addEventListener('click', executeFullStockCrawler);
  }

  function renderAISelector(arr) {
    aiSelectorContainer.innerHTML = '';
    if (arr.length === 0) {
      aiSelectorContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-sub); padding: 8px;">尚未偵測到對話內容...</div>';
      return;
    }
    arr.forEach((item, index) => {
      const div = document.createElement('div');
      div.style.cssText = 'display: flex; gap: 8px; padding: 6px; border-bottom: 1px solid #f1f3f4; align-items: flex-start;';
      div.innerHTML = `
        <input type="checkbox" class="ai-item-check" data-index="${index}" checked style="margin-top: 2px;">
        <div style="font-size: 11px; color: var(--text-main); line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          <strong>${item.role === 'user' ? '👤' : '🤖'}</strong> ${item.text.substring(0, 60)}...
        </div>
      `;
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
        if (ana.targetPrice?.median || ana.targetPrice?.high) {
          analysisExtra += `- **目標價**: 中位數 ${ana.targetPrice.median || '-'} (最高: ${ana.targetPrice.high || '-'}, 最低: ${ana.targetPrice.low || '-'})\n`;
        }
        if (ana.ratingsSummary) {
          analysisExtra += `\n**評級概況**:\n${ana.ratingsSummary.substring(0, 500)}\n`;
        }
        financeExtra = analysisExtra + financeExtra;

        payload.analyst_consensus = ana.consensus || "N/A";
        payload.target_price_median = ana.targetPrice?.median || "N/A";
        payload.target_price_high = ana.targetPrice?.high || "N/A";
        payload.target_price_low = ana.targetPrice?.low || "N/A";
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
        const sheetUrl = settingsSheetUrl.value.trim();
        if (sheetUrl) {
          statusEl.innerHTML = `🎉 同步成功！<a href="${sheetUrl}" target="_blank" style="color: var(--primary-color); text-decoration: underline; margin-left: 8px;">開啟試算表</a>`;
        } else {
          statusEl.innerHTML = `🎉 同步成功！`;
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