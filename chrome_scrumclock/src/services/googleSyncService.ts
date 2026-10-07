/**
 * ==============================================================================
 * Google Sync Service - ScrumClock 雲端雙軌同步模組
 * ==============================================================================
 * 
 * 專案定位：
 * 封裝 ScrumClock 與 Google Workspace (Google Sheets / Google Tasks) 之 Webhook
 * 雙軌資料交換。支援直連 GAS Web App 與本機 Local Hub (Dispatcher) 退避重試。
 * 
 * 符合規範：
 * - Manifest V3 零審核 Webhook 橋接
 * - 10 秒健全逾時控制 (AbortController)
 * - 離線與網路波動退避機制
 * 
 * @version 1.0.0
 * @date 2026-10-08
 */

import { storage } from '../core/chrome/storage';
import { WeeklyMission, GTDStatus } from '../types';
import { TaskAIEngine } from '../features/project-management/services/taskAIEngine';

export interface DailyLogSyncPayload {
  date: string;               // 日期 YYYY-MM-DD
  spentPomodoros: number;     // 投入番茄數
  completedTasksCount: number;// 完成任務數
  focusMinutes: number;       // 專注總分鐘數
  highlights: string;         // 核心亮點
  lessons: string;            // 教訓反思
  aiDigest?: string;          // Gemini Nano 智慧摘要
}

export interface GoogleTaskSyncPayload {
  title: string;
  notes?: string;
  due?: string;
  dueDate?: string;
  taskId?: string;
  status?: 'needsAction' | 'completed';
  listName?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  updated?: string;
}

export interface GoogleTasksFetchResponse {
  success: boolean;
  message: string;
  count?: number;
  tasks?: GoogleTaskItem[];
  mode?: 'gas_direct' | 'queued_local_hub' | 'skipped';
  error?: string;
}

export interface InboxImportResult {
  success: boolean;
  message: string;
  importedCount: number;
  importedTasks?: WeeklyMission[];
}

export interface SyncResponse {
  success: boolean;
  message: string;
  mode?: 'gas_direct' | 'queued_local_hub' | 'skipped';
  target?: string;
  row?: number;
  taskId?: string;
  error?: string;
}

const TIMEOUT_MS = 10000; // 10 秒逾時控制
const LOCAL_HUB_URL = 'http://127.0.0.1:8765/sync_google';

export class GoogleSyncService {
  private static instance: GoogleSyncService;

  public static getInstance(): GoogleSyncService {
    if (!GoogleSyncService.instance) {
      GoogleSyncService.instance = new GoogleSyncService();
    }
    return GoogleSyncService.instance;
  }

  /**
   * 同步日終戰報至 Google Sheets ("DailyLogs" 分頁)
   */
  async syncDailyLogToSheets(payload: DailyLogSyncPayload): Promise<SyncResponse> {
    const settings = await storage.getUserSettings();

    if (settings.enableGoogleSync === false) {
      return {
        success: false,
        mode: 'skipped',
        message: 'Google 生態同步功能已於設定中關閉'
      };
    }

    const gasUrl = (settings.appsScriptUrl || '').trim();

    // 優先嘗試雲端直連 GAS Web App
    if (gasUrl) {
      try {
        const result = await this.postWithTimeout(gasUrl, {
          action: 'SYNC_DAILY_LOG',
          payload
        });

        if (result && result.status === 'success') {
          return {
            success: true,
            mode: 'gas_direct',
            target: result.target || 'DailyLogs',
            row: result.row,
            message: result.mode === 'updated'
              ? '今日日終戰報已成功覆蓋更新至 Google Sheets！'
              : '今日日終戰報已成功追加至 Google Sheets！'
          };
        } else {
          const errMsg = result?.message || result?.error || 'GAS Web App 回傳未預期錯誤';
          // 若直連失敗且允許 Local Hub 退避，則降級至本機佇列
          if (settings.googleSyncLocalHubFallback !== false) {
            return await this.fallbackToLocalHub(gasUrl, 'SYNC_DAILY_LOG', payload, errMsg);
          }
          return {
            success: false,
            message: `同步至 Google Sheets 失敗: ${errMsg}`
          };
        }
      } catch (err: any) {
        // 逾時或連線失敗，嘗試退避
        if (settings.googleSyncLocalHubFallback !== false) {
          return await this.fallbackToLocalHub(
            gasUrl,
            'SYNC_DAILY_LOG',
            payload,
            err.name === 'AbortError' ? '連線逾時 (超過 10 秒)' : (err.message || '網路異常')
          );
        }
        return {
          success: false,
          error: err.toString(),
          message: err.name === 'AbortError'
            ? '同步逾時 (超過 10 秒)，請確認網路連線或 GAS 服務狀態'
            : `同步連線失敗: ${err.message || err}`
        };
      }
    }

    // 若未填寫 GAS URL 但開啟 Local Hub 退避
    if (settings.googleSyncLocalHubFallback !== false) {
      return await this.fallbackToLocalHub('', 'SYNC_DAILY_LOG', payload, '未設定 GAS Web App URL');
    }

    return {
      success: false,
      message: '尚未設定 Google Apps Script Web App URL，請至設定分頁填寫。'
    };
  }

