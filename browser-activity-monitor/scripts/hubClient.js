/**
 * hubClient.js - Browser Activity Monitor 跨插件通訊與握手模組
 * 負責透過 PING_HUB 向 ScrumClock (Power Kit) 進行零配置自動配對與能力探索
 */

export const DEFAULT_SCRUMCLOCK_ID = 'ahiihabnbjeoeneahcgbdcofncjoclcp';

/**
 * 發送 PING_HUB 探測 ScrumClock 在線狀態與 Capabilities
 * @param {string} [targetId] 可選指定 ID，預設使用靜態分配 ID
 * @returns {Promise<{ success: boolean, hub?: string, capabilities?: string[], error?: string }>}
 */
export async function pingHub(targetId = DEFAULT_SCRUMCLOCK_ID) {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { success: false, error: '非擴充功能環境' };
  }

  return new Promise((resolve) => {
    try {
      const timer = setTimeout(() => {
        resolve({ success: false, error: '連線逾時' });
      }, 3500);

      chrome.runtime.sendMessage(
        targetId,
        { type: 'PING_HUB', clientPlugin: 'ACTIVITY_MONITOR', version: '2.3' },
        (res) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          if (res && res.success) {
            resolve(res);
          } else {
            resolve({ success: false, error: res?.error || '中樞無回應' });
          }
        }
      );
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}
