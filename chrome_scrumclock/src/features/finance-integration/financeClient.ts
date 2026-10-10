import { storage } from '../../core/chrome/storage';
import { StockWatchItem, FinanceClipperResponse, FinanceSnapshotItem } from './types';

declare const chrome: any;

export const DEFAULT_FINANCE_CLIPPER_ID = 'imnnkgiglcbjknfbkdfocdhoookkipji';

const STORAGE_KEY_FC_ID = 'finance_clipper_ext_id';
const STORAGE_KEY_FC_SNAPSHOTS = 'scrumclock_finance_snapshots';
const STORAGE_KEY_RESEARCH_LOGS = 'scrumclock_finance_research_logs';

export const financeClient = {
  /**
   * 獲取配置的 FinanceClipper Extension ID
   */
  async getExtensionId(): Promise<string> {
    try {
      const userSettings = await storage.getUserSettings();
      if (userSettings?.financeClipperExtensionId) {
        return userSettings.financeClipperExtensionId;
      }
      const local = await chrome.storage?.local?.get([STORAGE_KEY_FC_ID]);
      return local?.[STORAGE_KEY_FC_ID] || DEFAULT_FINANCE_CLIPPER_ID;
    } catch {
      return DEFAULT_FINANCE_CLIPPER_ID;
    }
  },

  /**
   * 儲存 FinanceClipper Extension ID
   */
  async setExtensionId(id: string): Promise<void> {
    try {
      const trimmed = id.trim();
      const userSettings = await storage.getUserSettings();
      await storage.saveUserSettings({
        ...userSettings,
        financeClipperExtensionId: trimmed
      });
      await chrome.storage?.local?.set({ [STORAGE_KEY_FC_ID]: trimmed });
    } catch (e) {
      console.warn('儲存 FinanceClipper ID 失敗', e);
    }
  },

  /**
   * 測試跨插件連線
   */
  async ping(extId?: string): Promise<boolean> {
    const id = extId || (await this.getExtensionId());
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return false;

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'PING' }, (response: any) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch {
        resolve(false);
      }
    });
  },

  /**
   * 取得最新 WatchList 清單
   */
  async getWatchlist(): Promise<{ success: boolean; watchlist: StockWatchItem[]; error?: string }> {
    const id = await this.getExtensionId();
    if (!id) {
      return { success: false, watchlist: [], error: '尚未設定 FinanceClipper 擴充功能 ID' };
    }
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false, watchlist: [], error: '非 Chrome 擴充功能環境' };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'GET_WATCHLIST' }, (response: FinanceClipperResponse) => {
          if (chrome.runtime.lastError) {
            const rawMsg = chrome.runtime.lastError.message || '';
            const isInactive = rawMsg.includes('Receiving end does not exist') || rawMsg.includes('Could not establish connection');
            const isTimeout = rawMsg.toLowerCase().includes('timeout') || rawMsg.includes('逾時');
            resolve({
              success: false,
              watchlist: [],
              error: isInactive
                ? `擴充套件未啟動: 無法連線至 FinanceClipper (ID: ${id})，請確認插件已安裝啟用`
                : isTimeout
                ? '目標網址解析逾時，請確認網路連線'
                : `無法連線至 FinanceClipper: ${rawMsg}`
            });
            return;
          }
          if (response && response.success) {
            resolve({
              success: true,
              watchlist: response.watchlist || []
            });
          } else {
            const errMsg = response?.error || '';
            const isTimeout = errMsg.toLowerCase().includes('timeout') || errMsg.includes('逾時');
            resolve({
              success: false,
              watchlist: [],
              error: isTimeout ? '目標網址解析逾時，請稍後重試' : (errMsg || '取得清單失敗，FinanceClipper 回傳異常')
            });
          }
        });
      } catch (err: any) {
        resolve({ success: false, watchlist: [], error: `通訊例外: ${err?.message || '無法連線至 FinanceClipper'}` });
      }
    });
  },

  /**
   * 打開 FinanceClipper 獨立大螢幕儀表板
   */
  async openDashboard(ticker?: string): Promise<boolean> {
    const id = await this.getExtensionId();
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'OPEN_DASHBOARD', ticker }, (response: any) => {
          if (chrome.runtime.lastError || !response?.success) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch {
        resolve(false);
      }
    });
  },

  /**
   * 請求 FinanceClipper 在背景爬取指定股票
   */
  async crawlStock(ticker: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const id = await this.getExtensionId();
    if (!id || typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false, error: '未連接 FinanceClipper: 擴充套件未啟動或未安裝' };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(id, { type: 'CRAWL_STOCK', ticker }, (res: any) => {
          if (chrome.runtime.lastError) {
            const rawMsg = chrome.runtime.lastError.message || '';
            const isInactive = rawMsg.includes('Receiving end does not exist') || rawMsg.includes('Could not establish connection');
            const isTimeout = rawMsg.toLowerCase().includes('timeout') || rawMsg.includes('逾時');
            resolve({
              success: false,
              error: isInactive
                ? `擴充套件未啟動: 無法連線至 FinanceClipper (ID: ${id})，請確認插件已安裝啟用`
                : isTimeout
                ? '目標網址解析逾時，請確認網路連線'
                : `連線至 FinanceClipper 失敗: ${rawMsg}`
            });
          } else {
            if (res && res.success) {
              resolve(res);
            } else {
              const errMsg = res?.error || '';
              const isTimeout = errMsg.toLowerCase().includes('timeout') || errMsg.includes('逾時');
              resolve({
                success: false,
                error: isTimeout ? '目標網址解析逾時，請檢查網路或稍後重試' : (errMsg || 'FinanceClipper 未回傳採集結果')
              });
            }
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: `通訊例外: ${err?.message || '未知錯誤'}` });
      }
    });
  },

  /**
   * 取得本地儲存的投研快照清單
   */
  async getSnapshots(): Promise<FinanceSnapshotItem[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
      const data = await chrome.storage.local.get([STORAGE_KEY_FC_SNAPSHOTS]);
      return Array.isArray(data?.[STORAGE_KEY_FC_SNAPSHOTS]) ? data[STORAGE_KEY_FC_SNAPSHOTS] : [];
    } catch {
      return [];
    }
  },

  /**
   * 儲存投研快照清單
   */
  async saveSnapshots(snapshots: FinanceSnapshotItem[]): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY_FC_SNAPSHOTS]: snapshots });
      }
    } catch (e) {
      console.warn('儲存投研快照失敗:', e);
    }
  },

  /**
   * 新增或更新單筆快照
   */
  async saveSnapshot(snapshot: FinanceSnapshotItem): Promise<FinanceSnapshotItem[]> {
    const list = await this.getSnapshots();
    const index = list.findIndex(s => s.ticker.toUpperCase() === snapshot.ticker.toUpperCase());
    if (index > -1) {
      list[index] = { ...list[index], ...snapshot, checklist: snapshot.checklist || list[index].checklist };
    } else {
      list.unshift(snapshot);
    }
    await this.saveSnapshots(list);
    return list;
  },

  /**
   * 取得投研專注衝刺歷史記錄
   */
  async getResearchLogs(): Promise<any[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
      const data = await chrome.storage.local.get([STORAGE_KEY_RESEARCH_LOGS]);
      return Array.isArray(data?.[STORAGE_KEY_RESEARCH_LOGS]) ? data[STORAGE_KEY_RESEARCH_LOGS] : [];
    } catch {
      return [];
    }
  },

  /**
   * 新增一筆投研專注衝刺記錄
   */
  async saveResearchLog(log: any): Promise<void> {
    try {
      const logs = await this.getResearchLogs();
      logs.unshift(log);
      if (logs.length > 50) logs.pop();
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEY_RESEARCH_LOGS]: logs });
      }
    } catch (e) {
      console.warn('儲存投研紀錄失敗:', e);
    }
  },

  /**
   * 防腐模式解析匯入的 Clipper 快照 JSON
   */
  parseSnapshotJson(rawJson: string): { success: boolean; items: FinanceSnapshotItem[]; error?: string } {
    try {
      if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
        return { success: false, items: [], error: 'JSON 字串不可為空' };
      }

      const parsed = JSON.parse(rawJson);
      let rawList: any[] = [];

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items)) rawList = parsed.items;
        else if (Array.isArray(parsed.snapshots)) rawList = parsed.snapshots;
        else if (Array.isArray(parsed.watchlist)) rawList = parsed.watchlist;
        else if (parsed.ticker) rawList = [parsed];
        else {
          return { success: false, items: [], error: '無法識別快照結構，未找到包含股票代碼 (ticker) 的資料' };
        }
      }

      const defaultChecklist = [
        { id: 'c1', text: '檢視最新一季財報營收與 EPS 表現', done: false },
        { id: 'c2', text: '驗證華爾街共識目標價與分析師觀點', done: false },
        { id: 'c3', text: '評估競爭優勢 (Moat) 與潛在下行風險', done: false },
        { id: 'c4', text: '撰寫投研核心總結與操作策略', done: false }
      ];

      const cleanItems: FinanceSnapshotItem[] = [];

      for (const item of rawList) {
        if (!item || typeof item !== 'object') continue;
        const rawTicker = typeof item.ticker === 'string' ? item.ticker.trim().toUpperCase() : '';
        if (!rawTicker) continue;

        const priceStr = item.price !== undefined && item.price !== null ? String(item.price).trim() : '';
        const numPrice = parseFloat(priceStr.replace(/[^0-9.-]/g, ''));

        // 提取 analyst
        const analystObj = item.analyst && typeof item.analyst === 'object' ? item.analyst : {};
        const consensus = typeof analystObj.consensus === 'string' ? analystObj.consensus : undefined;
        const targetMedian = analystObj.targetMedian !== undefined ? analystObj.targetMedian : undefined;
        const targetMean = analystObj.targetMean !== undefined ? analystObj.targetMean : undefined;

        // 計算偏離程度 / 上漲空間 (Upside %)
        let upsidePercent: number | undefined = undefined;
        let medianVal: number | undefined = undefined;
        let meanVal: number | undefined = undefined;

        if (item.targetStats && typeof item.targetStats === 'object') {
          if (typeof item.targetStats.upsidePercent === 'number') {
            upsidePercent = item.targetStats.upsidePercent;
          }
          if (typeof item.targetStats.median === 'number') medianVal = item.targetStats.median;
          if (typeof item.targetStats.mean === 'number') meanVal = item.targetStats.mean;
        }

        // 若快照無預算好的 targetStats，則由現價與目標價防禦性計算
        const rawTargetNum = parseFloat(String(targetMedian || targetMean || '').replace(/[^0-9.-]/g, ''));
        if (upsidePercent === undefined && !isNaN(numPrice) && numPrice > 0 && !isNaN(rawTargetNum) && rawTargetNum > 0) {
          upsidePercent = Math.round(((rawTargetNum - numPrice) / numPrice) * 10000) / 100;
        }

        if (medianVal === undefined && !isNaN(rawTargetNum)) {
          medianVal = rawTargetNum;
        }

        cleanItems.push({
          id: item.id || `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ticker: rawTicker.slice(0, 20),
          name: typeof item.name === 'string' ? item.name.slice(0, 100) : rawTicker,
          price: priceStr || (isNaN(numPrice) ? '--' : `$${numPrice}`),
          change: typeof item.change === 'string' ? item.change : '',
          changePercent: typeof item.changePercent === 'string' ? item.changePercent : '',
          currency: typeof item.currency === 'string' ? item.currency : 'USD',
          analyst: {
            consensus: consensus,
            targetLow: analystObj.targetLow,
            targetMedian: targetMedian,
            targetHigh: analystObj.targetHigh
          },
          targetStats: {
            median: medianVal,
            mean: meanVal,
            upsidePercent: upsidePercent,
            cv: item.targetStats?.cv,
            stdDev: item.targetStats?.stdDev
          },
          earnings: item.earnings && typeof item.earnings === 'object' ? item.earnings : undefined,
          stats: item.stats && typeof item.stats === 'object' ? item.stats : undefined,
          note: typeof item.note === 'string' ? item.note : undefined,
          url: typeof item.url === 'string' ? item.url : undefined,
          updatedAt: item.updatedAt || new Date().toLocaleString(),
          checklist: Array.isArray(item.checklist) && item.checklist.length > 0 ? item.checklist : defaultChecklist
        });
      }

      if (cleanItems.length === 0) {
        return { success: false, items: [], error: '未能成功解析任何有效的標的資料' };
      }

      return { success: true, items: cleanItems };
    } catch (err: any) {
      return { success: false, items: [], error: `JSON 解析語法錯誤: ${err?.message || '請確認格式'}` };
    }
  }
};

