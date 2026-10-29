import React, { useState, useEffect } from 'react';
import { WeeklyMission, ChecklistItem } from '../../../../types';

export interface MergeTaskModalProps {
  sourceTask: WeeklyMission | null;
  targetTask: WeeklyMission | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmMerge: (mergedMission: WeeklyMission, sourceTaskId: string) => Promise<void>;
}

const combineNotes = (targetNotes?: string, sourceNotes?: string, sourceTitle?: string): string => {
  const parts: string[] = [];
  if (targetNotes?.trim()) {
    parts.push(targetNotes.trim());
  }
  if (sourceNotes?.trim()) {
    parts.push(`--- [合併自: ${sourceTitle || '來源任務'}] ---\n${sourceNotes.trim()}`);
  }
  return parts.join('\n\n');
};

const getHigherPriority = (
  p1?: 'P0' | 'P1' | 'P2' | 'P3',
  p2?: 'P0' | 'P1' | 'P2' | 'P3'
): 'P0' | 'P1' | 'P2' | 'P3' => {
  const rank: Record<string, number> = { P0: 4, P1: 3, P2: 2, P3: 1 };
  const r1 = p1 ? rank[p1] || 0 : 0;
  const r2 = p2 ? rank[p2] || 0 : 0;
  if (r1 >= r2 && p1) return p1;
  if (p2) return p2;
  return 'P2';
};

