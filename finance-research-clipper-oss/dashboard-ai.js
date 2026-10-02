/**
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
