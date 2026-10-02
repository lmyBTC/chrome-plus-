/**
 * aiClient.js - Finance Research Clipper 本地 AI 服務客戶端
 * 透過 Chrome Externally Connectable 協議與 ScrumClock (Power Kit) 連線，
 * 取得本機端 Gemini Nano LLM 推論能力，提供零伺服器、高隱私的財務智能研報分析。
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_SC_ID = 'scrumclock_ext_id';
  const DEFAULT_SCRUMCLOCK_ID = 'ahiihabnbjeoeneahcgbdcofncjoclcp'; // 固定公開金鑰之 ScrumClock Extension ID
  const CACHE_PREFIX = 'ai_summary_';
  const STORAGE_KEY_OUTBOX = 'outbox_queue';
  const STORAGE_KEY_DEAD_LETTER = 'dead_letter_queue';
  const DEFAULT_MAX_RETRIES = 5;
  const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

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
    if (!raw || typeof raw !== 'object') return { protocolVersion: 2, title: '未命名投資研究任務' };

    const safeTicker = raw.ticker ? String(raw.ticker).trim().toUpperCase().slice(0, 20) : undefined;
    const safeTitle = raw.title ? String(raw.title).trim().slice(0, 200) : (safeTicker ? `${safeTicker} 投資研報深度分析` : '未命名投資研究任務');
    const safeNotes = raw.notes ? String(raw.notes).slice(0, 15000) : '';
    const safeUrl = raw.url ? String(raw.url).slice(0, 500) : undefined;
    const safePomodoros = typeof raw.estimatedPomodoros === 'number' && raw.estimatedPomodoros > 0
      ? Math.min(Math.round(raw.estimatedPomodoros), 20)
      : 2;

    const validGTDContexts = ['@Focus', '@Meeting', '@Review', '@Waiting-For', '@Blocked'];
    const safeGTDContext = (typeof raw.gtdContext === 'string' && validGTDContexts.includes(raw.gtdContext))
      ? raw.gtdContext
      : '@Focus';

    const validPriorities = ['P1', 'P2', 'P3'];
    const safePriority = (typeof raw.priority === 'string' && validPriorities.includes(raw.priority))
      ? raw.priority
      : 'P1';

    const safeSourcePlugin = typeof raw.sourcePlugin === 'string' && raw.sourcePlugin.trim()
      ? raw.sourcePlugin.trim().slice(0, 50)
      : 'FINANCE_CLIPPER';

    let safeWorkspaceSync = undefined;
    if (raw.workspaceSync && typeof raw.workspaceSync === 'object') {
      safeWorkspaceSync = {
        googleTaskId: typeof raw.workspaceSync.googleTaskId === 'string' ? raw.workspaceSync.googleTaskId.slice(0, 100) : undefined,
        googleCalendarEventId: typeof raw.workspaceSync.googleCalendarEventId === 'string' ? raw.workspaceSync.googleCalendarEventId.slice(0, 100) : undefined,
        googleSheetRowId: typeof raw.workspaceSync.googleSheetRowId === 'string' ? raw.workspaceSync.googleSheetRowId.slice(0, 100) : undefined,
        lastSyncedAt: typeof raw.workspaceSync.lastSyncedAt === 'number' ? raw.workspaceSync.lastSyncedAt : Date.now(),
        syncStatus: ['synced', 'pending', 'failed', 'idle'].includes(raw.workspaceSync.syncStatus) ? raw.workspaceSync.syncStatus : 'idle'
      };
    }

    const safeTags = Array.isArray(raw.tags)
      ? raw.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => t.trim().slice(0, 30)).slice(0, 10)
      : ['#投資研究'];

    return {
      protocolVersion: 2,
      ticker: safeTicker,
      title: safeTitle,
      notes: safeNotes,
      tags: safeTags,
      estimatedPomodoros: safePomodoros,
      url: safeUrl,
      gtdContext: safeGTDContext,
      priority: safePriority,
      sourcePlugin: safeSourcePlugin,
      workspaceSync: safeWorkspaceSync,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now()
    };
  }

  const FinanceAIClient = {
    /**
     * 取得 ScrumClock Extension ID (自 chrome.storage.local)
     */
    /**
     * 取得 ScrumClock Extension ID (自 chrome.storage.local，若未設定則自動回退至固定 DEFAULT_SCRUMCLOCK_ID)
     */
    async getScrumClockId() {
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage?.local) {
          resolve(DEFAULT_SCRUMCLOCK_ID);
          return;
        }
        chrome.storage.local.get([STORAGE_KEY_SC_ID], (res) => {
          resolve((res?.[STORAGE_KEY_SC_ID] && res[STORAGE_KEY_SC_ID].trim()) || DEFAULT_SCRUMCLOCK_ID);
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
     * 檢查 ScrumClock AI 服務可用狀態 (透過 PING_HUB 進行 Discovery Bus 自動握手)
     * @param {string} [targetId] 可選傳入目標 Extension ID
     * @returns {Promise<{ success: boolean, available: boolean, model?: string, hub?: string, capabilities?: string[], error?: string }>}
     */
    async checkAvailability(targetId) {
      const extId = targetId || (await this.getScrumClockId());
      if (!extId) {
        return {
          success: false,
          available: false,
          error: '尚未配置 ScrumClock 插件 ID。'
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

          // 優先嘗試 PING_HUB 握手總線
          chrome.runtime.sendMessage(extId, { type: 'PING_HUB', clientPlugin: 'FINANCE_CLIPPER', version: '2.3' }, (response) => {
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
                error: response?.error || 'ScrumClock 未就緒或連線被拒'
              });
              return;
            }

            // 握手成功
            const isAvailable = response.aiAvailable !== undefined ? !!response.aiAvailable : !!response.available;
            resolve({
              success: true,
              available: isAvailable,
              hub: response.hub || 'ScrumClock',
              capabilities: response.capabilities || ['AI_SUMMARY', 'CREATE_TASK'],
              model: isAvailable ? 'Gemini Nano (On-Device Built-in AI)' : 'ScrumClock (中樞在線，AI 待喚醒)'
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

      const cleanPayload = sanitizeTaskPayload(taskData);

      return new Promise((resolve) => {
        let hasResolved = false;
        const timeoutId = setTimeout(async () => {
          if (!hasResolved) {
            hasResolved = true;
            const errorMsg = '建立任務請求超時 (6 秒)，中樞可能處於休眠狀態';
            await this.enqueueOutboxTask(cleanPayload, extId, errorMsg);
            resolve({
              success: false,
              ack: false,
              queued: true,
              error: errorMsg,
              message: '連線逾時，任務已安全存入 Outbox 佇列，將於中樞喚醒時自動重試。'
            });
          }
        }, 6000);

        try {
          chrome.runtime.sendMessage(
            extId,
            {
              protocolVersion: 2,
              type: 'CREATE_TASK',
              payload: cleanPayload
            },
            async (response) => {
              if (hasResolved) return;
              hasResolved = true;
              clearTimeout(timeoutId);

              if (chrome.runtime.lastError) {
                const errorMsg = `連線 ScrumClock 失敗: ${chrome.runtime.lastError.message}`;
                await this.enqueueOutboxTask(cleanPayload, extId, errorMsg);
                resolve({
                  success: false,
                  ack: false,
                  queued: true,
                  error: errorMsg,
                  message: '連線失敗，任務已安全存入 Outbox 佇列，將於連線恢復後自動補發。'
                });
                return;
              }

              if (!response || (!response.success && !response.ack)) {
                const errorMsg = response?.error || 'ScrumClock 未返回有效確認 (ACK)';
                await this.enqueueOutboxTask(cleanPayload, extId, errorMsg);
                resolve({
                  success: false,
                  ack: false,
                  queued: true,
                  error: errorMsg,
                  message: '中樞未確認收悉，任務已轉入 Outbox 佇列保護。'
                });
                return;
              }

              resolve({
                ...response,
                ack: true
              });
            }
          );
        } catch (err) {
          if (!hasResolved) {
            hasResolved = true;
            clearTimeout(timeoutId);
            const errorMsg = err?.message || '發送建立任務請求時發生異常';
            this.enqueueOutboxTask(cleanPayload, extId, errorMsg).then(() => {
              resolve({
                success: false,
                ack: false,
                queued: true,
                error: errorMsg,
                message: '發送異常，任務已寫入 Outbox 佇列。'
              });
            });
          }
        }
      });
    },

    /**
     * 寫入本地 Outbox 佇列
     */
    async enqueueOutboxTask(taskData, targetExtensionId, errorMsg) {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_OUTBOX], (res) => {
          const queue = Array.isArray(res?.[STORAGE_KEY_OUTBOX]) ? res[STORAGE_KEY_OUTBOX] : [];
          const item = {
            id: `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            targetExtensionId: targetExtensionId || DEFAULT_SCRUMCLOCK_ID,
            type: 'CREATE_TASK',
            payload: taskData,
            protocolVersion: 2,
            retryCount: 0,
            maxRetries: DEFAULT_MAX_RETRIES,
            createdAt: Date.now(),
            lastAttemptAt: Date.now(),
            lastError: errorMsg || '加入離線佇列',
            ttlMs: DEFAULT_TTL_MS
          };
          queue.push(item);
          chrome.storage.local.set({ [STORAGE_KEY_OUTBOX]: queue }, () => {
            console.log(`[FinanceAIClient] 任務已加入 Outbox 佇列 [${item.id}]`);
            resolve(item);
          });
        });
      });
    },

    /**
     * 讀取 Outbox 佇列
     */
    async getOutboxQueue() {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_OUTBOX], (res) => {
          resolve(Array.isArray(res?.[STORAGE_KEY_OUTBOX]) ? res[STORAGE_KEY_OUTBOX] : []);
        });
      });
    },

    /**
     * 讀取死信佇列
     */
    async getDeadLetterQueue() {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY_DEAD_LETTER], (res) => {
          resolve(Array.isArray(res?.[STORAGE_KEY_DEAD_LETTER]) ? res[STORAGE_KEY_DEAD_LETTER] : []);
        });
      });
    },

    /**
     * 轉入死信佇列並發送通知
     */
    async moveToDeadLetter(item, reason) {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
      const deadLetters = await this.getDeadLetterQueue();
      deadLetters.unshift({
        id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        originalMessage: item,
        failedAt: Date.now(),
        reason: reason,
        retryCount: item.retryCount
      });
      if (deadLetters.length > 50) deadLetters.pop();

      await new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY_DEAD_LETTER]: deadLetters }, resolve);
      });

      if (chrome.notifications?.create) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '⚠️ 投資研報轉任務重試逾時 (Dead-Letter)',
          message: `任務「${item.payload?.title || '未命名'}」經重試仍無法送達中樞，已存入死信佇列。`
        });
      }
    },

    /**
     * 執行 Outbox 佇列重試輪詢 (由 Alarms 或 tabs.onActivated 觸發)
     */
    async retryPendingOutbox() {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return { processed: 0, succeeded: 0, failed: 0 };
      }

      const queue = await this.getOutboxQueue();
      if (queue.length === 0) return { processed: 0, succeeded: 0, failed: 0 };

      console.log(`[FinanceAIClient] 觸發 Outbox 重試，當前待發筆數: ${queue.length}`);
      const remaining = [];
      const now = Date.now();
      let succeeded = 0;
      let failed = 0;

      for (const item of queue) {
        if (now - item.createdAt > item.ttlMs) {
          await this.moveToDeadLetter(item, 'TTL 存活時間逾期');
          continue;
        }

        if (item.retryCount >= item.maxRetries) {
          await this.moveToDeadLetter(item, `超過最大重試次數 (${item.maxRetries} 次)`);
          continue;
        }

        const extId = item.targetExtensionId || DEFAULT_SCRUMCLOCK_ID;
        try {
          const res = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('逾時')), 5000);
            chrome.runtime.sendMessage(
              extId,
              {
                protocolVersion: 2,
                type: item.type,
                payload: item.payload,
                messageId: item.id,
                retryAttempt: item.retryCount + 1
              },
              (response) => {
                clearTimeout(timer);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                  return;
                }
                if (response && (response.success || response.ack)) {
                  resolve(response);
                } else {
                  reject(new Error(response?.error || '無效確認'));
                }
              }
            );
          });

          console.log(`[FinanceAIClient] Outbox 任務成功送達並獲取 ACK: ${item.id}`, res);
          succeeded++;
        } catch (err) {
          failed++;
          item.retryCount++;
          item.lastAttemptAt = now;
          item.lastError = err?.message || '重試失敗';
          remaining.push(item);
        }
      }

      await new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY_OUTBOX]: remaining }, resolve);
      });

      return { processed: queue.length, succeeded, failed };
    },

    /**
     * 🎯 結構化 AI 投研 Prompt 產生器 (SSOT Prompt Generator)
     * 將快照或 Payload 轉換為深度買方機構級 Prompt，涵蓋：
     * 1. 執行摘要與投資評級
     * 2. 多方核心論點與護城河 (Bull Case)
     * 3. 空方疑慮與下行風險 (Bear Case)
     * 4. 關鍵催化劑時程表 (Catalysts Timeline)
     * 5. 財務體質與估值診斷矩陣 (Financial & Valuation Matrix)
     * 6. 機構級操盤與風控策略 (Actionable Trading Strategy)
     * 
     * @param {Object} data 快照資料、Payload 或個股物件
     * @returns {string} 完整的繁體中文結構化 Prompt
     */
    buildInvestmentPrompt(data) {
      if (!data || typeof data !== 'object') {
        return '請提供有效的個股研報資料以生成 Prompt。';
      }

      const ticker = String(data.ticker || data.symbol || (data.overview && data.overview.symbol) || '未知標的').toUpperCase().trim();
      const companyName = data.name || (data.overview && data.overview.name) || '';
      const price = data.price || (data.overview && data.overview.price) || 'N/A';

      // 關鍵統計數據提取
      const mktCap = data.mktcap || data.marketCap || (data.stats && (data.stats['市值'] || data.stats['Market cap'])) || 'N/A';
      const pe = data.pe || (data.stats && (data.stats['本益比'] || data.stats['P/E ratio'])) || 'N/A';
      const range52w = data.range52w || (data.stats && (data.stats['52 週高點'] ? `${data.stats['52 週低點']} - ${data.stats['52 週高點']}` : '')) || 'N/A';
      const beta = data.beta || (data.stats && (data.stats['Beta'] || data.stats['貝他值'])) || 'N/A';

      // 目標價與分析師共識
      const consensus = data.analyst_consensus || (data.analyst && data.analyst.consensus) || (data.analysis && data.analysis.consensus) || 'N/A';
      const targetMedian = data.target_price_median || (data.analyst && data.analyst.targetMedian) || (data.analysis && data.analysis.targetPrice && data.analysis.targetPrice.median) || 'N/A';
      const targetMean = data.target_price_mean || (data.targetPriceStats && data.targetPriceStats.mean) || (data.target_price_stats && data.target_price_stats.mean) || 'N/A';
      const targetHigh = data.target_price_high || (data.analyst && data.analyst.targetHigh) || (data.analysis && data.analysis.targetPrice && data.analysis.targetPrice.high) || 'N/A';
      const targetLow = data.target_price_low || (data.analyst && data.analyst.targetLow) || (data.analysis && data.analysis.targetPrice && data.analysis.targetPrice.low) || 'N/A';
      const targetUpside = data.target_price_upside || (data.targetPriceStats && data.targetPriceStats.upsidePercent !== undefined ? `${data.targetPriceStats.upsidePercent}%` : '') || (data.target_price_stats && data.target_price_stats.upsidePercent !== undefined ? `${data.target_price_stats.upsidePercent}%` : 'N/A');
      const targetCv = data.target_price_cv || (data.targetPriceStats && data.targetPriceStats.cv !== undefined ? `${(data.targetPriceStats.cv * 100).toFixed(2)}%` : '') || (data.target_price_stats && data.target_price_stats.cv !== undefined ? `${(data.target_price_stats.cv * 100).toFixed(2)}%` : 'N/A');

      // 財報與營收
      const earningsPeriod = data.earnings_period || (data.earnings && (data.earnings.period || data.earnings.latestQuarter?.quarter)) || 'N/A';
      const epsData = data.earnings_eps || (data.earnings && data.earnings.epsActual ? `實值 ${data.earnings.epsActual} / 預期 ${data.earnings.epsEstimate || '-'}` : 'N/A');
      const revData = data.earnings_revenue || (data.earnings && data.earnings.revenueActual ? `實值 ${data.earnings.revenueActual} / 預期 ${data.earnings.revenueEstimate || '-'}` : 'N/A');
      const earningsInsights = data.earnings_insights || (data.earnings && Array.isArray(data.earnings.insights) ? data.earnings.insights.join('\n') : '') || '';

      // 損益表與財務表格
      const financialsTable = data.financials_table || (data.financialsTable) || '';

      // 筆記或關鍵觀點
      const note = data.note || '';

      let prompt = `# 【深度買方投研分析請求】標的：${ticker}${companyName ? ` (${companyName})` : ''}\n\n`;
      prompt += `## 你的角色與任務定位：\n`;
      prompt += `你是一位擁有 15 年以上頂級對沖基金 (Buy-side Hedge Fund) 經驗的資深權益研究員 (Senior Equity Research Analyst)。請基於以下所提供的客觀基本面、即時市場行情、分析師共識目標價、財務報表及研究筆記，針對 **${ticker}** 進行全方位、批判性、機構級別的投資價值深度評估。\n\n`;

      prompt += `## 標的情報與數據快照 (Ground Truth Context)：\n`;
      prompt += `- **標的名稱 (Ticker)**: ${ticker} ${companyName ? `(${companyName})` : ''}\n`;
      prompt += `- **當前股價 (Current Price)**: ${price}\n`;
      prompt += `- **市值規模 (Market Cap)**: ${mktCap}\n`;
      prompt += `- **本益比 (P/E)**: ${pe} | **貝他值 (Beta)**: ${beta}\n`;
      prompt += `- **52週價格區間 (52-wk Range)**: ${range52w}\n`;
      prompt += `- **分析師評級共識 (Consensus)**: ${consensus}\n`;
      prompt += `- **目標價統計矩陣**:\n`;
      prompt += `  * 中位數 (Median): $${targetMedian}\n`;
      prompt += `  * 平均值 (Mean): $${targetMean}\n`;
      prompt += `  * 區間 (Range): $${targetLow} ~ $${targetHigh}\n`;
      prompt += `  * 隱含現價上漲空間 (Implied Upside): ${targetUpside}\n`;
      prompt += `  * 目標價離散係數 (CV): ${targetCv} (反映華爾街分歧度)\n`;
      prompt += `- **最新財報季度**: ${earningsPeriod}\n`;
      prompt += `  * EPS (實值 vs 預估): ${epsData}\n`;
      prompt += `  * 營收 (實值 vs 預估): ${revData}\n`;

      if (earningsInsights) {
        prompt += `\n### 財報關鍵資訊與 AI 亮點：\n${earningsInsights}\n`;
      }

      if (financialsTable && financialsTable !== 'N/A') {
        prompt += `\n### 近期季度財務報表：\n${financialsTable}\n`;
      }

      if (note) {
        prompt += `\n### 研報觀察筆記與延伸背景：\n${note}\n`;
      }

      prompt += `\n---\n\n`;
      prompt += `## 請嚴格依照以下六大模組進行結構化輸出（請使用專業繁體中文、金融終端語氣、嚴謹邏輯）：\n\n`;
      prompt += `### 1. 【投資評級與執行摘要 (Executive Summary)】\n`;
      prompt += `- 明確給出投資建議評級（如：**強力買進 / 買進 / 中立持有 / 逢高減碼 / 賣出**）。\n`;
      prompt += `- 綜合現價與目標價中位數（隱含空間 ${targetUpside}），給出 6~12 個月合理目標價區間與估值隱含回報。\n`;
      prompt += `- 100~150 字精準概括核心投資哲學與核心多空矛盾點。\n\n`;

      prompt += `### 2. 【多方核心論點與護城河 (Bull Case)】\n`;
      prompt += `- 條列至少 3 點驅動未來營收與獲利超額成長的結構性優勢（如定價權、技術壁壘、市場份額擴張、毛利率提升動能）。\n`;
      prompt += `- 結合損益表數據與 EPS Surprise 表現進行佐證。\n\n`;

      prompt += `### 3. 【空方疑慮與下行風險 (Bear Case & Key Risks)】\n`;
      prompt += `- 條列至少 3 點關鍵下行風險因子（如估值倍數過高風險、同業價格競爭、地緣政治、總經利率影響、主要客戶集中度等）。\n`;
      prompt += `- 評估若最悲觀情境 (Worst-case) 發生時，股價可能回測的下檔支撐。\n\n`;

      prompt += `### 4. 【關鍵催化劑時程表 (Catalysts Timeline)】\n`;
      prompt += `- 列出未來 3~12 個月內可能推動股價重估 (Re-rating) 的具體催化劑（如：下季度財報發布、重大產品發表、法說會指引、監管政策進展）。\n\n`;

      prompt += `### 5. 【財務體質與估值診斷矩陣 (Financial & Valuation Matrix)】\n`;
      prompt += `- 診斷營收年增率 (YoY)、營業利益率與每股盈餘 (EPS) 走勢之健康度。\n`;
      prompt += `- 比對 P/E 與歷史估值中樞或行業龍頭平均，評估當前估值是否處於溢價或折價狀態。\n\n`;

      prompt += `### 6. 【機構級操盤策略與風控指引 (Trading & Risk Management Strategy)】\n`;
      prompt += `- **建議建倉節奏**：首筆部位建議比例、逢回檔加碼點位。\n`;
      prompt += `- **關鍵價位監測**：核心支撐位、目標停利區間、嚴格停損 (Stop-loss) 點位或跌破條件。\n`;

      return prompt;
    }
  };

  // 掛載到全域與 CommonJS
  if (typeof window !== 'undefined') {
    window.FinanceAIClient = FinanceAIClient;
  }
  if (typeof self !== 'undefined') {
    self.FinanceAIClient = FinanceAIClient;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      FinanceAIClient,
      sanitizeFinancePayload,
      sanitizeTaskPayload
    };
  }
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
