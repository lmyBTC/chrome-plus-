import React, { useState, useEffect } from 'react';
import { WeeklyMission, GTDStatus } from '../../types';
import { storage } from '../../core/chrome/storage';
import { googleTasksSync } from '../../shared/google/googleTasksSync';
import { TaskCard } from './TaskCard';

export interface BoardViewProps {
  weeklyMissions: WeeklyMission[];
  inProgressIds: string[];
  onAddTask?: (title: string, status?: GTDStatus) => Promise<void>;
  onUpdateStatus: (id: string, status: GTDStatus) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onToggleFocus?: (id: string) => Promise<void>;
  onSelectTask?: (id: string | null) => void;
  onUpdateTitle?: (id: string, title: string) => Promise<void>;
  onUpdatePomodoroEstimate?: (id: string, estimate: number) => Promise<void>;
  maxWipLimit?: number;
  enableWipLimit?: boolean;
  onSyncGoogleTasks?: () => Promise<void>;
  isGoogleSyncing?: boolean;
  onReloadMissions?: () => Promise<void>;
}

interface ColumnConfig {
  id: GTDStatus;
  title: string;
  icon: string;
  badgeColor: string;
  accentBorder: string;
  description: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'inbox',
    title: '收件匣 (Inbox)',
    icon: '📥',
    badgeColor: 'bg-purple-950/40 text-purple-300 border-purple-800/40',
    accentBorder: 'hover:border-purple-500/50',
    description: '靈感暫存與未釐清想法',
  },
  {
    id: 'next-action',
    title: '下一步行動 (Next Actions)',
    icon: '⚡',
    badgeColor: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
    accentBorder: 'hover:border-blue-500/50',
    description: '隨時可啟動的具體任務',
  },
  {
    id: 'in-progress',
    title: '進行中 (In Progress)',
    icon: '🚀',
    badgeColor: 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40',
    accentBorder: 'hover:border-indigo-500/50',
    description: '嚴格 WIP 限制的專注戰役',
  },
  {
    id: 'done',
    title: '已完成 (Done)',
    icon: '✅',
    badgeColor: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
    accentBorder: 'hover:border-emerald-500/50',
    description: '衝刺落地的成就清單',
  },
];

