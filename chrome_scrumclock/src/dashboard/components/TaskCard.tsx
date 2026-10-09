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
      case 'P0':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-extrabold ring-1 ring-rose-500/30';
      case 'P1':
        return 'bg-red-500/20 text-red-300 border-red-500/35 font-bold';
      case 'P2':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/35 font-semibold';
      case 'P3':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/35 font-medium';
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
      className={`group relative p-3.5 bg-dark-card hover:bg-dark-hover/90 border rounded-xl shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing select-none ${
        isFocused
          ? 'border-indigo-500/70 ring-1 ring-indigo-500/40 bg-gradient-to-br from-indigo-950/25 via-dark-card to-dark-card shadow-indigo-950/20'
          : task.isCompleted || currentStatus === 'done'
          ? 'border-dark-border-subtle/50 opacity-65 hover:opacity-90 bg-dark-surface/40'
          : 'border-dark-border-subtle/80 hover:border-dark-border-default/90'
      }`}
    >
      {/* 頂部 Meta 列：優先級標籤、情境/來源標籤、番茄鐘計數 */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.priority && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] tracking-wider shadow-xs ${getPriorityBadge(
                task.priority
              )}`}
            >
              {task.priority}
            </span>
          )}
          {task.gtdContext && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40 shadow-xs">
              {task.gtdContext}
            </span>
          )}
          {task.ticker && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 shadow-xs">
              ${task.ticker}
            </span>
          )}
          {task.checklist && task.checklist.length > 0 && (() => {
            const completedCount = task.checklist.filter((i) => i.completed).length;
            const totalCount = task.checklist.length;
            return (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-medium border tracking-wider select-none shadow-xs ${
                  completedCount === totalCount
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                    : 'bg-dark-surface/90 text-blue-300 border-blue-900/40'
                }`}
                title={`Checklist 查核進度：${completedCount}/${totalCount}`}
              >
                ☑ {completedCount}/{totalCount}
              </span>
            );
          })()}
          {task.workspaceSync?.googleTaskId && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border flex items-center gap-1 select-none tracking-wider shadow-xs ${
                task.workspaceSync.syncStatus === 'failed'
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                  : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
              }`}
              title={
                task.workspaceSync.syncStatus === 'failed'
                  ? 'Google Tasks 同步失敗 (已離線保留本地狀態，待下次連線重試)'
                  : '已雙向連動 Google Tasks'
              }
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span>G-Tasks</span>
              {task.workspaceSync.syncStatus === 'failed' && (
                <span className="text-rose-400 font-bold ml-0.5">!</span>
              )}
            </span>
          )}
        </div>

        {/* 番茄鐘工時指標 (實際消耗 / 預估) */}
        <div
          className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
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
      <div className="mb-2.5">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2.5 py-1 bg-dark-surface border border-indigo-500 rounded-lg text-sm text-dark-primary outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        ) : (
          <div className="flex items-start gap-2.5">
            {/* 一鍵完成/取消完成 Checkbox */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const isCurrentlyDone = task.isCompleted || currentStatus === 'done';
                onUpdateStatus(task.id, isCurrentlyDone ? 'next-action' : 'done');
              }}
              className={`mt-0.5 w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                task.isCompleted || currentStatus === 'done'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                  : 'bg-dark-surface/90 border-dark-border-default/80 hover:border-emerald-500/80 text-transparent hover:text-emerald-400/50 hover:bg-emerald-500/10'
              }`}
              title={
                task.isCompleted || currentStatus === 'done'
                  ? '點擊重新啟用 (取消完成)'
                  : '點擊標記為完成 (自動回寫 Google Tasks)'
              }
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className={`text-sm font-medium leading-snug line-clamp-3 transition-colors flex-1 ${
                task.isCompleted || currentStatus === 'done'
                  ? 'line-through text-dark-muted'
                  : 'text-dark-primary group-hover:text-white'
              }`}
              title="雙擊編輯標題，單擊展開詳情"
            >
              {task.text}
            </div>
          </div>
        )}
      </div>

      {/* 備忘與網址摘要 (若有) */}
      {(task.notes || task.url || task.deepLinkUrl) && (
        <div className="flex items-center gap-2 mb-2.5 text-[11px] text-dark-muted flex-wrap">
          {task.notes && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-dark-surface/70 border border-dark-border-subtle/60 text-[10px] text-dark-muted truncate max-w-[180px]" title={task.notes}>
              <span>📝</span>
              <span className="truncate">{task.notes}</span>
            </span>
          )}
          {(task.deepLinkUrl || task.url) && (
            <a
              href={task.deepLinkUrl || task.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                const targetUrl = task.deepLinkUrl || task.url;
                if (targetUrl && typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
                  e.preventDefault();
                  chrome.tabs.create({ url: targetUrl });
                }
              }}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-950/30 hover:bg-blue-900/40 text-blue-400 hover:text-blue-300 border border-blue-800/40 text-[10px] transition-colors shrink-0"
              title={task.deepLinkUrl || task.url}
            >
              <span>🔗</span>
              <span>{task.deepLinkUrl?.includes('dashboard.html') ? '研報' : '網址'}</span>
            </a>
          )}
        </div>
      )}

      {/* 底部 GTD 快速流轉操作按鈕 (Quick Actions) */}
      <div
        className="mt-3 pt-2.5 border-t border-dark-border-subtle/50 flex items-center justify-between gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左側一鍵釐清/推進按鈕 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {currentStatus === 'inbox' && (
            <>
              <button
                onClick={() => onUpdateStatus(task.id, 'next-action')}
                className="h-6 px-2.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
                title="轉入 Next Action (下一步行動池)"
              >
                <span>⚡</span>
                <span>Next Action</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'someday')}
                className="h-6 px-2 rounded-lg bg-dark-surface/90 hover:bg-dark-hover text-dark-muted hover:text-dark-secondary border border-dark-border-subtle/70 text-[10px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
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
                className="h-6 px-2.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/35 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
                title="推進至 In Progress (今日焦點衝刺)"
              >
                <span>🎯</span>
                <span>推進 Doing</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'done')}
                className="h-6 px-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/25 text-[10px] transition-all cursor-pointer active:scale-95 shadow-xs"
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
                className="h-6 px-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/35 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
                title="完成此焦點戰役"
              >
                <span>✅</span>
                <span>完成</span>
              </button>
              <button
                onClick={() => onUpdateStatus(task.id, 'next-action')}
                className="h-6 px-2 rounded-lg bg-dark-surface/90 hover:bg-dark-hover text-dark-muted hover:text-dark-secondary border border-dark-border-subtle/70 text-[10px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
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
              className="h-6 px-2.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
              title="喚醒並轉入 Next Action"
            >
              <span>⚡</span>
              <span>移至行動</span>
            </button>
          )}

          {currentStatus === 'done' && (
            <button
              onClick={() => onUpdateStatus(task.id, 'next-action')}
              className="h-6 px-2.5 rounded-lg bg-dark-surface/90 hover:bg-dark-hover text-dark-muted hover:text-dark-secondary border border-dark-border-subtle/70 text-[10px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
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
            className="w-6 h-6 flex items-center justify-center rounded-lg text-dark-muted hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
            title="刪除此任務"
          >
            <span className="text-[11px]">🗑️</span>
          </button>
        )}
      </div>
    </div>
  );
};
