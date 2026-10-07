import React, { useState, useEffect } from 'react';
import { TaskTriageProposal } from '../../services/taskAIEngine';
import { WeeklyMission, GTDStatus } from '../../../../types';

export interface InboxTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: TaskTriageProposal[];
  weeklyMissions: WeeklyMission[];
  onApply: (confirmedProposals: TaskTriageProposal[]) => Promise<void>;
  isApplying?: boolean;
}

export const InboxTriageModal: React.FC<InboxTriageModalProps> = ({
  isOpen,
  onClose,
  proposals,
  weeklyMissions,
  onApply,
  isApplying = false,
}) => {
  const [localProposals, setLocalProposals] = useState<TaskTriageProposal[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'next-action' | 'someday'>('all');

  useEffect(() => {
    if (isOpen) {
      setLocalProposals(proposals.map((p) => ({ ...p, tags: [...p.tags] })));
    }
  }, [isOpen, proposals]);

  if (!isOpen) return null;

  // 取得對應原始任務資訊
  const getMission = (id: string): WeeklyMission | undefined => {
    return weeklyMissions.find((m) => m.id === id);
  };

  const handleUpdateStatus = (id: string, status: GTDStatus) => {
    setLocalProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, recommendedStatus: status } : item))
    );
  };

  const handleUpdatePomodoros = (id: string, delta: number) => {
    setLocalProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = Math.max(1, Math.min(12, item.recommendedPomodoros + delta));
          return { ...item, recommendedPomodoros: next };
        }
        return item;
      })
    );
  };

  const handleToggleTag = (id: string, tag: string) => {
    setLocalProposals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const exists = item.tags.includes(tag);
          const nextTags = exists
            ? item.tags.filter((t) => t !== tag)
            : [...item.tags, tag];
          return { ...item, tags: nextTags };
        }
        return item;
      })
    );
  };

  const handleApplyAll = async () => {
    await onApply(localProposals);
  };

  const filteredProposals = localProposals.filter((p) => {
    if (activeTab === 'all') return true;
    return p.recommendedStatus === activeTab;
  });

  const nextActionCount = localProposals.filter((p) => p.recommendedStatus === 'next-action').length;
  const somedayCount = localProposals.filter((p) => p.recommendedStatus === 'someday').length;
  const totalEstimatedPomodoros = localProposals.reduce((sum, p) => sum + p.recommendedPomodoros, 0);

  const availableTags = ['@Code', '@Research', '@Admin', '@Writing', '@Review', '@Meeting'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-dark-surface border border-indigo-900/60 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-dark-primary">
        {/* Modal 頂部 Header */}
        <div className="px-6 py-5 border-b border-dark-border-subtle bg-gradient-to-r from-indigo-950/60 via-dark-surface to-purple-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-600/30">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Nano 收件匣語意釐清審核 (Inbox Triage)</h2>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini Nano Edge AI
                </span>
              </div>
              <p className="text-xs text-dark-muted mt-0.5">
                Nano 已完成 {localProposals.length} 項收件匣卡片之語意判定與工時預估。您可在套用前自由微調。
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-dark-card hover:bg-dark-hover border border-dark-border-subtle text-dark-muted hover:text-dark-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 統計指標與過濾標籤列 */}
        <div className="px-6 py-3 bg-dark-card/50 border-b border-dark-border-subtle flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-dark-surface hover:bg-dark-hover text-dark-secondary'
              }`}
            >
              全部提案 ({localProposals.length})
            </button>
            <button
              onClick={() => setActiveTab('next-action')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'next-action'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-dark-surface hover:bg-dark-hover text-blue-300'
              }`}
            >
              <span>⚡ 下一步行動</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {nextActionCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('someday')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'someday'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-dark-surface hover:bg-dark-hover text-amber-300'
              }`}
            >
              <span>🧊 擇日也許</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {somedayCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-dark-muted">
            <span className="flex items-center gap-1.5">
              <span>🍅 總預估工時:</span>
              <strong className="text-red-400 font-mono text-sm">{totalEstimatedPomodoros} 顆番茄</strong>
              <span>({(totalEstimatedPomodoros * 25) / 60} 小時)</span>
            </span>
          </div>
        </div>

        {/* 提案 Diff 清單內容區 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-16 text-dark-muted">
              <span className="text-3xl block mb-2">📭</span>
              <span>此分類下無待審核提案</span>
            </div>
          ) : (
            filteredProposals.map((proposal, idx) => {
              const mission = getMission(proposal.id);
              const isNextAction = proposal.recommendedStatus === 'next-action';

              return (
                <div
                  key={proposal.id}
                  className="bg-dark-card border border-dark-border-subtle/80 hover:border-indigo-500/50 rounded-xl p-4 transition-all space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* 左側：序號與任務主體 */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-1 rounded bg-indigo-950/60 border border-indigo-900/50 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="space-y-1 flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white leading-snug break-words">
                          {mission?.text || `任務 ID: ${proposal.id}`}
                        </h4>
                        {mission?.notes && (
                          <p className="text-xs text-dark-muted line-clamp-1 italic">
                            備忘: {mission.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-dark-muted">Nano 判定依據:</span>
                          <span className="text-[11px] text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                            💡 {proposal.reason || '語意行動性高'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 右側：狀態切換 (Diff 呈現) */}
                    <div className="flex items-center gap-1 bg-dark-surface p-1 rounded-lg border border-dark-border-subtle shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(proposal.id, 'next-action')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                          isNextAction
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-dark-muted hover:text-dark-secondary'
                        }`}
                      >
                        <span>⚡</span>
                        <span>下一步</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(proposal.id, 'someday')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                          !isNextAction
                            ? 'bg-amber-600 text-white shadow'
                            : 'text-dark-muted hover:text-dark-secondary'
                        }`}
                      >
                        <span>🧊</span>
                        <span>擇日</span>
                      </button>
                    </div>
                  </div>

                  {/* 底部微調列：番茄鐘微調 + 標籤選擇 */}
                  <div className="pt-2 border-t border-dark-border-subtle/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                    {/* 預估番茄鐘微調 */}
                    <div className="flex items-center gap-2">
                      <span className="text-dark-muted">預估番茄鐘:</span>
                      <div className="flex items-center gap-1 bg-dark-surface px-1.5 py-0.5 rounded border border-dark-border-subtle">
                        <button
                          type="button"
                          onClick={() => handleUpdatePomodoros(proposal.id, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-dark-muted hover:text-dark-primary hover:bg-dark-hover cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-mono font-bold text-red-400 px-1.5">
                          🍅 {proposal.recommendedPomodoros}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdatePomodoros(proposal.id, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded text-dark-muted hover:text-dark-primary hover:bg-dark-hover cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* 情境標籤可切換點選 */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-dark-muted text-[11px]">情境標籤:</span>
                      {availableTags.map((t) => {
                        const isSelected = proposal.tags.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleToggleTag(proposal.id, t)}
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                                : 'bg-dark-surface/60 text-dark-muted border-dark-border-subtle hover:border-dark-border-default'
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal 底部按鈕操作列 */}
        <div className="px-6 py-4 bg-dark-card border-t border-dark-border-subtle flex items-center justify-between shrink-0">
          <div className="text-xs text-dark-muted">
            套用後卡片將自動移出收件匣，並透過 <span className="font-mono text-dark-secondary">StorageQueue</span> 循序寫入資料庫。
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-surface hover:bg-dark-hover border border-dark-border-subtle text-dark-secondary transition-colors cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleApplyAll}
              disabled={isApplying || localProposals.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <span className="animate-spin block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>循序套用至看板中...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>一鍵全部套用 ({localProposals.length} 項建議)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
