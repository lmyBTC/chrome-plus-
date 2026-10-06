"""
split_dashboard_phase3.py
自動執行 FinanceClipper 儀表板 Phase 3 控制器邏輯解耦任務：
1. 建立 dashboard-tabs.js (族群分類與自訂標籤之狀態管理、CRUD 與專屬事件)
2. 建立 dashboard-ai.js (Gemini Nano AI 研報推論狀態、渲染與專屬事件)
3. 淨化 dashboard.js，將 Tabs/Tags 與 AI 職責全面委派，控制在 <= 600 行健康區間
4. 更新 dashboard.html 引入新腳本
5. 驗證所有檔案行數與語法
"""

import os
import sys

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "finance-research-clipper-oss"))

DASHBOARD_TABS_CONTENT = '''/**
 * dashboard-tabs.js - Finance Research Clipper 族群分類與自訂標籤邏輯控制模組
 * 負責 Categories 族群、Topic Tags 自訂標籤之狀態管理、CRUD 操作與專屬 DOM 事件
 */

(function () {
  'use strict';

  const DEFAULT_CATEGORIES = [
    { id: 'all', name: '全部標的', isSystem: true },
    { id: 'core', name: '自選核心' },
    { id: 'tech', name: '科技半導體' }
  ];

  const DEFAULT_TOPIC_TAGS = ['NVDA', 'TSLA', 'AAPL', 'MSFT', '2330'];

  let categories = [...DEFAULT_CATEGORIES];
  let activeCategoryId = 'all';
  let topicTags = [...DEFAULT_TOPIC_TAGS];

  // DOM 緩存
  let sheetTabContainer = null;
  let sheetTabCount = null;
  let topicTagsList = null;
  let btnTabPrev = null;
  let btnTabNext = null;
  let btnTabAdd = null;
  let btnAddTopicTag = null;

  const DashboardTabs = {
    DEFAULT_CATEGORIES,
    DEFAULT_TOPIC_TAGS,

    init: function (storageData) {
      sheetTabContainer = document.getElementById('sheets-tab-container');
      sheetTabCount = document.getElementById('sheet-tab-count');
      topicTagsList = document.getElementById('topic-tags-list');
      btnTabPrev = document.getElementById('btn-tab-prev');
      btnTabNext = document.getElementById('btn-tab-next');
      btnTabAdd = document.getElementById('btn-tab-add');
      btnAddTopicTag = document.getElementById('btn-add-topic-tag');

      if (storageData) {
        if (storageData.categories && Array.isArray(storageData.categories) && storageData.categories.length > 0) {
          categories = storageData.categories;
        } else {
          categories = [...DEFAULT_CATEGORIES];
        }

        if (storageData.activeCategoryId) {
          activeCategoryId = storageData.activeCategoryId;
        }

        if (storageData.custom_topic_tags && Array.isArray(storageData.custom_topic_tags) && storageData.custom_topic_tags.length > 0) {
          topicTags = storageData.custom_topic_tags;
        } else {
          topicTags = [...DEFAULT_TOPIC_TAGS];
        }
      }
    },

    getCategories: function () {
      return categories;
    },

    setCategories: function (cats) {
      categories = cats;
    },

    getActiveCategoryId: function () {
      return activeCategoryId;
    },

    setActiveCategoryId: function (catId) {
      activeCategoryId = catId;
    },

    getTopicTags: function () {
      return topicTags;
    },

    filterHistoryList: function (historyList) {
      if (!historyList) return [];
      if (activeCategoryId === 'all') return historyList;
      return historyList.filter((item) => (item.categoryId || 'core') === activeCategoryId);
    },

    renderCategoryTabs: function (historyList, callbacks) {
      if (!window.DashboardRender || !window.DashboardRender.renderCategoryTabs) return;
      window.DashboardRender.renderCategoryTabs(
        categories,
        activeCategoryId,
        historyList,
        sheetTabContainer,
        sheetTabCount,
        {
          onSelectCategory: (catId) => DashboardTabs.selectCategory(catId, callbacks),
          onEditCategory: (catId, newName) => DashboardTabs.renameCategory(catId, newName, callbacks),
          onDeleteCategory: (catId, catName) => DashboardTabs.deleteCategory(catId, catName, callbacks)
        }
      );
    },

    selectCategory: function (catId, callbacks) {
      const { onSelected, getHistoryList, getCurrentStock, onStockChange } = callbacks || {};
      activeCategoryId = catId;
      chrome.storage.local.set({ activeCategoryId: catId }, () => {
        if (typeof onSelected === 'function') onSelected(catId);
        const historyList = typeof getHistoryList === 'function' ? getHistoryList() : [];
        const currentStock = typeof getCurrentStock === 'function' ? getCurrentStock() : null;
        const filtered = DashboardTabs.filterHistoryList(historyList);
        if (currentStock && !filtered.some((it) => it.ticker === currentStock.ticker)) {
          if (filtered.length > 0 && typeof onStockChange === 'function') {
            onStockChange(filtered[0]);
          }
        }
      });
    },

    promptAddCategory: function (callbacks) {
      const { onAdded, showToast } = callbacks || {};
      const name = prompt('請輸入新族群分類名稱 (例如: AI概念、綠能供應鏈):');
      if (!name || !name.trim()) return;
      const trimmed = name.trim();
      if (categories.some((c) => c.name === trimmed)) {
        if (showToast) showToast('⚠️ 已存在相同名稱的族群分類！');
        return;
      }
      const newCategory = { id: 'cat_' + Date.now(), name: trimmed };
      categories.push(newCategory);
      activeCategoryId = newCategory.id;
      chrome.storage.local.set({ categories, activeCategoryId }, () => {
        if (typeof onAdded === 'function') onAdded(newCategory);
        if (showToast) showToast(`✅ 已新增並切換至「${trimmed}」族群`);
      });
    },

    renameCategory: function (catId, newName, callbacks) {
      const { onRenamed, showToast } = callbacks || {};
      const cat = categories.find((c) => c.id === catId);
      if (!cat || cat.isSystem) return;
      cat.name = newName;
      chrome.storage.local.set({ categories }, () => {
        if (typeof onRenamed === 'function') onRenamed(cat);
        if (showToast) showToast(`✅ 已更名為「${newName}」`);
      });
    },

    deleteCategory: function (catId, catName, callbacks) {
      const { getHistoryList, setHistoryList, onDeleted, showToast } = callbacks || {};
      if (!confirm(`確定要刪除「${catName}」族群嗎？該族群下的標的將移至「自選核心」。`)) return;
      categories = categories.filter((c) => c.id !== catId);
      let historyList = typeof getHistoryList === 'function' ? getHistoryList() : [];
      historyList = historyList.map((it) => (it.categoryId === catId ? { ...it, categoryId: 'core' } : it));
      if (typeof setHistoryList === 'function') setHistoryList(historyList);
      if (activeCategoryId === catId) activeCategoryId = 'all';

      chrome.storage.local.set({ categories, stockHistory: historyList, activeCategoryId }, () => {
        if (typeof onDeleted === 'function') onDeleted(catId);
        if (showToast) showToast(`🗑️ 已刪除「${catName}」族群`);
      });
    },

    updateStockCategory: function (ticker, newCatId, callbacks) {
      const { getHistoryList, onUpdated, showToast } = callbacks || {};
      let historyList = typeof getHistoryList === 'function' ? getHistoryList() : [];
      const target = historyList.find((it) => it.ticker === ticker);
      if (target) {
        target.categoryId = newCatId;
        chrome.storage.local.set({ stockHistory: historyList }, () => {
          if (typeof onUpdated === 'function') onUpdated(ticker, newCatId);
          const catObj = categories.find((c) => c.id === newCatId);
          if (showToast) showToast(`📌 [${ticker}] 已歸入「${catObj ? catObj.name : newCatId}」`);
        });
      }
    },

    renderTopicTags: function (callbacks) {
      if (!window.DashboardRender || !window.DashboardRender.renderTopicTags) return;
      const { onSelectTag, showToast, onTagsChanged } = callbacks || {};
      window.DashboardRender.renderTopicTags(
        topicTags,
        topicTagsList,
        {
          onSelectTag: (tag) => {
            if (typeof onSelectTag === 'function') onSelectTag(tag);
          },
          onRemoveTag: (tag) => DashboardTabs.removeTopicTag(tag, { showToast, onTagsChanged })
        }
      );
    },

    addTopicTag: function (tagText, callbacks) {
      const { showToast, onTagsChanged } = callbacks || {};
      const trimmed = (tagText || '').trim().toUpperCase();
      if (!trimmed) return;
      if (topicTags.includes(trimmed)) {
        if (showToast) showToast(`⚠️ 主題標籤「${trimmed}」已存在！`);
        return;
      }
      topicTags.push(trimmed);
      chrome.storage.local.set({ custom_topic_tags: topicTags }, () => {
        if (typeof onTagsChanged === 'function') onTagsChanged(topicTags);
        if (showToast) showToast(`✅ 已新增主題標籤「${trimmed}」`);
      });
    },

    removeTopicTag: function (tagText, callbacks) {
      const { showToast, onTagsChanged } = callbacks || {};
      topicTags = topicTags.filter((t) => t !== tagText);
      chrome.storage.local.set({ custom_topic_tags: topicTags }, () => {
        if (typeof onTagsChanged === 'function') onTagsChanged(topicTags);
        if (showToast) showToast(`🗑️ 已移除主題標籤「${tagText}」`);
      });
    },

    promptAddTopicTag: function (callbacks) {
      const name = prompt('請輸入新主題標籤或股票代號 (例如: AMZN, 2330, AI概念):');
      if (!name || !name.trim()) return;
      DashboardTabs.addTopicTag(name.trim(), callbacks);
    },

    bindEvents: function (callbacks) {
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
        btnTabAdd.addEventListener('click', () => DashboardTabs.promptAddCategory(callbacks));
      }

      if (btnAddTopicTag) {
        btnAddTopicTag.addEventListener('click', () => DashboardTabs.promptAddTopicTag(callbacks));
      }
    }
  };

  window.DashboardTabs = DashboardTabs;
})();
'''

