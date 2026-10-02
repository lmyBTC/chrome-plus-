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

  // 族群分類預設與狀態管理
  const DEFAULT_CATEGORIES = [
    { id: 'all', name: '全部標的', isSystem: true },
    { id: 'core', name: '自選核心' },
    { id: 'tech', name: '科技半導體' }
  ];
  let categories = [...DEFAULT_CATEGORIES];
  let activeCategoryId = 'all';

  // 自訂主題式標籤 (Topic Tags) 預設與狀態管理
  const DEFAULT_TOPIC_TAGS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', '2330'];
  let topicTags = [...DEFAULT_TOPIC_TAGS];

  // DOM 元素快取
  const searchInput = document.getElementById('dashboard-search-input');
  const btnCrawl = document.getElementById('btn-dashboard-crawl');
  const crawlSpinner = document.getElementById('crawl-spinner');
  const emptyState = document.getElementById('empty-state');
  const stockContentSection = document.getElementById('stock-content-section');
  const historyListContainer = document.getElementById('history-list-container');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const sidebarActiveCatBadge = document.getElementById('sidebar-active-cat-badge');
  const topicTagsList = document.getElementById('topic-tags-list');
  const btnAddTopicTag = document.getElementById('btn-add-topic-tag');

  // 底部族群分類分頁列元素
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

  // 頂部研報筆記與輸出中心下拉選單
  const btnToggleExportPanel = document.getElementById('btn-toggle-export-panel');
  const exportDropdownPanel = document.getElementById('export-dropdown-panel');
  const btnCloseExportPanel = document.getElementById('btn-close-export-panel');

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
    // 同步高亮選中的標的與族群分頁
    if (window.DashboardRender && window.DashboardRender.highlightActiveHistoryItem) {
      window.DashboardRender.highlightActiveHistoryItem(
        stock ? stock.ticker : '',
        historyListContainer,
        activeCategoryId,
        sheetTabContainer
      );
    }
  }

  function getFilteredHistoryList() {
    if (activeCategoryId === 'all') {
      return historyList;
    }
    return historyList.filter((item) => {
      const catId = item.categoryId || 'core';
      return catId === activeCategoryId;
    });
  }

  function updateSidebarBadge() {
    if (sidebarActiveCatBadge) {
      const cur = categories.find((c) => c.id === activeCategoryId);
      sidebarActiveCatBadge.textContent = cur ? cur.name : '全部標的';
    }
  }

  function renderHistoryList() {
    updateSidebarBadge();
    const filtered = getFilteredHistoryList();
    window.DashboardRender.renderHistoryList(
      filtered,
      currentStock,
      historyListContainer,
      categories,
      (stock) => renderStock(stock),
      (ticker, newCatId) => updateStockCategory(ticker, newCatId)
    );
  }

  function renderCategoryTabs() {
    window.DashboardRender.renderCategoryTabs(
      categories,
      activeCategoryId,
      historyList,
      sheetTabContainer,
      sheetTabCount,
      {
        onSelectCategory: (catId) => selectCategory(catId),
        onEditCategory: (catId, newName) => renameCategory(catId, newName),
        onDeleteCategory: (catId, catName) => deleteCategory(catId, catName)
      }
    );
  }

  // 向下相容
  function renderSheetTabs() {
    renderCategoryTabs();
  }

  function selectCategory(catId) {
    activeCategoryId = catId;
    chrome.storage.local.set({ activeCategoryId: catId }, () => {
      renderCategoryTabs();
      renderHistoryList();
      const filtered = getFilteredHistoryList();
      // 若當前顯示的標的不在所選族群中，自動切換至該族群第一檔標的
      if (currentStock && !filtered.some((it) => it.ticker === currentStock.ticker)) {
        if (filtered.length > 0) {
          renderStock(filtered[0]);
        }
      }
    });
  }

  function promptAddCategory() {
    const name = prompt('請輸入新族群分類名稱 (例如: AI概念、綠能供應鏈):');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (categories.some((c) => c.name === trimmed)) {
      showToast('⚠️ 已存在相同名稱的族群分類！');
      return;
    }
    const newCategory = {
      id: 'cat_' + Date.now(),
      name: trimmed
    };
    categories.push(newCategory);
    activeCategoryId = newCategory.id;
    chrome.storage.local.set({ categories, activeCategoryId }, () => {
      renderCategoryTabs();
      renderHistoryList();
      showToast(`✅ 已新增並切換至「${trimmed}」族群`);
    });
  }

  function renameCategory(catId, newName) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat || cat.isSystem) return;
    cat.name = newName;
    chrome.storage.local.set({ categories }, () => {
      renderCategoryTabs();
      renderHistoryList();
      showToast(`✅ 已更名為「${newName}」`);
    });
  }

  function deleteCategory(catId, catName) {
    if (!confirm(`確定要刪除「${catName}」族群嗎？該族群下的標的將移至「自選核心」。`)) return;
    categories = categories.filter((c) => c.id !== catId);
    historyList = historyList.map((it) => {
      if (it.categoryId === catId) {
        return { ...it, categoryId: 'core' };
      }
      return it;
    });
    if (activeCategoryId === catId) {
      activeCategoryId = 'all';
    }
    chrome.storage.local.set({ categories, stockHistory: historyList, activeCategoryId }, () => {
      renderCategoryTabs();
      renderHistoryList();
      showToast(`🗑️ 已刪除「${catName}」族群`);
    });
  }

  function updateStockCategory(ticker, newCatId) {
    const target = historyList.find((it) => it.ticker === ticker);
    if (target) {
      target.categoryId = newCatId;
      chrome.storage.local.set({ stockHistory: historyList }, () => {
        renderCategoryTabs();
        renderHistoryList();
        const catObj = categories.find((c) => c.id === newCatId);
        showToast(`📌 [${ticker}] 已歸入「${catObj ? catObj.name : newCatId}」`);
      });
    }
  }

  // ===== 自訂主題式分類標籤 (Topic Tags) 控制 =====
  function renderTopicTags() {
    if (!window.DashboardRender || !window.DashboardRender.renderTopicTags) return;
    window.DashboardRender.renderTopicTags(
      topicTags,
      topicTagsList,
      {
        onSelectTag: (tag) => {
          if (searchInput) searchInput.value = tag;
          triggerCrawl(tag);
        },
        onRemoveTag: (tag) => removeTopicTag(tag)
      }
    );
  }

  function addTopicTag(tagText) {
    const trimmed = (tagText || '').trim().toUpperCase();
    if (!trimmed) return;
    if (topicTags.includes(trimmed)) {
      showToast(`⚠️ 主題標籤「${trimmed}」已存在！`);
      return;
    }
    topicTags.push(trimmed);
    chrome.storage.local.set({ custom_topic_tags: topicTags }, () => {
      renderTopicTags();
      showToast(`✅ 已新增主題標籤「${trimmed}」`);
    });
  }

  function removeTopicTag(tagText) {
    topicTags = topicTags.filter((t) => t !== tagText);
    chrome.storage.local.set({ custom_topic_tags: topicTags }, () => {
      renderTopicTags();
      showToast(`🗑️ 已移除主題標籤「${tagText}」`);
    });
  }

  function promptAddTopicTag() {
    const name = prompt('請輸入新主題標籤或股票代號 (例如: AMZN, 2330, AI概念):');
    if (!name || !name.trim()) return;
    addTopicTag(name.trim());
  }

  function triggerCrawl(keyword) {
    window.DashboardActions.triggerCrawl(
      keyword,
      { btnCrawl, crawlSpinner },
      {
        onCrawlSuccess: (data) => {
          chrome.storage.local.get(['stockHistory'], (storageRes) => {
            const rawList = storageRes.stockHistory || [];
            // 若為新採集標的，預設綁定至當前族群（若當前為 all 則綁定至 core）
            const defaultCat = activeCategoryId === 'all' ? 'core' : activeCategoryId;
            historyList = rawList.map((it) => {
              if (it.ticker === data.ticker && !it.categoryId) {
                return { ...it, categoryId: defaultCat };
              }
              return it;
            });
            chrome.storage.local.set({ stockHistory: historyList }, () => {
              renderHistoryList();
              renderCategoryTabs();
              renderStock(data);
            });
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

  function toggleExportPanel(force) {
    if (!exportDropdownPanel || !btnToggleExportPanel) return;
    const isCurrentlyOpen = exportDropdownPanel.style.display !== 'none';
    const nextState = typeof force === 'boolean' ? force : !isCurrentlyOpen;

    if (nextState) {
      exportDropdownPanel.style.display = 'block';
      btnToggleExportPanel.classList.add('active');
      if (noteInput) {
        setTimeout(() => noteInput.focus(), 50);
      }
    } else {
      exportDropdownPanel.style.display = 'none';
      btnToggleExportPanel.classList.remove('active');
    }
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
    const extId = (settingScrumclockId ? settingScrumclockId.value.trim() : '') || 'ahiihabnbjeoeneahcgbdcofncjoclcp';

    scrumclockConnStatus.textContent = '連線測試中 (PING_HUB)...';
    scrumclockConnStatus.style.color = 'var(--text-secondary)';

    const res = await window.FinanceAIClient.checkAvailability(extId);
    if (res.success) {
      const capText = res.capabilities && res.capabilities.length ? `[${res.capabilities.join(', ')}]` : '';
      scrumclockConnStatus.textContent = `✅ 連線成功！中樞：${res.hub || 'ScrumClock'} ${capText} - ${res.model}`;
      scrumclockConnStatus.style.color = 'var(--accent-green)';
      checkAiStatus();
    } else {
      scrumclockConnStatus.textContent = `❌ ${res.error || '連線失敗或中樞未回應'}`;
      scrumclockConnStatus.style.color = 'var(--accent-red)';
    }
  }

  // 初始化載入本地數據
  function init() {
    console.log('[FinanceClipper] 儀表板初始化中 (純本地模式優先)...');
    chrome.storage.local.get([
      'latestStockData', 'stockHistory', 
      'categories', 'activeCategoryId',
      'custom_topic_tags',
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
      if (settingScrumclockId) {
        settingScrumclockId.value = res.scrumclock_ext_id || 'ahiihabnbjeoeneahcgbdcofncjoclcp';
      }

      // 載入族群列表與目前選中族群
      if (res.categories && Array.isArray(res.categories) && res.categories.length > 0) {
        categories = res.categories;
        if (!categories.find((c) => c.id === 'all')) {
          categories.unshift({ id: 'all', name: '全部標的', isSystem: true });
        }
      } else {
        categories = [...DEFAULT_CATEGORIES];
      }

      activeCategoryId = res.activeCategoryId || 'all';
      if (!categories.find((c) => c.id === activeCategoryId)) {
        activeCategoryId = 'all';
      }

      // 既有歷史資料平滑遷移 (無 categoryId 者預設歸入 core)
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

      console.log(`[FinanceClipper] 本地已載入 ${historyList.length} 檔歷史標的，當前族群：${activeCategoryId}。`);
      renderHistoryList();
      renderCategoryTabs();

      // 載入自訂主題標籤
      if (res.custom_topic_tags && Array.isArray(res.custom_topic_tags) && res.custom_topic_tags.length > 0) {
        topicTags = res.custom_topic_tags;
      } else {
        topicTags = [...DEFAULT_TOPIC_TAGS];
      }
      renderTopicTags();

      checkAiStatus();

      const filtered = getFilteredHistoryList();
      if (res.latestStockData) {
        renderStock(res.latestStockData);
      } else if (filtered.length > 0) {
        renderStock(filtered[0]);
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

    // 新增主題標籤按鈕
    if (btnAddTopicTag) {
      btnAddTopicTag.addEventListener('click', promptAddTopicTag);
    }

    // 匯出功能
    btnCopyMarkdown.addEventListener('click', exportMarkdown);
    btnDownloadCsv.addEventListener('click', exportCsv);
    btnSendGas.addEventListener('click', sendToGas);
    if (btnBatchSendGas) btnBatchSendGas.addEventListener('click', batchSendToGas);
    if (btnAddToScrum) btnAddToScrum.addEventListener('click', addStockToScrumTask);

    // 頂部研報筆記與輸出中心下拉選單控制
    if (btnToggleExportPanel) {
      btnToggleExportPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportPanel();
      });
    }

    if (btnCloseExportPanel) {
      btnCloseExportPanel.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportPanel(false);
      });
    }

    if (exportDropdownPanel) {
      exportDropdownPanel.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // 點擊面板外部自動收合
    document.addEventListener('click', (e) => {
      if (exportDropdownPanel && exportDropdownPanel.style.display !== 'none') {
        if (!exportDropdownPanel.contains(e.target) && !btnToggleExportPanel.contains(e.target)) {
          toggleExportPanel(false);
        }
      }
    });

    // 按下 Esc 鍵自動收合面板
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && exportDropdownPanel && exportDropdownPanel.style.display !== 'none') {
        toggleExportPanel(false);
      }
    });

    // 筆記內容即時防抖暫存 (300ms)
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
          renderCategoryTabs();
          showEmptyState();
          showToast('歷史追蹤清單已清空');
        });
      }
    });

    // 底部族群分頁控制按鈕
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
      btnTabAdd.addEventListener('click', promptAddCategory);
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
          const rawList = storageRes.stockHistory || [];
          const defaultCat = activeCategoryId === 'all' ? 'core' : activeCategoryId;
          historyList = rawList.map((it) => {
            if (it.ticker === msg.data.ticker && !it.categoryId) {
              return { ...it, categoryId: defaultCat };
            }
            return it;
          });
          chrome.storage.local.set({ stockHistory: historyList }, () => {
            renderHistoryList();
            renderCategoryTabs();
            renderStock(msg.data);
          });
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
