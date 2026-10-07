/**
 * options.js - Finance Research Clipper 設定頁面邏輯
 */

document.addEventListener('DOMContentLoaded', () => {
  const gasUrlInput = document.getElementById('gas-url');
  const secretTokenInput = document.getElementById('secret-token');
  const sheetsUrlInput = document.getElementById('sheets-url');
  const autoAppendAiCheck = document.getElementById('auto-append-ai');
  const upsertByTickerCheck = document.getElementById('upsert-by-ticker');
  const btnSave = document.getElementById('btn-save');
  const btnPing = document.getElementById('btn-ping');
  const statusMessage = document.getElementById('status-message');

  function showStatus(text, type = 'info', duration = 4000) {
    statusMessage.textContent = text;
    statusMessage.className = `status-bar ${type}`;
    if (duration > 0) {
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, duration);
    }
  }

  // 1. 讀取現有儲存設定
  chrome.storage.local.get([
    'appsScriptUrl', 'gasUrl',
    'gasSecretToken',
    'userSpreadsheetUrl', 'sheetsUrl',
    'autoAppendAiDigest',
    'upsertByTicker'
  ], (res) => {
    gasUrlInput.value = res.gasUrl || res.appsScriptUrl || '';
    secretTokenInput.value = res.gasSecretToken || '';
    sheetsUrlInput.value = res.userSpreadsheetUrl || res.sheetsUrl || '';
    autoAppendAiCheck.checked = res.autoAppendAiDigest !== false;
    upsertByTickerCheck.checked = res.upsertByTicker !== false;
  });

  // 2. 儲存設定
  btnSave.addEventListener('click', () => {
    const rawGasUrl = gasUrlInput.value.trim();
    const rawSecretToken = secretTokenInput.value.trim();
    const rawSheetsUrl = sheetsUrlInput.value.trim();

    const toSave = {
      gasUrl: rawGasUrl,
      appsScriptUrl: rawGasUrl, // 雙鍵相容
      gasSecretToken: rawSecretToken,
      userSpreadsheetUrl: rawSheetsUrl,
      sheetsUrl: rawSheetsUrl,
      autoAppendAiDigest: autoAppendAiCheck.checked,
      upsertByTicker: upsertByTickerCheck.checked
    };

    chrome.storage.local.set(toSave, () => {
      showStatus('✅ 設定已成功保存至擴充功能本機空間！', 'success');
    });
  });

  // 3. 測試連線 (Health Check)
  btnPing.addEventListener('click', async () => {
    const gasUrl = gasUrlInput.value.trim();
    if (!gasUrl) {
      showStatus('⚠️ 請先填寫 Apps Script Web App URL 再執行測試', 'error');
      return;
    }

    btnPing.disabled = true;
    btnPing.innerHTML = '<span>⏳</span><span>連線中...</span>';
    showStatus('正在向 Google Apps Script 發送健康檢查請求...', 'info', 0);

    try {
      const pingUrl = gasUrl + (gasUrl.includes('?') ? '&' : '?') + 'action=PING';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const resp = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`伺服器回傳狀態碼 ${resp.status}`);
      }

      const data = await resp.json();
      if (data.status === 'ok' || data.service) {
        showStatus(`🎉 連線成功！服務端: ${data.service || 'GAS Webhook'} (版本: ${data.version || '1.0.0'})`, 'success', 6000);
      } else {
        showStatus(`⚠️ 服務端已回應但格式異常: ${JSON.stringify(data)}`, 'error', 6000);
      }
    } catch (err) {
      showStatus(`❌ 連線測試失敗: ${err.message}`, 'error', 6000);
    } finally {
      btnPing.disabled = false;
      btnPing.innerHTML = '<span>⚡</span><span>測試連線 (Health Check)</span>';
    }
  });
});
