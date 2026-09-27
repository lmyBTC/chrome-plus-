import React from 'react';
import { SyncSettingsModalProps } from '../tabs/types';

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  onSmartMerge,
  onFullPull,
  onPushToSheet,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🔄</span>
          <div>
            <h3 className="text-base font-bold text-white">同步試算表任務</h3>
            <p className="text-xs text-gray-400 mt-0.5">本地已有任務，請選擇同步方式</p>
          </div>
        </div>
        <button
          onClick={onSmartMerge}
          className="w-full py-3 px-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-sm text-left transition-all flex items-center gap-3"
        >
          <span className="text-lg">🔀</span>
          <div>
            <div className="font-bold">智慧合併</div>
            <div className="text-xs text-blue-400/70 font-normal">本地 + 試算表取聯集，不刪除任何任務</div>
          </div>
        </button>
        <button
          onClick={onFullPull}
          className="w-full py-3 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-semibold text-sm text-left transition-all flex items-center gap-3"
        >
          <span className="text-lg">📥</span>
          <div>
            <div className="font-bold">完全拉取</div>
            <div className="text-xs text-amber-400/70 font-normal">以試算表內容覆蓋本地（本地獨有任務將消失）</div>
          </div>
        </button>
        <button
          onClick={onPushToSheet}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-sm text-left transition-all flex items-center gap-3"
        >
          <span className="text-lg">📤</span>
          <div>
            <div className="font-bold">本地上傳</div>
            <div className="text-xs text-emerald-400/70 font-normal">將插件任務寫入試算表 Task 分頁</div>
          </div>
        </button>
        <button
          onClick={onClose}
          className="mt-1 text-xs text-gray-500 hover:text-gray-300 transition-colors text-center"
        >
          取消
        </button>
      </div>
    </div>
  );
};