DASHBOARD_AI_CONTENT = '''/**
 * dashboard-ai.js - Finance Research Clipper 本機 Gemini Nano AI 研報推論與狀態管理模組
 * 負責本機 AI 服務檢測、研報快取載入、推論進度渲染、Markdown 複製與專屬面板事件
 */

(function () {
  'use strict';

  let currentAiSummary = null;

  // DOM 元素快取
  let btnGenerateAi = null;
  let btnRefreshAi = null;
  let btnCopyAiMarkdown = null;
  let aiBtnSpinner = null;
  let aiStatusIndicator = null;
  let aiLoadingContainer = null;
  let aiIdleState = null;
  let aiResultContainer = null;
  let aiQuickTakeList = null;
  let aiBullCaseList = null;
  let aiBearCaseList = null;
  let aiFinancialHealthText = null;
  let aiMetaTimestamp = null;
  let aiMetaSource = null;
  let aiErrorNotice = null;
  let aiErrorMessage = null;
  let btnOpenAiSettings = null;
  let settingScrumclockId = null;
  let btnTestAiConn = null;
  let scrumclockConnStatus = null;

  const DashboardAI = {
    init: function () {
      btnGenerateAi = document.getElementById('btn-generate-ai');
      btnRefreshAi = document.getElementById('btn-refresh-ai');
      btnCopyAiMarkdown = document.getElementById('btn-copy-ai-markdown');
      aiBtnSpinner = document.getElementById('ai-btn-spinner');
      aiStatusIndicator = document.getElementById('ai-status-indicator');
      aiLoadingContainer = document.getElementById('ai-loading-container');
      aiIdleState = document.getElementById('ai-idle-state');
      aiResultContainer = document.getElementById('ai-result-container');
      aiQuickTakeList = document.getElementById('ai-quick-take-list');
      aiBullCaseList = document.getElementById('ai-bull-case-list');
      aiBearCaseList = document.getElementById('ai-bear-case-list');
      aiFinancialHealthText = document.getElementById('ai-financial-health-text');
      aiMetaTimestamp = document.getElementById('ai-meta-timestamp');
      aiMetaSource = document.getElementById('ai-meta-source');
      aiErrorNotice = document.getElementById('ai-error-notice');
      aiErrorMessage = document.getElementById('ai-error-message');
      btnOpenAiSettings = document.getElementById('btn-open-ai-settings');
      settingScrumclockId = document.getElementById('setting-scrumclock-id');
      btnTestAiConn = document.getElementById('btn-test-ai-conn');
      scrumclockConnStatus = document.getElementById('scrumclock-conn-status');
    },

    getCurrentAiSummary: function () {
      return currentAiSummary;
    },

    checkAiStatus: async function () {
      if (!window.FinanceAIClient || !aiStatusIndicator) return;
      const res = await window.FinanceAIClient.checkAvailability();
      if (res.success && res.available) {
        aiStatusIndicator.className = 'ai-status-dot connected';
        aiStatusIndicator.title = `已連線: ${res.model || 'Gemini Nano'}`;
      } else {
        aiStatusIndicator.className = 'ai-status-dot';
        aiStatusIndicator.title = res.error || 'ScrumClock AI 服務未連線';
      }
    },

    showAiLoading: function (isLoading) {
      if (!aiLoadingContainer || !btnGenerateAi) return;
      if (isLoading) {
        aiLoadingContainer.style.display = 'flex';
        if (aiIdleState) aiIdleState.style.display = 'none';
        if (aiResultContainer) aiResultContainer.style.display = 'none';
        if (aiErrorNotice) aiErrorNotice.style.display = 'none';
        btnGenerateAi.disabled = true;
        btnGenerateAi.style.opacity = '0.7';
        if (aiBtnSpinner) aiBtnSpinner.style.display = 'inline';
      } else {
        aiLoadingContainer.style.display = 'none';
        btnGenerateAi.disabled = false;
        btnGenerateAi.style.opacity = '1';
        if (aiBtnSpinner) aiBtnSpinner.style.display = 'none';
      }
    },

    showAiError: function (errorMessage) {
      DashboardAI.showAiLoading(false);
      if (aiErrorNotice && aiErrorMessage) {
        aiErrorNotice.style.display = 'block';
        aiErrorMessage.textContent = errorMessage;
        if (aiIdleState) aiIdleState.style.display = 'none';
        if (aiResultContainer) aiResultContainer.style.display = 'none';
      }
    },

    renderAiSummary: function (summary) {
      currentAiSummary = summary;
      if (!summary || !aiResultContainer) return;

      // 1. 三句話速讀
      if (aiQuickTakeList) {
        aiQuickTakeList.textContent = '';
        const quickTake = Array.isArray(summary.quickTake) ? summary.quickTake : [];
        quickTake.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          aiQuickTakeList.appendChild(li);
        });
      }

      // 2. 多方核心看點
      if (aiBullCaseList) {
        aiBullCaseList.textContent = '';
        const bullCase = Array.isArray(summary.bullCase) ? summary.bullCase : [];
        bullCase.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          aiBullCaseList.appendChild(li);
        });
      }

      // 3. 空方核心疑慮
      if (aiBearCaseList) {
        aiBearCaseList.textContent = '';
        const bearCase = Array.isArray(summary.bearCase) ? summary.bearCase : [];
        bearCase.forEach((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          aiBearCaseList.appendChild(li);
        });
      }

      // 4. 財務健康評語
      if (aiFinancialHealthText) {
        aiFinancialHealthText.textContent = summary.financialHealth || '無財務健康特別評語。';
      }

      // 5. 元數據
      if (aiMetaTimestamp) {
        aiMetaTimestamp.textContent = `生成時間：${summary.generatedAt || new Date().toLocaleTimeString()}`;
      }
      if (aiMetaSource && summary.model) {
        aiMetaSource.textContent = `推論核心：${summary.model}`;
      }

      if (aiIdleState) aiIdleState.style.display = 'none';
      if (aiErrorNotice) aiErrorNotice.style.display = 'none';
      aiResultContainer.style.display = 'flex';
      if (btnRefreshAi) btnRefreshAi.style.display = 'inline-flex';
      if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'inline-flex';
      if (btnGenerateAi) btnGenerateAi.style.display = 'none';
    },

    loadStockAi: async function (stock, forceRefresh = false, callbacks) {
      const { showToast } = callbacks || {};
      if (!stock || !stock.ticker) return;
      if (aiErrorNotice) aiErrorNotice.style.display = 'none';

      if (!forceRefresh) {
        const cached = await window.FinanceAIClient?.getCachedSummary(stock.ticker);
        if (cached) {
          console.log(`[FinanceClipper] 載入 ${stock.ticker} 當日 AI 快取研報`);
          DashboardAI.renderAiSummary(cached);
          return;
        }

        currentAiSummary = null;
        if (aiIdleState) aiIdleState.style.display = 'block';
        if (aiResultContainer) aiResultContainer.style.display = 'none';
        if (btnRefreshAi) btnRefreshAi.style.display = 'none';
        if (btnCopyAiMarkdown) btnCopyAiMarkdown.style.display = 'none';
        if (btnGenerateAi) btnGenerateAi.style.display = 'inline-flex';
        return;
      }

      DashboardAI.showAiLoading(true);
      if (showToast) showToast(`🤖 正在為 ${stock.ticker} 調用本地 Gemini Nano 分析中...`);

      const result = await window.FinanceAIClient?.requestStockSummary(stock, true);
      DashboardAI.showAiLoading(false);

      if (result && result.success && result.summary) {
        DashboardAI.renderAiSummary(result.summary);
        if (showToast) showToast('✨ Gemini Nano 研報摘要已生成完畢！');
      } else {
        DashboardAI.showAiError(result?.error || '無法取得 AI 分析結果，請確認 ScrumClock 是否運行且已啟用 Gemini Nano。');
        if (showToast) showToast('⚠️ AI 生成未完成，請檢視面板提示。');
      }
    },

    copyAiMarkdownOnly: function (callbacks) {
      const { showToast } = callbacks || {};
      if (!currentAiSummary || !currentAiSummary.rawMarkdown) {
        if (showToast) showToast('⚠️ 目前尚未生成 AI 研報摘要');
        return;
      }
      navigator.clipboard.writeText(currentAiSummary.rawMarkdown).then(() => {
        if (showToast) showToast('📋 AI 研報摘要已複製至剪貼簿！');
      }).catch(() => {
        if (showToast) showToast('複製失敗，請手動選取');
      });
    },

    testAiConnection: async function () {
      const extId = (settingScrumclockId ? settingScrumclockId.value.trim() : '') || 'ahiihabnbjeoeneahcgbdcofncjoclcp';

      if (scrumclockConnStatus) {
        scrumclockConnStatus.textContent = '連線測試中 (PING_HUB)...';
        scrumclockConnStatus.style.color = 'var(--text-secondary)';
      }

      const res = await window.FinanceAIClient.checkAvailability(extId);
      if (res.success) {
        const capText = res.capabilities && res.capabilities.length ? `[${res.capabilities.join(', ')}]` : '';
        if (scrumclockConnStatus) {
          scrumclockConnStatus.textContent = `✅ 連線成功！中樞：${res.hub || 'ScrumClock'} ${capText} - ${res.model}`;
          scrumclockConnStatus.style.color = 'var(--accent-green)';
        }
        DashboardAI.checkAiStatus();
      } else {
        if (scrumclockConnStatus) {
          scrumclockConnStatus.textContent = `❌ ${res.error || '連線失敗或中樞未回應'}`;
          scrumclockConnStatus.style.color = 'var(--accent-red)';
        }
      }
    },

    bindEvents: function (callbacks) {
      const { getCurrentStock, showToast, openSettings } = callbacks || {};

      if (btnGenerateAi) {
        btnGenerateAi.addEventListener('click', () => {
          const stock = typeof getCurrentStock === 'function' ? getCurrentStock() : null;
          if (stock) DashboardAI.loadStockAi(stock, true, { showToast });
        });
      }

      if (btnRefreshAi) {
        btnRefreshAi.addEventListener('click', () => {
          const stock = typeof getCurrentStock === 'function' ? getCurrentStock() : null;
          if (stock) DashboardAI.loadStockAi(stock, true, { showToast });
        });
      }

      if (btnCopyAiMarkdown) {
        btnCopyAiMarkdown.addEventListener('click', () => {
          DashboardAI.copyAiMarkdownOnly({ showToast });
        });
      }

      if (btnOpenAiSettings) {
        btnOpenAiSettings.addEventListener('click', () => {
          if (typeof openSettings === 'function') openSettings();
        });
      }

      if (btnTestAiConn) {
        btnTestAiConn.addEventListener('click', () => {
          DashboardAI.testAiConnection();
        });
      }
    }
  };

  window.DashboardAI = DashboardAI;
})();
'''