  /**
   * 推送看板焦點卡片至 Google Tasks
   */
  async pushTaskToGoogleTasks(payload: GoogleTaskSyncPayload): Promise<SyncResponse> {
    const settings = await storage.getUserSettings();

    if (settings.enableGoogleSync === false) {
      return {
        success: false,
        mode: 'skipped',
        message: 'Google 生態同步功能已於設定中關閉'
      };
    }

    const gasUrl = (settings.appsScriptUrl || '').trim();

    if (gasUrl) {
      try {
        const result = await this.postWithTimeout(gasUrl, {
          action: 'CREATE_GOOGLE_TASK',
          payload
        });

        if (result && result.status === 'success') {
          return {
            success: true,
            mode: 'gas_direct',
            target: result.targetList || payload.listName || '@ScrumClock-Today',
            taskId: result.taskId,
            message: payload.taskId
              ? `成功更新 Google Tasks [${payload.title}]`
              : `成功推播任務至 Google Tasks [${result.targetList || payload.listName || '@ScrumClock-Today'}]`
          };
        } else {
          const errMsg = result?.message || result?.error || '建立 Google Task 失敗';
          if (settings.googleSyncLocalHubFallback !== false) {
            return await this.fallbackToLocalHub(gasUrl, 'CREATE_GOOGLE_TASK', payload, errMsg);
          }
          return {
            success: false,
            message: `建立 Google Task 失敗: ${errMsg}`
          };
        }
      } catch (err: any) {
        if (settings.googleSyncLocalHubFallback !== false) {
          return await this.fallbackToLocalHub(
            gasUrl,
            'CREATE_GOOGLE_TASK',
            payload,
            err.name === 'AbortError' ? '連線逾時' : (err.message || '網路異常')
          );
        }
        return {
          success: false,
          error: err.toString(),
          message: `連線 Google Tasks 失敗: ${err.message || err}`
        };
      }
    }

    if (settings.googleSyncLocalHubFallback !== false) {
      return await this.fallbackToLocalHub('', 'CREATE_GOOGLE_TASK', payload, '未設定 GAS Web App URL');
    }

    return {
      success: false,
      message: '尚未設定 Google Apps Script Web App URL。'
    };
  }

  /**
   * 格式化看板任務為 Google Tasks 規格結構 (Phase 3 任務 3.2)
   * - 標題番茄鐘對齊: [N🍅] 智慧前綴
   * - 備註深度整合: 標籤、個股、情境、優先級、Checklist 與關聯網址
   * - 到期日對齊: 當日焦點或既有到期日連動
   * - 狀態連動: completed / needsAction
   */
  public formatTaskPayload(mission: WeeklyMission, targetStatus?: GTDStatus): GoogleTaskSyncPayload {
    // 1. 番茄數標籤對齊
    const pomoCount = mission.estimatedPomodoros || mission.spentPomodoros || 1;
    let formattedTitle = (mission.text || '').trim();
    if (!/^\[?\d*🍅\]?/.test(formattedTitle)) {
      formattedTitle = `[${pomoCount}🍅] ${formattedTitle}`;
    }

    // 2. 備註 (notes) 結構化整併
    const noteSections: string[] = [];
    if (mission.notes && mission.notes.trim()) {
      noteSections.push(mission.notes.trim());
    }

    const metaItems: string[] = [];
    if (mission.tags && mission.tags.length > 0) {
      metaItems.push(`🏷️ 標籤: ${mission.tags.join(' ')}`);
    }
    if (mission.ticker) {
      metaItems.push(`📈 關聯個股: ${mission.ticker}`);
    }
    if (mission.gtdContext) {
      metaItems.push(`🎯 情境: ${mission.gtdContext}`);
    }
    if (mission.priority) {
      metaItems.push(`⚡ 優先級: ${mission.priority}`);
    }
    if (mission.deepLinkUrl || mission.url) {
      metaItems.push(`🔗 來源連結: ${mission.deepLinkUrl || mission.url}`);
    }
    if (metaItems.length > 0) {
      noteSections.push(metaItems.join('\n'));
    }

    if (mission.checklist && mission.checklist.length > 0) {
      const checklistText = mission.checklist
        .map((c) => `${c.completed ? '☑' : '☐'} ${c.text}`)
        .join('\n');
      noteSections.push(`【檢核清單】\n${checklistText}`);
    }

    noteSections.push(`—\n由 Chrome Plus ScrumClock 自動同步 (${new Date().toLocaleDateString()})`);

    const combinedNotes = noteSections.join('\n\n');

    // 3. 到期日 (due) 連動：焦點任務對齊今日結束時間
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const dueIso = todayEnd.toISOString();

    // 4. 狀態判定
    const isCompleted = targetStatus === 'done' || (targetStatus === undefined && mission.isCompleted);
    const status: 'needsAction' | 'completed' = isCompleted ? 'completed' : 'needsAction';

    return {
      title: formattedTitle,
      notes: combinedNotes,
      due: dueIso,
      dueDate: dueIso,
      taskId: mission.workspaceSync?.googleTaskId,
      status,
      listName: '@ScrumClock-Today'
    };
  }

