/**
 * dashboard-tabs-render.js - Finance Research Clipper 族群與分頁標籤渲染模組
 * 負責底部族群分頁 (Category Tabs)、自訂主題標籤 (Topic Tags) 及向後相容的分頁列 DOM 構建
 */

(function () {
  'use strict';

  const TabsRender = {
    /**
     * 渲染底部族群分類 Tab 列
     */
    renderCategoryTabs: function (categories, activeCategoryId, historyList, container, countEl, callbacks) {
      if (!container) return;
      container.textContent = '';
      const { onSelectCategory, onEditCategory, onDeleteCategory } = callbacks || {};

      if (!categories || categories.length === 0) {
        if (countEl) countEl.textContent = '0 個族群';
        return;
      }

      const totalStocks = historyList ? historyList.length : 0;
      if (countEl) {
        countEl.textContent = `${categories.length} 個族群 / 共 ${totalStocks} 檔`;
      }

      categories.forEach((cat) => {
        const tab = document.createElement('div');
        const isActive = cat.id === activeCategoryId;
        tab.className = `sheet-tab category-tab ${isActive ? 'active' : ''}`;
        tab.dataset.categoryId = cat.id;

        // 計算該族群下的標的數量
        let count = 0;
        if (historyList) {
          if (cat.id === 'all') {
            count = historyList.length;
          } else {
            count = historyList.filter((item) => {
              const catId = item.categoryId || 'core';
              return catId === cat.id;
            }).length;
          }
        }

        const icon = document.createElement('span');
        icon.className = 'sheet-tab-icon';
        icon.textContent = cat.id === 'all' ? '📊' : '📁';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'sheet-tab-name';
        nameSpan.textContent = cat.name;

        const countBadge = document.createElement('span');
        countBadge.className = 'sheet-tab-badge';
        countBadge.textContent = String(count);

        tab.appendChild(icon);
        tab.appendChild(nameSpan);
        tab.appendChild(countBadge);

        // 非系統族群支援更名與刪除
        if (!cat.isSystem) {
          const editBtn = document.createElement('span');
          editBtn.className = 'sheet-tab-edit-btn';
          editBtn.title = `重新命名「${cat.name}」`;
          editBtn.textContent = '✎';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startRename(cat, nameSpan);
          });
          tab.appendChild(editBtn);

          nameSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startRename(cat, nameSpan);
          });

          const closeBtn = document.createElement('span');
          closeBtn.className = 'sheet-tab-close';
          closeBtn.title = `刪除「${cat.name}」族群`;
          closeBtn.textContent = '✕';
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof onDeleteCategory === 'function') {
              onDeleteCategory(cat.id, cat.name);
            }
          });
          tab.appendChild(closeBtn);
        }

        tab.addEventListener('click', () => {
          if (typeof onSelectCategory === 'function') {
            onSelectCategory(cat.id);
          }
        });

        container.appendChild(tab);
      });

      function startRename(cat, nameSpan) {
        const originalName = cat.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sheet-tab-inline-input';
        input.value = originalName;
        nameSpan.replaceWith(input);
        input.focus();
        input.select();

        let finished = false;
        const finish = (save) => {
          if (finished) return;
          finished = true;
          const newName = input.value.trim();
          if (save && newName && newName !== originalName) {
            if (typeof onEditCategory === 'function') {
              onEditCategory(cat.id, newName);
            }
          } else {
            input.replaceWith(nameSpan);
          }
        };

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') finish(false);
        });
        input.addEventListener('blur', () => finish(true));
      }
    },

    /**
     * 渲染頂部主題式分類標籤 (Topic Tags)
     * @param {Array<string>} tags 標籤字串清單
     * @param {HTMLElement} container 標籤掛載容器
     * @param {Object} callbacks { onSelectTag: (tag) => void, onRemoveTag: (tag) => void }
     */
    renderTopicTags: function (tags, container, callbacks) {
      if (!container) return;
      container.innerHTML = '';
      const { onSelectTag, onRemoveTag } = callbacks || {};

      (tags || []).forEach((tag) => {
        const pill = document.createElement('div');
        pill.className = 'topic-tag-pill';
        pill.title = `點擊採集或篩選：${tag}`;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'topic-tag-name';
        nameSpan.textContent = tag;

        const removeBtn = document.createElement('span');
        removeBtn.className = 'topic-tag-remove';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = `刪除標籤「${tag}」`;

        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof onRemoveTag === 'function') {
            onRemoveTag(tag);
          }
        });

        pill.addEventListener('click', () => {
          if (typeof onSelectTag === 'function') {
            onSelectTag(tag);
          }
        });

        pill.appendChild(nameSpan);
        pill.appendChild(removeBtn);
        container.appendChild(pill);
      });
    },

    /**
     * 相容性轉發：舊版 renderSheetTabs 調用自動轉向
     */
    renderSheetTabs: function (historyList, currentStock, container, countEl, onSelect, onClose) {
      // 保持向下相容性轉向，若外部仍傳入舊參數則渲染一般 tab
      if (this.renderCategoryTabs) {
        const dummyCats = [
          { id: 'all', name: '全部標的', isSystem: true }
        ];
        this.renderCategoryTabs(dummyCats, 'all', historyList, container, countEl, {
          onSelectCategory: () => {}
        });
      }
    }
  };

  // 擴充至 DashboardRender 命名空間
  if (!window.DashboardRender) {
    window.DashboardRender = {};
  }
  Object.assign(window.DashboardRender, TabsRender);
})();
