import { storage } from '../../core/chrome/storage';
import { WeeklyMission } from '../../types';
import { googleTasksService } from './googleTasksService';
import { GoogleSyncResult, GoogleTaskItem } from './googleTypes';

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
   * 從 Google Tasks 拉取任務並與本地看板進行雙向智慧合併
   */
  public async pullAndMergeTasks(taskListId = '@default'): Promise<GoogleSyncResult> {
    const errors: string[] = [];
    let syncedCount = 0;

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

      return {
        success: true,
        syncedCount,
        lastSyncedAt: now,
      };
    } catch (err: any) {
      errors.push(err?.message || '拉取 Google Tasks 發生未知異常');
      return {
        success: false,
        syncedCount: 0,
        errors,
        lastSyncedAt: Date.now(),
      };
    }
  }

  /**
   * 當本地任務狀態變更時，單向推播至 Google Tasks
   */
  public async pushTaskStatusToGoogle(
    missionId: string,
    taskListId = '@default'
  ): Promise<boolean> {
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return false;

      let gTaskId = mission.workspaceSync?.googleTaskId;

      if (gTaskId) {
        // 更新現有 Google Task 狀態
        await googleTasksService.updateTaskStatus(gTaskId, mission.isCompleted, taskListId);
      } else {
        // 若尚未關聯，則在 Google Tasks 建立新任務並回填 id
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
      console.warn('[GoogleTasksSync] 推播任務狀態至 Google Tasks 失敗 (可稍後重試):', err);
      // 標註為失敗或等待重試，不阻斷本地操作
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.workspaceSync = {
          ...mission.workspaceSync,
          syncStatus: 'failed',
          lastSyncedAt: Date.now(),
        };
        await storage.saveWeeklyMissions(missions);
      }
      return false;
    }
  }
}

export const googleTasksSync = GoogleTasksSyncManager.getInstance();
