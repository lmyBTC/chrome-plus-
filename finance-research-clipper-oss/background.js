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

/**
 * 3. 核心後台爬蟲管線：根據股票代號或名稱在背景採集
 */
async function crawlStockByKeyword(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    throw new Error('請提供有效的股票代號或名稱');
  }

  const cleanQuery = keyword.trim();
  const targetUrl = `https://www.google.com/finance?q=${encodeURIComponent(cleanQuery)}`;

  let bgTab = null;

  try {
    // 建立背景分頁 (active: false，對使用者完全靜默)
    bgTab = await chrome.tabs.create({
      url: targetUrl,
      active: false
    });

    // 等待跳轉與載入
    await waitForTabLoaded(bgTab.id, 12000);

    // 短暫緩衝讓 DOM 水合
    await new Promise((r) => setTimeout(r, 1200));

    // 注入 crawler.js 模組
    await chrome.scripting.executeScript({
      target: { tabId: bgTab.id },
      files: ['crawler.js']
    });

    // 呼叫 4合1 SPA 動態爬蟲
    const execResults = await chrome.scripting.executeScript({
      target: { tabId: bgTab.id },
      func: async () => {
        if (!window.FinanceCrawler || typeof window.FinanceCrawler.runFullStockScraper !== 'function') {
          throw new Error('FinanceCrawler 未成功載入');
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

    const stockItem = {
      id: `${overview.symbol || cleanQuery.toUpperCase()}_${Date.now()}`,
      ticker: overview.symbol || cleanQuery.toUpperCase(),
      query: cleanQuery,
      price: overview.price || 'N/A',
      stats: overview.stats || {},
      analyst: {
        consensus: analysis.consensus || 'N/A',
        targetHigh: analysis.targetHigh || 'N/A',
        targetMedian: analysis.targetMedian || 'N/A',
        targetLow: analysis.targetLow || 'N/A',
        summary: analysis.summary || ''
      },
      earnings: {
        epsActual: earnings.epsActual || 'N/A',
        epsEstimate: earnings.epsEstimate || 'N/A',
        revenueActual: earnings.revenueActual || 'N/A',
        revenueEstimate: earnings.revenueEstimate || 'N/A',
        table: earnings.table || []
      },
      financials: {
        table: financials.table || []
      },
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toLocaleString()
    };

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
