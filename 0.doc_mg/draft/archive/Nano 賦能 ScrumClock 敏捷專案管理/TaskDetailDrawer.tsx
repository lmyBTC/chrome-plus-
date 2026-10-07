import React, { useState, useMemo } from 'react';
import { GTDStatus, WeeklyMission } from '../types';
import { TaskAIEngine, TaskTriageProposal, WIPConflictAnalysis } from '../services/taskAIEngine';
import { KanbanAuditor, KanbanHealthReport } from '../services/kanbanAuditor';
import { InboxTriageModal } from './InboxTriageModal';
import { TaskDetailDrawer } from './TaskDetailDrawer';

export interface BoardViewProps {
  missions: WeeklyMission[];
  onUpdateMission: (mission: WeeklyMission) => Promise<void> | void;
  onBatchUpdateMissions?: (missions: WeeklyMission[]) => Promise<void> | void;
  onDeleteMission?: (missionId: string) => Promise<void> | void;
  onAddMission?: (status: GTDStatus, title: string) => Promise<void> | void;
}

const COLUMNS: { id: GTDStatus; label: string; icon: string; desc: string }[] = [
  { id: 'inbox', label: '收件匣', icon: '📥', desc: '靈感與未釐清想法' },
  { id: 'next-action', label: '下一步行動', icon: '⚡', desc: '隨時可啟動的具體任務' },
  { id: 'in-progress', label: '進行中 (WIP)', icon: '🚀', desc: '當前焦點戰役 (限制 3 項)' },
  { id: 'done', label: '已完成', icon: '✅', desc: '衝刺落地的戰果' },
];

