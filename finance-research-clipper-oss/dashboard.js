/**
 * dashboard.js - Finance Research Clipper 獨立分頁儀表板控制主核心
 * 協調整合視圖渲染 (dashboard-render.js)、分頁與標籤 (dashboard-tabs.js)、AI 研報 (dashboard-ai.js) 與動作外發 (dashboard-actions.js)
 */

(function () {
  'use strict';

  // 全域狀態變數
  let currentStock = null;
  let historyList = [];
  let currentView = 'single'; // 'single' | 'peer' | 'valuation'

  // DOM 元素快取
  const searchInput = document.getElementById('dashboard-search-input');
  const btnCrawl = document.getElementById('btn-dashboard-crawl');
  const crawlSpinner = document.getElementById('crawl-spinner');
  const emptyState = document.getElementById('empty-state');
  const stockContentSection = document.getElementById('stock-content-section');
  const historyListContainer = document.getElementById('history-list-container');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const sidebarActiveCatBadge = document.getElementById('sidebar-active-cat-badge');

  // View Switcher 視圖切換元素
  const tabBtnSingle = document.getElementById('tab-btn-single');
  const tabBtnPeer = document.getElementById('tab-btn-peer');
  const tabBtnValuation = document.getElementById('tab-btn-valuation');
  const peerSelectedCountBadge = document.getElementById('peer-selected-count-badge');
  const viewModeHintText = document.getElementById('view-mode-hint-text');

  // 同業矩陣與沙盒視圖元素
  const peerMatrixSection = document.getElementById('peer-matrix-section');
  const valuationSandboxSection = document.getElementById('valuation-sandbox-section');
  const peerSelectedChips = document.getElementById('peer-selected-chips');
  const peerChipsCount = document.getElementById('peer-chips-count');
  const peerQuickAddSelect = document.getElementById('peer-quick-add-select');
  const btnPeerSelectAllCat = document.getElementById('btn-peer-select-all-cat');
  const btnPeerClearAll = document.getElementById('btn-peer-clear-all');
  const sandboxBaseTickerSelect = document.getElementById('sandbox-base-ticker-select');
  const sandboxEmptyPrompt = document.getElementById('sandbox-empty-prompt');
  const sandboxContent = document.getElementById('sandbox-content');
  const peerMatrixActionsBar = document.getElementById('peer-matrix-actions-bar');
  const peerMatrixStatusText = document.getElementById('peer-matrix-status-text');
  const btnPeerCopyMarkdown = document.getElementById('btn-peer-copy-markdown');
  const btnPeerSendGas = document.getElementById('btn-peer-send-gas');
  const peerEmptyPrompt = document.getElementById('peer-empty-prompt');
  const peerMatrixContent = document.getElementById('peer-matrix-content');

  // 頂部研報筆記與輸出中心下拉選單
  const noteInput = document.getElementById('dashboard-note-input');
  const btnToggleExportPanel = document.getElementById('btn-toggle-export-panel');
  const exportDropdownPanel = document.getElementById('export-dropdown-panel');
  const btnCloseExportPanel = document.getElementById('btn-close-export-panel');
  const exportPanelTicker = document.getElementById('export-panel-ticker');
  const btnCopyMarkdown = document.getElementById('btn-copy-markdown');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnSendGas = document.getElementById('btn-send-gas');
  const btnBatchSendGas = document.getElementById('btn-batch-send-gas');
  const btnAddToScrum = document.getElementById('btn-add-to-scrum');
  const btnCopyFinancialsTsv = document.getElementById('btn-copy-financials-tsv');

  // 設定彈窗元素
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingGasUrl = document.getElementById('setting-gas-url');
  const settingGasSecret = document.getElementById('setting-gas-secret');
  const settingSheetsUrl = document.getElementById('setting-sheets-url');
  const settingScrumclockId = document.getElementById('setting-scrumclock-id');

  // 封裝常用 UI 元素字典給 Render 模組使用
  const uiElements = {
    emptyState,
    stockContentSection,
    heroTicker: document.getElementById('hero-ticker'),
    heroPrice: document.getElementById('hero-price'),
    heroUpdated: document.getElementById('hero-updated'),
    heroMarketIndices: document.getElementById('hero-market-indices'),
    heroStatsGrid: document.getElementById('hero-stats-grid'),
    analystBadge: document.getElementById('analyst-badge'),
    targetLow: document.getElementById('target-low'),
    targetMedian: document.getElementById('target-median'),
    targetHigh: document.getElementById('target-high'),
    targetUpsideText: document.getElementById('target-upside-text'),
    earningsEps: document.getElementById('earnings-eps'),
    earningsRevenue: document.getElementById('earnings-revenue'),
    earningsSummary: document.getElementById('earnings-summary'),
    financialsTableWrap: document.getElementById('financials-table-wrap'),
    marketTopicsTableWrap: document.getElementById('market-topics-table-wrap'),
    noteInput,
    exportPanelTicker
  };

  function showToast(msg, duration = 3000, onClick = null) {
    if (window.DashboardRender && window.DashboardRender.showToast) {
      window.DashboardRender.showToast(msg, duration, onClick);
    }
  }

  function showEmptyState() {
    window.DashboardRender.showEmptyState(emptyState, stockContentSection);
  }

  function renderStock(stock) {
    currentStock = stock;
    window.DashboardRender.renderStock(stock, uiElements, {
      onStockRendered: (s) => window.DashboardAI.loadStockAi(s, false, { showToast })
    });
    if (window.DashboardRender && window.DashboardRender.highlightActiveHistoryItem) {
      window.DashboardRender.highlightActiveHistoryItem(
        stock ? stock.ticker : '',
        historyListContainer,
        window.DashboardTabs.getActiveCategoryId(),
        document.getElementById('sheets-tab-container')
      );
    }
    if (currentView === 'valuation') {
      renderValuationSandboxView();
    }
  }

  function updateSidebarBadge() {
    if (sidebarActiveCatBadge) {
      const cur = window.DashboardTabs.getCategories().find((c) => c.id === window.DashboardTabs.getActiveCategoryId());
      sidebarActiveCatBadge.textContent = cur ? cur.name : '全部標的';
    }
  }

  function renderHistoryList() {
    updateSidebarBadge();
    const filtered = window.DashboardTabs.filterHistoryList(historyList);
    const selectedTickers = window.DashboardActions.peerSelection.getSelectedTickers();
    window.DashboardRender.renderHistoryList(
      filtered,
      currentStock,
      historyListContainer,
      window.DashboardTabs.getCategories(),
      (stock) => renderStock(stock),
      (ticker, newCatId) => {
        window.DashboardTabs.updateStockCategory(ticker, newCatId, {
          getHistoryList: () => historyList,
          onUpdated: () => {
            renderTabs();
            renderHistoryList();
          },
          showToast
        });
      },
      selectedTickers,
      (ticker) => handleTogglePeer(ticker)
    );
  }

  function renderTabs() {
    window.DashboardTabs.renderCategoryTabs(historyList, {
      onSelected: () => {
        renderTabs();
        renderHistoryList();
      },
      onAdded: () => {
        renderTabs();
        renderHistoryList();
      },
      onRenamed: () => {
        renderTabs();
        renderHistoryList();
      },
      onDeleted: () => {
        renderTabs();
        renderHistoryList();
      },
      getHistoryList: () => historyList,
      setHistoryList: (list) => { historyList = list; },
      getCurrentStock: () => currentStock,
      onStockChange: (stock) => renderStock(stock),
      showToast
    });

    if (window.DashboardTabs && window.DashboardTabs.renderTopicTags) {
      window.DashboardTabs.renderTopicTags({
        onSelectTag: (tag) => {
          if (searchInput) searchInput.value = tag;
          triggerCrawl(tag);
        },
        showToast,
        onTagsChanged: () => renderTabs()
      });
    }
  }

  // 處理同業標的勾選/取消
  function handleTogglePeer(ticker) {
    const res = window.DashboardActions.peerSelection.toggleTicker(ticker, 5);
    if (!res.success && res.error) {
      showToast(res.error);
      return;
    }
    renderHistoryList();
    renderPeerSelectorUI();
  }

  // 渲染同業矩陣內容
  function renderPeerMatrixView() {
    const selected = window.DashboardActions.peerSelection.getSelectedTickers();
    if (!selected || selected.length < 2) {
      if (peerEmptyPrompt) peerEmptyPrompt.style.display = 'block';
      if (peerMatrixContent) {
        peerMatrixContent.style.display = 'none';
        peerMatrixContent.textContent = '';
      }
      if (peerMatrixActionsBar) peerMatrixActionsBar.style.display = 'none';
      return;
    }

    if (peerEmptyPrompt) peerEmptyPrompt.style.display = 'none';
    if (peerMatrixContent) {
      peerMatrixContent.style.display = 'block';
      window.DashboardPeerRender.renderPeerMatrix(
        selected,
        historyList,
        peerMatrixContent,
        (ticker) => {
          window.DashboardActions.peerSelection.removeTicker(ticker);
          renderHistoryList();
          renderPeerSelectorUI();
        }
      );
    }
    if (peerMatrixActionsBar) {
      peerMatrixActionsBar.style.display = 'flex';
      if (peerMatrixStatusText) {
        peerMatrixStatusText.textContent = `已成功比對 ${selected.length} 檔標的之關鍵估值、成長性與盈利指標`;
      }
    }
  }

  // 渲染估值敏感度沙盒視圖
  function renderValuationSandboxView() {
    if (!window.DashboardValuationRender || !valuationSandboxSection) return;

    if (!historyList || historyList.length === 0) {
      if (sandboxEmptyPrompt) sandboxEmptyPrompt.style.display = 'block';
      if (sandboxContent) sandboxContent.style.display = 'none';
      return;
    }

    if (sandboxBaseTickerSelect) {
      const prevVal = sandboxBaseTickerSelect.value;
      sandboxBaseTickerSelect.textContent = '';
      historyList.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.ticker;
        opt.textContent = `${item.ticker} - ${item.companyName || item.marketName || '個股'}`;
        sandboxBaseTickerSelect.appendChild(opt);
      });

      if (currentStock && historyList.some((it) => it.ticker === currentStock.ticker)) {
        sandboxBaseTickerSelect.value = currentStock.ticker;
      } else if (prevVal && historyList.some((it) => it.ticker === prevVal)) {
        sandboxBaseTickerSelect.value = prevVal;
      } else if (historyList.length > 0) {
        sandboxBaseTickerSelect.value = historyList[0].ticker;
      }
    }

    const activeTicker = sandboxBaseTickerSelect ? sandboxBaseTickerSelect.value : (currentStock ? currentStock.ticker : null);
    const targetStock = historyList.find((it) => it.ticker === activeTicker) || currentStock;

    if (!targetStock) {
      if (sandboxEmptyPrompt) sandboxEmptyPrompt.style.display = 'block';
      if (sandboxContent) sandboxContent.style.display = 'none';
      return;
    }

    if (sandboxEmptyPrompt) sandboxEmptyPrompt.style.display = 'none';
    if (sandboxContent) {
      sandboxContent.style.display = 'block';
      const peers = window.DashboardActions.peerSelection.getSelectedTickers()
        .map((t) => historyList.find((h) => h.ticker === t))
        .filter(Boolean);

      window.DashboardValuationRender.renderValuationSandbox(
        targetStock,
        peers,
        sandboxContent,
        (result) => {
          console.log('[FinanceClipper] 估值試算完成:', result);
        }
      );
    }
  }

  // 渲染同業快選 UI (Chips + Quick Select + Count Badge)
  function renderPeerSelectorUI() {
    const selected = window.DashboardActions.peerSelection.getSelectedTickers();

    if (peerSelectedCountBadge) {
      peerSelectedCountBadge.textContent = `${selected.length}/5`;
      peerSelectedCountBadge.classList.toggle('has-count', selected.length > 0);
    }

    if (peerChipsCount) {
      peerChipsCount.textContent = `(${selected.length}/5)`;
    }

    if (peerSelectedChips) {
      window.DashboardPeerRender.renderPeerChips(
        selected,
        peerSelectedChips,
        (ticker) => {
          window.DashboardActions.peerSelection.removeTicker(ticker);
          renderHistoryList();
          renderPeerSelectorUI();
        }
      );
    }

    if (peerQuickAddSelect) {
      peerQuickAddSelect.textContent = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '+ 快速加入歷史標的...';
      peerQuickAddSelect.appendChild(defaultOpt);

      historyList.forEach((item) => {
        if (!selected.includes(item.ticker)) {
          const opt = document.createElement('option');
          opt.value = item.ticker;
          opt.textContent = `${item.ticker} - ${item.companyName || item.marketName || '未命名'}`;
          peerQuickAddSelect.appendChild(opt);
        }
      });
    }

    if (currentView === 'peer') {
      renderPeerMatrixView();
    } else if (currentView === 'valuation') {
      renderValuationSandboxView();
    }
  }

  // 切換視圖 (single / peer / valuation)
  function switchView(viewName) {
    currentView = viewName;

    [tabBtnSingle, tabBtnPeer, tabBtnValuation].forEach((btn) => {
      if (btn) {
        const isActive = btn.dataset.view === viewName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    });

    if (stockContentSection) {
      stockContentSection.style.display = viewName === 'single' ? 'flex' : 'none';
    }
    if (emptyState && !currentStock && viewName === 'single') {
      emptyState.style.display = 'block';
    } else if (emptyState) {
      emptyState.style.display = 'none';
    }

    if (peerMatrixSection) {
      peerMatrixSection.style.display = viewName === 'peer' ? 'block' : 'none';
    }

    if (valuationSandboxSection) {
      valuationSandboxSection.style.display = viewName === 'valuation' ? 'block' : 'none';
    }

    if (viewModeHintText) {
      const modeTexts = {
        single: '單檔深度分析模式',
        peer: '同業對比模式 (至多5檔)',
        valuation: '估值敏感度沙盒模式'
      };
      viewModeHintText.textContent = modeTexts[viewName] || '單檔深度分析模式';
    }

    if (viewName === 'peer') {
      renderPeerMatrixView();
    } else if (viewName === 'valuation') {
      renderValuationSandboxView();
    }
  }

  // 爬蟲與匯出功能
  function triggerCrawl(keyword) {
    if (!keyword || !keyword.trim()) {
      showToast('請先輸入股票代號 (例如: NVDA, 2330)');
      return;
    }
    const cleanTicker = keyword.trim().toUpperCase();
    if (crawlSpinner) crawlSpinner.style.display = 'inline';
    if (btnCrawl) btnCrawl.disabled = true;

    chrome.runtime.sendMessage({
      action: 'TRIGGER_DASHBOARD_CRAWL',
      ticker: cleanTicker
    }, (response) => {
      if (crawlSpinner) crawlSpinner.style.display = 'none';
      if (btnCrawl) btnCrawl.disabled = false;

      if (response && response.success && response.data) {
        showToast(`✅ ${cleanTicker} 最新數據擷取成功！`);
        init();
      } else {
        const errMsg = response && response.error ? response.error : '擷取失敗，請確認代號是否正確或網路是否通暢';
        showToast(`❌ ${errMsg}`);
      }
    });
  }

  function toggleExportPanel(force) {
    if (!exportDropdownPanel) return;
    const isShow = typeof force === 'boolean' ? force : exportDropdownPanel.style.display === 'none';
    exportDropdownPanel.style.display = isShow ? 'block' : 'none';
    if (btnToggleExportPanel) {
      btnToggleExportPanel.classList.toggle('active', isShow);
    }
    if (isShow && exportPanelTicker) {
      exportPanelTicker.textContent = currentStock ? `${currentStock.ticker} 研報封裝` : '全域研報封裝';
    }
  }

  // 初始化載入本地數據
  function init() {
    window.DashboardAI.init();

    chrome.storage.local.get([
      'stockHistory',
      'latestStockData',
      'contextNote',
      'gasUrl',
      'appsScriptUrl',
      'gasSecretToken',
      'sheetsUrl',
      'userSpreadsheetUrl',
      'categories',
      'activeCategoryId',
      'custom_topic_tags',
      'scrumclock_ext_id'
    ], (res) => {
      const resolvedGasUrl = res.gasUrl || res.appsScriptUrl;
      const resolvedSheetsUrl = res.sheetsUrl || res.userSpreadsheetUrl;
      if (res.contextNote && noteInput) noteInput.value = res.contextNote;
      if (resolvedGasUrl && settingGasUrl) settingGasUrl.value = resolvedGasUrl;
      if (res.gasSecretToken && settingGasSecret) settingGasSecret.value = res.gasSecretToken;
      if (resolvedSheetsUrl && settingSheetsUrl) settingSheetsUrl.value = resolvedSheetsUrl;
      if (res.scrumclock_ext_id && settingScrumclockId) settingScrumclockId.value = res.scrumclock_ext_id;

      window.DashboardTabs.init(res);

      let historyChanged = false;
      historyList = (res.stockHistory || []).map((item) => {
        if (!item.categoryId) {
          historyChanged = true;
          return { ...item, categoryId: 'core' };
        }
        return item;
      });
      if (historyChanged) {
        chrome.storage.local.set({ stockHistory: historyList });
      }

      renderHistoryList();
      renderTabs();
      window.DashboardAI.checkAiStatus();

      // 解析 URL query parameter ticker (若由 Popup 跳轉攜帶)
      let targetTickerFromUrl = null;
      if (!initialUrlTickerHandled) {
        const urlParams = new URLSearchParams(window.location.search);
        const paramTicker = urlParams.get('ticker');
        if (paramTicker && paramTicker.trim()) {
          targetTickerFromUrl = paramTicker.trim().toUpperCase();
        }
        initialUrlTickerHandled = true;
        if (paramTicker) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      const filtered = window.DashboardTabs.filterHistoryList(historyList);
      if (targetTickerFromUrl) {
        if (searchInput) searchInput.value = targetTickerFromUrl;
        const matched = historyList.find((s) => s.ticker && s.ticker.toUpperCase() === targetTickerFromUrl);
        if (matched) {
          renderStock(matched);
          showToast(`🎯 已透過 Deep-Link 自動定位快照：$${targetTickerFromUrl}`);
        } else {
          showToast(`🔍 正在連線載入指定標的：$${targetTickerFromUrl}`);
        }
        triggerCrawl(targetTickerFromUrl);
      } else if (res.latestStockData) {
        renderStock(res.latestStockData);
      } else if (filtered.length > 0) {
        renderStock(filtered[0]);
      } else if (historyList.length > 0) {
        renderStock(historyList[0]);
      } else {
        showEmptyState();
      }

      if (window.DashboardActions.peerSelection.getSelectedTickers().length === 0 && historyList.length > 0) {
        const defaultPeers = (filtered.length >= 2 ? filtered : historyList).slice(0, 3);
        defaultPeers.forEach((item) => {
          if (item && item.ticker) {
            window.DashboardActions.peerSelection.addTicker(item.ticker, 5);
          }
        });
      }
      renderPeerSelectorUI();
    });

    bindEvents();
  }

  let initialUrlTickerHandled = false;
  let eventsBound = false;

  // 綁定所有事件
  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;

    if (btnCrawl && searchInput) {
      btnCrawl.addEventListener('click', () => triggerCrawl(searchInput.value));
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') triggerCrawl(searchInput.value);
      });
    }

    // 委派 Tabs 與 AI 專屬事件
    window.DashboardTabs.bindEvents({
      onAdded: () => { renderTabs(); renderHistoryList(); },
      showToast,
      onTagsChanged: () => renderTabs()
    });

    window.DashboardAI.bindEvents({
      getCurrentStock: () => currentStock,
      showToast,
      openSettings: () => { settingsModal.style.display = 'flex'; }
    });

    // 匯出功能
    btnCopyMarkdown.addEventListener('click', () => { window.DashboardActions.exportMarkdown(currentStock, noteInput); toggleExportPanel(false); });
    btnDownloadCsv.addEventListener('click', () => { window.DashboardActions.exportCsv(currentStock); toggleExportPanel(false); });
    btnSendGas.addEventListener('click', () => { window.DashboardActions.sendToGas(currentStock, noteInput); toggleExportPanel(false); });
    if (btnBatchSendGas) btnBatchSendGas.addEventListener('click', () => { window.DashboardActions.batchSendToGas(historyList, window.DashboardTabs.getActiveCategoryId()); toggleExportPanel(false); });
    if (btnAddToScrum) btnAddToScrum.addEventListener('click', () => { window.DashboardActions.addStockToScrumTask(currentStock, noteInput); toggleExportPanel(false); });

    // 頂部研報筆記與輸出中心下拉選單
    if (btnToggleExportPanel) btnToggleExportPanel.addEventListener('click', (e) => { e.stopPropagation(); toggleExportPanel(); });
    if (btnCloseExportPanel) btnCloseExportPanel.addEventListener('click', (e) => { e.stopPropagation(); toggleExportPanel(false); });
    if (exportDropdownPanel) exportDropdownPanel.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('click', (e) => {
      if (exportDropdownPanel && exportDropdownPanel.style.display !== 'none') {
        if (!exportDropdownPanel.contains(e.target) && !btnToggleExportPanel.contains(e.target)) toggleExportPanel(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && exportDropdownPanel && exportDropdownPanel.style.display !== 'none') toggleExportPanel(false);
    });

    // 筆記即時防抖暫存
    if (noteInput) {
      let noteSaveTimer = null;
      noteInput.addEventListener('input', () => {
        clearTimeout(noteSaveTimer);
        noteSaveTimer = setTimeout(() => {
          chrome.storage.local.set({ contextNote: noteInput.value });
        }, 300);
      });
    }

    // 清空歷史清單
    btnClearHistory.addEventListener('click', () => {
      if (confirm('確定要清空所有已記錄的歷史標的嗎？')) {
        chrome.storage.local.remove(['stockHistory', 'latestStockData'], () => {
          historyList = [];
          currentStock = null;
          renderHistoryList();
          renderTabs();
          showEmptyState();
          showToast('歷史追蹤清單已清空');
        });
      }
    });

    // 設定彈窗控制
    btnOpenSettings.addEventListener('click', () => { settingsModal.style.display = 'flex'; });
    btnCloseSettings.addEventListener('click', () => { settingsModal.style.display = 'none'; });
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.style.display = 'none'; });
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
          window.DashboardAI.checkAiStatus();
        }
        settingsModal.style.display = 'none';
        showToast('✅ 儀表板與 AI 連線設定已儲存！');
      });
    });

    // 視圖切換 (View Switcher) 按鈕事件
    if (tabBtnSingle) tabBtnSingle.addEventListener('click', () => switchView('single'));
    if (tabBtnPeer) tabBtnPeer.addEventListener('click', () => switchView('peer'));
    if (tabBtnValuation) tabBtnValuation.addEventListener('click', () => switchView('valuation'));

    // 同業對比快捷操作
    if (btnPeerSelectAllCat) {
      btnPeerSelectAllCat.addEventListener('click', () => {
        const top5 = window.DashboardActions.peerSelection.selectCategoryTickers(window.DashboardTabs.getActiveCategoryId(), historyList, 5);
        renderHistoryList();
        renderPeerSelectorUI();
        showToast(`⚡ 已快捷選取當前族群前 ${top5.length} 檔標的`);
      });
    }

    if (btnPeerClearAll) {
      btnPeerClearAll.addEventListener('click', () => {
        window.DashboardActions.peerSelection.clearTickers();
        renderHistoryList();
        renderPeerSelectorUI();
        showToast('已清空同業比對標的');
      });
    }

    if (peerQuickAddSelect) {
      peerQuickAddSelect.addEventListener('change', (e) => {
        const ticker = e.target.value;
        if (!ticker) return;
        const res = window.DashboardActions.peerSelection.addTicker(ticker, 5);
        if (!res.success && res.error) {
          showToast(res.error);
        } else {
          renderHistoryList();
          renderPeerSelectorUI();
        }
        peerQuickAddSelect.value = '';
      });
    }

    if (btnPeerCopyMarkdown) {
      btnPeerCopyMarkdown.addEventListener('click', () => {
        const selected = window.DashboardActions.peerSelection.getSelectedTickers();
        window.DashboardPeerActions.exportPeerMarkdown(selected, historyList);
      });
    }

    if (btnPeerSendGas) {
      btnPeerSendGas.addEventListener('click', () => {
        const selected = window.DashboardActions.peerSelection.getSelectedTickers();
        window.DashboardPeerActions.sendPeerToGas(selected, historyList);
      });
    }

    if (sandboxBaseTickerSelect) {
      sandboxBaseTickerSelect.addEventListener('change', () => {
        renderValuationSandboxView();
      });
    }

    if (btnCopyFinancialsTsv) {
      btnCopyFinancialsTsv.addEventListener('click', () => {
        window.DashboardActions.copyFinancialsCleanTsv(currentStock, uiElements.financialsTableWrap);
      });
    }

    // 實時監聽 Storage 設定變更（若從 Popup 或其他視圖修改能即時同步）
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      // GAS Web App URL 實時同步
      if (changes.gasUrl || changes.appsScriptUrl) {
        const newGas = (changes.gasUrl && changes.gasUrl.newValue) || (changes.appsScriptUrl && changes.appsScriptUrl.newValue);
        if (newGas && settingGasUrl && settingGasUrl.value !== newGas) {
          settingGasUrl.value = newGas;
        }
      }

      // Sheets URL 實時同步
      if (changes.sheetsUrl || changes.userSpreadsheetUrl) {
        const newSheets = (changes.sheetsUrl && changes.sheetsUrl.newValue) || (changes.userSpreadsheetUrl && changes.userSpreadsheetUrl.newValue);
        if (newSheets && settingSheetsUrl && settingSheetsUrl.value !== newSheets) {
          settingSheetsUrl.value = newSheets;
        }
      }

      // Token 與 ScrumClock 設定實時同步
      if (changes.gasSecretToken && settingGasSecret) {
        if (changes.gasSecretToken.newValue !== undefined) {
          settingGasSecret.value = changes.gasSecretToken.newValue || '';
        }
      }
      if (changes.scrumclock_ext_id && settingScrumclockId) {
        if (changes.scrumclock_ext_id.newValue !== undefined) {
          settingScrumclockId.value = changes.scrumclock_ext_id.newValue || '';
        }
      }

      // 監聽 Popup 廣播之最新標的
      if (changes.lastCapturedStock && changes.lastCapturedStock.newValue) {
        const captured = changes.lastCapturedStock.newValue;
        const capturedTicker = (captured.ticker || '').trim().toUpperCase();
        if (capturedTicker) {
          const currentTicker = currentStock && currentStock.ticker ? currentStock.ticker.toUpperCase() : '';
          if (currentTicker !== capturedTicker) {
            const priceText = captured.price ? `（$${captured.price}）` : '';
            const toastMsg = `📥 Popup 已擷取標的 ${capturedTicker}${priceText}，點擊立即載入`;

            showToast(toastMsg, 6000, () => {
              if (searchInput) searchInput.value = capturedTicker;
              if (currentView !== 'single') {
                switchView('single');
              }
              const matched = historyList.find((s) => s.ticker && s.ticker.toUpperCase() === capturedTicker);
              if (matched) {
                renderStock(matched);
              }
              triggerCrawl(capturedTicker);
            });
          }
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
