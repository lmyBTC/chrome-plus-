/**
 * dashboard-actions.js - Finance Research Clipper 動作執行與匯出模組
 * 負責發起背景深度採集、Markdown/CSV 匯出、Google Sheets (GAS) 同步與轉入 ScrumClock 任務
 */

(function () {
  'use strict';

  function showToast(msg) {
    if (window.DashboardRender && window.DashboardRender.showToast) {
      window.DashboardRender.showToast(msg);
    }
  }

  function analyzeClientSentiment(text) {
    if (!text) return '😐 中性';
    const bullWords = ['看多', '看好', '買進', '成長', '強勁', '利多', '優於預期'];
    const bearWords = ['看空', '看淡', '賣出', '衰退', '疲弱', '利空', '低於預期'];
    let score = 0;
    bullWords.forEach((w) => { if (text.includes(w)) score++; });
    bearWords.forEach((w) => { if (text.includes(w)) score--; });
    if (score > 0) return '🚀 看多 (Bullish)';
    if (score < 0) return '🐻 看空 (Bearish)';
    return '😐 中性';
  }

  function isContextOrConnectionError(msg) {
    if (!msg) return false;
    return msg.includes('Receiving end does not exist') ||
           msg.includes('Could not establish connection') ||
           msg.includes('Extension context invalidated');
  }

  function safeSendMessage(message) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
          return reject(new Error('Extension context invalidated'));
        }
        chrome.runtime.sendMessage(message, (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            reject(new Error(err.message || String(err)));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function sendRuntimeMessageWithRetry(message, maxRetries = 2, initialDelay = 350) {
    let delay = initialDelay;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await safeSendMessage(message);
      } catch (error) {
        const msg = error && error.message ? error.message : '';
        if (msg.includes('Extension context invalidated')) {
          throw new Error('擴充功能已重新載入或連線失效，請按 F5 重新整理分頁以恢復連線。');
        }

        const isMissingEnd = msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection');
        if (isMissingEnd && attempt < maxRetries) {
          console.warn(`[FinanceClipper] ⚠️ 背景通道尚未就緒，將於 ${delay}ms 後進行第 ${attempt + 1} 次重試...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 1.5;
          continue;
        }

        if (isMissingEnd) {
          throw new Error('無法連線至背景服務（擴充功能已重載或背景休眠未喚醒），請按 F5 重新整理分頁後重試。');
        }

        throw error;
      }
    }
  }

  window.DashboardActions = {
    analyzeClientSentiment: analyzeClientSentiment,
    sendRuntimeMessageWithRetry: sendRuntimeMessageWithRetry,

    /**
     * 觸發背景採集
     */
    triggerCrawl: async function (keyword, uiElements, callbacks) {
      if (!keyword || !keyword.trim()) {
        console.warn('[FinanceClipper] 請輸入有效的股票代號或名稱！');
        showToast('請輸入有效的股票代號或名稱！');
        return;
      }

      const cleanKeyword = keyword.trim().toUpperCase();
      console.log(`[FinanceClipper] 🚀 發起深度採集: [${cleanKeyword}]`);
      if (uiElements.btnCrawl) uiElements.btnCrawl.disabled = true;
      if (uiElements.crawlSpinner) uiElements.crawlSpinner.style.display = 'inline-block';
      showToast(`⚡ 正在背景啟動 4合1 深度採集 [${cleanKeyword}]...`);

      let hasFinished = false;
      const safetyTimer = setTimeout(() => {
        if (!hasFinished) {
          console.warn(`[FinanceClipper] ⚠️ 採集請求 [${cleanKeyword}] 等待逾時 (15s)，自動重設按鈕狀態。`);
          if (uiElements.btnCrawl) uiElements.btnCrawl.disabled = false;
          if (uiElements.crawlSpinner) uiElements.crawlSpinner.style.display = 'none';
          showToast(`⚠️ 背景採集超時，請檢查網路或重試！`);
        }
      }, 15000);

      try {
        const res = await sendRuntimeMessageWithRetry({
          action: 'CRAWL_STOCK',
          keyword: cleanKeyword
        }, 2, 400);

        hasFinished = true;
        clearTimeout(safetyTimer);
        if (uiElements.btnCrawl) uiElements.btnCrawl.disabled = false;
        if (uiElements.crawlSpinner) uiElements.crawlSpinner.style.display = 'none';

        console.log('[FinanceClipper] 📥 收到採集回應結果:', res);

        if (res && res.success && res.data) {
          console.log(`[FinanceClipper] ✅ [${res.data.ticker}] 採集成功:`, res.data);
          showToast(`✅ [${res.data.ticker}] 採集完成！`);
          if (callbacks && typeof callbacks.onCrawlSuccess === 'function') {
            callbacks.onCrawlSuccess(res.data);
          }
        } else {
          const errMsg = res ? res.error : '未知錯誤';
          console.error(`[FinanceClipper] ❌ 採集失敗:`, errMsg);
          showToast(`❌ 採集失敗：${errMsg}`);
        }
      } catch (err) {
        hasFinished = true;
        clearTimeout(safetyTimer);
        if (uiElements.btnCrawl) uiElements.btnCrawl.disabled = false;
        if (uiElements.crawlSpinner) uiElements.crawlSpinner.style.display = 'none';
        console.error('[FinanceClipper] ❌ 發送採集請求異常:', err);
        showToast(`❌ 通訊異常：${err.message}`);
      }
    },

    /**
     * 匯出 Markdown 並複製至剪貼簿
     */
    exportMarkdown: function (currentStock, note, currentAiSummary) {
      if (!currentStock) return;
      const stock = currentStock;

      let md = `# 投資研報：${stock.ticker} (${stock.price})\n\n`;
      md += `* **採集時間**：${stock.updatedAt || new Date().toLocaleString()}\n`;
      md += `* **即時價格**：${stock.price}\n\n`;

      // 關鍵指標
      md += `### 📊 核心財務指標\n\n`;
      md += `| 指標項目 | 數值 |\n| :--- | :--- |\n`;
      for (const [k, v] of Object.entries(stock.stats || {})) {
        md += `| ${k} | ${v} |\n`;
      }
      md += `\n`;

      // 分析師目標價
      const an = stock.analyst || {};
      md += `### 🎯 分析師共識與目標價\n\n`;
      md += `- **共識評級**：${an.consensus || 'N/A'}\n`;
      md += `- **最低目標價**：${an.targetLow || 'N/A'}\n`;
      md += `- **中位數目標價**：${an.targetMedian || 'N/A'}\n`;
      md += `- **最高目標價**：${an.targetHigh || 'N/A'}\n\n`;

      // 損益表矩陣
      const fin = stock.financials ? stock.financials.table : null;
      if (fin && Array.isArray(fin) && fin.length > 0) {
        md += `### 📑 損益表矩陣 (Income Statement)\n\n`;
        md += `| ` + fin[0].join(' | ') + ` |\n`;
        md += `| ` + fin[0].map(() => '---').join(' | ') + ` |\n`;
        for (let i = 1; i < fin.length; i++) {
          md += `| ` + fin[i].join(' | ') + ` |\n`;
        }
        md += `\n`;
      }

      if (note) {
        md += `### ✍️ 個人投資觀點與研報筆記\n\n${note}\n\n`;
      }

      // Gemini Nano 智能研報整合輸出
      if (currentAiSummary && currentAiSummary.rawMarkdown) {
        md += `----------------------------------------\n\n${currentAiSummary.rawMarkdown}\n\n`;
      }

      navigator.clipboard.writeText(md).then(() => {
        showToast('📋 Markdown 研報已成功複製至剪貼簿！');
      }).catch(() => {
        showToast('複製失敗，請手動選取複製');
      });
    },

    /**
     * 匯出 CSV 檔案下載
     */
    exportCsv: function (currentStock) {
      if (!currentStock) return;
      const stock = currentStock;

      let csvContent = '\uFEFF'; // UTF-8 BOM 防亂碼
      csvContent += '類別,項目,數值\n';
      csvContent += `標的概況,Ticker,"${stock.ticker}"\n`;
      csvContent += `標的概況,Price,"${stock.price}"\n`;
      csvContent += `標的概況,採集時間,"${stock.updatedAt || ''}"\n`;

      for (const [k, v] of Object.entries(stock.stats || {})) {
        csvContent += `核心指標,"${k}","${v}"\n`;
      }

      const an = stock.analyst || {};
      csvContent += `分析師,共識評級,"${an.consensus || ''}"\n`;
      csvContent += `分析師,最低目標價,"${an.targetLow || ''}"\n`;
      csvContent += `分析師,中位數目標價,"${an.targetMedian || ''}"\n`;
      csvContent += `分析師,最高目標價,"${an.targetHigh || ''}"\n`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${stock.ticker}_finance_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`📥 [${stock.ticker}] CSV 試算表已開始下載！`);
    },

    /**
     * 送出至 Google Sheets (GAS Webhook Envelope)
     */
    sendToGas: function (currentStock, note, btnSendGas, settingsModal) {
      if (!currentStock) return;
      chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
        const gasUrl = res.gasUrl || res.appsScriptUrl;
        if (!gasUrl) {
          showToast('⚠️ 尚未設定 Google Apps Script URL，請先點選右上角齒輪設定！');
          if (settingsModal) settingsModal.style.display = 'flex';
          return;
        }

        if (btnSendGas) {
          btnSendGas.disabled = true;
          btnSendGas.textContent = '傳送中...';
        }

        const payload = {
          protocolVersion: 1,
          action: 'finance_clip',
          secretToken: res.gasSecretToken || undefined,
          timestamp: Date.now(),
          data: {
            ticker: currentStock.ticker,
            name: currentStock.name || currentStock.companyName || currentStock.ticker,
            price: currentStock.price,
            sentiment: currentStock.sentiment || (currentStock.note ? analyzeClientSentiment(currentStock.note) : '😐 中性'),
            note: (note || '').trim(),
            pe: currentStock.stats ? (currentStock.stats['本益比'] || currentStock.stats['P/E ratio'] || '') : '',
            mktcap: currentStock.stats ? (currentStock.stats['市值'] || currentStock.stats['Market cap'] || '') : '',
            sp500: currentStock.stats ? (currentStock.stats['sp500'] || '') : '',
            nasdaq: currentStock.stats ? (currentStock.stats['nasdaq'] || '') : '',
            analystRating: currentStock.analyst ? (currentStock.analyst.consensus || '') : '',
            analystTargetPrice: currentStock.analyst ? (currentStock.analyst.targetMedian || '') : '',
            sourceUrl: currentStock.url || `https://www.google.com/finance/quote/${currentStock.ticker}`
          }
        };

        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'cors',
          redirect: 'follow'
        }).then((resp) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = '☁️ 發送至 Google Sheets (GAS)';
          }
          if (resp.ok) {
            showToast(`🎉 成功同步 [${currentStock.ticker}] 至 Google Sheets！`);
          } else {
            showToast(`⚠️ 傳送失敗，HTTP 狀態碼: ${resp.status}`);
          }
        }).catch((err) => {
          if (btnSendGas) {
            btnSendGas.disabled = false;
            btnSendGas.textContent = '☁️ 發送至 Google Sheets (GAS)';
          }
          showToast(`❌ 連線錯誤: ${err.message}`);
        });
      });
    },

    /**
     * 批次同步全部歷史標的至 Google Sheets
     */
    batchSendToGas: function (historyList, btnBatchSendGas, settingsModal) {
      if (!historyList || historyList.length === 0) {
        showToast('⚠️ 歷史追蹤清單為空，無資料可同步');
        return;
      }

      chrome.storage.local.get(['gasUrl', 'gasSecretToken', 'appsScriptUrl'], (res) => {
        const gasUrl = res.gasUrl || res.appsScriptUrl;
        if (!gasUrl) {
          showToast('⚠️ 尚未設定 Google Apps Script URL，請先點選右上角齒輪設定！');
          if (settingsModal) settingsModal.style.display = 'flex';
          return;
        }

        if (btnBatchSendGas) {
          btnBatchSendGas.disabled = true;
          btnBatchSendGas.textContent = `同步中 (${historyList.length} 筆)...`;
        }

        const items = historyList.map((stock) => ({
          ticker: stock.ticker,
          name: stock.name || stock.companyName || stock.ticker,
          price: stock.price,
          sentiment: stock.sentiment || (stock.note ? analyzeClientSentiment(stock.note) : '😐 中性'),
          note: stock.note || '',
          pe: stock.stats ? (stock.stats['本益比'] || stock.stats['P/E ratio'] || '') : '',
          mktcap: stock.stats ? (stock.stats['市值'] || stock.stats['Market cap'] || '') : '',
          analystRating: stock.analyst ? (stock.analyst.consensus || '') : '',
          analystTargetPrice: stock.analyst ? (stock.analyst.targetMedian || '') : '',
          sourceUrl: stock.url || `https://www.google.com/finance/quote/${stock.ticker}`
        }));

        const payload = {
          protocolVersion: 1,
          action: 'batch_finance_clip',
          secretToken: res.gasSecretToken || undefined,
          timestamp: Date.now(),
          data: {
            items: items
          }
        };

        fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'cors',
          redirect: 'follow'
        }).then((resp) => {
          if (btnBatchSendGas) {
            btnBatchSendGas.disabled = false;
            btnBatchSendGas.textContent = '📦 批次同步全部標的';
          }
          if (resp.ok) {
            showToast(`🎉 成功批次匯流 ${items.length} 檔個股至 Google Sheets！`);
          } else {
            showToast(`⚠️ 批次同步失敗，HTTP: ${resp.status}`);
          }
        }).catch((err) => {
          if (btnBatchSendGas) {
            btnBatchSendGas.disabled = false;
            btnBatchSendGas.textContent = '📦 批次同步全部標的';
          }
          showToast(`❌ 批次連線錯誤: ${err.message}`);
        });
      });
    },

    /**
     * 轉入 ScrumClock 任務
     */
    addStockToScrumTask: async function (currentStock, note, currentAiSummary, btnAddToScrum) {
      if (!currentStock) {
        showToast('⚠️ 請先選擇或採集個股標的');
        return;
      }

      if (!window.FinanceAIClient || !window.FinanceAIClient.createScrumTask) {
        showToast('⚠️ 跨插件客戶端模組尚未載入');
        return;
      }

      const stock = currentStock;
      let md = `### 📌 標的概況：${stock.ticker} (${stock.price})\n\n`;
      md += `* **採集時間**：${stock.updatedAt || new Date().toLocaleString()}\n`;
      md += `* **即時價格**：${stock.price}\n\n`;

      const an = stock.analyst || {};
      md += `### 🎯 分析師評級與目標價\n`;
      md += `- 共識：${an.consensus || 'N/A'}\n`;
      md += `- 目標價：最低 ${an.targetLow || 'N/A'} / 中位 ${an.targetMedian || 'N/A'} / 最高 ${an.targetHigh || 'N/A'}\n\n`;

      if (note) {
        md += `### ✍️ 個人研究觀點\n${note}\n\n`;
      }

      if (currentAiSummary && currentAiSummary.rawMarkdown) {
        md += `### ✨ Gemini Nano 智能速讀\n${currentAiSummary.rawMarkdown}\n\n`;
      }

      const taskTitle = `研讀 $${stock.ticker} 財報與投資估值`;
      const tags = ['#投資研究', `$${stock.ticker}`];

      if (btnAddToScrum) {
        btnAddToScrum.disabled = true;
        btnAddToScrum.textContent = '⏳ 正在轉入任務...';
      }

      try {
        const res = await window.FinanceAIClient.createScrumTask({
          ticker: stock.ticker,
          title: taskTitle,
          notes: md,
          tags: tags,
          estimatedPomodoros: 2,
          url: window.location.href
        });

        if (btnAddToScrum) {
          btnAddToScrum.disabled = false;
          btnAddToScrum.textContent = '🎯 加入今日作戰戰役';
        }

        if (res && res.success) {
          if (res.duplicate) {
            showToast(`ℹ️ $${stock.ticker} 今日已在戰役中，已同步更新備忘！`);
          } else {
            showToast(`🎯 成功將 $${stock.ticker} 加入 ScrumClock 今日戰役！`);
          }
        } else {
          showToast(`⚠️ 建立任務失敗：${res ? res.error : '未知錯誤'}`);
        }
      } catch (err) {
        if (btnAddToScrum) {
          btnAddToScrum.disabled = false;
          btnAddToScrum.textContent = '🎯 加入今日作戰戰役';
        }
        showToast(`❌ 發生異常：${err.message}`);
      }
    }
  };
})();