  /**
   * 推播並雙向更新看板任務至 Google Tasks (Phase 3 任務 3.1)
   * 包含建立雲端任務、回寫 googleTaskId 至本地 storage，或更新既有任務狀態
   */
  async syncMissionToGoogleTasks(mission: WeeklyMission, targetStatus?: GTDStatus): Promise<SyncResponse> {
    const settings = await storage.getUserSettings();
    if (settings.enableGoogleSync === false) {
      return {
        success: false,
        mode: 'skipped',
        message: 'Google 生態同步功能已於設定中關閉'
      };
    }

    const payload = this.formatTaskPayload(mission, targetStatus);
    const response = await this.pushTaskToGoogleTasks(payload);

    // 若建立或更新成功，且回傳了 taskId，回寫至本機 storage 任務資料模型
    if (response.success && response.taskId) {
      try {
        const missions = await storage.getWeeklyMissions();
        const idx = missions.findIndex((m) => m.id === mission.id);
        if (idx !== -1) {
          missions[idx] = {
            ...missions[idx],
            workspaceSync: {
              ...missions[idx].workspaceSync,
              googleTaskId: response.taskId,
              syncStatus: 'synced',
              lastSyncedAt: Date.now()
            }
          };
          await storage.saveWeeklyMissions(missions);
        }
      } catch {
        // storage 寫入異常不阻礙同步結果
      }
    }

    return response;
  }

  /**
   * 逆向抓取 Google Tasks 未完成項目 (Phase 5 任務 5.1)
   */
  async fetchGoogleTasks(listName = '@ScrumClock-Today'): Promise<GoogleTasksFetchResponse> {
    const settings = await storage.getUserSettings();

    if (settings.enableGoogleSync === false) {
      return {
        success: false,
        mode: 'skipped',
        message: 'Google 生態同步功能已於設定中關閉',
        tasks: []
      };
    }

    const gasUrl = (settings.appsScriptUrl || '').trim();

    if (gasUrl) {
      try {
        const result = await this.postWithTimeout(gasUrl, {
          action: 'FETCH_INBOX_TASKS',
          payload: { listName }
        });

        if (result && result.status === 'success') {
          return {
            success: true,
            mode: 'gas_direct',
            count: result.count || (result.tasks ? result.tasks.length : 0),
            tasks: result.tasks || [],
            message: `成功自 Google Tasks [${listName}] 取得 ${result.tasks ? result.tasks.length : 0} 筆任務`
          };
        } else {
          const errMsg = result?.message || result?.error || '抓取 Google Tasks 失敗';
          return {
            success: false,
            message: `抓取 Google Tasks 失敗: ${errMsg}`,
            tasks: []
          };
        }
      } catch (err: any) {
        return {
          success: false,
          error: err.toString(),
          message: err.name === 'AbortError'
            ? '連線逾時 (超過 10 秒)，請確認網路或 GAS 服務狀態'
            : `連線 Google Tasks 失敗: ${err.message || err}`,
          tasks: []
        };
      }
    }

    return {
      success: false,
      message: '尚未設定 Google Apps Script Web App URL。',
      tasks: []
    };
  }

