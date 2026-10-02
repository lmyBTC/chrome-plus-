/**
 * Browser Activity Monitor - Session 彙總分析引擎與噪音過濾核心 (ProfilerSession)
 * 專為隨選健檢 (Quick Audit) 與持續檢測記錄 (Continuous Session) 設計。
 * 負責記憶體輕量彙總統計、Noise Gate (遙測心跳/串流識別)、異常警示與具體可操作建議生成。
 */

// 常見遙測、追蹤、廣告統計網域規則 (Noise Gate)
const TELEMETRY_DOMAIN_PATTERNS = [
  /analytics\.google\.com$/i,
  /google-analytics\.com$/i,
  /googletagmanager\.com$/i,
  /stats\.g\.doubleclick\.net$/i,
  /clarity\.ms$/i,
  /hotjar\.com$/i,
  /segment\.io$/i,
  /segment\.com$/i,
  /mixpanel\.com$/i,
  /amplitude\.com$/i,
  /sentry\.io$/i,
  /sentry-cdn\.com$/i,
  /datadoghq\.com$/i,
  /newrelic\.com$/i,
  /nr-data\.net$/i,
  /telemetry/i,
  /beacon/i,
  /ping/i
];

// 常見遙測路徑規則
const TELEMETRY_PATH_PATTERNS = [
  /\/collect/i,
  /\/telemetry/i,
  /\/analytics/i,
  /\/beacon/i,
  /\/ping/i,
  /\/logging/i,
  /\/metrics/i,
  /\/track/i,
  /\/events/i,
  /\/heartbeat/i,
  /\/stats/i,
  /\/batch/i
];

// 常見串流分塊網域與特徵 (Streaming Media / Chunked Video)
const STREAMING_DOMAIN_PATTERNS = [
  /googlevideo\.com$/i,
  /fbcdn\.net$/i,
  /tiktokv\.com$/i,
  /cdninstagram\.com$/i,
  /byteoversea\.com$/i,
  /akamaized\.net$/i,
  /twitch\.tv$/i,
  /bilibili\.com$/i,
  /bilivideo\.com$/i
];

/**
 * 記憶體輕量 Session 分析器實例
 */
export class ProfilerSession {
  /**
   * @param {Object} options
   * @param {string} [options.id] 檢測 Session 識別碼
   * @param {'TIMED'|'CONTINUOUS'} [options.mode='TIMED'] 檢測模式
   * @param {number} [options.durationMs=60000] 定時採樣時間 (ms)
   */
  constructor(options = {}) {
    this.id = options.id || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    this.mode = options.mode || 'TIMED';
    this.durationMs = this.mode === 'TIMED' ? (options.durationMs || 60000) : null;
    this.status = this.mode === 'TIMED' ? 'RUNNING_TIMED' : 'RUNNING_CONTINUOUS';
    this.startTime = Date.now();
    this.endTime = null;

    // 總體計數
    this.totalEvents = 0;
    this.telemetryEvents = 0;
    this.streamingEvents = 0;
    this.functionalEvents = 0;

    // 類別計數
    this.categoryStats = {
      network: 0,
      download: 0,
      probe: 0
    };

    // 網域統計 Map<domain, DomainStat>
    this.domainStats = new Map();

    // 分頁統計 Map<tabId, TabStat>
    this.tabStats = new Map();
  }

  /**
   * Noise Gate: 判斷是否為常態遙測、心跳或埋點請求
   * @param {string} url 請求網址
   * @param {string} hostname 解析後之網域名稱
   * @returns {boolean}
   */
  isTelemetry(url, hostname) {
    if (!url || !hostname) return false;

    // 1. 檢查網域黑名單與遙測關鍵字
    for (const pattern of TELEMETRY_DOMAIN_PATTERNS) {
      if (pattern.test(hostname)) return true;
    }

    // 2. 檢查 URL 路徑中的遙測特徵
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      for (const pattern of TELEMETRY_PATH_PATTERNS) {
        if (pattern.test(pathname)) return true;
      }
    } catch {
      // 忽略非標準 URL
    }

