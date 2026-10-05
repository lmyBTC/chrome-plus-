/**
 * tab-interceptor.js - 自動跳出新開分頁攔截器與網域黑名單比對引擎 (AM-04)
 * 專為攔截惡意廣告彈窗、Popunder 與未授權新分頁設計。
 * 提供記憶體快取 + chrome.storage.local 持久化雙向同步與高效比對演算法。
 */

import { extractHostname } from './domain-classifier.js';

export const INTERCEPTOR_STORAGE_KEYS = {
  RULES: 'bam_tab_blacklist_rules',
  CONFIG: 'bam_tab_interceptor_config',
  STATS: 'bam_tab_interceptor_stats',
  LOGS: 'bam_tab_interceptor_logs'
};

export const DEFAULT_INTERCEPTOR_CONFIG = {
  enabled: true,
  blockOpenerTabs: true,
  maxLogsCount: 100
};

export const DEFAULT_BLACKLIST_RULES = [
  {
    id: 'rule_popunder_default',
    domain: '*.popunder.net',
    matchMode: 'wildcard',
    enabled: true,
    createdAt: 1728100000000,
    notes: '常見惡意 Popunder 跳窗網域'
  },
  {
    id: 'rule_adpopup_default',
    domain: '*.ad-popup.com',
    matchMode: 'wildcard',
    enabled: true,
    createdAt: 1728100000000,
    notes: '常見廣告彈窗網域'
  }
];

export class TabInterceptor {
  /**
   * @param {Object} [options]
   * @param {Function} [options.onBlocked] 當分頁被攔截關閉時的回調
   */
  constructor(options = {}) {
    this.onBlocked = options.onBlocked || null;

    // 記憶體快取
    this.config = { ...DEFAULT_INTERCEPTOR_CONFIG };
    this.rules = [];
    this.stats = {
      totalBlocked: 0,
      todayBlocked: 0,
      lastResetDate: this._getTodayDateString()
    };
    this.logs = [];
    this._initialized = false;
  }

  /**
   * 初始化：自 chrome.storage.local 載入規則與狀態，並掛載 storage 監聽器
   */
  async init() {
    if (this._initialized) return;

    try {
      const data = await chrome.storage.local.get([
        INTERCEPTOR_STORAGE_KEYS.CONFIG,
        INTERCEPTOR_STORAGE_KEYS.RULES,
        INTERCEPTOR_STORAGE_KEYS.STATS,
        INTERCEPTOR_STORAGE_KEYS.LOGS
      ]);

      // 載入配置
      this.config = {
        ...DEFAULT_INTERCEPTOR_CONFIG,
        ...(data[INTERCEPTOR_STORAGE_KEYS.CONFIG] || {})
      };

      // 載入規則（若初次執行無規則，載入預設規則集）
      if (Array.isArray(data[INTERCEPTOR_STORAGE_KEYS.RULES])) {
        this.rules = data[INTERCEPTOR_STORAGE_KEYS.RULES];
      } else {
        this.rules = [...DEFAULT_BLACKLIST_RULES];
        await chrome.storage.local.set({
          [INTERCEPTOR_STORAGE_KEYS.RULES]: this.rules
        });
      }

      // 載入統計
      if (data[INTERCEPTOR_STORAGE_KEYS.STATS]) {
        this.stats = {
          ...this.stats,
          ...data[INTERCEPTOR_STORAGE_KEYS.STATS]
        };
      }
      this._checkDailyReset();

      // 載入日誌
      if (Array.isArray(data[INTERCEPTOR_STORAGE_KEYS.LOGS])) {
        this.logs = data[INTERCEPTOR_STORAGE_KEYS.LOGS];
      }

      // 掛載 storage 監聽器以響應來自 Sidepanel 或其他上下文的更新
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        if (changes[INTERCEPTOR_STORAGE_KEYS.CONFIG]) {
          this.config = {
            ...DEFAULT_INTERCEPTOR_CONFIG,
            ...(changes[INTERCEPTOR_STORAGE_KEYS.CONFIG].newValue || {})
          };
        }
        if (changes[INTERCEPTOR_STORAGE_KEYS.RULES]) {
          this.rules = Array.isArray(changes[INTERCEPTOR_STORAGE_KEYS.RULES].newValue)
            ? changes[INTERCEPTOR_STORAGE_KEYS.RULES].newValue
            : [];
        }
        if (changes[INTERCEPTOR_STORAGE_KEYS.STATS]) {
          this.stats = {
            ...this.stats,
            ...(changes[INTERCEPTOR_STORAGE_KEYS.STATS].newValue || {})
          };
        }
        if (changes[INTERCEPTOR_STORAGE_KEYS.LOGS]) {
          this.logs = Array.isArray(changes[INTERCEPTOR_STORAGE_KEYS.LOGS].newValue)
            ? changes[INTERCEPTOR_STORAGE_KEYS.LOGS].newValue
            : [];
        }
      });

