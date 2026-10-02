/**
 * Browser Activity Monitor - 組件資源監視與效能診斷核心 (ResourceProfiler)
 * 專為 MV3 Background Service Worker 與 Side Panel 設計的輕量效能採集器。
 * 零常駐負擔、記憶體閉環控制、自動生成組件優化建議。
 */

export class ResourceProfiler {
  /**
   * @param {Object} options
   * @param {number} [options.maxHistoryLength=30] 每個 label 最多保留的歷史樣本數
   * @param {number} [options.highLatencyThresholdMs=16] 判定為掉幀或高延遲的閥值 (ms)
   */
  constructor(options = {}) {
    this.maxHistoryLength = options.maxHistoryLength || 30;
    this.highLatencyThresholdMs = options.highLatencyThresholdMs || 16;

    // 模組耗時統計表 Map<string, MetricRecord>
    this.metrics = new Map();

    // 進行中的計時器 Map<string, number> (timestamp from performance.now())
    this.activeTimers = new Map();

    // 佇列積壓監控表 Map<string, QueueRecord>
    this.queues = new Map();
  }

  /**
   * 取得高精度時間戳 (ms)
   * @private
   */
  _now() {
    return (typeof performance !== 'undefined' && performance.now) 
      ? performance.now() 
      : Date.now();
  }

  /**
   * 開始針對特定標籤計時
   * @param {string} label 模組或操作名稱
   */
  time(label) {
    if (!label) return;
    this.activeTimers.set(label, this._now());
  }

  /**
   * 結束計時並記錄指標
   * @param {string} label 模組或操作名稱
   * @returns {number} 本次操作耗時 (ms)
   */
  timeEnd(label) {
    if (!label || !this.activeTimers.has(label)) {
      return 0;
    }

    const startTime = this.activeTimers.get(label);
    this.activeTimers.delete(label);
    const duration = Math.max(0, this._now() - startTime);

    this.recordDuration(label, duration);
    return duration;
  }

  /**
   * 直接記錄一次耗時
   * @param {string} label 標籤名稱
   * @param {number} duration 耗時 (ms)
   */
  recordDuration(label, duration) {
    let record = this.metrics.get(label);
    if (!record) {
      record = {
        label,
        calls: 0,
        totalTime: 0,
        minTime: duration,
        maxTime: duration,
        lastTime: duration,
        avgTime: duration,
        history: []
      };
      this.metrics.set(label, record);
    }

    record.calls += 1;
    record.totalTime += duration;
    record.lastTime = duration;
    record.minTime = Math.min(record.minTime, duration);
    record.maxTime = Math.max(record.maxTime, duration);
    record.avgTime = Number((record.totalTime / record.calls).toFixed(2));

    record.history.push(Number(duration.toFixed(2)));
    if (record.history.length > this.maxHistoryLength) {
      record.history.shift();
    }
  }

  /**
   * 執行同步或非同步函式並自動計時
   * @param {string} label 操作標籤
   * @param {Function} fn 待測函式
   * @returns {Promise<any>|any} 函式執行結果
   */
  async measure(label, fn) {
    this.time(label);
    try {
      const result = await fn();
      return result;
    } finally {
      this.timeEnd(label);
    }
  }

  /**
   * 追蹤記錄佇列積壓狀態
   * @param {string} label 佇列名稱 (如 'indexedDB_write_queue', 'broadcast_queue')
   * @param {number} currentLength 當前佇列長度
   */
  recordQueue(label, currentLength) {
    let q = this.queues.get(label);
    if (!q) {
      q = {
        label,
        current: currentLength,
        peak: currentLength,
        totalSamples: 0,
        totalLength: 0,
        avg: currentLength
      };
      this.queues.set(label, q);
    }

    q.current = currentLength;
    q.peak = Math.max(q.peak, currentLength);
    q.totalSamples += 1;
    q.totalLength += currentLength;
    q.avg = Number((q.totalLength / q.totalSamples).toFixed(1));
  }

  /**
   * 取得當前環境記憶體粗估 (若瀏覽器支援 performance.memory)
   * @returns {Object|null}
   */
  getMemoryMetrics() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
      return {
        usedMB: Number((usedJSHeapSize / (1024 * 1024)).toFixed(2)),
        totalMB: Number((totalJSHeapSize / (1024 * 1024)).toFixed(2)),
        limitMB: Number((jsHeapSizeLimit / (1024 * 1024)).toFixed(2)),
        percentUsed: Number(((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(1))
      };
    }
    return null;
  }

  /**
   * 取得 DOM 節點開銷指標 (適用於 Side Panel 介面)
   * @param {Element|Document} [root=document]
   * @returns {Object|null}
   */
  getDomMetrics(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return null;
    const totalElements = root.querySelectorAll ? root.querySelectorAll('*').length : 0;
    const logItems = root.querySelectorAll ? root.querySelectorAll('.log-item, .log-entry').length : 0;
    return {
      totalElements,
      logItems
    };
  }