    return false;
  }

  /**
   * 判斷是否為影音串流分塊傳輸
   * @param {string} url 請求網址
   * @param {string} hostname 解析後之網域名稱
   * @param {string} type 資源類型 (例如 media, xmlhttprequest)
   * @returns {boolean}
   */
  isStreaming(url, hostname, type) {
    if (!url || !hostname) return false;

    if (type === 'media') return true;

    for (const pattern of STREAMING_DOMAIN_PATTERNS) {
      if (pattern.test(hostname)) return true;
    }

    if (url.includes('/videoplayback') || url.includes('.m3u8') || url.includes('.mpd') || url.includes('.ts')) {
      return true;
    }

    return false;
  }

  /**
   * 記錄單筆活動事件並更新統計模型
   * @param {Object} event 事件物件
   */
  recordEvent(event) {
    if (!event) return;
    this.totalEvents++;

    const cat = event.category || 'network';
    if (this.categoryStats[cat] != null) {
      this.categoryStats[cat]++;
    } else {
      this.categoryStats[cat] = 1;
    }

    // 解析網域與特徵分類
    let domain = 'system';
    let isTelem = false;
    let isStream = false;

    if (event.url) {
      try {
        const urlObj = new URL(event.url);
        domain = urlObj.hostname || 'unknown';
        isTelem = this.isTelemetry(event.url, domain);
        isStream = !isTelem && this.isStreaming(event.url, domain, event.type);
      } catch {
        domain = 'invalid_url';
      }
    } else if (event.origin) {
      try {
        domain = new URL(event.origin).hostname;
      } catch {
        domain = event.origin;
      }
    }

    if (isTelem) {
      this.telemetryEvents++;
    } else if (isStream) {
      this.streamingEvents++;
    } else {
      this.functionalEvents++;
    }

    // 累積網域統計
    let dStat = this.domainStats.get(domain);
    if (!dStat) {
      dStat = {
        domain,
        count: 0,
        telemetryCount: 0,
        streamingCount: 0,
        functionalCount: 0,
        firstSeen: event.timestamp || Date.now(),
        lastSeen: event.timestamp || Date.now()
      };
      this.domainStats.set(domain, dStat);
    }
    dStat.count++;
    dStat.lastSeen = event.timestamp || Date.now();
    if (isTelem) dStat.telemetryCount++;
    else if (isStream) dStat.streamingCount++;
    else dStat.functionalCount++;

    // 累積分頁統計
    const tabId = event.tabId != null ? event.tabId : -1;
    let tStat = this.tabStats.get(tabId);
    if (!tStat) {
      tStat = {
        tabId,
        count: 0,
        telemetryCount: 0,
        streamingCount: 0,
        functionalCount: 0,
        domains: new Map(), // domain -> count
        firstSeen: event.timestamp || Date.now(),
        lastSeen: event.timestamp || Date.now()
      };
      this.tabStats.set(tabId, tStat);
    }
    tStat.count++;
    tStat.lastSeen = event.timestamp || Date.now();
    if (isTelem) tStat.telemetryCount++;
    else if (isStream) tStat.streamingCount++;
    else tStat.functionalCount++;

    tStat.domains.set(domain, (tStat.domains.get(domain) || 0) + 1);
  }

  /**
   * 計算即時每秒請求數與負載等級評估
   * @returns {{ eps: number, loadLevel: 'LOW'|'MODERATE'|'HIGH'|'CRITICAL' }}
   */
  calculateCurrentLoad() {
    const elapsedSec = Math.max(1, (Date.now() - this.startTime) / 1000);
    const eps = Number((this.totalEvents / elapsedSec).toFixed(1));

    let loadLevel = 'LOW';
    if (eps >= 15) {
      loadLevel = 'CRITICAL';
    } else if (eps >= 8) {
      loadLevel = 'HIGH';
    } else if (eps >= 3) {
      loadLevel = 'MODERATE';
    }

    return { eps, loadLevel };
  }

  /**
   * 取得進行中之輕量狀態快照 (供前端或查詢使用)
   * @returns {Object}
   */
  getSnapshot() {
    const { eps, loadLevel } = this.calculateCurrentLoad();
    const elapsedSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    return {
      id: this.id,
      mode: this.mode,
      status: this.status,
      startTime: this.startTime,
      durationMs: this.durationMs,
      elapsedSeconds: elapsedSec,
      totalEvents: this.totalEvents,
      telemetryEvents: this.telemetryEvents,
      streamingEvents: this.streamingEvents,
      functionalEvents: this.functionalEvents,
      eventsPerSecond: eps,
      loadLevel,
      categoryStats: { ...this.categoryStats }
    };
  }

  /**
   * 結算 Session 並產出結構化檢測報告與可操作建議
   * @param {Object} options
   * @param {string} [options.stopReason='MANUAL'] 停止原因 ('MANUAL'|'TIMED_OUT'|'PANEL_CLOSED'|'SUSPEND')
   * @param {Array<Object>} [options.enrichedTabs] 包含 title/url 之分頁詳細資訊 (選填)
   * @returns {Object} 結構化檢測報告
   */
  generateReport(options = {}) {
    this.endTime = Date.now();
    this.status = 'COMPLETED';

    const stopReason = options.stopReason || 'MANUAL';
    const durationSeconds = Math.max(1, Math.round((this.endTime - this.startTime) / 1000));
    const eps = Number((this.totalEvents / durationSeconds).toFixed(1));

    // 計算整體比例
    const total = this.totalEvents || 1;
    const telemetryRatio = Number(((this.telemetryEvents / total) * 100).toFixed(1));
    const streamingRatio = Number(((this.streamingEvents / total) * 100).toFixed(1));
    const functionalRatio = Number(((this.functionalEvents / total) * 100).toFixed(1));

    // 總體負載等級
    let overallLoadLevel = 'LOW';
    if (eps >= 15) overallLoadLevel = 'CRITICAL';
    else if (eps >= 8) overallLoadLevel = 'HIGH';
    else if (eps >= 3) overallLoadLevel = 'MODERATE';

    // 排序 TOP 5 網域
    const topDomains = Array.from(this.domainStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((d) => ({
        domain: d.domain,
        count: d.count,
        telemetryCount: d.telemetryCount,
        streamingCount: d.streamingCount,
        functionalCount: d.functionalCount,
        percentage: Number(((d.count / total) * 100).toFixed(1))
      }));

    // 排序 TOP 5 分頁
    const rawTopTabs = Array.from(this.tabStats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t) => {
        // 取得該分頁主要網域
        const primaryDomainEntry = Array.from(t.domains.entries()).sort((a, b) => b[1] - a[1])[0];
        const primaryDomain = primaryDomainEntry ? primaryDomainEntry[0] : 'unknown';

        return {
          tabId: t.tabId,
          count: t.count,
          telemetryCount: t.telemetryCount,
          streamingCount: t.streamingCount,
          functionalCount: t.functionalCount,
          primaryDomain,
          percentage: Number(((t.count / total) * 100).toFixed(1))
        };
      });

    // 若呼叫端有傳入已注入資訊的分頁清單，進行匹配合併
    const topTabs = rawTopTabs.map((t) => {
      const match = options.enrichedTabs?.find((item) => item.tabId === t.tabId);
      return {
        ...t,
        title: match?.title || (t.tabId === -1 ? '背景系統請求' : `分頁 #${t.tabId}`),
        url: match?.url || '',
        favIconUrl: match?.favIconUrl || ''
      };
    });

    // 檢測異常指標 (Anomalies)
    const anomalies = [];

    if (eps >= 8) {
      anomalies.push({
        type: 'HIGH_EPS',
        level: eps >= 15 ? 'CRITICAL' : 'HIGH',
        message: `平均請求頻率偏高 (${eps} req/s)，可能存在高頻心跳輪詢或大量分塊請求。`
      });
    }

    if (telemetryRatio >= 60 && this.totalEvents >= 20) {
      anomalies.push({
        type: 'HEAVY_TELEMETRY',
        level: 'WARNING',
        message: `常態遙測與追蹤請求佔比達 ${telemetryRatio}%，背景分析腳本活動頻繁。`
      });
    }

    if (streamingRatio >= 50 && this.totalEvents >= 30) {
      anomalies.push({
        type: 'STREAMING_LOAD',
        level: 'INFO',
        message: `影音串流分塊傳輸佔比達 ${streamingRatio}%，主要由媒體播放引起。`
      });
    }

    // 檢查是否有單一分頁頻率過高
    for (const tab of topTabs) {
      const tabEps = Number((tab.count / durationSeconds).toFixed(1));
      if (tabEps >= 5 && tab.tabId !== -1) {
        anomalies.push({
          type: 'TAB_HOTSPOT',
          level: 'WARNING',
          tabId: tab.tabId,
          message: `${tab.title} 產生每秒 ${tabEps} 次請求，為主要活躍熱點。`
        });
      }
    }

    // 產出具體可操作優化建議 (Actionable Recommendations)
    const recommendations = [];

    // 1. 分頁等級建議
    const hotspotTab = topTabs.find((t) => t.tabId !== -1 && t.count >= 20);
    if (hotspotTab) {
      const tabTelemRatio = hotspotTab.count > 0 ? (hotspotTab.telemetryCount / hotspotTab.count) * 100 : 0;
      if (tabTelemRatio >= 50) {
        recommendations.push(
          `建議關閉或休眠「${hotspotTab.title}」：此分頁產生 ${hotspotTab.count} 次請求中，有 ${hotspotTab.telemetryCount} 次 (${tabTelemRatio.toFixed(0)}%) 為背景遙測追蹤。`
        );
      } else {
        recommendations.push(
          `「${hotspotTab.title}」為主要負載來源（累積 ${hotspotTab.count} 次請求，主要網域：${hotspotTab.primaryDomain}）。`
        );
      }
    }

    // 2. 網域與串流建議
    if (topDomains.length > 0 && topDomains[0].percentage >= 40 && topDomains[0].count >= 30) {
      const topD = topDomains[0];
      if (topD.streamingCount > topD.functionalCount) {
        recommendations.push(
          `檢測到主要網路佔用來自串流媒體服務「${topD.domain}」（佔比 ${topD.percentage}%），若非正在觀賞，建議暫停背景播放。`
        );
      } else {
        recommendations.push(
          `網域「${topD.domain}」佔整體請求之 ${topD.percentage}%（${topD.count} 次），建議留意該網站之輪詢或長連接開銷。`
        );
      }
    }

    // 3. 通用綠燈健康狀態
    if (recommendations.length === 0) {
      recommendations.push(
        '檢測期間各分頁活動平穩，平均請求速率健康，未發現異常頻繁之背景遙測或高頻心跳輪詢。'
      );
    }

    return {
      id: this.id,
      timestamp: this.endTime,
      mode: this.mode,
      stopReason,
      durationSeconds,
      totalEvents: this.totalEvents,
      eventsPerSecond: eps,
      overallLoadLevel,
      ratios: {
        telemetryRatio,
        streamingRatio,
        functionalRatio,
        telemetryEvents: this.telemetryEvents,
        streamingEvents: this.streamingEvents,
        functionalEvents: this.functionalEvents
      },
      categoryStats: { ...this.categoryStats },
      topDomains,
      topTabs,
      anomalies,
      recommendations
    };
  }
}
