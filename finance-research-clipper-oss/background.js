/**
 * Chrome Extension V3: background.js
 * 負責：
 * 1. 註冊右鍵選單 (Context Menu) 並處理反白文字暫存。
 * 2. 背景靜默爬蟲管線 (建立無感背景分頁 -> 注入 crawler.js -> 數據儲存 -> 銷毀分頁)。
 * 3. 跨頁面通訊與狀態廣播 (Side Panel、Dashboard 與 Popup)。
 */

// 1. 安裝與更新時的初始化
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clip-to-note",
    title: "擷取至投資筆記",
    contexts: ["selection"]
  });

  // 設定側邊欄行為 (允許點擊擴充圖示時直接開啟側邊欄，若支援)
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  }
});

// 2. 右鍵選單點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "clip-to-note" && info.selectionText) {
    chrome.storage.local.get(['contextNote'], (result) => {
      const existing = result.contextNote || "";
      const newNote = existing ? `${existing}\n\n${info.selectionText}` : info.selectionText;
      chrome.storage.local.set({ contextNote: newNote });
    });
  }
});

// 輔助工具：等待分頁完成載入 (含網址跳轉與超時)
function waitForTabLoaded(tabId, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        // 確認網址已非空或正在重導向
        if (tab.url && !tab.url.startsWith('chrome://')) {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(tab);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    const timer = setInterval(async () => {
      try {
        const currentTab = await chrome.tabs.get(tabId);
        if (currentTab.status === 'complete') {
          clearInterval(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(currentTab);
          return;
        }
      } catch (e) {
        // 分頁可能已被關閉
        clearInterval(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('分頁已被意外關閉'));
        return;
      }

      if (Date.now() - start > timeout) {
        clearInterval(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(null); // 超時降級嘗試
      }
    }, 400);
  });
}

// 輔助工具：根據關鍵字智能構建 Google Finance 確切行情頁 URL
function resolveGoogleFinanceUrl(keyword) {
  const clean = keyword.trim().toUpperCase();
  // 1. 已自帶交易所 (如 NVDA:NASDAQ, 2330:TPE)
  if (clean.includes(':')) {
    return `https://www.google.com/finance/quote/${clean}`;
  }
  // 2. 台股純數字代號 (如 2330, 2454, 2317)
  if (/^\d{4,6}$/.test(clean)) {
    return `https://www.google.com/finance/quote/${clean}:TPE`;
  }
  // 3. 常見美股在 NASDAQ
  const nasdaqList = ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'NFLX', 'AMD', 'INTC', 'PLTR', 'ARM', 'SMCI', 'AVGO', 'QCOM', 'TXN', 'COST', 'ASML'];
  if (nasdaqList.includes(clean)) {
    return `https://www.google.com/finance/quote/${clean}:NASDAQ`;
  }
  // 4. 常見美股在 NYSE
  const nyseList = ['TSM', 'BABA', 'DIS', 'BA', 'IBM', 'JPM', 'WMT', 'BRK.A', 'BRK.B', 'V', 'MA', 'NKE', 'KO', 'PEP', 'PG', 'UNH', 'LLY', 'XOM', 'CVX'];
  if (nyseList.includes(clean)) {
    return `https://www.google.com/finance/quote/${clean}:NYSE`;
  }
  // 5. 1~5 碼英文字母預設嘗試 NASDAQ 直連
  if (/^[A-Z]{1,5}$/.test(clean)) {
    return `https://www.google.com/finance/quote/${clean}:NASDAQ`;
  }
  // 6. 其他文字則使用搜尋頁
  return `https://www.google.com/finance?q=${encodeURIComponent(clean)}`;
}

/**
 * 3. 核心後台爬蟲管線：根據股票代號或名稱在背景採集
 */
