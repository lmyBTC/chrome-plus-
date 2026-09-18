/**
 * 序列化非同步任務的 Storage 佇列 (避免 Race Condition)
 */
export class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}
