/**
 * aiClient.js - Finance Research Clipper 本地 AI 服務客戶端
 * 透過 Chrome Externally Connectable 協議與 ScrumClock (Power Kit) 連線，
 * 取得本機端 Gemini Nano LLM 推論能力，提供零伺服器、高隱私的財務智能研報分析。
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_SC_ID = 'scrumclock_ext_id';
  const CACHE_PREFIX = 'ai_summary_';

  // 取得今天的 YYYY-MM-DD 字串作為快取基準
  function getTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 🛡️ 資料防腐層 (Anticorruption Sanitizer)
   * 嚴格白名單與防呆過濾：即使 FinanceClipper 內部新增了私有屬性、特殊符號或循環引用，
   * 也能確保只有乾淨、標準的純純資料 (Pure Data) 透過 Chrome 訊息跨插件傳遞。
   */
  function sanitizeFinancePayload(raw) {
    if (!raw || typeof raw !== 'object') return { ticker: 'UNKNOWN' };

    const safeTicker = String(raw.ticker || '').trim().toUpperCase();
    const safeName = raw.name ? String(raw.name).slice(0, 100) : undefined;
    const safePrice = raw.price ? String(raw.price).slice(0, 50) : undefined;

    // 清洗 stats 鍵值，強制轉換為純字串，過濾異常型別
    const safeStats = {};
    if (raw.stats && typeof raw.stats === 'object') {
      for (const [k, v] of Object.entries(raw.stats)) {
        if (typeof k === 'string' && v !== null && v !== undefined) {
          safeStats[k.slice(0, 50)] = String(v).slice(0, 100);
        }
      }
    }

    // 清洗分析師數據
    let safeAnalyst = undefined;
    if (raw.analyst && typeof raw.analyst === 'object') {
      safeAnalyst = {
        consensus: raw.analyst.consensus ? String(raw.analyst.consensus).slice(0, 50) : undefined,
        targetLow: raw.analyst.targetLow ? String(raw.analyst.targetLow).slice(0, 30) : undefined,
        targetMedian: raw.analyst.targetMedian ? String(raw.analyst.targetMedian).slice(0, 30) : undefined,
        targetHigh: raw.analyst.targetHigh ? String(raw.analyst.targetHigh).slice(0, 30) : undefined,
      };
    }

    // 清洗財報表現數據
    let safeEarnings = undefined;
    if (raw.earnings && typeof raw.earnings === 'object') {
      safeEarnings = {
        epsActual: raw.earnings.epsActual ? String(raw.earnings.epsActual).slice(0, 30) : undefined,
        epsEstimate: raw.earnings.epsEstimate ? String(raw.earnings.epsEstimate).slice(0, 30) : undefined,
        revenueActual: raw.earnings.revenueActual ? String(raw.earnings.revenueActual).slice(0, 30) : undefined,
        revenueEstimate: raw.earnings.revenueEstimate ? String(raw.earnings.revenueEstimate).slice(0, 30) : undefined,
      };
    }

    const safeNote = raw.note ? String(raw.note).slice(0, 500) : undefined;

    return {
      protocolVersion: 1, // 協議版本號
      ticker: safeTicker,
      name: safeName,
      price: safePrice,
      stats: safeStats,
      analyst: safeAnalyst,
      earnings: safeEarnings,
      note: safeNote
    };
  }

  /**
   * 🛡️ 任務資料防腐層 (Task Sanitizer)
   */
  function sanitizeTaskPayload(raw) {
    if (!raw || typeof raw !== 'object') return { title: '未命名投資研究任務' };

    const safeTicker = raw.ticker ? String(raw.ticker).trim().toUpperCase().slice(0, 20) : undefined;
    const safeTitle = raw.title ? String(raw.title).trim().slice(0, 200) : (safeTicker ? `${safeTicker} 投資研報深度分析` : '未命名投資研究任務');
    const safeNotes = raw.notes ? String(raw.notes).slice(0, 15000) : '';
    const safeUrl = raw.url ? String(raw.url).slice(0, 500) : undefined;
    const safePomodoros = typeof raw.estimatedPomodoros === 'number' && raw.estimatedPomodoros > 0
      ? Math.min(Math.round(raw.estimatedPomodoros), 20)
      : 2;

    const safeTags = Array.isArray(raw.tags)
      ? raw.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 30)).slice(0, 10)
      : ['#投資研究'];

    return {
      protocolVersion: 1,
      ticker: safeTicker,
      title: safeTitle,
      notes: safeNotes,
      tags: safeTags,
      estimatedPomodoros: safePomodoros,
      url: safeUrl
    };
  }

  const FinanceAIClient = {
    /**
     * 取得 ScrumClock Extension ID (自 chrome.storage.local)
     */
    async getScrumClockId() {
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
          resolve('');
          return;
        }
        chrome.storage.local.get([STORAGE_KEY_SC_ID], (res) => {
          resolve(res?.[STORAGE_KEY_SC_ID] || '');
        });
      });
    },

    /**
     * 儲存 ScrumClock Extension ID
     */
    async setScrumClockId(extId) {
      const trimmed = (extId || '').trim();
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
          resolve();
          return;
        }
        chrome.storage.local.set({ [STORAGE_KEY_SC_ID]: trimmed }, () => {
          console.log('[FinanceAIClient] 已儲存 ScrumClock ID:', trimmed);
          resolve();
        });
      });
    },

    /**
     * 檢查 ScrumClock AI 服務可用狀態 (Ping)
     * @param {string} [targetId] 可選傳入目標 Extension ID
     * @returns {Promise<{ success: boolean, available: boolean, model?: string, error?: string }>}
     */
    async checkAvailability(targetId) {
      const extId = targetId || (await this.getScrumClockId());
      if (!extId) {
        return {
          success: false,
          available: false,
          error: '尚未配置 ScrumClock 插件 ID。請在設定中填入 ScrumClock (Power Kit) 的 Extension ID。'
        };
      }

      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return {
          success: false,
          available: false,
          error: '當前瀏覽器環境不支援 chrome.runtime 通訊。'
        };
      }

      return new Promise((resolve) => {
        try {
          const timeoutId = setTimeout(() => {
            resolve({
              success: false,
              available: false,
              error: '連線 ScrumClock 超時，請確認該插件已安裝並啟用。'
            });
          }, 4000);

          chrome.runtime.sendMessage(extId, { type: 'AI_PING' }, (response) => {
            clearTimeout(timeoutId);
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                available: false,
                error: `無法連線至 ScrumClock: ${chrome.runtime.lastError.message}`
              });
              return;
            }

            if (!response || !response.success) {
              resolve({
                success: false,
                available: false,
                error: response?.error || 'ScrumClock 未就緒或 Gemini Nano 尚未開啟'
              });
              return;
            }

            resolve({
              success: true,
              available: !!response.available,
              model: response.model || 'Gemini Nano (On-Device Built-in AI)'
            });
          });
        } catch (err) {
          resolve({
            success: false,
            available: false,
            error: err?.message || '跨插件通訊異常'
          });
        }
      });
    },

    /**
     * 讀取本地當日快取研報
     * @param {string} ticker 股票代號
     * @returns {Promise<any|null>}
     */
    async getCachedSummary(ticker) {
      if (!ticker) return null;
      const key = `${CACHE_PREFIX}${ticker.toUpperCase()}_${getTodayString()}`;
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
          resolve(null);
          return;
        }
        chrome.storage.local.get([key], (res) => {
          resolve(res?.[key] || null);
        });
      });
    },

    /**
     * 儲存本地當日快取研報
     * @param {string} ticker 股票代號
     * @param {any} summary 研報物件
     */
    async saveCachedSummary(ticker, summary) {
      if (!ticker || !summary) return;
      const key = `${CACHE_PREFIX}${ticker.toUpperCase()}_${getTodayString()}`;
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
          resolve();
          return;
        }
        chrome.storage.local.set({ [key]: summary }, () => {
          console.log(`[FinanceAIClient] 已快取 ${ticker} 當日 AI 研報。`);
          resolve();
        });
      });
    },

    /**
     * 發起財務研報推論請求
     * @param {Object} stockData 包含 ticker, price, stats, analyst, earnings 等
     * @param {boolean} [forceRefresh=false] 是否強制忽略快取重新生成
     * @returns {Promise<{ success: boolean, summary?: any, cached?: boolean, error?: string }>}
     */
    async requestStockSummary(stockData, forceRefresh = false) {
      if (!stockData || !stockData.ticker) {
        return { success: false, error: '股票資料無效，缺少 ticker' };
      }

      const ticker = stockData.ticker.toUpperCase();

      // 1. 檢查快取
      if (!forceRefresh) {
        const cached = await this.getCachedSummary(ticker);
        if (cached) {
          console.log(`[FinanceAIClient] 命中 ${ticker} 當日快取，直接回傳。`);
          return { success: true, summary: cached, cached: true };
        }
      }

      // 2. 獲取 Extension ID
      const extId = await this.getScrumClockId();
      if (!extId) {
        return {
          success: false,
          error: '尚未配置 ScrumClock 插件 ID。請於儀表板設定中填入 ScrumClock 的 Extension ID。'
        };
      }

      // 3. 發送請求至 ScrumClock
      return new Promise((resolve) => {
        try {
          const timeoutId = setTimeout(() => {
            resolve({
              success: false,
              error: 'AI 推論超過 35 秒無回應，請確認電腦負載或重試。'
            });
          }, 35000);

          const cleanPayload = sanitizeFinancePayload(stockData);

          chrome.runtime.sendMessage(
            extId,
            {
              type: 'AI_GENERATE_FINANCE_SUMMARY',
              payload: cleanPayload
            },
            async (response) => {
              clearTimeout(timeoutId);
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: `向 ScrumClock 發送請求失敗: ${chrome.runtime.lastError.message}`
                });
                return;
              }

              if (!response || !response.success || !response.summary) {
                resolve({
                  success: false,
                  error: response?.error || '本地 Gemini Nano 未能產出有效分析'
                });
                return;
              }

              // 4. 寫入快取
              await this.saveCachedSummary(ticker, response.summary);

              resolve({
                success: true,
                summary: response.summary,
                cached: false
              });
            }
          );
        } catch (err) {
          resolve({
            success: false,
            error: err?.message || '通訊時發生非預期錯誤'
          });
        }
      });
    },

    /**
     * 一鍵建立 ScrumClock 今日作戰研究任務 (Phase 3.1)
     * @param {Object} taskData { ticker, title, notes, tags, estimatedPomodoros, url }
     * @returns {Promise<{ success: boolean, taskId?: string, duplicate?: boolean, message?: string, error?: string }>}
     */
    async createScrumTask(taskData) {
      if (!taskData) {
        return { success: false, error: '任務資料無效' };
      }

      const extId = await this.getScrumClockId();
      if (!extId) {
        return {
          success: false,
          error: '尚未配置 ScrumClock 插件 ID。請於設定中填入 ScrumClock 的 Extension ID。'
        };
      }

      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return {
          success: false,
          error: '當前瀏覽器環境不支援 chrome.runtime 通訊。'
        };
      }

      return new Promise((resolve) => {
        try {
          const timeoutId = setTimeout(() => {
            resolve({
              success: false,
              error: '建立任務請求超時 (6 秒)，請確認 ScrumClock 是否已啟用。'
            });
          }, 6000);

          const cleanPayload = sanitizeTaskPayload(taskData);

          chrome.runtime.sendMessage(
            extId,
            {
              protocolVersion: 1,
              type: 'CREATE_TASK',
              payload: cleanPayload
            },
            (response) => {
              clearTimeout(timeoutId);
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: `連線 ScrumClock 失敗: ${chrome.runtime.lastError.message}`
                });
                return;
              }

              if (!response) {
                resolve({
                  success: false,
                  error: 'ScrumClock 未返回有效響應'
                });
                return;
              }

              resolve(response);
            }
          );
        } catch (err) {
          resolve({
            success: false,
            error: err?.message || '發送建立任務請求時發生異常'
          });
        }
      });
    }
  };

  // 掛載到全域
  window.FinanceAIClient = FinanceAIClient;
})(typeof window !== 'undefined' ? window : this);