  /**
   * 逆向抓取 Google Tasks 並經由 TaskAIEngine 智能轉入看板收件匣 (Phase 5 任務 5.1)
   */
  async importGoogleTasksToInbox(options?: { listName?: string; autoTriage?: boolean }): Promise<InboxImportResult> {
    const fetchRes = await this.fetchGoogleTasks(options?.listName);
    if (!fetchRes.success || !fetchRes.tasks) {
      return {
        success: false,
        importedCount: 0,
        message: fetchRes.message || '抓取 Google Tasks 失敗'
      };
    }

    if (fetchRes.tasks.length === 0) {
      return {
        success: true,
        importedCount: 0,
        message: 'Google Tasks 中無待處理任務'
      };
    }

    // 1. 讀取現有看板任務，避免重複匯入 (以 googleTaskId 去重)
    const currentMissions = await storage.getWeeklyMissions();
    const existingTaskIds = new Set(
      currentMissions
        .map((m) => m.workspaceSync?.googleTaskId)
        .filter((id): id is string => Boolean(id))
    );

    const pendingTasks = fetchRes.tasks.filter((t) => !existingTaskIds.has(t.id));

    if (pendingTasks.length === 0) {
      return {
        success: true,
        importedCount: 0,
        message: 'Google Tasks 遠端待辦項目皆已存在於看板中，無需重複匯入。'
      };
    }

    // 2. 將未匯入任務轉化為 WeeklyMission 實例 (GTD Inbox)
    const newMissions: WeeklyMission[] = pendingTasks.map((t) => {
      let rawTitle = (t.title || '未命名任務').trim();
      let estimatedPomodoros = 1;

      // 提取標題中的番茄預估鐘數 (例如 "[2🍅] 需求評審" 或 "3🍅 調查")
      const pomoMatch = rawTitle.match(/^\[?(\d+)🍅\]?\s*/);
      if (pomoMatch) {
        estimatedPomodoros = parseInt(pomoMatch[1], 10) || 1;
        rawTitle = rawTitle.replace(/^\[?\d+🍅\]?\s*/, '').trim();
      }

      return {
        id: `gt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: rawTitle || '來自 Google Tasks 待辦',
        isCompleted: false,
        status: 'inbox' as GTDStatus,
        notes: t.notes || '',
        createdAt: new Date().toISOString(),
        estimatedPomodoros,
        spentPomodoros: 0,
        checklist: [],
        tags: ['GoogleTasks'],
        workspaceSync: {
          googleTaskId: t.id,
          syncStatus: 'synced',
          lastSyncedAt: Date.now()
        }
      };
    });

    // 3. 呼叫 TaskAIEngine 進行輕量語意釐清與屬性強化 (若 autoTriage 不為 false)
    if (options?.autoTriage !== false) {
      try {
        const aiEngine = TaskAIEngine.getInstance();
        const proposals = await aiEngine.triageInboxItems(newMissions);
        if (proposals && proposals.length > 0) {
          const proposalMap = new Map(proposals.map((p) => [p.id, p]));
          for (const m of newMissions) {
            const prop = proposalMap.get(m.id);
            if (prop) {
              if (prop.recommendedPomodoros && prop.recommendedPomodoros > 0) {
                m.estimatedPomodoros = prop.recommendedPomodoros;
              }
              if (prop.tags && prop.tags.length > 0) {
                m.tags = Array.from(new Set([...(m.tags || []), ...prop.tags]));
              }
              if (prop.reason) {
                m.aiTip = prop.reason;
              }
            }
          }
        }
      } catch {
        // AI 邊緣模型異常時安全降級，不影響任務匯入
      }
    }

    // 4. 持久化存入 storage
    const updatedMissions = [...newMissions, ...currentMissions];
    await storage.saveWeeklyMissions(updatedMissions);

    return {
      success: true,
      importedCount: newMissions.length,
      importedTasks: newMissions,
      message: `成功自 Google Tasks 逆向匯入 ${newMissions.length} 個靈感至收件匣（已完成 AI 語意強化）！`
    };
  }

  /**
   * 逾時保護的 fetch POST 封裝
   */
  private async postWithTimeout(url: string, data: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // 使用 text/plain 避免觸發 OPTIONS preflight
        },
        body: JSON.stringify(data),
        redirect: 'follow',
        signal: controller.signal
      });

      const json = await response.json();
      return json;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 退避轉發至本機 Local Hub (Dispatcher)
   */
  private async fallbackToLocalHub(
    gasUrl: string,
    action: string,
    payload: any,
    triggerReason: string
  ): Promise<SyncResponse> {
    try {
      const localController = new AbortController();
      const localTimeout = setTimeout(() => localController.abort(), 2000); // 2 秒快速測試本機連線

      const hubRes = await fetch(LOCAL_HUB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gas_url: gasUrl,
          action,
          payload
        }),
        signal: localController.signal
      }).finally(() => clearTimeout(localTimeout));

      const hubData = await hubRes.json();
      if (hubData && hubData.status === 'ok') {
        return {
          success: true,
          mode: 'queued_local_hub',
          message: `雲端連線失敗 (${triggerReason})，已成功暫存至本機 Local Hub 佇列，待恢復連線後自動重試。`
        };
      }
    } catch {
      // 本機 Local Hub 亦未啟動
    }

    return {
      success: false,
      message: `同步失敗 (${triggerReason})，且本機 Local Hub 服務未啟用。`
    };
  }
}

export const googleSyncService = GoogleSyncService.getInstance();
