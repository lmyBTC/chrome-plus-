import React, { useState, useEffect } from 'react';
import { WeeklyMission, GTDStatus } from '../../types';
import { storage } from '../../core/chrome/storage';
import { googleTasksSync } from '../../shared/google/googleTasksSync';
import { googleSyncService } from '../../services/googleSyncService';
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
  onTriageInbox?: () => Promise<void>;
  isTriagingInbox?: boolean;
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

const EMPTY_STATES: Record<GTDStatus, { title: string; subtitle: string }> = {
  inbox: {
    title: '收件匣已清空 (Inbox Zero)',
    subtitle: '所有靈感皆已釐清，可隨時快記新點子',
  },
  'next-action': {
    title: '尚無下一步行動',
    subtitle: '自收件匣釐清任務，或從上方新增具體待辦',
  },
  'in-progress': {
    title: '目前無專注中任務',
    subtitle: '挑選高優先級任務推進至此開始衝刺',
  },
  done: {
    title: '本輪尚未有完成任務',
    subtitle: '完成衝刺焦點後將在此留下記錄',
  },
  someday: {
    title: '無暫存延期任務',
    subtitle: '可將尚未確定排程的遠期構想拖放至此',
  },
};

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
  onTriageInbox,
  isTriagingInbox = false,
}) => {
  const [activeDropColumn, setActiveDropColumn] = useState<GTDStatus | null>(null);
  const [inboxInput, setInboxInput] = useState('');
  const [showSomeday, setShowSomeday] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wipEnabled, setWipEnabled] = useState<boolean>(enableWipLimit ?? true);
  const [currentWipLimit, setCurrentWipLimit] = useState(maxWipLimit);
  const [wipConflictTask, setWipConflictTask] = useState<{ id: string; title: string } | null>(null);

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
  const [idleAuditBanner, setIdleAuditBanner] = useState<string | null>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pendingIdleAuditNotification'], (result: any) => {
        if (result && result.pendingIdleAuditNotification && result.pendingIdleAuditNotification.message) {
          setIdleAuditBanner(result.pendingIdleAuditNotification.message);
          chrome.storage.local.remove(['pendingIdleAuditNotification']);
        }
      });
    }
  }, []);

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
        const settings = await storage.getUserSettings();
        if (settings.appsScriptUrl && settings.enableGoogleSync !== false) {
          const importRes = await googleSyncService.importGoogleTasksToInbox({ autoTriage: true });
          if (importRes.success) {
            const now = Date.now();
            setLastSyncTime(now);
            try {
              localStorage.setItem('scrumclock_last_google_sync', String(now));
            } catch {}
            setSyncFeedback({
              type: 'success',
              text: importRes.importedCount > 0
                ? `雙軌同步成功：自 Google Tasks 逆向匯入 ${importRes.importedCount} 個靈感至收件匣（經 AI 語意強化）`
                : '雙軌同步成功：Google Tasks 與看板收件匣皆為最新狀態',
            });
            if (onReloadMissions) {
              await onReloadMissions();
            }
            return;
          }
        }

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

  // 看板狀態轉移事件處理與 Google Tasks 雙向推播 (Phase 3 任務 3.1 & 3.2)
  const handleStatusChange = async (taskId: string, targetCol: GTDStatus) => {
    // 1. 執行本地狀態更新
    await onUpdateStatus(taskId, targetCol);

    // 2. 當卡片移入 in-progress (焦點推進) 或標記完成 done 時，觸發 Tasks 雲端推播
    if (targetCol === 'in-progress' || targetCol === 'done') {
      const targetTask = weeklyMissions.find((m) => m.id === taskId);
      if (targetTask) {
        // 非同步在背景執行，不阻斷前端 UI 流程
        googleSyncService.syncMissionToGoogleTasks(targetTask, targetCol).then((res) => {
          if (res.success && res.mode === 'gas_direct') {
            setSyncFeedback({
              type: 'success',
              text: targetCol === 'done'
                ? `✅ 已同步完成狀態至 Google Tasks`
                : `🚀 已推播衝刺焦點至 Google Tasks [@ScrumClock-Today]`,
            });
            setTimeout(() => setSyncFeedback(null), 3500);
          }
        }).catch(() => {
          // 靜默捕獲，不干擾使用者
        });
      }
    }
  };

  // 一鍵釐清所有 Inbox 任務至 Next Action (Inbox Zero)
  const handleClarifyAllInbox = async () => {
    const inboxTasks = tasksByColumn.inbox;
    if (inboxTasks.length === 0) return;
    for (const t of inboxTasks) {
      await handleStatusChange(t.id, 'next-action');
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

    // Phase 2 Task 2.3: 語意 WIP 衝突提醒（當拖入 In Progress 且已達或超過 WIP 上限時觸發攔截）
    if (targetCol === 'in-progress' && wipEnabled) {
      const inProgressCount = tasksByColumn['in-progress'].length;
      if (inProgressCount >= currentWipLimit) {
        setWipConflictTask({ id: taskId, title: task.text });
        return;
      }
    }

    await handleStatusChange(taskId, targetCol);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 🧹 Nano 閒置巡檢自動整理通知橫幅 */}
      {idleAuditBanner && (
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-xl text-purple-200 text-xs shadow-lg shadow-purple-950/30">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="font-medium">{idleAuditBanner}</span>
          </div>
          <button
            onClick={() => setIdleAuditBanner(null)}
            className="text-purple-300 hover:text-white px-2 py-0.5 rounded hover:bg-purple-800/40 transition-colors"
          >
            ✕ 知道了
          </button>
        </div>
      )}

      {/* 頂部看板操作與統計列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md p-2.5 px-3.5 rounded-xl border border-slate-700/60 shadow-sm mb-5">
        {/* 左側：快速檢索與 WIP 說明 */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-sm group">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 group-focus-within:text-indigo-400 transition-colors">🔍</span>
            <input
              type="text"
              placeholder="搜尋看板任務、備忘或股票代號..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="清除搜尋"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/70 border border-slate-700/60 rounded-xl text-xs text-slate-300 shadow-inner">
            <span className="flex items-center gap-1 font-medium">
              <span>🛡️</span>
              <span className="hidden sm:inline">WIP 限制：</span>
            </span>
            {wipEnabled ? (
              <select
                value={currentWipLimit}
                onChange={(e) => setCurrentWipLimit(parseInt(e.target.value, 10))}
                className="bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-lg px-2 py-0.5 text-xs text-slate-200 outline-none cursor-pointer transition-all"
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <option key={num} value={num} className="bg-slate-800 text-slate-200">
                    {num} 個
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-slate-400 font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/60">
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
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isSyncing
                ? 'bg-blue-950/40 border-blue-800/40 text-blue-300 opacity-80 cursor-wait'
                : 'bg-dark-card/90 hover:bg-dark-hover border-dark-border-subtle/80 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 active:scale-95'
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
              <span className="text-[10px] text-dark-muted font-mono bg-dark-surface/60 px-1.5 py-0.5 rounded-md border border-dark-border-subtle">
                {formatLastSync(lastSyncTime)}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSomeday(!showSomeday)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
              showSomeday
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 shadow-amber-950/30'
                : 'bg-dark-card/90 border-dark-border-subtle/80 text-dark-muted hover:text-dark-primary hover:border-dark-border-default hover:bg-dark-hover'
            }`}
          >
            <span>💡</span>
            <span>日後也許</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-dark-base/60 border border-dark-border-subtle">
              {tasksByColumn.someday.length}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs text-dark-muted font-mono bg-dark-card/80 px-3 py-1.5 rounded-xl border border-dark-border-subtle/80 shadow-inner">
            <span className="text-dark-secondary">總任務: <strong className="text-dark-primary font-semibold">{filteredMissions.length}</strong></span>
            <span className="text-dark-border-default">•</span>
            <span>Inbox: <strong className="text-purple-400 font-semibold">{tasksByColumn.inbox.length}</strong></span>
            <span className="text-dark-border-default">•</span>
            <span className={isWipExceeded ? 'text-rose-400 font-bold animate-pulse' : 'text-indigo-400'}>
              Doing: <strong className="font-semibold">{wipEnabled ? `${inProgressCount}/${currentWipLimit}` : inProgressCount}</strong>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5 flex-1 items-start">
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
              className={`flex flex-col min-h-[540px] max-h-[calc(100vh-270px)] rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${
                isOverWip
                  ? 'border-rose-500/80 bg-gradient-to-b from-rose-950/20 to-dark-surface/50 ring-2 ring-rose-500/40 shadow-rose-950/20'
                  : isTargetDrop
                  ? 'border-indigo-500 bg-gradient-to-b from-indigo-950/30 to-dark-surface/60 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/30'
                  : 'border-dark-border-subtle/80 bg-gradient-to-b from-dark-surface/75 to-dark-surface/40 hover:border-dark-border-default/70'
              }`}
            >
              {/* 欄位標頭 */}
              <div
                className={`p-3.5 px-4 border-b flex items-center justify-between gap-2 shrink-0 ${
                  isOverWip
                    ? 'bg-rose-950/40 border-rose-900/50'
                    : 'bg-dark-surface/90 border-dark-border-subtle/80 backdrop-blur-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-dark-card/90 border border-dark-border-subtle/60 text-sm shadow-xs shrink-0">
                    {col.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-dark-primary truncate block">{col.title}</span>
                    <span className="text-[10px] text-dark-muted truncate block">{col.description}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {col.id === 'in-progress' && isOverWip ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-xs">
                      WIP 超額 ({tasks.length}/{currentWipLimit})
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-xs ${col.badgeColor}`}
                    >
                      {col.id === 'in-progress' && wipEnabled ? `${tasks.length}/${currentWipLimit}` : tasks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Inbox 專屬：快速捕捉輸入框與一鍵釐清 */}
              {col.id === 'inbox' && (
                <div className="p-3 bg-slate-900/60 border-b border-slate-700/60 space-y-2 backdrop-blur-xs">
                  <form onSubmit={handleQuickAddInbox} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="快記想法 (Enter 存入)..."
                      value={inboxInput}
                      onChange={(e) => setInboxInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-800/90 border border-slate-700/80 hover:border-slate-600 focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-all shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!inboxInput.trim()}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all active:scale-95 shadow-sm"
                    >
                      ＋
                    </button>
                  </form>
                  {tasks.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {onTriageInbox && (
                        <button
                          onClick={onTriageInbox}
                          disabled={isTriagingInbox}
                          className="w-full py-1.5 bg-gradient-to-r from-purple-600/25 via-indigo-600/25 to-purple-600/25 hover:from-purple-600/40 hover:via-indigo-600/40 hover:to-purple-600/40 text-purple-200 border border-purple-500/30 hover:border-purple-500/50 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 active:scale-[0.98]"
                          title="調用 Gemini Nano 本機模型批次判定任務 GTD 狀態、番茄鐘預估與情境標籤"
                        >
                          {isTriagingInbox ? (
                            <>
                              <span className="animate-spin block h-3 w-3 border-2 border-purple-300 border-t-transparent rounded-full" />
                              <span>Nano 批次釐清中...</span>
                            </>
                          ) : (
                            <>
                              <span>✨</span>
                              <span>Nano 一鍵釐清 (Inbox Zero)</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={handleClarifyAllInbox}
                        className="w-full py-1.5 bg-dark-surface/70 hover:bg-dark-hover text-dark-muted hover:text-dark-secondary border border-dark-border-subtle/70 rounded-xl text-[10px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98]"
                        title="直接將所有收件匣任務移至下一步行動"
                      >
                        <span>⚡ 快速轉為下一步行動</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* In Progress 專屬：超額警告提示條 */}
              {col.id === 'in-progress' && isOverWip && (
                <div className="px-3 py-1.5 bg-rose-950/60 border-b border-rose-900/40 text-[11px] text-rose-200 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>已超出在製品限制，請先聚焦完成或暫緩當前任務！</span>
                </div>
              )}

              {/* 任務卡片清單 (垂直滾動) */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {tasks.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-dark-border-subtle/60 rounded-2xl bg-dark-card/20 my-auto">
                    <div className="w-10 h-10 rounded-xl bg-dark-card/80 border border-dark-border-subtle/60 flex items-center justify-center text-lg mb-2.5 shadow-inner opacity-75">
                      {col.icon}
                    </div>
                    <span className="text-xs font-semibold text-dark-secondary">
                      {EMPTY_STATES[col.id]?.title || '暫無任務'}
                    </span>
                    <span className="text-[10px] text-dark-muted mt-1 leading-relaxed max-w-[210px]">
                      {EMPTY_STATES[col.id]?.subtitle || '拖曳至此處切換'}
                    </span>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isFocused={inProgressIds.includes(task.id)}
                      currentStatus={col.id}
                      onUpdateStatus={handleStatusChange}
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
          className={`p-4 rounded-2xl border transition-all duration-200 shadow-sm ${
            activeDropColumn === 'someday'
              ? 'border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/20'
              : 'border-amber-900/40 bg-gradient-to-r from-amber-950/15 via-dark-surface/60 to-amber-950/10 backdrop-blur-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-950/40 border border-amber-800/50 text-sm shadow-xs">
                💡
              </span>
              <div>
                <span className="font-bold text-sm text-amber-200 block">日後也許 (Someday / Maybe)</span>
                <span className="text-[10px] text-amber-400/80 block">暫時擱置、非當務之急或靈感備份</span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-700/50 shadow-xs">
              {tasksByColumn.someday.length} 項
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {tasksByColumn.someday.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-dark-muted border border-dashed border-amber-900/30 rounded-2xl bg-dark-card/20">
                <span className="text-base block mb-1 opacity-70">💡</span>
                <span className="font-medium text-dark-secondary">{EMPTY_STATES.someday.title}</span>
                <span className="text-[10px] text-dark-muted block mt-0.5">{EMPTY_STATES.someday.subtitle}</span>
              </div>
            ) : (
              tasksByColumn.someday.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isFocused={inProgressIds.includes(task.id)}
                  currentStatus="someday"
                  onUpdateStatus={handleStatusChange}
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

      {/* 語意 WIP 衝突提醒彈窗 (Phase 2 Task 2.3) */}
      {wipConflictTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-dark-surface border border-red-500/60 rounded-2xl p-6 max-w-md w-full shadow-2xl text-dark-primary space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-white">語意 WIP 在製品衝突提醒</h3>
                <p className="text-xs text-red-300">
                  進行中任務已達上限 ({tasksByColumn['in-progress'].length}/{currentWipLimit})
                </p>
              </div>
            </div>

            <div className="p-3 bg-dark-card rounded-xl border border-dark-border-subtle text-xs space-y-1">
              <span className="text-dark-muted">即將推入之任務：</span>
              <p className="font-semibold text-white break-words">{wipConflictTask.title}</p>
            </div>

            <p className="text-xs text-dark-secondary leading-relaxed">
              根據看板精實原則 (Lean Kanban)，同時並行過多任務將大幅增加大腦認知負荷與上下文切換成本。
              建議先專注完成既有任務，或將此任務暫存於「下一步行動」。
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dark-border-subtle/60">
              <button
                type="button"
                onClick={async () => {
                  const id = wipConflictTask.id;
                  setWipConflictTask(null);
                  await handleStatusChange(id, 'next-action');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-dark-card hover:bg-dark-hover border border-dark-border-subtle text-blue-300 hover:text-blue-200 transition-colors cursor-pointer"
              >
                暫緩至下一步行動 (建議)
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = wipConflictTask.id;
                  setWipConflictTask(null);
                  await handleStatusChange(id, 'in-progress');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
              >
                確認強行推入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
