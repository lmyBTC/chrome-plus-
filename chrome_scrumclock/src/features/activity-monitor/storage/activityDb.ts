import { ActivityLog, ActivityCategory } from '../types';

const DB_NAME = 'PowerKitActivityMonitorDB';
const DB_VERSION = 1;
const STORE_NAME = 'activity_logs';

export class AuditStorageDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('tabId', 'tabId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };
        resolve(this.db);
      };

      request.onerror = (event) => {
        this.initPromise = null;
        reject((event.target as IDBOpenDBRequest).error || new Error('開啟 IndexedDB 失敗'));
      };
    });

    return this.initPromise;
  }

  async insertLog(log: ActivityLog): Promise<void> {
    if (!log || !log.id) return;
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(log);

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async batchInsert(logs: ActivityLog[]): Promise<number> {
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
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
      tx.onabort = (e) => reject((e.target as IDBTransaction).error);
    });
  }

  async getRecentLogs(limit = 100, category: ActivityCategory | null = null): Promise<ActivityLog[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: ActivityLog[] = [];

      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor || results.length >= limit) {
          resolve(results);
          return;
        }

        const value = cursor.value as ActivityLog;
        if (!category || value.category === category) {
          results.push(value);
        }
        cursor.continue();
      };

      request.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async purgeExpiredLogs(retentionDays = 3): Promise<number> {
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
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          resolve(purgedCount);
          return;
        }
        cursor.delete();
        purgedCount++;
        cursor.continue();
      };

      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async clearAllLogs(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }
}

export const activityDb = new AuditStorageDB();
