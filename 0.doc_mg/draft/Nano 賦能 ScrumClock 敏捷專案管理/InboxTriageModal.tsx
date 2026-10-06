import React, { useState } from 'react';
import { GTDStatus, WeeklyMission } from '../types';
import { TaskTriageProposal } from '../services/taskAIEngine';

export interface InboxTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxMissions: WeeklyMission[];
  proposals: TaskTriageProposal[];
  isLoading: boolean;
  onApplyProposals: (approvedUpdates: Array<{ id: string; status: GTDStatus; estimatedPomodoros: number; tags: string[] }>) => Promise<void>;
}

export const InboxTriageModal: React.FC<InboxTriageModalProps> = ({
  isOpen,
  onClose,
  inboxMissions,
  proposals,
  isLoading,
  onApplyProposals,
}) => {
  // 記錄使用者個別選擇或覆寫的狀態 (id -> 覆寫值)
  const [selectedChanges, setSelectedChanges] = useState<Record<string, { status: GTDStatus; pomodoros: number; enabled: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // 取得特定卡片的推薦提案
  const getProposal = (id: string): TaskTriageProposal | undefined => {
    return proposals.find((p) => p.id === id);
  };

  // 切換單項是否啟用變更
  const toggleItemEnabled = (id: string, currentEnabled: boolean, proposal?: TaskTriageProposal) => {
    setSelectedChanges((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || proposal?.recommendedStatus || 'next-action',
        pomodoros: prev[id]?.pomodoros || proposal?.recommendedPomodoros || 1,
        enabled: !currentEnabled,
      },
    }));
  };

  const updateTargetStatus = (id: string, newStatus: GTDStatus) => {
    setSelectedChanges((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { pomodoros: 1, enabled: true }),
        status: newStatus,
        enabled: true,
      },
    }));
  };

  const updatePomodoros = (id: string, newPomo: number) => {
    setSelectedChanges((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { status: 'next-action', enabled: true }),
        pomodoros: Math.max(1, newPomo),
        enabled: true,
      },
    }));
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const approvedUpdates = inboxMissions
        .map((mission) => {
          const prop = getProposal(mission.id);
          const override = selectedChanges[mission.id];
          
          const isEnabled = override ? override.enabled : !!prop;
          if (!isEnabled) return null;

          const finalStatus = override?.status || prop?.recommendedStatus || 'next-action';
          const finalPomo = override?.pomodoros || prop?.recommendedPomodoros || mission.estimatedPomodoros || 1;
          const finalTags = prop?.tags || mission.tags || ['@Focus'];

          return {
            id: mission.id,
            status: finalStatus,
            estimatedPomodoros: finalPomo,
            tags: finalTags,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      await onApplyProposals(approvedUpdates);
      onClose();
    } catch (err) {
      console.error('[InboxTriageModal] 套用建議失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-indigo-950/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 頂部標題列 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-lg">✨</span>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Gemini Nano 收件匣智能釐清 (Inbox Zero)
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  HITL 預覽
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                審核 Nano 邊緣小模型所建議之 GTD 狀態、情境標籤與番茄鐘配額。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-300 font-medium animate-pulse">
                ⚡ Gemini Nano 正在本機並行評估收件匣卡片語意與顆粒度...
              </p>
            </div>
          ) : inboxMissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              🎉 目前收件匣空空如也，心流狀態維持完美！
            </div>
          ) : (
            <div className="space-y-3">
              {inboxMissions.map((task) => {
                const proposal = getProposal(task.id);
                const override = selectedChanges[task.id];
                const isEnabled = override ? override.enabled : !!proposal;
                const activeStatus = override?.status || proposal?.recommendedStatus || 'next-action';
                const activePomo = override?.pomodoros || proposal?.recommendedPomodoros || task.estimatedPomodoros || 1;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                        : 'bg-slate-900/40 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleItemEnabled(task.id, isEnabled, proposal)}
                          className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-sm font-semibold text-slate-200 truncate">
                            {task.title}
                          </div>
                          {proposal && (
                            <div className="text-xs text-indigo-300/90 flex items-center gap-1.5">
                              <span>💡 Nano 觀點:</span>
                              <span>{proposal.reason}</span>
                            </div>
                          )}
                          {proposal?.tags && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {proposal.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 調整控制項 */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* 狀態切換 */}
                        <select
                          value={activeStatus}
                          onChange={(e) => updateTargetStatus(task.id, e.target.value as GTDStatus)}
                          disabled={!isEnabled}
                          className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="next-action">⚡ 下一步行動</option>
                          <option value="someday">💡 日後也許</option>
                          <option value="inbox">📥 維持收件匣</option>
                        </select>

                        {/* 番茄鐘配額 */}
                        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                          <span className="text-xs">🍅</span>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={activePomo}
                            onChange={(e) => updatePomodoros(task.id, parseInt(e.target.value, 10) || 1)}
                            disabled={!isEnabled}
                            className="w-8 bg-transparent text-center text-xs font-mono font-semibold text-slate-200 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部動作列 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="text-xs text-slate-400">
            預計轉移卡片數:{' '}
            <span className="font-bold text-indigo-400 font-mono">
              {
                inboxMissions.filter((m) => {
                  const o = selectedChanges[m.id];
                  return o ? o.enabled : !!getProposal(m.id);
                }).length
              }
            </span>{' '}
            / {inboxMissions.length}
          </div>
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={isSubmitting || isLoading || inboxMissions.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-950/40 transition-all flex items-center space-x-1.5 active:scale-98"
            >
              {isSubmitting ? (
                <span>正在套用...</span>
              ) : (
                <span>✅ 套用審核並流轉看板</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};