export const BoardView: React.FC<BoardViewProps> = ({
  weeklyMissions,
  inProgressIds,
  onAddTask,
  onUpdateStatus,
  onDeleteTask,
  onToggleFocus,
  onSelectTask,
  onUpdateTitle,
  onUpdatePomodoroEstimate,
  maxWipLimit = 3,
  enableWipLimit,
  onSyncGoogleTasks,
  isGoogleSyncing,
  onReloadMissions,
}) => {
  const [activeDropColumn, setActiveDropColumn] = useState<GTDStatus | null>(null);
  const [inboxInput, setInboxInput] = useState('');
  const [showSomeday, setShowSomeday] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wipEnabled, setWipEnabled] = useState<boolean>(enableWipLimit ?? true);
  const [currentWipLimit, setCurrentWipLimit] = useState(maxWipLimit);

  // Google Tasks 同步狀態管理
  const [internalSyncing, setInternalSyncing] = useState(false);
  const isSyncing = isGoogleSyncing !== undefined ? isGoogleSyncing : internalSyncing;
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('scrumclock_last_google_sync');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [showAuthGuideModal, setShowAuthGuideModal] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return '尚未同步';
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return '剛剛';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m 前`;
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleTriggerSync = async () => {
    if (isSyncing) return;
    setInternalSyncing(true);
    setSyncFeedback(null);

    try {
      if (onSyncGoogleTasks) {
        await onSyncGoogleTasks();
        const now = Date.now();
        setLastSyncTime(now);
        try {
          localStorage.setItem('scrumclock_last_google_sync', String(now));
        } catch {}
      } else {
        const result = await googleTasksSync.pullAndMergeTasks();
        if (result.success) {
          const now = Date.now();
          setLastSyncTime(now);
          try {
            localStorage.setItem('scrumclock_last_google_sync', String(now));
          } catch {}
          setSyncFeedback({
            type: 'success',
            text: `Google Tasks 同步成功，共連動 ${result.syncedCount} 個任務`,
          });
          if (onReloadMissions) {
            await onReloadMissions();
          }
        } else {
          const errMsg = result.errors?.[0] || 'Google Tasks 同步失敗';
          if (
            errMsg.includes('OAuth') ||
            errMsg.includes('Client ID') ||
            errMsg.includes('憑證') ||
            errMsg.includes('授權')
          ) {
            setAuthErrorMessage(errMsg);
            setShowAuthGuideModal(true);
          } else {
            setSyncFeedback({
              type: 'error',
              text: errMsg,
            });
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Google Tasks 同步發生異常';
      if (
        errMsg.includes('OAuth') ||
        errMsg.includes('Client ID') ||
        errMsg.includes('憑證') ||
        errMsg.includes('授權')
      ) {
        setAuthErrorMessage(errMsg);
        setShowAuthGuideModal(true);
      } else {
        setSyncFeedback({
          type: 'error',
          text: errMsg,
        });
      }
    } finally {
      setInternalSyncing(false);
      setTimeout(() => {
        setSyncFeedback(null);
      }, 4000);
    }
  };

  useEffect(() => {
    storage.getUserSettings().then((s) => {
      if (s.enableWipLimit !== undefined) {
        setWipEnabled(s.enableWipLimit);
      }
      if (typeof s.maxWipLimit === 'number') {
        setCurrentWipLimit(s.maxWipLimit);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (enableWipLimit !== undefined) setWipEnabled(enableWipLimit);
  }, [enableWipLimit]);

  useEffect(() => {
    if (maxWipLimit !== undefined) setCurrentWipLimit(maxWipLimit);
  }, [maxWipLimit]);

  // 計算任務所屬的 GTD 狀態
  const getTaskStatus = (task: WeeklyMission): GTDStatus => {
    if (task.isCompleted || task.status === 'done') return 'done';
    if (task.status === 'in-progress' || inProgressIds.includes(task.id)) return 'in-progress';
    if (task.status === 'inbox') return 'inbox';
    if (task.status === 'someday') return 'someday';
    return 'next-action';
  };

  // 根據搜尋條件過濾
  const filteredMissions = weeklyMissions.filter((m) =>
    searchQuery.trim() === ''
      ? true
      : m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.ticker && m.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 任務依 GTD 狀態分組
  const tasksByColumn: Record<GTDStatus, WeeklyMission[]> = {
    inbox: [],
    'next-action': [],
    'in-progress': [],
    done: [],
    someday: [],
  };

  filteredMissions.forEach((m) => {
    const status = getTaskStatus(m);
    tasksByColumn[status].push(m);
  });

  const inProgressCount = tasksByColumn['in-progress'].length;
  const isWipExceeded = wipEnabled && inProgressCount > currentWipLimit;

  // 快速添加 Inbox 任務
  const handleQuickAddInbox = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inboxInput.trim()) return;
    if (onAddTask) {
      await onAddTask(inboxInput.trim(), 'inbox');
    }
    setInboxInput('');
  };

  // 一鍵釐清所有 Inbox 任務至 Next Action (Inbox Zero)
  const handleClarifyAllInbox = async () => {
    const inboxTasks = tasksByColumn.inbox;
    if (inboxTasks.length === 0) return;
    for (const t of inboxTasks) {
      await onUpdateStatus(t.id, 'next-action');
    }
  };

  // 拖曳放置處理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (colId: GTDStatus) => {
    setActiveDropColumn(colId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只有當離開該容器時才重設
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setActiveDropColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCol: GTDStatus) => {
    e.preventDefault();
    setActiveDropColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const task = weeklyMissions.find((m) => m.id === taskId);
    if (!task) return;

    const currentStatus = getTaskStatus(task);
    if (currentStatus === targetCol) return;

    await onUpdateStatus(taskId, targetCol);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 頂部看板操作與統計列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-surface p-3 rounded-xl border border-dark-border-subtle">
        {/* 左側：快速檢索與 WIP 說明 */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-dark-muted">🔍</span>
            <input
              type="text"
              placeholder="搜尋看板任務..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-dark-card border border-dark-border-default/60 rounded-lg text-xs text-dark-primary placeholder:text-dark-muted outline-none focus:border-indigo-500/70"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-dark-secondary">
            <span>🛡️ WIP 限制：</span>
            {wipEnabled ? (
              <select
                value={currentWipLimit}
                onChange={(e) => setCurrentWipLimit(parseInt(e.target.value, 10))}
                className="px-2 py-1 bg-dark-card border border-dark-border-default/60 rounded text-xs text-dark-primary outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <option key={num} value={num}>
                    {num} 個
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-dark-muted font-mono bg-dark-card px-2 py-0.5 rounded border border-dark-border-subtle">
                未啟用
              </span>
            )}
          </div>
        </div>

        {/* 右側：Google Tasks 同步、切換 Someday 與統計指標 */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          {/* Google Tasks 一鍵雙向同步按鈕 */}
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              isSyncing
                ? 'bg-blue-950/40 border-blue-800/40 text-blue-300 opacity-80 cursor-wait'
                : 'bg-dark-card hover:bg-dark-hover border-dark-border-default/60 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 shadow-sm'
            }`}
            title={
              lastSyncTime
                ? `上次同步時間：${formatLastSync(lastSyncTime)}（點擊與 Google Tasks 進行雙向同步）`
                : '點擊與 Google Tasks 進行雙向同步'
            }
          >
            {isSyncing ? (
              <svg className="animate-spin h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
            )}
            <span>{isSyncing ? '同步中...' : 'Google Tasks'}</span>
            {lastSyncTime && !isSyncing && (
              <span className="text-[10px] text-dark-muted font-mono bg-dark-surface/60 px-1.5 py-0.5 rounded border border-dark-border-subtle">
                {formatLastSync(lastSyncTime)}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSomeday(!showSomeday)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              showSomeday
                ? 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                : 'bg-dark-card border-dark-border-default/60 text-dark-muted hover:text-dark-primary'
            }`}
          >
            <span>💡</span>
            <span>日後也許 ({tasksByColumn.someday.length})</span>
          </button>

          <div className="flex items-center gap-2 text-dark-muted font-mono bg-dark-card px-3 py-1 rounded-lg border border-dark-border-subtle">
            <span>總任務: {filteredMissions.length}</span>
            <span>•</span>
            <span className="text-purple-400">Inbox: {tasksByColumn.inbox.length}</span>
            <span>•</span>
            <span className={isWipExceeded ? 'text-red-400 font-bold' : 'text-indigo-400'}>
              Doing: {wipEnabled ? `${inProgressCount}/${currentWipLimit}` : inProgressCount}
            </span>
          </div>
        </div>
      </div>

      {/* 同步即時反饋通知條 */}
      {syncFeedback && (
        <div
          className={`px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 border transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/50 border-red-800/50 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{syncFeedback.type === 'success' ? '✨' : '⚠️'}</span>
            <span className="font-medium">{syncFeedback.text}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer px-1 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 看板核心多欄容器 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start">
        {COLUMNS.map((col) => {
          const tasks = tasksByColumn[col.id];
          const isOverWip = wipEnabled && col.id === 'in-progress' && tasks.length > currentWipLimit;
          const isTargetDrop = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col min-h-[520px] max-h-[calc(100vh-280px)] rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOverWip
                  ? 'border-red-500/80 bg-red-950/15 ring-2 ring-red-500/40'
                  : isTargetDrop
                  ? 'border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/50'
                  : 'border-dark-border-subtle bg-dark-surface/50'
              }`}
            >
              {/* 欄位標頭 */}
              <div
                className={`p-3.5 border-b flex items-center justify-between gap-2 shrink-0 ${
                  isOverWip
                    ? 'bg-red-950/40 border-red-900/50'
                    : 'bg-dark-surface border-dark-border-subtle/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{col.icon}</span>
                  <span className="font-bold text-sm text-dark-primary truncate">{col.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {col.id === 'in-progress' && isOverWip ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600/30 text-red-300 border border-red-500/50 animate-pulse">
                      WIP 超額 ({tasks.length}/{currentWipLimit})
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${col.badgeColor}`}
                    >
                      {col.id === 'in-progress' && wipEnabled ? `${tasks.length}/${currentWipLimit}` : tasks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Inbox 專屬：快速捕捉輸入框與一鍵釐清 */}
              {col.id === 'inbox' && (
                <div className="p-2.5 bg-dark-card/60 border-b border-dark-border-subtle/40 space-y-2">
                  <form onSubmit={handleQuickAddInbox} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="快記想法 (Enter 存入)..."
                      value={inboxInput}
                      onChange={(e) => setInboxInput(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-dark-surface border border-dark-border-default/60 rounded text-xs text-dark-primary placeholder:text-dark-muted outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!inboxInput.trim()}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      ＋
                    </button>
                  </form>
                  {tasks.length > 0 && (
                    <button
                      onClick={handleClarifyAllInbox}
                      className="w-full py-1 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 border border-purple-800/40 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="一鍵將所有收件匣任務移至下一步行動"
                    >
                      <span>⚡</span>
                      <span>一鍵釐清全部 (Inbox Zero)</span>
                    </button>
                  )}
                </div>
              )}

              {/* In Progress 專屬：超額警告提示條 */}
              {col.id === 'in-progress' && isOverWip && (
                <div className="px-3 py-1.5 bg-red-950/60 border-b border-red-900/40 text-[11px] text-red-200 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>已超出在製品限制，請先聚焦完成或暫緩當前任務！</span>
                </div>
              )}

              {/* 任務卡片清單 (垂直滾動) */}
              <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5">
                {tasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-dark-muted text-xs border border-dashed border-dark-border-subtle/50 rounded-xl">
                    <span className="text-xl mb-1 opacity-50">{col.icon}</span>
                    <span>暫無任務</span>
                    <span className="text-[10px] opacity-60 mt-0.5">拖曳至此處切換</span>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isFocused={inProgressIds.includes(task.id)}
                      currentStatus={col.id}
                      onUpdateStatus={onUpdateStatus}
                      onToggleFocus={onToggleFocus}
                      onDeleteTask={onDeleteTask}
                      onSelectTask={onSelectTask}
                      onUpdateTitle={onUpdateTitle}
                      onUpdatePomodoroEstimate={onUpdatePomodoroEstimate}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 可折疊：Someday / Maybe 欄位抽屜 */}
      {showSomeday && (
        <div
          onDragOver={handleDragOver}
          onDragEnter={() => handleDragEnter('someday')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'someday')}
          className={`p-4 rounded-2xl border transition-all ${
            activeDropColumn === 'someday'
              ? 'border-amber-500 bg-amber-950/20'
              : 'border-amber-900/30 bg-amber-950/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span className="font-bold text-sm text-amber-200">日後也許 (Someday / Maybe)</span>
              <span className="text-xs text-amber-400/80">暫時擱置、非當務之急或靈感備份</span>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/40">
              {tasksByColumn.someday.length} 項
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasksByColumn.someday.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-dark-muted border border-dashed border-dark-border-subtle rounded-xl">
                無暫存任務。可將尚未確定排程的想法拖放至此。
              </div>
            ) : (
              tasksByColumn.someday.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isFocused={inProgressIds.includes(task.id)}
                  currentStatus="someday"
                  onUpdateStatus={onUpdateStatus}
                  onToggleFocus={onToggleFocus}
                  onDeleteTask={onDeleteTask}
                  onSelectTask={onSelectTask}
                  onUpdateTitle={onUpdateTitle}
                  onUpdatePomodoroEstimate={onUpdatePomodoroEstimate}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Google 授權與配置引導 Modal */}
      {showAuthGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-surface border border-dark-border-default/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-2 bg-amber-950/40 border border-amber-800/50 rounded-xl">🔑</span>
                <div>
                  <h3 className="text-base font-bold text-dark-primary">Google Tasks 連動授權提示</h3>
                  <p className="text-xs text-dark-muted mt-0.5">Google OAuth 2.0 整合與權限引導</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthGuideModal(false)}
                className="text-dark-muted hover:text-dark-primary text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>連動受阻原因：</span>
              </div>
              <p className="leading-relaxed opacity-90 pl-5">{authErrorMessage}</p>
            </div>

            <div className="space-y-2.5 text-xs text-dark-secondary">
              <p className="font-semibold text-dark-primary">📋 如何完成 Google Tasks 串接配置：</p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed text-dark-muted">
                <li>前往 <span className="text-blue-400 font-mono">Google Cloud Console</span> 並在 API 庫中啟用 <span className="text-dark-primary">Google Tasks API</span>。</li>
                <li>於「憑證」中建立 <span className="text-dark-primary">OAuth 2.0 Client ID</span>，應用程式類型選擇「Chrome 擴充功能」。</li>
                <li>將本擴充功能的 ID 填入憑證中，並將取得的用戶端 ID 填入專案 <span className="text-emerald-400 font-mono">public/manifest.json</span> 之 <span className="text-dark-primary font-mono">oauth2.client_id</span>。</li>
                <li>重新載入擴充功能後，再次點擊同步即可喚起 Google 登入授權並無縫拉取任務。</li>
              </ol>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-dark-border-subtle">
              <button
                onClick={() => setShowAuthGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                了解並關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