async function crawlStockByKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    throw new Error('請提供有效的股票代號或名稱');
  }

  const cleanQuery = keyword.trim().toUpperCase();
  const targetUrl = resolveGoogleFinanceUrl(cleanQuery);
  console.log(`[FinanceClipper:BG] 啟動爬蟲，目標網址: ${targetUrl}`);

  let bgTab = null;

  try {
    // 建立背景分頁 (active: false，對使用者完全靜默)
    bgTab = await chrome.tabs.create({
      url: targetUrl,
      active: false
    });

    // 等待跳轉與載入 (最多 8 秒)
    await waitForTabLoaded(bgTab.id, 8000);

    // 短暫緩衝讓 DOM 水合
    await new Promise((r) => setTimeout(r, 800));

    // 檢查若當前分頁仍在搜尋清單頁 (未進入 /quote/)，嘗試點擊第一筆結果跳轉
    try {
      const currentTab = await chrome.tabs.get(bgTab.id);
      if (currentTab.url && !currentTab.url.includes('/quote/')) {
        console.log('[FinanceClipper:BG] 當前仍在搜尋清單頁，嘗試自動導航進入第一筆個股...');
        const clickResult = await chrome.scripting.executeScript({
          target: { tabId: bgTab.id },
          func: () => {
            const quoteLink = document.querySelector('a[href*="/quote/"]');
            if (quoteLink) {
              const href = quoteLink.getAttribute('href');
              quoteLink.click();
              return href;
            }
            return null;
          }
        });

        if (clickResult && clickResult[0] && clickResult[0].result) {
          console.log('[FinanceClipper:BG] 成功定位個股跳轉:', clickResult[0].result);
          await waitForTabLoaded(bgTab.id, 6000);
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    } catch (navErr) {
      console.warn('[FinanceClipper:BG] 搜尋清單跳轉輔助略過:', navErr.message);
    }

    // 注入 crawler.js 模組
    await chrome.scripting.executeScript({
      target: { tabId: bgTab.id },
      files: ['crawler.js']
    });

    // 呼叫快速萃取爬蟲
    const execResults = await chrome.scripting.executeScript({
      target: { tabId: bgTab.id },
      func: async () => {
        if (!window.FinanceCrawler || typeof window.FinanceCrawler.runFullStockScraper !== 'function') {
          throw new Error('FinanceCrawler 模組未載入');
        }
        return await window.FinanceCrawler.runFullStockScraper();
      }
    });

    if (!execResults || !execResults[0] || !execResults[0].result) {
      throw new Error('未能取得爬取資料');
    }

    const rawData = execResults[0].result;

    // 資料結構整理
    const overview = rawData.overview || {};
    const analysis = rawData.analysis || {};
    const earnings = rawData.earnings || {};
    const financials = rawData.financials || {};

    let resolvedTicker = overview.symbol || cleanQuery;
    // 嚴格校驗：若 ticker 仍為首頁關鍵字，說明未成功進入個股
    if (/^(財經|Google 財經|Google Finance|Search|UNKNOWN)$/i.test(resolvedTicker)) {
      resolvedTicker = cleanQuery;
    }

    const stockItem = {
      id: `${resolvedTicker}_${Date.now()}`,
      ticker: resolvedTicker,
      query: cleanQuery,
      price: overview.price || 'N/A',
      stats: overview.stats || {},
      analyst: {
        consensus: analysis.consensus || 'N/A',
        targetHigh: (analysis.targetPrice && analysis.targetPrice.high) || 'N/A',
        targetMedian: (analysis.targetPrice && analysis.targetPrice.median) || 'N/A',
        targetLow: (analysis.targetPrice && analysis.targetPrice.low) || 'N/A',
        summary: analysis.ratingsSummary || ''
      },
      earnings: {
        epsActual: (earnings.latestQuarter && earnings.latestQuarter.epsActual) || 'N/A',
        epsEstimate: (earnings.latestQuarter && earnings.latestQuarter.epsEstimate) || 'N/A',
        revenueActual: (earnings.latestQuarter && earnings.latestQuarter.revenueActual) || 'N/A',
        revenueEstimate: (earnings.latestQuarter && earnings.latestQuarter.revenueEstimate) || 'N/A',
        table: earnings.history || []
      },
      financials: {
        table: financials.statements && financials.statements.length > 0 ? financials.statements[0] : []
      },
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toLocaleString()
    };

    console.log(`[FinanceClipper:BG] 爬取完成 [${stockItem.ticker}] 即時價格: ${stockItem.price}`);

    // 儲存至本地 chrome.storage.local (更新當前數據與歷史清單)
    await new Promise((resolve) => {
      chrome.storage.local.get(['stockHistory'], (res) => {
        let history = res.stockHistory || [];
        // 去除舊的同 ticker 紀錄，保留最新
        history = history.filter((item) => item.ticker !== stockItem.ticker);
        history.unshift(stockItem);
        // 上限保留 40 筆
        if (history.length > 40) history = history.slice(0, 40);

        chrome.storage.local.set({
          latestStockData: stockItem,
          stockHistory: history
        }, resolve);
      });
    });

    // 廣播成功訊息給已開啟的 Side Panel 與 Dashboard
    chrome.runtime.sendMessage({
      action: 'STOCK_CRAWL_SUCCESS',
      data: stockItem
    }).catch(() => {});

    return { success: true, data: stockItem };

  } catch (error) {
    console.error('背景爬蟲執行失敗:', error);
    throw error;
  } finally {
    // 確保背景分頁一定會被安全關閉，不佔用系統資源
    if (bgTab && bgTab.id) {
      try {
        await chrome.tabs.remove(bgTab.id);
      } catch (e) {
        // 分頁若已關閉則忽略
      }
    }
  }
}

/**
 * 4. 訊息監聽器：協調 UI 請求
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CRAWL_STOCK') {
    crawlStockByKeyword(message.keyword)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message || '未知錯誤' }));
    return true; // 保持異步通道開啟
  }

  if (message.action === 'OPEN_DASHBOARD') {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.query({ url: dashboardUrl }, (tabs) => {
      if (tabs && tabs.length > 0) {
        // 如果已經開過，直接切換至該分頁
        chrome.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // 否則新建分頁
        chrome.tabs.create({ url: dashboardUrl });
      }
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'OPEN_SIDEPANEL') {
    if (chrome.sidePanel && chrome.sidePanel.open) {
      const windowId = sender.tab ? sender.tab.windowId : undefined;
      chrome.sidePanel.open({ windowId }).then(() => {
        sendResponse({ success: true });
      }).catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    } else {
      sendResponse({ success: false, error: '當前瀏覽器版本不支援 SidePanel API' });
    }
  }
});
