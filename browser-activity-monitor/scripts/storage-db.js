/**
 * Browser Activity Monitor - IndexedDB 審計儲存層 (AuditStorageDB)
 * 提供純非同步、高可靠度之事件日誌批次儲存、查詢與過期清除能力。
 * 可於 Background Service Worker 與 Side Panel 模組中安全復用。
 */

import { profiler } from './resource-profiler.js';
import { aggregateCategoryMetrics, formatDuration } from './domain-classifier.js';

const DB_NAME = 'BrowserActivityMonitorDB';
const DB_VERSION = 3;
const STORE_NAME = 'activity_logs';
const REPORT_STORE_NAME = 'health_reports';
const TIME_STORE_NAME = 'time_spent_logs';

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
        if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) {
          const reportStore = db.createObjectStore(REPORT_STORE_NAME, { keyPath: 'id' });
          reportStore.createIndex('timestamp', 'timestamp', { unique: false });
          reportStore.createIndex('mode', 'mode', { unique: false });
        }
        if (!db.objectStoreNames.contains(TIME_STORE_NAME)) {
          const timeStore = db.createObjectStore(TIME_STORE_NAME, { keyPath: 'id' });
          timeStore.createIndex('timestamp', 'timestamp', { unique: false });
          timeStore.createIndex('domain', 'domain', { unique: false });
          timeStore.createIndex('category', 'category', { unique: false });
          timeStore.createIndex('dateStr', 'dateStr', { unique: false });
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
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(log);

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 寫入', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 寫入 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 批次寫入日誌 (事務安全)
   * @param {Array<Object>} logs 日誌陣列
   * @returns {Promise<number>} 成功寫入筆數
   */
  async batchInsert(logs) {
    if (!Array.isArray(logs) || logs.length === 0) return 0;
    const startTime = performance.now();
    profiler.recordQueue('db_batch_queue', logs.length);
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

      tx.oncomplete = () => {
        profiler.recordDuration('IndexedDB 批次寫入', performance.now() - startTime);
        profiler.recordQueue('db_batch_queue', 0);
        resolve(count);
      };
      tx.onerror = (e) => {
        profiler.recordDuration('IndexedDB 批次寫入 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
      tx.onabort = (e) => {
        profiler.recordDuration('IndexedDB 批次寫入 (中止)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 查詢最近的日誌紀錄 (依時間由新至舊排序)
   * @param {number} limit 讀取上限筆數 (預設 100)
   * @param {string} [category] 選填分類篩選 ('network' | 'download' | 'probe')
   * @returns {Promise<Array<Object>>}
   */
  async getRecentLogs(limit = 100, category = null) {
    const startTime = performance.now();
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
          profiler.recordDuration('IndexedDB 查詢', performance.now() - startTime);
          resolve(results);
          return;
        }

        const value = cursor.value;
        if (!category || value.category === category) {
          results.push(value);
        }
        cursor.continue();
      };

      request.onerror = (e) => {
        profiler.recordDuration('IndexedDB 查詢 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清除過期日誌 (預設清除超過指定天數的日誌)
   * @param {number} retentionDays 保存天數 (預設 3 天)
   * @returns {Promise<number>} 清除筆數
   */
  async purgeExpiredLogs(retentionDays = 3) {
    const startTime = performance.now();
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
          profiler.recordDuration('IndexedDB 清理過期', performance.now() - startTime);
          resolve(purgedCount);
          return;
        }
        cursor.delete();
        purgedCount++;
        cursor.continue();
      };

      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 清理過期 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清空所有日誌儲存
   * @returns {Promise<void>}
   */
  async clearAllLogs() {
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 清空全部', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 清空全部 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 寫入單筆階段健康檢測報告
   * @param {Object} report 檢測報告資料
   * @returns {Promise<void>}
   */
  async insertReport(report) {
    if (!report || !report.id) return;
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
      const store = tx.objectStore(REPORT_STORE_NAME);
      const req = store.put(report);

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 報告寫入', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 報告寫入 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 查詢最近的健康檢測報告 (依時間由新至舊排序)
   * @param {number} limit 讀取上限筆數 (預設 20)
   * @returns {Promise<Array<Object>>}
   */
  async getRecentReports(limit = 20) {
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readonly');
      const store = tx.objectStore(REPORT_STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // 倒序游標
      const results = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) {
          profiler.recordDuration('IndexedDB 報告查詢', performance.now() - startTime);
          resolve(results);
          return;
        }

        results.push(cursor.value);
        cursor.continue();
      };

      request.onerror = (e) => {
        profiler.recordDuration('IndexedDB 報告查詢 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清空所有健康檢測報告
   * @returns {Promise<void>}
   */
  async clearAllReports() {
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
      const store = tx.objectStore(REPORT_STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 報告清空全部', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 報告清空全部 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清除過期健康檢測報告 (預設保留 7 天)
   * @param {number} retentionDays 保存天數 (預設 7 天)
   * @returns {Promise<number>} 清除筆數
   */
  async purgeExpiredReports(retentionDays = 7) {
    const startTime = performance.now();
    const db = await this.open();
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([REPORT_STORE_NAME], 'readwrite');
      const store = tx.objectStore(REPORT_STORE_NAME);
      const index = store.index('timestamp');
      const keyRange = IDBKeyRange.upperBound(cutoffTime);
      const req = index.openCursor(keyRange);
      let purgedCount = 0;

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          profiler.recordDuration('IndexedDB 報告清理過期', performance.now() - startTime);
          resolve(purgedCount);
          return;
        }
        cursor.delete();
        purgedCount++;
        cursor.continue();
      };

      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 報告清理過期 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 寫入單筆停留時長記錄 (AM-01)
   * @param {Object} log 停留時長記錄
   * @returns {Promise<void>}
   */
  async insertTimeLog(log) {
    if (!log || !log.id) return;
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readwrite');
      const store = tx.objectStore(TIME_STORE_NAME);
      const req = store.put(log);

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 停留時長寫入', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長寫入 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 批次寫入停留時長記錄 (AM-01)
   * @param {Array<Object>} logs 停留時長記錄陣列
   * @returns {Promise<number>}
   */
  async batchInsertTimeLogs(logs) {
    if (!Array.isArray(logs) || logs.length === 0) return 0;
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readwrite');
      const store = tx.objectStore(TIME_STORE_NAME);
      let count = 0;

      for (const item of logs) {
        if (item && item.id) {
          store.put(item);
          count++;
        }
      }

      tx.oncomplete = () => {
        profiler.recordDuration('IndexedDB 停留時長批次寫入', performance.now() - startTime);
        resolve(count);
      };
      tx.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長批次寫入 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 查詢指定時間範圍內的停留時長記錄
   * @param {number} startTime 起始時間戳 (ms)
   * @param {number} endTime 結束時間戳 (ms)
   * @param {number} limit 最大筆數
   * @returns {Promise<Array<Object>>}
   */
  async getTimeLogsByRange(startTime, endTime = Date.now(), limit = 500) {
    const perfStart = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readonly');
      const store = tx.objectStore(TIME_STORE_NAME);
      const index = store.index('timestamp');
      const keyRange = IDBKeyRange.bound(startTime, endTime);
      const req = index.openCursor(keyRange, 'prev');
      const results = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) {
          profiler.recordDuration('IndexedDB 停留時長範圍查詢', performance.now() - perfStart);
          resolve(results);
          return;
        }
        results.push(cursor.value);
        cursor.continue();
      };

      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長範圍查詢 (失敗)', performance.now() - perfStart);
        reject(e.target.error);
      };
    });
  }

  /**
   * 聚合統計指定時間範圍內的停留時長與網域排行 (AM-01 & AM-02)
   * @param {number} [startTime] 起始時間戳 (預設為今日 00:00:00)
   * @param {number} [endTime] 結束時間戳 (預設為當前時間)
   * @returns {Promise<Object>} 聚合統計報告
   */
  async getTimeStatsByRange(startTime, endTime = Date.now()) {
    if (!startTime) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startTime = today.getTime();
    }

    const perfStart = performance.now();
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readonly');
      const store = tx.objectStore(TIME_STORE_NAME);
      const index = store.index('timestamp');
      const keyRange = IDBKeyRange.bound(startTime, endTime);
      const req = index.openCursor(keyRange);

      let totalDurationSec = 0;
      const categories = {
        productivity: 0,
        communication: 0,
        leisure: 0,
        static: 0,
        other: 0
      };
      const domainMap = new Map();
      const recentLogs = [];

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          // 整理 Top 網域列表 (依時長倒序)
          const topDomains = Array.from(domainMap.values())
            .map(d => ({
              ...d,
              formattedDuration: formatDuration(d.durationSec)
            }))
            .sort((a, b) => b.durationSec - a.durationSec);

          const metrics = aggregateCategoryMetrics(categories, totalDurationSec);

          profiler.recordDuration('IndexedDB 停留時長統計聚合', performance.now() - perfStart);
          resolve({
            startTime,
            endTime,
            totalDurationSec,
            formattedTotalDuration: formatDuration(totalDurationSec),
            categories,
            metrics,
            topDomains,
            recentLogs: recentLogs.slice(-50).reverse() // 取最新 50 筆倒序
          });
          return;
        }

        const item = cursor.value;
        const dur = Number(item.durationSec) || 0;
        totalDurationSec += dur;

        // 累計類別
        const cat = item.category || 'other';
        if (categories[cat] !== undefined) {
          categories[cat] += dur;
        } else {
          categories.other = (categories.other || 0) + dur;
        }

        // 累計網域
        const dom = item.domain || 'unknown';
        let domRecord = domainMap.get(dom);
        if (!domRecord) {
          domRecord = {
            domain: dom,
            durationSec: 0,
            visitCount: 0,
            category: item.category || 'other',
            title: item.title || dom,
            favIconUrl: item.favIconUrl || ''
          };
          domainMap.set(dom, domRecord);
        }
        domRecord.durationSec += dur;
        domRecord.visitCount += 1;
        if (item.title) domRecord.title = item.title;
        if (item.favIconUrl) domRecord.favIconUrl = item.favIconUrl;

        recentLogs.push(item);
        cursor.continue();
      };

      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長統計聚合 (失敗)', performance.now() - perfStart);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清除過期停留時長記錄 (預設保留 7 天)
   * @param {number} retentionDays 保存天數 (預設 7 天)
   * @returns {Promise<number>} 清除筆數
   */
  async purgeExpiredTimeLogs(retentionDays = 7) {
    const startTime = performance.now();
    const db = await this.open();
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readwrite');
      const store = tx.objectStore(TIME_STORE_NAME);
      const index = store.index('timestamp');
      const keyRange = IDBKeyRange.upperBound(cutoffTime);
      const req = index.openCursor(keyRange);
      let purgedCount = 0;

      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          profiler.recordDuration('IndexedDB 停留時長清理過期', performance.now() - startTime);
          resolve(purgedCount);
          return;
        }
        cursor.delete();
        purgedCount++;
        cursor.continue();
      };

      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長清理過期 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }

  /**
   * 清空所有停留時長記錄
   * @returns {Promise<void>}
   */
  async clearAllTimeLogs() {
    const startTime = performance.now();
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([TIME_STORE_NAME], 'readwrite');
      const store = tx.objectStore(TIME_STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        profiler.recordDuration('IndexedDB 停留時長清空全部', performance.now() - startTime);
        resolve();
      };
      req.onerror = (e) => {
        profiler.recordDuration('IndexedDB 停留時長清空全部 (失敗)', performance.now() - startTime);
        reject(e.target.error);
      };
    });
  }
}

