(function () {
  // 監聽來自 background script 或側邊欄的消息
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (message.type === 'ADD_FOCUS_OVERLAY') {
      addFocusOverlay();
    } else if (message.type === 'REMOVE_FOCUS_OVERLAY') {
      removeFocusOverlay();
    } else if (message.action === 'GET_CURRENT_TASKS') {
      const selectedText = window.getSelection()?.toString().trim() || '';
      sendResponse({
        title: document.title,
        selectedText: selectedText,
        url: window.location.href
      });
    }
  });

  // 添加專注覆蓋
  function addFocusOverlay() {
    if (document.getElementById('focus-overlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'focus-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    `;
    
    overlay.innerHTML = `
      <div>
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">🚀 正在衝刺中</h1>
        <p style="font-size: 1.2rem; margin-bottom: 1rem;">保持專注，完成你的核心戰役！</p>
        <p style="font-size: 1rem; opacity: 0.8;">衝刺結束後即可正常瀏覽</p>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  // 移除專注覆蓋
  function removeFocusOverlay() {
    const overlay = document.getElementById('focus-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
})();