DASHBOARD_CLEANED_CONTENT = '''/**
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

  function showToast(msg) {
    if (window.DashboardRender && window.DashboardRender.showToast) {
      window.DashboardRender.showToast(msg);
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

    window.DashboardTabs.renderTopicTags({
      onSelectTag: (tag) => {
        if (searchInput) searchInput.value = tag;
        triggerCrawl(tag);
      },
      showToast,
      onTagsChanged: () => renderTabs()
    });
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
      'gasSecretToken',
      'sheetsUrl',
      'categories',
      'activeCategoryId',
      'custom_topic_tags',
      'scrumclock_ext_id'
    ], (res) => {
      if (res.contextNote && noteInput) noteInput.value = res.contextNote;
      if (res.gasUrl && settingGasUrl) settingGasUrl.value = res.gasUrl;
      if (res.gasSecretToken && settingGasSecret) settingGasSecret.value = res.gasSecretToken;
      if (res.sheetsUrl && settingSheetsUrl) settingSheetsUrl.value = res.sheetsUrl;
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

      const filtered = window.DashboardTabs.filterHistoryList(historyList);
      if (res.latestStockData) {
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

  // 綁定所有事件
  function bindEvents() {
    btnCrawl.addEventListener('click', () => triggerCrawl(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerCrawl(searchInput.value);
    });

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
  }

  document.addEventListener('DOMContentLoaded', init);
})();
'''

