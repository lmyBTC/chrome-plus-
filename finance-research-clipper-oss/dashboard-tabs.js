/**
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