export const MergeTaskModal: React.FC<MergeTaskModalProps> = ({
  sourceTask,
  targetTask,
  isOpen,
  onClose,
  onConfirmMerge,
}) => {
  const [mergedTitle, setMergedTitle] = useState('');
  const [mergedNotes, setMergedNotes] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(1);
  const [spentPomodoros, setSpentPomodoros] = useState(0);
  const [priority, setPriority] = useState<'P0' | 'P1' | 'P2' | 'P3'>('P2');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sourceTask || !targetTask) return;

    setMergedTitle(targetTask.text);
    setMergedNotes(combineNotes(targetTask.notes, sourceTask.notes, sourceTask.text));

    const est = (targetTask.estimatedPomodoros || 1) + (sourceTask.estimatedPomodoros || 1);
    setEstimatedPomodoros(Math.max(1, est));

    const spent = (targetTask.spentPomodoros || 0) + (sourceTask.spentPomodoros || 0);
    setSpentPomodoros(spent);

    setPriority(getHigherPriority(targetTask.priority, sourceTask.priority));

    // 合併檢查清單 (深拷貝並避免重複 id)
    const combinedChecklist: ChecklistItem[] = [
      ...(targetTask.checklist || []).map((item) => ({ ...item })),
      ...(sourceTask.checklist || []).map((item, idx) => ({
        ...item,
        id: item.id ? `merged_${item.id}` : `merged_${Date.now()}_${idx}`,
      })),
    ];
    setChecklist(combinedChecklist);

    // 合併標籤去重
    const mergedTags = Array.from(
      new Set([...(targetTask.tags || []), ...(sourceTask.tags || [])])
    );
    setTags(mergedTags);
  }, [sourceTask, targetTask, isOpen]);

  if (!isOpen || !sourceTask || !targetTask) return null;

  const handleAddSourceAsChecklistItem = () => {
    if (checklist.some((c) => c.text === sourceTask.text)) return;
    const newItem: ChecklistItem = {
      id: `source_${Date.now()}`,
      text: sourceTask.text,
      completed: sourceTask.isCompleted || false,
    };
    setChecklist([...checklist, newItem]);
  };

  const handleAddCustomChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: ChecklistItem = {
      id: `manual_${Date.now()}`,
      text: newChecklistText.trim(),
      completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergedTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const mergedMission: WeeklyMission = {
        ...targetTask,
        text: mergedTitle.trim(),
        notes: mergedNotes.trim() || undefined,
        estimatedPomodoros,
        spentPomodoros,
        priority,
        checklist: checklist.length > 0 ? checklist : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };

      await onConfirmMerge(mergedMission, sourceTask.id);
      onClose();
    } catch (err) {
      console.error('合併任務執行失敗:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-dark-surface border border-dark-border-default/90 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-dark-primary max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* 標題欄 */}
        <div className="flex items-center justify-between border-b border-dark-border-subtle/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xl shadow-xs">
              🔀
            </span>
            <div>
              <h3 className="text-base font-bold text-dark-primary flex items-center gap-2">
                <span>合併任務確認</span>
                <span className="text-[11px] font-normal text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-800/40">
                  Drag & Merge
                </span>
              </h3>
              <p className="text-xs text-dark-muted mt-0.5">
                將來源卡片彙整入目標卡片，確認後來源任務將被安全清理。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-dark-muted hover:text-dark-primary hover:bg-dark-card border border-transparent hover:border-dark-border-subtle transition-all flex items-center justify-center text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 來源與目標卡片對比卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-dark-card/60 border border-dark-border-subtle/60 rounded-xl text-xs">
          <div className="p-2.5 rounded-lg bg-dark-surface/70 border border-dark-border-subtle/50">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-semibold mb-1">
              <span>📤 來源任務 (即將被移除)</span>
            </div>
            <p className="font-medium text-dark-secondary truncate" title={sourceTask.text}>
              {sourceTask.text}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-dark-muted">
              <span>🍅 預估: {sourceTask.estimatedPomodoros || 1}</span>
              <span>•</span>
              <span>已耗: {sourceTask.spentPomodoros || 0}</span>
              {sourceTask.checklist && (
                <>
                  <span>•</span>
                  <span>清單: {sourceTask.checklist.length} 項</span>
                </>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/40">
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-semibold mb-1">
              <span>📥 目標任務 (保留並更新)</span>
            </div>
            <p className="font-medium text-indigo-100 truncate" title={targetTask.text}>
              {targetTask.text}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-indigo-300/80">
              <span>🍅 預估: {targetTask.estimatedPomodoros || 1}</span>
              <span>•</span>
              <span>已耗: {targetTask.spentPomodoros || 0}</span>
              {targetTask.checklist && (
                <>
                  <span>•</span>
                  <span>清單: {targetTask.checklist.length} 項</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 表單主體 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 任務標題 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-dark-secondary">
                合併後標題 <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setMergedTitle(targetTask.text)}
                  className="px-2 py-0.5 rounded bg-dark-card hover:bg-dark-surface border border-dark-border-subtle text-dark-muted hover:text-dark-primary transition-all cursor-pointer"
                >
                  保留目標
                </button>
                <button
                  type="button"
                  onClick={() => setMergedTitle(sourceTask.text)}
                  className="px-2 py-0.5 rounded bg-dark-card hover:bg-dark-surface border border-dark-border-subtle text-dark-muted hover:text-dark-primary transition-all cursor-pointer"
                >
                  保留來源
                </button>
                <button
                  type="button"
                  onClick={() => setMergedTitle(`${targetTask.text} + ${sourceTask.text}`)}
                  className="px-2 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 transition-all cursor-pointer"
                >
                  拼接雙方
                </button>
              </div>
            </div>
            <input
              type="text"
              value={mergedTitle}
              onChange={(e) => setMergedTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-dark-card border border-dark-border-default rounded-xl text-xs text-dark-primary placeholder:text-dark-muted focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-inner"
              placeholder="輸入合併後的任務標題..."
            />
          </div>

          {/* 番茄鐘與優先級配置 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 預估番茄鐘 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-secondary flex items-center gap-1">
                <span>🍅 預估番茄鐘</span>
                <span className="text-[10px] text-dark-muted">(累加)</span>
              </label>
              <div className="flex items-center bg-dark-card border border-dark-border-default rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEstimatedPomodoros(Math.max(1, estimatedPomodoros - 1))}
                  className="px-3 py-1.5 hover:bg-dark-surface text-dark-secondary hover:text-dark-primary cursor-pointer transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={estimatedPomodoros}
                  onChange={(e) => setEstimatedPomodoros(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full text-center bg-transparent text-xs text-dark-primary outline-none py-1.5 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setEstimatedPomodoros(estimatedPomodoros + 1)}
                  className="px-3 py-1.5 hover:bg-dark-surface text-dark-secondary hover:text-dark-primary cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* 已消耗番茄鐘 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-secondary flex items-center gap-1">
                <span>⏱️ 已消耗番茄鐘</span>
                <span className="text-[10px] text-dark-muted">(累加)</span>
              </label>
              <div className="flex items-center bg-dark-card border border-dark-border-default rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSpentPomodoros(Math.max(0, spentPomodoros - 1))}
                  className="px-3 py-1.5 hover:bg-dark-surface text-dark-secondary hover:text-dark-primary cursor-pointer transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={spentPomodoros}
                  onChange={(e) => setSpentPomodoros(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center bg-transparent text-xs text-dark-primary outline-none py-1.5 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setSpentPomodoros(spentPomodoros + 1)}
                  className="px-3 py-1.5 hover:bg-dark-surface text-dark-secondary hover:text-dark-primary cursor-pointer transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* 優先級 */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-dark-secondary">
                優先級
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'P0' | 'P1' | 'P2' | 'P3')}
                className="w-full px-3 py-1.5 bg-dark-card border border-dark-border-default rounded-xl text-xs text-dark-primary outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="P0">P0 (最高優先級 / Blocker)</option>
                <option value="P1">P1 (高優先級)</option>
                <option value="P2">P2 (中優先級)</option>
                <option value="P3">P3 (低優先級)</option>
              </select>
            </div>
          </div>

          {/* 任務筆記 (Notes) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-dark-secondary flex items-center justify-between">
              <span>備忘筆記 (Notes)</span>
              <span className="text-[10px] text-dark-muted">已自動組合雙方備忘與來源標記</span>
            </label>
            <textarea
              rows={3}
              value={mergedNotes}
              onChange={(e) => setMergedNotes(e.target.value)}
              placeholder="任務執行筆記、備忘連結或補充要點..."
              className="w-full px-3.5 py-2.5 bg-dark-card border border-dark-border-default rounded-xl text-xs text-dark-primary placeholder:text-dark-muted focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-inner leading-relaxed resize-y"
            />
          </div>

          {/* 檢查清單 (Checklist) */}
          <div className="space-y-2 p-3 bg-dark-card/40 border border-dark-border-subtle/70 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-dark-secondary flex items-center gap-1.5">
                <span>📋 檢查清單 ({checklist.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddSourceAsChecklistItem}
                className="text-[11px] text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/60 px-2 py-0.5 rounded-md border border-indigo-700/40 transition-all cursor-pointer flex items-center gap-1"
                title="將被合併的來源卡片標題加入為此任務的子清單"
              >
                <span>＋ 將來源任務轉為子項目</span>
              </button>
            </div>

            {/* 清單項目列表 */}
            {checklist.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-1.5 px-2 bg-dark-surface/80 border border-dark-border-subtle/50 rounded-lg text-xs group"
                  >
                    <label className="flex items-center gap-2 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleChecklistItem(item.id)}
                        className="rounded border-dark-border-default text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span
                        className={`truncate ${
                          item.completed ? 'line-through text-dark-muted' : 'text-dark-secondary'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                      className="text-dark-muted hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity px-1 cursor-pointer"
                      title="移除此項"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新增清單輸入框 */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomChecklistItem();
                  }
                }}
                placeholder="新增子檢查項目 (Enter 存入)..."
                className="flex-1 px-3 py-1 bg-dark-surface border border-dark-border-subtle rounded-lg text-xs text-dark-primary placeholder:text-dark-muted outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={handleAddCustomChecklistItem}
                disabled={!newChecklistText.trim()}
                className="px-2.5 py-1 bg-dark-card hover:bg-dark-surface disabled:opacity-40 border border-dark-border-subtle text-dark-secondary rounded-lg text-xs font-semibold cursor-pointer transition-all"
              >
                新增
              </button>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-border-subtle/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-dark-secondary hover:text-dark-primary bg-dark-card hover:bg-dark-surface border border-dark-border-subtle transition-all cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !mergedTitle.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-indigo-900/30 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>合併處理中...</span>
                </>
              ) : (
                <>
                  <span>🔀</span>
                  <span>確認合併任務</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
