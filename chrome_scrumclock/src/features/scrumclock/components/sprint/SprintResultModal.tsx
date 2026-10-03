import React from 'react';

interface SprintResultModalProps {
  isOpen: boolean;
  result: string;
  setResult: (val: string) => void;
  markAsCompleted: boolean;
  setMarkAsCompleted: (val: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  interruptionCount?: number;
  interruptionReasons?: string[];
}

export const SprintResultModal: React.FC<SprintResultModalProps> = ({
  isOpen,
  result,
  setResult,
  markAsCompleted,
  setMarkAsCompleted,
  onSubmit,
  onCancel,
  interruptionCount,
  interruptionReasons
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-dark-card border border-dark-border-subtle rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl shadow-slate-950/80 animate-fade-in">
        <h3 className="text-lg font-semibold mb-2 text-dark-primary">記錄本次衝刺成果</h3>
        <p className="text-sm text-dark-secondary mb-3">
          請用一句話簡潔地記錄本次衝刺的具體產出成果
        </p>

        {/* 衝刺中斷覆盤提示 */}
        {interruptionCount && interruptionCount > 0 ? (
          <div className="mb-3 px-3 py-2 bg-yellow-950/40 border border-yellow-800/60 rounded-lg text-xs text-yellow-300">
            <div className="flex items-center justify-between font-semibold mb-1">
              <span>⚠️ 本次衝刺受到中斷：</span>
              <span className="bg-yellow-800/60 px-1.5 py-0.5 rounded text-[11px]">{interruptionCount} 次</span>
            </div>
            {interruptionReasons && interruptionReasons.length > 0 && (
              <div className="text-yellow-400/80 truncate text-[11px]" title={interruptionReasons.join(', ')}>
                原因：{interruptionReasons.join('、 ')}
              </div>
            )}
          </div>
        ) : null}
        <textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="例如：完成了 SPEC 文件的使用者故事草稿"
          className="w-full p-3 bg-dark-surface border border-dark-border-default text-dark-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          rows={3}
        />
        <label className="flex items-center space-x-2 mt-3 text-sm text-dark-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={markAsCompleted}
            onChange={(e) => setMarkAsCompleted(e.target.checked)}
            className="rounded text-blue-500 border-dark-border-default focus:ring-blue-500 bg-dark-card w-4 h-4 cursor-pointer"
          />
          <span>同時標記此任務為「已完成」並同步至 Sheet</span>
        </label>
        <div className="flex space-x-3 mt-4">
          <button
            onClick={onSubmit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-md shadow-blue-950/40 font-semibold"
          >
            提交
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-dark-hover hover:bg-dark-card border border-dark-border-default text-dark-secondary rounded-lg transition-colors font-semibold"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
