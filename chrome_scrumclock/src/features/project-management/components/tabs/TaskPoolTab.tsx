import React, { useState, useRef, useEffect } from 'react';
import { TaskPoolTabProps } from './types';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { BoardView } from '../../../../dashboard/components/BoardView';

export const TaskPoolTab: React.FC<TaskPoolTabProps> = ({
  weeklyMissions,
  inProgressIds,
  visibleColumns,
  setVisibleColumns,
  newTitle,
  setNewTitle,
  newPriority,
  setNewPriority,
  notesInputs,
  breakingDownId,
  subtasks,
  onAddTask,
  onDeleteTask,
  onUpdateStatus,
  onUpdatePriority,
  onNotesChange,
  onUpdateNotes,
  onToggleFocus,
  onBreakdownTask,
  onApplySubtasks,
  onDismissSubtasks,
  onUpdateTitle,
  selectedTaskId,
  onSelectTask,
  onBatchPushToFocus,
  onBatchUpdateStatus,
  onBatchDelete,
  onSyncGoogleTasks,
  isGoogleSyncing,
  onScheduleTimebox,
  isSchedulingCalendar,
  onUpdatePomodoroEstimate,
  onUpdateChecklist,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(() => {
    try {
      return (localStorage.getItem('scrumclock_taskpool_view') as 'kanban' | 'table') || 'kanban';
    } catch {
      return 'kanban';
    }
  });

  const handleSetViewMode = (mode: 'kanban' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('scrumclock_taskpool_view', mode);
    } catch {}
  };

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const currentSelectedId = selectedTaskId !== undefined ? selectedTaskId : internalSelectedId;
  const handleSelectRow = (id: string) => {
    setInternalSelectedId(id);
    onSelectTask?.(id);
  };

  const handleCloseDrawer = () => {
    setInternalSelectedId(null);
    onSelectTask?.(null);
  };

  const selectedTask = weeklyMissions.find((m) => m.id === currentSelectedId) || null;
  const isDrawerOpen = Boolean(selectedTask);

  // 任務多選 (Multi-select) 狀態
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // 當 weeklyMissions 更新時過濾已不存在的 ID
  useEffect(() => {
    const validIds = new Set(weeklyMissions.map((m) => m.id));
    setSelectedBatchIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [weeklyMissions]);

  const isAllSelected = weeklyMissions.length > 0 && selectedBatchIds.length === weeklyMissions.length;
  const isPartiallySelected = selectedBatchIds.length > 0 && !isAllSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBatchIds(weeklyMissions.map((m) => m.id));
    } else {
      setSelectedBatchIds([]);
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  const startEditingTitle = (id: string, text: string) => {
    setEditingTitleId(id);
    setEditingTitleText(text);
  };

  const finishEditingTitle = async (id: string) => {
    if (editingTitleId === id && onUpdateTitle && editingTitleText.trim()) {
      await onUpdateTitle(id, editingTitleText.trim());
    }
    setEditingTitleId(null);
  };
  const [showBanner, setShowBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('scrumclock_hide_backlog_banner') !== 'true';
    } catch {
      return true;
    }
  });

  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(event.target as Node)) {
        setIsColumnsOpen(false);
      }
    };
    if (isColumnsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnsOpen]);

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem('scrumclock_hide_backlog_banner', 'true');
    } catch (e) {
      // ignore
    }
  };

  const handleShowBanner = () => {
    setShowBanner(true);
    try {
      localStorage.removeItem('scrumclock_hide_backlog_banner');
    } catch (e) {
      // ignore
    }
  };

  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 2;

  return (
    <div className="p-6">
      {/* 核心職責引導橫幅 (可收合) */}
      {showBanner ? (
        <div className="mb-5 bg-blue-950/20 border border-blue-800/40 rounded-xl p-3.5 flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-2.5 text-xs text-blue-200">
            <span className="text-base">💡</span>
            <div>
              <span className="font-semibold text-white">規劃態核心中樞 (Backlog SSOT)：</span>
              <span className="text-blue-300/90 ml-1">
                在此整理每週任務與排程。點擊「🎯 推入今日」即可一鍵派送至番茄鐘作為今日焦點戰役；點擊「✨ AI 拆解」可細化大型任務。
              </span>
            </div>
          </div>
          <button
            onClick={handleDismissBanner}
            className="text-blue-400/80 hover:text-blue-200 text-xs px-2 py-1 rounded hover:bg-blue-900/30 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            title="收合說明橫幅以釋放畫面空間"
          >
            <span>✕</span>
            <span>收起</span>
          </button>
        </div>
      ) : null}

      {/* 整合式快速新增與視圖工具列 */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-dark-surface p-2.5 rounded-xl border border-dark-border-subtle shadow-sm">
        {/* 左側：快速新增任務表單 */}
        <div className="flex-1 min-w-[300px] flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="輸入新任務名稱，按下 Enter 快速新增..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
              className="w-full pl-3.5 pr-14 py-2 bg-dark-card border border-dark-border-default/70 rounded-lg text-sm text-dark-primary outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-dark-muted"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-dark-muted bg-dark-base px-1.5 py-0.5 rounded border border-dark-border-subtle select-none pointer-events-none">
              ↵ Enter
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-dark-card border border-dark-border-default/70 rounded-lg">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                newPriority === 'P0' ? 'bg-rose-500 animate-pulse' : newPriority === 'P1' ? 'bg-red-500' : newPriority === 'P2' ? 'bg-amber-500' : 'bg-blue-400'
              }`}
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'P0' | 'P1' | 'P2' | 'P3')}
              className="bg-transparent text-xs font-semibold text-dark-primary outline-none cursor-pointer pr-1"
            >
              <option value="P0" className="bg-dark-card text-rose-400 font-bold">🚨 P0 (Blocker)</option>
              <option value="P1" className="bg-dark-card text-dark-primary">P1 (高)</option>
              <option value="P2" className="bg-dark-card text-dark-primary">P2 (中)</option>
              <option value="P3" className="bg-dark-card text-dark-primary">P3 (低)</option>
            </select>
          </div>

          <button
            onClick={onAddTask}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-blue-950/40 active:scale-95 cursor-pointer shrink-0"
          >
            <span>➕</span>
            <span>新增</span>
          </button>
        </div>

        {/* 右側：視圖切換、欄位設定與說明開關 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 看板 / 表格 切換 */}
          <div className="flex items-center bg-dark-card border border-dark-border-default/70 rounded-lg p-0.5">
            <button
              onClick={() => handleSetViewMode('kanban')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
              title="切換至 GTD 敏捷看板檢視"
            >
              <span>📊</span>
              <span>看板</span>
            </button>
            <button
              onClick={() => handleSetViewMode('table')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-dark-secondary hover:text-dark-primary'
              }`}
              title="切換至清單表格檢視"
            >
              <span>📋</span>
              <span>表格</span>
            </button>
          </div>

          {onSyncGoogleTasks && (
            <button
              onClick={onSyncGoogleTasks}
              disabled={isGoogleSyncing}
              className={`px-2.5 py-1.5 bg-dark-card hover:bg-dark-hover border border-dark-border-default/60 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                isGoogleSyncing ? 'text-dark-muted opacity-60' : 'text-emerald-400 hover:text-emerald-300'
              }`}
              title="與 Google Tasks 進行雙向同步"
            >
              <span>{isGoogleSyncing ? '⏳' : '📋'}</span>
              <span>{isGoogleSyncing ? '同步中...' : 'Google Tasks'}</span>
            </button>
          )}

          {!showBanner && (
            <button
              onClick={handleShowBanner}
              className="px-2.5 py-1.5 bg-dark-card hover:bg-dark-hover border border-dark-border-default/60 rounded-lg text-xs text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="展開規劃說明"
            >
              <span>💡</span>
              <span>說明</span>
            </button>
          )}

          {/* 欄位顯示下拉選單 */}
          <div className="relative" ref={columnsDropdownRef}>
            <button
              onClick={() => setIsColumnsOpen(!isColumnsOpen)}
              className="px-3 py-1.5 bg-dark-card hover:bg-dark-hover border border-dark-border-default/70 rounded-lg text-xs font-medium text-dark-secondary hover:text-dark-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>⚙️</span>
              <span>顯示欄位</span>
              <span className="text-[10px] text-dark-muted">▼</span>
            </button>

            {isColumnsOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-dark-surface border border-dark-border-subtle rounded-xl p-2.5 shadow-xl z-30 flex flex-col gap-1 text-xs">
                <div className="px-2 py-1 text-[11px] font-semibold text-dark-muted border-b border-dark-border-subtle/50 mb-1">
                  切換欄位顯示
                </div>
                {[
                  { key: 'taskId' as const, label: 'Task ID' },
                  { key: 'title' as const, label: 'Title (標題)' },
                  { key: 'status' as const, label: 'Status (狀態)' },
                  { key: 'priority' as const, label: 'Priority (優先級)' },
                  { key: 'notes' as const, label: 'Execution Notes (備忘)' },
                  { key: 'createdAt' as const, label: 'Created At (建立時間)' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-dark-hover/60 rounded-lg cursor-pointer transition-colors text-dark-secondary hover:text-dark-primary"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={(e) => setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })}
                      className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <BoardView
          weeklyMissions={weeklyMissions}
          inProgressIds={inProgressIds}
          onAddTask={async (title, status) => {
            setNewTitle(title);
            await onAddTask();
          }}
          onUpdateStatus={onUpdateStatus as any}
          onDeleteTask={onDeleteTask}
          onToggleFocus={onToggleFocus}
          onSelectTask={(id) => (id ? handleSelectRow(id) : handleCloseDrawer())}
          onUpdateTitle={onUpdateTitle}
          onUpdatePomodoroEstimate={onUpdatePomodoroEstimate}
          onSyncGoogleTasks={onSyncGoogleTasks}
          isGoogleSyncing={isGoogleSyncing}
        />
      ) : (
        <>
          {weeklyMissions.length === 0 ? (
            <div className="text-center py-12 text-dark-muted">
              <span className="text-4xl block mb-2">🗂️</span>
              目前任務池中沒有任何任務，請在上方新增或同步試算表。
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-dark-border-subtle">
              <table className="w-full text-left text-sm text-dark-secondary table-auto">
            <thead className="bg-dark-surface text-dark-primary border-b border-dark-border-subtle text-xs uppercase font-semibold">
              <tr>
                <th className="px-3 py-3 w-[44px] text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    title="全選 / 取消全選"
                  />
                </th>
                {visibleColumns.taskId && <th className="px-4 py-3 w-[85px] whitespace-nowrap">Task ID</th>}
                {visibleColumns.title && <th className="px-4 py-3 min-w-[260px] w-full">Title</th>}
                {visibleColumns.status && <th className="px-4 py-3 w-[110px] whitespace-nowrap">Status</th>}
                {visibleColumns.priority && <th className="px-4 py-3 w-[95px] whitespace-nowrap">Priority</th>}
                {visibleColumns.notes && <th className="px-4 py-3 w-[200px] whitespace-nowrap">Execution Notes</th>}
                {visibleColumns.createdAt && <th className="px-4 py-3 w-[110px] whitespace-nowrap">Created At</th>}
                <th className="px-4 py-3 text-right w-[200px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-subtle">
              {weeklyMissions.map((row) => {
                const isSelected = currentSelectedId === row.id;
                const isBatchChecked = selectedBatchIds.includes(row.id);
                const isFocused = inProgressIds.includes(row.id);
                let statusText = row.isCompleted ? 'DONE' : 'TODO';
                if (!row.isCompleted && isFocused) {
                  statusText = 'IN_PROGRESS';
                }
                const taskSubtasks = subtasks && subtasks[row.id];

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => handleSelectRow(row.id)}
                      className={`group transition-all cursor-pointer ${
                        isBatchChecked
                          ? 'bg-blue-950/35 ring-1 ring-inset ring-blue-500/40'
                          : isSelected
                          ? 'bg-blue-950/25 border-l-2 border-l-blue-500'
                          : 'hover:bg-dark-hover/40'
                      }`}
                    >
                      <td className="px-3 py-2.5 text-center w-[44px]" onClick={(e) => handleToggleSelectRow(row.id, e)}>
                        <input
                          type="checkbox"
                          checked={isBatchChecked}
                          onChange={() => {}}
                          className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      {visibleColumns.taskId && (
                        <td className="px-4 py-2.5 font-mono text-xs text-dark-muted max-w-[80px] truncate" title={row.id}>
                          {row.id.substring(0, 10)}
                        </td>
                      )}
                      {visibleColumns.title && (
                        editingTitleId === row.id ? (
                          <td className="px-4 py-2 font-medium text-dark-primary" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitleText}
                              onChange={(e) => setEditingTitleText(e.target.value)}
                              onBlur={() => finishEditingTitle(row.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') finishEditingTitle(row.id);
                                if (e.key === 'Escape') setEditingTitleId(null);
                              }}
                              autoFocus
                              className="w-full px-2.5 py-1 bg-dark-base border border-blue-500 rounded text-sm text-dark-primary outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        ) : (
                          <td className="px-4 py-2.5 font-medium text-dark-primary">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  startEditingTitle(row.id, row.text);
                                }}
                                className={`select-none ${row.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}
                                title="按兩下可編輯任務標題"
                              >
                                {row.text}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingTitle(row.id, row.text);
                                }}
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-xs text-dark-muted hover:text-dark-primary transition-opacity cursor-pointer p-0.5 rounded"
                                title="編輯標題"
                              >
                                ✏️
                              </button>
                              {row.checklist && row.checklist.length > 0 && (() => {
                                const completedCount = row.checklist.filter((i) => i.completed).length;
                                const totalCount = row.checklist.length;
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border select-none ${
                                      completedCount === totalCount
                                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                        : 'bg-dark-base text-blue-300 border-blue-900/40'
                                    }`}
                                    title={`Checklist 查核進度：${completedCount}/${totalCount}`}
                                  >
                                    <span>☑</span>
                                    <span>{completedCount}/{totalCount}</span>
                                  </span>
                                );
                              })()}
                              {row.progressPercent !== undefined && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[10px] text-emerald-400 font-semibold">
                                  <span>{row.progressPercent}%</span>
                                  <div className="w-10 bg-dark-base rounded-full h-1 overflow-hidden border border-dark-border-subtle/30">
                                    <div
                                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${row.progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {row.workspaceSync?.googleTaskId && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-950/40 text-blue-400 border border-blue-800/40 select-none"
                                  title={`已連動 Google Tasks (狀態: ${row.workspaceSync.syncStatus || 'synced'})`}
                                >
                                  <span>📋</span>
                                  <span>Google</span>
                                </span>
                              )}
                              {row.workspaceSync?.googleCalendarEventId && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-400 border border-amber-800/40 select-none"
                                  title="已排定 Google Calendar 時間箱"
                                >
                                  <span>📅</span>
                                  <span>時間箱</span>
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      )}
                      {visibleColumns.status && (
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={statusText}
                            onChange={(e) => onUpdateStatus(row.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border cursor-pointer outline-none transition-all ${
                              statusText === 'DONE'
                                ? 'bg-green-950/40 text-green-400 border-green-800/40'
                                : statusText === 'TODO'
                                ? 'bg-dark-surface text-dark-muted border-dark-border-default'
                                : 'bg-blue-950/40 text-blue-400 border-blue-900/40'
                            }`}
                          >
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS" disabled>
                              IN_PROGRESS
                            </option>
                            <option value="DONE">DONE</option>
                          </select>
                        </td>
                      )}
                      {visibleColumns.priority && (
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={row.priority || 'P2'}
                            onChange={(e) => onUpdatePriority(row.id, e.target.value as 'P0' | 'P1' | 'P2' | 'P3')}
                            className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer outline-none bg-dark-card transition-all ${
                              row.priority === 'P0'
                                ? 'text-rose-400 border-rose-600 bg-rose-950/40 font-extrabold'
                                : row.priority === 'P1'
                                ? 'text-red-400 border-red-800/40'
                                : row.priority === 'P3'
                                ? 'text-dark-muted border-dark-border-default'
                                : 'text-blue-400 border-blue-900/40'
                            }`}
                          >
                            <option value="P0">🚨 P0 (Blocker)</option>
                            <option value="P1">P1 (高)</option>
                            <option value="P2">P2 (中)</option>
                            <option value="P3">P3 (低)</option>
                          </select>
                        </td>
                      )}
                      {visibleColumns.notes && (
                        editingNotesId === row.id ? (
                          <td className="px-4 py-2 w-[200px]" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={notesInputs[row.id] !== undefined ? notesInputs[row.id] : row.notes || ''}
                              onChange={(e) => onNotesChange(row.id, e.target.value)}
                              onBlur={() => {
                                onUpdateNotes(row.id);
                                setEditingNotesId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onUpdateNotes(row.id);
                                  setEditingNotesId(null);
                                }
                                if (e.key === 'Escape') setEditingNotesId(null);
                              }}
                              placeholder="輸入執行備忘..."
                              autoFocus
                              className="w-full bg-dark-base border border-blue-500 rounded text-xs text-dark-primary px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        ) : (
                          <td className="px-4 py-2.5 w-[200px]">
                            {row.notes ? (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNotesId(row.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-dark-base hover:bg-dark-surface border border-dark-border-subtle/70 rounded-md text-xs text-dark-secondary hover:text-dark-primary max-w-[190px] transition-colors cursor-pointer group/notes"
                                title={`執行備忘: ${row.notes} (點擊修改)`}
                              >
                                <span className="text-[11px] opacity-75">📝</span>
                                <span className="truncate">{row.notes}</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNotesId(row.id);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] text-dark-muted hover:text-dark-secondary px-2 py-1 rounded hover:bg-dark-hover/40 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                                title="點擊新增執行備忘"
                              >
                                <span>+ 備忘</span>
                              </button>
                            )}
                          </td>
                        )
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-4 py-2.5 text-xs text-dark-muted whitespace-nowrap">
                          {row.createdAt || '-'}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-right w-[200px]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {/* 今日焦點開關 */}
                          {isFocused ? (
                            <button
                              onClick={() => onToggleFocus(row.id)}
                              className="px-2.5 py-1 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 rounded-lg text-xs transition-colors font-medium flex items-center gap-1 cursor-pointer shrink-0"
                              title="已在今日焦點中，點擊從今日番茄鐘移除"
                            >
                              <span>🔥</span>
                              <span>焦點中</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onToggleFocus(row.id)}
                              disabled={row.isCompleted}
                              className={`px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-blue-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-all font-medium flex items-center gap-1 cursor-pointer shrink-0 ${
                                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title="推入今日番茄鐘焦點戰役"
                            >
                              <span>🎯</span>
                              <span>推入今日</span>
                            </button>
                          )}

                          {/* AI 拆解按鈕 */}
                          <button
                            onClick={() => onBreakdownTask(row.id)}
                            disabled={breakingDownId === row.id || row.isCompleted}
                            className={`px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-all font-medium flex items-center gap-1 cursor-pointer shrink-0 ${
                              isSelected || breakingDownId === row.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title="使用 Gemini AI 拆解任務為具體行動"
                          >
                            {breakingDownId === row.id ? (
                              <>
                                <span className="animate-spin block h-3 w-3 border-2 border-indigo-300 border-t-transparent rounded-full"></span>
                                <span>拆解中...</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                <span>AI 拆解</span>
                              </>
                            )}
                          </button>

                          {/* 刪除按鈕 */}
                          <button
                            onClick={() => onDeleteTask(row.id)}
                            className={`px-2.5 py-1 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 text-red-400 hover:text-red-300 rounded-lg text-xs transition-all font-medium cursor-pointer shrink-0 ${
                              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title="刪除任務"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* AI 拆解子任務展開面板 */}
                    {taskSubtasks && taskSubtasks.length > 0 && (
                      <tr className="bg-indigo-950/15 border-b border-indigo-900/30 animate-fade-in">
                        <td colSpan={visibleColumnCount} className="px-6 py-4">
                          <div className="bg-dark-base/80 p-4 rounded-xl border border-indigo-800/30">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <span>✨</span>
                                <span>AI 拆解建議子任務 (針對：{row.text})</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => onApplySubtasks(row.id)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                                >
                                  ➕ 批量轉入任務池
                                </button>
                                <button
                                  onClick={() => onDismissSubtasks(row.id)}
                                  className="px-2.5 py-1 bg-dark-surface hover:bg-dark-hover border border-dark-border-default text-dark-muted hover:text-dark-secondary rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  收起
                                </button>
                              </div>
                            </div>
                            <ul className="space-y-1.5 text-xs text-dark-secondary">
                              {taskSubtasks.map((st, i) => (
                                <li key={i} className="flex items-start gap-2 bg-dark-card/60 px-3 py-1.5 rounded-lg border border-dark-border-subtle/50">
                                  <span className="text-indigo-400 font-mono">#{i + 1}</span>
                                  <span>{st}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 懸浮批次操作工具列 (Linear 風格) */}
      {selectedBatchIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-dark-surface/95 backdrop-blur-md border border-dark-border-default/90 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-dark-border-subtle">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span className="text-xs font-semibold text-white whitespace-nowrap">
              已選取 <span className="text-blue-400 font-bold">{selectedBatchIds.length}</span> 項
            </span>
          </div>

          {/* 一鍵推入今日焦點 */}
          <button
            onClick={async () => {
              if (onBatchPushToFocus) {
                await onBatchPushToFocus(selectedBatchIds);
              } else {
                for (const id of selectedBatchIds) {
                  if (!inProgressIds.includes(id)) {
                    await onToggleFocus(id);
                  }
                }
              }
              setSelectedBatchIds([]);
            }}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md hover:shadow-blue-500/25 cursor-pointer whitespace-nowrap"
            title="將選取任務一次性加入今日焦點"
          >
            <span>🎯</span>
            <span>一鍵推入今日焦點</span>
          </button>

          {/* 批次調整狀態 */}
          <div className="flex items-center gap-1 bg-dark-base/80 p-0.5 rounded-xl border border-dark-border-subtle shrink-0">
            <button
              onClick={async () => {
                if (onBatchUpdateStatus) {
                  await onBatchUpdateStatus(selectedBatchIds, 'DONE');
                } else {
                  for (const id of selectedBatchIds) {
                    await onUpdateStatus(id, 'DONE');
                  }
                }
                setSelectedBatchIds([]);
              }}
              className="px-2.5 py-1 text-xs text-green-400 hover:bg-green-950/40 rounded-lg transition-colors font-medium cursor-pointer whitespace-nowrap"
              title="將選取任務批次標記為 DONE"
            >
              ✅ 標記完成
            </button>
            <button
              onClick={async () => {
                if (onBatchUpdateStatus) {
                  await onBatchUpdateStatus(selectedBatchIds, 'TODO');
                } else {
                  for (const id of selectedBatchIds) {
                    await onUpdateStatus(id, 'TODO');
                  }
                }
                setSelectedBatchIds([]);
              }}
              className="px-2.5 py-1 text-xs text-slate-300 hover:bg-dark-hover rounded-lg transition-colors font-medium cursor-pointer whitespace-nowrap"
              title="將選取任務批次標記為 TODO"
            >
              ↩️ 標記待辦
            </button>
          </div>

          {/* 批次刪除 */}
          {onBatchDelete && (
            <button
              onClick={async () => {
                await onBatchDelete(selectedBatchIds);
                setSelectedBatchIds([]);
              }}
              className="px-2.5 py-1.5 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              title="批次刪除選取任務"
            >
              🗑️ 刪除
            </button>
          )}

          {/* 取消選取 */}
          <button
            onClick={() => setSelectedBatchIds([])}
            className="text-dark-muted hover:text-dark-primary text-xs px-2 py-1 rounded hover:bg-dark-hover transition-colors cursor-pointer ml-1 whitespace-nowrap"
            title="取消所有選取"
          >
            ✕ 取消
          </button>
        </div>
      )}
        </>
      )}

      {/* 右側滑出式任務詳情抽屜 */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        isFocused={Boolean(selectedTask && inProgressIds.includes(selectedTask.id))}
        onToggleFocus={onToggleFocus}
        onUpdateTitle={onUpdateTitle}
        onUpdateStatus={onUpdateStatus}
        onUpdatePriority={onUpdatePriority}
        notesValue={
          selectedTask
            ? notesInputs[selectedTask.id] !== undefined
              ? notesInputs[selectedTask.id]
              : selectedTask.notes || ''
            : ''
        }
        onNotesChange={onNotesChange}
        onUpdateNotes={onUpdateNotes}
        onDeleteTask={onDeleteTask}
        onBreakdownTask={onBreakdownTask}
        isBreakingDown={Boolean(selectedTask && breakingDownId === selectedTask.id)}
        subtasks={selectedTask && subtasks ? subtasks[selectedTask.id] : undefined}
        onApplySubtasks={onApplySubtasks}
        onDismissSubtasks={onDismissSubtasks}
        onScheduleTimebox={onScheduleTimebox}
        isSchedulingCalendar={isSchedulingCalendar}
        onUpdateEstimatedPomodoros={onUpdatePomodoroEstimate}
        onUpdateChecklist={onUpdateChecklist}
      />
    </div>
  );
};
