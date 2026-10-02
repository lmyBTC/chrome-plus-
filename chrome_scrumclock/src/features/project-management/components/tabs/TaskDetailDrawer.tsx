import React, { useEffect, useRef, useState } from 'react';
import { WeeklyMission } from '../../../../types';

export interface TaskDetailDrawerProps {
  task: WeeklyMission | null;
  isOpen: boolean;
  onClose: () => void;
  isFocused: boolean;
  onToggleFocus: (id: string) => Promise<void>;
  onUpdateTitle?: (id: string, title: string) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onUpdatePriority: (id: string, priority: 'P1' | 'P2' | 'P3') => Promise<void>;
  notesValue: string;
  onNotesChange: (id: string, value: string) => void;
  onUpdateNotes: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onBreakdownTask: (id: string) => Promise<void>;
  isBreakingDown: boolean;
  subtasks?: string[];
  onApplySubtasks: (id: string) => Promise<void>;
  onDismissSubtasks: (id: string) => void;
  onScheduleTimebox?: (taskId: string, startTime: string | number | Date, durationMinutes: number) => Promise<boolean>;
  isSchedulingCalendar?: boolean;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  isOpen,
  onClose,
  isFocused,
  onToggleFocus,
  onUpdateTitle,
  onUpdateStatus,
  onUpdatePriority,
  notesValue,
  onNotesChange,
  onUpdateNotes,
  onDeleteTask,
  onBreakdownTask,
  isBreakingDown,
  subtasks,
  onApplySubtasks,
  onDismissSubtasks,
  onScheduleTimebox,
  isSchedulingCalendar,
}) => {
  const [localTitle, setLocalTitle] = useState('');
  const [timeboxDate, setTimeboxDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    // 轉換為 local datetime-local format: YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [timeboxDuration, setTimeboxDuration] = useState<number>(25);
  const [copiedId, setCopiedId] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 當選取的 task 變更時，同步本地標題
  useEffect(() => {
    if (task) {
      setLocalTitle(task.text);
    }
  }, [task?.id, task?.text]);

  // 監聽鍵盤 Esc 鍵快速關閉抽屜
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 自動調整備忘 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [notesValue, isOpen]);

  if (!isOpen || !task) {
    return null;
  }

  const handleTitleBlur = async () => {
    if (onUpdateTitle && localTitle.trim() && localTitle !== task.text) {
      await onUpdateTitle(task.id, localTitle.trim());
    }
  };

  const handleCopyId = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(task.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const currentGtdStatus =
    task.isCompleted || task.status === 'done'
      ? 'done'
      : task.status === 'in-progress' || isFocused
      ? 'in-progress'
      : task.status === 'inbox'
      ? 'inbox'
      : task.status === 'someday'
      ? 'someday'
      : 'next-action';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 背景遮罩 (Backdrop) */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 右側滑出式抽屜主體 (Slide-over Panel) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-dark-card border-l border-dark-border-subtle shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          {/* 抽屜頂部操作列 */}
          <div className="px-6 py-4 border-b border-dark-border-subtle/80 flex items-center justify-between bg-dark-surface/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-dark-base border border-dark-border-subtle text-dark-muted font-mono">
                {task.id.substring(0, 8)}
              </span>
              <button
                onClick={handleCopyId}
                className="text-[11px] text-dark-muted hover:text-dark-primary transition-colors cursor-pointer"
                title="複製任務 ID"
              >
                {copiedId ? '✓ 已複製' : '📋'}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* 今日焦點切換 */}
              {isFocused ? (
                <button
                  onClick={() => onToggleFocus(task.id)}
                  className="px-3 py-1.5 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="從今日焦點戰役移除"
                >
                  <span>🔥</span>
                  <span>焦點中</span>
                </button>
              ) : (
                <button
                  onClick={() => onToggleFocus(task.id)}
                  disabled={task.isCompleted}
                  className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-blue-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  title="推入今日番茄鐘焦點戰役"
                >
                  <span>🎯</span>
                  <span>推入今日焦點</span>
                </button>
              )}

              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-dark-muted hover:text-dark-primary hover:bg-dark-hover transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="關閉詳情 (Esc)"
              >
                <span>✕</span>
                <span className="text-[10px] opacity-60">Esc</span>
              </button>
            </div>
          </div>

          {/* 抽屜滾動內容區 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 任務標題編輯區 (Linear 大標題風格) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-dark-muted mb-1.5">
                任務標題
              </label>
              <textarea
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTitleBlur();
                  }
                }}
                rows={2}
                placeholder="輸入任務標題..."
                className="w-full text-lg font-bold text-dark-primary bg-transparent border-0 border-b border-transparent hover:border-dark-border-subtle focus:border-blue-500 rounded-none px-0 py-1 outline-none resize-none transition-colors placeholder:text-dark-muted/60 leading-snug"
              />
            </div>

            {/* 核心屬性面板 (Status & Priority) */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-dark-surface/60 border border-dark-border-subtle">
              {/* 狀態切換 */}
              <div>
                <span className="block text-[11px] font-semibold text-dark-muted uppercase mb-2">
                  任務狀態 (GTD Status)
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={currentGtdStatus}
                    onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border cursor-pointer outline-none transition-all ${
                      currentGtdStatus === 'done'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : currentGtdStatus === 'in-progress'
                        ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40'
                        : currentGtdStatus === 'inbox'
                        ? 'bg-purple-950/40 text-purple-400 border-purple-900/40'
                        : currentGtdStatus === 'someday'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                        : 'bg-dark-card text-blue-400 border-blue-900/40'
                    }`}
                  >
                    <option value="inbox">📥 Inbox (收件匣)</option>
                    <option value="next-action">⚡ Next Action (下一步)</option>
                    <option value="in-progress">🚀 In Progress (焦點中)</option>
                    <option value="done">✅ Done (已完成)</option>
                    <option value="someday">💡 Someday (日後也許)</option>
                  </select>
                </div>
              </div>

              {/* 優先級切換 */}
              <div>
                <span className="block text-[11px] font-semibold text-dark-muted uppercase mb-2">
                  優先級 (Priority)
                </span>
                <div className="flex items-center gap-1.5">
                  {(['P1', 'P2', 'P3'] as const).map((p) => {
                    const active = (task.priority || 'P2') === p;
                    return (
                      <button
                        key={p}
                        onClick={() => onUpdatePriority(task.id, p)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          active
                            ? p === 'P1'
                              ? 'bg-red-950/60 border-red-800/60 text-red-300'
                              : p === 'P2'
                              ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            : 'bg-dark-card/50 border-dark-border-subtle text-dark-muted hover:text-dark-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 進度與元資訊 */}
            <div className="flex items-center justify-between text-xs text-dark-muted px-1">
              <div className="flex items-center gap-2">
                <span>建立時間:</span>
                <span className="text-dark-secondary font-mono">{task.createdAt || '未記錄'}</span>
              </div>
              {task.completedAt && (
                <div className="flex items-center gap-2">
                  <span>完成時間:</span>
                  <span className="text-emerald-400 font-mono">{task.completedAt}</span>
                </div>
              )}
            </div>

            {/* 執行備忘 (Execution Notes) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-dark-primary flex items-center gap-1.5">
                  <span>📝</span>
                  <span>執行備忘 (Execution Notes)</span>
                </label>
                <span className="text-[10px] text-dark-muted">失焦 (Blur) 即自動儲存</span>
              </div>
              <textarea
                ref={textareaRef}
                value={notesValue}
                onChange={(e) => onNotesChange(task.id, e.target.value)}
                onBlur={() => onUpdateNotes(task.id)}
                placeholder="記錄執行細節、驗收條件、阻礙或參考連結..."
                className="w-full px-3.5 py-2.5 bg-dark-surface border border-dark-border-default/80 rounded-xl text-sm text-dark-primary placeholder:text-dark-muted outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all leading-relaxed"
              />
            </div>

            {/* Google Calendar 時間箱排程 (Timeboxing) */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>Google Calendar 時間箱預約</span>
                </span>
                {task.workspaceSync?.googleCalendarEventId && (
                  <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <span>✓ 已排程</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <label className="block text-[11px] text-amber-200/80 mb-1">預約開始時間：</label>
                  <input
                    type="datetime-local"
                    value={timeboxDate}
                    onChange={(e) => setTimeboxDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-dark-surface border border-dark-border-default/80 rounded-lg text-xs text-dark-primary outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-amber-200/80 mb-1">預計專注長度：</label>
                  <div className="flex items-center gap-2">
                    {[25, 50, 90].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setTimeboxDuration(dur)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          timeboxDuration === dur
                            ? 'bg-amber-600/30 border-amber-500/60 text-amber-200'
                            : 'bg-dark-card/60 border-dark-border-subtle text-dark-muted hover:text-dark-secondary'
                        }`}
                      >
                        {dur} 分鐘
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (onScheduleTimebox && timeboxDate) {
                        await onScheduleTimebox(task.id, timeboxDate, timeboxDuration);
                      }
                    }}
                    disabled={isSchedulingCalendar || !onScheduleTimebox}
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isSchedulingCalendar ? (
                      <>
                        <span className="animate-spin block h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        <span>排程建立中...</span>
                      </>
                    ) : (
                      <>
                        <span>📅</span>
                        <span>{task.workspaceSync?.googleCalendarEventId ? '重新排程時間箱' : '排入 Google Calendar'}</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-2 bg-dark-card hover:bg-dark-surface border border-dark-border-default/70 text-dark-secondary hover:text-dark-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                    title="開啟 Google Calendar 檢視"
                  >
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* AI 拆解建議區塊 */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Gemini AI 任務拆解</span>
                </span>
                <button
                  onClick={() => onBreakdownTask(task.id)}
                  disabled={isBreakingDown || task.isCompleted}
                  className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-700/50 text-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isBreakingDown ? (
                    <>
                      <span className="animate-spin block h-3 w-3 border-2 border-indigo-300 border-t-transparent rounded-full" />
                      <span>拆解分析中...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>{subtasks && subtasks.length > 0 ? '重新拆解' : '產生拆解建議'}</span>
                    </>
                  )}
                </button>
              </div>

              {subtasks && subtasks.length > 0 ? (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-indigo-300/80">
                    <span>拆解出 {subtasks.length} 個具體行動子任務：</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApplySubtasks(task.id)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer"
                      >
                        ➕ 批量轉入任務池
                      </button>
                      <button
                        onClick={() => onDismissSubtasks(task.id)}
                        className="text-dark-muted hover:text-dark-secondary text-xs cursor-pointer"
                      >
                        隱藏
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-dark-secondary">
                    {subtasks.map((st, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 bg-dark-card/80 px-3 py-2 rounded-lg border border-dark-border-subtle/60 text-dark-primary"
                      >
                        <span className="text-indigo-400 font-mono font-bold">#{i + 1}</span>
                        <span className="flex-1 leading-snug">{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-dark-muted leading-relaxed">
                  若任務目標過於龐大或模糊，可運用 Gemini AI 將其分解成 3~5 個立即可執行的具體子任務。
                </p>
              )}
            </div>

            {/* 危險操作區 */}
            <div className="pt-4 border-t border-dark-border-subtle/50 flex items-center justify-between">
              <span className="text-xs text-dark-muted">不再需要此任務？</span>
              <button
                onClick={async () => {
                  if (confirm(`確定要刪除任務「${task.text}」嗎？`)) {
                    await onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 border border-red-900/40 text-red-400 hover:text-red-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>刪除任務</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
