import React, { useEffect, useRef, useState } from 'react';
import { WeeklyMission, ChecklistItem, calculateChecklistProgress } from '../../../../types';
import { TaskAIEngine } from '../../services/taskAIEngine';

export interface TaskDetailDrawerProps {
  task: WeeklyMission | null;
  isOpen: boolean;
  onClose: () => void;
  isFocused: boolean;
  onToggleFocus: (id: string) => Promise<void>;
  onUpdateTitle?: (id: string, title: string) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onUpdatePriority: (id: string, priority: 'P0' | 'P1' | 'P2' | 'P3') => Promise<void>;
  onUpdateEstimatedPomodoros?: (id: string, estimate: number) => Promise<void>;
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
  onUpdateChecklist?: (id: string, checklist: ChecklistItem[]) => Promise<void>;
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
  onUpdateEstimatedPomodoros,
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
  onUpdateChecklist,
}) => {
  const [localTitle, setLocalTitle] = useState('');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isNanoDecomposing, setIsNanoDecomposing] = useState(false);
  const [nanoFeedback, setNanoFeedback] = useState<string | null>(null);
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

  // 當選取的 task 變更時，同步本地標題與 Checklist
  useEffect(() => {
    if (task) {
      setLocalTitle(task.text);
      setChecklistItems(task.checklist || []);
    }
  }, [task?.id, task?.text, task?.checklist]);

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!task) return;
    const updated = checklistItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setChecklistItems(updated);
    if (onUpdateChecklist) {
      await onUpdateChecklist(task.id, updated);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!task) return;
    const updated = checklistItems.filter((item) => item.id !== itemId);
    setChecklistItems(updated);
    if (onUpdateChecklist) {
      await onUpdateChecklist(task.id, updated);
    }
  };

  const handleAddChecklistItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = newChecklistText.trim();
    if (!text || !task) return;
    const newItem: ChecklistItem = {
      id: `ck_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      completed: false,
    };
    const updated = [...checklistItems, newItem];
    setChecklistItems(updated);
    setNewChecklistText('');
    if (onUpdateChecklist) {
      await onUpdateChecklist(task.id, updated);
    }
  };

  const handleLoadAnalystTemplate = async () => {
    if (!task) return;
    const defaultTemplates = [
      '1. 損益表營收與毛利率趨勢比對',
      '2. 資產負債表流動性與存貨週轉檢視',
      '3. 現金流量表自由現金流 (FCF) 驗證',
      '4. DCF / PE 估值模型合理性覆核',
    ];
    const existingTexts = new Set(checklistItems.map((i) => i.text));
    const newItems: ChecklistItem[] = defaultTemplates
      .filter((t) => !existingTexts.has(t))
      .map((t, idx) => ({
        id: `ck_${Date.now()}_${idx}`,
        text: t,
        completed: false,
      }));
    if (newItems.length === 0) return;
    const updated = [...checklistItems, ...newItems];
    setChecklistItems(updated);
    if (onUpdateChecklist) {
      await onUpdateChecklist(task.id, updated);
    }
  };

  /**
   * Phase 2 Task 2.2：調用 TaskAIEngine.decomposeTask，將大型目標自動拆解為
   * 3~4 個具體原子 Checklist 步驟並更新預估番茄鐘。
   */
  const handleNanoDecomposeToSprintPlan = async () => {
    if (!task) return;
    setIsNanoDecomposing(true);
    setNanoFeedback(null);
    try {
      const proposals = await TaskAIEngine.getInstance().decomposeTask(
        task.text,
        task.notes ? `備忘: ${task.notes}` : undefined
      );

      if (proposals.length === 0) {
        alert('Nano 無法產出原子拆解，請稍後重試。');
        return;
      }

      const newChecklist: ChecklistItem[] = proposals.map((p, idx) => ({
        id: `nano_ck_${Date.now()}_${idx}`,
        text: `${p.title} (${p.estimatedPomodoros}🍅)`,
        completed: false,
      }));

      const mergedChecklist = [...checklistItems, ...newChecklist];
      setChecklistItems(mergedChecklist);

      if (onUpdateChecklist) {
        await onUpdateChecklist(task.id, mergedChecklist);
      }

      // 同步微調累加預估番茄鐘
      const totalPomos = proposals.reduce((sum, p) => sum + p.estimatedPomodoros, 0);
      if (onUpdateEstimatedPomodoros && totalPomos > 0) {
        const nextEst = (task.estimatedPomodoros || 0) + totalPomos;
        await onUpdateEstimatedPomodoros(task.id, nextEst);
      }

      setNanoFeedback(`⚡ 已成功拆解出 ${proposals.length} 個番茄作戰計畫並寫入 Checklist！`);
      setTimeout(() => setNanoFeedback(null), 4000);
    } catch (err) {
      console.error('Nano 拆解番茄作戰計畫失敗:', err);
      alert('Nano 任務拆解失敗');
    } finally {
      setIsNanoDecomposing(false);
    }
  };

  const { total: checklistTotal, completed: checklistCompleted, percent: checklistPercent } =
    calculateChecklistProgress(checklistItems);

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
                  {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => {
                    const active = (task.priority || 'P2') === p;
                    return (
                      <button
                        key={p}
                        onClick={() => onUpdatePriority(task.id, p)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          active
                            ? p === 'P0'
                              ? 'bg-rose-950/80 border-rose-600 text-rose-200 ring-1 ring-rose-500/50 shadow-sm'
                              : p === 'P1'
                              ? 'bg-red-950/60 border-red-800/60 text-red-300'
                              : p === 'P2'
                              ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            : 'bg-dark-card/50 border-dark-border-subtle text-dark-muted hover:text-dark-secondary'
                        }`}
                        title={p === 'P0' ? '🚨 P0 (Blocker) 緊急阻斷' : `優先級 ${p}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 預估番茄鐘步進器 (Estimated Pomodoros Stepper) */}
            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border-subtle flex items-center justify-between">
              <div>
                <span className="block text-[11px] font-semibold text-dark-muted uppercase">
                  預估番茄鐘 (Estimated Pomodoros)
                </span>
                <span className="text-xs text-dark-secondary">
                  已消耗 <span className="font-mono font-bold text-amber-400">{task.spentPomodoros || 0}</span> 顆 / 預計 <span className="font-mono font-bold text-dark-primary">{task.estimatedPomodoros || 1}</span> 顆
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = task.estimatedPomodoros || 1;
                    if (current > 1 && onUpdateEstimatedPomodoros) {
                      onUpdateEstimatedPomodoros(task.id, current - 1);
                    }
                  }}
                  disabled={!onUpdateEstimatedPomodoros || (task.estimatedPomodoros || 1) <= 1}
                  className="w-8 h-8 rounded-lg bg-dark-card hover:bg-dark-hover border border-dark-border-subtle text-dark-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-base cursor-pointer transition-colors shadow-sm"
                  title="減少 1 顆預估番茄鐘"
                >
                  −
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-base rounded-lg border border-dark-border-subtle text-sm font-mono font-bold text-dark-primary min-w-[56px] justify-center shadow-inner">
                  <span className="text-red-400 text-xs">🍅</span>
                  <span>{task.estimatedPomodoros || 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const current = task.estimatedPomodoros || 1;
                    if (onUpdateEstimatedPomodoros) {
                      onUpdateEstimatedPomodoros(task.id, current + 1);
                    }
                  }}
                  disabled={!onUpdateEstimatedPomodoros || (task.estimatedPomodoros || 1) >= 20}
                  className="w-8 h-8 rounded-lg bg-dark-card hover:bg-dark-hover border border-dark-border-subtle text-dark-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-base cursor-pointer transition-colors shadow-sm"
                  title="增加 1 顆預估番茄鐘"
                >
                  +
                </button>
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

            {/* 子任務檢查清單 (Task Checklist Support) */}
            <div className="p-4 rounded-xl bg-dark-surface/60 border border-dark-border-subtle space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-dark-primary flex items-center gap-1.5">
                    <span>☑️</span>
                    <span>子項目檢驗清單 (Checklist)</span>
                  </span>
                  {checklistTotal > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                      {checklistCompleted}/{checklistTotal} ({checklistPercent}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNanoDecomposeToSprintPlan}
                    disabled={isNanoDecomposing || task.isCompleted}
                    className="text-[11px] px-2.5 py-1 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="調用 Gemini Nano 將目標智能拆解為原子番茄作戰計畫並直接寫入 Checklist"
                  >
                    {isNanoDecomposing ? (
                      <>
                        <span className="animate-spin block h-3 w-3 border-2 border-indigo-300 border-t-transparent rounded-full" />
                        <span>Nano 拆解中...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Nano 拆解為番茄作戰計畫</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadAnalystTemplate}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                    title="一鍵帶入損益表、資產負債表、現金流與估值查核點"
                  >
                    <span>📊</span>
                    <span>載入投研查核點</span>
                  </button>
                </div>
              </div>

              {nanoFeedback && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <span>✨</span>
                  <span>{nanoFeedback}</span>
                </div>
              )}

              {/* 即時進度條 */}
              {checklistTotal > 0 && (
                <div className="w-full bg-dark-base rounded-full h-1.5 overflow-hidden border border-dark-border-subtle/40">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              )}

              {/* 子任務條目列表 */}
              {checklistItems.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-start gap-2.5 p-2 rounded-lg bg-dark-card/70 hover:bg-dark-card border border-dark-border-subtle/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="mt-0.5 rounded border-dark-border-default bg-dark-base text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span
                        onClick={() => handleToggleChecklistItem(item.id)}
                        className={`flex-1 text-xs leading-relaxed cursor-pointer select-none transition-colors ${
                          item.completed
                            ? 'line-through text-dark-muted/80'
                            : 'text-dark-primary'
                        }`}
                      >
                        {item.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-dark-muted hover:text-rose-400 transition-opacity p-0.5 cursor-pointer"
                        title="刪除此檢查項"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-dark-muted leading-relaxed">
                  尚未建立子檢驗項目。可手動新增，或點擊右上角「載入投研查核點」標準化三表與估值檢視流程。
                </p>
              )}

              {/* 新增子任務輸入框 */}
              <form onSubmit={handleAddChecklistItem} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="新增子項目 (Enter 儲存)..."
                  className="flex-1 px-3 py-1.5 bg-dark-base border border-dark-border-default/80 rounded-lg text-xs text-dark-primary placeholder:text-dark-muted/60 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newChecklistText.trim()}
                  className="px-3 py-1.5 bg-dark-card hover:bg-dark-hover border border-dark-border-subtle disabled:opacity-40 disabled:cursor-not-allowed text-dark-primary text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  ＋ 新增
                </button>
              </form>
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
