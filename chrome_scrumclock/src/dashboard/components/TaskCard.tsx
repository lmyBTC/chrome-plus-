import React, { useState } from 'react';
import { WeeklyMission, GTDStatus } from '../../types';

export interface TaskCardProps {
  task: WeeklyMission;
  isFocused: boolean;
  currentStatus: GTDStatus;
  onUpdateStatus: (id: string, status: GTDStatus) => Promise<void>;
  onToggleFocus?: (id: string) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onSelectTask?: (id: string) => void;
  onUpdateTitle?: (id: string, title: string) => Promise<void>;
  onUpdatePomodoroEstimate?: (id: string, estimate: number) => Promise<void>;
  onDragStart?: (e: React.DragEvent, task: WeeklyMission) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isFocused,
  currentStatus,
  onUpdateStatus,
  onToggleFocus,
  onDeleteTask,
  onSelectTask,
  onUpdateTitle,
  onUpdatePomodoroEstimate,
  onDragStart,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, task);
  };

  const handleSaveTitle = async () => {
    if (editText.trim() && editText !== task.text && onUpdateTitle) {
      await onUpdateTitle(task.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditText(task.text);
      setIsEditing(false);
    }
  };

  // 優先級顏色樣式
  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'P1':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'P2':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'P3':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-600/30';
    }
  };

  const spentPomodoros = task.spentPomodoros || 0;
  const estimatedPomodoros = task.estimatedPomodoros || 1;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelectTask?.(task.id)}
      className={`group relative p-3.5 bg-dark-card hover:bg-dark-hover/90 border rounded-xl shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing select-none ${
        isFocused
          ? 'border-indigo-500/60 ring-1 ring-indigo-500/30 bg-indigo-950/20'
          : task.isCompleted || currentStatus === 'done'
          ? 'border-dark-border-subtle/40 opacity-70 bg-dark-surface/40'
          : 'border-dark-border-subtle hover:border-dark-border-default'
      }`}
    >
      {/* 頂部 Meta 列：優先級標籤、情境/來源標籤、番茄鐘計數 */}
      <div className="flex items-center justify-between gap-1.5 mb-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getPriorityBadge(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          )}
          {task.gtdContext && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40">
              {task.gtdContext}
            </span>
          )}
          {task.ticker && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
              ${task.ticker}
            </span>
          )}
        </div>

        {/* 番茄鐘工時指標 (實際消耗 / 預估) */}
        <div
          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 transition-colors cursor-pointer ${
            spentPomodoros >= estimatedPomodoros && spentPomodoros > 0
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : spentPomodoros > 0
              ? 'bg-dark-surface/90 border-dark-border-default text-dark-primary'
              : 'bg-dark-surface/80 border-dark-border-subtle text-dark-secondary'
          }`}
          title={`番茄工時：已消耗 ${spentPomodoros} 顆 / 預估 ${estimatedPomodoros} 顆 (點擊可修改預估)`}
          onClick={(e) => {
            e.stopPropagation();
            if (onUpdatePomodoroEstimate) {
              const val = window.prompt('設定預估番茄鐘數 (顆)：', String(estimatedPomodoros));
              if (val !== null) {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num > 0) {
                  onUpdatePomodoroEstimate(task.id, num);
                }
              }
            }
          }}
        >
          <span className="text-red-400 text-xs">🍅</span>
          <span className={spentPomodoros > 0 ? 'text-amber-400 font-bold' : ''}>
            {spentPomodoros}
          </span>
          <span className="text-dark-muted">/</span>
          <span className="text-dark-secondary">{estimatedPomodoros}</span>
        </div>
      </div>

      {/* 標題與行內編輯 */}
      <div className="mb-2">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 bg-dark-surface border border-indigo-500 rounded text-sm text-dark-primary outline-none"
          />
        ) : (
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className={`text-sm font-medium leading-snug line-clamp-3 transition-colors ${
              task.isCompleted || currentStatus === 'done'
                ? 'line-through text-dark-muted'
                : 'text-dark-primary group-hover:text-white'
            }`}
            title="雙擊編輯標題，單擊展開詳情"
          >
            {task.text}
          </div>
        )}
      </div>

      {/* 備忘與網址摘要 (若有) */}
      {(task.notes || task.url) && (
        <div className="flex items-center gap-2 mb-2 text-[11px] text-dark-muted">
          {task.notes && (
            <span className="flex items-center gap-0.5 truncate max-w-[160px]" title={task.notes}>
              <span>📝</span>
              <span className="truncate">{task.notes}</span>
            </span>
          )}
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5 shrink-0"
              title={task.url}
            >
              <span>🔗</span>
              <span>網址</span>
            </a>
          )}
        </div>
      )}

      {/* 底部 GTD 快速流轉操作按鈕 (Quick Actions) */}
      <div
        className="mt-2.5 pt-2 border-t border-dark-border-subtle/40 flex items-center justify-between gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側一鍵釐清/推進按鈕 */}
        <div className="flex items-center gap-1 flex-wrap">
          {currentStatus === 'inbox' && (
            <>
              <button
                onClick={() => onUpdateStatus(task.id, 'next-action')}
                className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="轉入 Next Action (下一步行動池)"
              >
                <span>⚡</span>
                <span>Next Action</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'someday')}
                className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-all flex items-center gap-0.5 cursor-pointer"
                title="暫存至 Someday (日後也許)"
              >
                <span>💡</span>
                <span>暫存</span>
              </button>
            </>
          )}

          {currentStatus === 'next-action' && (
            <>
              <button
                onClick={() => onUpdateStatus(task.id, 'in-progress')}
                className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="推進至 In Progress (今日焦點衝刺)"
              >
                <span>🎯</span>
                <span>推進 Doing</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'done')}
                className="px-1.5 py-1 rounded bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[10px] transition-all cursor-pointer"
                title="直接標記為完成"
              >
                <span>✅</span>
              </button>
            </>
          )}

          {currentStatus === 'in-progress' && (
            <>
              <button
                onClick={() => onUpdateStatus(task.id, 'done')}
                className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="完成此焦點戰役"
              >
                <span>✅</span>
                <span>完成</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'next-action')}
                className="px-1.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 text-[10px] transition-all cursor-pointer"
                title="移回下一步行動池"
              >
                <span>⏸️</span>
                <span>暫緩</span>
              </button>
            </>
          )}

          {currentStatus === 'someday' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'next-action')}
              className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="喚醒並轉入 Next Action"
            >
              <span>⚡</span>
              <span>移至行動</span>
            </button>
          )}

          {currentStatus === 'done' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'next-action')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] transition-all flex items-center gap-1 cursor-pointer"
              title="重新啟動為下一步行動"
            >
              <span>↩️</span>
              <span>重啟</span>
            </button>
          )}
        </div>

        {/* 右側：刪除按鈕 */}
        {onDeleteTask && (
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1 rounded text-dark-muted hover:text-red-400 hover:bg-red-950/20 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="刪除此任務"
          >
            <span className="text-[11px]">🗑️</span>
          </button>
        )}
      </div>
    </div>
  );
};
