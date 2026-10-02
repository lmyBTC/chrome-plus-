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
}) => {
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 1;

  return (
    <div className="p-6">
      {/* 核心職責引導橫幅 */}
      <div className="mb-6 bg-blue-950/20 border border-blue-800/40 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-blue-200">
          <span className="text-xl">💡</span>
          <div>
            <span className="font-semibold text-white">規劃態核心中樞 (Backlog SSOT)：</span>
            <span className="text-blue-300/90 ml-1">
              在此整理每週任務與排程。點擊「🎯 推入今日」即可一鍵派送至番茄鐘作為今日焦點戰役；點擊「✨ AI 拆解」可細化大型任務。
            </span>
          </div>
        </div>
      </div>

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
                <th className="px-6 py-4 text-right min-w-[240px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border-subtle">
              {weeklyMissions.map((row) => {
                const isFocused = inProgressIds.includes(row.id);
                let statusText = row.isCompleted ? 'DONE' : 'TODO';
                if (!row.isCompleted && isFocused) {
                  statusText = 'IN_PROGRESS';
                }
                const taskSubtasks = subtasks && subtasks[row.id];

                return (
                  <React.Fragment key={row.id}>
                    <tr className="hover:bg-dark-hover/40 transition-colors">
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 今日焦點開關 */}
                          {isFocused ? (
                            <button
                              onClick={() => onToggleFocus(row.id)}
                              className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 text-amber-300 rounded-lg text-xs transition-colors font-medium flex items-center gap-1 cursor-pointer"
                              title="已在今日焦點中，點擊從今日番茄鐘移除"
                            >
                              <span>🔥</span>
                              <span>焦點中</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onToggleFocus(row.id)}
                              disabled={row.isCompleted}
                              className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-blue-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-colors font-medium flex items-center gap-1 cursor-pointer"
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
                            className="px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 text-indigo-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs transition-colors font-medium flex items-center gap-1 cursor-pointer"
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
                            className="px-2.5 py-1 bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-400 rounded-lg text-xs transition-colors font-medium cursor-pointer"
                          >
                            ❌
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
    </div>
  );
};
