import { storage } from '../../core/chrome/storage';
import { WeeklyMission } from '../../types';
import { googleTasksService } from './googleTasksService';
import { googleAuthClient } from './googleAuthClient';
import { GoogleSyncResult, GoogleTaskItem } from './googleTypes';

const STORAGE_KEY_TASKS_SYNC_RESULT = 'google_tasks_last_sync_result';

class GoogleTasksSyncManager {
  private static instance: GoogleTasksSyncManager;

  private constructor() {}

  public static getInstance(): GoogleTasksSyncManager {
    if (!GoogleTasksSyncManager.instance) {
      GoogleTasksSyncManager.instance = new GoogleTasksSyncManager();
    }
    return GoogleTasksSyncManager.instance;
  }

  /**
   * 取得最後一次 Google Tasks 同步結果
   */
  public async getLastSyncResult(): Promise<GoogleSyncResult | null> {
    try {
      const res = await chrome.storage?.local?.get(STORAGE_KEY_TASKS_SYNC_RESULT);
      return res?.[STORAGE_KEY_TASKS_SYNC_RESULT] || null;
    } catch {
      return null;
    }
  }

  private async saveSyncResult(result: GoogleSyncResult): Promise<void> {
    try {
      await chrome.storage?.local?.set({ [STORAGE_KEY_TASKS_SYNC_RESULT]: result });
    } catch {}
  }

  /**
   * 從 Google Tasks 拉取任務並與本地看板進行雙向智慧合併
   */
  public async pullAndMergeTasks(taskListId = '@default'): Promise<GoogleSyncResult> {
    const errors: string[] = [];
    let syncedCount = 0;

    if (!googleAuthClient.isOAuthConfigured()) {
      const failedResult: GoogleSyncResult = {
        success: false,
        syncedCount: 0,
        errors: [
          'Google OAuth2 Client ID 尚未完成配置。請在 Google Cloud Console 建立憑證並於 manifest.json 設定有效 client_id。',
        ],
        lastSyncedAt: Date.now(),
      };
      await this.saveSyncResult(failedResult);
      return failedResult;
    }

    try {
      const googleTasks = await googleTasksService.getTasks(taskListId);
      const localMissions = await storage.getWeeklyMissions();
      const updatedMissions = [...localMissions];
      const now = Date.now();

      // 建立 Google Task ID -> GoogleTaskItem 索引
      const googleMap = new Map<string, GoogleTaskItem>();
      googleTasks.forEach((t) => googleMap.set(t.id, t));

      // 1. 更新既有已綁定 Google Task 的本地任務
      for (let i = 0; i < updatedMissions.length; i++) {
        const mission = updatedMissions[i];
        const gTaskId = mission.workspaceSync?.googleTaskId;
        if (gTaskId && googleMap.has(gTaskId)) {
          const gTask = googleMap.get(gTaskId)!;
          const isDone = gTask.status === 'completed';
          
          // 若狀態有異動，以雲端為準更新
          if (mission.isCompleted !== isDone) {
            mission.isCompleted = isDone;
            if (isDone && !mission.completedAt) {
              mission.completedAt = gTask.completed || new Date().toISOString();
            }
          }
          if (gTask.title && gTask.title !== mission.text) {
            mission.text = gTask.title;
          }
          if (gTask.notes && (!mission.notes || mission.notes === '')) {
            mission.notes = gTask.notes;
          }

          mission.workspaceSync = {
            ...mission.workspaceSync,
            googleTaskId: gTask.id,
            syncStatus: 'synced',
            lastSyncedAt: now,
          };

          googleMap.delete(gTaskId); // 已處理，移除
          syncedCount++;
        }
      }

      // 2. 將 Google Tasks 中未出現在本地的新任務匯入為看板任務
      for (const [_, gTask] of googleMap) {
        if (!gTask.title || gTask.title.trim() === '') continue;

        const isCompleted = gTask.status === 'completed';
        const newMission: WeeklyMission = {
          id: 'gtask-' + gTask.id,
          text: gTask.title,
          isCompleted,
          completedAt: isCompleted ? gTask.completed || new Date().toISOString() : undefined,
          notes: gTask.notes || undefined,
          priority: 'P2',
          createdAt: gTask.updated ? gTask.updated.substring(0, 16).replace('T', ' ') : new Date().toISOString().substring(0, 16).replace('T', ' '),
          workspaceSync: {
            googleTaskId: gTask.id,
            syncStatus: 'synced',
            lastSyncedAt: now,
          },
        };
        updatedMissions.unshift(newMission);
        syncedCount++;
      }

      await storage.saveWeeklyMissions(updatedMissions);

      const successResult: GoogleSyncResult = {
        success: true,
        syncedCount,
        lastSyncedAt: now,
      };
      await this.saveSyncResult(successResult);
      return successResult;
    } catch (err: any) {
      errors.push(err?.message || '拉取 Google Tasks 發生未知異常');
      const failResult: GoogleSyncResult = {
        success: false,
        syncedCount: 0,
        errors,
        lastSyncedAt: Date.now(),
      };
      await this.saveSyncResult(failResult);
      return failResult;
    }
  }

  /**
   * 當本地任務狀態變更時，單向推播至 Google Tasks (支援優雅降級)
   * @param missionId 本地任務 ID
   * @param taskListId Google Tasks 清單 ID，預設 '@default'
   * @param onlyIfLinked 若為 true，僅當任務已有 googleTaskId 時才回寫；若為 false 且未綁定則建立新 Google Task
   */
  public async pushTaskStatusToGoogle(
    missionId: string,
    taskListId = '@default',
    onlyIfLinked = true
  ): Promise<boolean> {
    if (!googleAuthClient.isOAuthConfigured()) {
      return false;
    }

    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return false;

      let gTaskId = mission.workspaceSync?.googleTaskId;

      if (!gTaskId) {
        if (onlyIfLinked) {
          // 純本地任務且設定為僅同步已綁定項目，安全返回
          return false;
        }
        // 若允許自動建立雲端任務
        const created = await googleTasksService.createTask(
          mission.text,
          mission.notes,
          undefined,
          taskListId
        );
        gTaskId = created.id;
        if (mission.isCompleted) {
          await googleTasksService.updateTaskStatus(gTaskId, true, taskListId);
        }
      } else {
        // 更新現有 Google Task 狀態 (completed / needsAction)
        await googleTasksService.updateTaskStatus(gTaskId, mission.isCompleted, taskListId);
      }

      mission.workspaceSync = {
        ...mission.workspaceSync,
        googleTaskId: gTaskId,
        syncStatus: 'synced',
        lastSyncedAt: Date.now(),
      };

      await storage.saveWeeklyMissions(missions);
      return true;
    } catch (err) {
      console.warn('[GoogleTasksSync] 推播任務狀態至 Google Tasks 失敗 (已優雅降級並保留本地狀態):', err);
      try {
        const missions = await storage.getWeeklyMissions();
        const mission = missions.find((m) => m.id === missionId);
        if (mission && mission.workspaceSync?.googleTaskId) {
          mission.workspaceSync = {
            ...mission.workspaceSync,
            syncStatus: 'failed',
            lastSyncedAt: Date.now(),
          };
          await storage.saveWeeklyMissions(missions);
        }
      } catch {}
      return false;
    }
  }
}

export const googleTasksSync = GoogleTasksSyncManager.getInstance();