export const BoardView: React.FC<BoardViewProps> = ({
  missions,
  onUpdateMission,
  onBatchUpdateMissions,
  onDeleteMission,
  onAddMission,
}) => {
  // 抽屜與彈窗狀態
  const [selectedTask, setSelectedTask] = useState<WeeklyMission | null>(null);
  const [isTriageOpen, setIsTriageOpen] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageProposals, setTriageProposals] = useState<TaskTriageProposal[]>([]);
  const [isSomedayDrawerOpen, setIsSomedayDrawerOpen] = useState(false);

  // WIP 衝突預警彈窗
  const [wipConflict, setWipConflict] = useState<{
    targetTask: WeeklyMission;
    analysis: WIPConflictAnalysis;
  } | null>(null);

  // 快捷新增任務輸入狀態
  const [quickInputCol, setQuickInputCol] = useState<GTDStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  // 實例化服務
  const aiEngine = TaskAIEngine.getInstance();
  const auditor = KanbanAuditor.getInstance();

  const healthReport: KanbanHealthReport = useMemo(() => {
    return auditor.auditBoard(missions, 3, 5);
  }, [missions]);

  const inboxCount = useMemo(() => {
    return missions.filter((m) => (m.status || 'inbox') === 'inbox').length;
  }, [missions]);

  const somedayMissions = useMemo(() => {
    return missions.filter((m) => m.status === 'someday');
  }, [missions]);

  const handleOpenInboxTriage = async () => {
    const inboxItems = missions.filter((m) => (m.status || 'inbox') === 'inbox');
    if (inboxItems.length === 0) return;

    setIsTriageOpen(true);
    setTriageLoading(true);
    try {
      const proposals = await aiEngine.triageInboxItems(inboxItems);
      setTriageProposals(proposals);
    } catch (err) {
      console.error('[BoardView] 收件匣釐清推論失敗:', err);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleApplyTriageProposals = async (
    approvedUpdates: Array<{ id: string; status: GTDStatus; estimatedPomodoros: number; tags: string[] }>
  ) => {
    const updateMap = new Map(approvedUpdates.map((u) => [u.id, u]));
    const nextMissions = missions.map((m) => {
      const u = updateMap.get(m.id);
      if (u) {
        return {
          ...m,
          status: u.status,
          estimatedPomodoros: u.estimatedPomodoros,
          tags: u.tags,
          updatedAt: Date.now(),
        };
      }
      return m;
    });

    if (onBatchUpdateMissions) {
      await onBatchUpdateMissions(nextMissions);
    } else {
      for (const updated of nextMissions.filter((m) => updateMap.has(m.id))) {
        await onUpdateMission(updated);
      }
    }
  };

  const handleMoveStatus = async (task: WeeklyMission, targetStatus: GTDStatus) => {
    if (task.status === targetStatus) return;

    // 若意圖移入 in-progress，且當前進行中任務數量已達標或可能產生心流衝突
    if (targetStatus === 'in-progress') {
      const currentInProgress = missions.filter((m) => m.status === 'in-progress' && m.id !== task.id);
      if (currentInProgress.length >= 3) {
        const conflict = await aiEngine.evaluateWIPConflict(task, currentInProgress);
        setWipConflict({
          targetTask: task,
          analysis: conflict,
        });
        return;
      }
    }

    const updated: WeeklyMission = {
      ...task,
      status: targetStatus,
      updatedAt: Date.now(),
    } as any;
    await onUpdateMission(updated);
  };

  const handleConfirmWipConflictProceed = async () => {
    if (!wipConflict) return;
    const { targetTask } = wipConflict;
    setWipConflict(null);
    const updated: WeeklyMission = {
      ...targetTask,
      status: 'in-progress',
      updatedAt: Date.now(),
    } as any;
    await onUpdateMission(updated);
  };

  const handleQuickAdd = async (status: GTDStatus) => {
    if (!quickTitle.trim()) return;
    if (onAddMission) {
      await onAddMission(status, quickTitle.trim());
    } else {
      const newMission: WeeklyMission = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: quickTitle.trim(),
        status,
        estimatedPomodoros: 1,
        spentPomodoros: 0,
        tags: ['@Focus'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any;
      await onUpdateMission(newMission);
    }
    setQuickTitle('');
    setQuickInputCol(null);
  };

  const handleCleanZombieCards = async () => {
    const plan = auditor.generateZombieDowngradePlan(missions);
    if (plan.length === 0) return;

    const planMap = new Map(plan.map((p) => [p.id, p.targetStatus]));
    const nextMissions = missions.map((m) => {
      const target = planMap.get(m.id);
      return target ? { ...m, status: target, updatedAt: Date.now() } : m;
    });

    if (onBatchUpdateMissions) {
      await onBatchUpdateMissions(nextMissions);
    } else {
      for (const updated of nextMissions.filter((m) => planMap.has(m.id))) {
        await onUpdateMission(updated);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* 頂部敏捷中控列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🍅</span>
            <h1 className="text-base font-bold tracking-wide text-slate-100 font-mono">
              ScrumClock GTD 看板
            </h1>
          </div>

          {/* 看板健康度指標徽章 */}
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
                healthReport.healthScore >= 80
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : healthReport.healthScore >= 50
                  ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                  : 'bg-rose-950/80 border-rose-800 text-rose-300'
              }`}
            >
              <span>{healthReport.healthScore >= 80 ? '🟢' : healthReport.healthScore >= 50 ? '🟡' : '🔴'}</span>
              <span>健康度: {healthReport.healthScore}分</span>
            </div>

            {healthReport.isWipExceeded && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
                ⚠️ WIP 飽和 ({healthReport.inProgressCount}/{healthReport.wipLimit})
              </span>
            )}

            {healthReport.stalledCount > 0 && (
              <button
                onClick={handleCleanZombieCards}
                className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="一鍵將超過 5 天停滯之卡片移至 Someday"
              >
                <span>🧹 停滯卡片: {healthReport.stalledCount}</span>
                <span className="text-[10px] text-indigo-400 font-semibold underline ml-1">一鍵理牌</span>
              </button>
            )}
          </div>
        </div>

        {/* 頂部操作動作 */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleOpenInboxTriage}
            disabled={inboxCount === 0}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-950/40 flex items-center space-x-1.5 transition-all active:scale-98"
          >
            <span>✨ Nano 一鍵釐清 (Inbox Zero)</span>
            <span className="font-mono px-1.5 py-0.2 rounded bg-black/30 text-[10px]">
              {inboxCount}
            </span>
          </button>

          <button
            onClick={() => setIsSomedayDrawerOpen(!isSomedayDrawerOpen)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <span>💡 日後也許</span>
            <span className="font-mono text-[10px] text-slate-400">({somedayMissions.length})</span>
          </button>
        </div>
      </div>

      {/* 4 核心泳道主看板區 */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 min-w-[960px] h-full items-start">
          {COLUMNS.map((col) => {
            const colMissions = missions.filter((m) => (m.status || 'inbox') === col.id);
            const isWipCol = col.id === 'in-progress';
            const isOverWip = isWipCol && colMissions.length > 3;

            return (
              <div
                key={col.id}
                className={`flex flex-col max-h-full rounded-2xl border p-3.5 transition-all ${
                  isOverWip
                    ? 'bg-slate-900/90 border-rose-700/80 shadow-lg shadow-rose-950/20'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                {/* 欄位標頭 */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{col.icon}</span>
                    <h3 className="text-xs font-bold text-slate-200 tracking-wide font-mono">
                      {col.label}
                    </h3>
                    <span
                      className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                        isOverWip
                          ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {colMissions.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setQuickInputCol(quickInputCol === col.id ? null : col.id);
                      setQuickTitle('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors text-xs"
                    title="快捷新增卡片"
                  >
                    +
                  </button>
                </div>

                {/* 快捷新增輸入框 */}
                {quickInputCol === col.id && (
                  <div className="mb-3 p-2 rounded-xl bg-slate-950 border border-indigo-700/80 space-y-2 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd(col.id);
                        if (e.key === 'Escape') setQuickInputCol(null);
                      }}
                      placeholder="輸入任務標題後 Enter..."
                      autoFocus
                      className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-end space-x-1.5 text-[11px]">
                      <button
                        onClick={() => setQuickInputCol(null)}
                        className="px-2 py-0.5 text-slate-400 hover:text-slate-200"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleQuickAdd(col.id)}
                        className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium shadow-sm"
                      >
                        新增
                      </button>
                    </div>
                  </div>
                )}

                {/* 卡片容器滾動區 */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 min-h-[160px]">
                  {colMissions.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-xs font-mono">
                      暫無卡片
                    </div>
                  ) : (
                    colMissions.map((task) => {
                      const isStalled = healthReport.stalledCards.some((s) => s.task.id === task.id);
                      const checklistCount = task.checklist?.length || 0;
                      const completedChecklist = task.checklist?.filter((c) => c.isCompleted).length || 0;

                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="group relative p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer shadow-sm space-y-2"
                        >
                          {/* 標題與停滯標記 */}
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`text-xs font-medium leading-snug line-clamp-2 ${
                                task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-200'
                              }`}
                            >
                              {task.title}
                            </span>
                            {isStalled && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 shrink-0"
                                title="此任務已超過 5 天未推進"
                              >
                                ⏳ 停滯
                              </span>
                            )}
                          </div>

                          {/* 標籤列 */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 底部屬性 (番茄鐘指標 + Checklist 進度 + 快捷流轉按鈕) */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[11px] text-slate-500 font-mono">
                            <div className="flex items-center space-x-2">
                              <span>🍅 {task.spentPomodoros || 0}/{task.estimatedPomodoros || 1}</span>
                              {checklistCount > 0 && (
                                <span className="text-[10px] text-indigo-400 bg-indigo-950/40 px-1 rounded">
                                  ✓ {completedChecklist}/{checklistCount}
                                </span>
                              )}
                            </div>

                            {/* 快捷推進選單 */}
                            <div
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {col.id !== 'next-action' && (
                                <button
                                  onClick={() => handleMoveStatus(task, 'next-action')}
                                  className="p-1 hover:text-indigo-400"
                                  title="推至下一步行動"
                                >
                                  ⚡
                                </button>
                              )}
                              {col.id !== 'in-progress' && (
                                <button
                                  onClick={() => handleMoveStatus(task, 'in-progress')}
                                  className="p-1 hover:text-sky-400"
                                  title="推進為進行中 (WIP)"
                                >
                                  🚀
                                </button>
                              )}
                              {col.id !== 'done' && (
                                <button
                                  onClick={() => handleMoveStatus(task, 'done')}
                                  className="p-1 hover:text-emerald-400"
                                  title="標記為已完成"
                                >
                                  ✅
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部「日後也許 (Someday)」可折疊抽屜 */}
      {isSomedayDrawerOpen && (
        <div className="border-t border-slate-800 bg-slate-900/95 p-4 space-y-3 animate-in slide-in-from-bottom-6 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>💡</span>
              <h4 className="text-xs font-bold text-slate-200 font-mono">
                日後也許想法池 (Someday / Maybe Archive)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                共 {somedayMissions.length} 項
              </span>
            </div>
            <button
              onClick={() => setIsSomedayDrawerOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              ✕ 收合
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
            {somedayMissions.length === 0 ? (
              <span className="text-xs text-slate-600 font-mono py-2">目前無暫存的遠期願望想法。</span>
            ) : (
              somedayMissions.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                >
                  <span
                    onClick={() => setSelectedTask(task)}
                    className="cursor-pointer text-slate-300 hover:text-slate-100 max-w-xs truncate"
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => handleMoveStatus(task, 'next-action')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-mono"
                  >
                    喚醒至 Next ➔
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 1. 收件匣智能釐清對話框 (Inbox Triage Modal) */}
      <InboxTriageModal
        isOpen={isTriageOpen}
        onClose={() => setIsTriageOpen(false)}
        inboxMissions={missions.filter((m) => (m.status || 'inbox') === 'inbox')}
        proposals={triageProposals}
        isLoading={triageLoading}
        onApplyProposals={handleApplyTriageProposals}
      />

      {/* 2. 卡片詳情與 Nano 原子拆解抽屜 (Task Detail Drawer) */}
      <TaskDetailDrawer
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        onUpdateTask={(updated) => {
          onUpdateMission(updated);
          setSelectedTask(updated);
        }}
        onDeleteTask={onDeleteMission}
      />

      {/* 3. 語意 WIP 衝突介入警示對話框 (Context Defender) */}
      {wipConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-800/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2 text-amber-400">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold font-mono">WIP 守護與抗多工警示</h3>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              <p>
                你正嘗試將「<span className="text-slate-100 font-semibold">{wipConflict.targetTask.title}</span>」推入進行中。
              </p>
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-amber-300/90 text-xs">
                💡 <span className="font-semibold">Nano 心流分析:</span> {wipConflict.analysis.warningMessage}
              </div>
              <p className="text-slate-400 text-[11px]">
                貫徹 <em>"Stop Starting, Start Finishing"</em> 原則，建議先完成當前焦點戰役。
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setWipConflict(null)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                保留在 Next Actions
              </button>
              <button
                onClick={handleConfirmWipConflictProceed}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg shadow-sm"
              >
                仍要強制啟動
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};