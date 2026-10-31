/**
 * kanbanActionDispatcher.ts - PK+ 看板指令分發器與 WIP 守門中樞
 *
 * 核心職責：
 * 1. 接收 GeminiCloudAgent Function Calling 回傳的動作指令 (PK_TOOLS)
 * 2. 嚴格執行 WIP 限額守門 (依據 KanbanAuditor 與使用者 WIP 設定)
 * 3. 攔截破壞性操作 (mark_task_done, 批量變更)，輸出 requireConfirm 信號
 * 4. 執行任務狀態流轉與看板數據更新，連動 Google Tasks/Sheets 與今日焦點
 */

import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { googleTasksSync } from '../../../shared/google/googleTasksSync';
import { googleSyncService } from '../../../services/googleSyncService';
import { WeeklyMission, GTDStatus, ChecklistItem, UserSettings } from '../../../types';
import { KanbanAuditor } from './kanbanAuditor';

// ==========================================
// 1. 型別宣告 (Types)
// ==========================================

export interface AIActionCall {
  name: string;
  args: Record<string, any>;
}

export interface ConfirmPayload {
  action: string;
  taskId?: string;
  taskTitle?: string;
  details?: string;
  args?: Record<string, any>;
}

export interface ActionDispatchResult {
  success: boolean;
  actionName: string;
  message: string;
  requireConfirm?: boolean;
  confirmData?: ConfirmPayload;
  warning?: string;
  data?: any;
}

export interface DispatcherContext {
  missions?: WeeklyMission[];
  wipLimit?: number;
  settings?: UserSettings;
  onReload?: () => Promise<void>;
}

// ==========================================
// 2. KanbanActionDispatcher 核心類別
// ==========================================

export class KanbanActionDispatcher {
  /**
   * 統一指令分發入口
   */
  public static async dispatch(
    actionCall: AIActionCall,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const { name, args = {} } = actionCall;

    switch (name) {
      case 'add_task':
        return this.handleAddTask(args, context);
      case 'split_task':
        return this.handleSplitTask(args, context);
      case 'move_task_stage':
        return this.handleMoveTaskStage(args, context);
      case 'trigger_cloud_sync':
        return this.handleTriggerCloudSync(args, context);
      case 'mark_task_done':
        return this.handleMarkTaskDone(args, context);
      case 'start_pomodoro_sprint':
        return this.handleStartPomodoroSprint(args, context);
      case 'generate_standup_report':
        return this.handleGenerateStandupReport(args, context);
      default:
        return {
          success: false,
          actionName: name,
          message: `未知的 AI 動作指令: ${name}`,
        };
    }
  }

  // -------------------------------------------------------------------------
  // 工具 1: add_task
  // -------------------------------------------------------------------------
  private static async handleAddTask(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const title = (args.title || '').trim();
    if (!title) {
      return {
        success: false,
        actionName: 'add_task',
        message: '新增任務失敗：未提供任務名稱。',
      };
    }

    const destination = (args.destination || 'next-action') as string;
    const priority = (args.priority || 'P2') as 'P0' | 'P1' | 'P2' | 'P3';
    const estimatedPomodoros = typeof args.estimatedPomodoros === 'number' ? args.estimatedPomodoros : 1;
    const notes = (args.notes || '').trim();

    const missions = context?.missions ? [...context.missions] : await storage.getWeeklyMissions();
    const wipLimit = context?.wipLimit ?? (await this.getEffectiveWipLimit(context));

    // 若直接新增至進行中 (in-progress)，須守門 WIP
    if (destination === 'in-progress') {
      const inProgressCount = missions.filter((m) => m.status === 'in-progress' && !m.isCompleted).length;
      if (inProgressCount >= wipLimit) {
        return {
          success: false,
          actionName: 'add_task',
          warning: `WIP 限制守門警告：進行中任務已達上限 (${inProgressCount}/${wipLimit})，無法直接將新任務放入進行中。`,
          message: `⚠️ WIP 超限（進行中已達 ${wipLimit} 項），無法直接放入進行中。建議先放置於「下一步行動」。`,
        };
      }
    }

    const newStatus: GTDStatus = destination === 'in-progress'
      ? 'in-progress'
      : destination === 'inbox'
      ? 'inbox'
      : destination === 'someday'
      ? 'someday'
      : 'next-action';

    const newMission: WeeklyMission = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      text: title,
      isCompleted: false,
      status: newStatus,
      priority,
      estimatedPomodoros,
      spentPomodoros: 0,
      notes: notes || undefined,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    missions.push(newMission);
    await storage.saveWeeklyMissions(missions);

    // 若放入進行中，同步納入今日焦點
    if (newStatus === 'in-progress') {
      const todayLog = await storage.getTodayLog();
      if (!todayLog.coreBattles.some((b) => b.missionId === newMission.id)) {
        todayLog.coreBattles.push({ missionId: newMission.id, committedTime: '' });
        await storage.saveTodayLog(todayLog);
      }
    }

    if (context?.onReload) {
      await context.onReload();
    }

    return {
      success: true,
      actionName: 'add_task',
      message: `✅ 已新增任務「${title}」至 ${newStatus} 欄位（預估 🍅×${estimatedPomodoros}，${priority}）。`,
      data: newMission,
    };
  }

