/**
 * Browser Activity Monitor - IndexedDB 審計儲存層 (AuditStorageDB)
 * 提供純非同步、高可靠度之事件日誌批次儲存、查詢與過期清除能力。
 * 可於 Background Service Worker 與 Side Panel 模組中安全復用。
 */

const DB_NAME = 'BrowserActivityMonitorDB';
const DB_VERSION = 1;
const STORE_NAME = 'activity_logs';

export class AuditStorageDB {
  constructor() {
    this.db = null;
    this._initPromise = null;
  }

  /**
   * 初始化並開啟 IndexedDB 連線
   * @returns {Promise<IDBDatabase>}
   */
  async open() {
    if (this.db) return this.db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('tabId', 'tabId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
          this._initPromise = null;
        };
        resolve(this.db);
      };

      request.onerror = (event) => {
        this._initPromise = null;
        reject(event.target.error || new Error('開啟 IndexedDB 失敗'));
      };
    });

    return this._initPromise;
  }

  /**
   * 寫入單筆日誌
   * @param {Object} log 日誌資料
   * @returns {Promise<void>}
   */
  async insertLog(log) {
    if (!log || !log.id) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(log);

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 批次寫入日誌 (事務安全)
   * @param {Array<Object>} logs 日誌陣列
   * @returns {Promise<number>} 成功寫入筆數
   */
  async batchInsert(logs) {
    if (!Array.isArray(logs) || logs.length === 0) return 0;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let count = 0;

      for (const item of logs) {
        if (item && item.id) {
          store.put(item);
          count++;
        }
      }

      tx.oncomplete = () => resolve(count);
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error);
    });
  }

  /**
   * 查詢最近的日誌紀錄 (依時間由新至舊排序)
   * @param {number} limit 讀取上限筆數 (預設 100)
   * @param {string} [category] 選填分類篩選 ('network' | 'download' | 'probe')
   * @returns {Promise<Array<Object>>}
   */
  async getRecentLogs(limit = 100, category = null) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // 倒序游標
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) {
          resolve(results);
          return;
        }

        const value = cursor.value;
        if (!category || value.category === category) {
          results.push(value);
        }
        cursor.continue();
      };

      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 清除過期日誌 (預設清除超過指定天數的日誌)
   * @param {number} retentionDays 保存天數 (預設 3 天)
   * @returns {Promise<number>} 清除筆數
   */
  async purgeExpiredLogs(retentionDays = 3) {
    const db = await this.open();
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const keyRange = IDBKeyRange.upperBound(cutoffTime);
      const req = index.openCursor(keyRange);
      let purgedCount = 0;

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve(purgedCount);
          return;
        }
        cursor.delete();
        purgedCount++;
        cursor.continue();
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * 清空所有日誌儲存
   * @returns {Promise<void>}
   */
  async clearAllLogs() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }
}