def run_modularization():
    print("[1/4] Writing dashboard-tabs.js...")
    tabs_path = os.path.join(BASE_DIR, "dashboard-tabs.js")
    with open(tabs_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(DASHBOARD_TABS_CONTENT)
    print(f" -> Created {tabs_path} ({len(DASHBOARD_TABS_CONTENT.splitlines())} lines)")

    print("[2/4] Writing dashboard-ai.js...")
    ai_path = os.path.join(BASE_DIR, "dashboard-ai.js")
    with open(ai_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(DASHBOARD_AI_CONTENT)
    print(f" -> Created {ai_path} ({len(DASHBOARD_AI_CONTENT.splitlines())} lines)")

    print("[3/4] Purifying dashboard.js...")
    dashboard_path = os.path.join(BASE_DIR, "dashboard.js")
    with open(dashboard_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(DASHBOARD_CLEANED_CONTENT)
    print(f" -> Updated {dashboard_path} ({len(DASHBOARD_CLEANED_CONTENT.splitlines())} lines)")

    print("[4/4] Updating dashboard.html scripts tag...")
    html_path = os.path.join(BASE_DIR, "dashboard.html")
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    # 確保引用 dashboard-tabs.js 與 dashboard-ai.js 在 dashboard.js 之前
    if 'src="dashboard-tabs.js"' not in html_content:
        replacement = '  <script src="dashboard-tabs.js"></script>\n  <script src="dashboard-ai.js"></script>\n  <script src="dashboard.js"></script>'
        html_content = html_content.replace('  <script src="dashboard.js"></script>', replacement)
        with open(html_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(html_content)
        print(f" -> Injected script tags into {html_path}")
    else:
        print(" -> Script tags already present in dashboard.html")

    print("\n=== Verification & File Line Counts ===")
    targets = [
        "dashboard.html",
        "dashboard-tabs-render.js",
        "dashboard-render.js",
        "dashboard-tabs.js",
        "dashboard-ai.js",
        "dashboard.js"
    ]
    all_healthy = True
    for t in targets:
        p = os.path.join(BASE_DIR, t)
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as f:
                lines = len(f.readlines())
            status = "HEALTHY (<= 650)" if lines <= 650 else "LARGE (> 650)"
            if lines > 650 and t != "dashboard.html":
                all_healthy = False
            print(f" - {t:30}: {lines:5} lines [{status}]")
        else:
            print(f" - {t:30}: NOT FOUND")

    print(f"\nAll JS target files healthy (<= 650 lines): {all_healthy}")

if __name__ == "__main__":
    run_modularization()