      this._initialized = true;
    } catch (err) {
      console.error('[TabInterceptor] 初始化載入儲存失敗:', err);
    }
  }

  /**
   * 檢查攔截器總開關是否啟用
   * @returns {boolean}
   */
  isEnabled() {
    return Boolean(this.config.enabled);
  }

  /**
   * 比對指定 URL 是否命中黑名單
   * @param {string} url 目標或來源網址
   * @returns {{ matched: boolean, rule: Object|null, hostname: string }}
   */
  matchUrl(url) {
    if (!url || typeof url !== 'string') {
      return { matched: false, rule: null, hostname: '' };
    }

    // 排除瀏覽器內部專用通訊協定
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('edge://') ||
      url.startsWith('devtools://') ||
      url.startsWith('about:') ||
      url.startsWith('data:')
    ) {
      return { matched: false, rule: null, hostname: '' };
    }

    const hostname = extractHostname(url);
    if (!hostname) {
      return { matched: false, rule: null, hostname: '' };
    }

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this._testRuleMatch(hostname, rule)) {
        return { matched: true, rule, hostname };
      }
    }

    return { matched: false, rule: null, hostname };
  }

  /**
   * 內部比對單一規則演算法
   * @param {string} hostname 目標 hostname (已小寫)
   * @param {Object} rule 黑名單規則
   * @returns {boolean}
   */
  _testRuleMatch(hostname, rule) {
    if (!rule.domain) return false;
    const rawPattern = rule.domain.trim().toLowerCase();
    const mode = rule.matchMode || 'wildcard';

    // 完全匹配模式
    if (mode === 'exact') {
      return hostname === rawPattern;
    }

    // 萬用字元 (Wildcard) 模式
    if (rawPattern.startsWith('*.')) {
      const baseDomain = rawPattern.slice(2);
      return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
    }

    if (rawPattern.includes('*')) {
      try {
        const regexStr = '^' + rawPattern
          .split('*')
          .map((part) => part.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'))
          .join('.*') + '$';
        const regex = new RegExp(regexStr);
        return regex.test(hostname);
      } catch {
        return hostname === rawPattern;
      }
    }

    // 若無萬用符號但處於萬用字元模式：預設涵蓋主域與所有子網域 (如 bad.com 命中 bad.com 與 a.bad.com)
    return hostname === rawPattern || hostname.endsWith('.' + rawPattern);
  }

  /**
   * 記錄攔截日誌並更新計數統計
   * @param {Object} params
   * @param {string} params.targetUrl 目標網址
   * @param {string} [params.openerUrl] 來源分頁網址
   * @param {string} params.matchedRule 命中的規則網域
   * @param {string} [params.action] 攔截動作 ('TABS_REMOVE' | 'CONTENT_PREVENTED')
   * @returns {Promise<Object>} 新增的日誌物件
   */
  async recordBlocked({ targetUrl, openerUrl = '', matchedRule, action = 'TABS_REMOVE' }) {
    this._checkDailyReset();

    this.stats.totalBlocked += 1;
    this.stats.todayBlocked += 1;

    const logItem = {
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      targetUrl: targetUrl || 'about:blank',
      openerUrl: openerUrl || '',
      matchedRule: matchedRule || '',
      action,
      timestamp: Date.now()
    };

    this.logs.unshift(logItem);
    if (this.logs.length > (this.config.maxLogsCount || 100)) {
      this.logs = this.logs.slice(0, this.config.maxLogsCount || 100);
    }

    try {
      await chrome.storage.local.set({
        [INTERCEPTOR_STORAGE_KEYS.STATS]: this.stats,
        [INTERCEPTOR_STORAGE_KEYS.LOGS]: this.logs
      });
    } catch (err) {
      console.warn('[TabInterceptor] 儲存攔截統計日誌失敗:', err);
    }

    if (typeof this.onBlocked === 'function') {
      try {
        this.onBlocked(logItem, this.stats);
      } catch (err) {
        console.warn('[TabInterceptor] onBlocked 回調執行失敗:', err);
      }
    }

    return logItem;
  }

  /**
   * 新增黑名單規則
   * @param {string} domain 網域模式 (例如: `*.popunder.com` 或 `ad.badsite.com`)
   * @param {'wildcard'|'exact'} [matchMode='wildcard'] 比對模式
   * @param {string} [notes=''] 備註說明
   * @returns {Promise<Object>}
   */
  async addRule(domain, matchMode = 'wildcard', notes = '') {
    if (!domain || typeof domain !== 'string') {
      throw new Error('網域不可為空');
    }

    let cleanDomain = domain.trim().toLowerCase();
    // 移除使用者誤填的 http:// 或 https:// 前綴與路徑
    cleanDomain = cleanDomain.replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].split(':')[0];

    if (!cleanDomain) {
      throw new Error('無效的網域格式');
    }

    // 檢查是否已存在相同網域
    const existing = this.rules.find((r) => r.domain === cleanDomain && r.matchMode === matchMode);
    if (existing) {
      throw new Error('已存在相同比對模式的規則');
    }

    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      domain: cleanDomain,
      matchMode: matchMode === 'exact' ? 'exact' : 'wildcard',
      enabled: true,
      createdAt: Date.now(),
      notes: notes || ''
    };

    this.rules.unshift(newRule);
    await chrome.storage.local.set({
      [INTERCEPTOR_STORAGE_KEYS.RULES]: this.rules
    });

    return newRule;
  }

  /**
   * 更新黑名單規則
   * @param {string} id 規則 ID
   * @param {Object} updates 更新欄位
   * @returns {Promise<Object>}
   */
  async updateRule(id, updates = {}) {
    const index = this.rules.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error('找不到指定的規則');
    }

    const rule = this.rules[index];
    if (updates.domain !== undefined) {
      let cleanDomain = String(updates.domain).trim().toLowerCase();
      cleanDomain = cleanDomain.replace(/^[a-zA-Z]+:\/\//, '').split('/')[0].split(':')[0];
      if (!cleanDomain) throw new Error('網域格式無效');
      rule.domain = cleanDomain;
    }
    if (updates.matchMode !== undefined) {
      rule.matchMode = updates.matchMode === 'exact' ? 'exact' : 'wildcard';
    }
    if (updates.enabled !== undefined) {
      rule.enabled = Boolean(updates.enabled);
    }
    if (updates.notes !== undefined) {
      rule.notes = String(updates.notes);
    }

    this.rules[index] = rule;
    await chrome.storage.local.set({
      [INTERCEPTOR_STORAGE_KEYS.RULES]: this.rules
    });

    return rule;
  }

  /**
   * 刪除黑名單規則
   * @param {string} id 規則 ID
   * @returns {Promise<boolean>}
   */
  async deleteRule(id) {
    const initialLen = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    if (this.rules.length !== initialLen) {
      await chrome.storage.local.set({
        [INTERCEPTOR_STORAGE_KEYS.RULES]: this.rules
      });
      return true;
    }
    return false;
  }

  /**
   * 切換規則啟用狀態
   * @param {string} id 規則 ID
   * @param {boolean} [enabled] 若未指定則自動反轉
   * @returns {Promise<Object>}
   */
  async toggleRule(id, enabled) {
    const rule = this.rules.find((r) => r.id === id);
    if (!rule) throw new Error('找不到指定的規則');
    rule.enabled = typeof enabled === 'boolean' ? enabled : !rule.enabled;
    await chrome.storage.local.set({
      [INTERCEPTOR_STORAGE_KEYS.RULES]: this.rules
    });
    return rule;
  }

  /**
   * 更新整體配置（如開關、最大記錄數等）
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateConfig(updates = {}) {
    this.config = {
      ...this.config,
      ...updates
    };
    await chrome.storage.local.set({
      [INTERCEPTOR_STORAGE_KEYS.CONFIG]: this.config
    });
    return this.config;
  }

  /**
   * 清空攔截歷史日誌
   * @returns {Promise<void>}
   */
  async clearLogs() {
    this.logs = [];
    await chrome.storage.local.set({
      [INTERCEPTOR_STORAGE_KEYS.LOGS]: []
    });
  }

  /**
   * 取得完整狀態快照（供 Side Panel 初始化載入）
   * @returns {Object}
   */
  getSnapshot() {
    this._checkDailyReset();
    return {
      config: { ...this.config },
      rules: [...this.rules],
      stats: { ...this.stats },
      logs: [...this.logs]
    };
  }

  /**
   * 檢查是否跨日以重置今日攔截計數
   */
  _checkDailyReset() {
    const today = this._getTodayDateString();
    if (this.stats.lastResetDate !== today) {
      this.stats.todayBlocked = 0;
      this.stats.lastResetDate = today;
      chrome.storage.local.set({
        [INTERCEPTOR_STORAGE_KEYS.STATS]: this.stats
      }).catch(() => {});
    }
  }

  /**
   * 取得 YYYY-MM-DD 格式日期字串
   */
  _getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
