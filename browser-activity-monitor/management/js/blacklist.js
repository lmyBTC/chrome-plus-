/**
 * Browser Activity Monitor - 黑名單管理模組 (blacklist.js)
 * 負責黑名單規則 CRUD、Chrome Storage 雙向即時同步、搜尋篩選、指標統計與 JSON 匯入匯出。
 */

import { Toast } from './main.js';

// 儲存鍵名（與 scripts/tab-interceptor.js 保持嚴格一致）
export const STORAGE_KEYS = {
  RULES: 'bam_tab_blacklist_rules',
  CONFIG: 'bam_tab_interceptor_config',
  STATS: 'bam_tab_interceptor_stats'
};

// 預設規則集（當初次安裝為空時使用）
const FALLBACK_RULES = [
  {
    id: 'rule_popunder_default',
    domain: '*.popunder.net',
    pattern: '*.popunder.net',
    matchMode: 'wildcard',
    action: 'close',
    enabled: true,
    createdAt: 1728100000000,
    updatedAt: 1728100000000,
    notes: '常見惡意 Popunder 跳窗網域'
  },
  {
    id: 'rule_adpopup_default',
    domain: '*.ad-popup.com',
    pattern: '*.ad-popup.com',
    matchMode: 'wildcard',
    action: 'close',
    enabled: true,
    createdAt: 1728100000000,
    updatedAt: 1728100000000,
    notes: '常見廣告彈窗網域'
  }
];

