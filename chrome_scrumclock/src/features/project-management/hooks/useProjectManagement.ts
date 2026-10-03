import { useState, useEffect } from 'react';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { googleTasksSync } from '../../../shared/google/googleTasksSync';
import { googleCalendarService } from '../../../shared/google/googleCalendarService';
import { WeeklyMission, InboxItem, GTDStatus, ChecklistItem } from '../../../types';
import { DashboardColumns, SprintLogWithMission } from '../components/tabs/types';

declare const chrome: any;

export const useProjectManagement = () => {
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [sprintLogs, setSprintLogs] = useState<SprintLogWithMission[]>([]);
  const [inProgressIds, setInProgressIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncModal, setSyncModal] = useState<{ open: boolean; message?: string }>({ open: false });
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [northStarText, setNorthStarText] = useState<string>('');

  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [notesInputs, setNotesInputs] = useState<Record<string, string>>({});
  const [breakingDownId, setBreakingDownId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<Record<string, string[]>>({});

  const [visibleColumns, setVisibleColumns] = useState<DashboardColumns>(() => {
    try {
      const saved = localStorage.getItem('scrumclock_dashboard_columns');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('載入欄位顯示設定失敗:', e);
    }
    return { taskId: false, title: true, status: true, priority: true, notes: true, createdAt: false };
  });

  useEffect(() => {
    localStorage.setItem('scrumclock_dashboard_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    loadData();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      if (namespace === 'local' && (changes.weeklyMissions || changes.inboxItems || changes.dailyLogs)) {
        loadData();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const missions = await storage.getWeeklyMissions();
      const inbox = await storage.getInboxItems();
      const allData = await storage.getAllData();
      const todayLog = await storage.getTodayLog();

      setWeeklyMissions(missions);
      setInboxItems(inbox.filter((item) => !item.processed));
      setInProgressIds(todayLog.coreBattles.map((b) => b.missionId));
      setNorthStarText(allData.northStarGoal?.text || '');

      const dailyLogs = allData.dailyLogs || {};
      const allSprintLogs: SprintLogWithMission[] = [];

      Object.keys(dailyLogs).forEach((date) => {
        const log = dailyLogs[date];
        if (log && log.sprintLogs) {
          log.sprintLogs.forEach((sprint) => {
            const mission = missions.find((m) => m.id === sprint.missionId);
            allSprintLogs.push({
              ...sprint,
              missionText: mission?.text || '獨立衝刺',
              missionUrl: mission?.url || '',
              priority: mission?.priority,
            });
          });
        }
      });

      allSprintLogs.sort((a, b) => b.startTime - a.startTime);
      setSprintLogs(allSprintLogs);
    } catch (e) {
      console.error('載入專案資料失敗:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (customTitle?: string, initialStatus?: GTDStatus) => {
    const title = customTitle || newTitle;
    if (!title.trim()) {
      alert('請輸入任務名稱');
      return;
    }
    try {
      const missions = await storage.getWeeklyMissions();
      const newMission: WeeklyMission = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        text: title.trim(),
        isCompleted: false,
        status: initialStatus || 'next-action',
        priority: newPriority,
        estimatedPomodoros: 1,
        spentPomodoros: 0,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      missions.push(newMission);
      await storage.saveWeeklyMissions(missions);
      if (!customTitle) {
        setNewTitle('');
      }
      await loadData();
    } catch (e) {
      console.error('新增任務失敗:', e);
    }
  };

  const handleDeleteTask = async (missionId: string) => {
    if (!window.confirm('確定要刪除此任務嗎？這也會將它從今日規劃中移除。')) return;
    try {
      const missions = await storage.getWeeklyMissions();
      await storage.saveWeeklyMissions(missions.filter((m) => m.id !== missionId));

      const todayLog = await storage.getTodayLog();
      const originalCount = todayLog.coreBattles.length;
      todayLog.coreBattles = todayLog.coreBattles.filter((b) => b.missionId !== missionId);
      if (todayLog.coreBattles.length !== originalCount) {
        await storage.saveTodayLog(todayLog);
      }
      await loadData();
    } catch (e) {
      console.error('刪除任務失敗:', e);
    }
  };

  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);

  const handleSyncGoogleTasks = async () => {
    setIsGoogleSyncing(true);
    try {
      const result = await googleTasksSync.pullAndMergeTasks();
      if (result.success) {
        setSyncFeedback({
          type: 'success',
          text: `Google Tasks 同步成功，共連動 ${result.syncedCount} 個任務`,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          text: result.errors?.[0] || 'Google Tasks 同步失敗',
        });
      }
      await loadData();
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        text: e?.message || 'Google Tasks 連動失敗 (請確認授權)',
      });
    } finally {
      setIsGoogleSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState(false);

  const handleScheduleTimebox = async (
    missionId: string,
    startTime: string | number | Date,
    durationMinutes = 25
  ): Promise<boolean> => {
    setIsSchedulingCalendar(true);
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) throw new Error('找不到指定任務');

      const event = await googleCalendarService.createTimeboxEvent(
        mission.text,
        startTime,
        durationMinutes,
        {
          description: mission.notes || `ScrumClock 時間箱預約 (${durationMinutes} 分鐘)`,
        }
      );

      mission.workspaceSync = {
        ...mission.workspaceSync,
        googleCalendarEventId: event.id,
        syncStatus: 'synced',
        lastSyncedAt: Date.now(),
      };

      await storage.saveWeeklyMissions(missions);
      await loadData();

      setSyncFeedback({
        type: 'success',
        text: `已排定 Google Calendar 時間箱：${mission.text} (${durationMinutes} 分鐘)`,
      });
      return true;
    } catch (e: any) {
      setSyncFeedback({
        type: 'error',
        text: e?.message || '排定 Google Calendar 時間箱失敗',
      });
      return false;
    } finally {
      setIsSchedulingCalendar(false);
      setTimeout(() => setSyncFeedback(null), 3500);
    }
  };

  const handleUpdateStatus = async (missionId: string, statusText: string) => {
    try {
      const isDone = statusText === 'DONE' || statusText === 'done';
      const isInProgress = statusText === 'IN_PROGRESS' || statusText === 'in-progress';
      const isInbox = statusText === 'inbox';
      const isSomeday = statusText === 'someday';

      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (!mission) return;

      if (isDone) {
        mission.isCompleted = true;
        mission.status = 'done';
        mission.completedAt = new Date().toISOString();
        await storage.saveWeeklyMissions(missions);
        sync.completeTaskWithNotes(missionId, mission.notes || '').catch(() => {});
      } else {
        mission.isCompleted = false;
        if (isInbox) mission.status = 'inbox';
        else if (isInProgress) mission.status = 'in-progress';
        else if (isSomeday) mission.status = 'someday';
        else mission.status = 'next-action';
        await storage.saveWeeklyMissions(missions);

        const todayLog = await storage.getTodayLog();
        const alreadyInCore = todayLog.coreBattles.some((b) => b.missionId === missionId);
        if (isInProgress && !alreadyInCore) {
          todayLog.coreBattles.push({ missionId, committedTime: '' });
          await storage.saveTodayLog(todayLog);
        } else if (!isInProgress && alreadyInCore) {
          todayLog.coreBattles = todayLog.coreBattles.filter((b) => b.missionId !== missionId);
          await storage.saveTodayLog(todayLog);
        }
      }
      // 背景非同步推播至 Google Tasks (若已設定授權且已綁定)
      googleTasksSync
        .pushTaskStatusToGoogle(missionId)
        .then(() => {
          loadData().catch(() => {});
        })
        .catch(() => {});
      await loadData();
    } catch (e) {
      console.error('更新任務狀態失敗:', e);
    }
  };

  const handleUpdatePomodoroEstimate = async (missionId: string, estimate: number) => {
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.estimatedPomodoros = estimate;
        await storage.saveWeeklyMissions(missions);
        await loadData();
      }
    } catch (e) {
      console.error('更新預估番茄鐘失敗:', e);
    }
  };

  const handleUpdatePriority = async (missionId: string, priority: 'P0' | 'P1' | 'P2' | 'P3') => {
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.priority = priority;
        await storage.saveWeeklyMissions(missions);
      }
      await loadData();
    } catch (e) {
      console.error('更新優先級失敗:', e);
    }
  };

  const handleNotesChange = (missionId: string, value: string) => {
    setNotesInputs((prev) => ({ ...prev, [missionId]: value }));
  };

  const handleUpdateNotes = async (missionId: string) => {
    const value = notesInputs[missionId];
    if (value === undefined) return;
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.notes = value;
        await storage.saveWeeklyMissions(missions);
      }
    } catch (e) {
      console.error('儲存備註失敗:', e);
    }
  };

  const handleUpdateTitle = async (missionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.text = trimmed;
        await storage.saveWeeklyMissions(missions);
      }
      await loadData();
    } catch (e) {
      console.error('更新標題失敗:', e);
    }
  };

  const handleUpdateChecklist = async (missionId: string, checklist: ChecklistItem[]) => {
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find((m) => m.id === missionId);
      if (mission) {
        mission.checklist = checklist;
        if (checklist.length > 0) {
          const completedCount = checklist.filter((c) => c.completed).length;
          mission.progressPercent = Math.round((completedCount / checklist.length) * 100);
        } else {
          mission.progressPercent = 0;
        }
        await storage.saveWeeklyMissions(missions);
      }
      await loadData();
    } catch (e) {
      console.error('更新 Checklist 失敗:', e);
    }
  };

  const handleConvertInbox = async (row: InboxItem) => {
    const priorityInput = window.prompt('請輸入新任務優先級 (P1 / P2 / P3)：', 'P2');
    if (priorityInput === null) return;

    const priority = (priorityInput.trim().toUpperCase() || 'P2') as 'P1' | 'P2' | 'P3';
    if (!['P1', 'P2', 'P3'].includes(priority)) {
      alert('無效的優先級格式！請輸入 P1, P2 或 P3');
      return;
    }

    try {
      const missions = await storage.getWeeklyMissions();
      missions.push({
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        text: row.text,
        isCompleted: false,
        priority,
        notes: row.contextUrl ? `來源網頁: ${row.contextUrl}` : '',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
      await storage.saveWeeklyMissions(missions);

      const inbox = await storage.getInboxItems();
      const item = inbox.find((i) => i.id === row.id);
      if (item) {
        item.processed = true;
        await storage.saveInboxItems(inbox);
      }
      await loadData();
    } catch (e) {
      console.error('收件匣轉任務失敗:', e);
    }
  };

  const handleDeleteInbox = async (id: string) => {
    if (!window.confirm('確定要刪除此收件匣項目嗎？')) return;
    try {
      const inbox = await storage.getInboxItems();
      await storage.saveInboxItems(inbox.filter((i) => i.id !== id));
      await loadData();
    } catch (e) {
      console.error('刪除收件匣項目失敗:', e);
    }
  };

  const handleAddInboxItem = async (text: string) => {
    if (!text.trim()) return;
    try {
      const inbox = await storage.getInboxItems();
      const newItem: InboxItem = {
        id: 'inbox-' + Date.now(),
        text: text.trim(),
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        processed: false,
      };
      inbox.push(newItem);
      await storage.saveInboxItems(inbox);
      await loadData();
    } catch (e) {
      console.error('新增收件匣項目失敗:', e);
    }
  };

  const handleToggleFocus = async (missionId: string) => {
    try {
      const todayLog = await storage.getTodayLog();
      const isAlreadyIn = todayLog.coreBattles.some((b) => b.missionId === missionId);
      if (isAlreadyIn) {
        todayLog.coreBattles = todayLog.coreBattles.filter((b) => b.missionId !== missionId);
      } else {
        todayLog.coreBattles.push({
          missionId,
          committedTime: '25m',
        });
      }
      await storage.saveTodayLog(todayLog);
      await loadData();
    } catch (e) {
      console.error('切換今日焦點失敗:', e);
    }
  };

  const handleBreakdownTask = async (missionId: string) => {
    setBreakingDownId(missionId);
    try {
      const breakdownResult = await sync.breakdownTask(missionId);
      if (breakdownResult && breakdownResult.length > 0) {
        setSubtasks((prev) => ({ ...prev, [missionId]: breakdownResult }));
      } else {
        alert('AI 拆解失敗或未產生建議，請確認連線設定。');
      }
    } catch (e) {
      console.error('AI 任務拆解失敗:', e);
      alert('AI 任務拆解失敗');
    } finally {
      setBreakingDownId(null);
    }
  };

  const handleApplySubtasks = async (missionId: string) => {
    const tasks = subtasks[missionId];
    if (!tasks || tasks.length === 0) return;
    try {
      const missions = await storage.getWeeklyMissions();
      const original = missions.find((m) => m.id === missionId);
      const newMissions: WeeklyMission[] = tasks.map((text, idx) => ({
        id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        text: text.replace(/^[-*•\d.]+\s*/, ''),
        isCompleted: false,
        priority: original?.priority || 'P2',
        notes: `衍生自母任務: ${original?.text || ''}`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      }));
      await storage.saveWeeklyMissions([...missions, ...newMissions]);
      setSubtasks((prev) => {
        const next = { ...prev };
        delete next[missionId];
        return next;
      });
      await loadData();
    } catch (e) {
      console.error('匯入子任務失敗:', e);
    }
  };

  const handleDismissSubtasks = (missionId: string) => {
    setSubtasks((prev) => {
      const next = { ...prev };
      delete next[missionId];
      return next;
    });
  };

  const handleSync = async () => {
    const localMissions = await storage.getWeeklyMissions();
    const hasRealTasks = localMissions.some(
      (m) => !m.id.startsWith('mission-') || (m.id.startsWith('mission-') && m.text && m.text !== '完成產品規格書' && m.text !== '學習 React Hooks')
    );

    if (!hasRealTasks || localMissions.length === 0) {
      await doFullPull();
    } else {
      setSyncModal({ open: true });
    }
  };

  const executeSync = async (syncFn: () => Promise<boolean>, successMsg: string, failMsg: string) => {
    setSyncModal({ open: false });
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const ok = await syncFn();
      await loadData();
      setSyncFeedback(ok ? { type: 'success', text: successMsg } : { type: 'error', text: failMsg });
    } catch (e) {
      setSyncFeedback({ type: 'error', text: '❌ 同步發生錯誤: ' + (e instanceof Error ? e.message : e) });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const doSmartMerge = () =>
    executeSync(sync.pullTasksFromSheets, '✅ 智慧合併完成！本地與試算表任務已合併。', '❌ 拉取失敗，請確認 GAS URL 與試算表格式。');

  const doFullPull = () =>
    executeSync(sync.fullPullTasksFromSheets, '✅ 完全拉取成功！本地任務已更新為試算表內容。', '❌ 拉取失敗，請確認 GAS URL 與試算表格式。');

  const doPushToSheet = async () => {
    const localMissions = await storage.getWeeklyMissions();
    return executeSync(
      () => sync.pushTasksToSheets(localMissions),
      '✅ 本地任務已上傳至 Google Sheet Task 分頁！',
      '❌ 上傳失敗，請確認 GAS 已重新部署（含 sync_tasks_to_sheet action）。'
    );
  };

  const handleBatchPushToFocus = async (missionIds: string[]) => {
    if (missionIds.length === 0) return;
    try {
      const todayLog = await storage.getTodayLog();
      const existingIds = new Set(todayLog.coreBattles.map((b) => b.missionId));
      let added = 0;
      missionIds.forEach((id) => {
        if (!existingIds.has(id)) {
          todayLog.coreBattles.push({
            missionId: id,
            committedTime: '25m',
          });
          existingIds.add(id);
          added++;
        }
      });
      if (added > 0) {
        await storage.saveTodayLog(todayLog);
        await loadData();
      }
    } catch (e) {
      console.error('批次推入今日焦點失敗:', e);
    }
  };

  const handleBatchUpdateStatus = async (missionIds: string[], statusText: 'TODO' | 'DONE') => {
    if (missionIds.length === 0) return;
    try {
      const missions = await storage.getWeeklyMissions();
      const targetIds = new Set(missionIds);
      let changed = false;
      missions.forEach((m) => {
        if (targetIds.has(m.id)) {
          m.isCompleted = statusText === 'DONE';
          changed = true;
        }
      });
      if (changed) {
        await storage.saveWeeklyMissions(missions);
        // 背景推播選取任務狀態至 Google Tasks
        targetIds.forEach((id) => {
          googleTasksSync.pushTaskStatusToGoogle(id).catch(() => {});
        });
        await loadData();
      }
    } catch (e) {
      console.error('批次更新任務狀態失敗:', e);
    }
  };

  const handleBatchDelete = async (missionIds: string[]) => {
    if (missionIds.length === 0) return;
    if (!window.confirm(`確定要刪除選取的 ${missionIds.length} 項任務嗎？這也會將它們從今日焦點中移除。`)) return;
    try {
      const targetIds = new Set(missionIds);
      const missions = await storage.getWeeklyMissions();
      await storage.saveWeeklyMissions(missions.filter((m) => !targetIds.has(m.id)));

      const todayLog = await storage.getTodayLog();
      const originalCount = todayLog.coreBattles.length;
      todayLog.coreBattles = todayLog.coreBattles.filter((b) => !targetIds.has(b.missionId));
      if (todayLog.coreBattles.length !== originalCount) {
        await storage.saveTodayLog(todayLog);
      }
      await loadData();
    } catch (e) {
      console.error('批次刪除任務失敗:', e);
    }
  };

  return {
    weeklyMissions,
    inboxItems,
    sprintLogs,
    inProgressIds,
    isLoading,
    isSyncing,
    isGoogleSyncing,
    isSchedulingCalendar,
    handleScheduleTimebox,
    syncModal,
    setSyncModal,
    syncFeedback,
    northStarText,
    newTitle,
    setNewTitle,
    newPriority,
    setNewPriority,
    notesInputs,
    breakingDownId,
    subtasks,
    visibleColumns,
    setVisibleColumns,
    handleAddTask,
    handleDeleteTask,
    handleUpdateStatus,
    handleUpdatePomodoroEstimate,
    handleUpdatePriority,
    handleNotesChange,
    handleUpdateNotes,
    handleUpdateTitle,
    handleUpdateChecklist,
    handleConvertInbox,
    handleDeleteInbox,
    handleAddInboxItem,
    handleToggleFocus,
    handleBreakdownTask,
    handleApplySubtasks,
    handleDismissSubtasks,
    handleSync,
    handleSyncGoogleTasks,
    doSmartMerge,
    doFullPull,
    doPushToSheet,
    handleBatchPushToFocus,
    handleBatchUpdateStatus,
    handleBatchDelete,
  };
};