  // -------------------------------------------------------------------------
  // 工具 2: split_task
  // -------------------------------------------------------------------------
  private static async handleSplitTask(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const parentTitle = (args.parentTitle || '').trim();
    const parentTaskId = args.parentTaskId as string | undefined;
    const subtasks = Array.isArray(args.subtasks) ? args.subtasks : [];

    if (!parentTitle && !parentTaskId) {
      return {
        success: false,
        actionName: 'split_task',
        message: '拆解任務失敗：未指定母任務名稱或 ID。',
      };
    }

    if (subtasks.length === 0) {
      return {
        success: false,
        actionName: 'split_task',
        message: '拆解任務失敗：未提供拆解出的子任務項目。',
      };
    }

    const missions = context?.missions ? [...context.missions] : await storage.getWeeklyMissions();
    let parentMission = this.findMission(missions, parentTaskId, parentTitle);

    // 若尚未有母任務，自動建立一個母任務放置於 next-action
    if (!parentMission) {
      parentMission = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        text: parentTitle || '新拆解任務',
        isCompleted: false,
        status: 'next-action',
        priority: 'P1',
        estimatedPomodoros: 0,
        spentPomodoros: 0,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        checklist: [],
      };
      missions.push(parentMission);
    }

    const existingChecklist = parentMission.checklist || [];
    let totalAddedPomodoros = 0;

    const newChecklistItems: ChecklistItem[] = subtasks.map((st: any, idx: number) => {
      const poms = typeof st.estimatedPomodoros === 'number' ? st.estimatedPomodoros : 1;
      totalAddedPomodoros += poms;
      const subTitle = (st.title || `子任務 ${idx + 1}`).trim();
      return {
        id: `ck_${Date.now()}_${idx}`,
        text: `${subTitle} (🍅×${poms})`,
        completed: false,
      };
    });

    parentMission.checklist = [...existingChecklist, ...newChecklistItems];
    parentMission.estimatedPomodoros = (parentMission.estimatedPomodoros || 0) + totalAddedPomodoros;

    // 計算進度百分比
    if (parentMission.checklist.length > 0) {
      const completed = parentMission.checklist.filter((c) => c.completed).length;
      parentMission.progressPercent = Math.round((completed / parentMission.checklist.length) * 100);
    }

    await storage.saveWeeklyMissions(missions);

    if (context?.onReload) {
      await context.onReload();
    }

