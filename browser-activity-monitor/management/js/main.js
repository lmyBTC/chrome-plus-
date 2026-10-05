/**
 * Browser Activity Monitor - Management Console 入口控制腳本
 */

import { BlacklistModule } from './blacklist.js';

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

document.addEventListener('DOMContentLoaded', () => {
  // 初始化黑名單管理模組
  BlacklistModule.init();

  // 側邊選單切換 (預留未來模組分頁擴充)
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item:not(.disabled)');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });
});
