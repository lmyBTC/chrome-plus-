// 當彈出視窗載入時執行
document.addEventListener('DOMContentLoaded', function() {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const customSpeedInput = document.getElementById('customSpeed');
  const setCustomSpeedBtn = document.getElementById('setCustomSpeed');
  const statusDiv = document.getElementById('status');
  
  // 循環控制元素
  const loopCountInput = document.getElementById('loopCount');
  const loopStartInput = document.getElementById('loopStart');
  const loopEndInput = document.getElementById('loopEnd');
  const btnSetStart = document.getElementById('btnSetStart');
  const btnSetEnd = document.getElementById('btnSetEnd');
  const btnStartLoop = document.getElementById('btnStartLoop');
  const btnStopLoop = document.getElementById('btnStopLoop');
  
  // 輔助函數：發送訊息到 content script (具備 runtime.lastError 防禦性檢測)
  function sendMessageToContent(message, callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.warn("YouTube Speed Plus: 無法與影片頁面建立連線 (Content script 尚未載入)", chrome.runtime.lastError.message);
            if (callback) callback(null);
            return;
          }
          if (callback) callback(response);
        });
      }
    });
  }
  
  // 為每個速度按鈕添加點擊事件
  speedButtons.forEach(button => {
    button.addEventListener('click', function() {
      const speed = parseFloat(this.dataset.speed);
      setVideoSpeed(speed);
      
      // 更新按鈕狀態
      speedButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      // 更新狀態顯示
      statusDiv.textContent = `目前速度: ${speed}x`;
    });
  });
  
  // 自訂速度設定
  setCustomSpeedBtn.addEventListener('click', function() {
    const customSpeed = parseFloat(customSpeedInput.value);
    if (customSpeed >= 0.1 && customSpeed <= 16) {
      setVideoSpeed(customSpeed);
      
      // 更新按鈕狀態
      speedButtons.forEach(btn => btn.classList.remove('active'));
      
      // 更新狀態顯示
      statusDiv.textContent = `目前速度: ${customSpeed}x`;
    } else {
      alert('請輸入 0.1 到 16 之間的速度值');
    }
  });
  
  // 設定影片速度的函數
  function setVideoSpeed(speed) {
    sendMessageToContent({
      action: 'setSpeed',
      speed: speed
    });
  }
  
  // 循環控制事件
  btnSetStart.addEventListener('click', function() {
    sendMessageToContent({ action: 'getCurrentTime' }, function(response) {
      if (response && response.currentTime !== undefined) {
        loopStartInput.value = Math.floor(response.currentTime);
      }
    });
  });

  btnSetEnd.addEventListener('click', function() {
    sendMessageToContent({ action: 'getCurrentTime' }, function(response) {
      if (response && response.currentTime !== undefined) {
        loopEndInput.value = Math.floor(response.currentTime);
      }
    });
  });

  btnStartLoop.addEventListener('click', function() {
    const loopCount = parseInt(loopCountInput.value) || 0;
    const loopStart = loopStartInput.value !== '' ? parseFloat(loopStartInput.value) : null;
    const loopEnd = loopEndInput.value !== '' ? parseFloat(loopEndInput.value) : null;
    
    if (loopStart !== null && loopEnd !== null && loopStart >= loopEnd) {
      alert('起點時間必須小於終點時間');
      return;
    }
    
    sendMessageToContent({
      action: 'startLoop',
      loopCount: loopCount,
      loopStart: loopStart,
      loopEnd: loopEnd
    }, function(response) {
      if (response && response.success) {
        btnStartLoop.classList.add('active');
        btnStopLoop.classList.remove('active');
      }
    });
  });

  btnStopLoop.addEventListener('click', function() {
    sendMessageToContent({ action: 'stopLoop' }, function(response) {
      if (response && response.success) {
        btnStartLoop.classList.remove('active');
        btnStopLoop.classList.add('active');
        setTimeout(() => btnStopLoop.classList.remove('active'), 1000);
      }
    });
  });
  
  // 檢查當前頁面是否為 YouTube
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0 && tabs[0].url) {
      const currentUrl = tabs[0].url;
      if (!currentUrl.includes('youtube.com')) {
        statusDiv.textContent = '請在 YouTube 頁面使用此擴充功能';
        speedButtons.forEach(btn => btn.disabled = true);
        setCustomSpeedBtn.disabled = true;
      } else {
        // 獲取當前影片速度
        sendMessageToContent({
          action: 'getCurrentSpeed'
        }, function(response) {
          if (response && response.speed) {
            statusDiv.textContent = `目前速度: ${response.speed}x`;
            
            // 高亮對應的按鈕
            speedButtons.forEach(btn => {
              if (parseFloat(btn.dataset.speed) === response.speed) {
                btn.classList.add('active');
              }
            });
          }
        });
        
        // 獲取當前循環狀態
        sendMessageToContent({
          action: 'getLoopStatus'
        }, function(response) {
          if (response && response.isLooping) {
            btnStartLoop.classList.add('active');
            if (response.loopCount !== null) loopCountInput.value = response.loopCount;
            if (response.loopStart !== null) loopStartInput.value = response.loopStart;
            if (response.loopEnd !== null) loopEndInput.value = response.loopEnd;
          }
        });
      }
    }
  });

  const DEFAULT_SCRUMCLOCK_ID = 'ahiihabnbjeoeneahcgbdcofncjoclcp';

  // 跨插件 ScrumClock 連線與設定快取支援 (PING_HUB / Discovery Bus)
  function pingScrumClock(extId, callback) {
    const targetId = (extId && extId.trim()) || DEFAULT_SCRUMCLOCK_ID;
    try {
      chrome.runtime.sendMessage(targetId, { type: 'PING_HUB', clientPlugin: 'VIDEO_SPEED_PLUS', version: '2.3' }, function(response) {
        if (chrome.runtime.lastError) {
          // 降級嘗試 legacy AI_PING
          chrome.runtime.sendMessage(targetId, { type: 'AI_PING' }, function(legacyRes) {
            if (chrome.runtime.lastError) {
              if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            if (callback) callback({ success: true, response: legacyRes });
          });
          return;
        }
        if (callback) callback({ success: true, response: response });
      });
    } catch (e) {
      if (callback) callback({ success: false, error: e.message });
    }
  }

  // ScrumClock 介面元素與事件綁定
  const btnCollectScrum = document.getElementById('btnCollectScrum');
  const scrumExtIdInput = document.getElementById('scrumExtIdInput');
  const btnSaveScrumId = document.getElementById('btnSaveScrumId');
  const btnTestScrumConn = document.getElementById('btnTestScrumConn');
  const scrumStatusMsg = document.getElementById('scrumStatusMsg');

  // 讀取已儲存的 Extension ID (預設為固定靜態 ID，零配置)
  chrome.storage.local.get('scrumclockExtensionId', function(res) {
    if (scrumExtIdInput) {
      scrumExtIdInput.value = (res && res.scrumclockExtensionId && res.scrumclockExtensionId.trim())
        ? res.scrumclockExtensionId.trim()
        : DEFAULT_SCRUMCLOCK_ID;
    }
  });

  // 儲存 Extension ID
  if (btnSaveScrumId && scrumExtIdInput && scrumStatusMsg) {
    btnSaveScrumId.addEventListener('click', function() {
      const id = scrumExtIdInput.value.trim() || DEFAULT_SCRUMCLOCK_ID;
      chrome.storage.local.set({ scrumclockExtensionId: id }, function() {
        scrumStatusMsg.textContent = '✅ Extension ID 已儲存 (預設自動握手)';
        setTimeout(() => { scrumStatusMsg.textContent = ''; }, 2500);
      });
    });
  }

  // 測試連線
  if (btnTestScrumConn && scrumExtIdInput && scrumStatusMsg) {
    btnTestScrumConn.addEventListener('click', function() {
      const id = scrumExtIdInput.value.trim() || DEFAULT_SCRUMCLOCK_ID;
      scrumStatusMsg.textContent = '⏳ 測試握手連線中 (PING_HUB)...';
      pingScrumClock(id, function(result) {
        if (result && result.success) {
          const caps = result.response?.capabilities ? `[${result.response.capabilities.join(', ')}]` : '';
          scrumStatusMsg.textContent = `✅ 連線成功！ScrumClock 在線 ${caps}`;
        } else {
          scrumStatusMsg.textContent = '❌ 連線失敗: ' + (result?.error || '無回應');
        }
        setTimeout(() => { scrumStatusMsg.textContent = ''; }, 4000);
      });
    });
  }

  // 一鍵收集當前字幕至 ScrumClock
  if (btnCollectScrum && scrumStatusMsg) {
    const updateScrumBtn = (text) => {
      btnCollectScrum.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      btnCollectScrum.appendChild(span);
    };

    btnCollectScrum.addEventListener('click', function() {
      const defaultText = '📥 收集當前字幕至 ScrumClock';
      updateScrumBtn('⏳ 正在收集...');
      btnCollectScrum.disabled = true;

      sendMessageToContent({ action: 'collectToScrumClock' }, function(response) {
        btnCollectScrum.disabled = false;
        if (response && response.success) {
          updateScrumBtn('✅ 收集成功！');
          scrumStatusMsg.textContent = '已傳送至 ScrumClock 收集箱';
        } else {
          updateScrumBtn('⚠️ 收集失敗');
          scrumStatusMsg.textContent = response?.error ? `錯誤: ${response.error}` : '請檢查 Extension ID 或影片頁面';
        }
        setTimeout(() => {
          updateScrumBtn(defaultText);
          scrumStatusMsg.textContent = '';
        }, 2500);
      });
    });
  }

  // ============================================================================
  // 法說會/標的筆記草稿箱 (Session Draft Box) 聚合邏輯
  // ============================================================================
  const draftTickerInput = document.getElementById('draftTickerInput');
  const btnSaveDraftTicker = document.getElementById('btnSaveDraftTicker');
  const btnBatchToScrumClock = document.getElementById('btnBatchToScrumClock');
  const btnToggleBookmarkInput = document.getElementById('btnToggleBookmarkInput');
  const bookmarkInputPanel = document.getElementById('bookmarkInputPanel');
  const popupCurrentTimeTag = document.getElementById('popupCurrentTimeTag');
  const popupBookmarkNote = document.getElementById('popupBookmarkNote');
  const btnSavePopupBookmark = document.getElementById('btnSavePopupBookmark');
  const btnCancelPopupBookmark = document.getElementById('btnCancelPopupBookmark');
  const btnExportMarkdown = document.getElementById('btnExportMarkdown');
  const btnDownloadMarkdown = document.getElementById('btnDownloadMarkdown');
  const btnClearBookmarks = document.getElementById('btnClearBookmarks');
  const bookmarkList = document.getElementById('bookmarkList');
  const bookmarkCount = document.getElementById('bookmarkCount');
  const bookmarkStatusMsg = document.getElementById('bookmarkStatusMsg');

  let activeVideoSec = 0;

  function showBookmarkStatus(msg, isError = false) {
    if (!bookmarkStatusMsg) return;
    bookmarkStatusMsg.textContent = msg;
    bookmarkStatusMsg.style.color = isError ? '#fca5a5' : '#a7f3d0';
    setTimeout(() => {
      bookmarkStatusMsg.textContent = '';
      bookmarkStatusMsg.style.color = 'rgba(255, 255, 255, 0.9)';
    }, 3200);
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const totalSec = Math.floor(seconds);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }

  function getVideoIdFromCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        try {
          const u = new URL(tabs[0].url);
          if (u.hostname.includes('youtube.com')) {
            callback(u.searchParams.get('v') || '');
            return;
          }
        } catch (_) {}
      }
      callback('');
    });
  }

  // 讀取當前標的代號
  function loadDraftTicker() {
    getVideoIdFromCurrentTab(function(videoId) {
      if (!videoId || !draftTickerInput) return;
      sendMessageToContent({ action: 'getDraftTicker', videoId: videoId }, function(res) {
        if (res && res.ticker) {
          draftTickerInput.value = res.ticker;
        } else {
          // 兜底從 storage 讀取
          chrome.storage.local.get(`vsp_ticker_${videoId}`, function(store) {
            if (store && store[`vsp_ticker_${videoId}`]) {
              draftTickerInput.value = store[`vsp_ticker_${videoId}`];
            }
          });
        }
      });
    });
  }

  // 儲存標的代號
  function saveDraftTicker() {
    if (!draftTickerInput) return;
    const ticker = draftTickerInput.value.trim().toUpperCase();
    getVideoIdFromCurrentTab(function(videoId) {
      if (!videoId) return;
      sendMessageToContent({ action: 'setDraftTicker', videoId: videoId, ticker: ticker }, function(res) {
        draftTickerInput.value = ticker;
        showBookmarkStatus(ticker ? `✅ 已鎖定研究標的：$${ticker}` : '已清除研究標的代號');
      });
    });
  }

  if (btnSaveDraftTicker) {
    btnSaveDraftTicker.addEventListener('click', saveDraftTicker);
  }
  if (draftTickerInput) {
    draftTickerInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveDraftTicker();
      }
    });
  }

  function loadBookmarks() {
    getVideoIdFromCurrentTab(function(videoId) {
      sendMessageToContent({ action: 'getBookmarks', videoId: videoId }, function(res) {
        if (!res || !res.bookmarks) {
          // 兜底直接從 storage 讀取
          chrome.storage.local.get('vsp_bookmarks', function(store) {
            const all = Array.isArray(store.vsp_bookmarks) ? store.vsp_bookmarks : [];
            const bms = videoId ? all.filter(b => b.videoId === videoId) : all;
            renderBookmarkList(bms);
          });
          return;
        }
        renderBookmarkList(res.bookmarks);
      });
    });
  }

  function renderBookmarkList(bookmarks) {
    if (!bookmarkList || !bookmarkCount) return;
    bookmarkCount.textContent = bookmarks.length;
    bookmarkList.textContent = '';

    if (bookmarks.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'bookmark-empty-msg';
      emptyDiv.textContent = '尚無記錄，點擊上方按鈕或按 Alt + B';
      bookmarkList.appendChild(emptyDiv);
      return;
    }

    bookmarks.forEach(bm => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';

      const left = document.createElement('div');
      left.className = 'bookmark-item-content';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'bookmark-time-badge';
      timeBadge.textContent = bm.timeFormatted;
      timeBadge.title = '點擊跳轉至此時間點';
      timeBadge.addEventListener('click', () => {
        sendMessageToContent({ action: 'seekToTime', timeSeconds: bm.timeSeconds });
        showBookmarkStatus(`已跳轉至 ${bm.timeFormatted}`);
      });

      const noteText = document.createElement('span');
      noteText.className = 'bookmark-note-text';
      noteText.textContent = bm.note;
      noteText.title = bm.note;

      left.append(timeBadge, noteText);

      const delBtn = document.createElement('button');
      delBtn.className = 'bookmark-del-btn';
      delBtn.textContent = '×';
      delBtn.title = '刪除此標記';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sendMessageToContent({ action: 'deleteBookmark', id: bm.id }, () => {
          loadBookmarks();
          showBookmarkStatus('已刪除時間標記');
        });
      });

      item.append(left, delBtn);
      bookmarkList.appendChild(item);
    });
  }

  // 開啟打點面板
  if (btnToggleBookmarkInput && bookmarkInputPanel) {
    btnToggleBookmarkInput.addEventListener('click', function() {
      const isVisible = bookmarkInputPanel.classList.contains('active');
      if (isVisible) {
        bookmarkInputPanel.classList.remove('active');
      } else {
        sendMessageToContent({ action: 'getCurrentTime' }, function(res) {
          activeVideoSec = res && typeof res.currentTime === 'number' ? res.currentTime : 0;
          if (popupCurrentTimeTag) {
            popupCurrentTimeTag.textContent = formatTime(activeVideoSec);
          }
          bookmarkInputPanel.classList.add('active');
          if (popupBookmarkNote) {
            popupBookmarkNote.value = '';
            popupBookmarkNote.focus();
          }
        });
      }
    });
  }

  // 取消打點
  if (btnCancelPopupBookmark && bookmarkInputPanel) {
    btnCancelPopupBookmark.addEventListener('click', function() {
      bookmarkInputPanel.classList.remove('active');
    });
  }

  // 儲存打點
  function savePopupBookmark() {
    const note = popupBookmarkNote ? popupBookmarkNote.value.trim() : '';
    sendMessageToContent({
      action: 'saveBookmark',
      note: note,
      timeSeconds: activeVideoSec
    }, function(res) {
      if (res && res.success) {
        if (bookmarkInputPanel) bookmarkInputPanel.classList.remove('active');
        if (popupBookmarkNote) popupBookmarkNote.value = '';
        loadBookmarks();
        showBookmarkStatus(`已儲存標記 [${formatTime(activeVideoSec)}]`);
      } else {
        showBookmarkStatus('⚠️ 儲存失敗: ' + (res?.error || '請確認影片頁面'), true);
      }
    });
  }

  if (btnSavePopupBookmark) {
    btnSavePopupBookmark.addEventListener('click', savePopupBookmark);
  }

  if (popupBookmarkNote) {
    popupBookmarkNote.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        savePopupBookmark();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (bookmarkInputPanel) bookmarkInputPanel.classList.remove('active');
      }
    });
  }

  // 一鍵整包打包拋送至 ScrumClock 任務卡 (Session Draft Box Aggregator)
  if (btnBatchToScrumClock) {
    const updateBatchBtn = (text) => {
      btnBatchToScrumClock.textContent = '';
      const span = document.createElement('span');
      span.textContent = text;
      btnBatchToScrumClock.appendChild(span);
    };

    btnBatchToScrumClock.addEventListener('click', function() {
      const defaultText = '📦 打包拋送 ScrumClock 任務卡 (聚合草稿)';
      updateBatchBtn('⏳ 正在整包打包匯出...');
      btnBatchToScrumClock.disabled = true;

      const ticker = draftTickerInput ? draftTickerInput.value.trim().toUpperCase() : '';

      sendMessageToContent({
        action: 'packageSessionToScrumClock',
        options: { ticker: ticker }
      }, function(response) {
        btnBatchToScrumClock.disabled = false;
        if (response && response.success) {
          updateBatchBtn('✅ 已成功建立任務卡！');
          showBookmarkStatus(`📦 已將 ${response.count} 條草稿打包建立 ScrumClock 任務卡！`);
        } else {
          updateBatchBtn('⚠️ 打包失敗');
          showBookmarkStatus(response?.error ? `錯誤: ${response.error}` : '請確認草稿箱是否有記錄或 ScrumClock 是否在線', true);
        }
        setTimeout(() => {
          updateBatchBtn(defaultText);
        }, 2800);
      });
    });
  }

  // 複製聚合 Markdown
  if (btnExportMarkdown) {
    btnExportMarkdown.addEventListener('click', function() {
      getVideoIdFromCurrentTab(function(videoId) {
        const ticker = draftTickerInput ? draftTickerInput.value.trim().toUpperCase() : '';
        sendMessageToContent({ action: 'exportMarkdown', videoId: videoId, ticker: ticker }, function(res) {
          if (res && res.markdown) {
            if (res.count === 0) {
              showBookmarkStatus('⚠️ 本影片草稿箱尚無打點記錄', true);
              return;
            }
            navigator.clipboard.writeText(res.markdown).then(() => {
              showBookmarkStatus(`📋 已複製 ${res.count} 條重點聚合 Markdown 至剪貼簿！`);
            }).catch(() => {
              showBookmarkStatus('⚠️ 剪貼簿存取失敗', true);
            });
          } else {
            showBookmarkStatus('⚠️ 無法導出筆記，請確認位於影片頁面', true);
          }
        });
      });
    });
  }

  // 下載 Markdown 檔案
  if (btnDownloadMarkdown) {
    btnDownloadMarkdown.addEventListener('click', function() {
      getVideoIdFromCurrentTab(function(videoId) {
        const ticker = draftTickerInput ? draftTickerInput.value.trim().toUpperCase() : '';
        sendMessageToContent({ action: 'exportMarkdown', videoId: videoId, ticker: ticker }, function(res) {
          if (res && res.markdown) {
            if (res.count === 0) {
              showBookmarkStatus('⚠️ 本影片草稿箱尚無打點記錄', true);
              return;
            }
            const blob = new Blob([res.markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const prefix = res.ticker ? `[${res.ticker}]_` : '';
            const safeTitle = (res.title || 'video_notes').replace(/[\/\\?%*:|"<>]/g, '_').slice(0, 40);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${prefix}${safeTitle}_notes.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showBookmarkStatus(`💾 已下載 ${res.count} 條重點聚合 MD 檔案`);
          } else {
            showBookmarkStatus('⚠️ 下載失敗，請確認位於影片頁面', true);
          }
        });
      });
    });
  }

  // 清空草稿箱
  if (btnClearBookmarks) {
    btnClearBookmarks.addEventListener('click', function() {
      getVideoIdFromCurrentTab(function(videoId) {
        if (!confirm('確定清空本場法說會草稿箱？(本片所有時間戳記重點)')) return;
        sendMessageToContent({ action: 'clearBookmarks', videoId: videoId }, function() {
          loadBookmarks();
          showBookmarkStatus('已清空本片草稿箱');
        });
      });
    });
  }

  // 初始載入標的代號與打點列表
  loadDraftTicker();
  loadBookmarks();

  // 暴露全域輔助以供後續 UI 綁定
  window.__videoSpeedPlus = {
    sendMessageToContent: sendMessageToContent,
    pingScrumClock: pingScrumClock,
    loadBookmarks: loadBookmarks,
    loadDraftTicker: loadDraftTicker
  };
}); 