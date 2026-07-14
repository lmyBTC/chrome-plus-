import { storage } from '../chrome/storage';

export interface QueuedAction {
  id: string;
  action: string;
  payload: any;
  timestamp: number;
}

export const offlineQueue = {
  async add(action: string, payload: any): Promise<void> {
    const queue = await this.getQueue();
    queue.push({
      id: Date.now().toString(),
      action,
      payload,
      timestamp: Date.now()
    });
    // @ts-ignore
    await chrome.storage.local.set({ offlineQueue: queue });
  },

  async getQueue(): Promise<QueuedAction[]> {
    // @ts-ignore
    const result = await chrome.storage.local.get('offlineQueue');
    return result.offlineQueue || [];
  },

  async remove(id: string): Promise<void> {
    const queue = await this.getQueue();
    const updated = queue.filter(item => item.id !== id);
    // @ts-ignore
    await chrome.storage.local.set({ offlineQueue: updated });
  },

  async clear(): Promise<void> {
    // @ts-ignore
    await chrome.storage.local.remove('offlineQueue');
  },

  async flush(): Promise<void> {
    const queue = await this.getQueue();
    if (queue.length === 0) return;
    
    const settings = await storage.getUserSettings();
    if (!settings.appsScriptUrl) return;

    for (const item of queue) {
      try {
        const response = await fetch(settings.appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: item.action, ...item.payload }),
          redirect: 'follow'
        });
        
        if (response.ok) {
          await this.remove(item.id);
        } else {
          break; // API responded with error, stop flushing
        }
      } catch (e) {
        console.warn('Offline queue flush failed, network might still be offline:', e);
        break; // Network error, stop flushing
      }
    }
  }
};