    return {
      success: true,
      actionName: 'split_task',
      message: `✅ 已將「${parentMission.text}」拆解為 ${subtasks.length} 個子任務並寫入 Checklist。`,
      data: {
        parentMissionId: parentMission.id,
        subtasksCount: subtasks.length,
      },
    };
  }

  // -------------------------------------------------------------------------
  // 工具 3: move_task_stage
  // -------------------------------------------------------------------------
  private static async handleMoveTaskStage(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const { taskId, taskTitle, targetStage, confirmed } = args;

    if (!targetStage) {
      return {
        success: false,
        actionName: 'move_task_stage',
        message: '流轉任務階段失敗：未指定目標階段。',
      };
    }

    const missions = context?.missions ? [...context.missions] : await storage.getWeeklyMissions();
    const targetMission = this.findMission(missions, taskId, taskTitle);

    if (!targetMission) {
      return {
        success: false,
        actionName: 'move_task_stage',
        message: `找不到指定任務: ${taskTitle || taskId || '未知'}`,
      };
    }

    const wipLimit = context?.wipLimit ?? (await this.getEffectiveWipLimit(context));

    // 1. WIP 守門：目標是 in-progress 且原先不是 in-progress
    if (targetStage === 'in-progress' && targetMission.status !== 'in-progress') {
      const auditor = KanbanAuditor.getInstance();
      const healthReport = auditor.auditBoard(missions, wipLimit);
      const inProgressCount = missions.filter((m) => m.status === 'in-progress' && !m.isCompleted).length;

      if (inProgressCount >= wipLimit) {
        return {
          success: false,
          actionName: 'move_task_stage',
          warning: `WIP 限制守門警告：進行中任務已達上限 (${inProgressCount}/${wipLimit})，請先完成或移出進行中卡片。`,
          message: `⚠️ WIP 超限（進行中已達 ${wipLimit} 項），無法將「${targetMission.text}」移入進行中。目前健康度評級：${healthReport.healthGrade}。`,
          data: { healthReport, inProgressCount, wipLimit },
        };
      }
    }

    // 2. 破壞性操作守門：若目標是 done 且尚未確認
    if (targetStage === 'done' && !confirmed) {
      return {
        success: false,
        actionName: 'move_task_stage',
        requireConfirm: true,
        confirmData: {
          action: 'move_task_stage',
          taskId: targetMission.id,
          taskTitle: targetMission.text,
          details: `將「${targetMission.text}」標記為已完成 (Done)`,
          args: { ...args, confirmed: true },
        },
        message: `此操作將把任務「${targetMission.text}」標記為完成，請確認。`,
      };
    }

    // 3. 狀態流轉更新
    const prevStatus = targetMission.status;
    const isDone = targetStage === 'done';

    if (isDone) {
      targetMission.isCompleted = true;
      targetMission.status = 'done';
      targetMission.completedAt = new Date().toISOString();
    } else {
      targetMission.isCompleted = false;
      targetMission.status = targetStage as GTDStatus;
    }

    await storage.saveWeeklyMissions(missions);

    // 4. 連動今日焦點 (coreBattles)
    const todayLog = await storage.getTodayLog();
    const alreadyInCore = todayLog.coreBattles.some((b) => b.missionId === targetMission.id);

    if (targetStage === 'in-progress' && !alreadyInCore) {
      todayLog.coreBattles.push({ missionId: targetMission.id, committedTime: '' });
      await storage.saveTodayLog(todayLog);
    } else if (targetStage !== 'in-progress' && alreadyInCore) {
      todayLog.coreBattles = todayLog.coreBattles.filter((b) => b.missionId !== targetMission.id);
      await storage.saveTodayLog(todayLog);
    }

    // 背景推播至 Google Tasks (靜默處理)
    if (isDone) {
      sync.completeTaskWithNotes(targetMission.id, targetMission.notes || '').catch(() => {});
    }
    googleTasksSync.pushTaskStatusToGoogle(targetMission.id).catch(() => {});

    if (context?.onReload) {
      await context.onReload();
    }

    return {
      success: true,
      actionName: 'move_task_stage',
      message: `✅ 已將任務「${targetMission.text}」由 ${prevStatus} 移至 ${targetStage}。`,
      data: targetMission,
    };
  }

  // -------------------------------------------------------------------------
  // 工具 4: trigger_cloud_sync
  // -------------------------------------------------------------------------
  private static async handleTriggerCloudSync(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const target = (args.target || 'all') as 'google_tasks' | 'sheets' | 'all';
    const settings = context?.settings || (await storage.getUserSettings());
    const messages: string[] = [];

    try {
      // Google Tasks 同步
      if (target === 'google_tasks' || target === 'all') {
        if (settings.appsScriptUrl && settings.enableGoogleSync !== false) {
          const res = await googleSyncService.importGoogleTasksToInbox({ autoTriage: true });
          messages.push(`Google Tasks 雙軌同步完成 (匯入 ${res.importedCount || 0} 個靈感)`);
        } else {
          const res = await googleTasksSync.pullAndMergeTasks();
          messages.push(res.success ? `Google Tasks 同步成功 (${res.syncedCount} 項)` : 'Google Tasks 同步回傳略過');
        }
      }

      // Sheets 同步 / 備份
      if (target === 'sheets' || target === 'all') {
        if (settings.appsScriptUrl) {
          const missions = context?.missions || (await storage.getWeeklyMissions());
          await sync.pushTasksToSheets(missions);
          messages.push('看板資料已備份至 Google Sheets');
        } else {
          messages.push('尚未設定 Google Sheets Web App URL，略過試算表備份');
        }
      }

      if (context?.onReload) {
        await context.onReload();
      }

      return {
        success: true,
        actionName: 'trigger_cloud_sync',
        message: `✅ 雲端同步完成：${messages.join('；')}`,
      };
    } catch (e: any) {
      return {
        success: false,
        actionName: 'trigger_cloud_sync',
        message: `⚠️ 雲端同步失敗：${e?.message || '未知錯誤'}`,
      };
    }
  }

  // -------------------------------------------------------------------------
  // 工具 5: mark_task_done (破壞性操作)
  // -------------------------------------------------------------------------
  private static async handleMarkTaskDone(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const { taskId, taskTitle, confirmed } = args;
    const missions = context?.missions ? [...context.missions] : await storage.getWeeklyMissions();
    const targetMission = this.findMission(missions, taskId, taskTitle);

    if (!targetMission) {
      return {
        success: false,
        actionName: 'mark_task_done',
        message: `找不到指定任務: ${taskTitle || taskId || '未知'}`,
      };
    }

    // 破壞性操作守門：未確認時回傳 requireConfirm
    if (!confirmed) {
      return {
        success: false,
        actionName: 'mark_task_done',
        requireConfirm: true,
        confirmData: {
          action: 'mark_task_done',
          taskId: targetMission.id,
          taskTitle: targetMission.text,
          details: `標記「${targetMission.text}」為已完成 (Done)`,
          args: { ...args, confirmed: true },
        },
        message: `確定要將「${targetMission.text}」標記為完成嗎？`,
      };
    }

    // 執行完成
    targetMission.isCompleted = true;
    targetMission.status = 'done';
    targetMission.completedAt = new Date().toISOString();

    await storage.saveWeeklyMissions(missions);

    // 移除今日焦點
    const todayLog = await storage.getTodayLog();
    todayLog.coreBattles = todayLog.coreBattles.filter((b) => b.missionId !== targetMission.id);
    await storage.saveTodayLog(todayLog);

    sync.completeTaskWithNotes(targetMission.id, targetMission.notes || '').catch(() => {});
    googleTasksSync.pushTaskStatusToGoogle(targetMission.id).catch(() => {});

    if (context?.onReload) {
      await context.onReload();
    }

    return {
      success: true,
      actionName: 'mark_task_done',
      message: `🎉 已將任務「${targetMission.text}」標記為已完成！`,
      data: targetMission,
    };
  }

  // -------------------------------------------------------------------------
  // 工具 6: start_pomodoro_sprint
  // -------------------------------------------------------------------------
  private static async handleStartPomodoroSprint(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const { taskId, taskTitle, durationMinutes = 25 } = args;
    const missions = context?.missions ? [...context.missions] : await storage.getWeeklyMissions();
    const targetMission = this.findMission(missions, taskId, taskTitle);

    // 若有目標任務，確保其加入今日焦點
    if (targetMission) {
      const todayLog = await storage.getTodayLog();
      if (!todayLog.coreBattles.some((b) => b.missionId === targetMission.id)) {
        todayLog.coreBattles.push({ missionId: targetMission.id, committedTime: `${durationMinutes}m` });
        await storage.saveTodayLog(todayLog);
      }
    }

    // 發送 runtime 訊息通知計時器模組（非同步廣播）
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage({
          action: 'START_TIMER',
          duration: durationMinutes,
          missionId: targetMission?.id,
          missionTitle: targetMission?.text,
        });
      } catch {
        // 靜默降級（若 background 尚未就緒）
      }
    }

    if (context?.onReload) {
      await context.onReload();
    }

    return {
      success: true,
      actionName: 'start_pomodoro_sprint',
      message: `🍅 已啟動番茄鐘專注衝刺 (${durationMinutes} 分鐘)${targetMission ? `，目標：「${targetMission.text}」` : ''}。`,
      data: {
        missionId: targetMission?.id,
        durationMinutes,
      },
    };
  }

  // -------------------------------------------------------------------------
  // 工具 7: generate_standup_report
  // -------------------------------------------------------------------------
  private static async handleGenerateStandupReport(
    args: Record<string, any>,
    context?: DispatcherContext
  ): Promise<ActionDispatchResult> {
    const scope = (args.scope || 'today') as 'today' | 'weekly';
    const missions = context?.missions || (await storage.getWeeklyMissions());
    const todayLog = await storage.getTodayLog();

    const inProgressList = missions.filter((m) => m.status === 'in-progress' && !m.isCompleted);
    const nextActionsList = missions.filter((m) => m.status === 'next-action' && !m.isCompleted);
    const doneList = missions.filter((m) => m.isCompleted || m.status === 'done');

    const p0Items = nextActionsList.filter((m) => m.priority === 'P0');
    const spentPomodorosToday = todayLog.sprintLogs?.length || 0;

    const reportLines: string[] = [
      `📋 **敏捷站會日報 (${scope === 'today' ? '今日即時' : '本週綜合'})**`,
      `⏱ 今日已完成專注番茄數：${spentPomodorosToday} 顆`,
      '',
      `🔥 **進行中卡片 (In Progress, 共 ${inProgressList.length} 項)**：`,
      inProgressList.length > 0
        ? inProgressList.map((m) => `  - [${m.priority || 'P2'}] ${m.text} (🍅×${m.estimatedPomodoros || 1})`).join('\n')
        : '  (目前無進行中任務)',
      '',
      `🎯 **下一步高優先重點 (Next Actions)**：`,
      nextActionsList.slice(0, 3).map((m) => `  - [${m.priority || 'P2'}] ${m.text}`).join('\n') || '  (無待辦項目)',
      '',
      `✅ **已完成成果 (Done, 共 ${doneList.length} 項)**：`,
      doneList.slice(0, 3).map((m) => `  - ${m.text}`).join('\n') || '  (尚無完成記錄)',
    ];

    if (p0Items.length > 0) {
      reportLines.push('', `🚨 **阻礙項 / P0 待排除**：`);
      p0Items.forEach((m) => reportLines.push(`  - ⚠️ ${m.text}`));
    }

    const reportText = reportLines.join('\n');

    return {
      success: true,
      actionName: 'generate_standup_report',
      message: reportText,
      data: {
        scope,
        reportText,
        inProgressCount: inProgressList.length,
        doneCount: doneList.length,
      },
    };
  }

  // -------------------------------------------------------------------------
  // 輔助工具函式
  // -------------------------------------------------------------------------

  /**
   * 模糊匹配任務：優先以 ID 精確匹配，若無則以標題包含或相等匹配
   */
  private static findMission(
    missions: WeeklyMission[],
    taskId?: string,
    taskTitle?: string
  ): WeeklyMission | undefined {
    if (taskId) {
      const match = missions.find((m) => m.id === taskId);
      if (match) return match;
    }

    if (taskTitle) {
      const cleanTitle = taskTitle.trim().toLowerCase();
      // 先找完全相符
      const exact = missions.find((m) => m.text.trim().toLowerCase() === cleanTitle);
      if (exact) return exact;

      // 再找包含
      const partial = missions.find((m) => m.text.toLowerCase().includes(cleanTitle) || cleanTitle.includes(m.text.toLowerCase()));
      if (partial) return partial;
    }

    return undefined;
  }

  /**
   * 取得有效 WIP 限制（預設 3）
   */
  private static async getEffectiveWipLimit(context?: DispatcherContext): Promise<number> {
    if (typeof context?.wipLimit === 'number' && context.wipLimit > 0) {
      return context.wipLimit;
    }
    try {
      const settings = context?.settings || (await storage.getUserSettings());
      if (typeof settings.maxWipLimit === 'number' && settings.maxWipLimit > 0) {
        return settings.maxWipLimit;
      }
    } catch {
      // 讀取失敗時回退預設值
    }
    return 3;
  }
}
