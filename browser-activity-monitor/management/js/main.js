/**
 * Browser Activity Monitor - Management Console 入口控制腳本
 */

import { BlacklistModule } from './blacklist.js';
import { DashboardModule } from './dashboard.js';

// 全域 Toast 通知系統
export const Toast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(16px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error', 4500); },
  info(message) { this.show(message, 'info'); }
};

/**
 * 切換工作區視圖面板
 * @param {string} tabKey - 'tab-dashboard' | 'tab-blacklist'
 */
export function switchView(tabKey) {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item:not(.disabled)');
  const viewPanels = document.querySelectorAll('.view-panel');

  // 更新導航項目高亮
  navItems.forEach(item => {
    if (item.dataset.tab === tabKey) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // 更新主要工作區顯示
  viewPanels.forEach(panel => {
    panel.classList.remove('active');
  });

  if (tabKey === 'tab-dashboard') {
    const dashPanel = document.getElementById('viewDashboard');
    if (dashPanel) {
      dashPanel.classList.add('active');
      DashboardModule.refresh();
    }
  } else if (tabKey === 'tab-blacklist') {
    const blPanel = document.getElementById('viewBlacklist');
    if (blPanel) blPanel.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 初始化總覽儀表板模組
  DashboardModule.init();

  // 初始化黑名單管理模組
  BlacklistModule.init();

  // 側邊選單切換
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item:not(.disabled)');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.dataset.tab;
      if (targetTab) {
        switchView(targetTab);
        window.location.hash = targetTab;
      }
    });
  });

  // 支援 URL Hash 初始跳轉 (例如 #tab-blacklist)
  if (window.location.hash) {
    const hashTab = window.location.hash.replace('#', '');
    if (hashTab === 'tab-blacklist' || hashTab === 'tab-dashboard') {
      switchView(hashTab);
    }
  }
});

