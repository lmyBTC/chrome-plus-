import React, { useState, useEffect } from 'react';
import { storage } from '../../../core/chrome/storage';
import { sync } from '../../../core/api/sync';
import { WeeklyMission, InboxItem, SprintLog } from '../../../types';

type Tab = 'taskPool' | 'inbox' | 'sprintLogs';

export const ProjectManagementDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('taskPool');
  const [weeklyMissions, setWeeklyMissions] = useState<WeeklyMission[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [sprintLogs, setSprintLogs] = useState<(SprintLog & { missionText: string })[]>([]);
  const [inProgressIds, setInProgressIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 新增任務用的 States
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'P1' | 'P2' | 'P3'>('P2');

  // 本地 Notes 輸入快取，避免每次 keystroke 觸發 Chrome Storage 寫入
  const [notesInputs, setNotesInputs] = useState<Record<string, string>>({});

  // 欄位顯示篩選狀態 (持久化儲存於 localStorage)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('scrumclock_dashboard_columns');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('載入欄位顯示設定失敗:', e);
    }
    return {
      taskId: true,
      title: true,
      status: true,
      priority: true,
      notes: true,
      createdAt: true
    };
  });

  useEffect(() => {
    localStorage.setItem('scrumclock_dashboard_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const missions = await storage.getWeeklyMissions();
      const inbox = await storage.getInboxItems();
      const allData = await storage.getAllData();
      const todayLog = await storage.getTodayLog();
      
      setWeeklyMissions(missions);
      setInboxItems(inbox.filter(item => !item.processed));
      setInProgressIds(todayLog.coreBattles.map(b => b.missionId));

      // 載入所有歷程的番茄鐘衝刺日誌
      const dailyLogs = allData.dailyLogs || {};
      const allSprintLogs: (SprintLog & { missionText: string })[] = [];
      
      Object.keys(dailyLogs).forEach(date => {
        const log = dailyLogs[date];
        if (log && log.sprintLogs) {
          log.sprintLogs.forEach(sprint => {
            const mission = missions.find(m => m.id === sprint.missionId);
            allSprintLogs.push({
              ...sprint,
              missionText: mission?.text || '獨立衝刺'
            });
          });
        }
      });

      // 照衝刺開始時間降序排序 (最新的在最前)
      allSprintLogs.sort((a, b) => b.startTime - a.startTime);
      setSprintLogs(allSprintLogs);
    } catch (e) {
      console.error('載入專案資料失敗:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 新增正式任務
  const handleAddTask = async () => {
    if (!newTitle.trim()) {
      alert('請輸入任務名稱');
      return;
    }

    try {
      const missions = await storage.getWeeklyMissions();
      const newMission: WeeklyMission = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        text: newTitle.trim(),
        isCompleted: false,
        priority: newPriority,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      missions.push(newMission);
      await storage.saveWeeklyMissions(missions);
      setNewTitle('');
      await loadData();
    } catch (e) {
      console.error('新增任務失敗:', e);
    }
  };

  // 刪除正式任務
  const handleDeleteTask = async (missionId: string) => {
    if (!window.confirm('確定要刪除此任務嗎？這也會將它從今日規劃中移除。')) return;
    try {
      const missions = await storage.getWeeklyMissions();
      const updatedMissions = missions.filter(m => m.id !== missionId);
      await storage.saveWeeklyMissions(updatedMissions);

      // 同步移除今日戰役 (如果有選入)
      const todayLog = await storage.getTodayLog();
      const originalCount = todayLog.coreBattles.length;
      todayLog.coreBattles = todayLog.coreBattles.filter(b => b.missionId !== missionId);
      if (todayLog.coreBattles.length !== originalCount) {
        await storage.saveTodayLog(todayLog);
      }

      await loadData();
    } catch (e) {
      console.error('刪除任務失敗:', e);
    }
  };

  // 更新任務狀態
  const handleUpdateStatus = async (missionId: string, statusText: string) => {
    try {
      if (statusText === 'DONE') {
        const missions = await storage.getWeeklyMissions();
        const mission = missions.find(m => m.id === missionId);
        const notes = window.prompt(
          '請輸入執行備註 (Execution Notes)，這將同步至您的 Sheet 中：',
          mission?.notes || ''
        );
        if (notes === null) return; // 取消則不更新

        await sync.completeTaskWithNotes(missionId, notes || '');
      } else {
        // 標記為 incomplete
        const missions = await storage.getWeeklyMissions();
        const mission = missions.find(m => m.id === missionId);
        if (mission) {
          mission.isCompleted = false;
          await storage.saveWeeklyMissions(missions);
        }
      }
      await loadData();
    } catch (e) {
      console.error('更新任務狀態失敗:', e);
    }
  };

  // 更新優先級
  const handleUpdatePriority = async (missionId: string, priority: 'P1' | 'P2' | 'P3') => {
    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find(m => m.id === missionId);
      if (mission) {
        mission.priority = priority;
        await storage.saveWeeklyMissions(missions);
      }
      await loadData();
    } catch (e) {
      console.error('更新優先級失敗:', e);
    }
  };

  // 暫存備註變更
  const handleNotesChange = (missionId: string, value: string) => {
    setNotesInputs(prev => ({ ...prev, [missionId]: value }));
  };

  // 失去焦點時儲存備註
  const handleUpdateNotes = async (missionId: string) => {
    const value = notesInputs[missionId];
    if (value === undefined) return;

    try {
      const missions = await storage.getWeeklyMissions();
      const mission = missions.find(m => m.id === missionId);
      if (mission) {
        mission.notes = value;
        await storage.saveWeeklyMissions(missions);
      }
    } catch (e) {
      console.error('儲存備註失敗:', e);
    }
  };

  // 轉換收件匣為正式任務
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
      const newMission: WeeklyMission = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        text: row.text,
        isCompleted: false,
        priority: priority,
        notes: row.contextUrl ? `來源網頁: ${row.contextUrl}` : '',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      missions.push(newMission);
      await storage.saveWeeklyMissions(missions);

      // 標記 Inbox item 為已處理
      const inbox = await storage.getInboxItems();
      const item = inbox.find(i => i.id === row.id);
      if (item) {
        item.processed = true;
        await storage.saveInboxItems(inbox);
      }

      await loadData();
    } catch (e) {
      console.error('收件匣轉任務失敗:', e);
    }
  };

  // 刪除收件匣項目
  const handleDeleteInbox = async (id: string) => {
    if (!window.confirm('確定要刪除此收件匣項目嗎？')) return;
    try {
      const inbox = await storage.getInboxItems();
      const updatedInbox = inbox.filter(i => i.id !== id);
      await storage.saveInboxItems(updatedInbox);
      await loadData();
    } catch (e) {
      console.error('刪除收件匣項目失敗:', e);
    }
  };

  // 點擊同步試算表
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await sync.pullTasksFromSheets();
      await loadData();
    } catch (e) {
      console.error('同步失敗:', e);
      alert('同步失敗: ' + (e instanceof Error ? e.message : e));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-dark-primary tracking-tight">專案管理儀表板</h1>
          <p className="text-dark-muted mt-2">基於 Chrome Local Storage 與 Google Sheets/Notion 的單一資料庫實時同步</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 shadow-md ${
              isSyncing
                ? 'bg-dark-surface border-dark-border-subtle text-dark-muted cursor-not-allowed'
                : 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-500/30 hover:border-blue-500/50 text-blue-400'
            }`}
          >
            {isSyncing ? (
              <>
                <span className="animate-spin block h-4 w-4 border-2 border-dark-muted border-t-transparent rounded-full"></span>
                <span>同步中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>同步試算表任務</span>
              </>
            )}
          </button>
          <div className="text-xs px-3.5 py-2 bg-indigo-950/40 text-indigo-400 rounded-full font-semibold border border-indigo-900/40 flex items-center gap-1.5 shadow-md">
            <span>✨</span>
            <span>Gemini 同步大腦已上線</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-dark-surface p-1 rounded-xl mb-8 w-fit border border-dark-border-subtle">
        <button
          onClick={() => setActiveTab('taskPool')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'taskPool'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          🗂️ 任務池 (Task Pool) ({weeklyMissions.length})
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'inbox'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          📥 收件匣 (Inbox) ({inboxItems.length})
        </button>
        <button
          onClick={() => setActiveTab('sprintLogs')}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'sprintLogs'
              ? 'bg-dark-card text-dark-primary shadow-md border border-dark-border-subtle/50'
              : 'text-dark-secondary hover:text-dark-primary'
          }`}
        >
          ⏱️ 番茄鐘日誌 (Sprint Logs) ({sprintLogs.length})
        </button>
      </div>

      {/* Content */}
      <div className="bg-dark-card rounded-2xl shadow-lg border border-dark-border-subtle overflow-hidden">
        
        {/* TAB 1: Task Pool */}
        {activeTab === 'taskPool' && (
          <div className="p-6">
            {/* 快速新增任務 */}
            <div className="mb-6 bg-dark-surface p-4 rounded-xl border border-dark-border-subtle flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="輸入新任務名稱，按下 Enter 或點擊按鈕新增..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="flex-1 min-w-[260px] px-3.5 py-2 bg-dark-card border border-dark-border-default rounded-lg text-sm text-dark-primary outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-dark-muted"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-dark-secondary font-medium">優先級:</span>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="px-3 py-2 bg-dark-card border border-dark-border-default rounded-lg text-sm text-dark-primary outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                >
                  <option value="P1">P1 (高)</option>
                  <option value="P2">P2 (中)</option>
                  <option value="P3">P3 (低)</option>
                </select>
              </div>
              <button
                onClick={handleAddTask}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-md shadow-blue-950/40"
              >
                ➕ 新增任務
              </button>
            </div>

            {/* 欄位篩選工具列 */}
            <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-dark-secondary bg-dark-base p-3 rounded-xl border border-dark-border-subtle">
              <span className="font-semibold text-dark-muted flex items-center gap-1">
                ⚙️ 顯示欄位:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.taskId}
                  onChange={(e) => setVisibleColumns({...visibleColumns, taskId: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Task ID
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.title}
                  onChange={(e) => setVisibleColumns({...visibleColumns, title: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Title
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.status}
                  onChange={(e) => setVisibleColumns({...visibleColumns, status: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Status
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.priority}
                  onChange={(e) => setVisibleColumns({...visibleColumns, priority: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Priority
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.notes}
                  onChange={(e) => setVisibleColumns({...visibleColumns, notes: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Execution Notes
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
                <input
                  type="checkbox"
                  checked={visibleColumns.createdAt}
                  onChange={(e) => setVisibleColumns({...visibleColumns, createdAt: e.target.checked})}
                  className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                Created At
              </label>
            </div>

            {weeklyMissions.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">
                <span className="text-4xl block mb-2">🗂️</span>
                目前任務池中沒有任何任務，請在上方新增或同步試算表。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-dark-secondary">
                  <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
                    <tr>
                      {visibleColumns.taskId && <th className="px-6 py-4">Task ID</th>}
                      {visibleColumns.title && <th className="px-6 py-4">Title</th>}
                      {visibleColumns.status && <th className="px-6 py-4">Status</th>}
                      {visibleColumns.priority && <th className="px-6 py-4">Priority</th>}
                      {visibleColumns.notes && <th className="px-6 py-4 min-w-[200px] max-w-[350px]">Execution Notes</th>}
                      {visibleColumns.createdAt && <th className="px-6 py-4">Created At</th>}
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border-subtle">
                    {weeklyMissions.map((row) => {
                      // 映射 Status 狀態
                      let statusText = row.isCompleted ? 'DONE' : 'TODO';
                      if (!row.isCompleted && inProgressIds.includes(row.id)) {
                        statusText = 'IN_PROGRESS';
                      }

                      return (
                        <tr key={row.id} className="hover:bg-dark-hover/40 transition-colors">
                          {visibleColumns.taskId && (
                            <td className="px-6 py-4 font-mono text-xs text-dark-muted max-w-[80px] truncate" title={row.id}>
                              {row.id.substring(0, 10)}
                            </td>
                          )}
                          {visibleColumns.title && (
                            <td className="px-6 py-4 font-medium text-dark-primary">
                              <span className={row.isCompleted ? 'line-through text-slate-500' : ''}>
                                {row.text}
                              </span>
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4">
                              <select
                                value={statusText}
                                onChange={(e) => handleUpdateStatus(row.id, e.target.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border cursor-pointer outline-none transition-all ${
                                  statusText === 'DONE' ? 'bg-green-950/40 text-green-400 border-green-800/40' :
                                  statusText === 'TODO' ? 'bg-dark-surface text-dark-muted border-dark-border-default' :
                                  'bg-blue-950/40 text-blue-400 border-blue-900/40'
                                }`}
                              >
                                <option value="TODO">TODO</option>
                                <option value="IN_PROGRESS" disabled>IN_PROGRESS</option>
                                <option value="DONE">DONE</option>
                              </select>
                            </td>
                          )}
                          {visibleColumns.priority && (
                            <td className="px-6 py-4">
                              <select
                                value={row.priority || 'P2'}
                                onChange={(e) => handleUpdatePriority(row.id, e.target.value as any)}
                                className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer outline-none bg-dark-card transition-all ${
                                  row.priority === 'P1' ? 'text-red-400 border-red-800/40' :
                                  row.priority === 'P3' ? 'text-dark-muted border-dark-border-default' :
                                  'text-blue-400 border-blue-900/40'
                                }`}
                              >
                                <option value="P1">P1 (高)</option>
                                <option value="P2">P2 (中)</option>
                                <option value="P3">P3 (低)</option>
                              </select>
                            </td>
                          )}
                          {visibleColumns.notes && (
                            <td className="px-6 py-4 min-w-[200px] max-w-[350px]">
                              <textarea
                                value={notesInputs[row.id] !== undefined ? notesInputs[row.id] : (row.notes || '')}
                                onChange={(e) => handleNotesChange(row.id, e.target.value)}
                                onBlur={() => handleUpdateNotes(row.id)}
                                placeholder="點選輸入執行備忘..."
                                rows={3}
                                className="bg-dark-base hover:bg-dark-surface border border-dark-border-default/40 hover:border-dark-border-default focus:border-blue-500 outline-none text-xs text-dark-primary w-full py-1 px-2 rounded resize-y transition-all font-sans whitespace-pre-wrap break-all"
                              />
                            </td>
                          )}
                          {visibleColumns.createdAt && (
                            <td className="px-6 py-4 text-xs text-dark-muted">
                              {row.createdAt || '-'}
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteTask(row.id)}
                              className="px-2.5 py-1 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors font-medium"
                            >
                              ❌ 刪除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Inbox */}
        {activeTab === 'inbox' && (
          <div className="p-6">
            {inboxItems.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">
                <span className="text-4xl block mb-2">📥</span>
                收件匣空空如也。請使用閃電捕捉快速記下零碎想法！
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-dark-secondary">
                  <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Captured Text</th>
                      <th className="px-6 py-4">Context URL</th>
                      <th className="px-6 py-4">Created At</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border-subtle">
                    {inboxItems.map((row) => (
                      <tr key={row.id} className="hover:bg-dark-hover/40 transition-colors">
                        <td className="px-6 py-4 text-dark-primary font-medium">{row.text}</td>
                        <td className="px-6 py-4 max-w-[200px] truncate text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">
                          {row.contextUrl ? (
                            <a href={row.contextUrl} target="_blank" rel="noopener noreferrer">
                              {row.contextUrl}
                            </a>
                          ) : (
                            <span className="text-dark-muted">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-dark-muted">{row.createdAt}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleConvertInbox(row)}
                            className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/40 border border-blue-900/50 text-blue-400 rounded-lg text-xs transition-colors font-semibold"
                          >
                            🗃️ 轉為任務
                          </button>
                          <button
                            onClick={() => handleDeleteInbox(row.id)}
                            className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors"
                          >
                            ❌ 刪除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Sprint Logs */}
        {activeTab === 'sprintLogs' && (
          <div className="p-6">
            {sprintLogs.length === 0 ? (
              <div className="text-center py-12 text-dark-muted">
                <span className="text-4xl block mb-2">⏱️</span>
                目前沒有任何番茄鐘衝刺紀錄。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-dark-secondary">
                  <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-4">Log ID</th>
                      <th className="px-6 py-4">Task Title</th>
                      <th className="px-6 py-4">Duration (Mins)</th>
                      <th className="px-6 py-4 w-1/2">Sprint Result</th>
                      <th className="px-6 py-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border-subtle">
                    {sprintLogs.map((row) => {
                      const minutes = Math.round((row.endTime - row.startTime) / 60000);
                      const formatTime = (ts: number) => {
                        const d = new Date(ts);
                        return d.toISOString().replace('T', ' ').substring(0, 16);
                      };
                      return (
                        <tr key={row.sprintId} className="hover:bg-dark-hover/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-dark-muted" title={row.sprintId}>
                            {row.sprintId.substring(0, 8)}
                          </td>
                          <td className="px-6 py-4 font-medium text-dark-primary">
                            {row.missionText}
                          </td>
                          <td className="px-6 py-4 font-semibold">{minutes || 25} 分鐘</td>
                          <td className="px-6 py-4 text-dark-primary">{row.result}</td>
                          <td className="px-6 py-4 text-xs text-dark-muted">{formatTime(row.startTime)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      <div className="mt-8 bg-blue-950/20 border border-blue-900/40 rounded-xl p-6 text-sm text-blue-300">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <span>ℹ️</span> 本地與雲端同步機制說明
        </h3>
        <p className="opacity-90 leading-relaxed text-dark-secondary">
          專案管理儀表板將 <strong>每週任務池 (Task Pool)</strong> 與番茄鐘完全綁定，您可以自由在此增刪、修改任務、指定優先權與完成狀態，這些修改會立即反映於番茄鐘首頁。
          當您完成一個番茄鐘並送出成果時，該筆記錄將被自動寫入 <strong>番茄鐘日誌 (Sprint Logs)</strong> 中。
          若您設定了 Google Sheet / Notion API，在標記任務完成時系統會即時推送備忘成果至雲端，亦可點選右上角按鈕手動同步拉取最新的雲端任務！
        </p>
      </div>
    </div>
  );
};