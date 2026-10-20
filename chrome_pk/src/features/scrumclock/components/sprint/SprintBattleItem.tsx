import React, { useState } from 'react';
import { CoreBattle, WeeklyMission } from '../../../../types';

interface SprintBattleItemProps {
  battle: CoreBattle;
  mission?: WeeklyMission;
  index: number;
  state: string;
  isSelected: boolean;
  isDragged: boolean;
  isBreakingDown: boolean;
  subtasks?: string[];
  onToggleSelect: () => void;
  onSaveText: (id: string, text: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onBreakdown: (id: string) => void;
  onComplete: () => void;
  onStartSprint: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const SprintBattleItem: React.FC<SprintBattleItemProps> = ({
  battle,
  mission,
  index,
  state,
  isSelected,
  isDragged,
  isBreakingDown,
  subtasks,
  onToggleSelect,
  onSaveText,
  onSaveNotes,
  onBreakdown,
  onComplete,
  onStartSprint,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd
}) => {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingText, setEditingText] = useState(mission?.text || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(mission?.notes || '');

  const missionText = mission ? mission.text : '未命名的戰鬥任務';

  const handleTextSubmit = () => {
    onSaveText(battle.missionId, editingText);
    setIsEditingText(false);
  };

  const handleNotesSubmit = () => {
    onSaveNotes(battle.missionId, editingNotes);
    setIsEditingNotes(false);
  };

  return (
    <div
      draggable={state === 'idle'}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`flex flex-col p-4 border rounded-lg transition-all ${
        isDragged
          ? 'opacity-50 border-blue-500 bg-blue-950/30'
          : 'bg-dark-surface/40 hover:bg-dark-surface/80 border-dark-border-subtle hover:border-dark-border-default'
      } ${state === 'idle' ? 'cursor-grab' : ''}`}
    >
      {mission?.aiTip && (
        <div className="mb-3 text-sm text-yellow-400 bg-yellow-950/20 p-3 rounded-lg border border-yellow-900/50">
          ✨ <strong>AI 歷史教訓提醒：</strong> {mission.aiTip}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 mr-4">
          {/* 拖曳手把 */}
          {state === 'idle' && (
            <div className="text-dark-muted mr-2 select-none cursor-grab active:cursor-grabbing text-lg" title="拖曳排序">
              ☰
            </div>
          )}
          {/* 多選 Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-4 h-4 text-blue-500 border-dark-border-default rounded focus:ring-blue-500 mr-3 cursor-pointer bg-dark-card"
          />
          <div className="flex-1">
            {isEditingText ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit();
                  if (e.key === 'Escape') setIsEditingText(false);
                }}
                onBlur={handleTextSubmit}
                className="w-full px-2 py-1 bg-dark-card border border-dark-border-default text-dark-primary rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                autoFocus
              />
            ) : (
              <div className="flex items-center space-x-2">
                <h3
                  onDoubleClick={() => {
                    if (state === 'idle') {
                      setIsEditingText(true);
                      setEditingText(missionText);
                    }
                  }}
                  className={`font-medium text-dark-primary cursor-pointer hover:text-blue-400 transition-colors select-none ${
                    mission?.isCompleted ? 'line-through text-slate-500' : ''
                  }`}
                  title="雙擊編輯任務名稱"
                >
                  {missionText}
                </h3>
                {state === 'idle' && (
                  <button
                    onClick={() => {
                      setIsEditingText(true);
                      setEditingText(missionText);
                    }}
                    className="px-2 py-0.5 bg-dark-card hover:bg-dark-hover border border-dark-border-default text-dark-secondary rounded text-xs transition-colors ml-1 font-semibold"
                    title="編輯任務名稱"
                  >
                    ✏️ 編輯
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-dark-muted mt-1">
              承諾時間: {battle.committedTime} {mission?.suggestedDuration ? `| AI建議: ${mission.suggestedDuration}分鐘` : ''}
            </p>

            {/* 備註顯示與編輯區塊 */}
            <div className="mt-2 text-sm">
              {isEditingNotes ? (
                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="記錄遇到的問題、備忘或執行備註..."
                    className="w-full p-2 bg-dark-card border border-dark-border-default text-dark-primary rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className="px-2 py-1 bg-dark-hover border border-dark-border-default text-dark-secondary rounded text-xs transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleNotesSubmit}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold transition-colors"
                    >
                      儲存備註
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    setIsEditingNotes(true);
                    setEditingNotes(mission?.notes || '');
                  }}
                  className="group/notes flex items-center space-x-1 cursor-pointer bg-dark-card/30 hover:bg-dark-card/80 border border-transparent hover:border-dark-border-default rounded p-1.5 transition-all"
                  title="點擊編輯任務備註"
                >
                  <span className="text-dark-muted text-xs">📝 備註:</span>
                  <span className="text-xs text-dark-secondary flex-1 break-all truncate italic">
                    {mission?.notes || '點擊新增備註，紀錄遇到的問題...'}
                  </span>
                  {mission?.notes && (
                    <span className="opacity-0 group-hover/notes:opacity-100 text-xs text-blue-400 ml-1 transition-opacity">✏️</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {state === 'idle' && (
          <div className="flex space-x-2 items-center">
            <button
              onClick={() => onBreakdown(battle.missionId)}
              disabled={isBreakingDown}
              className="px-3 py-1.5 bg-purple-950/40 border border-purple-900/50 text-purple-400 rounded-lg hover:bg-purple-900/40 text-sm disabled:opacity-50"
            >
              {isBreakingDown ? '拆解中...' : '✨ AI 幫我拆'}
            </button>
            {!mission?.isCompleted && (
              <button
                onClick={onComplete}
                className="px-3 py-1.5 bg-green-950/40 border border-green-900/50 text-green-400 rounded-lg hover:bg-green-900/40 text-sm font-semibold whitespace-nowrap"
                title="將此任務標記完成並實時同步"
              >
                ✓ 完成
              </button>
            )}
            <button
              onClick={onStartSprint}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-semibold shadow-md shadow-blue-950/40"
            >
              開始衝刺
            </button>
            <button
              onClick={onRemove}
              className="px-3 py-1.5 bg-red-950/30 border border-red-900/40 text-red-400 rounded-lg hover:bg-red-900/40 text-sm transition-colors"
              title="從今日規劃中移除"
            >
              移除
            </button>
          </div>
        )}
      </div>

      {/* AI 拆解步驟結果 */}
      {subtasks && subtasks.length > 0 && (
        <div className="mt-3 bg-purple-950/20 border border-purple-900/40 rounded-lg p-3">
          <p className="text-xs font-semibold text-purple-400 mb-1">AI 建議的拆解步驟：</p>
          <ul className="list-disc list-inside text-sm text-dark-secondary space-y-1">
            {subtasks.map((subtask, idx) => (
              <li key={idx}>{subtask}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
