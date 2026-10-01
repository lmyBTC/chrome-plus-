/**
 * dashboard.js - Finance Research Clipper 獨立分頁儀表板控制主核心
 * 協調整合視圖渲染 (dashboard-render.js)、動作外發 (dashboard-actions.js) 與 AI 研報推論 (aiClient.js)
 */

(function () {
  'use strict';

  // 全域狀態變數
  let currentStock = null;
  let historyList = [];
  let currentAiSummary = null; // 當前標的的 AI 摘要快取

  // DOM 元素快取
  const searchInput = document.getElementById('dashboard-search-input');
  const btnCrawl = document.getElementById('btn-dashboard-crawl');
  const crawlSpinner = document.getElementById('crawl-spinner');
  const emptyState = document.getElementById('empty-state');
  const stockContentSection = document.getElementById('stock-content-section');
  const historyListContainer = document.getElementById('history-list-container');
  const btnClearHistory = document.getElementById('btn-clear-history');

  // 底部類似 Google Sheets 分頁列元素
  const sheetTabContainer = document.getElementById('sheets-tab-container');
  const sheetTabCount = document.getElementById('sheet-tab-count');
  const btnTabPrev = document.getElementById('btn-tab-prev');
  const btnTabNext = document.getElementById('btn-tab-next');
  const btnTabAdd = document.getElementById('btn-tab-add');

  // Hero Section 元素
  const heroTicker = document.getElementById('hero-ticker');
  const heroPrice = document.getElementById('hero-price');
  const heroUpdated = document.getElementById('hero-updated');
  const heroMarketIndices = document.getElementById('hero-market-indices');
  const heroStatsGrid = document.getElementById('hero-stats-grid');

  // 分析師卡片元素
  const analystBadge = document.getElementById('analyst-badge');
  const targetLow = document.getElementById('target-low');
  const targetMedian = document.getElementById('target-median');
  const targetHigh = document.getElementById('target-high');
  const targetUpsideText = document.getElementById('target-upside-text');

  // 財報卡片元素
  const earningsEps = document.getElementById('earnings-eps');
  const earningsRevenue = document.getElementById('earnings-revenue');
  const earningsSummary = document.getElementById('earnings-summary');

  // 損益表、市場主題與筆記
  const financialsTableWrap = document.getElementById('financials-table-wrap');
  const marketTopicsTableWrap = document.getElementById('market-topics-table-wrap');
  const noteInput = document.getElementById('dashboard-note-input');

  // 輸出按鈕
  const btnAddToScrum = document.getElementById('btn-add-scrum-task');
  const btnCopyMarkdown = document.getElementById('btn-copy-markdown');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnSendGas = document.getElementById('btn-send-gas');
  const btnBatchSendGas = document.getElementById('btn-batch-send-gas');

  // 設定彈窗
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingGasUrl = document.getElementById('setting-gas-url');
  const settingGasSecret = document.getElementById('setting-gas-secret');
  const settingSheetsUrl = document.getElementById('setting-sheets-url');

  // AI 研報面板元素
  const btnGenerateAi = document.getElementById('btn-generate-ai');
  const btnRefreshAi = document.getElementById('btn-refresh-ai');
  const btnCopyAiMarkdown = document.getElementById('btn-copy-ai-markdown');
  const aiBtnSpinner = document.getElementById('ai-btn-spinner');
  const aiStatusIndicator = document.getElementById('ai-status-indicator');
  const aiLoadingContainer = document.getElementById('ai-loading-container');
  const aiIdleState = document.getElementById('ai-idle-state');
  const aiResultContainer = document.getElementById('ai-result-container');
  const aiQuickTakeList = document.getElementById('ai-quick-take-list');
  const aiBullCaseList = document.getElementById('ai-bull-case-list');
  const aiBearCaseList = document.getElementById('ai-bear-case-list');
  const aiFinancialHealthText = document.getElementById('ai-financial-health-text');
  const aiMetaTimestamp = document.getElementById('ai-meta-timestamp');
  const aiMetaSource = document.getElementById('ai-meta-source');
  const aiErrorNotice = document.getElementById('ai-error-notice');
  const aiErrorMessage = document.getElementById('ai-error-message');
  const btnOpenAiSettings = document.getElementById('btn-open-ai-settings');
  const settingScrumclockId = document.getElementById('setting-scrumclock-id');
  const btnTestAiConn = document.getElementById('btn-test-ai-conn');
  const scrumclockConnStatus = document.getElementById('scrumclock-conn-status');

  // 整合 UI 元素集合傳遞給渲染器
  const uiElements = {
    emptyState,
    stockContentSection,
    heroTicker,
    heroPrice,
    heroUpdated,
    heroMarketIndices,
    heroStatsGrid,
    analystBadge,
    targetLow,
    targetMedian,
    targetHigh,
    targetUpsideText,
    earningsEps,
    earningsRevenue,
    earningsSummary,
    financialsTableWrap,
    marketTopicsTableWrap,
    historyListContainer,
    sheetTabContainer
  };

  function showToast(msg) {
    if (window.DashboardRender) {
      window.DashboardRender.showToast(msg);
    }
  }

  function showEmptyState() {
    window.DashboardRender.showEmptyState(emptyState, stockContentSection);
  }

  function renderStock(stock) {
    currentStock = stock;
    window.DashboardRender.renderStock(stock, uiElements, {
      onStockRendered: (s) => loadStockAi(s, false)
    });
  }

  function renderHistoryList() {
    window.DashboardRender.renderHistoryList(historyList, currentStock, historyListContainer, (stock) => {
      renderStock(stock);
    });
  }

  function renderSheetTabs() {
    window.DashboardRender.renderSheetTabs(
      historyList,
      currentStock,
      sheetTabContainer,
      sheetTabCount,
      (stock) => renderStock(stock),
      (ticker) => closeSheetTab(ticker)
    );
  }

  function closeSheetTab(ticker) {
    historyList = historyList.filter((it) => it.ticker !== ticker);
    chrome.storage.local.set({ stockHistory: historyList }, () => {
      if (currentStock && currentStock.ticker === ticker) {
        if (historyList.length > 0) {
          renderStock(historyList[0]);
        } else {
          currentStock = null;
          chrome.storage.local.remove(['latestStockData']);
          showEmptyState();
        }
      }
      renderSheetTabs();
      renderHistoryList();
      showToast(`已關閉 [${ticker}] 分頁`);
    });
  }

  function triggerCrawl(keyword) {
    window.DashboardActions.triggerCrawl(
      keyword,
      { btnCrawl, crawlSpinner },
      {
        onCrawlSuccess: (data) => {
          chrome.storage.local.get(['stockHistory'], (storageRes) => {
            historyList = storageRes.stockHistory || [];
            renderHistoryList();
            renderSheetTabs();
            renderStock(data);
          });
        }
      }
    );
  }

  function exportMarkdown() {
    const note = noteInput ? noteInput.value.trim() : '';
    window.DashboardActions.exportMarkdown(currentStock, note, currentAiSummary);
  }

  function exportCsv() {
    window.DashboardActions.exportCsv(currentStock);
  }

  function sendToGas() {
    const note = noteInput ? noteInput.value.trim() : '';
    window.DashboardActions.sendToGas(currentStock, note, btnSendGas, settingsModal);
  }

  function batchSendToGas() {
    window.DashboardActions.batchSendToGas(historyList, btnBatchSendGas, settingsModal);
  }

  function addStockToScrumTask() {
    const note = noteInput ? noteInput.value.trim() : '';
    window.DashboardActions.addStockToScrumTask(currentStock, note, currentAiSummary, btnAddToScrum);
  }

  // ===========================================================================
  // 🤖 Gemini Nano AI 研報交互與狀態管理函式群
  // ===========================================================================

  async function checkAiStatus() {
    if (!window.FinanceAIClient || !aiStatusIndicator) return;
    const res = await window.FinanceAIClient.checkAvailability();
    if (res.success && res.available) {
      aiStatusIndicator.className = 'ai-status-dot connected';
      aiStatusIndicator.title = `已連線: ${res.model || 'Gemini Nano'}`;
    } else {
      aiStatusIndicator.className = 'ai-status-dot';
      aiStatusIndicator.title = res.error || 'ScrumClock AI 服務未連線';
    }
  }

  function showAiLoading(isLoading) {
    if (!aiLoadingContainer || !btnGenerateAi) return;
    if (isLoading) {
      aiLoadingContainer.style.display = 'flex';
      aiIdleState.style.display = 'none';
      aiResultContainer.style.display = 'none';
      aiErrorNotice.style.display = 'none';
      btnGenerateAi.disabled = true;
      btnGenerateAi.style.opacity = '0.7';
      if (aiBtnSpinner) aiBtnSpinner.style.display = 'inline';
    } else {
      aiLoadingContainer.style.display = 'none';
      btnGenerateAi.disabled = false;
      btnGenerateAi.style.opacity = '1';
      if (aiBtnSpinner) aiBtnSpinner.style.display = 'none';
    }
  }

  function showAiError(errorMessage) {
    showAiLoading(false);
    if (aiErrorNotice && aiErrorMessage) {
      aiErrorNotice.style.display = 'block';
      aiErrorMessage.textContent = errorMessage;
      aiIdleState.style.display = 'none';
      aiResultContainer.style.display = 'none';
    }
  }

  function renderAiSummary(summary) {
    currentAiSummary = summary;
    if (!summary || !aiResultContainer) return;

    // 1. 三句話速讀
    aiQuickTakeList.textContent = '';
    const quickTake = Array.isArray(summary.quickTake) ? summary.quickTake : [];
    quickTake.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiQuickTakeList.appendChild(li);
    });

    // 2. 多方核心看點
    aiBullCaseList.textContent = '';
    const bullCase = Array.isArray(summary.bullCase) ? summary.bullCase : [];
    bullCase.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiBullCaseList.appendChild(li);
    });

    // 3. 空方核心疑慮
    aiBearCaseList.textContent = '';
    const bearCase = Array.isArray(summary.bearCase) ? summary.bearCase : [];
    bearCase.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      aiBearCaseList.appendChild(li);
    });

    // 4. 財務健康評語
    aiFinancialHealthText.textContent = summary.financialHealth || '無財務健康特別評語。';

    // 5. 元數據
    if (aiMetaTimestamp) {
      aiMetaTimestamp.textContent = `生成時間：${summary.generatedAt || new Date().toLocaleTimeString()}`;
    }
    if (aiMetaSource && summary.model) {
      aiMetaSource.textContent = `推論核心：${summary.model}`;
    }

    aiIdleState.style.display = 'none';
    aiErrorNotice.style.display = 'none';
    aiResultContainer.style.display = 'flex';
    if (btnRefreshAi) btnRefreshAi.style.display = 'inline-flex';
    if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'inline-flex';
    if (btnGenerateAi) btnGenerateAi.style.display = 'none';
  }

  async function loadStockAi(stock, forceRefresh = false) {
    if (!stock || !stock.ticker) return;
    if (aiErrorNotice) aiErrorNotice.style.display = 'none';

    if (!forceRefresh) {
      const cached = await window.FinanceAIClient?.getCachedSummary(stock.ticker);
      if (cached) {
        console.log(`[FinanceClipper] 載入 ${stock.ticker} 當日 AI 快取研報`);
        renderAiSummary(cached);
        return;
      }

      currentAiSummary = null;
      aiIdleState.style.display = 'block';
      aiResultContainer.style.display = 'none';
      if (btnRefreshAi) btnRefreshAi.style.display = 'none';
      if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'none';
      if (btnGenerateAi) btnGenerateAi.style.display = 'inline-flex';
      return;
    }

    showAiLoading(true);
    showToast(`🤖 正在為 ${stock.ticker} 調用本地 Gemini Nano 分析中...`);

    const result = await window.FinanceAIClient?.requestStockSummary(stock, true);
    showAiLoading(false);

    if (result && result.success && result.summary) {
      renderAiSummary(result.summary);
      showToast('✨ Gemini Nano 研報摘要已生成完畢！');
    } else {
      showAiError(result?.error || '無法取得 AI 分析結果，請確認 ScrumClock 是否運行且已啟用 Gemini Nano。');
      showToast('⚠️ AI 生成未完成，請檢視面板提示。');
    }
  }

  function copyAiMarkdownOnly() {
    if (!currentAiSummary || !currentAiSummary.rawMarkdown) {
      showToast('⚠️ 目前尚未生成 AI 研報摘要');
      return;
    }
    navigator.clipboard.writeText(currentAiSummary.rawMarkdown).then(() => {
      showToast('📋 AI 研報摘要已複製至剪貼簿！');
    }).catch(() => {
      showToast('複製失敗，請手動選取');
    });
  }

  async function testAiConnection() {
    const extId = settingScrumclockId.value.trim();
    if (!extId) {
      scrumclockConnStatus.textContent = '請先填入 ScrumClock 插件 ID！';
      scrumclockConnStatus.style.color = 'var(--accent-red)';
      return;
    }

    scrumclockConnStatus.textContent = '連線測試中...';
    scrumclockConnStatus.style.color = 'var(--text-secondary)';

    const res = await window.FinanceAIClient.checkAvailability(extId);
    if (res.success && res.available) {
      scrumclockConnStatus.textContent = `✅ 連線成功！偵測到模型：${res.model}`;
      scrumclockConnStatus.style.color = 'var(--accent-green)';
      checkAiStatus();
    } else {
      scrumclockConnStatus.textContent = `❌ ${res.error || '連線失敗或 Gemini Nano 未就緒'}`;
      scrumclockConnStatus.style.color = 'var(--accent-red)';
    }
  }

  // 初始化載入本地數據
  function init() {
    console.log('[FinanceClipper] 儀表板初始化中 (純本地模式優先)...');
    chrome.storage.local.get([
      'latestStockData', 'stockHistory', 
      'gasUrl', 'sheetsUrl', 'gasSecretToken',
      'appsScriptUrl', 'userSpreadsheetUrl', 
      'contextNote', 'scrumclock_ext_id'
    ], (res) => {
      const activeGasUrl = res.gasUrl || res.appsScriptUrl || '';
      const activeSheetsUrl = res.sheetsUrl || res.userSpreadsheetUrl || '';
      const activeGasSecret = res.gasSecretToken || '';

      if (activeGasUrl && settingGasUrl) settingGasUrl.value = activeGasUrl;
      if (activeGasSecret && settingGasSecret) settingGasSecret.value = activeGasSecret;
      if (activeSheetsUrl && settingSheetsUrl) settingSheetsUrl.value = activeSheetsUrl;
      if (res.contextNote && noteInput) noteInput.value = res.contextNote;
      if (res.scrumclock_ext_id && settingScrumclockId) {
        settingScrumclockId.value = res.scrumclock_ext_id;
      }

      historyList = res.stockHistory || [];
      console.log(`[FinanceClipper] 本地已載入 ${historyList.length} 檔歷史標的。`);
      renderHistoryList();
      renderSheetTabs();

      checkAiStatus();

      if (res.latestStockData) {
        renderStock(res.latestStockData);
      } else if (historyList.length > 0) {
        renderStock(historyList[0]);
      } else {
        showEmptyState();
      }
    });

    bindEvents();
  }

  // 綁定所有事件
  function bindEvents() {
    // 搜尋與 Enter 觸發
    btnCrawl.addEventListener('click', () => triggerCrawl(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerCrawl(searchInput.value);
    });

    // 熱門標籤按鈕
    document.querySelectorAll('.pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const symbol = pill.dataset.symbol;
        searchInput.value = symbol;
        triggerCrawl(symbol);
      });
    });

    // 匯出功能
    btnCopyMarkdown.addEventListener('click', exportMarkdown);
    btnDownloadCsv.addEventListener('click', exportCsv);
    btnSendGas.addEventListener('click', sendToGas);
    if (btnBatchSendGas) btnBatchSendGas.addEventListener('click', batchSendToGas);
    if (btnAddToScrum) btnAddToScrum.addEventListener('click', addStockToScrumTask);

    // 清空歷史清單
    btnClearHistory.addEventListener('click', () => {
      if (confirm('確定要清空所有已記錄的歷史標的嗎？')) {
        chrome.storage.local.remove(['stockHistory', 'latestStockData'], () => {
          historyList = [];
          currentStock = null;
          renderHistoryList();
          renderSheetTabs();
          showEmptyState();
          showToast('歷史追蹤清單已清空');
        });
      }
    });

    // 底部 Google Sheets 分頁控制按鈕
    if (btnTabPrev && sheetTabContainer) {
      btnTabPrev.addEventListener('click', () => {
        sheetTabContainer.scrollBy({ left: -160, behavior: 'smooth' });
      });
    }

    if (btnTabNext && sheetTabContainer) {
      btnTabNext.addEventListener('click', () => {
        sheetTabContainer.scrollBy({ left: 160, behavior: 'smooth' });
      });
    }

    if (btnTabAdd) {
      btnTabAdd.addEventListener('click', () => {
        searchInput.focus();
        searchInput.select();
        showToast('請在上方搜尋列輸入股票代號並按下「深度採集」！');
      });
    }

    // AI 研報面板按鈕
    if (btnGenerateAi) {
      btnGenerateAi.addEventListener('click', () => {
        if (currentStock) loadStockAi(currentStock, true);
      });
    }
    if (btnRefreshAi) {
      btnRefreshAi.addEventListener('click', () => {
        if (currentStock) loadStockAi(currentStock, true);
      });
    }
    if (btnCopyAiMarkdown) {
      btnCopyAiMarkdown.addEventListener('click', copyAiMarkdownOnly);
    }
    if (btnOpenAiSettings) {
      btnOpenAiSettings.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
      });
    }
    if (btnTestAiConn) {
      btnTestAiConn.addEventListener('click', testAiConnection);
    }

    // 設定彈窗控制
    btnOpenSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
    btnSaveSettings.addEventListener('click', () => {
      const gasUrl = settingGasUrl.value.trim();
      const gasSecretToken = settingGasSecret ? settingGasSecret.value.trim() : '';
      const sheetsUrl = settingSheetsUrl.value.trim();
      const scId = settingScrumclockId ? settingScrumclockId.value.trim() : '';

      chrome.storage.local.set({ 
        gasUrl, 
        gasSecretToken, 
        sheetsUrl,
        appsScriptUrl: gasUrl,
        userSpreadsheetUrl: sheetsUrl,
        scrumclock_ext_id: scId
      }, async () => {
        if (window.FinanceAIClient && scId) {
          await window.FinanceAIClient.setScrumClockId(scId);
          checkAiStatus();
        }
        settingsModal.style.display = 'none';
        console.log('[FinanceClipper] 儀表板設定已儲存');
        showToast('✅ 儀表板與 AI 連線設定已儲存！');
      });
    });

    // 監聽背景廣播的更新通知
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'STOCK_CRAWL_SUCCESS' && msg.data) {
        chrome.storage.local.get(['stockHistory'], (storageRes) => {
          historyList = storageRes.stockHistory || [];
          renderHistoryList();
          renderSheetTabs();
          renderStock(msg.data);
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
