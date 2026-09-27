import React from 'react';
import { TaskPoolTabProps } from './types';

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
  onAddTask,
  onDeleteTask,
  onUpdateStatus,
  onUpdatePriority,
  onNotesChange,
  onUpdateNotes,
}) => {
  return (
    <div className="p-6">
      {/* 快速新增任務 */}
      <div className="mb-6 bg-dark-surface p-4 rounded-xl border border-dark-border-subtle flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="輸入新任務名稱，按下 Enter 或點擊按鈕新增..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTask()}
          className="flex-1 min-w-[260px] px-3.5 py-2 bg-dark-card border border-dark-border-default rounded-lg text-sm text-dark-primary outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-dark-muted"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-secondary font-medium">優先級:</span>
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'P1' | 'P2' | 'P3')}
            className="px-3 py-2 bg-dark-card border border-dark-border-default rounded-lg text-sm text-dark-primary outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
          >
            <option value="P1">P1 (高)</option>
            <option value="P2">P2 (中)</option>
            <option value="P3">P3 (低)</option>
          </select>
        </div>
        <button
          onClick={onAddTask}
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
            onChange={(e) => setVisibleColumns({ ...visibleColumns, taskId: e.target.checked })}
            className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          Task ID
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
          <input
            type="checkbox"
            checked={visibleColumns.title}
            onChange={(e) => setVisibleColumns({ ...visibleColumns, title: e.target.checked })}
            className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          Title
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
          <input
            type="checkbox"
            checked={visibleColumns.status}
            onChange={(e) => setVisibleColumns({ ...visibleColumns, status: e.target.checked })}
            className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          Status
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
          <input
            type="checkbox"
            checked={visibleColumns.priority}
            onChange={(e) => setVisibleColumns({ ...visibleColumns, priority: e.target.checked })}
            className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          Priority
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
          <input
            type="checkbox"
            checked={visibleColumns.notes}
            onChange={(e) => setVisibleColumns({ ...visibleColumns, notes: e.target.checked })}
            className="rounded border-dark-border-default bg-dark-card text-blue-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          Execution Notes
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer bg-dark-surface hover:bg-dark-hover px-3 py-1.5 rounded-full border border-dark-border-default transition-colors">
          <input
            type="checkbox"
            checked={visibleColumns.createdAt}
            onChange={(e) => setVisibleColumns({ ...visibleColumns, createdAt: e.target.checked })}
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
                        {row.progressPercent !== undefined && (
                          <div className="mt-2 w-full max-w-[200px]">
                            <div className="flex justify-between items-center text-[10px] text-dark-muted mb-1">
                              <span>進度</span>
                              <span className="font-semibold text-emerald-400">{row.progressPercent}%</span>
                            </div>
                            <div className="w-full bg-dark-base rounded-full h-1.5 overflow-hidden border border-dark-border-subtle/30">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${row.progressPercent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <select
                          value={row.priority || 'P2'}
                          onChange={(e) => onUpdatePriority(row.id, e.target.value as 'P1' | 'P2' | 'P3')}
                          className={`px-2 py-0.5 rounded text-xs font-bold border cursor-pointer outline-none bg-dark-card transition-all ${
                            row.priority === 'P1'
                              ? 'text-red-400 border-red-800/40'
                              : row.priority === 'P3'
                              ? 'text-dark-muted border-dark-border-default'
                              : 'text-blue-400 border-blue-900/40'
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
                          value={notesInputs[row.id] !== undefined ? notesInputs[row.id] : row.notes || ''}
                          onChange={(e) => onNotesChange(row.id, e.target.value)}
                          onBlur={() => onUpdateNotes(row.id)}
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
                        onClick={() => onDeleteTask(row.id)}
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
  );
};