  /**
   * 取得所有模組效能清單 (依總開銷排序)
   * @returns {Array<Object>}
   */
  getRankedMetrics() {
    return Array.from(this.metrics.values()).sort((a, b) => b.totalTime - a.totalTime);
  }

  /**
   * 智慧評估並產出優化建議清單 (Optimization Recommendations)
   * @returns {Array<Object>} 診斷項目清單
   */
  getOptimizationRecommendations() {
    const recommendations = [];

    // 1. 模組耗時分析
    for (const record of this.metrics.values()) {
      if (record.calls >= 3 && record.avgTime > this.highLatencyThresholdMs) {
        recommendations.push({
          id: `latency-${record.label}`,
          level: record.avgTime > 40 ? 'critical' : 'warning',
          module: record.label,
          title: `「${record.label}」平均耗時過高`,
          message: `平均耗時 ${record.avgTime}ms (最高 ${record.maxTime.toFixed(1)}ms，共呼叫 ${record.calls} 次)，可能造成主執行緒卡頓。`,
          suggestion: '建議導入非同步 Worker 分流、分批分時切片 (requestIdleCallback) 或減少不必要的全量運算。'
        });
      } else if (record.calls > 100 && record.avgTime > 3) {
        recommendations.push({
          id: `freq-${record.label}`,
          level: 'info',
          module: record.label,
          title: `「${record.label}」呼叫頻率極高`,
          message: `累計已呼叫 ${record.calls} 次，總耗時達 ${record.totalTime.toFixed(1)}ms。`,
          suggestion: '建議考慮引入節流 (Throttle) 或防抖 (Debounce) 機制以減少呼叫次數。'
        });
      }
    }

    // 2. 佇列積壓診斷
    for (const q of this.queues.values()) {
      if (q.current > 20 || q.peak > 50) {
        recommendations.push({
          id: `queue-${q.label}`,
          level: q.current > 30 ? 'critical' : 'warning',
          module: q.label,
          title: `「${q.label}」佇列出現積壓`,
          message: `當前佇列長度 ${q.current}，歷史峰值達 ${q.peak}。`,
          suggestion: '寫入或處理速度低於產出速度，建議提高批次處理大小 (Batch Size) 或縮減寫入欄位。'
        });
      }
    }

    // 3. DOM 負擔診斷
    const domMetrics = this.getDomMetrics();
    if (domMetrics) {
      if (domMetrics.totalElements > 1000) {
        recommendations.push({
          id: 'dom-element-count',
          level: 'critical',
          module: 'SidePanel-DOM',
          title: 'DOM 節點數量過多',
          message: `當前面板節點總數達 ${domMetrics.totalElements}，已超過流暢閾值。`,
          suggestion: '建議啟用虛擬捲動 (Virtual Scrolling) 或降低一次性渲染的日誌條數上限。'
        });
      } else if (domMetrics.logItems > 200) {
        recommendations.push({
          id: 'dom-log-items',
          level: 'warning',
          module: 'SidePanel-DOM',
          title: '即時日誌節點累積偏多',
          message: `目前累積了 ${domMetrics.logItems} 條日誌節點。`,
          suggestion: '可配置「自動清理最舊日誌」上限，例如維持最新 100 條在 DOM 中。'
        });
      }
    }

    // 4. JS Heap 記憶體診斷
    const mem = this.getMemoryMetrics();
    if (mem && mem.percentUsed > 80) {
      recommendations.push({
        id: 'memory-heap-pressure',
        level: 'critical',
        module: 'System-Memory',
        title: 'JS Heap 記憶體使用率偏高',
        message: `記憶體已使用 ${mem.usedMB}MB / ${mem.limitMB}MB (${mem.percentUsed}%)。`,
        suggestion: '請檢查是否有未釋放的長連線 Port、大型全域緩存或監聽器洩漏。'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'health-all-good',
        level: 'good',
        module: 'System-Health',
        title: '組件資源狀況良好',
        message: '目前所有監控組件耗時、記憶體與佇列均在高效能綠色區間。',
        suggestion: '無須特別調整，系統保持輕量高效運作。'
      });
    }

    return recommendations;
  }

  /**
   * 取得整體資源監控摘要報告
   * @returns {Object}
   */
  getSummary() {
    return {
      timestamp: Date.now(),
      metrics: this.getRankedMetrics(),
      queues: Array.from(this.queues.values()),
      memory: this.getMemoryMetrics(),
      dom: this.getDomMetrics(),
      recommendations: this.getOptimizationRecommendations()
    };
  }

  /**
   * 重置所有採集數據
   */
  reset() {
    this.metrics.clear();
    this.activeTimers.clear();
    this.queues.clear();
  }
}

// 導出共享單例實例便於模組直接呼叫
export const profiler = new ResourceProfiler();