export const BlacklistModule = {
  // 記憶體狀態快取
  rules: [],
  config: { enabled: true, blockOpenerTabs: true },
  stats: { totalBlocked: 0, todayBlocked: 0 },

  // 篩選與搜尋狀態
  filters: {
    search: '',
    matchType: 'all',
    status: 'all'
  },

  // DOM 元素快取
  elements: {},

  /**
   * 初始化黑名單模組
   */
  async init() {
    this.cacheElements();
    this.bindEvents();
    await this.loadFromStorage();
    this.render();
  },

  /**
   * 快取常用 DOM 元素
   */
  cacheElements() {
    this.elements = {
      // 頂部開關
      globalInterceptorToggle: document.getElementById('globalInterceptorToggle'),

      // 統計指標
      statTotalRules: document.getElementById('statTotalRules'),
      statActiveRules: document.getElementById('statActiveRules'),
      statTotalBlocked: document.getElementById('statTotalBlocked'),
      statDefaultAction: document.getElementById('statDefaultAction'),
      sidebarBlacklistCount: document.getElementById('sidebarBlacklistCount'),

      // 搜尋與篩選
      searchInput: document.getElementById('searchInput'),
      searchClearBtn: document.getElementById('searchClearBtn'),
      filterMatchType: document.getElementById('filterMatchType'),
      filterStatus: document.getElementById('filterStatus'),

      // 操作按鈕
      btnExportJson: document.getElementById('btnExportJson'),
      btnImportJson: document.getElementById('btnImportJson'),
      btnOpenAddModal: document.getElementById('btnOpenAddModal'),
      btnEmptyAdd: document.getElementById('btnEmptyAdd'),

      // 表格與空狀態
      ruleTableBody: document.getElementById('ruleTableBody'),
      tableEmptyState: document.getElementById('tableEmptyState'),

      // 規則彈窗
      modalRule: document.getElementById('modalRule'),
      modalRuleTitle: document.getElementById('modalRuleTitle'),
      btnModalRuleClose: document.getElementById('btnModalRuleClose'),
      btnModalRuleCancel: document.getElementById('btnModalRuleCancel'),
      formRule: document.getElementById('formRule'),
      ruleId: document.getElementById('ruleId'),
      rulePattern: document.getElementById('rulePattern'),
      ruleMatchType: document.getElementById('ruleMatchType'),
      ruleAction: document.getElementById('ruleAction'),
      ruleNote: document.getElementById('ruleNote'),
      ruleEnabled: document.getElementById('ruleEnabled'),

      // 匯入彈窗
      modalImport: document.getElementById('modalImport'),
      btnModalImportClose: document.getElementById('btnModalImportClose'),
      btnModalImportCancel: document.getElementById('btnModalImportCancel'),
      importFileInput: document.getElementById('importFileInput'),
      importJsonText: document.getElementById('importJsonText'),
      btnModalImportSubmit: document.getElementById('btnModalImportSubmit')
    };
  },

  /**
   * 綁定使用者互動與事件監聽
   */
  bindEvents() {
    const el = this.elements;

    // 總開關連動
    if (el.globalInterceptorToggle) {
      el.globalInterceptorToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        this.config.enabled = enabled;
        await this.saveConfig();
        Toast.info(`攔截器已${enabled ? '啟用' : '停用'}`);
      });
    }

    // 搜尋與篩選
    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        this.filters.search = e.target.value.trim().toLowerCase();
        this.updateClearBtnVisibility();
        this.renderTable();
      });
    }

    if (el.searchClearBtn) {
      el.searchClearBtn.addEventListener('click', () => {
        if (el.searchInput) {
          el.searchInput.value = '';
          this.filters.search = '';
          this.updateClearBtnVisibility();
          this.renderTable();
          el.searchInput.focus();
        }
      });
    }

    if (el.filterMatchType) {
      el.filterMatchType.addEventListener('change', (e) => {
        this.filters.matchType = e.target.value;
        this.renderTable();
      });
    }

    if (el.filterStatus) {
      el.filterStatus.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.renderTable();
      });
    }

    // 新增彈窗
    if (el.btnOpenAddModal) {
      el.btnOpenAddModal.addEventListener('click', () => this.openRuleModal());
    }
    if (el.btnEmptyAdd) {
      el.btnEmptyAdd.addEventListener('click', () => this.openRuleModal());
    }
    if (el.btnModalRuleClose) {
      el.btnModalRuleClose.addEventListener('click', () => this.closeRuleModal());
    }
    if (el.btnModalRuleCancel) {
      el.btnModalRuleCancel.addEventListener('click', () => this.closeRuleModal());
    }

    // 規則表單提交 (新增/編輯)
    if (el.formRule) {
      el.formRule.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRuleSubmit();
      });
    }

    // 匯出 JSON
    if (el.btnExportJson) {
      el.btnExportJson.addEventListener('click', () => this.exportRulesJson());
    }

    // 匯入彈窗
    if (el.btnImportJson) {
      el.btnImportJson.addEventListener('click', () => this.openImportModal());
    }
    if (el.btnModalImportClose) {
      el.btnModalImportClose.addEventListener('click', () => this.closeImportModal());
    }
    if (el.btnModalImportCancel) {
      el.btnModalImportCancel.addEventListener('click', () => this.closeImportModal());
    }
    if (el.importFileInput) {
      el.importFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
    if (el.btnModalImportSubmit) {
      el.btnModalImportSubmit.addEventListener('click', () => this.handleImportSubmit());
    }

    // 彈窗背景點擊關閉
    [el.modalRule, el.modalImport].forEach((modal) => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // 表格內的委派事件 (切換啟用、編輯、刪除)
    if (el.ruleTableBody) {
      el.ruleTableBody.addEventListener('change', (e) => {
        const toggle = e.target.closest('.rule-toggle');
        if (toggle) {
          const ruleId = toggle.getAttribute('data-id');
          this.toggleRuleEnabled(ruleId, toggle.checked);
        }
      });

      el.ruleTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-rule-edit');
        if (editBtn) {
          const ruleId = editBtn.getAttribute('data-id');
          this.openRuleModal(ruleId);
          return;
        }

        const deleteBtn = e.target.closest('.btn-rule-delete');
        if (deleteBtn) {
          const ruleId = deleteBtn.getAttribute('data-id');
          this.deleteRule(ruleId);
        }
      });
    }

    // 監聽 Chrome Storage 外部變動，維持雙向即時同步
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        let needsRender = false;

        if (changes[STORAGE_KEYS.RULES]) {
          this.rules = Array.isArray(changes[STORAGE_KEYS.RULES].newValue)
            ? changes[STORAGE_KEYS.RULES].newValue
            : [];
          needsRender = true;
        }

        if (changes[STORAGE_KEYS.CONFIG]) {
          this.config = {
            ...this.config,
            ...(changes[STORAGE_KEYS.CONFIG].newValue || {})
          };
          if (el.globalInterceptorToggle) {
            el.globalInterceptorToggle.checked = Boolean(this.config.enabled);
          }
        }

        if (changes[STORAGE_KEYS.STATS]) {
          this.stats = {
            ...this.stats,
            ...(changes[STORAGE_KEYS.STATS].newValue || {})
          };
          this.renderMetrics();
        }

        if (needsRender) {
          this.render();
        }
      });
    }
  },

  /**
   * 自 chrome.storage.local 讀取黑名單設定與統計
   */
  async loadFromStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      // 離線預覽回退資料
      this.rules = [...FALLBACK_RULES];
      return;
    }

    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.RULES,
        STORAGE_KEYS.CONFIG,
        STORAGE_KEYS.STATS
      ]);

      // 載入規則
      if (Array.isArray(data[STORAGE_KEYS.RULES])) {
        this.rules = data[STORAGE_KEYS.RULES];
      } else {
        this.rules = [...FALLBACK_RULES];
        await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: this.rules });
      }

      // 載入設定
      if (data[STORAGE_KEYS.CONFIG]) {
        this.config = { ...this.config, ...data[STORAGE_KEYS.CONFIG] };
      }

      // 載入統計
      if (data[STORAGE_KEYS.STATS]) {
        this.stats = { ...this.stats, ...data[STORAGE_KEYS.STATS] };
      }

      // 同步總開關 UI
      if (this.elements.globalInterceptorToggle) {
        this.elements.globalInterceptorToggle.checked = Boolean(this.config.enabled);
      }
    } catch (err) {
      Toast.error('讀取設定失敗: ' + (err.message || err));
    }
  },

  /**
   * 保存規則列表至 Chrome Storage
   */
  async saveRules() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({
          [STORAGE_KEYS.RULES]: this.rules
        });
      } catch (err) {
        Toast.error('儲存規則失敗: ' + (err.message || err));
      }
    }
  },

  /**
   * 保存配置至 Chrome Storage
   */
  async saveConfig() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        await chrome.storage.local.set({
          [STORAGE_KEYS.CONFIG]: this.config
        });
      } catch (err) {
        Toast.error('儲存配置失敗: ' + (err.message || err));
      }
    }
  },

  /**
   * 刷新整體頁面視覺
   */
  render() {
    this.renderMetrics();
    this.renderTable();
  },

  /**
   * 更新數據指標卡片與徽章計數
   */
  renderMetrics() {
    const el = this.elements;
    const totalCount = this.rules.length;
    const activeCount = this.rules.filter((r) => r.enabled).length;

    if (el.statTotalRules) el.statTotalRules.textContent = totalCount;
    if (el.statActiveRules) el.statActiveRules.textContent = activeCount;
    if (el.sidebarBlacklistCount) el.sidebarBlacklistCount.textContent = totalCount;

    if (el.statTotalBlocked) {
      el.statTotalBlocked.textContent = this.stats.totalBlocked || 0;
    }

    if (el.statDefaultAction) {
      el.statDefaultAction.textContent = '關閉分頁';
    }
  },

  /**
   * 渲染規則表格與空狀態
   */
  renderTable() {
    const el = this.elements;
    if (!el.ruleTableBody) return;

    // 依篩選條件過濾
    const filteredRules = this.rules.filter((rule) => {
      const pattern = (rule.pattern || rule.domain || '').toLowerCase();
      const notes = (rule.notes || rule.note || '').toLowerCase();

      // 關鍵字比對
      if (this.filters.search) {
        const matchedText = pattern.includes(this.filters.search) || notes.includes(this.filters.search);
        if (!matchedText) return false;
      }

      // 比對模式比對
      if (this.filters.matchType !== 'all') {
        const mode = rule.matchMode || 'wildcard';
        if (mode !== this.filters.matchType) return false;
      }

      // 啟用狀態比對
      if (this.filters.status !== 'all') {
        const isEnabled = Boolean(rule.enabled);
        if (this.filters.status === 'enabled' && !isEnabled) return false;
        if (this.filters.status === 'disabled' && isEnabled) return false;
      }

      return true;
    });

    // 判斷是否為空狀態
    if (filteredRules.length === 0) {
      el.ruleTableBody.innerHTML = '';
      if (el.tableEmptyState) el.tableEmptyState.style.display = 'flex';
      return;
    }

    if (el.tableEmptyState) el.tableEmptyState.style.display = 'none';

    // 產生表格 HTML
    const htmlRows = filteredRules.map((rule) => {
      const isEnabled = Boolean(rule.enabled);
      const rowClass = isEnabled ? '' : 'class="row-disabled"';
      const patternText = this.escapeHtml(rule.pattern || rule.domain || '');
      const notesText = this.escapeHtml(rule.notes || rule.note || '-');
      const matchMode = rule.matchMode || 'wildcard';
      const action = rule.action || 'close';

      const matchModeLabels = {
        wildcard: '萬用字元',
        exact: '完整網域',
        regex: '正規表達式'
      };
      const matchLabel = matchModeLabels[matchMode] || matchMode;

      const actionClass = action === 'warn' ? 'action-warn' : 'action-close';
      const actionLabel = action === 'warn' ? '警告跳轉' : '直接關閉';

      const timeText = this.formatDate(rule.updatedAt || rule.createdAt);

      return `
        <tr ${rowClass} data-id="${this.escapeHtml(rule.id)}">
          <td style="text-align: center;">
            <label class="toggle-switch">
              <input type="checkbox" class="rule-toggle" data-id="${this.escapeHtml(rule.id)}" ${isEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </td>
          <td>
            <div class="rule-pattern-cell">
              <span class="pattern-text">${patternText}</span>
            </div>
          </td>
          <td>
            <span class="badge-tag ${matchMode}">${matchLabel}</span>
          </td>
          <td>
            <span class="badge-tag ${actionClass}">${actionLabel}</span>
          </td>
          <td>
            <span class="pattern-note">${notesText}</span>
          </td>
          <td>${timeText}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 4px;">
              <button type="button" class="btn-icon-only btn-rule-edit" data-id="${this.escapeHtml(rule.id)}" title="編輯此規則">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button type="button" class="btn-icon-only delete btn-rule-delete" data-id="${this.escapeHtml(rule.id)}" title="刪除此規則">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    el.ruleTableBody.innerHTML = htmlRows.join('');
  },

  /**
   * 控制清除搜尋按鈕顯示狀態
   */
  updateClearBtnVisibility() {
    const el = this.elements;
    if (el.searchClearBtn) {
      el.searchClearBtn.style.display = this.filters.search ? 'block' : 'none';
    }
  },

  /**
   * 開啟新增或編輯規則彈窗
   * @param {string} [ruleId] 若提供則為編輯模式
   */
  openRuleModal(ruleId = null) {
    const el = this.elements;
    if (!el.modalRule) return;

    if (ruleId) {
      // 編輯模式
      const rule = this.rules.find((r) => r.id === ruleId);
      if (!rule) return;

      if (el.modalRuleTitle) el.modalRuleTitle.textContent = '編輯黑名單規則';
      if (el.ruleId) el.ruleId.value = rule.id;
      if (el.rulePattern) el.rulePattern.value = rule.pattern || rule.domain || '';
      if (el.ruleMatchType) el.ruleMatchType.value = rule.matchMode || 'wildcard';
      if (el.ruleAction) el.ruleAction.value = rule.action || 'close';
      if (el.ruleNote) el.ruleNote.value = rule.notes || rule.note || '';
      if (el.ruleEnabled) el.ruleEnabled.checked = Boolean(rule.enabled);
    } else {
      // 新增模式
      if (el.modalRuleTitle) el.modalRuleTitle.textContent = '新增黑名單規則';
      if (el.ruleId) el.ruleId.value = '';
      if (el.rulePattern) el.rulePattern.value = '';
      if (el.ruleMatchType) el.ruleMatchType.value = 'wildcard';
      if (el.ruleAction) el.ruleAction.value = 'close';
      if (el.ruleNote) el.ruleNote.value = '';
      if (el.ruleEnabled) el.ruleEnabled.checked = true;
    }

    el.modalRule.classList.add('active');
    setTimeout(() => {
      if (el.rulePattern) el.rulePattern.focus();
    }, 50);
  },

  /**
   * 關閉規則彈窗
   */
  closeRuleModal() {
    const el = this.elements;
    if (el.modalRule) {
      el.modalRule.classList.remove('active');
    }
  },

  /**
   * 處理規則表單提交 (CRUD: Create / Update)
   */
  async handleRuleSubmit() {
    const el = this.elements;
    const ruleId = el.ruleId ? el.ruleId.value.trim() : '';
    const rawPattern = el.rulePattern ? el.rulePattern.value.trim() : '';
    const matchMode = el.ruleMatchType ? el.ruleMatchType.value : 'wildcard';
    const action = el.ruleAction ? el.ruleAction.value : 'close';
    const notes = el.ruleNote ? el.ruleNote.value.trim() : '';
    const enabled = el.ruleEnabled ? el.ruleEnabled.checked : true;

    if (!rawPattern) {
      Toast.error('請輸入網域或比對樣式');
      if (el.rulePattern) el.rulePattern.focus();
      return;
    }

    // 正規表達式合法性校驗
    if (matchMode === 'regex') {
      try {
        new RegExp(rawPattern);
      } catch (err) {
        Toast.error('正規表達式語法錯誤，請檢查');
        return;
      }
    }

    const now = Date.now();

    if (ruleId) {
      // 更新現有規則
      const index = this.rules.findIndex((r) => r.id === ruleId);
      if (index !== -1) {
        this.rules[index] = {
          ...this.rules[index],
          domain: rawPattern,
          pattern: rawPattern,
          matchMode,
          action,
          notes,
          enabled,
          updatedAt: now
        };
        Toast.success('規則更新成功');
      }
    } else {
      // 檢查重複樣式
      const isDuplicate = this.rules.some(
        (r) => (r.pattern || r.domain) === rawPattern && r.matchMode === matchMode
      );
      if (isDuplicate) {
        Toast.info('已存在相同樣式之規則，請確認');
      }

      // 新增規則
      const newRule = {
        id: `rule_${now}_${Math.random().toString(36).slice(2, 7)}`,
        domain: rawPattern,
        pattern: rawPattern,
        matchMode,
        action,
        notes,
        enabled,
        createdAt: now,
        updatedAt: now
      };
      this.rules.unshift(newRule);
      Toast.success('成功新增黑名單規則');
    }

    await this.saveRules();
    this.render();
    this.closeRuleModal();
  },

  /**
   * 切換單筆規則之啟用/停用狀態
   * @param {string} ruleId
   * @param {boolean} enabled
   */
  async toggleRuleEnabled(ruleId, enabled) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    rule.enabled = enabled;
    rule.updatedAt = Date.now();

    await this.saveRules();
    this.renderMetrics();

    // 更新行樣式而不重置整個表格焦點
    const row = this.elements.ruleTableBody.querySelector(`tr[data-id="${ruleId}"]`);
    if (row) {
      if (enabled) {
        row.classList.remove('row-disabled');
      } else {
        row.classList.add('row-disabled');
      }
    }
  },

  /**
   * 刪除單筆規則
   * @param {string} ruleId
   */
  async deleteRule(ruleId) {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const pattern = rule.pattern || rule.domain;
    if (!confirm(`確定要刪除黑名單規則「${pattern}」嗎？`)) {
      return;
    }

    this.rules = this.rules.filter((r) => r.id !== ruleId);
    await this.saveRules();
    this.render();
    Toast.success('規則已刪除');
  },

  /**
   * 匯出黑名單規則為 JSON 檔案
   */
  exportRulesJson() {
    if (this.rules.length === 0) {
      Toast.info('目前尚無黑名單規則可供匯出');
      return;
    }

    const exportData = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      plugin: 'browser-activity-monitor',
      rules: this.rules
    };

    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(jsonBlob);
    const downloadAnchor = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadAnchor.href = url;
    downloadAnchor.download = `activity_monitor_blacklist_rules_${dateStr}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 200);

    Toast.success(`已匯出 ${this.rules.length} 條黑名單規則`);
  },

  /**
   * 開啟匯入規則彈窗
   */
  openImportModal() {
    const el = this.elements;
    if (!el.modalImport) return;

    if (el.importFileInput) el.importFileInput.value = '';
    if (el.importJsonText) el.importJsonText.value = '';

    el.modalImport.classList.add('active');
  },

  /**
   * 關閉匯入規則彈窗
   */
  closeImportModal() {
    const el = this.elements;
    if (el.modalImport) {
      el.modalImport.classList.remove('active');
    }
  },

  /**
   * 讀取上傳之 JSON 檔案內容
   * @param {Event} e
   */
  handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (this.elements.importJsonText) {
        this.elements.importJsonText.value = event.target.result;
      }
    };
    reader.onerror = () => {
      Toast.error('讀取檔案失敗');
    };
    reader.readAsText(file);
  },

  /**
   * 執行規則匯入 (支援 Merge 與 Overwrite)
   */
  async handleImportSubmit() {
    const el = this.elements;
    const jsonStr = el.importJsonText ? el.importJsonText.value.trim() : '';

    if (!jsonStr) {
      Toast.error('請選擇檔案或貼上 JSON 格式內容');
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (err) {
      Toast.error('JSON 格式解析錯誤，請確認格式');
      return;
    }

    // 格式相容性處理：支援純 Array 或包含 rules 物件
    let importedList = [];
    if (Array.isArray(parsedData)) {
      importedList = parsedData;
    } else if (parsedData && Array.isArray(parsedData.rules)) {
      importedList = parsedData.rules;
    } else {
      Toast.error('無效的黑名單 JSON 結構');
      return;
    }

    if (importedList.length === 0) {
      Toast.info('匯入的規則清單為空');
      return;
    }

    // 取得匯入模式 (merge 或 overwrite)
    const selectedModeInput = document.querySelector('input[name="importMode"]:checked');
    const importMode = selectedModeInput ? selectedModeInput.value : 'merge';

    const now = Date.now();
    const normalizedNewRules = importedList
      .filter((item) => item && (item.pattern || item.domain))
      .map((item) => {
        const pattern = String(item.pattern || item.domain).trim();
        return {
          id: item.id || `rule_${now}_${Math.random().toString(36).slice(2, 7)}`,
          domain: pattern,
          pattern: pattern,
          matchMode: item.matchMode || 'wildcard',
          action: item.action || 'close',
          notes: item.notes || item.note || '',
          enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
          createdAt: item.createdAt || now,
          updatedAt: now
        };
      });

    if (normalizedNewRules.length === 0) {
      Toast.error('未發現有效之規則項目');
      return;
    }

    if (importMode === 'overwrite') {
      if (this.rules.length > 0) {
        if (!confirm(`確定要覆蓋現有的 ${this.rules.length} 條規則嗎？`)) {
          return;
        }
      }
      this.rules = normalizedNewRules;
    } else {
      // 合併模式 (Merge): 根據 pattern 與 matchMode 去重
      const existingMap = new Map();
      this.rules.forEach((r) => {
        const key = `${r.pattern || r.domain}::${r.matchMode || 'wildcard'}`;
        existingMap.set(key, r);
      });

      normalizedNewRules.forEach((newRule) => {
        const key = `${newRule.pattern}::${newRule.matchMode}`;
        if (existingMap.has(key)) {
          const oldRule = existingMap.get(key);
          // 保留原有 ID 與統計，更新屬性
          existingMap.set(key, {
            ...oldRule,
            ...newRule,
            id: oldRule.id,
            updatedAt: now
          });
        } else {
          existingMap.set(key, newRule);
        }
      });

      this.rules = Array.from(existingMap.values());
    }

    await this.saveRules();
    this.render();
    this.closeImportModal();
    Toast.success(`成功匯入 ${normalizedNewRules.length} 條規則 (${importMode === 'overwrite' ? '覆蓋' : '合併'})`);
  },

  /**
   * 安全跳脫 HTML 特殊字元 (防止 XSS)
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * 時間戳記格式化 (YYYY/MM/DD HH:mm)
   * @param {number|string} timestamp
   * @returns {string}
   */
  formatDate(timestamp) {
    if (!timestamp) return '-';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '-';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return '-';
    }
  }
};
