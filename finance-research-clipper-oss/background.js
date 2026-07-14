/**
 * Chrome Extension V3: background.js
 * 負責註冊右鍵選單 (Context Menu) 並處理反白文字的暫存。
 */

// 當擴充功能安裝或更新時，建立右鍵選單
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "clip-to-note",
    title: "擷取至投資筆記",
    contexts: ["selection"]
  });
});

// 監聽右鍵選單點擊事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "clip-to-note" && info.selectionText) {
    // 讀取既有暫存文字 (如果有的話)，並將新的選取文字附加在後面
    chrome.storage.local.get(['contextNote'], (result) => {
      const existing = result.contextNote || "";
      const newNote = existing ? `${existing}\n\n${info.selectionText}` : info.selectionText;
      
      chrome.storage.local.set({ contextNote: newNote }, () => {
        console.log("文字已成功暫存至 storage", newNote);
        // 可選：可以嘗試打開 popup，但 MV3 中 service worker 無法主動打開 popup，
        // 需依賴使用者自己點擊圖示，所以這一步只需儲存即可。
      });
    });
  }
});
